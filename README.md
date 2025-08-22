# Poling Bakal Calon Kades Suela — Pilkades Serentak 2026

Website poling calon kepala desa **realtime** menggunakan **React (Vite)** + **Supabase**.

## Cara pakai singkat
1. **Install dependencies**  
   ```bash
   npm install
   npm run dev
   ```

2. **Siapkan Supabase**
   - Buat project baru di https://supabase.com
   - Buka **Settings → API**, salin **Project URL** dan **anon public key**
   - Buka **SQL Editor** dan jalankan file `supabase.sql` dalam repo ini

3. **Konfigurasi Environment (Vercel atau lokal)**
   - Buat variabel:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **Build & Deploy**
   ```bash
   npm run build
   # deploy ke vercel atau netlify
   ```

## Catatan "1 HP = 1 Suara"
Aplikasi memberi setiap perangkat `deviceId` (localStorage). Database memaksa `device_id` unik sehingga tidak bisa memilih dua kali dari perangkat yang sama. Untuk tingkat keamanan lebih tinggi gunakan token undangan sekali pakai.