
/**
 * 1099div.js - Dividend Income Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Div = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-div');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        document.getElementById('div-payer').value = '';
        document.getElementById('div-ord').value = '';
        document.getElementById('div-qual').value = '';

        if (id) {
            const data = window.TaxCore.State.getForm('div', id);
            if (data) {
                document.getElementById('div-payer').value = data.payer || '';
                document.getElementById('div-ord').value = data.ordinary || '';
                document.getElementById('div-qual').value = data.qualified || '';
            }
        }
        window.TaxCore.Nav.openModal('modal-div');
    },

    save() {
        const payer = document.getElementById('div-payer').value;
        const ordinary = parseFloat(document.getElementById('div-ord').value) || 0;
        const qualified = parseFloat(document.getElementById('div-qual').value) || 0;

        window.TaxCore.State.saveForm('div', {
            id: this.editingId || Date.now(),
            payer,
            ordinary,
            qualified,
            fedTax: 0
        });

        window.TaxCore.Nav.closeModal('modal-div');
        this.editingId = null;
    },

    renderSummary() {
        const container = document.getElementById('div-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.div.forEach(item => {
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
                    <span>${item.payer || 'Brokerage'}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:500;">$${item.ordinary.toLocaleString()}</span>
                        <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                onclick="event.stopPropagation(); window.TaxCore.State.removeForm('div', ${item.id})">×</button>
                    </div>
                </div>
                <div style="font-size:0.8em; color:#888">Qual: $${item.qualified.toLocaleString()}</div>
            `;
            container.appendChild(div);
        });

        // Update tile
        const total = window.TaxCore.State.forms.div.reduce((sum, i) => sum + i.ordinary, 0);
        const label = document.getElementById('dash-div-total');
        if (label) {
            label.innerText = total > 0 ? `$${total.toLocaleString()} Total` : 'Add Dividends';
        }
    }
};
