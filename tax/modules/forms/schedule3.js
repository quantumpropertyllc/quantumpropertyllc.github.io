
/**
 * schedule3.js - Schedule 3 Form Logic (Additional Credits and Payments)
 */
window.TaxCore = window.TaxCore || {};
window.TaxCore.Forms = window.TaxCore.Forms || {};

window.TaxCore.Forms.Schedule3 = {
    init() {
        const saveBtn = document.getElementById('btn-save-schedule3');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }

        // Tab switching
        const tab1 = document.getElementById('sch3-tab-part1');
        const tab2 = document.getElementById('sch3-tab-part2');
        if (tab1 && tab2) {
            tab1.addEventListener('click', () => this.switchTab('part1'));
            tab2.addEventListener('click', () => this.switchTab('part2'));
        }
    },

    switchTab(part) {
        const part1Content = document.getElementById('sch3-part1-content');
        const part2Content = document.getElementById('sch3-part2-content');
        const tab1 = document.getElementById('sch3-tab-part1');
        const tab2 = document.getElementById('sch3-tab-part2');

        if (part === 'part1') {
            part1Content.style.display = 'block';
            part2Content.style.display = 'none';
            tab1.classList.add('active');
            tab2.classList.remove('active');
        } else {
            part1Content.style.display = 'none';
            part2Content.style.display = 'block';
            tab1.classList.remove('active');
            tab2.classList.add('active');
        }
    },

    open() {
        // Load existing data if available
        const existing = window.TaxCore.State.forms.schedule3;

        if (existing) {
            // Part I - Nonrefundable Credits
            this.setVal('sch3-foreign-tax', existing.foreignTaxCredit);
            this.setVal('sch3-child-care', existing.childCareCredit);
            this.setVal('sch3-education', existing.educationCredit);
            this.setVal('sch3-retirement', existing.retirementCredit);
            this.setVal('sch3-energy-clean', existing.energyCleanCredit);
            this.setVal('sch3-energy-efficient', existing.energyEfficientCredit);
            this.setVal('sch3-other-nonrefund', existing.otherNonrefundable);

            // Part II - Other Payments and Refundable Credits
            this.setVal('sch3-premium-tax', existing.premiumTaxCredit);
            this.setVal('sch3-extension-payment', existing.extensionPayment);
            this.setVal('sch3-excess-ss', existing.excessSocialSecurity);
            this.setVal('sch3-fuel-credit', existing.fuelCredit);
            this.setVal('sch3-other-refund', existing.otherRefundable);
        } else {
            // Clear all inputs
            this.clearInputs();
        }

        // Show Part I by default
        this.switchTab('part1');
        window.TaxCore.Nav.openModal('modal-schedule3');
    },

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    },

    clearInputs() {
        const ids = [
            'sch3-foreign-tax', 'sch3-child-care', 'sch3-education',
            'sch3-retirement', 'sch3-energy-clean', 'sch3-energy-efficient',
            'sch3-other-nonrefund', 'sch3-premium-tax', 'sch3-extension-payment',
            'sch3-excess-ss', 'sch3-fuel-credit', 'sch3-other-refund'
        ];
        ids.forEach(id => this.setVal(id, ''));
    },

    save() {
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;

        // Part I - Nonrefundable Credits
        const foreignTaxCredit = getVal('sch3-foreign-tax');
        const childCareCredit = getVal('sch3-child-care');
        const educationCredit = getVal('sch3-education');
        const retirementCredit = getVal('sch3-retirement');
        const energyCleanCredit = getVal('sch3-energy-clean');
        const energyEfficientCredit = getVal('sch3-energy-efficient');
        const otherNonrefundable = getVal('sch3-other-nonrefund');

        // Part II - Other Payments and Refundable Credits
        const premiumTaxCredit = getVal('sch3-premium-tax');
        const extensionPayment = getVal('sch3-extension-payment');
        const excessSocialSecurity = getVal('sch3-excess-ss');
        const fuelCredit = getVal('sch3-fuel-credit');
        const otherRefundable = getVal('sch3-other-refund');

        // Calculate totals
        const totalNonrefundable = foreignTaxCredit + childCareCredit + educationCredit +
            retirementCredit + energyCleanCredit + energyEfficientCredit +
            otherNonrefundable;

        const totalRefundable = premiumTaxCredit + extensionPayment + excessSocialSecurity +
            fuelCredit + otherRefundable;

        const data = {
            // Part I
            foreignTaxCredit,
            childCareCredit,
            educationCredit,
            retirementCredit,
            energyCleanCredit,
            energyEfficientCredit,
            otherNonrefundable,
            totalNonrefundable,

            // Part II
            premiumTaxCredit,
            extensionPayment,
            excessSocialSecurity,
            fuelCredit,
            otherRefundable,
            totalRefundable
        };

        // Update state (replace existing, not add)
        window.TaxCore.State.forms.schedule3 = data;
        window.TaxCore.State.notify();

        window.TaxCore.Nav.closeModal('modal-schedule3');
    },

    renderSummary() {
        const data = window.TaxCore.State.forms.schedule3;
        const label = document.getElementById('dash-sch3-total');

        if (!label) return;

        if (data && (data.totalNonrefundable > 0 || data.totalRefundable > 0)) {
            const parts = [];
            if (data.totalNonrefundable > 0) {
                parts.push(`Credits: $${data.totalNonrefundable.toLocaleString()}`);
            }
            if (data.totalRefundable > 0) {
                parts.push(`Payments: $${data.totalRefundable.toLocaleString()}`);
            }
            label.innerText = parts.join(' | ');
            label.classList.add('active'); // Ensure visual feedback
        } else {
            label.innerText = 'Add Credits';
            label.classList.remove('active');
        }
    }
};
