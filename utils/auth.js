/**
 * Hive Auth Utility — shared across all authenticated pages.
 * Exposes a global `HiveAuth` namespace.
 *
 * Usage:
 *   HiveAuth.getToken()
 *   HiveAuth.setToken(token)
 *   HiveAuth.isAuthenticated()
 *   HiveAuth.logout()
 *   HiveAuth.apiFetch(endpoint, options)
 *   HiveAuth.checkAuth()  // validates token, redirects to /signup/ if invalid
 */
(function () {
    'use strict';

    var API_BASE = 'http://54.202.91.167:5000';
    var TOKEN_KEY = 'hive_token';
    var USER_KEY = 'hive_user';

    var HiveAuth = {
        /**
         * Get the stored JWT token.
         */
        getToken: function () {
            return localStorage.getItem(TOKEN_KEY);
        },

        /**
         * Store the JWT token.
         */
        setToken: function (token) {
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
            }
        },

        /**
         * Get stored user data.
         */
        getUser: function () {
            try {
                var raw = localStorage.getItem(USER_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        },

        /**
         * Store user data.
         */
        setUser: function (user) {
            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            }
        },

        /**
         * Check if user has a stored token (basic check, no server validation).
         */
        isAuthenticated: function () {
            return !!this.getToken();
        },

        /**
         * Clear all auth data and redirect to signup.
         */
        logout: function () {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = '../signup/';
        },

        /**
         * Make an authenticated API request.
         * Automatically attaches the Bearer token.
         */
        apiFetch: function (endpoint, options) {
            var token = this.getToken();
            options = options || {};
            options.headers = options.headers || {};

            if (!options.headers['Content-Type'] && options.body && !(options.body instanceof FormData)) {
                options.headers['Content-Type'] = 'application/json';
            }
            if (token) {
                options.headers['Authorization'] = 'Bearer ' + token;
            }

            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 15000);
            options.signal = controller.signal;

            return fetch(API_BASE + endpoint, options)
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
        },

        /**
         * Validate the current token against the server.
         * If invalid/expired, redirect to signup page.
         * Returns the user data if valid.
         */
        checkAuth: function () {
            var self = this;
            var token = this.getToken();

            if (!token) {
                window.location.href = '../signup/';
                return Promise.reject({ status: 401, message: 'No token' });
            }

            return this.apiFetch('/api/auth/me')
                .then(function (data) {
                    if (data && data.user) {
                        self.setUser(data.user);
                        return data.user;
                    }
                    self.logout();
                    return Promise.reject({ status: 401, message: 'Invalid response' });
                })
                .catch(function (err) {
                    if (err.status === 401 || err.status === 403) {
                        self.logout();
                    }
                    return Promise.reject(err);
                });
        },
    };

    window.HiveAuth = HiveAuth;
})();
