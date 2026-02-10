/**
 * calc_8995.js - Form 8995 Qualified Business Income (QBI) Deduction
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.Calc8995 = {
    /**
     * Calculate QBI Deduction
     * @param {Object} state - Application state
     * @param {number} qbiIncome - Total Net Profit from Schedule C (mapped as QBI)
     * @param {number} taxableIncomeBeforeQBI - AGI minus Standard Deduction
     * @param {number} netCapitalGain - Positive amount from Line 7 (for limit calculation)
     * @returns {number} - The deduction amount for Line 13
     */
    calculate(state, qbiIncome = 0, taxableIncomeBeforeQBI = 0, netCapitalGain = 0) {
        if (qbiIncome <= 0 || taxableIncomeBeforeQBI <= 0) return 0;

        // Check Thresholds for Form 8995 usage
        const status = state.filingStatus || 'single';
        // Default to single threshold if constant missing, though it should be there.
        const threshold = (window.TaxCore.Constants && window.TaxCore.Constants.qbiThreshold && window.TaxCore.Constants.qbiThreshold[status])
            ? window.TaxCore.Constants.qbiThreshold[status]
            : 191950;

        if (taxableIncomeBeforeQBI > threshold) {
            // If income exceeds threshold, Form 8995-A is required.
            // For this simplified app, we return 0 to avoid incorrect calculation.
            console.warn(`Taxable income ${taxableIncomeBeforeQBI} exceeds QBI threshold ${threshold}. Form 8995-A required.`);
            return 0;
        }

        // 1. Core QBI Component (20% of QBI)
        // Note: For a more accurate calculation, QBI should be reduced by the SE Tax deduction (Line 10)
        // but often simplified to net profit for initial estimates unless specifically asked for "Part II" level detail.
        // We will use qbiIncome as passed (which in calc_1040 is Net Profit - SE Deduction if we sum them there).
        let qbiComponent = qbiIncome * 0.20;

        // 2. Taxable Income Limitation
        // Limit: 20% * (Taxable Income - Net Capital Gain)
        const incomeRemainingAfterCapitalGains = Math.max(0, taxableIncomeBeforeQBI - Math.max(0, netCapitalGain));
        const taxableIncomeLimit = incomeRemainingAfterCapitalGains * 0.20;

        // Results
        const deduction = Math.min(qbiComponent, taxableIncomeLimit);

        return Math.floor(deduction);
    }
};
