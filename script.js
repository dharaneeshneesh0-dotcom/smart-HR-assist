document.addEventListener('DOMContentLoaded', () => {
    const form        = document.getElementById('evaluationForm');
    const emptyState  = document.getElementById('emptyState');
    const loadingState= document.getElementById('loadingState');
    const resultContent = document.getElementById('resultContent');
    const generateBtn = document.getElementById('generateBtn');
    const btnText     = generateBtn.querySelector('span');
    const btnLoader   = document.getElementById('btnLoader');
    const copyBtn     = document.getElementById('copyBtn');
    const demoBtn     = document.getElementById('demoBtn');

    // ── Demo data ──────────────────────────────────────────────────────────
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            document.getElementById('name').value          = 'Alex Johnson';
            document.getElementById('role').value          = 'Senior Software Engineer';
            document.getElementById('manager_rating').value= '4';
            document.getElementById('peer_rating').value   = '5';
            document.getElementById('self_rating').value   = '3';
            document.getElementById('comments').value      =
                'Manager: Alex is a highly technical engineer who always delivers robust code, ' +
                'but sometimes struggles to speak up in larger architectural meetings.\n' +
                'Peer: Alex is incredibly helpful and a great mentor. Always willing to pair program.\n' +
                'Self: I feel my technical skills are okay, but I need to improve my communication and confidence.';
        });
    }

    // ── Form submit ────────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name          : document.getElementById('name').value.trim(),
            role          : document.getElementById('role').value.trim(),
            managerRating : parseInt(document.getElementById('manager_rating').value),
            peerRating    : parseInt(document.getElementById('peer_rating').value),
            selfRating    : parseInt(document.getElementById('self_rating').value),
            comments      : document.getElementById('comments').value.trim()
        };

        // UI → loading
        emptyState.classList.add('hidden');
        resultContent.classList.add('hidden');
        loadingState.classList.remove('hidden');
        btnText.textContent = 'Analyzing…';
        btnLoader.classList.remove('hidden');
        generateBtn.disabled = true;

        try {
            // Call our own backend (API key is safely stored in server .env)
            const response = await fetch('/api/evaluate', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Server error ${response.status}`);
            }

            // Populate UI
            document.getElementById('out-summary').textContent = result.summary;
            populateList('out-strengths', result.strengths);
            populateList('out-areas',     result.areas);
            populateList('out-goals',     result.goals);

            loadingState.classList.add('hidden');
            resultContent.classList.remove('hidden');

        } catch (error) {
            console.error('Error generating evaluation:', error);
            alert('Error generating evaluation: ' + error.message);
            emptyState.classList.remove('hidden');
            loadingState.classList.add('hidden');
        } finally {
            btnText.textContent  = 'Generate Evaluation';
            btnLoader.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    // ── Copy to clipboard ──────────────────────────────────────────────────
    copyBtn.addEventListener('click', () => {
        const text = `
Overall Performance Summary
${document.getElementById('out-summary').textContent}

Key Strengths
${Array.from(document.getElementById('out-strengths').children).map(li => '- ' + li.textContent).join('\n')}

Areas of Improvement
${Array.from(document.getElementById('out-areas').children).map(li => '- ' + li.textContent).join('\n')}

Future Goals
${Array.from(document.getElementById('out-goals').children).map(li => '- ' + li.textContent).join('\n')}
        `.trim();

        navigator.clipboard.writeText(text).then(() => {
            const orig = copyBtn.textContent;
            copyBtn.textContent          = '✅ Copied!';
            copyBtn.style.background     = 'rgba(16, 185, 129, 0.2)';
            copyBtn.style.borderColor    = '#10b981';
            setTimeout(() => {
                copyBtn.textContent       = orig;
                copyBtn.style.background  = 'transparent';
                copyBtn.style.borderColor = 'var(--primary-color)';
            }, 2000);
        });
    });

    // ── Helper ─────────────────────────────────────────────────────────────
    function populateList(id, items) {
        const ul = document.getElementById(id);
        ul.innerHTML = '';
        if (!Array.isArray(items)) return;
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });
    }
});
