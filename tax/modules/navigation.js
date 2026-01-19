
/**
 * navigation.js - Handles view switching.
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.Nav = {
    views: ['dashboard', 'form-w2', 'form-int', 'review'],

    init() {
        // Bind navigation clicks
        document.querySelectorAll('[data-nav]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(el.dataset.nav);
            });
        });
    },

    navigate(viewId) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => {
            el.style.display = 'none';
        });

        // Show target view
        const target = document.getElementById(viewId);
        if (target) {
            target.style.display = 'block';
            target.scrollIntoView({ behavior: 'smooth' });

            // Update active state in sidebar
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            const activeNav = document.querySelector(`[data-nav="${viewId}"]`);
            if (activeNav) activeNav.classList.add('active');
        }
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
};
