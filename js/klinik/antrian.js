/**
 * js/klinik/antrian.js — VERSI SUPABASE FIX
 * Antrian Harian Klinik
 */

window.AppKlinikAntrian = {
    data: [],
    pasienList: [],
    dokterList: [],

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = [];
        this.pasienList = [];
        this.dokterList = [];
    },

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Antrian Klinik</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Kelola antrian pasien harian</p>';
        html += '  <div id="antrian-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var today = new Date().toISOString().split('T')[0]; 
        
        // FIX: Hapus .get(), Supabase tidak punya method itu
        var pAntrian = window.sb.from('antrian').select('*').eq('tanggal', today).neq('status', 'batal').order('created_at', { ascending: true });
        var pPasien = window.sb.from('pasien').select('*').order('nama', { ascending: true });
        var pDokter = window.sb.from('karyawan').select('*').eq('departemen', 'Klinik').eq('status', 'aktif');

        Promise.all([pAntrian, pPasien, pDokter]).then(function(results) {
            // FIX: Supabase menyimpan data di res.data
            AppKlinikAntrian.data = results[0].data || [];
            AppKlinikAntrian.pasienList = results[1].data || [];
            AppKlinikAntrian.dokterList = results[2].data || [];

            AppKlinikAntrian.renderForm();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    renderForm: function() {
        var html = '';

        // FORM TAMBAH ANTRIAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4">Tambah ke Antrian</h3>';
        html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">';
        
        html += '<div>';
        html += '<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pilih Pasien *</label>';
        html += '<select id="ant-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Cari Pasien --</option>';
        this.pasienList.forEach(function(p) {
            html += '<option value="' + p.id + '">' + Utils.escapeHtml(p.nomor_rm) + ' - ' + Utils.escapeHtml(p.nama) + '</option>';
        });
        html += '</select></div>';

        html += '<div>';
        html += '<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dokter Tujuan *</label>';
        html += '<select id="ant-dokter" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Dokter --</option>';
        this.dokterList.forEach(function(d) {
            html += '<option value="' + d.id + '">' + Utils.escapeHtml(d.nama) + '</option>';
        });
        html += '</select></div>';

        html += '<div>';
        html += '<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Keluhan Awal</label>';
        html += '<input type="text" id="ant-keluhan" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Batuk, demam...">';
        html += '</div>';

        html += '<button onclick="AppKlinikAntrian.tambah()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition h-[42px]">Proses Antrian</button>';
        html += '</div></div>';

        // DAFTAR ANTRIAN
        html += '<div id="antrian-list"></div>';

        document.getElementById('antrian-content').innerHTML = html;
        this.renderList();
    },

    tambah: function() {
        var pasien_id = document.getElementById('ant-pasien').value;
        var dokter_id = document.getElementById('ant-dokter').value;
        var keluhan = document.getElementById('ant-keluhan').value.trim();

        if (!pasien_id || !dokter_id) {
            Utils.toast('Pasien dan Dokter wajib dipilih', 'error');
            return;
        }

        // Cari jumlah antrian hari ini untuk dokter tersebut
        var antrianDokter = this.data.filter(function(a) { return a.dokter_id === dokter_id; });
        var nomorUrut = antrianDokter.length + 1;

        // Cari data pasien & dokter untuk nama
        var pasien = this.pasienList.find(function(p) { return p.id === pasien_id; });
        var dokter = this.dokterList.find(function(d) { return d.id === dokter_id; });

        var obj = {
            tanggal: new Date().toISOString().split('T')[0],
            nomor_antrian: 'A-' + nomorUrut,
            pasien_id: pasien_id,
            nama_pasien: pasien ? pasien.nama : '-',
            nomor_rm: pasien ? pasien.nomor_rm : '-',
            dokter_id: dokter_id,
            // FIX: Ganti namaDokter (Firebase style) jadi dokter_nama (Supabase style)
            dokter_nama: dokter ? dokter.nama : '-',
            keluhan_utama: keluhan, // FIX: Sesuaikan nama kolom dengan DB
            status: 'menunggu'
        };

        window.sb.from('antrian').insert(obj).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pasien masuk antrian!', 'success');
            
            // Reset form
            document.getElementById('ant-pasien').value = '';
            document.getElementById('ant-dokter').value = '';
            document.getElementById('ant-keluhan').value = '';
            
            AppKlinikAntrian.init(); // Reload untuk update nomor urut
        }).catch(function(err) { 
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    },

    renderList: function() {
        var container = document.getElementById('antrian-list');
        if (!container) return;

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Belum ada antrian hari ini.</div>';
            return;
        }

        var html = '<div class="space-y-3">';
        
        // FIX: Sesuaikan status 'dilayani' menjadi 'dipanggil' (sesuai CHECK constraint DB)
        var statuses = [
            { key: 'dipanggil', label: 'Sedang Dipanggil', color: 'blue' },
            { key: 'menunggu', label: 'Menunggu', color: 'amber' },
            { key: 'selesai', label: 'Selesai', color: 'green' },
            { key: 'batal', label: 'Dibatalkan', color: 'slate' }
        ];

        var self = this;
        statuses.forEach(function(stat) {
            var filtered = self.data.filter(function(a) { return a.status === stat.key; });
            if (filtered.length === 0) return;

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
            html += '<div class="bg-' + stat.color + '-50 dark:bg-' + stat.color + '-900/20 px-4 py-2 border-b border-slate-200 dark:border-slate-700">';
            html += '<h4 class="text-sm font-semibold text-' + stat.color + '-700 dark:text-' + stat.color + '-400">' + stat.label + ' (' + filtered.length + ')</h4>';
            html += '</div>';
            html += '<div class="divide-y divide-slate-100 dark:divide-slate-700">';

            filtered.forEach(function(a) {
                var disabled = (a.status !== 'menunggu' && a.status !== 'dipanggil') ? 'pointer-events-none opacity-60' : '';
                html += '<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ' + disabled + '">';
                html += '  <div class="flex items-center gap-4">';
                html += '    <div class="text-2xl font-bold text-' + stat.color + '-600 dark:text-' + stat.color + '-400 w-16 text-center">' + Utils.escapeHtml(a.nomor_antrian) + '</div>';
                html += '    <div>';
                html += '      <p class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(a.nama_pasien) + ' <span class="text-xs font-normal text-slate-400">(' + Utils.escapeHtml(a.nomor_rm) + ')</span></p>';
                // FIX: Ganti namaDokter jadi dokter_nama, keluhan jadi keluhan_utama
                html += '      <p class="text-xs text-slate-500 dark:text-slate-400">Dokter: ' + Utils.escapeHtml(a.dokter_nama) + (a.keluhan_utama ? ' • Keluhan: ' + Utils.escapeHtml(a.keluhan_utama) : '') + '</p>';
                html += '    </div>';
                html += '  </div>';
                
                html += '  <div class="flex items-center gap-2 ml-16 sm:ml-0">';
                
                if (a.status === 'menunggu') {
                    html += '    <button onclick="AppKlinikAntrian.panggil(\'' + a.id + '\')" class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50">Panggil</button>';
                    html += '    <button onclick="AppKlinikAntrian.batal(\'' + a.id + '\')" class="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded-lg">Batal</button>';
                }
                
                if (a.status === 'dipanggil') {
                    html += '    <button onclick="window.TEMP_ANTRIAN_ID=\'' + a.id + '\'; navigateTo(\'klinik/rekam_medis\', \'Rekam Medis\')" class="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-1"><i data-lucide="stethoscope" class="w-3 h-3"></i> Buka RM</button>';
                    html += '    <button onclick="AppKlinikAntrian.selesai(\'' + a.id + '\')" class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg font-medium hover:bg-green-200 dark:hover:bg-green-900/50">Selesai</button>';
                }
                
                html += '  </div>';
                html += '</div>';
            });

            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    panggil: function(id) {
        // FIX: TAMBAHKAN .eq('id', id) !!! Tanpa ini, semua antrian akan ikut berubah statusnya
        window.sb.from('antrian').update({
            status: 'dipanggil', // FIX: 'dilayani' diubah jadi 'dipanggil' sesuai DB
            waktu_mulai: new Date().toISOString()
        }).eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pasien dipanggil!', 'success');
            AppKlinikAntrian.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    selesai: function(id) {
        // FIX: TAMBAHKAN .eq('id', id)
        window.sb.from('antrian').update({
            status: 'selesai',
            waktu_selesai: new Date().toISOString()
        }).eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Antrian selesai!', 'success');
            AppKlinikAntrian.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    batal: function(id) {
        Utils.openModal(
            '<div class="p-6 text-center">' +
            '<i data-lucide="alert-triangle" class="w-12 h-12 text-red-400 mx-auto mb-3"></i>' +
            '<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Batalkan Antrian</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Yakin ingin membatalkan antrian ini?</p>' +
            '<div class="flex gap-3 justify-center">' +
            '<button onclick="Utils.closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>' +
            '<button onclick="AppKlinikAntrian._doBatal(\'' + id + '\')" class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Ya, Batalkan</button>' +
            '</div></div>'
        );
    },

    _doBatal: function(id) {
        Utils.closeModal();
        // FIX: TAMBAHKAN .eq('id', id)
        window.sb.from('antrian').update({ status: 'batal' }).eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Antrian dibatalkan.', 'info');
            AppKlinikAntrian.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    }
};
