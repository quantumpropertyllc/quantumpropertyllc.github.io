/**
 * 1099r.js - Form 1099-R Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.R = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-r');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        const ids = ['r-payer', 'r-gross', 'r-taxable', 'r-fedtax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const checkbox = document.getElementById('r-is-ira');
        if (checkbox) checkbox.checked = false;

        if (id) {
            const data = window.TaxCore.State.getForm('r', id);
            if (data) {
                document.getElementById('r-payer').value = data.payer || '';
                document.getElementById('r-gross').value = data.grossDistribution || '';
                document.getElementById('r-taxable').value = data.taxableAmount || '';
                document.getElementById('r-fedtax').value = data.fedTax || '';
                document.getElementById('r-is-ira').checked = !!data.isIRA;
            }
        }
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
            id: this.editingId || Date.now(),
            payer: getStr('r-payer'),
            grossDistribution: getVal('r-gross'),
            taxableAmount: getVal('r-taxable'),
            fedTax: getVal('r-fedtax'),
            isIRA: getCheck('r-is-ira')
        };

        window.TaxCore.State.saveForm('r', data);
        window.TaxCore.Nav.closeModal('modal-r');
        this.editingId = null;
    },

    renderSummary() {
        const container = document.getElementById('r-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.r.forEach(f => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(f.id);
            };

            const type = f.isIRA ? 'IRA' : 'Pension';

            div.innerHTML = `
                <div style="font-weight:500; display:flex; justify-content:space-between; align-items:center;">
                    <span>${f.payer || 'Unknown'} (${type})</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span>$${f.taxableAmount.toLocaleString()}</span>
                        <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                onclick="event.stopPropagation(); window.TaxCore.State.removeForm('r', ${f.id})">×</button>
                    </div>
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
