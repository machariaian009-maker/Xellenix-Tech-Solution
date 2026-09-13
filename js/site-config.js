// Centralized contact configuration (frontend)
(function(){
    if (window && window.__XELLENIX_CONTACT__) {
        window.XELLENIX_CONTACT = window.__XELLENIX_CONTACT__;
        return;
    }

    window.XELLENIX_CONTACT = {
        whatsapp: 'https://wa.me/254745076624',
        phone: '+254745076624',
        email: 'machariaian009@gmail.com'
    };
})();

// Helper: apply contact links to anchors with data attributes
document.addEventListener('DOMContentLoaded', function(){
    try {
        var wa = window.XELLENIX_CONTACT && window.XELLENIX_CONTACT.whatsapp;
        var ph = window.XELLENIX_CONTACT && window.XELLENIX_CONTACT.phone;
        document.querySelectorAll('[data-whatsapp]').forEach(function(a){ if(wa) a.href = wa; });
        document.querySelectorAll('[data-phone]').forEach(function(a){ if(ph) a.href = 'tel:' + ph; });
    } catch(e) { /* ignore */ }
});
