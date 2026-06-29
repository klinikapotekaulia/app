/**
 * js/manajemen/karyawan.js — VERSI SUPABASE FIX
 * CRUD Data Karyawan (Dokter, Apoteker, Perawat, dll)
 */

window.AppManajemenKaryawan = {
    data: [],
    usersList: [],

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = [];
        this.usersList = [];
    },

    render: function() {
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'admin'); // Hanya Admin yang bisa CRUD

        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Data Karyawan</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data karyawan klinik & apotek</p>';
        html += '  </div>';
        if (canEdit) {
            html += '  <button onclick="AppManajemenKaryawan.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah Karyawan</button>';
        }
        html += '</div>';
        html += '<div id="karyawan-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        
        // FIX: Gunakan .select('*') dan hapus .get() (bukan syntax Supabase)
        var pKaryawan = window.sb.from('karyawan').select('*').order('nama', { ascending: true });
        var pUsers = window.sb.from('users').select('*');

        Promise.all([pKaryawan, pUsers]).then(function(results) {
            // FIX: Supabase mengembalikan objek { data: [], error: null }
            self.data = results[0].data || [];
            self.usersList = results[1].data || [];
            self.renderList();
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error');
        });
    },

    renderList: function() {
        var container = document.getElementById('karyawan-list');
        if (!container) return;
        
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'admin');

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Belum ada data karyawan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Departemen</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">Jabatan</th>';
        html += '<th class="px-4 py-3 text-left hidden lg:table-cell">Akun Login</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        if (canEdit) html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        var self = this;
        this.data.forEach(function(k) {
            var deptColor = k.departemen === 'Klinik' ? 'purple' : (k.departemen === 'Apotek' ? 'teal' : 'slate');
            var statusBadge = k.status === 'aktif' ? 
                '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : 
                '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>';
            
            // Cari data user terkait untuk menampilkan email
            var linkedUser = k.user_id ? self.usersList.find(function(u){ return u.id === k.user_id; }) : null;
            var akunInfo = linkedUser ? '<span class="text-xs text-blue-600">' + Utils.escapeHtml(linkedUser.email) + '</span>' : '<span class="text-xs text-slate-400 italic">Belum ada akun</span>';

            // Escape nama untuk dipakai di attribute onclick
            var safeName = (k.nama || '-').replace(/'/g, "\\'");

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama) + '</td>';
            html += '<td class="px-4 py-3"><span class="text-xs bg-' + deptColor + '-50 dark:bg-' + deptColor + '-900/30 text-' + deptColor + '-600 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(k.departemen || '-') + '</span></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">' + Utils.escapeHtml(k.jabatan || '-') + '</td>';
            html += '<td class="px-4 py-3 hidden lg:table-cell">' + akunInfo + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            
            if (canEdit) {
                html += '<td class="px-4 py-3 text-right space-x-1">';
                html += '<button onclick="AppManajemenKaryawan.openForm(\'' + k.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
                html += '<button onclick="AppManajemenKaryawan.hapus(\'' + k.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
                html += '</td>';
            }
            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var k = isEdit ? this.data.find(function(x) { return x.id === id; }) : {};
        
        // Cari akun user yang BELUM punya karyawan_id, ditambah akun user dari karyawan ini (jika edit)
        var availableUsers = this.usersList.filter(function(u) {
            return !u.karyawan_id || u.karyawan_id === id;
        });

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Karyawan</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-karyawan" class="space-y-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label><input type="text" id="fk-nama" value="' + Utils.escapeHtml(k.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departemen *</label><select id="fk-dept" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option><option value="Klinik"' + (k.departemen==='Klinik'?' selected':'') + '>Klinik</option><option value="Apotek"' + (k.departemen==='Apotek'?' selected':'') + '>Apotek</option><option value="Umum"' + (k.departemen==='Umum'?' selected':'') + '>Umum</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan</label><input type="text" id="fk-jabatan" value="' + Utils.escapeHtml(k.jabatan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Dokter, Apoteker, Kasir..."></div>';
        html += '</div>';

        // Link ke Akun Login
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Akun Login (Opsional)</label><select id="fk-userid" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Tidak Pakai Akun --</option>';
        availableUsers.forEach(function(u) {
            var sel = (u.id === k.user_id) ? ' selected' : '';
            html += '<option value="' + u.id + '" data-email="' + Utils.escapeHtml(u.email) + '"' + sel + '>' + Utils.escapeHtml(u.email) + ' (' + Utils.escapeHtml(u.role) + ')</option>';
        });
        html += '</select><p class="text-xs text-slate-400 mt-1">Hubungkan karyawan dengan akun login mereka agar bisa Check-In mandiri.</p></div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIP / ID</label><input type="text" id="fk-nip" value="' + Utils.escapeHtml(k.nip || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select id="fk-status" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="aktif"' + (k.status!=='nonaktif'?' selected':'') + '>Aktif</option><option value="nonaktif"' + (k.status==='nonaktif'?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fk-id" value="' + k.id + '">';
        // Simpan user_id lama untuk keperluan unlink saat ganti akun
        if (isEdit && k.user_id) html += '<input type="hidden" id="fk-old-userid" value="' + k.user_id + '">';
        
        html += '</form></div>';

        Utils.openModal(html);
        
        setTimeout(function() {
            var form = document.getElementById('form-karyawan');
            if(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppManajemenKaryawan.simpan();
                });
            }
        }, 100);
    },

    simpan: function() {
        var idField = document.getElementById('fk-id');
        var isEdit = !!idField;
        
        var userSelect = document.getElementById('fk-userid');
        var user_id = userSelect ? userSelect.value : null;
        var email = (user_id && userSelect.selectedIndex > 0) ? userSelect.options[userSelect.selectedIndex].getAttribute('data-email') : null;

        var obj = {
            nama: document.getElementById('fk-nama').value.trim(),
            departemen: document.getElementById('fk-dept').value,
            jabatan: document.getElementById('fk-jabatan').value.trim(),
            nip: document.getElementById('fk-nip').value.trim(),
            status: document.getElementById('fk-status').value,
            user_id: user_id || null,
            email: email // Sinkronisasi email ke tabel karyawan
        };

        if (!obj.nama || !obj.departemen) {
            Utils.toast('Nama dan Departemen wajib diisi', 'error');
            return;
        }

        Utils.toast('Menyimpan...', 'info');
        var p;
        
        if (isEdit) {
            // FIX: Supabase butuh .eq('id', id) untuk update
            p = window.sb.from('karyawan').update(obj).eq('id', idField.value);
        } else {
            // FIX: Hapus obj.createdAt, biarkan DB trigger yang handle
            p = window.sb.from('karyawan').insert(obj);
        }

        p.then(function(res) {
            if (res.error) throw res.error;

            // FIX: Cara ambil ID di Supabase v2
            var karyawanIdFinal = isEdit ? idField.value : (res.data && res.data[0] ? res.data[0].id : null);
            
            var oldUserIdField = document.getElementById('fk-old-userid');
            var oldUserId = oldUserIdField ? oldUserIdField.value : null;
            
            // Jika ada akun login yang dipilih/diubah
            if (user_id) {
                window.sb.from('users').update({ 
                    karyawan_id: karyawanIdFinal, 
                    nama: obj.nama 
                }).eq('id', user_id).then(function(){});
                
                // Jika akun login DIGANTI, hapus karyawan_id di akun lama
                if (isEdit && oldUserId && oldUserId !== user_id) {
                    window.sb.from('users').update({ karyawan_id: null }).eq('id', oldUserId).then(function(){});
                }
            } 
            // Jika akun login DILEPAS (dikosongkan)
            else if (isEdit && oldUserId) {
                window.sb.from('users').update({ karyawan_id: null }).eq('id', oldUserId).then(function(){});
            }

            Utils.toast('Karyawan berhasil disimpan!', 'success');
            Utils.closeModal();
            AppManajemenKaryawan.init(); // Reload data
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    },

    hapus: function(id, nama) {
        // Ganti confirm() dengan Utils.openModal yang lebih cantik
        Utils.openModal(
            '<div class="p-6 text-center">' +
            '<i data-lucide="alert-triangle" class="w-12 h-12 text-red-400 mx-auto mb-3"></i>' +
            '<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Hapus Karyawan</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Yakin ingin menghapus <strong>' + Utils.escapeHtml(nama) + '</strong>?</p>' +
            '<div class="flex gap-3 justify-center">' +
            '<button onclick="Utils.closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>' +
            '<button onclick="AppManajemenKaryawan._doHapus(\'' + id + '\')" class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Ya, Hapus</button>' +
            '</div></div>'
        );
    },

    _doHapus: function(id) {
        Utils.closeModal();
        // Hapus karyawan_id dari user yang terhubung sebelum menghapus karyawan
        this.data.forEach(function(k) {
            if (k.id === id && k.user_id) {
                window.sb.from('users').update({ karyawan_id: null }).eq('id', k.user_id).then(function(){});
            }
        });

        window.sb.from('karyawan').delete().eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Berhasil dihapus', 'success');
            AppManajemenKaryawan.init();
        }).catch(function(err) {
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    }
};
