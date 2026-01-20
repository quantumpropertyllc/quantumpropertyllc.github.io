/**
 * 1099r.js - Form 1099-R Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.R = {
    init() {
        const saveBtn = document.getElementById('btn-save-r');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        const ids = ['r-payer', 'r-gross', 'r-taxable', 'r-fedtax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const checkbox = document.getElementById('r-is-ira');
        if (checkbox) checkbox.checked = false;

        window.TaxCore.Nav.openModal('modal-r');
    },

    save() {
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const getStr = (id) => document.getElementById(id).value || '';
        const getCheck = (id) => {
            const el = document.getElementById(id);
            return el ? el.checked : false;
        };

        const data = {
            id: Date.now(),
            payer: getStr('r-payer'),
            grossDistribution: getVal('r-gross'),
            taxableAmount: getVal('r-taxable'),
            fedTax: getVal('r-fedtax'),
            isIRA: getCheck('r-is-ira')
        };

        window.TaxCore.State.addForm('r', data);
        window.TaxCore.Nav.closeModal('modal-r');
        this.renderSummary();
    },

    renderSummary() {
        const container = document.getElementById('r-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.r.forEach(f => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';

            const type = f.isIRA ? 'IRA' : 'Pension';

            div.innerHTML = `
                <div style="font-weight:500; display:flex; justify-content:space-between">
                    <span>${f.payer || 'Unknown'} (${type})</span>
                    <span>$${f.taxableAmount.toLocaleString()}</span>
                </div>
                <div style="font-size:0.8em; color:#888">
                    Gross: $${f.grossDistribution.toLocaleString()} | Fed Tax: $${f.fedTax.toLocaleString()}
                </div>
            `;
            container.appendChild(div);
        });

        const label = document.getElementById('dash-r-total');
        if (label) {
            const count = window.TaxCore.State.forms.r.length;
            label.innerText = count > 0 ? `${count} Forms` : 'Add 1099-R';
        }
    }
};
