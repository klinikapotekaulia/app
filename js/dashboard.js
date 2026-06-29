/**
 * js/dashboard.js — VERSI SUPABASE FIX
 * Dashboard Role-Based (Klinik, Apotek, Admin, Keuangan)
 */

window.AppDashboard = {
    // Wajib ada untuk cleanup module (app.js)
    destroy: function() {},

    render: function() {
        return '<div class="page-enter"><div id="dashboard-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div></div>';
    },

    init: function() {
        var role = window.currentRole || 'apotek';
        if (role === 'klinik') this.renderKlinik();
        else if (role === 'apotek') this.renderApotek();
        else if (role === 'admin') this.renderAdmin();
        else if (role === 'keuangan') this.renderKeuangan();
        else this.renderDefault();
    },

    // Helper kartu statistik
    card: function(title, value, icon, color, desc) {
        return '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center gap-4">' +
            '<div class="w-12 h-12 rounded-full bg-' + color + '-100 dark:bg-' + color + '-900/30 flex items-center justify-center flex-shrink-0">' +
            '<i data-lucide="' + icon + '" class="w-6 h-6 text-' + color + '-600 dark:text-' + color + '-400"></i></div>' +
            '<div><p class="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">' + title + '</p>' +
            '<h3 class="text-xl font-bold text-gray-800 dark:text-white">' + value + '</h3>' +
            (desc ? '<p class="text-[10px] text-slate-400 mt-1">' + desc + '</p>' : '') + '</div></div>';
    },

    // ===== DASHBOARD KLINIK =====
    renderKlinik: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        
        // FIX: Hapus .get()
        var pAntrian = window.sb.from('antrian').select('*').eq('tanggal', today);
        var pResep = window.sb.from('rekam_medis').select('*').eq('status_resep', 'menunggu');

        Promise.all([pAntrian, pResep]).then(function(results) {
            var menunggu = 0, dilayani = 0;
            // FIX: Pakai .data
            (results[0].data || []).forEach(function(d) {
                if (d.status === 'menunggu') menunggu++;
                else if (d.status === 'dipanggil') dilayani++;
            });

            var resepMenunggu = (results[1].data || []).length;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Klinik</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">';
            html += self.card('Antrian Menunggu', menunggu + ' Pasien', 'clock', 'amber', 'Segera panggil pasien');
            html += self.card('Sedang Dilayani', dilayani + ' Pasien', 'activity', 'blue', 'Dalam ruang periksa');
            html += self.card('Resep Belum Diproses', resepMenunggu + ' Resep', 'file-text', 'rose', 'Menunggu di apotek');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'klinik/antrian\', \'Antrian\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="list-ordered" class="w-4 h-4"></i> Buka Antrian</button>';
            html += '<button onclick="navigateTo(\'klinik/rekam_medis\', \'Rekam Medis\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="file-heart" class="w-4 h-4"></i> Input Rekam Medis</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            if(window.lucide) lucide.createIcons();
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD APOTEK =====
    renderApotek: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        
        var pTrx = window.sb.from('transaksi').select('*').eq('tanggal', today);
        var pObat = window.sb.from('obat').select('*');
        var pResep = window.sb.from('rekam_medis').select('*').eq('status_resep', 'menunggu');

        Promise.all([pTrx, pObat, pResep]).then(function(results) {
            var cash = 0, transfer = 0, qris = 0;
            (results[0].data || []).forEach(function(t) {
                if (t.metode_bayar === 'cash') cash += t.total_akhir || 0;
                else if (t.metode_bayar === 'transfer') transfer += t.total_akhir || 0;
                else if (t.metode_bayar === 'qris') qris += t.total_akhir || 0;
            });

            var stokMenipis = 0;
            (results[1].data || []).forEach(function(o) {
                if ((o.stok || 0) <= (o.stok_minimum || 0)) stokMenipis++;
            });

            var resepMenunggu = (results[2].data || []).length;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Apotek</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Kas Masuk (Cash)', Utils.formatRupiah(cash), 'banknote', 'green', 'Hari ini');
            html += self.card('Kas Masuk (Transfer)', Utils.formatRupiah(transfer), 'send', 'blue', 'Hari ini');
            html += self.card('Kas Masuk (QRIS)', Utils.formatRupiah(qris), 'qr-code', 'purple', 'Hari ini');
            html += self.card('Peringatan Stok', stokMenipis + ' Obat', 'alert-triangle', 'red', 'Stok menipis/Habis');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Antrian Resep Dokter</h3>';
            html += '<p class="text-3xl font-bold text-rose-600 mb-2">' + resepMenunggu + ' Resep</p><p class="text-sm text-slate-500 mb-4">Pasien menunggu obat diracik.</p>';
            html += '<button onclick="navigateTo(\'apotek/transaksi\', \'Transaksi\')" class="w-full bg-primary-600 text-white p-3 rounded-lg flex items-center justify-center gap-2"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Buka Kasir</button>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'apotek/pembelian\', \'Pembelian\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="truck" class="w-4 h-4"></i> Input Faktur Pembelian</button>';
            html += '<button onclick="navigateTo(\'apotek/stockOpname\', \'Stock Opname\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Ajukan Stock Opname</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            if(window.lucide) lucide.createIcons();
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD ADMIN =====
    renderAdmin: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        
        // FIX: Hapus .get() dan perbaiki filter status
        var pAbsen = window.sb.from('absensi').select('*').eq('tanggal', today);
        var pKary = window.sb.from('karyawan').select('*').eq('status', 'aktif');
        // FIX: Status di DB adalah 'draft', bukan 'pending'
        var pSO = window.sb.from('stock_opname_requests').select('*').eq('status', 'draft');
        // FIX: Tabel kas_keluar tidak punya status 'pending', hitung pengeluaran hari ini saja
        var pKas = window.sb.from('kas_keluar').select('*').eq('tanggal', today);

        Promise.all([pAbsen, pKary, pSO, pKas]).then(function(results) {
            // FIX: Ganti .size dengan .data.length
            var sudahAbsen = (results[0].data || []).length;
            var totalKary = (results[1].data || []).length;
            var belumAbsen = totalKary - sudahAbsen;

            var soDraft = (results[2].data || []).length;
            var kasHariIni = (results[3].data || []).length;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Admin (Kepala)</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">';
            html += self.card('Absensi Hari Ini', sudahAbsen + ' / ' + totalKary, 'calendar-check', 'blue', belumAbsen + ' karyawan belum absen');
            html += self.card('Pengajuan Stok Opname', soDraft + ' Pengajuan', 'clipboard-check', 'amber', 'Menunggu approval');
            html += self.card('Pengeluaran Kas Hari Ini', kasHariIni + ' Transaksi', 'wallet', 'purple', 'Perlu review');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Approval Center</h3>';
            html += '<button onclick="navigateTo(\'apotek/stockOpname\', \'Stock Opname\')" class="w-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Review Stock Opname</button>';
            html += '<button onclick="navigateTo(\'laporan/pengeluaran\', \'Pengeluaran Kas\')" class="w-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 p-3 rounded-lg flex items-center gap-2"><i data-lucide="wallet" class="w-4 h-4"></i> Review Pengeluaran Kas</button>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Manajemen Operasional</h3>';
            html += '<button onclick="navigateTo(\'manajemen/karyawan\', \'Karyawan\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Data Karyawan</button>';
            html += '<button onclick="navigateTo(\'apotek/obat\', \'Obat\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="pill" class="w-4 h-4"></i> Master Obat & Stok</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            if(window.lucide) lucide.createIcons();
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    // ===== DASHBOARD KEUANGAN =====
    renderKeuangan: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        var startMonth = today.slice(0, 8) + '01';

        var pTrx = window.sb.from('transaksi').select('*').gte('tanggal', startMonth).lte('tanggal', today);
        var pKasKeluar = window.sb.from('kas_keluar').select('*').gte('tanggal', startMonth).lte('tanggal', today);
        var pBeli = window.sb.from('pembelian').select('*').eq('metode_pembayaran', 'tunai').gte('tanggal', startMonth).lte('tanggal', today);
        // FIX: DB hanya punya 'belum_lunas' dan 'lunas'
        var pHutangJatuhTempo = window.sb.from('pembelian').select('*').eq('status_pelunasan', 'belum_lunas');

        Promise.all([pTrx, pKasKeluar, pBeli, pHutangJatuhTempo]).then(function(results) {
            var omzetBulan = 0;
            (results[0].data || []).forEach(function(t) {
                omzetBulan += t.total_akhir || 0;
            });

            var bebanOp = 0;
            (results[1].data || []).forEach(function(doc) { bebanOp += doc.jumlah || 0; });

            var beliTunai = 0;
            (results[2].data || []).forEach(function(doc) { beliTunai += doc.total_harga || 0; });

            var labaKotor = omzetBulan; // Disederhanakan sesuai total_akhir
            var labaBersih = labaKotor - bebanOp;

            // FIX: Ganti .size dengan .data.length
            var hutangAktif = (results[3].data || []).length;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Keuangan (PSA)</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Omzet Bulan Ini', Utils.formatRupiah(omzetBulan), 'trending-up', 'blue', 'Penjualan obat & jasa');
            html += self.card('Beban Operasional', Utils.formatRupiah(bebanOp), 'trending-down', 'rose', 'Pengeluaran bulan ini');
            html += self.card('Estimasi Laba Bersih', Utils.formatRupiah(labaBersih), 'piggy-bank', labaBersih >= 0 ? 'emerald' : 'red', 'Omzet - Beban Op');
            html += self.card('Hutang Belum Lunas', hutangAktif + ' Faktur', 'file-text', 'amber', 'Perlu penyelesaian');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Arus Kas Bulan Ini</h3>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500 dark:text-slate-400">Kas Masuk (Omzet)</span><span class="font-bold text-green-600">+ ' + Utils.formatRupiah(omzetBulan) + '</span></div>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500 dark:text-slate-400">Beli Obat Tunai</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(beliTunai) + '</span></div>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500 dark:text-slate-400">Beban Operasional</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(bebanOp) + '</span></div>';
            html += '<div class="flex justify-between border-t border-slate-200 dark:border-slate-600 mt-2 pt-2 text-sm font-bold"><span>Net Cash Flow</span><span class="' + ((omzetBulan - beliTunai - bebanOp) >= 0 ? 'text-green-600' : 'text-red-600') + '">' + Utils.formatRupiah(omzetBulan - beliTunai - bebanOp) + '</span></div>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Keuangan</h3>';
            html += '<button onclick="navigateTo(\'keuangan/payroll\', \'Payroll\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="calculator" class="w-4 h-4"></i> Proses Payroll</button>';
            html += '<button onclick="navigateTo(\'keuangan/akuntansi\', \'Akuntansi\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="book-open" class="w-4 h-4"></i> Buku Besar & Neraca</button>';
            html += '<button onclick="navigateTo(\'laporan/hutang\', \'Hutang Usaha\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="receipt" class="w-4 h-4"></i> Lunasi Hutang Usaha</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            if(window.lucide) lucide.createIcons();
        }).catch(function(err) {
            document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border text-center text-red-500">Gagal memuat dashboard: ' + (err && err.message ? err.message : err) + '</div>';
        });
    },

    renderDefault: function() {
        document.getElementById('dashboard-content').innerHTML = '<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-500">Selamat datang di Aulia Apotek Klinik</div>';
    }
};
