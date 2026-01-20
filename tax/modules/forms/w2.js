
/**
 * w2.js - W-2 Form Logic
 * Enhanced to include SS/Medicare fields/
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.W2 = {
    init() {
        const saveBtn = document.getElementById('btn-save-w2');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        // Clear all inputs
        const ids = ['w2-employer', 'w2-wages', 'w2-fedtax', 'w2-ss-wages', 'w2-ss-tax', 'w2-med-wages', 'w2-med-tax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        window.TaxCore.Nav.openModal('modal-w2');
    },

    save() {
        // Helper to safely get float
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const getStr = (id) => document.getElementById(id).value || '';

        const data = {
            id: Date.now(),
            employer: getStr('w2-employer'),
            owner: getStr('w2-owner'),
            wages: getVal('w2-wages'),
            fedTax: getVal('w2-fedtax'),
            ssWages: getVal('w2-ss-wages'),
            ssTax: getVal('w2-ss-tax'),
            medWages: getVal('w2-med-wages'),
            medTax: getVal('w2-med-tax')
        };

        window.TaxCore.State.addForm('w2', data);
        window.TaxCore.Nav.closeModal('modal-w2');
        this.renderSummary();
    },

    renderSummary() {
        const container = document.getElementById('w2-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.w2.forEach(w2 => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';

            const ownerLabel = w2.owner === 'spouse' ? '(Spouse)' : '(Taxpayer)';

            div.innerHTML = `
                <div style="font-weight:500; display:flex; justify-content:space-between">
                    <span>${w2.employer || 'Unknown'} <small style="font-weight:normal; color:#666">${ownerLabel}</small></span>
                    <span>$${w2.wages.toLocaleString()}</span>
                </div>
                <div style="font-size:0.8em; color:#888">
                    Fed Tax: $${w2.fedTax.toLocaleString()} | SS+Med: $${(w2.ssTax + w2.medTax).toLocaleString()}
                </div>
            `;
            container.appendChild(div);
        });

        // Update dashboard tile count/total
        const totalWages = window.TaxCore.State.getTotalWages();
        const label = document.getElementById('dash-wages-total');
        if (label) {
            label.innerText = totalWages > 0 ? `$${totalWages.toLocaleString()} Total` : 'Add W-2';
        }
    }
};
