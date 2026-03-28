document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('analysis-form');
    const configPanel = document.getElementById('config-panel');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const progressBar = document.getElementById('progress');
    const statusText = document.getElementById('loader-status');
    const resetBtn = document.getElementById('reset-btn');
    const exportBtn = document.getElementById('export-btn');

    // Drag and Drop Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-upload');
    const gallery = document.getElementById('preview-gallery');

    let uploadedFiles = [];
    let radarChartInstance = null;

    // --- Drag and Drop Logic --- //
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => {
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                // We only process one primary image right now to avoid huge payloads
                if (uploadedFiles.length > 0) uploadedFiles = []; // Replace if new one added for demo simplicity
                gallery.innerHTML = ''; 
                
                uploadedFiles.push(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'preview-item';
                    div.innerHTML = `
                        <img src="${e.target.result}" alt="Dashboard Preview">
                        <button type="button" class="remove-btn"><i data-lucide="x"></i></button>
                    `;
                    
                    div.querySelector('.remove-btn').addEventListener('click', () => {
                        div.remove();
                        uploadedFiles = [];
                    });

                    gallery.appendChild(div);
                    lucide.createIcons();
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // --- Analysis Logic --- //

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            industry: document.getElementById('business-type').value,
            seo: { url: document.getElementById('website-url').value },
            social: {
                ig: document.getElementById('ig-url').value,
                tt: document.getElementById('tt-url').value
            },
            email: {
                listSize: parseInt(document.getElementById('email-list').value) || 0,
                automation: document.getElementById('automation-status').value
            }
        };

        configPanel.style.display = 'none';
        loader.classList.remove('hidden');

        // Start Simulated Progress Bar for UX while backend works
        let progress = 10;
        progressBar.style.width = '10%';
        statusText.textContent = "Uploading dashboard snapshots...";
        
        const uxInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 5;
                progressBar.style.width = `${progress}%`;
                statusText.textContent = getSpinnerText(progress);
            }
        }, 1000);

        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));
            
            const userId = localStorage.getItem('novusUserId');
            if (userId) formData.append('userId', userId);

            if (uploadedFiles.length > 0) {
                formData.append('screenshot', uploadedFiles[0]);
            }

            const response = await fetch('http://localhost:3000/api/analyze', {
                method: 'POST',
                body: formData
            });

            clearInterval(uxInterval);
            progressBar.style.width = '100%';
            statusText.textContent = "Finalizing Executive Summary...";

            if (!response.ok) {
                throw new Error("Backend parsing failed. Ensure AI Keys are active.");
            }

            const aiAnalysis = await response.json();
            
            setTimeout(() => {
                renderResults(aiAnalysis);
            }, 600);

        } catch (error) {
            clearInterval(uxInterval);
            alert("Analysis Error: " + error.message);
            loader.classList.add('hidden');
            configPanel.style.display = 'block';
        }
    });

    function getSpinnerText(val) {
        if (val < 30) return "AI Vision parsing screen metrics...";
        if (val < 50) return "Evaluating retention multipliers via Email...";
        if (val < 70) return "Calculating Viral coefficients on Social...";
        return "Synthesizing full marketing strategy...";
    }

    resetBtn.addEventListener('click', () => {
        results.classList.add('hidden');
        setTimeout(() => {
            configPanel.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 500);
    });

    exportBtn.addEventListener('click', () => {
        const element = document.getElementById('pdf-content-wrapper');
        const opt = {
            margin:       0.5,
            filename:     'Novus-AI-Marketing-Audit.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        exportBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Generating...';
        lucide.createIcons();

        html2pdf().from(element).set(opt).save().then(() => {
            exportBtn.innerHTML = '<i data-lucide="download"></i> Export PDF';
            lucide.createIcons();
        });
    });

    function renderResults(data) {
        loader.classList.add('hidden');
        results.style.display = 'block';
        results.classList.remove('hidden');

        document.getElementById('insight-executive').innerHTML = `<strong>Neural Assessment:</strong> ${data.executiveSummary}`;

        updateCard('seo-score', 'insight-seo', data.seo);
        updateCard('gads-score', 'insight-gads', data.gads);
        updateCard('meta-score', 'insight-meta', data.meta);
        updateCard('social-score', 'insight-social', data.social);
        updateCard('email-score', 'insight-email', data.email);
        updateCard('cro-score', 'insight-cro', data.cro);
        
        renderRadarChart(data);
    }

    function updateCard(scoreId, listId, moduleData) {
        if (!moduleData) return;
        
        const scoreEl = document.getElementById(scoreId);
        const listEl = document.getElementById(listId);

        let parsedScore = moduleData.score.toString();
        let rankClass = "value"; 
        
        // Fast regex to strip out characters if numerical
        let numVal = parseFloat(parsedScore.replace(/[^0-9.]/g, ''));
        if (!isNaN(numVal)) {
            if (scoreId.includes('email')) {
                rankClass = numVal > 2 ? "value excellent" : "value needs-work";
            } else if (scoreId.includes('social')) {
                rankClass = numVal > 2 ? "value excellent" : "value needs-work";
            } else {
                rankClass = numVal > 70 ? "value good" : "value needs-work";
            }
        } else {
            // Text based formatting (High, Low)
            if (parsedScore.toLowerCase().includes('high')) rankClass = "value excellent";
            if (parsedScore.toLowerCase().includes('low')) rankClass = "value needs-work";
        }

        scoreEl.innerHTML = `<span class="${rankClass}">${parsedScore}</span><span class="label">Score</span>`;
        
        let listHTML = '';
        if (moduleData.insights && Array.isArray(moduleData.insights)) {
            moduleData.insights.forEach(insight => {
                listHTML += `<li>${insight}</li>`;
            });
        }
        listEl.innerHTML = listHTML;
    }

    function renderRadarChart(data) {
        const ctx = document.getElementById('radarChart').getContext('2d');
        
        // Safely extract scores to 0-100 scale for plotting
        const normalize = (rawScore, type) => {
            let num = parseFloat(rawScore.toString().replace(/[^0-9.]/g, '')) || 0;
            if (type === 'social') return Math.min(100, num * 10); // scale 1-10 to 100
            if (type === 'email') return Math.min(100, num * 30);  // scale 1.5x up a bit
            if (type === 'cro') {
                if(rawScore.toString().toLowerCase().includes('high')) return 90;
                if(rawScore.toString().toLowerCase().includes('med')) return 50;
                return 20;
            }
            return num; // SEO, GADS, META are generally /100
        };

        const scores = [
            normalize(data.seo?.score, 'seo'),
            normalize(data.gads?.score, 'gads'),
            normalize(data.meta?.score, 'meta'),
            normalize(data.social?.score, 'social'),
            normalize(data.email?.score, 'email'),
            normalize(data.cro?.score, 'cro')
        ];

        if (radarChartInstance) radarChartInstance.destroy();

        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['SEO', 'Google Ads', 'Meta Ads', 'Social Velocity', 'Email Retent.', 'CRO'],
                datasets: [{
                    label: 'Marketing Pillar Health',
                    data: scores,
                    backgroundColor: 'rgba(56, 189, 248, 0.2)', // Neon blue tint
                    borderColor: 'rgba(56, 189, 248, 1)',
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0ea5e9',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#0ea5e9'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#94a3b8', font: { size: 12, family: "'Inter', sans-serif" } },
                        ticks: { display: false, min: 0, max: 100 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

});
