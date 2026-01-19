
/**
 * 1099div.js - Dividend Income Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Div = {
    init() {
        const saveBtn = document.getElementById('btn-save-div');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        document.getElementById('div-payer').value = '';
        document.getElementById('div-ord').value = '';
        document.getElementById('div-qual').value = '';
        window.TaxCore.Nav.openModal('modal-div');
    },

    save() {
        const payer = document.getElementById('div-payer').value;
        const ordinary = parseFloat(document.getElementById('div-ord').value) || 0;
        const qualified = parseFloat(document.getElementById('div-qual').value) || 0;

        window.TaxCore.State.addForm('div', {
            id: Date.now(),
            payer,
            ordinary,
            qualified,
            fedTax: 0
        });

        window.TaxCore.Nav.closeModal('modal-div');
        this.renderSummary();
    },

    renderSummary() {
        const container = document.getElementById('div-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.div.forEach(item => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <span>${item.payer || 'Brokerage'}</span>
                    <span>$${item.ordinary.toLocaleString()}</span>
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
