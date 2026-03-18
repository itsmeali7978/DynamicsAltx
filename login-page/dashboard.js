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
});
