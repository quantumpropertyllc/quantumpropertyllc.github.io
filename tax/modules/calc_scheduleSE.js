/**
 * calc_scheduleSE.js - Schedule SE (Self-Employment Tax) calculation logic for 2025
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.CalcScheduleSE = {
    /**
     * Calculate Schedule SE for Taxpayer or Spouse
     * @param {number} netProfit - Combined net profit from Schedule C and Partnership SE income
     * @returns {Object} - Resulting tax and deduction
     */
    calculate(netProfit, w2Wages = 0) {
        if (netProfit < 400) {
            return { tax: 0, deduction: 0 };
        }

        // Constants for 2025
        const SS_WAGE_BASE = 176100;
        const SS_RATE = 0.124;
        const MED_RATE = 0.029;
        const SE_NET_RATIO = 0.9235;

        // 1. Net earnings from self-employment
        const netEarnings = netProfit * SE_NET_RATIO;

        // 2. Social Security Tax (capped)
        // Adjust cap based on W-2 SS Wages already taxed
        const availableCap = Math.max(0, SS_WAGE_BASE - w2Wages);
        const ssTaxable = Math.min(netEarnings, availableCap);
        const ssTax = ssTaxable * SS_RATE;

        // 3. Medicare Tax (unlimited)
        const medTax = netEarnings * MED_RATE;

        // 4. Total SE Tax
        const totalTax = ssTax + medTax;

        // 5. Deductible portion (50% of SE tax)
        const deduction = totalTax / 2;

        return {
            tax: Math.round(totalTax * 100) / 100,
            deduction: Math.round(deduction * 100) / 100
        };
    }
};
