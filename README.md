# Gelud BakuHantam

Gelud BakuHantam adalah arena brawler 3D top-down berbasis Three.js. Game berjalan sebagai situs statis/PWA; Vite dipakai untuk development, build, dan preview.

## Menjalankan

```sh
npm install
npm run dev
```

Development server berjalan di `http://localhost:5173/` secara default.

Untuk menjalankan hasil production build:

```sh
npm run build
npm run preview -- --port 4173
```

Folder `dist/` adalah hasil deploy. Isinya dapat diunggah ke hosting statis seperti `public_html` atau Vercel. Node.js hanya dibutuhkan saat development dan build.

## Multiplayer server

Server multiplayer berjalan terpisah dari client static:

```sh
npm run dev:server
```

Default server tersedia di `http://localhost:3000` dan menyediakan `GET /health`. Client multiplayer memakai `VITE_MULTIPLAYER_URL` saat build; salin [.env.example](.env.example) ke `.env` dan isi hostname Cloudflare Tunnel milikmu. Server sekarang menangani lobby, movement prediction/reconciliation, seluruh jalur Super, item pickup/use, respawn, hazard, scoreboard, hasil match, reconnect, dan mode Classic/Blitz.

Untuk mengaktifkan bot authoritative di server (opsional), set `SERVER_BOTS=1..6` pada environment Node. Bot hanya hidup di simulation server sehingga client tetap menerima snapshot dan event yang sama seperti pemain manusia.

Untuk deployment yang direncanakan, jalankan Node.js server di VPS dan teruskan service lokalnya melalui Cloudflare Tunnel. Contoh Docker Compose dan konfigurasi tunnel ada di [deployment/docker-compose.yml](deployment/docker-compose.yml), [deployment/cloudflared/config.yml](deployment/cloudflared/config.yml), serta [deployment/.env.example](deployment/.env.example). Jangan menyimpan token Cloudflare atau credential tunnel di repository.

Urutan deployment VPS:

1. Buat dua hostname di Cloudflare, misalnya `game.example.com` untuk client statis dan `multiplayer.example.com` untuk tunnel server.
2. Buat Cloudflare Tunnel dengan public hostname `multiplayer.example.com` yang mengarah ke service `http://game-server:3000`, lalu salin tokennya.
3. Di VPS, clone/copy project ini, masuk ke folder `deployment`, salin `.env.example` menjadi `.env`, lalu isi `GAME_ORIGIN`, `VITE_MULTIPLAYER_URL`, dan `CLOUDFLARE_TUNNEL_TOKEN`.
4. Jalankan `docker compose up -d --build` dari folder `deployment`. Pastikan `docker compose ps` menunjukkan `game-server` dan `cloudflared` sehat.
5. Cek `https://multiplayer.example.com/health`; respons harus `{"status":"ok"}`.
6. Build client dari mesin build dengan `VITE_MULTIPLAYER_URL=https://multiplayer.example.com npm run build`, lalu upload isi `dist/` ke hosting statis pada `game.example.com`.
7. Dari dua browser/perangkat berbeda, buat room, join memakai kode, ready, mulai match, uji attack/Super/item, putuskan koneksi sebentar, lalu uji reconnect dan rematch.

## Renderer

`src/bootstrap.js` mencoba WebGPU jika tersedia, kemudian memuat engine gameplay klasik secara berurutan. Jika WebGPU tidak tersedia atau gagal diinisialisasi, game memakai WebGL2. Untuk memaksa fallback WebGL2:

```text
http://localhost:5173/?renderer=webgl
```

Jalur WebGPU dan WebGL2 memakai pipeline kualitas yang sama secara umum, tetapi beberapa efek post-processing dan shader lama memiliki padanan lebih sederhana di WebGPU.

## Struktur proyek

```text
index.html                     shell HTML, menu, HUD, dan tombol kontrol
style.css                      seluruh style menu, HUD, dan kontrol mobile
src/bootstrap.js               pemilihan renderer dan pemuatan engine
src/pwa.js                     registrasi service worker dan update PWA
vite.config.js                 konfigurasi Vite dan pembuatan service worker
scripts/pwa-build.js           generator service worker production
scripts/service-worker.js      template/cache service worker
public/engine/
  three-legacy.js              Three.js r186 dan roster baseline
  character-roster.js          data revamp Naka, Ello, Syafiah, Zeyd, Einar
  render-pipeline.js            renderer, kualitas, shadow, dan post-process
  map-biomes.js                data biome dan aturan permukaan arena
  world.js                     arena, collision, cover, dan objek dunia
  brawlers.js                  model, state, input combat, AI-facing state
  combat.js                    proyektil, melee, dash, knockback, dan item
  effects.js                   partikel, impact, trail, gas, dan pencahayaan efek
  interfaces.js                HUD, menu, settings, AI, dan kontrol touch
  main.js                      lifecycle match, input player, dan game loop
```

File engine dimuat sebagai script klasik berurutan karena beberapa kelas Three.js dan gameplay memakai namespace global. `three-legacy.js` menyimpan library serta lima karakter baseline lama; data karakter yang direvisi ditimpa di `character-roster.js`.

## Roster aktual

| Brawler | HP | Speed | Basic | Range | Super / identitas |
| --- | ---: | ---: | --- | ---: | --- |
| Athallah | 3900 | 3.15 | 5 × 330 | 7.0 | 9 × 340, knockback 9, hancurkan dinding |
| Zeyd | 3000 | 3.25 | 6 × 300 | 9.5 | 12 × 300, pierce, tanpa knockback, tidak hancurkan dinding |
| Azka | 2900 | 3.00 | Bom AoE 920 | 7.5 | Bom AoE 2400, knockback 10, hancurkan dinding |
| Einar | 6200 | 3.25 | 4 × 390 | 2.7 | Leap 1000, knockback 11, hancurkan dinding |
| Nopal | 3400 | 3.55 | 3 × 440 | 8.4 | 8 × 310, pierce |
| Naka | 3200 | 3.90 | 3 × 300 shuriken | 7.0 | Shadow Rush 900, dash 6.0, shuriken kembali |
| Ello | 5500 | 3.30 | Combo 550 / 650 / 800 | 2.9 | Iaido 1100 atau 1500 setelah parry |
| Syafiah | 2900 | 3.20 | Charge 650–1050 | 10.0–12.5 | Arrow Shower 5 × 250 |

### Perubahan combat utama

- **Naka:** Triple Shuriken memakai spread sempit, speed 24, dan return damage 50%. Hit saat shuriken kembali memberi bonus speed 15% selama 1,5 detik. Shadow Rush berdash maksimal 6 unit dan tidak menembus dinding.
- **Ello:** Tidak memakai ammo. Tiga serangan memakai cooldown dan combo reset 0,75 detik, masing-masing memiliki micro-lunge dengan collision. Samurai Poise mengurangi knockback 65%; slash, lunge, guard Iaido, dan dash Iaido memberi imunitas knockback sementara.
- **Syafiah:** Tidak memakai ammo. Draw menginterpolasi damage, range, dan speed dari quick shot ke charged shot; Quickdraw memberi bonus 10% pada timing sekitar 0,70–0,80 detik. Arrow Shower menargetkan area, turun dalam lima wave, dan tidak diblokir atau menghancurkan dinding.
- **Zeyd:** Damage basic dan Super menjadi 300 per projectile. Basic dan Super menggunakan `noKnockback`; Super tetap pierce tetapi tidak lagi menghancurkan dinding.
- **Einar:** HP dan damage tetap; speed menjadi 3,25 dan reload menjadi 1 detik.

Athallah, Azka, dan Nopal tetap menjadi baseline pass ini. Item `ammo` berubah menjadi **Focus** yang mengisi 20% Super untuk Ello dan Syafiah; karakter lain tetap menerima ammo refill.

## Mode dan arena

Menu menyediakan Classic, Blitz, dan Deathmatch. Arena default lama adalah `open` (Open Arena), sedangkan `stepped` (Stepped Ruins) mempertahankan layout legacy. Map pack baru menambahkan 8 biome dengan 3 varian per biome, jadi ada 24 arena procedural. Setiap blueprint berukuran 44×44 dan dibuat ulang berdasarkan `seed`.

### Biome dan efek permukaan

| Biome | Arena | Ciri layout | Efek gameplay |
| --- | --- | --- | --- |
| 🌿 Greenlands | Green Crossroads · River Fort · Hedge Ring | crossroads · river · ring | Permukaan seimbang; semak, sungai, dan reruntuhan ringan. |
| 🏜️ Dust Valley | Dune Cross · Dry Canyon · Sunken Temple | crossroads · lanes · courtyard | Friction 0,95 dan vision 1,1; sightline panjang serta canyon. |
| ❄️ Frozen Fields | Frozen Lake · Ice Ridge · Snow Fort | lake · lanes · courtyard | Friction 0,82; permukaan ice memiliki friction 0,25 sehingga licin. |
| 🌴 Wild Jungle | River Temple · Canopy Maze · Waterfall Basin | river · maze · basin | Vision 0,9; semak memberi concealment 1,25 dan flank lebih rapat. |
| 🌋 Magma Basin | Crater Ring · Molten Cross · Blackstone Bridges | ring · lava-cross · river | Lava memberi damage 900 per detik; bridge menjadi choke point. |
| 🐸 Toxic Swamp | Bog Islands · Toxic Canals · Sunken Ruins | islands · river · courtyard | Mud memperlambat ke 0,62; toxic water memberi damage 260 per detik; vision 0,88. |
| 🏔️ Sky Peaks | Cliff Pass · Temple Steps · Twin Peaks | lanes · courtyard · split-center | Vision 1,05; pass sempit, courtyard, dan dua sisi high-ground. |
| 🌙 Lunar Outpost | Crater Grid · Lunar Base · Gravity Rifts | basin · courtyard · split-center | Low gravity memakai multiplier 0,58; move 1,02, friction 0,9, vision 1,1. |

Nama yang dipakai URL adalah slug lowercase, misalnya `green-crossroads`, `frozen-lake`, atau `gravity-rifts`. `map-biomes.js` mengubah recipe menjadi grid, cover, spawn, landmark, dan surface hazard yang dipakai `world.js`.

Deathmatch berakhir pada 50 kill atau 5 menit, memiliki power-up cap level 10, respawn 5 detik, dan spawn protection 2 detik. Efek permukaan juga berinteraksi dengan brawler, misalnya bonus gerak Naka di semak, traksi Ello di es, dan jangkauan Syafiah di gravitasi rendah.

## Kontrol

Desktop:

```text
W A S D       bergerak
Mouse         mengarahkan
Click         basic attack
Space / RMB   tahan untuk membidik Super, lepaskan untuk menembak
F             memakai item
T             mengganti waktu hari
P / Escape    pause atau lanjut
M             mute
```

Mobile memakai joystick kiri dan joystick aim kanan. Tombol **ITEM** berada di atas tombol **SUPER**, di luar area aim/basic attack. Event touch item diproses terpisah sehingga menekan item dengan jari kedua tidak mereset gerakan, bidikan, atau joystick yang sedang aktif. Mode left-handed memindahkan cluster aksi ke sisi kiri.

## Parameter debug URL

Parameter yang dibaca engine:

```text
?renderer=webgl
?q=low|medium|high|ultra
?bots=auto|easy|normal|hard|brutal
?mode=classic|blitz|deathmatch
?map=<arena-key>
?auto=dusty|ace|fuse|titan|volt|naka|ello|syafiah
?seed=<angka>
?time=<jam-desimal>
?speed=1..16
?zoom=<angka>
?ss=0..3
```

Contoh:

```text
http://localhost:5173/?renderer=webgl&mode=deathmatch&map=open&auto=ello&seed=42
```

## Verifikasi build

```sh
npm test -- --run
npm run build
```

Build menulis output ke `dist/`. Ukuran bundle vendor WebGPU Three.js dapat memunculkan peringatan ukuran chunk dari Vite; ini tidak menghentikan build.
