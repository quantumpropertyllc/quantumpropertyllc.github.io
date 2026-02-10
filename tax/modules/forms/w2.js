
/**
 * w2.js - W-2 Form Logic
 * Enhanced to include SS/Medicare fields/
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.W2 = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-w2');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        // Ensure editingId is always a string for consistency
        this.editingId = id ? String(id) : null;
        // Clear all inputs
        const ids = ['w2-employer', 'w2-wages', 'w2-fedtax', 'w2-ss-wages', 'w2-ss-tax', 'w2-med-wages', 'w2-med-tax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        if (id) {
            const data = window.TaxCore.State.getForm('w2', id);
            if (data) {
                document.getElementById('w2-employer').value = data.employer || '';
                document.getElementById('w2-owner').value = data.owner || 'taxpayer';
                document.getElementById('w2-wages').value = data.wages || '';
                document.getElementById('w2-fedtax').value = data.fedTax || '';
                document.getElementById('w2-ss-wages').value = data.ssWages || '';
                document.getElementById('w2-ss-tax').value = data.ssTax || '';
                document.getElementById('w2-med-wages').value = data.medWages || '';
                document.getElementById('w2-med-tax').value = data.medTax || '';
            }
        }

        window.TaxCore.Nav.openModal('modal-w2');
    },

    save() {
        // Helper to safely get float
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const getStr = (id) => document.getElementById(id).value || '';

        const data = {
            id: this.editingId || Date.now(),
            employer: getStr('w2-employer'),
            owner: getStr('w2-owner'),
            wages: getVal('w2-wages'),
            fedTax: getVal('w2-fedtax'),
            ssWages: getVal('w2-ss-wages'),
            ssTax: getVal('w2-ss-tax'),
            medWages: getVal('w2-med-wages'),
            medTax: getVal('w2-med-tax')
        };

        window.TaxCore.State.saveForm('w2', data);
        window.TaxCore.Nav.closeModal('modal-w2');
        this.editingId = null;
    },

    renderSummary() {
        const container = document.getElementById('w2-list');
        if (!container) return;

        container.innerHTML = '';
        window.TaxCore.State.forms.w2.forEach(w2 => {
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.style.padding = '8px 0';
            div.style.borderBottom = '1px solid #eee';
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                e.stopPropagation();
                this.open(w2.id);
            };

            const ownerLabel = w2.owner === 'spouse' ? '(Spouse)' : '(Taxpayer)';

            div.innerHTML = `
                <div style="font-weight:500; display:flex; justify-content:space-between">
                    <span>${w2.employer || 'Unknown'} <small style="font-weight:normal; color:#666">${ownerLabel}</small></span>
                    <span>$${w2.wages.toLocaleString()}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <div style="font-size:0.8em; color:#888">
                        Fed Tax: $${w2.fedTax.toLocaleString()} | SS+Med: $${(w2.ssTax + w2.medTax).toLocaleString()}
                    </div>
                    <button class="btn-delete" style="color:#c92a2a; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:0 4px;" 
                            onclick="event.stopPropagation(); window.TaxCore.State.removeForm('w2', ${w2.id})">×</button>
                </div>
            `;
            container.appendChild(div);
        });

        // Update dashboard tile count/total
        const totalWages = window.TaxCore.State.getTotalWages();
        const label = document.getElementById('dash-wages-total');
        if (label) {
            label.innerText = totalWages > 0 ? `$${totalWages.toLocaleString()} Total` : 'Add W-2';
        }
    }
};
