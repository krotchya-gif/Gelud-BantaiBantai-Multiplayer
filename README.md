# Gelud BakuHantam

Gelud BakuHantam adalah arena brawler 3D top-down berbasis Three.js. Project ini mempunyai dua jalur permainan:

- **Solo:** client menjalankan simulasi match, AI, combat, efek, dan PWA secara lokal.
- **Multiplayer:** client Vite terhubung ke server Node.js + Socket.IO. Server menjadi sumber kebenaran untuk room, movement, collision, combat, item, respawn, scoreboard, hasil match, dan reconnect.

Renderer otomatis memakai WebGPU jika tersedia dan jatuh kembali ke WebGL2 jika tidak tersedia atau gagal diinisialisasi.

## Kebutuhan

- Node.js 20.19+ (atau versi Node.js LTS yang lebih baru)
- npm
- Browser modern dengan WebGL2. WebGPU bersifat opsional.

## Menjalankan secara lokal

Install dependency:

~~~sh
npm install
~~~

Jalankan client:

~~~sh
npm run dev
~~~

Client tersedia di http://localhost:5173/.

Untuk menguji multiplayer secara lokal, buat .env.local di root project:

~~~dotenv
VITE_MULTIPLAYER_URL=http://localhost:3000
~~~

Lalu jalankan server di terminal kedua:

~~~sh
npm run dev:server
~~~

Server Socket.IO berjalan di http://localhost:3000 dan health check tersedia di http://localhost:3000/health.

Jika VITE_MULTIPLAYER_URL tidak diisi, client mencoba memakai origin halaman yang sedang dibuka. Ini hanya cocok jika client dan server berada di origin yang sama atau reverse proxy sudah dikonfigurasi.

## Script npm

| Script | Kegunaan |
| --- | --- |
| npm run dev | Vite development server |
| npm run dev:server | Server multiplayer dengan Node watch mode |
| npm run start:server | Menjalankan server multiplayer production |
| npm run build | Build client production ke dist/ dan membuat service worker |
| npm run preview | Menyajikan hasil build secara lokal |
| npm test | Menjalankan seluruh unit/integration test Vitest |
| npm run test:characters | Memverifikasi model dan roster karakter |
| npm run test:watch | Vitest dalam watch mode |

Production preview:

~~~sh
npm run build
npm run preview -- --port 4173
~~~

Folder dist/ adalah artifact client yang dapat diunggah ke hosting statis. Server multiplayer tetap harus berjalan sebagai service Node.js terpisah.

## Multiplayer room

Alur room saat ini:

1. Buka MULTIPLAYER.
2. Host memilih mode dan map saat membuat room.
3. Pemain lain masuk memakai kode room enam karakter.
4. Setiap pemain memilih karakter dan menekan READY.
5. Host dapat mengganti map/mode selama room masih lobby, lalu menekan MULAI MATCH.
6. Minimal dua pemain diperlukan untuk memulai match.

Room disimpan di memory process server. Restart server menghapus room yang sedang ada.

Koneksi yang terputus dapat reconnect memakai session token di sessionStorage selama grace period server. Tombol KELUAR ROOM mengirim room:leave dan menghapus membership room secara eksplisit; match:leave tetap diterima sebagai alias dari pause menu. Setelah keluar, pemain dapat bermain solo tanpa otomatis ditarik kembali ke room lama.

## Data server dan environment

Server membaca environment berikut (server/config.js):

| Variable | Default | Keterangan |
| --- | --- | --- |
| PORT | 3000 | Port HTTP dan Socket.IO server |
| GAME_ORIGIN | http://localhost:5173 | Origin client yang diizinkan; beberapa origin dapat dipisahkan koma |
| TICK_RATE | 30 | Tick authoritative server per detik |
| SNAPSHOT_RATE | 15 | Snapshot state ke client per detik |
| MAX_CATCHUP_STEPS | 5 | Batas catch-up simulation |
| MAX_PLAYERS_PER_ROOM | 8 | Batas pemain per room |
| SERVER_BOTS | 0 | Jumlah bot authoritative, 0–6 |
| ROOM_IDLE_TTL_SECONDS | 60 | Lama room kosong disimpan sebelum dibersihkan |
| RECONNECT_GRACE_SECONDS | 10 | Waktu untuk reconnect session |
| LOG_LEVEL | info | Level logger server |

VITE_MULTIPLAYER_URL adalah variable build-time client, bukan variable runtime server. Untuk production, isi URL publik server sebelum menjalankan build:

~~~dotenv
# .env.local di root project
VITE_MULTIPLAYER_URL=https://multiplayer.example.com
~~~

Jangan commit .env, .env.local, credential Cloudflare, atau token rahasia. Template environment deployment tersedia di deployment/.env.example.

## Map dan biome

Map procedural dibuat berdasarkan mapId dan seed. Generator yang sama dipakai renderer client dan collision authoritative server sehingga spawn point, dinding, air, hazard, dan surface tidak drift.

Map legacy/default:

- open — Open Arena

Map pack berisi 8 biome dengan 3 varian masing-masing, total 24 map:

| Biome | Map |
| --- | --- |
| Greenlands | green-crossroads, river-fort, hedge-ring |
| Dust Valley | dune-cross, dry-canyon, sunken-temple |
| Frozen Fields | frozen-lake, ice-ridge, snow-fort |
| Wild Jungle | river-temple, canopy-maze, waterfall-basin |
| Magma Basin | crater-ring, molten-cross, blackstone-bridges |
| Toxic Swamp | bog-islands, toxic-canals, sunken-ruins |
| Sky Peaks | cliff-pass, temple-steps, twin-peaks |
| Lunar Outpost | crater-grid, lunar-base, gravity-rifts |

Surface gameplay mencakup bush, ice, mud, water/toxic hazard, lava, dan low gravity. Detail layout, warna, landmark, serta generator berada di public/engine/map-biomes.js; definisi shared dan collision berada di shared/maps/MapDefinitions.js dan shared/maps/MapCollision.js.

## Roster karakter

ID karakter yang dipakai room, protocol, dan debug URL:

| ID | Gaya bermain | Fitur utama |
| --- | --- | --- |
| dusty | Shotgunner | Spread jarak dekat |
| ace | Marksman | Burst dan Steady Aim |
| fuse | Demolitionist | Lob bom dan splash explosion |
| titan | Tank | Melee combo dan leap |
| volt | Skirmisher | Burst electric dan chain charge |
| naka | Ninja | Returning shuriken dan Shadow Rush; bonus bush |
| ello | Samurai | Combo katana, guard/parry, dan Iaido |
| syafiah | Archer | Charged arrow dan Arrow Shower; bonus low gravity |

Angka gameplay authoritative ada di shared/data/characters.js. Model, animasi, palette, dan metadata visual berada di public/engine/character-models.js, public/engine/character-roster.js, dan public/engine/brawlers.js.

## Mode match

Client dan room mendukung classic, blitz, dan deathmatch. Deathmatch menggunakan target 50 kill atau batas waktu 5 menit, respawn 5 detik, spawn protection 2 detik, dan power-up cap level 10.

Jalur multiplayer juga mengirim snapshot/interpolation, client prediction/reconciliation, projectile dan area effect, item pickup/use, parry, super, damage/death/respawn, scoreboard, match end, dan rematch ke client.

## Kontrol

Desktop:

~~~text
W A S D       bergerak
Mouse         mengarahkan
Click         basic attack
Space / RMB   tahan untuk membidik Super, lepaskan untuk menembak
F             memakai item
T             mengganti waktu hari
P / Escape    pause atau lanjut
M             mute
~~~

Mobile memakai joystick kiri untuk movement dan joystick kanan untuk aim/auto-aim. Tombol ITEM berada terpisah dari area aim/basic attack. Mode left-handed dapat dipilih dari settings.

## Renderer dan debug URL

Paksa fallback WebGL2:

~~~text
http://localhost:5173/?renderer=webgl
~~~

Parameter debug yang tersedia:

~~~text
?renderer=webgl
?q=low|medium|high|ultra
?bots=auto|easy|normal|hard|brutal
?mode=classic|blitz|deathmatch
?map=<map-id>
?auto=dusty|ace|fuse|titan|volt|naka|ello|syafiah
?seed=<angka>
?time=<jam-desimal>
?speed=1..16
?zoom=<angka>
?ss=0..3
~~~

Contoh:

~~~text
http://localhost:5173/?renderer=webgl&mode=deathmatch&map=green-crossroads&auto=ello&seed=42
~~~

## Struktur project

~~~text
index.html                  shell menu, HUD, dan multiplayer room UI
style.css                   style menu, HUD, dan kontrol mobile
src/bootstrap.js             pilih renderer dan load engine klasik berurutan
src/pwa.js                   registrasi/update service worker
src/multiplayer/             client Socket.IO, lobby, prediction, buffer, session
public/engine/               renderer, world, karakter, combat, efek, HUD, map pack
shared/data/                 data gameplay karakter
shared/maps/                 definisi map, generator bridge, dan collision
shared/protocol/             event, schema, dan protocol version
shared/simulation/           simulation state, movement, combat, hazard
server/                      HTTP health, Socket.IO, room, match runner, bot, security
deployment/                  Dockerfile, Compose server, env template, tunnel config
tests/                       unit, integration, network, server, dan map parity test
~~~

Engine klasik dimuat sebagai script global berurutan karena sebagian gameplay lama masih memakai namespace Three.js global. Modul multiplayer/shared tetap memakai ES modules dan dipakai bersama browser serta Node.js.

## Deployment

### Static client + Node.js server

1. Di mesin build, isi .env.local dengan VITE_MULTIPLAYER_URL publik.
2. Jalankan npm ci lalu npm run build.
3. Upload isi dist/ ke hosting static.
4. Jalankan npm ci --omit=dev dan npm run start:server di VPS, dengan PORT dan GAME_ORIGIN sesuai domain.
5. Pastikan GET /health mengembalikan JSON dengan status: "ok".
6. Letakkan reverse proxy atau Cloudflare Tunnel di depan port server agar client memakai HTTPS/WSS.

### Docker di VPS

deployment/docker-compose.yml saat ini membangun dan menjalankan service game-server pada 127.0.0.1:3200.

~~~sh
cd deployment
cp .env.example .env
# isi GAME_ORIGIN dan environment server di .env
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3200/health
~~~

Cloudflare Tunnel dikelola terpisah dari Compose aktif. Jika cloudflared dijalankan di container yang satu network dengan game-server, target dapat memakai http://game-server:3200. Jika dijalankan langsung di host VPS, gunakan http://127.0.0.1:3200. Credential tunnel harus berada di luar repository.

### Update dari GitHub

Project ini memakai branch main dan remote origin. Alur update VPS:

~~~sh
git pull origin main
npm ci
npm run build
~~~

Untuk deployment Docker, jalankan docker compose up -d --build dari folder deployment setelah pull. Restart process Node.js/container setelah source server berubah. Tidak diperlukan cron atau pemindahan file manual.

Setelah deploy, uji dari dua browser/perangkat: create room, pilih map, join dengan kode, ready, mulai match, gerakkan/aim, gunakan attack/Super/item, keluar room ke solo, lalu uji reconnect dan rematch.

## Verifikasi

~~~sh
npm test
npm run test:characters
npm run build
~~~

Build menulis output ke dist/. Warning ukuran chunk vendor WebGPU dari Vite tidak menghentikan build. Karena production build memakai service worker, lakukan hard refresh atau update PWA jika browser masih menampilkan asset versi lama setelah deploy.
