
/**
 * state.js - Manages the global state of the tax return.
 * Stores all form data and handles recalculation triggers.
 * Attached to window.TaxCore for file:// compatibility.
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.State = {
    // Metadata
    filingStatus: 'single', // default
    personalDetails: {
        age65: false,
        blind: false,
        spouseAge65: false,
        spouseBlind: false
    },

    // Form Data Storage
    forms: {
        w2: [], // Array of W-2 objects
        int: [], // Array of 1099-INT objects
        div: [], // Array of 1099-DIV objects
        schedule3: null, // Single object for Schedule 3
        scheduleC: [], // Array of Schedule C objects
        scheduleD: [], // Array of Schedule D objects
        scheduleE: [], // Array of Schedule E objects
        misc: [], // Array of 1099-MISC objects
        r: [], // Array of 1099-R objects
        scheduleB: {
            foreignAccounts: false,
            foreignTrust: false,
            country: ''
        }
    },

    // Dependents
    dependents: {
        qualifyingChildren: 0,
        otherDependents: 0
    },

    // Getters for aggregation
    getTotalWages() {
        return this.forms.w2.reduce((sum, form) => sum + (parseFloat(form.wages) || 0), 0);
    },

    getTotalTaxWithheld() {
        let total = 0;
        this.forms.w2.forEach(f => total += (parseFloat(f.fedTax) || 0));
        this.forms.int.forEach(f => total += (parseFloat(f.fedTax) || 0));
        this.forms.div.forEach(f => total += (parseFloat(f.fedTax) || 0));
        this.forms.misc.forEach(f => total += (parseFloat(f.fedTax) || 0));
        this.forms.r.forEach(f => total += (parseFloat(f.fedTax) || 0));
        return total;
    },

    // Save State (Local Memory Only for privacy)
    listeners: [],

    subscribe(callback) {
        this.listeners.push(callback);
    },

    notify() {
        this.listeners.forEach(cb => cb(this));
    },

    // Actions
    addForm(type, data) {
        if (!this.forms[type]) this.forms[type] = [];
        this.forms[type].push(data);
        this.notify();
    },

    updateFilingStatus(status) {
        this.filingStatus = status;
        this.notify();
    }
};
