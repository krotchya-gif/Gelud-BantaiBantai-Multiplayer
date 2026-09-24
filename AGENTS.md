# Pengetahuan Project Gelud BakuHantam

Dokumen ini menjadi referensi cepat untuk perubahan kode di repository ini. README tetap menjadi dokumentasi pengguna dan deployment; `AGENTS.md` menjelaskan batasan teknis yang penting saat mengubah project.

## Gambaran arsitektur

Game adalah brawler 3D top-down berbasis Three.js dengan client statis Vite/PWA dan server multiplayer Node.js terpisah.

```text
Input client
  -> prediction lokal + intent JSON
  -> WebSocket native /ws
  -> server fixed tick 30 Hz
  -> shared GameSimulation + MapCollision
  -> snapshot 15 Hz dan gameplay events
  -> reconciliation/interpolation Three.js
```

- `src/bootstrap.js` memilih WebGPU atau WebGL2, lalu memuat engine klasik.
- `src/multiplayer/` berisi WebSocket client, lobby, prediction, reconciliation, dan snapshot buffer.
- `public/engine/` adalah script klasik global dengan urutan load yang sensitif: Three.js, roster, pipeline, map, model, brawler, combat, effects, interfaces, lalu main.
- `shared/` adalah aturan yang dipakai server dan client: karakter, protocol, map collision, dan simulasi authoritative.
- `server/` menangani room, koneksi WebSocket, match runner, snapshot, dan bot.
- `tests/` berisi unit/integration tests; `scripts/verify-character-models.mjs` memeriksa delapan rig karakter.

## Invarian multiplayer

- Server adalah sumber kebenaran untuk movement, collision, combat, item, Flicker, death, respawn, dan hasil match.
- Tick simulasi adalah 30 Hz; snapshot penuh adalah 15 Hz. Gameplay events dikirim terpisah dan tidak boleh memaksa snapshot tambahan setiap event.
- `input:move` memiliki `seq`. Server mengantrikan input dan mengonsumsi satu input per tick. Snapshot `ack` harus menunjuk sequence terakhir yang benar-benar diproses.
- Client boleh melakukan prediction, tetapi replay hanya memakai input yang belum di-ack. Jangan mengubah durasi simulasi replay tanpa menyamakan perilaku server.
- Map client dan server harus memakai `mapId` serta `mapSeed` yang sama. Collision server berasal dari generator map yang sama dengan arena renderer.
- `player.facing`/aim adalah arah gameplay. Rotasi visual root pemain remote dapat mengikuti velocity saat berjalan; jangan mencampur arah aim dan arah gerak pada perhitungan serangan.
- Vektor aim `(0, 0)` dari touch tap atau client lama harus menggunakan arah aim/facing terakhir. Fallback ini harus tetap berlaku di client network session dan `shared/simulation/CombatSystem.js` agar projectile, melee, dan charge tidak kehilangan arah.
- Protocol menggunakan JSON WebSocket native pada `/ws`, protocol version saat ini `1`, dan kapasitas room maksimum 8 pemain. Perubahan payload harus memperbarui schema dan test terkait.

## Invarian kemampuan, item, trap, dan kontrol

- Flicker memiliki cooldown authoritative yang sama di solo dan multiplayer. HUD touch dan desktop harus menampilkan hitungan sisa cooldown serta state siap; ketika charge penuh tetapi spawn protection atau aksi lain mengunci penggunaan, tampilkan state menunggu. Input keyboard `Shift` dan tombol touch memanggil aksi yang sama.
- Kontrol gameplay mobile memakai satu layout baku: joystick gerak di kiri bawah; cluster serangan/skill di kanan bawah dengan tiga posisi skill melengkung di sekitar serangan utama; `Super` menempati posisi lengkung paling bawah. Baris utility berisi `Item 1`, `Item 2`, lalu `Flicker`. Posisi ini menjadi pola untuk skill/item baru; jangan merombak HUD lain ketika mengubah cluster tersebut.
- Item 1 dan Item 2 adalah slot inventori terpisah. Pickup, konsumsi, UI, prediction, bot bila berlaku, schema, dan snapshot harus mempertahankan isi serta aksi tiap slot secara konsisten; kontrol legacy boleh memilih slot pertama sebagai default.
- Trap berkala berjalan di simulasi authoritative yang dipakai solo dan server. Siklus dimulai tiap 60 detik, memilih lokasi walkable secara seeded dari `matchSeed` dan `mapSeed`, memberi telegraph sebelum aktif, lalu menghasilkan ledakan, burning, atau gas beracun. Render client hanya memvisualisasikan state/event simulasi; ia tidak menentukan hit atau damage.
- Solo Deathmatch membatasi pemakaian satu karakter maksimal oleh dua bot dalam satu match. Pemilihan roster bot harus tetap deterministik bila seed tersedia dan memakai karakter yang ada di shared roster.

## Renderer dan asset

Sebagian besar asset adalah geometry/material procedural di `public/engine/`, bukan file model eksternal. Build Vite menyalin seluruh `public/engine/*.js` ke `dist/engine/` dan service worker mem-precache hasil build.

- Roster visual karakter dibuat oleh `character-models.js`/`character-roster.js` dan dipakai solo maupun multiplayer melalui class brawler yang sama.
- Geometry projectile dan material item multiplayer harus memakai cache atau asset combat solo bila tersedia. Hindari membuat geometry/material baru setiap snapshot atau setiap projectile.
- Projectile network memakai pooling. Saat menghapus projectile, sembunyikan dan masukkan ke pool; dispose hanya geometry/material yang memang dimiliki pool, bukan asset cache bersama.
- Dalam engine global yang sudah diminify, `H` adalah `Vector3` dan `J` adalah `Color`. Efek visual yang membutuhkan warna harus menerima `J` atau object Color yang valid.
- Script engine bukan ES module. Jangan mengubah urutan load atau mengubahnya menjadi module tanpa memeriksa semua global dependency.

## Perintah umum

```sh
npm run dev                 # Vite client
npm run dev:server          # Node multiplayer server
npm run build               # production build ke dist/
npm run preview -- --port 4173
npm run test:characters     # validasi seluruh rig dan animasi
npm test -- --run           # seluruh suite
npm test -- --run tests/server tests/shared
```

Integration test lobby perlu bind `127.0.0.1`. Jika test gagal dengan `listen EPERM` sebelum assertion, itu adalah batasan sandbox, bukan bukti bug multiplayer. Jalankan ulang dengan izin bind localhost/escalated execution, misalnya:

```sh
npm test -- --run tests/integration/lobby.test.js
```

Pada project ini integration test sebelumnya memang gagal di sandbox, lalu lulus setelah dijalankan dengan izin bind localhost. Dengan bind diizinkan, suite aktual terakhir adalah 38 test lulus. Catat kedua kondisi tersebut saat melaporkan hasil test.

## Aturan perubahan

- Pertahankan perubahan pengguna yang sudah ada di working tree. Jangan memakai reset/checkout destruktif untuk membersihkan repository.
- Untuk perubahan protocol atau simulasi, tambahkan regression test yang menguji perilaku authoritative, bukan hanya bentuk implementasinya.
- Untuk perubahan renderer multiplayer, periksa mode solo dan multiplayer, desktop serta touch, projectile, item, respawn, dan reconnect.
- Untuk perubahan cluster kontrol, pertahankan target sentuh yang cukup besar, safe-area inset, mode left-handed, dan event multi-touch tanpa konflik antara joystick, Super, dua slot item, dan Flicker.
- Jalankan `git diff --check`, test yang relevan, build, dan `npm run test:characters` setelah perubahan yang menyentuh engine atau multiplayer.
- Jika hasil build, ukuran bundle, traffic, atau batasan test berubah, perbarui bagian verifikasi aktual di `README.md` dengan angka hasil run terbaru.

## Batasan scope

Room dan match masih memory-only dalam satu process Node.js. Belum ada akun/database, progression global, ranked matchmaking, chat/voice, spectator/replay, Redis atau multi-server orchestration, delta/binary snapshot protocol, Kubernetes/microservices, dan anti-cheat native.
