// =========================
// MOBILE NAVIGATION
// =========================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {

        const isOpen = navLinks.classList.toggle("active");

        menuToggle.setAttribute(
            "aria-expanded",
            isOpen
        );

        menuToggle.setAttribute(
            "aria-label",
            isOpen
                ? "Close navigation menu"
                : "Open navigation menu"
        );

        menuToggle.textContent =
            isOpen ? "✕" : "☰";
    });

    document.querySelectorAll(".nav-links a")
        .forEach(link => {

            link.addEventListener("click", () => {

                navLinks.classList.remove("active");

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                menuToggle.setAttribute(
                    "aria-label",
                    "Open navigation menu"
                );

                menuToggle.textContent = "☰";
            });

        });
}



// =========================
// CURRENT YEAR
// =========================

document.getElementById("year").textContent =
    new Date().getFullYear();


// =========================
// SIMPLE SCROLL ANIMATION
// =========================

const observer = new IntersectionObserver(
    entries => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

            }

        });

    },
    {
        threshold: 0.1
    }
);


document.querySelectorAll(
    ".service-card, .project-card, .price-card, .process-step"
).forEach(element => {

    element.classList.add("animate");

    observer.observe(element);

});

    document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("websiteRequestForm");
    const successMessage = document.getElementById("form-success");
    const errorMessage = document.getElementById('form-error');
    const errorText = document.getElementById('form-error-text');

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        // hide previous messages
        if (successMessage) successMessage.hidden = true;
        if (errorMessage) { errorMessage.hidden = true; errorText.textContent = ''; }

        const formData = {
            fullName: document.getElementById("fullName").value.trim(),
            businessName: document.getElementById("businessName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            businessType: document.getElementById("businessType").value,
            websitePackage: document.getElementById("package").value,
            message: document.getElementById("message").value.trim()
        };

        try {
            const response = await fetch(`${window.API_BASE_URL}/api/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                const message = result && result.message ? result.message : 'We couldn\'t submit your request. Please try again.';
                throw new Error(message);
            }

            form.reset();

            if (successMessage) {
                successMessage.hidden = false;
                successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        } catch (error) {
            if (errorMessage) {
                errorText.textContent = error.message || 'We couldn\'t submit your request. Please try again.';
                errorMessage.hidden = false;
                errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            console.error('Submission error:', error);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Submit Website Request →";
            }
        }
    });
});