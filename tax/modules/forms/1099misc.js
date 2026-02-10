/**
 * 1099misc.js - Form 1099-MISC Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Misc = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-misc');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        const ids = ['misc-payer', 'misc-rents', 'misc-royalties', 'misc-other', 'misc-fedtax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        if (id) {
            const data = window.TaxCore.State.getForm('misc', id);
            if (data) {
                document.getElementById('misc-payer').value = data.payer || '';
                document.getElementById('misc-rents').value = data.rents || '';
                document.getElementById('misc-royalties').value = data.royalties || '';
                document.getElementById('misc-other').value = data.otherIncome || '';
                document.getElementById('misc-fedtax').value = data.fedTax || '';
            }
        }
        window.TaxCore.Nav.openModal('modal-misc');
    },

    save() {
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const getStr = (id) => document.getElementById(id).value || '';

        const data = {
            id: this.editingId || Date.now(),
            payer: getStr('misc-payer'),
            rents: getVal('misc-rents'),
            royalties: getVal('misc-royalties'),
            otherIncome: getVal('misc-other'),
            fedTax: getVal('misc-fedtax')
        };

        window.TaxCore.State.saveForm('misc', data);
        window.TaxCore.Nav.closeModal('modal-misc');
        this.editingId = null;
    },

    renderSummary() {
        const container = document.getElementById('misc-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.misc.forEach(f => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(f.id);
            };

            const total = f.rents + f.royalties + f.otherIncome;

            div.innerHTML = `
                <div style="font-weight:500; display:flex; justify-content:space-between; align-items:center;">
                    <span>${f.payer || 'Unknown'}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span>$${total.toLocaleString()}</span>
                        <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                onclick="event.stopPropagation(); window.TaxCore.State.removeForm('misc', ${f.id})">×</button>
                    </div>
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
