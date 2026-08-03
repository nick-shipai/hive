/* ============================================
   HIVE — Landing Page Scripts
   Particles, GSAP, Interactions, Animations
   ============================================ */

(function () {
    'use strict';

    /* --- Particle System --- */
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animFrame;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.hue = Math.random() > 0.5 ? 240 : 185; // purple or cyan
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.pulseOffset = Math.random() * Math.PI * 2;
        }

        update(time) {
            this.x += this.speedX;
            this.y += this.speedY;
            this.opacity = 0.15 + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.15;

            if (this.x < -10 || this.x > canvas.width + 10 ||
                this.y < -10 || this.y > canvas.height + 10) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        const count = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function animateParticles(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update(time);
            p.draw();
        });
        animFrame = requestAnimationFrame(() => animateParticles(performance.now()));
    }

    resizeCanvas();
    initParticles();
    animateParticles(0);

    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });

    /* --- Custom Cursor --- */
    const customCursor = document.getElementById('custom-cursor');
    const mouseGradient = document.getElementById('mouse-gradient');
    const cursorHex = customCursor ? customCursor.querySelector('.cursor-hex') : null;
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let cursorRotAngle = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (mouseGradient) {
            mouseGradient.style.left = mouseX + 'px';
            mouseGradient.style.top = mouseY + 'px';
        }
    });

    function updateCursor() {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        cursorX += dx * 0.15;
        cursorY += dy * 0.15;

        // Calculate rotation based on movement direction
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const speed = Math.sqrt(dx * dx + dy * dy);
        const targetRot = angle + 90;
        cursorRotAngle += (targetRot - cursorRotAngle) * 0.1;

        if (customCursor) {
            customCursor.style.left = cursorX + 'px';
            customCursor.style.top = cursorY + 'px';
        }
        if (cursorHex) {
            // Only rotate when moving fast enough
            if (speed > 0.5) {
                cursorHex.style.transform = `rotate(${cursorRotAngle}deg)`;
            }
        }
        requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // Hide default cursor on all elements
    document.body.style.cursor = 'none';
    document.querySelectorAll('a, button, .feature-card, .community-card, .safety-card, .testimonial-card, .stat-card, .step, .feature-pill, .feature-showcase-card').forEach(el => {
        el.style.cursor = 'none';
    });

    const hoverTargets = 'a, button, .feature-card, .community-card, .safety-card, .testimonial-card, .stat-card, .step, .feature-pill, .feature-showcase-card';

    document.querySelectorAll(hoverTargets).forEach(el => {
        el.addEventListener('mouseenter', () => {
            customCursor && customCursor.classList.add('hovering');
        });
        el.addEventListener('mouseleave', () => {
            customCursor && customCursor.classList.remove('hovering');
        });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
        customCursor && customCursor.classList.add('hidden');
    });
    document.addEventListener('mouseenter', () => {
        customCursor && customCursor.classList.remove('hidden');
    });

    /* --- Ripple Effect --- */
    document.querySelectorAll('.ripple-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });

    /* --- Navbar Scroll --- */
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const scroll = window.scrollY;
        if (scroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        lastScroll = scroll;
    });

    /* --- Mobile Menu --- */
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }

    /* --- Smooth Scroll --- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (mobileMenu) mobileMenu.classList.remove('active');
            }
        });
    });

    /* --- GSAP Scroll Reveal --- */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Reveal animations
        document.querySelectorAll('.animate-reveal').forEach((el, i) => {
            gsap.fromTo(el,
                { opacity: 0, y: 50 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.9,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 88%',
                        toggleActions: 'play none none none'
                    },
                    onComplete: () => el.classList.add('revealed')
                }
            );
        });

        // Parallax for aurora backgrounds
        gsap.to('.aurora-1', {
            y: 100,
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        gsap.to('.aurora-2', {
            y: -80,
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        // Phone mockup parallax
        gsap.to('.phone-1', {
            y: -60,
            rotation: -8,
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        gsap.to('.phone-2', {
            y: -40,
            rotation: 8,
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });

        // Community cards stagger
        gsap.utils.toArray('.community-card').forEach((card, i) => {
            gsap.fromTo(card,
                { opacity: 0, y: 60, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    delay: i * 0.06,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 90%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        // Steps animation
        gsap.utils.toArray('.step').forEach((step, i) => {
            gsap.fromTo(step,
                { opacity: 0, y: 60, scale: 0.9 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.8,
                    delay: i * 0.15,
                    ease: 'back.out(1.2)',
                    scrollTrigger: {
                        trigger: step,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        // Hero title text animation
        gsap.fromTo('.hero-title',
            { opacity: 0, y: 40, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.2 }
        );

        gsap.fromTo('.hero-badge',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 }
        );

        gsap.fromTo('.hero-subtitle',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.4 }
        );

        gsap.fromTo('.hero-cta',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.6 }
        );

        gsap.fromTo('.hero-stats',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.8 }
        );

        // CTA section
        gsap.fromTo('.cta-content',
            { opacity: 0, y: 60, scale: 0.95 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: '.cta-content',
                    start: 'top 80%',
                    toggleActions: 'play none none none'
                }
            }
        );

        // CTA orbs animation
        gsap.to('.cta-orb-1', {
            x: 30, y: -20,
            duration: 8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        gsap.to('.cta-orb-2', {
            x: -25, y: 15,
            duration: 10,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        // Feature showcase cards
        gsap.utils.toArray('.feature-showcase-card').forEach((card, i) => {
            gsap.fromTo(card,
                { opacity: 0, y: 50, rotateX: 5 },
                {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 0.8,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

    } else {
        // Fallback: just show everything
        document.querySelectorAll('.animate-reveal').forEach(el => {
            el.classList.add('revealed');
        });
    }

    /* --- Animated Counters --- */
    function animateCounter(el, target, duration) {
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * eased);

            if (target >= 1000000) {
                el.textContent = (current / 1000000).toFixed(current >= target ? 0 : 1) + 'M';
            } else if (target >= 1000) {
                el.textContent = Math.floor(current / 1000) + 'K';
            } else {
                el.textContent = current;
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                if (target >= 1000000) {
                    el.textContent = (target / 1000000).toFixed(1) + 'M';
                } else if (target >= 1000) {
                    el.textContent = (target / 1000) + 'K';
                } else {
                    el.textContent = target;
                }
            }
        }

        requestAnimationFrame(update);
    }

    // Hero stat counters
    const heroStatNumbers = document.querySelectorAll('.hero-stat-number[data-target]');
    if (heroStatNumbers.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.target);
                    animateCounter(entry.target, target, 2000);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        heroStatNumbers.forEach(el => observer.observe(el));
    }

    // Stat section counters
    const statCounters = document.querySelectorAll('.counter');
    if (statCounters.length > 0) {
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.target);
                    animateCounter(entry.target, target, 2500);
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statCounters.forEach(el => statObserver.observe(el));
    }

    // Stat bar animations
    const statBars = document.querySelectorAll('.stat-bar-fill');
    if (statBars.length > 0) {
        const barObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    barObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statBars.forEach(bar => barObserver.observe(bar));
    }

    /* --- 3D Tilt Effect on Cards --- */
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / centerY * -5;
            const rotateY = (x - centerX) / centerX * 5;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;

            // Move glow
            const glow = card.querySelector('.community-glow');
            if (glow) {
                glow.style.left = `${x - rect.width}px`;
                glow.style.top = `${y - rect.height}px`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    });

    /* --- Magnetic Button Effect --- */
    document.querySelectorAll('.magnetic-btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
            btn.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            setTimeout(() => { btn.style.transition = ''; }, 400);
        });
    });

    /* --- Smooth Scroll for Scroll Indicator --- */
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            document.getElementById('why-hive').scrollIntoView({ behavior: 'smooth' });
        });
        scrollIndicator.style.cursor = 'pointer';
    }

    /* --- Intersection Observer for general reveals (non-GSAP fallback) --- */
    if (typeof gsap === 'undefined') {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.animate-reveal').forEach(el => {
            revealObserver.observe(el);
        });
    }

    /* --- Typing effect for phone mockups (subtle) --- */
    function addTypingIndicator() {
        const inputs = document.querySelectorAll('.phone-input span');
        inputs.forEach(input => {
            const phrases = ['Type a message...', 'Type a message...', 'Hey what\'s up!', 'lol that\'s funny', 'send memes'];
            let idx = 0;
            setInterval(() => {
                idx = (idx + 1) % phrases.length;
                input.textContent = phrases[idx];
            }, 3000);
        });
    }
    addTypingIndicator();

    /* --- Neon line animation on feature cards --- */
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'rgba(108, 99, 255, 0.3)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = '';
        });
    });

    /* --- Dynamic gradient following mouse on body --- */
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.body.style.setProperty('--mouse-x', x + '%');
        document.body.style.setProperty('--mouse-y', y + '%');
    });

    /* --- Preloader / Page ready --- */
    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
    });

})();
