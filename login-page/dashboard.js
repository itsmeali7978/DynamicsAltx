console.log("Dashboard Insights v2 Loaded");
document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Greeting
    const userName = localStorage.getItem('userName') || 'ERP Admin';
    
    // Update Welcome Greeting
    const welcomeH1 = document.querySelector('.welcome-text h1');
    if (welcomeH1) {
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12) greeting = 'Good afternoon';
        if (hour >= 18) greeting = 'Good evening';
        
        welcomeH1.innerHTML = `${greeting}, ${userName}`;
    }

    // Dashboard specific active state (if any links are specific to this page)
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active');
        }
    });

    // --- Executive Insights Logic ---

    // 1. Update Hijri Date
    const updateHijriDate = () => {
        const hijriEl = document.getElementById('hijri-date');
        if (hijriEl) {
            try {
                const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                hijriEl.innerText = formatter.format(new Date());
            } catch (e) {
                hijriEl.innerText = "Check Calendar";
            }
        }
    };

    // 2. Update Gregorian Date
    const updateGregorianDate = () => {
        const gregEl = document.getElementById('gregorian-date');
        if (gregEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            gregEl.innerText = new Date().toLocaleDateString('en-US', options);
        }
    };

    // 3. Update Weather (Simulated for Riyadh/Dubai region)
    const updateWeather = () => {
        const tempEl = document.getElementById('weather-temp');
        const iconEl = document.getElementById('weather-icon');
        
        if (tempEl && iconEl) {
            // Simulated real-time weather for the region
            const hour = new Date().getHours();
            let temp = 32; // Default
            let condition = "Sunny";
            let iconClass = "ri-sun-fill";

            if (hour >= 18 || hour < 6) {
                temp = 24;
                condition = "Clear Night";
                iconClass = "ri-moon-clear-fill";
            } else if (hour >= 12 && hour < 16) {
                temp = 38;
                condition = "Hot & Sunny";
                iconClass = "ri-sun-line";
            } else {
                temp = 28;
                condition = "Pleasant";
                iconClass = "ri-sun-cloudy-line";
            }

            tempEl.innerText = `${temp}°C - ${condition}`;
            iconEl.className = iconClass;
        }
    };

    // 4. Update System Announcements (Dynamic from API with 3-item rotation)
    let allAnnouncements = [];
    let currentOffset = 0;

    const renderAnnouncements = (list) => {
        const announcementList = document.querySelector('.task-list');
        if (!announcementList) return;
        
        announcementList.innerHTML = '';
        if (!list || list.length === 0) {
            announcementList.innerHTML = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.85rem;">No active updates.</li>';
            return;
        }

        list.forEach(ann => {
            const li = document.createElement('li');
            li.className = 'animate-in'; // Add entry animation
            let iconClass = 'ri-information-fill';
            let iconColor = 'var(--primary)';
            let contentClass = '';

            if (ann.type === 'Success') {
                iconClass = 'ri-checkbox-circle-fill';
                iconColor = 'var(--success)';
                contentClass = 'text-success';
            } else if (ann.type === 'Warning') {
                iconClass = 'ri-error-warning-fill';
                iconColor = 'var(--orange)';
            }

            li.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${ann.title}</div>
                    <div class="task-due ${contentClass}">${ann.content}</div>
                </div>
                <i class="${iconClass}" style="color: ${iconColor};"></i>
            `;
            announcementList.appendChild(li);
        });
    };

    const updateAnnouncements = async () => {
        try {
            const response = await fetch('/api/Announcements');
            const data = await response.json();
            allAnnouncements = data;
            
            // Initial render or reset if data changed significantly
            rotateAnnouncements();
        } catch (error) {
            console.error('Error fetching announcements:', error);
        }
    };

    const rotateAnnouncements = () => {
        if (allAnnouncements.length === 0) {
            renderAnnouncements([]);
            return;
        }

        if (allAnnouncements.length <= 3) {
            renderAnnouncements(allAnnouncements);
            return;
        }

        // Get the next slice of 3
        let slice = allAnnouncements.slice(currentOffset, currentOffset + 3);
        
        // Handle wrap-around gracefully for seamless looping
        if (slice.length < 3) {
            slice = [...slice, ...allAnnouncements.slice(0, 3 - slice.length)];
        }

        renderAnnouncements(slice);
        
        // Advance offset for next time
        currentOffset = (currentOffset + 3) % allAnnouncements.length;
    };

    // Initialize all insights
    updateHijriDate();
    updateGregorianDate();
    updateWeather();
    updateAnnouncements();

    // Refresh data periodically
    setInterval(updateWeather, 30 * 60 * 1000);
    setInterval(updateAnnouncements, 60 * 1000); // Fetch new data every minute
    setInterval(rotateAnnouncements, 10 * 1000); // Rotate display every 10 seconds
});
