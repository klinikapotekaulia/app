/**
 * js/klinik/antrian.js
 * Antrian Harian Klinik
 * FIXED: Supabase v2 query syntax
 */

window.AppKlinikAntrian = {
    data: [],
    pasienList: [],
    dokterList: [],

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

        var pAntrian = window.sb.from('antrian').select('*').eq('tanggal', today).order('waktuDaftar', { ascending: true });
        var pPasien  = window.sb.from('pasien').select('id,nama,nomor_rm').order('nama', { ascending: true });
        var pDokter  = window.sb.from('karyawan').select('id,nama').eq('departemen', 'Klinik').eq('status', 'aktif');

        Promise.all([pAntrian, pPasien, pDokter]).then(function(results) {
            if (results[0].error) throw results[0].error;
            if (results[1].error) throw results[1].error;
            if (results[2].error) throw results[2].error;

            AppKlinikAntrian.data       = results[0].data || [];
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

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white mb-4">Tambah ke Antrian</h3>';
        html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">';

        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Pilih Pasien *</label>';
        html += '<select id="ant-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Cari Pasien --</option>';
        this.pasienList.forEach(function(p) {
            html += '<option value="' + p.id + '">' + Utils.escapeHtml(p.nomor_rm) + ' - ' + Utils.escapeHtml(p.nama) + '</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Dokter Tujuan *</label>';
        html += '<select id="ant-dokter" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Dokter --</option>';
        this.dokterList.forEach(function(d) {
            html += '<option value="' + d.id + '">' + Utils.escapeHtml(d.nama) + '</option>';
        });
        html += '</select></div>';

        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Keluhan Awal</label>';
        html += '<input type="text" id="ant-keluhan" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Batuk, demam...">';
        html += '</div>';

        html += '<button onclick="AppKlinikAntrian.tambah()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition h-[42px]">Proses Antrian</button>';
        html += '</div></div>';

        html += '<div id="antrian-list"></div>';

        document.getElementById('antrian-content').innerHTML = html;
        this.renderList();
    },

    tambah: function() {
        var pasien_id = document.getElementById('ant-pasien').value;
        var dokter_id = document.getElementById('ant-dokter').value;
        var keluhan   = document.getElementById('ant-keluhan').value.trim();

        if (!pasien_id || !dokter_id) { Utils.toast('Pasien dan Dokter wajib dipilih', 'error'); return; }

        var antrianDokter = this.data.filter(function(a) { return a.dokter_id === dokter_id; });
        var nomorUrut = antrianDokter.length + 1;

        var pasien = this.pasienList.find(function(p) { return p.id === pasien_id; });
        var dokter = this.dokterList.find(function(d) { return d.id === dokter_id; });

        var obj = {
            tanggal: new Date().toISOString().split('T')[0],
            nomor_antrian: 'A-' + nomorUrut,
            pasien_id: pasien_id,
            nama_pasien: pasien ? pasien.nama : '-',
            nomor_rm: pasien ? pasien.nomor_rm : '-',
            dokter_id: dokter_id,
            namaDokter: dokter ? dokter.nama : '-',
            keluhan: keluhan,
            status: 'menunggu',
            waktuDaftar: new Date().toISOString(),
            waktuMulai: null,
            waktuSelesai: null
        };

        window.sb.from('antrian').insert(obj).then(function(result) {
            if (result.error) throw result.error;
            Utils.toast('Pasien masuk antrian!', 'success');
            var elPas = document.getElementById('ant-pasien');
            var elDok = document.getElementById('ant-dokter');
            var elKel = document.getElementById('ant-keluhan');
            if (elPas) elPas.value = '';
            if (elDok) elDok.value = '';
            if (elKel) elKel.value = '';
            AppKlinikAntrian.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    renderList: function() {
        var container = document.getElementById('antrian-list');
        if (!container) return;

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Belum ada antrian hari ini.</div>';
            return;
        }

        var html = '<div class="space-y-3">';
        var statuses = [
            { key: 'dilayani', label: 'Sedang Dilayani', color: 'blue' },
            { key: 'menunggu', label: 'Menunggu', color: 'amber' },
            { key: 'selesai',  label: 'Selesai',  color: 'green' },
            { key: 'batal',    label: 'Dibatalkan', color: 'slate' }
        ];

        statuses.forEach(function(stat) {
            var filtered = AppKlinikAntrian.data.filter(function(a) { return a.status === stat.key; });
            if (filtered.length === 0) return;

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
            html += '<div class="bg-' + stat.color + '-50 dark:bg-' + stat.color + '-900/20 px-4 py-2 border-b border-slate-200 dark:border-slate-700">';
            html += '<h4 class="text-sm font-semibold text-' + stat.color + '-700 dark:text-' + stat.color + '-400">' + stat.label + ' (' + filtered.length + ')</h4>';
            html += '</div><div class="divide-y divide-slate-100 dark:divide-slate-700">';

            filtered.forEach(function(a) {
                var disabled = (a.status !== 'menunggu' && a.status !== 'dilayani') ? 'pointer-events-none opacity-60' : '';
                html += '<div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ' + disabled + '">';
                html += '  <div class="flex items-center gap-4">';
                html += '    <div class="text-2xl font-bold text-' + stat.color + '-600 dark:text-' + stat.color + '-400 w-16 text-center">' + a.nomor_antrian + '</div>';
                html += '    <div>';
                html += '      <p class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(a.nama_pasien) + ' <span class="text-xs font-normal text-slate-400">(' + Utils.escapeHtml(a.nomor_rm) + ')</span></p>';
                html += '      <p class="text-xs text-slate-500">Dokter: ' + Utils.escapeHtml(a.namaDokter) + (a.keluhan ? ' • Keluhan: ' + Utils.escapeHtml(a.keluhan) : '') + '</p>';
                html += '    </div></div>';
                html += '  <div class="flex items-center gap-2 ml-16 sm:ml-0">';
                if (a.status === 'menunggu') {
                    html += '<button onclick="AppKlinikAntrian.panggil(\'' + a.id + '\')" class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200">Panggil</button>';
                    html += '<button onclick="AppKlinikAntrian.batal(\'' + a.id + '\')" class="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 rounded-lg">Batal</button>';
                }
                if (a.status === 'dilayani') {
                    html += '<button onclick="window.TEMP_ANTRIAN_ID=\'' + a.id + '\'; navigateTo(\'klinik/rekamMedis\', \'Rekam Medis\')" class="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-1"><i data-lucide="stethoscope" class="w-3 h-3"></i> Buka RM</button>';
                    html += '<button onclick="AppKlinikAntrian.selesai(\'' + a.id + '\')" class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-200">Selesai</button>';
                }
                html += '  </div></div>';
            });
            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    panggil: function(id) {
        window.sb.from('antrian').update({ status: 'dilayani', waktuMulai: new Date().toISOString() }).eq('id', id)
            .then(function(r) {
                if (r.error) throw r.error;
                Utils.toast('Pasien dipanggil!', 'success');
                AppKlinikAntrian.init();
            }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    selesai: function(id) {
        window.sb.from('antrian').update({ status: 'selesai', waktuSelesai: new Date().toISOString() }).eq('id', id)
            .then(function(r) {
                if (r.error) throw r.error;
                Utils.toast('Antrian selesai!', 'success');
                AppKlinikAntrian.init();
            }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    batal: function(id) {
        if (!confirm('Batalkan antrian ini?')) return;
        window.sb.from('antrian').update({ status: 'batal' }).eq('id', id)
            .then(function(r) {
                if (r.error) throw r.error;
                AppKlinikAntrian.init();
            }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    }
};
