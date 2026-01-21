let currentLang = 'en';

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    document.getElementById(sectionId).classList.add('active');

    // Update nav buttons
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`nav-${sectionId}`).classList.add('active');
}

function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });

    // Update placeholders separately if needed
    const placeholders = {
        'landlordName': 'landlord_name',
        'tenantName': 'tenant_name',
        'propertyAddress': 'address',
        'amountOwed': 'amount_owed'
    };

    for (let id in placeholders) {
        const el = document.getElementById(id);
        if (el) {
            el.placeholder = translations[currentLang][placeholders[id]].replace(' ($)', '');
        }
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'cn' : 'en';
    updateContent();
    localStorage.setItem('eviction_guide_lang', currentLang);
}

function toggleAmountOwed() {
    const reason = document.getElementById('evictionReason').value;
    const amountGroup = document.getElementById('amountGroup');
    if (reason === 'nonpayment') {
        amountGroup.style.display = 'block';
    } else {
        amountGroup.style.display = 'none';
    }
}

// Initial load
window.onload = () => {
    const savedLang = localStorage.getItem('eviction_guide_lang');
    if (savedLang) {
        currentLang = savedLang;
    }
    updateContent();
};
