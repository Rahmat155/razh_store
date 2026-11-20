/* RAZH STORE backend: Firebase Authentication + Cloud Firestore + Cloudinary.
   The small window.supabase adapter is retained only so the existing storefront
   code can be migrated without changing its UI/business logic. No Supabase SDK
   or Supabase service is used. */
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

  function fail(message, code) {
    return { data: null, error: { message, code: code || "unknown" } };
  }

  if (!window.firebase || !firebase.initializeApp || !firebase.firestore) {
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

  function tableRef(table) {
    if (table === "store_catalog") return db.collection("products").doc("catalog");
    if (table === "store_settings") return db.collection("settings").doc("main");
    if (table === "store_orders") return db.collection("orders");
    throw new Error("Koleksi tidak dikenal: " + table);
  }

  function normalizeValue(value) {
    if (value && typeof value.toDate === "function") return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value).forEach(k => out[k] = normalizeValue(value[k]));
      return out;
    }
    return value;
  }

  function snapshotData(snapshot) {
    if (!snapshot.exists) return null;
    const data = normalizeValue(snapshot.data() || {});
    if (data.id === undefined) data.id = 1;
    return data;
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.fields = "*";
      this.sort = null;
      this.max = null;
      this.action = "select";
      this.payload = null;
      this.returning = false;
    }
    select(fields) { this.fields = fields || "*"; this.returning = true; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    maybeSingle() { return this.exec(true); }
    single() { return this.exec(true); }
    order(key, options) { this.sort = [key, !options || options.ascending !== false]; return this; }
    limit(count) { this.max = Number(count); return this; }
    upsert(payload) { this.action = "upsert"; this.payload = payload; return this.exec(); }
    insert(payload) { this.action = "insert"; this.payload = payload; return this.exec(); }
    update(payload) { this.action = "update"; this.payload = payload; return this; }

    async exec(one) {
      try {
        const ref = tableRef(this.table);
        const isDocument = this.table === "store_catalog" || this.table === "store_settings";

        if (isDocument) {
          if (this.action === "upsert") {
            const data = Object.assign({}, this.payload);
            delete data.id;
            await ref.set(data, { merge: true });
            return { data: null, error: null };
          }
          const snap = await ref.get();
          const data = snapshotData(snap);
          if (!data) return { data: null, error: null };
          for (const [key, value] of this.filters) if (data[key] !== value) return { data: null, error: null };
          if (this.fields !== "*") {
            const keys = this.fields.split(",").map(x => x.trim());
            const selected = {};
            keys.forEach(key => { if (data[key] !== undefined) selected[key] = data[key]; });
            selected.id = data.id;
            return { data: selected, error: null };
          }
          return { data, error: null };
        }

        if (this.action === "insert") {
          const payload = Object.assign({}, this.payload, {
            created_at: firebase.firestore.FieldValue.serverTimestamp()
          });
          const created = await ref.add(payload);
          return { data: { id: created.id }, error: null };
        }

        let query = ref;
        this.filters.forEach(([key, value]) => { query = query.where(key, "==", value); });
        if (this.sort) query = query.orderBy(this.sort[0], this.sort[1] ? "asc" : "desc");
        if (this.max) query = query.limit(this.max);
        const snap = await query.get();
        let rows = snap.docs.map(doc => Object.assign({ id: doc.id }, normalizeValue(doc.data())));

        if (this.action === "update") {
          for (const row of rows) await ref.doc(row.id).update(this.payload);
          const updated = rows.map(row => Object.assign({}, row, this.payload));
          return { data: this.returning ? updated : null, error: null };
        }
        if (this.fields !== "*") {
          const keys = this.fields.split(",").map(x => x.trim());
          rows = rows.map(row => {
            const selected = { id: row.id };
            keys.forEach(key => { if (row[key] !== undefined) selected[key] = row[key]; });
            return selected;
          });
        }
        return { data: one ? (rows[0] || null) : rows, error: null };
      } catch (error) {
        console.error("Firestore operation failed:", this.table, error);
        return fail(error && error.message ? error.message : "Permintaan Firestore gagal.", error && error.code);
      }
    }
    then(resolve, reject) { return this.exec(false).then(resolve, reject); }
  }

  const client = {
    from: table => new Query(table),
    auth: {
      signInWithPassword: async credentials => {
        try {
          const result = await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
          return { data: { user: { id: result.user.uid } }, error: null };
        } catch (error) {
          let message = error.message || "Login Firebase gagal.";
          if (error.code === "auth/network-request-failed") message = "Tidak dapat menghubungi Firebase Authentication. Periksa koneksi, browser, atau pemblokir iklan.";
          if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") message = "Email atau password Firebase tidak sesuai.";
          return { data: null, error: { message, code: error.code } };
        }
      },
      signOut: async () => {
        try { await auth.signOut(); return { error: null }; }
        catch (error) { return { error: { message: error.message, code: error.code } }; }
      },
      getSession: () => new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(user => {
          unsubscribe();
          resolve({ data: { session: user ? { user: { id: user.uid } } : null }, error: null });
        }, error => resolve({ data: { session: null }, error: { message: error.message, code: error.code } }));
      })
    }
  };

  window.supabase = { createClient: () => client }; // temporary compatibility bridge; backend is Firebase only
  window.RAZH_FIREBASE = { auth, db, ADMIN_UID };
  window.RAZH_BACKEND_READY = true;

  window.uploadImageToCloudinary = async function (file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Pilih gambar PNG, JPG, atau WEBP.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error && result.error.message ? result.error.message : "Upload Cloudinary gagal.");
    return result.secure_url;
  };
})();
