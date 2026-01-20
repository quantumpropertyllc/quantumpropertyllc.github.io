/**
 * 1099misc.js - Form 1099-MISC Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Misc = {
    init() {
        const saveBtn = document.getElementById('btn-save-misc');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        const ids = ['misc-payer', 'misc-rents', 'misc-royalties', 'misc-other', 'misc-fedtax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        window.TaxCore.Nav.openModal('modal-misc');
    },

    save() {
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const getStr = (id) => document.getElementById(id).value || '';

        const data = {
            id: Date.now(),
            payer: getStr('misc-payer'),
            rents: getVal('misc-rents'),
            royalties: getVal('misc-royalties'),
            otherIncome: getVal('misc-other'),
            fedTax: getVal('misc-fedtax')
        };

        window.TaxCore.State.addForm('misc', data);
        window.TaxCore.Nav.closeModal('modal-misc');
        this.renderSummary();
    },

    renderSummary() {
        const container = document.getElementById('misc-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.misc.forEach(f => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';

            const total = f.rents + f.royalties + f.otherIncome;

            div.innerHTML = `
                <div style="font-weight:500; display:flex; justify-content:space-between">
                    <span>${f.payer || 'Unknown'}</span>
                    <span>$${total.toLocaleString()}</span>
                </div>
                <div style="font-size:0.8em; color:#888">
                    Fed Tax: $${f.fedTax.toLocaleString()}
                </div>
            `;
            container.appendChild(div);
        });

        const label = document.getElementById('dash-misc-total');
        if (label) {
            const count = window.TaxCore.State.forms.misc.length;
            label.innerText = count > 0 ? `${count} Forms` : 'Add 1099-MISC';
        }
    }
};
