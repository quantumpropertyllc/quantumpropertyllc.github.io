/**
 * scheduleE.js - Handles UI and state for Schedule E (Supplemental Income) entries
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleE = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-sche');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        // Reset form
        document.getElementById('sche-description').value = '';
        document.getElementById('sche-rents').value = '';
        document.getElementById('sche-royalties').value = '';
        document.getElementById('sche-expenses').value = '';

        if (id) {
            const data = window.TaxCore.State.getForm('scheduleE', id);
            if (data) {
                document.getElementById('sche-description').value = data.description || '';
                document.getElementById('sche-rents').value = data.rents || '';
                document.getElementById('sche-royalties').value = data.royalties || '';
                document.getElementById('sche-expenses').value = data.expenses || '';
            }
        }

        window.TaxCore.Nav.openModal('modal-sche');
    },

    save() {
        const description = document.getElementById('sche-description').value || 'Property';
        const rents = parseFloat(document.getElementById('sche-rents').value) || 0;
        const royalties = parseFloat(document.getElementById('sche-royalties').value) || 0;
        const expenses = parseFloat(document.getElementById('sche-expenses').value) || 0;

        window.TaxCore.State.saveForm('scheduleE', {
            id: this.editingId || Date.now(),
            description,
            rents,
            royalties,
            expenses
        });

        window.TaxCore.Nav.closeModal('modal-sche');
        this.editingId = null;
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
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(entry.id);
            };

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:500; align-items:center;">
                    <span>${entry.description}</span> 
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color: ${net >= 0 ? '#087f5b' : '#c92a2a'}">$${net.toLocaleString()}</span>
                        <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                onclick="event.stopPropagation(); window.TaxCore.State.removeForm('scheduleE', ${entry.id})">×</button>
                    </div>
                </div>
            `;
            listDiv.appendChild(div);
        });

        if (dashTotal) {
            dashTotal.innerText = entries.length > 0 ? `$${totalNet.toLocaleString()} Net` : 'Add Rental';
        }
    }
};
