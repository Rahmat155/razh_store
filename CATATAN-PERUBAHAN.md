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

## Audit v3 (audit menyeluruh)
Bug diperbaiki:
- Toko: teks banner berjalan slide ke-2 dan seterusnya kehilangan pemisah baris "•" (regex salah escape di `updateTicker`).
- Toko: ID HTML ganda `qtyNumber` dihapus; kode mati kalkulator ilmiah (`sciFn`, `sciClear`, `sciBackspace`, `scientificEquals`, `setAngleMode`) dan `waLink` yang tak terpakai dihapus.
- Toko: titik navigasi carousel banner hanya 7px; area sentuh diperluas (tampilan tetap).
- Admin: nama paket kembar atau durasi kembar dalam satu paket kini ditolak saat menyimpan (sebelumnya bisa membuat harga ambigu saat pembeli memesan).
Keamanan:
- Admin: pesanan pending/diproses diberi peringatan jika harga satuan tidak wajar atau berbeda dari katalog saat ini.
- Admin: konfirmasi sebelum status pesanan diubah ke Selesai/Dibatalkan (memengaruhi omzet).
- `firestore.rules` baru (opsional, belum aktif): harga > 0 dan <= 1.000.000, panjang teks dibatasi, update pesanan hanya field `status`.
Performa:
- SDK Firebase dipindah ke akhir body dan Google Fonts dibuat non-blocking, sehingga header/skeleton tampil lebih cepat; preconnect ke gstatic dan firestore.
- Katalog terakhir disimpan di perangkat (maks. 7 hari) dan ditampilkan langsung saat dibuka, lalu diperbarui dari server. Harga tetap diverifikasi ke server sebelum pesanan dicatat.
UX/animasi:
- Baris paket bisa dipilih lewat keyboard (Enter/Spasi), fokus terlihat jelas.
- Animasi: pop halus saat paket dipilih, pop pada total pembayaran, stagger kartu lebih panjang. Semua mengikuti `prefers-reduced-motion`.
Fitur baru:
- Toko: "Pesanan terakhir di perangkat ini" (maks. 5, hanya kode/aplikasi/paket/total, tanpa email atau password) dengan tombol cek status via WhatsApp.
- Toko: tombol Hapus riwayat kalkulator.

## Audit v4 (UI/UX hidup + perbaikan bug)
File baru: `ui.js` (toast, dialog konfirmasi/pemberitahuan, tombol loading, efek getar). Wajib di-upload bersama file lain.
Tidak berubah (byte-identik): `backend.js`, `firestore.rules`, `qris-razh-store.jpg`, konfigurasi Firebase/Cloudinary, nomor WhatsApp, data produk bawaan.

Bug diperbaiki:
- Toko: tombol Back HP/browser keluar dari situs saat di detail atau pembayaran (tampilan tidak masuk riwayat). Kini Back kembali satu langkah dan posisi scroll daftar dipulihkan.
- Toko: validasi formulir bantuan tidak pernah berjalan (atribut `required` memunculkan gelembung bawaan). Kini konsisten (toast + fokus).
- Toko: QRIS 403 KB ikut diunduh di setiap kunjungan walau tersembunyi. Kini lazy, lalu diprefetch saat pembeli memilih paket.
- Toko: jam LIVE terus berjalan di tab yang tersembunyi. Kini dijeda.
- Toko: URL QRIS dari database divalidasi (https atau data:image).
- Admin: teks banner/QRIS yang belum disimpan hilang saat pindah tab. Kini dipertahankan.
- Admin: pindah aplikasi saat mengedit membuang perubahan tanpa tanya. Kini ada dialog.
- Admin: ekspor CSV rentan formula injection (nama produk pada pesanan diisi publik). Sel berawalan = + - @ dinetralkan.
- Admin: logout tidak membersihkan state (password, katalog, pesanan di memori). Kini dibersihkan.
- Admin: harga salah ketik (mis. 15 alih-alih 15000) dan desimal kini ditahan/dikonfirmasi.
- Admin: pemuatan pesanan ganda saat login, statistik dibaca ulang tiap buka tab. Kini ada penjaga dan cache 60 detik.

UX baru: seluruh `alert()`/`confirm()` (9 di toko, 18 di admin) diganti toast & dialog; validasi inline dengan getar; spinner pada tombol pesan/login/simpan; indikator sinkronisasi katalog (pembeli) dan status simpan Firebase di header admin ("Belum disimpan / Menyimpan / Tersimpan HH:MM"); transisi antar tampilan & tab; animasi tutup modal; empty state dengan aksi; cari + filter status di daftar produk admin; tombol muat ulang katalog; skeleton pesanan/statistik; kilau pada pesanan yang baru diubah.
