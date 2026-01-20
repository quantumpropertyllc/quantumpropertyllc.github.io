/**
 * calc_scheduleB.js - Schedule B Calculation Logic
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.CalcScheduleB = {
    calculate(state) {
        // Part I: Interest
        const totalInterest = state.forms.int.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

        // Part II: Ordinary Dividends
        const totalDividends = state.forms.div.reduce((sum, f) => sum + (parseFloat(f.ordinary) || 0), 0);

        // Part III: Foreign Accounts
        const foreign = state.forms.scheduleB || {};
        const hasForeignAccounts = !!foreign.foreignAccounts;
        const hasForeignTrust = !!foreign.foreignTrust;

        // Requirement Check (Threshold > $1500)
        const isRequired = (totalInterest > 1500) || (totalDividends > 1500) || hasForeignAccounts || hasForeignTrust;

        return {
            totalInterest,
            totalDividends,
            foreignAccounts: hasForeignAccounts,
            foreignTrust: hasForeignTrust,
            country: foreign.country || '',
            isRequired
        };
    }
};
