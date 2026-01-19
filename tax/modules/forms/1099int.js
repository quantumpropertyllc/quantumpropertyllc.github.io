
/**
 * 1099int.js - Interest Income Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Int = {
    init() {
        const saveBtn = document.getElementById('btn-save-int');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        document.getElementById('int-payer').value = '';
        document.getElementById('int-amount').value = '';
        window.TaxCore.Nav.openModal('modal-int');
    },

    save() {
        const payer = document.getElementById('int-payer').value;
        const amount = parseFloat(document.getElementById('int-amount').value) || 0;

        window.TaxCore.State.addForm('int', {
            id: Date.now(),
            payer,
            amount,
            fedTax: 0 // Usually 0 for interest, but can be added if needed
        });

        window.TaxCore.Nav.closeModal('modal-int');
        this.renderSummary();
    },

    renderSummary() {
        const container = document.getElementById('int-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.int.forEach(item => {
            const div = document.createElement('div');
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <span>${item.payer || 'Bank'}</span>
                    <span>$${item.amount.toLocaleString()}</span>
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
