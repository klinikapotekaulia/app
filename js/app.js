/**
 * js/app.js — VERSI SUPABASE (REVISED)
 * Core: Supabase init, Utils, Theme, Routing, Auth state listener
 */

// ============================================================
// 0. GUARD — pastikan library Supabase sudah load
// ============================================================
if (typeof supabase === 'undefined') {
    document.body.innerHTML =
        '<div class="flex items-center justify-center min-h-screen p-4 text-center">' +
        '<div>' +
        '<i data-lucide="wifi-off" class="w-16 h-16 text-red-400 mx-auto mb-4"></i>' +
        '<h1 class="text-xl font-bold text-red-600 mb-2">Gagal Memuat Aplikasi</h1>' +
        '<p class="text-sm text-slate-500">Library utama tidak ditemukan. Periksa koneksi internet lalu refresh halaman.</p>' +
        '</div></div>';
    throw new Error('Supabase JS library tidak ditemukan.');
}

// ============================================================
// 1. SUPABASE CONFIG
// ============================================================
var SUPABASE_URL  = 'https://glrkcqaquzxohrtkqdmp.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscmtjcWFxdXp4b2hydGtxZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTQ3MzcsImV4cCI6MjA5ODI3MDczN30.oZngQB3uTkz3Z8IKLpCMRhjI9nI1HbJuqKVkKQ31Vkg';

var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
window.sb = _supabase;

// ============================================================
// 2. THEME — restore dari localStorage SEBELUM render apapun
// ============================================================
(function () {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
})();

// ============================================================
// 3. UTILS
// ============================================================
window.Utils = {
    formatRupiah: function (num) {
        return 'Rp\u00a0' + (Number(num) || 0).toLocaleString('id-ID');
    },
    escapeHtml: function (text) {
        if (text === null || text === undefined) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(String(text)));
        return div.innerHTML;
    },
    thisMonth: function () {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    },
    today: function () {
        return new Date().toISOString().split('T')[0];
    },
    toast: function (msg, type) {
        type = type || 'info';
        var old = document.getElementById('app-toast');
        if (old) old.remove();
        var colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-amber-500', info: 'bg-slate-700' };
        var icons  = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
        var el = document.createElement('div');
        el.id = 'app-toast';
        el.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm w-auto ' + (colors[type] || colors.info);
        el.innerHTML = '<i data-lucide="' + (icons[type] || 'info') + '" class="w-4 h-4 flex-shrink-0"></i><span>' + Utils.escapeHtml(msg) + '</span>';
        document.body.appendChild(el);
        if (window.lucide) lucide.createIcons({ el: el });
        setTimeout(function () { if (el.parentNode) el.remove(); }, 4000);
    },
    showLoading: function (containerId) {
        var el = document.getElementById(containerId);
        if (el) el.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';
    },
    openModal: function (htmlContent) {
        var existing = document.getElementById('global-modal');
        if (existing) existing.remove();
        var modal = document.createElement('div');
        modal.id = 'global-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
        modal.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">' + htmlContent + '</div>';
        document.body.appendChild(modal);
        // Klik overlay untuk tutup
        modal.addEventListener('click', function (e) {
            if (e.target === modal) Utils.closeModal();
        });
        if (window.lucide) lucide.createIcons();
    },
    closeModal: function () {
        var modal = document.getElementById('global-modal');
        if (modal) modal.remove();
    }
};

// ============================================================
// 4. APP — Theme & Logout
// ============================================================
window.App = {
    toggleTheme: function () {
        document.documentElement.classList.toggle('dark');
        var isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },
    logout: function () {
        Utils.openModal(
            '<div class="p-6 text-center">' +
            '<i data-lucide="log-out" class="w-12 h-12 text-red-400 mx-auto mb-3"></i>' +
            '<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Konfirmasi Logout</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Yakin ingin keluar dari aplikasi?</p>' +
            '<div class="flex gap-3 justify-center">' +
            '<button onclick="Utils.closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Batal</button>' +
            '<button onclick="App._doLogout()" class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors">Ya, Logout</button>' +
            '</div></div>'
        );
    },
    _doLogout: function () {
    Utils.closeModal();
    
    // Hapus semua koneksi realtime sebelum logout
    window.sb.removeAllChannels();
    
    window.sb.auth.signOut()
        .then(function () { Utils.toast('Berhasil logout.', 'success'); })
        .catch(function (e) { Utils.toast('Gagal logout: ' + e.message, 'error'); });
}
};

// ============================================================
// 5. MENU STRUCTURE & ROLE ACCESS
// ============================================================
var menuStructure = {
    utama:     [{ id: 'dashboard',       label: 'Dashboard',         icon: 'layout-dashboard', module: 'dashboard'            }],
    klinik:    [{ id: 'antrian',         label: 'Antrian',           icon: 'list-ordered',     module: 'klinik/antrian'       },
                { id: 'rekam-medis',     label: 'Rekam Medis',       icon: 'file-heart',       module: 'klinik/rekam_medis'    },
                { id: 'resep',           label: 'Resep',             icon: 'file-text',        module: 'klinik/resep'         },
                { id: 'pasien',          label: 'Pasien',            icon: 'users',            module: 'klinik/pasien'        }],
    apotek:    [{ id: 'transaksi',       label: 'Transaksi',         icon: 'shopping-cart',    module: 'apotek/transaksi'     },
                { id: 'obat',            label: 'Obat & Stok',       icon: 'pill',             module: 'apotek/obat'          },
                { id: 'pembelian',       label: 'Pembelian',         icon: 'truck',            module: 'apotek/pembelian'     },
                { id: 'stockOpname',     label: 'Stok Opname',       icon: 'clipboard-check',  module: 'apotek/stockOpname'   },
                { id: 'notifikasi',      label: 'Notifikasi',        icon: 'bell',             module: 'apotek/notifikasi'    },
                { id: 'retur',           label: 'Retur Obat',        icon: 'undo-2',           module: 'apotek/retur'         }],
    laporan:   [{ id: 'hutang',          label: 'Hutang Usaha',      icon: 'file-text',        module: 'laporan/hutang'       },
                { id: 'pengeluaran',     label: 'Pengeluaran',       icon: 'receipt',          module: 'laporan/pengeluaran'  },
                { id: 'piutang',         label: 'Piutang Karyawan',  icon: 'wallet',           module: 'laporan/piutang'      },
                { id: 'penjualanHarian', label: 'Penjualan Harian',  icon: 'bar-chart-2',      module: 'laporan/penjualanHarian'}],
    manajemen: [{ id: 'karyawan',        label: 'Karyawan',          icon: 'user-check',       module: 'manajemen/karyawan'   },
                { id: 'absensi',         label: 'Absensi',           icon: 'calendar-check',   module: 'manajemen/absensi'    }],
    keuangan:  [{ id: 'payroll',         label: 'Payroll',           icon: 'calculator',       module: 'keuangan/payroll'     },
                { id: 'laporan-keuangan',label: 'Lap. Keuangan',     icon: 'bar-chart-3',      module: 'keuangan/laporanKeuangan'},
                { id: 'akuntansi',       label: 'Akuntansi',         icon: 'book-open',        module: 'keuangan/akuntansi'   }],
    pengaturan:[{ id: 'profil',          label: 'Profil Instansi',   icon: 'building-2',       module: 'pengaturan/profil'    },
                { id: 'pembagian',       label: 'Pembagian Hasil',   icon: 'pie-chart',        module: 'pengaturan/pembagian' },
                { id: 'tindakan',        label: 'Master Tindakan',   icon: 'stethoscope',      module: 'pengaturan/tindakan'  },
                { id: 'gaji',            label: 'Pengaturan Gaji',   icon: 'wallet',           module: 'pengaturan/gaji'      },
                { id: 'users',           label: 'Kelola Users',      icon: 'user-cog',         module: 'pengaturan/users'     }]
};

// ✅ FIX #2 — admin sekarang punya akses keuangan & semua pengaturan
// ✅ FIX #10 — keuangan dibatasi, tidak lagi punya akses penuh klinik & apotek
var roleAccess = {
    // Klinik: Hanya operasional klinik + absensi check-in
    klinik:   ['utama', 'klinik', 'manajemen.absensi'],
    
    // Apotek: Operasional apotek penuh + laporan keuangan harian + absensi
    apotek:   [
        'utama', 'apotek', 
        'laporan.hutang', 'laporan.pengeluaran', 'laporan.piutang', 'laporan.penjualanHarian', 
        'manajemen.absensi'
    ],
    
    // Admin (Kepala): Monitor semua, tapi TIDAK urus keuangan detail/payroll
    admin:    [
        'utama', 'klinik', 'apotek', 'laporan', 
        'manajemen.karyawan', 'manajemen.absensi', 
        'pengaturan.profil', 'pengaturan.tindakan'
    ],
    
    // Keuangan (PSA): Akses penuh ke operasional (untuk input) + Keuangan + Pengaturan Khusus
    keuangan: [
        'utama', 'klinik', 'apotek', 'laporan', 
        'manajemen.karyawan', 'manajemen.absensi', 
        'keuangan', 
        'pengaturan.profil', 'pengaturan.pembagian', 'pengaturan.tindakan', 'pengaturan.gaji', 'pengaturan.users'
    ]
};;

// ============================================================
// 6. RENDER SIDEBAR
// ============================================================
function buildSidebarHtml(role) {
    var allowed = roleAccess[role] || [];
    var sections = [
        { key: 'utama',      title: 'Menu Utama',         icon: 'home'           },
        { key: 'klinik',     title: 'Operasional Klinik', icon: 'activity'       },
        { key: 'apotek',     title: 'Operasional Apotek', icon: 'cross'          },
        { key: 'laporan',    title: 'Laporan',            icon: 'file-bar-chart' },
        { key: 'manajemen',  title: 'Manajemen',          icon: 'users'          },
        { key: 'keuangan',   title: 'Keuangan',           icon: 'landmark'       },
        { key: 'pengaturan', title: 'Pengaturan',         icon: 'settings'       }
    ];

    var html = '';
    sections.forEach(function (section) {
        // Cek apakah section ini diizinkan (baik full section atau item tertentu)
        var hasSection = allowed.indexOf(section.key) !== -1 ||
            allowed.some(function (a) { return a.indexOf(section.key + '.') === 0; });
        if (!hasSection) return;

        var items = '';
        menuStructure[section.key].forEach(function (menu) {
            var fullKey = section.key + '.' + menu.id;
            // Diizinkan jika: akses full section ATAU akses item spesifik
            var hasItem = allowed.indexOf(section.key) !== -1 || allowed.indexOf(fullKey) !== -1;
            if (!hasItem) return;
            items +=
                '<li>' +
                '<button onclick="navigateTo(\'' + menu.module + '\', \'' + menu.label + '\')" ' +
                'class="nav-btn w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 ' +
                'hover:bg-primary-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 ' +
                'transition-colors flex items-center gap-3" data-page="' + menu.id + '">' +
                '<i data-lucide="' + menu.icon + '" class="w-4 h-4 flex-shrink-0"></i>' +
                '<span>' + menu.label + '</span>' +
                '</button></li>';
        });
        if (!items) return;

        html +=
            '<div>' +
            '<p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">' +
            '<i data-lucide="' + section.icon + '" class="w-3.5 h-3.5"></i>' +
            section.title + '</p>' +
            '<ul class="space-y-0.5">' + items + '</ul></div>';
    });
    return html;
}

function renderSidebar(role) {
    var html = buildSidebarHtml(role);
    var desktopMenu = document.getElementById('sidebar-menu');
    var mobileMenu  = document.getElementById('mobile-sidebar-menu');
    if (desktopMenu) desktopMenu.innerHTML = html;
    if (mobileMenu)  mobileMenu.innerHTML  = html;
    if (window.lucide) lucide.createIcons();
}

// ============================================================
// 7. DYNAMIC SCRIPT LOADER
// ============================================================
var _currentModule = null;
var _loadedScripts = {};

function loadScript(url) {
    return new Promise(function (resolve, reject) {
        // Cegah cache: tambah timestamp di belakang URL
        var cacheUrl = url + '?v=' + Date.now();
        
        var script = document.createElement('script');
        script.src = cacheUrl;
        script.onload  = function () { resolve(); };
        script.onerror = function () { reject(new Error('Gagal memuat file: ' + url)); };
        document.head.appendChild(script);
    });
}

window.navigateTo = function (modulePath, title) {
    // ✅ FIX #4 — Cleanup module sebelumnya
    if (_currentModule && typeof _currentModule.destroy === 'function') {
        try { _currentModule.destroy(); } catch (e) { console.warn('Cleanup error:', e); }
    }

    // Update judul halaman
    document.getElementById('page-title').textContent = title || '';
    // FIX: Simpan state halaman agar saat refresh tidak kembali ke dashboard
    localStorage.setItem('lastModule', modulePath);
    localStorage.setItem('lastTitle', title || '');

    // Tampilkan loading
    document.getElementById('app-content').innerHTML =
        '<div class="flex justify-center py-20"><div class="spinner"></div></div>';

    // Reset active state semua tombol navigasi
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
        btn.classList.remove('bg-primary-50', 'text-primary-600', 'font-semibold', 'dark:bg-slate-700', 'dark:text-primary-400');
    });

    // Set active state pada tombol yang diklik
    var pageId = modulePath.split('/').pop();
    document.querySelectorAll('[data-page="' + pageId + '"]').forEach(function (btn) {
        btn.classList.add('bg-primary-50', 'text-primary-600', 'font-semibold', 'dark:bg-slate-700', 'dark:text-primary-400');
    });

    // Tutup sidebar mobile jika terbuka
    if (window.innerWidth < 1024) {
        var mobileSidebar = document.getElementById('mobile-sidebar');
        var overlay       = document.getElementById('sidebar-overlay');
        if (mobileSidebar && !mobileSidebar.classList.contains('-translate-x-full')) {
            mobileSidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // Load script module
    var scriptUrl = 'js/' + modulePath + '.js';
    loadScript(scriptUrl).then(function () {
        // Konversi path ke nama module: klinik/antrian → AppKlinikAntrian
        // FIX: Regex yang lebih pintar untuk mengubah snake_case & camelCase menjadi PascalCase
// 'rekam_medis' -> 'RekamMedis', 'stockOpname' -> 'StockOpname'
var moduleName = 'App' + modulePath.split('/')
    .map(function (s) { return s.replace(/(^|_)(\w)/g, function(g, p1, p2) { return p2.toUpperCase(); }); }).join('');

        var Module = window[moduleName];
        if (!Module || typeof Module.render !== 'function') {
            throw new Error('Objek window.' + moduleName + ' tidak ditemukan atau tidak memiliki fungsi render().');
        }

        _currentModule = Module;
        var content = document.getElementById('app-content');
        content.innerHTML = Module.render();

        // Animasi masuk
        content.classList.add('page-enter');
        setTimeout(function () { content.classList.remove('page-enter'); }, 300);

        // Render ikon Lucide
        if (window.lucide) lucide.createIcons();

        // Jalankan init setelah render
        if (typeof Module.init === 'function') Module.init();

    }).catch(function (err) {
        console.error('Gagal load module [' + modulePath + ']:', err);
        document.getElementById('app-content').innerHTML =
            '<div class="text-center py-20">' +
            '<i data-lucide="file-x" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>' +
            '<h3 class="text-lg font-bold text-slate-500">Halaman Belum Tersedia</h3>' +
            '<p class="text-sm text-slate-400 mt-2">' + Utils.escapeHtml(err.message) + '</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
    });
};

// ============================================================
// 8. BOOT APP
// ============================================================
function startApp(userRole, userName) {
    window.currentRole     = userRole;
    window.currentUserName = userName;
    var nameSafe = (userName || 'User').toString().trim() || 'User';
    var roleSafe = (userRole  || 'user').toString().trim() || 'user';
    var elName   = document.getElementById('user-name');
    var elRole   = document.getElementById('user-role');
    var elAvatar = document.getElementById('user-avatar');
    if (elName)   elName.textContent   = nameSafe;
    if (elRole)   elRole.textContent   = roleSafe.charAt(0).toUpperCase() + roleSafe.slice(1);
    if (elAvatar) elAvatar.textContent = (nameSafe.charAt(0) || '?').toUpperCase();
    renderSidebar(userRole);
    // FIX: Buka halaman terakhir yang disimpan, BUKAN selalu dashboard
    var lastModule = localStorage.getItem('lastModule');
    var lastTitle = localStorage.getItem('lastTitle');
    if (lastModule && lastModule !== 'dashboard') {
        navigateTo(lastModule, lastTitle || 'Memuat...');
    } else {
        navigateTo('dashboard', 'Dashboard');
    }
    
        window.startRealtimeListener();
}; // <--- INI TANDA TUTUP FUNGSI startApp YANG HILANG

// ============================================================
// 9. REALTIME LISTENER (Auto-Refresh halaman yang sedang aktif)
// ============================================================
window.startRealtimeListener = function () {
    var tablesToWatch = ['antrian', 'transaksi', 'rekam_medis', 'karyawan', 'obat', 'pasien'];
    
    tablesToWatch.forEach(function (tableName) {
        window.sb.channel('public:' + tableName)
            .on('postgres_changes', {
                event: '*',       
                schema: 'public',
                table: tableName
            }, function (payload) {
                console.log('[Realtime] Perubahan di tabel:', tableName, payload.eventType);
                
                // JANGAN refresh jika user sedang mengetik di input/select/textarea
                var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') {
                    console.log('[Realtime] Dibatalkan, user sedang mengetik...');
                    return; 
                }
                
                if (window._currentModule && typeof window._currentModule.init === 'function') {
                    // Debounce 1 detik agar tidak fetch berulang-ulang
                    clearTimeout(window._realtimeTimeout);
                    window._realtimeTimeout = setTimeout(function () {
                        window._currentModule.init();
                    }, 1000);
                }
            })
            .subscribe();
    });
};

// ============================================================
// 10. AUTH STATE LISTENER — VERSI SUPABASE
// ============================================================
window.sb.auth.onAuthStateChange(function (event, session) {
    if (session && session.user) {
        var overlay = document.getElementById('login-overlay');
        if (overlay) overlay.remove();

        window.currentUserId = session.user.id;

        window.sb.from('users').select('*').eq('id', session.user.id).single()
            .then(function (result) {
                if (result.error || !result.data) {
                    Utils.toast('Profil akun tidak ditemukan di sistem.', 'error');
                    window.sb.auth.signOut();
                    return;
                }

                var data = result.data;

                if (data.status === 'nonaktif') {
                    Utils.toast('Akun Anda dinonaktifkan. Hubungi Admin.', 'error');
                    window.sb.auth.signOut();
                    return;
                }

                var role = data.role;
                if (!role || !roleAccess[role]) {
                    Utils.toast('Role akun tidak valid. Hubungi Admin.', 'error');
                    window.sb.auth.signOut();
                    return;
                }

                startApp(role, data.nama || session.user.email || 'User');
            })
            .catch(function (err) {
                console.error('Gagal memuat profil:', err);
                Utils.toast('Gagal memuat profil: ' + err.message, 'error');
                window.sb.auth.signOut();
            });

    } else {
        window.sb.removeAllChannels();

        var elName   = document.getElementById('user-name');
        var elRole   = document.getElementById('user-role');
        var elAvatar = document.getElementById('user-avatar');
        if (elName)   elName.textContent   = 'Tamu';
        if (elRole)   elRole.textContent   = '-';
        if (elAvatar) elAvatar.textContent = '?';
        window.currentUserId  = null;
        window.currentRole    = null;
        window.currentUserName = null;

        function showLogin(attempts) {
            attempts = attempts || 0;
            if (window.AppAuth && typeof window.AppAuth.renderLogin === 'function') {
                window.AppAuth.renderLogin();
            } else if (attempts < 40) {
                setTimeout(function () { showLogin(attempts + 1); }, 50);
            } else {
                document.getElementById('app-content').innerHTML =
                    '<div class="text-center py-20">' +
                    '<i data-lucide="alert-triangle" class="w-16 h-16 text-red-400 mx-auto mb-4"></i>' +
                    '<h3 class="text-lg font-bold text-red-600">Gagal Memuat Halaman Login</h3>' +
                    '<p class="text-sm text-slate-400 mt-2">Periksa koneksi internet lalu refresh halaman.</p>' +
                    '</div>';
                if (window.lucide) lucide.createIcons();
            }
        }
        showLogin();
    }
}); // <--- PASTIKAN INI ADA DI PALING AKHIR FIL
