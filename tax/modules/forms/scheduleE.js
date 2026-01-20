/**
 * scheduleE.js - Handles UI and state for Schedule E (Supplemental Income) entries
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleE = {
    init() {
        const saveBtn = document.getElementById('btn-save-sche');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open() {
        // Reset form
        document.getElementById('sche-description').value = '';
        document.getElementById('sche-rents').value = '';
        document.getElementById('sche-royalties').value = '';
        document.getElementById('sche-expenses').value = '';

        window.TaxCore.Nav.openModal('modal-sche');
    },

    save() {
        const description = document.getElementById('sche-description').value || 'Property';
        const rents = parseFloat(document.getElementById('sche-rents').value) || 0;
        const royalties = parseFloat(document.getElementById('sche-royalties').value) || 0;
        const expenses = parseFloat(document.getElementById('sche-expenses').value) || 0;

        window.TaxCore.State.addForm('scheduleE', {
            id: Date.now(),
            description,
            rents,
            royalties,
            expenses
        });

        window.TaxCore.Nav.closeModal('modal-sche');
        this.renderSummary();
    },

    renderSummary() {
        const listDiv = document.getElementById('sche-list');
        const dashTotal = document.getElementById('dash-sche-total');
        if (!listDiv) return;

        const entries = window.TaxCore.State.forms.scheduleE || [];
        listDiv.innerHTML = '';

        let totalNet = 0;

        entries.forEach(entry => {
            const net = entry.rents + entry.royalties - entry.expenses;
            totalNet += net;

            const div = document.createElement('div');
            div.className = 'summary-item';
            div.style.marginBottom = '8px';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:500;">
                    <span>${entry.description}</span> 
                    <span style="color: ${net >= 0 ? '#087f5b' : '#c92a2a'}">$${net.toLocaleString()}</span>
                </div>
            `;
            listDiv.appendChild(div);
        });

        if (dashTotal) {
            dashTotal.innerText = entries.length > 0 ? `$${totalNet.toLocaleString()} Net` : 'Add Rental';
        }
    }
};
