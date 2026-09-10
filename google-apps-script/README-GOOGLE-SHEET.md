# 📊 Panduan Integrasi Google Sheet & Google Apps Script (Papan Peringkat)

Panduan lengkap untuk mengaktifkan sistem peringkat online gratis (*Leaderboard*) menggunakan Google Sheets dan Google Apps Script untuk seluruh game di **Arcade Mahakam Samarinda**.

---

## 🌟 Cara Kerja Sistem
1. **Google Sheets** berfungsi sebagai database online gratis untuk menampung skor semua pemain.
2. **Google Apps Script (`Code.gs`)** bertindak sebagai REST API gratis tanpa server (*serverless*) untuk menerima POST skor saat game over dan melayani GET data Top 10 pemain.
3. **Web Arcade** menampilkan popup peringkat realtime dan formulir pengiriman skor pemain lengkap dengan asal daerah (Samarinda, Balikpapan, dsb.).

---

## 🚀 Langkah 1: Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet Anda, contohnya: `Arcade Mahakam Leaderboard`.
3. Pada tab lembar kerja pertama, ubah namanya menjadi `Skor_Masuk` (opsional, script akan otomatis membuatnya jika belum ada).
4. Buat 6 kolom header di baris ke-1:
   - **A1**: `Waktu`
   - **B1**: `ID Game`
   - **C1**: `Nama Game`
   - **D1**: `Nama Pemain`
   - **E1**: `Skor`
   - **F1**: `Daerah / Kota`

---

## ⚡ Langkah 2: Pasang Script Backend (`Code.gs`)
1. Di Google Sheets Anda, klik menu **Ekstensi** > **Apps Script** (*Extensions > Apps Script*).
2. Hapus semua kode bawaan yang ada di editor.
3. Buka file [`google-apps-script/Code.gs`](./Code.gs), salin semua isinya, dan tempel ke editor Apps Script.
4. Klik ikon **Simpan** (💾) atau tekan `Ctrl + S`.
5. Beri nama proyek, misalnya: `Leaderboard API`.

---

## 🌐 Langkah 3: Deploy sebagai Web App
1. Di pojok kanan atas Apps Script, klik tombol biru **Deploy** > **Penerapan Baru** (*New deployment*).
2. Pada jenis penerapan (*Select type*), klik ikon roda gigi ⚙️ lalu pilih **Aplikasi Web** (*Web app*).
3. Isi kolom konfigurasi berikut:
   - **Deskripsi**: `Arcade Mahakam Leaderboard v1`
   - **Jalankan sebagai** (*Execute as*): **Saya** (*Me / email akun Anda*)
   - **Siapa yang memiliki akses** (*Who has access*): **Siapa saja** (*Anyone*) ⚠️ *Wajib pilih ini agar game dari Vercel/HP bisa kirim skor!*
4. Klik **Terapkan** (*Deploy*).
5. Jika diminta verifikasi hak akses (*Authorization*):
   - Klik **Tinjau Izin** (*Review permissions*) > Pilih akun Google Anda.
   - Klik **Lanjutan** (*Advanced*) di bagian bawah > Klik **Buka Leaderboard API (tidak aman)** (*Go to project*).
   - Klik **Izinkan** (*Allow*).
6. Salin **URL Aplikasi Web** (*Web App URL*) yang diberikan (berakhir dengan `/exec`).
   - Contoh format URL:
     `https://script.google.com/macros/s/AKfycbx.../exec`

---

## 🔗 Langkah 4: Sambungkan ke Arcade Web
1. Buka file `assets/leaderboard-config.js` di proyek ini.
2. Tempelkan URL yang Anda salin ke variabel `GOOGLE_APPS_SCRIPT_URL`:
   ```javascript
   window.LEADERBOARD_CONFIG = {
     GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/PASTE_URL_ANDA_DISINI/exec",
     DEFAULT_CITY: "Samarinda"
   };
   ```
3. Simpan file, lalu commit dan push ke GitHub:
   ```bash
   git add .
   git commit -m "Update Google Sheet Leaderboard URL"
   git push origin main
   ```
4. **Selesai!** Sekarang semua skor yang dicapai pemain di HP maupun laptop akan otomatis masuk ke Google Sheet Anda secara instan dan peringkat Top 10 langsung tampil di game!

---

## 💡 Fitur Unggulan
- **Fallback Otomatis**: Jika URL Google Script belum diisi, sistem otomatis memakai penyimpanan lokal browser (*localStorage*) sehingga fitur leaderboard tetap bisa langsung dicoba dan tidak akan error.
- **Waktu WITA**: Timestamp otomatis disesuaikan ke zona waktu Samarinda / Kaltim (`Asia/Makassar`).
- **Peringkat Otomatis**: Menghitung ranking posisi pemain secara realtime saat skor dikirim.
