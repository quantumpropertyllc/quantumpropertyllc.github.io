
/**
 * scheduleD.js - Schedule D Form Logic
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.ScheduleD = {
    init() {
        const saveBtn = document.getElementById('btn-save-schd');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
    },

    open() {
        this.clearInputs();
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
            id: Date.now(),
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

        window.TaxCore.State.addForm('scheduleD', entry);

        window.TaxCore.Nav.closeModal('modal-schd');
        this.renderSummary();
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

            if (entry.type === 'carryover') {
                const term = entry.carryoverTerm === 'ST' ? 'Short-Term' : 'Long-Term';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:500;">
                        <span>${entry.description} (${term} Carryover)</span>
                        <span style="color: #c92a2a">-$${entry.carryoverAmount.toLocaleString()}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#666;">
                        Loss Carryover from previous year
                    </div>
                `;
            } else {
                const gainLoss = entry.proceeds - entry.basis;
                const isLongTerm = window.TaxCore.CalcScheduleD.checkIsLongTerm(entry.dateAcquired, entry.dateSold);
                const termLabel = isLongTerm ? 'LT' : 'ST';
                const catLabel = entry.category ? `Box ${entry.category}` : termLabel;

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:500;">
                        <span>${entry.description} (${catLabel})</span>
                        <span style="color: ${gainLoss >= 0 ? '#087f5b' : '#c92a2a'}">$${gainLoss.toLocaleString()}</span>
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
