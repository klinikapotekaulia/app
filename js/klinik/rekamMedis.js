/**
 * js/klinik/rekam-medis.js — VERSI SUPABASE FIX
 * Rekam Medis Pasien (Bisa diakses langsung atau dari Antrian)
 */

window.AppKlinikRekamMedis = {
    data: [],
    tindakanList: [],

    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {
        this.data = [];
        this.tindakanList = [];
    },

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Rekam Medis</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Input pemeriksaan dan tindakan dokter</p>';
        html += '  <div id="rm-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // FIX: Hapus .get()
        var pTindakan = window.sb.from('master_tindakan').select('*').eq('aktif', true).eq('kategori', 'klinik');
        
        pTindakan.then(function(snap) {
            // FIX: Supabase menyimpan data di snap.data
            AppKlinikRekamMedis.tindakanList = snap.data || [];

            // Cek apakah dibuka dari Antrian atau dari menu langsung
            if (window.TEMP_ANTRIAN_ID) {
                var antId = window.TEMP_ANTRIAN_ID;
                delete window.TEMP_ANTRIAN_ID; // Hapus langsung supaya tidak nyangkut saat reload
                
                // FIX: Hapus .single() yang tidak dikembalikan dengan benar tanpa .select()
                window.sb.from('antrian').select('*').eq('id', antId).single().then(function(res) {
                    // FIX: Cek keberadaan data menggunakan res.data
                    if (res.data) {
                        var a = res.data;
                        // FIX: Tambahkan .eq('id', antId) agar hanya antrian ini yang berubah
                        if (a.status === 'menunggu') {
                            window.sb.from('antrian').update({ status: 'dipanggil', waktu_mulai: new Date().toISOString() }).eq('id', antId).then(function(){});
                        }
                        AppKlinikRekamMedis.renderForm({
                            antrian_id: antId,
                            pasien_id: a.pasien_id,
                            nomor_rm: a.nomor_rm,
                            nama_pasien: a.nama_pasien,
                            dokter_id: a.dokter_id,
                            dokter_nama: a.dokter_nama, // FIX: sesuaikan dengan DB
                            keluhan: a.keluhan_utama || '' // FIX: sesuaikan dengan DB
                        });
                    } else {
                        AppKlinikRekamMedis.renderForm(null);
                    }
                });
            } else {
                AppKlinikRekamMedis.renderForm(null);
            }
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat master tindakan: ' + err.message, 'error'); 
        });
    },

    renderForm: function(prefill) {
        var p = prefill || {};
        var today = new Date().toISOString().split('T')[0];

        var html = '<form id="form-rm" class="space-y-4">';
        
        // INFO PASIEN & DOKTER
        html += '<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">No. RM</label><input type="text" id="rm-norm" value="' + Utils.escapeHtml(p.nomor_rm || '') + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">Nama Pasien</label><input type="text" id="rm-pasien" value="' + Utils.escapeHtml(p.nama_pasien || '') + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">Dokter</label><input type="text" id="rm-dokter" value="' + Utils.escapeHtml(p.dokter_nama || '') + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">Tanggal</label><input type="date" id="rm-tgl" value="' + today + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';
        
        if (p.antrian_id) html += '<input type="hidden" id="rm-antId" value="' + p.antrian_id + '">';
        if (p.pasien_id) html += '<input type="hidden" id="rm-pasien_id" value="' + p.pasien_id + '">';
        if (p.dokter_id) html += '<input type="hidden" id="rm-dokter_id" value="' + p.dokter_id + '">';

        // CATATAN MEDIS
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Catatan Medis</h3>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keluhan Utama</label><textarea id="rm-keluhan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(p.keluhan || '') + '</textarea></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Anamnesis</label><textarea id="rm-anamnesis" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Riwayat penyakit sekarang, riwayat penyakit dahulu, alergi..."></textarea></div>';
        // FIX: Ganti ID rm-fisik (pemeriksaanFisik) jadi sesuai DB (pemeriksaan)
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pemeriksaan Fisik</label><textarea id="rm-pemeriksaan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="TD, Nadi, RR, Suhu, GCS, Status Generalis..."></textarea></div>';
        // FIX: Ganti ID rm-diagnosa (diagnosa) jadi sesuai DB (diagnosis)
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Diagnosis</label><input type="text" id="rm-diagnosis" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Suspek ISPA, Myalgia, dll"></div>';
        html += '</div>';

        // TINDAKAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '<div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800 dark:text-white">Tindakan Klinik</h3><button type="button" onclick="AppKlinikRekamMedis.addTindakan()" class="text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50">+ Tambah Tindakan</button></div>';
        html += '<div id="rm-tindakan-list" class="space-y-2">';
        html += '<p class="text-sm text-slate-400 italic p-2">Belum ada tindakan.</p>';
        html += '</div></div>';

        // CATATAN TAMBAHAN & TOMBOL SIMPAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan / Resep (Opsional)</label>';
        html += '<textarea id="rm-catatan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Informasi tambahan untuk apotek atau tindak lanjut..."></textarea>';
        html += '</div>';

        html += '<div class="flex justify-end">';
        html += '<button type="submit" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Rekam Medis</button>';
        html += '</div>';

        html += '</form>';
        document.getElementById('rm-content').innerHTML = html;
        if(window.lucide) lucide.createIcons();

        setTimeout(function() {
            var form = document.getElementById('form-rm');
            if(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppKlinikRekamMedis.simpan();
                });
            }
        }, 100);
    },

    addTindakan: function() {
        var container = document.getElementById('rm-tindakan-list');
        if (container.querySelector('p.italic')) container.innerHTML = '';

        var idx = container.children.length;
        var html = '<div id="rm-tindakan-' + idx + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<select id="rm-tind-id-' + idx + '" class="w-full sm:w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" onchange="AppKlinikRekamMedis.updateTindakanInfo(' + idx + ')">';
        html += '<option value="">-- Pilih Tindakan --</option>';
        this.tindakanList.forEach(function(t) {
            html += '<option value="' + t.id + '">' + Utils.escapeHtml(t.nama) + ' (' + Utils.formatRupiah(t.harga_jual) + ')</option>';
        });
        html += '</select>';
        html += '<div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 w-full sm:w-1/3" id="rm-tind-info-' + idx + '">Pilih tindakan</div>';
        html += '<button type="button" onclick="document.getElementById(\'rm-tindakan-' + idx + '\').remove()" class="p-2 text-red-400 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>';
        html += '</div>';

        container.insertAdjacentHTML('beforeend', html);
        if(window.lucide) lucide.createIcons({ nodes: [container] });
    },

    updateTindakanInfo: function(idx) {
        var selectId = document.getElementById('rm-tind-id-' + idx).value;
        var infoEl = document.getElementById('rm-tind-info-' + idx);
        if (!infoEl) return;

        if (selectId) {
            var t = this.tindakanList.find(function(x) { return x.id === selectId; });
            if (t) {
                var tuslah = (t.harga_jual || 0) - (t.modal || 0);
                infoEl.innerHTML = '<span class="text-green-600 dark:text-green-400 font-medium">Tuslah: ' + Utils.formatRupiah(tuslah) + '</span>';
                return;
            }
        }
        infoEl.innerHTML = 'Pilih tindakan';
    },

    simpan: function() {
        var self = this;
        // Kumpulkan Tindakan
        var tindakan_items = [];
        var tindakanRows = document.querySelectorAll('[id^="rm-tindakan-"]');
        tindakanRows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var tindId = document.getElementById('rm-tind-id-' + idx);
            if (tindId && tindId.value) {
                var tData = self.tindakanList.find(function(t) { return t.id === tindId.value; });
                if (tData) {
                    tindakan_items.push({
                        tindakanId: tData.id,
                        namaTindakan: tData.nama,
                        harga_jual: tData.harga_jual,
                        modal: tData.modal
                    });
                }
            }
        });

        var obj = {
            tanggal: document.getElementById('rm-tgl').value,
            nomor_rm: document.getElementById('rm-norm').value.trim(),
            nama_pasien: document.getElementById('rm-pasien').value.trim(),
            dokter_id: document.getElementById('rm-dokter_id') ? document.getElementById('rm-dokter_id').value : '',
            dokter_nama: document.getElementById('rm-dokter').value.trim(), // FIX: namaDokter -> dokter_nama
            antrian_id: document.getElementById('rm-antId') ? document.getElementById('rm-antId').value : null,
            pasien_id: document.getElementById('rm-pasien_id') ? document.getElementById('rm-pasien_id').value : '',
            keluhan: document.getElementById('rm-keluhan').value.trim(),
            anamnesis: document.getElementById('rm-anamnesis').value.trim(),
            pemeriksaan: document.getElementById('rm-pemeriksaan').value.trim(), // FIX: pemeriksaanFisik -> pemeriksaan
            diagnosis: document.getElementById('rm-diagnosis').value.trim(), // FIX: diagnosa -> diagnosis
            tindakan_items: tindakan_items,
            catatan: document.getElementById('rm-catatan').value.trim(),
            status_resep: 'menunggu'
            // FIX: Hapus 'status': 'selesai' karena kolom tersebut TIDAK ADA di database
        };

        window.sb.from('rekam_medis').insert(obj).then(function(res) {
            if (res.error) throw res.error;
            
            // Tandai antrian sebagai selesai
            if (obj.antrian_id) {
                // FIX: TAMBAHKAN .eq('id', obj.antrian_id) !!!
                return window.sb.from('antrian').update({
                    status: 'selesai',
                    waktu_selesai: new Date().toISOString()
                }).eq('id', obj.antrian_id);
            }
            return Promise.resolve();
        }).then(function() {
            Utils.toast('Rekam medis berhasil disimpan!', 'success');
            if (obj.antrian_id) {
                navigateTo('klinik/antrian', 'Antrian');
            } else {
                document.getElementById('rm-content').innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-green-600"><i data-lucide="check-circle" class="w-12 h-12 mx-auto mb-3"></i><p class="font-semibold">Data Berhasil Disimpan</p></div>';
                if(window.lucide) lucide.createIcons();
            }
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal menyimpan: ' + err.message, 'error'); 
        });
    }
};
