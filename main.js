document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('shadow-lg');
            navbar.classList.remove('shadow-sm');
            navbar.classList.remove('py-4');
            navbar.classList.add('py-2');
        } else {
            navbar.classList.remove('shadow-lg');
            navbar.classList.add('shadow-sm');
            navbar.classList.add('py-4');
            navbar.classList.remove('py-2');
        }
    });

    // Mobile menu toggle
    const toggleMenu = () => {
        mobileMenu.classList.toggle('translate-x-full');
        document.body.classList.toggle('overflow-hidden');
    };

    menuBtn.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', toggleMenu);
    });

    // Scroll Animations (simple intersection observer)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100', 'translate-y-0');
                entry.target.classList.remove('opacity-0', 'translate-y-10');
            }
        });
    }, observerOptions);

    // Email obfuscation
    const emailElements = document.querySelectorAll('[data-email-user]');
    emailElements.forEach(el => {
        const user = el.getAttribute('data-email-user');
        const domain = el.getAttribute('data-email-domain');
        const subject = el.getAttribute('data-email-subject');
        const email = `${user}@${domain}`;

        if (el.tagName === 'A') {
            let href = `mailto:${email}`;
            if (subject) href += `?subject=${encodeURIComponent(subject)}`;
            el.setAttribute('href', href);
        }

        // If the element is empty or contains placeholders, fill it with the real address
        if (el.innerText.trim() === '' || el.innerText.includes('[at]')) {
            el.innerText = email;
        }
    });

    // Cookie Banner Logic
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');

    if (cookieBanner && acceptBtn) {
        // Show banner after a short delay if not yet accepted
        if (!localStorage.getItem('cookieConsent')) {
            setTimeout(() => {
                cookieBanner.classList.remove('translate-y-full');
            }, 1000);
        }

        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            cookieBanner.classList.add('translate-y-full');
        });
    }
});
