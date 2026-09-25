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

- `src/bootstrap.js` selalu memprioritaskan WebGPU tanpa parameter renderer, lalu memuat engine klasik. WebGL2 otomatis menjadi fallback jika WebGPU tidak tersedia atau gagal diinisialisasi. Parameter debug eksplisit `?renderer=webgl` boleh memilih WebGL2; jangan menjadikannya default pada perangkat yang mendukung WebGPU.
- `src/multiplayer/` berisi WebSocket client, lobby, prediction, reconciliation, dan snapshot buffer.
- `public/engine/` adalah script klasik global dengan urutan load yang sensitif: Three.js, roster, pipeline, map, model, model sorcerer, brawler, combat, effects, interfaces, lalu main.
- `shared/` adalah aturan yang dipakai server dan client: karakter, protocol, map collision, dan simulasi authoritative.
- `server/` menangani room, koneksi WebSocket, match runner, snapshot, dan bot.
- `tests/` berisi unit/integration tests; `scripts/verify-character-models.mjs` memeriksa 10 rig gameplay dan dua design rig.

## Invarian multiplayer

- Server adalah sumber kebenaran untuk movement, collision, combat, item, Flicker, death, respawn, dan hasil match.
- Tick simulasi adalah 30 Hz; snapshot penuh adalah 15 Hz. Gameplay events dikirim terpisah dan tidak boleh memaksa snapshot tambahan setiap event.
- `input:move` memiliki `seq`. Server mengantrikan input dan mengonsumsi satu input per tick. Snapshot `ack` harus menunjuk sequence terakhir yang benar-benar diproses.
- Client boleh melakukan prediction, tetapi replay hanya memakai input yang belum di-ack. Jangan mengubah durasi simulasi replay tanpa menyamakan perilaku server.
- Map client dan server harus memakai `mapId` serta `mapSeed` yang sama. Collision server berasal dari generator map yang sama dengan arena renderer.
- `player.facing`/aim adalah arah gameplay. Rotasi visual root pemain remote dapat mengikuti velocity saat berjalan; jangan mencampur arah aim dan arah gerak pada perhitungan serangan.
- Vektor aim `(0, 0)` dari touch tap atau client lama harus menggunakan arah aim/facing terakhir. Fallback ini harus tetap berlaku di client network session dan `shared/simulation/CombatSystem.js` agar projectile, melee, dan charge tidak kehilangan arah.
- Protocol menggunakan JSON WebSocket native pada `/ws`, protocol version saat ini `1`, dan kapasitas room maksimum 8 pemain. Perubahan payload harus memperbarui schema dan test terkait.
- `shared/data/characters.js` adalah sumber stat/serangan/skill untuk server; padanannya di `public/engine/character-roster.js` harus sama. Gojo dan Sukuna wajib tetap dapat dipilih di solo dan lobby, serta snapshot/event harus membawa cooldown, charge, Barrier, dan status yang diperlukan renderer.
- Pertahankan nama yang disepakati: Gojo memakai `Limitless Strike`, `Cursed Technique Lapse - Blue`, `Cursed Technique Reversal - Red`, `Infinity Barrier`, dan `Domain Expansion - Infinite Void`; Sukuna memakai `Cleave`, `Dismantle`, `Fuga - Kamino / Flame Arrow`, `Reverse Cursed Technique`, dan `Domain Expansion - Malevolent Shrine`. Jangan mengganti nama UI dengan alias terjemahan tanpa permintaan.
- Skill Blue Gojo memiliki durasi authoritative 2,4 detik. Solo, snapshot multiplayer, dan marker renderer harus mengakhiri tarikan serta mem-fade orb pada batas timer yang sama; timer area tidak boleh ditimpa timer Super.
- Gojo Barrier menyerap satu damage instance atau hard CC yang berasal dari serangan pemain. Efek CC murni, seperti freeze Domain, tetap menghabiskan Barrier; hazard map tanpa attacker tidak menghabiskannya. Pertahankan aturan yang sama di `shared/simulation/CombatSystem.js` dan solo `Brawler.applyHardCC`/`takeDamage`.
- `airborneT` dan fase leap Titan adalah state authoritative. Selama di udara, movement/action terkunci dan damage/hard CC tidak mengenai Titan; damage Super dan ledakan baru diproses saat mendarat. Snapshot dan event dash harus menjaga invulnerability serta animasi jaringan selaras dengan solo, termasuk durasi low-gravity.

## Invarian kemampuan, item, trap, dan kontrol

- Flicker memiliki cooldown authoritative yang sama di solo dan multiplayer. HUD touch dan desktop harus menampilkan hitungan sisa cooldown serta state siap; ketika charge penuh tetapi spawn protection atau aksi lain mengunci penggunaan, tampilkan state menunggu. Input keyboard `Shift` dan tombol touch memanggil aksi yang sama.
- Pemain airborne tidak boleh digeser, terkena damage/CC, mengambil item, atau menjadi target projectile/area; jangan menandai projectile sebagai sudah mengenai pemain udara. Terapkan perlindungan dan timer landing pada solo dan simulasi authoritative yang sama.
- Kontrol gameplay mobile memakai satu layout baku: joystick gerak di kiri bawah; cluster serangan/skill di kanan bawah dengan tiga posisi skill melengkung di sekitar serangan utama; `Super` menempati posisi lengkung paling bawah. Baris utility berisi `Item 1`, `Item 2`, lalu `Flicker`. Posisi ini menjadi pola untuk skill/item baru; jangan merombak HUD lain ketika mengubah cluster tersebut.
- Saat match touch, jangan tampilkan petunjuk aim yang melayang di atas cluster serangan. Pickup dan pemakaian item memberi feedback lewat slot, efek visual, dan audio tanpa toast bawah yang menutup tombol utility.
- Auto-aim touch harus memprioritaskan fighter hidup (player atau bot) dalam jangkauan akuisisi serangan; item box hanya menjadi fallback saat tidak ada fighter terdekat.
- Penyesuaian performa otomatis tidak boleh memunculkan toast di HUD mobile; render menyesuaikan efek tanpa notifikasi yang mengganggu.
- Gojo/Sukuna menampilkan dua tombol skill di desktop dan touch dengan warna karakter, nama pendek, state siap/wait, dan cooldown/charge. Tombol touch dapat di-drag untuk menentukan arah; guide hanya muncul selama drag dan mengikuti bentuk/jangkauan skill. Gojo memegang Blue dan Red yang bercahaya, Sukuna membawa api pada kedua tangan; pose cast dan efek harus tetap sama di solo dan multiplayer.
- Item 1 dan Item 2 adalah slot inventori terpisah. Pickup, konsumsi, UI, prediction, bot bila berlaku, schema, dan snapshot harus mempertahankan isi serta aksi tiap slot secara konsisten; kontrol legacy boleh memilih slot pertama sebagai default.
- Trap berkala berjalan di simulasi authoritative yang dipakai solo dan server. Siklus dimulai tiap 60 detik, memilih lokasi walkable secara seeded dari `matchSeed` dan `mapSeed`, memberi telegraph sebelum aktif, lalu menghasilkan ledakan, burning, atau gas beracun. Render client hanya memvisualisasikan state/event simulasi; ia tidak menentukan hit atau damage.
- Solo Deathmatch membatasi pemakaian satu karakter maksimal oleh dua bot dalam satu match. Jika slot bot mencukupi, lineup harus memakai seluruh karakter setidaknya sekali sebelum memilih pengulangan. Pemilihan harus deterministik bila seed tersedia dan memakai karakter yang ada di shared roster.
- Bot Deathmatch solo maupun server memilih fighter hidup terdekat sebagai target, termasuk bot lain; bot tidak boleh memprioritaskan pemain manusia hanya karena target adalah pemain.
- Super charge pada Deathmatch tidak hilang saat mati/respawn; charge hanya habis ketika Super berhasil digunakan.

## Renderer dan asset

Sebagian besar asset adalah geometry/material procedural di `public/engine/`, bukan file model eksternal. Build Vite menyalin seluruh `public/engine/*.js` ke `dist/engine/` dan service worker mem-precache hasil build.

- WebGPU adalah renderer utama pada desktop dan mobile. WebGL2 otomatis menjadi fallback bila WebGPU tidak tersedia atau gagal diinisialisasi; setelah percobaan WebGPU gagal, fallback harus memakai elemen canvas baru. `?renderer=webgl` hanya untuk pemilihan manual/debug.
- Struktur lampu WebGPU harus tetap stabil selama runtime: empat point light pool, tanpa bayangan dinamis directional/lampu. Pergantian quality tidak boleh menambah/menghapus light atau mengubah shadow caster karena itu memicu kompilasi ulang pipeline dan dapat membekukan match.
- Render buffer dijaga minimal HD (1280 × 720) jika resolusi native perangkat mendukungnya. FPS singkat di bawah 60 tidak boleh langsung menurunkan resolusi. Setelah dua jendela pengukuran berturut-turut di bawah 60, kurangi efek partikel dan matikan shadow sementara pada WebGL; pulihkan setelah dua jendela di atas 68. Hanya preset High yang boleh turun ke Medium saat FPS rata-rata mencapai 30 atau kurang; preset Low tidak diturunkan lagi. Pergantian ini tidak memunculkan toast. Struktur lampu dan shadow caster WebGPU tetap stabil.

- Roster visual karakter dibuat oleh `character-models.js`/`character-roster.js` dan dipakai solo maupun multiplayer melalui class brawler yang sama.
- `sorcerer-models.js` dimuat sesudah `character-models.js` dan sebelum `brawlers.js`; builder Gojo/Sukuna dipakai oleh class yang sama di solo dan multiplayer. Verifikasi geometri, pose, material cache, dan parity data lewat `npm run test:characters`.
- Master ikon transparan adalah `output/imagegen/bakuhantam-icon-transparent.png`; varian PWA ada di `public/icons/`. Pertahankan alpha transparan pada icon, Apple touch icon, dan maskable icon; versi maskable harus punya padding aman.
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

Pada project ini integration test sebelumnya pernah gagal di sandbox karena `listen EPERM`, lalu lulus setelah bind localhost diizinkan. Jangan anggap kegagalan sebelum assertion sebagai bug simulasi; catat kondisi sandbox dan hasil sesudah bind bila test lobby dijalankan. Verifikasi kode terbaru pada 25 September 2026 lulus: `npm run build`, `npm run test:characters`, `npm test -- --run` (25 file/134 test), dan `git diff --check`. Verifier rig mencakup 10 rig gameplay dan dua design rig, seluruh 20 jalur skill aktif solo, lifecycle visual, serta pemeriksaan auto-aim, roster bot, Super saat respawn, dan kebijakan kualitas renderer. Build berisi 27 file/2.837.682 byte; bundle WebGPU 781,37 kB (212,55 kB gzip), aplikasi 39,52 kB (13,90 kB gzip), dan Character Studio 7,47 kB (3,29 kB gzip). Vite memberi peringatan chunk WebGPU di atas 500 kB. Hasil browser smoke dan ukuran build yang lebih lama bukan pengukuran Poco F6; setelah perubahan render terbaru, browser smoke dan pengukuran fisik belum dijalankan ulang. Uji dua perangkat, ponsel fisik, soak, dan balance playtest masih perlu dilakukan.

## Aturan perubahan

- Pertahankan perubahan pengguna yang sudah ada di working tree. Jangan memakai reset/checkout destruktif untuk membersihkan repository.
- Untuk perubahan protocol atau simulasi, tambahkan regression test yang menguji perilaku authoritative, bukan hanya bentuk implementasinya.
- Perubahan Gojo/Sukuna harus menjaga nama serta angka roster solo/shared, lalu menguji efek skill/status melalui simulasi authoritative. Uji minimal Barrier versus damage/CC, pull satu kali per cast dan berakhir tepat setelah 2,4 detik, slash yang menembus maksimal tiga target, serta warna/charge/release Fuga.
- Perubahan leap harus menguji durasi normal dan low-gravity, movement/action lock, immunity damage/CC/area, dan damage ledakan saat mendarat; event `SUPER_DASH` dan snapshot `airborneT` wajib dicerminkan client.
- Untuk perubahan renderer multiplayer, periksa mode solo dan multiplayer, desktop serta touch, projectile, item, respawn, dan reconnect.
- Untuk perubahan cluster kontrol, pertahankan target sentuh yang cukup besar, safe-area inset, mode left-handed, dan event multi-touch tanpa konflik antara joystick, Super, dua slot item, dan Flicker.
- Jalankan `git diff --check`, test yang relevan, build, dan `npm run test:characters` setelah perubahan yang menyentuh engine atau multiplayer.
- Jika hasil build, ukuran bundle, traffic, atau batasan test berubah, perbarui bagian verifikasi aktual di `README.md` dengan angka hasil run terbaru.

## Batasan scope

Room dan match masih memory-only dalam satu process Node.js. Belum ada akun/database, progression global, ranked matchmaking, chat/voice, spectator/replay, Redis atau multi-server orchestration, delta/binary snapshot protocol, Kubernetes/microservices, dan anti-cheat native.
