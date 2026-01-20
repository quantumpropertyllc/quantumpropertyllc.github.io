
/**
 * scheduleC.js - Schedule C Form Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleC = {
    init() {
        const saveBtn = document.getElementById('btn-save-schc');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        this.clearInputs();
        window.TaxCore.Nav.openModal('modal-schc');
    },

    clearInputs() {
        document.getElementById('schc-biz-name').value = '';
        document.getElementById('schc-gross').value = '';
        document.getElementById('schc-expenses').value = '';
        document.getElementById('schc-owner').value = 'taxpayer';
    },

    save() {
        const name = document.getElementById('schc-biz-name').value || 'Business';
        const gross = parseFloat(document.getElementById('schc-gross').value) || 0;
        const expenses = parseFloat(document.getElementById('schc-expenses').value) || 0;
        const owner = document.getElementById('schc-owner').value;

        window.TaxCore.State.addForm('scheduleC', {
            id: Date.now(),
            name,
            grossReceipts: gross,
            totalExpenses: expenses,
            owner
        });

        window.TaxCore.Nav.closeModal('modal-schc');
        this.renderSummary();
    },

    renderSummary() {
        const container = document.getElementById('schc-list');
        if (!container) return;

        container.innerHTML = '';
        const businesses = window.TaxCore.State.forms.scheduleC || [];

        businesses.forEach(biz => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px solid #eee';

            const net = biz.grossReceipts - biz.totalExpenses;
            const ownerLabel = biz.owner === 'spouse' ? ' (Spouse)' : '';

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:500;">
                    <span>${biz.name}${ownerLabel}</span>
                    <span style="color: ${net >= 0 ? '#087f5b' : '#c92a2a'}">$${net.toLocaleString()}</span>
                </div>
                <div style="font-size:0.8rem; color:#666;">
                    Gross: $${biz.grossReceipts.toLocaleString()} | Exp: $${biz.totalExpenses.toLocaleString()}
                </div>
            `;
            container.appendChild(div);
        });

        // Update tile
        const totals = window.TaxCore.CalcScheduleC.calculate(window.TaxCore.State);
        const label = document.getElementById('dash-schc-total');
        if (label) {
            label.innerText = totals.totalNet !== 0
                ? `$${totals.totalNet.toLocaleString()} Net Profit`
                : 'Add Business';
        }
    }
};
