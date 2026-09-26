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

Status saat ini: mismatch durasi Blue sudah disamakan; WebGPU menjadi renderer utama dengan WebGL2 sebagai fallback; struktur light/shadow WebGPU distabilkan. Floor render HD yang pernah ditambahkan ternyata mengaburkan perbedaan preset. Penggantinya memakai skala terhadap ukuran viewport CSS: Low 0,90; Medium 1; High 1,25; Ultra 2, dengan batas jumlah pixel dan tanpa penyesuaian menurut DPR browser atau floor native HD+. Tinjauan kode pada 26 September juga menemukan fallback layout acak pada renderer dan collision saat map pack tidak tersedia, serta pergantian world yang melepas map lama sebelum map baru berhasil dibentuk. Perbaikan kini mempertahankan arena lama bila generasi gagal dan menampilkan recovery bila game loop/render berhenti. Screenshot yang dilaporkan belum cukup untuk memastikan apakah sesi tersebut memakai build campuran/service worker lama atau error runtime; smoke terbaru dan verifikasi perangkat menentukan batas kesimpulan.

### 2.1 Paritas Blue Gojo

- `shared/data/characters.js:16` memakai `duration: 2.4`.
- Pada snapshot audit awal, `public/engine/character-roster.js` memakai `duration: 1.4`.
- `scripts/verify-character-models.mjs:199`, `493`, `527`, dan `529` masih memakai ekspektasi 2.4.
- `README.md:124` dan `README.md:198` mendokumentasikan 2.4.
- Temuan teknisnya adalah **shared dan solo tidak sinkron**. Implementasi kini memakai 2,4 detik di kedua roster dan verifier.

### 2.2 Pemilihan renderer dan pergantian kualitas

- Pada baseline, WebGL menjadi default desktop, sedangkan WebGPU hanya dipilih di mobile. Ini tidak sesuai keputusan project bahwa WebGPU menjadi renderer utama.
- Snapshot awal audit menunjukkan pergantian quality berpotensi mengubah pool light dan shadow menurut tier. Implementasi saat ini mempertahankan empat light WebGPU dan menonaktifkan dynamic shadow di semua tier; perubahan tidak lagi mengubah topologi tersebut.
- WebGPU saat ini tidak memakai AO, Bloom, post-processing, atau dynamic shadow. Kontrol AO/Bloom tetap nonaktif pada renderer ini.
- Preset sebelumnya memakai field bernama `dpr` lalu membatasi nilainya dengan DPR browser. Pada browser DPR 1, High dan Ultra sama-sama tertahan di skala 1. Karena WebGPU belum menjalankan AO/Bloom/MSAA atau shadow dinamis, hanya perubahan buffer/LOD yang jelas terlihat pada renderer itu.
- `setQuality()` dapat memanggil `build()` untuk perubahan pass WebGL meski renderer aktif WebGPU; jalur itu tidak memasang composer di WebGPU, tetapi merupakan kerja pengaturan yang tidak perlu saat klik kualitas. Geometri semak juga dibuat dan dibuang setiap kali tier diganti.
- Loop `frame()` sebelumnya tidak menangkap exception sebelum `requestAnimationFrame()` berikutnya dijadwalkan. Error di update/render dapat membuat canvas/UI seolah membeku tanpa jalur pemulihan yang tampak.
- Low sebelumnya terutama mengurangi batas penerimaan partikel; geometri rumput, firefly, instanced debris yang digambar, bloom WebGL, dan shadow WebGL manual belum semuanya mengikuti preset Low.
- Counter settings membaca `render.calls` yang kumulatif sejak startup, dan FPS HUD menghitung delta simulasi yang dicap 50 ms. Keduanya dapat membuat diagnosa beban tampak lebih baik atau lebih besar daripada keadaan per frame.

### 2.3 Peta, tekstur, dan collision

- Saat map pack tidak terdaftar, `world.generate()` sebelumnya jatuh ke generator legacy yang menghasilkan layout procedural acak untuk map bernama. `MapDefinitions.createMapCollision()` memakai blocker pendekatan berdasarkan kategori recipe. Jika jalur client/server menerima keadaan tersebut, blueprint yang dirender dan collision dapat berbeda; ini cocok dengan gejala map tampak berubah serta pemain menembus cover, tetapi belum membuktikan keadaan service worker/server dari screenshot.
- `newWorld()` menghapus world yang sedang tampil sebelum membangun penggantinya. Error saat membentuk map bisa meninggalkan arena kosong atau tampak hitam; pemilihan River Fort juga tidak menyimpan world aktif jika konstruksi gagal.
- Texture Canvas procedural harus dibuat oleh `CanvasTexture` dari instance Three.js yang sama dengan renderer. Runtime bersama mempertahankan identitas tersebut, sedangkan smoke sebelumnya sudah menunjukkan tekstur procedural tampil sebelum regression terbaru.

### 2.4 Authoritative simulation dan multiplayer

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

### 2.5 Solo renderer dan kontrol

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

### 2.6 Test, verifier, dan dokumentasi

- `tests/shared/roster-skills.test.js` tetap file baru/untracked dan perlu ikut commit bila regression coverage ini dipertahankan.
- Suite/verifier yang dijalankan sekarang mencakup Blue 2,4 detik, cooldown Barrier, durasi/domain snapshot, charged Fuga release, cover, sticky attach, airborne, Overcharge, action lock, dan visual lifecycle.
- Sebagian verifier masih memakai harness yang menyiapkan kondisi collision/action secara langsung; hasilnya bukan pengganti end-to-end gameplay.
- Coverage Fuga tap/cancel, Barrier terhadap banyak damage instance versus hazard tanpa attacker, dan kombinasi multiplayer lintas perangkat belum diklaim lengkap.
- README, AGENTS, dan laporan ini mencatat default WebGPU, fallback WebGL2, batasan WebGPU, serta hasil build/test. Nilai verifikasi harus mengikuti run akhir saat ini.

## 3. Perbaikan yang kini ada di working tree

### 3.1 Renderer dan performa

- `src/renderer-selection.js` memilih WebGPU secara default bila tersedia, tanpa membedakan desktop/mobile. Parameter eksplisit `?renderer=webgl` dipertahankan sebagai pilihan debug; tanpa parameter itu WebGL2 hanya dipilih jika WebGPU tidak tersedia.
- `src/bootstrap.js` mencoba menginisialisasi WebGPU lebih dulu. Jika API/adapter tidak tersedia atau inisialisasi/backend gagal, engine tetap dimuat memakai WebGL2. Setelah percobaan WebGPU gagal, canvas diganti sebelum fallback agar context gagal tidak dipakai ulang.
- HUD menunjukkan `WebGPU`, `WebGL2 (fallback)`, atau `WebGL2 (manual)` sesuai jalur yang aktif.
- Pada WebGPU, jumlah pool light dipatok empat dan dynamic shadow directional/lampu dimatikan pada semua tier. Ini menjaga topologi renderer tetap stabil selama pergantian quality.
- Render buffer dihitung dari ukuran canvas CSS dengan skala preset 0,90/1/1,25/2 untuk Low/Medium/High/Ultra, tidak dibatasi DPR browser, dan tetap dibatasi anggaran 1 juta pixel pada low-end coarse, 1,5 juta pada coarse lain, serta 5 juta pada fine-pointer. Tidak ada floor native HD/HD+.
- Low mengurangi bloom WebGL, shadow WebGL manual, batas dan jumlah partikel aktif, instanced debris yang digambar, firefly yang dianimasikan, serta detail vertex bilah rumput tanpa mengurangi cakupan semak gameplay. Dua jendela FPS di bawah 60 mengurangi efek opsional; pulih setelah dua jendela di atas 68. High berpindah ke Medium setelah dua jendela berturut-turut rata-rata 30 FPS atau kurang. Resolusi tidak turun otomatis dan tidak ada toast.
- Diagnostik mengambil draw call per frame, menghitung FPS dari waktu antar-frame aktual, dan menampilkan CSS size, DPR render, serta ukuran buffer. Waktu render WebGPU diberi label CPU submit, bukan waktu eksekusi GPU.
- Perubahan kualitas WebGPU memperbarui buffer/LOD tanpa membangun composer WebGL. Geometri grass LOD disimpan per-world dan dipakai ulang saat preset bolak-balik; struktur empat light/shadow WebGPU tetap stabil.
- Perbaikan Three.js memakai satu runtime bagi WebGPU dan engine klasik; alias `cr` tetap `CanvasTexture`, sehingga kanvas tekstur procedural tidak kehilangan identitas tipe saat dipakai Three.js.
- Loop frame menangkap exception renderer dan menampilkan opsi reload WebGL2/reload, sementara kehilangan device WebGPU dicatat untuk diagnosis. Pergantian quality memulihkan preset sebelumnya jika salah satu efek gagal diterapkan.
- Regresi River Fort direproduksi sebagai `ReferenceError: e is not defined` ketika tekstur normal air dibuat: `world.js` masih memakai alias minified milik runtime Three.js lama untuk `RepeatWrapping`, padahal alias itu dihapus saat runtime digabung. Pemakaian `THREE.RepeatWrapping` memperbaiki kedua sumbu tekstur; verifier kini mengunci nilai wrapping tersebut.
- Dampak FPS nyata tetap perlu dikonfirmasi dengan profiling di Poco F6; perubahan menargetkan beban yang sudah teridentifikasi dalam kode.

### 3.2 Map dan collision

- Map bernama harus menghasilkan blueprint dengan `id` yang sama dengan pilihan. Fallback layout legacy dibatasi ke map legacy `open` dan `stepped`; collision tidak lagi membuat perkiraan recipe ketika blueprint map bernama tidak ada.
- Konstruksi `newWorld()` sekarang membuat dan memvalidasi world pengganti dulu, memperbarui palette/lampu setelah konstruksi berhasil, dan baru menghapus world lama. Kegagalan pemilihan arena mengembalikan pilihan serta menampilkan map yang sebelumnya aktif.
- Error pembuatan tekstur River Fort sebelumnya terjadi saat pergantian arena setelah world aktif dihapus; gabungan dua perilaku itu menjelaskan layar kosong dan pilihan map yang tampak lompat. Perbaikan tekstur dan pergantian world transactional mencegah kegagalan konstruksi mengosongkan arena aktif.
- Regression test memeriksa 24 map bernama pada tiga seed, semua sel WALL/WATER yang harus solid, spawn yang walkable, serta River Fort dan jalur bridge-nya.

### 3.3 Gameplay, roster, dan sinkronisasi

- Durasi Blue Gojo disamakan menjadi 2,4 detik pada data shared dan solo; verifier serta regression test mengikuti durasi yang sama.
- Prediction client dan snapshot server membawa/mencerminkan state dash, airborne/hard CC, Flicker, Overcharge, timer terkait, serta status skill yang diperlukan.
- Interpolasi projectile sticky mengikuti target saat menempel dan tidak lagi mengekstrapolasi projectile tersebut seolah bergerak bebas.
- Auto-aim solo menargetkan fighter dalam jangkauan akuisisi serangan lebih dahulu; kotak item hanya dipilih bila tidak ada fighter terdekat. Bot Deathmatch memilih lawan hidup terdekat, termasuk bot, sementara lineup seeded mengisi semua karakter sebelum pengulangan. Batas solo Deathmatch tetap maksimal dua bot per karakter.
- Super charge tidak dihapus ketika karakter mati/respawn pada Deathmatch; charge dikonsumsi saat Super digunakan.
- Notifikasi toast otomatis untuk perubahan performa dihapus; kondisi render ditangani tanpa menghalangi HUD mobile.
- Working tree juga mencakup perubahan solo combat, UI skill, map collision, dan coverage regression. Perubahan yang sudah ada sebelum sesi ini tidak di-reset.

### 3.4 Menu utama dan pilihan match

- Beranda memakai hierarki dua kolom: Play sebagai aksi utama, Multiplayer sebagai aksi kedua, dan satu ringkasan brawler/mode/arena yang bisa langsung diedit. Arena latar yang sudah ada tetap terlihat sebagai konteks visual.
- Wordmark “GELUD BAKUHANTAM” dipusatkan dan disusun dua baris mengikuti logo referensi; tagline ikut rata tengah. Label dekoratif “SOLO ARENA” disembunyikan pada layar sempit agar tidak bersaing dengan logo.
- Katalog karakter, mode, dan arena hanya ditampilkan di dialog pemilihnya masing-masing. Kartu roster, mode, dan map memakai builder serta handler lama agar pemilihan dan state match tetap menjadi sumber data yang sama.
- Tata letak desktop, mobile portrait, dan mobile landscape memiliki aturan responsif terpisah. Pada landscape pendek, tombol Play tetap terlihat tanpa scroll halaman; install app masih tersedia pada layar sempit.
- Dialog bisa ditutup lewat tombol close, klik backdrop, atau Escape. Fokus kembali ke tombol pembuka; perpindahan pilihan memperbarui ringkasan di beranda. Tidak ada renderer atau canvas 3D tambahan untuk kartu menu.

## 4. Pedoman perubahan aman untuk render pipeline

Bagian ini menjadi checklist wajib sebelum mengubah renderer, kualitas, ukuran buffer, material/tekstur, pergantian map, atau integrasi Three.js. Jika kebutuhan produk berubah, revisi aturan, regression test, dan dokumentasi kualitas secara bersamaan; jangan mengubah invarian ini secara tidak sengaja saat mengerjakan fitur lain.

### 4.1 Invarian yang harus dipertahankan

- **Satu runtime Three.js:** seluruh import `three` dan addon harus berakhir pada core yang sama. `src/three-global-runtime.js` memasang class global sebelum script engine klasik; alias Vite di `vite.config.js` menyatukan import core. Jangan menambah CDN, salinan vendor kedua, atau core berbeda khusus WebGPU. `CanvasTexture`, konstanta wrapping, geometry, material, dan renderer harus berasal dari runtime yang sama. Gunakan konstanta bernama seperti `THREE.RepeatWrapping`, jangan mengandalkan alias minified lama.
- **Urutan engine global tetap:** script `public/engine/*.js` tetap dimuat sebagai script klasik dalam urutan yang tercantum pada bagian arsitektur. Jangan mengubah urutan, menjadikannya module, atau memindah inisialisasi global sebelum semua dependency-nya diperiksa.
- **Pemilihan backend tetap eksplisit:** WebGPU menjadi default. WebGL2 hanya dipakai sebagai fallback otomatis atau pilihan debug `?renderer=webgl`; setelah inisialisasi WebGPU gagal, fallback memakai canvas baru.
- **Skala kualitas dihitung dari ukuran canvas CSS:** Low 0,90×, Medium 1×, High 1,25×, Ultra 2×, independen dari `devicePixelRatio` dan resolusi fisik perangkat. Batas buffer tetap 1 juta pixel untuk perangkat low-end coarse-pointer, 1,5 juta untuk coarse-pointer lain, dan 5 juta untuk fine-pointer. Jangan menambahkan floor native HD/HD+ atau mengalikan skala dengan DPR tanpa keputusan produk baru. Saat melaporkan ukuran, catat viewport CSS, DPR, skala efektif setelah batas pixel, serta ukuran buffer aktual.
- **Topologi WebGPU stabil saat runtime:** pertahankan empat point-light pool dan jangan menambah/menghapus light atau shadow caster ketika preset berubah. WebGPU tidak menjalankan AO/Bloom/post-processing WebGL atau dynamic shadow; perubahan quality WebGPU mengatur buffer, LOD, dan efek yang didukung, bukan membangun composer WebGL.
- **Perubahan kualitas ringan dan dapat dipulihkan:** gunakan cache untuk geometri LOD; jangan membuat lalu membuang ulang geometri/material bersama pada setiap klik. Terapkan preset secara transactional: bila satu tahap gagal, kembalikan preset dan state renderer sebelumnya. Low adalah tier terendah dan tidak diturunkan otomatis; saat beban sementara naik, kurangi efek opsional lebih dulu. Hanya High yang boleh berpindah ke Medium setelah dua jendela berturut-turut rata-rata 30 FPS atau kurang.
- **Pergantian arena tidak boleh merusak frame aktif:** renderer dan collision menggunakan blueprint, `mapId`, serta `mapSeed` yang sama. Bentuk dan validasi world pengganti sebelum melepas world aktif. Map bernama yang blueprint-nya hilang harus gagal dengan error yang terlihat; jangan menggantinya dengan layout acak atau collision perkiraan.
- **Kegagalan render harus dapat dipulihkan:** tangkap error dari update/render dan tangani `GPUDevice.lost`. Jangan membiarkan exception menghentikan loop tanpa pesan atau jalur reload/fallback yang jelas.

### 4.2 Urutan kerja sebelum dan selama perubahan

1. Catat kondisi awal working tree dan jangan membuang perubahan lain. Tentukan jalur yang disentuh: bootstrap/backend, runtime Three.js, ukuran buffer, quality/LOD/effects, material/tekstur, atau world/map.
2. Telusuri pemilik state dari awal sampai akhir: bootstrap → renderer/runtime → `render-pipeline.js` → pemanggil quality di `main.js` → resource world/effects. Untuk map, ikut telusuri blueprint dan collision shared/server. Hindari memperbaiki gejala hanya di menu atau hanya di renderer.
3. Buat perubahan sekecil mungkin dan tambahkan regression test untuk perilaku yang rentan: identitas runtime/`CanvasTexture`, konstanta tekstur, skala CSS dan batas pixel, tidak ada composer rebuild atau perubahan topologi pada WebGPU, reuse geometri, rollback quality, dan world lama tetap hidup ketika konstruksi map gagal.
4. Setelah perubahan engine/render, jalankan `npm run test:characters`, `npm test -- --run`, `npm run build`, dan `git diff --check`. Pastikan script engine dan asset engine di output `dist/` berasal dari source build yang sama.
5. Smoke test build terbaru di WebGPU dan WebGL2 debug/fallback. Ganti Low, Medium, High, dan Ultra saat menu serta match berjalan; amati buffer efektif, tekstur, LOD, HUD, dan console. Pilih dan mulai River Fort, pindah arena beberapa kali, dan pastikan collision sesuai benda yang terlihat.
6. Ulangi pemeriksaan pada viewport CSS mobile dan desktop. Catat viewport CSS, DPR, coarse/fine pointer, anggaran pixel yang berlaku, dan ukuran buffer. Jangan menyimpulkan ukuran viewport CSS dari resolusi panel fisik atau memakai FPS browser desktop sebagai benchmark ponsel.
7. Verifikasi output baru melewati cache/service worker dengan build ID/asset terbaru. Bila hasil lokal dan build berbeda, periksa `dist`, precache, dan cache sebelum mengubah source lagi.

### 4.3 Syarat klaim hasil

- Klaim “preset berubah” perlu menunjukkan ukuran buffer efektif atau efek/LOD yang berubah, bukan hanya tombol pilihan yang berpindah.
- Klaim “tidak ada freeze/blank screen” memerlukan smoke test pergantian quality dan map dengan console bersih serta tanpa recovery overlay. Unit test saja tidak membuktikan jalur browser.
- Klaim peningkatan performa mobile memerlukan pengukuran pada perangkat fisik dengan renderer, viewport, preset, map, dan kondisi match yang dicatat. Hasil browser automation hanya membuktikan perilaku browser pada lingkungan itu.

## 5. Verifikasi terbaru

- `npm test -- --run`: lulus, 26 file dan 207 test.
- `npm run test:characters`: lulus untuk 10 rig gameplay dan dua design rig beserta regression kualitas, runtime Three.js, tekstur air, dan renderer. Satu pesan `synthetic quality failure` memang dicetak oleh test rollback untuk membuktikan preset sebelumnya dipulihkan; proses berakhir sukses.
- `npm run build`: lulus; 28 file, 2.666.292 byte. `index.html` 20,32 kB (5,51 kB gzip), CSS aplikasi 63,10 kB (12,48 kB gzip), JavaScript utama 40,28 kB (14,29 kB gzip), runtime Three.js bersama 637,30 kB (165,22 kB gzip), renderer WebGPU 577,87 kB (160,87 kB gzip), dan Character Studio 7,49 kB (3,29 kB gzip). Vite tetap memberi peringatan chunk di atas 500 kB.
- `git diff --check`: lulus.
- Smoke browser WebGPU berhasil memulai River Fort dengan tekstur air/objek tampil serta mengganti Low, Medium, High, dan Ultra tanpa recovery overlay. Pada viewport CSS 1920 × 1080, buffer masing-masing 1728 × 972, 1920 × 1080, 2400 × 1350, dan 2981 × 1677; Ultra efektif 1,55× karena anggaran 5 juta pixel fine-pointer.
- Smoke UI menu berhasil pada 1440 × 900 desktop, 844 × 390 landscape, dan 667 × 375 landscape. Halaman tidak overflow; mode/arena/brawler terbuka sebagai dialog, ringkasan ikut berubah ketika mode atau brawler dipilih, Escape menutup dialog dan mengembalikan fokus, serta browser tidak mencatat error console.
- Temuan yang direproduksi: pembentukan tekstur normal air River Fort melempar `ReferenceError` karena konstanta `RepeatWrapping` memakai alias Three.js lama yang tak lagi tersedia setelah runtime disatukan. Exception saat pergantian map sebelumnya terjadi setelah world aktif dibuang, sehingga layar dapat menjadi kosong. Regresi lain yang diperbaiki adalah fallback map bernama ke layout acak dan collision pendekatan yang bisa berbeda dari map yang dirender.

## 6. Batas verifikasi dan tindak lanjut

- Belum ada profiling GPU atau pengukuran fisik pada Poco F6; peningkatan FPS pada perangkat itu belum dapat diklaim.
- Belum dilakukan uji multiplayer dua perangkat, sentuhan pada ponsel fisik, soak test, atau balance playtest.
- FPS yang dilaporkan browser otomasi tidak dipakai sebagai benchmark karena cadence tab tidak mewakili perangkat fisik.
- Tidak ada commit atau push. Perubahan tetap berada di working tree dan perubahan pengguna yang sudah ada dipertahankan.
