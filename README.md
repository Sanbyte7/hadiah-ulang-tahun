# 🐧 Our Little World — Hadiah Ulang Tahun

Website interaktif hadiah ulang tahun yang menggabungkan **tiga pengalaman dalam satu dunia**:

1. **Little Room 3D** — kamar miniatur 3D (WebGL) sebagai halaman utama
2. **Our Little World** — buku scrapbook digital dengan animasi membalik halaman
3. **Birthday Quest** — mini-game 3 tahap yang dibuka lewat PC di kamar

Plus bonus: **Peluk Pinguin**, kue ulang tahun, speaker musik, bingkai foto, kotak hadiah, dan koleksi rak (Deadpool + LEGO F1).

Kamar diberi **pencahayaan lebih pekat** (tone mapping + cahaya pengisi dari arah kamera) supaya objek terlihat jelas, **palet lebih beragam** (mint, sage, mustard, teracotta, teal, ungu) dan **detail dekoratif** seperti bunting, jam dinding, bingkai foto, lampu berdiri, tumpukan buku, sandal, keranjang anyaman, dan boneka beruang.

Semua konten personal dipisahkan di **satu berkas: `js/config.js`**.

---

## 🖱️ Cara Berinteraksi

| Aksi | Cara |
|---|---|
| Mendekat ke objek | Klik/tap objek atau labelnya (kamera meluncur halus) |
| **Kembali ke kamar** | Klik **objek yang sama sekali lagi**, klik area kosong, atau tombol **← Kembali ke kamar** di kiri bawah |
| Membuka fitur (buku, PC, kue, foto, hadiah) | Klik objeknya; tutup lewat tombol di dalamnya |
| **Membalik halaman buku** | **Klik sisi kanan halaman** untuk lanjut, **sisi kiri** untuk mundur — tanpa tombol di bawah buku |
| Ganti halaman (alternatif) | Tombol keyboard ← / →, atau usap (HP) |

---

## 🚀 Cara Menjalankan

### Cara termudah (disarankan)
Buka berkas `index.html` langsung di browser (double-click). Website sudah bisa jalan tanpa server.

> Catatan: sebagian browser membatasi file lokal. Jika ada yang tidak muncul, pakai cara kedua.

### Cara kedua (dengan server kecil)
Buka **PowerShell** di folder ini, lalu jalankan:

```powershell
py -m http.server 8000
```

lalu buka **http://127.0.0.1:8000/** di browser.

> Windows 10/11 sudah punya Python (`py`). Kalau tidak ada, cara pertama cukup.

### Mode ringan tanpa 3D
Tambahkan `#tanpa3d` di belakang alamat, contoh:
`http://127.0.0.1:8000/#tanpa3d`
 berguna untuk perangkat lawas atau saat ingin versi hemat daya.

---

## 📁 Struktur Berkas

```
hadiah ulang tahun/
├── index.html          ← kerangka halaman + urutan script
├── css/
│   └── style.css       ← seluruh gaya (palet cream/pink/peach/lavender)
├── js/
│   ├── config.js       ⭐ SEMUA KONTEN PERSONAL ADA DI SINI
│   ├── store.js        ← penyimpanan lokal (kemajuan, halaman, pengaturan)
│   ├── audio.js        ← pemutar musik + rekaman suara
│   ├── room.js         ← scene kamar 3D (Three.js), kamera, label, efek
│   ├── scrapbook.js    ← buku Our Little World
│   ├── game.js         ← Birthday Quest (3 tahap)
│   └── app.js          ← pengendali: alur, modal, navigasi, fallback
├── vendor/
│   └── three.min.js    ← Three.js (sudah diunduh, jalan offline)
├── assets/             ← tempat foto, musik, dan rekaman suara
│   ├── foto1.svg … foto4.svg  (placeholder, ganti dengan foto asli)
│   ├── puzzle.svg              (placeholder gambar puzzle)
│   ├── musik.mp3               (BELUM ADA → musik pengganti otomatis)
│   └── suara.mp3               (BELUM ADA → tombol suara disembunyikan)
└── README.md
```

---

## ✏️ Cara Mengganti Konten (semua di `js/config.js`)

### 1. Identitas — bagian `personal`
| Tanda | Arti | Contoh isi |
|---|---|---|
| `[NAMA_PACAR]` | nama pacar | `"Alya"` |
| `[NAMA_SAYA]` | nama kamu | `"Bima"` |
| `[PANGGILAN_SAYANG]` | panggilan sayang | `"beb"` |
| `[TANGGAL_ULANG_TAHUN]` | tanggal lahir | `"12 Mei 2004"` |
| `[UCAPAN_PEMBUKA]` | kalimat pembuka di layar awal | teks bebas |

Tanda `[...]` juga dipakai di dalam cerita, kuis, dan surat — ganti semuanya sekaligus.

### 2. Foto
- Taruh foto di folder `assets/`, misalnya `assets/kita-1.jpg`
- Lalu ubah `src` di `buku.halaman` → bagian `galeri`, serta `bingkai.src`
- **Foto belum ada pun tampilannya tetap rapi** (placeholder pastel, tidak rusak)

### 3. Cerita & buku scrapbook
Semua halaman ada di `buku.halaman`. Tipe halaman yang tersedia:

| `tipe` | Isi |
|---|---|
| `sampul` | sampul buku (judul, subjudul, "dibuat khusus untuk …") |
| `cerita` | paragraf pengantar |
| `momen` | cerita + 1 foto |
| `galeri` | 4 foto + caption + cerita di balik foto |
| `lucu` | daftar momen lucu + kutipan |
| `suka` | daftar hal yang kamu sukai darinya |
| `surat` | surat ulang tahun + tanda tangan |

Menambah halaman = tambahkan satu objek baru ke dalam array `halaman`.

> **Catatan tata letak:** di desktop, halaman tampil berpasangan — `sampul` sendirian, lalu (1,2), (3,4), (5,6), … Jadi idealnya jumlah halaman setelah sampul **genap**. Di HP semua halaman tampil satu per satu.

### 4. Pesan pinguin
Ubah isi array `pesanPinguin`. Pesan tampil berurutan, lalu mengulang dari awal.
Urutan tersimpan di browser, jadi pesa tidak berulang dari nol saat halaman dimuat ulang.

### 5. Kuis
Ubah `pertanyaanKuis` — setiap objek:
```js
{
  pertanyaan: "...",
  pilihan: ["a", "b", "c", "d"],
  benar: "b",          // WAJIB persis sama dengan salah satu pilihan
  hint: "petunjuk saat salah",
  salah: "ledecon lucu saat salah"
}
```
Tambah/kurangi jumlah pertanyaan bebas (saat ini 3).

### 6. Puzzle
- `fotoPuzzle`: path gambar yang akan dipotong 6 (3×2)
- `captionPuzzle`: keterangan di bawah preview
- Kalau gambarnya belum ada, papan puzzle tetap bisa dimainkan (motif kotak pastel)

### 7. Musik
```js
musik: { file: "assets/musik.mp3", volume: 0.35 }
```
- **Kalau file tidak ada**, website otomatis memutar musik lembut buatan (WebAudio) — jadi tidak pernah hening.
- Kalau sudah ada file, taruh di `assets/` dan sesuaikan nama filenya (mp3/ogg).
- Status main/jeda/volume tersimpan di browser dan tetap konsisten saat pindah kamar → buku → game.

### 8. Rekaman suara
```js
rekamanSuara: "assets/suara.mp3"   // "" untuk menonaktifkan
```
- File belum ada → **tombol "Dengar suaraku" otomatis disembunyikan**, pengalaman pesan teks tetap utuh.
- File sudah ada → tombol muncul saat pinguin dipeluk.

### 9. Hadiah
`detailHadiah` dipakai di **DUA tempat sekaligus**: kotak hadiah di kamar dan peti hadiah akhir game — jadi isinya dijamin konsisten.

### 10. Koleksi rak
`koleksiRak.deadpool` dan `koleksiRak.lego` mengisi teks yang muncul saat koleksi diketuk.

---

## 🎮 Cara Bermain Birthday Quest

| Tahap | Isi | Kontrol |
|---|---|---|
| 1. Taman Kenangan | Kumpulkan 5 hati → gerbang terbuka | **WASD / panah** (desktop), **tombol arah** (HP) |
| 2. Kuis Tentang Kita | 3 pertanyaan personal | Klik/jawaban |
| 3. Puzzle Foto | Tukar 2 potongan sampai nyambung | Klik dua potongan |

- Ada tombol **💡 Petunjuk** dan **Lewati** di setiap tahap.
- **🏠 Kembali ke kamar** tersedia kapan saja (tanpa kehilangan kemajuan).
- Kemajuan tersimpan otomatis; saat dibuka lagi tersedia tombol **▶ Lanjutkan**.
- Memulai dari awal meminta konfirmasi dulu agar kemajuan tidak hilang tanpa sengaja.

---

## ✅ Alur yang Sudah Diuji

- [x] Masuk kamar → buka buku → balik halaman (klik sisi halaman) → tutup buku → kembali ke kamar
- [x] Klik objek yang sama / area kosong saat sedang mendekat → kamera kembali ke kamar
- [x] Buka PC → main game (5 hati → kuis → puzzle → peti hadiah) → kembali ke kamar
- [x] Peluk pinguin berkali-kali → pesan berganti & tersimpan
- [x] Putar musik → pindah fitur → kontrol musik tetap berfungsi
- [x] Muat ulang halaman → halaman buku & kemajuan game dilanjutkan
- [x] Tampilan HP (390×844): label bisa disentuh, buku satu halaman + usap/ketuk sisi, dpad muncul, tombol keluar berfungsi
- [x] Modal kue/foto/hadiah ditutup → kamera otomatis kembali ke kamar
- [x] Mode ringan `#tanpa3d` (tanpa WebGL) tetap membuka buku, game, dan pinguin
- [x] File foto/musik/suara hilang → tampilan tetap rapi, tidak rusak

---

## 📱 Kenyamanan & Performa

- **HP**: resolusi render dibatasi, bayangan & jumlah partikel dikurangi otomatis.
- **Desktop**: hover menyorot objek + kursor berubah; label menempel pada posisi objek 3D.
- **Aksesibilitas**: navigasi teks di bawah layar (Scrapbook, Quest, Pinguin, Hadiah, Kue), label pada tombol, dukungan keyboard (panah/WASD/Enter/Esc), dan penghormatan pada `prefers-reduced-motion`.
- **Kamera**: geser terbatas (tidak bisa mutar sampai ke belakang dinding), zoom dengan scroll/pinch.
- Semua objek penting (buku, PC, pinguin) punya label sendiri sehingga mudah ditemukan lewat sentuhan.

---

## 🔧 Tips Pengembangan

- Semua logika terpisah per modul — menambah fitur cukup di satu berkas.
- Versi `?v=` di `index.html` dipakai agar browser tidak memakai cache lama setelah mengedit. Ubah angkanya (misal `?v=2`) kalau browser masih menampilkan versi lama setelah edit.
- Kunci penyimpanan lokal ada di `js/store.js` → `Store.K`. Ingin menghapus semua kemajuan? Jalankan di console: `localStorage.clear()`.
