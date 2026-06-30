/**
 * js/manajemen/absensi.js — VERSI SUPABASE FIX
 * Absensi Harian Karyawan (Check-in / Check-out & Manual Input)
 */

window.AppManajemenAbsensi = {
    data: [],
    karyawanList: [],
    selfKaryawanId: null,

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = [];
        this.karyawanList = [];
        this.selfKaryawanId = null;
    },

    // FIX: gunakan tanggal lokal (WIB) supaya tidak mundur 1 hari saat dini hari.
    todayStr: (function(){ var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOStrubstr(0, 10); })(),

    render: function() {
        var role = window.currentRole || 'apotek';
        var isStaff = (role === 'klinik' || role === 'apotek');
        var isAdmin = (role === 'admin');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Absensi Karyawan</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Rekap kehadiran tanggal ' + new Date(this.todayStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p>';
        
        // Kartu Absensi Diri (Untuk Klinik & Apotek)
        if (isStaff) {
            html += '<div id="my-absensi-card" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">';
            html += '<div class="text-center sm:text-left"><h3 class="font-semibold text-gray-800 dark:text-white">Absensi Kamu Hari Ini</h3><p class="text-xs text-slate-400 dark:text-slate-500 mt-1" id="my-status">Memuat status...</p></div>';
            html += '<div id="my-absensi-btn" class="flex gap-2"></div>';
            html += '</div>';
        }

        // Tombol Input Manual (Untuk Admin)
        if (isAdmin) {
            html += '<div class="flex justify-end mb-4">';
            html += '<button onclick="AppManajemenAbsensi.openManualForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Input Manual Absen</button>';
            html += '</div>';
        }

        html += '  <div id="absensi-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        
        // FIX: Hapus .get()
        var pKaryawan = window.sb.from('karyawan').select('*').eq('status', 'aktif');
        var pAbsensi = window.sb.from('absensi').select('*').eq('tanggal', self.todayStr);

        Promise.all([pKaryawan, pAbsensi]).then(function(results) {
            self.karyawanList = results[0].data || [];
            self.data = results[1].data || [];

            // Cari karyawan_id milik staf yang sedang login
            // FIX: HAPUS TYPO "kemungkinId" menjadi "selfKaryawanId"
            self.selfKaryawanId = null;
            if (window.currentUserId) {
                var myKary = self.karyawanList.find(function(k) { return k.user_id === window.currentUserId; });
                if (myKary) self.selfKaryawanId = myKary.id;
            }

            self.renderList();
            
            // Render tombol absensi diri jika staff
            if (window.currentRole === 'klinik' || window.currentRole === 'apotek') {
                self.renderMyAbsensi();
            }
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    // ===== LOGIC ABSENSI DIRI (STAFF) =====
    renderMyAbsensi: function() {
        var btnContainer = document.getElementById('my-absensi-btn');
        var statusEl = document.getElementById('my-status');
        if(!btnContainer || !statusEl) return;

        // FIX: Tambahkan `self.`
        if (!self.selfKaryawanId) {
            statusEl.innerHTML = '<span class="text-amber-500 dark:text-amber-400 font-semibold">Akun belum dihubungkan ke data karyawan</span>';
            btnContainer.innerHTML = '<span class="text-xs text-slate-400 dark:text-slate-500 italic">Hubungkan akun Anda di menu Manajemen Karyawan terlebih dahulu.</span>';
            if(window.lucide) lucide.createIcons();
            return;
        }

        var myAbsen = this.data.find(function(d) { return d.karyawan_id === self.selfKaryawanId; });
        
        if (!myAbsen) {
            statusEl.innerHTML = 'Status: <span class="text-red-500 font-semibold">Belum Check-In</span>';
            btnContainer.innerHTML = '<button onclick="AppManajemenAbsensi.selfCheckIn()" class="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="log-in" class="w-4 h-4"></i> Check-In</button>';
        } else if (myAbsen.check_in && !myAbsen.check_out) {
            var jamMasuk = myAbsen.check_in ? new Date(myAbsen.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            statusEl.innerHTML = 'Status: Masuk pukul <span class="text-green-600 dark:text-green-400 font-semibold">' + jamMasuk + '</span>';
            btnContainer.innerHTML = '<button onclick="AppManajemenAbsensi.selfCheckOut(\'' + myAbsen.id + '\')" class="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="log-out" class="w-4 h-4"></i> Check-Out</button>';
        } else {
            var jamMasuk2 = myAbsen.check_in ? new Date(myAbsen.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            var jamPulang = myAbsen.check_out ? new Date(myAbsen.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            statusEl.innerHTML = 'Selesai (Masuk ' + jamMasuk2 + ' - Pulang ' + jamPulang + ')';
            btnContainer.innerHTML = '<span class="text-xs text-slate-400 dark:text-slate-500 italic">Absensi hari ini selesai.</span>';
        }
        if(window.lucide) lucide.createIcons();
    },

    selfCheckIn: function() {
        // FIX: Tambahkan `self.`
        if (!this.selfKaryawanId) {
            Utils.toast('Akun belum dihubungkan ke data karyawan.', 'error');
            return;
        }
        
        var myKary = this.karyawanList.find(function(k) { return k.id === self.selfKaryawanId; });
        
        window.sb.from('absensi').insert({
            tanggal: this.todayStr,
            karyawan_id: this.selfKaryawanId,
            namanya: myKary ? myKary.nama : 'Karyawan',
            check_in: new Date().toISOString(),
            check_out: null,
            status: 'hadir',
            keterangan: 'Self-Check In'
        }).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Berhasil Check-In!', 'success');
            AppManajemenAbsensi.init();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    },

    selfCheckOut: function(id) {
        // FIX: Tambahkan `self.`
        window.sb.from('absensi').update({
            check_out: new Date().toISOString(),
            status: 'hadir'
        }).eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Berhasil Check-Out. Hati-hati di jalan!', 'success');
            AppManajemenAbsensi.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    // ===== TABEL REKAP (ADMIN) =====
    renderList: function() {
        var container = document.getElementById('absensi-list');
        if (!container) return;

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama Karyawan</th>';
        html += '<th class="px-4 py-3 text-center">Jam Masuk</th>';
        html += '<th class="px-4 py-3 text-center">Jam Pulang</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        if (window.currentRole === 'admin') html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';
        
        // Kumpulkan ID karyawan yang sudah absen hari ini
        var hadirIds = this.data.map(function(d) { return d.karyawan_id; });

        // 1. Tampilkan karyawan yang SUDAH absen
        this.data.forEach(function(a) {
            var jamMasuk = a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            var jamPulang = a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            var statusBadge = a.check_out ? 
                '<span class="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">Selesai</span>' : 
                '<span class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">Bertugas</span>';
                
            html += '<tr class="border-t border-slate-100 dark:border-slate-900/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(a.namanya || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">' + jamMasuk + '</td>';
            html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">' + jamPulang + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            if (window.currentRole === 'admin') {
                html += '<td class="px-4 py-3 text-right"><button onclick="AppManajemenAbsensi._doHapus(\'' + a.id + '\')" class="text-xs text-red-500 hover:underline">Hapus</button></td>';
            }
            html += '</tr>';
        });

        // 2. Tampilkan karyawan yang BELUM absen (Hanya untuk Admin)
        if (window.currentRole === 'admin') {
            this.karyawanList.forEach(function(k) {
                var sudahHadir = hadirIds.indexOf(k.id) !== -1;
                if (!sudahHadir) {
                    html += '<tr class="border-t border-slate-100 dark:border-slate-900/50 text-slate-400 dark:text-slate-500">';
                    html += '<td class="px-4 py-3">' + Utils.escapeHtml(k.nama || '-') + '</td>';
                    html += '<td class="px-4 py-3 text-center">-</td>';
                    html += '<td class="px-4 py-3 text-center">-</td>';
                    html += '<td class="px-4 py-3 text-center"><span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded-full">Belum Absen</span></td>';
                    html += '<td class="px-4 py-3 text-right"></td>';
                    html += '</tr>';
                }
            });
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    // ===== INPUT MANUAL OLEH ADMIN =====
    openManualForm: function() {
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Input Manual Absen</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-manual" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Karyawan *</label><select id="man-kary" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.karyawanList.forEach(function(k) {
            html += '<option value="' + k.id + '" data-nama="' + Utils.escapeHtml(k.nama) + '">' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.departemen || '-') + ')</option>';
        });
        html += '</select></div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jam Masuk</label><input type="time" id="man-masuk" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jam Pulang</label><input type="time" id="man-pulang" class="wultiparty-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(function() {
            var form = document.getElementById('form-manual');
            if(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppManajemenAbsensi.simpanManual();
                });
            }
        }, 100);
    },

    simpanManual: function() {
        var select = document.getElementById('man-kary');
        var karyId = select.value;
        var namaKary = select.options[select.selectedIndex].getAttribute('data-nama');
        var jamMasuk = document.getElementById('man-masuk').value;
        var jamPulang = document.getElementById('man-pulang').value;

        if (!karyId) { Utils.toast('Pilih karyawan', 'error'); return; }

        // Konversi jam ke format ISO String (Bukan Firebase Timestamp)
        var checkInTs = jamMasuk ? this.todayStr + 'T' + jamMasuk + ':00' : null;
        var checkOutTs = jamPulang ? this.todayStr + 'T' + jamPulang + ':00' : null;

        window.sb.from('absensi').insert({
            tanggal: this.todayStr,
            karyawan_id: karyId,
            namanya: namaKary,
            check_in: checkInTs,
            check_out: checkOutTs,
            status: 'hadir',
            keterangan: 'Input Manual oleh ' + (window.currentUserName || 'Admin')
        }).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Absen manual tersimpan!', 'success');
            Utils.closeModal();
            AppManajemenAbsensi.init();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    },

    _doHapus: function(id) {
        Utils.closeModal();
        window.sb.from('absensi').delete().eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Data dihapus.', 'info');
            AppManajemenAbsensi.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    }
};

// FALLBACK: Alias nama objek jika app.js belum diperbaiki
window.AppManajemen_absensi = window.AppManajemenAbsensi;
