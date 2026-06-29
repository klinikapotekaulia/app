/**
 * js/pengaturan/gaji.js — VERSI SUPABASE FIX
 * Pengaturan Gaji Pokok per Karyawan (Apotek & Klinik)
 */

window.AppPengaturanGaji = {

    data: { apotek: [], klinik: [] },
    karyawanList: [],

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = { apotek: [], klinik: [] };
        this.karyawanList = [];
    },

    render: function() {
        var html = '<div class="page-enter max-w-3xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Pengaturan Gaji Pokok</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Hubungkan karyawan dengan nominal gaji pokok bulanan</p>';
        html += '  <div id="gaji-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // FIX: Hapus .get(), gunakan .select('*')
        var pKaryawan = window.sb.from('karyawan').select('*').eq('status', 'aktif');
        var pConfig = window.sb.from('pengaturan_gaji').select('*').eq('id', 'global').single();

        Promise.all([pKaryawan, pConfig]).then(function(results) {
            // FIX: Supabase menyimpan data di .data
            AppPengaturanGaji.karyawanList = results[0].data || [];

            // FIX: Cek keberadaan data menggunakan .data (bukan .exists atau .data())
            if (results[1].data) {
                var rawData = results[1].data;
                AppPengaturanGaji.data = {
                    apotek: Array.isArray(rawData.apotek) ? rawData.apotek : [],
                    klinik: Array.isArray(rawData.klinik) ? rawData.klinik : []
                };
            } else {
                // Jika belum ada data, gunakan default
                AppPengaturanGaji.data = { apotek: [], klinik: [] };
            }
            AppPengaturanGaji.renderForm();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    renderForm: function() {
        var d = this.data;
        var html = '';

        // 1. GAJI APOTEK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-2 text-lg"><i data-lucide="cross" class="w-5 h-5"></i> 1. Gaji Karyawan Apotek</h3><button onclick="AppPengaturanGaji.addRow(\'apotek\')" class="text-sm bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 font-medium">+ Tambah Karyawan</button></div>';
        html += '<div id="gaji-list-apotek" class="space-y-2">';
        if(d.apotek.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada data.</p>';
        else d.apotek.forEach(function(item, i) { html += AppPengaturanGaji.renderRow('apotek', i, item); });
        html += '</div></div>';

        // 2. GAJI KLINIK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2 text-lg"><i data-lucide="stethoscope" class="w-5 h-5"></i> 2. Gaji Karyawan Klinik</h3><button onclick="AppPengaturanGaji.addRow(\'klinik\')" class="text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 font-medium">+ Tambah Karyawan</button></div>';
        html += '<div id="gaji-list-klinik" class="space-y-2">';
        if(d.klinik.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada data.</p>';
        else d.klinik.forEach(function(item, i) { html += AppPengaturanGaji.renderRow('klinik', i, item); });
        html += '</div></div>';

        // TOMBOL SIMPAN
        html += '<div class="flex justify-end sticky bottom-6 z-10"><button onclick="AppPengaturanGaji.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pengaturan Gaji</button></div>';

        document.getElementById('gaji-content').innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    renderRow: function(tipe, index, item) {
        var html = '<div id="row-gaji-' + tipe + '-' + index + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">';
        
        // Dropdown Karyawan (Di-filter berdasarkan tipe)
        html += '<div class="w-full sm:w-1/2">';
        html += '<select id="gaji-id-' + tipe + '-' + index + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Karyawan --</option>';
        
        var self = this;
        this.karyawanList.forEach(function(k) {
            // Hanya tampilkan karyawan sesuai departemen
            if (k.departemen === tipe.charAt(0).toUpperCase() + tipe.slice(1)) {
                var sel = (k.id === item.karyawan_id) ? ' selected' : '';
                html += '<option value="' + k.id + '"' + sel + '>' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.jabatan || '-') + ')</option>';
            }
        });
        html += '</select></div>';

        // FIX UI: Tambahkan class "relative" pada parent agar label "Rp" benar posisinya
        html += '<div class="relative flex items-center w-full sm:w-1/3">';
        html += '<input type="number" id="gaji-nominal-' + tipe + '-' + index + '" value="' + (item.gaji_pokok || 0) + '" placeholder="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right pr-10 focus:ring-2 focus:ring-primary-500 outline-none">';
        html += '<span class="absolute right-3 text-xs text-slate-400 pointer-events-none">Rp</span>';
        html += '</div>';

        // Tombol Hapus
        html += '<button onclick="AppPengaturanGaji.removeRow(\'' + tipe + '\',' + index + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        
        html += '</div>';
        return html;
    },

    addRow: function(tipe) {
        this.data[tipe].push({ karyawan_id: '', gaji_pokok: 0 });
        this.renderForm();
    },

    removeRow: function(tipe, index) {
        this.data[tipe].splice(index, 1);
        this.renderForm();
    },

    simpan: function() {
        var dataToSave = { apotek: [], klinik: [] };
        var self = this;

        // Kumpulkan Apotek
        var apotekRows = document.querySelectorAll('[id^="row-gaji-apotek-"]');
        apotekRows.forEach(function(row, i) {
            var karyId = document.getElementById('gaji-id-apotek-' + i);
            if (karyId && karyId.value) {
                dataToSave.apotek.push({
                    karyawan_id: karyId.value,
                    gaji_pokok: parseFloat(document.getElementById('gaji-nominal-apotek-' + i).value) || 0
                });
            }
        });

        // Kumpulkan Klinik
        var klinikRows = document.querySelectorAll('[id^="row-gaji-klinik-"]');
        klinikRows.forEach(function(row, i) {
            var karyId = document.getElementById('gaji-id-klinik-' + i);
            if (karyId && karyId.value) {
                dataToSave.klinik.push({
                    karyawan_id: karyId.value,
                    gaji_pokok: parseFloat(document.getElementById('gaji-nominal-klinik-' + i).value) || 0
                });
            }
        });

        Utils.toast('Menyimpan...', 'info');
        
        // FIX: Gunakan .update().eq('id', 'global') daripada .upsert() 
        window.sb.from('pengaturan_gaji').update(dataToSave).eq('id', 'global')
            .then(function(res) {
                if (res.error) throw res.error;
                Utils.toast('Pengaturan Gaji berhasil disimpan!', 'success');
            })
            .catch(function(err) { 
                console.error(err);
                Utils.toast('Gagal: ' + err.message, 'error'); 
            });
    }
};
