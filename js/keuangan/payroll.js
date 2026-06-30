/**
 * js/keuangan/payroll.js
 * Proses Payroll (Gaji & Pembagian Hasil) Bulanan
 * VERSI SUPABASE (FINAL INTEGRATED)
 */

window.AppKeuanganPayroll = {
    dataKaryawan: [],
    dataTransaksi: [],
    dataAbsensi: [],
    configGaji: null,
    configPembagian: null,
    kalkulasiGaji: [],

    destroy: function() {
        this.dataKaryawan = [];
        this.dataTransaksi = [];
        this.dataAbsensi = [];
        this.configGaji = null;
        this.configPembagian = null;
        this.kalkulasiGaji = [];
    },

    render: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

        var html = '<div class="page-enter max-w-7xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Payroll Karyawan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Hitung gaji & pembagian hasil bulanan (Otomatis)</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <input type="month" id="filter-bulan-payroll" value="' + defaultMonth + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganPayroll.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Hitung</button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div id="payroll-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || 'apotek';
        
        if (role !== 'keuangan') {
            document.getElementById('payroll-content').innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center font-semibold">Akses Ditolak. Halaman ini khusus Keuangan/PSA.</div>';
            return;
        }

        var monthInput = document.getElementById('filter-bulan-payroll');
        if (!monthInput) return;
        var bulan = monthInput.value;
        var startDate = bulan + '-01';
        var endDate = bulan + '-31';

        Promise.all([
            window.sb.from('karyawan').select('*').eq('status', 'aktif'),
            window.sb.from('transaksi').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
            window.sb.from('absensi').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
            window.sb.from('pengaturan_gaji').select('*').eq('id', 'global').single(),
            window.sb.from('pengaturan_pembagian').select('skema').eq('id', 'global').single()
        ]).then(function(results) {
            self.dataKaryawan = results[0].data || [];
            self.dataTransaksi = results[1].data || [];
            self.dataAbsensi = results[2].data || [];

            // ==========================================
            // FIX #1: PARSING PENGATURAN GAJI YANG SUPER FLEKSIBEL
            // Bisa handle kalau datanya Array, Object, atau di dalam kolom 'skema'
            // ==========================================
            var rawGaji = results[3].data;
            if (rawGaji) {
                // Coba ambil dari kolom 'skema', kalau tidak ada, ambil datanya langsung
                var parsedGaji = rawGaji.skema || rawGaji;
                
                // Kalau hasilnya Array (misal: [{karyawan_id, gaji_pokok, departemen}...])
                if (Array.isArray(parsedGaji)) {
                    var objGaji = { apotek: [], klinik: [], manajemen: [] };
                    parsedGaji.forEach(function(g) {
                        var dep = (g.departemen || 'apotek').toLowerCase();
                        if (!objGaji[dep]) objGaji[dep] = [];
                        objGaji[dep].push(g);
                    });
                    self.configGaji = objGaji;
                } else {
                    // Kalau sudah berbentuk Object { apotek: [], klinik: [] }
                    self.configGaji = parsedGaji;
                }
            } else {
                self.configGaji = { apotek: [], klinik: [], manajemen: [] };
            }

            // Parsing Pengaturan Pembagian (sudah pasti di kolom 'skema')
            if (results[4].data && results[4].data.skema) {
                self.configPembagian = results[4].data.skema;
            } else {
                self.configPembagian = {};
            }

            self.hitungPayroll();
        }).catch(function(err) {
            Utils.toast('Gagal memuat data payroll: ' + err.message, 'error');
            console.error(err);
        });
    },

    hitungPayroll: function() {
        var self = this;
        this.kalkulasiGaji = [];

        // FIX #2: Guard supaya tidak crash jika config kosong
        var cfg = this.configPembagian || {};
        var nilaiRacikConfig = (cfg.racikObat) ? (cfg.racikObat.nilai || 0) : 0;

        var rekapDokter = {}; 
        var totalLabaObat = 0; 
        var totalPembulatan = 0; 
        var totalTuslahKlinik = 0;
        var totalTuslahApotek = 0;
        var totalNilaiRacik = 0; 

        this.dataTransaksi.forEach(function(t) {
            var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.harga_jual); }, 0) : 0;
            var hppObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
            totalLabaObat += (omzetObat - hppObat);
            totalPembulatan += (t.pembulatan || 0);

            if (t.racikan_items && t.racikan_items.length > 0) {
                totalNilaiRacik += (t.racikan_items.length * nilaiRacikConfig);
            }

            if (t.tipe === 'resep_klinik' && t.dokter_id) {
                if (!rekapDokter[t.dokter_id]) rekapDokter[t.dokter_id] = { jmlResepKlinik: 0, jasaResepLuar: 0 };
                rekapDokter[t.dokter_id].jmlResepKlinik += 1;
            } else if (t.tipe === 'resep_luar' && t.dokter_id) {
                if (!rekapDokter[t.dokter_id]) rekapDokter[t.dokter_id] = { jmlResepKlinik: 0, jasaResepLuar: 0 };
                rekapDokter[t.dokter_id].jasaResepLuar += (t.jasa_resep || 0);
            }

            if (t.tindakan_items && t.tindakan_items.length > 0) {
                t.tindakan_items.forEach(function(tin) {
                    var labaTindakan = (tin.harga_jual || 0) - (tin.modal || 0);
                    if (tin.kategori === 'klinik') totalTuslahKlinik += labaTindakan;
                    else if (tin.kategori === 'apotek') totalTuslahApotek += labaTindakan;
                });
            }
        });

        this.dataKaryawan.forEach(function(k) {
            var depKey = (k.departemen || '').toLowerCase();
            
            // 1. Gaji Pokok
            var gaji_pokok = 0;
            var cfgGajiDep = (self.configGaji && self.configGaji[depKey]) ? self.configGaji[depKey] : [];
            var gajiCfg = cfgGajiDep.find(function(g) { return g.karyawan_id === k.id; });
            if (gajiCfg) gaji_pokok = gajiCfg.gaji_pokok || 0;

            // ==========================================
            // FIX #3: ABSENSI MENGGUNAKAN karyawan_id BUKAN user_id
            // ==========================================
            var hadir = self.dataAbsensi.filter(function(a) { 
                return a.karyawan_id === k.id || a.namanya === k.nama; 
            }).length;

            // 2. Jasa Medis (JM) & Jasa Dokter (JD)
            var jasaMedis = 0, jasaDokter = 0, jasaResepLuar = 0;
            if (rekapDokter[k.id]) {
                jasaResepLuar = rekapDokter[k.id].jasaResepLuar || 0;
                if (cfg.resep_klinik && Array.isArray(cfg.resep_klinik)) {
                    var docConfig = cfg.resep_klinik.find(function(dc) { return dc.dokter_id === k.id; });
                    if (docConfig && rekapDokter[k.id].jmlResepKlinik > 0) {
                        jasaMedis = (docConfig.jm || 0) * rekapDokter[k.id].jmlResepKlinik;
                        jasaDokter = (docConfig.jd || 0) * rekapDokter[k.id].jmlResepKlinik;
                    }
                }
            }

            // 3. Bagian Pool Resep
            var bagPoolKlinik = 0, bagPoolApotek = 0;
            if (cfg.resep_klinik && Array.isArray(cfg.resep_klinik)) {
                cfg.resep_klinik.forEach(function(dc) {
                    var rekap = rekapDokter[dc.dokter_id];
                    if (rekap && rekap.jmlResepKlinik > 0) {
                        if (dc.slotKaryKlinik && Array.isArray(dc.slotKaryKlinik)) {
                            var slotKlinik = dc.slotKaryKlinik.find(function(s) { return s.karyawan_id === k.id; });
                            if (slotKlinik) bagPoolKlinik += ((dc.poolKaryKlinik || 0) * rekap.jmlResepKlinik) * (slotKlinik.persen / 100);
                        }
                        if (dc.slotKaryApotek && Array.isArray(dc.slotKaryApotek)) {
                            var slotApotek = dc.slotKaryApotek.find(function(s) { return s.karyawan_id === k.id; });
                            if (slotApotek) bagPoolApotek += ((dc.poolKaryApotek || 0) * rekap.jmlResepKlinik) * (slotApotek.persen / 100);
                        }
                    }
                });
            }

            // 4. Bagian Tuslah/Tindakan
            var bagTuslah = 0;
            var depTindakanKey = (depKey === 'klinik') ? 'tindakanKlinik' : 'tindakanApotek';
            var slotsTindakan = (cfg[depTindakanKey] && Array.isArray(cfg[depTindakanKey])) ? cfg[depTindakanKey] : [];
            var mySlotTindakan = slotsTindakan.find(function(s) { return s.karyawan_id === k.id; });
            if (mySlotTindakan && mySlotTindakan.persen > 0) {
                var totalTuslahDep = (depKey === 'klinik') ? totalTuslahKlinik : totalTuslahApotek;
                bagTuslah = (totalTuslahDep * mySlotTindakan.persen) / 100;
            }

            // 5. Tunjangan Omzet
            var bagOmzet = 0;
            if (cfg.tunjanganOmzet && cfg.tunjanganOmzet.persen > 0 && cfg.tunjanganOmzet.slot) {
                var poolOmzet = (totalLabaObat * cfg.tunjanganOmzet.persen) / 100;
                var mySlotOmzet = cfg.tunjanganOmzet.slot.find(function(s) { return s.karyawan_id === k.id; });
                if (mySlotOmzet) bagOmzet = (poolOmzet * mySlotOmzet.persen) / 100;
            }

            // 6. Uang Makan
            var bagUM = 0;
            if (cfg.uangMakan && cfg.uangMakan.slot) {
                var mySlotUM = cfg.uangMakan.slot.find(function(s) { return s.karyawan_id === k.id; });
                if (mySlotUM) bagUM = (totalPembulatan * mySlotUM.persen) / 100;
            }

            // 7. Transport
            var bagTransport = 0;
            if (cfg.transport && cfg.transport.slot) {
                var mySlotTr = cfg.transport.slot.find(function(s) { return s.karyawan_id === k.id; });
                if (mySlotTr) bagTransport = ((cfg.transport.total || 0) * mySlotTr.persen) / 100;
            }

            // 8. Racik Obat
            var bagRacik = 0;
            if (cfg.racikObat && cfg.racikObat.slot) {
                var mySlotRacik = cfg.racikObat.slot.find(function(s) { return s.karyawan_id === k.id; });
                if (mySlotRacik) bagRacik = (totalNilaiRacik * mySlotRacik.persen) / 100;
            }

            var totalPendapatan = gaji_pokok + jasaMedis + jasaDokter + jasaResepLuar + bagPoolKlinik + bagPoolApotek + bagTuslah + bagOmzet + bagUM + bagTransport + bagRacik;

            self.kalkulasiGaji.push({
                karyawan_id: k.id, nama: k.nama, departemen: k.departemen, jabatan: k.jabatan,
                hariKerja: hadir, gaji_pokok: gaji_pokok, 
                jasaMedis: jasaMedis, jasaDokter: jasaDokter, jasaResepLuar: jasaResepLuar,
                bagPoolKlinik: bagPoolKlinik, bagPoolApotek: bagPoolApotek, bagTuslah: bagTuslah,
                bagOmzet: bagOmzet, bagUM: bagUM, bagTransport: bagTransport, bagRacik: bagRacik,
                tunjanganLain: 0, potKasbon: 0, potWisata: 0,
                totalPendapatan: totalPendapatan, total_gaji: totalPendapatan
            });
        });

        self.renderTable();
    },
    
    renderTable: function() {
        var container = document.getElementById('payroll-content');
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-xs whitespace-nowrap">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-900">Karyawan</th>';
        html += '<th class="px-2 py-3 text-center">Hadir</th>';
        html += '<th class="px-2 py-3 text-right">Gaji Pokok</th>';
        html += '<th class="px-2 py-3 text-right">JM</th>';
        html += '<th class="px-2 py-3 text-right">JD</th>';
        html += '<th class="px-2 py-3 text-right">Pool Klinik</th>';
        html += '<th class="px-2 py-3 text-right">Pool Apotek</th>';
        html += '<th class="px-2 py-3 text-right">Tuslah</th>';
        html += '<th class="px-2 py-3 text-right">Omzet</th>';
        html += '<th class="px-2 py-3 text-right">Uang Makan</th>';
        html += '<th class="px-2 py-3 text-right">Transport</th>';
        html += '<th class="px-2 py-3 text-right">Racik</th>';
        html += '<th class="px-2 py-3 text-right">Tunjangan Lain</th>';
        html += '<th class="px-2 py-3 text-right">Pot. Kasbon</th>';
        html += '<th class="px-2 py-3 text-right">Pot. Wisata</th>';
        html += '<th class="px-3 py-3 text-right text-emerald-600">Total Gaji</th>';
        html += '<th class="px-2 py-3 text-center">Aksi</th>';
        html += '</tr></thead><tbody>';

        if (this.kalkulasiGaji.length === 0) {
            html += '<tr><td colspan="17" class="text-center py-6 text-slate-400">Tidak ada karyawan aktif atau belum ada transaksi bulan ini.</td></tr>';
        } else {
            this.kalkulasiGaji.forEach(function(k, idx) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
                html += '<td class="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-slate-800"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama) + '</p><p class="text-[10px] text-slate-400">' + Utils.escapeHtml(k.departemen || '-') + '</p></td>';
                html += '<td class="px-2 py-2 text-center font-medium">' + k.hariKerja + ' H</td>';
                html += '<td class="px-2 py-2 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(k.gaji_pokok) + '</td>';
                html += '<td class="px-2 py-2 text-right text-blue-600">' + Utils.formatRupiah(k.jasaMedis) + '</td>';
                html += '<td class="px-2 py-2 text-right text-blue-600">' + Utils.formatRupiah(k.jasaDokter) + '</td>';
                html += '<td class="px-2 py-2 text-right text-purple-600">' + Utils.formatRupiah(k.bagPoolKlinik) + '</td>';
                html += '<td class="px-2 py-2 text-right text-teal-600">' + Utils.formatRupiah(k.bagPoolApotek) + '</td>';
                html += '<td class="px-2 py-2 text-right text-purple-600">' + Utils.formatRupiah(k.bagTuslah) + '</td>';
                html += '<td class="px-2 py-2 text-right text-emerald-600">' + Utils.formatRupiah(k.bagOmzet) + '</td>';
                html += '<td class="px-2 py-2 text-right text-orange-600">' + Utils.formatRupiah(k.bagUM) + '</td>';
                html += '<td class="px-2 py-2 text-right text-sky-600">' + Utils.formatRupiah(k.bagTransport) + '</td>';
                html += '<td class="px-2 py-2 text-right text-indigo-600">' + Utils.formatRupiah(k.bagRacik) + '</td>';
                
                html += '<td class="px-1 py-1 text-right"><input type="number" id="tunjangan-' + idx + '" value="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-20 px-1 py-1 border border-slate-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                html += '<td class="px-1 py-1 text-right"><input type="number" id="kasbon-' + idx + '" value="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-20 px-1 py-1 border border-red-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                html += '<td class="px-1 py-1 text-right"><input type="number" id="wisata-' + idx + '" value="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-20 px-1 py-1 border border-red-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                
                html += '<td class="px-3 py-2 text-right font-bold text-emerald-600" id="total-' + idx + '">' + Utils.formatRupiah(k.total_gaji) + '</td>';
                html += '<td class="px-2 py-2 text-center"><button onclick="AppKeuanganPayroll.cetakSlip(' + idx + ')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded">Cetak</button></td>';
                html += '</tr>';
            });
        }

        html += '</tbody></table></div></div>';

        html += '<div class="flex justify-end mt-4">';
        html += '<button onclick="AppKeuanganPayroll.simpanPayroll()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan & Kunci Payroll Bulan Ini</button>';
        html += '</div>';

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    },

    updateTotal: function(idx) {
        var tunjangan = parseFloat(document.getElementById('tunjangan-' + idx).value) || 0;
        var kasbon = parseFloat(document.getElementById('kasbon-' + idx).value) || 0;
        var wisata = parseFloat(document.getElementById('wisata-' + idx).value) || 0;
        
        var k = this.kalkulasiGaji[idx];
        k.tunjanganLain = tunjangan;
        k.potKasbon = kasbon;
        k.potWisata = wisata;
        
        var total_akhir = (k.totalPendapatan + tunjangan) - (kasbon + wisata);
        document.getElementById('total-' + idx).textContent = Utils.formatRupiah(total_akhir);
        k.total_gaji = total_akhir;
    },

    cetakSlip: function(idx) {
        var k = this.kalkulasiGaji[idx];
        var bulan = document.getElementById('filter-bulan-payroll').value;
        var w = window.open('', '', 'width=400,height=600');

        var html = '<html><head><title>Slip Gaji ' + k.nama + '</title>';
        html += '<style>body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:10px;color:#000;} h2,p{text-align:center;margin:0;} table{width:100%;} .right{text-align:right;} .bold{font-weight:bold;} hr{border-top:1px dashed #000;margin:8px 0;}</style></head><body>';
        
        html += '<h2 class="bold">SLIP GAJI KARYAWAN</h2>';
        html += '<p>Aulia Apotek Klinik</p><hr>';
        html += '<table>';
        html += '<tr><td>Periode</td><td>: ' + bulan + '</td></tr>';
        html += '<tr><td>Nama</td><td>: ' + k.nama + '</td></tr>';
        html += '<tr><td>Jabatan</td><td>: ' + k.jabatan + '</td></tr>';
        html += '<tr><td>Hadir</td><td>: ' + k.hariKerja + ' Hari</td></tr>';
        html += '</table><hr>';
        
        html += '<table>';
        html += '<tr><td colspan="2" class="bold">PENDAPATAN:</td></tr>';
        html += '<tr><td>Gaji Pokok</td><td class="right">' + Utils.formatRupiah(k.gaji_pokok) + '</td></tr>';
        if(k.jasaMedis > 0) html += '<tr><td>Jasa Medis (JM)</td><td class="right">' + Utils.formatRupiah(k.jasaMedis) + '</td></tr>';
        if(k.jasaDokter > 0) html += '<tr><td>Jasa Dokter (JD)</td><td class="right">' + Utils.formatRupiah(k.jasaDokter) + '</td></tr>';
        if(k.jasaResepLuar > 0) html += '<tr><td>Jasa Resep Luar</td><td class="right">' + Utils.formatRupiah(k.jasaResepLuar) + '</td></tr>';
        if(k.bagPoolKlinik > 0) html += '<tr><td>Pool Resep Klinik</td><td class="right">' + Utils.formatRupiah(k.bagPoolKlinik) + '</td></tr>';
        if(k.bagPoolApotek > 0) html += '<tr><td>Pool Resep Apotek</td><td class="right">' + Utils.formatRupiah(k.bagPoolApotek) + '</td></tr>';
        if(k.bagTuslah > 0) html += '<tr><td>Tuslah/Tindakan</td><td class="right">' + Utils.formatRupiah(k.bagTuslah) + '</td></tr>';
        if(k.bagOmzet > 0) html += '<tr><td>Tunjangan Omzet</td><td class="right">' + Utils.formatRupiah(k.bagOmzet) + '</td></tr>';
        if(k.bagUM > 0) html += '<tr><td>Uang Makan</td><td class="right">' + Utils.formatRupiah(k.bagUM) + '</td></tr>';
        if(k.bagTransport > 0) html += '<tr><td>Transport</td><td class="right">' + Utils.formatRupiah(k.bagTransport) + '</td></tr>';
        if(k.bagRacik > 0) html += '<tr><td>Racik Obat</td><td class="right">' + Utils.formatRupiah(k.bagRacik) + '</td></tr>';
        if(k.tunjanganLain > 0) html += '<tr><td>Tunjangan Lain</td><td class="right">' + Utils.formatRupiah(k.tunjanganLain) + '</td></tr>';
        html += '</table><hr>';
        
        html += '<table>';
        html += '<tr class="bold"><td>TOTAL PENDAPATAN</td><td class="right">' + Utils.formatRupiah(k.totalPendapatan + k.tunjanganLain) + '</td></tr>';
        html += '</table><hr>';

        if(k.potKasbon > 0 || k.potWisata > 0) {
            html += '<table>';
            html += '<tr><td colspan="2" class="bold">POTONGAN:</td></tr>';
            if(k.potKasbon > 0) html += '<tr><td>Kasbon</td><td class="right">(-) ' + Utils.formatRupiah(k.potKasbon) + '</td></tr>';
            if(k.potWisata > 0) html += '<tr><td>Wisata</td><td class="right">(-) ' + Utils.formatRupiah(k.potWisata) + '</td></tr>';
            html += '</table><hr>';
        }

        html += '<table>';
        html += '<tr class="bold"><td>TOTAL DITERIMA</td><td class="right">' + Utils.formatRupiah(k.total_gaji) + '</td></tr>';
        html += '</table><hr>';
        
        html += '<p>Penerima,</p><br><br><br>';
        html += '<p class="bold">( ' + k.nama + ' )</p>';
        
        html += '<script>window.onload = function() { window.print(); }<\/script>';
        html += '</body></html>';

        w.document.write(html);
        w.document.close();
    },

    simpanPayroll: function() {
        if (!confirm('Kunci & simpan payroll bulan ini? Data tidak bisa diubah setelah dikunci.')) return;

        var bulan = document.getElementById('filter-bulan-payroll').value;
        var self = this;

        window.sb.from('payroll_history').select('id').eq('bulan', bulan).limit(1).then(function(snap) {
            if (snap.data && snap.data.length > 0) {
                Utils.toast('Payroll bulan ' + bulan + ' sudah pernah disimpan!', 'error');
                return;
            }

            var bulkData = self.kalkulasiGaji.map(function(k) {
                return {
                    bulan: bulan,
                    karyawan_id: k.karyawan_id,
                    nama_karyawan: k.nama,
                    departemen: k.departemen,
                    hariKerja: k.hariKerja,
                    gaji_pokok: k.gaji_pokok,
                    jasaMedis: k.jasaMedis,
                    jasaDokter: k.jasaDokter,
                    jasaResepLuar: k.jasaResepLuar,
                    bagPoolKlinik: k.bagPoolKlinik,
                    bagPoolApotek: k.bagPoolApotek,
                    bagTuslah: k.bagTuslah,
                    bagOmzet: k.bagOmzet,
                    bagUM: k.bagUM,
                    bagTransport: k.bagTransport,
                    bagRacik: k.bagRacik,
                    tunjanganLain: k.tunjanganLain,
                    potKasbon: k.potKasbon,
                    potWisata: k.potWisata,
                    total_gaji: k.total_gaji,
                    status: 'paid',
                    diprosesOleh: window.currentUserName || 'Keuangan',
                    created_at: new Date().toISOString()
                };
            });

            return window.sb.from('payroll_history').insert(bulkData);
        }).then(function(res) {
            if (res && res.error) throw res.error;
            if (res) Utils.toast('Payroll berhasil disimpan & dikunci!', 'success');
        }).catch(function(err) {
            console.error(err);
            Utils.toast('Gagal simpan payroll: ' + err.message, 'error');
        });
    }
};
