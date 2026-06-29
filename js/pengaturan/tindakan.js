/**
 * js/pengaturan/tindakan.js — VERSI SUPABASE FIX
 * Master Tindakan Klinik & Apotek (Harga, Modal, Tuslah)
 */

window.AppPengaturanTindakan = {
    data: [],
    filterKategori: 'semua',

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = [];
        this.filterKategori = 'semua';
    },

    render: function() {
        var html = '<div class="page-enter max-w-3xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Master Tindakan</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Daftar tindakan klinik & apotek beserta harga dan modal</p>';
        html += '  </div>';
        html += '  <button onclick="AppPengaturanTindakan.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Tambah Tindakan</button>';
        html += '</div>';

        // Tab Filter
        html += '<div class="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">';
        var tabs = [{ id: 'semua', label: 'Semua' }, { id: 'klinik', label: 'Klinik' }, { id: 'apotek', label: 'Apotek' }];
        tabs.forEach(function(t) {
            var active = (AppPengaturanTindakan.filterKategori === t.id) ? ' bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400 font-semibold' : ' text-slate-500 dark:text-slate-400 hover:text-gray-700';
            html += '<button onclick="AppPengaturanTindakan.setFilter(\'' + t.id + '\')" class="flex-1 py-2 text-sm rounded-md transition' + active + '">' + t.label + '</button>';
        });
        html += '</div>';

        html += '<div id="tindakan-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // FIX: Hapus .get(), Supabase akan langsung eksekusi promise
        window.sb.from('master_tindakan').select('*').order('nama', { ascending: true }).then(function(res) {
            // FIX: Supabase menyimpan data di res.data, bukan di root array
            AppPengaturanTindakan.data = res.data || [];
            
            // Urutkan Kategori manual pakai JavaScript (Klinik dulu, baru Apotek)
            AppPengaturanTindakan.data.sort(function(a, b) {
                if (a.kategori < b.kategori) return -1;
                if (a.kategori > b.kategori) return 1;
                return 0;
            });

            // Jika database benar-benar kosong, seed data awal
            if (AppPengaturanTindakan.data.length === 0) {
                AppPengaturanTindakan.seedDefaultData();
            } else {
                AppPengaturanTindakan.renderList();
            }
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error');
        });
    },

    seedDefaultData: function() {
        var defaults = [
            { nama: 'Cek Tensi', kategori: 'klinik', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Gula Darah', kategori: 'klinik', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Asam Urat', kategori: 'klinik', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Kolestrol', kategori: 'klinik', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Tindakan Nebu', kategori: 'klinik', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Tensi', kategori: 'apotek', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Gula Darah', kategori: 'apotek', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Asam Urat', kategori: 'apotek', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Cek Kolestrol', kategori: 'apotek', harga_jual: 15000, modal: 13000, aktif: true },
            { nama: 'Tindakan Nebu', kategori: 'apotek', harga_jual: 15000, modal: 13000, aktif: true }
        ];

        // FIX: Hapus db.batch(). Gunakan insert langsung dari Supabase
        window.sb.from('master_tindakan').insert(defaults).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Data tindakan awal berhasil dibuat!', 'success');
            
            // Ambil data yang baru saja di-insert (supaya dapat ID-nya)
            AppPengaturanTindakan.data = res.data || [];
            AppPengaturanTindakan.renderList();
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal setup data awal: ' + err.message, 'error');
        });
    },
    
    setFilter: function(kat) {
        this.filterKategori = kat;
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('tindakan-list');
        if (!container) return;

        var list = this.data;
        if (this.filterKategori !== 'semua') {
            list = list.filter(function(t) { return t.kategori === AppPengaturanTindakan.filterKategori; });
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-sm text-slate-400">Belum ada data tindakan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Kategori</th>';
        html += '<th class="px-4 py-3 text-right">Harga Jual</th>';
        html += '<th class="px-4 py-3 text-right">Modal</th>';
        html += '<th class="px-4 py-3 text-right">Tuslah</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        list.forEach(function(t) {
            var tuslah = (t.harga_jual || 0) - (t.modal || 0);
            var safeName = (t.nama || '-').replace(/'/g, "\\'");
            var katBadge = (t.kategori === 'klinik') ? '<span class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full">Klinik</span>' : '<span class="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-600 px-2 py-0.5 rounded-full">Apotek</span>';
            var statusBadge = (t.aktif !== false) ? '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : '<span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Nonaktif</span>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.nama) + '</td>';
            html += '<td class="px-4 py-3">' + katBadge + '</td>';
            html += '<td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(t.harga_jual) + '</td>';
            html += '<td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(t.modal) + '</td>';
            html += '<td class="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">' + Utils.formatRupiah(tuslah) + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppPengaturanTindakan.openForm(\'' + t.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppPengaturanTindakan.hapus(\'' + t.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var t = isEdit ? this.data.find(function(x) { return x.id === id; }) : {};
        
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Tindakan</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-tindakan" class="space-y-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Tindakan *</label><input type="text" id="ft-nama" value="' + Utils.escapeHtml(t.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Cek Gula Darah"></div>';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori *</label><select id="ft-kat" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option><option value="klinik"' + (t.kategori==='klinik'?' selected':'') + '>Klinik</option><option value="apotek"' + (t.kategori==='apotek'?' selected':'') + '>Apotek</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select id="ft-aktif" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="true"' + (t.aktif !== false?' selected':'') + '>Aktif</option><option value="false"' + (t.aktif === false?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga Jual (Rp) *</label><input type="number" id="ft-jual" value="' + (t.harga_jual || 0) + '" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="15000" oninput="AppPengaturanTindakan.previewTuslah()"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Modal / Biaya Bahan (Rp) *</label><input type="number" id="ft-modal" value="' + (t.modal || 0) + '" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="13000" oninput="AppPengaturanTindakan.previewTuslah()"><p id="ft-tuslah-info" class="text-xs text-green-600 mt-1 font-medium"></p></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="ft-id" value="' + t.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        this.previewTuslah();

        setTimeout(function() {
            var form = document.getElementById('form-tindakan');
            if(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppPengaturanTindakan.simpan();
                });
            }
        }, 100);
    },

    previewTuslah: function() {
        var jual = parseFloat(document.getElementById('ft-jual')?.value) || 0;
        var modal = parseFloat(document.getElementById('ft-modal')?.value) || 0;
        var tuslah = jual - modal;
        var el = document.getElementById('ft-tuslah-info');
        if (el) el.textContent = 'Laba Tuslah: ' + Utils.formatRupiah(tuslah);
    },

    simpan: function() {
        var idField = document.getElementById('ft-id');
        var isEdit = !!idField;
        
        var obj = {
            nama: document.getElementById('ft-nama').value.trim(),
            kategori: document.getElementById('ft-kat').value,
            harga_jual: parseFloat(document.getElementById('ft-jual').value) || 0,
            modal: parseFloat(document.getElementById('ft-modal').value) || 0,
            aktif: document.getElementById('ft-aktif').value === 'true'
        };

        if (!obj.nama || !obj.kategori) {
            Utils.toast('Nama dan Kategori wajib diisi', 'error');
            return;
        }

        var p;
        if (isEdit) {
            // FIX: Tambahkan .eq('id', id) agar tidak mengubah seluruh baris
            p = window.sb.from('master_tindakan').update(obj).eq('id', idField.value);
        } else {
            p = window.sb.from('master_tindakan').insert(obj);
        }

        p.then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Tindakan berhasil disimpan!', 'success');
            Utils.closeModal();
            AppPengaturanTindakan.init();
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    },

    hapus: function(id, nama) {
        // Ganti confirm() dengan custom modal
        Utils.openModal(
            '<div class="p-6 text-center">' +
            '<i data-lucide="alert-triangle" class="w-12 h-12 text-red-400 mx-auto mb-3"></i>' +
            '<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Hapus Tindakan</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Yakin ingin menghapus <strong>' + Utils.escapeHtml(nama) + '</strong>?</p>' +
            '<div class="flex gap-3 justify-center">' +
            '<button onclick="Utils.closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>' +
            '<button onclick="AppPengaturanTindakan._doHapus(\'' + id + '\')" class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Ya, Hapus</button>' +
            '</div></div>'
        );
    },

    _doHapus: function(id) {
        Utils.closeModal();
        window.sb.from('master_tindakan').delete().eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Berhasil dihapus', 'success');
            AppPengaturanTindakan.init();
        }).catch(function(err) {
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    }
};
