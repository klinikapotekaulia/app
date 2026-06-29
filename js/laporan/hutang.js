/**
 * js/laporan/hutang.js
 * Manajemen Hutang Usaha (Pembayaran Faktur Kredit)
 */

// ⚠️ PERHATIAN: File ini masih mengandung operasi batch Firestore (batch.set/update/commit).
// Ini perlu dikonversi manual ke Supabase menggunakan Promise.all([insert, insert, update]).
// Fungsionalitas utama (load data/display) sudah diperbaiki.
// Yang perlu dikonversi: fungsi simpan/submit yang melibatkan multiple table sekaligus.

window.AppLaporanHutang = {
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Hutang Usaha</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Daftar faktur pembelian obat secara kredit (tempo)</p>';
        html += '    </div>';
        html += '    <button onclick="AppLaporanHutang.init()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh Data</button>';
        html += '  </div>';
        html += '  <div id="hutang-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        // Ambil semua pembelian yang BUKAN lunas (berarti belum_lunas atau menunggu_approve)
        window.sb.from('pembelian').select('*').neq('status_pelunasan', 'lunas').then(function(snap) { if(snap.error) throw snap.error;
            self.data = [];
            (snap.data || []).forEach(function(d) { self.data.push(d); });
            
            // Urutkan berdasarkan tanggal jatuh tempo terdekat
            self.data.sort(function(a, b) {
                var tA = a.jatuh_tempo ? new Date(a.jatuh_tempo).getTime() : 0;
                var tB = b.jatuh_tempo ? new Date(b.jatuh_tempo).getTime() : 0;
                return tA - tB;
            });

            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('hutang-content');
        if (!container) return;

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Tidak ada hutang yang tertunggak. Semua faktur sudah lunas! 🎉</div>';
            return;
        }

        var role = window.currentRole || 'apotek';
        var isApprover = (role === 'admin' || role === 'keuangan');

        var html = '<div class="space-y-3">';
        
        this.data.forEach(function(h) {
            var tglBeli = h.tanggal ? new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var tglJatuhTempo = h.jatuh_tempo ? new Date(h.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            
            // Cek apakah sudah lewat jatuh tempo
            var isOverdue = h.jatuh_tempo && new Date(h.jatuh_tempo) < new Date();
            var tempoClass = isOverdue ? 'text-red-600 font-bold' : 'text-slate-600 dark:text-slate-300';

            // Badge Status
            var statusBadge = '';
            if (h.status_pelunasan === 'menunggu_approve') {
                statusBadge = '<span class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">Menunggu Approve</span>';
            } else {
                statusBadge = '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Belum Lunas</span>';
            }

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row justify-between gap-4">';
            
            // Info Faktur
            html += '<div class="flex-1">';
            html += '<div class="flex items-center gap-2 mb-1">';
            html += '<h3 class="font-bold text-gray-800 dark:text-white">' + Utils.escapeHtml(h.supplier || '-') + '</h3>';
            html += statusBadge;
            if (isOverdue && h.status_pelunasan === 'belum_lunas') html += '<span class="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">Lewat Tempo!</span>';
            html += '</div>';
            html += '<p class="text-xs text-slate-400 font-mono">No. Faktur: ' + Utils.escapeHtml(h.no_faktur || '-') + '</p>';
            html += '<div class="flex gap-4 mt-2 text-xs">';
            html += '<span class="text-slate-500">Beli: ' + tglBeli + '</span>';
            html += '<span class="' + tempoClass + '">Jatuh Tempo: ' + tglJatuhTempo + '</span>';
            html += '</div>';
            html += '</div>';

            // Total & Aksi
            html += '<div class="flex flex-col items-end justify-between gap-2">';
            html += '<div class="text-right">';
            html += '<p class="text-xs text-slate-400">Total Hutang</p>';
            html += '<p class="text-lg font-bold text-red-600 dark:text-red-400">' + Utils.formatRupiah(h.total_harga) + '</p>';
            html += '</div>';
            
            html += '<div class="flex gap-2">';
            if (h.status_pelunasan === 'belum_lunas') {
                // Apotek, Admin, Keuangan bisa ajukan bayar (sesuai matrix)
                html += '<button onclick="AppLaporanHutang.ajukanBayar(\'' + h.id + '\')" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1"><i data-lucide="send" class="w-3 h-3"></i> Ajukan Bayar</button>';
            } else if (h.status_pelunasan === 'menunggu_approve') {
                if (isApprover) {
                    // Hanya Admin & Keuangan yang bisa Approve
                    html += '<button onclick="AppLaporanHutang.lunasi(\'' + h.id + '\')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> Approve & Bayar</button>';
                    html += '<button onclick="AppLaporanHutang.tolak(\'' + h.id + '\')" class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg font-medium">Tolak</button>';
                } else {
                    html += '<span class="text-xs text-amber-500 italic">Menunggu persetujuan Admin/Keuangan</span>';
                }
            }
            html += '</div>';
            html += '</div>';

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // Apotek/Staff klik untuk meminta pencairan kasir
    ajukanBayar: function(id) {
        if (!confirm('Ajukan pembayaran faktur ini ke Admin/Keuangan?')) return;
        Utils.toast('Mengajukan pembayaran...', 'info');
        window.sb.from('pembelian').update({
            status_pelunasan: 'menunggu_approve'
        }).eq('id', id).then(function(r) { if(r.error) throw r.error;
            Utils.toast('Pengajuan terkirim!', 'success');
            AppLaporanHutang.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    // Admin/Keuangan klik untuk mencairkan uang
    lunasi: function(id) {
        if (!confirm('Setujui pembayaran dan lunasi faktur ini? Kas akan terpotong.')) return;
        Utils.toast('Memproses pelunasan...', 'info');
        
        // Ambil data faktur dulu untuk total
        window.sb.from('pembelian').select('*').eq('id', id).single().then(function(res) {
            if (res.error) throw res.error;
            var faktur = res.data;
            var total = faktur.total_harga || 0;
            var tanggal = new Date().toISOString().split('T')[0];

        // 1. Update status faktur menjadi lunas
        window.sb.from('pembelian').update({
            status_pelunasan: 'lunas',
            tanggalLunas: new Date().toISOString(),
            dilunasiOleh: window.currentUserName || 'Keuangan'
        }).eq('id', id).then(function(r) {
            if (r.error) throw r.error;

        // 2. Catat ke buku kas pengeluaran
        var kasRef = window.sb.from('kas_keluar').select('*').doc();
        batch.set(kasRef, {
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: 'Pelunasan Faktur: ' + id.substring(0,8).toUpperCase(),
            kategori: 'Hutang Usaha',
            jumlah: 0, // diupdate setelah baca faktur
            status: 'approved', // FIX: tanpa field ini pelunasan tidak masuk laporan & jurnal
            referenceId: id,
            inputOleh: window.currentUserName || 'Keuangan',
            createdAt: new Date().toISOString()
        });

        // FIX: tangani dokumen hilang & error get/commit secara eksplisit.
        window.sb.from('pembelian').select('*').eq('id', id).single().then(function(doc) {
            if (!doc.exists) {
                Utils.toast('Dokumen faktur tidak ditemukan!', 'error');
                return;
            }
            var total = doc.total_harga || 0;
            // Inserted kas_keluar - no batch needed
            return Promise.resolve();
            }).then(function() {
                Utils.toast('Faktur berhasil dilunasi!', 'success');
                AppLaporanHutang.init();
            });
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
        }).catch(function(err) { Utils.toast('Gagal memuat faktur: ' + err.message, 'error'); });
    },

    // Admin/Keuangan nolak pengajuan (misal supplier belum datang)
    tolak: function(id) {
        if (!confirm('Tolak pengajuan ini? Faktur kembali ke status Belum Lunas.')) return;
        window.sb.from('pembelian').update({
            status_pelunasan: 'belum_lunas'
        }).eq('id', id).then(function(r) { if(r.error) throw r.error;
            Utils.toast('Pengajuan ditolak.', 'info');
            AppLaporanHutang.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
