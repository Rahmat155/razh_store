# Catatan perubahan RAZH STORE

- Backend data dan autentikasi menggunakan Firebase Authentication + Cloud Firestore.
- Gambar produk/banner/QRIS diunggah ke Cloudinary melalui unsigned upload preset.
- Adapter kompatibilitas di `backend.js` hanya mempertahankan pemanggilan lama di UI; tidak ada Supabase SDK atau koneksi Supabase.
- Login admin pertama membuat dokumen katalog kosong `products/catalog` jika belum tersedia.
- File `backend.js` wajib diunggah bersama `index.html` dan `admin.html` ke root GitHub Pages.
- Validasi harga pesanan sisi server masih diperlukan sebelum menerima pembayaran sungguhan.

## Perbaikan backend.js (v2)
- BARU: penyimpanan pesanan (`insert`). Sebelumnya tidak ada, sehingga pesanan gagal disimpan. Sekarang `created_at` diisi serverTimestamp sesuai Firestore Rules.
- DIPERBAIKI: ubah status pesanan memakai ID dokumen Firestore (sebelumnya mencari field `id` yang tidak ada), lalu membaca ulang untuk verifikasi.
- DIPERBAIKI: field `undefined` tidak lagi membuat penyimpanan katalog gagal; kode ganda yang tidak pernah berjalan dihapus.
- BARU: batas waktu 20 detik pada operasi Firestore dan 60 detik pada upload agar tombol tidak macet; pesan error jelas untuk izin ditolak, offline, dan login.
- BARU: tombol "Impor produk bawaan" di admin untuk mengisi katalog Firestore yang kosong.
- BARU: toko menampilkan "Katalog sedang disiapkan" saat katalog kosong; tombol Simpan QRIS memakai unduhan Cloudinary.

## Putaran audit berikutnya
Bug diperbaiki:
- Admin: tombol Tambah/Hapus paket & durasi tidak lagi membuang paket yang namanya masih kosong atau menghapus paket yang salah.
- Admin: jika simpan produk gagal, perubahan yang belum tersimpan dibatalkan dari memori (tidak ikut terbit pada simpan berikutnya).
- Toko: mengetuk baris paket yang sudah dipilih tidak lagi mereset jumlah ke 1.
- Toko: QRIS dari Cloudinary yang gagal dimuat otomatis kembali ke gambar lokal.
- Toko: kalkulator refund menolak harga 0, sisa hari kosong, dan fee di luar 0-1.
- Toko: pesan gagal simpan pesanan menyertakan detail penyebab.
Fitur baru:
- Kode pesanan (#XXXXXX) di halaman bayar, pesan WhatsApp bukti bayar, dan daftar pesanan admin, sehingga bukti transfer mudah dicocokkan.
- Admin: filter status, pencarian (kode/aplikasi), lencana jumlah pesanan Menunggu, ekspor CSV, kartu omzet bulan ini dan pesanan hari ini.
- Admin: peringatan sebelum menutup halaman jika ada perubahan produk belum tersimpan, dan konfirmasi jika nama produk kembar.
- Toko: katalog diperbarui otomatis saat tab dibuka kembali (maks. tiap 3 menit), tombol "Tanya admin via WhatsApp" di detail produk, favicon, deskripsi situs. Admin diberi noindex.
Dihapus dari paket: supabase_rls_hardening.sql (sudah tidak dipakai setelah migrasi ke Firebase).
