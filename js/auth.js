/**
 * js/auth.js — VERSI SUPABASE (REVISED)
 * Form Login & Logout
 */

window.AppAuth = {

    _translateError: function (msg) {
        if (!msg) return 'Login gagal. Silakan coba lagi.';
        if (msg.includes('Invalid login credentials')) return 'Email atau password salah.';
        if (msg.includes('Email not confirmed'))        return 'Email belum dikonfirmasi.';
        if (msg.includes('User not found'))             return 'Email tidak terdaftar di sistem.';
        if (msg.includes('disabled'))                   return 'Akun ini telah dinonaktifkan oleh admin.';
        if (msg.includes('network'))                    return 'Tidak dapat terhubung ke server.';
        if (msg.includes('too many'))                   return 'Terlalu banyak percobaan. Coba lagi beberapa menit.';
        return 'Login gagal: ' + msg;
    },

    renderLogin: function () {
        var existing = document.getElementById('login-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'login-overlay';

        // ── Style block: mendukung light & dark mode ──
        var style = document.createElement('style');
        style.textContent =
            '#login-overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;background:#f1f5f9}' +
            'html.dark #login-overlay{background:#0f172a}' +
            '#login-card{width:100%;max-width:420px}' +
            '#login-header{text-align:center;margin-bottom:2rem}' +
            '#login-header h1{font-size:1.5rem;font-weight:700;color:#1e293b;margin:0}' +
            'html.dark #login-header h1{color:#f1f5f9}' +
            '#login-header p{font-size:.875rem;color:#64748b;margin:.25rem 0 0}' +
            'html.dark #login-header p{color:#94a3b8}' +
            '#login-logo{width:96px;height:96px;border-radius:1rem;box-shadow:0 4px 16px rgba(0,0,0,.12);object-fit:cover;margin:0 auto 1rem;display:block}' +
            'html.dark #login-logo{box-shadow:0 4px 16px rgba(0,0,0,.4)}' +
            '#login-form-card{background:#fff;border-radius:.75rem;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid #e2e8f0;padding:1.5rem}' +
            'html.dark #login-form-card{background:#1e293b;border-color:#334155;box-shadow:0 1px 4px rgba(0,0,0,.3)}' +
            '#login-alert{display:none;margin-bottom:1rem;padding:.75rem 1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:.5rem;color:#dc2626;font-size:.875rem}' +
            'html.dark #login-alert{background:#450a0a;border-color:#7f1d1d;color:#fca5a5}' +
            '#login-form{margin:0}' +
            '.l-label{display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.25rem}' +
            'html.dark .l-label{color:#d1d5db}' +
            '.l-input{width:100%;box-sizing:border-box;padding:.625rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.875rem;outline:none;font-family:inherit;background:#fff;color:#1e293b;transition:border-color .15s,box-shadow .15s}' +
            'html.dark .l-input{background:#0f172a;border-color:#475569;color:#e2e8f0}' +
            '.l-input:focus{border-color:#0284c7;box-shadow:0 0 0 3px rgba(2,132,199,.15)}' +
            '.l-input.error{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1)}' +
            '#btn-login{width:100%;padding:.75rem;background:#0284c7;color:#fff;border:none;border-radius:.5rem;font-size:.9375rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;font-family:inherit;transition:background .15s,opacity .15s}' +
            '#btn-login:hover:not(:disabled){background:#0369a1}' +
            '#btn-login:disabled{opacity:.65;cursor:not-allowed}' +
            '#toggle-pass{position:absolute;right:.625rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#6b7280;padding:0;display:flex;align-items:center}' +
            'html.dark #toggle-pass{color:#94a3b8}' +
            '#login-footer{text-align:center;font-size:.75rem;color:#94a3b8;margin-top:1.25rem}';
        overlay.appendChild(style);

        // ── Card container ──
        var card = document.createElement('div');
        card.id = 'login-card';

        // ── Header: logo + judul ──
        var header = document.createElement('div');
        header.id = 'login-header';

        var img = document.createElement('img');
        img.id = 'login-logo';
        img.src = 'icon-512.png';
        img.alt = 'Logo Aulia';
        // ✅ FIX #2 — cegah infinite loop onerror
        img.onerror = function () {
            if (!this._triedFallback) {
                this._triedFallback = true;
                this.src = 'icon-192.png';
            } else {
                this.style.display = 'none';
            }
        };
        header.appendChild(img);

        var h1 = document.createElement('h1');
        h1.textContent = 'Aulia Apotek Klinik';
        header.appendChild(h1);

        var subtitle = document.createElement('p');
        subtitle.textContent = 'Silakan login untuk melanjutkan';
        header.appendChild(subtitle);

        card.appendChild(header);

        // ── Form card ──
        var formCard = document.createElement('div');
        formCard.id = 'login-form-card';

        // Alert box
        var alertBox = document.createElement('div');
        alertBox.id = 'login-alert';
        formCard.appendChild(alertBox);

        // Form
        var form = document.createElement('form');
        form.id = 'login-form';
        form.setAttribute('autocomplete', 'on');
        form.setAttribute('novalidate', '');

        // Email field
        var emailGroup = document.createElement('div');
        emailGroup.style.marginBottom = '1rem';

        var emailLabel = document.createElement('label');
        emailLabel.className = 'l-label';
        emailLabel.setAttribute('for', 'login-email');
        emailLabel.textContent = 'Email';
        emailGroup.appendChild(emailLabel);

        var emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'login-email';
        emailInput.name = 'email';
        emailInput.autocomplete = 'email';
        emailInput.required = true;
        emailInput.className = 'l-input';
        emailInput.placeholder = 'admin@aulia.com';
        emailGroup.appendChild(emailInput);

        form.appendChild(emailGroup);

        // Password field
        var passGroup = document.createElement('div');
        passGroup.style.marginBottom = '1.5rem';

        var passLabel = document.createElement('label');
        passLabel.className = 'l-label';
        passLabel.setAttribute('for', 'login-pass');
        passLabel.textContent = 'Password';
        passGroup.appendChild(passLabel);

        var passWrap = document.createElement('div');
        passWrap.style.position = 'relative';

        var passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.id = 'login-pass';
        passInput.name = 'password';
        passInput.autocomplete = 'current-password';
        passInput.required = true;
        passInput.className = 'l-input';
        passInput.style.paddingRight = '2.5rem';
        passInput.placeholder = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
        passWrap.appendChild(passInput);

        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.id = 'toggle-pass';
        toggleBtn.setAttribute('aria-label', 'Tampilkan password');
        toggleBtn.innerHTML =
            '<svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ' +
            'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
            '<circle cx="12" cy="12" r="3"/>' +
            '</svg>';
        passWrap.appendChild(toggleBtn);
        passGroup.appendChild(passWrap);

        form.appendChild(passGroup);

        // Submit button
        var btn = document.createElement('button');
        btn.type = 'submit';
        btn.id = 'btn-login';
        btn.innerHTML = '<span id="btn-icon">\u2192</span><span id="btn-text">Masuk</span>';
        form.appendChild(btn);

        formCard.appendChild(form);
        card.appendChild(formCard);

        // Footer
        var footer = document.createElement('p');
        footer.id = 'login-footer';
        footer.textContent = '\u00a9 2025 Aulia System. All rights reserved.';
        card.appendChild(footer);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // ── Event Listeners ──

        // Toggle password visibility
        toggleBtn.addEventListener('click', function () {
            var isHidden = passInput.type === 'password';
            passInput.type = isHidden ? 'text' : 'password';
            var eyeIcon = document.getElementById('eye-icon');
            if (eyeIcon) {
                eyeIcon.innerHTML = isHidden
                    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
                      '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
                      '<line x1="1" y1="1" x2="23" y2="23"/>'
                    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
                      '<circle cx="12" cy="12" r="3"/>';
            }
        });

        // Helper functions
        function showError(msg) {
            alertBox.textContent = '\u26a0 ' + msg;
            alertBox.style.display = 'block';
        }
        function hideError() {
            alertBox.style.display = 'none';
            alertBox.textContent = '';
        }
        function setLoading(on) {
            btn.disabled = on;
            var btnIcon = document.getElementById('btn-icon');
            var btnText = document.getElementById('btn-text');
            if (btnIcon) btnIcon.textContent = on ? '\u23f3' : '\u2192';
            if (btnText) btnText.textContent = on ? 'Memproses...' : 'Masuk';
        }

        // Clear error saat user mulai mengetik
        emailInput.addEventListener('input', function () {
            hideError();
            emailInput.classList.remove('error');
        });
        passInput.addEventListener('input', function () {
            hideError();
            passInput.classList.remove('error');
        });

        // Form submit
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError();
            emailInput.classList.remove('error');
            passInput.classList.remove('error');

            var email = emailInput.value.trim();
            var pass  = passInput.value;

            if (!email) {
                showError('Email tidak boleh kosong.');
                emailInput.classList.add('error');
                emailInput.focus();
                return;
            }
            // Validasi format email sederhana
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('Format email tidak valid.');
                emailInput.classList.add('error');
                emailInput.focus();
                return;
            }
            if (!pass) {
                showError('Password tidak boleh kosong.');
                passInput.classList.add('error');
                passInput.focus();
                return;
            }

            setLoading(true);

            window.sb.auth.signInWithPassword({ email: email, password: pass })
                .then(function (result) {
                    setLoading(false);
                    if (result.error) {
                        showError(window.AppAuth._translateError(result.error.message));
                    }
                    // Jika sukses, onAuthStateChange di app.js yang handle
                })
                .catch(function (err) {
                    setLoading(false);
                    showError(window.AppAuth._translateError(err.message));
                });
        });

        // Auto-focus email setelah render
        setTimeout(function () { emailInput.focus(); }, 150);
    },

    logout: function () {
        if (window.App && typeof window.App.logout === 'function') {
            window.App.logout();
        } else {
            window.sb.auth.signOut();
        }
    }
};
