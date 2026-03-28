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

    // === FILE UPLOAD LOGIC (MEDIA BUYER TAB) ===
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const uploadPreviews = document.getElementById('uploadPreviews');
    let uploadedFiles = [];

    if (uploadZone) {
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', e => handleFiles(e.target.files));
    }

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            uploadedFiles = []; // For this demo we just keep 1 file for now to avoid large payloads
            uploadPreviews.innerHTML = ''; 
            
            uploadedFiles.push(file);
            const reader = new FileReader();
            reader.onload = e => {
                const wrap = document.createElement('div');
                wrap.className = 'upload-preview';
                wrap.style.cssText = 'position:relative; display:inline-block; margin-top:10px; border-radius:8px; overflow:hidden; border:1px solid var(--border);';
                wrap.innerHTML = `<img src="${e.target.result}" style="max-height: 100px; display:block;" alt="screenshot"/>
                <button type="button" onclick="this.parentElement.remove(); window.uploadedFiles=[];" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">✗</button>`;
                uploadPreviews.appendChild(wrap);
            };
            reader.readAsDataURL(file);
        });
    }
    window.uploadedFiles = uploadedFiles; // make accessible for inline onclick if needed

    // === ANALYSIS LOGIC ===
    window.runAnalysis = async (toolId) => {
        const btn = document.getElementById(`analyze-${toolId}`);
        const resultsArea = document.getElementById(`results-${toolId}`);
        const ragBadge = document.getElementById('ragBadge');

        // Extract Payload based on tool string
        const payload = { tool: toolId, data: {} };
        if (toolId === 'ads') {
            payload.data.url = document.getElementById('adsUrl').value;
        } else if (toolId === 'seo') {
            const url = document.getElementById('seoUrl').value;
            if(!url) return alert("Please enter a URL.");
            payload.data.url = url;
        } else if (toolId === 'social') {
            payload.data.ig = document.getElementById('igHandle').value;
            payload.data.tt = document.getElementById('ttHandle').value;
            if(!payload.data.ig && !payload.data.tt) return alert("Please enter at least one handle.");
        } else if (toolId === 'email') {
            payload.data.listSize = document.getElementById('listSize').value;
            payload.data.automation = document.getElementById('automationStatus').value;
            if(!payload.data.listSize) return alert("Please enter list size.");
        }

        // UI Loading State
        btn.classList.add('loading');
        btn.disabled = true;
        resultsArea.classList.remove('show');
        
        // Show Global RAG Badge
        ragBadge.classList.add('show');

        try {
            const formData = new FormData();
            formData.append('payload', JSON.stringify(payload));
            const userId = localStorage.getItem('novusUserId');
            if (userId) formData.append('userId', userId);
            
            if (toolId === 'ads' && window.uploadedFiles && window.uploadedFiles.length > 0) {
                formData.append('screenshot', window.uploadedFiles[0]);
            }

            // Call Backend
            const response = await fetch('http://localhost:3000/api/analyze', {
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
    };

    function renderResults(toolId, data, resultsArea) {
        
        const insightsHtml = data.analysisData?.insights?.map(insight => 
            `<li style="padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; display:flex; align-items:flex-start; gap: 10px;">
                <span class="material-symbols-outlined" style="color: var(--blue); font-size: 1.2rem;">bolt</span>
                <span style="color: var(--text-secondary); line-height: 1.5; font-size: 0.9rem;">${insight}</span>
            </li>`
        ).join('') || '<li>No insights generated.</li>';

        const html = `
            <div style="margin-top: 30px; animation: fadeUp 0.4s ease forwards;">
                <div class="summary-card glass-panel" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;">
                    <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 16px;">
                        <span class="material-symbols-outlined" style="color: var(--blue); font-size: 1.8rem;">psychology</span>
                        <h2 style="margin:0; font-size: 1.2rem; font-weight: 600;">Neural Executive Summary</h2>
                    </div>
                    <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">${data.executiveSummary}</p>
                </div>

                <div class="kpi-grid" style="margin-top: 20px;">
                    <div class="kpi-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; text-align:center;">
                        <div class="kpi-label" style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Primary Analysis Score</div>
                        <div class="kpi-value" style="font-size: 2.2rem; font-weight: 700; color: #fff; font-family: 'Outfit', sans-serif;">${data.analysisData?.score || 'N/A'}</div>
                    </div>
                </div>

                <div class="chart-card" style="margin-top: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;">
                    <div class="card-header" style="margin-bottom: 20px;">
                        <h3 class="card-title" style="margin:0; font-size: 1.1rem; font-weight: 600;">Actionable AI Insights</h3>
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${insightsHtml}
                    </ul>
                </div>
            </div>
        `;

        resultsArea.innerHTML = html;
        resultsArea.classList.add('show');
    }

});
