# Catatan perubahan RAZH STORE

- Backend data dan autentikasi menggunakan Firebase Authentication + Cloud Firestore.
- Gambar produk/banner/QRIS diunggah ke Cloudinary melalui unsigned upload preset.
- Adapter kompatibilitas di `backend.js` hanya mempertahankan pemanggilan lama di UI; tidak ada Supabase SDK atau koneksi Supabase.
- Login admin pertama membuat dokumen katalog kosong `products/catalog` jika belum tersedia.
- File `backend.js` wajib diunggah bersama `index.html` dan `admin.html` ke root GitHub Pages.
- Validasi harga pesanan sisi server masih diperlukan sebelum menerima pembayaran sungguhan.
