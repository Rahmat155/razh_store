-- RAZH STORE: pengerasan RLS. REVIEW DULU, jalankan di Supabase > SQL Editor.
-- Belum diuji terhadap database asli (tidak ada akses jaringan saat dibuat).
-- LANGKAH 0: lihat policy yang sudah ada. Policy di Postgres bersifat OR, jadi policy lama
-- yang terlalu longgar (mis. "update untuk anon") HARUS dihapus agar policy di bawah efektif:
--   select tablename, policyname, roles, cmd, qual, with_check from pg_policies
--   where tablename in ('store_catalog','store_orders','store_settings');

alter table public.store_catalog  enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_orders   enable row level security;

-- Katalog & pengaturan: semua orang boleh baca, hanya admin (UID di bawah) boleh tulis.
drop policy if exists razh_catalog_read  on public.store_catalog;
drop policy if exists razh_catalog_write on public.store_catalog;
create policy razh_catalog_read  on public.store_catalog for select to anon, authenticated using (true);
create policy razh_catalog_write on public.store_catalog for all to authenticated
  using (auth.uid() = 'bb5475d2-7215-46d9-a1ba-5866f4a38991'::uuid)
  with check (auth.uid() = 'bb5475d2-7215-46d9-a1ba-5866f4a38991'::uuid);

drop policy if exists razh_settings_read  on public.store_settings;
drop policy if exists razh_settings_write on public.store_settings;
create policy razh_settings_read  on public.store_settings for select to anon, authenticated using (true);
create policy razh_settings_write on public.store_settings for all to authenticated
  using (auth.uid() = 'bb5475d2-7215-46d9-a1ba-5866f4a38991'::uuid)
  with check (auth.uid() = 'bb5475d2-7215-46d9-a1ba-5866f4a38991'::uuid);

-- Pesanan: pembeli (anon) hanya boleh INSERT pesanan 'pending' yang masuk akal. Baca/ubah/hapus hanya admin.
drop policy if exists razh_orders_insert on public.store_orders;
drop policy if exists razh_orders_admin  on public.store_orders;
create policy razh_orders_insert on public.store_orders for insert to anon, authenticated
  with check (status = 'pending' and quantity between 1 and 10 and unit_price > 0
              and total_price = unit_price * quantity);
create policy razh_orders_admin on public.store_orders for all to authenticated
  using (auth.uid() = 'bb5475d2-7215-46d9-a1ba-5866f4a38991'::uuid)
  with check (auth.uid() = 'bb5475d2-7215-46d9-a1ba-5866f4a38991'::uuid);

-- BATASAN: RLS tidak bisa memastikan unit_price sama dengan harga di katalog. Pembeli yang
-- sengaja memanipulasi request masih bisa mencatat harga lebih murah. Karena pembayaran tetap
-- diverifikasi manual oleh admin lewat bukti transfer, risikonya rendah; solusi penuh: trigger
-- BEFORE INSERT yang mencocokkan harga dengan store_catalog.catalog.
