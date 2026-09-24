# Gelud BakuHantam — Roster dan Skill v2 (rancangan)

Status: **proposal untuk ditinjau dan diuji**, belum diterapkan ke game. Dokumen ini mengolah tiga arahan roster yang dibagikan pengguna pada 24 September 2026. Angka adalah titik awal playtest, bukan hasil balance yang sudah terbukti.

## Arah desain

- Delapan karakter lama mempertahankan serangan dasar, Super, dan peran utamanya. Setiap karakter mendapat Skill 1 dan Skill 2.
- Dua karakter baru memakai **identitas orisinal sementara**: **Aksa** (pengendali ruang, ID `aksa`) dan **Rengga** (petarung tebasan, ID `rengga`). Keduanya mengambil *arah warna dan siluet* dari gambar redesign, lalu mengubah rambut, motif kostum, simbol, nama, dan istilah jurus. Nama kerja ini dapat diganti sebelum implementasi.
- Semua efek yang mengubah hasil pertandingan berlaku sama di solo dan multiplayer melalui simulasi bersama 30 Hz. Client menggambar efek, suara, animasi, dan prediction; server menetapkan hasil multiplayer.
- Desain ini mengutamakan kemampuan lawan untuk melihat ancaman, menghindar, dan membalas. Tidak ada skill biasa yang memberi damage besar, mobilitas tinggi, dan kontrol penuh sekaligus.

## Aturan bersama

1. **Waktu dan cooldown.** Durasi diukur dengan tick simulasi 30 Hz. Cooldown mulai saat aksi diterima simulasi. Aksi yang dibatalkan setelah mulai tetap memakai cooldown. Skill tidak bisa dipakai saat mati, spawn protection, hard CC, atau aksi lain yang memang mengunci skill. HUD menunjukkan waktu tersisa dari state simulasi, termasuk status `WAIT` saat siap tetapi terkunci.
2. **Damage instance.** Setiap pellet, tebasan beruntun, dan tick area dihitung terpisah dengan urutan deterministik. Barrier atau parry satu hit memblokir tepat satu instance beserta efek kontrol yang melekat pada instance itu. Serangan yang sama tidak boleh mengenai target dua kali kecuali secara jelas memiliki hit/tick berikutnya.
3. **Hard CC.** Stun dan freeze maksimal **1,5 detik** per aplikasi. Selama 2 detik setelah hard CC berakhir, hard CC berikutnya pada target yang sama berdurasi **65%**. Interrupt hanya menghentikan cast/charge yang belum selesai; ia tidak menghapus arah aim terakhir dan tidak membatalkan aksi instan yang sudah terjadi.
4. **Status bertumpuk.** Slow terkuat saja yang berlaku. Bleed dan burn dari sumber yang sama me-refresh durasi, bukan menjumlah damage. Pengurangan defense dari sumber yang sama me-refresh durasi. Bonus speed efektif dari skill dan item dibatasi **40% di atas speed karakter** sebelum pengaruh permukaan map.
5. **Peta.** Bedakan cover yang bisa dihancurkan, rintangan permanen, dan batas arena. Efek penghancuran hanya mengenai cover yang ditandai bisa dihancurkan. Tembakan penembus cover tidak keluar dari batas arena. Wall stun terjadi hanya setelah gerak knockback benar-benar berbenturan dengan collision; satu cast dapat memicu satu wall stun per target.
6. **Aksi jaringan.** Setiap aktivasi, release, dan recast skill punya `actionId`. Simulasi menyimpan sekumpulan ID aksi terbaru per pemain agar kiriman ulang atau paket terlambat tidak menjalankan skill dua kali. Input gerak tetap memakai `seq`; `actionId` tidak menggantikannya.
7. **Resource.** Ello dan Syafiah tidak memakai ammo. Tidak ada meter Focus baru pada proposal ini; bar di bawah HP tetap menampilkan Super. Item ammo mengikuti aturan saat ini: pada karakter tanpa ammo, item tersebut mengisi 20% Super. Aksa menampilkan satu indikator Barrier terpisah.
8. **Super charge.** Delapan karakter lama memakai ambang charge yang ada saat ini. Aksa mulai di **3.800** dan Rengga **4.000** sebagai angka uji. Semua charge dihitung oleh simulasi, bukan dari animasi client.

## Kontrol

| Perangkat | Serangan dasar | Skill 1 | Skill 2 | Super | Utility |
|---|---|---|---|---|---|
| Desktop | Kontrol serangan saat ini | `Q` atau `1` | `E` atau `2` | `Space` | Item 1, Item 2, Flicker `Shift` tetap seperti sekarang |
| Touch | Tombol serang saat ini | Tombol atas pada lengkung kanan | Tombol tengah pada lengkung kanan | Tombol terbawah pada lengkung kanan | Item 1, Item 2, Flicker di baris utility |

`E` masih mengaktifkan Super pada implementasi sekarang. Saat rancangan ini diimplementasikan, binding itu perlu dipindahkan ke Skill 2 dan Super hanya memakai `Space`, supaya satu tombol tidak menjalankan dua aksi. Tombol touch Skill 1 dan Skill 2 ditargetkan minimal 68 px; Super tetap 112 px. Layout harus mengikuti safe area, mode tangan kiri, dan multi-touch joystick tanpa pointer saling merebut.

## Delapan karakter lama

### Athallah (`dusty`) — pembuka jarak dekat

**Dasar:** 3.900 HP, speed 3,15, 3 ammo; shotgun 5 × 330, range 7. Super shotgun 9 × 340 dan knockback 9 tetap.

- **Skill 1 — Combat Slide:** Dash 3,5 unit ke arah gerak selama 0,25 detik. Damage reduction 25% selama slide. Setelah slide benar-benar selesai, pulihkan 1 ammo hingga batas maksimum. Cooldown **8 detik**. Benturan map menghentikan slide dan tetap dianggap selesai; tidak ada ammo jika aksi dibatalkan sebelum bergerak.
- **Skill 2 — Concussive Shell:** Satu tembakan cone range 4, damage 450, knockback 4,5. Benturan cover atau rintangan memberi stun 0,6 detik. Cooldown **10 detik**. Satu target menerima satu hit per cast.

### Zeyd (`ace`) — marksman jarak jauh

**Dasar:** 3.000 HP, speed 3,25, 3 ammo; burst 6 × 200, range 8,2. Super 12 × 220 menembus pemain dan tidak memberi knockback.

- **Skill 1 — Piercing Bolt:** Proyektil lurus range 9, damage **480** ke setiap target yang dilewati. Menembus pemain dan cover yang bisa dihancurkan tanpa merusak cover, tetapi berhenti pada rintangan permanen. Target terkena pengurangan defense **12% selama 2,5 detik**, tanpa stack. Cooldown **8 detik**. Damage skill ini kini ditentukan secara eksplisit.
- **Skill 2 — Tactical Roll:** Roll 3 unit, lalu pulihkan **1 ammo** saat selesai. Cooldown **9 detik**. Tidak memberi invulnerability penuh; collision map tetap berlaku.

### Azka (`fuse`) — penguasa area

**Dasar:** 2.900 HP, speed 3,00, 5 ammo; bom lob **870** damage, range 7,5. Super 2.400 damage tetap, menghancurkan cover yang bisa dihancurkan.

- **Skill 1 — Sticky Grenade:** Lempar range 4,5. Meledak setelah 2 detik: 700 damage dan knockback kecil. Bisa menempel pada target atau cover. Cooldown **9 detik**. Granat yang menempel pada cover hilang jika cover tersebut hancur lebih dulu.
- **Skill 2 — Smoke Screen:** Area radius 2,8 selama 3,5 detik; musuh di dalamnya melambat 20%. Azka tersamar hanya selama berada di area. Saat Azka menyerang, ia terlihat selama 0,5 detik; lalu dapat tersamar lagi jika masih di asap. Cooldown **13 detik**. Efek pengurangan pandangan hanya visual pada client dan tidak mengubah hasil hit authoritative.

### Einar (`titan`) — tank pembuka pertarungan

**Dasar:** 6.200 HP, speed **3,10**, 3 ammo; empat pukulan × 390, range 2,7. Super leap range 6, damage 1.000, knockback 11.

- **Skill 1 — Iron Charge:** Maju maksimal 4 unit; musuh pertama yang ditabrak menerima 300 damage, knockback kecil, dan interrupt terhadap charge/cast yang masih berjalan. Cooldown **9 detik**. Charge berhenti pada collision permanen.
- **Skill 2 — Taunt Echo:** Radius 3,5. Einar memperoleh damage reduction **30% selama 1,75 detik**. Musuh yang mencoba bergerak menjauhinya mendapat penalti speed **30%** selama berada dalam radius dan durasi efek; bergerak mendekat atau menyamping tidak dipenalti. Cooldown **12 detik**. Efek ini tidak memaksa input gerak musuh.

### Nopal (`volt`) — skirmisher listrik

**Dasar:** 3.400 HP, speed 3,55, 3 ammo; burst 3 × 380, range 8,4. Super 8 × 310 menembus target.

- **Skill 1 — Chain Lightning:** Serangan pertama range 6,5 memberi 350 damage. Rantai melompat ke maksimal dua target lain dalam jarak 2,5 unit dari target sebelumnya, masing-masing 250 damage. Target pertama menerima interrupt singkat **0,17 detik** hanya jika sedang channel/charge; aim terakhir tetap tersimpan. Cooldown **7 detik**. Setiap target maksimal terkena sekali per cast.
- **Skill 2 — Overcharge Volt:** Selama 3 detik, speed +15% dan basic attack menembakkan 4 proyektil alih-alih 3. Cooldown **12 detik**. Buff selesai saat mati; batas bonus speed bersama tetap berlaku.

### Naka (`naka`) — assassin penyergap

**Dasar:** 3.200 HP, speed 3,90, 3 ammo; 3 × 280 shuriken, hit saat kembali memberi 50% damage asli. Super dash 6 unit, damage 900.

- **Skill 1 — Smoke Bomb:** Stealth pribadi selama **2 detik**. Serangan, skill lain, Super, atau direct damage membatalkannya. Tick DoT lama tidak otomatis membuka stealth. Cooldown **14 detik**. Siluet dan suara aktivasi memberi lawan petunjuk singkat sebelum Naka menghilang.
- **Skill 2 — Kunai Dash:** Kunai range 6. Jika mengenai target, tombol dapat ditekan lagi dalam 2 detik untuk dash ke sisi belakang target. Cooldown **10 detik**, dihitung sejak lemparan awal. Titik akhir dipilih dari posisi valid terdekat; bila tidak ada posisi aman, recast gagal tanpa memindahkan Naka. Target yang mati atau keluar dari match membatalkan recast.

### Ello (`ello`) — samurai duel

**Dasar:** 5.500 HP, speed 3,30, tanpa ammo; combo 550/650/800, range 2,9. Super Iaido 1.100, atau 1.500 setelah parry sukses.

- **Skill 1 — Parry Stance:** Jendela aktif **0,55 detik**, hanya terhadap serangan dari depan (sudut total 120°). Memblokir satu damage instance beserta CC-nya; combo dapat langsung dilanjutkan. Cooldown **8 detik**. Keberhasilan parry memberi jendela 2 detik untuk Iaido 1.500. Multi-hit berikutnya tetap dapat mengenai Ello.
- **Skill 2 — Swift Flash:** Dash tebas 3,5 unit, 300 damage pada setiap target yang dilalui, maksimal satu hit per target. Kebal CC hanya selama gerak dash; damage tetap masuk. Cooldown **10 detik**. Benturan map menghentikan dash.

Super Iaido memakai bonus dari Parry Stance. Fase guard pada Super lama perlu disatukan dengan aturan ini saat implementasi agar tidak tercipta dua parry beruntun yang saling tumpang tindih.

### Syafiah (`syafiah`) — pemanah presisi

**Dasar:** 2.900 HP, speed 3,20, tanpa ammo; charge shot 650–1.050 damage, range 10–12,5. Quickdraw +10% pada jendela 0,70–0,80 detik. Super Arrow Shower 5 × 250 tetap.

- **Skill 1 — Eagle Eye:** Selama 5 detik, kamera dapat menampilkan area hingga **1,20×** lebih luas tanpa mengubah akurasi/server hitbox. Satu charged shot berikutnya menembus **satu cover yang bisa dihancurkan**, lalu efek pierce habis. Cooldown **14 detik**. Rintangan permanen tetap menghentikan panah.
- **Skill 2 — Caltrops Trap:** Lompat mundur maksimal 2,2 unit mengikuti collision, meninggalkan jebakan di posisi awal selama 3 detik. Musuh yang menginjaknya melambat **35%** dan menerima **80 damage/detik selama 2 detik**; efek pada target tidak stack. Cooldown **11 detik**.

## Dua karakter baru — identitas orisinal sementara

### Aksa (`aksa`) — pengendali ruang

**Visual:** Postur ramping, rambut perak berpotongan asimetris, mantel biru gelap yang terbelah di sisi, bagian dalam warna tembaga, dan sarung tangan berpanel geometris. Efek berupa garis lipatan ruang **cyan dan amber**; wajah terbuka, tanpa penutup mata atau lambang yang merujuk karakter asal. Dari kamera atas, tepi mantel dan kedua warna energi menjadi penanda utama.

**Dasar:** 3.000 HP, speed 3,25, tanpa ammo, Super charge 3.800. Perannya kontrol posisi dengan daya tahan rendah.

- **Pasif — Lapisan Ruang:** Setelah **10 detik tanpa menerima hit**, Aksa memperoleh satu barrier. Barrier meniadakan satu damage instance dan CC yang melekat padanya, lalu timer 10 detik dimulai lagi. Satu pellet dari shotgun menghabiskan barrier; pellet lain tetap dihitung. Barrier tidak memblokir hazard map yang tidak berasal dari serangan pemain.
- **Basic — Tekan Balik:** Combo tiga hit, reset 0,75 detik: **350 / 350 / 600** damage. Dua hit awal menarik target yang benar-benar terkena sejauh maksimal 0,3 unit melalui collision; hit ketiga mendorong 5 unit. Tidak ada tarikan AoE gratis dari pukulan yang meleset.
- **Skill 1 — Pusat Tarik:** Orb range 7,5 membentuk area radius 2,4 selama 1,4 detik. Target di dalam menerima **300 damage sekali per cast**, slow **30%**, dan tarikan bertahap yang diselesaikan setiap tick dengan collision. Cooldown **10 detik**. Dash dapat dipakai untuk keluar.
- **Skill 2 — Dorong Garis:** Gelombang lurus range 5, damage **700**, knockback **5,5 unit**. Tabrakan nyata dengan rintangan memberi stun **0,7 detik** sekali per target. Cooldown **11 detik**.
- **Super — Ruang Senyap:** Telegraph **0,5 detik** sebelum area radius **3,8** aktif. Musuh yang ada di area saat aktivasi terkena freeze **1,5 detik**, tunduk pada aturan hard CC bersama. Tidak ada pengurangan defense. Musuh yang masuk sesudah aktivasi tidak mendapat freeze baru. Area visual bertahan hanya untuk menunjukkan akhir efek; ia tidak mengunci gerak secara permanen.

### Rengga (`rengga`) — petarung tebasan agresif

**Visual:** Tubuh tegap, rambut marun pendek, pelindung bahu tidak simetris, kain pinggang berlapis, dan panel logam retak yang menyala merah pada tangan. Dua lengan normal; tidak memakai tanda wajah/tubuh atau bentuk kuil dari referensi asal. Efek tebasan berupa pecahan merah pendek dengan bentuk yang mudah dibaca pada kamera atas.

**Dasar:** 4.200 HP, speed **3,25**, 3 ammo, reload 1,1 detik, Super charge 4.000. Perannya menekan musuh dekat dan memaksa mereka keluar dari area.

- **Pasif — Dorongan Tempur:** Eliminasi memulihkan **15% HP maksimum (630 HP)** dan memberi speed +10% selama 2 detik. Internal cooldown **4 detik**; eliminasi selama cooldown tidak memberi heal atau me-refresh buff.
- **Basic — Sayat:** Cone range 3, damage **450**, biaya 1 ammo. Tiga hit basic pada target yang sama dalam 1,5 detik memicu bleed **80 damage/detik selama 3 detik** (total 240). Bleed hanya me-refresh, tidak stack.
- **Skill 1 — Iris Jauh:** Tebasan lurus range 7,5, damage **600**, menembus maksimal tiga pemain/bot; berhenti pada cover dan rintangan. Cooldown **7 detik**.
- **Skill 2 — Bara Lepas:** Tap: proyektil 500 damage, range 6. Hold 1 detik: proyektil **1.100 damage**, range 9,5, ledakan radius 1,8, burn **90 damage/detik selama 3 detik**. Cooldown **12 detik**, mulai saat charge diterima. Release dan pembatalan memakai aturan `actionId` yang sama.
- **Super — Lingkar Sayat:** Telegraph **0,45 detik**, lalu zona radius **4,5** aktif 4 detik. Delapan tick setiap 0,5 detik memberi **180 damage per tick** (maksimal 1.440 jika target bertahan penuh di dalam area). Tick pertama menghancurkan cover yang bisa dihancurkan; batas arena dan rintangan permanen tetap. Tidak ada slow, pull, atau stun. Damage hanya masuk saat target masih di area pada tick tersebut.

## Aturan implementasi dan validasi saat rancangan disetujui

- Simpan cooldown, status, posisi dash/pull/knockback, cover rusak, dan hasil hit di simulasi bersama; kirim state yang diperlukan melalui snapshot 15 Hz dan gameplay event terpisah. Jangan membuat snapshot tambahan setiap event.
- Recast Naka dan charge Rengga memerlukan start/release/cancel yang eksplisit. Simpan arah aim terakhir saat input bernilai `(0, 0)` agar melee, proyektil, dan charge tetap punya arah yang valid.
- Uji authoritative: barrier versus pellet dan tick AoE; parry versus multi-hit; hard CC beruntun; knockback versus cover dan batas map; deduplikasi aksi yang tiba tidak berurutan; cooldown saat mati/respawn; dua slot item; kondisi reconnect.
- Uji visual solo dan multiplayer di desktop serta touch: tombol baru, joystick bersamaan dengan skill, mode tangan kiri, safe area, indikator cooldown, telegraph Super, area smoke/domain, dan performa efek berbasis pool.
- Ukur balance per karakter setelah dimainkan: pick rate, win rate, damage per menit, kematian, hit rate skill, rata-rata durasi hard CC yang diterima, jarak tempuh, barrier block, parry sukses, dan lama bertahan hidup. Ubah angka setelah ada sampel pertandingan yang cukup.

## Keputusan yang disengaja dibanding dokumen v1

- Kontrol desktop mengikuti keputusan pengguna: Super `Space`, Skill 1 `Q/1`, Skill 2 `E/2`. Binding `E` untuk Super yang ada sekarang harus dihapus saat implementasi.
- Gojo/Sukuna dijadikan **Aksa/Rengga** sebagai identitas kerja orisinal. Keduanya tetap mengisi peran pengendali ruang dan petarung tebasan dari brief.
- Zeyd mendapat damage Piercing Bolt yang sebelumnya kosong. Penetrasi dan penghancuran dibatasi pada cover yang memang mendukungnya.
- Ello dan Syafiah tidak mendapat meter Focus baru karena cara mengisi dan membelanjakannya belum ada pada brief ataupun simulasi sekarang.
- Aksa kehilangan pengurangan defense pada Super dan durasi freeze dipersingkat. Rengga kehilangan damage domain yang berlebihan; kedua Super mendapat telegraph dan aturan hit yang jelas.
- Bonus Overcharge Nopal, perlindungan Taunt Einar, dan ammo Tactical Roll dikurangi sebagai titik awal pengujian, bukan nerf yang sudah tervalidasi oleh data.
