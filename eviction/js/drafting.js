function generateLetter() {
    const landlordName = document.getElementById('landlordName').value || "[Landlord Name]";
    const tenantName = document.getElementById('tenantName').value || "[Tenant Name]";
    const propertyAddress = document.getElementById('propertyAddress').value || "[Property Address]";
    const reason = document.getElementById('evictionReason').value;
    const amountOwed = document.getElementById('amountOwed').value || "0.00";
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let content = "";

    if (reason === 'nonpayment') {
        content = `NOTICE TO PAY RENT OR SURRENDER POSSESSION
(10-DAY DEMAND FOR RENT)

Date: ${date}

To: ${tenantName}
Property: ${propertyAddress}

PLEASE TAKE NOTICE that you are currently in default in the payment of rent for the above-mentioned premises. As of this date, you owe a total of $${amountOwed} in past-due rent.

Pursuant to North Carolina General Statutes § 42-3, demand is hereby made that you pay the full amount of $${amountOwed} within ten (10) days of the date of delivery of this notice.

If you fail to pay the full amount due or vacate the premises within ten (10) days, legal proceedings will be initiated against you to recover possession of the premises, the past-due rent, and any associated court costs.

Sincerely,

__________________________
${landlordName}
Landlord/Owner`;
    } else if (reason === 'holdover') {
        content = `NOTICE OF TERMINATION OF TENANCY
(NOTICE TO QUIT)

Date: ${date}

To: ${tenantName}
Property: ${propertyAddress}

PLEASE TAKE NOTICE that your tenancy of the above-mentioned premises is hereby terminated. 

You are required to vacate and surrender possession of the premises no later than the end of the current rental period/lease term. If you remain on the property after this date, legal proceedings for "Summary Ejectment" (eviction) will be filed against you in accordance with North Carolina law.

This notice is given pursuant to the terms of your lease and North Carolina General Statutes Chapter 42.

Sincerely,

__________________________
${landlordName}
Landlord/Owner`;
    } else if (reason === 'violation') {
        content = `NOTICE TO CURE LEASE VIOLATION

Date: ${date}

To: ${tenantName}
Property: ${propertyAddress}

PLEASE TAKE NOTICE that you are in violation of the terms of your lease agreement as follows:
[Describe violation here, e.g., Unauthorized pets, excessive noise, etc.]

You are hereby requested to cure the above-mentioned violation(s) immediately upon receipt of this notice. 

Failure to rectify the situation may result in the termination of your lease and the initiation of legal proceedings to recover possession of the property.

Sincerely,

__________________________
${landlordName}
Landlord/Owner`;
    }

    const preview = document.getElementById('letterPreview');
    preview.innerText = content;
    preview.classList.add('active');
    document.getElementById('printBtn').style.display = 'block';

    // Scroll to preview
    preview.scrollIntoView({ behavior: 'smooth' });
}
