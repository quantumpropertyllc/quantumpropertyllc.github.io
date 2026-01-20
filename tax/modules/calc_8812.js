
/**
 * calc_8812.js - Form 8812 Calculation Logic
 * Credits for Qualifying Children and Other Dependents
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.Calc8812 = {
    /**
     * Calculate Form 8812 credits
     * @param {Object} state - Application state
     * @param {number} taxBeforeCredits - Tax liability before credits
     * @returns {Object} - Credit amounts
     */
    calculate(state, taxBeforeCredits = 0) {
        const dependents = state.dependents || { qualifyingChildren: 0, otherDependents: 0 };
        const qualifyingChildren = dependents.qualifyingChildren || 0;
        const otherDependents = dependents.otherDependents || 0;

        // If no dependents, no credits
        if (qualifyingChildren === 0 && otherDependents === 0) {
            return {
                childTaxCredit: 0,
                otherDependentCredit: 0,
                totalCreditBeforePhaseout: 0,
                phaseoutAmount: 0,
                nonrefundableCredit: 0,
                additionalChildTaxCredit: 0,
                qualifyingChildren: 0,
                otherDependents: 0
            };
        }

        // Line 4: Child Tax Credit ($2,000 per qualifying child)
        const childTaxCreditBase = qualifyingChildren * 2000;

        // Line 7: Credit for Other Dependents ($500 per other dependent)
        const otherDependentCredit = otherDependents * 500;

        // Line 8: Total credits before phase-out
        const totalCreditBeforePhaseout = childTaxCreditBase + otherDependentCredit;

        // Calculate Modified AGI
        const modifiedAGI = state.AGI_for_8812 !== undefined ? state.AGI_for_8812 : (
            state.forms.w2.reduce((sum, f) => sum + (parseFloat(f.wages) || 0), 0) +
            state.forms.int.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) +
            state.forms.div.reduce((sum, f) => sum + (parseFloat(f.ordinary) || 0), 0)
        );

        // Phase-out thresholds based on filing status
        const status = state.filingStatus || 'single';
        let phaseoutThreshold = 200000; // Single, HOH, MFS
        if (status === 'mfj' || status === 'qw') {
            phaseoutThreshold = 400000;
        }

        // Calculate phase-out
        let phaseoutAmount = 0;
        if (modifiedAGI > phaseoutThreshold) {
            const excessIncome = modifiedAGI - phaseoutThreshold;
            phaseoutAmount = Math.ceil(excessIncome / 1000) * 50;
        }

        // Line 12: Credit after phase-out
        const creditAfterPhaseout = Math.max(0, totalCreditBeforePhaseout - phaseoutAmount);

        // Line 14: Child tax credit and credit for other dependents (nonrefundable)
        // Limited by tax liability
        const nonrefundableCredit = Math.min(creditAfterPhaseout, taxBeforeCredits);

        // Additional Child Tax Credit (Refundable portion) - Part II
        let additionalChildTaxCredit = 0;

        if (qualifyingChildren > 0) {
            // Earned income
            const earnedIncome = state.EarnedIncome_for_8812 !== undefined ? state.EarnedIncome_for_8812 : (
                state.forms.w2.reduce((sum, f) => sum + (parseFloat(f.wages) || 0), 0)
            );

            if (earnedIncome > 2500) {
                // Available for additional: The portion of Child Tax Credit portion NOT used in nonrefundable
                // Total CTC portion after phase-out:
                const ctcPortionAfterPhaseout = Math.max(0, (qualifyingChildren * 2000) - (phaseoutAmount * (childTaxCreditBase / totalCreditBeforePhaseout)));
                const ctcUsedNonrefundable = Math.min(ctcPortionAfterPhaseout, nonrefundableCredit);
                const unusedCTC = ctcPortionAfterPhaseout - ctcUsedNonrefundable;

                // Line 20: Multiply (Earned Income - 2500) by 15%
                const excessEarned = Math.max(0, earnedIncome - 2500);
                const earnedIncomeCreditLimit = excessEarned * 0.15;

                // Line 27: Smaller of unused CTC or earned income credit limit
                // AND limited by per-child refundable cap (e.g. $1,700 for 2024/2025)
                const actcCap = (window.TaxCore.Constants && window.TaxCore.Constants.actcPerChildLimit)
                    ? window.TaxCore.Constants.actcPerChildLimit
                    : 1700;
                const perChildLimit = qualifyingChildren * actcCap;

                additionalChildTaxCredit = Math.min(unusedCTC, earnedIncomeCreditLimit, perChildLimit);
            }
        }

        return {
            childTaxCredit: childTaxCreditBase,
            otherDependentCredit: otherDependentCredit,
            totalCreditBeforePhaseout: totalCreditBeforePhaseout,
            phaseoutAmount: phaseoutAmount,
            nonrefundableCredit: nonrefundableCredit,  // Line 14 -> Form 1040 Line 19
            additionalChildTaxCredit: additionalChildTaxCredit,  // Line 27 -> Form 1040 Line 28
            qualifyingChildren: qualifyingChildren,
            otherDependents: otherDependents
        };
    }
};
