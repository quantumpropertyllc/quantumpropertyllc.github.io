
/**
 * calc_scheduleC.js - Schedule C Calculation Logic
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.CalcScheduleC = {
    /**
     * Calculate Schedule C totals
     * @param {Object} state - Application state
     * @returns {Object} - Totals for taxpayer and spouse
     */
    calculate(state) {
        const businesses = state.forms.scheduleC || [];

        let taxpayerNet = 0;
        let spouseNet = 0;

        businesses.forEach(biz => {
            const gross = parseFloat(biz.grossReceipts) || 0;
            const expenses = parseFloat(biz.totalExpenses) || 0;
            const net = gross - expenses;

            if (biz.owner === 'spouse') {
                spouseNet += net;
            } else {
                taxpayerNet += net;
            }
        });

        const totalNet = taxpayerNet + spouseNet;

        // Simplified Schedule SE logic (Self-Employment Tax)
        // Usually: Net * 0.9235 * 0.153 (if below threshold)
        // Deductible part: Half of that tax
        const taxpayerSETax = this.calculateSE(taxpayerNet);
        const spouseSETax = this.calculateSE(spouseNet);

        return {
            taxpayerNet,
            spouseNet,
            totalNet,
            taxpayerSEDeduction: taxpayerSETax / 2,
            spouseSEDeduction: spouseSETax / 2,
            totalSEDeduction: (taxpayerSETax + spouseSETax) / 2,
            totalSETax: taxpayerSETax + spouseSETax
        };
    },

    calculateSE(netProfit) {
        if (netProfit < 400) return 0;

        // 2025 Simplified Logic:
        // 1. Net * 92.35%
        // 2. 15.3% tax (up to SS wage base)
        const taxableSE = netProfit * 0.9235;

        // Simplified: using 15.3% flat. In reality, SS is 12.4% up to cap, Medicare 2.9% unlimited.
        return taxableSE * 0.153;
    }
};
