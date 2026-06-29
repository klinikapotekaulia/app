/**
 * js/auth.js — VERSI SUPABASE
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
        overlay.setAttribute('style', [
            'position:fixed','inset:0','width:100vw','height:100vh','z-index:9999',
            'display:flex','align-items:center','justify-content:center',
            'padding:1rem','background:#f1f5f9'
        ].join(';'));

        var card = document.createElement('div');
        card.setAttribute('style', 'width:100%;max-width:420px');

        var header = document.createElement('div');
        header.setAttribute('style', 'text-align:center;margin-bottom:2rem');
        header.innerHTML = [
            '<img src="icon-512.png" alt="Logo Aulia" onerror="this.src=\'icon-192.png\'"',
            ' style="width:96px;height:96px;border-radius:1rem;box-shadow:0 4px 16px rgba(0,0,0,.12);object-fit:cover;margin:0 auto 1rem">',
            '<h1 style="font-size:1.5rem;font-weight:700;color:#1e293b;margin:0">Aulia Apotek Klinik</h1>',
            '<p style="font-size:.875rem;color:#64748b;margin:.25rem 0 0">Silakan login untuk melanjutkan</p>'
        ].join('');
        card.appendChild(header);

        var formCard = document.createElement('div');
        formCard.setAttribute('style', [
            'background:#fff','border-radius:.75rem',
            'box-shadow:0 1px 4px rgba(0,0,0,.08)',
            'border:1px solid #e2e8f0','padding:1.5rem'
        ].join(';'));

        var alertBox = document.createElement('div');
        alertBox.id = 'login-alert';
        alertBox.setAttribute('style', [
            'display:none','margin-bottom:1rem','padding:.75rem 1rem',
            'background:#fef2f2','border:1px solid #fecaca',
            'border-radius:.5rem','color:#dc2626','font-size:.875rem'
        ].join(';'));
        formCard.appendChild(alertBox);

        var form = document.createElement('form');
        form.id = 'login-form';
        form.setAttribute('autocomplete', 'on');
        form.setAttribute('novalidate', '');
        form.setAttribute('style', 'margin:0');

        var emailGroup = document.createElement('div');
        emailGroup.setAttribute('style', 'margin-bottom:1rem');
        emailGroup.innerHTML = [
            '<label for="login-email" style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.25rem">Email</label>',
            '<input type="email" id="login-email" name="email" autocomplete="email" required',
            ' placeholder="admin@aulia.com"',
            ' style="width:100%;box-sizing:border-box;padding:.625rem .75rem;border:1px solid #d1d5db;',
            'border-radius:.5rem;font-size:.875rem;outline:none;font-family:inherit">'
        ].join('');
        form.appendChild(emailGroup);

        var passGroup = document.createElement('div');
        passGroup.setAttribute('style', 'margin-bottom:1.5rem');
        passGroup.innerHTML = [
            '<label for="login-pass" style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.25rem">Password</label>',
            '<div style="position:relative">',
            '<input type="password" id="login-pass" name="password" autocomplete="current-password" required',
            ' placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"',
            ' style="width:100%;box-sizing:border-box;padding:.625rem 2.5rem .625rem .75rem;border:1px solid #d1d5db;',
            'border-radius:.5rem;font-size:.875rem;outline:none;font-family:inherit">',
            '<button type="button" id="toggle-pass" style="position:absolute;right:.625rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#6b7280;padding:0">',
            '<svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
            '</svg></button></div>'
        ].join('');
        form.appendChild(passGroup);

        var btn = document.createElement('button');
        btn.type = 'submit';
        btn.id   = 'btn-login';
        btn.setAttribute('style', [
            'width:100%','padding:.75rem','background:#0284c7','color:#fff',
            'border:none','border-radius:.5rem','font-size:.9375rem','font-weight:600',
            'cursor:pointer','display:flex','align-items:center','justify-content:center',
            'gap:.5rem','font-family:inherit'
        ].join(';'));
        btn.innerHTML = '<span id="btn-icon">\u2192</span><span id="btn-text">Masuk</span>';
        form.appendChild(btn);

        formCard.appendChild(form);
        card.appendChild(formCard);

        var footer = document.createElement('p');
        footer.setAttribute('style', 'text-align:center;font-size:.75rem;color:#94a3b8;margin-top:1.25rem');
        footer.textContent = '\u00a9 2025 Aulia System. All rights reserved.';
        card.appendChild(footer);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var emailInput = form.querySelector('#login-email');
        var passInput  = form.querySelector('#login-pass');
        var toggleBtn  = form.querySelector('#toggle-pass');
        var eyeIcon    = form.querySelector('#eye-icon');
        var btnIcon    = btn.querySelector('#btn-icon');
        var btnText    = btn.querySelector('#btn-text');

        [emailInput, passInput].forEach(function (inp) {
            inp.addEventListener('focus', function () { inp.style.borderColor='#0284c7'; inp.style.boxShadow='0 0 0 3px rgba(2,132,199,.15)'; });
            inp.addEventListener('blur',  function () { inp.style.borderColor='#d1d5db'; inp.style.boxShadow='none'; });
        });

        toggleBtn.addEventListener('click', function () {
            var isHidden = passInput.type === 'password';
            passInput.type = isHidden ? 'text' : 'password';
            eyeIcon.innerHTML = isHidden
                ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        });

        function showError(msg) { alertBox.textContent = '\u26a0 ' + msg; alertBox.style.display='block'; }
        function hideError()    { alertBox.style.display='none'; alertBox.textContent=''; }
        function setLoading(on) {
            btn.disabled = on; btn.style.opacity = on ? '.65' : '1'; btn.style.cursor = on ? 'not-allowed' : 'pointer';
            btnIcon.textContent = on ? '\u23f3' : '\u2192';
            btnText.textContent = on ? 'Memproses...' : 'Masuk';
        }

        /* ── Submit: gunakan Supabase Auth ── */
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError();
            var email = emailInput.value.trim();
            var pass  = passInput.value;
            if (!email) { showError('Email tidak boleh kosong.'); emailInput.focus(); return; }
            if (!pass)  { showError('Password tidak boleh kosong.'); passInput.focus();  return; }
            setLoading(true);

            window.sb.auth.signInWithPassword({ email: email, password: pass })
                .then(function (result) {
                    setLoading(false);
                    if (result.error) {
                        showError(window.AppAuth._translateError(result.error.message));
                    }
                    // Jika sukses, onAuthStateChange di app.js yang akan handle
                })
                .catch(function (err) {
                    setLoading(false);
                    showError(window.AppAuth._translateError(err.message));
                });
        });

        btn.addEventListener('mouseenter', function () { if (!btn.disabled) btn.style.background='#0369a1'; });
        btn.addEventListener('mouseleave', function () { if (!btn.disabled) btn.style.background='#0284c7'; });
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
