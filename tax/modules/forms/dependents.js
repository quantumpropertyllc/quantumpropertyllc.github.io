
/**
 * dependents.js - Dependents Form Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Dependents = {
    init() {
        const saveBtn = document.getElementById('btn-save-dependents');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        // Load existing data if available
        const existing = window.TaxCore.State.dependents;

        if (existing) {
            this.setVal('dep-qualifying-children', existing.qualifyingChildren);
            this.setVal('dep-other-dependents', existing.otherDependents);
        } else {
            this.clearInputs();
        }

        window.TaxCore.Nav.openModal('modal-dependents');
    },

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    },

    clearInputs() {
        this.setVal('dep-qualifying-children', '');
        this.setVal('dep-other-dependents', '');
    },

    save() {
        const getVal = (id) => parseInt(document.getElementById(id).value) || 0;

        const data = {
            qualifyingChildren: getVal('dep-qualifying-children'),
            otherDependents: getVal('dep-other-dependents')
        };

        // Update state
        window.TaxCore.State.dependents = data;
        window.TaxCore.State.notify();

        window.TaxCore.Nav.closeModal('modal-dependents');
        this.renderSummary();
    },

    renderSummary() {
        const data = window.TaxCore.State.dependents;
        const label = document.getElementById('dash-dependents-total');

        if (!label) return;

        if (data && (data.qualifyingChildren > 0 || data.otherDependents > 0)) {
            const parts = [];
            if (data.qualifyingChildren > 0) {
                parts.push(`${data.qualifyingChildren} child${data.qualifyingChildren > 1 ? 'ren' : ''}`);
            }
            if (data.otherDependents > 0) {
                parts.push(`${data.otherDependents} other`);
            }
            label.innerText = parts.join(', ');
        } else {
            label.innerText = 'Add Dependents';
        }
    }
};
