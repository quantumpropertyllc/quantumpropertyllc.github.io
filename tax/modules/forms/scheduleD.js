
/**
 * scheduleD.js - Schedule D Form Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleD = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-schd');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        this.clearInputs();

        if (id) {
            const data = window.TaxCore.State.getForm('scheduleD', id);
            if (data) {
                document.getElementById('schd-type').value = data.type || 'sale';
                document.getElementById('schd-description').value = data.description || '';

                if (data.type === 'sale') {
                    document.getElementById('schd-category').value = data.category || 'A';
                    document.getElementById('schd-acquired').value = data.dateAcquired || '';
                    document.getElementById('schd-sold').value = data.dateSold || '';
                    document.getElementById('schd-proceeds').value = data.proceeds || '';
                    document.getElementById('schd-basis').value = data.basis || '';
                } else {
                    document.getElementById('schd-carryover-term').value = data.carryoverTerm || 'ST';
                    document.getElementById('schd-carryover-amount').value = data.carryoverAmount || '';
                }
            }
        }

        this.toggleType(); // Ensure correct visibility
        window.TaxCore.Nav.openModal('modal-schd');
    },

    toggleType() {
        const type = document.getElementById('schd-type').value;
        const assetFields = document.getElementById('schd-asset-fields');
        const carryoverFields = document.getElementById('schd-carryover-fields');

        if (type === 'sale') {
            assetFields.style.display = 'block';
            carryoverFields.style.display = 'none';
        } else {
            assetFields.style.display = 'none';
            carryoverFields.style.display = 'block';
        }
    },

    clearInputs() {
        document.getElementById('schd-type').value = 'sale';
        document.getElementById('schd-description').value = '';

        // Asset Fields
        document.getElementById('schd-category').value = 'A';
        document.getElementById('schd-acquired').value = '';
        document.getElementById('schd-sold').value = '';
        document.getElementById('schd-proceeds').value = '';
        document.getElementById('schd-basis').value = '';

        // Carryover Fields
        document.getElementById('schd-carryover-term').value = 'ST';
        document.getElementById('schd-carryover-amount').value = '';
    },

    save() {
        const type = document.getElementById('schd-type').value;
        const description = document.getElementById('schd-description').value;

        let entry = {
            id: this.editingId || Date.now(),
            type: type,
            description: description || (type === 'sale' ? 'Asset Sale' : 'Loss Carryover')
        };

        if (type === 'sale') {
            entry.category = document.getElementById('schd-category').value || 'A';
            entry.dateAcquired = document.getElementById('schd-acquired').value;
            entry.dateSold = document.getElementById('schd-sold').value;
            entry.proceeds = parseFloat(document.getElementById('schd-proceeds').value) || 0;
            entry.basis = parseFloat(document.getElementById('schd-basis').value) || 0;
        } else {
            entry.carryoverTerm = document.getElementById('schd-carryover-term').value;
            entry.carryoverAmount = parseFloat(document.getElementById('schd-carryover-amount').value) || 0;
        }

        window.TaxCore.State.saveForm('scheduleD', entry);

        window.TaxCore.Nav.closeModal('modal-schd');
        this.editingId = null;
    },

    renderSummary() {
        const container = document.getElementById('schd-list');
        if (!container) return;

        container.innerHTML = '';
        const entries = window.TaxCore.State.forms.scheduleD || [];

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px solid #eee';
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(entry.id);
            };

            if (entry.type === 'carryover') {
                const term = entry.carryoverTerm === 'ST' ? 'Short-Term' : 'Long-Term';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:500; align-items:center;">
                        <span>${entry.description} (${term} Carryover)</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="color: #c92a2a">-$${entry.carryoverAmount.toLocaleString()}</span>
                            <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                    onclick="event.stopPropagation(); window.TaxCore.State.removeForm('scheduleD', ${entry.id})">×</button>
                        </div>
                    </div>
                `;
            } else {
                const gainLoss = entry.proceeds - entry.basis;
                const isLongTerm = window.TaxCore.CalcScheduleD.checkIsLongTerm(entry.dateAcquired, entry.dateSold);
                const termLabel = isLongTerm ? 'LT' : 'ST';
                const catLabel = entry.category ? `Box ${entry.category}` : termLabel;

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:500; align-items:center;">
                        <span>${entry.description} (${catLabel})</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="color: ${gainLoss >= 0 ? '#087f5b' : '#c92a2a'}">$${gainLoss.toLocaleString()}</span>
                            <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                                    onclick="event.stopPropagation(); window.TaxCore.State.removeForm('scheduleD', ${entry.id})">×</button>
                        </div>
                    </div>
                    <div style="font-size:0.8rem; color:#666;">
                        Proceeds: $${entry.proceeds.toLocaleString()} | Basis: $${entry.basis.toLocaleString()}
                    </div>
                `;
            }
            container.appendChild(div);
        });

        // Update tile
        const result = window.TaxCore.CalcScheduleD.calculate(window.TaxCore.State);
        const label = document.getElementById('dash-schd-total');
        if (label) {
            const val = result.amountOn1040Line7;
            label.innerText = val !== 0
                ? `$${val.toLocaleString()} ${val >= 0 ? 'Gain' : 'Loss'}`
                : 'Add Asset Sale';
        }
    }
};
