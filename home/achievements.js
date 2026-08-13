/* ══════════════════════════════════════════════
   ACHIEVEMENTS MODULE — Real backend data
   ══════════════════════════════════════════════ */

(function () {

    var achvCache = null;
    var achvState = { activeTab: 'all', loading: false };

    var achvIcons = {
        first_buzz:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        welcome_to_hive:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        rank_rookie:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        chatterbox:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
        social_bee:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        rank_explorer:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
        rank_member:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        community_explorer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
        regular:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        friendly_bee:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        rank_contributor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        hive_addict:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        rank_insider:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        super_social:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        rank_pioneer:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        community_builder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        rank_elite:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        rank_legend:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
        xp:               '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
        rank_titan:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M4 16l2-12 6 4 6-4 2 12H4z"/></svg>',
        rank_nova:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
        check:            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        lock:             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        crown:            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M4 16l2-12 6 4 6-4 2 12H4z"/></svg>'
    };

    var achvColors = {
        first_buzz:       { color: '#00E5FF', bg: 'rgba(0,229,255,0.12)' },
        welcome_to_hive:  { color: '#FF4D9E', bg: 'rgba(255,77,158,0.12)' },
        rank_rookie:       { color: '#7a8599', bg: 'rgba(122,133,153,0.12)' },
        chatterbox:       { color: '#00E5FF', bg: 'rgba(0,229,255,0.12)' },
        rank_explorer:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
        social_bee:       { color: '#7CFFB2', bg: 'rgba(124,255,178,0.12)' },
        rank_member:      { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
        community_explorer:{ color: '#6C63FF', bg: 'rgba(108,99,255,0.12)' },
        regular:          { color: '#FFD93D', bg: 'rgba(255,217,61,0.12)' },
        friendly_bee:     { color: '#FF4D9E', bg: 'rgba(255,77,158,0.12)' },
        rank_contributor: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
        hive_addict:      { color: '#FF6B35', bg: 'rgba(255,107,53,0.12)' },
        rank_insider:     { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
        super_social:     { color: '#7CFFB2', bg: 'rgba(124,255,178,0.12)' },
        rank_pioneer:     { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
        community_builder:{ color: '#00E5FF', bg: 'rgba(0,229,255,0.12)' },
        rank_elite:       { color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
        rank_legend:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
        xp:               { color: '#FFD93D', bg: 'rgba(255,217,61,0.12)' },
        rank_titan:       { color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
        rank_nova:        { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' }
    };

    function getAchvOverlay() { return document.querySelector('.achv-overlay'); }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function getIcon(id) {
        return achvIcons[id] || achvIcons.xp;
    }

    function getColors(id) {
        return achvColors[id] || { color: '#6C63FF', bg: 'rgba(108,99,255,0.12)' };
    }

    function fetchAchievements() {
        if (!window.HiveAuth || !window.HiveAuth.apiFetch) return Promise.reject('Not authenticated');
        return window.HiveAuth.apiFetch('/api/achievements', { method: 'GET' });
    }

    function showLoading() {
        var grid = document.querySelector('.achv-grid');
        if (grid) {
            grid.innerHTML = '<div class="achv-loading">' +
                '<div class="achv-spinner"></div>' +
                '<div class="achv-loading-text">Loading achievements...</div>' +
            '</div>';
        }
    }

    function showError(msg) {
        var grid = document.querySelector('.achv-grid');
        if (grid) {
            grid.innerHTML = '<div class="achv-empty">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                '<div class="achv-empty-text">' + escapeHtml(msg) + '</div>' +
                '<button class="achv-retry-btn" onclick="window.openAchievements()">Retry</button>' +
            '</div>';
        }
    }

    function openAchievements() {
        var overlay = getAchvOverlay();
        if (!overlay) return;
        overlay.style.display = '';
        document.body.style.overflow = 'hidden';
        showLoading();
        bindAchvEvents();

        fetchAchievements()
            .then(function (data) {
                if (!data || !data.achievements) throw new Error('Invalid response');
                achvCache = data;
                renderAchvCards();
                renderAchvSidebar();
                renderMilestones();
            })
            .catch(function (err) {
                console.error('[ACHV] Fetch error:', err);
                showError('Failed to load achievements. Please try again.');
            });
    }

    function closeAchievements() {
        var overlay = getAchvOverlay();
        if (!overlay) return;
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function renderAchvCards() {
        var grid = document.querySelector('.achv-grid');
        if (!grid || !achvCache) return;

        var filter = achvState.activeTab;
        var items = achvCache.achievements || [];
        if (filter === 'unlocked') items = items.filter(function (a) { return a.unlocked; });
        else if (filter === 'locked') items = items.filter(function (a) { return !a.unlocked; });

        var all = achvCache.achievements || [];
        var unlockedCount = all.filter(function (a) { return a.unlocked; }).length;
        var lockedCount = all.filter(function (a) { return !a.unlocked; }).length;
        var countAll = document.getElementById('achv-count-all');
        var countUnlocked = document.getElementById('achv-count-unlocked');
        var countLocked = document.getElementById('achv-count-locked');
        if (countAll) countAll.textContent = all.length;
        if (countUnlocked) countUnlocked.textContent = unlockedCount;
        if (countLocked) countLocked.textContent = lockedCount;

        if (!items.length) {
            grid.innerHTML = '<div class="achv-empty">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' +
                '<div class="achv-empty-text">' + (filter === 'unlocked' ? 'No achievements unlocked yet.' : 'All achievements unlocked!') + '</div>' +
            '</div>';
            return;
        }

        grid.innerHTML = '';
        items.forEach(function (a) {
            var card = document.createElement('div');
            card.className = 'achv-card-item' + (a.unlocked ? ' unlocked' : ' locked');

            var colors = getColors(a.id);
            var icon = getIcon(a.id);

            var statusHtml = a.unlocked
                ? '<div class="achv-card-status unlocked"><span>' + achvIcons.check + '</span> Unlocked</div>'
                : '<div class="achv-card-status locked"><span>' + achvIcons.lock + '</span> Locked</div>';

            var rewardHtml = '';
            if (a.reward_type === 'premium' && a.reward_days) {
                rewardHtml = '<div class="achv-card-reward"><span class="achv-reward-badge">' + achvIcons.crown + ' ' + a.reward_days + ' days Premium</span></div>';
            }

            var progressHtml = '';
            if (!a.unlocked && a.required > 0) {
                progressHtml = '<div class="achv-progress-bar-wrap">' +
                    '<div class="achv-progress-bar"><div class="achv-progress-bar-fill" style="width:' + a.progress + '%"></div></div>' +
                    '<span class="achv-progress-text">' + a.current_progress + ' / ' + a.required + '</span>' +
                '</div>';
            }

            var dateHtml = a.unlocked && a.unlocked_at
                ? '<div class="achv-card-date">' + formatDate(a.unlocked_at) + '</div>'
                : '';

            card.innerHTML =
                '<div class="achv-card-icon" style="background:' + colors.bg + ';color:' + colors.color + '">' + icon + '</div>' +
                '<div class="achv-card-body">' +
                    statusHtml +
                    '<div class="achv-card-name">' + escapeHtml(a.name) + '</div>' +
                    '<div class="achv-card-desc">' + escapeHtml(a.description) + '</div>' +
                    progressHtml +
                    rewardHtml +
                    '<div class="achv-card-footer">' +
                        '<div class="achv-card-xp">' + achvIcons.xp + ' +' + a.xp_reward + ' XP</div>' +
                        dateHtml +
                    '</div>' +
                '</div>';
            grid.appendChild(card);
        });
    }

    function renderAchvSidebar() {
        if (!achvCache) return;

        var stats = achvCache.stats || {};
        var user = achvCache.user || {};
        var recentUnlocks = achvCache.recentUnlocks || [];

        // Progress ring
        var pct = stats.completionPct || 0;
        var ringPct = document.querySelector('.achv-ring-pct');
        if (ringPct) ringPct.textContent = pct + '%';

        var ringFill = document.querySelector('.achv-ring-fill');
        if (ringFill) {
            var circumference = 2 * Math.PI * 42;
            var offset = circumference - (pct / 100) * circumference;
            ringFill.style.strokeDasharray = circumference;
            ringFill.style.strokeDashoffset = offset;
        }

        var countEl = document.querySelector('.achv-progress-count');
        if (countEl) countEl.textContent = (stats.unlocked || 0) + ' / ' + (stats.total || 0);

        var mobileRingPct = document.getElementById('achv-mobile-ring-pct');
        if (mobileRingPct) mobileRingPct.textContent = pct + '%';

        var mobileXpFill = document.getElementById('achv-mobile-progress-fill');
        if (mobileXpFill) mobileXpFill.style.width = pct + '%';

        var mobileLevel = document.getElementById('achv-mobile-level-label');
        if (mobileLevel) mobileLevel.textContent = 'Level ' + (user.level || 1);

        var mobileXpText = document.getElementById('achv-mobile-xp-text');
        if (mobileXpText) mobileXpText.textContent = (user.xp || 0).toLocaleString() + ' XP';

        var mobileUnlocked = document.getElementById('achv-mobile-unlocked-count');
        if (mobileUnlocked) mobileUnlocked.textContent = stats.unlocked || 0;

        var mobileStreak = document.getElementById('achv-mobile-streak');
        if (mobileStreak) mobileStreak.textContent = user.activity_days || 0;

        var mobileTotalXp = document.getElementById('achv-mobile-total-xp');
        if (mobileTotalXp) mobileTotalXp.textContent = (user.xp || 0).toLocaleString();

        // XP summary
        var xpVal = document.getElementById('achv-total-xp');
        if (xpVal) xpVal.textContent = (user.xp || 0).toLocaleString();

        var streakVal = document.getElementById('achv-streak');
        if (streakVal) streakVal.textContent = (user.activity_days || 0) + ' days';

        var lvlVal = document.getElementById('achv-level-val');
        if (lvlVal) lvlVal.textContent = user.level || 1;

        // Recent unlocks
        var recentList = document.querySelector('.achv-recent-list');
        if (recentList) {
            recentList.innerHTML = '';
            if (!recentUnlocks.length) {
                recentList.innerHTML = '<div class="achv-recent-empty">No achievements unlocked yet</div>';
                return;
            }
            recentUnlocks.forEach(function (a, i) {
                var colors = getColors(a.achievement_id);
                var icon = getIcon(a.achievement_id);
                var item = document.createElement('div');
                item.className = 'achv-recent-item';
                item.style.animationDelay = (i * 0.08) + 's';
                item.innerHTML =
                    '<div class="achv-recent-icon" style="background:' + colors.bg + ';color:' + colors.color + '">' + icon + '</div>' +
                    '<div class="achv-recent-info">' +
                        '<span class="achv-recent-name">' + escapeHtml(a.name) + '</span>' +
                        '<span class="achv-recent-time">' + formatDate(a.unlocked_at) + '</span>' +
                    '</div>';
                recentList.appendChild(item);
            });
        }
    }

    function renderMilestones() {
        var milestoneCard = document.querySelector('.achv-milestone-card');
        var milestoneList = document.querySelector('.achv-milestone-list');
        if (!milestoneCard || !milestoneList || !achvCache) return;

        var milestones = achvCache.milestones || [];
        var userXp = (achvCache.user && achvCache.user.xp) || 0;
        milestoneList.innerHTML = '';

        milestones.forEach(function (m) {
            var item = document.createElement('div');
            item.className = 'achv-milestone-item' + (m.claimed ? ' claimed' : '');
            var statusIcon = m.claimed ? achvIcons.check : (m.reached ? achvIcons.crown : achvIcons.lock);
            var statusClass = m.claimed ? 'claimed' : (m.reached ? 'reached' : 'locked');
            item.innerHTML =
                '<div class="achv-milestone-icon ' + statusClass + '">' + statusIcon + '</div>' +
                '<div class="achv-milestone-info">' +
                    '<span class="achv-milestone-name">' + escapeHtml(m.name) + '</span>' +
                    '<span class="achv-milestone-req">' + m.xp.toLocaleString() + ' XP required</span>' +
                '</div>' +
                '<div class="achv-milestone-status ' + statusClass + '">' +
                    (m.claimed ? 'Claimed' : (m.reached ? 'Ready' : Math.round((userXp / m.xp) * 100) + '%')) +
                '</div>';
            milestoneList.appendChild(item);
        });
    }

    function bindAchvEvents() {
        var closeBtn = document.querySelector('.achv-close');
        if (closeBtn && !closeBtn._achvBound) {
            closeBtn._achvBound = true;
            closeBtn.addEventListener('click', closeAchievements);
        }

        var overlay = getAchvOverlay();
        if (overlay && !overlay._achvBound) {
            overlay._achvBound = true;
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeAchievements();
            });
        }

        document.querySelectorAll('.achv-tab').forEach(function (tab) {
            if (tab._achvBound) return;
            tab._achvBound = true;
            tab.addEventListener('click', function () {
                document.querySelectorAll('.achv-tab').forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                achvState.activeTab = tab.getAttribute('data-filter') || 'all';
                renderAchvCards();
            });
        });

        if (!document._achvEscBound) {
            document._achvEscBound = true;
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') closeAchievements();
            });
        }
    }

    // Real-time: listen for achievement unlocks via socket
    function setupSocketListeners() {
        if (typeof io === 'undefined') return;
        // The socket is connected in script.js — we listen on the global socket
        function tryBind() {
            var sock = window._socket || (window.state && window.state.socket);
            if (!sock) return false;
            if (sock._achvListener) return true;

            sock.on('achievement:unlocked', function (data) {
                if (!data || !data.achievement) return;
                if (window.showToast) window.showToast('Achievement unlocked: ' + data.achievement.name + '! +' + data.achievement.xp + ' XP', 'success');
                // Refresh cache if popup is open
                if (getAchvOverlay() && getAchvOverlay().style.display !== 'none') {
                    fetchAchievements().then(function (d) {
                        achvCache = d;
                        renderAchvCards();
                        renderAchvSidebar();
                        renderMilestones();
                    }).catch(function () {});
                }
            });

            sock.on('milestone:premium', function (data) {
                if (!data || !data.reward) return;
                if (window.showToast) window.showToast('Premium milestone reached! +' + data.reward.name, 'success');
            });

            sock._achvListener = true;
            return true;
        }

        // Try now, retry every 2s if socket not ready
        if (!tryBind()) {
            var interval = setInterval(function () {
                if (tryBind()) clearInterval(interval);
            }, 2000);
        }
    }

    var achvRailBtn = document.getElementById('achievements-rail-btn');
    if (achvRailBtn) {
        achvRailBtn.addEventListener('click', openAchievements);
    }

    setupSocketListeners();

    window.openAchievements = openAchievements;
    window.closeAchievements = closeAchievements;

})();
