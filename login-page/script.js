document.addEventListener('DOMContentLoaded', () => {
    // Elegant Multi-state Toggle for Transparency UI
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Refined icon transitions
            togglePassword.classList.toggle('ri-eye-close-line');
            togglePassword.classList.toggle('ri-eye-line');
            
            // Subtle feedback
            togglePassword.style.color = isPassword ? 'var(--accent)' : 'var(--text-muted)';
        });
    }

    // Input Focus Interactions
    const inputs = document.querySelectorAll('.input-control input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.closest('.input-field').style.transform = 'translateX(4px)';
            input.parentElement.closest('.input-field').style.transition = 'transform 0.3s ease';
        });
        
        input.addEventListener('blur', () => {
            input.parentElement.closest('.input-field').style.transform = 'translateX(0)';
        });
    });

    // Executive Authentication Flow
    const form = document.querySelector('.login-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const btn = document.querySelector('.btn-executive');
            const btnLabel = btn.querySelector('.btn-label');
            const originalText = btnLabel.innerText;
            const originalIconClass = btn.querySelector('i').className;
            
            // Execute Authentication State
            btn.disabled = true;
            btnLabel.innerText = 'Synchronizing...';
            btn.querySelector('i').className = 'ri-refresh-line ri-spin';
            btn.style.opacity = '0.7';
            btn.style.cursor = 'wait';

            const payload = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            // Network Transaction
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || 'Access Denied') });
                }
                return response.json();
            })
            .then(data => {
                // Success State - Visual Confirmation
                btnLabel.innerText = 'Session Authorized';
                btn.querySelector('i').className = 'ri-shield-check-fill';
                btn.style.background = 'var(--success)';
                btn.style.boxShadow = '0 0 25px rgba(52, 211, 153, 0.4)';
                btn.style.opacity = '1';
                
                // Store user context for session
                if (data.user) {
                    localStorage.setItem('userName', data.user.name || 'ERP Admin');
                    localStorage.setItem('userLocation', data.user.location || 'Main Office');
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userRole', data.user.role || 'User');
                    console.log("Session Role Assigned:", data.user.role);
                }

                // Dashboard Handover
                setTimeout(() => {
                    // Visual transition before redirect
                    document.querySelector('.glass-card').style.opacity = '0';
                    document.querySelector('.glass-card').style.transform = 'scale(1.1) translateY(-20px)';
                    document.querySelector('.glass-card').style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 500);
                }, 1000);
            })
            .catch(error => {
                // Failure Recovery
                btnLabel.innerText = error.message;
                btn.querySelector('i').className = 'ri-spam-3-line';
                btn.style.background = 'var(--error)';
                btn.style.boxShadow = '0 0 25px rgba(251, 113, 133, 0.4)';
                btn.style.opacity = '1';
                
                // Shake Animation
                const card = document.querySelector('.glass-card');
                card.animate([
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(-6px)' },
                    { transform: 'translateX(6px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 300, iterations: 2 });

                // Reset Interface State
                setTimeout(() => {
                    btn.disabled = false;
                    btnLabel.innerText = originalText;
                    btn.querySelector('i').className = originalIconClass;
                    btn.style.background = 'var(--accent)';
                    btn.style.boxShadow = '0 10px 30px -10px var(--accent-glow)';
                    btn.style.cursor = 'pointer';
                }, 2500);
            });
        });
    }
});
