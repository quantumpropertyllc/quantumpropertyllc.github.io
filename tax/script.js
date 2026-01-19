
/**
 * script.js - Main Application Controller
 * Initializes the TaxCore modules and handles global events.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Tax App Initializing...');

    // Init Modules
    window.TaxCore.Nav.init();
    window.TaxCore.Forms.W2.init();
    window.TaxCore.Forms.Int.init();
    window.TaxCore.Forms.Div.init();

    // Filing Status UI Handling
    const filingSelect = document.getElementById('filing-status-select');
    if (filingSelect) {
        // Set initial value
        filingSelect.value = window.TaxCore.State.filingStatus;

        // Listen for changes
        filingSelect.addEventListener('change', (e) => {
            window.TaxCore.State.updateFilingStatus(e.target.value);
        });
    }

    // Subscribe to State Changes to update Refund Meter
    window.TaxCore.State.subscribe((state) => {
        // Simple Estimation Logic for the meter
        const wages = state.getTotalWages();
        const withheld = state.getTotalTaxWithheld();

        const status = state.filingStatus || 'single';

        // Dynamic Standard Deduction from Constants
        let deduction = 0;
        if (window.TaxCore.Constants && window.TaxCore.Constants.standardDeduction) {
            deduction = window.TaxCore.Constants.standardDeduction[status] || 0;
        } else {
            deduction = 15000; // Fallback
        }

        const taxable = Math.max(0, wages - deduction);

        // Calculate Tax using extracted tables
        const tables = window.TaxCore.TaxTables[status];
        let estTax = 0;

        if (tables) {
            // Find the bracket
            let bracket = tables[0];
            for (let i = 0; i < tables.length; i++) {
                if (taxable > tables[i].over) {
                    bracket = tables[i];
                } else {
                    break;
                }
            }
            // Calculation: Base + (Excess * Rate)
            estTax = bracket.base + ((taxable - bracket.over) * bracket.rate);
        } else {
            // Fallback if table missing
            estTax = taxable * 0.15;
        }

        const refund = withheld - estTax;

        const el = document.getElementById('global-refund');
        if (el) {
            el.innerText = refund >= 0
                ? `$${Math.floor(refund).toLocaleString()}`
                : `-$${Math.floor(Math.abs(refund)).toLocaleString()}`;

            el.style.color = refund >= 0 ? '#94d2bd' : '#e5989b';
        }

        // Update 1040 View
        if (window.TaxCore.Calc1040) {
            const result = window.TaxCore.Calc1040.calculate(state);
            for (const [line, val] of Object.entries(result.lines)) {
                const lineEl = document.getElementById(`l${line}`);
                if (lineEl) {
                    const formatted = val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    lineEl.innerText = formatted;
                }
            }
        }

        // Update debug view
        const debug = document.getElementById('debug-output');
        if (debug) {
            debug.innerText = `Detailed State (Privacy: In-Memory Only):\n${JSON.stringify({
                ...state,
                standardDeductionApplied: deduction,
                projectedTax: estTax
            }, null, 2)}`;
        }
    });

    console.log('Tax App Ready');
});
