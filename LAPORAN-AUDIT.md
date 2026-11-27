# Laporan Audit RAZH STORE (v3)

## 1. Struktur project
| File | Fungsi |
|---|---|
| `index.html` (124 KB) | Toko pembeli: katalog, banner, pencarian/kategori, detail & paket, pesan, QRIS, WhatsApp, kalkulator, tutorial, klaim garansi |
| `admin.html` (52 KB) | Panel admin: login, produk, banner, QRIS, pesanan, statistik |
| `backend.js` | Adapter Firebase Auth + Firestore + upload Cloudinary (antarmuka mirip supabase-js) |
| `qris-razh-store.jpg` | QRIS bawaan |
| `firestore.rules` (BARU) | Rules diperketat, referensi opsional |
| `*.md` | README, panduan setup, catatan perubahan, laporan ini |

Data: `products/catalog` (array katalog), `settings/main` (banner, QRIS), `orders/{id}`.
Alur nyata: pilih aplikasi → paket → jumlah (1–10) → verifikasi harga ke server → simpan pesanan → QRIS → kirim bukti via WhatsApp.

## 2. File yang diperiksa
index.html, admin.html, backend.js, qris-razh-store.jpg (dilihat), README.md, PANDUAN-SETUP-FIREBASE.md, CATATAN-PERUBAHAN.md.

## 3-5. Bug, penyebab, perbaikan
| # | Bug | Penyebab | Perbaikan |
|---|---|---|---|
| 1 | Teks banner berjalan slide ke-2+ kehilangan pemisah "•" antarbaris | Regex salah escape (`\\s*\\n`) di `updateTicker` | Regex dibetulkan (terbukti lewat tes) |
| 2 | Titik carousel hanya 7px, sulit disentuh | Ukuran visual = area sentuh | Area sentuh diperluas via pseudo-element, tampilan tetap |
| 3 | ID ganda `qtyNumber` | Template merender kontrol jumlah di tiap baris | ID dihapus (tidak dipakai) |
| 4 | Kode mati yang akan error bila terpanggil (`sciFn`, `sciClear`, `sciBackspace`, `scientificEquals`, `setAngleMode`), `waLink` tak terpakai | Sisa kalkulator ilmiah lama | Dihapus; tombol "Hapus" riwayat kalkulator ditambahkan |
| 5 | Admin bisa menyimpan dua paket/durasi bernama sama → harga ambigu saat pembeli memesan | Tidak ada validasi | Ditolak dengan pesan jelas |
| 6 | Baris paket tidak bisa dipilih dengan keyboard | `div` klik tanpa role/tabindex | `role="button"`, `tabindex`, Enter/Spasi, fokus terlihat |
| 7 | Halaman kosong sampai 3 SDK Firebase + font selesai diunduh | Skrip & CSS memblokir render di `<head>` | SDK dipindah ke akhir body, font non-blocking, preconnect |

## 6. Fitur yang berhasil diuji (Chromium, Firebase tiruan + `backend.js` asli)
Katalog 18 produk, pencarian, filter kategori, katalog kosong/tidak ketemu, pilih paket, qty min 1/maks 10, total harga, harga promo (coret + dipakai di pesanan), pesanan tersimpan dengan nilai benar, tanpa duplikat saat kembali lalu pesan ulang, kode pesanan, wajib email/password (email/password tidak masuk Firestore), produk habis/maintenance tidak bisa dipesan, **harga berubah di server → pesanan lama ditolak**, kalkulator refund & biasa, tutorial, modal bantuan, mode offline dengan cache, reduced-motion (durasi animasi), tanpa scroll horizontal di 320–1440px (toko, detail, admin), login admin benar/salah/non-admin, panel hanya setelah login, ubah status + konfirmasi, filter/cari pesanan, ekspor CSV, omzet, tambah/edit/hapus produk dan tampil di toko, banner (URL non-http ditolak), validasi upload (txt, >5MB, svg ditolak), logout, Rules tiruan menolak baca/tulis tanpa admin. Total ±85 pemeriksaan otomatis; satu pemeriksaan placeholder ("carousel tidak auto-geser") tidak menguji apa pun dan tidak dihitung.

## 7. BELUM DAPAT DIUJI
- Firebase sungguhan (Auth, Firestore, Rules asli): sandbox tanpa internet; diuji dengan tiruan memori. Rules yang diperketat belum dijalankan di emulator/Playground.
- Upload Cloudinary sungguhan dan perilaku unsigned preset.
- Pembukaan WhatsApp (hanya isi tautan yang diperiksa), pembayaran QRIS nyata.
- iPhone Safari dan perangkat Android fisik (hanya emulasi Chromium).
- Carousel berhenti otomatis saat reduced-motion (dibaca dari kode, tidak diuji).
- Fitur yang tidak ada di project: keranjang multi-produk, favorit, riwayat/status pesanan dari server, pengaturan nomor WA di admin.

## 8. Masalah keamanan
**Tinggi (butuh persetujuan Anda, tidak saya ubah):**
1. Harga pesanan tidak diverifikasi server. Rules hanya cek total = satuan × jumlah, jadi penyerang bisa menulis pesanan Rp1. Kompensasi yang saya pasang: peringatan di admin. Solusi sungguhan: pecah katalog menjadi dokumen per produk (Rules bisa membandingkan harga) atau Cloud Functions (butuh paket Blaze). Jangan terima pembayaran otomatis sebelum ini.
2. Password pembeli (produk JasPay) dikirim lewat teks WhatsApp. Tidak disimpan di database (bagus), tapi tersimpan di riwayat chat. Pertimbangkan alur lain.

**Sedang:** Rules bisa dispam tanpa batas (pertimbangkan Firebase App Check); batasi API key Firebase dengan HTTP referrer `rahmat155.github.io`; unsigned preset Cloudinary publik (batasi format & ukuran di dashboard; browser tidak bisa menghapus gambar).
**Rendah/dicek aman:** semua output katalog di-escape, URL banner hanya http(s), warna status divalidasi, akses admin dipaksa UID di Rules (cek UID di browser hanyalah kenyamanan), API key Firebase memang publik, tidak ada private key di kode.

## 9. Desain & animasi
Identitas visual tidak diubah. Ditambah: animasi pop saat paket dipilih, pop total pembayaran, stagger kartu hingga 12, cincin fokus keyboard, kartu "Pesanan terakhir". Semua tidak menggeser layout dan mati otomatis pada `prefers-reduced-motion`. Skeleton, shimmer, intro, transisi kartu/modal yang sudah ada dipertahankan.

## 10. Fitur baru
"Pesanan terakhir di perangkat ini" (maks. 5, hanya kode/aplikasi/paket/total, tombol cek status WA), cache katalog 7 hari, peringatan harga di admin, konfirmasi status Selesai/Batal, `firestore.rules`.

## 11. File yang berubah
`index.html`, `admin.html`, `PANDUAN-SETUP-FIREBASE.md`, `CATATAN-PERUBAHAN.md`, baru: `firestore.rules`, `LAPORAN-AUDIT.md`. **Tidak berubah (byte-identik):** `backend.js`, `qris-razh-store.jpg`; data produk bawaan, harga, konfigurasi Firebase/Cloudinary, dan nomor WhatsApp 6285177556287 tidak diubah.

## 12. Rekomendasi berikutnya (butuh persetujuan)
1. Verifikasi harga server-side (poin keamanan 1).
2. **Periksa QRIS:** nama merchant di gambar adalah "Matt Store" (bukan RAZH STORE) dan ada nomor kedua 0831 3926-8391. Mungkin sengaja, tapi pembeli bisa ragu; saya tidak mengubah gambar.
3. Cek status pesanan dari server untuk pembeli (butuh perubahan Rules/struktur data).
4. Notifikasi pesanan baru ke admin (FCM/Cloud Function) — polling akan menghabiskan kuota baca gratis.
5. Statistik memakai dokumen agregat (sekarang membaca semua pesanan setiap dibuka, boros kuota).
6. Keranjang multi-produk, favorit, label Populer/Rekomendasi, stok angka, log aktivitas admin, nomor WA di pengaturan.
7. CSS (62 KB, banyak `!important` dan keyframes ganda) bisa dirapikan; saya tunda karena risiko merusak tampilan yang sudah bagus.

---
> **Pembaruan v4:** laporan lengkap audit terbaru ada di CATATAN-PERUBAHAN.md (bagian "Audit v4"). Hasil tes v4: 138/138 pemeriksaan otomatis lulus pada Firebase tiruan; Firebase/Cloudinary/WhatsApp sungguhan belum diuji.
