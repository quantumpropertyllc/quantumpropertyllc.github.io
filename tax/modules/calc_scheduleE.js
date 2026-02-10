/**
 * calc_scheduleE.js - Schedule E Supplemental Income Calculation Logic
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.CalcScheduleE = {
    /**
     * Calculate Schedule E (Rental Real Estate and Royalties)
     * @param {Object} state - Application state
     * @returns {Object} - Netted income/loss
     */
    calculate(state) {
        const properties = state.forms.scheduleE || [];

        let totalRentalIncome = 0;
        let totalRentalExpenses = 0;

        properties.forEach(prop => {
            totalRentalIncome += (parseFloat(prop.rents) || 0) + (parseFloat(prop.royalties) || 0);
            totalRentalExpenses += (parseFloat(prop.expenses) || 0);
        });

        const netIncome = totalRentalIncome - totalRentalExpenses;

        // Simplified Passive Loss Rule: 
        // We will return the net, but in calc_1040 we should check for AGI limits
        // if we want to perfect the $25k allowance.

        return {
            totalIncome: totalRentalIncome,
            totalExpenses: totalRentalExpenses,
            netResult: netIncome
        };
    }
};
