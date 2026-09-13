const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {

    navLinks.classList.toggle("active");

    const open = navLinks.classList.contains("active");

    menuToggle.textContent = open ? "✕" : "☰";

    menuToggle.setAttribute(
        "aria-label",
        open ? "Close menu" : "Open menu"
    );
});


document.querySelectorAll(".nav-links a")
    .forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("active");

            menuToggle.textContent = "☰";

        });

    });


document.getElementById("year").textContent =
    new Date().getFullYear();
    const websiteRequestForm = document.getElementById("websiteRequestForm");
const successMessage = document.getElementById("successMessage");

if (websiteRequestForm) {
    websiteRequestForm.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!websiteRequestForm.checkValidity()) {
            websiteRequestForm.reportValidity();
            return;
        }

        successMessage.hidden = false;

        websiteRequestForm.reset();

        successMessage.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
    
    
}