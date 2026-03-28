document.addEventListener('DOMContentLoaded', () => {

    // === TAB NAVIGATION ===
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(`panel-${targetTab}`).classList.add('active');
        });
    });

    // === FUNCTION: SETUP FILE UPLOADERS ===
    window.toolFiles = {
        google: [],
        meta: [],
        portfolio: []
    };

    function setupUploader(toolId) {
        const zone = document.getElementById(`uploadZone${toolId}`);
        const input = document.getElementById(`fileInput${toolId}`);
        const previews = document.getElementById(`uploadPreviews${toolId}`);
        if (!zone || !input || !previews) return;

        zone.addEventListener('click', (e) => {
            if (e.target !== input) input.click();
        });
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files, toolId.toLowerCase(), previews);
        });
        input.addEventListener('change', e => handleFiles(e.target.files, toolId.toLowerCase(), previews));
    }

    function handleFiles(files, toolKey, previewsArea) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            window.toolFiles[toolKey] = [file]; // Keep 1 file for now
            previewsArea.innerHTML = ''; 
            
            const reader = new FileReader();
            reader.onload = e => {
                const wrap = document.createElement('div');
                wrap.className = 'upload-preview';
                wrap.style.cssText = 'position:relative; display:inline-block; margin-top:10px; border-radius:8px; overflow:hidden; border:1px solid var(--border);';
                wrap.innerHTML = `<img src="${e.target.result}" style="max-height: 100px; display:block;" alt="screenshot"/>
                <button type="button" onclick="this.parentElement.remove(); window.toolFiles['${toolKey}']=[];" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">✗</button>`;
                previewsArea.appendChild(wrap);
            };
            reader.readAsDataURL(file);
        });
    }

    setupUploader('Google');
    setupUploader('Meta');
    setupUploader('Portfolio');

    // === ANALYSIS LOGIC ===
    window.runAnalysis = async (toolId) => {
        const btn = document.getElementById(`analyze-${toolId}`);
        const resultsArea = document.getElementById(`results-${toolId}`);
        const ragBadge = document.getElementById('ragBadge');

        // Extract Payload based on tool string
        const payload = { tool: toolId, data: {} };
        if (toolId === 'google') {
            payload.data.url = document.getElementById('googleUrl').value;
        } else if (toolId === 'meta') {
            payload.data.url = document.getElementById('metaUrl').value;
        } else if (toolId === 'seo') {
            const url = document.getElementById('seoUrl').value;
            if(!url) return alert("Please enter a URL.");
            payload.data.url = url;
        } else if (toolId === 'portfolio') {
            payload.data.url = document.getElementById('portfolioUrl').value;
        }

        // UI Loading State
        btn.classList.add('loading');
        btn.disabled = true;
        resultsArea.classList.remove('show');
        resultsArea.innerHTML = '';
        
        // Show Global RAG Badge
        ragBadge.classList.add('show');

        try {
            const formData = new FormData();
            formData.append('payload', JSON.stringify(payload));
            const userId = localStorage.getItem('novusUserId');
            if (userId) formData.append('userId', userId);
            
            if (window.toolFiles[toolId] && window.toolFiles[toolId].length > 0) {
                formData.append('screenshot', window.toolFiles[toolId][0]);
            }

            // Call Backend (Cloud Deployment)
            const BACKEND_URL = 'https://novusai-backend-ozbe.onrender.com';
            const response = await fetch(`${BACKEND_URL}/api/analyze`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Analysis failed. Backend might be down.");
            const aiAnalysis = await response.json();
            
            renderResults(toolId, aiAnalysis, resultsArea);

        } catch (error) {
            console.error("Analysis Error:", error);
            alert("Analysis Error: " + error.message);
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
            ragBadge.classList.remove('show');
        }
    };    function renderResults(toolId, data, resultsArea) {
        let analysisData = data.analysisData || {};
        
        // 1. Action Plan HTML
        let insightsHtml = '';
        if (analysisData.actionPlan && Array.isArray(analysisData.actionPlan)) {
            insightsHtml = analysisData.actionPlan.map(rec => {
                let metricsHTML = '';
                if (rec.metrics && Array.isArray(rec.metrics) && rec.metrics.length > 0) {
                    metricsHTML = `<div class="rec-metrics" style="display:flex; gap:10px; margin: 15px 0;">
                        ${rec.metrics.map(m => `
                            <div class="metric-pill" style="display:flex; flex-direction:column; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; border:1px solid var(--border);">
                                <span class="m-val" style="font-weight:700; color:#fff; font-size:1.1rem;">${m.value}</span>
                                <span class="m-lbl" style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">${m.label}</span>
                            </div>
                        `).join('')}
                    </div>`;
                }

                let stepsHTML = '';
                if (rec.steps && Array.isArray(rec.steps) && rec.steps.length > 0) {
                    stepsHTML = `<ul class="rec-steps" style="list-style:none; padding-left:0; margin-top:10px;">
                        ${rec.steps.map((step, idx) => `<li style="margin-bottom:6px; font-size:0.9rem; color:var(--text-secondary);"><strong style="color:var(--text);">${idx+1}.</strong> ${step}</li>`).join('')}
                    </ul>`;
                }

                return `
                <div class="rec-item glass-panel" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 20px; padding: 20px; transition: all 0.2s ease;">
                    <div class="rec-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                            <div style="flex: 1; padding-right: 20px;">
                                <span class="priority-badge" style="display:inline-block; font-size:0.75rem; font-weight:700; padding:2px 10px; border-radius:12px; margin-bottom:10px; background:${rec.priority?.toLowerCase() === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'}; color:${rec.priority?.toLowerCase() === 'high' ? '#ef4444' : '#3b82f6'}; border:1px solid currentColor;">${(rec.priority || 'MEDIUM').toUpperCase()} PRIORITY</span>
                                <h4 style="margin:0 0 8px 0; font-size:1.15rem; color:#fff; font-weight:600;">${rec.title || 'Action Required'}</h4>
                                <p class="rec-desc" style="margin:0; font-size:0.95rem; color:var(--text-secondary); line-height:1.5;">${rec.desc || ''}</p>
                            </div>
                            <div class="impact-badge" style="display:flex; align-items:center; gap:0.3rem; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 0.4rem 0.8rem; border-radius: 6px; color: #10b981; font-weight:600; font-size:0.9rem; white-space:nowrap;">
                                <span class="material-symbols-outlined" style="font-size:1.1rem;">trending_up</span>
                                ${rec.impact || 'Positive ROI'}
                            </div>
                        </div>
                    </div>
                    ${metricsHTML}
                    <div class="rec-details" style="margin-top: 20px; border-top: 1px dashed var(--border); padding-top: 15px;">
                        <div style="margin-bottom: 1rem;">
                            <strong style="font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; color:var(--text); opacity:0.8;">Execution Path</strong>
                            ${stepsHTML}
                        </div>
                        <div class="rec-meta" style="display:flex; gap:15px; flex-wrap:wrap; font-size:0.85rem; color:var(--text-secondary); margin-top:15px; align-items:center;">
                            ${rec.timeline ? `<span style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px;"><span class="material-symbols-outlined" style="font-size:1rem;">schedule</span> ${rec.timeline}</span>` : ''}
                            ${rec.tools && Array.isArray(rec.tools) && rec.tools.length ? `<span style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px;"><span class="material-symbols-outlined" style="font-size:1rem;">build</span> ${rec.tools.join(', ')}</span>` : ''}
                            ${rec.proTip ? `<span style="display:flex; align-items:flex-start; gap:6px; color:var(--blue-light); width:100%; margin-top:8px; background:rgba(59,130,246,0.05); padding:10px; border-radius:6px; border:1px solid rgba(59,130,246,0.2);"><span class="material-symbols-outlined" style="font-size:1.1rem;">lightbulb</span> <em><strong style="font-weight:600;">Pro Tip:</strong> ${rec.proTip}</em></span>` : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            insightsHtml = '<div style="color:var(--text-secondary); padding:20px; text-align:center;">No direct plan generated. Check data source.</div>';
        }

        // 2. Extra KPIs HTML
        let kpisHtml = '';
        if (analysisData.kpis && Array.isArray(analysisData.kpis)) {
            kpisHtml = analysisData.kpis.map(kpi => `
                <div class="kpi-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 15px; text-align:center; flex:1;">
                    <div class="kpi-label" style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${kpi.label}</div>
                    <div class="kpi-value" style="font-size: 1.8rem; font-weight: 700; color: #fff; font-family: 'Outfit', sans-serif;">${kpi.value}</div>
                    ${kpi.trend ? `<div style="font-size: 0.8rem; margin-top: 5px; color: ${kpi.trendColor === 'red' ? '#ef4444' : '#10b981'};">${kpi.trend}</div>` : ''}
                </div>
            `).join('');
        }

        // 3. Table HTML
        let tableHtml = '';
        if (analysisData.table && analysisData.table.headers && analysisData.table.rows) {
            tableHtml = `
            <div class="table-container" style="margin-top:20px; overflow-x:auto;">
                <h3 style="font-size:1.1rem; margin-bottom:12px; color:#fff;">${analysisData.table.title || 'Data Struct'}</h3>
                <table style="width:100%; border-collapse: collapse; text-align:left; font-size:0.9rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color:var(--text-secondary);">
                            ${analysisData.table.headers.map(h => `<th style="padding:10px;">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${analysisData.table.rows.map(r => `
                            <tr style="border-bottom: 1px solid var(--border);">
                                ${r.map(d => `<td style="padding:10px; color:#fff;">${d}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        // 4. Competitors HTML
        let compHtml = '';
        if (analysisData.competitors && Array.isArray(analysisData.competitors) && analysisData.competitors.length > 0) {
            compHtml = `
            <div style="margin-top:20px;">
                <h3 style="font-size:1.1rem; margin-bottom:12px; color:#fff;">Competitor Landscape</h3>
                <div style="display:flex; gap:15px; overflow-x:auto; padding-bottom:10px;">
                    ${analysisData.competitors.map(c => `
                        <div class="comp-card" style="background: rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:15px; min-width:200px;">
                            <h4 style="margin:0 0 10px 0; color:#fff;">${c.name}</h4>
                            <div style="font-size:0.85rem; color:var(--text-secondary);">
                                <div>Rating: <strong style="color:#fbbf24;">★ ${c.rating || 'N/A'}</strong></div>
                                <div>Reviews: ${c.reviews || '0'}</div>
                                ${c.photos ? `<div>Assets: ${c.photos}</div>` : ''}
                                ${c.posts ? `<div>Posts: ${c.posts}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        // Assemble Final HTML
        const html = `
            <div style="margin-top: 30px; animation: fadeUp 0.4s ease forwards;">
                <div class="summary-card glass-panel" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;">
                    <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 16px;">
                        <span class="material-symbols-outlined" style="color: var(--blue); font-size: 1.8rem;">psychology</span>
                        <h2 style="margin:0; font-size: 1.2rem; font-weight: 600;">Neural Executive Summary</h2>
                    </div>
                    <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">${data.executiveSummary || 'Awaiting telemetry...'}</p>
                </div>

                <div class="kpi-grid" style="margin-top: 20px; display:flex; gap:15px; flex-wrap:wrap;">
                    <div class="kpi-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; text-align:center; min-width:180px;">
                        <div class="kpi-label" style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Primary Score</div>
                        <div class="kpi-value" style="font-size: 2.2rem; font-weight: 700; color: var(--blue-light); font-family: 'Outfit', sans-serif;">${analysisData.score || 'N/A'}</div>
                    </div>
                    ${kpisHtml}
                </div>
                
                <div id="chartsContainer-${toolId}" style="margin-top:20px; display:flex; gap:20px; flex-wrap:wrap;"></div>

                ${tableHtml}
                ${compHtml}

                <div class="chart-card" style="margin-top: 20px; background: transparent; padding: 0;">
                    <div class="card-header" style="margin-bottom: 20px; display:flex; align-items:center; gap:10px;">
                        <span class="material-symbols-outlined" style="color: var(--blue-light);">map</span>
                        <h3 class="card-title" style="margin:0; font-size: 1.15rem; font-weight: 600;">Actionable Intelligence Plan</h3>
                    </div>
                    <div class="insights-container">
                        ${insightsHtml}
                    </div>
                </div>
            </div>
        `;

        resultsArea.innerHTML = html;
        resultsArea.classList.add('show');
        
        // Render Charts after DOM injection
        if (analysisData.charts && Array.isArray(analysisData.charts) && analysisData.charts.length > 0) {
            const container = document.getElementById(`chartsContainer-${toolId}`);
            analysisData.charts.forEach((chartData, idx) => {
                const wrap = document.createElement('div');
                wrap.style.cssText = "flex: 1; min-width:300px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 15px;";
                wrap.innerHTML = `<h4 style="margin:0 0 15px 0; font-size:0.95rem; font-weight:500; color:var(--text-secondary);">${chartData.title}</h4><canvas id="chart-${toolId}-${idx}"></canvas>`;
                container.appendChild(wrap);
                
                const ctx = document.getElementById(`chart-${toolId}-${idx}`).getContext('2d');
                new Chart(ctx, {
                    type: chartData.type || 'bar',
                    data: {
                        labels: chartData.labels || [],
                        datasets: chartData.datasets || []
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: chartData.type !== 'bar', labels:{color:'#fff'} } },
                        scales: chartData.type === 'bar' ? {
                            x: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { display: false } },
                            y: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                        } : {}
                    }
                });
            });
        }
    }
});
