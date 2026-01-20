
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
        window.TaxCore.Nav.openModal('modal-schd');
    },

    clearInputs() {
        document.getElementById('schd-description').value = '';
        document.getElementById('schd-category').value = 'A';
        document.getElementById('schd-acquired').value = '';
        document.getElementById('schd-sold').value = '';
        document.getElementById('schd-proceeds').value = '';
        document.getElementById('schd-basis').value = '';
    },

    save() {
        const description = document.getElementById('schd-description').value || 'Asset';
        const category = document.getElementById('schd-category').value || 'A';
        const dateAcquired = document.getElementById('schd-acquired').value;
        const dateSold = document.getElementById('schd-sold').value;
        const proceeds = parseFloat(document.getElementById('schd-proceeds').value) || 0;
        const basis = parseFloat(document.getElementById('schd-basis').value) || 0;

        window.TaxCore.State.addForm('scheduleD', {
            id: Date.now(),
            description,
            category,
            dateAcquired,
            dateSold,
            proceeds,
            basis
        });

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
