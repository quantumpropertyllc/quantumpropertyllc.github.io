/**
 * scheduleB.js - Schedule B Part III Logic
 * Handles the foreign accounts questionnaire.
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleB = {
    init() {
        const saveBtn = document.getElementById('btn-save-schB');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        const state = window.TaxCore.State.forms.scheduleB || {};

        const setCheck = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!val;
        };

        setCheck('schB-foreign-accounts', state.foreignAccounts);
        setCheck('schB-foreign-trust', state.foreignTrust);

        const countryEl = document.getElementById('schB-country');
        if (countryEl) countryEl.value = state.country || '';

        // Toggle visibility based on checkbox
        this.toggleCountryInput();
        const accCheck = document.getElementById('schB-foreign-accounts');
        if (accCheck) {
            accCheck.addEventListener('change', () => this.toggleCountryInput());
        }

        window.TaxCore.Nav.openModal('modal-schB');
    },

    toggleCountryInput() {
        const accCheck = document.getElementById('schB-foreign-accounts');
        const container = document.getElementById('schB-country-container');
        if (accCheck && container) {
            container.style.display = accCheck.checked ? 'block' : 'none';
        }
    },

    save() {
        const getCheck = (id) => {
            const el = document.getElementById(id);
            return el ? el.checked : false;
        };
        const getStr = (id) => document.getElementById(id).value || '';

        const data = {
            foreignAccounts: getCheck('schB-foreign-accounts'),
            foreignTrust: getCheck('schB-foreign-trust'),
            country: getStr('schB-country')
        };

        // Directly update the single object in state
        window.TaxCore.State.forms.scheduleB = data;
        window.TaxCore.State.notify();
        window.TaxCore.Nav.closeModal('modal-schB');
        this.renderSummary();
    },

    renderSummary() {
        const label = document.getElementById('dash-schB-status');
        if (!label) return;

        // Check if required based on thresholds
        const intTotal = window.TaxCore.State.forms.int.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
        const divTotal = window.TaxCore.State.forms.div.reduce((s, f) => s + (parseFloat(f.ordinary) || 0), 0);
        const isHighIncome = (intTotal > 1500) || (divTotal > 1500);

        const state = window.TaxCore.State.forms.scheduleB;
        const hasForeign = state.foreignAccounts || state.foreignTrust;

        if (isHighIncome || hasForeign) {
            label.innerText = 'Required (Active)';
            label.style.color = '#e03131'; // Warning color
        } else {
            label.innerText = 'Optional';
            label.style.color = '#495057';
        }
    }
};
