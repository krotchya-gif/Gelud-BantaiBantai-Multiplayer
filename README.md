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

Folder `dist/` adalah hasil deploy. Isinya dapat diunggah ke hosting statis seperti `public_html` atau Vercel. Node.js dibutuhkan saat development/build dan untuk menjalankan server multiplayer.

## Multiplayer WebSocket server

Server multiplayer berjalan terpisah dari client static:

```sh
npm run dev:server
```

Server berjalan pada port `3200` dan menyediakan `GET /health` serta endpoint WebSocket plain di `/ws`. Client multiplayer memakai WebSocket native browser, bukan Socket.IO. Saat production, gunakan URL `wss://` Cloudflare Tunnel, misalnya `wss://multiplayer.example.com/ws`. Cloudflare meneruskan upgrade WebSocket tersebut ke `http://game-server:3200`; tidak perlu membuka port game ke internet.

Untuk local development:

```sh
PORT=3200 GAME_ORIGIN=http://localhost:5173 npm run dev:server
```

Untuk build client, salin [.env.example](.env.example) ke `.env` dan isi `VITE_MULTIPLAYER_URL` dengan URL WebSocket publik. Server menangani lobby, authoritative movement, seluruh jalur basic attack/Super/Flicker, item pickup/use, respawn, hazard, scoreboard, hasil match, reconnect, dan mode Classic/Blitz/Deathmatch. Prediction/reconciliation pemain lokal serta interpolation pemain remote dilakukan di client berdasarkan snapshot authoritative server.

Frame jaringan berbentuk JSON sederhana:

```json
{"type":"event","event":"room:create","payload":{}}
```

Event dari server memakai bentuk yang sama. Operasi yang membutuhkan balasan menambahkan `requestId` dan menerima frame `{"type":"ack",...}`.

Untuk mengaktifkan bot authoritative di server (opsional), set `SERVER_BOTS=0..6` pada environment Node. Bot hanya hidup di simulation server sehingga client tetap menerima snapshot dan event yang sama seperti pemain manusia.

Untuk deployment, jalankan Node.js server di VPS dan teruskan service lokalnya melalui Cloudflare Tunnel. [deployment/docker-compose.yml](deployment/docker-compose.yml) memakai token mode dan menjalankan `cloudflared` sebagai service terpisah; [deployment/cloudflared/config.yml](deployment/cloudflared/config.yml) adalah alternatif untuk named-tunnel mode. Jangan menyimpan token Cloudflare atau credential tunnel di repository.

Urutan deployment VPS:

1. Buat dua hostname di Cloudflare: `game.example.com` untuk client statis dan `multiplayer.example.com` untuk tunnel server.
2. Buat Cloudflare Tunnel dengan public hostname `multiplayer.example.com` yang mengarah ke service `http://game-server:3200`. Aktifkan WebSockets pada konfigurasi Cloudflare, lalu salin tunnel tokennya.
3. Di VPS, clone/copy project ini, masuk ke folder `deployment`, salin `.env.example` menjadi `.env`, lalu isi `GAME_ORIGIN=https://game.example.com` dan `CLOUDFLARE_TUNNEL_TOKEN`.
4. Jalankan `docker compose up -d --build` dari folder `deployment`. Compose akan menjalankan `game-server` di port internal 3200 dan `cloudflared` sebagai koneksi outbound ke Cloudflare. Pastikan `game-server` berstatus healthy dan `cloudflared` running.
5. Cek `https://multiplayer.example.com/health`; respons harus `{"status":"ok"}`. Endpoint WebSocket client adalah `wss://multiplayer.example.com/ws`.
6. Build client dari mesin build dengan `VITE_MULTIPLAYER_URL=wss://multiplayer.example.com/ws npm run build`, lalu upload isi `dist/` ke hosting statis pada `game.example.com`.
7. Dari dua browser/perangkat berbeda, buat room, join memakai kode, ready, mulai match, uji attack/Super/item, putuskan koneksi sebentar, lalu uji reconnect dan rematch.

Image `game-server` membawa dependency production, seluruh source `server/`, simulasi dan map authoritative di `shared/`, serta `public/engine/map-biomes.js` yang diperlukan generator collision. Client statis tetap dibuild terpisah ke `dist/`; Cloudflare Tunnel hanya meneruskan WebSocket ke service Node pada port `3200`.

## Status implementasi aktual

Multiplayer saat ini sudah memakai arsitektur server-authoritative berikut:

```text
Input keyboard/touch/mouse
    ↓
Client prediction dan intent JSON
    ↓ WebSocket native /ws
Node.js server, fixed tick 30 Hz
    ↓
shared GameSimulation + MapCollision
    ↓ fixed snapshot 15 Hz + separate gameplay events
Client reconciliation/interpolation + short-gap extrapolation
    ↓
Three.js renderer, efek, audio, dan HUD
```

Implementasi yang sudah tersedia:

- Room memory-only dengan kode room, host transfer, ready state, character selection, mode/map settings, reconnect grace period, dan rematch-to-lobby.
- Maksimal 8 pemain per room. Join-in-progress tidak didukung setelah match berjalan.
- Classic, Blitz, dan Deathmatch; Deathmatch memakai target 50 kill, batas waktu 5 menit, respawn 5 detik, dan spawn protection 2 detik.
- Shared simulation untuk movement, collision, surface modifier, hazard, projectile, melee, damage, knockback, ammo/reload, Super, item, death, respawn, scoreboard, dan match result.
- Input gerak yang datang bersamaan dari WebSocket diantrikan dan dikonsumsi satu per tick authoritative. Nilai `ack` adalah sequence terakhir yang benar-benar diproses, sehingga replay prediction client tetap sejajar ketika paket datang bergerombol.
- Semua karakter, nama display, damage, ammo, cooldown, Super, item, HUD, dan event combat disamakan antara solo dan multiplayer. `Flicker` juga authoritative di server dan tersedia untuk bot.
- Solo Deathmatch memakai 15 bot. Bot mengunci target setelah spawn, mencari jalur saat target tertutup cover biasa, tetap menghormati persembunyian di semak, agresif setelah respawn, dan dapat memakai Flicker. Server multiplayer menyediakan bot authoritative opsional melalui `SERVER_BOTS=0..6`; jumlah akhirnya tetap dibatasi kapasitas room.
- Collision map server dan arena client dibuat dari map ID serta seed yang sama. Paket map berisi 24 arena dari 8 biome dengan 3 varian per biome. Spawn awal dipilih dari sel walkable yang tersebar, bukan mengulang delapan titik lalu menumpuk bot di dekatnya.
- Multiplayer merender karakter dari roster visual yang sama dengan solo. Geometri projectile dan material item memakai cache combat yang sama, mesh projectile dipool untuk mengurangi garbage collection, dan warna efek memakai tipe `Color` canonical. Badan pemain remote mengikuti velocity saat bergerak; arah aim tetap disimpan terpisah untuk serangan dan pose charge/recoil.
- Input touch multiplayer memakai fallback auto-aim yang sama dengan solo saat pemain melakukan tap tanpa perpindahan joystick. Client dan server juga mengganti vektor aim kosong dengan arah aim/facing terakhir, sehingga projectile, melee, shuriken, dan arrow tidak berhenti atau selalu mengarah ke default.
- Snapshot penuh tetap 15 Hz walaupun event combat ramai. Event projectile, damage, dan efek dikirim melalui frame gameplay terpisah agar traffic tidak melonjak menjadi satu snapshot setiap tick.
- Perangkat coarse/low-end (misalnya perangkat dengan memory sekitar 4 GB) otomatis memakai batas pixel lebih rendah, tanpa AO/bloom dan tanpa projectile trail jaringan untuk mengurangi stutter.
- PWA single-player, WebGPU, fallback WebGL2, desktop controls, mobile multi-touch, dan mode left-handed tetap dipertahankan.

Fitur yang memang belum termasuk scope saat ini adalah akun/database, progression dan leaderboard global, ranked matchmaking, friend/party system, chat/voice, spectator/replay, Redis atau multi-server orchestration, delta/binary snapshot protocol, Kubernetes/microservices, dan anti-cheat native. Room dan state match masih berada di memory satu process Node.js.

### Protocol aktual

Frame dikirim sebagai JSON melalui satu koneksi WebSocket native. Event client yang tersedia mencakup `session:hello`, `room:create`, `room:join`, `room:leave`, `lobby:update-settings`, `lobby:select-character`, `lobby:ready`, `lobby:start`, `input:move`, `action:attack-start`, `action:attack-release`, `action:super`, `action:item`, `action:flicker`, `match:leave`, dan `latency:ping`.

Event server yang dikirim mencakup `session:accepted`, `session:recovered`, `room:joined`, `room:state`, `room:error`, `match:init`, `match:snapshot`, `match:event`, `match:end`, dan `latency:pong`. Payload divalidasi dengan schema, action memakai `actionId` untuk deduplication, dan protocol version saat ini adalah `1`.

### Verifikasi aktual

Perintah verifikasi yang tersedia:

```sh
npm run build
npm run test:characters
npm test -- --run tests/server tests/shared
npm test -- --run
```

Build production dan test karakter berhasil. Suite server/shared berisi 34 test dan lulus. Build menghasilkan 11 script engine, empat icon PNG, manifest, service worker, serta bundle WebGPU; seluruh file tersebut masuk precache service worker. Ukuran build yang terukur adalah `dist/` 2,9 MB, bundle WebGPU 781,37 kB (212,55 kB gzip), dan bundle aplikasi 30,98 kB (10,93 kB gzip). Pengukuran sintetis delapan pemain menunjukkan snapshot tetap 15 Hz, trafik sekitar 62,5 KB/detik/client saat diam dan 169,2 KB/detik/client saat semua pemain menembak, dengan p95 simulasi plus satu serialisasi snapshot sekitar 0,29 ms. Suite penuh berisi 38 test dan seluruhnya lulus ketika bind localhost diizinkan (`38 passed`); pada sandbox terbatas, empat integration test lobby gagal sebelum assertion dengan `listen EPERM` karena bind `127.0.0.1` diblokir.

Pekerjaan operasional yang masih memerlukan lingkungan deployment adalah mengisi hostname/token Cloudflare, deploy ke VPS, smoke test dua perangkat, dan soak/load test multiplayer. Dokumentasi deployment di atas sudah mengikuti konfigurasi aktual project.

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
src/multiplayer/NetworkClient.js WebSocket native, reconnect, dan session token
src/multiplayer/NetworkGameSession.js prediction, reconciliation, dan snapshot buffer
server/network/SocketServer.js WebSocket upgrade `/ws`, lobby, dan event match
server/match/MatchRunner.js    fixed-step authoritative match runner
shared/simulation/             simulasi gameplay yang dipakai server dan client
src/pwa.js                     registrasi service worker dan update PWA
vite.config.js                 konfigurasi Vite dan pembuatan service worker
scripts/pwa-build.js           generator service worker production
scripts/service-worker.js      template/cache service worker
public/engine/
  three-legacy.js              Three.js r186 dan roster baseline
  character-roster.js          visual roster and solo renderer extensions
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

`shared/data/characters.js` adalah sumber identitas dan aturan gameplay untuk multiplayer. Display name yang dipakai kedua mode adalah: `dusty` = **Athallah**, `ace` = **Zeyd**, `fuse` = **Azka**, `titan` = **Einar**, `volt` = **Nopal**, `naka` = **Naka**, `ello` = **Ello**, dan `syafiah` = **Syafiah**. Multiplayer menyimpan ID lowercase tersebut di protocol, tetapi lobby dan snapshot menampilkan display name.

## Roster aktual

| Brawler | HP | Speed | Basic | Range | Super / identitas |
| --- | ---: | ---: | --- | ---: | --- |
| Athallah | 3900 | 3.15 | 5 × 330 | 7.0 | 9 × 340, knockback 9, hancurkan dinding |
| Zeyd | 3000 | 3.25 | 6 × 200 | 8.2 | 12 × 220, pierce, tanpa knockback, tidak hancurkan dinding |
| Azka | 2900 | 3.00 | Bom AoE 920, 5 ammo | 7.5 | Bom AoE 2400, knockback 10, hancurkan dinding |
| Einar | 6200 | 3.25 | 4 × 390 | 2.7 | Leap 1000, knockback 11, hancurkan dinding |
| Nopal | 3400 | 3.55 | 3 × 380 | 8.4 | 8 × 310, pierce |
| Naka | 3200 | 3.90 | 3 × 280 shuriken | 7.0 | Shadow Rush 900, dash 6.0, shuriken kembali |
| Ello | 5500 | 3.30 | Combo 550 / 650 / 800 | 2.9 | Iaido 1100 atau 1500 setelah parry |
| Syafiah | 2900 | 3.20 | Charge 650–1050 | 10.0–12.5 | Arrow Shower 5 × 250 |

### Perubahan combat utama

- **Naka:** Triple Shuriken memakai spread sempit, speed 24, dan return damage 50%. Hit saat shuriken kembali memberi bonus speed 15% selama 1,5 detik. Shadow Rush berdash maksimal 6 unit dan tidak menembus dinding.
- **Ello:** Tidak memakai ammo. Tiga serangan memakai cooldown dan combo reset 0,75 detik, masing-masing memiliki micro-lunge dengan collision. Samurai Poise mengurangi knockback 65%; slash, lunge, guard Iaido, dan dash Iaido memberi imunitas knockback sementara.
- **Syafiah:** Tidak memakai ammo. Draw menginterpolasi damage, range, dan speed dari quick shot ke charged shot; Quickdraw memberi bonus 10% pada timing sekitar 0,70–0,80 detik. Arrow Shower menargetkan area, turun dalam lima wave, dan tidak diblokir atau menghancurkan dinding.
- **Zeyd:** Basic menembakkan 6 projectile dengan damage 200 per projectile dan range 8,2. Basic dan Super menggunakan `noKnockback`; Super tetap 12 × 220, pierce, tetapi tidak lagi menghancurkan dinding.
- **Azka:** Memiliki 5 slot ammo karena seluruh basic attack-nya berupa bom lob. Kapasitas ini berlaku konsisten pada reload, refill item, bot, HUD, dan multiplayer snapshot.
- **Nopal:** Basic menembakkan 3 projectile listrik dengan damage 380 per projectile.
- **Naka:** Triple Shuriken menimbulkan 280 damage per shuriken.
- **Einar:** HP dan damage tetap; speed menjadi 3,25 dan reload menjadi 1 detik.

Athallah tetap menjadi baseline pass ini. Item `ammo` berubah menjadi **Focus** yang mengisi 20% Super untuk Ello dan Syafiah; karakter lain tetap menerima ammo refill.

Semua karakter memiliki skill **Flicker** untuk menghindar. Cooldown awal 30 detik sehingga tidak langsung siap saat spawn, lalu kembali 30 detik setiap kali digunakan. Cooldown memakai waktu absolut: tidak di-reset saat mati/respawn, berhenti pada satu charge saat sudah penuh, dan tidak dapat stack. Flicker bergerak maksimal 2,2 unit selama 0,18 detik dan memberi invulnerability window 0,22 detik, dengan collision authoritative. Desktop memakai `Shift`; mobile memakai tombol kecil di kiri `SUPER`.

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

Deathmatch solo berakhir pada 50 kill atau 5 menit dan dimulai dengan 15 bot. Bot langsung mengunci lawan setelah spawn, memakai pathfinding saat target terhalang cover biasa, tetap menghormati concealment semak, dan kembali agresif setelah respawn. Mode ini memiliki power-up cap level 10, respawn 5 detik, dan spawn protection 2 detik. Efek permukaan juga berinteraksi dengan brawler, misalnya bonus gerak Naka di semak, traksi Ello di es, dan jangkauan Syafiah di gravitasi rendah.

## Kontrol

Desktop:

```text
W A S D       bergerak
Mouse         mengarahkan
Click         basic attack
Space / RMB   tahan untuk membidik Super, lepaskan untuk menembak
F             memakai item
Shift         Flicker untuk menghindar
T             mengganti waktu hari
P / Escape    pause atau lanjut
M             mute
```

Mobile memakai joystick kiri dan joystick aim kanan. Tombol **FLICKER** berada di kiri tombol **SUPER**, sedangkan tombol **ITEM** berada di atas tombol **SUPER**, di luar area aim/basic attack. Event touch item dan Flicker diproses terpisah sehingga menekan tombol dengan jari kedua tidak mereset gerakan, bidikan, atau joystick yang sedang aktif. Mode left-handed memindahkan cluster aksi ke sisi kiri.

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
