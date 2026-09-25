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
- Semua 10 karakter memiliki dua skill aktif di solo dan multiplayer. Data canonical ada di `shared/data/characters.js`, disamakan dengan roster engine solo, dan hasil multiplayer dieksekusi server secara authoritative. Charge Sukuna memakai fase start/release/cancel; Barrier Gojo siap kembali setelah 5 detik tanpa menerima hit dan memblokir satu damage/CC instance.
- State airborne Titan juga authoritative: gerak dan serangan yang diterima ditahan selama leap, damage/CC mengabaikan Titan di udara, Super meledak saat mendarat, dan sisa durasinya menggerakkan animasi jaringan.
- Input gerak yang datang bersamaan dari WebSocket diantrikan dan dikonsumsi satu per tick authoritative. Nilai `ack` adalah sequence terakhir yang benar-benar diproses, sehingga replay prediction client tetap sejajar ketika paket datang bergerombol.
- Semua karakter, nama display, damage, ammo, cooldown, Super, item, HUD, dan event combat disamakan antara solo dan multiplayer. `Flicker` juga authoritative di server dan tersedia untuk bot.
- Solo Deathmatch memakai 15 bot. Bot memilih fighter hidup terdekat yang dapat dideteksi, termasuk bot lain, mencari jalur saat target tertutup cover biasa, tetap menghormati persembunyian di semak, agresif setelah respawn, dan dapat memakai Flicker. Lineup mencakup seluruh roster sebelum memilih karakter berulang; batasnya maksimal dua bot per karakter. Server multiplayer menyediakan bot authoritative opsional melalui `SERVER_BOTS=0..6` dan juga mengincar fighter terdekat, termasuk bot lain.
- Collision map server dan arena client dibuat dari map ID serta seed yang sama. Paket map berisi 24 arena dari 8 biome dengan 3 varian per biome. Spawn awal dipilih dari sel walkable yang tersebar, bukan mengulang delapan titik lalu menumpuk bot di dekatnya.
- Multiplayer merender karakter dari roster visual yang sama dengan solo. Geometri projectile dan material item memakai cache combat yang sama, mesh projectile dipool untuk mengurangi garbage collection, dan warna efek memakai tipe `Color` canonical. Badan pemain remote mengikuti velocity saat bergerak; arah aim tetap disimpan terpisah untuk serangan dan pose charge/recoil.
- Rig Gojo dan Sukuna memakai builder model yang sama untuk solo dan multiplayer. Ikon PWA kini memakai artwork transparent PNG dari `output/imagegen/bakuhantam-icon-transparent.png`; varian 192, 512, Apple, dan maskable memakai artwork itu dengan alpha transparan dan ruang aman untuk maskable.
- Input touch multiplayer memakai fallback auto-aim yang sama dengan solo saat pemain melakukan tap tanpa perpindahan joystick. Client dan server juga mengganti vektor aim kosong dengan arah aim/facing terakhir, sehingga projectile, melee, shuriken, dan arrow tidak berhenti atau selalu mengarah ke default.
- Auto-aim solo memprioritaskan player/bot hidup dalam jangkauan akuisisi serangan; kotak item hanya menjadi sasaran bila tidak ada fighter terdekat.
- HUD touch saat match tidak lagi menampilkan petunjuk “Drag to Aim”. Pickup dan pemakaian item juga tidak memunculkan toast bawah; slot item, efek, dan suara tetap memberi feedback tanpa menutup kontrol utility.
- Snapshot penuh tetap 15 Hz walaupun event combat ramai. Event projectile, damage, dan efek dikirim melalui frame gameplay terpisah agar traffic tidak melonjak menjadi satu snapshot setiap tick.
- WebGPU menjadi renderer utama di desktop dan mobile. WebGL2 tetap tersedia sebagai fallback hanya jika WebGPU tidak tersedia atau gagal diinisialisasi. Render buffer dijaga minimal HD (1280 × 720) selama resolusi native perangkat mendukungnya. Dua jendela FPS rata-rata di bawah 60 mengurangi partikel dan mematikan dynamic shadow pada WebGL; efek dipulihkan setelah dua jendela di atas 68. Preset High baru berpindah ke Medium jika FPS rata-rata mencapai 30 atau kurang. Preset Low tidak diturunkan lagi dan resolusinya tidak diubah otomatis.
- Pada WebGPU, shadow dinamis dimatikan dan point-light pool dipatok empat sepanjang semua preset kualitas untuk menjaga struktur pipeline tetap stabil. AO/Bloom/post-processing belum tersedia di renderer WebGPU; kontrol tersebut nonaktif.
- PWA single-player, desktop controls, mobile multi-touch, dan mode left-handed tetap dipertahankan.

Fitur yang memang belum termasuk scope saat ini adalah akun/database, progression dan leaderboard global, ranked matchmaking, friend/party system, chat/voice, spectator/replay, Redis atau multi-server orchestration, delta/binary snapshot protocol, Kubernetes/microservices, dan anti-cheat native. Room dan state match masih berada di memory satu process Node.js.

### Protocol aktual

Frame dikirim sebagai JSON melalui satu koneksi WebSocket native. Event client yang tersedia mencakup `session:hello`, `room:create`, `room:join`, `room:leave`, `lobby:update-settings`, `lobby:select-character`, `lobby:ready`, `lobby:start`, `input:move`, `action:attack-start`, `action:attack-release`, `action:skill`, `action:super`, `action:item`, `action:flicker`, `match:leave`, dan `latency:ping`.

Event server yang dikirim mencakup `session:accepted`, `session:recovered`, `room:joined`, `room:state`, `room:error`, `match:init`, `match:snapshot`, `match:event`, `match:end`, dan `latency:pong`. Payload divalidasi dengan schema, action memakai `actionId` untuk deduplication, dan protocol version saat ini adalah `1`.

### Verifikasi aktual

Perintah verifikasi yang tersedia:

```sh
npm run build
npm run test:characters
npm test -- --run tests/server tests/shared
npm test -- --run
```

Verifikasi terbaru, 25 September 2026: `npm run build`, `npm run test:characters`, `npm test -- --run` (25 file, 134 test), dan `git diff --check` lulus. Verifier mencakup 10 rig gameplay + 2 design rig, 20 jalur skill aktif solo, auto-aim fighter lebih dulu dari kotak item, lineup yang mencakup seluruh roster, bot Deathmatch memilih jarak terdekat, Super bertahan saat respawn, floor HD, dan penurunan efek adaptif. Build berisi 27 file dengan total 2.837.682 byte; bundle WebGPU 781,37 kB (212,55 kB gzip), main app 39,52 kB (13,90 kB gzip), dan Character Studio 7,47 kB (3,29 kB gzip). Vite tetap memberi peringatan chunk WebGPU di atas 500 kB. Browser smoke dan pengukuran Poco F6 belum dijalankan ulang setelah perubahan ini. Belum ada uji multiplayer dua perangkat, sentuhan pada ponsel fisik, soak test, atau balance playtest pada run ini.

Pembaruan skill roster, 25 September 2026: seluruh sepuluh karakter memiliki dua skill aktif dengan state dan timer authoritative yang dicerminkan pada solo serta multiplayer. Blue Gojo menarik selama 2,4 detik dan orb/marker memudar pada batas timer yang sama. Infinity Barrier kembali setelah 5 detik dan hanya menahan satu hit instance. Kedua Domain aktif selama 4 detik. Sukuna kini berperan sebagai mage api dengan Dismantle range 10 dan Fuga range 9/13,5. Skill baru mencakup dash/defense, parry, trap, stealth, tembakan penembus cover, chain lightning, smoke concealment, dan recast Kunai. Super Gojo mendapat pose cast dan burst partikel; Malevolent Shrine memasang visual kuil procedural di kedua mode. Kuil disusun dari empat mesh statis gabungan dan tidak memakai dynamic shadow; efek cast Gojo menggunakan effect system yang sudah ada. Renderer menjaga jumlah dynamic light WebGPU tetap stabil. Perbaikan render 25 September menetapkan floor HD dan mengurangi efek sebelum kualitas/resolusi; belum diuji pada Poco F6 secara fisik. Skill 1/2 tersedia di desktop dan touch dengan cooldown/charge serta arah drag touch.

Benchmark sintetis delapan pemain yang tercatat sebelumnya adalah baseline sebelum snapshot trap berkala: snapshot 15 Hz, trafik sekitar 62,5 KB/detik/client saat diam dan 169,2 KB/detik/client saat semua pemain menembak, dengan p95 simulasi plus satu serialisasi snapshot sekitar 0,29 ms. Trafik multiplayer setelah penambahan snapshot trap belum diukur ulang.

Pekerjaan operasional yang masih memerlukan lingkungan deployment adalah mengisi hostname/token Cloudflare, deploy ke VPS, smoke test dua perangkat, dan soak/load test multiplayer. Dokumentasi deployment di atas sudah mengikuti konfigurasi aktual project.

## Renderer

`src/bootstrap.js` selalu memilih WebGPU secara default pada desktop dan mobile, lalu memuat engine gameplay klasik berurutan. Jika API/adapter WebGPU tidak tersedia atau inisialisasinya gagal, bootstrap memuat engine dengan WebGL2 sebagai fallback. Fallback mengganti elemen canvas setelah percobaan WebGPU gagal agar konteks yang gagal tidak dipakai ulang. Parameter debug `?renderer=webgl` tetap dapat memaksa WebGL2 secara eksplisit; tanpa parameter itu, WebGPU diprioritaskan dan WebGL2 hanya menjadi fallback otomatis.

```text
http://localhost:5173/
```

Preset kualitas WebGPU tidak menambah/menghapus lampu atau mengubah shadow caster, karena perubahan tersebut memicu kompilasi pipeline saat match dan sebelumnya dapat membekukan pergantian kualitas. WebGPU memakai empat point light pool tetap dan tidak merender dynamic shadow. Render buffer tidak turun di bawah HD jika perangkat mampu menyediakannya; batas jumlah pixel tidak mengalahkan floor ini. FPS singkat di bawah 60 tidak mengubah resolusi. Setelah dua jendela pengukuran berturut-turut di bawah 60, efek partikel dikurangi dan WebGL mematikan shadow sementara; keduanya pulih setelah dua jendela di atas 68. High baru turun ke Medium pada rata-rata 30 FPS atau kurang, sedangkan Low tetap Low. Perubahan performa otomatis tidak memunculkan toast.

Pengguna melaporkan Poco F6 sebelumnya mencapai 100–120 FPS, lalu turun di bawah 60 FPS pada Low dan freeze saat berpindah ke Medium/High. Laporan tersebut menjadi baseline masalah; perubahan terbaru belum diukur ulang pada perangkat fisik tersebut.

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
  sorcerer-models.js           rig Gojo dan Sukuna untuk kedua mode
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

`shared/data/characters.js` adalah sumber identitas dan aturan gameplay untuk multiplayer; `character-roster.js` memuat padanan data engine solo. Display name yang dipakai kedua mode adalah: `dusty` = **Athallah**, `ace` = **Zeyd**, `fuse` = **Azka**, `titan` = **Einar**, `volt` = **Nopal**, `naka` = **Naka**, `ello` = **Ello**, `syafiah` = **Syafiah**, `gojo` = **Gojo**, dan `sukuna` = **Sukuna**. Multiplayer menyimpan ID lowercase tersebut di protocol, tetapi lobby dan snapshot menampilkan display name.

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
| Gojo | 3000 | 3.25 | Limitless Strike, combo 350 / 350 / 600 | 2.8 | Domain Expansion - Infinite Void, freeze 1.5 dtk, radius 3.8 |
| Sukuna | 4200 | 3.25 | Cleave, melee cone 450, 3 ammo | 3.0 | Domain Expansion - Malevolent Shrine, 8 × 180, radius 4.5 |

### Perubahan combat utama

- **Naka:** Triple Shuriken memakai spread sempit, speed 24, dan return damage 50%. Hit saat shuriken kembali memberi bonus speed 15% selama 1,5 detik. Shadow Rush berdash maksimal 6 unit dan tidak menembus dinding.
- **Ello:** Tidak memakai ammo. Tiga serangan memakai cooldown dan combo reset 0,75 detik, masing-masing memiliki micro-lunge dengan collision. Samurai Poise mengurangi knockback 65%; slash, lunge, guard Iaido, dan dash Iaido memberi imunitas knockback sementara.
- **Syafiah:** Tidak memakai ammo. Draw menginterpolasi damage, range, dan speed dari quick shot ke charged shot; Quickdraw memberi bonus 10% pada timing sekitar 0,70–0,80 detik. Arrow Shower menargetkan area, turun dalam lima wave, dan tidak diblokir atau menghancurkan dinding.
- **Zeyd:** Basic menembakkan 6 projectile dengan damage 200 per projectile dan range 8,2. Basic dan Super menggunakan `noKnockback`; Super tetap 12 × 220, pierce, tetapi tidak lagi menghancurkan dinding.
- **Azka:** Memiliki 5 slot ammo karena seluruh basic attack-nya berupa bom lob. Kapasitas ini berlaku konsisten pada reload, refill item, bot, HUD, dan multiplayer snapshot.
- **Nopal:** Basic menembakkan 3 projectile listrik dengan damage 380 per projectile.
- **Naka:** Triple Shuriken menimbulkan 280 damage per shuriken.
- **Einar:** HP dan damage tetap; speed menjadi 3,25 dan reload menjadi 1 detik.
- **Gojo:** **Infinity Barrier** mengisi ulang 5 detik setelah memblokir satu damage/CC instance; Skill 1 **Cursed Technique Lapse - Blue** menarik selama 2,4 detik; Skill 2 **Cursed Technique Reversal - Red**; Super **Domain Expansion - Infinite Void**, domain aktif 4 detik dan freeze tetap 1,5 detik. Super memutar pose cast dengan burst partikel.
- **Sukuna:** **Reverse Cursed Technique**; Skill 1 **Dismantle** menembus maksimal tiga target sampai range 10; Skill 2 **Fuga - Kamino / Flame Arrow** (tap range 9 atau charge range 13,5); Super **Domain Expansion - Malevolent Shrine** dengan delapan tick dan visual kuil.
- Delapan roster lainnya: Athallah (**Combat Slide**, **Concussive Shell**); Zeyd (**Piercing Bolt**, **Tactical Roll**); Azka (**Sticky Grenade**, **Smoke Screen**); Einar (**Iron Charge**, **Taunt Echo**); Nopal (**Chain Lightning**, **Overcharge Volt**); Naka (**Smoke Bomb**, **Kunai Dash** recast); Ello (**Parry Stance**, **Swift Flash**); Syafiah (**Eagle Eye**, **Caltrops Trap**). Perilaku dan angka tiap skill dicatat di [Roster dan Skill v2](docs/roster-skill-design-v2.md).
- Semua tombol skill menampilkan nama pendek, cooldown/charge, serta state `READY`/`WAIT` di desktop dan touch. Skill aim dapat diarahkan dengan drag touch; Fuga memperlihatkan jangkauan tap atau ledak charge. Efek gameplay diputuskan shared/server dan divisualisasikan oleh rig serta renderer solo/multiplayer yang sama.

Athallah tetap menjadi baseline pass ini. Item `ammo` berubah menjadi **Focus** yang mengisi 20% Super untuk Ello dan Syafiah; karakter lain tetap menerima ammo refill.

Semua karakter memiliki skill **Flicker** untuk menghindar. Cooldown awal 30 detik sehingga tidak langsung siap saat spawn, lalu kembali 30 detik setiap kali digunakan. Cooldown memakai waktu absolut: tidak di-reset saat mati/respawn, berhenti pada satu charge saat sudah penuh, dan tidak dapat stack. Flicker bergerak maksimal 2,2 unit selama 0,18 detik dan memberi invulnerability window 0,22 detik, dengan collision authoritative. Desktop tetap memakai `Shift` dan menampilkan hitung mundur/siap pakai; mobile menampilkan state yang sama pada tombol Flicker. Jika charge penuh tetapi spawn protection atau aksi lain mengunci penggunaan, tombol menampilkan `WAIT`.

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

Deathmatch solo berakhir pada 50 kill atau 5 menit dan dimulai dengan 15 bot. Bot memilih fighter hidup terdekat yang dapat dideteksi, memakai pathfinding saat target terhalang cover biasa, tetap menghormati concealment semak, dan kembali agresif setelah respawn. Lineup mencakup semua karakter sebelum mengulang karakter, dengan batas maksimal dua bot per karakter. Super charge bertahan saat mati/respawn dan hanya habis saat Super digunakan. Mode ini memiliki power-up cap level 10, respawn 5 detik, dan spawn protection 2 detik. Efek permukaan juga berinteraksi dengan brawler, misalnya bonus gerak Naka di semak, traksi Ello di es, dan jangkauan Syafiah di gravitasi rendah.

### Trap acak berkala

Setiap 60 detik simulasi memilih lokasi aman yang walkable secara seeded untuk sebuah trap acak. Area memberi peringatan selama 5 detik sebelum aktif. Trap dapat meledak sekali atau meninggalkan area burning/gas beracun selama 8 detik. Damage, waktu aktif, dan pemilihan target berasal dari simulasi yang sama di solo dan multiplayer; client hanya menggambar penanda peringatan dan efek yang diterima dari simulasi. Trap berkala berlaku di seluruh mode; efek permukaan arena dan gas batas pada Classic/Blitz tetap menjadi sistem terpisah.

## Kontrol

Desktop:

```text
W A S D       bergerak
Mouse         mengarahkan
Click         basic attack
Space / RMB   tahan untuk membidik Super, lepaskan untuk menembak
F             memakai Item 1
G             memakai Item 2
Shift         Flicker untuk menghindar
T             mengganti waktu hari
P / Escape    pause atau lanjut
M             mute
```

Mobile memakai joystick gerak kiri dan joystick aim kanan; drag lalu lepas untuk menembak, atau tap untuk auto-aim. Cluster kanan bawah menyediakan tiga posisi skill melengkung dengan **SUPER** di posisi paling bawah, tanpa tombol serangan duplikat. Baris utility berurutan **Item 1**, **Item 2**, **Flicker**, menggantikan tombol Recall/Regen/Execute pada referensi. Slot item menampilkan item yang dipegang masing-masing; cooldown Flicker menampilkan detik tersisa lalu state siap. Layout yang sama menjadi default untuk skill atau item tambahan. Hanya cluster kontrol gameplay bawah yang mengikuti pola ini; HUD lainnya tetap terpisah. Event touch item dan Flicker diproses terpisah sehingga menekan tombol dengan jari kedua tidak mereset gerakan, bidikan, atau joystick yang sedang aktif. Mode left-handed memindahkan cluster aksi ke sisi lain.

## Parameter debug URL

Parameter yang dibaca engine:

```text
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

WebGPU adalah renderer utama. Perangkat/browser yang tidak menyediakan WebGPU, atau gagal menginisialisasikannya, menjalankan game melalui fallback WebGL2. AO/Bloom tersedia hanya pada jalur WebGL2; kontrolnya dinonaktifkan ketika WebGPU aktif.

Contoh:

```text
http://localhost:5173/?mode=deathmatch&map=open&auto=ello&seed=42
```

## Verifikasi build

```sh
npm test -- --run
npm run test:characters
npm run build
```

Build menulis output ke `dist/`. Ukuran bundle vendor WebGPU Three.js dapat memunculkan peringatan ukuran chunk dari Vite; ini tidak menghentikan build. Sebelum Character Studio ditambahkan pada 24 September 2026, 23 file test dan 92 test lulus, pemeriksaan rig karakter lulus, dan build menghasilkan 22 file berukuran total 3.015.523 byte. Browser desktop berjalan 60 FPS tanpa error console. Layout mobile diperiksa pada viewport 1280 × 540: Attack 112 px dan Super/Skill 1/Skill 2 masing-masing 68 px, mengikuti posisi arc referensi. Pengguna sebelumnya melaporkan Redmi 12C berjalan di atas 40 FPS; laporan itu merupakan observasi sebelum update roster ini dan bukan pengukuran baru. Perubahan ini belum diukur pada Redmi 12C atau Poco F6 secara fisik.

Pembaruan desain Gojo dan Sukuna, 24 September 2026: preview Character Studio diperiksa pada tampak depan, samping, belakang, serta animasi Cast. `npm.cmd run build` lulus dan menghasilkan 27 file dengan total 3.048.666 byte; chunk WebGPU Three.js berukuran 781,37 kB (212,55 kB gzip) dan tetap memunculkan peringatan batas 500 kB dari Vite. `git diff --check` lulus. Suite test dan pemeriksaan rig tidak dijalankan ulang setelah perubahan visual ini.

Pembaruan Character Studio, 24 September 2026: galeri audit memuat delapan roster aktif serta redesign Gojo dan Sukuna dalam 10 kartu thumbnail yang dibuat dari rig Three.js, dan kartu membuka model terpilih di panggung interaktif. `npm.cmd run build` lulus dengan 27 file berukuran 3.053.566 byte; bundle aplikasi 30,65 kB (10,80 kB gzip), studio 7,47 kB (3,29 kB gzip), serta WebGPU Three.js 781,37 kB (212,55 kB gzip; peringatan chunk di atas 500 kB). Screenshot browser memverifikasi panggung duo kembali tampil setelah pembuatan thumbnail, 10 kartu siap, dan seleksi Gojo serta Dusty bekerja. `git diff --check` lulus; test dan pemeriksaan rig tidak dijalankan ulang.

Implementasi stat/skill Gojo dan Sukuna, 25 September 2026: build, 99 test otomatis, test rig/parity, dan pemeriksaan diff lulus. Audit parity juga menyamakan invulnerability serta damage saat mendarat pada Super leap Titan antara solo dan multiplayer, termasuk durasi low-gravity. Lihat angka build dan batas verifikasi terbaru pada [Verifikasi aktual](#verifikasi-aktual). Ikon transparan diregenerasi dari artwork master `output/imagegen/` dan dipakai oleh semua varian ikon PWA.
