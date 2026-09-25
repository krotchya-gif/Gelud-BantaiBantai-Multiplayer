# Laporan Audit dan Perubahan

- **Audit awal:** 25 September 2026
- **Dokumentasi diselaraskan:** 26 September 2026
**Status:** Perbaikan telah diimplementasikan, dibuild, dan diverifikasi. Rincian pengujian di bawah mengikuti kondisi codebase saat ini.

## 0. Acuan resmi Gojo dan Sukuna

### Gojo

Blue menarik dan memperlambat lawan selama 2,4 detik. Red memberi 700 damage, knockback, dan stun jika target membentur dinding. Barrier otomatis menyerap satu hit atau hard CC dari serangan pemain, lalu kembali siap setelah 5 detik tanpa terkena hit. Super Infinite Void aktif 4 detik dengan freeze 1,5 detik; animasinya kini memakai partikel.

### Sukuna

Dismantle menjangkau 10 unit, memberi 600 damage dan dapat mengenai hingga tiga target. Fuga punya jangkauan 9 saat tap atau 13,5 saat di-charge, dengan damage dan burn. Super Malevolent Shrine menjangkau 10,5 unit, aktif 4 detik, memancarkan delapan gelombang, dan kini menampilkan kuil.

## 1. Baseline repository

- `HEAD` dan `origin/main` awalnya sama pada commit `2155ed3` (`ahead 0`, `behind 0`).
- Sebelum audit, working tree sudah memiliki **17 file tracked yang berubah** dan **1 file baru**:
  - `tests/shared/roster-skills.test.js`
- Tidak ada perubahan staged saat pemeriksaan awal.
- Perubahan awal tersebut berasal dari working tree lokal dan **bukan dibuat oleh saya**.

## 2. Temuan audit awal

Temuan di bawah berasal dari snapshot audit awal dan tidak semuanya merupakan bug yang sudah direproduksi. Status perbaikannya diringkas pada bagian 3–5. Diagnosis performa WebGPU masih berdasarkan alur kode; tidak ada profiling GPU atau benchmark fisik Poco F6.

Status saat ini: mismatch durasi Blue sudah disamakan; WebGPU menjadi renderer utama dengan WebGL2 sebagai fallback; struktur light/shadow WebGPU distabilkan. Perubahan 25 September menetapkan floor render HD, memakai hysteresis sebelum mengurangi efek, hanya menurunkan preset High ke Medium pada rata-rata 30 FPS atau kurang, dan tidak mengubah resolusi otomatis. Auto-aim memprioritaskan fighter daripada kotak item, bot Deathmatch menyerang fighter terdekat termasuk bot lain, lineup mengisi roster sebelum mengulang karakter, dan Super charge bertahan saat respawn. Coverage otomatis untuk perubahan tersebut lulus; validasi perangkat fisik dan multiplayer dua perangkat belum dilakukan ulang.

### 2.1 Paritas Blue Gojo

- `shared/data/characters.js:16` memakai `duration: 2.4`.
- Pada snapshot audit awal, `public/engine/character-roster.js` memakai `duration: 1.4`.
- `scripts/verify-character-models.mjs:199`, `493`, `527`, dan `529` masih memakai ekspektasi 2.4.
- `README.md:124` dan `README.md:198` mendokumentasikan 2.4.
- Temuan teknisnya adalah **shared dan solo tidak sinkron**. Implementasi kini memakai 2,4 detik di kedua roster dan verifier.

### 2.2 Pemilihan renderer dan pergantian kualitas

- Pada baseline, WebGL menjadi default desktop, sedangkan WebGPU hanya dipilih di mobile. Ini tidak sesuai keputusan project bahwa WebGPU menjadi renderer utama.
- Pergantian quality WebGPU mengubah jumlah pool light dan jalur shadow menurut tier. Ini berpotensi memicu kerja ulang pipeline; hubungan dengan freeze di Poco F6 merupakan hipotesis dari kode, belum dikonfirmasi lewat GPU trace.
- WebGPU saat ini tidak memakai AO, Bloom, post-processing, atau dynamic shadow. Kontrol AO/Bloom tetap nonaktif pada renderer ini.

### 2.3 Authoritative simulation dan multiplayer

- `shared/simulation/CombatSystem.js:9`, `58`, `87`, `534`: audit menemukan potensi action lock yang belum konsisten antara attack, skill, Super, Flicker, dash, hard CC, dan airborne.
- `shared/simulation/MovementSystem.js:43`: dash memiliki jalur movement khusus; perlu dipastikan state/prediction menggunakan fase dan timing yang sama.
- `shared/simulation/MovementSystem.js:83`: Overcharge memengaruhi movement authority; prediksi client harus memakai multiplier/timer yang sama.
- `server/match/SnapshotBuilder.js:34-59`: status baru seperti Overcharge, defense break, stealth, Eagle Eye, recast, dash, dan skill trap harus selalu tercermin pada snapshot/protocol yang dibutuhkan renderer.
- `shared/simulation/CombatSystem.js:994-995`: defense break perlu memiliki durasi, event, dan expiry yang konsisten antara solo dan server.
- Parry Ello perlu membedakan arah incoming projectile dari posisi attacker saat projectile sudah bergerak.
- Dash/roll zero-distance dapat berbeda antara solo dan authoritative, khususnya cooldown, damage reduction, dan pemulihan ammo.
- Naka Super perlu membatalkan stealth dengan perilaku yang sama seperti action biasa bila stealth harus terputus.
- Sticky projectile yang menempel tidak boleh diekstrapolasi sebagai projectile bebas pada interpolasi snapshot.
- Domain, Barrier, Fuga tap/release/cancel, duplicate `actionId`, dan action lock belum memiliki coverage regression yang lengkap.

### 2.4 Solo renderer dan kontrol

- `public/engine/main.js:1391-1395`, `1968-2129`: touch guide untuk skill baru membutuhkan branch range/shape yang finite; perubahan agent menambahkan fallback guide dan guard angka non-finite.
- `public/engine/combat.js`: projectile cover penetration perlu dicegah agar low-FPS movement tidak melewati dinding permanen setelah melewati cover.
- `public/engine/brawlers.js:359`, `1120`, `1148`: defense-break timer harus diinisialisasi, decrement, dan dibersihkan pada respawn.
- `public/engine/combat.js`: Chain Lightning hanya boleh menerapkan hard CC setelah damage benar-benar berhasil.
- `public/engine/brawlers.js`: dash helper sebelumnya berpotensi menimpa gameplay facing/aim; Caltrops retreat dan Kunai recast perlu mempertahankan arah aim.
- `public/engine/brawlers.js` dan `public/engine/combat.js`: hard CC dan zero-distance dash harus memakai state transition yang sama dengan server.
- `public/engine/interfaces.js:1201`: tombol desktop/touch perlu menampilkan `WAIT` ketika dash, Flicker, airborne, atau network action sedang mengunci aksi.
- `public/engine/main.js:1214-1267`: event `SKILL_AURA`, `SKILL_CHAIN_HIT`, `SKILL_STICKY_ATTACH`, dan status network perlu memiliki visual handler yang benar.
- Caltrops, projectile, dan marker baru perlu memakai geometry/material cache atau pooling yang ada.
- Ello parry pose dan Kunai recast target perlu diperlakukan sebagai state runtime, bukan hanya flag UI.

### 2.5 Test, verifier, dan dokumentasi

- `tests/shared/roster-skills.test.js` tetap file baru/untracked dan perlu ikut commit bila regression coverage ini dipertahankan.
- Suite/verifier yang dijalankan sekarang mencakup Blue 2,4 detik, cooldown Barrier, durasi/domain snapshot, charged Fuga release, cover, sticky attach, airborne, Overcharge, action lock, dan visual lifecycle.
- Sebagian verifier masih memakai harness yang menyiapkan kondisi collision/action secara langsung; hasilnya bukan pengganti end-to-end gameplay.
- Coverage Fuga tap/cancel, Barrier terhadap banyak damage instance versus hazard tanpa attacker, dan kombinasi multiplayer lintas perangkat belum diklaim lengkap.
- README, AGENTS, dan laporan ini mencatat default WebGPU, fallback WebGL2, batasan WebGPU, serta hasil build/test. Nilai verifikasi lama di bagian 4 diperbarui ke run terbaru yang tercatat.

## 3. Perbaikan yang kini ada di working tree

### 3.1 Renderer dan performa

- `src/renderer-selection.js` memilih WebGPU secara default bila tersedia, tanpa membedakan desktop/mobile. Parameter eksplisit `?renderer=webgl` dipertahankan sebagai pilihan debug; tanpa parameter itu WebGL2 hanya dipilih jika WebGPU tidak tersedia.
- `src/bootstrap.js` mencoba menginisialisasi WebGPU lebih dulu. Jika API/adapter tidak tersedia atau inisialisasi/backend gagal, engine tetap dimuat memakai WebGL2. Setelah percobaan WebGPU gagal, canvas diganti sebelum fallback agar context gagal tidak dipakai ulang.
- HUD menunjukkan `WebGPU`, `WebGL2 (fallback)`, atau `WebGL2 (manual)` sesuai jalur yang aktif.
- Pada WebGPU, jumlah pool light dipatok empat dan dynamic shadow directional/lampu dimatikan pada semua tier. Ini menjaga topologi renderer tetap stabil selama pergantian quality.
- Render buffer memiliki floor HD (1280 × 720) jika resolusi native perangkat mendukungnya; FPS singkat di bawah 60 tidak langsung mengubah resolusi.
- Setelah dua jendela pengukuran berturut-turut di bawah 60, efek partikel dikurangi dan dynamic shadow WebGL dimatikan sementara. Efek kembali setelah dua jendela di atas 68. Hanya preset High yang berpindah ke Medium saat rata-rata FPS mencapai 30 atau kurang; Low tidak diturunkan lagi. Adaptasi ini tidak mengirim toast.
- Beban performa dikurangi melalui efek tambahan sebelum resolusi; struktur light/shadow WebGPU tetap stabil. Dampak pada Poco F6 tetap perlu dikonfirmasi melalui profiling dan pengukuran perangkat.

### 3.2 Gameplay, roster, dan sinkronisasi

- Durasi Blue Gojo disamakan menjadi 2,4 detik pada data shared dan solo; verifier serta regression test mengikuti durasi yang sama.
- Prediction client dan snapshot server membawa/mencerminkan state dash, airborne/hard CC, Flicker, Overcharge, timer terkait, serta status skill yang diperlukan.
- Interpolasi projectile sticky mengikuti target saat menempel dan tidak lagi mengekstrapolasi projectile tersebut seolah bergerak bebas.
- Auto-aim solo menargetkan fighter dalam jangkauan akuisisi serangan lebih dahulu; kotak item hanya dipilih bila tidak ada fighter terdekat. Bot Deathmatch memilih lawan hidup terdekat, termasuk bot, sementara lineup seeded mengisi semua karakter sebelum pengulangan. Batas solo Deathmatch tetap maksimal dua bot per karakter.
- Super charge tidak dihapus ketika karakter mati/respawn pada Deathmatch; charge dikonsumsi saat Super digunakan.
- Notifikasi toast otomatis untuk perubahan performa dihapus; kondisi render ditangani tanpa menghalangi HUD mobile.
- Working tree juga mencakup perubahan solo combat, UI skill, map collision, dan coverage regression. Perubahan yang sudah ada sebelum sesi ini tidak di-reset.

## 4. Verifikasi terbaru

- `npm test -- --run`: **25 file, 134 test lulus**.
- `npm run test:characters`: **lulus**, mencakup sepuluh rig gameplay, dua design rig, 20 jalur skill solo, dan pemeriksaan renderer/visual yang dicantumkan verifier.
- `npm run build`: **lulus**, menghasilkan 27 file dengan total 2.837.682 byte. Bundle WebGPU Three.js 781,37 kB (212,55 kB gzip), bundle utama 39,52 kB (13,90 kB gzip), dan Character Studio 7,47 kB (3,29 kB gzip). Vite tetap memberi peringatan chunk di atas 500 kB.
- `git diff --check`: lulus.
- Smoke test browser lokal yang tercatat sebelumnya melaporkan WebGPU aktif dan pergantian Low → Medium → High responsif pada 60 FPS. Smoke test tersebut mendahului kebijakan render terbaru; perilaku terbaru belum diuji ulang di browser atau Poco F6.

## 5. Batas verifikasi dan tindak lanjut

- Belum ada profiling GPU atau pengukuran fisik pada Poco F6; peningkatan FPS pada perangkat itu belum dapat diklaim.
- Belum dilakukan uji multiplayer dua perangkat, sentuhan pada ponsel fisik, soak test, atau balance playtest.
- Browser smoke test mencatat warning `THREE.WARNING: Multiple instances of Three.js being imported.` saat WebGPU module dan engine classic dimuat bersama. Menu/match tetap berjalan; dampaknya terhadap performa belum diukur.
- Tidak ada commit atau push. Perubahan tetap berada di working tree dan perubahan pengguna yang sudah ada dipertahankan.
