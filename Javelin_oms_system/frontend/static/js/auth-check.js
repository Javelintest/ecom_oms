// auth-check.js
(function() {
    const token = localStorage.getItem('access_token');
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that don't require authentication
    const publicPages = ['login.html', 'register.html'];
    
    if (!token && !publicPages.includes(currentPage) && currentPage !== '') {
        window.location.href = 'login.html';
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem('javelin-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Add logout functionality when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const userEmail = localStorage.getItem('user_email');
        const userNameElements = document.querySelectorAll('.user-name');
        
        if (userEmail && userNameElements.length > 0) {
            userNameElements.forEach(el => el.textContent = userEmail.split('@')[0]);
        }

        // Add Logout button if it doesn't exist
        const logoutNav = document.querySelector('.sidebar-footer');
        if (logoutNav && !document.getElementById('logout-btn')) {
            const logoutContainer = document.createElement('div');
            logoutContainer.className = 'mt-3 pt-2 border-top';
            logoutContainer.innerHTML = `
                <a href="#" id="logout-btn" class="nav-link text-danger d-flex align-items-center gap-2" style="text-decoration: none; font-size: 0.85rem; font-weight: 600;">
                    <i class="bi bi-box-arrow-right"></i>
                    <span>Log Out</span>
                </a>
            `;
            logoutNav.appendChild(logoutContainer);

            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_email');
                window.location.href = 'login.html';
            });
        }
    });
})();
