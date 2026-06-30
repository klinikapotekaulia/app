/**
 * js/apotek/retur.js
 * Retur Obat ke Supplier — VERSI SUPABASE FIX
 */

window.AppApotekRetur = {

    // ===== STATE =====
    masterObat: [],
    data: [],
    filterBulan: '',

    // ===== RENDER =====
    render: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        return [
            '<div class="page-enter max-w-5xl">',
            '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">',
            '    <div>',
            '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Retur Obat ke Supplier</h2>',
            '      <p class="text-sm text-slate-500 dark:text-slate-400">Pengembalian obat kadaluarsa, rusak, atau salah kirim</p>',
            '    </div>',
            '    <button onclick="AppApotekRetur.openForm()" class="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">',
            '      <i data-lucide="plus" class="w-4 h-4"></i> Buat Retur Baru',
            '    </button>',
            '  </div>',

            '  <div class="flex items-center gap-3 mb-5">',
            '    <label class="text-sm text-slate-500 dark:text-slate-400">Filter Bulan:</label>',
            '    <input type="month" id="retur-filter-bulan" value="' + defaultMonth + '" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm outline-none">',
            '    <button onclick="AppApotekRetur.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg font-medium">Tampilkan</button>',
            '  </div>',

            '  <div id="retur-list"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    // ===== INIT =====
    init: function() {
        var self = this;
        var bulanEl = document.getElementById('retur-filter-bulan');
        var bulan   = bulanEl ? bulanEl.value : new Date().toISOString().slice(0, 7);
        var start   = bulan + '-01';
        var end     = bulan + '-31'; // Aman untuk filter tanggal

        // FIX: Hapus .get(), gunakan .select('*'), akses via res.data
        Promise.all([
            window.sb.from('obat').select('*'),
            window.sb.from('retur').select('*').gte('tanggal', start).lte('tanggal', end)
              .order('tanggal', { ascending: false })
        ]).then(function(results) {
            self.masterObat = results[0].data || [];
            self.data = results[1].data || [];

            self.renderList();
        }).catch(function(err) {
            document.getElementById('retur-list').innerHTML =
                '<p class="text-red-500 text-center py-10">Gagal memuat: ' + Utils.escapeHtml(err.message) + '</p>';
        });
    },

    // ===== RENDER LIST =====
    renderList: function() {
        var container = document.getElementById('retur-list');
        if (!container) return;
        var role = window.currentRole || '';

        if (this.data.length === 0) {
            container.innerHTML = '<div class="text-center py-16 text-slate-400"><i data-lucide="package-open" class="w-10 h-10 mx-auto mb-3"></i><p>Belum ada retur bulan ini</p></div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Summary
        var totalNilai = this.data.reduce(function(s, r) { return s + (r.totalNilai || 0); }, 0);
        var html = '<div class="grid grid-cols-2 gap-3 mb-5">';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Retur Bulan Ini</p>';
        html += '  <p class="text-xl font-bold text-gray-800 dark:text-white">' + this.data.length + ' Item</p>';
        html += '</div>';
        html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">';
        html += '  <p class="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Nilai Retur</p>';
        html += '  <p class="text-xl font-bold text-primary-600 dark:text-primary-400">' + Utils.formatRupiah(totalNilai) + '</p>';
        html += '</div></div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead class="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">';
        html += '<tr><th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Obat</th><th class="px-4 py-3 text-left">Supplier</th><th class="px-4 py-3 text-center">Qty</th><th class="px-4 py-3 text-right">Nilai</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-center">Aksi</th></tr>';
        html += '</thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700">';

        var isAdmin = (role === 'admin' || role === 'keuangan');
        this.data.forEach(function(r) {
            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">' + (r.tanggal || '-') + '</td>';
            html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(r.nama_obat || '-') + '</p>';
            html += '<p class="text-xs text-slate-400">Alasan: ' + Utils.escapeHtml(r.alasan || '-') + '</p></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(r.supplier || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center">' + (r.qty || 0) + ' ' + Utils.escapeHtml(r.satuan || '') + '</td>';
            html += '<td class="px-4 py-3 text-right font-medium">' + Utils.formatRupiah(r.totalNilai || 0) + '</td>';
            html += '<td class="px-4 py-3 text-center">' + AppApotekRetur._badgeStatus(r.status) + '</td>';
            html += '<td class="px-4 py-3 text-center">';
            if (isAdmin && r.status === 'menunggu_konfirmasi') {
                html += '<button onclick="AppApotekRetur.konfirmasi(\'' + r.id + '\')" class="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded font-semibold mr-1">Konfirmasi</button>';
                html += '<button onclick="AppApotekRetur.tolak(\'' + r.id + '\')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2 py-1 rounded font-semibold">Tolak</button>';
            } else {
                html += '<span class="text-xs text-slate-400">-</span>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    // ===== FORM RETUR BARU =====
    openForm: function() {
        var obatOptions = '<option value="">-- Pilih Obat --</option>';
        this.masterObat.sort(function(a, b) { return (a.nama_obat || '').localeCompare(b.nama_obat || ''); });
        this.masterObat.forEach(function(o) {
            obatOptions += '<option value="' + o.id + '" data-hpp="' + (o.hpp || 0) + '" data-satuan="' + Utils.escapeHtml(o.satuan || '') + '">' + Utils.escapeHtml(o.nama_obat) + ' (Stok: ' + (o.stok || 0) + ')</option>';
        });

        var today = new Date().toISOString().split('T')[0];
        
        // FIX: Bangun HTML lengkap dengan judul dan tombol (sesuai Utils.openModal yang hanya terima 1 parameter)
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Buat Retur Baru</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-retur" class="space-y-4">';
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Retur *</label><input type="date" id="retur-tgl" value="' + today + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier *</label><input type="text" id="retur-supplier" placeholder="Nama supplier / PBF" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Obat *</label><select id="retur-obat" onchange="AppApotekRetur.onObatChange(this)" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + obatOptions + '</select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qty Retur *</label><input type="number" id="retur-qty" min="1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" oninput="AppApotekRetur.hitungNilai()"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga Beli/Unit (Rp)</label><input type="number" id="retur-harga" min="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" oninput="AppApotekRetur.hitungNilai()"></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alasan Retur *</label>';
        html += '<select id="retur-alasan" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="Mendekati kadaluarsa">Mendekati kadaluarsa</option>';
        html += '<option value="Sudah kadaluarsa">Sudah kadaluarsa</option>';
        html += '<option value="Obat rusak / kemasan cacat">Obat rusak / kemasan cacat</option>';
        html += '<option value="Salah kirim dari supplier">Salah kirim dari supplier</option>';
        html += '<option value="Tidak laku / slow moving">Tidak laku / slow moving</option>';
        html += '</select></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Nilai Retur</label>';
        html += '<p id="retur-total" class="text-xl font-bold text-primary-600 dark:text-primary-400">Rp 0</p></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan Retur</button>';
        html += '</div>';
        
        html += '</form></div>';

        Utils.openModal(html);
        
        setTimeout(function() {
            var form = document.getElementById('form-retur');
            if(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppApotekRetur.simpanRetur();
                });
            }
        }, 100);
    },

    onObatChange: function(sel) {
        var opt = sel.options[sel.selectedIndex];
        var hpp = parseFloat(opt.getAttribute('data-hpp')) || 0;
        var el  = document.getElementById('retur-harga');
        if (el) el.value = hpp;
        this.hitungNilai();
    },

    hitungNilai: function() {
        var qty   = parseFloat(document.getElementById('retur-qty')?.value) || 0;
        var harga = parseFloat(document.getElementById('retur-harga')?.value) || 0;
        var el    = document.getElementById('retur-total');
        if (el) el.textContent = Utils.formatRupiah(qty * harga);
    },

    simpanRetur: function() {
        var tgl      = document.getElementById('retur-tgl')?.value;
        var supplier = document.getElementById('retur-supplier')?.value.trim();
        var obatSel  = document.getElementById('retur-obat');
        var obat_id   = obatSel?.value;
        var qty      = parseFloat(document.getElementById('retur-qty')?.value) || 0;
        var harga    = parseFloat(document.getElementById('retur-harga')?.value) || 0;
        var alasan   = document.getElementById('retur-alasan')?.value;

        if (!tgl || !supplier || !obat_id || qty <= 0) {
            return Utils.toast('Lengkapi semua field yang wajib!', 'error');
        }

        var obat = this.masterObat.find(function(o) { return o.id === obat_id; });
        if (!obat) return Utils.toast('Obat tidak ditemukan', 'error');

        if (qty > (obat.stok || 0)) {
            return Utils.toast('Qty retur (' + qty + ') melebihi stok tersedia (' + (obat.stok || 0) + ')!', 'error');
        }

        var obj = {
            tanggal:    tgl,
            supplier:   supplier,
            obat_id:     obat_id,
            nama_obat:   obat.nama_obat,
            kode_obat:   obat.kode_obat || '',
            satuan:     obat.satuan || '',
            qty:        qty,
            hargaBeli:  harga,
            totalNilai: qty * harga,
            alasan:     alasan,
            status:     'menunggu_konfirmasi',
            inputOleh:  window.currentUserName || 'Kasir',
            createdAt:  new Date().toISOString()
        };

        window.sb.from('retur').insert(obj).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pengajuan retur berhasil dibuat! Menunggu konfirmasi admin.', 'success');
            Utils.closeModal();
            AppApotekRetur.init();
        }).catch(function(err) {
            Utils.toast('Gagal: ' + err.message, 'error');
        });
    },

    // ===== KONFIRMASI (Admin) =====
    konfirmasi: function(id) {
        if (!confirm('Konfirmasi retur ini? Stok obat akan langsung dikurangi.')) return;

        var self = this;
        var retur = this.data.find(function(r) { return r.id === id; });
        if (!retur) return;

        // FIX HAPUS db.batch(): Gunakan Fetch lalu Update supabase
        // 1. Ambil stok saat ini, kurangi, lalu update
        window.sb.from('obat').select('stok').eq('id', retur.obat_id).single()
        .then(function(res) {
            var currentStok = res.data ? (res.data.stok || 0) : 0;
            var newStok = currentStok - (retur.qty || 0);
            
            return window.sb.from('obat').update({ 
                stok: newStok, 
                updated_at: new Date().toISOString() 
            }).eq('id', retur.obat_id);
        })
        .then(function(res) {
            if (res.error) throw res.error;

            // 2. Update status retur
            return window.sb.from('retur').update({
                status: 'dikonfirmasi',
                dikonfirmasiOleh: window.currentUserName || 'Admin',
                dikonfirmasiAt: new Date().toISOString()
            }).eq('id', id);
        })
        .then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Retur dikonfirmasi. Stok telah dikurangi ' + retur.qty + ' ' + (retur.satuan || '') + '.', 'success');
            self.init();
        })
        .catch(function(err) {
            console.error(err);
            Utils.toast('Gagal konfirmasi: ' + err.message, 'error');
        });
    },

    // ===== TOLAK (Admin) =====
    tolak: function(id) {
        // FIX: Ganti prompt() jadi custom Modal agar selaras dengan UI lainnya
        var html = '<div class="p-6 text-center">';
        html += '<i data-lucide="alert-triangle" class="w-12 h-12 text-red-400 mx-auto mb-3"></i>';
        html += '<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Tolak Retur</h3>';
        html += '<p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Masukkan alasan penolakan:</p>';
        html += '<textarea id="retur-alasan-tolak" rows="3" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm mb-4 text-left" placeholder="Tulis alasan di sini..."></textarea>';
        html += '<div class="flex gap-3 justify-center">';
        html += '<button onclick="Utils.closeModal()" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>';
        html += '<button onclick="AppApotekRetur._doTolak(\'' + id + '\')" class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Ya, Tolak</button>';
        html += '</div></div>';
        
        Utils.openModal(html);
        if(window.lucide) lucide.createIcons();
    },

    _doTolak: function(id) {
        var alasan = document.getElementById('retur-alasan-tolak') ? document.getElementById('retur-alasan-tolak').value.trim() : '';
        if (!alasan) {
            Utils.toast('Alasan penolakan wajib diisi.', 'error');
            return;
        }
        
        Utils.closeModal();
        
        // FIX: TAMBAHKAN .eq('id', id) SEBELUM .then()
        window.sb.from('retur').update({
            status: 'ditolak',
            catatanAdmin: alasan,
            ditolakOleh: window.currentUserName || 'Admin',
            ditolakAt: new Date().toISOString()
        }).eq('id', id).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pengajuan retur ditolak.', 'success');
            AppApotekRetur.init();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    },

    // ===== HELPER =====
    _badgeStatus: function(status) {
        var map = {
            menunggu_konfirmasi: ['bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', 'Menunggu'],
            dikonfirmasi:        ['bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', 'Dikonfirmasi'],
            ditolak:             ['bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', 'Ditolak'],
            selesai:             ['bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', 'Selesai']
        };
        var s = map[status] || ['bg-slate-100 text-slate-500', status || '-'];
        return '<span class="text-xs ' + s[0] + ' font-semibold px-2 py-1 rounded-full">' + s[1] + '</span>';
    }
};
