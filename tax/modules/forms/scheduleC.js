
/**
 * scheduleC.js - Schedule C Form Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleC = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-schc');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        this.clearInputs();

        if (id) {
            const data = window.TaxCore.State.getForm('scheduleC', id);
            if (data) {
                document.getElementById('schc-biz-name').value = data.name || '';
                document.getElementById('schc-gross').value = data.grossReceipts || '';
                document.getElementById('schc-expenses').value = data.totalExpenses || '';
                document.getElementById('schc-owner').value = data.owner || 'taxpayer';
            }
        }
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

        window.TaxCore.State.saveForm('scheduleC', {
            id: this.editingId || Date.now(),
            name,
            grossReceipts: gross,
            totalExpenses: expenses,
            owner
        });

        window.TaxCore.Nav.closeModal('modal-schc');
        this.editingId = null;
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
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(biz.id);
            };

            const net = biz.grossReceipts - biz.totalExpenses;
            const ownerLabel = biz.owner === 'spouse' ? ' (Spouse)' : '';

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:500; align-items:center;">
                    <span>${biz.name}${ownerLabel}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color: ${net >= 0 ? '#087f5b' : '#c92a2a'}">$${net.toLocaleString()}</span>
                        <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                onclick="event.stopPropagation(); window.TaxCore.State.removeForm('scheduleC', ${biz.id})">×</button>
                    </div>
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
