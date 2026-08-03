/* ============================================
   HIVE — Signup Page Scripts
   Particles, Validation, API Integration, Animations
   ============================================ */

(function () {
    'use strict';

    /* ── Config ──────────────────────────────────────────── */
    const API_BASE = 'https://ea23-54-202-91-167.ngrok-free.app';
    const TIMEOUT_MS = 12000;

    /* ── Particles ───────────────────────────────────────── */
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class P {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.r = Math.random() * 1.5 + 0.3;
            this.vx = (Math.random() - 0.5) * 0.15;
            this.vy = (Math.random() - 0.5) * 0.15;
            this.o = Math.random() * 0.3 + 0.05;
            this.h = [240, 185, 330, 150][~~(Math.random() * 4)];
            this.p = Math.random() * 0.015 + 0.003;
            this.ph = Math.random() * 6.28;
        }
        update(t) {
            this.x += this.vx;
            this.y += this.vy;
            this.o = 0.08 + Math.sin(t * this.p + this.ph) * 0.1;
            if (this.x < -5 || this.x > canvas.width + 5 || this.y < -5 || this.y > canvas.height + 5) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 6.28);
            ctx.fillStyle = `hsla(${this.h},70%,70%,${this.o})`;
            ctx.fill();
        }
    }

    function initP() {
        const n = Math.min(~~(canvas.width * canvas.height / 20000), 60);
        particles = Array.from({ length: n }, () => new P());
    }

    function loop(t) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(t); p.draw(); });
        requestAnimationFrame(loop);
    }

    resize(); initP(); loop(0);
    window.addEventListener('resize', () => { resize(); initP(); });

    /* ── Toast Notifications ─────────────────────────────── */
    function showToast(message, type) {
        type = type || 'error';
        var container = document.getElementById('toast-container');
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML =
            '<span class="toast-icon">' + (type === 'error' ? '✕' : '✓') + '</span>' +
            '<span class="toast-msg">' + escapeHtml(message) + '</span>' +
            '<button class="toast-close" aria-label="Dismiss">&times;</button>';
        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', function () {
            removeToast(toast);
        });

        setTimeout(function () { removeToast(toast); }, 5000);
    }

    function removeToast(toast) {
        if (!toast || toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(function () { toast.remove(); }, 350);
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* ── Password Toggle ─────────────────────────────────── */
    var pwInput = document.getElementById('password');
    var toggleBtn = document.getElementById('toggle-pw');

    if (toggleBtn && pwInput) {
        toggleBtn.addEventListener('click', function () {
            var isPw = pwInput.type === 'password';
            pwInput.type = isPw ? 'text' : 'password';
            toggleBtn.querySelector('.icon-eye').style.display = isPw ? 'none' : 'block';
            toggleBtn.querySelector('.icon-eye-off').style.display = isPw ? 'block' : 'none';
        });
    }

    /* ── Password Strength ───────────────────────────────── */
    var strengthEl = document.getElementById('pw-strength');
    var bars = document.querySelectorAll('.pw-bar');
    var pwLabel = document.getElementById('pw-label');

    function score(pw) {
        var s = 0;
        if (pw.length >= 8) s++;
        if (pw.length >= 12) s++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return Math.min(s, 4);
    }

    function updateStrength(s) {
        var labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        var cls = ['', '', 'med', 'strong', 'strong'];
        var colors = ['', '#FF4757', '#FFB347', '#7CFFB2', '#7CFFB2'];

        bars.forEach(function (b, i) {
            b.className = 'pw-bar';
            if (i < s) {
                b.classList.add('on');
                if (cls[s]) b.classList.add(cls[s]);
            }
        });

        if (pwLabel) {
            pwLabel.textContent = labels[s] || '';
            pwLabel.style.color = colors[s] || '';
        }
    }

    if (pwInput) {
        pwInput.addEventListener('input', function () {
            var v = pwInput.value;
            if (strengthEl) strengthEl.classList.toggle('visible', v.length > 0);
            updateStrength(score(v));
        });
    }

    /* ── Client-Side Validation (matches backend rules) ──── */
    function looksLikeEmail(str) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }

    var validators = {
        username: function (v, allValues) {
            if (!v) return 'Username is required';
            if (v.length < 3) return 'At least 3 characters';
            if (v.length > 30) return 'Max 30 characters';
            if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Letters, numbers, _ only';
            if (looksLikeEmail(v)) return 'Cannot be formatted like an email';
            if (allValues.email && v.toLowerCase() === allValues.email.trim().toLowerCase()) {
                return 'Username cannot be the same as email';
            }
            return '';
        },
        email: function (v) {
            if (!v) return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email';
            return '';
        },
        password: function (v) {
            if (!v) return 'Password is required';
            if (v.length < 8) return 'At least 8 characters';
            if (!/[A-Z]/.test(v)) return 'Need at least one uppercase letter';
            if (!/[a-z]/.test(v)) return 'Need at least one lowercase letter';
            if (!/[0-9]/.test(v)) return 'Need at least one number';
            if (!/[^A-Za-z0-9]/.test(v)) return 'Need at least one special character';
            return '';
        }
    };

    function getAllValues() {
        return {
            username: (document.getElementById('username') || {}).value || '',
            email: (document.getElementById('email') || {}).value || '',
            password: (document.getElementById('password') || {}).value || ''
        };
    }

    function validateField(input) {
        var name = input.name || input.id;
        var group = input.closest('.field');
        var hint = group ? group.querySelector('.hint') : null;
        var fn = validators[name];
        if (!fn) return true;

        var allValues = getAllValues();
        var err = fn(input.value.trim(), allValues);
        if (hint) hint.textContent = err;

        group.classList.remove('valid', 'invalid', 'shake');
        if (input.value.trim()) {
            group.classList.add(err ? 'invalid' : 'valid');
        }
        if (err && input.dataset.blurred) {
            group.classList.add('shake');
            setTimeout(function () { group.classList.remove('shake'); }, 400);
        }
        return !err;
    }

    var fields = document.querySelectorAll('.input-wrap input');
    fields.forEach(function (input) {
        input.addEventListener('blur', function () {
            input.dataset.blurred = 'true';
            validateField(input);
        });
        input.addEventListener('input', function () {
            if (input.dataset.blurred) validateField(input);
            // Re-validate username when email changes (cross-field)
            if (input.id === 'email') {
                var usernameInput = document.getElementById('username');
                if (usernameInput && usernameInput.dataset.blurred) {
                    validateField(usernameInput);
                }
            }
        });
    });

    /* ── Fetch Helper ────────────────────────────────────── */
    function apiRequest(endpoint, body) {
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

        return fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        .then(function (res) {
            clearTimeout(timer);
            return res.json().then(function (data) {
                if (!res.ok) {
                    throw {
                        status: res.status,
                        message: (data && data.message) || 'Something went wrong',
                    };
                }
                return data;
            });
        })
        .catch(function (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                throw { status: 0, message: 'Server is taking too long. Try again.' };
            }
            if (err instanceof TypeError) {
                throw { status: 0, message: 'Network error. Check your connection.' };
            }
            throw err;
        });
    }

    /* ── Submit ──────────────────────────────────────────── */
    var form = document.getElementById('signup-form');
    var submitBtn = document.getElementById('btn-submit');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Mark all fields as blurred to show validation
            fields.forEach(function (f) { f.dataset.blurred = 'true'; });

            var allValues = getAllValues();
            var results = [];
            fields.forEach(function (f) {
                results.push(validateField(f));
            });
            var allValid = results.every(function (v) { return v; });

            if (!allValid) {
                var first = form.querySelector('.field.invalid');
                if (first) {
                    first.classList.add('shake');
                    setTimeout(function () { first.classList.remove('shake'); }, 400);
                }
                return;
            }

            var username = document.getElementById('username').value.trim();
            var email = document.getElementById('email').value.trim();
            var password = document.getElementById('password').value;

            // Disable button, show loading
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            apiRequest('/api/auth/register', {
                username: username,
                email: email,
                password: password,
            })
            .then(function (data) {
                // Success — store user data, token, and show success overlay
                if (data.user) {
                    localStorage.setItem('hive_user', JSON.stringify(data.user));
                }
                if (data.token) {
                    localStorage.setItem('hive_token', data.token);
                }

                showToast(data.message || 'Account created!', 'success');

                // Show success overlay, then redirect to onboarding
                var overlay = document.getElementById('success-overlay');
                if (overlay) {
                    overlay.classList.add('active');

                    var modal = overlay.querySelector('.success-modal');
                    if (modal) {
                        var heading = modal.querySelector('h3');
                        var desc = modal.querySelector('p');
                        var link = modal.querySelector('a');
                        if (heading) heading.innerHTML = 'Welcome to <span class="glow-text">Hive</span>';
                        if (desc) desc.textContent = 'Let\'s complete your profile to get started.';
                        if (link) {
                            link.href = '../onboarding/';
                            link.querySelector('.btn-label').textContent = 'Complete Profile';
                        }
                    }
                }

                // Redirect to onboarding after 2 seconds
                setTimeout(function () {
                    window.location.href = '../onboarding/';
                }, 2000);
            })
            .catch(function (err) {
                showToast(err.message || 'Something went wrong', 'error');
            })
            .finally(function () {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            });
        });
    }

    /* ── GSAP Entrance ───────────────────────────────────── */
    if (typeof gsap !== 'undefined') {
        gsap.from('.brand-logo', { opacity: 0, y: -20, duration: 0.6, delay: 0.1 });
        gsap.from('.brand-headline', { opacity: 0, y: 30, duration: 0.7, delay: 0.2 });
        gsap.from('.brand-desc', { opacity: 0, y: 20, duration: 0.6, delay: 0.35 });
        gsap.from('.brand-stats', { opacity: 0, y: 15, duration: 0.5, delay: 0.5 });

        gsap.from('.form-header', { opacity: 0, y: 20, duration: 0.6, delay: 0.3 });
        gsap.from('.social-row', { opacity: 0, y: 15, duration: 0.5, delay: 0.45 });
        gsap.from('.divider', { opacity: 0, duration: 0.4, delay: 0.55 });

        gsap.from('.field', {
            opacity: 0, y: 20,
            duration: 0.5, stagger: 0.08,
            delay: 0.6, ease: 'power3.out'
        });

        gsap.fromTo('#btn-submit',
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5, delay: 0.9, ease: 'power3.out' }
        );
        gsap.from('.login-text', { opacity: 0, duration: 0.4, delay: 1.0 });
        gsap.from('.terms', { opacity: 0, duration: 0.4, delay: 1.1 });
    }

})();
