/* ============================================
   HIVE — Onboarding Scripts
   Particles, Upload, DOB, Auth, Animations
   ============================================ */

(function () {
    'use strict';

    var API = 'https://71e5-54-202-91-167.ngrok-free.app';
    var TIMEOUT = 30000;
    var MAX_SIZE = 5 * 1024 * 1024;
    var ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    /* ── Particles ───────────────────────────────────────── */
    var cvs = document.getElementById('particles');
    var c = cvs.getContext('2d');
    var pts = [];

    function sizeCanvas() {
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
    }

    function Pt() {
        this.x = Math.random() * cvs.width;
        this.y = Math.random() * cvs.height;
        this.r = Math.random() * 1.5 + 0.4;
        this.dx = (Math.random() - 0.5) * 0.25;
        this.dy = (Math.random() - 0.5) * 0.25;
        this.o = Math.random() * 0.35 + 0.08;
        this.h = Math.random() > 0.5 ? 240 : 185;
        this.ps = Math.random() * 0.015 + 0.005;
        this.po = Math.random() * 6.28;
    }

    Pt.prototype.up = function (t) {
        this.x += this.dx;
        this.y += this.dy;
        this.o = 0.12 + Math.sin(t * this.ps + this.po) * 0.1;
        if (this.x < -10 || this.x > cvs.width + 10 || this.y < -10 || this.y > cvs.height + 10) {
            this.x = Math.random() * cvs.width;
            this.y = Math.random() * cvs.height;
        }
    };

    Pt.prototype.dr = function () {
        c.beginPath();
        c.arc(this.x, this.y, this.r, 0, 6.28);
        c.fillStyle = 'hsla(' + this.h + ',80%,70%,' + this.o + ')';
        c.fill();
    };

    function initPts() {
        var n = Math.min(Math.floor((cvs.width * cvs.height) / 18000), 60);
        pts = [];
        for (var i = 0; i < n; i++) pts.push(new Pt());
    }

    function drawPts(t) {
        c.clearRect(0, 0, cvs.width, cvs.height);
        for (var i = 0; i < pts.length; i++) { pts[i].up(t); pts[i].dr(); }
        requestAnimationFrame(function () { drawPts(performance.now()); });
    }

    sizeCanvas();
    initPts();
    drawPts(0);
    window.addEventListener('resize', function () { sizeCanvas(); initPts(); });

    /* ── Card mouse glow ─────────────────────────────────── */
    var card = document.getElementById('card');
    if (card) {
        card.addEventListener('mousemove', function (e) {
            var r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
    }

    /* ── Auth check ──────────────────────────────────────── */
    if (!window.HiveAuth || !HiveAuth.isAuthenticated()) {
        window.location.href = '../signup/';
        return;
    }

    /* ── Toast ───────────────────────────────────────────── */
    function toast(msg, type) {
        type = type || 'error';
        var wrap = document.getElementById('toast-wrap');
        var el = document.createElement('div');
        el.className = 'toast ' + type;
        el.innerHTML =
            '<span class="toast-icon">' + (type === 'error' ? '\u2715' : '\u2713') + '</span>' +
            '<span>' + esc(msg) + '</span>' +
            '<button class="toast-x" aria-label="Dismiss">&times;</button>';
        wrap.appendChild(el);
        el.querySelector('.toast-x').onclick = function () { killToast(el); };
        setTimeout(function () { killToast(el); }, 5000);
    }

    function killToast(el) {
        if (!el || el.classList.contains('removing')) return;
        el.classList.add('removing');
        setTimeout(function () { el.remove(); }, 300);
    }

    function esc(s) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
    }

    /* ── Elements ────────────────────────────────────────── */
    var avatar = document.getElementById('avatar');
    var avatarPh = document.getElementById('avatar-ph');
    var avatarImg = document.getElementById('avatar-img');
    var avatarOk = document.getElementById('avatar-ok');
    var fileInput = document.getElementById('file-input');
    var picErr = document.getElementById('pic-err');
    var usernameInput = document.getElementById('username');
    var dobMonth = document.getElementById('dob-month');
    var dobDay = document.getElementById('dob-day');
    var dobYear = document.getElementById('dob-year');
    var dobErr = document.getElementById('dob-err');
    var btnGo = document.getElementById('btn-go');
    var skipLink = document.getElementById('skip-link');

    var base64 = null;

    /* ── Default Avatar Generation ───────────────────────── */
    var AVATAR_COLORS = [
        '#5865F2', // Blurple
        '#EB459E', // Fuchsia
        '#57F287', // Green
        '#ED4245', // Red
        '#6C63FF', // Hive Primary
        '#00B4D8', // Ocean
        '#FF6B6B', // Coral
        '#A78BFA', // Lavender
        '#F59E0B', // Amber
        '#EC4899', // Pink
        '#14B8A6', // Teal
        '#F97316', // Orange
    ];

    var defaultAvatarBase64 = null;

    function generateDefaultAvatar(callback) {
        var color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        var size = 512;
        var radius = 120;
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');

        /* rounded background */
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        /* draw bee image centered */
        var img = new Image();
        img.onload = function () {
            var padding = size * 0.15;
            var drawSize = size - padding * 2;
            var offset = padding;
            ctx.drawImage(img, offset, offset, drawSize, drawSize);
            defaultAvatarBase64 = canvas.toDataURL('image/png');
            callback();
        };
        img.src = 'bee-avatar.png';
    }

    /* ── Show default avatar on load ─────────────────────── */
    function showDefaultAvatar() {
        if (!base64 && avatarImg && avatarPh) {
            avatarImg.src = defaultAvatarBase64;
            avatar.classList.add('has-img');
            picErr.textContent = '';
            avatar.classList.remove('error');
        }
    }

    generateDefaultAvatar(showDefaultAvatar);

    /* ── Username from storage ───────────────────────────── */
    var user = null;
    try { user = HiveAuth.getUser(); } catch (e) {}
    if (user && user.username) {
        usernameInput.value = user.username;
    } else {
        usernameInput.value = '';
    }

    /* ── Populate DOB ────────────────────────────────────── */
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    var now = new Date();
    var cy = now.getFullYear();

    months.forEach(function (m, i) {
        var o = document.createElement('option');
        o.value = String(i + 1).padStart(2, '0');
        o.textContent = m;
        dobMonth.appendChild(o);
    });

    for (var d = 1; d <= 31; d++) {
        var o = document.createElement('option');
        o.value = String(d).padStart(2, '0');
        o.textContent = d;
        dobDay.appendChild(o);
    }

    for (var y = cy - 13; y >= cy - 18; y--) {
        var o = document.createElement('option');
        o.value = y;
        o.textContent = y;
        dobYear.appendChild(o);
    }

    /* ── File upload ─────────────────────────────────────── */
    function handleFile(file) {
        if (!file) return;
        if (ALLOWED.indexOf(file.type) === -1) {
            picErr.textContent = 'JPEG, PNG, GIF, or WebP only';
            avatar.classList.add('error');
            return;
        }
        if (file.size > MAX_SIZE) {
            picErr.textContent = 'Image must be under 5MB';
            avatar.classList.add('error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            base64 = e.target.result;
            avatarImg.src = base64;
            avatar.classList.add('has-img');
            avatar.classList.remove('error');
            picErr.textContent = '';
        };
        reader.readAsDataURL(file);
    }

    function uploadToR2(file, cb) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var w = img.width, h = img.height;
                var maxW = 512, maxH = 512;
                if (w > maxW) { h = h * maxW / w; w = maxW; }
                if (h > maxH) { w = w * maxH / h; h = maxH; }
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(w);
                canvas.height = Math.round(h);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(function (blob) {
                    if (!blob) { cb(null); return; }
                    var formData = new FormData();
                    formData.append('file', blob, 'avatar.jpg');
                    fetch(API + '/api/upload/avatar', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + HiveAuth.getToken(),
                            'ngrok-skip-browser-warning': 'true',
                        },
                        body: formData,
                    })
                    .then(function (r) { return r.json(); })
                    .then(function (data) { cb(data.success ? data.url : null); })
                    .catch(function () { cb(null); });
                }, 'image/jpeg', 0.85);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    avatar.addEventListener('click', function () { fileInput.click(); });
    avatar.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });
    avatar.addEventListener('dragover', function (e) { e.preventDefault(); avatar.classList.add('dragover'); });
    avatar.addEventListener('dragleave', function () { avatar.classList.remove('dragover'); });
    avatar.addEventListener('drop', function (e) {
        e.preventDefault();
        avatar.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    /* ── Validation ──────────────────────────────────────── */
    function valPic() {
        if (!base64) {
            base64 = defaultAvatarBase64;
        }
        picErr.textContent = '';
        avatar.classList.remove('error');
        return true;
    }

    function valDob() {
        var m = dobMonth.value, d = dobDay.value, y = dobYear.value;
        if (!m || !d || !y) {
            dobErr.textContent = 'Please select your date of birth';
            return false;
        }
        var dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        var age = now.getFullYear() - dt.getFullYear();
        var md = now.getMonth() - dt.getMonth();
        if (md < 0 || (md === 0 && now.getDate() < dt.getDate())) age--;
        if (age < 13) { dobErr.textContent = 'Must be at least 13 years old'; return false; }
        if (age > 17) { dobErr.textContent = 'Hive is for teens aged 13–17'; return false; }
        dobErr.textContent = '';
        return true;
    }

    [dobMonth, dobDay, dobYear].forEach(function (el) {
        el.addEventListener('change', valDob);
    });

    function shakeEl(el) {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'shake 0.35s cubic-bezier(.4,0,.2,1)';
        setTimeout(function () { el.style.animation = ''; }, 350);
    }

    /* ── Ripple ──────────────────────────────────────────── */
    btnGo.addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var rip = document.createElement('span');
        rip.className = 'ripple';
        rip.style.left = (e.clientX - r.left) + 'px';
        rip.style.top = (e.clientY - r.top) + 'px';
        this.appendChild(rip);
        setTimeout(function () { rip.remove(); }, 500);
    });

    /* ── Submit ──────────────────────────────────────────── */
    btnGo.addEventListener('click', function () {
        var vp = valPic(), vd = valDob();
        if (!vp || !vd) {
            if (!vp) shakeEl(avatar.closest('.avatar-wrap'));
            if (!vd) shakeEl(document.getElementById('dob-field'));
            return;
        }

        btnGo.classList.add('loading');
        btnGo.disabled = true;

        var dobVal = dobYear.value + '-' + dobMonth.value + '-' + dobDay.value;

        function submitProfile(picUrl) {
            fetch(API + '/api/auth/complete-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + HiveAuth.getToken(),
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ profile_picture: picUrl, date_of_birth: dobVal, rank: 'rookie' }),
            })
            .then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) throw { status: res.status, message: (data && data.message) || 'Something went wrong' };
                    return data;
                });
            })
            .then(function (data) {
                toast(data.message || 'Profile completed!', 'success');
                if (data.user) HiveAuth.setUser(data.user);

                btnGo.classList.remove('loading');
                btnGo.disabled = false;

                var txt = btnGo.querySelector('.btn-text');
                if (txt) txt.textContent = 'Welcome to Hive!';
                btnGo.style.background = 'linear-gradient(135deg, var(--green), #5BE89A)';
                btnGo.style.boxShadow = '0 4px 20px rgba(124,255,178,0.3)';

                setTimeout(function () { window.location.href = '../home/'; }, 1400);
            })
            .catch(function (err) {
                if (err instanceof TypeError) toast('Network error. Check connection.', 'error');
                else toast(err.message || 'Something went wrong', 'error');
                btnGo.classList.remove('loading');
                btnGo.disabled = false;
            });
        }

        if (fileInput && fileInput.files && fileInput.files[0]) {
            uploadToR2(fileInput.files[0], function (url) {
                if (url) {
                    submitProfile(url);
                } else {
                    toast('Failed to upload image. Try again.', 'error');
                    btnGo.classList.remove('loading');
                    btnGo.disabled = false;
                }
            });
        } else {
            var avCanvas = document.createElement('canvas');
            avCanvas.width = 512; avCanvas.height = 512;
            var avCtx = avCanvas.getContext('2d');
            var avImg = new Image();
            avImg.onload = function () {
                avCtx.drawImage(avImg, 0, 0, 512, 512);
                avCanvas.toBlob(function (blob) {
                    if (!blob) { submitProfile(defaultAvatarBase64); return; }
                    var fd = new FormData();
                    fd.append('file', blob, 'default-avatar.jpg');
                    fetch(API + '/api/upload/avatar', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + HiveAuth.getToken(),
                            'ngrok-skip-browser-warning': 'true',
                        },
                        body: fd,
                    })
                    .then(function (r) { return r.json(); })
                    .then(function (d) { submitProfile(d.success ? d.url : defaultAvatarBase64); })
                    .catch(function () { submitProfile(defaultAvatarBase64); });
                }, 'image/jpeg', 0.85);
            };
            avImg.onerror = function () { submitProfile(defaultAvatarBase64); };
            avImg.src = defaultAvatarBase64;
        }
    });

    /* ── Skip ────────────────────────────────────────────── */
    skipLink.addEventListener('click', function (e) {
        e.preventDefault();
        var dobVal = '';
        if (dobMonth && dobMonth.value && dobDay && dobDay.value && dobYear && dobYear.value) {
            dobVal = dobYear.value + '-' + dobMonth.value + '-' + dobDay.value;
        }

        /* Convert default avatar to blob and upload to R2 */
        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 512, 512);
            canvas.toBlob(function (blob) {
                if (!blob) {
                    window.location.href = '../home/';
                    return;
                }
                var formData = new FormData();
                formData.append('file', blob, 'default-avatar.jpg');
                fetch(API + '/api/upload/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + HiveAuth.getToken(),
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body: formData,
                })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var url = data.success ? data.url : '';
                    return fetch(API + '/api/auth/complete-profile', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + HiveAuth.getToken(),
                            'ngrok-skip-browser-warning': 'true'
                        },
                        body: JSON.stringify({ profile_picture: url, date_of_birth: dobVal, rank: 'rookie' }),
                    });
                })
                .finally(function () {
                    window.location.href = '../home/';
                });
            }, 'image/jpeg', 0.85);
        };
        img.onerror = function () { window.location.href = '../home/'; };
        img.src = defaultAvatarBase64;
    });

    /* ── GSAP entrance ───────────────────────────────────── */
    if (typeof gsap !== 'undefined') {
        gsap.from('.left-brand', { opacity: 0, y: -16, duration: 0.6, delay: 0.1, ease: 'back.out(1.5)' });
        gsap.from('.left-title', { opacity: 0, y: 24, duration: 0.7, delay: 0.2, ease: 'power3.out' });
        gsap.from('.left-desc', { opacity: 0, y: 16, duration: 0.6, delay: 0.35 });
        gsap.from('.illustration', { opacity: 0, scale: 0.9, duration: 0.8, delay: 0.45, ease: 'power3.out' });
        gsap.from('.card', { opacity: 0, y: 30, duration: 0.7, delay: 0.2, ease: 'power3.out' });
        gsap.from('.steps', { opacity: 0, y: -12, duration: 0.5, delay: 0.35 });
        gsap.from('.avatar', { opacity: 0, scale: 0.7, duration: 0.6, delay: 0.45, ease: 'back.out(1.6)' });
        gsap.from('#username-field', { opacity: 0, y: 12, duration: 0.5, delay: 0.55 });
        gsap.from('#dob-field', { opacity: 0, y: 12, duration: 0.5, delay: 0.65 });
        gsap.from('.btn-go', { opacity: 0, y: 10, duration: 0.4, delay: 0.75 });
        gsap.from('.skip', { opacity: 0, duration: 0.3, delay: 0.85 });
    }

})();
