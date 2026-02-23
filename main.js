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

    // Blog Functionality
    const blogList = document.getElementById('blog-list');
    const blogListSection = document.getElementById('blog-list-section');
    const blogContentSection = document.getElementById('blog-content-section');
    const blogContent = document.getElementById('blog-content');
    const backToBlogBtn = document.getElementById('back-to-blog');

    if (blogList && blogContent) {
        const fetchArticles = async () => {
            try {
                const response = await fetch('articles/manifest.json');
                const articles = await response.json();
                renderBlogList(articles);
                handleRouting(articles);
            } catch (error) {
                console.error('Error fetching articles:', error);
                blogList.innerHTML = '<p class="col-span-full text-center text-brand-coal/50">Failed to load articles. Please try again later.</p>';
            }
        };

        const renderBlogList = (articles) => {
            blogList.innerHTML = articles.map(article => `
                <div class="flex flex-col group cursor-pointer" onclick="location.search = '?article=${article.id}'">
                    <div class="aspect-video bg-slate-100 rounded-3xl mb-6 overflow-hidden relative">
                        <div class="absolute inset-0 bg-brand-blue/5 group-hover:bg-transparent transition-colors"></div>
                        <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
                            ${article.category}
                        </div>
                    </div>
                    <p class="text-brand-blue text-sm font-bold mb-3">${new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <h3 class="text-2xl font-bold mb-4 group-hover:text-brand-blue transition-colors">${article.title}</h3>
                    <p class="text-brand-coal/70 leading-relaxed mb-6">${article.excerpt}</p>
                    <div class="font-bold flex items-center space-x-2 group-hover:text-brand-blue transition-colors">
                        <span>Read More</span>
                        <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </div>
                </div>
            `).join('');
        };

        const handleRouting = async (articles) => {
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('article');

            if (articleId) {
                const article = articles.find(a => a.id === articleId);
                if (article) {
                    await loadArticle(article);
                } else {
                    showList();
                }
            } else {
                showList();
            }
        };

        const loadArticle = async (article) => {
            try {
                const response = await fetch(`articles/${article.file}`);
                const markdown = await response.text();
                blogContent.innerHTML = marked.parse(markdown);

                blogListSection.classList.add('hidden');
                blogContentSection.classList.remove('hidden');
                window.scrollTo(0, 0);
            } catch (error) {
                console.error('Error loading article:', error);
                showList();
            }
        };

        const showList = () => {
            blogListSection.classList.remove('hidden');
            blogContentSection.classList.add('hidden');
        };

        backToBlogBtn.addEventListener('click', () => {
            const url = new URL(window.location);
            url.searchParams.delete('article');
            window.history.pushState({}, '', url);
            showList();
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('article');
            if (!articleId) showList();
            // Note: If going back to an article, the fetchArticles might need to be re-run or cache results
            // For simplicity in this static site, we just re-check routing
            fetchArticles();
        });

        fetchArticles();
    }
});
