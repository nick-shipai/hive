/**
 * Hive — Home / App Shell
 * SPA routing, community loading, Socket.IO messaging, real-time chat.
 */
(function () {
    'use strict';

    /* ── Config ──────────────────────────────── */
    var API_BASE = 'https://api.hivechat.online';
    var SOCKET_URL = 'https://api.hivechat.online';
    var MESSAGE_LIMIT = 10;

    /* ── State ───────────────────────────────── */
    var state = {
        user: null,
        communities: [],
        currentCommunity: null,
        socket: null,
        messages: [],
        hasMore: true,
        loadingMessages: false,
        loadingOlder: false,        // true while loading older messages (scroll up)
        pendingMessages: {},
        replyingTo: null,
        reconciledIds: {},
        messageCache: new Map(),   // communityId -> { messages, hasMore }
        // Presence state (chat sidebar — per community)
        members: new Map(),        // userId -> { id, username, profile_picture, rank, online, last_seen }
        heartbeatInterval: null,
        // Home presence state (home sidebar — all communities)
        homeMembers: new Map(),    // userId -> { id, username, profile_picture, rank, online, last_seen }
        // Typing state
        typingUsers: [],           // Array of { userId, username } currently typing
        typingTimeout: null,       // debounce timeout for sending typing:start
        isTyping: false,           // whether we've sent typing:start and haven't sent stop yet
        lastTypingEmit: 0,         // timestamp of last typing:start emit
        // Mute state
        isMuted: false,            // whether current user is muted
        muteTimer: null,           // interval for countdown
        mutedUntil: null,          // ISO string of mute expiry
        // DM state
        dmConversations: [],       // Array of conversation objects
        currentDmConversation: null, // currently open DM conversation
        dmMessages: [],            // messages in current DM conversation
        // Bee usage state
        beeUsage: null,            // { remaining, limit, isUnlimited, used }
        currentDmUserId: null,     // other user's ID in current DM conversation
        // Active view: 'home' | 'chat' | 'dm' | 'communities'
        activeView: 'home',
        // Notification panel
        notifOpen: false,
        notifCloseTimeout: null,
        onlineUsersOpen: false,
        onlinePush: false,
        notifNotifications: [],
        notifUnreadCount: 0,
        notifOffset: 0,
        notifLoading: false,
        notifHasMore: true,
        // GIF picker
        gifPickerOpen: false,
    };

    /* ── DOM Cache ───────────────────────────── */
    var dom = {};

    /* ── Helpers ─────────────────────────────── */
    function $(id) { return document.getElementById(id); }
    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function esc(str) { return escapeHtml(str || ''); }

    function showToast(msg, type) {
        var existing = document.querySelector('.toast-msg');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;font-size:0.82rem;font-weight:600;z-index:99999;color:#fff;animation:toastIn 0.3s ease;' + (type === 'error' ? 'background:#EF4444;' : 'background:#23A55A;');
        document.body.appendChild(toast);
        setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2500);
        setTimeout(function() { toast.remove(); }, 3000);
    }

    function refreshUserPanel() {
        var u = state.user;
        if (!u) return;
        if (dom.userAvatar) dom.userAvatar.src = getAvatarUrl(u);
        var mobileAvatarImg = $('mobile-topbar-avatar-img');
        if (mobileAvatarImg) mobileAvatarImg.src = getAvatarUrl(u);
        if (dom.userName) dom.userName.textContent = u.display_name || u.username || 'User';
        if (dom.userTag) dom.userTag.textContent = '@' + (u.username || 'user');
    }

    var RANK_COLORS = {
        rookie: '#7a8599', explorer: '#3B82F6', member: '#38BDF8',
        contributor: '#8B5CF6', insider: '#06B6D4', pioneer: '#7C3AED',
        elite: '#A855F7', legend: '#F59E0B', titan: '#EC4899', nova: '#F59E0B',
        moderator: '#3B82F6', administrator: '#8B5CF6', owner: '#F59E0B',
        verified: '#6C63FF', bot: '#00E5FF',
    };
    function getRankColor(rank) {
        return RANK_COLORS[rank] || '#7a8599';
    }

    function renderMessageText(str) {
        if (!str) return '';
        if (!window.HiveEmoji) {
            return renderHashtags(escapeHtml(str));
        }
        var parts = str.split(/(:hive_[a-z_]+:)/g);
        var html = '';
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (/^:hive_[a-z_]+:$/.test(part)) {
                var key = part.replace(/:hive_/, '').replace(/:/, '');
                var info = window.HiveEmoji.get(key);
                if (info) {
                    var badge = window.HiveEmoji.create(key, 20);
                    if (badge) {
                        html += '<span class="hive-emoji-inline" data-emoji="' + key + '" title="' + info.name + '">' + badge.innerHTML + '</span>';
                        continue;
                    }
                }
                html += escapeHtml(part);
            } else {
                html += renderHashtags(escapeHtml(part));
            }
        }
        return html;
    }

    function renderHashtags(html) {
        return html.replace(/#([a-zA-Z0-9_]{1,100})/g, function (match, name) {
            return '<span class="msg-hashtag" data-tag="' + escapeHtml(name.toLowerCase()) + '" role="link" tabindex="0">#' + escapeHtml(name) + '</span>';
        });
    }

    function formatTime(isoStr) {
        var d = new Date(isoStr);
        var now = new Date();
        var diffMs = now - d;
        var diffMin = Math.floor(diffMs / 60000);
        var diffHr = Math.floor(diffMs / 3600000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return diffMin + 'm ago';
        if (diffHr < 24) return diffHr + 'h ago';
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var isThisYear = d.getFullYear() === now.getFullYear();
        return months[d.getMonth()] + ' ' + d.getDate() + (isThisYear ? '' : ', ' + d.getFullYear());
    }

    function formatFullTime(isoStr) {
        var d = new Date(isoStr);
        var now = new Date();
        var isToday = d.toDateString() === now.toDateString();
        var yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        var isYesterday = d.toDateString() === yesterday.toDateString();
        var time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday) return 'Today at ' + time;
        if (isYesterday) return 'Yesterday at ' + time;
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + time;
    }

    function formatDateDivider(isoStr) {
        var d = new Date(isoStr);
        var now = new Date();
        var isToday = d.toDateString() === now.toDateString();
        var yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        var isYesterday = d.toDateString() === yesterday.toDateString();
        if (isToday) return 'Today';
        if (isYesterday) return 'Yesterday';
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function getAvatarUrl(user) {
        if (user && user.profile_picture) {
            if (user.profile_picture.startsWith('data:')) return user.profile_picture;
            return user.profile_picture;
        }
        return 'https://i.pravatar.cc/80?u=' + (user ? user.id || user.username : 'default');
    }

    var AVATAR_COLORS = [
        '#5865F2','#EB459E','#57F287','#ED4245','#6C63FF',
        '#00B4D8','#FF6B6B','#A78BFA','#F59E0B','#EC4899',
        '#14B8A6','#F97316',
    ];

    function generateDefaultAvatar(cb) {
        var color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        var size = 512, radius = 120;
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
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
        var img = new Image();
        img.onload = function () {
            var padding = size * 0.15;
            var drawSize = size - padding * 2;
            ctx.drawImage(img, padding, padding, drawSize, drawSize);
            canvas.toBlob(function (blob) {
                if (!blob) { cb(null); return; }
                var fd = new FormData();
                fd.append('file', blob, 'default-avatar.png');
                var token = HiveAuth.getToken();
                fetch(API_BASE + '/api/upload/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body: fd,
                })
                .then(function (r) { return r.json(); })
                .then(function (d) { cb(d.success ? d.url : null); })
                .catch(function () { cb(null); });
            }, 'image/png');
        };
        img.onerror = function () {
            cb(null);
        };
        img.src = '../onboarding/bee-avatar.png';
    }

    function show(el) { if (el) el.style.display = ''; }
    function hide(el) { if (el) el.style.display = 'none'; }

    function generateTempId() {
        return 'tmp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function generateClientId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    /* ── Rank Badge Helper ────────────────────── */
    function createRankBadgeHtml(rank, sizeClass) {
        if (!rank || !window.HiveRankBadge) return '';
        // Bot badge is handled separately via createBotBadgeHtml
        if (rank === 'bot') return '';
        var info = window.HiveRankBadge.getInfo(rank);
        if (!info) return '';
        var badgeEl = window.HiveRankBadge.create(rank, 14);
        if (!badgeEl) return '';
        var cls = 'rank-badge ' + (sizeClass || 'rank-badge-sm') + ' rank-' + rank;
        badgeEl.className = cls;
        badgeEl.setAttribute('data-rank', rank);
        badgeEl.setAttribute('data-rank-tip', info.label);
        return badgeEl.outerHTML;
    }

    function createBotBadgeHtml() {
        if (!window.HiveRankBadge) return '';
        var badgeEl = window.HiveRankBadge.create('bot', 14);
        if (!badgeEl) return '';
        badgeEl.className = 'rank-badge rank-badge-sm rank-bot bot-badge';
        badgeEl.setAttribute('data-rank', 'bot');
        badgeEl.setAttribute('data-rank-tip', 'Bot');
        return badgeEl.outerHTML;
    }

    function createVerifiedBadgeHtml() {
        return '<span class="verified-badge" title="Verified">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6C63FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        '</span>';
    }

    /* ── Mute System ─────────────────────────── */
    function checkMuteStatus() {
        if (!state.user) return;
        apiGet('/api/messages/' + (state.currentCommunity ? state.currentCommunity.id : 'none'))
            .catch(function () {}); // Just checking — actual mute check is server-side
    }

    function showMuteBanner(reason, mutedUntil) {
        state.isMuted = true;
        state.mutedUntil = mutedUntil;
        var banner = dom.muteBanner;
        var reasonEl = dom.muteBannerReason;
        var timerEl = dom.muteBannerTimer;
        if (!banner) return;

        banner.style.display = '';
        if (reasonEl) reasonEl.textContent = reason || 'Policy violation';

        // Disable composer
        if (dom.composerInput) {
            dom.composerInput.setAttribute('contenteditable', 'false');
            dom.composerInput.classList.add('muted');
        }
        if (dom.sendBtn) dom.sendBtn.classList.add('muted');

        // Start countdown
        updateMuteTimer();
        if (state.muteTimer) clearInterval(state.muteTimer);
        state.muteTimer = setInterval(updateMuteTimer, 1000);
    }

    function updateMuteTimer() {
        var timerEl = dom.muteBannerTimer;
        if (!timerEl || !state.mutedUntil) return;

        var remaining = new Date(state.mutedUntil).getTime() - Date.now();
        if (remaining <= 0) {
            hideMuteBanner();
            return;
        }

        var hours = Math.floor(remaining / 3600000);
        var minutes = Math.floor((remaining % 3600000) / 60000);
        var seconds = Math.floor((remaining % 60000) / 1000);
        var text = '';
        if (hours > 0) text += hours + 'h ';
        if (minutes > 0) text += minutes + 'm ';
        text += seconds + 's remaining';
        timerEl.textContent = text;
    }

    function hideMuteBanner() {
        state.isMuted = false;
        state.mutedUntil = null;
        if (state.muteTimer) { clearInterval(state.muteTimer); state.muteTimer = null; }
        var banner = dom.muteBanner;
        if (banner) banner.style.display = 'none';
        if (dom.composerInput) {
            dom.composerInput.setAttribute('contenteditable', 'true');
            dom.composerInput.classList.remove('muted');
        }
        if (dom.sendBtn) dom.sendBtn.classList.remove('muted');
    }

    function checkUserMuteStatus(communityId) {
        if (!state.user) return;
        // Check via a lightweight endpoint — we use the user's own profile
        apiGet('/api/auth/me')
            .then(function (user) {
                if (user && user.muted_until) {
                    var mutedUntil = new Date(user.muted_until);
                    if (mutedUntil > new Date()) {
                        showMuteBanner(user.muted_reason || 'Policy violation', user.muted_until);
                    } else {
                        hideMuteBanner();
                    }
                } else {
                    hideMuteBanner();
                }
            })
            .catch(function () {});
    }

    /* ── AI Typing Indicator ─────────────────── */
    function showAITyping(username) {
        var indicator = dom.typingIndicator;
        var avatarsEl = dom.typingAvatars;
        var textEl = dom.typingText;
        if (!indicator || !textEl) return;

        if (avatarsEl) {
            // Try to find Hive Guardian bot in state for actual avatar
            var botAvatar = '/assets/ai_guard.png';
            state.members.forEach(function (member) {
                if (member.username === 'hive guardian' && member.profile_picture) {
                    botAvatar = member.profile_picture;
                }
            });
            state.homeMembers.forEach(function (member) {
                if (member.username === 'hive guardian' && member.profile_picture) {
                    botAvatar = member.profile_picture;
                }
            });
            avatarsEl.innerHTML = '<img class="typing-avatar ai-typing-avatar" src="' + escapeHtml(botAvatar) + '" alt="" loading="lazy">';
        }
        textEl.innerHTML = '<strong>Hive Guardian</strong> is typing';

        if (indicator.style.display === 'none') {
            indicator.style.display = '';
            indicator.classList.add('typing-visible');
        }
    }

    function hideAITyping() {
        var indicator = dom.typingIndicator;
        if (indicator) {
            indicator.style.display = 'none';
            indicator.classList.remove('typing-visible');
        }
    }

    /* ── Reply Accent Colors ─────────────────── */
    var REPLY_COLORS = [
        '#6C63FF', // Blue
        '#8B5CF6', // Purple
        '#00E5FF', // Cyan
        '#10B981', // Emerald
        '#F59E0B', // Orange
        '#EC4899', // Pink
        '#EF4444', // Red
        '#EAB308', // Gold
        '#6366F1', // Indigo
        '#14B8A6', // Teal
    ];

    function getReplyAccentColor(userId) {
        if (!userId) return REPLY_COLORS[0];
        var hash = 0;
        var idStr = String(userId);
        for (var i = 0; i < idStr.length; i++) {
            hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return REPLY_COLORS[Math.abs(hash) % REPLY_COLORS.length];
    }

    /* ── Typing Indicator ────────────────────── */
    function formatTypingText(users) {
        if (users.length === 0) return '';
        if (users.length === 1) return '<strong>' + escapeHtml(users[0].username) + '</strong> is typing';
        if (users.length === 2) return '<strong>' + escapeHtml(users[0].username) + '</strong> and <strong>' + escapeHtml(users[1].username) + '</strong> are typing';
        if (users.length === 3) return '<strong>' + escapeHtml(users[0].username) + '</strong>, <strong>' + escapeHtml(users[1].username) + '</strong> and <strong>' + escapeHtml(users[2].username) + '</strong> are typing';
        return '<strong>' + users.length + ' people</strong> are typing';
    }

    function renderTypingIndicator() {
        var indicator = dom.typingIndicator;
        var avatarsEl = dom.typingAvatars;
        var textEl = dom.typingText;
        if (!indicator || !avatarsEl || !textEl) return;

        var users = state.typingUsers;
        if (users.length === 0) {
            indicator.style.display = 'none';
            indicator.classList.remove('typing-visible');
            return;
        }

        // Build avatar HTML (show max 3 avatars)
        var avatarHtml = '';
        var showUsers = users.slice(0, 3);
        for (var i = 0; i < showUsers.length; i++) {
            var u = showUsers[i];
            var avatarUrl = 'https://i.pravatar.cc/80?u=' + (u.userId || u.username);
            // Try to find user in state to get their actual avatar
            if (u.userId) {
                var memberData = state.members.get(u.userId) || state.homeMembers.get(u.userId);
                if (memberData) {
                    avatarUrl = getAvatarUrl(memberData);
                }
            }
            avatarHtml += '<img class="typing-avatar" src="' + escapeHtml(avatarUrl) + '" alt="" loading="lazy">';
        }
        avatarsEl.innerHTML = avatarHtml;

        // Build text
        textEl.innerHTML = formatTypingText(users);

        // Show with animation
        if (indicator.style.display === 'none') {
            indicator.style.display = '';
            indicator.classList.add('typing-visible');
        }
    }

    function emitTypingStart() {
        if (!state.socket) return;
        if (state.isTyping) {
            var now = Date.now();
            if (now - state.lastTypingEmit < 2000) return;
        }
        state.isTyping = true;
        state.lastTypingEmit = Date.now();
        if (state.currentDmConversation) {
            state.socket.emit('dm:typing', { conversationId: state.currentDmConversation });
        } else if (state.currentCommunity) {
            state.socket.emit('typing:start', {
                communityId: state.currentCommunity.id,
                channelId: 'general',
            });
        }
    }

    function emitTypingStop() {
        if (!state.socket || !state.isTyping) return;
        state.isTyping = false;
        if (state.currentDmConversation) {
            state.socket.emit('dm:typing:stop', { conversationId: state.currentDmConversation });
        } else if (state.currentCommunity) {
            state.socket.emit('typing:stop', {
                communityId: state.currentCommunity.id,
                channelId: 'general',
            });
        }
    }

    function handleTypingInput() {
        emitTypingStart();
        // Reset debounce — after 3s of no input, stop typing
        if (state.typingTimeout) clearTimeout(state.typingTimeout);
        state.typingTimeout = setTimeout(function () {
            emitTypingStop();
        }, 3000);
    }

    /* ── Presence Helpers ────────────────────── */
    function formatLastSeen(isoStr) {
        if (!isoStr) return '';
        var d = new Date(isoStr);
        var now = new Date();
        var diffMs = now - d;
        var diffSec = Math.floor(diffMs / 1000);
        var diffMin = Math.floor(diffSec / 60);
        var diffHr = Math.floor(diffMin / 60);
        var diffDay = Math.floor(diffHr / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return diffMin + 'm ago';
        if (diffHr < 24) return diffHr + 'h ago';
        if (diffDay === 1) return 'Yesterday';
        if (diffDay < 7) return diffDay + ' days ago';
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate();
    }

    function createMemberCardHtml(member, isOffline) {
        var avatarUrl = getAvatarUrl(member);
        var statusClass = isOffline ? 'offline' : 'online';
        var isBot = member.is_bot || member.rank === 'bot';
        var memberClass = 'cs-member' + (isOffline ? ' is-offline' : '') + (isBot ? ' is-ai' : '');
        var rankHtml = createRankBadgeHtml(member.rank, 'rank-badge-sm');
        var statusText = '';
        if (isOffline) {
            statusText = '<span class="cs-member-lastseen">Last seen ' + formatLastSeen(member.last_seen) + '</span>';
        }
        var displayName = member.display_name || member.username;
        if (isBot && !member.display_name) {
            if (member.username === 'bee') displayName = '🐝 Bee';
            else if (member.username === 'hive guardian') displayName = '🛡 Hive Guardian';
        }
        var verifiedHtml = member.is_verified ? ' <span class="cs-verified-badge" title="Verified">✓</span>' : '';

        return '<div class="' + memberClass + '" data-user-id="' + member.id + '" data-is-bot="' + (isBot ? 'true' : 'false') + '">' +
            '<div class="cs-member-avatar-wrap ring_' + (member.profile_ring || 'none') + '">' +
                '<img class="cs-member-avatar" src="' + escapeHtml(avatarUrl) + '" alt="' + escapeHtml(member.username) + '" loading="lazy">' +
                '<span class="cs-member-status ' + statusClass + '"></span>' +
            '</div>' +
            '<div class="cs-member-info">' +
                '<span class="cs-member-name' + (member.rank ? ' rank-' + member.rank : '') + '">' + escapeHtml(displayName) + rankHtml + verifiedHtml + '</span>' +
                (isBot && member.status ? '<span class="cs-member-status-text">' + escapeHtml(member.status) + '</span>' : statusText) +
            '</div>' +
        '</div>';
    }

    function loadPresence(communityId) {
        return apiGet('/api/presence/' + communityId)
            .then(function (data) {
                var members = data.members || [];
                state.members.clear();
                for (var i = 0; i < members.length; i++) {
                    state.members.set(members[i].id, members[i]);
                }
                renderPresenceSidebar();
            })
            .catch(function (err) {
                console.error('[HIVE] Failed to load presence:', err);
            });
    }

    function renderPresenceSidebar() {
        var onlineList = dom.csOnlineList;
        var offlineList = dom.csOfflineList;
        var onlineNum = dom.csOnlineNum;
        var offlineNum = dom.csOfflineNum;
        var onlineCount = dom.csOnlineCount;

        if (!onlineList || !offlineList) return;

        var aiBots = [];
        var onlineUsers = [];
        var offlineUsers = [];

        state.members.forEach(function (member) {
            if (member.id === (state.user && state.user.id)) return;
            var isBot = member.is_bot || member.rank === 'bot';
            if (isBot) {
                aiBots.push(member);
            } else if (member.online) {
                onlineUsers.push(member);
            } else {
                offlineUsers.push(member);
            }
        });

        // Sort AI bots: Bee first, then Hive Guardian
        aiBots.sort(function (a, b) {
            if (a.username === 'bee') return -1;
            if (b.username === 'bee') return 1;
            return 0;
        });

        // Sort online by rank desc, then name asc
        onlineUsers.sort(function (a, b) {
            if (a.rank !== b.rank) return (b.rank || '').localeCompare(a.rank || '');
            return (a.username || '').localeCompare(b.username || '');
        });

        // Build online HTML: AI bots first, then separator, then regular users
        var onlineHtml = '';
        for (var i = 0; i < aiBots.length; i++) {
            onlineHtml += createMemberCardHtml(aiBots[i], false);
        }
        if (aiBots.length > 0 && onlineUsers.length > 0) {
            onlineHtml += '<div class="cs-separator"></div>';
        }
        for (var i = 0; i < onlineUsers.length; i++) {
            onlineHtml += createMemberCardHtml(onlineUsers[i], false);
        }
        onlineList.innerHTML = onlineHtml;

        // Build offline HTML
        var offlineHtml = '';
        for (var i = 0; i < offlineUsers.length; i++) {
            offlineHtml += createMemberCardHtml(offlineUsers[i], true);
        }
        offlineList.innerHTML = offlineHtml;

        // Update counts (exclude AI bots from the count)
        if (onlineNum) onlineNum.textContent = onlineUsers.length;
        if (offlineNum) offlineNum.textContent = offlineUsers.length;
        if (onlineCount) onlineCount.textContent = onlineUsers.length + ' online';

        // Bind click handlers for AI member cards
        bindMemberCardClicks(onlineList);
        bindMemberCardClicks(offlineList);
    }

    function bindMemberCardClicks(list) {
        if (!list) return;
        var cards = list.querySelectorAll('.cs-member');
        for (var i = 0; i < cards.length; i++) {
            (function (card) {
                card.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var userId = card.getAttribute('data-user-id');
                    if (!userId) return;
                    var member = state.members.get(userId);
                    if (member) {
                        openUserPopup(userId, card, member);
                    }
                });
            })(cards[i]);
        }
    }

    function addMemberToOnlineList(member) {
        if (member.id === (state.user && state.user.id)) return;
        state.members.set(member.id, {
            id: member.id,
            username: member.username,
            display_name: member.display_name,
            profile_picture: member.profile_picture,
            rank: member.rank,
            online: true,
            is_bot: member.is_bot || false,
            is_verified: member.is_verified || false,
            status: member.status || '',
            last_seen: member.last_seen || new Date().toISOString(),
        });

        var onlineList = dom.csOnlineList;
        var offlineList = dom.csOfflineList;
        if (!onlineList || !offlineList) return;

        // Remove from offline list if present
        var existingOffline = offlineList.querySelector('[data-user-id="' + member.id + '"]');
        if (existingOffline) existingOffline.remove();

        // Re-render to keep AI bots pinned at top
        renderPresenceSidebar();
    }

    function removeMemberFromOnlineList(userId) {
        // Never remove AI bots from online list
        var memberData = state.members.get(userId);
        if (memberData && (memberData.is_bot || memberData.rank === 'bot')) return;

        if (memberData) {
            memberData.online = false;
            memberData.last_seen = new Date().toISOString();
        }

        var onlineList = dom.csOnlineList;
        var offlineList = dom.csOfflineList;
        if (!onlineList || !offlineList) return;

        // Remove from online list
        var existingOnline = onlineList.querySelector('[data-user-id="' + userId + '"]');
        if (existingOnline) existingOnline.remove();

        // Check if already in offline list
        var existingOffline = offlineList.querySelector('[data-user-id="' + userId + '"]');
        if (existingOffline) return;

        // Add to top of offline list with animation
        var member = state.members.get(userId);
        if (member) {
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = createMemberCardHtml(member, true);
            var newEl = tempDiv.firstChild;
            newEl.classList.add('presence-enter');
            offlineList.insertBefore(newEl, offlineList.firstChild);
        }

        // Update counts
        updatePresenceCounts();
    }

    function updatePresenceCounts() {
        var onlineNum = dom.csOnlineNum;
        var offlineNum = dom.csOfflineNum;
        var onlineCount = dom.csOnlineCount;
        var onlineList = dom.csOnlineList;
        var offlineList = dom.csOfflineList;

        if (onlineList && onlineNum) {
            onlineNum.textContent = onlineList.children.length;
        }
        if (offlineList && offlineNum) {
            offlineNum.textContent = offlineList.children.length;
        }
        if (onlineList && onlineCount) {
            onlineCount.textContent = onlineList.children.length + ' online';
        }
    }

    /* ── Home Presence (all communities) ──────── */
    function loadHomePresence() {
        return apiGet('/api/presence/global')
            .then(function (data) {
                var members = data.members || [];
                state.homeMembers.clear();
                for (var i = 0; i < members.length; i++) {
                    state.homeMembers.set(members[i].id, members[i]);
                }
                renderHomePresenceSidebar();
            })
            .catch(function (err) {
                console.error('[HIVE] Failed to load home presence:', err);
            });
    }

    function renderHomePresenceSidebar() {
        var onlineList = dom.homeOnlineList;
        var offlineList = dom.homeOfflineList;
        var onlineNum = dom.homeOnlineNum;
        var offlineNum = dom.homeOfflineNum;

        if (!onlineList || !offlineList) return;

        var aiBots = [];
        var onlineUsers = [];
        var offlineUsers = [];

        state.homeMembers.forEach(function (member) {
            var isBot = member.is_bot || member.rank === 'bot';
            if (isBot) {
                aiBots.push(member);
            } else if (member.online) {
                onlineUsers.push(member);
            } else {
                offlineUsers.push(member);
            }
        });

        // Sort AI bots: Bee first, then Hive Guardian
        aiBots.sort(function (a, b) {
            if (a.username === 'bee') return -1;
            if (b.username === 'bee') return 1;
            return 0;
        });

        // Sort online by rank desc, then name asc
        onlineUsers.sort(function (a, b) {
            if (a.rank !== b.rank) return (b.rank || '').localeCompare(a.rank || '');
            return (a.username || '').localeCompare(b.username || '');
        });

        // Build online HTML: AI bots first, then separator, then regular users
        var onlineHtml = '';
        for (var i = 0; i < aiBots.length; i++) {
            onlineHtml += createHomeMemberCardHtml(aiBots[i], false);
        }
        if (aiBots.length > 0 && onlineUsers.length > 0) {
            onlineHtml += '<div class="cs-separator"></div>';
        }
        for (var i = 0; i < onlineUsers.length; i++) {
            onlineHtml += createHomeMemberCardHtml(onlineUsers[i], false);
        }
        onlineList.innerHTML = onlineHtml;

        // Build offline HTML (limit to 50 for performance)
        var offlineHtml = '';
        var offlineLimit = Math.min(offlineUsers.length, 50);
        for (var i = 0; i < offlineLimit; i++) {
            offlineHtml += createHomeMemberCardHtml(offlineUsers[i], true);
        }
        offlineList.innerHTML = offlineHtml;

        // Update counts (exclude AI bots from the count)
        if (onlineNum) onlineNum.textContent = onlineUsers.length;
        if (offlineNum) offlineNum.textContent = offlineUsers.length;
        var onlineBadge = $('mobile-topbar-online-badge');
        if (onlineBadge) {
            if (onlineUsers.length > 0) {
                onlineBadge.textContent = onlineUsers.length > 99 ? '99+' : onlineUsers.length;
                onlineBadge.style.display = '';
            } else {
                onlineBadge.style.display = 'none';
            }
        }

        // Bind click handlers for AI member cards
        bindHomeMemberCardClicks(onlineList);
        bindHomeMemberCardClicks(offlineList);
    }

    function bindHomeMemberCardClicks(list) {
        if (!list) return;
        var cards = list.querySelectorAll('.friend-item');
        for (var i = 0; i < cards.length; i++) {
            (function (card) {
                card.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var userId = card.getAttribute('data-user-id');
                    if (!userId) return;
                    var member = state.homeMembers.get(userId);
                    if (member) {
                        openUserPopup(userId, card, member);
                    }
                });
            })(cards[i]);
        }
    }

    function createHomeMemberCardHtml(member, isOffline) {
        var avatarUrl = getAvatarUrl(member);
        var statusClass = isOffline ? 'offline' : 'online';
        var isBot = member.is_bot || member.rank === 'bot';
        var memberClass = 'friend-item' + (isOffline ? ' is-offline' : '') + (isBot ? ' is-ai' : '');
        var rankHtml = createRankBadgeHtml(member.rank, 'rank-badge-sm');
        var statusText = '';
        if (isOffline) {
            statusText = '<span class="friend-activity" style="opacity:0.5;">Last seen ' + formatLastSeen(member.last_seen) + '</span>';
        }
        var displayName = member.display_name || member.username;
        if (isBot && !member.display_name) {
            if (member.username === 'bee') displayName = '🐝 Bee';
            else if (member.username === 'hive guardian') displayName = '🛡 Hive Guardian';
        }
        var verifiedHtml = member.is_verified ? ' <span class="cs-verified-badge" title="Verified">✓</span>' : '';

        return '<div class="' + memberClass + '" data-user-id="' + member.id + '" data-is-bot="' + (isBot ? 'true' : 'false') + '">' +
            '<div class="friend-avatar-wrap ring_' + (member.profile_ring || 'none') + '">' +
                '<img class="friend-avatar" src="' + escapeHtml(avatarUrl) + '" alt="' + escapeHtml(member.username) + '" loading="lazy">' +
                '<span class="friend-status ' + statusClass + '"></span>' +
            '</div>' +
            '<div class="friend-info">' +
                '<span class="friend-name">' + escapeHtml(displayName) + rankHtml + verifiedHtml + '</span>' +
                (isBot && member.status ? '<span class="friend-activity">' + escapeHtml(member.status) + '</span>' : statusText) +
            '</div>' +
        '</div>';
    }

    function addMemberToHomeOnlineList(member) {
        state.homeMembers.set(member.id, {
            id: member.id,
            username: member.username,
            display_name: member.display_name,
            profile_picture: member.profile_picture,
            rank: member.rank,
            online: true,
            is_bot: member.is_bot || false,
            is_verified: member.is_verified || false,
            status: member.status || '',
            last_seen: member.last_seen || new Date().toISOString(),
        });

        var onlineList = dom.homeOnlineList;
        var offlineList = dom.homeOfflineList;
        if (!onlineList || !offlineList) return;

        // Remove from offline list if present
        var existingOffline = offlineList.querySelector('[data-user-id="' + member.id + '"]');
        if (existingOffline) existingOffline.remove();

        // Re-render to keep AI bots pinned at top
        renderHomePresenceSidebar();
    }

    function removeMemberFromHomeOnlineList(userId) {
        // Never remove AI bots from online list
        var memberData = state.homeMembers.get(userId);
        if (memberData && (memberData.is_bot || memberData.rank === 'bot')) return;

        if (memberData) {
            memberData.online = false;
            memberData.last_seen = new Date().toISOString();
        }

        var onlineList = dom.homeOnlineList;
        var offlineList = dom.homeOfflineList;
        if (!onlineList || !offlineList) return;

        // Remove from online list
        var existingOnline = onlineList.querySelector('[data-user-id="' + userId + '"]');
        if (existingOnline) existingOnline.remove();

        // Check if already in offline list
        var existingOffline = offlineList.querySelector('[data-user-id="' + userId + '"]');
        if (existingOffline) return;

        // Add to top of offline list with animation
        var member = state.homeMembers.get(userId);
        if (member) {
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = createHomeMemberCardHtml(member, true);
            var newEl = tempDiv.firstChild;
            newEl.classList.add('presence-enter');
            offlineList.insertBefore(newEl, offlineList.firstChild);
        }

        // Update counts
        updateHomePresenceCounts();
    }

    function updateHomePresenceCounts() {
        var onlineNum = dom.homeOnlineNum;
        var offlineNum = dom.homeOfflineNum;
        var onlineList = dom.homeOnlineList;
        var offlineList = dom.homeOfflineList;

        if (onlineList && onlineNum) {
            onlineNum.textContent = onlineList.children.length;
        }
        if (offlineList && offlineNum) {
            offlineNum.textContent = offlineList.children.length;
        }
    }

    /* ── Heartbeat ───────────────────────────── */
    function startHeartbeat() {
        stopHeartbeat();
        state.heartbeatInterval = setInterval(function () {
            if (state.socket && state.socket.connected) {
                state.socket.emit('heartbeat');
            }
        }, 20000);
    }

    function stopHeartbeat() {
        if (state.heartbeatInterval) {
            clearInterval(state.heartbeatInterval);
            state.heartbeatInterval = null;
        }
    }

    /* ── Particles ───────────────────────────── */
    function initParticles() {
        var canvas = $('particles');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var particles = [];
        var count = 50;
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                a: Math.random() * 0.3 + 0.05,
            });
        }
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(108,99,255,' + p.a + ')';
                ctx.fill();
            }
            requestAnimationFrame(draw);
        }
        draw();
    }

    /* ── Tooltip ─────────────────────────────── */
    function initTooltips() {
        var tip = dom.tooltip;
        if (!tip) return;
        document.addEventListener('mouseover', function (e) {
            var el = e.target.closest('[data-tip]');
            if (!el) { tip.classList.remove('visible'); return; }
            tip.textContent = el.getAttribute('data-tip');
            var rect = el.getBoundingClientRect();
            tip.style.left = rect.left + rect.width / 2 - tip.offsetWidth / 2 + 'px';
            tip.style.top = rect.top - tip.offsetHeight - 8 + 'px';
            tip.classList.add('visible');
        });
        document.addEventListener('mouseout', function (e) {
            var el = e.target.closest('[data-tip]');
            if (el) tip.classList.remove('visible');
        });
    }

    /* ── Auth ────────────────────────────────── */
    function checkAuth() {
        if (!window.HiveAuth || !window.HiveAuth.isAuthenticated()) {
            window.location.href = '../signup/';
            return Promise.reject('Not authenticated');
        }
        return window.HiveAuth.checkAuth().then(function (user) {
            state.user = user;
            renderUserPanel();
            return user;
        });
    }

    function renderUserPanel() {
        var user = state.user;
        if (!user) return;
        var avatarUrl = getAvatarUrl(user);
        if (dom.userAvatar) dom.userAvatar.src = avatarUrl;
        var mobileAvatarImg = $('mobile-topbar-avatar-img');
        if (mobileAvatarImg) mobileAvatarImg.src = avatarUrl;
        if (dom.userName) dom.userName.innerHTML = escapeHtml(user.username) + createRankBadgeHtml(user.rank, 'rank-badge-sm');
        if (dom.userTag) dom.userTag.textContent = '#' + user.id.slice(0, 4).toUpperCase();
    }

    /* ── API ─────────────────────────────────── */
    function apiGet(endpoint) {
        return window.HiveAuth.apiFetch(endpoint, { method: 'GET' });
    }

    function apiPost(endpoint, body) {
        return window.HiveAuth.apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /* ── Skeleton Loading ────────────────────── */
    function showMessageSkeletons() {
        if (!dom.chatMessagesInner) return;
        dom.chatMessagesInner.innerHTML = '';
        var html = '';
        for (var i = 0; i < 8; i++) {
            var w = ['w100', 'w80', 'w60', 'w45'][Math.floor(Math.random() * 4)];
            html +=
                '<div class="msg-skeleton">' +
                    '<div class="skel-avatar"></div>' +
                    '<div class="skel-body">' +
                        '<div class="skel-header">' +
                            '<div class="skel-name"></div>' +
                            '<div class="skel-time"></div>' +
                        '</div>' +
                        '<div class="skel-line ' + w + '"></div>' +
                    '</div>' +
                '</div>';
        }
        dom.chatMessagesInner.innerHTML = html;
        // Re-insert loading-older so it stays in DOM
        if (dom.loadingOlder) {
            dom.chatMessagesInner.appendChild(dom.loadingOlder);
            dom.loadingOlder.style.display = 'none';
        }
    }

    function removeSkeletons() {
        if (!dom.chatMessagesInner) return;
        var skels = dom.chatMessagesInner.querySelectorAll('.msg-skeleton');
        for (var i = 0; i < skels.length; i++) {
            skels[i].remove();
        }
    }

    /* ── Communities ─────────────────────────── */
    function loadCommunities() {
        show(dom.communitySkeleton);
        hide(dom.communityEmpty);
        hide(dom.communityError);

        return apiGet('/api/communities/user')
            .then(function (data) {
                state.communities = data.communities || [];
                hide(dom.communitySkeleton);
                if (state.communities.length === 0) {
                    show(dom.communityEmpty);
                } else {
                    renderCommunityList();
                }
            })
            .catch(function (err) {
                console.error('[HIVE] loadCommunities error:', err);
                hide(dom.communitySkeleton);
                show(dom.communityError);
                if (dom.communityErrorMsg) {
                    dom.communityErrorMsg.textContent = (err && err.message) || 'Failed to load communities';
                }
            });
    }

    function renderCommunityList() {
        var list = dom.communityList;
        if (!list) return;
        var existing = list.querySelectorAll('.community-item');
        for (var i = 0; i < existing.length; i++) existing[i].remove();

        for (var i = 0; i < state.communities.length; i++) {
            var c = state.communities[i];
            var item = document.createElement('div');
            item.className = 'community-item';
            item.setAttribute('data-id', c.id);
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.innerHTML =
                '<div class="community-avatar-wrap">' +
                    '<div class="community-avatar-emoji">' + escapeHtml(c.icon || '#') + '</div>' +
                    '<span class="community-online-dot"></span>' +
                '</div>' +
                '<div class="community-info">' +
                    '<span class="community-name">' + escapeHtml(c.name) + (c.is_official ? ' <span class="community-official-badge" title="Official Hive Community">✓</span>' : '') + '</span>' +
                    '<span class="community-members">' + (c.member_count || 0) + ' members' +
                    (c.online_count > 0 ? ' &middot; <span style="color:#43b581;">' + c.online_count + ' online</span>' : '') +
                    '</span>' +
                '</div>';

            (function (community) {
                item.addEventListener('click', function () {
                    navigateToCommunity(community.id);
                });
                item.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateToCommunity(community.id);
                    }
                });
            })(c);
            list.appendChild(item);
        }
        highlightActiveCommunity();

        // Also render community cards in the home main content area
        renderHomeCommunityCards();
    }

    function renderHomeCommunityCards() {
        var grid = dom.homeCommunitiesGrid;
        if (!grid) return;
        grid.innerHTML = '';

        for (var i = 0; i < state.communities.length; i++) {
            var c = state.communities[i];
            var colors = ['#6C63FF', '#FF4D9E', '#00E5FF', '#7CFFB2', '#F59E0B', '#EC4899'];
            var color = colors[i % colors.length];
            var onlineCount = c.online_count || 0;
            var memberCount = c.member_count || 0;

            var card = document.createElement('div');
            card.className = 'featured-card' + (c.is_official ? ' featured-official' : '');
            card.innerHTML =
                '<div class="featured-banner" style="--fb:' + color + '"></div>' +
                '<div class="featured-icon" style="background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:1.5rem;">' + escapeHtml(c.icon || '#') + '</div>' +
                '<h3 class="featured-name">' + escapeHtml(c.name) + (c.is_official ? ' <span class="featured-official-badge" title="Official Hive Community">✓</span>' : '') + '</h3>' +
                '<p class="featured-desc">' + escapeHtml(c.description || 'No description') + '</p>' +
                '<div class="featured-stats">' +
                    '<span><strong>' + formatCount(memberCount) + '</strong> members</span>' +
                    '<span class="featured-online"><span class="dot"></span>' + formatCount(onlineCount) + ' online</span>' +
                '</div>' +
                '<button class="featured-join">Joined</button>';

            (function (community) {
                card.addEventListener('click', function (e) {
                    if (e.target.closest('.featured-join')) return;
                    navigateToCommunity(community.id);
                });
            })(c);
            grid.appendChild(card);
        }
    }

    function formatCount(num) {
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    }

    function updateCommunityOnlineCount(communityId, onlineCount) {
        // Update in state
        for (var i = 0; i < state.communities.length; i++) {
            if (state.communities[i].id === communityId) {
                state.communities[i].online_count = onlineCount;
                break;
            }
        }
        // Update sidebar community item
        var sidebarItem = document.querySelector('.community-item[data-id="' + communityId + '"]');
        if (sidebarItem) {
            var membersEl = sidebarItem.querySelector('.community-members');
            if (membersEl) {
                var c = null;
                for (var i = 0; i < state.communities.length; i++) {
                    if (state.communities[i].id === communityId) { c = state.communities[i]; break; }
                }
                if (c) {
                    membersEl.innerHTML = (c.member_count || 0) + ' members' +
                        (onlineCount > 0 ? ' &middot; <span style="color:#43b581;">' + onlineCount + ' online</span>' : '');
                }
            }
        }
        // Update home community card
        var homeCards = dom.homeCommunitiesGrid ? dom.homeCommunitiesGrid.querySelectorAll('.featured-card') : [];
        // Find the card by matching community id (we store it via the closure)
        // Re-render the whole grid is simpler and safe since it's not frequent
        renderHomeCommunityCards();
        // Update chat sidebar if this community is active
        if (state.currentCommunity && state.currentCommunity.id === communityId) {
            if (dom.csOnlineCount) dom.csOnlineCount.textContent = onlineCount + ' online';
            if (dom.csOnlineNum) dom.csOnlineNum.textContent = onlineCount;
        }
    }

    function highlightActiveCommunity() {
        var items = qsa('.community-item');
        for (var i = 0; i < items.length; i++) {
            var id = items[i].getAttribute('data-id');
            if (id === (state.currentCommunity && state.currentCommunity.id)) {
                items[i].classList.add('active');
            } else {
                items[i].classList.remove('active');
            }
        }
    }

    function filterCommunities(query) {
        var items = qsa('.community-item');
        var q = query.toLowerCase().trim();
        for (var i = 0; i < items.length; i++) {
            var name = items[i].querySelector('.community-name');
            if (!name) continue;
            var match = !q || name.textContent.toLowerCase().indexOf(q) !== -1;
            items[i].style.display = match ? '' : 'none';
        }
    }

    /* ── Routing ─────────────────────────────── */
    function navigateToCommunity(communityId) {
        window.history.pushState({ communityId: communityId }, '', '/home/#/community/' + communityId);
        openCommunity(communityId);
    }

    function isDmRoute() {
        return window.location.hash.indexOf('#/chat') === 1;
    }

    function isCommunitiesRoute() {
        return window.location.hash === '#/communities';
    }

    function getDmConversationIdFromUrl() {
        var hash = window.location.hash;
        var match = hash.match(/#\/chat\/([^/?]+)/);
        return match ? match[1] : null;
    }

    // Unified: the ONE place that maps the current URL to the screen that should be visible.
    // Every screen + overlay (profile, notifications, edit, appearance) is keyed off this,
    // so as soon as the URL no longer matches a screen, that screen hides.
    function getCurrentRoute() {
        var hash = window.location.hash;
        var sv = (window.history.state && window.history.state.view) || null;
        if (hash === '#/profile/edit' || sv === 'profile-edit') return 'edit';
        if (hash === '#/profile/appearance' || sv === 'profile-appearance') return 'appearance';
        if (hash === '#/profile' || sv === 'profile') return 'profile';
        if (hash === '#/notifications' || sv === 'notifications') return 'notifications';
        if (sv === 'online') return 'online';
        if (hash === '#/friends' || sv === 'friends') return 'friends';
        if (hash === '#/communities' || sv === 'communities') return 'communities';
        if (isDmRoute() || sv === 'dm') return 'dm';
        if (hash.indexOf('#/community/') === 0) return 'chat';
        return 'home';
    }

    // Show ONLY the screen the URL matches; hide every other screen.
    // Runs on every popstate and after every navigation.
    function syncVisibilityForRoute() {
        var route = getCurrentRoute();
        var currentView = state.activeView || 'home';

        // Close any full-screen panel whose URL no longer matches.
        if (route !== 'notifications' && state.notifOpen) closeNotifications(false);
        if (route !== 'online' && onlineUsersOpen) closeOnlineUsers(false);

        var isProfileRouteNow = (route === 'profile' || route === 'edit' || route === 'appearance');
        if (!isProfileRouteNow && (profileOpen || editProfileOpen || appearanceOpen)) {
            editProfileOpen = false;
            appearanceOpen = false;
            profileOpen = false;
            var rpanel = $('rpanel');
            if (rpanel) hide(rpanel);
            var rightSidebar = qs('.right-sidebar');
            if (rightSidebar) show(rightSidebar);
        }

        // Render the correct base screen for the current URL.
        if (route === 'notifications') {
            openNotifications();
            return;
        }
        if (route === 'edit') { openEditProfile(); return; }
        if (route === 'appearance') { openAppearance(); return; }
        if (route === 'profile') { if (!profileOpen) openProfile(); return; }
        if (route === 'online') { openOnlineUsers(); return; }

        if (route === 'friends') { showFriendsView(); return; }
        if (route === 'communities') { showCommunitiesView(); return; }
        if (route === 'chat') {
            var communityId = getCommunityIdFromUrl();
            if (communityId) openCommunity(communityId);
            else showHomeView();
            return;
        }
        if (route === 'dm') {
            var convId = getDmConversationIdFromUrl();
            if (convId) openDmConversation(convId);
            else showDmView();
            return;
        }
        // default → home
        if (currentView === 'chat') leaveCurrentRoom();
        showHomeView();
    }

    function handlePopState(e) {
        syncVisibilityForRoute();
    }

    function getCommunityIdFromUrl() {
        var hash = window.location.hash;
        var match = hash.match(/#\/community\/([^/?]+)/);
        return match ? match[1] : null;
    }

    function handleInitialRoute() {
        // On a fresh load, the URL decides what's visible — same logic as every nav/popstate.
        syncVisibilityForRoute();
    }

    /* ── View Switching ──────────────────────── */
    function hideAllViews() {
        hide(dom.homeView);
        hide(dom.chatView);
        hide(dom.homeSidebar);
        hide(dom.chatSidebar);
    }

    function hideSidebarPanels() {
        hide(dom.sidebarCommunitiesPanel);
        hide(dom.sidebarDmPanel);
        hide(dom.sidebarFriendsPanel);
    }

    // On mobile, the sidebar overlay is only shown for the nav-panel views
    // (communities / chats / friends). Home and chat hide it.
    function syncSidebarVisibility(viewName) {
        var body = document.body;
        if (viewName === 'communities' || viewName === 'dm' || viewName === 'friends') {
            body.classList.add('side-open');
            body.classList.remove('chat-open');
        } else if (viewName === 'chat') {
            body.classList.add('chat-open');
            body.classList.remove('side-open');
        } else {
            body.classList.remove('side-open', 'chat-open');
        }
    }

    function setActiveRailIcon(viewName) {
        var icons = document.querySelectorAll('.rail-icon[data-nav]');
        for (var i = 0; i < icons.length; i++) {
            icons[i].classList.remove('active');
        }
        var activeIcon = document.querySelector('.rail-icon[data-nav="' + viewName + '"]');
        if (activeIcon) activeIcon.classList.add('active');

        // Keep the mobile bottom-nav in sync with the active view
        var bottomIcons = document.querySelectorAll('.bottom-nav-item[data-nav]');
        for (var b = 0; b < bottomIcons.length; b++) {
            bottomIcons[b].classList.remove('active');
        }
        var activeBottom = document.querySelector('.bottom-nav-item[data-nav="' + viewName + '"]');
        if (activeBottom) activeBottom.classList.add('active');
    }

    function showHomeView() {
        if (state.currentCommunity) {
            saveMessagesToCache(state.currentCommunity.id);
        }
        leaveCurrentRoom();
        state.currentCommunity = null;
        state.currentDmConversation = null;
        state.chatRestricted = false;
        state.members.clear();
        state.activeView = 'home';
        syncSidebarVisibility('home');
        hideAllViews();
        show(dom.homeView);
        show(dom.homeSidebar);
        hideSidebarPanels();
        show(dom.sidebarCommunitiesPanel);
        highlightActiveCommunity();
        stopHeartbeat();
        setActiveRailIcon('home');
        loadHomePresence();
        if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
        if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
    }

    function showChatView() {
        hideAllViews();
        state.activeView = 'chat';
        syncSidebarVisibility('chat');
        show(dom.chatView);
        show(dom.chatSidebar);
        dom.chatView.classList.add('view-enter');
        setTimeout(function () { dom.chatView.classList.remove('view-enter'); }, 350);
        highlightActiveCommunity();
        startHeartbeat();
    }

    function showDmSidebar() {
        hideSidebarPanels();
        show(dom.sidebarDmPanel);
        setActiveRailIcon('chats');
        loadDmConversations();
    }

    function showCommunitiesSidebar() {
        hideSidebarPanels();
        show(dom.sidebarCommunitiesPanel);
        setActiveRailIcon('communities');
    }

    function showDmView() {
        if (state.currentCommunity) {
            saveMessagesToCache(state.currentCommunity.id);
        }
        leaveCurrentRoom();
        state.currentCommunity = null;
        state.currentDmConversation = null;
        state.chatRestricted = false;
        state.members.clear();
        state.activeView = 'dm';
        syncSidebarVisibility('dm');
        hideAllViews();
        show(dom.homeView);
        show(dom.homeSidebar);
        showDmSidebar();
        if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
        if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
    }

    /* ── Friends Panel ─────────────────────────────── */
    var friendsData = { friends: [], incoming: [], outgoing: [], filter: 'all', searchQuery: '' };

    function showFriendsSidebar() {
        hideSidebarPanels();
        show(dom.sidebarFriendsPanel);
        setActiveRailIcon('friends');
    }

    function openFriendsPanel() {
        if (state.currentCommunity) {
            saveMessagesToCache(state.currentCommunity.id);
        }
        leaveCurrentRoom();
        state.currentCommunity = null;
        state.currentDmConversation = null;
        state.chatRestricted = false;
        state.members.clear();
        state.activeView = 'friends';
        syncSidebarVisibility('friends');
        hideAllViews();
        show(dom.homeView);
        show(dom.homeSidebar);
        showFriendsSidebar();
        if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
        if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
        loadFriends();
    }

    function loadFriends() {
        show(dom.friendsSkeleton);
        hide(dom.friendsEmpty);
        hide(dom.friendsError);

        return apiGet('/api/friends')
            .then(function (data) {
                friendsData.friends = data.friends || [];
                friendsData.incoming = data.incoming || [];
                friendsData.outgoing = data.outgoing || [];
                friendsData.searchQuery = '';
                if (dom.friendsSearchInput) dom.friendsSearchInput.value = '';
                friendsData.filter = 'all';
                updateFriendsTabs();
                hide(dom.friendsSkeleton);
                renderFriendsPanel();
            })
            .catch(function (err) {
                console.error('[HIVE] loadFriends error:', err);
                hide(dom.friendsSkeleton);
                show(dom.friendsError);
                if (dom.friendsErrorMsg) {
                    dom.friendsErrorMsg.textContent = (err && err.message) || 'Failed to load friends';
                }
            });
    }

    function renderFriendsPanel() {
        var friends = getFilteredFriends();
        var incoming = friendsData.incoming;

        // Update count badge
        if (dom.friendsCount) {
            dom.friendsCount.textContent = friendsData.friends.length + ' Friend' + (friendsData.friends.length !== 1 ? 's' : '');
        }

        // Update requests badge
        if (dom.friendsReqBadge) {
            if (incoming.length > 0) {
                dom.friendsReqBadge.textContent = incoming.length;
                show(dom.friendsReqBadge);
            } else {
                hide(dom.friendsReqBadge);
            }
        }

        // Show/hide incoming section
        if (friendsData.filter === 'requests' || friendsData.filter === 'all') {
            if (incoming.length > 0) {
                renderIncomingRequests(incoming);
                show(dom.friendsIncomingSection);
            } else {
                hide(dom.friendsIncomingSection);
            }
        } else {
            hide(dom.friendsIncomingSection);
        }

        // Render friend cards
        if (friends.length === 0 && incoming.length === 0) {
            show(dom.friendsEmpty);
            var emptyTitle = dom.friendsEmpty.querySelector('.friends-empty-title');
            var emptyDesc = dom.friendsEmpty.querySelector('.friends-empty-desc');
            if (friendsData.searchQuery) {
                if (emptyTitle) emptyTitle.textContent = 'No Results';
                if (emptyDesc) emptyDesc.textContent = 'No friends match your search.';
            } else if (friendsData.filter === 'online') {
                if (emptyTitle) emptyTitle.textContent = 'No Online Friends';
                if (emptyDesc) emptyDesc.textContent = 'None of your friends are online right now.';
            } else {
                if (emptyTitle) emptyTitle.textContent = 'No Friends Yet';
                if (emptyDesc) emptyDesc.textContent = 'Find people to add as friends!';
            }
            // Clear friend cards
            clearFriendCards();
            return;
        }

        hide(dom.friendsEmpty);
        renderFriendCards(friends);
    }

    function clearFriendCards() {
        if (!dom.friendsList) return;
        var cards = dom.friendsList.querySelectorAll('.friend-card');
        for (var i = 0; i < cards.length; i++) cards[i].remove();
    }

    function renderFriendCards(friends) {
        clearFriendCards();
        if (!dom.friendsList) return;

        for (var i = 0; i < friends.length; i++) {
            var card = renderFriendCard(friends[i]);
            dom.friendsList.appendChild(card);
        }
    }

    function renderFriendCard(user) {
        var el = document.createElement('div');
        el.className = 'friend-card';
        el.setAttribute('data-user-id', user.id);

        var avatarUrl = getAvatarUrl(user);
        var statusClass = user.online ? 'online' : 'offline';
        var displayName = user.display_name || user.username;
        var statusText = user.online ? (user.status || 'Online') : 'Offline';
        if (user.last_seen && !user.online) {
            statusText = 'Last seen ' + formatTime(user.last_seen);
        }

        el.innerHTML =
            '<div class="friend-card-avatar-wrap">' +
                '<img class="friend-card-avatar" src="' + escapeHtml(avatarUrl) + '" alt="" loading="lazy">' +
                '<span class="friend-card-status ' + statusClass + '"></span>' +
            '</div>' +
            '<div class="friend-card-info">' +
                '<div class="friend-card-name">' + escapeHtml(displayName) + '</div>' +
                '<div class="friend-card-status-text">' + escapeHtml(statusText) + '</div>' +
            '</div>' +
            '<div class="friend-card-actions">' +
                '<button class="friend-card-action friend-msg-btn" data-tip="Message">' +
                    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                '</button>' +
            '</div>';

        // Click card → open profile popup
        el.addEventListener('click', function (e) {
            if (e.target.closest('.friend-msg-btn')) return;
            openUserPopup(user.id, el);
        });

        // Message button → open DM
        var msgBtn = el.querySelector('.friend-msg-btn');
        if (msgBtn) {
            msgBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                apiPost('/api/dm/conversations', { userId: user.id })
                    .then(function (data) {
                        if (data.conversationId) {
                            openDmConversation(data.conversationId);
                        }
                    })
                    .catch(function () {
                        showToast('Failed to start conversation', 'error');
                    });
            });
        }

        return el;
    }

    function renderIncomingRequests(incoming) {
        if (!dom.friendsIncomingList) return;
        dom.friendsIncomingList.innerHTML = '';

        for (var i = 0; i < incoming.length; i++) {
            var user = incoming[i];
            var el = document.createElement('div');
            el.className = 'friend-card incoming';
            el.setAttribute('data-user-id', user.id);
            el.setAttribute('data-request-id', user.request_id);

            var avatarUrl = getAvatarUrl(user);
            var displayName = user.display_name || user.username;
            var statusText = user.online ? (user.status || 'Online') : 'Offline';

            el.innerHTML =
                '<div class="friend-card-avatar-wrap">' +
                    '<img class="friend-card-avatar" src="' + escapeHtml(avatarUrl) + '" alt="" loading="lazy">' +
                    '<span class="friend-card-status ' + (user.online ? 'online' : 'offline') + '"></span>' +
                '</div>' +
                '<div class="friend-card-info">' +
                    '<div class="friend-card-name">' + escapeHtml(displayName) + '</div>' +
                    '<div class="friend-card-status-text">' + escapeHtml(statusText) + '</div>' +
                '</div>' +
                '<div class="friend-card-incoming-actions">' +
                    '<button class="friend-card-action friend-card-accept" data-tip="Accept">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                    '</button>' +
                    '<button class="friend-card-action friend-card-reject" data-tip="Reject">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>';

            // Click card → open profile popup
            el.addEventListener('click', function (e) {
                if (e.target.closest('.friend-card-accept') || e.target.closest('.friend-card-reject')) return;
                openUserPopup(user.id, el);
            });

            // Accept button
            var acceptBtn = el.querySelector('.friend-card-accept');
            if (acceptBtn) {
                (function (requestId, uid) {
                    acceptBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        acceptFriendRequestFromPanel(requestId, uid, el);
                    });
                })(user.request_id, user.id);
            }

            // Reject button
            var rejectBtn = el.querySelector('.friend-card-reject');
            if (rejectBtn) {
                (function (requestId, uid) {
                    rejectBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        rejectFriendRequestFromPanel(requestId, uid, el);
                    });
                })(user.request_id, user.id);
            }

            dom.friendsIncomingList.appendChild(el);
        }
    }

    function acceptFriendRequestFromPanel(requestId, userId, cardEl) {
        var btn = cardEl.querySelector('.friend-card-accept');
        if (btn) btn.disabled = true;

        apiFetch('/api/friends/request/' + requestId + '/accept', { method: 'PUT' })
            .then(function () {
                // Remove from incoming list
                friendsData.incoming = friendsData.incoming.filter(function (r) { return r.request_id !== requestId; });
                // Add to friends list
                var user = friendsData.incoming.find(function (r) { return r.request_id === requestId; }) ||
                           friendsData.friends.find(function (f) { return f.id === userId; });
                if (user && !friendsData.friends.find(function (f) { return f.id === userId; })) {
                    friendsData.friends.push(user);
                }
                renderFriendsPanel();
                showToast('Friend request accepted!');
            })
            .catch(function (err) {
                console.error('[HIVE] acceptFriendRequest error:', err);
                if (btn) btn.disabled = false;
                showToast('Failed to accept request');
            });
    }

    function rejectFriendRequestFromPanel(requestId, userId, cardEl) {
        var btn = cardEl.querySelector('.friend-card-reject');
        if (btn) btn.disabled = true;

        apiFetch('/api/friends/request/' + requestId + '/reject', { method: 'PUT' })
            .then(function () {
                friendsData.incoming = friendsData.incoming.filter(function (r) { return r.request_id !== requestId; });
                renderFriendsPanel();
                showToast('Friend request rejected');
            })
            .catch(function (err) {
                console.error('[HIVE] rejectFriendRequest error:', err);
                if (btn) btn.disabled = false;
                showToast('Failed to reject request');
            });
    }

    function getFilteredFriends() {
        var list = friendsData.friends.slice();
        var q = (friendsData.searchQuery || '').toLowerCase().trim();

        if (friendsData.filter === 'online') {
            list = list.filter(function (f) { return f.online; });
        }

        if (q) {
            list = list.filter(function (f) {
                var name = (f.display_name || f.username || '').toLowerCase();
                var uname = (f.username || '').toLowerCase();
                return name.indexOf(q) !== -1 || uname.indexOf(q) !== -1;
            });
        }

        return list;
    }

    function updateFriendsTabs() {
        if (!dom.friendsTabs) return;
        var tabs = dom.friendsTabs.querySelectorAll('.friends-tab');
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.getAttribute('data-filter') === friendsData.filter) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        }
    }

    function updateFriendPresence(userId, online) {
        // Update in friends list
        for (var i = 0; i < friendsData.friends.length; i++) {
            if (friendsData.friends[i].id === userId) {
                friendsData.friends[i].online = online;
                break;
            }
        }
        // Update in incoming list
        for (var j = 0; j < friendsData.incoming.length; j++) {
            if (friendsData.incoming[j].id === userId) {
                friendsData.incoming[j].online = online;
                break;
            }
        }
        // Re-render if friends panel is visible
        if (state.activeView === 'friends') {
            renderFriendsPanel();
        }
    }

    function showFriendsView() {
        if (state.currentCommunity) {
            saveMessagesToCache(state.currentCommunity.id);
        }
        leaveCurrentRoom();
        state.currentCommunity = null;
        state.currentDmConversation = null;
        state.chatRestricted = false;
        state.members.clear();
        state.activeView = 'friends';
        syncSidebarVisibility('friends');
        hideAllViews();
        show(dom.homeView);
        show(dom.homeSidebar);
        showFriendsSidebar();
        if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
        if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
        loadFriends();
    }

    function showCommunitiesView() {
        if (state.currentCommunity) {
            saveMessagesToCache(state.currentCommunity.id);
        }
        leaveCurrentRoom();
        state.currentCommunity = null;
        state.chatRestricted = false;
        state.currentDmConversation = null;
        state.members.clear();
        state.activeView = 'communities';
        syncSidebarVisibility('communities');
        hideAllViews();
        show(dom.homeView);
        show(dom.homeSidebar);
        showCommunitiesSidebar();
        if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
        if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
    }

    function leaveCurrentRoom() {
        if (state.socket && state.currentCommunity) {
            state.socket.emit('community:leave', state.currentCommunity.id);
        }
    }

    /* ── DM Functions ────────────────────────── */
    function updateChatsBadge() {
        apiGet('/api/dm/unread')
            .then(function (data) {
                var total = data.total || 0;
                if (dom.chatsRailBadge) {
                    if (total > 0) {
                        dom.chatsRailBadge.textContent = total > 99 ? '99+' : total;
                        dom.chatsRailBadge.style.display = '';
                    } else {
                        dom.chatsRailBadge.style.display = 'none';
                    }
                }
                // Mirror the same count into the mobile bottom-nav Chats badge
                var bottomChatsBadge = document.getElementById('bottom-chats-badge');
                if (bottomChatsBadge) {
                    if (total > 0) {
                        bottomChatsBadge.textContent = total > 99 ? '99+' : total;
                        bottomChatsBadge.style.display = '';
                    } else {
                        bottomChatsBadge.style.display = 'none';
                    }
                }
            })
            .catch(function () {});
    }

    function loadDmConversations() {
        show(dom.dmSkeleton);
        hide(dom.dmEmpty);
        hide(dom.dmError);

        return apiGet('/api/dm/conversations')
            .then(function (data) {
                state.dmConversations = data.conversations || [];
                hide(dom.dmSkeleton);
                if (state.dmConversations.length === 0) {
                    show(dom.dmEmpty);
                } else {
                    renderDmList();
                }
            })
            .catch(function (err) {
                console.error('[HIVE] loadDmConversations error:', err);
                hide(dom.dmSkeleton);
                show(dom.dmError);
                if (dom.dmErrorMsg) {
                    dom.dmErrorMsg.textContent = (err && err.message) || 'Failed to load conversations';
                }
            });
    }

    function renderDmList() {
        var list = dom.dmList;
        if (!list) return;
        var existing = list.querySelectorAll('.dm-item');
        for (var i = 0; i < existing.length; i++) existing[i].remove();

        for (var i = 0; i < state.dmConversations.length; i++) {
            var conv = state.dmConversations[i];
            var item = document.createElement('div');
            var isActive = state.currentDmConversation === conv.conversation_id;
            item.className = 'dm-item' + (isActive ? ' active' : '');
            item.setAttribute('data-conv-id', conv.conversation_id);
            var avatarUrl = getAvatarUrl({ id: conv.other_user_id, profile_picture: conv.other_profile_picture, username: conv.other_username });
            var statusClass = conv.other_online ? 'online' : 'offline';
            var lastMsg = conv.last_message || 'No messages yet';
            if (lastMsg.length > 40) lastMsg = lastMsg.substring(0, 40) + '...';
            var timeStr = conv.last_message_time ? formatTime(conv.last_message_time) : '';
            var unreadHtml = '';
            if (conv.unread_count > 0) {
                unreadHtml = '<div class="dm-item-unread">' + Math.min(conv.unread_count, 99) + '</div>';
            }

            var displayName = conv.other_display_name || conv.other_username;
            item.innerHTML =
                '<div class="dm-item-avatar-wrap ring_' + (conv.other_profile_ring || 'none') + '">' +
                    '<img class="dm-item-avatar" src="' + escapeHtml(avatarUrl) + '" alt="" loading="lazy">' +
                    '<span class="dm-item-status ' + statusClass + '"></span>' +
                '</div>' +
                '<div class="dm-item-info">' +
                    '<div class="dm-item-top">' +
                        '<span class="dm-item-name">' + escapeHtml(displayName) + '</span>' +
                        '<span class="dm-item-time">' + escapeHtml(timeStr) + '</span>' +
                    '</div>' +
                    '<span class="dm-item-preview">' + escapeHtml(lastMsg) + '</span>' +
                '</div>' +
                unreadHtml;

            (function (conversationId) {
                item.addEventListener('click', function () {
                    openDmConversation(conversationId);
                });
            })(conv.conversation_id);
            list.appendChild(item);
        }
    }

    function openDmConversation(conversationId) {
        window.history.pushState({ view: 'dm', conversationId: conversationId }, '', '/home/#/chat/' + conversationId);
        state.currentDmConversation = conversationId;
        state.currentCommunity = null;
        state.messages = [];
        state.hasMore = true;
        state.loadingMessages = false;
        state.loadingOlder = false;
        state.pendingMessages = {};
        state.reconciledIds = {};

        // Find the conversation data
        var conv = null;
        for (var i = 0; i < state.dmConversations.length; i++) {
            if (state.dmConversations[i].conversation_id === conversationId) {
                conv = state.dmConversations[i];
                break;
            }
        }
        if (!conv) return;

        // Store the other user's ID for Bee usage tracking
        state.currentDmUserId = conv.other_user_id;
        var isBeeDm = conv.other_username && conv.other_username.toLowerCase() === 'bee';

        // Mark as read and update local state
        apiPost('/api/dm/' + conversationId + '/read', {}).then(function () {
            for (var j = 0; j < state.dmConversations.length; j++) {
                if (state.dmConversations[j].conversation_id === conversationId) {
                    state.dmConversations[j].unread_count = 0;
                    break;
                }
            }
            renderDmList();
            updateChatsBadge();
        }).catch(function () {});

        // Cancel any pending reply or typing
        cancelReply();
        emitTypingStop();
        if (state.typingTimeout) { clearTimeout(state.typingTimeout); state.typingTimeout = null; }
        state.typingUsers = [];
        renderTypingIndicator();

        // Update chat header for DM
        updateDmChatHeader(conv);

        // Show chat view
        showChatView();
        hideSidebarPanels();
        show(dom.sidebarDmPanel);
        setActiveRailIcon('chats');

        // Load DM messages via API
        clearMessages();
        showMessageSkeletons();
        apiGet('/api/dm/' + conversationId + '/messages?limit=50')
            .then(function (data) {
                removeSkeletons();
                var messages = data.messages || [];
                state.messages = messages;
                renderAllMessages(messages);
                scrollToBottom(false);

                // Fetch Bee usage if this is a DM with Bee
                if (isBeeDm) {
                    fetchBeeUsage();
                } else {
                    state.beeUsage = null;
                    updateBeeUsageDisplay();
                }
            })
            .catch(function (err) {
                removeSkeletons();
                console.error('[HIVE] load DM messages error:', err);
            });
    }

    function updateDmChatHeader(conv) {
        // Update the chat topbar for DM mode
        var communityBadge = dom.chatCommunityBadge;
        var channelName = dom.chatChannelName;
        var topic = dom.chatTopic;
        
        if (communityBadge) {
            var avatarUrl = getAvatarUrl({ id: conv.other_user_id, profile_picture: conv.other_profile_picture, username: conv.other_username });
            var headerName = conv.other_display_name || conv.other_username;
            communityBadge.innerHTML = '<img class="chat-community-icon" src="' + escapeHtml(avatarUrl) + '" style="width:24px;height:24px;border-radius:50%;" alt=""><span class="chat-community-name">' + escapeHtml(headerName) + '</span>';
        }
        if (channelName) channelName.textContent = 'direct-message';
        var topicName = conv.other_display_name || conv.other_username;
        if (topic) topic.textContent = 'Direct message with ' + escapeHtml(topicName);
        if (dom.composerInput) dom.composerInput.setAttribute('data-placeholder', 'Message @' + topicName);
        // Hide member list button for DMs
        var toggleMembersBtn = $('toggle-members-btn');
        if (toggleMembersBtn) toggleMembersBtn.style.display = 'none';
    }

    function fetchBeeUsage() {
        apiGet('/api/dm/bee/usage')
            .then(function (data) {
                if (data && data.usage) {
                    state.beeUsage = data.usage;
                    updateBeeUsageDisplay();
                }
            })
            .catch(function () {});
    }

    function updateBeeUsageDisplay() {
        var usage = state.beeUsage;
        var channelName = dom.chatChannelName;
        var topic = dom.chatTopic;
        if (!topic) return;

        // Only show usage info if we're in a Bee DM
        if (!state.currentDmUserId || !usage) {
            return;
        }

        // Find if current DM is with Bee
        var isBee = false;
        for (var i = 0; i < state.dmConversations.length; i++) {
            if (state.dmConversations[i].conversation_id === state.currentDmConversation) {
                if (state.dmConversations[i].other_username && state.dmConversations[i].other_username.toLowerCase() === 'bee') {
                    isBee = true;
                }
                break;
            }
        }
        if (!isBee) return;

        // Update topic with usage info
        var usageText = '';
        if (usage.isUnlimited) {
            usageText = '🐝 Unlimited';
        } else if (usage.remaining !== null) {
            usageText = '🐝 ' + usage.remaining + ' / ' + usage.limit + ' messages remaining today';
        }
        if (usageText) {
            topic.textContent = usageText;
        }

        // Disable composer if limit reached
        if (!usage.isUnlimited && usage.remaining !== null && usage.remaining <= 0) {
            state.beeLimitReached = true;
            if (dom.sendBtn) dom.sendBtn.disabled = true;
            showBeeLimitCard();
        } else {
            state.beeLimitReached = false;
            if (dom.sendBtn) dom.sendBtn.disabled = false;
            hideBeeLimitCard();
        }
    }

    function showBeeLimitCard() {
        hideBeeLimitCard();
        var composer = dom.chatComposer;
        if (!composer) return;
        var wrapper = composer.querySelector('.composer-wrapper');
        if (wrapper) wrapper.style.display = 'none';
        var card = document.createElement('div');
        card.className = 'bee-limit-card';
        card.id = 'bee-limit-card';
        card.innerHTML =
            '<div class="bee-limit-inner">' +
                '<div class="bee-limit-left">' +
                    '<div class="bee-limit-icon">🐝</div>' +
                '</div>' +
                '<div class="bee-limit-content">' +
                    '<div class="bee-limit-title">Daily Bee Limit Reached</div>' +
                    '<div class="bee-limit-desc">You\'ve used all your Bee messages for today. Upgrade to <strong style="color:var(--accent)">Hive Premium</strong> for unlimited conversations!</div>' +
                '</div>' +
                '<button class="bee-limit-upgrade-btn" onclick="showToast(\'Hive Premium coming soon!\', \'info\')">Upgrade</button>' +
            '</div>';
        composer.appendChild(card);
        composer.classList.add('bee-limit-active');
    }

    function hideBeeLimitCard() {
        var card = document.getElementById('bee-limit-card');
        if (card) card.remove();
        var composer = dom.chatComposer;
        if (composer) {
            composer.classList.remove('bee-limit-active');
            var wrapper = composer.querySelector('.composer-wrapper');
            if (wrapper) wrapper.style.display = '';
        }
    }

    function renderSystemMessage(text) {
        var messagesInner = $('chat-messages-inner');
        if (!messagesInner) return;
        var msgEl = document.createElement('div');
        msgEl.className = 'message system-message';
        msgEl.innerHTML = '<div class="message-content"><span class="message-text">' + escapeHtml(text) + '</span></div>';
        messagesInner.appendChild(msgEl);
    }

    function showDmNewChatModal() {
        var overlay = document.createElement('div');
        overlay.className = 'dm-modal-overlay';
        overlay.id = 'dm-modal-overlay';
        overlay.innerHTML =
            '<div class="dm-modal">' +
                '<div class="dm-modal-header">' +
                    '<span class="dm-modal-title">New Conversation</span>' +
                    '<button class="dm-modal-close" id="dm-modal-close">' +
                        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="dm-modal-search">' +
                    '<input type="text" id="dm-modal-input" placeholder="Search users..." autocomplete="off" spellcheck="false">' +
                '</div>' +
                '<div class="dm-modal-results" id="dm-modal-results">' +
                    '<div class="dm-modal-empty">Type a username to search</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                overlay.classList.add('visible');
            });
        });

        var closeBtn = overlay.querySelector('#dm-modal-close');
        var input = overlay.querySelector('#dm-modal-input');
        var results = overlay.querySelector('#dm-modal-results');

        function closeModal() {
            overlay.classList.remove('visible');
            setTimeout(function () { overlay.remove(); }, 200);
        }

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        var searchTimeout = null;
        input.addEventListener('input', function () {
            var q = this.value.trim();
            if (searchTimeout) clearTimeout(searchTimeout);
            if (q.length < 1) {
                results.innerHTML = '<div class="dm-modal-empty">Type a username to search</div>';
                return;
            }
            searchTimeout = setTimeout(function () {
                apiGet('/api/dm/users/search?q=' + encodeURIComponent(q) + '&limit=8')
                    .then(function (data) {
                        var users = data.users || [];
                        if (users.length === 0) {
                            results.innerHTML = '<div class="dm-modal-empty">No users found</div>';
                            return;
                        }
                        var html = '';
                        for (var j = 0; j < users.length; j++) {
                            var u = users[j];
                            if (u.id === state.user.id) continue;
                            var uAvatar = getAvatarUrl(u);
                            var uStatus = u.online ? 'online' : 'offline';
                            var uName = u.display_name || u.username;
                            html += '<div class="dm-modal-user" data-user-id="' + u.id + '">' +
                                '<img class="dm-modal-user-avatar" src="' + escapeHtml(uAvatar) + '" alt="" loading="lazy">' +
                                '<div class="dm-modal-user-info">' +
                                    '<div class="dm-modal-user-name">' + escapeHtml(uName) + '</div>' +
                                    '<div class="dm-modal-user-status">' + (u.online ? 'Online' : 'Last seen ' + formatLastSeen(u.last_seen)) + '</div>' +
                                '</div>' +
                            '</div>';
                        }
                        results.innerHTML = html;

                        var userEls = results.querySelectorAll('.dm-modal-user');
                        for (var k = 0; k < userEls.length; k++) {
                            userEls[k].addEventListener('click', function () {
                                var targetUserId = this.getAttribute('data-user-id');
                                apiPost('/api/dm/conversations', { userId: targetUserId })
                                    .then(function (data) {
                                        closeModal();
                                        if (data.conversationId) {
                                            openDmConversation(data.conversationId);
                                        }
                                    })
                                    .catch(function () {
                                        showToast('Failed to start conversation', 'error');
                                    });
                            });
                        }
                    })
                    .catch(function () {
                        results.innerHTML = '<div class="dm-modal-empty">Search failed</div>';
                    });
            }, 300);
        });

        setTimeout(function () { input.focus(); }, 100);
    }

    /* ── Notification Panel ─────────────────────── */
    var NOTIF_PAGE_SIZE = 20;

    function openNotifications() {
        if (state.notifOpen) return;
        state.notifOpen = true;
        state.notifNotifications = [];
        state.notifOffset = 0;
        state.notifHasMore = true;

        var notifOverlay = dom.notifPanel;
        if (!notifOverlay) return;

        if (state.notifCloseTimeout) {
            clearTimeout(state.notifCloseTimeout);
            state.notifCloseTimeout = null;
        }

        if (profileOpen) {
            profileOpen = false;
        }
        if (editProfileOpen) {
            editProfileOpen = false;
        }
        appearanceOpen = false;

        show(dom.notifSkeleton);
        hide(dom.notifList);
        hide(dom.notifEmpty);
        hide(dom.notifLoadMore);

        show(notifOverlay);
        notifOverlay.classList.add('visible');

        // Highlight the Notifications item in both rail and mobile bottom-nav
        setActiveRailIcon('notifications');

        loadNotifications();
    }

    function closeNotifications(updateHistory) {
        if (updateHistory === undefined) updateHistory = true;
        var notifOverlay = dom.notifPanel;
        if (!notifOverlay) return;

        state.notifOpen = false;
        notifOverlay.classList.remove('visible');

        if (state.notifCloseTimeout) {
            clearTimeout(state.notifCloseTimeout);
            state.notifCloseTimeout = null;
        }
        state.notifCloseTimeout = setTimeout(function () {
            hide(notifOverlay);
            state.notifCloseTimeout = null;
        }, 220);

        if (updateHistory && (isNotifRoute() || (window.history.state && window.history.state.view === 'notifications'))) {
            window.history.back();
            return;
        }

        profileOpen = false;
        appearanceOpen = false;
    }

    /* ── Online Users panel ─────────────────── */
    var onlineUsersOpen = false;

    function openOnlineUsers() {
        if (onlineUsersOpen) return;
        onlineUsersOpen = true;

        var overlay = $('online-overlay');
        if (!overlay) return;

        // Close any other open overlay
        if (state.notifOpen) closeNotifications(false);
        document.body.classList.remove('side-open');

        show(overlay);
        overlay.classList.add('visible');

        // Build the online list from home presence data (fall back to a fresh fetch)
        var listEl = $('online-list');
        var emptyEl = $('online-empty');
        if (!listEl || !emptyEl) return;

        var onlineHtml = '';
        var anyOnline = false;
        state.homeMembers.forEach(function (member) {
            var isBot = member.is_bot || member.rank === 'bot';
            if (member.online || isBot) {
                onlineHtml += createHomeMemberCardHtml(member, false);
                anyOnline = true;
            }
        });

        if (anyOnline) {
            listEl.innerHTML = onlineHtml;
            show(listEl);
            hide(emptyEl);
            bindHomeMemberCardClicks(listEl);
        } else {
            hide(listEl);
            show(emptyEl);
        }

        if (state.homeMembers.size === 0) {
            loadHomePresence().then(function () {
                if (!onlineUsersOpen) return;
                var h = '';
                var any = false;
                state.homeMembers.forEach(function (member) {
                    var isBot = member.is_bot || member.rank === 'bot';
                    if (member.online || isBot) { h += createHomeMemberCardHtml(member, false); any = true; }
                });
                if (any) { listEl.innerHTML = h; show(listEl); hide(emptyEl); bindHomeMemberCardClicks(listEl); }
                else { hide(listEl); show(emptyEl); }
            });
        }
    }

    function closeOnlineUsers(updateHistory) {
        if (updateHistory === undefined) updateHistory = true;
        var overlay = $('online-overlay');
        if (!overlay) return;

        onlineUsersOpen = false;
        overlay.classList.remove('visible');

        var t = setTimeout(function () {
            hide(overlay);
            clearTimeout(t);
        }, 220);

        if (updateHistory && state.onlinePush) {
            state.onlinePush = false;
        }
    }

    /* ── Video Call overlay ─────────────────── */
    var callOpen = false;
    var callActiveType = null;   // 'video' | 'voice' — currently in-call type (community calls)
    var localCallStream = null;
    var currentCallCommunityId = null;
    var currentCallConversationId = null;  // non-null when in a DM call
    var currentCallMaxSlots = 5;
    var myUserId = null;
    var callParticipants = [];   // [{ userId, username, slot }]
    var peerConnections = {};    // userId → RTCPeerConnection (mesh)
    var pendingStreams = {};     // userId → MediaStream (buffered until callParticipants is updated)
    var offeredToWatchers = {};  // userId → true (offer already sent via call:viewer-joined after joining)
    var isScreenSharing = false;
    var storedCameraVideoTrack = null; // camera track saved while screen-sharing, to restore
    var screenStream = null;           // current getDisplayMedia stream (stopped on call end)
    var mySlot = 0;
    var handStates = {};           // userId → true/false (raised hand indicator)
    var handRaised = false;        // this user's own raised-hand state
    var isSwitchingCamera = false;
    var ICE_SERVERS = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:turn.hivechat.online:3478", username: "hive", credential: "Bright2010" }
    ];

    // Incoming DM call state
    var incomingCallData = null;  // { callerUserId, callerUsername, callerAvatar, callType, conversationId }
    var outgoingCallTimeout = null;  // timeout to auto-cancel invite if not accepted

    function getMyUserId() {
        if (myUserId) return myUserId;
        try {
            var token = window.HiveAuth ? window.HiveAuth.getToken() : null;
            if (!token) return null;
            var payload = JSON.parse(atob(token.split('.')[1]));
            myUserId = payload.id;
            return myUserId;
        } catch (e) { return null; }
    }

    /**
     * Send a call signal to the backend (start / end).
     * Supports both community calls and DM calls.
     */
    function sendCallSignal(callType, status) {
        if (currentCallConversationId) {
            return apiPost('/api/calls/dm', {
                conversationId: currentCallConversationId,
                callType: callType,
                status: status,
            }).then(function (data) {
                if (status === 'start' && data.msg) {
                    appendMessage(data.msg);
                }
            }).catch(function (err) {
                console.error('[HIVE] Failed to send DM call signal:', err);
            });
        }
        if (!state.currentCommunity) return Promise.resolve();
        return apiPost('/api/calls/community', {
            communityId: state.currentCommunity.id,
            callType: callType,
            status: status,
        }).then(function (data) {
            if (status === 'start' && data.msg) {
                appendMessage(data.msg);
            }
        }).catch(function (err) {
            console.error('[HIVE] Failed to send call signal:', err);
        });
    }

    /* ── Incoming DM Call Popup ─────────────────── */
    function showIncomingCallPopup(data) {
        incomingCallData = data;
        var overlay = $('incoming-call-overlay');
        if (!overlay) return;
        var avatar = $('incoming-call-avatar');
        var name = $('incoming-call-name');
        if (avatar) {
            var avatarUrl = getAvatarUrl({ id: data.callerUserId, profile_picture: data.callerAvatar, username: data.callerUsername });
            avatar.src = avatarUrl;
        }
        if (name) name.textContent = data.callerUsername || 'Unknown';
        overlay.style.display = 'flex';
        requestAnimationFrame(function () { overlay.classList.add('visible'); });
    }

    function hideIncomingCallPopup() {
        incomingCallData = null;
        var overlay = $('incoming-call-overlay');
        if (!overlay) return;
        overlay.classList.remove('visible');
        setTimeout(function () { overlay.style.display = 'none'; }, 300);
    }

    function acceptIncomingCall() {
        if (!incomingCallData || !state.socket) return;
        var data = incomingCallData;
        hideIncomingCallPopup();

        callActiveType = data.callType || 'video';
        currentCallConversationId = data.conversationId;
        currentCallMaxSlots = 2;

        // Get local stream and open call overlay
        var videoEnabled = callActiveType === 'video';
        getLocalCallStream(videoEnabled).then(function (stream) {
            openCallOverlay();
            setParticipantControls(true);
            syncMicButton(true);
            syncCamButton(false); // privacy-first: camera off by default

            state.socket.emit('call:accept', {
                conversationId: data.conversationId,
            });
        }).catch(function (err) {
            console.error('[WEBRTC] Failed to get stream for DM call:', err);
        });
    }

    function declineIncomingCall() {
        if (!incomingCallData || !state.socket) return;
        state.socket.emit('call:decline', {
            conversationId: incomingCallData.conversationId,
        });
        hideIncomingCallPopup();
    }

    function cancelOutgoingCall() {
        if (!currentCallConversationId || !state.socket) return;
        state.socket.emit('call:cancel', {
            conversationId: currentCallConversationId,
            participants: [getMyUserId(), state.currentDmUserId],
        });
        closeCallOverlay();
    }

    function createPeerConnection(targetUserId) {
        var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = function (event) {
            var callScope = currentCallConversationId
                ? { conversationId: currentCallConversationId }
                : { communityId: currentCallCommunityId };
            if (event.candidate && (callScope.conversationId || callScope.communityId) && state.socket && targetUserId) {
                state.socket.emit('call:ice-candidate', {
                    communityId: callScope.communityId || null,
                    conversationId: callScope.conversationId || null,
                    candidate: event.candidate.toJSON(),
                    targetUserId: targetUserId,
                });
            }
        };

        pc.ontrack = function (event) {
            if (event.streams && event.streams[0]) {
                var isDm = !!currentCallConversationId;
                // DM mode: always route remote user to slot 1
                if (isDm) {
                    var slotEl = document.getElementById('call-slot-1');
                    if (slotEl) {
                        var video = slotEl.querySelector('.call-slot-video');
                        var fallback = slotEl.querySelector('.call-slot-fallback');
                        if (video) {
                            video.srcObject = event.streams[0];
                            fadeVideoIn(video);
                            if (fallback) fallback.style.display = 'none';
                            slotEl.classList.add('call-slot-active');
                            slotEl.classList.remove('call-slot-empty');
                        }
                    }
                    return;
                }
                // Community mode: find the slot for this user
                var participant = callParticipants.find(function (p) { return p.userId === targetUserId; });
                if (participant && participant.slot > 0) {
                    var slotEl = document.getElementById('call-slot-' + participant.slot);
                    if (slotEl) {
                        var video = slotEl.querySelector('.call-slot-video');
                        var fallback = slotEl.querySelector('.call-slot-fallback');
                        if (video) {
                            video.srcObject = event.streams[0];
                            fadeVideoIn(video);
                            if (fallback) fallback.style.display = 'none';
                            slotEl.classList.add('call-slot-active');
                            slotEl.classList.remove('call-slot-empty');
                        }
                    }
                } else {
                    pendingStreams[targetUserId] = event.streams[0];
                }
            }
        };

        pc.oniceconnectionstatechange = function () {
            console.log('[WEBRTC] ICE state with', targetUserId, ':', pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                var participant = callParticipants.find(function (p) { return p.userId === targetUserId; });
                if (participant && participant.slot > 0) {
                    var slotEl = document.getElementById('call-slot-' + participant.slot);
                    if (slotEl) {
                        var fallback = slotEl.querySelector('.call-slot-fallback');
                        var video = slotEl.querySelector('.call-slot-video');
                        if (fallback) fallback.style.display = 'flex';
                        if (video) video.srcObject = null;
                    }
                }
                // Clean up pending stream if disconnected
                if (pendingStreams[targetUserId]) {
                    delete pendingStreams[targetUserId];
                }
            }
        };

        return pc;
    }

    function getLocalCallStream(videoEnabled) {
        return navigator.mediaDevices.getUserMedia({
            video: videoEnabled,
            audio: true
        }).then(function (stream) {
            localCallStream = stream;
            var localVideo = $('call-local-video');
            var localFallback = $('call-local-fallback');
            if (localVideo) localVideo.srcObject = stream;
            if (localFallback) localFallback.style.display = 'none';
            return stream;
        });
    }

    function startCommunityCall(callType) {
        // DM call mode — use invite flow
        if (state.currentDmConversation && state.currentDmUserId) {
            var videoEnabled = callType === 'video';
            getLocalCallStream(videoEnabled).then(function (stream) {
                callActiveType = callType;
                currentCallConversationId = state.currentDmConversation;
                currentCallMaxSlots = 2;

                openCallOverlay();
                setParticipantControls(true);
                syncMicButton(true);
                syncCamButton(videoEnabled);

                if (state.socket) {
                    state.socket.emit('call:start', {
                        conversationId: currentCallConversationId,
                        callType: callType,
                        participants: [getMyUserId(), state.currentDmUserId],
                        callerAvatar: state.me ? state.me.profile_picture : null,
                    });
                }

                sendCallSignal(callType, 'start');
            }).catch(function (err) {
                console.error('[WEBRTC] Failed to start DM call:', err);
            });
            return;
        }

        if (!state.currentCommunity) return;

        var videoEnabled = callType === 'video';
        getLocalCallStream(videoEnabled).then(function (stream) {
            callActiveType = callType;
            currentCallCommunityId = state.currentCommunity.id;
            currentCallMaxSlots = 5;

            openCallOverlay();
            setParticipantControls(true);
            syncMicButton(true);
            syncCamButton(videoEnabled);

            if (state.socket) {
                state.socket.emit('call:start', {
                    communityId: currentCallCommunityId,
                    callType: callType,
                });
            }

            sendCallSignal(callType, 'start');
        }).catch(function (err) {
            console.error('[WEBRTC] Failed to start call:', err);
        });
    }

    function joinCallFromCard(msg) {
        callActiveType = msg.call_type || 'video';
        currentCallMaxSlots = 2;
        if (msg.conversation_id) {
            currentCallConversationId = msg.conversation_id;
        } else {
            if (!state.currentCommunity) return;
            currentCallCommunityId = msg.community_id || state.currentCommunity.id;
            currentCallMaxSlots = 5;
        }
        openCallOverlay();
        setParticipantControls(false);
        if (state.socket) {
            var watchData = currentCallConversationId
                ? { conversationId: currentCallConversationId }
                : { communityId: currentCallCommunityId };
            state.socket.emit('call:watch', watchData);
        }
    }

    // Store the last clicked call card message for the ended popup
    var _lastCallCardMsg = null;

    function checkCallActiveAndJoin(msg) {
        _lastCallCardMsg = msg;
        var token = window.HiveAuth ? window.HiveAuth.getToken() : null;
        if (!token) { joinCallFromCard(msg); return; }

        var url;
        if (msg.conversation_id) {
            url = API_BASE + '/api/calls/status/dm/' + encodeURIComponent(msg.conversation_id);
        } else if (msg.community_id) {
            url = API_BASE + '/api/calls/status/community/' + encodeURIComponent(msg.community_id);
        } else {
            joinCallFromCard(msg);
            return;
        }

        fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success && data.data && data.data.active) {
                    joinCallFromCard(msg);
                } else {
                    showCallEndedPopup(msg);
                }
            })
            .catch(function () {
                // On network error, try joining anyway
                joinCallFromCard(msg);
            });
    }

    function showCallEndedPopup(msg) {
        var overlay = $('call-ended-popup');
        if (!overlay) return;
        overlay.style.display = 'flex';
        // Bind Start Call button
        var startBtn = $('call-ended-start-btn');
        var cancelBtn = $('call-ended-cancel-btn');
        if (startBtn) {
            startBtn.onclick = function () {
                hideCallEndedPopup();
                // Start a brand new call
                var callType = msg.call_type || 'video';
                callActiveType = callType;
                if (msg.conversation_id) {
                    currentCallConversationId = msg.conversation_id;
                    currentCallCommunityId = null;
                    currentCallMaxSlots = 2;
                } else if (msg.community_id) {
                    currentCallCommunityId = msg.community_id;
                    currentCallConversationId = null;
                    currentCallMaxSlots = 5;
                } else {
                    return;
                }
                var videoEnabled = callType === 'video';
                getLocalCallStream(videoEnabled).then(function () {
                    openCallOverlay();
                    setParticipantControls(true);
                    syncMicButton(true);
                    syncCamButton(videoEnabled);
                    sendCallSignal(callType, 'start');
                }).catch(function (err) {
                    console.error('[WEBRTC] Failed to start call from ended popup:', err);
                });
            };
        }
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                hideCallEndedPopup();
            };
        }
    }

    function hideCallEndedPopup() {
        var overlay = $('call-ended-popup');
        if (overlay) overlay.style.display = 'none';
        _lastCallCardMsg = null;
    }

    function getCallTargetInfo() {
        // DM → other participant; community → the community name
        if (state.currentDmUserId) {
            var conv = state.dmConversations ? state.dmConversations.filter(function (c) {
                return c.conversation_id === state.currentDmConversation;
            })[0] : null;
            if (conv) {
                return {
                    name: conv.other_display_name || conv.other_username || 'Contact',
                    avatar: getAvatarUrl({ id: conv.other_user_id, profile_picture: conv.other_profile_picture, username: conv.other_username }),
                };
            }
            var other = state.homeMembers.get(state.currentDmUserId);
            if (other) return { name: other.display_name || other.username, avatar: getAvatarUrl(other) };
            return { name: 'Contact', avatar: '' };
        }
        if (state.currentCommunity) {
            return { name: state.currentCommunity.name || 'Community', avatar: '' };
        }
        return { name: 'Connecting…', avatar: '' };
    }

    function openCallOverlay(callerInfo) {
        var overlay = $('call-overlay');
        if (!overlay) return;
        callOpen = true;

        // Reset participant state
        callParticipants = [];
        peerConnections = {};
        pendingStreams = {};
        offeredToWatchers = {};
        handStates = {};
        handRaised = false;
        mySlot = 0;

        // DM mode: use 2-person layout
        var isDm = !!currentCallConversationId;
        overlay.classList.toggle('call-dm-mode', isDm);

        if (isDm) {
            // Set up DM remote video in the main area
            var grid = $('call-participant-grid');
            if (grid) {
                // Ensure slot 1 exists and is marked as DM remote
                var slot1 = $('call-slot-1');
                if (slot1) {
                    slot1.classList.add('call-dm-remote');
                    slot1.style.display = '';
                }
            }
            // Hide viewer chip for DM
            var chip = $('call-viewer-chip');
            if (chip) chip.style.display = 'none';
        } else {
            // Community mode: remove DM-specific classes
            var grid2 = $('call-participant-grid');
            if (grid2) {
                var allSlots = grid2.querySelectorAll('.call-participant-slot');
                for (var i = 0; i < allSlots.length; i++) {
                    allSlots[i].classList.remove('call-dm-remote');
                }
            }
        }

        // Watch-only by default until the user joins or starts the call
        setParticipantControls(false);

        // Reset grid based on max slots
        updateParticipantGrid([]);

        // Show a local-cam placeholder only if no stream is active yet
        var localFallback = $('call-local-fallback');
        if (localFallback) localFallback.style.display = localCallStream ? 'none' : 'flex';

        // Close other overlays so the call is clearly on top
        if (state.notifOpen) closeNotifications(false);
        if (onlineUsersOpen) closeOnlineUsers(false);
        document.body.classList.remove('side-open');

        overlay.style.display = '';
        requestAnimationFrame(function () { overlay.classList.add('visible'); });

        startCallTimer();
    }

    function closeCallOverlay() {
        var overlay = $('call-overlay');
        if (!overlay) return;
        callOpen = false;
        overlay.classList.remove('visible');
        overlay.classList.remove('call-dm-mode');
        stopCallTimer();
        setTimeout(function () { hide(overlay); }, 200);

        // Close all peer connections
        Object.keys(peerConnections).forEach(function (uid) {
            if (peerConnections[uid]) peerConnections[uid].close();
        });
        peerConnections = {};
        pendingStreams = {};

        if (localCallStream) {
            localCallStream.getTracks().forEach(function (track) { track.stop(); });
            localCallStream = null;
        }
        // Stop any active screen share
        if (screenStream) {
            screenStream.getTracks().forEach(function (track) { track.stop(); });
            screenStream = null;
        }
        isScreenSharing = false;
        storedCameraVideoTrack = null;
        setShareButton(false); // reset share UI to "off"
        var morePopover = $('call-more-popover');
        if (morePopover) morePopover.classList.remove('open');
        var moreBtn = $('call-more-btn');
        if (moreBtn) moreBtn.classList.remove('active');
        var handBtn = $('call-hand-btn');
        if (handBtn) handBtn.classList.remove('active');
        var localVideo = $('call-local-video');
        var localFallback = $('call-local-fallback');
        if (localVideo) localVideo.srcObject = null;
        if (localFallback) localFallback.style.display = 'flex';

        // Reset all slot videos
        var maxSlots = currentCallMaxSlots || 5;
        for (var i = 1; i <= maxSlots; i++) {
            var slotEl = document.getElementById('call-slot-' + i);
            if (slotEl) {
                var video = slotEl.querySelector('.call-slot-video');
                var fallback = slotEl.querySelector('.call-slot-fallback');
                if (video) video.srcObject = null;
                if (fallback) fallback.style.display = 'flex';
                slotEl.classList.remove('call-slot-active');
                slotEl.classList.add('call-slot-empty');
            }
        }

        var joinBtn = $('call-join-btn');
        if (joinBtn) joinBtn.style.display = 'none';

        if (state.socket && (currentCallCommunityId || currentCallConversationId)) {
            var leaveData = currentCallConversationId
                ? { conversationId: currentCallConversationId }
                : { communityId: currentCallCommunityId };
            state.socket.emit('call:leave', leaveData);
            if (mySlot === 1) {
                state.socket.emit('call:stop', leaveData);
            }
        }
        currentCallCommunityId = null;
        currentCallConversationId = null;
        currentCallMaxSlots = 5;
        callParticipants = [];
        mySlot = 0;

        if (callActiveType) {
            sendCallSignal(callActiveType, 'end');
            callActiveType = null;
        }
    }

    function toggleCallCtrl(btn, isOn) {
        if (!btn) return;
        if (isOn === undefined) { btn.classList.toggle('active'); }
        else { btn.classList.toggle('active', isOn); }
    }

    function setShareButton(active) {
        var btn = $('call-share-btn');
        if (btn) btn.classList.toggle('active', active === true);
    }

    // Watch-only mode → only the Join button. Joined → full controls.
    function setParticipantControls(joined) {
        var ids = ['call-mute-btn', 'call-cam-btn'];
        ids.forEach(function (id) {
            var el = $(id);
            if (el) el.style.display = joined ? '' : 'none';
        });
        var joinBtn = $('call-join-btn');
        if (joinBtn) joinBtn.style.display = joined ? 'none' : '';
        var moreBtn = $('call-more-btn');
        if (moreBtn) moreBtn.style.display = joined ? '' : 'none';
        var popover = $('call-more-popover');
        if (popover && !joined) {
            popover.classList.remove('open');
            moreBtn && moreBtn.classList.remove('active');
        }
        var bar = qs('.call-controls');
        if (bar) bar.classList.toggle('joined-mode', joined);
    }

    // Reflect microphone on/off in the button icon + label
    function syncMicButton(enabled) {
        var btn = $('call-mute-btn');
        if (btn) btn.classList.toggle('active', enabled);
    }

    // Reflect camera on/off in the button icon + label + local preview
    function syncCamButton(enabled) {
        var btn = $('call-cam-btn');
        if (btn) btn.classList.toggle('active', enabled);
        var localVideo = $('call-local-video');
        var localFallback = $('call-local-fallback');
        if (localFallback) localFallback.style.display = enabled ? 'none' : 'flex';
        if (localVideo) localVideo.style.display = enabled ? '' : 'none';
        // The flip-camera button only makes sense when the camera is actually on
        var flipBtn = btn ? qs('#call-cam-flip-btn, #call-flip-btn') : null;
        if (flipBtn) flipBtn.style.display = enabled ? '' : 'none';
    }

    // Toggle your own raised hand and broadcast it to everyone
    function toggleRaiseHand() {
        var activeKey = currentCallConversationId || currentCallCommunityId;
        if (!activeKey) return;
        handRaised = !handRaised;
        var btn = $('call-hand-btn');
        if (btn) btn.classList.toggle('active', handRaised);
        if (state.socket) {
            state.socket.emit('call:raise-hand', {
                communityId: currentCallCommunityId || null,
                conversationId: currentCallConversationId || null,
                raised: handRaised,
            });
        }
        handStates[getMyUserId()] = handRaised;
        updateHandIndicators();
    }

    // Sync all tile hand indicators to the current handStates map
    function updateHandIndicators() {
        callParticipants.forEach(function (p) {
            if (!p.slot || p.slot < 1) return;
            var slotEl = document.getElementById('call-slot-' + p.slot);
            if (!slotEl) return;
            var raised = !!handStates[p.userId];
            var handEl = slotEl.querySelector('.call-slot-hand');
            if (handEl) handEl.style.display = raised ? 'flex' : 'none';
            slotEl.classList.toggle('call-hand-raised', raised);
        });
    }

    // Switch camera between front (user) and back (environment) when possible
    function toggleCamera() {
        if (!localCallStream || isSwitchingCamera) return;
        var track = localCallStream.getVideoTracks()[0];
        if (!track) {
            showToast('No camera available');
            return;
        }
        var capabilities;
        try { capabilities = track.getCapabilities(); } catch (e) { capabilities = {}; }
        var settings;
        try { settings = track.getSettings(); } catch (e) { settings = {}; }
        var hasFacing = capabilities.facingMode && capabilities.facingMode.length > 1
            || Array.isArray(capabilities.facingMode) && capabilities.facingMode.length;
        if (!hasFacing) {
            showToast('Switching cameras is not supported on this device');
            return;
        }
        var next = settings.facingMode === 'environment' ? 'user'
            : settings.facingMode === 'user' ? 'environment'
            : (track.readyState === 'live' ? 'user' : 'environment');
        isSwitchingCamera = true;
        track.applyConstraints({ advanced: [{ facingMode: next }] })
            .then(function () {
                // Keep our own preview showing the new camera
                var localVideo = $('call-local-video');
                if (localVideo) localVideo.srcObject = localCallStream;
            })
            .catch(function (err) {
                console.error('[WEBRTC] Camera switch failed:', err);
                showToast('Could not switch camera');
            })
            .finally(function () { isSwitchingCamera = false; });
    }

    function toggleMoreMenu() {
        var menu = $('call-more-popover');
        if (!menu) return;
        menu.classList.toggle('open');
        var btn = $('call-more-btn');
        if (btn) btn.classList.toggle('active', menu.classList.contains('open'));
    }

    function updateViewerCount(count) {
        var num = $('call-viewer-count');
        if (num) {
            num.textContent = (typeof count === 'number' && count >= 0) ? count : 0;
        }
    }

    function fadeVideoIn(videoEl) {
        if (!videoEl) return;
        videoEl.style.opacity = '0';
        requestAnimationFrame(function () {
            videoEl.style.opacity = '1';
        });
    }

    // Replace the outgoing video track on the local stream AND every peer sender.
    // Using replaceTrack avoids renegotiation — smooth switch camera ↔ screen.
    function replaceLocalVideoTrack(newTrack) {
        if (localCallStream && newTrack) {
            var current = localCallStream.getVideoTracks()[0];
            if (current && current !== newTrack) {
                localCallStream.removeTrack(current);
                localCallStream.addTrack(newTrack);
            }
        }
        var localVideo = $('call-local-video');
        if (localVideo && localCallStream) localVideo.srcObject = localCallStream;

        Object.keys(peerConnections).forEach(function (uid) {
            var pc = peerConnections[uid];
            if (!pc) return;
            var senders = pc.getSenders();
            senders.forEach(function (sender) {
                if (sender.track && sender.track.kind === 'video') {
                    sender.replaceTrack(newTrack).catch(function (err) {
                        console.error('[WEBRTC] replaceTrack failed for', uid, err);
                    });
                }
            });
        });
    }

    function startScreenShare(stream) {
        var videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            showToast('No screen content to share');
            return;
        }
        screenStream = stream;
        if (!storedCameraVideoTrack && localCallStream) {
            storedCameraVideoTrack = localCallStream.getVideoTracks()[0] || null;
        }
        isScreenSharing = true;
        replaceLocalVideoTrack(videoTrack);
        setShareButton(true);
        cameraActiveUI(false);
        videoTrack.onended = function () { stopScreenShare(); };
    }

    function stopScreenShare() {
        if (!isScreenSharing) return;
        if (screenStream) {
            screenStream.getTracks().forEach(function (t) { t.stop(); });
            screenStream = null;
        }
        isScreenSharing = false;
        var cameraEnabled = storedCameraVideoTrack ? storedCameraVideoTrack.enabled : true;
        replaceLocalVideoTrack(storedCameraVideoTrack);
        storedCameraVideoTrack = null;
        setShareButton(false);
        cameraActiveUI(true);
        syncCamButton(cameraEnabled);
    }

    function toggleScreenShare() {
        if (!localCallStream || (!currentCallCommunityId && !currentCallConversationId)) {
            showToast('Start a call before sharing your screen');
            return;
        }
        if (isScreenSharing) { stopScreenShare(); return; }
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
                .then(startScreenShare)
                .catch(function (err) {
                    if (err && err.name !== 'NotAllowedError') {
                        showToast('Could not share screen');
                    }
                    console.error('[WEBRTC] Screen share failed:', err);
                });
        } else {
            showToast('Screen sharing is not supported on this device');
        }
    }

    function cameraActiveUI(on) {
        var camBtn = $('call-cam-btn');
        if (camBtn) camBtn.style.display = on ? '' : 'none';
    }

    function updateParticipantGrid(participants) {
        var oldParticipants = callParticipants.slice();
        callParticipants = participants || [];
        var me = getMyUserId();
        var maxSlots = currentCallMaxSlots || 5;
        var isDm = !!currentCallConversationId;

        // Determine which slots are occupied
        var occupiedSlots = {};
        callParticipants.forEach(function (p) {
            occupiedSlots[p.slot] = p;
        });

        // Clean up peer connections for participants who left
        oldParticipants.forEach(function (oldP) {
            var stillHere = callParticipants.find(function (p) { return p.userId === oldP.userId; });
            if (!stillHere && peerConnections[oldP.userId]) {
                peerConnections[oldP.userId].close();
                delete peerConnections[oldP.userId];
            }
        });

        // DM mode: always show remote user in slot 1
        if (isDm) {
            var remoteUser = null;
            callParticipants.forEach(function (p) {
                if (p.userId !== me) remoteUser = p;
            });

            var slot1 = document.getElementById('call-slot-1');
            if (slot1) {
                slot1.style.display = '';
                var video1 = slot1.querySelector('.call-slot-video');
                var fallback1 = slot1.querySelector('.call-slot-fallback');
                var nameEl1 = slot1.querySelector('.call-slot-name');
                var tagEl1 = slot1.querySelector('.call-side-tag-text');
                var statusEl1 = slot1.querySelector('.call-slot-status');

                if (remoteUser) {
                    slot1.classList.add('call-slot-active');
                    slot1.classList.remove('call-slot-empty');
                    if (nameEl1) nameEl1.textContent = remoteUser.username;
                    if (tagEl1) tagEl1.textContent = remoteUser.username;

                    // Check if video stream is already on the element
                    if (video1 && video1.srcObject) {
                        if (fallback1) fallback1.style.display = 'none';
                    } else {
                        if (fallback1) fallback1.style.display = 'flex';
                        if (statusEl1) statusEl1.textContent = 'Connecting…';
                    }
                } else {
                    slot1.classList.remove('call-slot-active');
                    slot1.classList.add('call-slot-empty');
                    if (video1) video1.srcObject = null;
                    if (fallback1) fallback1.style.display = 'flex';
                    if (nameEl1) nameEl1.textContent = '';
                    if (tagEl1) tagEl1.textContent = '';
                    if (statusEl1) statusEl1.textContent = 'Connecting…';
                }
            }

            // Hide slots 2-5
            for (var j = 2; j <= 5; j++) {
                var hideSlot = document.getElementById('call-slot-' + j);
                if (hideSlot) hideSlot.style.display = 'none';
            }

            // Update call timer label
            var topName2 = $('call-top-name');
            if (topName2) topName2.textContent = callParticipants.length + '/2';

            // Flush pending streams — always route remote user to slot 1
            callParticipants.forEach(function (p) {
                if (p.userId !== me && pendingStreams[p.userId]) {
                    var s1 = document.getElementById('call-slot-1');
                    if (s1) {
                        var v1 = s1.querySelector('.call-slot-video');
                        var f1 = s1.querySelector('.call-slot-fallback');
                        if (v1) {
                            v1.srcObject = pendingStreams[p.userId];
                            fadeVideoIn(v1);
                            if (f1) f1.style.display = 'none';
                            s1.classList.add('call-slot-active');
                            s1.classList.remove('call-slot-empty');
                        }
                    }
                    delete pendingStreams[p.userId];
                }
            });

            connectMeshToParticipants();
            return;
        }

        // Community mode: original grid logic
        for (var i = 1; i <= 5; i++) {
            var slotEl = document.getElementById('call-slot-' + i);
            if (!slotEl) continue;

            if (i > maxSlots) {
                slotEl.style.display = 'none';
                continue;
            } else {
                slotEl.style.display = '';
            }

            var participant = occupiedSlots[i];
            var video = slotEl.querySelector('.call-slot-video');
            var fallback = slotEl.querySelector('.call-slot-fallback');
            var nameEl = slotEl.querySelector('.call-slot-name');
            var tagEl = slotEl.querySelector('.call-side-tag-text');
            var statusEl = slotEl.querySelector('.call-slot-status');

            if (participant) {
                slotEl.classList.add('call-slot-active');
                slotEl.classList.remove('call-slot-empty');

                if (nameEl) {
                    nameEl.textContent = participant.userId === me ? 'You' : participant.username;
                }
                if (tagEl) {
                    if (participant.userId === me) {
                        tagEl.textContent = 'You';
                    } else if (i === 1) {
                        tagEl.textContent = currentCallConversationId ? participant.username : 'Host';
                    } else {
                        tagEl.textContent = participant.username;
                    }
                }

                // Hide fallback if we have a video stream, show otherwise
                if (video && video.srcObject) {
                    if (fallback) fallback.style.display = 'none';
                } else {
                    if (fallback) fallback.style.display = 'flex';
                    if (statusEl) statusEl.textContent = participant.userId === me ? '' : 'Connecting…';
                }
            } else {
                slotEl.classList.remove('call-slot-active');
                slotEl.classList.add('call-slot-empty');
                if (video) video.srcObject = null;
                if (fallback) fallback.style.display = '';
                if (nameEl) nameEl.textContent = '';
                if (tagEl) tagEl.textContent = '';
                if (statusEl) statusEl.textContent = currentCallConversationId ? 'Connecting…' : 'Waiting for participant…';
            }
        }

        // Update call timer label
        var topName = $('call-top-name');
        if (topName) {
            topName.textContent = callParticipants.length + '/' + maxSlots;
        }

        // Flush any pending streams that arrived before callParticipants was updated
        callParticipants.forEach(function (p) {
            if (p.slot > 0 && pendingStreams[p.userId]) {
                var slotEl = document.getElementById('call-slot-' + p.slot);
                if (slotEl) {
                    var video = slotEl.querySelector('.call-slot-video');
                    var fallback = slotEl.querySelector('.call-slot-fallback');
                    if (video) {
                        video.srcObject = pendingStreams[p.userId];
                        fadeVideoIn(video);
                        if (fallback) fallback.style.display = 'none';
                        slotEl.classList.add('call-slot-active');
                        slotEl.classList.remove('call-slot-empty');
                    }
                }
                delete pendingStreams[p.userId];
            }
        });

        // Connect mesh to new participants
        connectMeshToParticipants();
    }

    function connectMeshToParticipants() {
        var me = getMyUserId();
        if (!me || !localCallStream || (!currentCallCommunityId && !currentCallConversationId)) return;

        callParticipants.forEach(function (participant) {
            if (participant.userId === me) return;
            if (peerConnections[participant.userId]) return;

            // To avoid duplicate connections, only initiate if our slot is lower
            // Slot 1 initiates to all, slot 2 initiates to 3-5, etc.
            if (mySlot < participant.slot) {
                createOfferToParticipant(participant);
            }
        });
    }

    function createOfferToParticipant(participant) {
        var me = getMyUserId();
        var callKey = currentCallConversationId || currentCallCommunityId;
        if (!me || !localCallStream || !callKey || !state.socket) return;

        console.log('[WEBRTC] Creating offer to', participant.username, '(' + participant.userId + ')');
        var pc = createPeerConnection(participant.userId);
        peerConnections[participant.userId] = pc;

        localCallStream.getTracks().forEach(function (track) {
            pc.addTrack(track, localCallStream);
        });

        pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        }).then(function () {
            state.socket.emit('call:offer', {
                communityId: currentCallCommunityId || null,
                conversationId: currentCallConversationId || null,
                offer: pc.localDescription.toJSON(),
                targetUserId: participant.userId,
            });
        }).catch(function (err) {
            console.error('[WEBRTC] Failed to create offer for', participant.username, ':', err);
        });
    }

    /* Call timer — runs while the call screen is open (UI only) */
    var callTimer = null;
    var callSeconds = 0;

    function startCallTimer() {
        stopCallTimer();
        callSeconds = 0;
        updateCallTimerEl();
        callTimer = setInterval(function () {
            callSeconds++;
            updateCallTimerEl();
        }, 1000);
    }

    function stopCallTimer() {
        if (callTimer) { clearInterval(callTimer); callTimer = null; }
    }

    function updateCallTimerEl() {
        var el = $('call-top-timer');
        if (!el) return;
        var m = Math.floor(callSeconds / 60);
        var s = callSeconds % 60;
        el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function loadNotifications() {
        if (state.notifLoading || !state.notifHasMore) return;
        state.notifLoading = true;

        var url = '/api/notifications?limit=' + NOTIF_PAGE_SIZE + '&offset=' + state.notifOffset;
        apiGet(url)
            .then(function (data) {
                state.notifLoading = false;
                hide(dom.notifSkeleton);
                hide(dom.notifLoadMore);
                console.log(data);

                var notifs = data.notifications || [];
                state.notifUnreadCount = data.unreadCount || 0;

                if (state.notifOffset === 0 && notifs.length === 0) {
                    show(dom.notifEmpty);
                    hide(dom.notifList);
                } else {
                    hide(dom.notifEmpty);
                    show(dom.notifList);

                    state.notifNotifications = state.notifNotifications.concat(notifs);
                    state.notifOffset += notifs.length;

                    if (notifs.length < NOTIF_PAGE_SIZE) {
                        state.notifHasMore = false;
                    }

                    renderNotifications();
                    updateNotifBadge();
                }
            })
            .catch(function (err) {
                state.notifLoading = false;
                hide(dom.notifSkeleton);
                hide(dom.notifLoadMore);
                try {
                    if (dom.notifEmpty) {
                        var titleEl = dom.notifEmpty.querySelector('.notif-empty-title');
                        var textEl = dom.notifEmpty.querySelector('.notif-empty-text');
                        if (titleEl) titleEl.textContent = 'Unable to load notifications';
                        if (textEl) textEl.textContent = 'Check your network and try again.';
                    }
                } catch (e) {}
                show(dom.notifEmpty);
                updateNotifBadge();
            });
    }

    function renderNotifications() {
        if (!dom.notifList) return;
        dom.notifList.innerHTML = '';

        var prevGroup = '';
        for (var i = 0; i < state.notifNotifications.length; i++) {
            var n = state.notifNotifications[i];
            var group = getNotifTimeGroup(n.created_at);

            if (group !== prevGroup) {
                var groupEl = document.createElement('div');
                groupEl.className = 'notif-time-group';
                groupEl.textContent = group;
                dom.notifList.appendChild(groupEl);
                prevGroup = group;
            }

            var itemEl = renderNotifItem(n, i);
            dom.notifList.appendChild(itemEl);
        }

        if (state.notifHasMore) {
            show(dom.notifLoadMore);
        } else {
            hide(dom.notifLoadMore);
        }
    }

    function renderNotifItem(n, index) {
        var el = document.createElement('div');
        el.className = 'notif-item' + (n.is_read ? '' : ' unread');
        el.setAttribute('data-notif-id', n.id);
        el.classList.add('entering');
        el.style.animationDelay = Math.min(index * 40, 300) + 'ms';

        var avatarUrl = n.sender_avatar || getAvatarUrl({ id: n.sender_user_id, username: n.sender_username });
        var senderName = escapeHtml(n.sender_display_name || n.sender_username || 'Hive');

        var bodyHtml = '';
        if (n.body) {
            var raw = n.body;
            if (raw.length > 100) raw = raw.substring(0, 100) + '...';
            bodyHtml = '<div class="notif-item-body">' + escapeHtml(raw) + '</div>';
        }

        var badgeHtml = '';
        var actionsHtml = '';

        if (n.type === 'FRIEND_REQUEST' && !n.is_read) {
            badgeHtml = '<span class="notif-item-badge friend">Friend Request</span>';
            actionsHtml =
                '<div class="notif-item-actions">' +
                    '<button class="notif-action-btn notif-action-accept" data-notif-action="accept" data-notif-id="' + n.id + '" data-sender-id="' + (n.sender_user_id || '') + '">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Accept' +
                    '</button>' +
                    '<button class="notif-action-btn notif-action-reject" data-notif-action="reject" data-notif-id="' + n.id + '" data-sender-id="' + (n.sender_user_id || '') + '">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Reject' +
                    '</button>' +
                '</div>';
        } else if (n.type === 'FRIEND_ACCEPTED') {
            badgeHtml = '<span class="notif-item-badge friends">Now Friends</span>';
        } else if (n.type === 'FRIEND_REQUEST' && n.is_read) {
            badgeHtml = '<span class="notif-item-badge friend">Friend Request</span>';
        } else if (n.type === 'HASHTAG_ACTIVITY' && n.title) {
            var match = n.title.match(/^(.+?)\s+in\s+(.+)$/);
            if (match) {
                badgeHtml = '<span class="notif-item-badge hashtag">' + escapeHtml(match[1]) + '</span>' +
                    '<span class="notif-item-badge community">' + escapeHtml(match[2]) + '</span>';
            }
        } else if (n.community_name) {
            badgeHtml = '<span class="notif-item-badge community">' + escapeHtml(n.community_name) + '</span>';
        }
        if (n.type && n.type.indexOf('SYSTEM') !== -1) {
            badgeHtml = '<span class="notif-item-badge system">System</span>';
        }

        el.innerHTML =
            '<img class="notif-item-avatar" src="' + escapeHtml(avatarUrl) + '" alt="" loading="lazy">' +
            '<div class="notif-item-content">' +
                '<div class="notif-item-header">' +
                    '<span class="notif-item-name">' + senderName + '</span>' +
                    '<span class="notif-item-action">' + escapeHtml(n.title || '') + '</span>' +
                '</div>' +
                bodyHtml +
                '<div class="notif-item-meta">' +
                    '<span class="notif-item-time">' + formatNotifTime(n.created_at) + '</span>' +
                    badgeHtml +
                '</div>' +
                actionsHtml +
            '</div>';

        // Click on notification body (not on action buttons) — navigate
        el.addEventListener('click', function (e) {
            if (e.target.closest('.notif-action-btn')) return;
            handleNotifClick(n);
        });

        return el;
    }

    function handleNotifClick(n) {
        if (!n.is_read) {
            markNotifAsRead(n.id);
            n.is_read = true;
            var el = dom.notifList ? dom.notifList.querySelector('[data-notif-id="' + n.id + '"]') : null;
            if (el) el.classList.remove('unread');
            state.notifUnreadCount = Math.max(0, state.notifUnreadCount - 1);
            updateNotifBadge();
        }

        var targetCommunityId = n.community_id;
        var targetMessageId = n.message_id;

        closeNotifications(false);

        if (n.type === 'FRIEND_REQUEST' || n.type === 'FRIEND_ACCEPTED') {
            // Open sender's profile popup
            if (n.sender_user_id) {
                openUserPopup(n.sender_user_id, null, { id: n.sender_user_id, username: n.sender_username, profile_picture: n.sender_avatar, rank: n.sender_rank });
            }
        } else if (targetCommunityId) {
            window.history.pushState({}, '', '/home/#/c/' + targetCommunityId);
            openCommunity(targetCommunityId, targetMessageId);
        } else if (targetMessageId) {
            if (state.activeView !== 'home') {
                window.history.pushState({}, '', '/home/');
                showHomeView();
            }
        }
    }

    function markNotifAsRead(id) {
        window.HiveAuth.apiFetch('/api/notifications/' + id + '/read', { method: 'PUT' }).catch(function () {});
    }

    function markAllNotifsAsRead() {
        window.HiveAuth.apiFetch('/api/notifications/read-all', { method: 'PUT' }).then(function () {
            state.notifUnreadCount = 0;
            for (var i = 0; i < state.notifNotifications.length; i++) {
                state.notifNotifications[i].is_read = true;
            }
            var unreadEls = dom.notifList ? dom.notifList.querySelectorAll('.notif-item.unread') : [];
            for (var j = 0; j < unreadEls.length; j++) {
                unreadEls[j].classList.remove('unread');
            }
            updateNotifBadge();
        }).catch(function () {});
    }

    function updateNotifBadge() {
        var badge = document.querySelector('.rail-icon[data-nav="notifications"] .rail-badge');
        if (!badge) {
            var navIcon = document.querySelector('.rail-icon[data-nav="notifications"]');
            if (navIcon && state.notifUnreadCount > 0) {
                badge = document.createElement('span');
                badge.className = 'rail-badge';
                badge.id = 'notif-rail-badge';
                navIcon.appendChild(badge);
            }
        }

        if (badge) {
            if (state.notifUnreadCount > 0) {
                badge.textContent = state.notifUnreadCount > 99 ? '99+' : state.notifUnreadCount;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    function getNotifTimeGroup(isoStr) {
        if (!isoStr) return 'Earlier';
        var now = new Date();
        var d = new Date(isoStr);
        var diffH = (now - d) / (1000 * 60 * 60);

        if (diffH < 1) return 'Just Now';
        if (diffH < 24) return 'Today';
        if (diffH < 48) return 'Yesterday';
        if (diffH < 168) return 'This Week';
        return 'Earlier';
    }

    function formatNotifTime(isoStr) {
        if (!isoStr) return '';
        var d = new Date(isoStr);
        var now = new Date();
        var diffMs = now - d;
        var diffS = Math.floor(diffMs / 1000);
        var diffM = Math.floor(diffS / 60);
        var diffH = Math.floor(diffM / 60);
        var diffD = Math.floor(diffH / 24);

        if (diffS < 60) return 'just now';
        if (diffM < 60) return diffM + 'm ago';
        if (diffH < 24) return diffH + 'h ago';
        if (diffD < 7) return diffD + 'd ago';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function onNewNotification(notif) {
        state.notifNotifications.unshift(notif);
        state.notifUnreadCount++;

        if (dom.notifList && state.notifOpen) {
            hide(dom.notifEmpty);
            show(dom.notifList);

            var firstGroup = dom.notifList.querySelector('.notif-time-group');
            var itemEl = renderNotifItem(notif, 0);
            if (firstGroup && firstGroup.textContent === 'Just Now') {
                firstGroup.insertAdjacentElement('afterend', itemEl);
            } else {
                var groupEl = document.createElement('div');
                groupEl.className = 'notif-time-group';
                groupEl.textContent = 'Just Now';
                dom.notifList.insertBefore(groupEl, dom.notifList.firstChild);
                dom.notifList.insertBefore(itemEl, groupEl.nextSibling);
            }

            state.notifOffset++;
        }

        updateNotifBadge();
    }

    function loadNotifUnreadCount() {
        apiGet('/api/notifications/unread-count')
            .then(function (data) {
                state.notifUnreadCount = data.unreadCount || 0;
                updateNotifBadge();
            })
            .catch(function () {});
    }

    function handleNotifAccept(notifId, senderId, btnEl) {
        // Find the request ID from the notification metadata
        var notif = null;
        for (var i = 0; i < state.notifNotifications.length; i++) {
            if (state.notifNotifications[i].id === notifId) {
                notif = state.notifNotifications[i];
                break;
            }
        }
        if (!notif || !notif.metadata || !notif.metadata.requestId) {
            showToast('Request not found', 'error');
            return;
        }
        var requestId = notif.metadata.requestId;
        var parent = btnEl.parentElement;
        btnEl.disabled = true;
        var sibling = parent ? parent.querySelector('.notif-action-reject') : null;
        if (sibling) sibling.disabled = true;

        apiPut('/api/friends/request/' + requestId + '/accept')
            .then(function () {
                if (parent) {
                    parent.innerHTML = '<span class="notif-action-accepted"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#7CFFB2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Accepted</span>';
                }
                notif.is_read = true;
                var el = dom.notifList ? dom.notifList.querySelector('[data-notif-id="' + notifId + '"]') : null;
                if (el) el.classList.remove('unread');
                state.notifUnreadCount = Math.max(0, state.notifUnreadCount - 1);
                updateNotifBadge();
                showToast('Friend request accepted!');
            })
            .catch(function (err) {
                btnEl.disabled = false;
                if (sibling) sibling.disabled = false;
                showToast((err && err.message) || 'Failed to accept request', 'error');
            });
    }

    function handleNotifReject(notifId, btnEl) {
        var notif = null;
        for (var i = 0; i < state.notifNotifications.length; i++) {
            if (state.notifNotifications[i].id === notifId) {
                notif = state.notifNotifications[i];
                break;
            }
        }
        if (!notif || !notif.metadata || !notif.metadata.requestId) {
            showToast('Request not found', 'error');
            return;
        }
        var requestId = notif.metadata.requestId;
        var parent = btnEl.parentElement;
        btnEl.disabled = true;
        var sibling = parent ? parent.querySelector('.notif-action-accept') : null;
        if (sibling) sibling.disabled = true;

        apiPut('/api/friends/request/' + requestId + '/reject')
            .then(function () {
                if (parent) {
                    parent.innerHTML = '<span class="notif-action-rejected"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Rejected</span>';
                }
                notif.is_read = true;
                var el = dom.notifList ? dom.notifList.querySelector('[data-notif-id="' + notifId + '"]') : null;
                if (el) el.classList.remove('unread');
                state.notifUnreadCount = Math.max(0, state.notifUnreadCount - 1);
                updateNotifBadge();
                showToast('Friend request rejected');
            })
            .catch(function (err) {
                btnEl.disabled = false;
                if (sibling) sibling.disabled = false;
                showToast((err && err.message) || 'Failed to reject request', 'error');
            });
    }


    /* ── Open Community ──────────────────────── */
    function openCommunity(communityId, scrollToMsgId) {
        var community = null;
        for (var i = 0; i < state.communities.length; i++) {
            if (state.communities[i].id === communityId) {
                community = state.communities[i];
                break;
            }
        }
        if (!community) { showHomeView(); return; }

        cancelReply();
        emitTypingStop();
        if (state.typingTimeout) { clearTimeout(state.typingTimeout); state.typingTimeout = null; }
        state.typingUsers = [];
        renderTypingIndicator();

        // Save current community's messages to cache before switching
        if (state.currentCommunity) {
            saveMessagesToCache(state.currentCommunity.id);
        }

        leaveCurrentRoom();
        state.currentCommunity = community;
        state.messages = [];
        state.hasMore = true;
        state.loadingMessages = false;
        state.loadingOlder = false;
        state.pendingMessages = {};
        state.reconciledIds = {};

        updateChatHeader(community);
        showChatView();
        hideSidebarPanels();
        show(dom.sidebarCommunitiesPanel);
        setActiveRailIcon('communities');
        highlightActiveCommunity();

        // Check chat_permission restriction
        state.chatRestricted = false;
        var cp = community.chat_permission;
        if (cp && cp !== 'all') {
            var STAFF_RANKS = ['moderator', 'administrator', 'owner'];
            var RANK_UNLOCK_MAP = { rookie:0, explorer:1, member:2, contributor:3, insider:4, pioneer:5, elite:6, legend:7, titan:8, nova:9 };
            var userRank = (state.user && state.user.rank) || 'rookie';
            var isAllowed = false;
            var restrictionMsg = '';
            if (cp === 'staff') {
                isAllowed = STAFF_RANKS.indexOf(userRank) !== -1;
                restrictionMsg = 'Only Hive staff can post in this community';
            } else {
                var userTier = RANK_UNLOCK_MAP[userRank] || 0;
                var requiredTier = RANK_UNLOCK_MAP[cp] || 0;
                isAllowed = userTier >= requiredTier;
                restrictionMsg = 'Only ' + cp.charAt(0).toUpperCase() + cp.slice(1) + ' rank and above can chat here';
            }
            if (!isAllowed) {
                state.chatRestricted = true;
                if (dom.restrictedBanner) {
                    dom.restrictedBanner.style.display = '';
                    if (dom.restrictedText) dom.restrictedText.textContent = restrictionMsg;
                }
                if (dom.chatComposer) dom.chatComposer.classList.add('restricted');
                if (dom.composerInput) {
                    dom.composerInput.setAttribute('contenteditable', 'false');
                    dom.composerInput.setAttribute('data-placeholder', 'Chat is restricted');
                }
            } else {
                if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
                if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
                if (dom.composerInput) {
                    dom.composerInput.setAttribute('contenteditable', 'true');
                    dom.composerInput.setAttribute('data-placeholder', 'Message #' + (community.name || 'general').toLowerCase().replace(/\s+/g, '-'));
                }
            }
        } else {
            if (dom.restrictedBanner) dom.restrictedBanner.style.display = 'none';
            if (dom.chatComposer) dom.chatComposer.classList.remove('restricted');
            if (dom.composerInput) {
                dom.composerInput.setAttribute('contenteditable', 'true');
                dom.composerInput.setAttribute('data-placeholder', 'Message #' + (community.name || 'general').toLowerCase().replace(/\s+/g, '-'));
            }
        }

        // Check cache first
        var cached = state.messageCache.get(communityId);
        if (cached && cached.messages.length > 0) {
            // Show cached messages instantly (no skeleton)
            state.messages = cached.messages.slice();
            state.hasMore = cached.hasMore;
            clearMessages();
            renderAllMessages(state.messages);
            if (scrollToMsgId) {
                setTimeout(function () { scrollToMessage(scrollToMsgId); }, 100);
            } else {
                scrollToBottom(false);
            }

            // Silently fetch only newer messages (non-blocking)
            fetchNewerMessages(communityId);
        } else {
            // No cache — show skeletons, load fresh
            clearMessages();
            showMessageSkeletons();
            loadMessages(communityId).then(function () {
                removeSkeletons();
                if (scrollToMsgId) {
                    setTimeout(function () { scrollToMessage(scrollToMsgId); }, 100);
                }
            });
        }

        // Load presence data for this community
        loadPresence(communityId);

        // Check mute status for this user
        checkUserMuteStatus(communityId);

        if (state.socket) joinRoom(communityId);
    }

    function fetchNewerMessages(communityId) {
        if (!state.currentCommunity || state.currentCommunity.id !== communityId) return;
        // No cursor = fetch newest; if we already have messages, fetch with the latest created_at to catch any gaps
        var url = '/api/messages/' + communityId + '?limit=' + MESSAGE_LIMIT;
        // Don't use before — we want the newest messages to see if anything newer arrived while cached
        apiGet(url)
            .then(function (data) {
                if (!state.currentCommunity || state.currentCommunity.id !== communityId) return;
                var msgs = data.messages || [];
                if (msgs.length === 0) return;

                // Dedup: only add messages not already in state
                var newMsgs = [];
                for (var i = 0; i < msgs.length; i++) {
                    var exists = false;
                    for (var j = 0; j < state.messages.length; j++) {
                        if (msgs[i].id === state.messages[j].id) { exists = true; break; }
                    }
                    if (!exists) newMsgs.push(msgs[i]);
                }

                if (newMsgs.length > 0) {
                    state.messages = state.messages.concat(newMsgs);
                    var container = dom.chatMessagesInner;
                    if (container) {
                        var wasAtBottom = dom.chatMessages && (dom.chatMessages.scrollHeight - dom.chatMessages.scrollTop - dom.chatMessages.clientHeight < 150);
                        for (var k = 0; k < newMsgs.length; k++) {
                            var lastMsg = state.messages.length > 1 ? state.messages[state.messages.length - 2] : null;
                            var lastDate = lastMsg ? new Date(lastMsg.created_at).toDateString() : null;
                            var msgDate = new Date(newMsgs[k].created_at).toDateString();
                            if (lastDate !== msgDate) container.appendChild(createDateDivider(newMsgs[k].created_at));
                            container.appendChild(createMessageElement(newMsgs[k], false));
                        }
                        if (wasAtBottom) scrollToBottom(true);
                    }
                }
            })
            .catch(function () {}); // silent fail — cache is already showing
    }

    function updateChatHeader(community) {
        if (dom.chatCommunityIcon) dom.chatCommunityIcon.textContent = community.icon || '#';
        if (dom.chatCommunityName) dom.chatCommunityName.textContent = community.name;
        if (dom.chatChannelName) dom.chatChannelName.textContent = 'general';
        if (dom.chatTopic) dom.chatTopic.textContent = community.description || '';
        if (dom.csCommunityIcon) dom.csCommunityIcon.textContent = community.icon || '#';
        if (dom.csCommunityName) dom.csCommunityName.textContent = community.name;
        if (dom.csCommunityDesc) dom.csCommunityDesc.textContent = community.description || '';
        if (dom.csMemberCount) dom.csMemberCount.textContent = (community.member_count || 0) + ' members';
        if (dom.csOnlineCount) dom.csOnlineCount.textContent = (community.online_count || 0) + ' online';
        if (dom.csOnlineNum) dom.csOnlineNum.textContent = community.online_count || 0;
        var placeholder = 'Message #' + (community.name || 'general').toLowerCase().replace(/\s+/g, '-');
        if (dom.composerInput) dom.composerInput.setAttribute('data-placeholder', placeholder);
        var toggleMembersBtn = $('toggle-members-btn');
        if (toggleMembersBtn) toggleMembersBtn.style.display = '';
    }

    /* ── Messages ────────────────────────────── */
    function clearMessages() {
        if (dom.chatMessagesInner) {
            dom.chatMessagesInner.innerHTML = '';
            // Re-insert the loading-older element so it's always in DOM
            if (dom.loadingOlder) {
                dom.chatMessagesInner.appendChild(dom.loadingOlder);
                dom.loadingOlder.style.display = 'none';
            }
        }
        state.messages = [];
        state.hasMore = true;
    }

    function saveMessagesToCache(communityId) {
        if (!communityId || state.messages.length === 0) return;
        state.messageCache.set(communityId, {
            messages: state.messages.slice(),
            hasMore: state.hasMore,
        });
    }

    function loadMessages(communityId, opts) {
        opts = opts || {};
        var isOlderLoad = !!opts.older;

        if (state.loadingMessages) return Promise.resolve();
        if (isOlderLoad && state.loadingOlder) return Promise.resolve();
        if (isOlderLoad && !state.hasMore) return Promise.resolve();

        if (isOlderLoad) {
            state.loadingOlder = true;
            showLoadingOlder();
        } else {
            state.loadingMessages = true;
        }

        var url = '/api/messages/' + communityId + '?limit=' + MESSAGE_LIMIT;
        if (state.messages.length > 0 && state.messages[0]) {
            url += '&before=' + encodeURIComponent(state.messages[0].created_at);
        }

        return apiGet(url)
            .then(function (data) {
                state.loadingMessages = false;
                state.loadingOlder = false;
                hideLoadingOlder();
                var msgs = data.messages || [];
                state.hasMore = data.pagination ? data.pagination.hasMore : false;

                if (state.messages.length === 0) {
                    state.messages = msgs;
                    renderAllMessages(msgs);
                    scrollToBottom(false);
                } else {
                    var newMsgs = [];
                    for (var i = 0; i < msgs.length; i++) {
                        var exists = false;
                        for (var j = 0; j < state.messages.length; j++) {
                            if (msgs[i].id === state.messages[j].id) { exists = true; break; }
                        }
                        if (!exists) newMsgs.push(msgs[i]);
                    }
                    if (newMsgs.length > 0) {
                        state.messages = newMsgs.concat(state.messages);
                        prependMessages(newMsgs);
                    }
                }
            })
            .catch(function (err) {
                state.loadingMessages = false;
                state.loadingOlder = false;
                hideLoadingOlder();
                console.error('[HIVE] Failed to load messages:', err);
            });
    }

    function showLoadingOlder() {
        if (dom.loadingOlder) dom.loadingOlder.style.display = '';
    }

    function hideLoadingOlder() {
        if (dom.loadingOlder) dom.loadingOlder.style.display = 'none';
    }

    function renderAllMessages(messages) {
        var container = dom.chatMessagesInner;
        if (!container) return;
        container.innerHTML = '';
        var prevDate = null;
        for (var i = 0; i < messages.length; i++) {
            var msgDate = new Date(messages[i].created_at).toDateString();
            if (msgDate !== prevDate) {
                container.appendChild(createDateDivider(messages[i].created_at));
                prevDate = msgDate;
            }
            container.appendChild(createMessageElement(messages[i], false));
        }
    }

    function prependMessages(messages) {
        var container = dom.chatMessagesInner;
        if (!container || messages.length === 0) return;
        var scrollArea = dom.chatMessages;
        var prevScrollHeight = scrollArea ? scrollArea.scrollHeight : 0;
        var frag = document.createDocumentFragment();
        var prevDate = null;
        for (var i = 0; i < messages.length; i++) {
            var msgDate = new Date(messages[i].created_at).toDateString();
            if (msgDate !== prevDate) {
                frag.appendChild(createDateDivider(messages[i].created_at));
                prevDate = msgDate;
            }
            frag.appendChild(createMessageElement(messages[i], false));
        }
        // Insert after the loading-older element (firstChild) so it stays at top
        var anchor = dom.loadingOlder || null;
        if (anchor && anchor.parentNode === container) {
            anchor.after(frag);
        } else {
            var firstChild = container.firstChild;
            if (firstChild) {
                container.insertBefore(frag, firstChild);
            } else {
                container.appendChild(frag);
            }
        }
        if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight - prevScrollHeight;
        }
    }

    function appendMessage(msg) {
        var container = dom.chatMessagesInner;
        if (!container) return;
        // Dedup by ID in state
        for (var i = 0; i < state.messages.length; i++) {
            if (state.messages[i].id === msg.id) return;
        }
        // Dedup by ID in DOM
        if (container.querySelector('[data-msg-id="' + msg.id + '"]')) return;
        state.messages.push(msg);
        var lastMsg = state.messages.length > 1 ? state.messages[state.messages.length - 2] : null;
        var lastDate = lastMsg ? new Date(lastMsg.created_at).toDateString() : null;
        var msgDate = new Date(msg.created_at).toDateString();
        if (lastDate !== msgDate) container.appendChild(createDateDivider(msg.created_at));
        var el = createMessageElement(msg, true);
        container.appendChild(el);
        var scrollArea = dom.chatMessages;
        if (scrollArea) {
            var isNearBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < 150;
            if (isNearBottom || msg.sender_id === (state.user && state.user.id)) {
                scrollToBottom(true);
            }
        }
    }

    function createDateDivider(isoStr) {
        var div = document.createElement('div');
        div.className = 'date-divider';
        div.innerHTML = '<span>' + escapeHtml(formatDateDivider(isoStr)) + '</span>';
        return div;
    }

    function createMessageElement(msg, animate) {
        var el = document.createElement('div');
        var hasReply = msg.reply_to_id && (msg.reply_to_message || msg.reply_to_attachment_type);
        var isBot = msg.is_bot;
        el.className = 'chat-message' + (animate ? ' msg-enter' : '') + (hasReply ? ' has-reply' : '') + (isBot ? ' msg-bot' : '');
        el.setAttribute('data-msg-id', msg.id);
        el.setAttribute('data-sender-id', msg.sender_id || msg.user_id || '');

        // System call events render as a centered "call card" instead of a normal chat message.
        if (msg.message_type === 'system' && (msg.event_type === 'call' || msg.call_type)) {
            var isCallEnd = msg.call_status === 'end';
            var callKind = msg.call_type === 'voice' ? 'voice' : 'video';
            var callAccent = isCallEnd ? 'ended' : callKind;
            var callIcon = callKind === 'voice'
                ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
                : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
            var actionText = isCallEnd ? 'ended' : 'started';
            var kindText = callKind === 'voice' ? 'a voice call' : 'a video call';
            el.innerHTML =
                '<div class="msg-call-card call-accent-' + callAccent + (isCallEnd ? '' : ' clickable') + '">' +
                    '<div class="call-card-glow"></div>' +
                    '<div class="call-card-inner">' +
                        '<div class="call-card-icon-ring">' +
                            (isCallEnd ? '<span class="call-ended-icon">' + callIcon + '</span>' : '<span class="call-live-dot"></span>') +
                            callIcon +
                        '</div>' +
                        '<div class="call-card-info">' +
                            '<div class="call-card-title">' +
                                '<span class="call-card-user">' + escapeHtml(msg.username || '') + '</span>' +
                                '<span class="call-card-action"> ' + actionText + '</span>' +
                                '<span class="call-card-kind"> ' + kindText + '</span>' +
                            '</div>' +
                            '<div class="call-card-meta">' +
                                '<span class="call-card-time">' + escapeHtml(formatTime(msg.created_at)) + '</span>' +
                                (!isCallEnd ? '<span class="call-card-join-label">Click to join</span>' : '') +
                            '</div>' +
                        '</div>' +
                        (!isCallEnd ? '<div class="call-card-arrow"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>' : '') +
                    '</div>' +
                '</div>';
            // Clicking a "started call" card checks if the call is active before joining.
            if (!isCallEnd && (msg.community_id || msg.conversation_id)) {
                var callCard = el.querySelector('.msg-call-card');
                callCard.addEventListener('click', function (e) {
                    e.stopPropagation();
                    checkCallActiveAndJoin(msg);
                });
            }
            return el;
        }
        var avatarUrl = getAvatarUrl(msg);

        var replyHtml = '';
        if (hasReply) {
            var replyAvatar = msg.reply_to_profile_picture || ('https://i.pravatar.cc/80?u=' + (msg.reply_to_username || 'reply'));
            var replyText = msg.reply_to_message || '';
            var replyAttLabel = '';
            if (!replyText && msg.reply_to_attachment_type) {
                if (msg.reply_to_attachment_type === 'image') replyAttLabel = 'Image';
                else if (msg.reply_to_attachment_type === 'video') replyAttLabel = 'Video';
                else if (msg.reply_to_attachment_type === 'audio') replyAttLabel = 'Audio';
                else replyAttLabel = 'File';
            }
            if (replyText.length > 120) replyText = replyText.substring(0, 120) + '...';
            var replyTime = msg.reply_to_created_at ? formatTime(msg.reply_to_created_at) : '';
            var replyRank = msg.reply_to_rank || null;
            var replyAccent = getReplyAccentColor(msg.reply_to_sender_id || msg.reply_to_id);
            var replyFont = msg.reply_to_profile_font || '';
            var replyFontStyle = replyFont ? 'font-family:\'' + escapeHtml(replyFont) + '\',sans-serif;' : '';
            replyHtml =
                '<div class="msg-reply" data-reply-to="' + escapeHtml(msg.reply_to_id) + '" style="--reply-accent:' + replyAccent + '">' +
                    '<div class="msg-reply-accent"></div>' +
                    '<div class="msg-reply-body">' +
                        '<div class="msg-reply-header">' +
                            '<img class="msg-reply-avatar" src="' + escapeHtml(replyAvatar) + '" alt="" loading="lazy">' +
                            '<span class="msg-reply-user" style="color:' + replyAccent + ';' + replyFontStyle + '">' + escapeHtml(msg.reply_to_username) + createRankBadgeHtml(replyRank, 'rank-badge-sm') + '</span>' +
                            '<span class="msg-reply-time">' + escapeHtml(replyTime) + '</span>' +
                            '<svg class="msg-reply-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + replyAccent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>' +
                        '</div>' +
                        '<div class="msg-reply-text">' + (replyText ? escapeHtml(replyText) : (replyAttLabel ? '<span class="msg-reply-att-label">' + escapeHtml(replyAttLabel) + '</span>' : '')) + '</div>' +
                    '</div>' +
                '</div>';
        }

        var usernameColorStyle = msg.username_color ? 'color:' + escapeHtml(msg.username_color) : '';
        var textColorStyle = msg.chat_text_color ? 'color:' + escapeHtml(msg.chat_text_color) : '';
        var textFontStyle = msg.chat_text_font ? 'font-family:\'' + escapeHtml(msg.chat_text_font) + '\',sans-serif' : '';
        var combinedTextStyle = (textColorStyle || textFontStyle) ? ' style="' + textColorStyle + (textColorStyle && textFontStyle ? ';' : '') + textFontStyle + '"' : '';
        var profileFontStyle = msg.profile_font ? 'font-family:\'' + escapeHtml(msg.profile_font) + '\',sans-serif' : '';
        var combinedUsernameStyle = (usernameColorStyle || profileFontStyle) ? ' style="' + usernameColorStyle + (usernameColorStyle && profileFontStyle ? ';' : '') + profileFontStyle + '"' : '';

        var ringClass = msg.profile_ring && msg.profile_ring !== 'none' ? msg.profile_ring : '';

        el.innerHTML =
            '<div class="msg-avatar-wrap' + (ringClass ? ' ' + ringClass : '') + '"><img class="msg-avatar' + (isBot ? ' msg-avatar-bot' : '') + '" src="' + escapeHtml(avatarUrl) + '" alt="' + escapeHtml(msg.username) + '" loading="lazy"></div>' +
            '<div class="msg-body">' +
                '<div class="msg-header">' +
                    '<span class="msg-username' + (msg.rank ? ' rank-' + msg.rank : '') + (isBot ? ' msg-username-bot' : '') + '"' + combinedUsernameStyle + '>' + escapeHtml(msg.username) + (isBot ? createBotBadgeHtml() : '') + createRankBadgeHtml(msg.rank) + '</span>' +
                    '<span class="msg-timestamp" title="' + escapeHtml(formatFullTime(msg.created_at)) + '">' + escapeHtml(formatTime(msg.created_at)) + '</span>' +
                    (msg.edited_at ? '<span class="msg-edited">(edited)</span>' : '') +
                '</div>' +
                replyHtml +
                renderAttachmentHtml(msg) +
                (msg.message ? '<div class="msg-content"' + combinedTextStyle + '>' + renderMessageText(msg.message) + '</div>' : '') +
            '</div>' +
            (isBot ? '' : '<div class="msg-actions">' +
                '<button class="msg-action-btn" aria-label="React" data-tip="React" data-color="#FFD93D">' +
                    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' +
                '</button>' +
                '<button class="msg-action-btn msg-reply-btn" aria-label="Reply" data-tip="Reply" data-color="#6C63FF">' +
                    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>' +
                '</button>' +
            '</div>');

        var replyBtn = el.querySelector('.msg-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                startReply(msg);
            });
        }

        var replyRef = el.querySelector('.msg-reply');
        if (replyRef) {
            replyRef.addEventListener('click', function (e) {
                e.stopPropagation();
                var targetId = this.getAttribute('data-reply-to');
                if (targetId) scrollToMessage(targetId);
            });
        }

        // Click avatar or username → open user popup
        var msgAvatar = el.querySelector('.msg-avatar');
        var msgUsername = el.querySelector('.msg-username');
        var popupTargets = [msgAvatar, msgUsername].filter(Boolean);
        popupTargets.forEach(function (target) {
            target.style.cursor = 'pointer';
            target.addEventListener('click', function (e) {
                e.stopPropagation();
                openUserPopup(msg.sender_id || msg.user_id || msg.id, target, msg);
            });
        });

        return el;
    }

    function scrollToBottom(smooth) {
        var scrollArea = dom.chatMessages;
        if (!scrollArea) return;
        if (smooth) {
            scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
        } else {
            scrollArea.scrollTop = scrollArea.scrollHeight;
        }
    }

    /* ── Reply ──────────────────────────────── */
    function getAttachmentLabel(msg) {
        var atts = msg.attachments;
        if (atts && Array.isArray(atts) && atts.length > 0) {
            var types = atts.map(function(a) { return a.attachment_type || ''; });
            var hasImage = types.indexOf('image') !== -1;
            var hasVideo = types.indexOf('video') !== -1;
            var hasAudio = types.indexOf('audio') !== -1;
            if (hasImage && hasVideo) return 'Attachments';
            if (hasImage && hasAudio) return 'Attachments';
            if (hasVideo && hasAudio) return 'Attachments';
            if (atts.length > 1) return atts.length + ' attachments';
            if (hasImage) return 'Image';
            if (hasVideo) return 'Video';
            if (hasAudio) return 'Audio';
            return 'File';
        }
        if (msg.attachment_type) {
            if (msg.attachment_type === 'image') return 'Image';
            if (msg.attachment_type === 'video') return 'Video';
            if (msg.attachment_type === 'audio') return 'Audio';
            return 'File';
        }
        return '';
    }

    function startReply(msg) {
        state.replyingTo = msg;
        var accent = getReplyAccentColor(msg.sender_id || msg.id);
        if (dom.replyComposer) {
            dom.replyComposer.style.display = '';
            dom.replyComposer.classList.remove('reply-composer-exit');
            dom.replyComposer.classList.add('reply-composer-enter');
            dom.replyComposer.style.setProperty('--reply-accent', accent);
            setTimeout(function () {
                dom.replyComposer.classList.remove('reply-composer-enter');
            }, 250);
        }
        var accentEl = dom.replyComposer ? dom.replyComposer.querySelector('.reply-composer-accent') : null;
        if (accentEl) accentEl.style.background = 'linear-gradient(180deg, ' + accent + ', ' + accent + 'cc)';
        var labelEl = dom.replyComposer ? dom.replyComposer.querySelector('.reply-composer-label') : null;
        if (labelEl) labelEl.style.color = accent;
        if (dom.replyComposerAvatar) dom.replyComposerAvatar.src = getAvatarUrl(msg);
        if (dom.replyComposerUsername) dom.replyComposerUsername.innerHTML = escapeHtml(msg.username) + createRankBadgeHtml(msg.reply_to_rank || msg.rank, 'rank-badge-sm');
        if (dom.replyComposerText) {
            var preview = msg.message || '';
            var attLabel = getAttachmentLabel(msg);
            if (preview && attLabel) {
                preview = preview + ' — ' + attLabel;
            } else if (!preview && attLabel) {
                preview = attLabel;
            }
            if (preview.length > 100) preview = preview.substring(0, 100) + '...';
            dom.replyComposerText.textContent = preview;
        }
        var composerWrap = qs('.composer-wrapper');
        if (composerWrap) composerWrap.classList.add('reply-active');
        if (dom.composerInput) dom.composerInput.focus();
    }

    function cancelReply() {
        state.replyingTo = null;
        if (dom.replyComposer) {
            dom.replyComposer.classList.add('reply-composer-exit');
            setTimeout(function () {
                dom.replyComposer.style.display = 'none';
                dom.replyComposer.classList.remove('reply-composer-exit');
            }, 200);
        }
        var composerWrap = qs('.composer-wrapper');
        if (composerWrap) composerWrap.classList.remove('reply-active');
    }

    function scrollToMessage(msgId) {
        if (!dom.chatMessagesInner) return;
        var target = dom.chatMessagesInner.querySelector('[data-msg-id="' + msgId + '"]');
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('msg-highlight');
        setTimeout(function () {
            target.classList.remove('msg-highlight');
        }, 2000);
    }

    /* ── Emoji Picker ─────────────────────────── */
    var EMOJI_RECENT_KEY = 'hive_recent_emojis';
    var MAX_RECENT = 12;

    function getRecentEmojis() {
        try { return JSON.parse(localStorage.getItem(EMOJI_RECENT_KEY)) || []; }
        catch (e) { return []; }
    }
    function addRecentEmoji(name) {
        var r = getRecentEmojis();
        r = r.filter(function (e) { return e !== name; });
        r.unshift(name);
        if (r.length > MAX_RECENT) r = r.slice(0, MAX_RECENT);
        try { localStorage.setItem(EMOJI_RECENT_KEY, JSON.stringify(r)); } catch (e) {}
    }

    /* ── Build entire emoji body ────────────── */
    function buildEmojiBody(filter) {
        if (!dom.emojiBody || !window.HiveEmoji) return;
        var body = dom.emojiBody;
        body.innerHTML = '';

        var cats = window.HiveEmoji.getCategories ? window.HiveEmoji.getCategories() : {};
        var catOrder = ['faces', 'hands', 'nature', 'objects', 'symbols'];

        /* Recent section */
        var recent = getRecentEmojis();
        if (!filter && recent.length > 0) {
            var sec = document.createElement('div');
            sec.className = 'emoji-section';
            sec.setAttribute('data-cat', 'recent');
            sec.innerHTML = '<div class="emoji-section-label">Recently Used</div>';
            var grid = document.createElement('div');
            grid.className = 'emoji-grid';
            recent.forEach(function (name) {
                if (!window.HiveEmoji.get(name)) return;
                grid.appendChild(makeEmojiItem(name));
            });
            sec.appendChild(grid);
            body.appendChild(sec);
        }

        /* Category sections */
        catOrder.forEach(function (cat) {
            var keys = window.HiveEmoji.getByCategory ? window.HiveEmoji.getByCategory(cat) : [];
            if (filter) {
                keys = keys.filter(function (k) {
                    var info = window.HiveEmoji.get(k);
                    return info && (k.indexOf(filter) !== -1 || info.name.toLowerCase().indexOf(filter) !== -1);
                });
            }
            if (keys.length === 0) return;
            var sec = document.createElement('div');
            sec.className = 'emoji-section';
            sec.setAttribute('data-cat', cat);
            var label = cats[cat] ? cats[cat].name : cat;
            sec.innerHTML = '<div class="emoji-section-label">' + label + '</div>';
            var grid = document.createElement('div');
            grid.className = 'emoji-grid';
            keys.forEach(function (name) { grid.appendChild(makeEmojiItem(name)); });
            sec.appendChild(grid);
            body.appendChild(sec);
        });

        if (body.children.length === 0) {
            body.innerHTML = '<div class="emoji-no-results">No emojis found</div>';
        }
    }

    function makeEmojiItem(name) {
        var item = document.createElement('div');
        item.className = 'emoji-item';
        item.setAttribute('data-emoji', name);
        item.setAttribute('data-tip', ':' + name + ':');
        var badge = window.HiveEmoji.create(name, 26);
        if (badge) item.appendChild(badge);
        item.addEventListener('click', function () { insertEmoji(name); });
        return item;
    }

    /* ── Scroll tabs to section ─────────────── */
    function scrollToCategory(cat) {
        if (!dom.emojiBody) return;
        var target = dom.emojiBody.querySelector('[data-cat="' + cat + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ── Highlight active tab on scroll ─────── */
    function updateActiveTabOnScroll() {
        if (!dom.emojiBody || !dom.emojiCategoryTabs) return;
        var sections = dom.emojiBody.querySelectorAll('.emoji-section');
        var tabs = dom.emojiCategoryTabs.querySelectorAll('.emoji-tab');
        var scrollTop = dom.emojiBody.scrollTop;
        var activeCat = 'recent';
        sections.forEach(function (sec) {
            if (sec.offsetTop - dom.emojiBody.offsetTop <= scrollTop + 40) {
                activeCat = sec.getAttribute('data-cat');
            }
        });
        tabs.forEach(function (tab) {
            tab.classList.toggle('active', tab.getAttribute('data-cat') === activeCat);
        });
    }

    /* ── Insert emoji into composer ─────────── */
    function insertEmoji(name) {
        if (!dom.composerInput) return;
        var info = window.HiveEmoji.get(name);
        if (!info) return;
        var identifier = info.id;
        var input = dom.composerInput;
        input.focus();
        var sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            var range = sel.getRangeAt(0);
            if (input.contains(range.commonAncestorContainer)) {
                var emojiSpan = document.createElement('span');
                emojiSpan.className = 'hive-emoji-composed';
                emojiSpan.setAttribute('data-emoji', name);
                emojiSpan.setAttribute('data-id', identifier);
                var badge = window.HiveEmoji.create(name, 20);
                if (badge) emojiSpan.appendChild(badge);
                range.deleteContents();
                range.insertNode(emojiSpan);
                var space = document.createTextNode('\u00A0');
                emojiSpan.parentNode.insertBefore(space, emojiSpan.nextSibling);
                range.setStartAfter(space);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                input.textContent += identifier;
            }
        } else {
            input.textContent += identifier;
        }
        updateSendButton();
        addRecentEmoji(name);
        closeEmojiPicker();
    }

    /* ── Open / Close ───────────────────────── */
    function openEmojiPicker() {
        if (!dom.emojiPicker) return;
        dom.emojiPicker.style.display = '';
        dom.emojiPicker.classList.remove('closing');
        buildEmojiBody('');
        if (dom.emojiSearch) dom.emojiSearch.value = '';
        /* Reset tabs */
        if (dom.emojiCategoryTabs) {
            var tabs = dom.emojiCategoryTabs.querySelectorAll('.emoji-tab');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.toggle('active', tabs[i].getAttribute('data-cat') === 'recent');
            }
        }
        /* Position (desktop only — on mobile CSS anchors it full-width to the bottom) */
        var emojiBtn = qs('.composer-btn[aria-label="Emoji"]');
        if (emojiBtn && window.innerWidth > 900) {
            var rect = emojiBtn.getBoundingClientRect();
            var pw = 350, ph = 440, gap = 12;
            var left = rect.right - pw;
            var top = rect.top - ph - gap;
            if (left < 8) left = 8;
            if (top < 8) top = rect.bottom + gap;
            if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
            if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
            dom.emojiPicker.style.left = left + 'px';
            dom.emojiPicker.style.top = top + 'px';
        }
        setTimeout(function () { if (dom.emojiSearch) dom.emojiSearch.focus(); }, 100);
    }

    function closeEmojiPicker() {
        if (!dom.emojiPicker) return;
        dom.emojiPicker.classList.add('closing');
        setTimeout(function () {
            dom.emojiPicker.style.display = 'none';
            dom.emojiPicker.classList.remove('closing');
        }, 120);
    }

    function toggleEmojiPicker() {
        if (!dom.emojiPicker) return;
        if (dom.emojiPicker.style.display === 'none' || !dom.emojiPicker.style.display) {
            openEmojiPicker();
        } else {
            closeEmojiPicker();
        }
    }

    /* ── GIF Picker ──────────────────────────── */
    var gifState = {
        loading: false,
        offset: 0,
        total: 0,
        searchQuery: '',
        selection: null,   // { url, preview } for the attachment
    };
    var GIF_LIMIT = 15;

    function positionGifPicker() {
        // Desktop only — on mobile CSS anchors it full-width to the bottom.
        if (window.innerWidth <= 900) return;
        var gifBtn = qs('.composer-btn[aria-label="GIF"]');
        if (gifBtn && dom.gifPicker) {
            var rect = gifBtn.getBoundingClientRect();
            var pw = 360, ph = 440, gap = 12;
            var left = rect.right - pw;
            var top = rect.top - ph - gap;
            if (left < 8) left = 8;
            if (top < 8) top = rect.bottom + gap;
            if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
            if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
            dom.gifPicker.style.left = left + 'px';
            dom.gifPicker.style.top = top + 'px';
        }
    }

    function openGifPicker() {
        if (!dom.gifPicker) return;
        dom.gifPicker.style.display = '';
        dom.gifPicker.classList.remove('closing');
        positionGifPicker();
        if (dom.gifSearch) dom.gifSearch.value = '';
        gifState.searchQuery = '';
        loadGifs(true);
        if (dom.gifSearch) setTimeout(function () { dom.gifSearch.focus(); }, 100);
    }

    function closeGifPicker() {
        if (!dom.gifPicker) return;
        dom.gifPicker.classList.add('closing');
        setTimeout(function () {
            dom.gifPicker.style.display = 'none';
            dom.gifPicker.classList.remove('closing');
        }, 120);
    }

    function toggleGifPicker() {
        if (!dom.gifPicker) return;
        if (dom.gifPicker.style.display === 'none' || !dom.gifPicker.style.display) {
            openGifPicker();
        } else {
            closeGifPicker();
        }
    }

    function renderGifGrid(gifs, append) {
        if (!dom.gifGrid) return;
        if (!append) dom.gifGrid.innerHTML = '';
        gifs.forEach(function (g) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'gif-item';
            item.setAttribute('aria-label', 'Send GIF');
            item.innerHTML = '<img src="' + escapeHtml(g.thumb) + '" alt="" loading="lazy">';
            item.addEventListener('click', function () {
                gifState.selection = {
                    url: g.url,
                    preview: g.thumb,
                };
                sendGif();
            });
            dom.gifGrid.appendChild(item);
        });
    }

    function showGifLoading(show) {
        if (dom.gifLoading) dom.gifLoading.style.display = show ? '' : 'none';
        if (dom.gifLoadMore) dom.gifLoadMore.style.display = 'none';
    }

    function loadGifs(reset) {
        if (!dom.gifGrid) return;
        if (gifState.loading) return;
        if (reset) {
            gifState.offset = 0;
            if (dom.gifGrid) dom.gifGrid.innerHTML = '';
        }
        gifState.loading = true;
        showGifLoading(true);

        var q = gifState.searchQuery ? '&q=' + encodeURIComponent(gifState.searchQuery) : '';
        apiGet('/api/gifs?offset=' + gifState.offset + '&limit=' + GIF_LIMIT + q)
            .then(function (data) {
                gifState.loading = false;
                showGifLoading(false);
                if (data && data.gifs && data.gifs.length) {
                    renderGifGrid(data.gifs, true);
                    gifState.offset += data.gifs.length;
                    if (dom.gifLoadMore) {
                        dom.gifLoadMore.style.display = (data.gifs.length >= GIF_LIMIT) ? '' : 'none';
                    }
                } else if (dom.gifGrid) {
                    dom.gifGrid.innerHTML = '<div class="gif-empty">No GIFs found</div>';
                }
            })
            .catch(function () {
                gifState.loading = false;
                showGifLoading(false);
            });
    }

    function sendGif() {
        var sel = gifState.selection;
        if (!sel || !sel.url) return;
        // Represent the GIF as a client-side file so the normal sendMessage flow
        // (optimistic message + upload + confirm/reconcile) handles it end-to-end.
        var fakeFile = new File([sel.url], 'gif.gif', { type: 'image/gif' });
        fakeFile._gifUrl = sel.url;
        fakeFile._gifPreview = sel.preview;
        attachState.files = [fakeFile];
        if (dom.composerInput) dom.composerInput.textContent = '';
        updateSendButton();
        closeGifPicker();
        sendMessage();
    }

    /* ── Hashtag Autocomplete ─────────────────── */

    /* ── Hashtag Autocomplete ─────────────────── */
    var hashtagState = {
        active: false,
        query: '',
        startIndex: -1,
        selectedIndex: 0,
        suggestions: [],
        fetchTimer: null,
        debounceMs: 150,
        cache: {},
    };

    function cacheDomHashtags() {
        dom.hashtagPanel = $('hashtag-panel');
        dom.hashtagPanelList = $('hashtag-panel-list');
    }

    function getHashtagQuery() {
        var input = dom.composerInput;
        if (!input) return { query: '', index: -1 };
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return { query: '', index: -1 };
        var range = sel.getRangeAt(0);
        var node = range.startContainer;
        if (node.nodeType !== 3) return { query: '', index: -1 };
        var text = node.textContent;
        var cursorPos = range.startOffset;
        var before = text.substring(0, cursorPos);
        var hashIdx = before.lastIndexOf('#');
        if (hashIdx === -1) return { query: '', index: -1 };
        if (hashIdx > 0 && before[hashIdx - 1] !== ' ' && before[hashIdx - 1] !== '\n') {
            return { query: '', index: -1 };
        }
        var query = before.substring(hashIdx + 1);
        if (query.indexOf(' ') !== -1) return { query: '', index: -1 };
        return { query: query, index: hashIdx, node: node };
    }

    function openHashtagPanel(suggestions) {
        if (!dom.hashtagPanel || !dom.hashtagPanelList) return;
        hashtagState.active = true;
        hashtagState.selectedIndex = 0;
        hashtagState.suggestions = suggestions || [];
        renderHashtagList();
        dom.hashtagPanel.style.display = '';
        dom.hashtagPanel.classList.remove('hashtag-panel-exit');
        dom.hashtagPanel.classList.add('hashtag-panel-enter');
        setTimeout(function () {
            dom.hashtagPanel.classList.remove('hashtag-panel-enter');
        }, 200);
        positionHashtagPanel();
    }

    function closeHashtagPanel() {
        if (!dom.hashtagPanel) return;
        hashtagState.active = false;
        hashtagState.query = '';
        hashtagState.suggestions = [];
        hashtagState.startIndex = -1;
        if (hashtagState.fetchTimer) { clearTimeout(hashtagState.fetchTimer); hashtagState.fetchTimer = null; }
        dom.hashtagPanel.classList.add('hashtag-panel-exit');
        setTimeout(function () {
            dom.hashtagPanel.style.display = 'none';
            dom.hashtagPanel.classList.remove('hashtag-panel-exit');
        }, 150);
    }

    function positionHashtagPanel() {
        // Positioning handled by CSS (position: absolute, bottom: calc(100% + 8px))
    }

    function renderHashtagList() {
        if (!dom.hashtagPanelList) return;
        var items = hashtagState.suggestions;
        if (!items || items.length === 0) {
            dom.hashtagPanelList.innerHTML = '<div class="hashtag-panel-empty">No hashtags found</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < items.length; i++) {
            var tag = items[i];
            var isSelected = i === hashtagState.selectedIndex;
            var countLabel = tag.usage_count > 0 ? tag.usage_count + ' messages' : 'New';
            html += '<div class="hashtag-panel-item' + (isSelected ? ' selected' : '') + '" data-index="' + i + '" data-tag="' + escapeHtml(tag.name) + '">' +
                '<span class="hashtag-panel-hash">#</span>' +
                '<span class="hashtag-panel-name">' + escapeHtml(tag.name) + '</span>' +
                '<span class="hashtag-panel-count">' + countLabel + '</span>' +
            '</div>';
        }
        dom.hashtagPanelList.innerHTML = html;

        var items_els = dom.hashtagPanelList.querySelectorAll('.hashtag-panel-item');
        for (var j = 0; j < items_els.length; j++) {
            (function (idx) {
                items_els[idx].addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    hashtagState.selectedIndex = idx;
                    selectHashtag();
                });
                items_els[idx].addEventListener('mouseenter', function () {
                    hashtagState.selectedIndex = idx;
                    highlightHashtagItem(idx);
                });
            })(j);
        }
    }

    function highlightHashtagItem(idx) {
        if (!dom.hashtagPanelList) return;
        var items = dom.hashtagPanelList.querySelectorAll('.hashtag-panel-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle('selected', i === idx);
        }
    }

    function fetchHashtagSuggestions(query) {
        if (hashtagState.fetchTimer) { clearTimeout(hashtagState.fetchTimer); hashtagState.fetchTimer = null; }
        var cacheKey = query || '__trending__';
        if (hashtagState.cache[cacheKey]) {
            openHashtagPanel(hashtagState.cache[cacheKey]);
            return;
        }
        hashtagState.fetchTimer = setTimeout(function () {
            var url;
            if (query && query.length > 0) {
                url = API_BASE + '/api/hashtags/search?q=' + encodeURIComponent(query) + '&limit=8';
            } else {
                url = API_BASE + '/api/hashtags/trending?limit=8';
            }
            var token = HiveAuth.getToken();
            fetch(url, { headers: { 'Authorization': 'Bearer ' + token, 'ngrok-skip-browser-warning': 'true' } })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (!data.success || !data.hashtags) return;
                    var tags = data.hashtags;
                    hashtagState.cache[cacheKey] = tags;
                    if (hashtagState.active) {
                        hashtagState.suggestions = tags;
                        hashtagState.selectedIndex = 0;
                        renderHashtagList();
                    }
                })
                .catch(function () {});
        }, hashtagState.debounceMs);
    }

    function selectHashtag() {
        if (!hashtagState.active || hashtagState.suggestions.length === 0) return;
        var tag = hashtagState.suggestions[hashtagState.selectedIndex];
        if (!tag) return;
        var input = dom.composerInput;
        if (!input) return;
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        var node = range.startContainer;
        if (node.nodeType !== 3) return;
        var text = node.textContent;
        var cursorPos = range.startOffset;
        var before = text.substring(0, cursorPos);
        var hashIdx = before.lastIndexOf('#');
        if (hashIdx === -1) return;
        var afterCursor = text.substring(cursorPos);
        var newText = text.substring(0, hashIdx) + '#' + tag.name + ' ' + afterCursor;
        node.textContent = newText;
        var newCursorPos = hashIdx + tag.name.length + 2;
        range.setStart(node, newCursorPos);
        range.setEnd(node, newCursorPos);
        sel.removeAllRanges();
        sel.addRange(range);
        closeHashtagPanel();
        updateSendButton();
    }

    function handleHashtagInput() {
        var info = getHashtagQuery();
        if (info.query !== '') {
            hashtagState.query = info.query;
            hashtagState.startIndex = info.index;
            if (!hashtagState.active) {
                openHashtagPanel([]);
            }
            fetchHashtagSuggestions(info.query);
        } else if (info.index !== -1 && info.query === '') {
            hashtagState.startIndex = info.index;
            if (!hashtagState.active) {
                openHashtagPanel([]);
            }
            fetchHashtagSuggestions('');
        } else if (hashtagState.active) {
            closeHashtagPanel();
        }
    }

    function handleHashtagKeydown(e) {
        if (!hashtagState.active) return false;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            hashtagState.selectedIndex = Math.min(hashtagState.selectedIndex + 1, hashtagState.suggestions.length - 1);
            highlightHashtagItem(hashtagState.selectedIndex);
            return true;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            hashtagState.selectedIndex = Math.max(hashtagState.selectedIndex - 1, 0);
            highlightHashtagItem(hashtagState.selectedIndex);
            return true;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            if (hashtagState.suggestions.length === 0) return false;
            e.preventDefault();
            selectHashtag();
            return true;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            closeHashtagPanel();
            return true;
        }
        return false;
    }

    /* ── Attachment System ─────────────────────── */
    var attachState = {
        files: [],
    };

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function getMediaType(file) {
        if (!file) return 'file';
        var mime = file.type || '';
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        if (mime.startsWith('audio/')) return 'audio';
        return 'file';
    }

    function initAttachmentSystem() {
        var attachBtn = $('attach-btn');
        var attachMenu = $('attach-menu');
        var fileInput = $('attach-file-input');
        var previewEl = $('attach-preview');
        var previewInner = $('attach-preview-inner');
        var previewRemove = $('attach-preview-remove');

        if (!attachBtn || !attachMenu || !fileInput) return;

        fileInput.setAttribute('multiple', 'multiple');

        attachBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = attachMenu.style.display !== 'none';
            attachMenu.style.display = isOpen ? 'none' : '';
            if (!isOpen) {
                var rect = attachBtn.getBoundingClientRect();
                attachMenu.style.left = rect.left + 'px';
                attachMenu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            }
        });

        document.addEventListener('click', function(e) {
            if (!attachMenu.contains(e.target) && e.target !== attachBtn && !attachBtn.contains(e.target)) {
                attachMenu.style.display = 'none';
            }
        });

        attachMenu.querySelectorAll('.attach-menu-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var type = item.getAttribute('data-type');
                attachMenu.style.display = 'none';
                if (type === 'image') fileInput.accept = 'image/*';
                else if (type === 'video') fileInput.accept = 'video/*';
                else if (type === 'audio') fileInput.accept = 'audio/*';
                else fileInput.accept = 'image/*,video/*,audio/*';
                fileInput.value = '';
                fileInput.click();
            });
        });

        fileInput.addEventListener('change', function() {
            if (!fileInput.files || !fileInput.files.length) return;
            for (var i = 0; i < fileInput.files.length; i++) {
                if (attachState.files.length >= 10) break;
                attachState.files.push(fileInput.files[i]);
            }
            fileInput.value = '';
            rebuildAttachPreview();
        });

        if (previewRemove) {
            previewRemove.addEventListener('click', function() {
                clearAttachment();
            });
        }
    }

    function rebuildAttachPreview() {
        var inner = '';
        for (var i = 0; i < attachState.files.length; i++) {
            inner += renderAttachPreviewItem(attachState.files[i], i);
        }
        if (attachState.files.length === 0) {
            clearAttachment();
            return;
        }
        var countBadge = attachState.files.length > 1
            ? '<span class="attach-prev-count">' + attachState.files.length + ' files</span>'
            : '';
        showAttachPreview('<div class="attach-prev-grid">' + inner + '</div>' + countBadge);
    }

    function renderAttachPreviewItem(file, index) {
        var mediaType = getMediaType(file);
        var removeBtn = '<button class="attach-prev-remove-btn" data-idx="' + index + '" aria-label="Remove">' +
            '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>';

        if (mediaType === 'image') {
            var url = URL.createObjectURL(file);
            return '<div class="attach-prev-card" data-idx="' + index + '">' +
                '<img src="' + url + '" alt="Preview" class="attach-prev-card-img">' +
                removeBtn +
            '</div>';
        }
        if (mediaType === 'video') {
            var vurl = URL.createObjectURL(file);
            return '<div class="attach-prev-card attach-prev-card-vid" data-idx="' + index + '">' +
                '<video src="' + vurl + '" class="attach-prev-card-vid-el" preload="metadata"></video>' +
                '<div class="attach-prev-card-play">' +
                    '<svg viewBox="0 0 24 24" width="20" height="20" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>' +
                '</div>' +
                '<span class="attach-prev-card-dur" data-dur-idx="' + index + '">...</span>' +
                removeBtn +
            '</div>';
        }
        if (mediaType === 'audio') {
            return '<div class="attach-prev-card attach-prev-card-audio" data-idx="' + index + '">' +
                '<div class="attach-prev-card-audio-icon">' +
                    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
                '</div>' +
                '<span class="attach-prev-card-name">' + esc(file.name) + '</span>' +
                removeBtn +
            '</div>';
        }
        return '<div class="attach-prev-card attach-prev-card-file" data-idx="' + index + '">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            '<span class="attach-prev-card-name">' + esc(file.name) + '</span>' +
            removeBtn +
        '</div>';
    }

    function removeAttachFile(index) {
        attachState.files.splice(index, 1);
        if (attachState.files.length === 0) {
            clearAttachment();
        } else {
            rebuildAttachPreview();
        }
        updateSendButton();
    }

    function showAttachPreview(html) {
        var previewEl = $('attach-preview');
        var previewInner = $('attach-preview-inner');
        var composerWrapper = document.querySelector('.composer-wrapper');
        if (previewEl && previewInner) {
            previewInner.innerHTML = html;
            previewEl.style.display = '';
            previewEl.classList.add('attach-preview-enter');
            if (composerWrapper) composerWrapper.classList.add('has-attach');
            setTimeout(function() { previewEl.classList.remove('attach-preview-enter'); }, 300);
            previewInner.querySelectorAll('.attach-prev-remove-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var idx = parseInt(btn.getAttribute('data-idx'), 10);
                    if (!isNaN(idx)) removeAttachFile(idx);
                });
            });
            previewInner.querySelectorAll('.attach-prev-card-vid-el').forEach(function(vid) {
                vid.addEventListener('loadedmetadata', function() {
                    var idx = vid.closest('.attach-prev-card').getAttribute('data-idx');
                    var durEl = previewInner.querySelector('[data-dur-idx="' + idx + '"]');
                    if (durEl) durEl.textContent = formatDuration(vid.duration);
                });
            });
        }
    }

    function clearAttachment() {
        attachState.files = [];
        var previewEl = $('attach-preview');
        var previewInner = $('attach-preview-inner');
        var fileInput = $('attach-file-input');
        var composerWrapper = document.querySelector('.composer-wrapper');
        if (previewInner) previewInner.innerHTML = '';
        if (previewEl) previewEl.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (composerWrapper) composerWrapper.classList.remove('has-attach');
        updateSendButton();
    }

    function initLightbox() {
        var lightbox = $('lightbox');
        var lightboxImg = $('lightbox-img');
        var lightboxClose = $('lightbox-close');
        var lightboxContent = $('lightbox-content');
        if (!lightbox) return;

        function openLightbox(url) {
            if (!lightboxImg || !lightbox) return;
            lightboxImg.src = url;
            lightbox.style.display = '';
            lightbox.classList.add('lb-enter');
            document.body.style.overflow = 'hidden';
            setTimeout(function() { lightbox.classList.remove('lb-enter'); }, 300);
        }

        function closeLightbox() {
            if (!lightbox) return;
            lightbox.classList.add('lb-exit');
            setTimeout(function() {
                lightbox.style.display = 'none';
                lightbox.classList.remove('lb-exit');
                if (lightboxImg) lightboxImg.src = '';
                document.body.style.overflow = '';
            }, 250);
        }

        document.addEventListener('click', function(e) {
            var imgBtn = e.target.closest('.msg-img-open');
            if (imgBtn) {
                e.stopPropagation();
                var url = imgBtn.getAttribute('data-lightbox-url');
                if (!url) {
                    var wrap = imgBtn.closest('.msg-img-wrap');
                    if (wrap) {
                        var img = wrap.querySelector('img');
                        if (img) url = img.src;
                    }
                }
                if (url) openLightbox(url);
                return;
            }
            var wrapClick = e.target.closest('.msg-img-wrap');
            if (wrapClick && !e.target.closest('.msg-img-open')) {
                e.stopPropagation();
                var img = wrapClick.querySelector('img');
                if (img && img.src) openLightbox(img.src);
                return;
            }
        });

        if (lightboxClose) {
            lightboxClose.addEventListener('click', function(e) {
                e.stopPropagation();
                closeLightbox();
            });
        }

        if (lightboxContent) {
            lightboxContent.addEventListener('click', function(e) {
                if (e.target === lightboxContent) closeLightbox();
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lightbox.style.display !== 'none') {
                closeLightbox();
            }
        });
    }

    function formatDuration(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function uploadAttachmentToR2(file, cb, onProgress) {
        // GIF picked from the picker is sent directly (it's already a remote URL)
        if (file && file._gifUrl) {
            var gifAtt = {
                attachment_type: 'image',
                attachment_url: file._gifUrl,
                attachment_key: '',
                attachment_name: 'gif.gif',
                attachment_size: 0,
                mime_type: 'image/gif',
                attachment_width: null,
                attachment_height: null,
                attachment_duration: null,
                thumbnail_url: null,
            };
            if (onProgress) onProgress(100);
            cb(gifAtt);
            return;
        }
        var formData = new FormData();
        formData.append('file', file);
        var token = HiveAuth.getToken();
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE + '/api/upload/attachment', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });
        xhr.addEventListener('load', function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.success) cb(data);
                else cb(null);
            } catch(err) { cb(null); }
        });
        xhr.addEventListener('error', function() { cb(null); });
        xhr.send(formData);
    }

    /* ── Optimistic Send ─────────────────────── */
    function getComposerText() {
        var input = dom.composerInput;
        if (!input) return '';
        // Walk through child nodes to extract text and emoji identifiers
        var text = '';
        function walk(node) {
            if (node.nodeType === 3) {
                text += node.textContent;
            } else if (node.nodeType === 1) {
                if (node.classList && node.classList.contains('hive-emoji-composed')) {
                    text += node.getAttribute('data-id') || '';
                } else {
                    for (var i = 0; i < node.childNodes.length; i++) {
                        walk(node.childNodes[i]);
                    }
                }
            }
        }
        walk(input);
        return text.trim();
    }

    function sendMessage() {
        var isDm = !!state.currentDmConversation;
        var isCommunity = !!state.currentCommunity;
        if (!isDm && !isCommunity) return;
        if (!isDm && state.isMuted) return;
        if (!isDm && state.chatRestricted) { showToast('Chat is restricted in this community'); return; }
        if (isDm && state.beeLimitReached) { showToast("You've reached today's Bee limit. Come back tomorrow or upgrade to Premium!", 'error'); return; }
        var input = dom.composerInput;
        if (!input) return;
        var text = getComposerText();
        var hasAttach = attachState.files.length > 0;
        if (!text && !hasAttach) return;
        if (text.length > 2000) return;

        var replyTo = state.replyingTo;
        var pendingFiles = attachState.files.slice();
        cancelReply();

        input.textContent = '';
        updateSendButton();
        closeHashtagPanel();
        emitTypingStop();
        if (state.typingTimeout) { clearTimeout(state.typingTimeout); state.typingTimeout = null; }

        var clientId = generateClientId();
        var tempId = generateTempId();
        var user = state.user || {};
        var optimisticMsg = {
            id: tempId,
            clientId: clientId,
            community_id: isCommunity ? state.currentCommunity.id : null,
            conversation_id: isDm ? state.currentDmConversation : null,
            sender_id: user.id,
            username: user.username || 'You',
            profile_picture: user.profile_picture || null,
            rank: user.rank || null,
            message: text,
            created_at: new Date().toISOString(),
            edited_at: null,
            _temp: true,
            reply_to_id: replyTo ? replyTo.id : null,
            reply_to_message: replyTo ? replyTo.message : null,
            reply_to_username: replyTo ? replyTo.username : null,
            reply_to_profile_picture: replyTo ? replyTo.profile_picture : null,
        };

        if (pendingFiles.length > 0) {
            optimisticMsg._pendingUpload = true;
            optimisticMsg._pendingFiles = pendingFiles;
            optimisticMsg._pendingAttachments = pendingFiles.map(function(f) {
                return {
                    type: getMediaType(f),
                    name: f.name,
                    size: f.size,
                    local_url: URL.createObjectURL(f),
                };
            });
        }

        state.pendingMessages[clientId] = optimisticMsg;

        var container = dom.chatMessagesInner;
        if (container) {
            var lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
            if (lastMsg) {
                var lastDate = new Date(lastMsg.created_at).toDateString();
                var msgDate = new Date(optimisticMsg.created_at).toDateString();
                if (lastDate !== msgDate) {
                    container.appendChild(createDateDivider(optimisticMsg.created_at));
                }
            }
            var el = createOptimisticElement(optimisticMsg);
            el.setAttribute('data-client-id', clientId);
            container.appendChild(el);
            scrollToBottom(true);
        }

        function doSend(attachmentsArr) {
            var body = {};
            if (isDm) {
                body = { message: text };
                if (replyTo && replyTo.id) body.replyToMessageId = replyTo.id;
                if (attachmentsArr.length === 1) {
                    body.attachment = attachmentsArr[0];
                } else if (attachmentsArr.length > 1) {
                    body.attachments = attachmentsArr;
                }
                apiPost('/api/dm/' + state.currentDmConversation + '/messages', body)
                    .then(function (data) {
                        var confirmed = data.msg;
                        if (confirmed) {
                            state.reconciledIds[clientId] = true;
                            reconcilePending(clientId, confirmed);
                        } else {
                            delete state.pendingMessages[clientId];
                        }
                    })
                    .catch(function (err) {
                        console.error('[HIVE] Failed to send DM:', err);
                        markMessageFailed(clientId, text);
                    });
            } else {
                body = {
                    communityId: state.currentCommunity.id,
                    message: text,
                    clientId: clientId,
                };
                if (replyTo && replyTo.id) body.replyToMessageId = replyTo.id;
                if (attachmentsArr.length === 1) {
                    body.attachment = attachmentsArr[0];
                } else if (attachmentsArr.length > 1) {
                    body.attachments = attachmentsArr;
                }
                apiPost('/api/messages', body)
                    .then(function (data) {
                        var confirmed = data.msg;
                        if (confirmed) {
                            state.reconciledIds[clientId] = true;
                            reconcilePending(clientId, confirmed);
                        } else {
                            delete state.pendingMessages[clientId];
                        }
                    })
                    .catch(function (err) {
                        console.error('[HIVE] Failed to send message:', err);
                        markMessageFailed(clientId, text);
            });
        }

        /* Bio input */
        var bioInput = $('rpanel-bio-input');
        if (bioInput) {
            autoResizeBio(bioInput);
            bioInput.addEventListener('input', function() {
                var val = bioInput.value;
                if (val !== editFormState.bio) {
                    editFormState.bio = val;
                    markDirty();
                    updateEditPreview();
                }
            });
        }
    }

        if (pendingFiles.length > 0) {
            clearAttachment();
            var CIRCUMFERENCE = 2 * Math.PI * 28;
            var el = dom.chatMessagesInner ? dom.chatMessagesInner.querySelector('[data-client-id="' + clientId + '"]') : null;
            var rings = el ? el.querySelectorAll('.msg-upload-ring-circle') : [];
            var pcts = el ? el.querySelectorAll('.msg-upload-pct') : [];
            rings.forEach(function(c) {
                c.style.strokeDasharray = CIRCUMFERENCE;
                c.style.strokeDashoffset = CIRCUMFERENCE;
            });

            var completedCount = 0;
            var totalFiles = pendingFiles.length;
            var attResults = [];
            var allFailed = true;

            pendingFiles.forEach(function(file, i) {
                uploadAttachmentToR2(file, function(attData) {
                    completedCount++;
                    if (attData) {
                        allFailed = false;
                        attResults[i] = {
                            attachment_type: attData.attachment_type,
                            attachment_url: attData.attachment_url,
                            attachment_key: attData.attachment_key,
                            attachment_name: attData.attachment_name,
                            attachment_size: attData.attachment_size,
                            mime_type: attData.mime_type,
                            attachment_width: attData.attachment_width,
                            attachment_height: attData.attachment_height,
                            attachment_duration: attData.attachment_duration,
                            thumbnail_url: attData.thumbnail_url,
                        };
                    } else {
                        attResults[i] = null;
                    }
                    if (completedCount === totalFiles) {
                        var validAtts = attResults.filter(function(a) { return a !== null && a !== undefined; });
                        if (validAtts.length > 0) {
                            doSend(validAtts);
                        } else {
                            markMessageFailed(clientId, text);
                            showToast('Failed to upload attachments', 'error');
                        }
                    }
                }, function(pct) {
                    if (rings[i]) {
                        var offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
                        rings[i].style.strokeDashoffset = offset;
                    }
                    if (pcts[i]) pcts[i].textContent = pct + '%';
                });
            });
        } else {
            clearAttachment();
            doSend([]);
        }
    }

    function renderAttachmentHtml(msg) {
        var atts = msg.attachments;
        if (atts && Array.isArray(atts) && atts.length > 0) {
            var cardsHtml = '';
            for (var i = 0; i < atts.length; i++) {
                cardsHtml += renderSingleAttachmentHtml(atts[i], i);
            }
            var gridClass = atts.length > 1 ? ' msg-attach-grid msg-grid-' + Math.min(atts.length, 4) : '';
            return '<div class="msg-attach' + gridClass + '">' + cardsHtml + '</div>';
        }
        return renderSingleAttachmentHtml(msg, 0);
    }

    function renderSingleAttachmentHtml(att, idx) {
        var type = att.attachment_type;
        if (!type || !att.attachment_url) return '';
        var url = att.attachment_url;
        var name = att.attachment_name || '';
        var size = att.attachment_size || 0;
        var mime = att.mime_type || '';
        var duration = att.attachment_duration;
        var gradId = 'ug' + idx + '_' + Math.random().toString(36).slice(2,6);

        if (type === 'image') {
            var isGif = mime === 'image/gif' || /\.gif($|\?)/i.test(url);
            var gifClass = isGif ? ' msg-gif' : '';
            return '<div class="msg-att msg-att-image' + gifClass + '">' +
                '<div class="msg-img-wrap">' +
                    '<img src="' + escapeHtml(url) + '" alt="' + esc(name) + '" class="msg-attach-img" loading="lazy">' +
                    '<button class="msg-img-open" data-lightbox-url="' + escapeHtml(url) + '" aria-label="Open full image">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }
        if (type === 'video') {
            var durStr = duration ? formatDuration(duration) : '';
            return '<div class="msg-att msg-att-video">' +
                '<div class="msg-vid-player" data-src="' + escapeHtml(url) + '" data-mime="' + esc(mime) + '">' +
                    '<video class="msg-vid-el" preload="metadata" playsinline>' +
                        '<source src="' + escapeHtml(url) + '" type="' + esc(mime) + '">' +
                    '</video>' +
                    '<div class="msg-vid-overlay">' +
                        '<button class="msg-vid-play" aria-label="Play">' +
                            '<svg viewBox="0 0 24 24" width="36" height="36" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="msg-vid-controls">' +
                        '<button class="msg-vid-ctrl-play" aria-label="Play/Pause">' +
                            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
                        '</button>' +
                        '<div class="msg-vid-seek">' +
                            '<div class="msg-vid-seek-bar"><div class="msg-vid-seek-fill"></div></div>' +
                        '</div>' +
                        '<span class="msg-vid-time">0:00 / ' + (durStr || '0:00') + '</span>' +
                        '<button class="msg-vid-ctrl-vol" aria-label="Mute">' +
                            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
                        '</button>' +
                        '<button class="msg-vid-ctrl-fs" aria-label="Fullscreen">' +
                            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }
        if (type === 'audio') {
            var aDurStr = duration ? formatDuration(duration) : '';
            return '<div class="msg-att msg-att-audio">' +
                '<div class="msg-audio-player" data-src="' + escapeHtml(url) + '">' +
                    '<button class="msg-audio-play" aria-label="Play">' +
                        '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
                    '</button>' +
                    '<div class="msg-audio-info">' +
                        '<span class="msg-audio-filename">' + esc(name) + '</span>' +
                        '<div class="msg-audio-wave">' +
                            '<div class="msg-audio-track">' +
                                '<div class="msg-audio-progress"></div>' +
                            '</div>' +
                            '<span class="msg-audio-time">' + (aDurStr || '0:00') + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }
        return '<div class="msg-att msg-att-file">' +
            '<div class="msg-file-icon">' +
                '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            '</div>' +
            '<div class="msg-file-info">' +
                '<span class="msg-attach-file-name">' + esc(name) + '</span>' +
                '<span class="msg-attach-file-size">' + formatFileSize(size) + '</span>' +
            '</div>' +
        '</div>';
    }

    function createOptimisticElement(msg) {
        var el = document.createElement('div');
        var hasReply = msg.reply_to_id && msg.reply_to_message;
        el.className = 'chat-message msg-enter' + (hasReply ? ' has-reply' : '');
        el.setAttribute('data-msg-id', msg.id);
        el.setAttribute('data-sender-id', msg.sender_id || msg.user_id || '');
        var avatarUrl = getAvatarUrl(msg);

        var replyHtml = '';
        if (hasReply) {
            var replyAvatar = msg.reply_to_profile_picture || ('https://i.pravatar.cc/80?u=' + (msg.reply_to_username || 'reply'));
            var replyText = msg.reply_to_message || '';
            if (replyText.length > 120) replyText = replyText.substring(0, 120) + '...';
            var replyTime = msg.reply_to_created_at ? formatTime(msg.reply_to_created_at) : '';
            var replyRank = msg.reply_to_rank || null;
            var replyAccent = getReplyAccentColor(msg.reply_to_sender_id || msg.reply_to_id);
            var replyFont = msg.reply_to_profile_font || '';
            var replyFontStyle = replyFont ? 'font-family:\'' + escapeHtml(replyFont) + '\',sans-serif;' : '';
            replyHtml =
                '<div class="msg-reply" data-reply-to="' + escapeHtml(msg.reply_to_id) + '" style="--reply-accent:' + replyAccent + '">' +
                    '<div class="msg-reply-accent"></div>' +
                    '<div class="msg-reply-body">' +
                        '<div class="msg-reply-header">' +
                            '<img class="msg-reply-avatar" src="' + escapeHtml(replyAvatar) + '" alt="" loading="lazy">' +
                            '<span class="msg-reply-user" style="color:' + replyAccent + ';' + replyFontStyle + '">' + escapeHtml(msg.reply_to_username) + createRankBadgeHtml(replyRank, 'rank-badge-sm') + '</span>' +
                            '<span class="msg-reply-time">' + escapeHtml(replyTime) + '</span>' +
                            '<svg class="msg-reply-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + replyAccent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>' +
                        '</div>' +
                        '<div class="msg-reply-text">' + escapeHtml(replyText) + '</div>' +
                    '</div>' +
                '</div>';
        }

        var attachHtml = '';
        if (msg._pendingUpload && msg._pendingAttachments) {
            var atts = msg._pendingAttachments;
            var cardsHtml = '';
            for (var i = 0; i < atts.length; i++) {
                var a = atts[i];
                var mediaHtml = '';
                if (a.type === 'image' && a.local_url) {
                    mediaHtml = '<img src="' + a.local_url + '" class="msg-pend-card-img" alt="Uploading...">';
                } else if (a.type === 'video' && a.local_url) {
                    mediaHtml = '<video class="msg-pend-card-vid" preload="metadata" src="' + a.local_url + '"></video>' +
                        '<div class="msg-pend-card-play"><svg viewBox="0 0 24 24" width="20" height="20" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg></div>';
                } else if (a.type === 'audio') {
                    mediaHtml = '<div class="msg-pend-card-audio">' +
                        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
                    '</div>';
                } else {
                    mediaHtml = '<div class="msg-pend-card-file">' +
                        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '</div>';
                }
                cardsHtml +=
                    '<div class="msg-pend-card">' +
                        '<div class="msg-pend-media">' + mediaHtml + '</div>' +
                        '<div class="msg-upload-overlay">' +
                            '<svg class="msg-upload-ring" viewBox="0 0 64 64" width="56" height="56">' +
                                '<circle class="msg-upload-ring-bg" cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>' +
                                '<circle class="msg-upload-ring-circle" cx="32" cy="32" r="28" fill="none" stroke="url(#uploadGrad' + i + ')" stroke-width="4" stroke-linecap="round" transform="rotate(-90 32 32)"/>' +
                                '<defs><linearGradient id="uploadGrad' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#00E5FF"/></linearGradient></defs>' +
                            '</svg>' +
                            '<span class="msg-upload-pct">0%</span>' +
                        '</div>' +
                    '</div>';
            }
            var gridClass = atts.length > 1 ? ' msg-attach-grid msg-grid-' + Math.min(atts.length, 4) : '';
            attachHtml = '<div class="msg-attach msg-attach-pending' + gridClass + '">' + cardsHtml + '</div>';
        } else {
            attachHtml = renderAttachmentHtml(msg);
        }

        // Username color: explicit username_color wins, otherwise fall back to the rank color
        var optUsernameColor = msg.username_color ? 'color:' + escapeHtml(msg.username_color) : 'color:' + getRankColor(msg.rank);
        var optFontStyle = msg.profile_font ? 'font-family:\'' + escapeHtml(msg.profile_font) + '\',sans-serif' : '';
        var optCombinedStyle = (optUsernameColor || optFontStyle) ? ' style="' + optUsernameColor + (optUsernameColor && optFontStyle ? ';' : '') + optFontStyle + '"' : '';
        var optTextColor = msg.chat_text_color ? 'color:' + escapeHtml(msg.chat_text_color) : '';
        var optTextFont = msg.chat_text_font ? 'font-family:\'' + escapeHtml(msg.chat_text_font) + '\',sans-serif' : '';
        var textColorStyle = (optTextColor || optTextFont) ? ' style="' + optTextColor + (optTextColor && optTextFont ? ';' : '') + optTextFont + '"' : '';

        var optRingClass = msg.profile_ring && msg.profile_ring !== 'none' ? msg.profile_ring : '';

        el.innerHTML =
            '<div class="msg-avatar-wrap' + (optRingClass ? ' ' + optRingClass : '') + '"><img class="msg-avatar" src="' + escapeHtml(avatarUrl) + '" alt="' + escapeHtml(msg.username) + '" loading="lazy"></div>' +
            '<div class="msg-body">' +
                '<div class="msg-header">' +
                    '<span class="msg-username' + (msg.rank ? ' rank-' + msg.rank : '') + '"' + optCombinedStyle + '>' + escapeHtml(msg.username) + createRankBadgeHtml(msg.rank) + '</span>' +
                    '<span class="msg-timestamp">Just now</span>' +
                '</div>' +
                replyHtml +
                attachHtml +
                (msg.message ? '<div class="msg-content"' + textColorStyle + '>' + renderMessageText(msg.message) + '</div>' : '') +
            '</div>';
        return el;
    }

    function reconcilePending(clientId, serverMsg) {
        var el = dom.chatMessagesInner ? dom.chatMessagesInner.querySelector('[data-client-id="' + clientId + '"]') : null;
        if (!el) {
            delete state.pendingMessages[clientId];
            return;
        }
        var tempId = el.getAttribute('data-msg-id');
        el.removeAttribute('data-client-id');
        el.setAttribute('data-msg-id', serverMsg.id);
        for (var i = 0; i < state.messages.length; i++) {
            if (state.messages[i].id === tempId) {
                state.messages[i] = serverMsg;
                break;
            }
        }
        var newEl = createMessageElement(serverMsg, false);
        el.parentNode.replaceChild(newEl, el);
        delete state.pendingMessages[clientId];
    }

    function markMessageFailed(clientId, originalText) {
        var el = dom.chatMessagesInner ? dom.chatMessagesInner.querySelector('[data-client-id="' + clientId + '"]') : null;
        delete state.pendingMessages[clientId];
        if (!el) return;
        el.classList.add('failed');

        var body = el.querySelector('.msg-body');
        if (body) {
            var content = body.querySelector('.msg-content');
            if (content) content.style.opacity = '0.5';
            var tempId = el.getAttribute('data-msg-id');
            var retryDiv = document.createElement('div');
            retryDiv.innerHTML =
                '<button class="msg-retry-btn">' +
                    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' +
                    ' Retry' +
                '</button>';
            body.appendChild(retryDiv);
            retryDiv.querySelector('.msg-retry-btn').addEventListener('click', function () {
                el.remove();
                for (var i = 0; i < state.messages.length; i++) {
                    if (state.messages[i].id === tempId) {
                        state.messages.splice(i, 1);
                        break;
                    }
                }
                dom.composerInput.textContent = originalText;
                updateSendButton();
                sendMessage();
            });
        }
    }

    function updateSendButton() {
        var input = dom.composerInput;
        var btn = dom.sendBtn;
        if (!input || !btn) return;
        var hasText = input.textContent.trim().length > 0;
        var hasAttach = attachState.files.length > 0;
        if (hasText || hasAttach) {
            btn.classList.add('has-text');
        } else {
            btn.classList.remove('has-text');
        }
    }

    /* ── Warning Toast ────────────────────────── */
    function showWarningToast(reason) {
        var toast = document.createElement('div');
        toast.className = 'ai-warning-toast';
        toast.innerHTML =
            '<div class="ai-warning-icon">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFB347" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
            '</div>' +
            '<span class="ai-warning-text">' + escapeHtml(reason) + '</span>';
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('toast-out');
            setTimeout(function () { toast.remove(); }, 300);
        }, 4000);
    }

    /* ── Socket.IO ───────────────────────────── */
    function connectSocket() {
        var token = window.HiveAuth.getToken();
        if (!token) return;

        var socket = io(SOCKET_URL, {
            auth: { token: token },
            transports: ['websocket', 'polling'],
            extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
        });

        socket.on('connect', function () {
            console.log('[HIVE] Socket connected');
            if (state.currentCommunity) {
                joinRoom(state.currentCommunity.id);
            }
            // Request presence init from server
            socket.emit('presence:init');
            // Start heartbeat on connect
            startHeartbeat();
        });

        socket.on('connect_error', function (err) {
            console.error('[HIVE] Socket error:', err.message);
            // If auth error — mark offline, disconnect, logout
            if (err.message && (err.message.indexOf('Authentication') !== -1 || err.message.indexOf('Invalid or expired') !== -1)) {
                // Try to mark offline via API before logout
                if (state.socket && state.socket.connected) {
                    state.socket.disconnect();
                }
                stopHeartbeat();
                window.HiveAuth.logout();
            }
        });

        socket.on('message:new', function (msg) {
            if (!state.currentCommunity) return;
            if (msg.community_id !== state.currentCommunity.id) return;

            // Hide AI typing when a bot message arrives
            if (msg.is_bot) {
                hideAITyping();
            }

            // 1. If this message has a clientId matching one of our pending optimistic messages, reconcile it
            if (msg.clientId && state.pendingMessages[msg.clientId]) {
                state.reconciledIds[msg.clientId] = true;
                reconcilePending(msg.clientId, msg);
                return;
            }

            // 2. If this clientId was already reconciled via API response, ignore the duplicate socket delivery
            if (msg.clientId && state.reconciledIds[msg.clientId]) {
                return;
            }

            // 3. Dedup by real DB id — already in our list, skip
            for (var i = 0; i < state.messages.length; i++) {
                if (state.messages[i].id === msg.id) return;
            }

            // 4. New message from another user — append it
            appendMessage(msg);
        });

        // ── Appearance update (real-time color + font change) ─
        // Look up the sender's current rank (from in-memory state) so username_color
        // can fall back to the rank color when unset — matching createMessageElement.
        function rankFromSender(userId) {
            var rank = null;
            for (var i = 0; i < state.messages.length; i++) {
                if ((state.messages[i].sender_id || state.messages[i].user_id) == userId) {
                    rank = state.messages[i].rank;
                    break;
                }
            }
            if (!rank) {
                var m = state.members.get(userId);
                rank = m ? m.rank : null;
            }
            return rank || null;
        }

        socket.on('user:appearance_updated', function (data) {
            if (!data || !data.userId) return;
            var selector = '#chat-messages-inner [data-msg-id]';
            var allMsgEls = dom.chatMessagesInner ? dom.chatMessagesInner.querySelectorAll(selector) : [];
            for (var i = 0; i < allMsgEls.length; i++) {
                var el = allMsgEls[i];
                var senderId = el.getAttribute('data-sender-id');
                if (senderId !== data.userId) continue;
                var usernameEl = el.querySelector('.msg-username');
                if (usernameEl) {
                    if (data.username_color !== null && data.username_color !== undefined) {
                        usernameEl.style.color = data.username_color || getRankColor(rankFromSender(data.userId));
                    } else {
                        usernameEl.style.color = getRankColor(rankFromSender(data.userId));
                    }
                    if (data.profile_font !== null && data.profile_font !== undefined) {
                        usernameEl.style.fontFamily = data.profile_font ? "'" + data.profile_font + "', sans-serif" : '';
                    } else {
                        usernameEl.style.fontFamily = '';
                    }
                }
                var contentEl = el.querySelector('.msg-content');
                if (contentEl) {
                    if (data.chat_text_color !== null && data.chat_text_color !== undefined) {
                        contentEl.style.color = data.chat_text_color || '';
                    } else {
                        contentEl.style.color = '';
                    }
                    if (data.chat_text_font !== null && data.chat_text_font !== undefined) {
                        contentEl.style.fontFamily = data.chat_text_font ? "'" + data.chat_text_font + "', sans-serif" : '';
                    } else {
                        contentEl.style.fontFamily = '';
                    }
                }
                var avatarWrap = el.querySelector('.msg-avatar-wrap');
                if (avatarWrap) {
                    if (data.profile_ring !== null && data.profile_ring !== undefined) {
                        var ringClasses = avatarWrap.className.split(' ').filter(function (c) { return c.indexOf('ring_') !== 0 && c !== 'msg-avatar-wrap'; });
                        if (data.profile_ring && data.profile_ring !== 'none') {
                            ringClasses.push('msg-avatar-wrap', data.profile_ring);
                        } else {
                            ringClasses.push('msg-avatar-wrap');
                        }
                        avatarWrap.className = ringClasses.join(' ');
                    } else {
                        avatarWrap.className = 'msg-avatar-wrap';
                    }
                }
            }
            // Update messages in state too
            for (var i = 0; i < state.messages.length; i++) {
                var m = state.messages[i];
                if ((m.sender_id || m.user_id) == data.userId) {
                    if (data.chat_text_color !== null && data.chat_text_color !== undefined) m.chat_text_color = data.chat_text_color;
                    if (data.chat_text_font !== null && data.chat_text_font !== undefined) m.chat_text_font = data.chat_text_font;
                    if (data.username_color !== null && data.username_color !== undefined) m.username_color = data.username_color;
                    if (data.profile_font !== null && data.profile_font !== undefined) m.profile_font = data.profile_font;
                    if (data.profile_ring !== null && data.profile_ring !== undefined) m.profile_ring = data.profile_ring;
                    if (data.profile_effect !== null && data.profile_effect !== undefined) m.profile_effect = data.profile_effect;
                }
            }
            // Update pending messages
            for (var clientId in state.pendingMessages) {
                var pm = state.pendingMessages[clientId];
                if (pm && (pm.sender_id || pm.user_id) == data.userId) {
                    if (data.chat_text_color !== null && data.chat_text_color !== undefined) pm.chat_text_color = data.chat_text_color;
                    if (data.chat_text_font !== null && data.chat_text_font !== undefined) pm.chat_text_font = data.chat_text_font;
                    if (data.username_color !== null && data.username_color !== undefined) pm.username_color = data.username_color;
                    if (data.profile_font !== null && data.profile_font !== undefined) pm.profile_font = data.profile_font;
                    if (data.profile_ring !== null && data.profile_ring !== undefined) pm.profile_ring = data.profile_ring;
                    if (data.profile_effect !== null && data.profile_effect !== undefined) pm.profile_effect = data.profile_effect;
                }
            }
        });

        // ── Presence events ────────────────────────────
        socket.on('presence:self', function (data) {
            if (!data || !data.userId) return;
            // Add self to home presence so logged-in user appears in their own online list
            addMemberToHomeOnlineList(data);
        });

        socket.on('user_online', function (data) {
            if (!data || !data.userId) return;
            // Update chat sidebar (per community)
            var existing = state.members.get(data.userId);
            if (existing) {
                existing.online = true;
                existing.last_seen = data.last_seen || new Date().toISOString();
                existing.profile_picture = data.profile_picture || existing.profile_picture;
                existing.rank = data.rank || existing.rank;
                existing.is_bot = data.is_bot || existing.is_bot;
                existing.is_verified = data.is_verified !== undefined ? data.is_verified : existing.is_verified;
                existing.display_name = data.display_name || existing.display_name;
                existing.status = data.status || existing.status;
            } else {
                state.members.set(data.userId, {
                    id: data.userId,
                    username: data.username,
                    display_name: data.display_name,
                    profile_picture: data.profile_picture,
                    rank: data.rank,
                    online: true,
                    is_bot: data.is_bot || false,
                    is_verified: data.is_verified || false,
                    status: data.status || '',
                    last_seen: data.last_seen || new Date().toISOString(),
                });
            }
            addMemberToOnlineList(state.members.get(data.userId));

            // Update home sidebar (all communities)
            addMemberToHomeOnlineList(data);

            // Update friends panel
            updateFriendPresence(data.userId, true);
        });

        socket.on('user_offline', function (data) {
            if (!data || !data.userId) return;
            // Update chat sidebar
            removeMemberFromOnlineList(data.userId);
            // Update home sidebar
            removeMemberFromHomeOnlineList(data.userId);
            // Update friends panel
            updateFriendPresence(data.userId, false);
        });

        socket.on('presence_updated', function (data) {
            if (!data || !data.userId) return;
            var member = state.members.get(data.userId);
            if (member) {
                if (data.online !== undefined) member.online = data.online;
                if (data.last_seen) member.last_seen = data.last_seen;
                if (data.username) member.username = data.username;
                if (data.profile_picture) member.profile_picture = data.profile_picture;
                if (data.rank) member.rank = data.rank;
            }
            // Re-render sidebar to reflect changes
            renderPresenceSidebar();
        });

        socket.on('community_online_count_updated', function (data) {
            if (!data || !data.communityId) return;
            updateCommunityOnlineCount(data.communityId, data.onlineCount || 0);
        });

        // ── Typing indicators ────────────────────────────
        socket.on('typing:update', function (data) {
            if (!data || !data.communityId) return;
            if (state.currentCommunity && data.communityId === state.currentCommunity.id) {
                state.typingUsers = data.typingUsers || [];
                renderTypingIndicator();
            }
        });

        // ── AI Moderation events ────────────────────────
        socket.on('ai_typing', function (data) {
            if (!data || !data.communityId) return;
            if (state.currentCommunity && data.communityId === state.currentCommunity.id) {
                showAITyping(data.username);
            }
        });

        socket.on('message:deleted', function (data) {
            if (!data || !data.messageId) return;
            if (state.currentCommunity && data.communityId === state.currentCommunity.id) {
                var msgEl = dom.chatMessagesInner ? dom.chatMessagesInner.querySelector('[data-msg-id="' + data.messageId + '"]') : null;
                if (msgEl) {
                    msgEl.classList.add('msg-deleted');
                    msgEl.style.opacity = '0';
                    msgEl.style.transform = 'translateX(-20px)';
                    msgEl.style.transition = 'all 0.3s var(--ease)';
                    setTimeout(function () { msgEl.remove(); }, 300);
                }
                // Remove from state
                for (var i = 0; i < state.messages.length; i++) {
                    if (state.messages[i].id === data.messageId) {
                        state.messages.splice(i, 1);
                        break;
                    }
                }
            }
        });

        socket.on('mute:applied', function (data) {
            if (!data || !data.mutedUntil) return;
            showMuteBanner(data.reason || 'Policy violation', data.mutedUntil);
        });

        socket.on('ai_warning', function (data) {
            if (!data || !data.communityId) return;
            if (state.currentCommunity && data.communityId === state.currentCommunity.id) {
                showWarningToast(data.reason || 'Content warning');
            }
        });

        // ── DM socket events ────────────────────────────
        socket.on('dm:message', function (msg) {
            // If we're viewing this conversation, append the message
            if (state.currentDmConversation && msg.conversation_id == state.currentDmConversation) {
                msg.sender_id = msg.sender_id || msg.user_id;
                appendMessage(msg);
                scrollToBottom(true);
            }
            // Always refresh the DM sidebar list and badge
            loadDmConversations();
            updateChatsBadge();
        });

        // DM system message (e.g. call started/ended) broadcast from backend
        socket.on('dm:message:new', function (msg) {
            if (!msg) return;
            if (state.currentDmConversation && msg.conversation_id == state.currentDmConversation) {
                msg.sender_id = msg.sender_id || msg.user_id;
                appendMessage(msg);
                scrollToBottom(true);
            }
            loadDmConversations();
            updateChatsBadge();
        });

        socket.on('dm:typing', function (data) {
            if (state.currentDmConversation && data.conversationId == state.currentDmConversation) {
                state.typingUsers = [{ username: data.username, userId: data.userId }];
                renderTypingIndicator();
            }
        });

        socket.on('dm:typing:stop', function (data) {
            if (state.currentDmConversation && data.conversationId == state.currentDmConversation) {
                state.typingUsers = [];
                renderTypingIndicator();
            }
        });

        socket.on('dm:read', function (data) {
            if (state.currentDmConversation && data.conversationId == state.currentDmConversation) {
                // Could update read receipts
            }
            loadDmConversations();
            updateChatsBadge();
        });

        socket.on('bee:usage', function (data) {
            if (data) {
                state.beeUsage = {
                    remaining: data.remaining,
                    limit: data.limit,
                    isUnlimited: data.isUnlimited,
                };
                updateBeeUsageDisplay();
            }
        });

        // ── Incoming DM Call Events ─────────────────────────
        socket.on('call:incoming', function (data) {
            if (!data) return;
            console.log('[WEBRTC] Incoming call from', data.callerUsername);
            showIncomingCallPopup(data);
        });

        socket.on('call:declined', function (data) {
            if (!data) return;
            console.log('[WEBRTC] Call declined by', data.declinedByUsername);
            showToast((data.declinedByUsername || 'User') + ' declined the call');
            closeCallOverlay();
        });

        socket.on('call:cancelled', function (data) {
            if (!data) return;
            console.log('[WEBRTC] Call cancelled by', data.cancelledByUsername);
            hideIncomingCallPopup();
            showToast((data.cancelledByUsername || 'User') + ' cancelled the call');
        });

        // ── WebRTC Group Call Signaling ─────────────────────
        socket.on('call:started', function (data) {
            if (!data) return;
            console.log('[WEBRTC] Call started by', data.username);
            callActiveType = data.callType || 'video';
            if (data.conversationId) {
                currentCallConversationId = data.conversationId;
                currentCallMaxSlots = 2;
            } else {
                currentCallCommunityId = data.communityId || currentCallCommunityId;
            }

            // For DM calls, open the overlay if not already open (callee accepting)
            if (data.conversationId && !callOpen) {
                openCallOverlay();
                setParticipantControls(true);
                syncMicButton(true);
                syncCamButton(false); // privacy-first: camera off by default
            }

            if (callOpen) {
                // Set mySlot from participants so connectMeshToParticipants works
                var me = getMyUserId();
                var participants = data.participants || [];
                participants.forEach(function (p) {
                    if (p.userId === me) mySlot = p.slot;
                });
                updateParticipantGrid(participants);
            }
        });

        // Live "watching" count — updates in real time as people open/leave the call
        socket.on('call:viewer-count', function (data) {
            if (!data) return;
            var activeKey = currentCallConversationId || currentCallCommunityId;
            if (data.communityId === activeKey) {
                updateViewerCount(data.count);
            }
        });

        // A participant raised/lowered their hand — update their tile instantly
        socket.on('call:raise-hand', function (data) {
            if (!data) return;
            var activeKey = currentCallConversationId || currentCallCommunityId;
            if (data.communityId !== activeKey) return;
            handStates[data.userId] = !!data.raised;
            updateHandIndicators();
        });

        // A new viewer opened the call — create a PC + offer so they can watch
        socket.on('call:viewer-joined', function (data) {
            var activeKey = currentCallConversationId || currentCallCommunityId;
            if (!localCallStream || !activeKey) return;
            console.log('[WEBRTC] Viewer joined, sending offer to:', data.viewerUsername);

            // This event may arrive on the joiner right after they clicked Join
            // (connecting them to existing watch-only viewers). Track that we
            // already sent an offer to this target so callJoinBtn's renegotiate
            // loop skips it and we never double-offer.
            offeredToWatchers[data.viewerUserId] = true;

            // Ensure the viewer is in callParticipants before creating PC
            // (ontrack needs callParticipants to route the stream to the correct slot)
            if (!callParticipants.find(function (p) { return p.userId === data.viewerUserId; })) {
                callParticipants.push({
                    userId: data.viewerUserId,
                    username: data.viewerUsername,
                    slot: 0,
                });
            }

            if (peerConnections[data.viewerUserId]) {
                peerConnections[data.viewerUserId].close();
            }

            var pc = createPeerConnection(data.viewerUserId);
            peerConnections[data.viewerUserId] = pc;

            localCallStream.getTracks().forEach(function (track) {
                pc.addTrack(track, localCallStream);
            });

            pc.createOffer().then(function (offer) {
                return pc.setLocalDescription(offer);
            }).then(function () {
                state.socket.emit('call:offer', {
                    communityId: currentCallCommunityId || null,
                    conversationId: currentCallConversationId || null,
                    offer: pc.localDescription.toJSON(),
                    targetUserId: data.viewerUserId,
                });
            }).catch(function (err) {
                console.error('[WEBRTC] Failed to create offer for viewer:', err);
            });
        });

        socket.on('call:participants', function (data) {
            if (!data) return;
            var activeKey = currentCallConversationId || currentCallCommunityId;
            if (!activeKey) return;
            console.log('[WEBRTC] Participants update:', data.participants.length, 'participants');
            if (data.communityId === activeKey) {
                var oldParticipants = callParticipants.slice();
                callParticipants = data.participants || [];
                mySlot = 0;
                var me = getMyUserId();
                callParticipants.forEach(function (p) {
                    if (p.userId === me) mySlot = p.slot;
                });

                // Rebuild raised-hand map from the payload
                handStates = {};
                callParticipants.forEach(function (p) {
                    handStates[p.userId] = !!p.handRaised;
                });

                // Update Join button + participant controls visibility
                setParticipantControls(mySlot > 0);

                updateParticipantGrid(data.participants);
                updateHandIndicators();
            }
        });

        socket.on('call:offer', function (data) {
            if (!data || !data.offer || !data.callerUserId) return;
            console.log('[WEBRTC] Received offer from', data.callerUsername);

            // Ensure the sender is in callParticipants before creating PC
            // (ontrack needs callParticipants to route the stream to the correct slot)
            if (!callParticipants.find(function (p) { return p.userId === data.callerUserId; })) {
                callParticipants.push({
                    userId: data.callerUserId,
                    username: data.callerUsername,
                    slot: 0,
                });
            }

            var existingPc = peerConnections[data.callerUserId];
            var remoteDesc = new RTCSessionDescription(data.offer);

            if (existingPc && existingPc.signalingState !== 'closed') {
                // Renegotiation — update existing PC
                existingPc.setRemoteDescription(remoteDesc).then(function () {
                    return existingPc.createAnswer();
                }).then(function (answer) {
                    return existingPc.setLocalDescription(answer);
                }).then(function () {
                    state.socket.emit('call:answer', {
                        communityId: currentCallCommunityId || null,
                        conversationId: currentCallConversationId || null,
                        answer: existingPc.localDescription.toJSON(),
                        targetUserId: data.callerUserId,
                    });
                }).catch(function (err) {
                    console.error('[WEBRTC] Failed to handle renegotiation:', err);
                });
            } else {
                // New connection
                if (existingPc) existingPc.close();

                var pc = createPeerConnection(data.callerUserId);
                peerConnections[data.callerUserId] = pc;

                if (localCallStream) {
                    localCallStream.getTracks().forEach(function (track) {
                        pc.addTrack(track, localCallStream);
                    });
                }

                pc.setRemoteDescription(remoteDesc).then(function () {
                    return pc.createAnswer();
                }).then(function (answer) {
                    return pc.setLocalDescription(answer);
                }).then(function () {
                    state.socket.emit('call:answer', {
                        communityId: currentCallCommunityId || null,
                        conversationId: currentCallConversationId || null,
                        answer: pc.localDescription.toJSON(),
                        targetUserId: data.callerUserId,
                    });
                }).catch(function (err) {
                    console.error('[WEBRTC] Failed to handle offer:', err);
                });
            }
        });

        socket.on('call:answer', function (data) {
            if (!data || !data.answer || !data.answererUserId) return;
            var pc = peerConnections[data.answererUserId];
            if (!pc) return;
            console.log('[WEBRTC] Received answer from', data.answererUsername);
            var remoteDesc = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(remoteDesc).catch(function (err) {
                console.error('[WEBRTC] Failed to set answer:', err);
            });
        });

        socket.on('call:ice-candidate', function (data) {
            if (!data || !data.candidate || !data.senderUserId) return;
            var pc = peerConnections[data.senderUserId];
            if (!pc) return;
            var candidate = new RTCIceCandidate(data.candidate);
            pc.addIceCandidate(candidate).catch(function (err) {
                console.error('[WEBRTC] Failed to add ICE candidate:', err);
            });
        });

        socket.on('call:leave', function (data) {
            if (!data || !data.userId) return;
            console.log('[WEBRTC] Participant left:', data.userId);
            if (peerConnections[data.userId]) {
                peerConnections[data.userId].close();
                delete peerConnections[data.userId];
            }
        });

        socket.on('call:stopped', function (data) {
            console.log('[WEBRTC] Call stopped by', data ? data.username : 'unknown');
            closeCallOverlay();
        });

        // ── Socket events ──────────────────
        socket.on('notification:new', function (notif) {
            if (!notif) return;
            onNewNotification(notif);
        });

        socket.on('friend:request_received', function (data) {
            if (!data) return;
            showToast(data.sender.display_name || data.sender.username + ' sent you a friend request!');
            // Update friends panel if open
            if (state.activeView === 'friends') {
                loadFriends();
            }
        });

        socket.on('friend:accepted', function (data) {
            if (!data) return;
            showToast((data.friend.display_name || data.friend.username) + ' accepted your friend request!');
            // Refresh popup if open with this user
            if (popupOpen && dom.upFriendBtn) {
                setFriendBtnState('friends');
            }
            // Update friends panel if open
            if (state.activeView === 'friends') {
                loadFriends();
            }
        });

        socket.on('friend:new_friend', function (data) {
            if (!data) return;
            showToast('You and ' + (data.friend.display_name || data.friend.username) + ' are now friends!');
            // Update friends panel if open
            if (state.activeView === 'friends') {
                loadFriends();
            }
        });

        socket.on('error', function (data) {
            console.error('[HIVE] Socket error:', data.message);
        });

        socket.on('disconnect', function () {
            console.log('[HIVE] Socket disconnected');
            stopHeartbeat();
        });

        state.socket = socket;
    }

    function joinRoom(communityId) {
        if (!state.socket) return;
        state.socket.emit('community:join', communityId);
    }

    /* ── Scroll for Load More ────────────────── */
    function initScrollLoadMore() {
        var scrollArea = dom.chatMessages;
        if (!scrollArea) return;
        scrollArea.addEventListener('scroll', function () {
            if (scrollArea.scrollTop < 60 && state.hasMore && !state.loadingMessages && !state.loadingOlder && state.currentCommunity) {
                loadMessages(state.currentCommunity.id, { older: true });
            }
        });
    }

    /* ── Event Bindings ──────────────────────── */
    function bindEvents() {
        if (dom.chatBackBtn) {
            dom.chatBackBtn.addEventListener('click', function () {
                window.history.pushState({}, '', '/home/');
                showHomeView();
            });
        }

        // Video call button — starts a community video call + signals the backend
        var videoCallBtn = qs('.chat-topbar-btn[aria-label="Video call"]');
        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                startCommunityCall('video');
            });
        }

        // Voice call button — starts a community voice call + signals the backend
        var voiceCallBtn = qs('.chat-topbar-btn[aria-label="Voice call"]');
        if (voiceCallBtn) {
            voiceCallBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                startCommunityCall('voice');
            });
        }

        // Call overlay controls
        var callEndBtn = $('call-end-btn');
        if (callEndBtn) callEndBtn.addEventListener('click', closeCallOverlay);
        var callMinBtn = $('call-min-btn');
        if (callMinBtn) callMinBtn.addEventListener('click', closeCallOverlay);

        // Incoming call popup buttons
        var incomingAcceptBtn = $('incoming-call-accept');
        if (incomingAcceptBtn) incomingAcceptBtn.addEventListener('click', function () {
            acceptIncomingCall();
        });
        var incomingDeclineBtn = $('incoming-call-decline');
        if (incomingDeclineBtn) incomingDeclineBtn.addEventListener('click', function () {
            declineIncomingCall();
        });
        var callMuteBtn = $('call-mute-btn');
        if (callMuteBtn) callMuteBtn.addEventListener('click', function () {
            if (localCallStream) {
                var audioTrack = localCallStream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    syncMicButton(audioTrack.enabled);
                }
            }
        });
        var callCamBtn = $('call-cam-btn');
        if (callCamBtn) callCamBtn.addEventListener('click', function () {
            if (localCallStream) {
                var videoTrack = localCallStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                    syncCamButton(videoTrack.enabled);
                }
            }
        });
        var callShareBtn = $('call-share-btn');
        if (callShareBtn) callShareBtn.addEventListener('click', function () {
            toggleScreenShare();
        });
        var callHandBtn = $('call-hand-btn');
        if (callHandBtn) callHandBtn.addEventListener('click', function () {
            toggleRaiseHand();
        });
        var callFlipBtn = $('call-flip-btn');
        if (callFlipBtn) callFlipBtn.addEventListener('click', function () {
            toggleCamera();
            toggleMoreMenu();
        });
        var callMoreBtn = $('call-more-btn');
        if (callMoreBtn) callMoreBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMoreMenu();
        });
        // Close the More popover when clicking anywhere outside of it
        document.addEventListener('click', function (e) {
            var popover = $('call-more-popover');
            if (!popover || !popover.classList.contains('open')) return;
            var moreBtn = $('call-more-btn');
            if (moreBtn && moreBtn.contains(e.target)) return;
            popover.classList.remove('open');
            if (moreBtn) moreBtn.classList.remove('active');
        });
        var callJoinBtn = $('call-join-btn');
        if (callJoinBtn) callJoinBtn.addEventListener('click', function () {
            var activeKey = currentCallConversationId || currentCallCommunityId;
            if (!activeKey) return;

            var videoEnabled = callActiveType === 'video';
            getLocalCallStream(videoEnabled).then(function (stream) {
                setParticipantControls(true);
                syncMicButton(true);
                if (videoEnabled) {
                    var joinVideoTrack = stream.getVideoTracks()[0];
                    if (joinVideoTrack) joinVideoTrack.enabled = false;
                }
                syncCamButton(false);

                // Emit call:join so call:participants arrives before renegotiation
                if (state.socket) {
                    var joinData = currentCallConversationId
                        ? { conversationId: currentCallConversationId }
                        : { communityId: currentCallCommunityId };
                    state.socket.emit('call:join', joinData);
                }

                // Add tracks to existing peer connections (from watch-only mode) and renegotiate
                // Delay slightly to ensure call:participants is processed by peers first
                setTimeout(function () {
                    Object.keys(peerConnections).forEach(function (uid) {
                        // Skip watchers we already offered to via call:viewer-joined
                        if (offeredToWatchers[uid]) return;
                        var pc = peerConnections[uid];
                        stream.getTracks().forEach(function (track) {
                            pc.addTrack(track, stream);
                        });
                        pc.createOffer().then(function (offer) {
                            return pc.setLocalDescription(offer);
                        }).then(function () {
                            state.socket.emit('call:offer', {
                                communityId: currentCallCommunityId || null,
                                conversationId: currentCallConversationId || null,
                                offer: pc.localDescription.toJSON(),
                                targetUserId: uid,
                            });
                        }).catch(function (err) {
                            console.error('[WEBRTC] Failed to renegotiate with', uid, ':', err);
                        });
                    });
                }, 200);
            }).catch(function (err) {
                console.error('[WEBRTC] Failed to get camera for join:', err);
            });
        });
        // Escape closes the call overlay
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && callOpen) closeCallOverlay();
        });

        if (dom.sendBtn) {
            dom.sendBtn.addEventListener('click', sendMessage);
        }

        if (dom.composerInput) {
            dom.composerInput.addEventListener('input', function () {
                updateSendButton();
                handleTypingInput();
                handleHashtagInput();
            });
            dom.composerInput.addEventListener('keydown', function (e) {
                if (hashtagState.active) {
                    if (handleHashtagKeydown(e)) return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
                if (e.key === 'Escape') {
                    if (hashtagState.active) {
                        e.preventDefault();
                        closeHashtagPanel();
                    } else if (dom.emojiPicker && dom.emojiPicker.style.display !== 'none' && dom.emojiPicker.style.display !== '') {
                        e.preventDefault();
                        closeEmojiPicker();
                    } else if (dom.gifPicker && dom.gifPicker.style.display !== 'none' && dom.gifPicker.style.display !== '') {
                        e.preventDefault();
                        closeGifPicker();
                    } else if (state.replyingTo) {
                        e.preventDefault();
                        cancelReply();
                    }
                }
            });
        }

        // Emoji button
        var emojiBtn = qs('.composer-btn[aria-label="Emoji"]');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleEmojiPicker();
            });
        }

        // GIF button
        var gifBtn = qs('.composer-btn[aria-label="GIF"]');
        if (gifBtn) {
            gifBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleGifPicker();
            });
        }
        if (dom.gifPickerClose) {
            dom.gifPickerClose.addEventListener('click', function (e) {
                e.stopPropagation();
                closeGifPicker();
            });
        }
        if (dom.gifSearch) {
            dom.gifSearch.addEventListener('keydown', function (e) {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    gifState.searchQuery = dom.gifSearch.value.trim();
                    loadGifs(true);
                }
            });
            dom.gifSearch.addEventListener('input', function () {
                var val = this.value.trim();
                if (gifState.searchTimer) clearTimeout(gifState.searchTimer);
                gifState.searchTimer = setTimeout(function () {
                    gifState.searchQuery = val;
                    loadGifs(true);
                }, 400);
            });
        }
        if (dom.gifLoadMoreBtn) {
            dom.gifLoadMoreBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                loadGifs(false);
            });
        }

        // Emoji search
        if (dom.emojiSearch) {
            dom.emojiSearch.addEventListener('input', function () {
                buildEmojiBody(this.value);
            });
            dom.emojiSearch.addEventListener('keydown', function (e) {
                e.stopPropagation();
            });
        }

        // Emoji category tabs — scroll to section
        if (dom.emojiCategoryTabs) {
            dom.emojiCategoryTabs.addEventListener('click', function (e) {
                var tab = e.target.closest('.emoji-tab');
                if (!tab) return;
                var cat = tab.getAttribute('data-cat');
                if (!cat) return;
                var tabs = dom.emojiCategoryTabs.querySelectorAll('.emoji-tab');
                for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
                tab.classList.add('active');
                if (cat === 'recent') {
                    if (dom.emojiBody) dom.emojiBody.scrollTop = 0;
                } else {
                    scrollToCategory(cat);
                }
            });
        }

        // Sync active tab on scroll
        if (dom.emojiBody) {
            dom.emojiBody.addEventListener('scroll', function () {
                updateActiveTabOnScroll();
            }, { passive: true });
        }

        // Close emoji picker on outside click
        document.addEventListener('click', function (e) {
            if (dom.emojiPicker && dom.emojiPicker.style.display !== 'none' && dom.emojiPicker.style.display !== '') {
                if (!dom.emojiPicker.contains(e.target) && !e.target.closest('.composer-btn[aria-label="Emoji"]')) {
                    closeEmojiPicker();
                }
            }
            if (dom.gifPicker && dom.gifPicker.style.display !== 'none' && dom.gifPicker.style.display !== '') {
                if (!dom.gifPicker.contains(e.target) && !e.target.closest('.composer-btn[aria-label="GIF"]')) {
                    closeGifPicker();
                }
            }
            if (hashtagState.active && dom.hashtagPanel) {
                if (!dom.hashtagPanel.contains(e.target) && e.target !== dom.composerInput) {
                    closeHashtagPanel();
                }
            }
        });

        // Hashtag click handler — open search or toast
        document.addEventListener('click', function (e) {
            var hashtag = e.target.closest('.msg-hashtag');
            if (hashtag) {
                var tag = hashtag.getAttribute('data-tag');
                if (tag) {
                    showToast('#' + tag + ' — search coming soon!', 'info');
                }
            }
        });

        if (dom.replyComposerClose) {
            dom.replyComposerClose.addEventListener('click', cancelReply);
        }

        var searchInput = qs('.sidebar-search input');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                filterCommunities(this.value);
            });
        }

        if (dom.retryCommunities) {
            dom.retryCommunities.addEventListener('click', loadCommunities);
        }

        window.addEventListener('popstate', handlePopState);

        if (dom.toggleMembersBtn) {
            dom.toggleMembersBtn.addEventListener('click', function () {
                this.classList.toggle('active');
                var sidebar = dom.chatSidebar;
                if (sidebar) {
                    if (sidebar.style.display === 'none') {
                        show(sidebar);
                    } else {
                        hide(sidebar);
                    }
                }
            });
        }

        // Rail navigation (Home, Communities, Chats, etc.) — also binds the mobile bottom-nav.
        // Each nav sets the URL, then syncVisibilityForRoute() shows the matching screen and
        // hides every other screen (profile, notifications, etc.), including for the current popstate.
        var railNavIcons = document.querySelectorAll('.rail-icon[data-nav], .bottom-nav-item[data-nav]');
        for (var i = 0; i < railNavIcons.length; i++) {
            railNavIcons[i].addEventListener('click', function (e) {
                e.preventDefault();
                var nav = this.getAttribute('data-nav');
                if (nav === 'search') { showToast('Search coming soon'); return; }
                if (nav === 'settings') { showToast('Settings coming soon'); return; }

                if (nav === 'home') {
                    window.history.pushState({}, '', '/home/');
                } else if (nav === 'communities') {
                    window.history.pushState({ view: 'communities' }, '', '/home/#/communities');
                } else if (nav === 'chats') {
                    window.history.pushState({ view: 'dm' }, '', '/home/');
                } else if (nav === 'friends') {
                    window.history.pushState({ view: 'friends' }, '', '/home/#/friends');
                } else if (nav === 'notifications') {
                    window.history.pushState({ view: 'notifications' }, '', '/home/#/notifications');
                }
                // After the URL updates, enforce that only the matching screen is visible.
                syncVisibilityForRoute();
            });
        }

        // DM new chat button
        if (dom.dmNewChatBtn) {
            dom.dmNewChatBtn.addEventListener('click', function () {
                showDmNewChatModal();
            });
        }

        // DM retry button
        if (dom.retryDm) {
            dom.retryDm.addEventListener('click', loadDmConversations);
        }

        // Friends panel events
        if (dom.retryFriends) {
            dom.retryFriends.addEventListener('click', loadFriends);
        }
        if (dom.friendsSearchInput) {
            dom.friendsSearchInput.addEventListener('input', function () {
                friendsData.searchQuery = this.value;
                renderFriendsPanel();
            });
            dom.friendsSearchInput.addEventListener('keydown', function (e) {
                e.stopPropagation();
            });
        }
        if (dom.friendsTabs) {
            dom.friendsTabs.addEventListener('click', function (e) {
                var tab = e.target.closest('.friends-tab');
                if (!tab) return;
                var filter = tab.getAttribute('data-filter');
                if (filter) {
                    friendsData.filter = filter;
                    updateFriendsTabs();
                    renderFriendsPanel();
                }
            });
        }

        // Sidebar create community button
        var sidebarCreateCommunityBtn = $('sidebar-create-community-btn');
        if (sidebarCreateCommunityBtn) {
            sidebarCreateCommunityBtn.addEventListener('click', function () {
                showToast('Community creation coming soon');
            });
        }

        // Notification panel events
        if (dom.notifClose) {
            dom.notifClose.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                closeNotifications();
            });
        }
        if (dom.notifMarkAll) {
            dom.notifMarkAll.addEventListener('click', markAllNotifsAsRead);
        }
        if (dom.notifScroll) {
            dom.notifScroll.addEventListener('scroll', function () {
                var scrollEl = dom.notifScroll;
                if (scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 80) {
                    if (!state.notifLoading && state.notifHasMore) {
                        show(dom.notifLoadMore);
                        loadNotifications();
                    }
                }
            });
        }
        // Delegate Accept/Reject button clicks in notification list
        if (dom.notifList) {
            dom.notifList.addEventListener('click', function (e) {
                var btn = e.target.closest('.notif-action-btn');
                if (!btn) return;
                e.stopPropagation();
                var action = btn.getAttribute('data-notif-action');
                var notifId = btn.getAttribute('data-notif-id');
                var senderId = btn.getAttribute('data-sender-id');
                if (action === 'accept') {
                    handleNotifAccept(notifId, senderId, btn);
                } else if (action === 'reject') {
                    handleNotifReject(notifId, btn);
                }
            });
        }
        if (dom.topbarNotifBtn) {
            dom.topbarNotifBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (state.notifOpen) {
                    closeNotifications();
                    return;
                }
                window.history.pushState({ view: 'notifications' }, '', '/home/');
                openNotifications();
            });
        }
        if (dom.notifPanel) {
            dom.notifPanel.addEventListener('click', function (e) {
                if (e.target === dom.notifPanel) {
                    closeNotifications();
                }
            });
        }

        // ── Audio player event delegation ──
        document.addEventListener('click', function(e) {
            // Audio play/pause
            var playBtn = e.target.closest('.msg-audio-play');
            if (playBtn) {
                var player = playBtn.closest('.msg-audio-player');
                if (!player) return;
                var src = player.getAttribute('data-src');
                if (!src) return;

                var audio = player._audio;
                if (!audio) {
                    audio = new Audio(src);
                    player._audio = audio;
                    var track = player.querySelector('.msg-audio-track');
                    var progress = player.querySelector('.msg-audio-progress');
                    var timeEl = player.querySelector('.msg-audio-time');
                    var durText = timeEl ? timeEl.textContent : '0:00';

                    audio.addEventListener('timeupdate', function() {
                        if (audio.duration) {
                            var pct = (audio.currentTime / audio.duration) * 100;
                            if (progress) progress.style.width = pct + '%';
                            if (timeEl) timeEl.textContent = formatDuration(audio.currentTime) + ' / ' + formatDuration(audio.duration);
                        }
                    });
                    audio.addEventListener('ended', function() {
                        playBtn.classList.remove('playing');
                        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
                        if (progress) progress.style.width = '0%';
                        if (timeEl) timeEl.textContent = durText;
                    });
                    audio.addEventListener('loadedmetadata', function() {
                        if (timeEl && audio.duration) timeEl.textContent = '0:00 / ' + formatDuration(audio.duration);
                    });
                    if (track) {
                        track.addEventListener('click', function(ev) {
                            if (!audio.duration) return;
                            var rect = track.getBoundingClientRect();
                            var pct = (ev.clientX - rect.left) / rect.width;
                            audio.currentTime = pct * audio.duration;
                        });
                    }
                }

                if (audio.paused) {
                    document.querySelectorAll('.msg-audio-player._audio').forEach(function(p) {
                        if (p._audio && p !== player) { p._audio.pause(); }
                    });
                    audio.play();
                    playBtn.classList.add('playing');
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                } else {
                    audio.pause();
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
                }
                return;
            }

            // Video overlay play (big center button)
            var vidOverlay = e.target.closest('.msg-vid-overlay');
            if (vidOverlay) {
                var vidPlayer = vidOverlay.closest('.msg-vid-player');
                if (vidPlayer) {
                    var vid = vidPlayer.querySelector('video');
                    if (vid) {
                        vid.play();
                        vidPlayer.classList.add('playing');
                    }
                }
                return;
            }

            // Video control play/pause
            var vidCtrlPlay = e.target.closest('.msg-vid-ctrl-play');
            if (vidCtrlPlay) {
                var vp = vidCtrlPlay.closest('.msg-vid-player');
                if (!vp) return;
                var v = vp.querySelector('video');
                if (!v) return;
                if (v.paused) { v.play(); vp.classList.add('playing'); }
                else { v.pause(); vp.classList.remove('playing'); }
                return;
            }

            // Video fullscreen
            var vidFs = e.target.closest('.msg-vid-ctrl-fs');
            if (vidFs) {
                var vp2 = vidFs.closest('.msg-vid-player');
                if (!vp2) return;
                var v2 = vp2.querySelector('video');
                if (!v2) return;
                if (v2.requestFullscreen) v2.requestFullscreen();
                else if (v2.webkitRequestFullscreen) v2.webkitRequestFullscreen();
                return;
            }

            // Video volume toggle
            var vidVol = e.target.closest('.msg-vid-ctrl-vol');
            if (vidVol) {
                var vp3 = vidVol.closest('.msg-vid-player');
                if (!vp3) return;
                var v3 = vp3.querySelector('video');
                if (!v3) return;
                v3.muted = !v3.muted;
                vidVol.innerHTML = v3.muted
                    ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
                    : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
                return;
            }
        });

        // Video seek bar clicks
        document.addEventListener('click', function(e) {
            var seekBar = e.target.closest('.msg-vid-seek-bar');
            if (!seekBar) return;
            var vp = seekBar.closest('.msg-vid-player');
            if (!vp) return;
            var vid = vp.querySelector('video');
            if (!vid || !vid.duration) return;
            var rect = seekBar.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            vid.currentTime = pct * vid.duration;
        });

        // Video timeupdate + ended delegation
        document.addEventListener('playing', function(e) {
            var vid = e.target;
            if (vid.tagName !== 'VIDEO') return;
            var vp = vid.closest('.msg-vid-player');
            if (!vp) return;
            vp.classList.add('playing');
            var ctrlPlay = vp.querySelector('.msg-vid-ctrl-play');
            if (ctrlPlay) ctrlPlay.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        }, true);
        document.addEventListener('pause', function(e) {
            var vid = e.target;
            if (vid.tagName !== 'VIDEO') return;
            var vp = vid.closest('.msg-vid-player');
            if (!vp) return;
            vp.classList.remove('playing');
            var ctrlPlay = vp.querySelector('.msg-vid-ctrl-play');
            if (ctrlPlay) ctrlPlay.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        }, true);
        document.addEventListener('timeupdate', function(e) {
            var vid = e.target;
            if (vid.tagName !== 'VIDEO') return;
            var vp = vid.closest('.msg-vid-player');
            if (!vp) return;
            var fill = vp.querySelector('.msg-vid-seek-fill');
            var timeEl = vp.querySelector('.msg-vid-time');
            if (fill && vid.duration) fill.style.width = ((vid.currentTime / vid.duration) * 100) + '%';
            if (timeEl && vid.duration) timeEl.textContent = formatDuration(vid.currentTime) + ' / ' + formatDuration(vid.duration);
        }, true);
        document.addEventListener('ended', function(e) {
            var vid = e.target;
            if (vid.tagName !== 'VIDEO') return;
            var vp = vid.closest('.msg-vid-player');
            if (!vp) return;
            vp.classList.remove('playing');
            var ctrlPlay = vp.querySelector('.msg-vid-ctrl-play');
            if (ctrlPlay) ctrlPlay.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            var fill = vp.querySelector('.msg-vid-seek-fill');
            if (fill) fill.style.width = '0%';
        }, true);

    }

    /* ══════════════════════════════════════════════
       PROFILE PANEL (right-side)
       ══════════════════════════════════════════════ */
    var profileOpen = false;

    function openProfile() {
        if (profileOpen) return;
        profileOpen = true;

        var rpanel = $('rpanel');
        var profileView = $('rpanel-profile');
        var editView = $('rpanel-edit');
        var appearanceView = $('rpanel-appearance');
        var rightSidebar = qs('.right-sidebar');
        if (!rpanel || !profileView) return;

        // On mobile, close the sidebar overlay so the profile shows cleanly on top
        document.body.classList.remove('side-open');

        hide(editView);
        if (appearanceView) hide(appearanceView);
        show(profileView);
        show(rpanel);
        if (rightSidebar) hide(rightSidebar);

        restoreRpanelExpand();
        populateProfile();
        triggerProfileEntrance();
        animateStatCounters();

        if (!isProfileRoute()) {
            window.history.pushState({ view: 'profile' }, '', '/home/#/profile');
        }
    }

    function closeProfile() {
        if (!profileOpen) return;

        var rpanel = $('rpanel');
        var rightSidebar = qs('.right-sidebar');
        if (rpanel) hide(rpanel);
        if (rightSidebar) show(rightSidebar);
        profileOpen = false;
        appearanceOpen = false;
        setActiveRailIcon(state.activeView);
        // Restore the sidebar overlay on mobile if we're still in a nav-panel view
        syncSidebarVisibility(state.activeView);

        window.history.back();
    }

    function triggerProfileEntrance() {
        var cards = document.querySelectorAll('#rpanel-profile .rp-entrance');
        for (var i = 0; i < cards.length; i++) {
            cards[i].style.animation = 'none';
            cards[i].offsetHeight;
            cards[i].style.animation = '';
        }
    }

    function populateProfile() {
        var user = state.user;
        if (!user) return;

        var avatar = getAvatarUrl(user);
        var el;

        el = $('rpanel-avatar');
        if (el) el.src = avatar;

        el = $('rpanel-username');
        if (el) el.textContent = '@' + (user.username || 'user');

        el = $('rpanel-displayname');
        if (el) el.textContent = user.display_name || user.username || 'User';

        el = $('rpanel-badges');
        if (el) {
            var badges = '';
            if (user.rank && user.rank !== 'bot' && window.HiveRankBadge) {
                var badgeEl = window.HiveRankBadge.create(user.rank, 18);
                if (badgeEl) { badgeEl.className = 'rank-badge rank-' + user.rank; badges += badgeEl.outerHTML; }
            }
            if (user.is_verified) {
                badges += '<span class="verified-badge" title="Verified"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#6C63FF" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>';
            }
            el.innerHTML = badges;
        }

        el = $('rp-if-display-name');
        if (el) el.textContent = user.display_name || user.username || '-';

        el = $('rp-if-rank');
        if (el) el.textContent = (user.rank || 'rookie').charAt(0).toUpperCase() + (user.rank || 'rookie').slice(1);

        el = $('rp-if-joined');
        if (el) el.textContent = user.created_at ? formatDateDivider(user.created_at) : 'Unknown';

        el = $('rp-if-bio');
        if (el) el.textContent = user.bio || 'No bio yet.';

        el = $('rpanel-member-since');
        if (el && user.created_at) {
            var span = el.querySelector('span');
            if (span) span.textContent = 'Member since ' + formatDateDivider(user.created_at);
        }
    }

    function animateStatCounters() {
        var els = document.querySelectorAll('#rpanel-profile .rp-stat-v[data-count]');
        for (var i = 0; i < els.length; i++) {
            (function (el, idx) {
                var target = parseInt(el.getAttribute('data-count'), 10);
                var current = 0;
                var step = Math.max(1, Math.ceil(target / 40));
                var delay = 200 + idx * 100;
                setTimeout(function () {
                    var interval = setInterval(function () {
                        current += step;
                        if (current >= target) {
                            current = target;
                            clearInterval(interval);
                        }
                        el.textContent = current.toLocaleString();
                    }, 25);
                }, delay);
            })(els[i], i);
        }
    }

    function toggleRpanelExpand() {
        var rpanel = $('rpanel');
        var handle = $('rpanel-collapse-handle');
        if (!rpanel) return;
        var expanded = rpanel.classList.toggle('rpanel--expanded');
        try {
            localStorage.setItem('hive_rpanel_expanded', expanded ? '1' : '0');
        } catch (e) {}
        if (handle) {
            handle.setAttribute('aria-label', expanded ? 'Collapse profile panel' : 'Expand profile panel');
            handle.setAttribute('title', expanded ? 'Collapse' : 'Expand');
        }
    }

    function restoreRpanelExpand() {
        var rpanel = $('rpanel');
        if (!rpanel) return;
        var expanded = false;
        try {
            expanded = localStorage.getItem('hive_rpanel_expanded') === '1';
        } catch (e) {}
        if (expanded) rpanel.classList.add('rpanel--expanded');
        var handle = $('rpanel-collapse-handle');
        if (handle) {
            handle.setAttribute('aria-label', expanded ? 'Collapse profile panel' : 'Expand profile panel');
            handle.setAttribute('title', expanded ? 'Collapse' : 'Expand');
        }
    }

    function initProfileEvents() {
        var backBtn = $('rpanel-back');
        if (backBtn) backBtn.addEventListener('click', closeProfile);

        var expandHandle = $('rpanel-collapse-handle');
        if (expandHandle) expandHandle.addEventListener('click', toggleRpanelExpand);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && profileOpen && !editProfileOpen && !appearanceOpen) {
                closeProfile();
            } else if (e.key === 'Escape' && appearanceOpen) {
                closeAppearance();
            }
        });

        var userPanel = qs('.user-panel');
        if (userPanel) {
            userPanel.style.cursor = 'pointer';
            userPanel.addEventListener('click', function (e) {
                if (e.target.closest('.ua-btn')) return;
                openProfile();
            });
        }

        // Mobile home topbar: avatar opens the profile, settings shows a toast
        var mobileAvatarBtn = $('mobile-topbar-avatar');
        if (mobileAvatarBtn) {
            mobileAvatarBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openProfile();
            });
        }
        var mobileSettingsBtn = $('mobile-topbar-settings');
        if (mobileSettingsBtn) {
            mobileSettingsBtn.addEventListener('click', function (e) {
                e.preventDefault();
                showToast('Settings coming soon');
            });
        }
        var mobileOnlineBtn = $('mobile-topbar-online');
        if (mobileOnlineBtn) {
            mobileOnlineBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (onlineUsersOpen) {
                    closeOnlineUsers(true);
                } else {
                    window.history.pushState({ view: 'online' }, '', '/home/');
                    state.onlinePush = true;
                    openOnlineUsers();
                }
            });
        }
        var onlineCloseBtn = $('online-close');
        if (onlineCloseBtn) {
            onlineCloseBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                closeOnlineUsers(true);
                window.history.back();
            });
        }

        var toolbarActions = qs('.rpanel-toolbar-actions');
        if (toolbarActions) {
            toolbarActions.addEventListener('click', function (e) {
                var btn = e.target.closest('.rpanel-toolbar-btn');
                if (!btn) return;
                var action = btn.getAttribute('data-action');
                if (action === 'copy-id' && state.user && state.user.id) {
                    navigator.clipboard.writeText(state.user.id).then(function () {
                        showToast('ID copied!', 'success');
                    });
                } else if (action === 'share') {
                    if (state.user && state.user.id) {
                        navigator.clipboard.writeText(window.location.origin + '/profile/' + state.user.id).then(function () {
                            showToast('Profile link copied!', 'success');
                        });
                    }
                }
            });
        }

        var editBtn = $('rpanel-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', function () {
                openEditProfile();
            });
        }

        var actionsGrid = qs('.rp-actions-grid');
        if (actionsGrid) {
            actionsGrid.addEventListener('click', function (e) {
                var btn = e.target.closest('.rp-action');
                if (!btn) return;
                var action = btn.getAttribute('data-action');
                if (action === 'edit') {
                    openEditProfile();
                } else if (action === 'copy-id' && state.user && state.user.id) {
                    navigator.clipboard.writeText(state.user.id).then(function () {
                        showToast('ID copied!', 'success');
                    });
                } else if (action === 'share' && state.user && state.user.id) {
                    navigator.clipboard.writeText(window.location.origin + '/profile/' + state.user.id).then(function () {
                        showToast('Profile link copied!', 'success');
                    });
                } else if (action === 'settings') {
                    showToast('Settings coming soon', 'info');
                } else if (action === 'privacy') {
                    showToast('Privacy settings coming soon', 'info');
                } else if (action === 'appearance') {
                    openAppearance();
                } else if (action === 'notifications') {
                    if (profileOpen) {
                        var rp = $('rpanel');
                        if (rp) hide(rp);
                        profileOpen = false;
                        appearanceOpen = false;
                        var rsb = qs('.right-sidebar');
                        if (rsb) show(rsb);
                    }
                    window.history.pushState({ view: 'notifications' }, '', '/home/#/notifications');
                    openNotifications();
                } else if (action === 'media') {
                    showToast('Media coming soon', 'info');
                } else if (action === 'premium') {
                    showToast('Premium coming soon', 'info');
                }
            });
        }

        var appearanceBackBtn = $('rpanel-appearance-back');
        if (appearanceBackBtn) {
            appearanceBackBtn.addEventListener('click', closeAppearance);
        }

        var appearanceSaveBtn = $('rpanel-appearance-save-btn');
        if (appearanceSaveBtn) {
            appearanceSaveBtn.addEventListener('click', saveAppearance);
        }

        // Tab switching
        initAppearanceTabs();

        // Ring modal
        var ringViewMore = $('ring-view-more');
        if (ringViewMore) {
            ringViewMore.addEventListener('click', openRingModal);
        }
        var ringModalClose = $('ring-modal-close');
        if (ringModalClose) {
            ringModalClose.addEventListener('click', closeRingModal);
        }
        var ringModalOverlay = $('ring-modal-overlay');
        if (ringModalOverlay) {
            ringModalOverlay.addEventListener('click', function (e) {
                if (e.target === ringModalOverlay) closeRingModal();
            });
        }
        // Filter rings input
        var ringFilterInput = $('ring-filter-input');
        if (ringFilterInput) {
            ringFilterInput.addEventListener('input', filterRings);
        }

        var textCustomBtn = $('text-custom-btn');
        if (textCustomBtn) {
            textCustomBtn.addEventListener('click', function () {
                $('text-color-input').click();
            });
        }

        var usernameCustomBtn = $('username-custom-btn');
        if (usernameCustomBtn) {
            usernameCustomBtn.addEventListener('click', function () {
                $('username-color-input').click();
            });
        }

        var usernameResetBtn = $('username-reset-btn');
        if (usernameResetBtn) {
            usernameResetBtn.addEventListener('click', resetUsernameColor);
        }

        var textColorInput = $('text-color-input');
        if (textColorInput) {
            textColorInput.addEventListener('input', function () {
                appearanceState.textColor = this.value;
                var swatch = $('text-current-swatch');
                if (swatch) swatch.style.background = this.value;
                highlightActiveSwatches();
                updateAppearancePreview();
                checkAppearanceChanges();
            });
        }

        var usernameColorInput = $('username-color-input');
        if (usernameColorInput) {
            usernameColorInput.addEventListener('input', function () {
                appearanceState.usernameColor = this.value;
                var swatch = $('username-current-swatch');
                if (swatch) swatch.style.background = this.value;
                highlightActiveSwatches();
                updateAppearancePreview();
                checkAppearanceChanges();
            });
        }

        // Font modal listeners
        var showMoreBtn = $('show-more-fonts-btn');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', function () { openFontModal('profile'); });
        }

        var chatTextFontMoreBtn = $('chat-text-font-show-more');
        if (chatTextFontMoreBtn) {
            chatTextFontMoreBtn.addEventListener('click', function () { openFontModal('chat'); });
        }

        var fontModalClose = $('font-modal-close');
        if (fontModalClose) {
            fontModalClose.addEventListener('click', closeFontModal);
        }

        var fontModalOverlay = $('font-modal-overlay');
        if (fontModalOverlay) {
            fontModalOverlay.addEventListener('click', function (e) {
                if (e.target === fontModalOverlay) closeFontModal();
            });
        }

        var fontSearchInput = $('font-modal-search');
        if (fontSearchInput) {
            fontSearchInput.addEventListener('input', function () {
                filterFonts(this.value);
            });
        }

        // Close font modal on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var overlay = $('font-modal-overlay');
                if (overlay && overlay.style.display !== 'none') {
                    closeFontModal();
                }
            }
        });

        // Effect modal listeners
        var effectViewMore = $('effect-view-more');
        if (effectViewMore) {
            effectViewMore.addEventListener('click', openEffectModal);
        }

        var effectModalClose = $('effect-modal-close');
        if (effectModalClose) {
            effectModalClose.addEventListener('click', closeEffectModal);
        }

        var effectModalOverlay = $('effect-modal-overlay');
        if (effectModalOverlay) {
            effectModalOverlay.addEventListener('click', function (e) {
                if (e.target === effectModalOverlay) closeEffectModal();
            });
        }

        var effectFilterInput = $('effect-filter-input');
        if (effectFilterInput) {
            effectFilterInput.addEventListener('input', filterEffects);
        }

        // Profile music controls
        initMusicControls();

        // Close effect modal on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var overlay = $('effect-modal-overlay');
                if (overlay && overlay.style.display !== 'none') {
                    closeEffectModal();
                }
            }
        });
    }

    function isProfileRoute() {
        var hash = window.location.hash;
        return hash === '#/profile' || hash === '#/profile/edit' || hash === '#/profile/appearance';
    }

    function isEditProfileRoute() {
        return window.location.hash === '#/profile/edit';
    }

    function isNotifRoute() {
        return window.location.hash === '#/notifications';
    }

    function isFriendsRoute() {
        return window.location.hash === '#/friends';
    }

    function isAppearanceRoute() {
        return window.location.hash === '#/profile/appearance';
    }

    /* ══════════════════════════════════════════════
       EDIT PROFILE PANEL (right-side)
       ══════════════════════════════════════════════ */
    var editProfileOpen = false;
    var editDirty = false;
    var editFormState = {};

    var RANK_TIER = { rookie:0, explorer:1, member:2, contributor:3, insider:4, pioneer:5, elite:6, legend:7, titan:8, nova:9 };
    var STAFF_RANKS = ['moderator','administrator','owner','verified','bot'];

    function openEditProfile() {
        if (editProfileOpen) return;
        editProfileOpen = true;
        editDirty = false;

        var rpanel = $('rpanel');
        var profileView = $('rpanel-profile');
        var editView = $('rpanel-edit');
        var appearanceView = $('rpanel-appearance');
        if (!rpanel || !editView) return;

        hide(profileView);
        if (appearanceView) hide(appearanceView);
        show(editView);
        show(rpanel);

        profileOpen = true;

        populateEditForm();
        updateEditPreview();
        updateSaveBtn();
        triggerEditEntrance();

        if (!isEditProfileRoute()) {
            window.history.pushState({ view: 'profile-edit' }, '', '/home/#/profile/edit');
        }
    }

    function closeEditProfile() {
        if (!editProfileOpen) return;
        editProfileOpen = false;
        editDirty = false;

        var profileView = $('rpanel-profile');
        var editView = $('rpanel-edit');
        hide(editView);
        show(profileView);

        populateProfile();
        triggerProfileEntrance();
        animateStatCounters();

        window.history.back();
    }

    function triggerEditEntrance() {
        var cards = document.querySelectorAll('#rpanel-edit .rp-entrance');
        for (var i = 0; i < cards.length; i++) {
            cards[i].style.animation = 'none';
            cards[i].offsetHeight;
            cards[i].style.animation = '';
        }
    }

    function populateEditForm() {
        var u = state.user;
        if (!u) return;

        editFormState = {
            profile_picture: u.profile_picture || '',
            profile_banner: u.profile_banner || '',
            bio: u.bio || ''
        };

        var bioInput = $('rpanel-bio-input');
        if (bioInput) {
            bioInput.value = editFormState.bio;
            autoResizeBio(bioInput);
            updateBioCounter();
        }

        var av = getAvatarUrl(u);
        var avPrev = $('rpanel-avatar-upload-preview');
        if (avPrev) avPrev.src = editFormState.profile_picture || av;

        var previewAv = $('rpanel-preview-avatar');
        if (previewAv) previewAv.src = editFormState.profile_picture || av;

        var previewBanner = $('rpanel-preview-banner');
        if (previewBanner) {
            if (editFormState.profile_banner) {
                previewBanner.style.backgroundImage = 'url(' + editFormState.profile_banner + ')';
            } else {
                previewBanner.style.backgroundImage = '';
            }
        }

        var coverPrev = $('rpanel-cover-preview');
        var coverPlaceholder = $('rpanel-cover-placeholder');
        var coverRemove = $('rpanel-cover-remove');
        if (editFormState.profile_banner) {
            if (coverPrev) { coverPrev.style.backgroundImage = 'url(' + editFormState.profile_banner + ')'; }
            if (coverPlaceholder) coverPlaceholder.style.display = 'none';
            if (coverRemove) coverRemove.style.display = '';
        } else {
            if (coverPrev) { coverPrev.style.backgroundImage = ''; }
            if (coverPlaceholder) coverPlaceholder.style.display = '';
            if (coverRemove) coverRemove.style.display = 'none';
        }

        var previewUN = $('rpanel-preview-username');
        if (previewUN) previewUN.textContent = '@' + (u.username || 'user');
        var previewDN = $('rpanel-preview-displayname');
        if (previewDN) previewDN.textContent = (u.display_name || u.username || 'User');
        var previewBio = $('rpanel-preview-bio');
        if (previewBio) previewBio.textContent = u.bio || 'This is my Hive bio.';

        updateBioCounter();
    }

    function updateEditPreview() {
        var u = state.user;
        var av = getAvatarUrl(u);

        if (editFormState.profile_picture) av = editFormState.profile_picture;

        var previewAv = $('rpanel-preview-avatar');
        if (previewAv) previewAv.src = av;

        var avPrev = $('rpanel-avatar-upload-preview');
        if (avPrev) avPrev.src = av;

        var previewBanner = $('rpanel-preview-banner');
        if (previewBanner) {
            if (editFormState.profile_banner) {
                previewBanner.style.backgroundImage = 'url(' + editFormState.profile_banner + ')';
            } else {
                previewBanner.style.backgroundImage = '';
            }
        }

        var previewBio = $('rpanel-preview-bio');
        if (previewBio) {
            previewBio.textContent = editFormState.bio || 'This is my Hive bio.';
        }

        updateBioCounter();
    }

    function updateSaveBtn() {
        var btn = $('rpanel-save-btn');
        if (btn) btn.disabled = !editDirty;
    }

    function markDirty() {
        editDirty = true;
        updateSaveBtn();
    }

    function autoResizeBio(el) {
        el.style.height = 'auto';
        el.style.height = Math.max(44, el.scrollHeight) + 'px';
    }

    function updateBioCounter() {
        var counter = $('rpanel-bio-counter');
        if (!counter) return;
        var len = (editFormState.bio || '').length;
        counter.textContent = len + ' / 250';
    }

    /* Image upload with compression */
    function compressImage(file, maxW, maxH, quality, cb, folder) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var w = img.width, h = img.height;
                if (w > maxW) { h = h * maxW / w; w = maxW; }
                if (h > maxH) { w = w * maxH / h; h = maxH; }
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(w);
                canvas.height = Math.round(h);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(function(blob) {
                    if (!blob) { cb(null); return; }
                    var formData = new FormData();
                    formData.append('file', blob, 'upload.jpg');
                    var uploadFolder = folder || 'uploads';
                    var token = HiveAuth.getToken();
                    fetch(API_BASE + '/api/upload?folder=' + uploadFolder, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'ngrok-skip-browser-warning': 'true',
                        },
                        body: formData,
                    })
                    .then(function(resp) { return resp.json(); })
                    .then(function(data) {
                        if (data.success && data.url) {
                            cb(data.url);
                        } else {
                            console.error('[HIVE] Upload failed:', data);
                            cb(null);
                        }
                    })
                    .catch(function(err) {
                        console.error('[HIVE] Upload error:', err);
                        cb(null);
                    });
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function uploadImageToR2(file, folder, cb) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var w = img.width, h = img.height;
                var maxW = 512, maxH = 512;
                if (w > maxW) { h = h * maxW / w; w = maxW; }
                if (h > maxH) { w = w * maxH / h; h = maxH; }
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(w);
                canvas.height = Math.round(h);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(function(blob) {
                    if (!blob) { cb(null); return; }
                    var formData = new FormData();
                    formData.append('file', blob, 'upload.jpg');
                    var token = HiveAuth.getToken();
                    fetch(API_BASE + '/api/upload?folder=' + (folder || 'uploads'), {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'ngrok-skip-browser-warning': 'true',
                        },
                        body: formData,
                    })
                    .then(function(resp) { return resp.json(); })
                    .then(function(data) {
                        cb(data.success ? data.url : null);
                    })
                    .catch(function() { cb(null); });
                }, 'image/jpeg', 0.85);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /* ── Edit Profile Init ───────────────────── */
    function initEditProfile() {
        var backBtn = $('rpanel-edit-back');
        var saveBtn = $('rpanel-save-btn');

        if (backBtn) backBtn.addEventListener('click', closeEditProfile);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && editProfileOpen) closeEditProfile();
            if (e.key === 'Escape' && state.notifOpen) {
                e.preventDefault();
                closeNotifications();
            }
        });

        if (saveBtn) saveBtn.addEventListener('click', saveEditProfile);

        /* Avatar upload */
        var avUpload = $('rpanel-avatar-upload');
        var avInput = $('rpanel-avatar-input');
        if (avUpload && avInput) {
            avUpload.addEventListener('click', function() { avInput.click(); });
            avInput.addEventListener('change', function() {
                if (!avInput.files || !avInput.files[0]) return;
                compressImage(avInput.files[0], 512, 512, 0.85, function(data) {
                    if (!data) { showToast('Image upload failed', 'error'); return; }
                    editFormState.profile_picture = data;
                    markDirty();
                    updateEditPreview();
                }, 'avatars');
            });

            /* Drag and drop */
            avUpload.addEventListener('dragover', function(e) { e.preventDefault(); avUpload.style.borderColor = 'var(--primary)'; });
            avUpload.addEventListener('dragleave', function() { avUpload.style.borderColor = ''; });
            avUpload.addEventListener('drop', function(e) {
                e.preventDefault();
                avUpload.style.borderColor = '';
                var files = e.dataTransfer.files;
                if (files && files[0] && files[0].type.startsWith('image/')) {
                    compressImage(files[0], 512, 512, 0.85, function(data) {
                        if (!data) { showToast('Image upload failed', 'error'); return; }
                        editFormState.profile_picture = data;
                        markDirty();
                        updateEditPreview();
                    }, 'avatars');
                }
            });
        }

        /* Avatar remove */
        var avRemove = $('rpanel-avatar-remove');
        if (avRemove) {
            avRemove.addEventListener('click', function() {
                var prevAv = $('rpanel-avatar-upload-preview');
                var prevRing = $('rpanel-preview-avatar');
                if (prevAv) prevAv.style.opacity = '0.5';
                if (prevRing) prevRing.style.opacity = '0.5';

                HiveAuth.apiFetch('/api/profile/avatar', { method: 'DELETE' })
                    .then(function(data) {
                        if (data && data.success) {
                            var newUrl = data.profile_picture || null;
                            editFormState.profile_picture = newUrl;
                            state.user.profile_picture = newUrl;
                            markDirty();
                            updateEditPreview();
                            refreshUserPanel();
                            showToast('Avatar removed', 'success');
                        } else {
                            showToast((data && data.message) || 'Failed to remove avatar', 'error');
                        }
                    })
                    .catch(function(err) {
                        console.error('[HIVE] Remove avatar error:', err);
                        showToast(err.message || 'Failed to remove avatar', 'error');
                    })
                    .finally(function() {
                        if (prevAv) prevAv.style.opacity = '';
                        if (prevRing) prevRing.style.opacity = '';
                    });
            });
        }

        /* Cover upload */
        var coverUpload = $('rpanel-cover-upload');
        var coverInput = $('rpanel-cover-input');
        if (coverUpload && coverInput) {
            coverUpload.addEventListener('click', function() { coverInput.click(); });
            coverInput.addEventListener('change', function() {
                if (!coverInput.files || !coverInput.files[0]) return;
                compressImage(coverInput.files[0], 1200, 400, 0.8, function(data) {
                    if (!data) { showToast('Image upload failed', 'error'); return; }
                    editFormState.profile_banner = data;
                    markDirty();
                    updateEditPreview();
                    var coverPrev = $('rpanel-cover-preview');
                    var coverPlaceholder = $('rpanel-cover-placeholder');
                    var coverRemove = $('rpanel-cover-remove');
                    if (coverPrev) coverPrev.style.backgroundImage = 'url(' + data + ')';
                    if (coverPlaceholder) coverPlaceholder.style.display = 'none';
                    if (coverRemove) coverRemove.style.display = '';
                }, 'banners');
            });

            /* Drag and drop */
            coverUpload.addEventListener('dragover', function(e) { e.preventDefault(); coverUpload.style.borderColor = 'var(--primary)'; });
            coverUpload.addEventListener('dragleave', function() { coverUpload.style.borderColor = ''; });
            coverUpload.addEventListener('drop', function(e) {
                e.preventDefault();
                coverUpload.style.borderColor = '';
                var files = e.dataTransfer.files;
                if (files && files[0] && files[0].type.startsWith('image/')) {
                    compressImage(files[0], 1200, 400, 0.8, function(data) {
                        if (!data) { showToast('Image upload failed', 'error'); return; }
                        editFormState.profile_banner = data;
                        markDirty();
                        updateEditPreview();
                        var coverPrev = $('rpanel-cover-preview');
                        var coverPlaceholder = $('rpanel-cover-placeholder');
                        var coverRemove = $('rpanel-cover-remove');
                        if (coverPrev) coverPrev.style.backgroundImage = 'url(' + data + ')';
                        if (coverPlaceholder) coverPlaceholder.style.display = 'none';
                        if (coverRemove) coverRemove.style.display = '';
                    }, 'banners');
                }
            });
        }

        /* Cover remove */
        var coverRemove = $('rpanel-cover-remove');
        if (coverRemove) {
            coverRemove.addEventListener('click', function() {
                var coverPrev = $('rpanel-cover-preview');
                var coverPlaceholder = $('rpanel-cover-placeholder');
                if (coverPrev) coverPrev.style.opacity = '0.5';

                HiveAuth.apiFetch('/api/profile/banner', { method: 'DELETE' })
                    .then(function(data) {
                        if (data && data.success) {
                            editFormState.profile_banner = null;
                            state.user.profile_banner = null;
                            markDirty();
                            updateEditPreview();
                            if (coverPrev) coverPrev.style.backgroundImage = '';
                            if (coverPlaceholder) coverPlaceholder.style.display = '';
                            coverRemove.style.display = 'none';
                            refreshUserPanel();
                            showToast('Cover removed', 'success');
                        } else {
                            showToast((data && data.message) || 'Failed to remove cover', 'error');
                        }
                    })
                    .catch(function(err) {
                        console.error('[HIVE] Remove cover error:', err);
                        showToast(err.message || 'Failed to remove cover', 'error');
                    })
                    .finally(function() {
                        if (coverPrev) coverPrev.style.opacity = '';
                    });
            });
        }

        /* Bio input */
        var bioInput = $('rpanel-bio-input');
        if (bioInput) {
            autoResizeBio(bioInput);
            bioInput.addEventListener('input', function() {
                var val = bioInput.value;
                if (val !== editFormState.bio) {
                    editFormState.bio = val;
                    markDirty();
                    updateEditPreview();
                }
            });
        }
    }

    async function saveEditProfile() {
        var saveBtn = $('rpanel-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="15"/></svg> Saving...';
        }

        try {
            var payload = {};

            if (editFormState.profile_picture !== state.user.profile_picture) {
                payload.profile_picture = editFormState.profile_picture || '';
            }
            if (editFormState.profile_banner !== state.user.profile_banner) {
                payload.profile_banner = editFormState.profile_banner || '';
            }
            if (editFormState.bio !== state.user.bio) {
                payload.bio = editFormState.bio;
            }

            var data = await HiveAuth.apiFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (data && data.success) {
                if (data.profile) {
                    state.user = Object.assign(state.user, data.profile);
                }
                editDirty = false;
                showToast('Profile updated!', 'success');
                closeEditProfile();
                refreshUserPanel();
            } else {
                showToast((data && data.message) || 'Failed to update profile', 'error');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save';
                }
            }
        } catch (ex) {
            console.error('[HIVE] Save profile error:', ex);
            showToast(ex.message || 'Network error. Please try again.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save';
            }
        }
    }

    /* ══════════════════════════════════════════════
       APPEARANCE PANEL (right-side)
       ══════════════════════════════════════════════ */
    var appearanceOpen = false;
    var appearanceState = { textColor: '', usernameColor: null, profileFont: '', chatTextFont: '', profileRing: 'none', profileEffect: 'none', profileMusic: '', profileMusicTitle: '', profileMusicArtist: '' };

    var DEFAULT_FONTS = [
        'Inter', 'Poppins', 'Outfit', 'Manrope', 'Rubik',
        'Nunito', 'Quicksand', 'Space Grotesk', 'Plus Jakarta Sans', 'Urbanist',
    ];

    var ALL_FONTS = [
        'Inter', 'Poppins', 'Outfit', 'Manrope', 'Rubik',
        'Nunito', 'Quicksand', 'Space Grotesk', 'Plus Jakarta Sans', 'Urbanist',
        'DM Sans', 'Figtree', 'Sora', 'Lexend', 'Work Sans',
        'IBM Plex Sans', 'IBM Plex Serif', 'Source Sans 3', 'Source Serif 4',
        'Lato', 'Montserrat', 'Raleway', 'Ubuntu', 'PT Sans',
        'Karla', 'Cabin', 'Mulish', 'Merriweather', 'Playfair Display',
        'Libre Baskerville', 'Josefin Sans', 'Oxygen', 'Exo 2',
        'Barlow', 'Barlow Condensed', 'Archivo', 'Assistant', 'Asap',
        'Public Sans', 'Noto Sans', 'Fira Sans', 'Fira Code',
        'JetBrains Mono', 'Roboto', 'Open Sans', 'Bebas Neue',
        'Dancing Script', 'Pacifico', 'Epilogue', 'Be Vietnam Pro',
        'Syne', 'DM Mono', 'Space Mono', 'Jost', 'Libre Franklin',
        'Oswald', 'Heebo', 'Red Hat Display',
    ];

    var ALL_RINGS = [
        { id: 'none', name: 'None', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#6B7280" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>' },
        { id: 'ring_honey', name: 'Honey Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5" fill="#FBBF24" opacity="0.9"/><polygon points="12,6 17,9 17,15 12,18 7,15 7,9" fill="#F59E0B"/><circle cx="12" cy="12" r="2.5" fill="#92400E"/></svg>' },
        { id: 'ring_lightning', name: 'Lightning Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="13,2 5,13 11,13 10,22 19,11 13,11" fill="#00E5FF" stroke="#0284C7" stroke-width="0.5"/></svg>' },
        { id: 'ring_inferno', name: 'Inferno Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" fill="#FF4500"/><path d="M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 0 0 7 0c0-2-1.5-4-3.5-7z" fill="#FFD700"/></svg>' },
        { id: 'ring_galaxy', name: 'Galaxy Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="#C084FC"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#7C3AED" stroke-width="1.5" transform="rotate(-25 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#A78BFA" stroke-width="1.5" transform="rotate(25 12 12)"/></svg>' },
        { id: 'ring_diamond', name: 'Diamond Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 22,9 12,22 2,9" fill="#67E8F9" stroke="#06B6D4" stroke-width="0.8"/><polygon points="12,2 16,9 12,22 8,9" fill="#A5F3FC" opacity="0.6"/></svg>' },
        { id: 'ring_royal', name: 'Royal Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18l2-10 4 4 2-5 2 5 4-4 2 10z" fill="#8B5CF6"/><circle cx="6" cy="8" r="1.3" fill="#FDE68A"/><circle cx="12" cy="5" r="1.5" fill="#FDE68A"/><circle cx="18" cy="8" r="1.3" fill="#FDE68A"/><rect x="4" y="18" width="16" height="2" rx="1" fill="#7C3AED"/></svg>' },
        { id: 'ring_rainbow', name: 'Rainbow Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke-linecap="round"><path d="M3 18a9 9 0 0 1 18 0" stroke="#EF4444" stroke-width="2"/><path d="M5.5 18a6.5 6.5 0 0 1 13 0" stroke="#F59E0B" stroke-width="2"/><path d="M8 18a4 4 0 0 1 8 0" stroke="#22C55E" stroke-width="2"/><path d="M10.5 18a1.5 1.5 0 0 1 3 0" stroke="#3B82F6" stroke-width="2"/></svg>' },
        { id: 'ring_frost', name: 'Frost Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><line x1="12" y1="2" x2="12" y2="22" stroke="#93C5FD" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="12" x2="22" y2="12" stroke="#93C5FD" stroke-width="2" stroke-linecap="round"/><line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#BFDBFE" stroke-width="1.5" stroke-linecap="round"/><line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke="#BFDBFE" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="#DBEAFE"/></svg>' },
        { id: 'ring_sakura', name: 'Sakura Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="9" r="2" fill="#FDF2F8"/><ellipse cx="12" cy="5" rx="2.5" ry="3" fill="#F9A8D4"/><ellipse cx="8.5" cy="8" rx="3" ry="2.5" fill="#F472B6" transform="rotate(-30 8.5 8)"/><ellipse cx="15.5" cy="8" rx="3" ry="2.5" fill="#F472B6" transform="rotate(30 15.5 8)"/><ellipse cx="9.5" cy="12" rx="3" ry="2.5" fill="#EC4899" transform="rotate(-60 9.5 12)"/><ellipse cx="14.5" cy="12" rx="3" ry="2.5" fill="#EC4899" transform="rotate(60 14.5 12)"/></svg>' },
        { id: 'ring_lunar', name: 'Lunar Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#C4B5FD" stroke="#8B5CF6" stroke-width="0.5"/><circle cx="16" cy="7" r="0.8" fill="#EDE9FE"/><circle cx="18" cy="11" r="0.5" fill="#EDE9FE"/><circle cx="15" cy="14" r="0.6" fill="#EDE9FE"/></svg>' },
        { id: 'ring_neon_blue', name: 'Neon Blue', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 20,7 20,17 12,22 4,17 4,7" fill="none" stroke="#00BFFF" stroke-width="2"/><polygon points="12,7 16,9.5 16,14.5 12,17 8,14.5 8,9.5" fill="#00BFFF" opacity="0.3"/><circle cx="12" cy="12" r="2" fill="#00BFFF"/></svg>' },
        { id: 'ring_neon_pink', name: 'Neon Pink', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#FF1493" stroke="#DB2777" stroke-width="0.5"/></svg>' },
        { id: 'ring_neon_green', name: 'Neon Green', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M22 12h-4l-3 9L9 3l-3 9H2" fill="none" stroke="#00FF7F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { id: 'ring_amethyst', name: 'Amethyst', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 4,9 12,22 20,9" fill="#9B59B6" stroke="#7D3C98" stroke-width="0.5"/><polygon points="12,2 16,9 12,22 8,9" fill="#A855F7" opacity="0.5"/></svg>' },
        { id: 'ring_ember', name: 'Ember Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="13" r="8" fill="#E67E22"/><circle cx="12" cy="13" r="5" fill="#D35400"/><circle cx="12" cy="13" r="2.5" fill="#FF8C00"/><circle cx="12" cy="13" r="1" fill="#FFD700"/></svg>' },
        { id: 'ring_aurora', name: 'Aurora Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke-linecap="round"><path d="M2 18c2-4 4-8 6-8s2 5 4 5 2-7 4-7 2 5 4 5" stroke="#00FF87" stroke-width="2.5" opacity="0.8"/><path d="M2 15c2-3 4-6 6-6s2 4 4 4 2-5 4-5 2 4 4 4" stroke="#60EFFF" stroke-width="1.5" opacity="0.5"/></svg>' },
        { id: 'ring_sunset', name: 'Sunset Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18a8 8 0 0 1 16 0" fill="#FF6B6B" opacity="0.3"/><circle cx="12" cy="14" r="5" fill="#FFA94D"/><circle cx="12" cy="14" r="3" fill="#FFD93D"/><line x1="12" y1="5" x2="12" y2="8" stroke="#FFA94D" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="11" x2="7" y2="12.5" stroke="#FFA94D" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="11" x2="17" y2="12.5" stroke="#FFA94D" stroke-width="2" stroke-linecap="round"/></svg>' },
        { id: 'ring_ocean', name: 'Ocean Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke-linecap="round"><path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="#0077B6" stroke-width="2.5"/><path d="M2 14.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="#00B4D8" stroke-width="2"/><path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="#90E0EF" stroke-width="1.5"/></svg>' },
        { id: 'ring_crystal', name: 'Crystal Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 8,10 12,22 16,10" fill="#A5B4FC" stroke="#818CF8" stroke-width="0.8"/><line x1="8" y1="10" x2="16" y2="10" stroke="#C7D2FE" stroke-width="1"/><line x1="12" y1="2" x2="10" y2="10" stroke="#E0E7FF" stroke-width="0.5" opacity="0.6"/><line x1="12" y1="2" x2="14" y2="10" stroke="#E0E7FF" stroke-width="0.5" opacity="0.6"/></svg>' },
        { id: 'ring_rose_gold', name: 'Rose Gold', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#FFB7B2"/><circle cx="12" cy="12" r="6" fill="#E5989B"/><circle cx="12" cy="12" r="3" fill="#B56576"/><circle cx="12" cy="12" r="1.2" fill="#FFF5F5"/></svg>' },
        { id: 'ring_shadow', name: 'Shadow Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#1A1A2E"/><circle cx="12" cy="12" r="7" fill="#16213E"/><circle cx="12" cy="12" r="4" fill="#0F3460"/><circle cx="12" cy="12" r="1.5" fill="#E94560" opacity="0.8"/></svg>' },
        { id: 'ring_flame', name: 'Flame Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" fill="#FF8C00"/><path d="M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 0 0 7 0c0-2-1.5-4-3.5-7z" fill="#FFD700"/><path d="M12 12c-1 1.5-1.5 2.5-1.5 3.5a1.5 1.5 0 0 0 3 0c0-1-.5-2-1.5-3.5z" fill="#FFF7ED"/></svg>' },
        { id: 'ring_thunder', name: 'Thunder Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="14,2 6,13 12,13 10,22 18,11 12,11" fill="#FFD700" stroke="#F59E0B" stroke-width="0.5"/></svg>' },
        { id: 'ring_cosmic', name: 'Cosmic Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="#C084FC"/><circle cx="12" cy="12" r="6" fill="none" stroke="#7C3AED" stroke-width="1.5"/><circle cx="12" cy="12" r="9.5" fill="none" stroke="#A78BFA" stroke-width="1" stroke-dasharray="3 2"/><circle cx="5" cy="6" r="0.8" fill="#E9D5FF"/><circle cx="19" cy="8" r="0.6" fill="#E9D5FF"/><circle cx="17" cy="18" r="0.7" fill="#E9D5FF"/></svg>' },
        { id: 'ring_starlight', name: 'Starlight', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 14.5,8.5 21.5,9.3 16.2,14 17.5,21 12,17.5 6.5,21 7.8,14 2.5,9.3 9.5,8.5" fill="#FDE68A" stroke="#F59E0B" stroke-width="0.5"/></svg>' },
        { id: 'ring_moonlight', name: 'Moonlight', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="0.5"/><circle cx="16" cy="8" r="1" fill="#F8FAFC"/><circle cx="18" cy="12" r="0.6" fill="#F8FAFC"/><circle cx="15" cy="15" r="0.7" fill="#F8FAFC"/></svg>' },
        { id: 'ring_sunflare', name: 'Sunflare', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="4" fill="#FFD700"/><circle cx="12" cy="12" r="6" fill="none" stroke="#FFA500" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="5" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="5" x2="7" y2="7" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round"/><line x1="17" y1="17" x2="19" y2="19" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round"/><line x1="19" y1="5" x2="17" y2="7" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="19" x2="7" y2="17" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round"/></svg>' },
        { id: 'ring_nebula', name: 'Nebula Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#EC4899" opacity="0.2"/><circle cx="10" cy="10" r="5" fill="#8B5CF6" opacity="0.4"/><circle cx="14" cy="14" r="4" fill="#06B6D4" opacity="0.4"/><circle cx="12" cy="12" r="2" fill="#FDF2F8"/></svg>' },
        { id: 'ring_quantum', name: 'Quantum Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="2.5" fill="#00FF00"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#00FF00" stroke-width="1.5" opacity="0.6"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#00FFFF" stroke-width="1.5" opacity="0.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#FF00FF" stroke-width="1.5" opacity="0.6" transform="rotate(120 12 12)"/></svg>' },
        { id: 'ring_void', name: 'Void Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#0F0F23"/><circle cx="12" cy="12" r="6" fill="none" stroke="#1E1E3F" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#7C3AED" opacity="0.6"/><circle cx="12" cy="12" r="1" fill="#C084FC"/></svg>' },
        { id: 'ring_phoenix', name: 'Phoenix Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" fill="#FF4500"/><path d="M8 10l4-6 4 6" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="14" r="2" fill="#FFD700" opacity="0.6"/></svg>' },
        { id: 'ring_dragon', name: 'Dragon Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 4l-2 6M16 4l2 6" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14" r="7" fill="#DC2626"/><circle cx="9.5" cy="13" r="1.2" fill="#FCA5A5"/><circle cx="14.5" cy="13" r="1.2" fill="#FCA5A5"/><path d="M9.5 17c1 1 4 1 5 0" stroke="#FCA5A5" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>' },
        { id: 'ring_wolf', name: 'Wolf Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18l3-10 3 5 2-4 2 4 3-5 3 10" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="12" r="1" fill="#CBD5E1"/><circle cx="15" cy="12" r="1" fill="#CBD5E1"/></svg>' },
        { id: 'ring_forest', name: 'Forest Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3L7 11h3l-3 5h3l-3 5h10l-3-5h3l-3-5h3L12 3z" fill="#166534"/><rect x="11" y="19" width="2" height="3" fill="#92400E"/></svg>' },
        { id: 'ring_arctic', name: 'Arctic Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#DBEAFE"/><circle cx="12" cy="12" r="6" fill="#BFDBFE"/><circle cx="12" cy="12" r="2.5" fill="#93C5FD"/><line x1="12" y1="2" x2="12" y2="22" stroke="#60A5FA" stroke-width="1" opacity="0.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="#60A5FA" stroke-width="1" opacity="0.5"/></svg>' },
        { id: 'ring_desert', name: 'Desert Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M2 18c3-4 6-8 10-8s7 4 10 8" fill="#D4A574"/><path d="M2 18c3-3 6-6 10-6s7 3 10 6" fill="#C28B5E" opacity="0.6"/><circle cx="17" cy="6" r="3" fill="#FDE68A"/></svg>' },
        { id: 'ring_tropical', name: 'Tropical Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="11" y="12" width="2" height="9" fill="#92400E" rx="1"/><path d="M12 12c-3 0-6-2-7-5 4 0 6 2 7 5z" fill="#22C55E"/><path d="M12 12c3 0 6-2 7-5-4 0-6 2-7 5z" fill="#16A34A"/><path d="M12 10c-2-1-4-3-4-6 3 0 4 2 4 6z" fill="#4ADE80"/></svg>' },
        { id: 'ring_valentine', name: 'Valentine Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#FF69B4"/><path d="M12 8v5M9.5 10.5h5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' },
        { id: 'ring_harvest', name: 'Harvest Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="11" y="10" width="2" height="11" fill="#92400E" rx="1"/><ellipse cx="9" cy="8" rx="2" ry="3" fill="#F59E0B" transform="rotate(-15 9 8)"/><ellipse cx="15" cy="8" rx="2" ry="3" fill="#F59E0B" transform="rotate(15 15 8)"/><ellipse cx="12" cy="6" rx="1.8" ry="3" fill="#FBBF24"/><circle cx="12" cy="4" r="1" fill="#FDE68A"/></svg>' },
        { id: 'ring_winter', name: 'Winter Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><line x1="12" y1="2" x2="12" y2="22" stroke="#BAE6FD" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="12" x2="22" y2="12" stroke="#BAE6FD" stroke-width="2" stroke-linecap="round"/><line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#E0F2FE" stroke-width="1.5" stroke-linecap="round"/><line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke="#E0F2FE" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="white"/></svg>' },
        { id: 'ring_spring', name: 'Spring Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 22V12" stroke="#16A34A" stroke-width="2" stroke-linecap="round"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5z" fill="#4ADE80"/><path d="M12 12c3 0 5-2 5-5-3 0-5 2-5 5z" fill="#22C55E"/><circle cx="12" cy="7" r="2" fill="#F472B6"/><circle cx="9" cy="18" r="1.5" fill="#A3E635" opacity="0.7"/><circle cx="15" cy="16" r="1.2" fill="#A3E635" opacity="0.6"/></svg>' },
        { id: 'ring_ancient', name: 'Ancient Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="8" width="16" height="13" rx="2" fill="#8B7355"/><path d="M8 8V6a4 4 0 0 1 8 0v2" fill="none" stroke="#A0896C" stroke-width="2"/><circle cx="12" cy="15" r="2.5" fill="#654321"/><circle cx="12" cy="15" r="1" fill="#B8A080"/></svg>' },
        { id: 'ring_future', name: 'Future Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="none" stroke="#38BDF8" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#818CF8" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="#C084FC" stroke-width="2" stroke-linecap="round" fill="none"/></svg>' },
        { id: 'ring_digital', name: 'Digital Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#00FF00" stroke-width="1.5"/><rect x="7" y="7" width="4" height="4" fill="#00FF00" opacity="0.8"/><rect x="13" y="7" width="4" height="4" fill="#00FFFF" opacity="0.6"/><rect x="7" y="13" width="4" height="4" fill="#00FFFF" opacity="0.6"/><rect x="13" y="13" width="4" height="4" fill="#FF00FF" opacity="0.6"/></svg>' },
        { id: 'ring_steampunk', name: 'Steampunk', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8" fill="#B87333" opacity="0.3"/><circle cx="12" cy="12" r="8" fill="none" stroke="#B87333" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#8B4513"/><circle cx="12" cy="12" r="1.2" fill="#D4A574"/><line x1="12" y1="4" x2="12" y2="2" stroke="#B87333" stroke-width="3" stroke-linecap="round"/><line x1="12" y1="22" x2="12" y2="20" stroke="#B87333" stroke-width="3" stroke-linecap="round"/><line x1="4" y1="12" x2="2" y2="12" stroke="#B87333" stroke-width="3" stroke-linecap="round"/><line x1="22" y1="12" x2="20" y2="12" stroke="#B87333" stroke-width="3" stroke-linecap="round"/></svg>' },
        { id: 'ring_cyber', name: 'Cyber Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 17l5-5-5-5" stroke="#FF00FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M13 17h6" stroke="#00FFFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="18" cy="7" r="3" fill="none" stroke="#FF00FF" stroke-width="1.5"/></svg>' },
        { id: 'ring_ghost', name: 'Ghost Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3C8 3 5 6.5 5 10v9l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2 2.5 2v-9c0-3.5-3-7-7-7z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="0.5"/><circle cx="10" cy="10" r="1.5" fill="#1E293B"/><circle cx="14" cy="10" r="1.5" fill="#1E293B"/></svg>' },
        { id: 'ring_angel', name: 'Angel Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="13" r="7" fill="#FEF08A" opacity="0.3"/><circle cx="12" cy="13" r="7" fill="none" stroke="#FDE047" stroke-width="2"/><circle cx="12" cy="13" r="3" fill="#FACC15" opacity="0.5"/><line x1="12" y1="2" x2="12" y2="4" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="7" x2="6.5" y2="8.5" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="7" x2="17.5" y2="8.5" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/></svg>' },
        { id: 'ring_demon', name: 'Demon Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 3l-2 5M16 3l2 5" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14" r="7" fill="#7F1D1D"/><circle cx="9.5" cy="13" r="1.2" fill="#FCA5A5"/><circle cx="14.5" cy="13" r="1.2" fill="#FCA5A5"/><path d="M9.5 17c1 1 4 1 5 0" stroke="#FCA5A5" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>' }
    ];

    var RING_GRADIENTS = {
        ring_honey: { bg: 'linear-gradient(135deg,#FBBF24,#F59E0B,#D97706)', shadow: '0 0 20px rgba(251,191,36,0.3)' },
        ring_lightning: { bg: 'linear-gradient(135deg,#00E5FF,#3B82F6,#6366F1)', shadow: '0 0 20px rgba(0,229,255,0.3)' },
        ring_inferno: { bg: 'linear-gradient(135deg,#FF4500,#FF6B35,#FF0000)', shadow: '0 0 20px rgba(255,69,0,0.3)' },
        ring_galaxy: { bg: 'linear-gradient(135deg,#7C3AED,#3B82F6,#EC4899)', shadow: '0 0 20px rgba(124,58,237,0.3)' },
        ring_diamond: { bg: 'linear-gradient(135deg,#06B6D4,#22D3EE,#67E8F9)', shadow: '0 0 20px rgba(6,182,212,0.3)' },
        ring_royal: { bg: 'linear-gradient(135deg,#7C3AED,#8B5CF6,#A78BFA)', shadow: '0 0 20px rgba(124,58,237,0.35)' },
        ring_rainbow: { bg: 'linear-gradient(135deg,#FF0000,#FF7F00,#FFFF00,#00FF00,#0000FF,#4B0082,#9400D3)', shadow: '0 0 20px rgba(255,0,0,0.2)' },
        ring_frost: { bg: 'linear-gradient(135deg,#93C5FD,#60A5FA,#3B82F6)', shadow: '0 0 20px rgba(147,197,253,0.3)' },
        ring_sakura: { bg: 'linear-gradient(135deg,#F9A8D4,#F472B6,#EC4899)', shadow: '0 0 20px rgba(249,168,212,0.3)' },
        ring_lunar: { bg: 'linear-gradient(135deg,#C4B5FD,#A78BFA,#8B5CF6)', shadow: '0 0 20px rgba(196,181,253,0.2)' },
        ring_neon_blue: { bg: 'linear-gradient(135deg,#00BFFF,#1E90FF,#00BFFF)', shadow: '0 0 20px rgba(0,191,255,0.4)' },
        ring_neon_pink: { bg: 'linear-gradient(135deg,#FF1493,#FF69B4,#FF1493)', shadow: '0 0 20px rgba(255,20,147,0.4)' },
        ring_neon_green: { bg: 'linear-gradient(135deg,#00FF7F,#32CD32,#00FF7F)', shadow: '0 0 20px rgba(0,255,127,0.4)' },
        ring_amethyst: { bg: 'linear-gradient(135deg,#9B59B6,#8E44AD,#7D3C98)', shadow: '0 0 20px rgba(155,89,182,0.35)' },
        ring_ember: { bg: 'linear-gradient(135deg,#E67E22,#D35400,#E74C3C)', shadow: '0 0 20px rgba(230,126,34,0.35)' },
        ring_aurora: { bg: 'linear-gradient(135deg,#00FF87,#60EFFF,#00FF87)', shadow: '0 0 20px rgba(0,255,135,0.3)' },
        ring_sunset: { bg: 'linear-gradient(135deg,#FF6B6B,#FFA94D,#FFD93D)', shadow: '0 0 20px rgba(255,107,107,0.3)' },
        ring_ocean: { bg: 'linear-gradient(135deg,#0077B6,#00B4D8,#90E0EF)', shadow: '0 0 20px rgba(0,119,182,0.3)' },
        ring_crystal: { bg: 'linear-gradient(135deg,#E0E7FF,#A5B4FC,#818CF8)', shadow: '0 0 20px rgba(224,231,255,0.25)' },
        ring_rose_gold: { bg: 'linear-gradient(135deg,#FFB7B2,#E5989B,#B56576)', shadow: '0 0 20px rgba(255,183,178,0.3)' },
        ring_shadow: { bg: 'linear-gradient(135deg,#4A4A4A,#2D2D2D,#1A1A1A)', shadow: '0 0 20px rgba(0,0,0,0.4)' },
        ring_flame: { bg: 'linear-gradient(135deg,#FF4500,#FF8C00,#FFD700)', shadow: '0 0 20px rgba(255,69,0,0.4)' },
        ring_thunder: { bg: 'linear-gradient(135deg,#FFD700,#FFA500,#FF8C00)', shadow: '0 0 20px rgba(255,215,0,0.3)' },
        ring_cosmic: { bg: 'linear-gradient(135deg,#6B21A8,#9333EA,#C084FC)', shadow: '0 0 20px rgba(107,33,168,0.3)' },
        ring_starlight: { bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A,#FCD34D)', shadow: '0 0 20px rgba(254,243,199,0.3)' },
        ring_moonlight: { bg: 'linear-gradient(135deg,#E2E8F0,#CBD5E1,#94A3B8)', shadow: '0 0 20px rgba(226,232,240,0.2)' },
        ring_sunflare: { bg: 'linear-gradient(135deg,#FFD700,#FFA500,#FF8C00)', shadow: '0 0 20px rgba(255,215,0,0.4)' },
        ring_nebula: { bg: 'linear-gradient(135deg,#EC4899,#8B5CF6,#06B6D4)', shadow: '0 0 20px rgba(236,72,153,0.3)' },
        ring_quantum: { bg: 'linear-gradient(135deg,#00FF00,#00FFFF,#FF00FF)', shadow: '0 0 20px rgba(0,255,0,0.3)' },
        ring_void: { bg: 'linear-gradient(135deg,#1A1A2E,#16213E,#0F3460)', shadow: '0 0 20px rgba(26,26,46,0.5)' },
        ring_phoenix: { bg: 'linear-gradient(135deg,#FF4500,#FF6B35,#FFD700)', shadow: '0 0 20px rgba(255,69,0,0.35)' },
        ring_dragon: { bg: 'linear-gradient(135deg,#DC2626,#EF4444,#F87171)', shadow: '0 0 20px rgba(220,38,38,0.35)' },
        ring_wolf: { bg: 'linear-gradient(135deg,#64748B,#475569,#334155)', shadow: '0 0 20px rgba(100,116,139,0.3)' },
        ring_forest: { bg: 'linear-gradient(135deg,#166534,#15803D,#22C55E)', shadow: '0 0 20px rgba(22,101,52,0.3)' },
        ring_arctic: { bg: 'linear-gradient(135deg,#DBEAFE,#BFDBFE,#93C5FD)', shadow: '0 0 20px rgba(219,234,254,0.25)' },
        ring_desert: { bg: 'linear-gradient(135deg,#D4A574,#C28B5E,#B07D4B)', shadow: '0 0 20px rgba(212,165,116,0.3)' },
        ring_tropical: { bg: 'linear-gradient(135deg,#00C9FF,#92FE9D,#00C9FF)', shadow: '0 0 20px rgba(0,201,255,0.3)' },
        ring_valentine: { bg: 'linear-gradient(135deg,#FF69B4,#FF1493,#DB2777)', shadow: '0 0 20px rgba(255,105,180,0.3)' },
        ring_harvest: { bg: 'linear-gradient(135deg,#D97706,#F59E0B,#FBBF24)', shadow: '0 0 20px rgba(217,119,6,0.3)' },
        ring_winter: { bg: 'linear-gradient(135deg,#93C5FD,#E0F2FE,#BAE6FD)', shadow: '0 0 20px rgba(147,197,253,0.2)' },
        ring_spring: { bg: 'linear-gradient(135deg,#86EFAC,#6EE7B7,#A7F3D0)', shadow: '0 0 20px rgba(134,239,172,0.3)' },
        ring_ancient: { bg: 'linear-gradient(135deg,#8B7355,#A0896C,#B8A080)', shadow: '0 0 20px rgba(139,115,85,0.3)' },
        ring_future: { bg: 'linear-gradient(135deg,#38BDF8,#818CF8,#C084FC)', shadow: '0 0 20px rgba(56,189,248,0.3)' },
        ring_digital: { bg: 'linear-gradient(135deg,#00FF00,#00FFFF,#FF00FF)', shadow: '0 0 20px rgba(0,255,0,0.2)' },
        ring_steampunk: { bg: 'linear-gradient(135deg,#B87333,#8B4513,#654321)', shadow: '0 0 20px rgba(184,115,51,0.3)' },
        ring_cyber: { bg: 'linear-gradient(135deg,#FF00FF,#00FFFF,#FF00FF)', shadow: '0 0 20px rgba(255,0,255,0.3)' },
        ring_ghost: { bg: 'linear-gradient(135deg,#E2E8F0,#CBD5E1,#94A3B8)', shadow: '0 0 20px rgba(226,232,240,0.15)' },
        ring_angel: { bg: 'linear-gradient(135deg,#FEF08A,#FDE047,#FACC15)', shadow: '0 0 20px rgba(254,240,138,0.3)' },
        ring_demon: { bg: 'linear-gradient(135deg,#7F1D1D,#991B1B,#B91C1C)', shadow: '0 0 20px rgba(127,29,29,0.4)' },
    };

    var ALL_EFFECTS = [
        { id: 'none', name: 'None', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#6B7280" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>' },
        { id: 'effect_glow_aura', name: 'Glow Aura', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="6" fill="#A78BFA" opacity="0.3"/><circle cx="12" cy="12" r="9" fill="none" stroke="#A78BFA" stroke-width="1.5" opacity="0.6"/><circle cx="12" cy="12" r="4" fill="#C4B5FD"/></svg>' },
        { id: 'effect_neon_pulse', name: 'Neon Pulse', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="5" fill="none" stroke="#00FFFF" stroke-width="2"/><circle cx="12" cy="12" r="8" fill="none" stroke="#00FFFF" stroke-width="1" opacity="0.4"/><circle cx="12" cy="12" r="2" fill="#00FFFF"/></svg>' },
        { id: 'effect_golden_shine', name: 'Golden Shine', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="6" fill="#FFD700" opacity="0.3"/><circle cx="12" cy="12" r="9" fill="none" stroke="#FFD700" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="5" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/></svg>' },
        { id: 'effect_rainbow_glow', name: 'Rainbow Glow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8" fill="none" stroke="#FF0000" stroke-width="2" stroke-dasharray="12 40" stroke-dashoffset="0"/><circle cx="12" cy="12" r="8" fill="none" stroke="#FFFF00" stroke-width="2" stroke-dasharray="12 40" stroke-dashoffset="-10"/><circle cx="12" cy="12" r="8" fill="none" stroke="#00FF00" stroke-width="2" stroke-dasharray="12 40" stroke-dashoffset="-20"/><circle cx="12" cy="12" r="8" fill="none" stroke="#0000FF" stroke-width="2" stroke-dasharray="12 40" stroke-dashoffset="-30"/></svg>' },
        { id: 'effect_electric_sparks', name: 'Electric Sparks', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="13,3 7,12 11,12 10,21 17,12 13,12" fill="#00E5FF" stroke="#0284C7" stroke-width="0.5"/><circle cx="6" cy="6" r="1" fill="#00E5FF" opacity="0.6"/><circle cx="18" cy="8" r="0.8" fill="#00E5FF" opacity="0.5"/><circle cx="5" cy="18" r="0.7" fill="#00E5FF" opacity="0.4"/></svg>' },
        { id: 'effect_floating_stars', name: 'Floating Stars', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,4 13.5,9 18,9.5 14.5,13 15.5,18 12,15 8.5,18 9.5,13 6,9.5 10.5,9" fill="#FDE68A"/><circle cx="5" cy="5" r="1" fill="#FDE68A" opacity="0.6"/><circle cx="19" cy="7" r="0.8" fill="#FDE68A" opacity="0.5"/><circle cx="17" cy="18" r="0.7" fill="#FDE68A" opacity="0.4"/></svg>' },
        { id: 'effect_crystal_shine', name: 'Crystal Shine', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,3 8,10 12,21 16,10" fill="#A5B4FC" opacity="0.4" stroke="#818CF8" stroke-width="1"/><line x1="8" y1="10" x2="16" y2="10" stroke="#C7D2FE" stroke-width="1"/><circle cx="12" cy="10" r="1.5" fill="white" opacity="0.6"/></svg>' },
        { id: 'effect_fire_aura', name: 'Fire Aura', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" fill="#FF4500" opacity="0.4"/><path d="M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 0 0 7 0c0-2-1.5-4-3.5-7z" fill="#FF8C00" opacity="0.6"/><circle cx="12" cy="14" r="2" fill="#FFD700"/></svg>' },
        { id: 'effect_frost_aura', name: 'Frost Aura', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#DBEAFE" opacity="0.3"/><line x1="12" y1="3" x2="12" y2="21" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#BFDBFE"/></svg>' },
        { id: 'effect_shadow_mist', name: 'Shadow Mist', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#1E1B4B" opacity="0.4"/><circle cx="12" cy="12" r="6" fill="#312E81" opacity="0.3"/><circle cx="12" cy="12" r="3" fill="#4338CA" opacity="0.5"/></svg>' },
        { id: 'effect_honey_glow', name: 'Honey Glow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#FBBF24" opacity="0.2"/><polygon points="12,5 16,8 16,16 12,19 8,16 8,8" fill="#F59E0B" opacity="0.5" stroke="#D97706" stroke-width="1"/></svg>' },
        { id: 'effect_aurora', name: 'Aurora', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M2 16c2-4 4-8 6-8s2 5 4 5 2-7 4-7 2 5 4 5" fill="none" stroke="#00FF87" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/><path d="M2 13c2-3 4-6 6-6s2 4 4 4 2-5 4-5 2 4 4 4" fill="none" stroke="#60EFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>' },
        { id: 'effect_galaxy_dust', name: 'Galaxy Dust', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="#C084FC"/><circle cx="12" cy="12" r="7" fill="none" stroke="#7C3AED" stroke-width="1" stroke-dasharray="2 3"/><circle cx="12" cy="12" r="10" fill="none" stroke="#A78BFA" stroke-width="0.8" stroke-dasharray="1.5 3"/><circle cx="6" cy="7" r="0.8" fill="#E9D5FF"/><circle cx="18" cy="9" r="0.6" fill="#E9D5FF"/><circle cx="16" cy="17" r="0.7" fill="#E9D5FF"/></svg>' },
        { id: 'effect_cosmic_orbit', name: 'Cosmic Orbit', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="#6366F1"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#818CF8" stroke-width="1.2" transform="rotate(-25 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#A5B4FC" stroke-width="1.2" transform="rotate(25 12 12)"/><circle cx="5" cy="8" r="1" fill="#C7D2FE"/><circle cx="19" cy="14" r="0.8" fill="#C7D2FE"/></svg>' },
        { id: 'effect_lightning_arc', name: 'Lightning Arc', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="#00E5FF" stroke-width="1.5" stroke-dasharray="4 3"/><polygon points="13,5 8,12 12,12 11,19 16,12 12,12" fill="#00E5FF"/></svg>' },
        { id: 'effect_phoenix_flame', name: 'Phoenix Flame', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" fill="#FF4500" opacity="0.5"/><path d="M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 0 0 7 0c0-2-1.5-4-3.5-7z" fill="#FFD700" opacity="0.7"/><path d="M9 10l3-5 3 5" fill="none" stroke="#FFF7ED" stroke-width="1.5" stroke-linecap="round"/></svg>' },
        { id: 'effect_blue_fire', name: 'Blue Fire', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C8 7 5 10 5 14a7 7 0 0 0 14 0c0-4-3-7-7-12z" fill="#3B82F6" opacity="0.4"/><path d="M12 8c-2 3-3.5 5-3.5 7a3.5 3.5 0 0 0 7 0c0-2-1.5-4-3.5-7z" fill="#60A5FA" opacity="0.6"/><circle cx="12" cy="14" r="2" fill="#93C5FD"/></svg>' },
        { id: 'effect_emerald_energy', name: 'Emerald Energy', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#059669" opacity="0.2"/><polygon points="12,4 8,10 12,20 16,10" fill="#10B981" opacity="0.4" stroke="#059669" stroke-width="1"/><circle cx="12" cy="12" r="2" fill="#34D399"/></svg>' },
        { id: 'effect_ruby_aura', name: 'Ruby Aura', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#DC2626" opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#EF4444" opacity="0.3"/><polygon points="12,6 9,12 12,18 15,12" fill="#F87171" opacity="0.5"/></svg>' },
        { id: 'effect_diamond_sparkle', name: 'Diamond Sparkle', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,3 20,10 12,21 4,10" fill="#E0F2FE" opacity="0.3" stroke="#67E8F9" stroke-width="1"/><polygon points="12,3 16,10 12,21 8,10" fill="white" opacity="0.2"/><circle cx="12" cy="10" r="1.5" fill="white" opacity="0.6"/></svg>' },
        { id: 'effect_neon_wave', name: 'Neon Wave', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="#FF00FF" stroke-width="1.5"/><path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="#00FFFF" stroke-width="2" stroke-linecap="round"/></svg>' },
        { id: 'effect_matrix_rain', name: 'Matrix Rain', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#00FF00" stroke-width="1" opacity="0.4"/><text x="7" y="10" font-size="4" fill="#00FF00" font-family="monospace" opacity="0.8">01</text><text x="14" y="10" font-size="4" fill="#00FF00" font-family="monospace" opacity="0.6">10</text><text x="7" y="16" font-size="4" fill="#00FF00" font-family="monospace" opacity="0.5">11</text><text x="14" y="16" font-size="4" fill="#00FF00" font-family="monospace" opacity="0.7">00</text></svg>' },
        { id: 'effect_sakura_petals', name: 'Sakura Petals', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="9" r="2" fill="#FDF2F8"/><ellipse cx="12" cy="5" rx="2.5" ry="3" fill="#F9A8D4" opacity="0.7"/><ellipse cx="8" cy="8" rx="3" ry="2.5" fill="#F472B6" opacity="0.6" transform="rotate(-30 8 8)"/><ellipse cx="16" cy="8" rx="3" ry="2.5" fill="#F472B6" opacity="0.6" transform="rotate(30 16 8)"/><circle cx="8" cy="17" r="1" fill="#F9A8D4" opacity="0.4"/><circle cx="16" cy="18" r="0.8" fill="#F9A8D4" opacity="0.3"/></svg>' },
        { id: 'effect_falling_leaves', name: 'Falling Leaves', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3L7 11h3l-3 5h3l-3 5h10l-3-5h3l-3-5h3L12 3z" fill="#166534" opacity="0.4"/><ellipse cx="7" cy="7" rx="2" ry="1.2" fill="#22C55E" opacity="0.5" transform="rotate(-20 7 7)"/><ellipse cx="17" cy="8" rx="2" ry="1.2" fill="#4ADE80" opacity="0.4" transform="rotate(15 17 8)"/></svg>' },
        { id: 'effect_snowflakes', name: 'Snowflakes', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#DBEAFE" opacity="0.2"/><line x1="12" y1="3" x2="12" y2="21" stroke="#BAE6FD" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="#BAE6FD" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="white"/></svg>' },
        { id: 'effect_rain_mist', name: 'Rain Mist', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#94A3B8" opacity="0.2"/><line x1="8" y1="4" x2="8" y2="8" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="3" x2="12" y2="7" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><line x1="16" y1="5" x2="16" y2="9" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/></svg>' },
        { id: 'effect_bubble_flow', name: 'Bubble Flow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#DBEAFE" opacity="0.2"/><circle cx="8" cy="8" r="2.5" fill="none" stroke="#60A5FA" stroke-width="1"/><circle cx="15" cy="10" r="2" fill="none" stroke="#93C5FD" stroke-width="1"/><circle cx="10" cy="15" r="1.8" fill="none" stroke="#BFDBFE" stroke-width="1"/><circle cx="16" cy="16" r="1.5" fill="none" stroke="#DBEAFE" stroke-width="1"/></svg>' },
        { id: 'effect_stardust', name: 'Stardust', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="6" fill="#FDE68A" opacity="0.2"/><polygon points="12,5 13.5,9.5 18,10 14.5,13 15.5,18 12,15 8.5,18 9.5,13 6,10 10.5,9.5" fill="#FBBF24" opacity="0.6"/><circle cx="6" cy="6" r="0.8" fill="#FDE68A" opacity="0.7"/><circle cx="18" cy="7" r="0.6" fill="#FDE68A" opacity="0.6"/><circle cx="19" cy="17" r="0.7" fill="#FDE68A" opacity="0.5"/><circle cx="5" cy="18" r="0.5" fill="#FDE68A" opacity="0.4"/></svg>' },
        { id: 'effect_shooting_stars', name: 'Shooting Stars', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#1E1B4B" opacity="0.3"/><line x1="5" y1="7" x2="10" y2="10" stroke="#FDE68A" stroke-width="2" stroke-linecap="round"/><line x1="15" y1="5" x2="18" y2="8" stroke="#FDE68A" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><circle cx="5" cy="7" r="1" fill="#FDE68A"/><circle cx="15" cy="5" r="0.8" fill="#FDE68A" opacity="0.7"/></svg>' },
        { id: 'effect_meteor_trail', name: 'Meteor Trail', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#1E1B4B" opacity="0.2"/><path d="M6 6l12 12" stroke="#FF6B35" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="17" r="2" fill="#FFD700"/><path d="M6 6l-1 1" stroke="#FF8C00" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>' },
        { id: 'effect_solar_flare', name: 'Solar Flare', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="5" fill="#FFD700" opacity="0.4"/><circle cx="12" cy="12" r="8" fill="none" stroke="#FFA500" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="5" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="5" x2="7.5" y2="7.5" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round"/><line x1="16.5" y1="16.5" x2="19" y2="19" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round"/></svg>' },
        { id: 'effect_lunar_glow', name: 'Lunar Glow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#C4B5FD" opacity="0.15"/><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#C4B5FD" opacity="0.4" stroke="#8B5CF6" stroke-width="0.5"/><circle cx="16" cy="8" r="0.8" fill="#EDE9FE"/><circle cx="18" cy="12" r="0.5" fill="#EDE9FE"/></svg>' },
        { id: 'effect_eclipse_shadow', name: 'Eclipse Shadow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#1E1B4B" opacity="0.3"/><circle cx="12" cy="12" r="7" fill="#312E81" opacity="0.3"/><circle cx="12" cy="12" r="5" fill="#0F172A"/><circle cx="12" cy="12" r="9" fill="none" stroke="#6366F1" stroke-width="1" opacity="0.5"/></svg>' },
        { id: 'effect_prism_light', name: 'Prism Light', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,3 4,19 20,19" fill="none" stroke="#A78BFA" stroke-width="1.5"/><line x1="12" y1="3" x2="8" y2="19" stroke="#FF6B6B" stroke-width="0.8" opacity="0.5"/><line x1="12" y1="3" x2="12" y2="19" stroke="#FFD700" stroke-width="0.8" opacity="0.5"/><line x1="12" y1="3" x2="16" y2="19" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/></svg>' },
        { id: 'effect_hologram', name: 'Hologram', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="#00FFFF" stroke-width="1" opacity="0.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="#00FFFF" stroke-width="1" opacity="0.3"/><circle cx="12" cy="12" r="3" fill="#00FFFF" opacity="0.2"/><line x1="3" y1="12" x2="21" y2="12" stroke="#00FFFF" stroke-width="0.5" opacity="0.3"/></svg>' },
        { id: 'effect_digital_glitch', name: 'Digital Glitch', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#FF00FF" stroke-width="1.5"/><rect x="4" y="4" width="16" height="4" fill="#FF00FF" opacity="0.1"/><rect x="4" y="12" width="10" height="3" fill="#00FFFF" opacity="0.1"/><rect x="14" y="7" width="6" height="2" fill="#00FF00" opacity="0.15"/></svg>' },
        { id: 'effect_pixel_burst', name: 'Pixel Burst', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="10" y="10" width="4" height="4" fill="#A855F7"/><rect x="7" y="7" width="3" height="3" fill="#A855F7" opacity="0.6"/><rect x="14" y="7" width="3" height="3" fill="#C084FC" opacity="0.5"/><rect x="7" y="14" width="3" height="3" fill="#C084FC" opacity="0.5"/><rect x="14" y="14" width="3" height="3" fill="#A855F7" opacity="0.6"/><rect x="4" y="4" width="2" height="2" fill="#E9D5FF" opacity="0.3"/><rect x="18" y="4" width="2" height="2" fill="#E9D5FF" opacity="0.3"/></svg>' },
        { id: 'effect_energy_pulse', name: 'Energy Pulse', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="#00FF00"/><circle cx="12" cy="12" r="6" fill="none" stroke="#00FF00" stroke-width="1.5" opacity="0.5"/><circle cx="12" cy="12" r="9" fill="none" stroke="#00FF00" stroke-width="1" opacity="0.25"/></svg>' },
        { id: 'effect_plasma_ring', name: 'Plasma Ring', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="#FF00FF" stroke-width="2" stroke-dasharray="8 4"/><circle cx="12" cy="12" r="6" fill="none" stroke="#00FFFF" stroke-width="1.5" stroke-dasharray="6 4" transform="rotate(30 12 12)"/><circle cx="12" cy="12" r="2" fill="#FF00FF" opacity="0.4"/></svg>' },
        { id: 'effect_magic_runes', name: 'Magic Runes', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="#A78BFA" stroke-width="1"/><path d="M12 3l2 4-2 2-2-2z" fill="#A78BFA" opacity="0.5"/><path d="M21 12l-4 2-2-2 2-2z" fill="#C4B5FD" opacity="0.5"/><path d="M12 21l-2-4 2-2 2 2z" fill="#A78BFA" opacity="0.5"/><path d="M3 12l4-2 2 2-2 2z" fill="#C4B5FD" opacity="0.5"/></svg>' },
        { id: 'effect_mystic_smoke', name: 'Mystic Smoke', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#4C1D95" opacity="0.2"/><path d="M8 18c0-3 2-5 4-5s4 2 4 5" fill="#7C3AED" opacity="0.3"/><path d="M10 14c0-2 1-3 2-3s2 1 2 3" fill="#8B5CF6" opacity="0.4"/><circle cx="12" cy="10" r="2" fill="#A78BFA" opacity="0.3"/></svg>' },
        { id: 'effect_angel_wings', name: 'Angel Wings Glow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="13" r="7" fill="#FEF08A" opacity="0.2"/><circle cx="12" cy="13" r="7" fill="none" stroke="#FDE047" stroke-width="1.5"/><path d="M5 13c-1-4 1-8 4-9" fill="none" stroke="#FDE047" stroke-width="1.5" stroke-linecap="round"/><path d="M19 13c1-4-1-8-4-9" fill="none" stroke="#FDE047" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="13" r="2" fill="#FACC15" opacity="0.4"/></svg>' },
        { id: 'effect_devil_flame', name: 'Devil Flame', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#7F1D1D" opacity="0.3"/><path d="M8 4l-2 5M16 4l2 5" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14" r="5" fill="#991B1B" opacity="0.5"/><circle cx="10" cy="13" r="1" fill="#FCA5A5"/><circle cx="14" cy="13" r="1" fill="#FCA5A5"/></svg>' },
        { id: 'effect_golden_crown', name: 'Golden Crown Aura', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#FFD700" opacity="0.15"/><path d="M5 17l2-8 3 4 2-5 2 5 3-4 2 8z" fill="#FFD700" opacity="0.5" stroke="#B8860B" stroke-width="0.5"/><circle cx="7" cy="9" r="0.8" fill="#FEF08A"/><circle cx="12" cy="7" r="1" fill="#FEF08A"/><circle cx="17" cy="9" r="0.8" fill="#FEF08A"/></svg>' },
        { id: 'effect_royal_light', name: 'Royal Light', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#7C3AED" opacity="0.15"/><circle cx="12" cy="12" r="6" fill="#8B5CF6" opacity="0.2"/><circle cx="12" cy="12" r="3" fill="#A78BFA" opacity="0.3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#C4B5FD" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>' },
        { id: 'effect_thunder_storm', name: 'Thunder Storm', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#1E293B" opacity="0.3"/><polygon points="13,5 8,12 12,12 11,19 16,12 12,12" fill="#FFD700"/><circle cx="7" cy="8" r="0.6" fill="#FDE68A" opacity="0.5"/><circle cx="17" cy="7" r="0.5" fill="#FDE68A" opacity="0.4"/></svg>' },
        { id: 'effect_ocean_waves', name: 'Ocean Waves', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#0EA5E9" opacity="0.15"/><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="#0EA5E9" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="#7DD3FC" stroke-width="1" stroke-linecap="round" opacity="0.3"/></svg>' },
        { id: 'effect_forest_spirit', name: 'Forest Spirit', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#166534" opacity="0.15"/><path d="M12 4L8 11h2.5l-2.5 5h2.5l-2.5 5h6l-2.5-5h2.5l-2.5-5H16L12 4z" fill="#22C55E" opacity="0.4"/><circle cx="12" cy="14" r="1.5" fill="#4ADE80" opacity="0.5"/></svg>' },
        { id: 'effect_ice_crystals', name: 'Ice Crystals', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#DBEAFE" opacity="0.2"/><polygon points="12,3 10,10 12,21 14,10" fill="#93C5FD" opacity="0.3" stroke="#60A5FA" stroke-width="0.8"/><line x1="7" y1="7" x2="17" y2="17" stroke="#BFDBFE" stroke-width="1" stroke-linecap="round"/><line x1="17" y1="7" x2="7" y2="17" stroke="#BFDBFE" stroke-width="1" stroke-linecap="round"/></svg>' },
        { id: 'effect_lava_flow', name: 'Lava Flow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#7C2D12" opacity="0.3"/><path d="M5 18c2-4 4-8 7-8s5 4 7 8" fill="#EA580C" opacity="0.4"/><path d="M8 16c1-3 2-5 4-5s3 2 4 5" fill="#F97316" opacity="0.5"/><circle cx="12" cy="14" r="2" fill="#FBBF24" opacity="0.6"/></svg>' },
        { id: 'effect_inferno_burst', name: 'Inferno Burst', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#FF4500" opacity="0.2"/><path d="M12 3c-3 4-5 6-5 9a5 5 0 0 0 10 0c0-3-2-5-5-9z" fill="#FF6B35" opacity="0.5"/><circle cx="12" cy="12" r="2.5" fill="#FFD700" opacity="0.6"/></svg>' },
        { id: 'effect_cyber_grid', name: 'Cyber Grid', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#00FF00" stroke-width="1"/><line x1="4" y1="12" x2="20" y2="12" stroke="#00FF00" stroke-width="0.5" opacity="0.4"/><line x1="12" y1="4" x2="12" y2="20" stroke="#00FF00" stroke-width="0.5" opacity="0.4"/><rect x="8" y="8" width="3" height="3" fill="#00FF00" opacity="0.3"/><rect x="13" y="13" width="3" height="3" fill="#00FFFF" opacity="0.3"/></svg>' },
        { id: 'effect_hex_energy', name: 'Hex Energy', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2 20,7 20,17 12,22 4,17 4,7" fill="none" stroke="#00FF7F" stroke-width="1.5"/><polygon points="12,6 16,9 16,15 12,18 8,15 8,9" fill="#00FF7F" opacity="0.15"/><circle cx="12" cy="12" r="2" fill="#00FF7F" opacity="0.4"/></svg>' },
        { id: 'effect_infinity_glow', name: 'Infinity Glow', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#A78BFA" opacity="0.1"/><path d="M8 12c0-2.5 2-4.5 4-4.5s4 2 4 4.5-2 4.5-4 4.5-4-2-4-4.5z" fill="none" stroke="#A78BFA" stroke-width="2"/><path d="M8 12c0 2.5 2 4.5 4 4.5s4-2 4-4.5" fill="none" stroke="#C4B5FD" stroke-width="1.5" opacity="0.5"/></svg>' },
        { id: 'effect_nova_explosion', name: 'Nova Explosion', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#FFD700" opacity="0.1"/><circle cx="12" cy="12" r="4" fill="#FFD700" opacity="0.3"/><circle cx="12" cy="12" r="7" fill="none" stroke="#FFA500" stroke-width="1.5" stroke-dasharray="3 3"/><line x1="12" y1="2" x2="12" y2="6" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="12" y1="18" x2="12" y2="22" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="2" y1="12" x2="6" y2="12" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="18" y1="12" x2="22" y2="12" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>' },
        { id: 'effect_quantum_light', name: 'Quantum Light', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="3" fill="#00FF00" opacity="0.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#00FF00" stroke-width="1" opacity="0.4"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#00FFFF" stroke-width="1" opacity="0.4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="#FF00FF" stroke-width="1" opacity="0.4" transform="rotate(120 12 12)"/></svg>' },
        { id: 'effect_crystal_orbit', name: 'Crystal Orbit', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="#818CF8" stroke-width="1" stroke-dasharray="3 2"/><polygon points="12,6 10,12 12,18 14,12" fill="#A5B4FC" opacity="0.4" stroke="#818CF8" stroke-width="0.8"/><circle cx="5" cy="8" r="1.2" fill="#C7D2FE"/><circle cx="19" cy="14" r="1" fill="#C7D2FE"/></svg>' },
        { id: 'effect_violet_mist', name: 'Violet Mist', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#4C1D95" opacity="0.2"/><circle cx="10" cy="10" r="4" fill="#7C3AED" opacity="0.2"/><circle cx="14" cy="14" r="3.5" fill="#8B5CF6" opacity="0.2"/><circle cx="12" cy="12" r="2" fill="#A78BFA" opacity="0.3"/></svg>' },
        { id: 'effect_emerald_pulse', name: 'Emerald Pulse', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#059669" opacity="0.15"/><circle cx="12" cy="12" r="3" fill="#10B981" opacity="0.4"/><circle cx="12" cy="12" r="6" fill="none" stroke="#10B981" stroke-width="1.5" opacity="0.4"/><circle cx="12" cy="12" r="9" fill="none" stroke="#34D399" stroke-width="1" opacity="0.2"/></svg>' },
        { id: 'effect_hive_energy', name: 'Hive Energy', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="#FBBF24" opacity="0.15"/><polygon points="12,4 16,7 16,17 12,20 8,17 8,7" fill="none" stroke="#FBBF24" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#F59E0B" opacity="0.4"/><path d="M12 2v3M12 19v3M4 12h3M17 12h3" stroke="#FFD700" stroke-width="1" stroke-linecap="round" opacity="0.4"/></svg>' }
    ];

    var fontsLoaded = false;

    function loadGoogleFonts() {
        if (fontsLoaded) return;
        fontsLoaded = true;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        var families = ALL_FONTS.map(function (f) {
            return 'family=' + encodeURIComponent(f) + ':wght@400;600;700';
        }).join('&');
        link.href = 'https://fonts.googleapis.com/css2?' + families + '&display=swap';
        document.head.appendChild(link);
    }

    var APPEARANCE_COLORS = [
        { name: 'Hive Yellow', hex: '#FBBF24' },
        { name: 'Honey Gold', hex: '#F59E0B' },
        { name: 'Amber', hex: '#D97706' },
        { name: 'Orange', hex: '#F97316' },
        { name: 'Coral', hex: '#F87171' },
        { name: 'Red', hex: '#EF4444' },
        { name: 'Crimson', hex: '#DC2626' },
        { name: 'Pink', hex: '#EC4899' },
        { name: 'Rose', hex: '#F43F5E' },
        { name: 'Purple', hex: '#A855F7' },
        { name: 'Lavender', hex: '#A78BFA' },
        { name: 'Indigo', hex: '#6366F1' },
        { name: 'Blue', hex: '#3B82F6' },
        { name: 'Sky Blue', hex: '#38BDF8' },
        { name: 'Cyan', hex: '#06B6D4' },
        { name: 'Teal', hex: '#14B8A6' },
        { name: 'Mint', hex: '#34D399' },
        { name: 'Emerald', hex: '#10B981' },
        { name: 'Green', hex: '#22C55E' },
        { name: 'Lime', hex: '#84CC16' },
        { name: 'Brown', hex: '#A16207' },
        { name: 'Gray', hex: '#6B7280' },
        { name: 'Slate', hex: '#94A3B8' },
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Black', hex: '#000000' },
        { name: 'Hive Primary', hex: '#6C63FF' },
    ];

    function openAppearance() {
        if (appearanceOpen) return;
        appearanceOpen = true;

        var rpanel = $('rpanel');
        var profileView = $('rpanel-profile');
        var editView = $('rpanel-edit');
        var appearanceView = $('rpanel-appearance');
        if (!rpanel || !appearanceView) return;

        hide(profileView);
        hide(editView);
        show(appearanceView);
        show(rpanel);

        restoreRpanelExpand();
        profileOpen = true;

        loadAppearanceSettings();
        triggerAppearanceEntrance();

        if (!isAppearanceRoute()) {
            window.history.pushState({ view: 'profile-appearance' }, '', '/home/#/profile/appearance');
        }
    }

    function closeAppearance() {
        if (!appearanceOpen) return;
        appearanceOpen = false;

        var appearanceView = $('rpanel-appearance');
        var profileView = $('rpanel-profile');
        hide(appearanceView);
        show(profileView);

        populateProfile();
        triggerProfileEntrance();
        animateStatCounters();

        window.history.back();
    }

    function loadAppearanceSettings() {
        var user = state.user;
        if (!user) return;

        var rankColor = getRankColor(user.rank);
        appearanceState.textColor = user.chat_text_color || '';
        appearanceState.usernameColor = user.username_color || null;
        appearanceState.profileFont = user.profile_font || '';
        appearanceState.chatTextFont = user.chat_text_font || '';
        appearanceState.profileRing = user.profile_ring || 'none';
        appearanceState.profileEffect = user.profile_effect || 'none';
        appearanceState.profileMusic = user.profile_music || '';
        appearanceState.profileMusicTitle = user.profile_music_title || '';
        appearanceState.profileMusicArtist = user.profile_music_artist || '';

        var textSwatch = $('text-current-swatch');
        var textInput = $('text-color-input');
        if (textSwatch) textSwatch.style.background = appearanceState.textColor || '#A7B0C0';
        if (textInput) textInput.value = appearanceState.textColor || '#A7B0C0';

        var usernameSwatch = $('username-current-swatch');
        var usernameInput = $('username-color-input');
        if (usernameSwatch) usernameSwatch.style.background = appearanceState.usernameColor || rankColor;
        if (usernameInput) usernameInput.value = appearanceState.usernameColor || rankColor;

        loadGoogleFonts();
        buildFontGrid();
        buildChatTextFontGrid();
        buildRingGrid();
        buildEffectGrid();
        buildAppearanceSwatches();
        updateAppearancePreview();
        highlightActiveSwatches();
        updateResetBtnVisibility();
        loadMusicSettings();
        // Reset to Colors tab
        var tabs = document.querySelectorAll('.rp-tab');
        for (var ti = 0; ti < tabs.length; ti++) tabs[ti].classList.remove('active');
        var firstTab = document.querySelector('.rp-tab[data-tab="colors"]');
        if (firstTab) firstTab.classList.add('active');
        var contents = document.querySelectorAll('.rp-tab-content');
        for (var ci = 0; ci < contents.length; ci++) contents[ci].classList.remove('active');
        var firstContent = $('rp-tab-colors');
        if (firstContent) firstContent.classList.add('active');
    }

    function buildAppearanceSwatches() {
        buildSwatchGrid('text-swatches', 'text', appearanceState.textColor);
        buildSwatchGrid('username-swatches', 'username', appearanceState.usernameColor);
    }

    function buildSwatchGrid(containerId, type, activeColor) {
        var container = $(containerId);
        if (!container) return;
        container.innerHTML = '';

        for (var i = 0; i < APPEARANCE_COLORS.length; i++) {
            var color = APPEARANCE_COLORS[i];
            var swatch = document.createElement('button');
            swatch.className = 'rpanel-appearance-swatch' + (color.hex === activeColor ? ' active' : '');
            swatch.style.background = color.hex;
            swatch.setAttribute('data-color', color.hex);
            swatch.setAttribute('data-type', type);
            swatch.setAttribute('title', color.name);
            swatch.setAttribute('aria-label', color.name);

            (function (hex, t) {
                swatch.addEventListener('click', function () {
                    selectSwatch(hex, t);
                });
            })(color.hex, type);

            container.appendChild(swatch);
        }
    }

    function selectSwatch(hex, type) {
        if (type === 'text') {
            appearanceState.textColor = hex;
            var textSwatch = $('text-current-swatch');
            var textInput = $('text-color-input');
            if (textSwatch) textSwatch.style.background = hex;
            if (textInput) textInput.value = hex;
        } else {
            appearanceState.usernameColor = hex;
            var usernameSwatch = $('username-current-swatch');
            var usernameInput = $('username-color-input');
            if (usernameSwatch) usernameSwatch.style.background = hex;
            if (usernameInput) usernameInput.value = hex;
        }

        highlightActiveSwatches();
        updateAppearancePreview();
        checkAppearanceChanges();
    }

    function highlightActiveSwatches() {
        var allSwatches = document.querySelectorAll('.rpanel-appearance-swatch');
        for (var i = 0; i < allSwatches.length; i++) {
            var s = allSwatches[i];
            var type = s.getAttribute('data-type');
            var color = s.getAttribute('data-color');
            var active = (type === 'text' && color === appearanceState.textColor) ||
                         (type === 'username' && color === appearanceState.usernameColor);
            if (active) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        }
    }

    function checkAppearanceChanges() {
        var user = state.user || {};
        var changed =
            appearanceState.textColor !== (user.chat_text_color || '') ||
            appearanceState.usernameColor !== (user.username_color || null) ||
            appearanceState.profileFont !== (user.profile_font || '') ||
            appearanceState.chatTextFont !== (user.chat_text_font || '') ||
            appearanceState.profileRing !== (user.profile_ring || 'none') ||
            appearanceState.profileEffect !== (user.profile_effect || 'none') ||
            appearanceState.profileMusic !== (user.profile_music || '') ||
            appearanceState.profileMusicTitle !== (user.profile_music_title || '') ||
            appearanceState.profileMusicArtist !== (user.profile_music_artist || '');
        var saveBtn = $('rpanel-appearance-save-btn');
        if (saveBtn) saveBtn.disabled = !changed;
    }

    function updateAppearancePreview() {
        var user = state.user || {};
        var avatarUrl = getAvatarUrl(user);
        var displayName = user.username || 'User';
        var rankColor = getRankColor(user.rank);

        var avatarEl = $('preview-avatar');
        if (avatarEl) avatarEl.src = avatarUrl;

        var avatarWrap = $('preview-avatar-wrap');
        if (avatarWrap) {
            var ring = appearanceState.profileRing && appearanceState.profileRing !== 'none' ? appearanceState.profileRing : '';
            avatarWrap.className = 'msg-avatar-wrap' + (ring ? ' ' + ring : '');
        }

        // Profile effect washes the whole live-preview card
        var previewCard = $('appearance-preview');
        if (previewCard) {
            var effect = appearanceState.profileEffect && appearanceState.profileEffect !== 'none' ? appearanceState.profileEffect : '';
            previewCard.className = 'rpanel-appearance-preview' + (effect ? ' ' + effect : '');
        }

        var usernameEl = $('preview-username');
        if (usernameEl) {
            usernameEl.textContent = displayName;
            usernameEl.style.color = appearanceState.usernameColor || rankColor;
            usernameEl.style.fontFamily = appearanceState.profileFont ? "'" + appearanceState.profileFont + "', sans-serif" : '';
        }

        var contentEl = $('preview-content');
        if (contentEl) {
            contentEl.style.color = appearanceState.textColor || '';
            contentEl.style.fontFamily = appearanceState.chatTextFont ? "'" + appearanceState.chatTextFont + "', sans-serif" : '';
        }
    }

    function updateResetBtnVisibility() {
        var resetBtn = $('username-reset-btn');
        if (resetBtn) {
            resetBtn.style.display = appearanceState.usernameColor ? 'flex' : 'none';
        }
    }

    function resetUsernameColor() {
        appearanceState.usernameColor = null;
        var rankColor = getRankColor(state.user ? state.user.rank : 'rookie');
        var usernameSwatch = $('username-current-swatch');
        var usernameInput = $('username-color-input');
        if (usernameSwatch) usernameSwatch.style.background = rankColor;
        if (usernameInput) usernameInput.value = rankColor;
        highlightActiveSwatches();
        updateAppearancePreview();
        updateResetBtnVisibility();
        checkAppearanceChanges();
    }

    /* ── Profile Music ────────────────────────── */
    function loadMusicSettings() {
        var urlInput = $('music-url-input');
        var titleInput = $('music-title-input');
        var artistInput = $('music-artist-input');
        if (urlInput) urlInput.value = appearanceState.profileMusic;
        if (titleInput) titleInput.value = appearanceState.profileMusicTitle;
        if (artistInput) artistInput.value = appearanceState.profileMusicArtist;
        updateMusicPreview();
    }

    function updateMusicPreview() {
        var titleEl = $('music-preview-title');
        var artistEl = $('music-preview-artist');
        var removeBtn = $('music-remove-btn');
        var url = appearanceState.profileMusic || '';
        if (titleEl) titleEl.textContent = appearanceState.profileMusicTitle || (url ? 'Untitled track' : 'No music set');
        if (artistEl) artistEl.textContent = appearanceState.profileMusicArtist || (url ? '' : 'Add a track to personalize your profile');
        if (removeBtn) removeBtn.style.display = url ? 'inline-flex' : 'none';

        var audio = $('music-preview-audio');
        if (audio) {
            if (url) {
                if (audio.src !== url) audio.src = url;
            } else {
                audio.removeAttribute('src');
                audio.pause();
                var playBtn = $('music-preview-play');
                if (playBtn) {
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
                }
            }
        }
    }

    function uploadMusicToR2(file, cb, onProgress) {
        var formData = new FormData();
        formData.append('file', file);
        var token = HiveAuth.getToken();
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE + '/api/upload?folder=profile-music', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });
        xhr.addEventListener('load', function () {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.success && data.url) {
                    cb(null, data.url);
                } else {
                    cb((data && data.message) || 'Upload failed');
                }
            } catch (err) {
                cb('Upload failed');
            }
        });
        xhr.addEventListener('error', function () {
            cb('Network error during upload');
        });
        xhr.send(formData);
    }

    function initMusicControls() {
        var urlInput = $('music-url-input');
        var titleInput = $('music-title-input');
        var artistInput = $('music-artist-input');
        var playBtn = $('music-preview-play');
        var audio = $('music-preview-audio');
        var removeBtn = $('music-remove-btn');
        var uploadBtn = $('music-upload-btn');
        var fileInput = $('music-file-input');
        var uploadStatus = $('music-upload-status');
        var uploadStatusText = $('music-upload-status-text');

        function onFieldChange() {
            appearanceState.profileMusic = urlInput ? urlInput.value.trim() : '';
            appearanceState.profileMusicTitle = titleInput ? titleInput.value.trim() : '';
            appearanceState.profileMusicArtist = artistInput ? artistInput.value.trim() : '';
            updateMusicPreview();
            checkAppearanceChanges();
        }

        function setUploadStatus(type, text) {
            if (!uploadStatus || !uploadStatusText) return;
            uploadStatus.className = 'rp-music-upload-status' + (type ? ' ' + type : '');
            uploadStatusText.textContent = text;
            uploadStatus.style.display = 'flex';
        }

        if (urlInput) urlInput.addEventListener('input', onFieldChange);
        if (titleInput) titleInput.addEventListener('input', onFieldChange);
        if (artistInput) artistInput.addEventListener('input', onFieldChange);

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', function () {
                fileInput.value = '';
                fileInput.click();
            });
            fileInput.addEventListener('change', function () {
                if (!fileInput.files || !fileInput.files[0]) return;
                var file = fileInput.files[0];
                if (uploadBtn) uploadBtn.disabled = true;
                setUploadStatus('', 'Uploading ' + file.name + '...');

                uploadMusicToR2(file, function (err, url) {
                    if (uploadBtn) uploadBtn.disabled = false;
                    if (err) {
                        setUploadStatus('error', err);
                        return;
                    }
                    // Auto-fill title/artist from filename if blank
                    if (titleInput && !titleInput.value) {
                        var base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
                        titleInput.value = base.charAt(0).toUpperCase() + base.slice(1);
                    }
                    if (urlInput) urlInput.value = url;
                    setUploadStatus('success', 'Uploaded!');
                    setTimeout(function () {
                        if (uploadStatus) uploadStatus.style.display = 'none';
                    }, 2500);
                    onFieldChange();
                }, function (pct) {
                    if (uploadStatusText) uploadStatusText.textContent = 'Uploading ' + file.name + '... ' + pct + '%';
                });
            });
        }

        if (playBtn && audio) {
            playBtn.addEventListener('click', function () {
                var url = appearanceState.profileMusic;
                if (!url) return;
                if (audio.paused) {
                    audio.src = url;
                    audio.play().catch(function () { showToast('Could not play audio', 'error'); });
                    playBtn.classList.add('playing');
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                } else {
                    audio.pause();
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
                }
            });
            audio.addEventListener('ended', function () {
                if (playBtn) {
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                // Try to delete the R2 object if it was uploaded from this app
                var url = appearanceState.profileMusic;
                if (url && url.indexOf('r2.dev') !== -1) {
                    HiveAuth.apiFetch('/api/profile/music', { method: 'DELETE' }).catch(function () {});
                }
                appearanceState.profileMusic = '';
                appearanceState.profileMusicTitle = '';
                appearanceState.profileMusicArtist = '';
                if (urlInput) urlInput.value = '';
                if (titleInput) titleInput.value = '';
                if (artistInput) artistInput.value = '';
                updateMusicPreview();
                checkAppearanceChanges();
            });
        }
    }

    function triggerAppearanceEntrance() {
        var cards = document.querySelectorAll('#rpanel-appearance .rp-entrance');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            card.style.animation = 'none';
            card.style.opacity = '0';
            card.style.transform = 'translateY(12px)';
            void card.offsetHeight;
            card.style.animation = 'rpCardIn 0.4s cubic-bezier(.4,0,.2,1) forwards';
        }
        setTimeout(function () {
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                if (card) card.style.opacity = '1';
            }
        }, 500);
    }

    /* ── Tab Switching ────────────────────────── */
    function initAppearanceTabs() {
        var tabs = document.querySelectorAll('.rp-tab');
        for (var i = 0; i < tabs.length; i++) {
            (function(tab) {
                tab.addEventListener('click', function () {
                    var target = tab.getAttribute('data-tab');
                    if (!target) return;
                    var allTabs = document.querySelectorAll('.rp-tab');
                    for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
                    tab.classList.add('active');
                    var contents = document.querySelectorAll('.rp-tab-content');
                    for (var k = 0; k < contents.length; k++) contents[k].classList.remove('active');
                    var targetContent = $('rp-tab-' + target);
                    if (targetContent) targetContent.classList.add('active');
                });
            })(tabs[i]);
        }
    }

    /* ── Profile Rings ────────────────────────── */
    function buildRingGrid() {
        var grid = $('profile-ring-grid');
        if (!grid) return;
        grid.innerHTML = '';
        var previewRings = ALL_RINGS.slice(0, 10);
        for (var i = 0; i < previewRings.length; i++) {
            grid.appendChild(createRingCard(previewRings[i], appearanceState.profileRing));
        }
    }

    function createRingCard(ring, activeRing) {
        var card = document.createElement('button');
        var isActive = ring.id === activeRing;
        card.className = 'rp-ring-card rp-ring-' + ring.id + (isActive ? ' active' : '');
        card.setAttribute('data-ring-id', ring.id);
        card.innerHTML =
            '<div class="rp-ring-preview"><div class="rp-ring-preview-inner">' + ring.icon + '</div></div>' +
            '<span class="rp-ring-label">' + ring.name + '</span>' +
            '<div class="rp-ring-card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
        card.addEventListener('click', function () {
            selectRing(ring.id);
        });
        return card;
    }

    function selectRing(ringId) {
        appearanceState.profileRing = ringId;
        var allCards = document.querySelectorAll('.rp-ring-card');
        for (var i = 0; i < allCards.length; i++) {
            var c = allCards[i];
            var rid = c.getAttribute('data-ring-id');
            if (rid === ringId) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        }
        updateAppearancePreview();
        checkAppearanceChanges();
    }

    /* ── Ring Modal ───────────────────────────── */
    function openRingModal() {
        var overlay = $('ring-modal-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        var grid = $('ring-modal-grid');
        if (grid && grid.children.length === 0) {
            grid.innerHTML = '';
            for (var i = 0; i < ALL_RINGS.length; i++) {
                var r = ALL_RINGS[i];
                grid.appendChild(createRingCard(r, appearanceState.profileRing));
            }
        } else if (grid) {
            var modalCards = grid.querySelectorAll('.rp-ring-card');
            for (var i = 0; i < modalCards.length; i++) {
                var c = modalCards[i];
                var rid = c.getAttribute('data-ring-id');
                if (rid === appearanceState.profileRing) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            }
        }
        var searchInput = $('ring-filter-input');
        if (searchInput) {
            searchInput.value = '';
            filterRings();
        }
    }

    function closeRingModal() {
        var overlay = $('ring-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function filterRings() {
        var input = $('ring-filter-input');
        if (!input) return;
        var query = input.value.toLowerCase().trim();
        var grid = $('ring-modal-grid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.rp-ring-card');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var label = c.querySelector('.rp-ring-label');
            if (!label) continue;
            var text = label.textContent.toLowerCase();
            if (!query || text.indexOf(query) !== -1) {
                c.style.display = '';
            } else {
                c.style.display = 'none';
            }
        }
    }

    /* ── Profile Effects ────────────────────────── */
    function buildEffectGrid() {
        var grid = $('profile-effect-grid');
        if (!grid) return;
        grid.innerHTML = '';
        var previewEffects = ALL_EFFECTS.slice(0, 10);
        for (var i = 0; i < previewEffects.length; i++) {
            grid.appendChild(createEffectCard(previewEffects[i], appearanceState.profileEffect));
        }
    }

    function createEffectCard(effect, activeEffect) {
        var card = document.createElement('button');
        var isActive = effect.id === activeEffect;
        card.className = 'rp-effect-card' + (isActive ? ' active' : '');
        card.setAttribute('data-effect-id', effect.id);
        card.innerHTML =
            '<div class="rp-effect-preview"><div class="rp-effect-preview-inner rp-effect-anim-' + effect.id + (effect.id !== 'none' ? ' ' + effect.id : '') + '">' + effect.icon + '</div></div>' +
            '<span class="rp-effect-label">' + effect.name + '</span>' +
            '<div class="rp-effect-card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
        card.addEventListener('click', function () {
            selectEffect(effect.id);
        });
        return card;
    }

    function selectEffect(effectId) {
        appearanceState.profileEffect = effectId;
        var allCards = document.querySelectorAll('.rp-effect-card');
        for (var i = 0; i < allCards.length; i++) {
            var c = allCards[i];
            var eid = c.getAttribute('data-effect-id');
            if (eid === effectId) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        }
        updateAppearancePreview();
        checkAppearanceChanges();
    }

    /* ── Effect Modal ───────────────────────────── */
    function openEffectModal() {
        var overlay = $('effect-modal-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        var grid = $('effect-modal-grid');
        if (grid && grid.children.length === 0) {
            grid.innerHTML = '';
            for (var i = 0; i < ALL_EFFECTS.length; i++) {
                var e = ALL_EFFECTS[i];
                grid.appendChild(createEffectCard(e, appearanceState.profileEffect));
            }
        } else if (grid) {
            var modalCards = grid.querySelectorAll('.rp-effect-card');
            for (var i = 0; i < modalCards.length; i++) {
                var c = modalCards[i];
                var eid = c.getAttribute('data-effect-id');
                if (eid === appearanceState.profileEffect) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            }
        }
        var searchInput = $('effect-filter-input');
        if (searchInput) {
            searchInput.value = '';
            filterEffects();
        }
    }

    function closeEffectModal() {
        var overlay = $('effect-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function filterEffects() {
        var input = $('effect-filter-input');
        if (!input) return;
        var query = input.value.toLowerCase().trim();
        var grid = $('effect-modal-grid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.rp-effect-card');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var label = c.querySelector('.rp-effect-label');
            if (!label) continue;
            var text = label.textContent.toLowerCase();
            if (!query || text.indexOf(query) !== -1) {
                c.style.display = '';
            } else {
                c.style.display = 'none';
            }
        }
    }

    /* ── Font Grid ──────────────────────────── */
    function buildFontGrid() {
        var grid = $('profile-font-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (var i = 0; i < ALL_FONTS.length; i++) {
            var f = ALL_FONTS[i];
            grid.appendChild(createFontCard(f, appearanceState.profileFont));
        }
    }

    function createFontCard(fontName, activeFont, onSelect) {
        var card = document.createElement('button');
        var isActive = fontName === activeFont;
        card.className = 'rp-font-card' + (isActive ? ' active' : '');
        card.setAttribute('data-font', fontName);
        card.innerHTML =
            '<div class="rp-font-card-label">' + escapeHtml(fontName) + '</div>' +
            '<div class="rp-font-card-chat" style="font-family:\'' + fontName + '\',sans-serif">' +
                '<div class="rp-font-card-chat-name" style="font-family:\'' + fontName + '\',sans-serif">' + escapeHtml(fontName) + '</div>' +
                '<div class="rp-font-card-chat-msg" style="font-family:\'' + fontName + '\',sans-serif">Hey everyone!</div>' +
            '</div>' +
            '<div class="rp-font-card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
        card.addEventListener('click', function () {
            if (onSelect) onSelect(fontName, card);
            else selectFont(fontName);
        });
        return card;
    }

    function buildChatTextFontGrid() {
        var grid = $('chat-text-font-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (var i = 0; i < ALL_FONTS.length; i++) {
            var f = ALL_FONTS[i];
            grid.appendChild(createFontCard(f, appearanceState.chatTextFont, selectChatTextFont));
        }
    }

    function selectChatTextFont(fontName) {
        appearanceState.chatTextFont = fontName;
        // Update all chat text font cards (grid + modal)
        var allCards = document.querySelectorAll('#chat-text-font-grid .rp-font-card');
        for (var i = 0; i < allCards.length; i++) {
            var c = allCards[i];
            var f = c.getAttribute('data-font');
            if (f === fontName) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        }
        updateAppearancePreview();
        checkAppearanceChanges();
    }

    function selectFont(fontName) {
        appearanceState.profileFont = fontName;
        // Update all font cards (initial grid and modal)
        var allCards = document.querySelectorAll('.rp-font-card');
        for (var i = 0; i < allCards.length; i++) {
            var c = allCards[i];
            var f = c.getAttribute('data-font');
            if (f === fontName) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        }
        updateAppearancePreview();
        checkAppearanceChanges();
    }

    /* ── Font Modal ─────────────────────────── */
    function openFontModal(mode) {
        var overlay = $('font-modal-overlay');
        if (!overlay) return;
        mode = mode || 'profile';
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        overlay.setAttribute('data-font-mode', mode);
        var grid = $('font-modal-grid');
        var activeFont = mode === 'chat' ? appearanceState.chatTextFont : appearanceState.profileFont;
        var selectFn = mode === 'chat' ? selectChatTextFont : null;
        if (grid && grid.children.length === 0) {
            grid.innerHTML = '';
            for (var i = 0; i < ALL_FONTS.length; i++) {
                var f = ALL_FONTS[i];
                grid.appendChild(createFontCard(f, activeFont, selectFn));
            }
        } else if (grid) {
            // Re-highlight active font in modal
            var modalCards = grid.querySelectorAll('.rp-font-card');
            for (var i = 0; i < modalCards.length; i++) {
                var c = modalCards[i];
                var f = c.getAttribute('data-font');
                if (f === activeFont) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            }
        }
        // Reset search
        var searchInput = $('font-modal-search');
        if (searchInput) {
            searchInput.value = '';
            filterFonts('');
        }
    }

    function closeFontModal() {
        var overlay = $('font-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function filterFonts(query) {
        var grid = $('font-modal-grid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.rp-font-card');
        var q = query.toLowerCase().trim();
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var name = (c.getAttribute('data-font') || '').toLowerCase();
            if (!q || name.indexOf(q) !== -1) {
                c.style.display = '';
            } else {
                c.style.display = 'none';
            }
        }
    }

    async function saveAppearance() {
        var saveBtn = $('rpanel-appearance-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="15"/></svg> Saving...';
        }

        try {
            var payload = {};
            if (appearanceState.textColor !== (state.user.chat_text_color || '')) {
                payload.chat_text_color = appearanceState.textColor || null;
            }
            var currentUsernameColor = state.user.username_color || null;
            if (appearanceState.usernameColor !== currentUsernameColor) {
                payload.username_color = appearanceState.usernameColor || null;
            }
            if (appearanceState.profileFont !== (state.user.profile_font || '')) {
                payload.profile_font = appearanceState.profileFont || null;
            }
            if (appearanceState.chatTextFont !== (state.user.chat_text_font || '')) {
                payload.chat_text_font = appearanceState.chatTextFont || null;
            }
            var currentProfileRing = state.user.profile_ring || 'none';
            if (appearanceState.profileRing !== currentProfileRing) {
                payload.profile_ring = appearanceState.profileRing || 'none';
            }
            var currentProfileEffect = state.user.profile_effect || 'none';
            if (appearanceState.profileEffect !== currentProfileEffect) {
                payload.profile_effect = appearanceState.profileEffect || 'none';
            }
            if (appearanceState.profileMusic !== (state.user.profile_music || '')) {
                payload.profile_music = appearanceState.profileMusic || null;
            }
            if (appearanceState.profileMusicTitle !== (state.user.profile_music_title || '')) {
                payload.profile_music_title = appearanceState.profileMusicTitle || null;
            }
            if (appearanceState.profileMusicArtist !== (state.user.profile_music_artist || '')) {
                payload.profile_music_artist = appearanceState.profileMusicArtist || null;
            }

            if (Object.keys(payload).length === 0) {
                showToast('No changes to save', 'info');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save Changes';
                }
                return;
            }

            var data = await HiveAuth.apiFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (data && data.success) {
                if (data.profile) {
                    state.user = Object.assign(state.user, data.profile);
                    appearanceState.textColor = state.user.chat_text_color || '';
                    appearanceState.usernameColor = state.user.username_color || null;
                    appearanceState.profileFont = state.user.profile_font || '';
                    appearanceState.chatTextFont = state.user.chat_text_font || '';
                    appearanceState.profileRing = state.user.profile_ring || 'none';
                    appearanceState.profileEffect = state.user.profile_effect || 'none';
                    appearanceState.profileMusic = state.user.profile_music || '';
                    appearanceState.profileMusicTitle = state.user.profile_music_title || '';
                    appearanceState.profileMusicArtist = state.user.profile_music_artist || '';
                    buildAppearanceSwatches();
                    buildFontGrid();
                    buildChatTextFontGrid();
                    buildRingGrid();
                    buildEffectGrid();
                    updateAppearancePreview();
                    highlightActiveSwatches();
                    updateResetBtnVisibility();
                    loadMusicSettings();
                }
                showToast('Appearance updated!', 'success');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save Changes';
                }
                // Immediately apply changes to own messages in the DOM
                var userId = state.user ? state.user.id : null;
                if (userId) {
                    var tc = payload.chat_text_color !== undefined ? payload.chat_text_color : null;
                    var tcf = payload.chat_text_font !== undefined ? payload.chat_text_font : null;
                    var nc = payload.username_color !== undefined ? payload.username_color : null;
                    var pf = payload.profile_font !== undefined ? payload.profile_font : null;
                    var allMsgEls = dom.chatMessagesInner ? dom.chatMessagesInner.querySelectorAll('[data-msg-id]') : [];
                    for (var ei = 0; ei < allMsgEls.length; ei++) {
                        var mel = allMsgEls[ei];
                        if (mel.getAttribute('data-sender-id') !== userId) continue;
                        var usernameEl = mel.querySelector('.msg-username');
                        if (usernameEl) {
                            if (nc !== null && nc !== undefined) {
                                usernameEl.style.color = nc || '';
                            } else if (payload.username_color !== undefined) {
                                usernameEl.style.color = '';
                            }
                            if (pf !== null && pf !== undefined) {
                                usernameEl.style.fontFamily = pf ? "'" + pf + "', sans-serif" : '';
                            } else if (payload.profile_font !== undefined) {
                                usernameEl.style.fontFamily = '';
                            }
                        }
                        var contentEl = mel.querySelector('.msg-content');
                        if (contentEl) {
                            if (tc !== null && tc !== undefined) {
                                contentEl.style.color = tc || '';
                            } else if (payload.chat_text_color !== undefined) {
                                contentEl.style.color = '';
                            }
                            if (tcf !== null && tcf !== undefined) {
                                contentEl.style.fontFamily = tcf ? "'" + tcf + "', sans-serif" : '';
                            } else if (payload.chat_text_font !== undefined) {
                                contentEl.style.fontFamily = '';
                            }
                        }
                    }
                }
            } else {
                showToast((data && data.message) || 'Failed to update appearance', 'error');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save Changes';
                }
            }
        } catch (ex) {
            console.error('[HIVE] Save appearance error:', ex);
            showToast(ex.message || 'Network error. Please try again.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save Changes';
            }
        }
    }

    /* ── Init ────────────────────────────────── */
    function cacheDom() {
        dom.communityList = $('community-list');
        dom.communitySkeleton = $('community-skeleton');
        dom.communityEmpty = $('community-empty');
        dom.communityError = $('community-error');
        dom.communityErrorMsg = $('community-error-msg');
        dom.retryCommunities = $('retry-communities');
        dom.userAvatar = $('user-avatar');
        dom.userName = $('user-name');
        dom.userTag = $('user-tag');
        dom.homeView = $('home-view');
        dom.chatView = $('chat-view');
        dom.homeSidebar = $('home-sidebar');
        dom.chatSidebar = $('chat-sidebar');
        dom.chatBackBtn = $('chat-back-btn');
        dom.chatCommunityBadge = $('chat-community-badge');
        dom.chatCommunityIcon = $('chat-community-icon');
        dom.chatCommunityName = $('chat-community-name');
        dom.chatChannelName = $('chat-channel-name');
        dom.chatTopic = $('chat-topic');
        dom.chatMessages = $('chat-messages');
        dom.chatMessagesInner = $('chat-messages-inner');
        dom.typingIndicator = $('typing-indicator');
        dom.typingAvatars = $('typing-avatars');
        dom.typingText = $('typing-text');
        dom.composerInput = $('composer-input');
        dom.sendBtn = $('send-btn');
        dom.chatComposer = $('chat-composer');
        dom.restrictedBanner = $('chat-restricted-banner');
        dom.restrictedText = $('chat-restricted-text');
        dom.toggleMembersBtn = $('toggle-members-btn');
        dom.csCommunityIcon = $('cs-community-icon');
        dom.csCommunityName = $('cs-community-name');
        dom.csCommunityDesc = $('cs-community-desc');
        dom.csMemberCount = $('cs-member-count');
        dom.csOnlineCount = $('cs-online-count');
        dom.csOnlineNum = $('cs-online-num');
        dom.csOfflineNum = $('cs-offline-num');
        dom.csOnlineList = $('cs-online-list');
        dom.csOfflineList = $('cs-offline-list');
        dom.csModList = $('cs-mod-list');
        dom.csPinnedList = $('cs-pinned-list');
        dom.tooltip = $('tooltip');
        dom.replyComposer = $('reply-composer');
        dom.replyComposerClose = $('reply-composer-close');
        dom.replyComposerAvatar = $('reply-composer-avatar');
        dom.replyComposerUsername = $('reply-composer-username');
        dom.replyComposerText = $('reply-composer-text');
        dom.emojiPicker = $('emoji-picker');
        dom.emojiSearch = $('emoji-search');
        dom.emojiBody = $('emoji-body');
        dom.emojiCategoryTabs = $('emoji-category-tabs');
        dom.gifPicker = $('gif-picker');
        dom.gifSearch = $('gif-search');
        dom.gifGrid = $('gif-grid');
        dom.gifLoading = $('gif-loading');
        dom.gifLoadMore = $('gif-loadmore');
        dom.gifLoadMoreBtn = $('gif-loadmore-btn');
        dom.gifPickerClose = $('gif-picker-close');
        // Home presence elements
        dom.homeOnlineList = $('home-online-list');
        dom.homeOfflineList = $('home-offline-list');
        dom.homeOnlineNum = $('home-online-num');
        dom.homeOfflineNum = $('home-offline-num');
        dom.homeCommunitiesGrid = $('home-communities-grid');
        // AI moderation elements
        dom.muteBanner = $('mute-banner');
        dom.muteBannerReason = $('mute-banner-reason');
        dom.muteBannerTimer = $('mute-banner-timer');
        dom.chatComposer = $('chat-composer');
        // Loading older messages
        dom.loadingOlder = $('loading-older');
        // Sidebar panels
        dom.sidebarCommunitiesPanel = $('sidebar-communities-panel');
        dom.sidebarDmPanel = $('sidebar-dm-panel');
        dom.sidebarFriendsPanel = $('sidebar-friends-panel');
        dom.friendsList = $('friends-list');
        dom.friendsSkeleton = $('friends-skeleton');
        dom.friendsEmpty = $('friends-empty');
        dom.friendsError = $('friends-error');
        dom.friendsErrorMsg = $('friends-error-msg');
        dom.retryFriends = $('retry-friends');
        dom.friendsSearchInput = $('friends-search-input');
        dom.friendsCount = $('friends-count');
        dom.friendsReqBadge = $('friends-req-badge');
        dom.friendsIncomingSection = $('friends-incoming-section');
        dom.friendsIncomingList = $('friends-incoming-list');
        dom.friendsTabs = $('friends-tabs');
        // DM elements
        dom.dmList = $('dm-list');
        dom.dmSkeleton = $('dm-skeleton');
        dom.dmEmpty = $('dm-empty');
        dom.dmError = $('dm-error');
        dom.dmErrorMsg = $('dm-error-msg');
        dom.retryDm = $('retry-dm');
        dom.dmNewChatBtn = $('dm-new-chat-btn');
        dom.dmSearchInput = $('dm-search-input');
        // Rail navigation
        dom.railIcons = document.querySelectorAll('.rail-icon[data-nav]');
        dom.chatsRailBadge = $('chats-rail-badge');
        // User popup elements
        dom.upOverlay = $('up-overlay');
        dom.userPopup = $('user-popup');
        dom.upAvatar = $('up-avatar');
        dom.upAvatarWrap = $('up-avatar-wrap');
        dom.upAvatarRing = $('up-avatar-ring');
        dom.upStatusDot = $('up-status-dot');
        dom.upUsername = $('up-username');
        dom.upDiscrim = $('up-discrim');
        dom.upBadgesRow = $('up-badges-row');
        dom.upDisplayRow = $('up-display-row');
        dom.upRankRow = $('up-rank-row');
        dom.upJoinedText = $('up-joined-text');
        dom.upLocaltimeText = $('up-localtime-text');
        dom.upBio = $('up-bio');
        dom.upMsgBtn = $('up-msg-btn');
        dom.upFriendBtn = $('up-friend-btn');
        dom.upMoreBtn = $('up-more-btn');
        dom.upCountry = $('up-country');
        dom.upLanguage = $('up-language');
        dom.upJoinedHive = $('up-joined-hive');
        dom.upSince = $('up-since');
        dom.upFavCommunity = $('up-fav-community');
        dom.upStatusText = $('up-status-text');
        dom.upBadgesGrid = $('up-badges-grid');
        dom.upMutualChips = $('up-mutual-chips');
        dom.upRoleChips = $('up-role-chips');
        dom.upFooterId = $('up-footer-id');
        dom.upSkeleton = $('up-skeleton');
        dom.upContent = $('up-content');
        dom.upBanner = $('up-banner');
        dom.upBannerImg = $('up-banner-img');
        dom.upMusic = $('up-music');
        dom.upMusicIcon = $('up-music-icon');
        dom.upMusicTitle = $('up-music-title');
        dom.upMusicArtist = $('up-music-artist');
        dom.upMusicToggle = $('up-music-toggle');
        dom.upMusicAudio = $('up-music-audio');
        // Notification panel
        dom.notifPanel = $('notif-overlay');
        dom.notifClose = $('notif-close');
        dom.notifMarkAll = $('notif-mark-all');
        dom.notifScroll = $('notif-scroll');
        dom.notifSkeleton = $('notif-skeleton');
        dom.notifList = $('notif-list');
        dom.notifEmpty = $('notif-empty');
        dom.notifLoadMore = $('notif-load-more');
        dom.topbarNotifBtn = $('topbar-notif-btn');
    }

    /* ── Friend Button Icon SVGs ──────────────── */
    var FRIEND_ICON_ADD = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
    var FRIEND_ICON_PENDING = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var FRIEND_ICON_FRIENDS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>';
    var FRIEND_ICON_INCOMING = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>';

    function setFriendBtnState(state, opts) {
        if (!dom.upFriendBtn) return;
        opts = opts || {};
        dom.upFriendBtn.classList.remove('up-friend-active', 'up-friend-pending', 'up-friend-incoming');
        dom.upFriendBtn.removeAttribute('data-request-id');

        switch (state) {
            case 'none':
                dom.upFriendBtn.innerHTML = FRIEND_ICON_ADD;
                dom.upFriendBtn.setAttribute('data-tip', 'Add Friend');
                dom.upFriendBtn.disabled = false;
                break;
            case 'pending':
                dom.upFriendBtn.innerHTML = FRIEND_ICON_PENDING;
                dom.upFriendBtn.setAttribute('data-tip', 'Friend Request Sent');
                dom.upFriendBtn.classList.add('up-friend-pending');
                dom.upFriendBtn.disabled = true;
                break;
            case 'friends':
                dom.upFriendBtn.innerHTML = FRIEND_ICON_FRIENDS;
                dom.upFriendBtn.setAttribute('data-tip', 'Friends');
                dom.upFriendBtn.classList.add('up-friend-active');
                dom.upFriendBtn.disabled = true;
                break;
            case 'incoming':
                dom.upFriendBtn.innerHTML = FRIEND_ICON_INCOMING;
                dom.upFriendBtn.setAttribute('data-tip', 'Accept Friend Request');
                dom.upFriendBtn.classList.add('up-friend-incoming');
                dom.upFriendBtn.disabled = false;
                if (opts.requestId) dom.upFriendBtn.setAttribute('data-request-id', opts.requestId);
                break;
            case 'loading':
                dom.upFriendBtn.innerHTML = '<span class="up-friend-btn-loading"></span>';
                dom.upFriendBtn.setAttribute('data-tip', '');
                dom.upFriendBtn.disabled = true;
                break;
        }
    }

    function resetFriendBtnToDefault() {
        setFriendBtnState('none');
    }

    /* ── User Profile Popup ─────────────────── */
    var popupOpen = false;
    var pendingAutoplay = false;

    function tryResumeAutoplay() {
        if (!pendingAutoplay) return;
        pendingAutoplay = false;
        if (dom.upMusicAudio && dom.upMusicAudio.src && dom.upMusicAudio.paused) {
            dom.upMusicAudio.play().then(function () {
                if (dom.upMusicToggle) {
                    dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                    dom.upMusicToggle.setAttribute('aria-label', 'Pause profile music');
                }
                if (dom.upMusicIcon) dom.upMusicIcon.classList.add('eq');
            }).catch(function () {});
        }
        document.removeEventListener('click', tryResumeAutoplay);
        document.removeEventListener('keydown', tryResumeAutoplay);
        document.removeEventListener('mousemove', tryResumeAutoplay);
    }

    function openUserPopup(userId, anchorEl, msgData) {
        if (popupOpen) closeUserPopup();

        var overlay = dom.upOverlay;
        var popup = dom.userPopup;
        if (!overlay || !popup) return;

        // Show skeleton, hide content
        if (dom.upSkeleton) dom.upSkeleton.style.display = '';
        if (dom.upContent) dom.upContent.style.display = 'none';

        // Immediately populate what we already have from the message
        populatePopupQuick(msgData);

        // Position popup near anchor
        positionPopup(anchorEl);

        // Show overlay
        overlay.style.display = '';
        popupOpen = true;
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                overlay.classList.add('visible');
            });
        });

        // Close handlers
        setTimeout(function () {
            document.addEventListener('click', handlePopupClickOutside);
            document.addEventListener('keydown', handlePopupEsc);
        }, 10);

        // Fetch from backend (always fresh, no cache)
        fetchPopupData(userId).then(function (data) {
            if (popupOpen) showPopupData(data);
        }).catch(function (err) {
            console.error('[HIVE] Failed to load profile:', err);
            if (popupOpen) showPopupError(userId);
        });
    }

    function populatePopupQuick(msgData) {
        // Show basic info immediately from message data (no network request needed)
        if (!msgData) return;
        if (dom.upAvatar) dom.upAvatar.src = getAvatarUrl(msgData);
        if (dom.upUsername) dom.upUsername.textContent = msgData.username || 'Unknown';
        if (dom.upStatusDot) dom.upStatusDot.className = 'up-status-dot online';
        if (dom.upDiscrim) dom.upDiscrim.textContent = '';
        if (dom.upDisplayRow) dom.upDisplayRow.style.display = 'none';
        if (dom.upRankRow) dom.upRankRow.innerHTML = '';
        if (dom.upBadgesRow) {
            var badgesHtml = '';
            if (msgData.rank && window.HiveRankBadge) {
                var b = window.HiveRankBadge.create(msgData.rank, 16);
                if (b) badgesHtml += b.outerHTML;
            }
            dom.upBadgesRow.innerHTML = badgesHtml;
        }
        if (dom.upJoinedText) dom.upJoinedText.textContent = 'Loading...';
        if (dom.upLocaltimeText) dom.upLocaltimeText.textContent = '';
        if (dom.upBio) { dom.upBio.textContent = 'Loading...'; dom.upBio.classList.add('is-empty'); }
        if (dom.upFooterId) dom.upFooterId.textContent = 'User ID: ' + (msgData.sender_id || msgData.user_id || '');
        if (dom.upBanner && dom.upBannerImg) {
            if (msgData.profile_banner) {
                dom.upBannerImg.style.backgroundImage = 'url(' + msgData.profile_banner + ')';
                dom.upBanner.classList.add('has-cover');
            } else {
                dom.upBannerImg.style.backgroundImage = '';
                dom.upBanner.classList.remove('has-cover');
            }
        }
        // Hide + stop music until full profile loads
        stopPopupMusic();
        if (dom.upMusic) dom.upMusic.style.display = 'none';
    }

    function fetchPopupData(userId) {
        return apiGet('/api/profile/popup/' + userId).then(function (res) {
            if (res && res.popup) return res.popup;
            throw new Error('Invalid response');
        });
    }

    /* ── Popup music player ─────────────────── */
    function setupPopupMusic(url, title, artist) {
        if (!dom.upMusic || !dom.upMusicAudio) return;

        // Stop any previous playback
        dom.upMusicAudio.pause();
        dom.upMusicAudio.removeAttribute('src');

        if (!url) {
            dom.upMusic.style.display = 'none';
            return;
        }

        dom.upMusic.style.display = 'flex';
        if (dom.upMusicTitle) dom.upMusicTitle.textContent = title || 'Now playing';
        if (dom.upMusicArtist) dom.upMusicArtist.textContent = artist || '';
        dom.upMusicAudio.src = url;
        dom.upMusicAudio.load();

        // Autoplay the song when the popup opens
        pendingAutoplay = false;
        document.removeEventListener('click', tryResumeAutoplay);
        document.removeEventListener('keydown', tryResumeAutoplay);
        document.removeEventListener('mousemove', tryResumeAutoplay);

        var playPromise = dom.upMusicAudio.play();
        if (playPromise && playPromise.then) {
            playPromise.then(function () {
                if (dom.upMusicToggle) {
                    dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                    dom.upMusicToggle.setAttribute('aria-label', 'Pause profile music');
                }
                if (dom.upMusicIcon) dom.upMusicIcon.classList.add('eq');
            }).catch(function () {
                // Browser blocked autoplay — retry on the user's next interaction
                pendingAutoplay = true;
                document.addEventListener('click', tryResumeAutoplay);
                document.addEventListener('keydown', tryResumeAutoplay);
                document.addEventListener('mousemove', tryResumeAutoplay);
            });
        }

        if (dom.upMusicToggle) {
            dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
            dom.upMusicToggle.setAttribute('aria-label', 'Play profile music');
            dom.upMusicToggle.onclick = null;
            dom.upMusicToggle.onclick = function () {
                if (dom.upMusicAudio.paused) {
                    dom.upMusicAudio.play().catch(function () {});
                    dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                    dom.upMusicToggle.setAttribute('aria-label', 'Pause profile music');
                    if (dom.upMusicIcon) dom.upMusicIcon.classList.add('eq');
                } else {
                    dom.upMusicAudio.pause();
                    dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
                    dom.upMusicToggle.setAttribute('aria-label', 'Play profile music');
                    if (dom.upMusicIcon) dom.upMusicIcon.classList.remove('eq');
                }
            };
            dom.upMusicAudio.onended = function () {
                dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
                dom.upMusicToggle.setAttribute('aria-label', 'Play profile music');
                if (dom.upMusicIcon) dom.upMusicIcon.classList.remove('eq');
            };
        }
    }

    function stopPopupMusic() {
        if (dom.upMusicAudio) {
            dom.upMusicAudio.pause();
            dom.upMusicAudio.removeAttribute('src');
        }
        if (dom.upMusicIcon) dom.upMusicIcon.classList.remove('eq');
        if (dom.upMusicToggle) {
            dom.upMusicToggle.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
            dom.upMusicToggle.setAttribute('aria-label', 'Play profile music');
        }
    }

    function showPopupData(data) {
        if (!popupOpen) return;

        // Hide skeleton, show content
        if (dom.upSkeleton) dom.upSkeleton.style.display = 'none';
        if (dom.upContent) dom.upContent.style.display = '';

        // Reset card entrance animations
        var cards = dom.userPopup.querySelectorAll('.up-card.rp-entrance');
        cards.forEach(function (c) {
            c.style.animation = 'none';
            c.offsetHeight;
            c.style.animation = '';
        });

        // Avatar & status
        if (dom.upAvatar) dom.upAvatar.src = data.avatar || getAvatarUrl({ id: data.id, profile_picture: data.avatar });
        if (dom.upStatusDot) dom.upStatusDot.className = 'up-status-dot ' + (data.online ? 'online' : 'offline');
        // Profile ring on popup
        if (dom.upAvatarRing) {
            var ring = (data.profileRing || data.profile_ring) && (data.profileRing || data.profile_ring) !== 'none' ? (data.profileRing || data.profile_ring) : '';
            dom.upAvatarRing.className = 'up-avatar-ring' + (ring ? ' ' + ring : '');
            if (ring && RING_GRADIENTS[ring]) {
                var g = RING_GRADIENTS[ring];
                dom.upAvatarRing.style.background = g.bg;
                dom.upAvatarRing.style.boxShadow = g.shadow;
                dom.upAvatarRing.style.animation = 'none';
            } else {
                dom.upAvatarRing.style.background = '';
                dom.upAvatarRing.style.boxShadow = '';
                dom.upAvatarRing.style.animation = '';
            }
        }
        // Profile effect — neon wash across the whole popup card
        if (dom.userPopup) {
            var upEffect = (data.profileEffect || data.profile_effect) && (data.profileEffect || data.profile_effect) !== 'none' ? (data.profileEffect || data.profile_effect) : '';
            var popupClasses = dom.userPopup.className.split(' ').filter(function (c) { return c.indexOf('effect_') !== 0; });
            if (upEffect) popupClasses.push(upEffect);
            dom.userPopup.className = popupClasses.join(' ');
        }

        // Profile music
        var musicUrl = data.profileMusic || data.profile_music || '';
        var musicTitle = data.profileMusicTitle || data.profile_music_title || 'Now playing';
        var musicArtist = data.profileMusicArtist || data.profile_music_artist || '';
        setupPopupMusic(musicUrl, musicTitle, musicArtist);

        // Banner / Cover photo
        if (dom.upBanner && dom.upBannerImg) {
            if (data.banner) {
                dom.upBannerImg.style.backgroundImage = 'url(' + data.banner + ')';
                dom.upBanner.classList.add('has-cover');
            } else {
                dom.upBannerImg.style.backgroundImage = '';
                dom.upBanner.classList.remove('has-cover');
            }
        }

        // Identity
        if (dom.upUsername) dom.upUsername.textContent = data.username;
        if (dom.upDiscrim) dom.upDiscrim.textContent = '';
        if (dom.upDisplayRow) {
            if (data.displayName) {
                dom.upDisplayRow.textContent = data.displayName;
                dom.upDisplayRow.style.display = '';
            } else {
                dom.upDisplayRow.style.display = 'none';
            }
        }

        // Badges row
        if (dom.upBadgesRow) {
            var badgesHtml = '';
            if (data.rank && window.HiveRankBadge) {
                var rankBadge = window.HiveRankBadge.create(data.rank, 16);
                if (rankBadge) badgesHtml += rankBadge.outerHTML;
            }
            if (data.isVerified) {
                badgesHtml += '<span class="verified-badge" title="Verified"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6C63FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>';
            }
            if (data.isBot) {
                badgesHtml += '<span class="rank-badge rank-badge-sm rank-bot bot-badge" data-rank="bot" data-rank-tip="Bot"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#00E5FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg></span>';
            }
            dom.upBadgesRow.innerHTML = badgesHtml;
        }

        // Rank row
        if (dom.upRankRow) {
            if (data.rankInfo) {
                var rankChipCls = '';
                if (['owner','administrator','moderator'].indexOf(data.rank) !== -1) rankChipCls = ' rank-staff';
                if (data.rank === 'owner') rankChipCls = ' rank-owner';
                dom.upRankRow.innerHTML = '<span class="up-rank-chip' + rankChipCls + '">' +
                    '<span style="color:' + data.rankInfo.color + '">' + data.rankInfo.label + '</span></span>';
            } else {
                dom.upRankRow.innerHTML = '<span class="up-rank-chip">Member</span>';
            }
        }

        // Meta row
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var fullMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var joinDate = new Date(data.createdAt);
        var joinedStr = 'Joined ' + fullMonths[joinDate.getMonth()] + ' ' + joinDate.getDate() + ', ' + joinDate.getFullYear();
        if (dom.upJoinedText) dom.upJoinedText.textContent = joinedStr;

        // Local time (estimate from timezone or default)
        if (dom.upLocaltimeText) {
            var now = new Date();
            var localHour = now.getHours();
            var ampm = localHour >= 12 ? 'PM' : 'AM';
            var h12 = localHour % 12 || 12;
            dom.upLocaltimeText.textContent = h12 + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes() + ' ' + ampm;
        }

        // Bio
        if (dom.upBio) {
            if (data.bio) {
                dom.upBio.textContent = data.bio;
                dom.upBio.classList.remove('is-empty');
            } else {
                dom.upBio.textContent = "This user hasn't written a bio yet.";
                dom.upBio.classList.add('is-empty');
            }
        }

        // Hide Message button for Hive Guardian (cannot receive DMs)
        var isHiveGuardian = data.username && data.username.toLowerCase() === 'hive guardian';
        if (dom.upMsgBtn) {
            if (isHiveGuardian) {
                dom.upMsgBtn.style.display = 'none';
            } else {
                dom.upMsgBtn.style.display = '';
            }
        }

        // Action button handlers
        if (dom.upMsgBtn) {
            dom.upMsgBtn.onclick = function (e) {
                e.stopPropagation();
                if (dom.upMsgBtn.disabled) return;
                var origHtml = dom.upMsgBtn.innerHTML;
                dom.upMsgBtn.disabled = true;
                dom.upMsgBtn.innerHTML = '<span class="up-msg-spinner"></span> Checking...';
                apiGet('/api/dm/check-permission/' + data.id)
                    .then(function (res) {
                        if (res && res.allowed) {
                            closeUserPopup();
                            showDmView();
                            return apiPost('/api/dm/conversations', { userId: data.id })
                                .then(function (convRes) {
                                    if (convRes && convRes.conversationId) {
                                        return loadDmConversations()
                                            .then(function () {
                                                openDmConversation(convRes.conversationId);
                                            });
                                    }
                                });
                        } else {
                            showToast((res && res.reason) || 'Cannot message this user', 'error');
                            dom.upMsgBtn.disabled = false;
                            dom.upMsgBtn.innerHTML = origHtml;
                        }
                    })
                    .then(function () {
                        if (dom.upMsgBtn) {
                            dom.upMsgBtn.disabled = false;
                            dom.upMsgBtn.innerHTML = origHtml;
                        }
                    })
                    .catch(function (err) {
                        console.error('[HIVE] DM permission check failed:', err);
                        showToast('Failed to check DM permissions', 'error');
                        dom.upMsgBtn.disabled = false;
                        dom.upMsgBtn.innerHTML = origHtml;
                    });
            };
        }
        // Friend button — show correct state based on relationship
        if (dom.upFriendBtn) {
            var rel = data.relationship || 'none';
            if (data.id === window.HiveAuth.getUser().id) {
                dom.upFriendBtn.style.display = 'none';
            } else {
                dom.upFriendBtn.style.display = '';
                if (rel === 'friends') {
                    setFriendBtnState('friends');
                    dom.upFriendBtn.onclick = null;
                } else if (rel === 'request_sent') {
                    setFriendBtnState('pending');
                    dom.upFriendBtn.onclick = null;
                } else if (rel === 'request_received') {
                    setFriendBtnState('incoming', { requestId: data.requestId || '' });
                    dom.upFriendBtn.onclick = function (e) {
                        e.stopPropagation();
                        handleAcceptRequestFromPopup(data.id);
                    };
                } else {
                    setFriendBtnState('none');
                    dom.upFriendBtn.onclick = function (e) {
                        e.stopPropagation();
                        handleSendFriendRequest(data.id, data.username);
                    };
                }
            }
        }
        if (dom.upMoreBtn) {
            dom.upMoreBtn.onclick = function (e) {
                e.stopPropagation();
                showToast('More options coming soon');
            };
        }

        // Mobile back button — closes the user popup
        var upBackBtn = $('up-back-btn');
        if (upBackBtn) {
            upBackBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                closeUserPopup();
            });
        }

        // Wire action tiles
        var tiles = dom.userPopup.querySelectorAll('.up-action-tile');
        tiles.forEach(function (tile) {
            tile.onclick = function (e) {
                e.stopPropagation();
                var tip = tile.getAttribute('data-tip');
                if (tip === 'Copy ID') {
                    if (navigator.clipboard) navigator.clipboard.writeText(String(data.id));
                    showToast('User ID copied!');
                } else if (tip === 'Mention') {
                    if (dom.composerInput) {
                        dom.composerInput.focus();
                        document.execCommand('insertText', false, '@' + data.username + ' ');
                    }
                    closeUserPopup();
                } else {
                    showToast(tip + ' — coming soon');
                }
            };
        });

        // Profile info
        if (dom.upCountry) dom.upCountry.textContent = data.country || 'Not set';
        if (dom.upLanguage) dom.upLanguage.textContent = data.language || 'English';
        var joinedShort = months[joinDate.getMonth()] + ' ' + joinDate.getFullYear();
        if (dom.upJoinedHive) dom.upJoinedHive.textContent = joinedShort;
        if (dom.upSince) dom.upSince.textContent = (data.accountAgeDays || 0) + ' days';
        if (dom.upFavCommunity) {
            var fav = data.mutuals && data.mutuals.length > 0 ? data.mutuals[0].name : 'General';
            dom.upFavCommunity.textContent = fav;
        }
        if (dom.upStatusText) dom.upStatusText.textContent = data.online ? 'Online' : 'Offline';

        // Stats — animate counters
        var statEls = dom.userPopup.querySelectorAll('[data-stat]');
        statEls.forEach(function (el) { el.textContent = '0'; });

        // Badges grid
        if (dom.upBadgesGrid) {
            var badgeSvgMap = {
                rank: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
                verified: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
                bot: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>',
                messenger: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
                chatterbox: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
                vocal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
                explorer_badge: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
                loyal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
                veteran_badge: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15l-2 5l9-13h-5l2-5-9 13h5z"/></svg>',
            };
            dom.upBadgesGrid.innerHTML = (data.badges || []).map(function (b) {
                var svg = badgeSvgMap[b.icon] || badgeSvgMap.rank;
                return '<div class="up-badge-item">' +
                    '<div class="up-badge-icon" style="color:' + b.color + '">' + svg + '</div>' +
                    '<span class="up-badge-name">' + escapeHtml(b.name) + '</span>' +
                '</div>';
            }).join('');
        }

        // Mutual communities
        if (dom.upMutualChips) {
            if (!data.mutuals || data.mutuals.length === 0) {
                dom.upMutualChips.innerHTML = '<div class="up-mutual-empty">No mutual servers</div>';
            } else {
                dom.upMutualChips.innerHTML = data.mutuals.map(function (m) {
                    var iconSrc = m.icon || 'https://i.pravatar.cc/40?u=' + m.id;
                    return '<div class="up-mutual-chip">' +
                        '<img class="up-mutual-chip-icon" src="' + escapeHtml(iconSrc) + '" alt="" loading="lazy">' +
                        '<span class="up-mutual-chip-name">' + escapeHtml(m.name) + '</span>' +
                    '</div>';
                }).join('');
            }
        }

        // Roles
        if (dom.upRoleChips) {
            dom.upRoleChips.innerHTML = (data.roles || []).map(function (r) {
                return '<span class="up-role-chip"><span class="up-role-chip-dot" style="background:' + r.color + '"></span>' + escapeHtml(r.name) + '</span>';
            }).join('');
        }

        // Footer ID
        if (dom.upFooterId) dom.upFooterId.textContent = 'User ID: ' + data.id;

        // Animate stats
        statEls.forEach(function (el) {
            var key = el.getAttribute('data-stat');
            var target = (data.stats && data.stats[key]) || 0;
            animateCounter(el, target);
        });

        // Re-position after content loaded (height may have changed)
        var anchor = qs('.msg-avatar:hover, .msg-username:hover');
        if (anchor) positionPopup(anchor);
    }

    function handleSendFriendRequest(userId, username) {
        if (!dom.upFriendBtn) return;
        setFriendBtnState('loading');

        apiPost('/api/friends/request', { receiverId: userId })
            .then(function (res) {
                setFriendBtnState('pending');
                showToast('Friend request sent to ' + username);
            })
            .catch(function (err) {
                setFriendBtnState('none');
                showToast((err && err.message) || 'Failed to send friend request', 'error');
            });
    }

    function handleAcceptRequestFromPopup(userId) {
        if (!dom.upFriendBtn) return;
        setFriendBtnState('loading');

        // Use requestId from popup data (stored on the button's parent or passed through data)
        var requestId = dom.upFriendBtn.getAttribute('data-request-id');
        if (!requestId) {
            // Fallback: fetch from notifications
            apiGet('/api/notifications?limit=50')
                .then(function (data) {
                    var notifs = data.notifications || [];
                    for (var i = 0; i < notifs.length; i++) {
                        var n = notifs[i];
                        if (n.type === 'FRIEND_REQUEST' && n.sender_user_id === userId && !n.is_read) {
                            var meta = n.metadata || {};
                            if (meta.requestId) {
                                return apiPut('/api/friends/request/' + meta.requestId + '/accept');
                            }
                        }
                    }
                    throw new Error('Request not found');
                })
                .then(function () {
                    setFriendBtnState('friends');
                    showToast('You are now friends!');
                })
                .catch(function (err) {
                    setFriendBtnState('incoming');
                    showToast((err && err.message) || 'Failed to accept friend request', 'error');
                });
            return;
        }

        apiPut('/api/friends/request/' + requestId + '/accept')
            .then(function () {
                setFriendBtnState('friends');
                showToast('You are now friends!');
            })
            .catch(function (err) {
                setFriendBtnState('incoming');
                showToast((err && err.message) || 'Failed to accept friend request', 'error');
            });
    }

    function apiPut(endpoint) {
        return window.HiveAuth.apiFetch(endpoint, { method: 'PUT' });
    }

    function showPopupError(userId) {
        if (dom.upSkeleton) dom.upSkeleton.style.display = 'none';
        if (dom.upContent) {
            dom.upContent.style.display = '';
            dom.upContent.innerHTML = '<div class="up-error">' +
                '<div class="up-error-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
                '<div class="up-error-text">Failed to load profile.<br>Please try again.</div>' +
                '<button class="up-error-retry" onclick="retryPopupLoad(\'' + escapeHtml(userId) + '\')">Retry</button>' +
            '</div>';
        }
    }

    function retryPopupLoad(userId) {
        if (dom.upSkeleton) dom.upSkeleton.style.display = '';
        if (dom.upContent) dom.upContent.style.display = 'none';
        fetchPopupData(userId).then(function (data) {
            if (popupOpen) showPopupData(data);
        }).catch(function () {
            if (popupOpen) showPopupError(userId);
        });
    }
    // Expose for onclick retry button
    window.retryPopupLoad = retryPopupLoad;

    function closeUserPopup() {
        var overlay = dom.upOverlay;
        var popup = dom.userPopup;
        if (!overlay || !popup) return;

        pendingAutoplay = false;
        document.removeEventListener('click', tryResumeAutoplay);
        document.removeEventListener('keydown', tryResumeAutoplay);
        document.removeEventListener('mousemove', tryResumeAutoplay);
        stopPopupMusic();
        popup.classList.add('up-exit');
        overlay.classList.remove('visible');

        setTimeout(function () {
            overlay.style.display = 'none';
            popup.classList.remove('up-exit');
            popupOpen = false;
            if (dom.upBanner) dom.upBanner.classList.remove('has-cover');
            if (dom.upBannerImg) dom.upBannerImg.style.backgroundImage = '';
            // Reset friend button state
            if (dom.upFriendBtn) {
                resetFriendBtnToDefault();
            }
        }, 200);

        document.removeEventListener('click', handlePopupClickOutside);
        document.removeEventListener('keydown', handlePopupEsc);
    }

    function handlePopupClickOutside(e) {
        if (!popupOpen) return;
        var popup = dom.userPopup;
        if (popup && !popup.contains(e.target)) {
            closeUserPopup();
        }
    }

    function handlePopupEsc(e) {
        if (e.key === 'Escape') closeUserPopup();
    }

    function positionPopup(anchorEl) {
        var popup = dom.userPopup;
        if (!popup) return;

        // On mobile the popup is a fixed full-screen sheet — skip anchor positioning.
        if (window.innerWidth <= 900) {
            popup.style.top = '';
            popup.style.left = '';
            popup.classList.remove('up-center');
            return;
        }

        popup.style.top = '';
        popup.style.left = '';
        popup.classList.remove('up-center');

        if (!anchorEl) {
            // Center on screen when no anchor
            popup.classList.add('up-center');
            return;
        }

        var rect = anchorEl.getBoundingClientRect();
        var popW = 440;
        var popH = Math.min(popup.scrollHeight || 600, 600);
        var gap = 14;
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        // Default: right of anchor
        var left = rect.right + gap;
        var top = rect.top - 40;

        // If overflows right, try left
        if (left + popW > vw - 20) {
            left = rect.left - popW - gap;
        }
        // If overflows left, center
        if (left < 20) {
            left = Math.max(20, (vw - popW) / 2);
            popup.classList.add('up-center');
        }

        // Clamp top
        if (top + popH > vh - 20) {
            top = vh - popH - 20;
        }
        if (top < 20) top = 20;

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    function animateCounter(el, target) {
        if (!el) return;
        if (target <= 0) { el.textContent = '0'; return; }
        var duration = 700;
        var start = performance.now();
        function step(now) {
            var progress = Math.min((now - start) / duration, 1);
            var ease = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(ease * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function init() {
        cacheDom();
        cacheDomHashtags();
        initParticles();
        initTooltips();
        initProfileEvents();
        initEditProfile();
        initAttachmentSystem();
        initLightbox();

        // Disconnect socket on page close for immediate offline
        window.addEventListener('beforeunload', function () {
            if (state.socket) {
                state.socket.disconnect();
            }
            stopHeartbeat();
        });

        // Reconnect socket when user returns to tab
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                if (state.socket && !state.socket.connected) {
                    state.socket.connect();
                }
            }
        });

        checkAuth()
            .then(function () {
                return loadCommunities();
            })
            .then(function () {
                handleInitialRoute();
                connectSocket();
                bindEvents();
                initScrollLoadMore();
                updateChatsBadge();
                loadNotifUnreadCount();
            })
            .catch(function (err) {
                console.error('[HIVE] Init failed:', err);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
