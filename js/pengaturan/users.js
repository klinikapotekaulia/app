/**
 * js/pengaturan/users.js — VERSI SUPABASE FIX
 * Manajemen User (Update Role & Status) - Hanya untuk Admin/Keuangan
 * CATATAN: Pembuatan akun AUTH dilakukan via Dashboard Supabase demi keamanan.
 */

window.AppPengaturanUsers = {
    data: [],

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = [];
    },

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Manajemen User</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola hak akses & status akun login</p>';
        html += '  </div>';
        html += '</div>';
        
        // Panduan singkat cara tambah user
        html += '<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-sm text-blue-800 dark:text-blue-300">';
        html += '  <div class="flex gap-3"><i data-lucide="info" class="w-5 h-5 flex-shrink-0 mt-0.5"></i><div>';
        html += '  <p class="font-semibold mb-1">Cara Menambah User Baru:</p>';
        html += '  <ol class="list-decimal list-inside space-y-1 text-xs">';
        html += '    <li>Buka <strong>Supabase Dashboard</strong> → Menu <strong>Authentication</strong> → Klik <strong>Add User</strong>.</li>';
        html += '    <li>Masukkan Email & Password, lalu klik <strong>Create User</strong>.</li>';
        html += '    <li>Akun baru akan otomatis muncul di daftar bawah ini. Silakan atur <strong>Role</strong> dan <strong>Status</strong>-nya.</li>';
        html += '  </ol></div></div></div>';

        html += '<div id="user-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

        init: function() {
        // Keamanan tambahan: Cek role
        if (window.currentRole !== 'admin' && window.currentRole !== 'keuangan') {
            document.getElementById('user-list').innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini khusus Admin/Keuangan.</div>';
            return;
        }

        // ✅ BENAR: Ada .select('*') sebelum .order()
        window.sb.from('users').select('*').order('nama', { ascending: true }).then(function(res) {
            AppPengaturanUsers.data = res.data || [];
            AppPengaturanUsers.renderList();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    renderList: function() {
        var container = document.getElementById('user-list');
        if (!container) return;
        
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Email</th>';
        html += '<th class="px-4 py-3 text-left">Role</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        var self = this;
        this.data.forEach(function(u) {
            // FIX: Tambahkan dark mode pada badge
            var roleBadge = '';
            if(u.role === 'admin') roleBadge = '<span class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">Admin</span>';
            else if(u.role === 'keuangan') roleBadge = '<span class="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Keuangan</span>';
            else if(u.role === 'klinik') roleBadge = '<span class="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Klinik</span>';
            else roleBadge = '<span class="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">Apotek</span>';

            var statusBadge = u.status === 'aktif' ? 
                '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Aktif</span>' : 
                '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full">Nonaktif</span>';
            
            var safeName = (u.nama || '-').replace(/'/g, "\\'");

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(u.nama) + '</td>';
            html += '<td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">' + Utils.escapeHtml(u.email) + '</td>';
            html += '<td class="px-4 py-3">' + roleBadge + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppPengaturanUsers.openForm(\'' + u.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            
            // Cegah user menonaktifkan dirinya sendiri
            if (u.id !== window.currentUserId) {
                html += '<button onclick="AppPengaturanUsers.toggleStatus(\'' + u.id + '\', \'' + u.status + '\')" class="p-1.5 text-slate-400 hover:text-amber-600 rounded"><i data-lucide="power" class="w-4 h-4"></i></button>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    openForm: function(id) {
        var u = this.data.find(function(x) { return x.id === id; });
        if (!u) return;
        
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Edit User</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-user" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label><input type="text" id="fu-nama" value="' + Utils.escapeHtml(u.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input type="email" id="fu-email" value="' + Utils.escapeHtml(u.email || '') + '" readonly class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm bg-slate-100 dark:bg-slate-900 cursor-not-allowed"></div>';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label><select id="fu-role" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="apotek"' + (u.role==='apotek'?' selected':'') + '>Apotek</option>';
        html += '<option value="klinik"' + (u.role==='klinik'?' selected':'') + '>Klinik</option>';
        html += '<option value="admin"' + (u.role==='admin'?' selected':'') + '>Admin (Kepala)</option>';
        html += '<option value="keuangan"' + (u.role==='keuangan'?' selected':'') + '>Keuangan (PSA)</option>';
        html += '</select></div>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select id="fu-status" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="aktif"' + (u.status!=='nonaktif'?' selected':'') + '>Aktif</option><option value="nonaktif"' + (u.status==='nonaktif'?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Update Akses</button>';
        html += '</div>';
        
        html += '<input type="hidden" id="fu-id" value="' + u.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        
        setTimeout(function() {
            var form = document.getElementById('form-user');
            if(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppPengaturanUsers.simpan();
                });
            }
        }, 100);
    },

    simpan: function() {
        var idField = document.getElementById('fu-id');
        var id = idField.value;
        
        var nama = document.getElementById('fu-nama').value.trim();
        var role = document.getElementById('fu-role').value;
        var status = document.getElementById('fu-status').value;

        if (!nama || !role) {
            Utils.toast('Nama dan Role wajib diisi', 'error');
            return;
        }

        Utils.toast('Menyimpan...', 'info');
        
        // FIX: Tambahkan .eq('id', id) agar hanya user yang dipilih yang berubah
        window.sb.from('users').update({
            nama: nama, 
            role: role, 
            status: status
        }).eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            
            // Jika user mengubah dirinya sendiri, update global variable agar sidebar langsung berubah
            if (id === window.currentUserId) {
                window.currentRole = role;
                window.currentUserName = nama;
                renderSidebar(role); // Re-render sidebar berdasarkan role baru
            }

            Utils.toast('Hak akses user berhasil diupdate!', 'success');
            Utils.closeModal();
            AppPengaturanUsers.init();
        }).catch(function(err) { 
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    },

    toggleStatus: function(id, currentStatus) {
        var newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
        
        // FIX: Tambahkan .eq('id', id)
        window.sb.from('users').update({ status: newStatus }).eq('id', id)
            .then(function(res) {
                if (res.error) throw res.error;
                Utils.toast('Status user diubah menjadi ' + newStatus, 'success');
                AppPengaturanUsers.init();
            })
            .catch(function(err) { 
                Utils.toast('Gagal: ' + err.message, 'error'); 
            });
    }
};
