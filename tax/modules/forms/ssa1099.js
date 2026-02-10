/**
 * forms/ssa1099.js - SSA-1099 Form Handling
 */

window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.SSA1099 = {
    editingId: null,

    init() {
        const saveBtn = document.getElementById('btn-save-ssa1099');
        if (saveBtn) {
            saveBtn.onclick = () => this.save();
        }
    },

    open(id = null) {
        this.editingId = id ? String(id) : null;
        document.getElementById('ssa-net-benefits').value = '';
        document.getElementById('ssa-fed-tax').value = '';
        document.getElementById('ssa-person').value = 'taxpayer';

        if (id) {
            const data = window.TaxCore.State.getForm('ssa', id);
            if (data) {
                document.getElementById('ssa-person').value = data.person || 'taxpayer';
                document.getElementById('ssa-net-benefits').value = data.netBenefits || '';
                document.getElementById('ssa-fed-tax').value = data.fedTax || '';
            }
        }
        window.TaxCore.Nav.openModal('modal-ssa1099');
    },

    save() {
        const netBenefits = parseFloat(document.getElementById('ssa-net-benefits').value) || 0;
        const fedTax = parseFloat(document.getElementById('ssa-fed-tax').value) || 0;
        const person = document.getElementById('ssa-person').value;

        // Basic validation
        if (netBenefits <= 0 && fedTax <= 0) {
            alert("Please enter a valid benefit amount.");
            return;
        }

        const entry = {
            id: this.editingId || Date.now(),
            person: person, // 'taxpayer' or 'spouse'
            netBenefits: netBenefits,
            fedTax: fedTax
        };

        // We only allow one entry per person effectively, or we can just append. 
        // Logic: Usually one form per person, but let's stick to list style for consistency.
        window.TaxCore.State.saveForm('ssa', entry);

        // Clear and Close
        document.getElementById('ssa-net-benefits').value = '';
        document.getElementById('ssa-fed-tax').value = '';
        window.TaxCore.Nav.closeModal('modal-ssa1099');
        this.editingId = null;
    },

    renderSummary() {
        const entries = window.TaxCore.State.forms.ssa || [];
        const list = document.getElementById('ssa-list');
        const dashTotal = document.getElementById('dash-ssa-total');

        if (!list || !dashTotal) return;

        list.innerHTML = '';
        let total = 0;

        entries.forEach(entry => {
            total += entry.netBenefits;
            const item = document.createElement('div');
            item.style.padding = '4px 0';
            item.style.borderBottom = '1px dashed #eee';
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                e.stopPropagation();
                this.open(entry.id);
            };

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${entry.person === 'spouse' ? 'Spouse' : 'Taxpayer'}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:500;">$${entry.netBenefits.toLocaleString()}</span>
                    </div>
                </div>
            `;
            // Add delete button? For simplicity, clicking dashboard tile opens "Add". 
            // We need a way to manage/delete. 
            // IMPROVEMENT: Add a delete button here.
            const delBtn = document.createElement('span');
            delBtn.innerText = ' [x]';
            delBtn.style.color = 'red';
            delBtn.style.cursor = 'pointer';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                window.TaxCore.State.removeForm('ssa', entry.id);
            };
            item.querySelector('div').appendChild(delBtn);

            list.appendChild(item);
        });

        if (entries.length > 0) {
            dashTotal.innerText = `Total: $${total.toLocaleString()}`;
            dashTotal.classList.add('active');
        } else {
            dashTotal.innerText = 'Add SSA-1099';
            dashTotal.classList.remove('active');
        }
    }
};
