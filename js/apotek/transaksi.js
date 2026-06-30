/**
 * js/apotek/transaksi.js
 * Transaksi Penjualan: Obat Bebas | Resep Klinik | Resep Luar
 * VERSI SUPABASE (FINAL INTEGRATED)
 */

window.AppApotekTransaksi = {

    tipe: 'obat_bebas',
    masterObat: [],
    master_tindakan: [], 
    pengaturan: null,
    resepList: [],
    antrianList: [],

    destroy: function() {
        this.tipe = 'obat_bebas';
        this.masterObat = [];
        this.master_tindakan = [];
        this.pengaturan = null;
        this.resepList = [];
        this.antrianList = [];
    },

    render: function() {
        return '<div class="page-enter max-w-5xl">' +
            '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Transaksi Penjualan</h2>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Input penjualan obat bebas dan resep dokter</p>' +
            '<div id="trx-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>' +
            '</div>';
    },

    init: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];

        Promise.all([
            window.sb.from('obat').select('*'),
            window.sb.from('pengaturan_pembagian').select('skema').eq('id', 'global').single(),
            window.sb.from('rekam_medis').select('*'),
            window.sb.from('antrian').select('*').eq('tanggal', today),
            window.sb.from('master_tindakan').select('*').eq('aktif', true)
        ]).then(function(results) {
            self.masterObat = results[0].data || [];
            self.masterObat.sort(function(a, b) { return (a.nama_obat || '').localeCompare(b.nama_obat || ''); });

            self.master_tindakan = results[4].data || [];

            // FIX PERTAMA: Ambil dari dalam .skema (karena di Supabase disimpan di kolom JSONB bernama 'skema')
            if (results[1].data && results[1].data.skema) {
                self.pengaturan = results[1].data.skema;
            } else {
                self.pengaturan = { marginResep: 0, racikObat: { nilai: 0 }, resep_klinik: [], resep_luar: { nilai_resep: 0 } };
            }

            self.antrianList = results[3].data || [];

            self.resepList = [];
            (results[2].data || []).forEach(function(d) {
                if (!d.status_resep || d.status_resep === 'menunggu') self.resepList.push(d);
            });

            self.renderForm();
        }).catch(function(err) {
            var el = document.getElementById('trx-content');
            if (el) el.innerHTML = '<div class="text-center py-16"><p class="text-red-500 font-semibold">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p></div>';
        });
    },

    renderForm: function() {
        var html = '';
        html += '<div class="grid grid-cols-3 gap-2 mb-4">';
        html += this._btnTipe('obat_bebas', 'pill', 'Obat Bebas', true);
        html += this._btnTipe('resep_klinik', 'file-text', 'Resep Klinik', false);
        html += this._btnTipe('resep_luar', 'file-plus', 'Resep Luar', false);
        html += '</div>';
        html += '<div id="trx-header-dynamic" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4"></div>';
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <div class="flex justify-between items-center mb-3">';
        html += '    <h3 class="font-semibold text-gray-800 dark:text-white">Daftar Item Obat</h3>';
        html += '    <button type="button" onclick="AppApotekTransaksi.addItem()" class="text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button>';
        html += '  </div>';
        html += '  <div id="trx-cart-container" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p></div>';
        html += '</div>';
        html += '<div id="trx-tindakan-container" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4"></div>';
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">';
        html += '    <div class="space-y-1 text-sm w-full lg:w-auto">';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Total Obat:</span><span id="trx-total-obat" class="font-medium text-gray-800 dark:text-white">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Total Racik:</span><span id="trx-total-racik" class="font-medium text-teal-600">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Tindakan & Jasa:</span><span id="trx-total-tindakan" class="font-medium text-purple-600">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Jasa Resep:</span><span id="trx-jasa-resep" class="font-medium text-gray-800 dark:text-white">-</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Pembulatan:</span><span id="trx-pembulatan" class="font-medium text-amber-600">-</span></div>';
        html += '      <div class="flex justify-between gap-8 text-lg pt-2 border-t border-slate-100 dark:border-slate-700"><span class="font-semibold text-gray-700 dark:text-gray-200">TOTAL BAYAR:</span><span id="trx-grand-total" class="font-bold text-primary-600">Rp 0</span></div>';
        html += '    </div>';
        html += '    <div class="flex flex-col gap-3 w-full lg:w-auto">';
        html += '      <div>';
        html += '        <label class="block text-xs font-medium text-slate-500 mb-1">Metode Pembayaran</label>';
        html += '        <select id="trx-metode-bayar" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '          <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="qris">QRIS</option>';
        html += '        </select>';
        html += '      </div>';
        html += '      <button onclick="AppApotekTransaksi.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 justify-center">';
        html += '        <i data-lucide="check-circle" class="w-5 h-5"></i> Proses & Simpan';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';

        document.getElementById('trx-content').innerHTML = html;
        if (window.lucide) lucide.createIcons();
        this.tipe = 'obat_bebas';
        this._renderHeader('obat_bebas');
        this.renderTindakanArea(); 
    },

    _btnTipe: function(tipe, icon, label, isActive) {
        var activeClass = isActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-600';
        var textClass = isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300';
        return '<button onclick="AppApotekTransaksi.setTipe(\'' + tipe + '\')" id="btn-' + tipe + '" class="border-2 ' + activeClass + ' p-3 rounded-xl text-center transition hover:border-primary-500">' +
            '<i data-lucide="' + icon + '" class="w-5 h-5 mx-auto mb-1 ' + textClass + '"></i>' +
            '<p class="text-sm font-semibold ' + textClass + '">' + label + '</p></button>';
    },

    setTipe: function(tipe) {
        this.tipe = tipe;
        var tipes = ['obat_bebas', 'resep_klinik', 'resep_luar'];
        tipes.forEach(function(t) {
            var btn = document.getElementById('btn-' + t);
            if (!btn) return;
            if (t === tipe) {
                btn.className = btn.className.replace(/border-slate-200 dark:border-slate-600/g, '').replace(/text-slate-600 dark:text-slate-300/g, '');
                if (btn.className.indexOf('border-primary-500') === -1) btn.className += ' border-primary-500 bg-primary-50 dark:bg-primary-900/20';
                btn.querySelectorAll('i, p').forEach(function(el) { el.className = el.className.replace(/text-slate-600 dark:text-slate-300/g, 'text-primary-600 dark:text-primary-400'); });
            } else {
                btn.className = btn.className.replace(/border-primary-500/g, '').replace(/bg-primary-50/g, '').replace(/dark:bg-primary-900\/20/g, '');
                if (btn.className.indexOf('border-slate-200') === -1) btn.className += ' border-slate-200 dark:border-slate-600';
                btn.querySelectorAll('i, p').forEach(function(el) { el.className = el.className.replace(/text-primary-600 dark:text-primary-400/g, 'text-slate-600 dark:text-slate-300'); });
            }
        });
        this._renderHeader(tipe);
        document.getElementById('trx-cart-container').innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        this.renderTindakanArea();
        this.hitungTotal();
    },

    _renderHeader: function(tipe) {
        var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        if (tipe === 'resep_klinik') {
            html += '<div><label class="block text-xs font-medium text-blue-600 mb-1">Pilih Resep Klinik</label>';
            html += '<select id="trx-resep-id" onchange="AppApotekTransaksi.onSelectResep()" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
            html += '<option value="">-- Pilih Resep Menunggu (' + this.resepList.length + ') --</option>';
            this.resepList.forEach(function(r) {
                html += '<option value="' + r.id + '">' + Utils.escapeHtml(r.nama_pasien || '-') + ' (' + Utils.escapeHtml(r.nomor_rm || '-') + ') — ' + Utils.escapeHtml(r.namaDokter || '-') + '</option>';
            });
            html += '</select></div>';
        } else if (tipe === 'resep_luar') {
            // FIX KEDUA: Resep luar pakai input teks biasa (karena dokter luar biasanya bukan karyawan)
            html += '<div><label class="block text-xs font-medium text-green-600 mb-1">Dokter Pemberi Resep *</label>';
            html += '<input type="text" id="trx-dokter-luar-id" placeholder="Ketik nama dokter luar..." class="w-full px-3 py-2 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
            html += '</div>';
        }
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Nama Pasien (Opsional)</label>';
        html += '<input type="text" id="trx-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Nama Pasien"></div>';
        html += '</div>';
        document.getElementById('trx-header-dynamic').innerHTML = html;
    },

    renderTindakanArea: function() {
        var container = document.getElementById('trx-tindakan-container');
        if (!container) return;
        var html = '<div class="flex justify-between items-center mb-3">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white">Tindakan & Jasa Medis</h3>';
        if (this.tipe !== 'resep_klinik') {
            html += '<button type="button" onclick="AppApotekTransaksi.addTindakanApotek()" class="text-sm bg-teal-50 dark:bg-teal-900/30 text-teal-600 px-3 py-1.5 rounded-lg font-medium hover:bg-teal-100">+ Tindakan Apotek</button>';
        } else {
            html += '<span class="text-xs text-blue-600">Otomatis dari Rekam Medis</span>';
        }
        html += '</div>';
        html += '<div id="trx-tindakan-list" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Tidak ada tindakan.</p></div>';
        container.innerHTML = html;
    },

    addTindakanApotek: function() {
        var container = document.getElementById('trx-tindakan-list');
        if (container.querySelector('p.italic')) container.innerHTML = '';
        var idx = container.children.length;
        var html = '<div id="trx-tindakan-row-' + idx + '" class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<select id="trx-tindakan-select-' + idx + '" onchange="AppApotekTransaksi.onSelectTindakan(' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Tindakan Apotek --</option>';
        this.master_tindakan.forEach(function(t) {
            if (t.kategori === 'apotek') {
                html += '<option value="' + t.id + '" data-harga="' + (t.harga_jual || 0) + '">' + Utils.escapeHtml(t.nama) + ' (' + Utils.formatRupiah(t.harga_jual) + ')</option>';
            }
        });
        html += '</select>';
        html += '<div class="flex items-center gap-2 w-1/3"><input type="number" id="trx-tindakan-harga-' + idx + '" value="0" readonly class="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right font-bold text-teal-600"></div>';
        html += '<button type="button" onclick="AppApotekTransaksi.removeTindakan(' + idx + ')" class="p-2 text-red-400 hover:text-red-600"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div>';
        container.insertAdjacentHTML('beforeend', html);
        if (window.lucide) lucide.createIcons();
    },

    onSelectTindakan: function(idx) {
        var select = document.getElementById('trx-tindakan-select-' + idx);
        var selectedOption = select.options[select.selectedIndex];
        var harga = selectedOption.getAttribute('data-harga') || 0;
        document.getElementById('trx-tindakan-harga-' + idx).value = harga;
        this.hitungTotal();
    },

    removeTindakan: function(idx) {
        var row = document.getElementById('trx-tindakan-row-' + idx);
        if (row) row.remove();
        var list = document.getElementById('trx-tindakan-list');
        if (!list.querySelector('[id^="trx-tindakan-row-"]')) {
            list.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tidak ada tindakan.</p>';
        }
        this.hitungTotal();
    },

    onSelectResep: function() {
        var id = document.getElementById('trx-resep-id').value;
        var listContainer = document.getElementById('trx-tindakan-list');
        if (listContainer) listContainer.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tidak ada tindakan.</p>';
        if (!id) { this.hitungTotal(); return; }
        var resep = this.resepList.find(function(r) { return r.id === id; });
        if (resep) {
            document.getElementById('trx-pasien').value = resep.nama_pasien || '';
            if (resep.tindakan_items && resep.tindakan_items.length > 0) {
                var html = '';
                resep.tindakan_items.forEach(function(t, i) {
                    html += '<div class="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">';
                    html += '<div class="flex items-center gap-2"><i data-lucide="stethoscope" class="w-4 h-4 text-blue-500"></i><span class="text-sm text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaTindakan) + '</span></div>';
                    html += '<span class="text-sm font-bold text-blue-600">' + Utils.formatRupiah(t.harga_jual) + '</span>';
                    html += '<input type="hidden" id="trx-tindakan-klinik-' + i + '" value="' + t.harga_jual + '">';
                    html += '</div>';
                });
                if (listContainer) listContainer.innerHTML = html;
                if (window.lucide) lucide.createIcons();
            }
        }
        this.hitungTotal();
    },

    addItem: function() {
        var self = this;
        var container = document.getElementById('trx-cart-container');
        if (container.querySelector('p.italic')) container.innerHTML = '';
        var idx = container.children.length;
        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');
        
        // FIX KETIGA: Sekarang nilai_racik akan benar-benar muncul karena this.pengaturan sudah benar
        var nilai_racik = (self.pengaturan && self.pengaturan.racikObat) ? self.pengaturan.racikObat.nilai : 0;

        var html = '<div id="trx-row-' + idx + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="grid grid-cols-2 md:grid-cols-6 gap-3 items-start">';
        html += '<div class="col-span-2"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="trx-obat-' + idx + '" onchange="AppApotekTransaksi.onSelectObat(' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Obat --</option>';
        this.masterObat.forEach(function(o) {
            var stokLabel = (o.stok || 0) > 0 ? o.stok + ' ' + (o.satuan || 'pcs') : 'HABIS';
            html += '<option value="' + o.id + '">' + Utils.escapeHtml(o.nama_obat || '-') + ' [' + stokLabel + ']</option>';
        });
        html += '</select></div>';
        html += '<div><label class="block text-xs text-slate-500 mb-1">Qty</label>';
        html += '<input type="number" id="trx-qty-' + idx + '" value="1" min="1" oninput="AppApotekTransaksi.hitungTotal()" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center"></div>';
        html += '<div><label class="block text-xs text-slate-500 mb-1">Harga Jual</label>';
        html += '<input type="number" id="trx-harga-' + idx + '" value="0" min="0" oninput="AppApotekTransaksi.hitungTotal()" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right">';
        html += '<p id="trx-hint-' + idx + '" class="text-[10px] text-slate-400 mt-1"></p></div>';
        html += '<div><label class="block text-xs text-slate-500 mb-1">Subtotal</label>';
        html += '<div id="trx-sub-' + idx + '" class="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium">Rp 0</div></div>';
        html += '<div class="col-span-2 flex items-end justify-between gap-2">';
        if (isResep) {
            html += '<label class="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 cursor-pointer bg-teal-50 dark:bg-teal-900/20 px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-700">';
            html += '<input type="checkbox" id="trx-racik-' + idx + '" onchange="AppApotekTransaksi.hitungTotal()" class="w-4 h-4 rounded border-teal-300 text-teal-600"> Racik (+' + Utils.formatRupiah(nilai_racik) + ')';
            html += '</label>';
        } else {
            html += '<div></div>';
        }
        html += '<button type="button" onclick="AppApotekTransaksi.removeItem(' + idx + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div></div></div>';
        container.insertAdjacentHTML('beforeend', html);
        if (window.lucide) lucide.createIcons();
    },

    onSelectObat: function(idx) {
        var obat_id = document.getElementById('trx-obat-' + idx).value;
        var hargaEl = document.getElementById('trx-harga-' + idx);
        var hintEl = document.getElementById('trx-hint-' + idx);
        if (!obat_id) { hargaEl.value = 0; if (hintEl) hintEl.textContent = ''; this.hitungTotal(); return; }
        var obat = this.masterObat.find(function(o) { return o.id === obat_id; });
        if (!obat) return;
        
        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');
        var cfg = this.pengaturan;
        // FIX KEEMPAT: Penghitungan marginResep sekarang akan tepat
        var marginPersen = (cfg && cfg.marginResep) ? parseFloat(cfg.marginResep) : 0;

        if (isResep && marginPersen > 0 && obat.hpp > 0) {
            var hargaAuto = Math.ceil(obat.hpp * (1 + marginPersen / 100));
            hargaEl.value = hargaAuto;
            if (hintEl) { hintEl.textContent = 'AUTO: HPP + ' + marginPersen + '%'; hintEl.className = 'text-[10px] text-emerald-600 mt-1 font-semibold'; }
        } else {
            hargaEl.value = obat.harga_jual || 0;
            if (hintEl) { hintEl.textContent = isResep ? 'Harga Manual (Margin 0%)' : 'Harga Jual Bebas'; hintEl.className = 'text-[10px] text-slate-400 mt-1'; }
        }
        this.hitungTotal();
    },

    removeItem: function(idx) {
        var row = document.getElementById('trx-row-' + idx);
        if (row) row.remove();
        var container = document.getElementById('trx-cart-container');
        if (!container.querySelector('[id^="trx-row-"]')) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        }
        this.hitungTotal();
    },

    hitungTotal: function() {
        var self = this;
        var container = document.getElementById('trx-cart-container');
        if (!container) return;
        var rows = container.querySelectorAll('[id^="trx-row-"]');
        var total_obat = 0, total_racik = 0;
        var cfg = this.pengaturan;
        var nilaiRacikConfig = (cfg && cfg.racikObat && cfg.racikObat.nilai) ? cfg.racikObat.nilai : 0;

        rows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var qty = parseInt(document.getElementById('trx-qty-' + idx).value) || 0;
            var harga = parseInt(document.getElementById('trx-harga-' + idx).value) || 0;
            var sub = qty * harga;
            var subEl = document.getElementById('trx-sub-' + idx);
            if (subEl) subEl.textContent = Utils.formatRupiah(sub);
            total_obat += sub;
            if (self.tipe === 'resep_klinik' || self.tipe === 'resep_luar') {
                var racikEl = document.getElementById('trx-racik-' + idx);
                if (racikEl && racikEl.checked) total_racik += nilaiRacikConfig;
            }
        });

        var total_tindakan = 0;
        document.querySelectorAll('[id^="trx-tindakan-klinik-"]').forEach(function(input) { total_tindakan += parseFloat(input.value) || 0; });
        document.querySelectorAll('[id^="trx-tindakan-harga-"]').forEach(function(input) { total_tindakan += parseFloat(input.value) || 0; });

        var jasa_resep = 0;
        // FIX KELIMA: Logika Jasa Resep Klinik (Sekarang akan kebaca karena cfg sudah benar)
        if (this.tipe === 'resep_klinik' && cfg && Array.isArray(cfg.resep_klinik)) {
            var resepIdEl = document.getElementById('trx-resep-id');
            var selectedResepId = resepIdEl ? resepIdEl.value : '';
            if (selectedResepId) {
                var resepData = this.resepList.find(function(r) { return r.id === selectedResepId; });
                if (resepData) {
                    var skemaDokter = cfg.resep_klinik.find(function(d) { return d.dokter_id === resepData.dokter_id; });
                    if (!skemaDokter && resepData.namaDokter) skemaDokter = cfg.resep_klinik.find(function(d) { return d.namaDokter === resepData.namaDokter; });
                    if (skemaDokter && skemaDokter.nilai_resep > 0) jasa_resep = skemaDokter.nilai_resep;
                }
            }
        } 
        // FIX KEENAM: Logika Jasa Resep Luar
        else if (this.tipe === 'resep_luar' && cfg && cfg.resep_luar) {
            var dokterLuarEl = document.getElementById('trx-dokter-luar-id');
            if (dokterLuarEl && dokterLuarEl.value && cfg.resep_luar.nilai_resep > 0) jasa_resep = cfg.resep_luar.nilai_resep;
        }

        var totalRaw = total_obat + total_racik + total_tindakan + jasa_resep;
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;

        document.getElementById('trx-total-obat').textContent = Utils.formatRupiah(total_obat);
        document.getElementById('trx-total-racik').textContent = total_racik > 0 ? Utils.formatRupiah(total_racik) : '-';
        document.getElementById('trx-total-tindakan').textContent = total_tindakan > 0 ? Utils.formatRupiah(total_tindakan) : '-';
        document.getElementById('trx-jasa-resep').textContent = jasa_resep > 0 ? Utils.formatRupiah(jasa_resep) : '-';
        document.getElementById('trx-pembulatan').textContent = pembulatan > 0 ? Utils.formatRupiah(pembulatan) : '-';
        document.getElementById('trx-grand-total').textContent = Utils.formatRupiah(totalRounded);
    },

    simpan: function() {
        var self = this;
        if (this.tipe === 'resep_luar') {
            var dokterLuarCheck = document.getElementById('trx-dokter-luar-id').value.trim();
            if (!dokterLuarCheck) { Utils.toast('Nama dokter pemberi resep wajib diisi', 'error'); return; }
        }
        if (this.tipe === 'resep_klinik' && !document.getElementById('trx-resep-id').value) {
            Utils.toast('Pilih resep klinik yang akan diproses', 'error'); return;
        }

        var items = [], racikan_items = [];
        document.querySelectorAll('[id^="trx-row-"]').forEach(function(row) {
            var idx = row.id.split('-').pop();
            var obat_id = document.getElementById('trx-obat-' + idx).value;
            if (!obat_id) return;
            var obat = self.masterObat.find(function(o) { return o.id === obat_id; });
            if (!obat) return;
            var jumlah = parseInt(document.getElementById('trx-qty-' + idx).value) || 0;
            var harga_jual = parseInt(document.getElementById('trx-harga-' + idx).value) || 0;
            if (jumlah <= 0) return;
            items.push({ obat_id: obat_id, nama_obat: obat.nama_obat || '-', kode_obat: obat.kode_obat || '-', satuan: obat.satuan || '-', harga_jual: harga_jual, hargaBeli: obat.hpp || 0, jumlah: jumlah });
            if (self.tipe === 'resep_klinik' || self.tipe === 'resep_luar') {
                var racikEl = document.getElementById('trx-racik-' + idx);
                if (racikEl && racikEl.checked) racikan_items.push({ nama_obat: obat.nama_obat || '-', kode_obat: obat.kode_obat || '-' });
            }
        });

        if (items.length === 0) { Utils.toast('Tambahkan minimal 1 obat', 'error'); return; }

        var tindakanItemsFinal = [], jasaResepFinal = 0;
        var resepIdFinal = null, dokterIdFinal = null, dokterLuarFinal = null, resepData = null;
        var cfg = this.pengaturan;

        if (this.tipe === 'resep_klinik') {
            resepIdFinal = document.getElementById('trx-resep-id').value;
            resepData = this.resepList.find(function(r) { return r.id === resepIdFinal; });
            if (resepData && resepData.tindakan_items) {
                tindakanItemsFinal = resepData.tindakan_items.map(function(t) { return { namaTindakan: t.namaTindakan, harga_jual: t.harga_jual, modal: t.modal, kategori: 'klinik' }; });
            }
            if (resepData) {
                dokterIdFinal = resepData.dokter_id || null;
                if (cfg && Array.isArray(cfg.resep_klinik)) {
                    var skemaDokter = cfg.resep_klinik.find(function(d) { return d.dokter_id === dokterIdFinal; });
                    if (!skemaDokter && resepData.namaDokter) skemaDokter = cfg.resep_klinik.find(function(d) { return d.namaDokter === resepData.namaDokter; });
                    if (skemaDokter) jasaResepFinal = skemaDokter.nilai_resep || 0;
                }
            }
        } else {
            document.querySelectorAll('[id^="trx-tindakan-row-"]').forEach(function(row) {
                var idx = row.id.split('-').pop();
                var selectEl = document.getElementById('trx-tindakan-select-' + idx);
                var tindId = selectEl ? selectEl.value : null;
                if (tindId) {
                    var tData = self.master_tindakan.find(function(t) { return t.id === tindId; });
                    if (tData) tindakanItemsFinal.push({ namaTindakan: tData.nama, harga_jual: tData.harga_jual, modal: tData.modal, kategori: 'apotek' });
                }
            });
            if (this.tipe === 'resep_luar') {
                var dokterLuarInput = document.getElementById('trx-dokter-luar-id');
                dokterLuarFinal = dokterLuarInput ? dokterLuarInput.value.trim() : null;
                if (cfg && cfg.resep_luar) jasaResepFinal = cfg.resep_luar.nilai_resep || 0;
            }
        }

        var total_obat = items.reduce(function(sum, i) { return sum + (i.jumlah * i.harga_jual); }, 0);
        var nilaiRacikConfig = (cfg && cfg.racikObat && cfg.racikObat.nilai) ? cfg.racikObat.nilai : 0;
        var total_racik = racikan_items.length * nilaiRacikConfig;
        var total_tindakan = tindakanItemsFinal.reduce(function(sum, t) { return sum + (t.harga_jual || 0); }, 0);

        var totalRaw = total_obat + total_racik + total_tindakan + jasaResepFinal;
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;
        var metode_bayar = document.getElementById('trx-metode-bayar').value;

        // FIX KETUJUH: Tambahkan kasir_id dan kasir_nama agar sesuai tabel DB dan tidak error NOT NULL
        var obj = {
            tipe: this.tipe, tanggal: new Date().toISOString().split('T')[0],
            nama_pasien: document.getElementById('trx-pasien').value.trim(),
            kasir_id: window.currentUserId || null,
            kasir_nama: window.currentUserName || 'Kasir',
            dokter_id: dokterIdFinal, dokter_luar: dokterLuarFinal, resep_id: resepIdFinal,
            items: items, racikan_items: racikan_items, tindakan_items: tindakanItemsFinal,
            total_obat: total_obat, total_racik: total_racik, total_tindakan: total_tindakan,
            jasa_resep: jasaResepFinal, pembulatan: pembulatan, total_akhir: totalRounded,
            metode_bayar: metode_bayar, created_at: new Date().toISOString()
        };

        var printWindow = window.open('', '', 'width=400,height=600');
        Utils.toast('Memproses transaksi...', 'info');

        window.sb.from('transaksi').insert(obj).then(function(res) {
            if (res.error) throw res.error;
            var trxId = res.data[0].id;
            obj.id = trxId;

            var stockPromises = items.map(function(item) {
                return window.sb.from('obat').select('stok').eq('id', item.obat_id).single().then(function(snap) {
                    var currentStok = snap.data ? (snap.data.stok || 0) : 0;
                    var newStok = Math.max(0, currentStok - item.jumlah);
                    return window.sb.from('obat').update({ stok: newStok }).eq('id', item.obat_id);
                });
            });

            if (self.tipe === 'resep_klinik' && obj.resep_id) {
                stockPromises.push(window.sb.from('rekam_medis').update({ status_resep: 'selesai' }).eq('id', obj.resep_id));
            }

            return Promise.all(stockPromises).then(function() { return obj; });
        }).then(function(finalObj) {
            Utils.toast('Transaksi berhasil! Stok obat dikurangi.', 'success');
            self.cetakStruk(finalObj, printWindow);
            AppApotekTransaksi.init(); 
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
            if (printWindow) printWindow.close();
        });
    },

    cetakStruk: function(data, w) {
        if (!w) { Utils.toast('Popup struk diblokir browser. Izinkan pop-up untuk situs ini.', 'error'); return; }
        var tgl = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        var html = '<html><head><title>Struk Transaksi</title>';
        html += '<style>body{font-family:"Courier New",monospace;font-size:12px;width:80mm;margin:0;padding:10px;color:#000}h2,h3,p{margin:0;padding:0;text-align:center}hr{border-top:1px dashed #000;margin:8px 0}table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:2px 0}.right{text-align:right}.bold{font-weight:bold}</style></head><body>';
        html += '<h2 class="bold">AULIA APOTEK KLINIK</h2><p>Jl. Contoh Alamat No. 123, Kota</p><p>Telp: 0812-3456-7890</p><hr>';
        html += '<table><tr><td>No</td><td>: ' + data.id.substring(0, 8).toUpperCase() + '</td></tr><tr><td>Tgl</td><td>: ' + tgl + '</td></tr><tr><td>Kasir</td><td>: ' + Utils.escapeHtml(data.kasir_nama || '-') + '</td></tr><tr><td>Pasien</td><td>: ' + Utils.escapeHtml(data.nama_pasien || '-') + '</td></tr>';
        if (data.tipe === 'resep_klinik' || data.tipe === 'resep_luar') html += '<tr><td>Dokter</td><td>: ' + Utils.escapeHtml(data.dokter_luar || 'Klinik') + '</td></tr>';
        html += '<tr><td>Bayar</td><td>: ' + ((data.metode_bayar || '-') + '').toUpperCase() + '</td></tr></table><hr>';
        html += '<table>';
        data.items.forEach(function(item) {
            html += '<tr><td colspan="2">' + Utils.escapeHtml(item.nama_obat || '') + '</td></tr><tr><td>' + item.jumlah + ' x ' + Utils.formatRupiah(item.harga_jual) + '</td><td class="right">' + Utils.formatRupiah(item.jumlah * item.harga_jual) + '</td></tr>';
        });
        html += '</table><hr>';
        if (data.tindakan_items && data.tindakan_items.length > 0) {
            html += '<table>';
            data.tindakan_items.forEach(function(t) { html += '<tr><td>' + Utils.escapeHtml(t.namaTindakan || '') + '</td><td class="right">' + Utils.formatRupiah(t.harga_jual) + '</td></tr>'; });
            html += '</table><hr>';
        }
        html += '<table>';
        html += '<tr><td>Total Obat</td><td class="right">' + Utils.formatRupiah(data.total_obat) + '</td></tr>';
        if (data.total_racik > 0) html += '<tr><td>Racik (' + data.racikan_items.length + ' item)</td><td class="right">' + Utils.formatRupiah(data.total_racik) + '</td></tr>';
        if (data.total_tindakan > 0) html += '<tr><td>Total Tindakan</td><td class="right">' + Utils.formatRupiah(data.total_tindakan) + '</td></tr>';
        if (data.jasa_resep > 0) html += '<tr><td>Jasa Resep</td><td class="right">' + Utils.formatRupiah(data.jasa_resep) + '</td></tr>';
        if (data.pembulatan > 0) html += '<tr><td>Pembulatan</td><td class="right">' + Utils.formatRupiah(data.pembulatan) + '</td></tr>';
        html += '<tr class="bold"><td>TOTAL</td><td class="right">' + Utils.formatRupiah(data.total_akhir) + '</td></tr></table><hr>';
        html += '<p>Terima Kasih</p><p>Semoga Lekas Sembuh</p>';
        html += '<script>window.onload=function(){window.print();}<\/script></body></html>';
        w.document.write(html);
        w.document.close();
    }
};
