
/**
 * calc_1040.js - Maps State to 2025 Form 1040 Line Items
 * 
 * Logic based on 2025 Drafts:
 * Income:
 * - Line 1z: Total Wages (W-2 Box 1)
 * - Line 2b: Taxable Interest (1099-INT Box 1)
 * - Line 3b: Ordinary Dividends (1099-DIV Box 1a) -- Simplified, assuming all ordinary are taxable for now
 * - Line 9: Total Income
 * 
 * Deductions:
 * - Line 12: Standard Deduction (Dynamic based on Filing Status)
 * - Line 15: Taxable Income (Line 9 - Line 12, min 0)
 * 
 * Tax:
 * - Line 16: Tax (Calculated from Tables)
 * - Line 24: Total Tax
 * 
 * Payments:
 * - Line 25a: W-2 Withholding
 * - Line 25b: 1099 Withholding (INT/DIV usually backup withholding, mapped here)
 * - Line 33: Total Payments
 * 
 * Refund/Owe:
 * - Line 34: Overpaid amount
 * - Line 37: Amount you owe
 */

window.TaxCore = window.TaxCore || {};

window.TaxCore.Calc1040 = {
    calculate(state) {
        // 1. Gather Income
        const wages = state.forms.w2.reduce((sum, f) => sum + (parseFloat(f.wages) || 0), 0);
        const interest = state.forms.int.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        const dividends = state.forms.div.reduce((sum, f) => sum + (parseFloat(f.ordinary) || 0), 0);

        const totalIncome = wages + interest + dividends; // Line 9

        // 2. Adjustments & Deductions
        const status = state.filingStatus || 'single';
        let stdDeduction = 0;
        if (window.TaxCore.Constants && window.TaxCore.Constants.standardDeduction) {
            stdDeduction = window.TaxCore.Constants.standardDeduction[status] || 0;
        }

        // Line 15: Taxable Income
        const taxableIncome = Math.max(0, totalIncome - stdDeduction);

        // 3. Tax Calculation
        let tax = 0;
        const tables = window.TaxCore.TaxTables ? window.TaxCore.TaxTables[status] : null;

        if (tables) {
            // Find bracket
            let bracket = tables[0];
            for (let i = 0; i < tables.length; i++) {
                if (taxableIncome > tables[i].over) {
                    bracket = tables[i];
                } else {
                    break;
                }
            }
            tax = bracket.base + ((taxableIncome - bracket.over) * bracket.rate);
        } else {
            // Fallback (shouldn't happen if loaded)
            tax = taxableIncome * 0.15;
        }

        // 4. Payments
        const w2Withheld = state.forms.w2.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0);
        // Assuming 1099 'fedTax' maps to 25b
        const otherWithheld =
            state.forms.int.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0) +
            state.forms.div.reduce((sum, f) => sum + (parseFloat(f.fedTax) || 0), 0);

        const totalPayments = w2Withheld + otherWithheld;

        // 5. Result
        let refund = 0;
        let owe = 0;
        if (totalPayments > tax) {
            refund = totalPayments - tax;
        } else {
            owe = tax - totalPayments;
        }

        return {
            lines: {
                "1z": wages,
                "2b": interest,
                "3b": dividends,
                "9": totalIncome,
                "12": stdDeduction,
                "15": taxableIncome,
                "16": tax,
                "24": tax,
                "25a": w2Withheld,
                "25b": otherWithheld,
                "33": totalPayments,
                "34": refund,
                "37": owe
            },
            meta: {
                status,
                bracket: tables ? "Computed" : "Fallback"
            }
        };
    }
};
