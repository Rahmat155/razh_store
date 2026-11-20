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
