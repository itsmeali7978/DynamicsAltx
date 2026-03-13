document.addEventListener('DOMContentLoaded', () => {
    // Password Visibility Toggle
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Toggle icon classes safely
            if (isPassword) {
                togglePassword.classList.remove('ri-eye-off-line');
                togglePassword.classList.add('ri-eye-line');
            } else {
                togglePassword.classList.remove('ri-eye-line');
                togglePassword.classList.add('ri-eye-off-line');
            }
        });
    }

    // Input Focus Effects
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            const wrapper = input.parentElement;
            wrapper.style.transform = 'translateY(-2px)';
            wrapper.style.transition = 'transform 0.3s ease';
        });

        input.addEventListener('blur', () => {
            const wrapper = input.parentElement;
            wrapper.style.transform = 'translateY(0)';
        });
    });

    // Form Submission Animation (Simulated)
    const form = document.querySelector('.login-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const btn = document.querySelector('.btn-primary');
            const originalHTML = btn.innerHTML;
            const originalBackground = btn.style.background;
            
            // Show loading state
            btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i><span>Signing in...</span>';
            btn.style.opacity = '0.8';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';

            // API Request to ASP.NET Backend
            fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || 'Login failed') });
                }
                return response.json();
            })
            .then(data => {
                // Success state
                btn.innerHTML = '<i class="ri-check-line"></i><span>Success!</span>';
                btn.style.background = 'var(--success)';
                btn.style.opacity = '1';
                
                // Form reset & Reset button state later
                setTimeout(() => {
                    form.reset();
                    btn.innerHTML = originalHTML;
                    btn.style.background = originalBackground;
                    btn.style.cursor = 'pointer';
                    btn.style.pointerEvents = 'auto';
                }, 2000);
            })
            .catch(error => {
                // Error state
                btn.innerHTML = '<i class="ri-error-warning-line"></i><span>' + error.message + '</span>';
                btn.style.background = '#ef4444'; // Red color for error
                btn.style.opacity = '1';
                
                // Reset button state later
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = originalBackground;
                    btn.style.cursor = 'pointer';
                    btn.style.pointerEvents = 'auto';
                }, 3000);
            });
        });
    }
});
