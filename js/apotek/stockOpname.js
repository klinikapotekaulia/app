/**
 * js/apotek/stockOpname.js
 * Sistem Stock Opname dengan Approval (Multi-Role) — VERSI SUPABASE FIX
 */

window.AppApotekStockOpname = {
    data: [],
    requests: [],
    searchQuery: '',

    render: function() {
        var role = window.currentRole || 'apotek';
        var isApprover = (role === 'admin' || role === 'keuangan');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Stock Opname</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">' + (isApprover ? 'Persetujuan hasil opname dari apoteker' : 'Input stok fisik dan ajukan persetujuan') + '</p>';
        html += '    </div>';
        
        if (!isApprover) {
            html += '<button onclick="AppApotekStockOpname.ajukanOpname()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="send" class="w-4 h-4"></i> Ajukan Opname</button>';
        }
        html += '  </div>';
        
        html += '<div id="so-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var role = window.currentRole || 'apotek';
        if (role === 'admin' || role === 'keuangan') {
            this.loadRequests();
        } else {
            this.loadMasterObat();
        }
    },

    // ===== VIEW UNTUK APOTEKER (INPUT) =====
    loadMasterObat: function() {
        var self = this;
        // FIX: Hapus .get(), tambah .select('*'), akses via snap.data
        window.sb.from('obat').select('*').order('nama_obat', { ascending: true }).then(function(snap) {
            self.data = snap.data || [];
            // Supabase otomatis menyertakan 'id', kita hanya perlu tambahkan property stok_fisik
            self.data.forEach(function(doc) { 
                doc.stok_fisik = ''; 
            });
            self.renderInputForm();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    renderInputForm: function() {
        var container = document.getElementById('so-content');
        var html = '<div class="mb-4 relative">';
        html += '  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '  <input type="text" id="search-opname" placeholder="Cari nama obat..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm" oninput="AppApotekStockOpname.onSearch(this.value)">';
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm"><thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase">';
        html += '<th class="px-4 py-3 text-left">Obat</th><th class="px-4 py-3 text-center">Stok Sistem</th><th class="px-4 py-3 text-center">Stok Fisik</th><th class="px-4 py-3 text-center">Selisih</th>';
        html += '</tr></thead><tbody id="so-table-body"></tbody></table></div>';

        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
        this.renderTableRows();
    },

    renderTableRows: function() {
        var tbody = document.getElementById('so-table-body');
        if(!tbody) return;
        var list = this.data;
        if (this.searchQuery) {
            list = list.filter(function(o) { 
                return (o.nama_obat && o.nama_obat.toLowerCase().includes(AppApotekStockOpname.searchQuery)) || 
                       (o.kode_obat && o.kode_obat.toLowerCase().includes(AppApotekStockOpname.searchQuery)); 
            });
        }

        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-400">Obat tidak ditemukan.</td></tr>'; return; }

        var html = '';
        list.forEach(function(o) {
            var realIdx = AppApotekStockOpname.data.findIndex(function(x) { return x.id === o.id; });
            var stok_sistem = o.stok || 0;
            var stok_fisik = o.stok_fisik === '' ? '' : parseInt(o.stok_fisik);
            var selisih = '-', selisihClass = 'text-slate-400';

            if (stok_fisik !== '') {
                var sel = stok_fisik - stok_sistem;
                if (sel > 0) { selisih = '+' + sel; selisihClass = 'text-green-600 font-bold'; } 
                else if (sel < 0) { selisih = sel; selisihClass = 'text-red-600 font-bold'; } 
                else { selisih = '0'; selisihClass = 'text-slate-500'; }
            }

            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.nama_obat || '-') + '</p><p class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(o.kode_obat || '-') + '</p></td>';
            html += '<td class="px-4 py-3 text-center font-medium">' + stok_sistem + '</td>';
            html += '<td class="px-4 py-3 text-center"><input type="number" id="so-fisik-' + realIdx + '" value="' + (stok_fisik !== '' ? stok_fisik : '') + '" placeholder="Isi..." class="w-20 px-2 py-1.5 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppApotekStockOpname.hitungSelisih(' + realIdx + ')"></td>';
            html += '<td class="px-4 py-3 text-center ' + selisihClass + '" id="so-selisih-' + realIdx + '">' + selisih + '</td>';
            html += '</tr>';
        });
        tbody.innerHTML = html;
    },

    onSearch: function(val) { this.searchQuery = val.toLowerCase().trim(); this.renderTableRows(); },

    hitungSelisih: function(idx) {
        var inputEl = document.getElementById('so-fisik-' + idx);
        var selisihEl = document.getElementById('so-selisih-' + idx);
        var obat = this.data[idx];
        var stok_sistem = obat.stok || 0;
        var stok_fisik = inputEl.value === '' ? '' : parseInt(inputEl.value);

        obat.stok_fisik = stok_fisik;

        if (stok_fisik === '') { selisihEl.innerHTML = '-'; selisihEl.className = 'px-4 py-3 text-center text-slate-400'; return; }
        var sel = stok_fisik - stok_sistem;
        if (sel > 0) { selisihEl.innerHTML = '+' + sel; selisihEl.className = 'px-4 py-3 text-center text-green-600 font-bold'; } 
        else if (sel < 0) { selisihEl.innerHTML = sel; selisihEl.className = 'px-4 py-3 text-center text-red-600 font-bold'; } 
        else { selisihEl.innerHTML = '0'; selisihEl.className = 'px-4 py-3 text-center text-slate-500'; }
    },

    ajukanOpname: function() {
        var self = this;
        var itemsToSubmit = [];

        this.data.forEach(function(o) {
            if (o.stok_fisik !== '' && !isNaN(o.stok_fisik) && o.stok_fisik != (o.stok || 0)) {
                itemsToSubmit.push({
                    obat_id: o.id, nama_obat: o.nama_obat, kode_obat: o.kode_obat,
                    stok_sistem: o.stok || 0, stok_fisik: o.stok_fisik,
                    selisih: o.stok_fisik - (o.stok || 0),
                    nilaiSelisih: (o.stok_fisik - (o.stok || 0)) * (o.hpp || 0),
                    satuan: o.satuan || '-'
                });
            }
        });

        if (itemsToSubmit.length === 0) { Utils.toast('Tidak ada perubahan stok untuk diajukan.', 'info'); return; }
        if (!confirm('Ajukan ' + itemsToSubmit.length + ' perubahan stok ke Admin/Keuangan?')) return;

        Utils.toast('Mengirim pengajuan...', 'info');
        window.sb.from('stock_opname_requests').insert({
            tanggal: new Date().toISOString().split('T')[0],
            diajukanOleh: window.currentUserName || 'Apoteker',
            status: 'pending',
            totalItem: itemsToSubmit.length,
            items: itemsToSubmit,
            createdAt: new Date().toISOString()
        }).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pengajuan opname terkirim! Menunggu approval.', 'success');
            self.loadMasterObat(); // Reset form
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    // ===== VIEW UNTUK ADMIN / KEUANGAN (APPROVAL) =====
    loadRequests: function() {
        var self = this;
        // FIX: Hapus .get(), tambah .select('*'), akses via snap.data
        window.sb.from('stock_opname_requests').select('*').eq('status', 'pending').then(function(snap) {
            self.requests = snap.data || [];
            // FIX: Sorting tanggal ISO string (bukan Firebase Timestamp)
            self.requests.sort(function(a, b) { 
                return (b.createdAt || '').localeCompare(a.createdAt || ''); 
            });
            self.renderApprovalList();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal memuat: ' + err.message, 'error'); 
        });
    },

    renderApprovalList: function() {
        var container = document.getElementById('so-content');
        if(this.requests.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Tidak ada pengajuan opname yang menunggu approval.</div>';
            return;
        }

        var html = '<div class="space-y-4">';
        this.requests.forEach(function(req) {
            // FIX: Parsing ISO String (bukan .seconds seperti Firebase)
            var tgl = req.createdAt ? new Date(req.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
            var totalRugi = 0, totalUntung = 0;
            req.items.forEach(function(it) {
                if(it.selisih < 0) totalRugi += Math.abs(it.nilaiSelisih);
                else totalUntung += it.nilaiSelisih;
            });

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
            html += '<div class="flex justify-between items-start mb-3">';
            html += '<div><h3 class="font-bold text-gray-800 dark:text-white">Pengajuan dari: ' + Utils.escapeHtml(req.diajukanOleh) + '</h3><p class="text-xs text-slate-400">' + tgl + '</p></div>';
            html += '<span class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">Pending</span>';
            html += '</div>';
            
            html += '<div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-3 text-xs space-y-1">';
            html += '<div class="flex justify-between"><span class="text-slate-500">Total Item Diajukan:</span><span class="font-bold">' + req.totalItem + ' Obat</span></div>';
            html += '<div class="flex justify-between"><span class="text-slate-500">Estimasi Nilai Kurang (Rugi):</span><span class="font-bold text-red-600">' + Utils.formatRupiah(totalRugi) + '</span></div>';
            html += '<div class="flex justify-between"><span class="text-slate-500">Estimasi Nilai Lebih (Untung):</span><span class="font-bold text-green-600">' + Utils.formatRupiah(totalUntung) + '</span></div>';
            html += '</div>';

            html += '<div class="flex gap-2">';
            html += '<button onclick="AppApotekStockOpname.lihatDetail(\'' + req.id + '\')" class="flex-1 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium">Lihat Detail</button>';
            html += '<button onclick="AppApotekStockOpname.approveReq(\'' + req.id + '\')" class="flex-1 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Approve & Update Stok</button>';
            html += '<button onclick="AppApotekStockOpname.rejectReq(\'' + req.id + '\')" class="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-medium">Tolak</button>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    },

    lihatDetail: function(reqId) {
        var req = this.requests.find(function(r) { return r.id === reqId; });
        if(!req) return;

        var html = '<div class="p-6">';
        html += '<div class="flex justify-between mb-4"><h3 class="font-bold text-lg">Detail Selisih Opname</h3><button onclick="Utils.closeModal()" class="text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button></div>';
        html += '<div class="max-h-[60vh] overflow-y-auto border border-slate-100 rounded-lg">';
        html += '<table class="w-full text-xs"><thead class="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr><th class="p-2 text-left">Obat</th><th class="p-2 text-center">Sistem</th><th class="p-2 text-center">Fisik</th><th class="p-2 text-center">Selisih</th></tr></thead><tbody>';
        
        req.items.forEach(function(it) {
            var selClass = it.selisih < 0 ? 'text-red-600 font-bold' : (it.selisih > 0 ? 'text-green-600 font-bold' : '');
            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="p-2">' + Utils.escapeHtml(it.nama_obat) + '</td>';
            html += '<td class="p-2 text-center">' + it.stok_sistem + '</td>';
            html += '<td class="p-2 text-center">' + it.stok_fisik + '</td>';
            html += '<td class="p-2 text-center ' + selClass + '">' + (it.selisih > 0 ? '+'+it.selisih : it.selisih) + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        Utils.openModal(html);
        if(window.lucide) lucide.createIcons();
    },

    approveReq: function(reqId) {
        var self = this;
        var req = this.requests.find(function(r) { return r.id === reqId; });
        if(!req) return;

        if(!confirm('Setujui pengajuan ini? Stok sistem akan otomatis diperbarui.')) return;

        Utils.toast('Memproses update stok...', 'info');

        // ==========================================
        // FIX BESAR: HAPUS db.batch() FIREBASE
        // Ganti dengan Promise.all loop khas Supabase
        // ==========================================
        
        // 1. Kumpulkan promise untuk update stok master obat
        var updateStokPromises = req.items.map(function(it) {
            var delta = (typeof it.selisih === 'number') ? it.selisih : ((it.stok_fisik || 0) - (it.stok_sistem || 0));
            
            // Ambil stok saat ini, lalu tambahkan delta (mencegah penimpaan jika ada transaksi setelah opname diajukan)
            return window.sb.from('obat').select('stok').eq('id', it.obat_id).single()
                .then(function(res) {
                    var currentStok = res.data ? (res.data.stok || 0) : 0;
                    var newStok = currentStok + delta;
                    
                    return window.sb.from('obat').update({ 
                        stok: newStok, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', it.obat_id);
                });
        });

        // Jalankan semua update stok secara paralel
        Promise.all(updateStokPromises).then(function(results) {
            // Cek jika ada error di salah satu update
            var hasError = results.some(function(r) { return r.error; });
            if (hasError) throw new Error('Gagal mengupdate salah satu stok obat');

            // 2. Update status pengajuan jadi approved
            return window.sb.from('stock_opname_requests').update({ 
                status: 'approved', 
                approvedBy: window.currentUserName || 'Admin',
                approvedAt: new Date().toISOString()
            }).eq('id', reqId);
        }).then(function(res) {
            if (res.error) throw res.error;

            // 3. Catat ke history (Hapus .doc(), langsung .insert)
            return window.sb.from('stock_opname_history').insert({
                tanggal: req.tanggal || (req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                totalItem: req.totalItem,
                items: req.items,
                approvedBy: window.currentUserName || 'Admin',
                createdAt: new Date().toISOString()
            });
        }).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pengajuan disetujui & stok diupdate!', 'success');
            Utils.closeModal();
            self.loadRequests();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    },

    rejectReq: function(reqId) {
        var self = this;
        if(!confirm('Tolak pengajuan ini?')) return;
        
        // FIX: TAMBAHKAN .eq('id', reqId) SEBELUM .then()
        window.sb.from('stock_opname_requests').update({ 
            status: 'rejected',
            approvedBy: window.currentUserName || 'Admin',
            approvedAt: new Date().toISOString()
        }).eq('id', reqId).then(function(res) {
            if (res.error) throw res.error;
            Utils.toast('Pengajuan ditolak.', 'info');
            self.loadRequests();
        }).catch(function(err) { 
            console.error(err);
            Utils.toast('Gagal: ' + err.message, 'error'); 
        });
    }
};
