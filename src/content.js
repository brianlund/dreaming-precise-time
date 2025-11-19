// Detect which language page we're on
function getCurrentLanguage() {
    const url = window.location.href;
    if (url.includes('/french/')) {
        return 'fr';
    } else if (url.includes('/spanish/')) {
        return 'es';
    }
    return null;
}

async function updatePreciseTime() {
    const language = getCurrentLanguage();
    if (!language) {
        console.log('Dreaming Precise Time: Unknown language page');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Dreaming Precise Time: No token found');
            return;
        }

        const response = await fetch('https://app.dreaming.com/.netlify/functions/user', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'GET'
        });

        const data = await response.json();

        // Get language-specific data
        const externalTimeSeconds = data.user.externalTimeSummary[language]?.timeSeconds || 0;
        const watchTime = data.user.cumulativeWatchTimes[language] || 0;

        let totalSeconds = externalTimeSeconds + watchTime;

        // Calculate hours and minutes
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds -= hours * 3600;
        const minutes = Math.floor(totalSeconds / 60) % 60;

        // Find and update the time display element
        const snippet = document.getElementsByClassName('ds-overall-progression-card__info-label--bold')[1];

        if (snippet) {
            snippet.textContent = `${hours} hrs ${minutes} mins`;
            console.log(`Dreaming Precise Time: Updated ${language} time to ${hours} hrs ${minutes} mins`);
        } else {
            console.log('Dreaming Precise Time: Could not find time display element');
        }
    } catch (error) {
        console.error('Dreaming Precise Time error:', error);
    }
}

// Keep track of last update to avoid excessive calls
let lastUpdateTime = 0;
let cachedTimeText = '';

function debouncedUpdate() {
    const now = Date.now();
    // Only update if 5 seconds have passed since last update
    if (now - lastUpdateTime > 5000) {
        lastUpdateTime = now;
        updatePreciseTime();
    }
}

// Wait for page to load, then update
if (window.chrome) {
    window.addEventListener("load", () => setTimeout(updatePreciseTime, 750));
} else {
    setTimeout(updatePreciseTime, 750);
}

// Create observer to watch for specific element changes only
const observer = new MutationObserver((mutations) => {
    // Only react if the time display element itself changed
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && (node.classList?.contains('ds-overall-progression-card__info-label--bold') || node.querySelector?.('.ds-overall-progression-card__info-label--bold'))) {
                debouncedUpdate();
                return;
            }
        }
    }
});

// Only observe the specific container, not entire body
const container = document.querySelector('.ds-overall-progression-card') || document.body;
observer.observe(container, {
    childList: true,
    subtree: true
});
