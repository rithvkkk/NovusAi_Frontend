document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('analysis-form');
    const toolkitSelector = document.getElementById('toolkit-selector');
    const configPanel = document.getElementById('config-panel');
    const dynamicInputs = document.getElementById('dynamic-inputs');
    const activeToolTitle = document.getElementById('active-tool-title');
    
    // UI state elements
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const progressBar = document.getElementById('progress');
    const statusText = document.getElementById('loader-status');
    const exportBtn = document.getElementById('export-btn');

    let activeTool = '';
    let uploadedFiles = [];

    window.selectTool = (toolId) => {
        activeTool = toolId;
        toolkitSelector.style.display = 'none';
        configPanel.classList.remove('hidden');
        configPanel.style.display = 'block';
        
        // Reset state
        uploadedFiles = [];
        dynamicInputs.innerHTML = '';
        
        if (toolId === 'ads') {
            activeToolTitle.innerHTML = '<i data-lucide="mouse-pointer-click"></i> Media Buyer AI Configuration';
            dynamicInputs.innerHTML = `
                <div class="input-section full-width">
                    <h3><i data-lucide="file-video"></i> Dashboard Screenshots</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">Upload Google Ads / Meta Ads / TikTok dashboards for visual extraction.</p>
                    <div class="drop-zone" id="drop-zone">
                        <i data-lucide="image-plus" class="drop-icon"></i>
                        <span class="drop-title">Drop dashboard images here</span>
                        <input type="file" id="file-upload" accept="image/png, image/jpeg" multiple hidden>
                    </div>
                    <div id="preview-gallery" class="preview-gallery"></div>
                </div>
            `;
            setTimeout(setupDragAndDrop, 100);
        } else if (toolId === 'seo') {
            activeToolTitle.innerHTML = '<i data-lucide="globe"></i> SEO & CRO Architect Configuration';
            dynamicInputs.innerHTML = `
                <div class="input-group full-width">
                    <label for="website-url">Target Website URL</label>
                    <input type="url" id="website-url" placeholder="https://yourdomain.com" required>
                </div>
            `;
        } else if (toolId === 'social') {
            activeToolTitle.innerHTML = '<i data-lucide="smartphone"></i> Social Velocity AI Configuration';
            dynamicInputs.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" class="full-width">
                    <div class="input-group">
                        <label for="ig-url">Instagram Handle/URL</label>
                        <input type="text" id="ig-url" placeholder="@yourbrand" required>
                    </div>
                    <div class="input-group">
                        <label for="tt-url">TikTok Handle/URL</label>
                        <input type="text" id="tt-url" placeholder="@yourbrand">
                    </div>
                </div>
            `;
        } else if (toolId === 'email') {
            activeToolTitle.innerHTML = '<i data-lucide="mail"></i> Retention Analyst Configuration';
            dynamicInputs.innerHTML = `
                 <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" class="full-width">
                    <div class="input-group">
                        <label for="email-list">Total Subscribers</label>
                        <input type="number" id="email-list" placeholder="e.g. 15000" min="0" required>
                    </div>
                    <div class="input-group">
                        <label for="automation-status">Core Automations Live?</label>
                        <select id="automation-status" required>
                            <option value="none">No flows set up</option>
                            <option value="basic">Basic Welcome Series Only</option>
                            <option value="advanced">Full Lifecycle Flows</option>
                        </select>
                    </div>
                </div>
            `;
        }
        lucide.createIcons();
    };

    window.goBack = () => {
        configPanel.style.display = 'none';
        results.style.display = 'none';
        toolkitSelector.style.display = 'block';
    };

    function setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-upload');
        const gallery = document.getElementById('preview-gallery');

        if(!dropZone) return;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        ['dragleave', 'dragend'].forEach(type => dropZone.addEventListener(type, () => dropZone.classList.remove('dragover')));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, gallery);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFiles(e.target.files, gallery);
        });
    }

    function handleFiles(files, gallery) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                if (uploadedFiles.length > 0) uploadedFiles = []; 
                gallery.innerHTML = ''; 
                uploadedFiles.push(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'preview-item';
                    div.innerHTML = \`<img src="\${e.target.result}" alt="Preview"><button type="button" class="remove-btn"><i data-lucide="x"></i></button>\`;
                    div.querySelector('.remove-btn').addEventListener('click', (ev) => { ev.stopPropagation(); div.remove(); uploadedFiles = []; });
                    gallery.appendChild(div);
                    lucide.createIcons();
                }
                reader.readAsDataURL(file);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = { tool: activeTool, data: {} };

        if (activeTool === 'seo') {
            payload.data.url = document.getElementById('website-url').value;
        } else if (activeTool === 'social') {
            payload.data.ig = document.getElementById('ig-url').value;
            payload.data.tt = document.getElementById('tt-url').value;
        } else if (activeTool === 'email') {
            payload.data.listSize = document.getElementById('email-list').value;
            payload.data.automation = document.getElementById('automation-status').value;
        }

        configPanel.style.display = 'none';
        loader.classList.remove('hidden');

        // Simulated Progress
        let progress = 10;
        progressBar.style.width = '10%';
        statusText.textContent = "Connecting to LLM cluster...";
        const uxInterval = setInterval(() => {
            if (progress < 90) { progress += 5; progressBar.style.width = \`\${progress}%\`; }
        }, 1000);

        try {
            const formData = new FormData();
            formData.append('payload', JSON.stringify(payload));
            const userId = localStorage.getItem('novusUserId');
            if (userId) formData.append('userId', userId);
            
            if (activeTool === 'ads' && uploadedFiles.length > 0) {
                formData.append('screenshot', uploadedFiles[0]);
            }

            const response = await fetch('http://localhost:3000/api/analyze', {
                method: 'POST',
                body: formData
            });

            clearInterval(uxInterval);
            progressBar.style.width = '100%';

            if (!response.ok) throw new Error("Analysis failed. Backend might be down.");
            
            const aiAnalysis = await response.json();
            setTimeout(() => { renderResults(aiAnalysis); }, 600);

        } catch (error) {
            clearInterval(uxInterval);
            alert("Analysis Error: " + error.message);
            loader.classList.add('hidden');
            configPanel.style.display = 'block';
        }
    });

    exportBtn.addEventListener('click', () => {
        const element = document.getElementById('pdf-content-wrapper');
        const opt = {
            margin:       0.5,
            filename:     'Novus-AI-Analysis.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        exportBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Generating...';
        html2pdf().from(element).set(opt).save().then(() => {
            exportBtn.innerHTML = '<i data-lucide="download"></i> Export PDF';
            lucide.createIcons();
        });
    });

    function renderResults(data) {
        loader.classList.add('hidden');
        results.style.display = 'block';
        results.classList.remove('hidden');

        document.getElementById('insight-executive').innerHTML = \`<strong>AI Assessment:</strong> \${data.executiveSummary}\`;

        const metricTitle = document.getElementById('dynamic-metric-title');
        const scoreBox = document.getElementById('dynamic-score');
        const insightsList = document.getElementById('insight-dynamic');
        const icon = document.getElementById('dynamic-icon');
        const resultThemeMap = {
            'ads': { title: 'Media Buying Insights', icon: 'mouse-pointer-click', colorClass: 'icon-gads' },
            'seo': { title: 'Technical SEO Audit', icon: 'globe', colorClass: 'icon-seo' },
            'social': { title: 'Viral Coefficient Analysis', icon: 'smartphone', colorClass: 'icon-social' },
            'email': { title: 'Lifecycle Flow Analysis', icon: 'mail', colorClass: 'icon-mail' }
        };

        const theme = resultThemeMap[activeTool];
        icon.setAttribute('data-lucide', theme.icon);
        icon.className = theme.colorClass;
        metricTitle.innerText = theme.title;

        let parsedScore = data.analysisData?.score || "N/A";
        scoreBox.innerHTML = \`<span class="value">\${parsedScore}</span><span class="label">Score</span>\`;

        let listHTML = '';
        if (data.analysisData?.insights) {
            data.analysisData.insights.forEach(insight => { listHTML += \`<li>\${insight}</li>\`; });
        }
        insightsList.innerHTML = listHTML;

        lucide.createIcons();
    }
});
