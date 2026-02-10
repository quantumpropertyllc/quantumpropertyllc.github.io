
/**
 * calc_1040.js - Maps State to 2025 Form 1040 Line Items
 */

window.TaxCore = window.TaxCore || {};

window.TaxCore.Calc1040 = {
    calculate(state) {
        // 1. Gather Income
        // 1. Gather Income
        let taxpayerWages = 0;
        let spouseWages = 0;
        let taxpayerSSWages = 0;
        let spouseSSWages = 0;

        state.forms.w2.forEach(f => {
            const w = parseFloat(f.wages) || 0;
            // Use Box 3 (SS Wages) if available, otherwise fallback to Box 1
            const ss = parseFloat(f.ssWages) || w;

            // Default to taxpayer if not specified
            if (f.owner === 'spouse') {
                spouseWages += w;
                spouseSSWages += ss;
            } else {
                taxpayerWages += w;
                taxpayerSSWages += ss;
            }
        });
        const wages = taxpayerWages + spouseWages;
        const interest = state.forms.int.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        const dividends = state.forms.div.reduce((sum, f) => sum + (parseFloat(f.ordinary) || 0), 0);

        // 1a. Schedule C - Business Income
        const schC = window.TaxCore.CalcScheduleC ? window.TaxCore.CalcScheduleC.calculate(state) : null;
        const line8c = schC ? schC.totalNet : 0;

        // 1b. Schedule D - Capital Gains
        const schD = window.TaxCore.CalcScheduleD ? window.TaxCore.CalcScheduleD.calculate(state) : null;
        const line7 = schD ? schD.amountOn1040Line7 : 0;

        // 1c. Schedule E - Rental/Royalty Income
        const schE = window.TaxCore.CalcScheduleE ? window.TaxCore.CalcScheduleE.calculate(state) : null;
        const line8e = schE ? schE.netResult : 0;

        // 1d. 1099-MISC - Other Income
        const miscIncome = state.forms.misc.reduce((sum, f) => {
            return sum + (parseFloat(f.rents) || 0) + (parseFloat(f.royalties) || 0) + (parseFloat(f.otherIncome) || 0);
        }, 0);

        // Line 8 Total (Simplified for Sch C and Sch E and MISC)
        const line8 = line8c + line8e + miscIncome;

        // 1e. 1099-R - Retirement
        let line4a = 0; // IRA Distributions
        let line4b = 0; // Taxable IRA
        let line5a = 0; // Pensions/Annuities
        let line5b = 0; // Taxable Pensions

        state.forms.r.forEach(f => {
            const gross = parseFloat(f.grossDistribution) || 0;
            const taxable = parseFloat(f.taxableAmount) || 0;
            if (f.isIRA) {
                line4a += gross;
                line4b += taxable;
            } else {
                line5a += gross;
                line5b += taxable;
            }
        });

        // 1f. SSA-1099 - Social Security Benefits
        let ssaNet = 0;
        let ssaTaxable = 0;
        if (state.forms.ssa && state.forms.ssa.length > 0) {
            ssaNet = state.forms.ssa.reduce((sum, f) => sum + (parseFloat(f.netBenefits) || 0), 0);
            const halfBenefits = ssaNet * 0.5;
            const otherIncomeForSSA = wages + interest + dividends + line4b + line5b + line8 + line7;
            const combinedIncome = otherIncomeForSSA + halfBenefits;
            const status = state.filingStatus || 'single';
            let baseAmount = 25000;
            if (status === 'mfj') baseAmount = 32000;

            if (combinedIncome > baseAmount) {
                let threshold2 = 34000;
                if (status === 'mfj') threshold2 = 44000;
                if (combinedIncome > threshold2) {
                    ssaTaxable = Math.min(ssaNet * 0.85, (0.85 * (combinedIncome - threshold2)) + Math.min(ssaNet * 0.5, 0.5 * (threshold2 - baseAmount)));
                } else {
                    ssaTaxable = Math.min(ssaNet * 0.5, 0.5 * (combinedIncome - baseAmount));
                }
            }
        }

        const line6a = ssaNet;
        const line6b = ssaTaxable;

        // Line 8 Total was moved up to before SSA calculation

        const totalIncome = wages + interest + dividends + line4b + line5b + line6b + line8 + line7; // Line 9

        // 2. Adjustments & Deductions

        // Schedule SE - Self Employment Tax calculation
        // Compute for taxpayer and spouse separately
        let taxpayerSE = { tax: 0, deduction: 0 };
        let spouseSE = { tax: 0, deduction: 0 };

        if (window.TaxCore.CalcScheduleSE) {
            taxpayerSE = window.TaxCore.CalcScheduleSE.calculate(schC ? schC.taxpayerNet : 0, taxpayerSSWages);
            spouseSE = window.TaxCore.CalcScheduleSE.calculate(schC ? schC.spouseNet : 0, spouseSSWages);
        }

        const line23se = taxpayerSE.tax + spouseSE.tax;
        const line10 = taxpayerSE.deduction + spouseSE.deduction;

        const agi = Math.max(0, totalIncome - line10); // Line 11

        const status = state.filingStatus || 'single';
        let stdDeduction = 0;
        if (window.TaxCore.Constants && window.TaxCore.Constants.standardDeduction) {
            stdDeduction = window.TaxCore.Constants.standardDeduction[status] || 0;
        }

        // Line 15: Taxable Income (Preliminary)
        const taxableIncomeBeforeQBI = Math.max(0, agi - stdDeduction);

        // 2a. Form 8995 - Qualified Business Income Deduction
        // Note: QBI should logically come from Sch C (net - deduction)
        const qbiAmount = Math.max(0, line8c - line10);
        const line13 = window.TaxCore.Calc8995 ? window.TaxCore.Calc8995.calculate(state, qbiAmount, taxableIncomeBeforeQBI, line7) : 0;

        // Line 15: Final Taxable Income
        const taxableIncome = Math.max(0, taxableIncomeBeforeQBI - line13);

        // 3. Tax Calculation
        let incomeTax = 0;
        const tables = window.TaxCore.TaxTables ? window.TaxCore.TaxTables[status] : null;

        if (tables) {
            let bracket = tables[0];
            for (let i = 0; i < tables.length; i++) {
                if (taxableIncome > tables[i].over) {
                    bracket = tables[i];
                } else {
                    break;
                }
            }
            incomeTax = bracket.base + ((taxableIncome - bracket.over) * bracket.rate);
        } else {
            incomeTax = taxableIncome * 0.15;
        }

        // 3a. Form 8812 - Credits
        const earnedIncome = wages + Math.max(0, line8c - line10);
        const form8812 = window.TaxCore.Calc8812 ? window.TaxCore.Calc8812.calculate({
            ...state,
            AGI_for_8812: agi,
            EarnedIncome_for_8812: earnedIncome
        }, incomeTax) : null;
        const line19 = form8812 ? form8812.nonrefundableCredit : 0;
        const line28 = form8812 ? form8812.additionalChildTaxCredit : 0;

        // 3b. Schedule 3 
        const schedule3 = state.forms.schedule3;
        const line20 = schedule3 ? (schedule3.totalNonrefundable || 0) : 0;

        const taxBeforeCredits = incomeTax;
        const totalNonrefundable = line19 + line20;
        const line22 = Math.max(0, taxBeforeCredits - totalNonrefundable);

        // 3c. Other Taxes
        const line23 = line22 + line23se; // Total tax after nonrefundable + SE Tax

        // 4. Payments
        // 4. Payments
        const w2Withheld = state.forms.w2.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0);
        const otherWithheld =
            state.forms.int.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0) +
            state.forms.div.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0) +
            state.forms.misc.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0) +
            state.forms.r.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0) +
            (state.forms.ssa ? state.forms.ssa.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0) : 0);
        const otherRefundable = schedule3 ? (schedule3.totalRefundable || 0) : 0;
        const line31 = line28 + otherRefundable;
        const totalPayments = w2Withheld + otherWithheld + line31;

        // 5. Result
        let refund = 0;
        let owe = 0;
        if (totalPayments > line23) {
            refund = totalPayments - line23;
        } else {
            owe = line23 - totalPayments;
        }

        return {
            lines: {
                "1z": wages, "2b": interest, "3b": dividends,
                "4a": line4a, "4b": line4b, "5a": line5a, "5b": line5b,
                "6a": line6a, "6b": line6b,
                "7": line7, "8": line8, "9": totalIncome,
                "10": line10, "11": agi, "12": stdDeduction, "13": line13, "15": taxableIncome,
                "16": incomeTax, "18": taxBeforeCredits, "19": line19, "20": line20,
                "21": totalNonrefundable, "22": line22, "23": line23se, "24": line23,
                "25a": w2Withheld, "25b": otherWithheld, "28": line28, "31": line31,
                "33": totalPayments, "34": refund, "37": owe
            },
            meta: { status, bracket: tables ? "Computed" : "Fallback" }
        };
    }
};
