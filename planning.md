# Planning Implementasi Multiplayer Gelud BakuHantam

Dokumen ini adalah rencana kerja implementasi multiplayer berdasarkan `multiplayer.md` dan kondisi project saat ini. Dokumen ini tidak menjalankan perubahan arsitektur atau gameplay. Setiap fase harus selesai dan lolos acceptance criteria sebelum fase berikutnya dimulai.

## Status Implementasi

Progress saat ini:

- Fase 0: baseline build selesai; regression manual lengkap masih berlanjut.
- Fase 1–2: shared protocol, network config, character movement data, math, seeded RNG, fixed-step utility, dan map collision dasar sudah dibuat.
- Fase 3: simulation state dan movement system dasar sudah dibuat.
- Fase 6: room/lobby server skeleton, Socket.IO, schema validation, rate limiter, logger, serta health endpoint sudah dibuat.
- Fase 7: lobby client create/join, room code copy, player list, character selection, ready, settings, dan host start sudah dibuat.
- Fase 8: vertical slice movement 30 Hz dan snapshot 15 Hz sudah tersambung serta diuji melalui integration test; StateBuffer, prediction, reconciliation, remote entity adapter, dan bridge awal ke renderer sudah dibuat.
- Fase 10: combat server-side sudah mencakup projectile returning, melee combo, charge shot, delapan jalur Super, parry/iaido window, area wave, damage/shield, death, item pickup/use, serta validasi action id.
- Fase 13: reconnect token, duplicate-session guard, disconnected state, dan grace period server sudah dibuat serta diuji untuk lobby.
- Fase 11–12: snapshot scoreboard, respawn, hazard gas/lava, match end, rematch-to-lobby, visual projectile/item, remote state, dan mode Classic/Blitz sudah dihubungkan.
- Fase 13: reconnect token, duplicate-session guard, disconnected state, grace period, dan recovery snapshot saat match sudah dibuat.
- Fase 14–15: fixed-step accumulator, optional server bot, map collision semantic, Dockerfile, Compose, dan Cloudflare Tunnel template sudah dibuat.
- Deployment: template siap untuk VPS + Cloudflare Tunnel; belum dideploy karena token tunnel, hostname, dan akses VPS belum tersedia di workspace.

Yang tersisa: verifikasi manual lintas perangkat/browser, soak/load test VPS, konfigurasi secret Cloudflare, dan membuat baseline Git/rollback setelah deployment.

## 1. Sasaran

Membuat multiplayer real-time berbasis Room ID untuk 2–8 pemain dengan server authoritative, sambil mempertahankan:

- single-player;
- seluruh delapan karakter dan mekaniknya;
- Classic, Blitz, dan Deathmatch;
- renderer WebGPU serta fallback WebGL2;
- PWA dan offline single-player;
- desktop controls dan mobile multi-touch;
- map serta biome yang sudah ada.

Target rilis multiplayer pertama:

- create/join room menggunakan kode enam karakter;
- lobby, pemilihan karakter, ready state, dan host start;
- Deathmatch 2–8 pemain;
- movement prediction, reconciliation, dan remote interpolation;
- combat, Super, item, death, respawn, scoreboard, result, dan rematch;
- reconnect singkat untuk koneksi mobile yang terputus;
- server authoritative untuk semua state gameplay.

## 2. Kondisi Awal Project

Yang sudah tersedia:

- revamp Naka, Ello, dan Syafiah;
- Naka Triple Shuriken dan Shadow Rush;
- Ello tanpa ammo, combo, micro-lunge, dan Iaido;
- Syafiah tanpa ammo, variable draw, Quickdraw, dan Arrow Shower;
- Ammo menjadi Focus untuk karakter tanpa ammo;
- tombol item mobile terpisah dan mendukung multi-touch;
- generator map procedural berbasis seed;
- tiga mode permainan dan delapan karakter;
- PWA, WebGPU, serta WebGL2 fallback.

Kondisi yang harus diubah secara bertahap:

- seluruh runtime gameplay masih berjalan di browser;
- gameplay, Three.js, efek, audio, HUD, dan DOM masih saling terhubung;
- posisi karakter masih bergantung pada object Three.js;
- game loop masih memakai variable frame delta;
- beberapa keputusan gameplay masih memakai `Math.random()`;
- belum ada `shared/`, `server/`, `tests/`, atau client networking;
- belum ada dependency Socket.IO, validator payload, logger, dan test runner;
- folder workspace saat diperiksa belum menjadi Git repository.

Catatan baseline: angka dan mekanik yang dipakai harus mengikuti kode terbaru. Perubahan Zeyd/Ace dan Einar/Titan yang sudah ada di kode tetap dipertahankan meskipun tidak termasuk target awal `update.md`.

## 3. Batas Scope

Termasuk dalam MVP:

- guest player tanpa akun;
- room disimpan di memory server;
- satu process Node.js menjalankan banyak room;
- satu room dimiliki satu process;
- full snapshot JSON sebelum optimasi delta;
- maksimum delapan human player;
- join-in-progress ditolak;
- reconnect grace period;
- Bahasa Indonesia untuk error koneksi dan lobby.

Belum dikerjakan dalam MVP:

- akun, database, progression, dan leaderboard global;
- ranked matchmaking;
- friend/party system;
- chat dan voice chat;
- spectator dan replay;
- Redis dan multi-server orchestration;
- delta/binary snapshot protocol;
- Kubernetes atau microservices;
- anti-cheat native;
- join-in-progress.

Deployment project ini menggunakan VPS milik user di belakang Cloudflare Tunnel:

```text
Static client / PWA
    ↓ HTTPS
Hosting client

Cloudflare Tunnel
    ↓ outbound tunnel dari VPS
Node.js multiplayer server :3000
```

VPS tidak perlu membuka inbound port game ke internet. Node server bind ke service lokal, lalu `cloudflared` meneruskan hostname publik ke port tersebut. Cloudflare menyediakan HTTPS/WSS pada hostname publik. Nginx hanya opsional untuk routing lokal dan bukan dependency MVP.

## 4. Prinsip Arsitektur

Alur target:

```text
Input player
    ↓
Client prediction
    ↓
Socket.IO intent/input
    ↓
Authoritative Node.js server
    ↓
Shared pure simulation
    ↓
Snapshot + gameplay events
    ↓
Client reconciliation/interpolation
    ↓
Three.js render + audio + HUD
```

Aturan utama:

- client mengirim input dan intent, bukan posisi, damage, HP, atau hasil hit;
- server menentukan movement, collision, hit, damage, item, Super, death, dan result;
- gameplay simulation tidak boleh mengimpor Three.js, DOM, Canvas, AudioContext, atau kode PWA;
- visual effect boleh acak di client, tetapi random yang memengaruhi gameplay harus memakai seeded RNG;
- single-player dan multiplayer memakai aturan gameplay yang sama;
- perubahan dilakukan bertahap agar game tetap dapat dimainkan pada setiap fase.

## 5. Struktur Target

```text
src/
  multiplayer/
    NetworkClient.js
    NetworkGameSession.js
    LobbyController.js
    StateBuffer.js
    Prediction.js
    Reconciliation.js
    RemoteEntityManager.js
    NetworkDebug.js

shared/
  config/
    gameplay.js
    network.js
    modes.js
  data/
    characters.js
    items.js
    maps.js
  simulation/
    GameSimulation.js
    SimulationState.js
    MovementSystem.js
    CollisionSystem.js
    CombatSystem.js
    ProjectileSystem.js
    ItemSystem.js
    RespawnSystem.js
    MatchSystem.js
    HazardSystem.js
    BotSystem.js
  maps/
    MapGenerator.js
    MapCollision.js
    SurfaceRules.js
  protocol/
    version.js
    events.js
    schemas.js
    snapshot.js
  utils/
    math.js
    rng.js
    ids.js
    fixed-step.js

server/
  index.js
  config.js
  http/health.js
  network/
    SocketServer.js
    ConnectionRegistry.js
    handlers/
      room.js
      lobby.js
      input.js
      match.js
  rooms/
    Room.js
    RoomManager.js
    RoomCode.js
  match/
    MatchRunner.js
    SnapshotBuilder.js
    PlayerSession.js
    ReconnectRegistry.js
  security/
    RateLimiter.js
    PayloadValidator.js
    NameSanitizer.js
  observability/logger.js

tests/
  shared/
  server/
  integration/

deployment/
  Dockerfile
  docker-compose.yml
  cloudflared/config.yml
```

Struktur ini adalah target bertahap. Folder dan file hanya dibuat saat fase yang memerlukannya dimulai.

## 6. Urutan Pengerjaan

### Fase 0 — Baseline dan Regression Gate

Tujuan: memastikan update karakter menjadi baseline yang stabil sebelum arsitektur gameplay dipisahkan.

Pekerjaan:

1. Jalankan production build.
2. Catat baseline delapan karakter, mode, map, item, dan kontrol.
3. Uji manual mekanik yang berubah di `update.md`.
4. Uji WebGPU dan WebGL2 fallback.
5. Uji PWA production build dan offline single-player.
6. Pastikan mobile item button dapat digunakan ketika movement atau aim masih aktif.
7. Siapkan source-control baseline sebelum perubahan besar. Karena workspace belum memiliki `.git`, keputusan membuat repository/branch dilakukan sebelum implementasi dimulai.

Acceptance criteria:

- `npm run build` berhasil;
- tidak ada console error baru pada smoke test;
- Naka, Ello, Syafiah, Focus, dan mobile item berfungsi;
- Classic, Blitz, dan Deathmatch dapat dimulai serta diselesaikan;
- hasil baseline dicatat agar regression dapat dibandingkan.

### Fase 1 — Shared Static Data

Tujuan: membuat satu sumber data gameplay yang dapat dipakai browser dan Node.js.

Pekerjaan:

1. Ekstrak definisi delapan karakter ke `shared/data/characters.js`.
2. Ekstrak mode dan aturan match ke `shared/config/modes.js`.
3. Ekstrak definisi item dan surface rules.
4. Pisahkan metadata visual dari angka gameplay bila diperlukan.
5. Buat compatibility adapter agar classic scripts tetap dapat membaca data melalui global yang sekarang dipakai.
6. Ubah `character-roster.js` menjadi adapter/consumer, bukan sumber angka kedua.

Acceptance criteria:

- hanya ada satu sumber angka gameplay;
- data shared bisa diimpor oleh browser dan Node.js;
- shared modules tidak menyentuh DOM atau Three.js;
- seluruh karakter dan mode tetap sama dengan baseline;
- production build tetap berhasil.

### Fase 2 — Pure Math, RNG, Map Blueprint, dan Collision

Tujuan: memisahkan perhitungan gameplay dari renderer.

Pekerjaan:

1. Buat utility vector/matematika X/Z tanpa `THREE.Vector3`.
2. Implementasikan seeded RNG dan hilangkan `Math.random()` dari keputusan authoritative.
3. Pisahkan generator blueprint map dari `window.GBH_MAP_PACK`.
4. Jadikan map ID + seed menghasilkan blueprint yang sama di browser dan Node.js.
5. Buat collision representation ringan untuk wall, boundary, surface, hazard, dan spawn.
6. Gunakan circle/AABB/segment sweep sesuai jenis collision.
7. Pertahankan visual map construction di client.

Acceptance criteria:

- map ID dan seed yang sama menghasilkan checksum blueprint yang sama;
- collision map server sama dengan layout client;
- pure modules dapat dites tanpa browser;
- gameplay-relevant RNG tidak memakai `Math.random()`;
- visual-only randomness boleh tetap berada di client.

### Fase 3 — Pure Simulation State

Tujuan: membuat state gameplay yang tidak menyimpan Mesh atau object renderer.

Pekerjaan:

1. Buat `SimulationState` untuk match, player, projectile, box, item, dan hazard.
2. Gunakan stable entity ID dari simulation.
3. Buat `MovementSystem`, `CollisionSystem`, dan `HazardSystem`.
4. Pindahkan HP, ammo, cooldown, Super charge, kill/death, respawn, dan status effect ke state murni.
5. Pisahkan aturan difficulty/bot dari pemeriksaan `isPlayer`.
6. Buat serialisasi state yang aman untuk snapshot.

Acceptance criteria:

- simulation state tidak mengandung Three.js object;
- player state dapat dibuat, di-update, dan diserialisasi di Node.js;
- movement dan hazard sama dengan baseline dalam toleransi yang ditentukan;
- invalid number seperti `NaN`/`Infinity` tidak merusak simulation.

### Fase 4 — Fixed Local Simulation dan GameSession

Tujuan: menjalankan simulation baru secara lokal lebih dulu sebelum networking.

Pekerjaan:

1. Implementasikan fixed tick 30 Hz dengan accumulator dan maksimal lima catch-up tick.
2. Buat interface `GameSession`.
3. Buat `LocalGameSession` yang menjalankan `GameSimulation` di browser.
4. Ubah renderer, HUD, dan input agar membaca/menulis melalui session.
5. Tambahkan adapter sementara bagi classic scripts agar migrasi tidak menjadi rewrite satu kali.
6. Biarkan render mengikuti refresh rate device.

Acceptance criteria:

- single-player berjalan melalui `LocalGameSession`;
- renderer tetap independen dari tick simulation;
- hasil gameplay tidak berubah karena refresh rate 60/90/120 Hz;
- WebGPU, WebGL2, PWA, desktop, dan mobile tetap bekerja.

### Fase 5 — Event-Based Combat dan Effects Separation

Tujuan: menjadikan combat dapat berjalan di server tanpa efek visual/audio.

Pekerjaan:

1. Pindahkan attack, projectile, melee, damage, item, death, dan respawn ke pure systems.
2. Simulation menghasilkan gameplay events seperti `DAMAGE`, `DEATH`, `PROJECTILE_SPAWN`, dan `ITEM_USED`.
3. Client menerjemahkan event menjadi particle, sound, camera shake, HUD, dan kill feed.
4. Implementasikan projectile segment sweep agar projectile cepat tidak menembus target.
5. Migrasikan karakter per keluarga serangan, satu per satu.

Urutan karakter:

1. Volt/Nopal — burst projectile;
2. Dusty/Athallah — spread;
3. Fuse/Azka — lob dan explosion;
4. Titan/Einar — melee/leap;
5. Ace/Zeyd — burst/pierce;
6. Naka — returning projectile dan dash;
7. Ello — combo, lunge, guard, dan Iaido;
8. Syafiah — charge shot dan Arrow Shower.

Acceptance criteria:

- server-compatible simulation tidak mengimpor Three.js, DOM, HUD, atau audio;
- semua delapan karakter sesuai baseline;
- client effect tidak mengubah hasil gameplay;
- deterministic test dengan seed dan input yang sama menghasilkan state yang sama.

### Fase 6 — Server Skeleton dan Room/Lobby

Tujuan: menyediakan server Node.js tanpa memulai combat network terlebih dahulu.

Pekerjaan:

1. Tambahkan dependency Socket.IO, Socket.IO client, Zod, Pino, dan Vitest.
2. Buat HTTP server dan endpoint `GET /health`.
3. Implementasikan `RoomManager`, `Room`, room code, dan cleanup room kosong.
4. Implementasikan connection registry dan guest session.
5. Implementasikan create, join, leave, ready, select character, settings, dan host transfer.
6. Tambahkan protocol version handshake.
7. Validasi serta rate-limit seluruh payload client.
8. Batasi origin production melalui environment variable.

Acceptance criteria:

- dua tab browser dapat membuat dan bergabung ke room yang sama;
- room code unik dan tidak memakai karakter ambigu;
- room full, invalid room, dan match running ditolak dengan error yang benar;
- host berpindah saat host keluar dari lobby;
- room kosong dibersihkan setelah TTL;
- invalid packet tidak menjatuhkan server;
- `/health` mengembalikan status server.

### Fase 7 — Lobby UI Client

Tujuan: menambahkan jalur multiplayer tanpa merusak menu single-player.

Pekerjaan:

1. Tambahkan pilihan `Main Sendiri` dan `Multiplayer`.
2. Buat screen create/join room dan input kode.
3. Buat lobby player list, character selection, ready state, map/mode setting, dan host start.
4. Tambahkan tombol copy room code.
5. Buat error UI Bahasa Indonesia.
6. Disable multiplayer secara jelas ketika offline.
7. Pastikan service worker hanya precache static assets dan tidak menangani socket/API traffic.

Acceptance criteria:

- menu single-player tetap berfungsi;
- lobby usable pada desktop dan mobile;
- hanya host yang dapat mengubah settings dan start;
- minimal dua human player diperlukan untuk production start;
- status offline dan version mismatch jelas bagi user.

### Fase 8 — Authoritative Movement Vertical Slice

Tujuan: membuktikan arsitektur network dengan dua pemain pada open map tanpa combat.

Pekerjaan:

1. Buat central server tick 30 Hz.
2. Client mengirim movement/aim input dengan sequence number.
3. Server menghitung movement dan collision.
4. Kirim full snapshot 15 Hz memakai volatile event.
5. Implementasikan local prediction dan input replay.
6. Implementasikan server reconciliation dengan koreksi visual yang halus.
7. Implementasikan remote player interpolation sekitar 100 ms.
8. Tambahkan development network debug overlay.

Acceptance criteria:

- dua player dapat bergerak mulus di room yang sama;
- client tidak dapat teleport dengan mengirim posisi;
- server mengakui sequence input terakhir;
- movement tetap dapat dipahami pada latency 50, 100, dan 200 ms;
- snapshot lama tidak menumpuk pada client lambat.

### Fase 9 — Map, Surface, Hazard, dan Respawn Sync

Tujuan: memakai map aktual dengan collision identik di server dan client.

Pekerjaan:

1. Server memilih map ID, map seed, dan match seed.
2. Client membangun visual dari map ID + seed.
3. Server membangun collision, surface, hazard, dan spawn dari blueprint yang sama.
4. Sinkronkan spawn dan respawn protection.
5. Uji seluruh biome dan varian map.

Acceptance criteria:

- client dan server sepakat atas wall/blocker;
- player tidak dapat berjalan menembus wall;
- hazard damage ditentukan server;
- spawn/respawn sama untuk semua client;
- map mismatch dapat dideteksi pada development build.

### Fase 10 — Basic Combat Multiplayer

Tujuan: membuat basic attack sepenuhnya authoritative.

Pekerjaan:

1. Client mengirim attack intent dan aim.
2. Server memvalidasi cooldown, ammo, recovery, dan state karakter.
3. Server membuat projectile/melee dan menghitung collision.
4. Server menentukan damage, knockback, death, kill, dan Super charge.
5. Client merender projectile serta event combat dari server.
6. Tambahkan sequence ID untuk discrete action dan deduplication.

Acceptance criteria:

- client tidak dapat mengirim damage atau target hit;
- forged fire rate/ammo/cooldown ditolak;
- projectile dan melee collision terjadi di server;
- HP, death, kill, dan respawn konsisten di semua client;
- basic attack delapan karakter tersinkronisasi.

### Fase 11 — Character Mechanics, Super, dan Items

Tujuan: menyelesaikan seluruh mekanik khusus karakter dan item.

Pekerjaan:

1. Naka: outgoing/return hit set, passive speed, dan path slash dash.
2. Ello: combo timing, collision lunge, outer-arc reward, guard, parry, dan Iaido slash.
3. Syafiah: server-timed attack start/release, Quickdraw, charged values, dan Arrow Shower waves.
4. Sinkronkan seluruh Super karakter lama.
5. Pindahkan item drop, pickup, ownership, validity, dan use ke server.
6. Pertahankan Focus conversion untuk Ello dan Syafiah.

Acceptance criteria:

- charge duration dihitung server, bukan dipercayai dari client;
- Super tidak dapat digunakan tanpa charge;
- item tidak dapat digandakan atau dipakai tanpa ownership;
- setiap target hanya menerima hit sesuai aturan mekanik;
- seluruh karakter lolos regression multiplayer dan single-player.

### Fase 12 — Full Deathmatch Flow

Tujuan: menyelesaikan milestone publik multiplayer pertama.

Pekerjaan:

1. Sinkronkan timer lima menit dan target 50 KO.
2. Sinkronkan scoreboard, kill feed, respawn, dan spawn protection.
3. Implementasikan match end, result, back to lobby, dan rematch.
4. Pastikan host disconnect saat match tidak menghentikan simulation.
5. Bersihkan seluruh resource match saat selesai.

Acceptance criteria:

- 2–8 human player dapat menyelesaikan match;
- result sama di semua client;
- room kembali ke lobby dan dapat rematch;
- projectile, listener, input queue, timer, dan simulation lama dibersihkan.

### Fase 13 — Reconnect dan Version Recovery

Tujuan: membuat multiplayer tahan terhadap putus koneksi singkat.

Pekerjaan:

1. Buat session ID dan reconnect token terpisah dari Room ID.
2. Simpan token di `sessionStorage`.
3. Pertahankan entity dengan neutral input selama grace period 10 detik.
4. Recover player ID, character, lobby state, dan match state.
5. Tolak duplicate connection/session.
6. Tangani protocol/client build mismatch dan arahkan ke PWA update.

Acceptance criteria:

- koneksi yang putus sekitar tiga detik kembali ke entity yang sama;
- tidak ada duplicate player;
- gagal reconnect menghasilkan pesan jelas;
- client lama tidak masuk ke match dengan protocol tidak kompatibel.

### Fase 14 — Classic, Blitz, dan Bots

Tujuan: membawa fitur gameplay lain ke simulation authoritative setelah Deathmatch stabil.

Pekerjaan:

1. Implementasikan gas, boxes, power cubes, dan elimination.
2. Aktifkan Classic lalu Blitz.
3. Pindahkan keputusan bot ke shared/server-compatible `BotSystem`.
4. Perlakukan bot sebagai authoritative player entity.
5. Uji room gabungan human dan bot.

Acceptance criteria:

- gas, boxes, item, cube, dan elimination identik di semua client;
- Classic dan Blitz berakhir konsisten;
- konfigurasi tiga human + lima bot dapat memainkan match penuh;
- host browser tidak menjalankan bot authoritative.

### Fase 15 — Hardening, Performance, dan Deployment

Tujuan: menyiapkan server untuk penggunaan publik.

Pekerjaan:

1. Tambahkan structured logging tanpa log per-frame.
2. Ukur tick p50/p95, event-loop delay, memory, CPU, snapshot rate, dan traffic per client.
3. Jalankan soak test delapan client minimal 30 menit.
4. Uji latency, jitter, packet loss, background/foreground, dan screen lock.
5. Buat Dockerfile/Docker Compose opsional, konfigurasi Cloudflare Tunnel, healthcheck, dan restart policy.
6. Konfigurasi environment production serta origin restriction pada Socket.IO.
7. Deploy static client ke hosting web dan Node.js server ke VPS di belakang Cloudflare Tunnel.

Acceptance criteria:

- server tick 30 Hz stabil dan p95 simulation jauh di bawah 33,33 ms;
- tidak ada pertumbuhan memory yang tidak wajar saat soak test;
- server tetap hidup ketika menerima invalid/spam packet;
- HTTPS/WSS melalui hostname Cloudflare Tunnel, healthcheck, restart, dan log production bekerja;
- PWA tidak meng-cache endpoint multiplayer;
- single-player offline tetap dapat dimainkan.

## 7. Protocol Awal

Client ke server:

```text
session:hello
room:create
room:join
room:leave
lobby:update-settings
lobby:select-character
lobby:ready
lobby:start
input:move
action:attack-start
action:attack-release
action:super
action:item
match:leave
latency:ping
```

Server ke client:

```text
session:accepted
session:reconnect-token
session:recovered
room:joined
room:state
room:error
match:init
match:snapshot
match:event
match:end
```

Setiap payload memiliki schema dan protocol version. Event penting dikirim reliable; snapshot dapat dibuang bila sudah terlambat.

## 8. Konfigurasi Awal

```text
PROTOCOL_VERSION=1
TICK_RATE=30
SNAPSHOT_RATE=15
MAX_CATCHUP_TICKS=5
MAX_PLAYERS_PER_ROOM=8
ROOM_IDLE_TTL_SECONDS=60
RECONNECT_GRACE_SECONDS=10
INTERPOLATION_DELAY_MS=100
```

Environment server di VPS:

```env
NODE_ENV=development
PORT=3000
GAME_ORIGIN=https://game.example.com
TICK_RATE=30
SNAPSHOT_RATE=15
MAX_PLAYERS_PER_ROOM=8
ROOM_IDLE_TTL_SECONDS=60
RECONNECT_GRACE_SECONDS=10
LOG_LEVEL=info
```

Environment client saat build:

```env
VITE_MULTIPLAYER_URL=https://multiplayer.example.com
```

Angka awal ini menjadi baseline dan hanya diubah berdasarkan profiling/playtest.

## 9. Strategi Pengujian

### Unit test

- seeded RNG;
- math dan collision;
- movement serta surface modifier;
- map determinism;
- damage dan knockback;
- ammo/reload/cooldown;
- combo, charge, parry, returning projectile, dan Arrow Shower;
- item pickup/use dan Focus conversion;
- death, respawn, match timer, dan match result;
- room code dan room lifecycle;
- payload validation dan rate limiting.

### Determinism test

Jalankan initial state, seed, dan input yang sama selama 10.000 tick. Checksum state akhir harus sama pada pengulangan dan pada environment browser/Node yang didukung.

### Integration test

- create/join/leave room;
- ready, character select, host transfer, dan start;
- movement input serta snapshot ack;
- attack, damage, death, dan respawn;
- disconnect/reconnect;
- match end, lobby return, dan rematch;
- invalid payload dan duplicate action.

### Manual/network test

- latency 50/100/200 ms;
- jitter 30–50 ms;
- simulated packet loss 1–5%;
- dua sampai delapan browser/client;
- Android low/mid-range dan desktop;
- Wi-Fi serta mobile data;
- background/foreground dan screen lock;
- multi-touch movement + attack/Super/item;
- WebGPU serta WebGL2.

## 10. Risiko Utama dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Gameplay masih menyatu dengan Three.js | Server tidak dapat menjalankan simulation | Ekstrak data dan pure systems sebelum networking combat |
| Dua sumber aturan gameplay | Single-player dan multiplayer berbeda | Shared simulation menjadi satu sumber kebenaran |
| Rewrite terlalu besar | Regression sulit dilacak | Migrasi per fase dengan adapter dan acceptance gate |
| Variable delta menghasilkan desync | Hasil berbeda antar mesin | Fixed 30 Hz simulation dan determinism tests |
| `Math.random()` memengaruhi gameplay | Server/client tidak konsisten | Seeded server-controlled RNG |
| Projectile cepat melewati target | Hit berbeda atau hilang | Segment sweep collision |
| Snapshot menumpuk | Latency terus membesar | Volatile full snapshots dan backpressure |
| PWA memakai client lama | Protocol mismatch | Version handshake dan update flow |
| Koneksi mobile sering terputus | Player keluar dari match | Token dan grace-period reconnect |
| Memory room tidak dibersihkan | Server memburuk setelah lama berjalan | Central tick, explicit dispose, dan soak test |
| Belum ada Git repository | Perubahan sulit dilacak/dirollback | Buat baseline source control sebelum implementasi besar |

## 11. Pembagian Commit yang Disarankan

Jika source control sudah disiapkan, gunakan commit kecil yang tetap dapat dibangun:

1. `test: establish gameplay regression baseline`
2. `refactor: extract shared gameplay data`
3. `refactor: extract seeded map and collision utilities`
4. `feat: add pure fixed-step game simulation`
5. `refactor: separate gameplay events from effects`
6. `feat: add multiplayer server and room lifecycle`
7. `feat: add multiplayer lobby client`
8. `feat: add authoritative movement sync`
9. `feat: synchronize maps and collision`
10. `feat: add authoritative basic combat`
11. `feat: synchronize supers and items`
12. `feat: complete deathmatch lifecycle`
13. `feat: add session reconnect`
14. `feat: add classic blitz and server bots`
15. `ops: add VPS and Cloudflare Tunnel deployment`

## 12. Definition of Done MVP

Multiplayer MVP selesai apabila:

- room dapat dibuat dan diikuti dengan kode;
- lobby, host transfer, settings, character select, ready, dan start bekerja;
- 2–8 player menyelesaikan Deathmatch;
- movement memakai prediction, reconciliation, dan interpolation;
- server menentukan seluruh gameplay truth;
- delapan karakter, Super, item, death, respawn, dan result sinkron;
- reconnect mengembalikan entity yang sama;
- invalid packet tidak menjatuhkan server;
- room dan match resource dibersihkan;
- single-player, PWA, mobile control, WebGPU, dan WebGL2 tetap bekerja;
- build, unit test, integration test, network test, dan soak test lulus;
- static client tersedia melalui HTTPS dan server tersedia melalui WSS.

## 13. Langkah Implementasi Pertama

Saat implementasi disetujui, pekerjaan dimulai dari Fase 0. Setelah baseline lolos, perubahan kode pertama adalah Fase 1: membuat shared static gameplay data beserta compatibility adapter. Server dan Socket.IO belum ditambahkan sampai shared simulation memiliki fondasi yang dapat diuji.
