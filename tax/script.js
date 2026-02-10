
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
    window.TaxCore.Forms.Schedule3.init();
    window.TaxCore.Forms.Dependents.init();
    window.TaxCore.Forms.ScheduleC.init();
    window.TaxCore.Forms.ScheduleD.init();
    window.TaxCore.Forms.ScheduleE.init();
    window.TaxCore.Forms.Misc.init();
    window.TaxCore.Forms.R.init();
    window.TaxCore.Forms.SSA1099.init();


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

    // Subscribe to State Changes to update UI
    window.TaxCore.State.subscribe((state) => {
        // Automatically call renderSummary on all form modules that define it
        Object.values(window.TaxCore.Forms).forEach(module => {
            if (module && typeof module.renderSummary === 'function') {
                try {
                    module.renderSummary();
                } catch (e) {
                    console.error('Error rendering summary for module:', module, e);
                }
            }
        });

        // Update 1040 lines
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
                formsCount: {
                    w2: state.forms.w2.length,
                    int: state.forms.int.length,
                    div: state.forms.div.length,
                    schC: state.forms.scheduleC.length,
                    schD: state.forms.scheduleD.length,
                    schE: state.forms.scheduleE.length
                }
            }, null, 2)}`;
        }
    });

    console.log('Tax App Ready');
});
