/* RAZH STORE backend v2: Firebase Authentication + Cloud Firestore + Cloudinary.
   Adapter kompatibilitas untuk UI lama (antarmuka mirip supabase-js).
   - Array bersarang dibungkus agar lolos batasan Firestore dan dipulihkan saat dibaca.
   - Pesanan: insert (dengan created_at = serverTimestamp, sesuai Firestore Rules),
     baca daftar, dan update status berdasarkan ID dokumen.
   - Setiap operasi punya batas waktu supaya tombol tidak macet saat koneksi buruk. */
(function () {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyB3av1kZn3Xwn28ow8jTT8ku1Q3-L407-M",
    authDomain: "razh-store.firebaseapp.com",
    projectId: "razh-store",
    storageBucket: "razh-store.firebasestorage.app",
    messagingSenderId: "578443964486",
    appId: "1:578443964486:web:d1f0ef4f59fdc4311ada47",
    measurementId: "G-FF36BK3KPR"
  };
  const ADMIN_UID = "MCS06oqU2lYJ1qSwVyeQ6J8nOzO2";
  const CLOUDINARY_CLOUD_NAME = "peeh9sup";
  const CLOUDINARY_UPLOAD_PRESET = "razh_store_upload";
  const WRAP = "razhFirestoreArrayWrapper";
  const TIMEOUT_MS = 20000;

  const fail = (message, code) => ({ data: null, error: { message: message, code: code || "unknown" } });

  if (!window.firebase || !firebase.initializeApp || !firebase.firestore || !firebase.auth) {
    window.RAZH_BACKEND_ERROR = "Firebase SDK gagal dimuat. Periksa koneksi internet atau pemblokir konten, lalu muat ulang.";
    console.error(window.RAZH_BACKEND_ERROR);
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  } catch (e) {
    window.RAZH_BACKEND_ERROR = "Firebase gagal diinisialisasi: " + (e.message || e);
    console.error(window.RAZH_BACKEND_ERROR);
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const FV = firebase.firestore.FieldValue;
  const FP = firebase.firestore.FieldPath;

  const TABLES = {
    store_catalog: { type: "doc", ref: () => db.collection("products").doc("catalog") },
    store_settings: { type: "doc", ref: () => db.collection("settings").doc("main") },
    store_orders: { type: "col", ref: () => db.collection("orders") }
  };

  function withTimeout(promise, ms, message) {
    let timer;
    const limit = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(Object.assign(new Error(message || "Permintaan ke Firebase terlalu lama. Periksa koneksi internet lalu coba lagi."), { code: "timeout" }));
      }, ms);
    });
    return Promise.race([promise, limit]).finally(function () { clearTimeout(timer); });
  }

  function friendly(e) {
    const code = e && e.code;
    if (code === "permission-denied") return "Ditolak oleh Firestore Rules. Pastikan Rules sudah dipublikasikan dan Anda login sebagai admin.";
    if (code === "unavailable") return "Firestore tidak dapat dihubungi. Periksa koneksi internet.";
    return (e && e.message) || "Permintaan Firestore gagal.";
  }

  // Firestore melarang nama field berformat "__nama__". Pembungkus array versi lama
  // (mis. "__array__") dikenali dan dibuka, nama lain yang terlanjur ada diganti aman.
  const isReserved = function (k) { return /^__.*__$/.test(k); };
  const safeKey = function (k) { return isReserved(k) ? "f_" + (k.replace(/^_+|_+$/g, "") || "x") : k; };
  const clean = function (v) { return JSON.parse(JSON.stringify(v === undefined ? null : v)); };

  function encode(value, insideArray) {
    if (Array.isArray(value)) {
      const encoded = value.map(function (item) { return encode(item, true); });
      return insideArray ? { [WRAP]: encoded } : encoded;
    }
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value).forEach(function (k) { out[safeKey(k)] = encode(value[k], false); });
      return out;
    }
    return value;
  }

  function normalize(value) {
    if (value && typeof value.toDate === "function") return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      const keys = Object.keys(value);
      if (keys.length === 1 && (keys[0] === WRAP || isReserved(keys[0])) && Array.isArray(value[keys[0]])) return value[keys[0]].map(normalize);
      const out = {};
      keys.forEach(function (k) { out[k] = normalize(value[k]); });
      return out;
    }
    return value;
  }

  function decodeDoc(snap) {
    if (!snap.exists) return null;
    const data = normalize(snap.data() || {});
    if (typeof data.catalog === "string") { // kompatibel dengan versi lama (JSON string)
      try { data.catalog = JSON.parse(data.catalog); } catch (e) { console.error("Gagal membaca JSON katalog:", e); data.catalog = []; }
    }
    if (data.id === undefined) data.id = 1;
    return data;
  }

  function project(row, fields) {
    if (!fields || fields === "*") return row;
    const out = { id: row.id };
    fields.split(",").map(function (x) { return x.trim(); }).forEach(function (k) {
      if (row[k] !== undefined) out[k] = row[k];
    });
    return out;
  }

  class Query {
    constructor(table) {
      this.table = table; this.filters = []; this.fields = "*";
      this.sort = null; this.max = null; this.action = "select"; this.payload = null;
    }
    select(fields) { this.fields = fields || "*"; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    order(key, o) { this.sort = [key, !o || o.ascending !== false]; return this; }
    limit(n) { this.max = Number(n); return this; }
    maybeSingle() { return this.exec(true); }
    single() { return this.exec(true); }
    upsert(payload) { this.action = "upsert"; this.payload = payload; return this.exec(false); }
    insert(payload) { this.action = "insert"; this.payload = payload; return this.exec(false); }
    update(payload) { this.action = "update"; this.payload = payload; return this; }
    then(resolve, reject) { return this.exec(false).then(resolve, reject); }

    async exec(one) {
      try {
        const T = TABLES[this.table];
        if (!T) return fail("Koleksi tidak dikenal: " + this.table, "unknown-table");
        return T.type === "doc" ? await this.execDoc(T) : await this.execOrders(T, one);
      } catch (e) {
        console.error("Firestore operation failed:", this.table, e);
        return fail(friendly(e), e && e.code);
      }
    }

    async execDoc(T) {
      const ref = T.ref();
      if (this.action === "upsert" || this.action === "insert") {
        const d = clean(this.payload || {});
        delete d.id;
        await withTimeout(ref.set(encode(d, false), { merge: true }), TIMEOUT_MS);
        return { data: null, error: null };
      }
      if (this.action === "update") return fail("Update dokumen tidak didukung; gunakan upsert.", "unsupported");
      const data = decodeDoc(await withTimeout(ref.get(), TIMEOUT_MS));
      if (!data) return { data: null, error: null };
      for (const f of this.filters) {
        if (String(data[f[0]]) !== String(f[1])) return { data: null, error: null };
      }
      return { data: project(data, this.fields), error: null };
    }

    async execOrders(T, one) {
      const ref = T.ref();

      if (this.action === "insert") {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          return fail("Tidak ada koneksi internet. Pesanan belum tersimpan.", "offline");
        }
        const d = clean(this.payload || {});
        delete d.id;
        d.created_at = FV.serverTimestamp(); // wajib: Rules memeriksa created_at == request.time
        await withTimeout(ref.add(d), TIMEOUT_MS, "Pesanan belum dikonfirmasi server. Periksa koneksi lalu coba lagi.");
        return { data: null, error: null };
      }
      if (this.action === "upsert") return fail("Upsert pesanan tidak didukung.", "unsupported");

      const idFilter = this.filters.find(function (f) { return f[0] === "id"; });
      const others = this.filters.filter(function (f) { return f[0] !== "id"; });

      if (this.action === "update") {
        if (!idFilter || others.length) return fail("Update pesanan harus memakai satu filter id.", "unsupported");
        const docRef = ref.doc(String(idFilter[1]));
        await withTimeout(docRef.update(clean(this.payload)), TIMEOUT_MS);
        const snap = await withTimeout(docRef.get(), TIMEOUT_MS); // baca ulang = verifikasi
        if (!snap.exists) return { data: [], error: null };
        const row = Object.assign({ id: snap.id }, normalize(snap.data()));
        return { data: [project(row, this.fields)], error: null };
      }

      let q = ref;
      this.filters.forEach(function (f) {
        q = f[0] === "id" ? q.where(FP.documentId(), "==", String(f[1])) : q.where(f[0], "==", f[1]);
      });
      if (this.sort) q = q.orderBy(this.sort[0], this.sort[1] ? "asc" : "desc");
      if (this.max) q = q.limit(this.max);
      const snap = await withTimeout(q.get(), TIMEOUT_MS);
      const rows = snap.docs.map(function (d) {
        return project(Object.assign({ id: d.id }, normalize(d.data())), this.fields);
      }, this);
      return { data: one ? (rows[0] || null) : rows, error: null };
    }
  }

  function authError(error) {
    const c = error && error.code;
    let message = (error && error.message) || "Login Firebase gagal.";
    if (c === "auth/network-request-failed") message = "Tidak dapat menghubungi Firebase Authentication. Periksa koneksi, browser, atau pemblokir iklan.";
    else if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") message = "Email atau password Firebase tidak sesuai.";
    else if (c === "auth/invalid-email") message = "Format email tidak valid.";
    else if (c === "auth/too-many-requests") message = "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.";
    else if (c === "auth/user-disabled") message = "Akun ini dinonaktifkan di Firebase.";
    return { message: message, code: c };
  }

  const client = {
    from: function (table) { return new Query(table); },
    auth: {
      signInWithPassword: async function (cred) {
        try {
          const r = await auth.signInWithEmailAndPassword(cred.email, cred.password);
          return { data: { user: { id: r.user.uid } }, error: null };
        } catch (e) { return { data: null, error: authError(e) }; }
      },
      signOut: async function () {
        try { await auth.signOut(); return { error: null }; }
        catch (e) { return { error: { message: e.message, code: e.code } }; }
      },
      getSession: function () {
        return new Promise(function (resolve) {
          let off = null, done = false;
          const finish = function (session, error) {
            if (done) return; done = true;
            if (off) off();
            resolve({ data: { session: session }, error: error || null });
          };
          off = auth.onAuthStateChanged(
            function (u) { finish(u ? { user: { id: u.uid } } : null); },
            function (e) { finish(null, { message: e.message, code: e.code }); }
          );
          if (done && off) off();
        });
      }
    }
  };

  window.supabase = { createClient: function () { return client; } }; // nama dipertahankan demi kompatibilitas UI
  window.RAZH_FIREBASE = { auth: auth, db: db, ADMIN_UID: ADMIN_UID };
  window.RAZH_BACKEND_READY = true;

  window.uploadImageToCloudinary = async function (file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Pilih gambar PNG, JPG, atau WEBP.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload", { method: "POST", body: form, signal: ctrl ? ctrl.signal : undefined });
      let result = {};
      try { result = await response.json(); } catch (e) { /* respons bukan JSON */ }
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error && result.error.message ? "Cloudinary: " + result.error.message : "Upload Cloudinary gagal (HTTP " + response.status + "). Periksa nama cloud dan upload preset.");
      }
      return result.secure_url;
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("Upload terlalu lama dan dibatalkan. Periksa koneksi lalu coba lagi.");
      throw e;
    } finally { clearTimeout(timer); }
  };
})();
