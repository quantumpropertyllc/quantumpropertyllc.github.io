/**
 * print.js - Handles PDF Generation / Printing Logic
 */
window.TaxCore = window.TaxCore || {};

window.TaxCore.Print = {
    generate() {
        const appendix = document.getElementById('print-appendix');
        if (!appendix) return;

        // Clear previous content
        appendix.innerHTML = '';

        // Add Header for Appendix
        const header = document.createElement('h2');
        header.innerText = 'Supporting Schedules & Details';
        header.style.marginTop = '40px';
        header.style.borderBottom = '2px solid #000';
        appendix.appendChild(header);

        // Render All Forms
        this.renderSchedule1(appendix);
        this.renderSchedule2(appendix);
        this.renderSchedule3(appendix);
        this.renderScheduleC(appendix);
        this.renderScheduleSE(appendix);
        this.renderScheduleD(appendix);
        this.renderScheduleE(appendix);
        this.render8812(appendix);
        this.render8995(appendix);
        this.render1099MISC(appendix);
        this.render1099R(appendix);
        this.renderSSA1099(appendix);

        // Trigger Print
        setTimeout(() => {
            window.print();
        }, 100);
    },

    createFormSection(title, lines) {
        if (!lines || lines.length === 0) return null;

        const container = document.createElement('div');
        container.style.marginTop = '30px';
        container.style.breakInside = 'avoid';
        container.style.border = '1px solid #000';
        container.style.padding = '15px';

        const h3 = document.createElement('h3');
        h3.innerText = title;
        h3.style.marginTop = '0';
        h3.style.borderBottom = '1px solid #000';
        h3.style.paddingBottom = '10px';
        h3.style.marginBottom = '15px';
        container.appendChild(h3);

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.9rem'; // Form-like font size

        lines.forEach(line => {
            const tr = document.createElement('tr');

            const tdLabel = document.createElement('td');
            tdLabel.innerText = line.label;
            tdLabel.style.padding = '6px';
            tdLabel.style.borderBottom = '1px dotted #ccc';

            const tdVal = document.createElement('td');
            tdVal.innerText = typeof line.value === 'number'
                ? line.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                : line.value;
            tdVal.style.textAlign = 'right';
            tdVal.style.padding = '6px';
            tdVal.style.borderBottom = '1px dotted #ccc';
            tdVal.style.width = '150px';
            tdVal.style.fontWeight = 'bold';

            tr.appendChild(tdLabel);
            tr.appendChild(tdVal);
            table.appendChild(tr);
        });

        container.appendChild(table);
        return container;
    },

    createTable(title, headers, rows) {
        if (!rows || rows.length === 0) return null;

        const container = document.createElement('div');
        container.style.marginTop = '30px';
        container.style.breakInside = 'avoid';

        const h3 = document.createElement('h3');
        h3.innerText = title;
        h3.style.marginBottom = '10px';
        container.appendChild(h3);

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.9rem';

        // Header
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.innerText = h;
            th.style.textAlign = 'left';
            th.style.borderBottom = '1px solid #000';
            th.style.padding = '5px';
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.innerText = cell;
                td.style.borderBottom = '1px solid #ddd';
                td.style.padding = '5px';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);

        return container;
    },

    // --- Data Rendering ---

    renderSchedule1(parent) {
        // Gather Data
        const state = window.TaxCore.State;

        // Income (Part I)
        const schC = window.TaxCore.CalcScheduleC ? window.TaxCore.CalcScheduleC.calculate(state) : null;
        const bizIncome = schC ? schC.totalNet : 0;

        const schE = window.TaxCore.CalcScheduleE ? window.TaxCore.CalcScheduleE.calculate(state) : null;
        const rentalIncome = schE ? schE.netResult : 0;

        const miscIncome = state.forms.misc.reduce((sum, f) => {
            return sum + (parseFloat(f.rents) || 0) + (parseFloat(f.royalties) || 0) + (parseFloat(f.otherIncome) || 0);
        }, 0);

        const totalAddlIncome = bizIncome + rentalIncome + miscIncome;

        // Adjustments (Part II)
        // SE Tax Deduction
        let taxpayerSSWages = 0;
        let spouseSSWages = 0;
        // Re-calcing wages for SE tax precision
        state.forms.w2.forEach(f => {
            const w = parseFloat(f.wages) || 0;
            const ss = parseFloat(f.ssWages) || w;
            if (f.owner === 'spouse') spouseSSWages += ss;
            else taxpayerSSWages += ss;
        });

        let seDeduction = 0;
        if (window.TaxCore.CalcScheduleSE) {
            const tSE = window.TaxCore.CalcScheduleSE.calculate(schC ? schC.taxpayerNet : 0, taxpayerSSWages);
            const sSE = window.TaxCore.CalcScheduleSE.calculate(schC ? schC.spouseNet : 0, spouseSSWages);
            seDeduction = tSE.deduction + sSE.deduction;
        }

        const lines = [
            { label: 'Business Income (Schedule C, line 3)', value: bizIncome },
            { label: 'Rental/Royalty/Passthrough (Schedule E, line 4)', value: rentalIncome },
            { label: 'Other Income (Line 8z)', value: miscIncome },
            { label: 'Total Additional Income (Line 10)', value: totalAddlIncome },
            { label: 'Deductible Part of Self-Employment Tax (Line 15)', value: seDeduction },
            { label: 'Total Adjustments to Income (Line 26)', value: seDeduction }
        ];

        // Only show if there's data
        if (totalAddlIncome !== 0 || seDeduction !== 0) {
            const form = this.createFormSection('Schedule 1 - Additional Income and Adjustments to Income', lines);
            if (form) parent.appendChild(form);
        }
    },

    renderSchedule2(parent) {
        // Part II: Other Taxes (SE Tax)
        const state = window.TaxCore.State;
        const schC = window.TaxCore.CalcScheduleC ? window.TaxCore.CalcScheduleC.calculate(state) : null;

        // Get wages for SE Cap
        let taxpayerSSWages = 0;
        let spouseSSWages = 0;
        state.forms.w2.forEach(f => {
            const w = parseFloat(f.wages) || 0;
            const ss = parseFloat(f.ssWages) || w;
            if (f.owner === 'spouse') spouseSSWages += ss;
            else taxpayerSSWages += ss;
        });

        let seTax = 0;
        if (window.TaxCore.CalcScheduleSE) {
            const tSE = window.TaxCore.CalcScheduleSE.calculate(schC ? schC.taxpayerNet : 0, taxpayerSSWages);
            const sSE = window.TaxCore.CalcScheduleSE.calculate(schC ? schC.spouseNet : 0, spouseSSWages);
            seTax = tSE.tax + sSE.tax;
        }

        if (seTax > 0) {
            const lines = [
                { label: 'Self-Employment Tax (Schedule SE, line 12)', value: seTax },
                { label: 'Total Other Taxes (Line 21)', value: seTax }
            ];
            const form = this.createFormSection('Schedule 2 - Additional Tax', lines);
            parent.appendChild(form);
        }
    },

    renderSchedule3(parent) {
        // Part I: Nonrefundable Credits
        const state = window.TaxCore.State;
        const sch3 = state.forms.schedule3 || {};

        // Need to know 1040 tax context or re-run 8812?
        // Let's create a proxy context or reuse what we can. 8812 needs 'taxBeforeCredits' for limitation.
        // For print, we assume the user has run calc. But we can just show the potentially available amounts for Sch 3 lines.
        // We will do a best effort recalc of the 8812 Non-refundable portion.

        // Recalculating everything to be safe
        // 1. Total Income
        // ... (Simplified: We assume 1040 calc lines are correct in UI, but here we need internal values)
        // Let's rely on re-running Calc1040? No, that returns lines.
        // We'll trust the user inputs.

        // This is complex dependency.
        // Simplification: Print what we effectively calculate in Calc1040 if possible.
        // Actually, let's just reprint the Sch 3 inputs and the Form 8812 calculated output.

        const lines = [];

        // Foreign Tax
        if (sch3.foreignTax) lines.push({ label: 'Foreign Tax Credit', value: parseFloat(sch3.foreignTax) });
        if (sch3.childCare) lines.push({ label: 'Credit for Child and Dependent Care', value: parseFloat(sch3.childCare) });
        if (sch3.education) lines.push({ label: 'Education Credits', value: parseFloat(sch3.education) });
        if (sch3.retirement) lines.push({ label: 'Retirement Savings Contributions', value: parseFloat(sch3.retirement) });
        if (sch3.energyClean) lines.push({ label: 'Residential Clean Energy', value: parseFloat(sch3.energyClean) });

        // Part II: Refundable
        if (sch3.excessSS) lines.push({ label: 'Excess SS Tax Withheld', value: parseFloat(sch3.excessSS) });

        if (lines.length > 0) {
            const form = this.createFormSection('Schedule 3 - Additional Credits and Payments', lines);
            parent.appendChild(form);
        }
    },

    renderScheduleSE(parent) {
        if (!window.TaxCore.CalcScheduleSE || !window.TaxCore.CalcScheduleC) return;

        const state = window.TaxCore.State;
        const schC = window.TaxCore.CalcScheduleC.calculate(state);

        // Helper to render one person's SE
        const renderPerson = (name, net, wages) => {
            const res = window.TaxCore.CalcScheduleSE.calculate(net, wages);
            if (res.tax === 0) return;

            const lines = [
                { label: 'Net Profit or (Loss)', value: net },
                { label: 'Net Earnings from Self-Employment (x 0.9235)', value: net * 0.9235 },
                { label: 'Social Security Tax Deduction (if applied)', value: res.deduction },
                { label: 'Self-Employment Tax', value: res.tax }
            ];
            const form = this.createFormSection(`Schedule SE - Self-Employment Tax (${name})`, lines);
            parent.appendChild(form);
        };

        let taxpayerSSWages = 0;
        let spouseSSWages = 0;
        state.forms.w2.forEach(f => {
            const w = parseFloat(f.wages) || 0;
            const ss = parseFloat(f.ssWages) || w;
            if (f.owner === 'spouse') spouseSSWages += ss;
            else taxpayerSSWages += ss;
        });

        renderPerson('Taxpayer', schC.taxpayerNet, taxpayerSSWages);
        renderPerson('Spouse', schC.spouseNet, spouseSSWages);
    },

    render8812(parent) {
        if (!window.TaxCore.Calc8812) return;
        const state = window.TaxCore.State;

        // We need Tax Before Credits to calculate Non-refundable limit correctly.
        // We will approximate it or just fetch from 1040 line if currently displayed?
        // We can just grab the text from the UI for Line 18 if it exists?
        // Better: Re-calculate 1040 logic sans 8812.
        // Best: Just show the raw credits generated before liability limit for "information only" or full calc.

        // Let's do a full 1040 calc to get accurate context.
        const res1040 = window.TaxCore.Calc1040.calculate(state);
        const taxVal = res1040.lines['18']; // This is Tax Before Credits

        const res = window.TaxCore.Calc8812.calculate(state, taxVal);

        if (res.qualifyingChildren === 0 && res.otherDependents === 0) return;

        const lines = [
            { label: 'Qualifying Children', value: res.qualifyingChildren },
            { label: 'Other Dependents', value: res.otherDependents },
            { label: 'Child Tax Credit (@ $2,000)', value: res.childTaxCredit },
            { label: 'Credit for Other Dependents (@ $500)', value: res.otherDependentCredit },
            { label: 'Phaseout Amount', value: res.phaseoutAmount },
            { label: 'Non-refundable Credit (to 1040 Line 19)', value: res.nonrefundableCredit },
            { label: 'Additional Child Tax Credit (to 1040 Line 28)', value: res.additionalChildTaxCredit }
        ];

        const form = this.createFormSection('Form 8812 - Credits for Qualifying Children and Other Dependents', lines);
        parent.appendChild(form);
    },

    render8995(parent) {
        const state = window.TaxCore.State;
        // Re-calc 8995
        // Need to recreate context: QBI Income, Taxable Income before QBI, Cap Gains

        // 1. QBI Income from Sch C
        // Determine Deduction Part of SE Tax
        const schC = window.TaxCore.CalcScheduleC.calculate(state);
        // ... (SE Tax Calc again) ...
        let taxpayerSE = { tax: 0, deduction: 0 };
        let spouseSE = { tax: 0, deduction: 0 };
        // ... Wages ...
        let taxpayerSSWages = 0; let spouseSSWages = 0;
        state.forms.w2.forEach(f => {
            const w = parseFloat(f.wages) || 0;
            const ss = parseFloat(f.ssWages) || w;
            if (f.owner === 'spouse') spouseSSWages += ss;
            else taxpayerSSWages += ss;
        });
        if (window.TaxCore.CalcScheduleSE) {
            taxpayerSE = window.TaxCore.CalcScheduleSE.calculate(schC.taxpayerNet, taxpayerSSWages);
            spouseSE = window.TaxCore.CalcScheduleSE.calculate(schC.spouseNet, spouseSSWages);
        }
        const totalSEDeduction = taxpayerSE.deduction + spouseSE.deduction;

        // QBI is Net Profit minus SE Deduction
        const qbiAmount = Math.max(0, schC.totalNet - totalSEDeduction);

        if (qbiAmount <= 0) return;

        const res1040 = window.TaxCore.Calc1040.calculate(state);
        // We can extract taxable income before QBI from the result? Internal logic of Calc1040 hides it.
        // We will re-calculate "Taxable Income Before QBI" manually: AGI - Standard Deduction
        const agi = res1040.lines['11'];
        const stdDed = res1040.lines['12'];
        const taxableBeforeQBI = Math.max(0, agi - stdDed);

        // Capital Gains
        const capGains = res1040.lines['7'];

        const ded = window.TaxCore.Calc8995.calculate(state, qbiAmount, taxableBeforeQBI, capGains);

        const lines = [
            { label: 'Qualified Business Income (Loss)', value: qbiAmount },
            { label: 'Taxable Income before QBI Deduction', value: taxableBeforeQBI },
            { label: 'Net Capital Gain', value: capGains },
            { label: 'QBI Deduction (to 1040 Line 13)', value: ded }
        ];

        const form = this.createFormSection('Form 8995 - Qualified Business Income Deduction Simplified Computation', lines);
        parent.appendChild(form);
    },

    renderScheduleC(parent) {
        const entries = window.TaxCore.State.forms.scheduleC || [];
        const rows = entries.map(e => [
            e.description,
            e.owner,
            `$${parseFloat(e.gross).toLocaleString()}`,
            `$${parseFloat(e.expenses).toLocaleString()}`,
            `$${(e.gross - e.expenses).toLocaleString()}`
        ]);
        const table = this.createTable('Schedule C - Profit or Loss From Business', ['Business', 'Owner', 'Gross Receipts', 'Expenses', 'Net Profit'], rows);
        if (table) parent.appendChild(table);
    },

    renderScheduleD(parent) {
        const entries = window.TaxCore.State.forms.scheduleD || [];
        const rows = entries.map(e => {
            if (e.type === 'carryover') {
                return [
                    `${e.description} (${e.carryoverTerm} Carryover)`,
                    '-', '-', '-', `-$${parseFloat(e.carryoverAmount).toLocaleString()}`
                ];
            }
            return [
                e.description,
                e.dateAcquired,
                e.dateSold,
                `$${parseFloat(e.proceeds).toLocaleString()}`,
                `$${parseFloat(e.basis).toLocaleString()}`,
                `$${(e.proceeds - e.basis).toLocaleString()}`
            ];
        });
        const table = this.createTable('Schedule D - Capital Gains and Losses', ['Description', 'Acquired', 'Sold', 'Proceeds', 'Basis', 'Gain/Loss'], rows);
        if (table) parent.appendChild(table);
    },

    renderScheduleE(parent) {
        const entries = window.TaxCore.State.forms.scheduleE || [];
        const rows = entries.map(e => [
            e.description,
            `$${parseFloat(e.rents).toLocaleString()}`,
            `$${parseFloat(e.royalties).toLocaleString()}`,
            `$${parseFloat(e.expenses).toLocaleString()}`,
            `$${(e.rents + e.royalties - e.expenses).toLocaleString()}`
        ]);
        const table = this.createTable('Schedule E - Supplemental Income and Loss', ['Property', 'Rents', 'Royalties', 'Expenses', 'Net Income'], rows);
        if (table) parent.appendChild(table);
    },

    render1099MISC(parent) {
        const entries = window.TaxCore.State.forms.misc || [];
        const rows = entries.map(e => [
            e.payer,
            `$${parseFloat(e.rents).toLocaleString()}`,
            `$${parseFloat(e.royalties).toLocaleString()}`,
            `$${parseFloat(e.otherIncome).toLocaleString()}`,
            `$${parseFloat(e.fedTax).toLocaleString()}`
        ]);
        const table = this.createTable('1099-MISC - Miscellaneous Income', ['Payer', 'Rents', 'Royalties', 'Other Income', 'Fed Tax Withheld'], rows);
        if (table) parent.appendChild(table);
    },

    render1099R(parent) {
        const entries = window.TaxCore.State.forms.r || [];
        const rows = entries.map(e => [
            e.payer,
            e.isIRA ? 'Yes' : 'No',
            `$${parseFloat(e.grossDistribution).toLocaleString()}`,
            `$${parseFloat(e.taxableAmount).toLocaleString()}`,
            `$${parseFloat(e.fedTax).toLocaleString()}`
        ]);
        const table = this.createTable('1099-R - Distributions from Pensions, Annuities, Retirement', ['Payer', 'IRA?', 'Gross Dist.', 'Taxable Amt', 'Fed Tax Withheld'], rows);
        if (table) parent.appendChild(table);
    },

    renderSSA1099(parent) {
        const entries = window.TaxCore.State.forms.ssa || [];
        const rows = entries.map(e => [
            e.person === 'spouse' ? 'Spouse' : 'Taxpayer',
            `$${parseFloat(e.netBenefits).toLocaleString()}`,
            `$${parseFloat(e.fedTax).toLocaleString()}`
        ]);
        const table = this.createTable('SSA-1099 - Social Security Benefits', ['Person', 'Net Benefits (Box 5)', 'Fed Tax Withheld (Box 6)'], rows);
        if (table) parent.appendChild(table);
    }
};
