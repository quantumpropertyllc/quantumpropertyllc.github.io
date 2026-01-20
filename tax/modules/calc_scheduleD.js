
/**
 * calc_scheduleD.js - Schedule D Calculation Logic
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.CalcScheduleD = {
    /**
     * Calculate Schedule D totals
     * @param {Object} state - Application state
     * @returns {Object} - Resulting gain/loss and details
     */
    calculate(state) {
        const entries = state.forms.scheduleD || [];

        let shortTermNet = 0;
        let longTermNet = 0;

        // Form 8949 / Schedule D Line Items breakdown
        const boxes = {
            A: { proceeds: 0, basis: 0 },
            B: { proceeds: 0, basis: 0 },
            C: { proceeds: 0, basis: 0 },
            D: { proceeds: 0, basis: 0 },
            E: { proceeds: 0, basis: 0 },
            F: { proceeds: 0, basis: 0 }
        };

        entries.forEach(entry => {
            if (entry.type === 'carryover') {
                const amount = parseFloat(entry.carryoverAmount) || 0;
                if (entry.carryoverTerm === 'LT') {
                    longTermNet -= amount;
                } else {
                    shortTermNet -= amount;
                }
            } else {
                const proceeds = parseFloat(entry.proceeds) || 0;
                const basis = parseFloat(entry.basis) || 0;
                const gainLoss = proceeds - basis;

                const cat = entry.category || (this.checkIsLongTerm(entry.dateAcquired, entry.dateSold) ? 'D' : 'A');

                if (boxes[cat]) {
                    boxes[cat].proceeds += proceeds;
                    boxes[cat].basis += basis;
                }

                // ST: A, B, C | LT: D, E, F
                const isLongTerm = ['D', 'E', 'F'].includes(cat);

                if (isLongTerm) {
                    longTermNet += gainLoss;
                } else {
                    shortTermNet += gainLoss;
                }
            }
        });

        const totalNet = shortTermNet + longTermNet;

        // Loss limitation check
        const filingStatus = state.filingStatus || 'single';
        const lossLimit = filingStatus === 'mfs' ? -1500 : -3000;

        let amountOn1040Line7 = totalNet;
        let isLimited = false;

        if (totalNet < lossLimit) {
            amountOn1040Line7 = lossLimit;
            isLimited = true;
        }

        return {
            shortTermNet,
            longTermNet,
            totalNet,
            amountOn1040Line7,
            isLimited,
            hasLongTermGain: longTermNet > 0 && totalNet > 0,
            boxes // Granular data for Part I (ST) and Part II (LT)
        };
    },

    /**
     * Helper to determine holding period. 
     * Assets held > 1 year are Long-Term.
     */
    checkIsLongTerm(acquired, sold) {
        if (!acquired || !sold) return false;

        const d1 = new Date(acquired);
        const d2 = new Date(sold);

        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

        const diffYears = d2.getFullYear() - d1.getFullYear();
        if (diffYears > 1) return true;
        if (diffYears === 1) {
            const diffMonths = d2.getMonth() - d1.getMonth();
            if (diffMonths > 0) return true;
            if (diffMonths === 0) {
                return d2.getDate() > d1.getDate();
            }
        }
        return false;
    }
};
