/**
 * js/auth.js
 * Form Login & Logout
 *
 * PERBAIKAN v2:
 * - Tidak pakai innerHTML string array (rawan parse error browser)
 * - Input password ADA di dalam <form> agar browser tidak protes
 * - Render pakai DOM API createElement agar struktur dijamin benar
 * - Tidak konflik antara style.cssText dan className
 */

window.AppAuth = {

    _translateError: function (code) {
        var map = {
            'auth/invalid-email':          'Format email tidak valid.',
            'auth/user-disabled':          'Akun ini telah dinonaktifkan oleh admin.',
            'auth/user-not-found':         'Email tidak terdaftar di sistem.',
            'auth/wrong-password':         'Password salah. Periksa kembali.',
            'auth/invalid-credential':     'Email atau password salah.',
            'auth/too-many-requests':      'Terlalu banyak percobaan gagal. Coba lagi beberapa menit.',
            'auth/network-request-failed': 'Tidak dapat terhubung ke server. Periksa koneksi internet.',
            'auth/operation-not-allowed':  'Metode login belum diaktifkan di Firebase Console.',
            'auth/email-already-in-use':   'Email sudah digunakan akun lain.',
            'auth/weak-password':          'Password minimal 6 karakter.'
        };
        return map[code] || ('Login gagal (' + code + '). Silakan coba lagi.');
    },

    renderLogin: function () {
        // Hapus overlay lama
        var existing = document.getElementById('login-overlay');
        if (existing) existing.remove();

        /* ── Overlay wrapper ── */
        var overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        // Tidak campur style & className — pakai style saja agar tidak ada konflik Tailwind
        overlay.setAttribute('style', [
            'position:fixed',
            'inset:0',
            'width:100vw',
            'height:100vh',
            'z-index:9999',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:1rem',
            'background:#f1f5f9'   /* slate-100 */
        ].join(';'));

        /* ── Card container ── */
        var card = document.createElement('div');
        card.setAttribute('style', 'width:100%;max-width:420px');

        /* ── Logo & judul ── */
        var header = document.createElement('div');
        header.setAttribute('style', 'text-align:center;margin-bottom:2rem');
        header.innerHTML = [
            '<img src="icon-512.png" alt="Logo Aulia"',
            ' onerror="this.src=\'icon-192.png\'"',
            ' style="width:96px;height:96px;border-radius:1rem;',
            'box-shadow:0 4px 16px rgba(0,0,0,.12);object-fit:cover;margin:0 auto 1rem">',
            '<h1 style="font-size:1.5rem;font-weight:700;color:#1e293b;margin:0">Aulia Apotek Klinik</h1>',
            '<p style="font-size:.875rem;color:#64748b;margin:.25rem 0 0">Silakan login untuk melanjutkan</p>'
        ].join('');
        card.appendChild(header);

        /* ── Form card ── */
        var formCard = document.createElement('div');
        formCard.setAttribute('style', [
            'background:#fff',
            'border-radius:.75rem',
            'box-shadow:0 1px 4px rgba(0,0,0,.08)',
            'border:1px solid #e2e8f0',
            'padding:1.5rem'
        ].join(';'));

        /* -- Alert error -- */
        var alertBox = document.createElement('div');
        alertBox.id = 'login-alert';
        alertBox.setAttribute('style', [
            'display:none',
            'margin-bottom:1rem',
            'padding:.75rem 1rem',
            'background:#fef2f2',
            'border:1px solid #fecaca',
            'border-radius:.5rem',
            'color:#dc2626',
            'font-size:.875rem',
            'display:none'
        ].join(';'));
        formCard.appendChild(alertBox);

        /* -- Form (PENTING: pakai <form> agar browser tidak protes password field) -- */
        var form = document.createElement('form');
        form.id = 'login-form';
        form.setAttribute('autocomplete', 'on');
        form.setAttribute('novalidate', '');
        form.setAttribute('style', 'margin:0');

        /* -- Email -- */
        var emailGroup = document.createElement('div');
        emailGroup.setAttribute('style', 'margin-bottom:1rem');
        emailGroup.innerHTML = [
            '<label for="login-email" style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.25rem">Email</label>',
            '<input type="email" id="login-email" name="email" autocomplete="email" required',
            ' placeholder="admin@aulia.com"',
            ' style="width:100%;box-sizing:border-box;padding:.625rem .75rem;border:1px solid #d1d5db;',
            'border-radius:.5rem;font-size:.875rem;outline:none;transition:border-color .15s;',
            'font-family:inherit">'
        ].join('');
        form.appendChild(emailGroup);

        /* -- Password -- */
        var passGroup = document.createElement('div');
        passGroup.setAttribute('style', 'margin-bottom:1.5rem');
        passGroup.innerHTML = [
            '<label for="login-pass" style="display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:.25rem">Password</label>',
            '<div style="position:relative">',
            '<input type="password" id="login-pass" name="password" autocomplete="current-password" required',
            ' placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"',
            ' style="width:100%;box-sizing:border-box;padding:.625rem 2.5rem .625rem .75rem;border:1px solid #d1d5db;',
            'border-radius:.5rem;font-size:.875rem;outline:none;transition:border-color .15s;',
            'font-family:inherit">',
            '<button type="button" id="toggle-pass" title="Tampilkan/Sembunyikan password"',
            ' style="position:absolute;right:.625rem;top:50%;transform:translateY(-50%);',
            'background:none;border:none;cursor:pointer;color:#6b7280;padding:0;line-height:1">',
            '<svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"',
            ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
            '</svg>',
            '</button>',
            '</div>'
        ].join('');
        form.appendChild(passGroup);

        /* -- Tombol Login -- */
        var btn = document.createElement('button');
        btn.type = 'submit';
        btn.id   = 'btn-login';
        btn.setAttribute('style', [
            'width:100%',
            'padding:.75rem',
            'background:#0284c7',
            'color:#fff',
            'border:none',
            'border-radius:.5rem',
            'font-size:.9375rem',
            'font-weight:600',
            'cursor:pointer',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'gap:.5rem',
            'transition:background .15s',
            'font-family:inherit'
        ].join(';'));
        btn.innerHTML = '<span id="btn-icon">→</span><span id="btn-text">Masuk</span>';
        form.appendChild(btn);

        formCard.appendChild(form);
        card.appendChild(formCard);

        /* -- Footer -- */
        var footer = document.createElement('p');
        footer.setAttribute('style', 'text-align:center;font-size:.75rem;color:#94a3b8;margin-top:1.25rem');
        footer.textContent = '\u00a9 2025 Aulia System. All rights reserved.';
        card.appendChild(footer);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        /* ── Referensi elemen ── */
        var emailInput = form.querySelector('#login-email');
        var passInput  = form.querySelector('#login-pass');
        var toggleBtn  = form.querySelector('#toggle-pass');
        var eyeIcon    = form.querySelector('#eye-icon');
        var btnIcon    = btn.querySelector('#btn-icon');
        var btnText    = btn.querySelector('#btn-text');

        /* ── Focus style on inputs ── */
        [emailInput, passInput].forEach(function (inp) {
            inp.addEventListener('focus', function () {
                inp.style.borderColor = '#0284c7';
                inp.style.boxShadow   = '0 0 0 3px rgba(2,132,199,.15)';
            });
            inp.addEventListener('blur', function () {
                inp.style.borderColor = '#d1d5db';
                inp.style.boxShadow   = 'none';
            });
        });

        /* ── Toggle show/hide password ── */
        toggleBtn.addEventListener('click', function () {
            var isHidden = passInput.type === 'password';
            passInput.type = isHidden ? 'text' : 'password';
            // Ganti ikon eye ↔ eye-off (SVG inline)
            if (isHidden) {
                eyeIcon.innerHTML = [
                    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>',
                    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>',
                    '<line x1="1" y1="1" x2="23" y2="23"/>'
                ].join('');
            } else {
                eyeIcon.innerHTML = [
                    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>',
                    '<circle cx="12" cy="12" r="3"/>'
                ].join('');
            }
        });

        /* ── Helper: tampilkan / sembunyikan error ── */
        function showError(msg) {
            alertBox.textContent = '⚠ ' + msg;
            alertBox.style.display = 'block';
        }
        function hideError() {
            alertBox.style.display = 'none';
            alertBox.textContent = '';
        }

        /* ── Helper: loading state ── */
        function setLoading(on) {
            btn.disabled       = on;
            btn.style.opacity  = on ? '.65' : '1';
            btn.style.cursor   = on ? 'not-allowed' : 'pointer';
            btnIcon.textContent = on ? '⏳' : '→';
            btnText.textContent = on ? 'Memproses...' : 'Masuk';
        }

        /* ── Submit handler ── */
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError();

            var email = emailInput.value.trim();
            var pass  = passInput.value;

            if (!email) { showError('Email tidak boleh kosong.'); emailInput.focus(); return; }
            if (!pass)  { showError('Password tidak boleh kosong.'); passInput.focus();  return; }

            setLoading(true);

            firebase.auth().signInWithEmailAndPassword(email, pass)
                .then(function () {
                    // onAuthStateChanged di app.js yang akan lanjut
                    setLoading(false);
                })
                .catch(function (err) {
                    setLoading(false);
                    showError(window.AppAuth._translateError(err.code));
                    console.error('[AUTH] Login error:', err.code, err.message);
                });
        });

        /* ── Hover effect tombol ── */
        btn.addEventListener('mouseenter', function () {
            if (!btn.disabled) btn.style.background = '#0369a1';
        });
        btn.addEventListener('mouseleave', function () {
            if (!btn.disabled) btn.style.background = '#0284c7';
        });

        /* ── Auto-focus email ── */
        setTimeout(function () { emailInput.focus(); }, 150);
    },

    logout: function () {
        if (window.App && typeof window.App.logout === 'function') {
            window.App.logout();
        } else {
            firebase.auth().signOut();
        }
    }
};
