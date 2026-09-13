// Centralized frontend configuration
(function() {
    // Allow override via window.__XELLENIX_API_BASE__ for deployments
    if (window && window.__XELLENIX_API_BASE__) {
        window.API_BASE_URL = window.__XELLENIX_API_BASE__;
        return;
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        window.API_BASE_URL = 'http://localhost:5000';
        return;
    }

    // Default production placeholder — replace with actual domain during deployment
    window.API_BASE_URL = 'https://api.yourdomain.com';
})();
