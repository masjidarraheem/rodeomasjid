// Modern Masjid Website JavaScript
// =================================

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        // Close mobile menu when link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                // Special handling for programs which is a card within a section
                let offsetTop = target.offsetTop - 80;
                
                // If target is within a section (like programs card), get the card's position
                if (target.classList.contains('info-card')) {
                    const rect = target.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    offsetTop = rect.top + scrollTop - 100;
                }
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Back to top button
    const backToTop = document.querySelector('.back-to-top');
    
    if (backToTop) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Add stagger effect for grid items
                if (entry.target.classList.contains('info-card')) {
                    const cards = document.querySelectorAll('.info-card');
                    cards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate-fade-in');
                        }, index * 100);
                    });
                }
                
                if (entry.target.classList.contains('timeline-item')) {
                    const items = document.querySelectorAll('.timeline-item');
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('animate-fade-in');
                        }, index * 150);
                    });
                }
            }
        });
    }, observerOptions);
    
    // Observe elements
    const elementsToObserve = document.querySelectorAll('.info-card, .timeline-item, .donation-card, .about-grid, .contact-grid');
    elementsToObserve.forEach(el => {
        observer.observe(el);
    });
    
    // Add animation classes to elements
    const animateElements = document.querySelectorAll('.section-title, .section-subtitle');
    animateElements.forEach(el => {
        el.classList.add('animate-fade-in');
    });
    
    // Active navigation highlighting
    const sections = document.querySelectorAll('section[id]');
    
    function highlightNavigation() {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            
            if (navLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink.classList.add('active');
                } else {
                    navLink.classList.remove('active');
                }
            }
        });
    }
    
    window.addEventListener('scroll', highlightNavigation);
    
    // Form validation
    const emailForm = document.getElementById('mc-embedded-subscribe-form');
    
    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            const emailInput = document.getElementById('mce-EMAIL');
            const emailValue = emailInput.value.trim();
            
            if (!emailValue || !validateEmail(emailValue)) {
                e.preventDefault();
                emailInput.classList.add('error');
                emailInput.focus();
                
                setTimeout(() => {
                    emailInput.classList.remove('error');
                }, 3000);
            }
        });
    }
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Lazy loading for images
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
        });
    }
    
    // Add CSS class for error states
    const style = document.createElement('style');
    style.textContent = `
        .form-control.error {
            border-color: #f44336 !important;
            animation: shake 0.5s;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .nav-link.active {
            background: linear-gradient(135deg, rgba(0,105,92,0.1) 0%, rgba(77,182,172,0.1) 100%);
            color: var(--primary-dark);
        }
        
        img.loaded {
            animation: fadeIn 0.5s ease-out;
        }
        
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
    
    // Touch swipe support for mobile navigation
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swiped left - close menu
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
        if (touchEndX > touchStartX + 50) {
            // Swiped right - open menu (only if at the edge)
            if (touchStartX < 50) {
                navMenu.classList.add('active');
                navToggle.classList.add('active');
            }
        }
    }
    
    // Performance optimization - debounce scroll events
    let scrollTimeout;
    function debounceScroll(func, wait = 10) {
        return function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(func, wait);
        };
    }
    
    window.addEventListener('scroll', debounceScroll(highlightNavigation));
    
    // Preload critical images
    const criticalImages = [
        '/img/newbannerlogo2.png',
        '/img/birdsview.jpg'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    // Progressive enhancement for older browsers
    if (!('IntersectionObserver' in window)) {
        // Fallback for animations
        document.querySelectorAll('.info-card, .timeline-item, .donation-card').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }
    
    // Accessibility improvements
    // Add keyboard navigation for mobile menu
    navToggle.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        }
    });
    
    // Trap focus in mobile menu when open
    function trapFocus(element) {
        const focusableElements = element.querySelectorAll('a, button, input, select, textarea');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
            
            if (e.key === 'Escape') {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.focus();
            }
        });
    }
    
    // Apply focus trap when menu is active
    const menuObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (navMenu.classList.contains('active')) {
                trapFocus(navMenu);
            }
        });
    });
    
    menuObserver.observe(navMenu, {
        attributes: true,
        attributeFilter: ['class']
    });
});

// Service Worker Registration (for PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js');
    });
}

console.log('Masjid Ar-Raheem website loaded successfully');