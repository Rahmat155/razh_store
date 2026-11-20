# RAZH STORE — Panduan migrasi Firebase

## Konfigurasi
- Firebase project: `razh-store`
- Firestore: `products/catalog`, `settings/main`, `orders/{id}`
- Admin UID: `MCS06oqU2lYJ1qSwVyeQ6J8nOzO2`
- Cloudinary cloud: `peeh9sup`
- Upload preset: `razh_store_upload` (Unsigned)

## 1. Firestore Rules
Firebase Console → Firestore Database → Rules. Ganti seluruh isi Rules dengan kode berikut lalu Publish:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.uid == "MCS06oqU2lYJ1qSwVyeQ6J8nOzO2";
    }
    match /products/{id} { allow read: if true; allow write: if isAdmin(); }
    match /settings/{id} { allow read: if true; allow write: if isAdmin(); }
    match /orders/{id} {
      allow create: if request.resource.data.keys().hasAll(['app_name','package_name','duration','quantity','unit_price','total_price','status','created_at'])
        && request.resource.data.keys().hasOnly(['app_name','package_name','duration','quantity','unit_price','total_price','status','created_at'])
        && request.resource.data.app_name is string && request.resource.data.app_name.size() <= 100
        && request.resource.data.package_name is string && request.resource.data.duration is string
        && request.resource.data.quantity is int && request.resource.data.quantity >= 1 && request.resource.data.quantity <= 10
        && request.resource.data.unit_price is number && request.resource.data.total_price is number
        && request.resource.data.unit_price >= 0
        && request.resource.data.total_price == request.resource.data.unit_price * request.resource.data.quantity
        && request.resource.data.status == 'pending' && request.resource.data.created_at == request.time;
      allow read, update, delete: if isAdmin();
    }
  }
}

```

## 2. Firebase Authentication
Authentication → Sign-in method → Email/Password harus Enabled. Authentication → Settings → Authorized domains harus berisi `rahmat155.github.io`. Pastikan akun admin yang digunakan mempunyai UID yang sama dengan UID di Rules.

## 3. Cloudinary
Preset `razh_store_upload` harus Unsigned. Batasi format ke JPG/JPEG, PNG, WEBP dan ukuran file jika opsi tersedia. Unsigned preset bersifat publik; jangan unggah dokumen privat. Jangan pernah menaruh Cloudinary API Secret atau Firebase service-account key di website.

## 4. Upload GitHub Pages
Unggah/replace keenam file di bawah ke root repository `razh_store` (bukan folder di dalam repository):
- `index.html`
- `admin.html`
- `backend.js`
- `qris-razh-store.jpg`
- `CATATAN-PERUBAHAN.md`
- `PANDUAN-SETUP-FIREBASE.md`

Penting: `backend.js` wajib ada di root bersama kedua file HTML. Pada GitHub, gunakan Add file → Upload files, pilih keenam file, lalu Commit changes. Jika diminta replace file yang sudah ada, konfirmasi replace.

Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save. Tunggu deployment selesai.

## 5. Login pertama dan katalog kosong
Buka `https://rahmat155.github.io/razh_store/admin.html`. Login dengan akun Firebase admin. Pada login admin pertama, aplikasi akan membuat dokumen awal `products/catalog` berisi `catalog: []` jika belum ada. Setelah itu katalog dapat diisi dari panel admin.

## 6. Tes awal
1. Login admin dan tambahkan satu produk percobaan.
2. Simpan, refresh, dan pastikan produk tetap ada.
3. Tes upload logo/banner/QRIS ke Cloudinary.
4. Tes pesanan dan perubahan status.

## 7. Batas keamanan pesanan
Rules pesanan saat ini memeriksa struktur data dan konsistensi total, tetapi belum memverifikasi harga dengan katalog. Karena itu, jangan aktifkan pembayaran sungguhan sampai pembuatan pesanan dipindahkan ke backend tepercaya yang menghitung harga dari katalog. Jangan menganggap pemeriksaan harga pada browser sebagai proteksi.

## 8. Biaya
GitHub Pages, Firebase, dan Cloudinary memiliki kuota dan ketentuan paket. Pantau pemakaian di dashboard masing-masing; paket gratis tidak berarti tanpa batas atau dijamin gratis selamanya.
