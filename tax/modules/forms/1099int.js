
/**
 * 1099int.js - Interest Income Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Int = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-int');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        document.getElementById('int-payer').value = '';
        document.getElementById('int-amount').value = '';

        if (id) {
            const data = window.TaxCore.State.getForm('int', id);
            if (data) {
                document.getElementById('int-payer').value = data.payer || '';
                document.getElementById('int-amount').value = data.amount || '';
            }
        }
        window.TaxCore.Nav.openModal('modal-int');
    },

    save() {
        const payer = document.getElementById('int-payer').value;
        const amount = parseFloat(document.getElementById('int-amount').value) || 0;

        window.TaxCore.State.saveForm('int', {
            id: this.editingId || Date.now(),
            payer,
            amount,
            fedTax: 0
        });

        window.TaxCore.Nav.closeModal('modal-int');
        this.editingId = null;
    },

    renderSummary() {
        const container = document.getElementById('int-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.int.forEach(item => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(item.id);
            };

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${item.payer || 'Bank'}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:500;">$${item.amount.toLocaleString()}</span>
                        <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                onclick="event.stopPropagation(); window.TaxCore.State.removeForm('int', ${item.id})">×</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

        // Update tile
        const total = window.TaxCore.State.forms.int.reduce((sum, i) => sum + i.amount, 0);
        const label = document.getElementById('dash-int-total');
        if (label) {
            label.innerText = total > 0 ? `$${total.toLocaleString()} Total` : 'Add Interest';
        }
    }
};
