# Aulia Apotek Klinik — PWA

Sistem Manajemen Apotek & Klinik berbasis Progressive Web App (PWA) dengan Firebase sebagai backend.

---

## 🚀 Setup GitHub Pages

1. **Buat repository baru** di GitHub (misalnya `aulia-apotek-klinik`).
2. **Upload semua file** ini ke repository.
3. Masuk ke **Settings → Pages → Branch: main / root** → Save.
4. Akses di: `https://<username>.github.io/aulia-apotek-klinik/`

---

## 🔥 Setup Firebase

### 1. Buat Project Firebase
- Buka [https://console.firebase.google.com](https://console.firebase.google.com)
- Klik **Add project** → ikuti langkah-langkahnya.

### 2. Aktifkan Authentication
- Menu **Authentication → Sign-in method → Email/Password → Enable**

### 3. Aktifkan Firestore
- Menu **Firestore Database → Create database → Start in production mode**
- Pilih region terdekat (asia-southeast2 untuk Indonesia)

### 4. Atur Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Buat User Pertama (Admin)
Di Firebase Console → Authentication → Users → Add user:
- Email: `admin@aulia.com`
- Password: (buat password kuat)

Lalu di **Firestore → Collection: `users` → Add document**:
- **Document ID**: UID user yang baru dibuat (copy dari Authentication)
- **Fields**:
  ```
  nama   : "Admin Aulia"     (string)
  role   : "keuangan"        (string)  ← bisa: klinik, apotek, admin, keuangan
  status : "aktif"           (string)
  email  : "admin@aulia.com" (string)
  ```

### 6. Ganti Firebase Config
Edit file `js/app.js` bagian `firebaseConfig` dengan config project Anda:
```js
const firebaseConfig = {
    apiKey:            "...",
    authDomain:        "...",
    projectId:         "...",
    storageBucket:     "...",
    messagingSenderId: "...",
    appId:             "..."
};
```

---

## 👤 Role Akses

| Role       | Akses                                                    |
|------------|----------------------------------------------------------|
| `klinik`   | Dashboard, Klinik, Absensi                               |
| `apotek`   | Dashboard, Apotek, Pengeluaran, Penjualan Harian, Absensi |
| `admin`    | Dashboard, Klinik, Apotek, Laporan, Manajemen, sebagian Pengaturan |
| `keuangan` | Semua menu (akses penuh)                                 |

---

## 🐞 Perbaikan Bug dari Versi Sebelumnya

| Bug | Penyebab | Perbaikan |
|-----|----------|-----------|
| Login gagal tanpa pesan jelas | `auth.js` diload sebelum `app.js`, sehingga `Utils` belum ada | `app.js` kini diload lebih dulu |
| `Utils.toast()` pakai `alert()` yang memblokir proses login | Alert memblokir callback Firebase | Diganti Snackbar non-blocking |
| Sidebar mobile kosong saat dibuka | `renderSidebar` hanya isi desktop | Kini mengisi kedua sidebar sekaligus |
| Pesan error Firebase dalam bahasa Inggris | Tidak ada terjemahan | Ditambahkan terjemahan error ke Bahasa Indonesia |
| Submit form bisa diklik berkali-kali | Tidak ada disable tombol | Tombol disabled + spinner saat proses login |

---

## 📁 Struktur File

```
index.html          ← Shell utama PWA
manifest.json       ← Konfigurasi PWA
sw.js               ← Service Worker
css/style.css       ← Gaya global
js/
  app.js            ← Core: Firebase, Utils, Routing, Auth state
  auth.js           ← Form login (load SETELAH app.js)
  dashboard.js      ← Halaman dashboard per role
  apotek/           ← Modul operasional apotek
  klinik/           ← Modul operasional klinik
  keuangan/         ← Modul keuangan
  laporan/          ← Modul laporan
  manajemen/        ← Modul manajemen karyawan
  pengaturan/       ← Modul pengaturan & konfigurasi
icon-192.png
icon-512.png
```
