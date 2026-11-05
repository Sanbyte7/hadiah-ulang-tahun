/* =====================================================================
   KONFIGURASI KONTEN — "Our Little World"
   ---------------------------------------------------------------------
   Semua tulisan personal ada di berkas INI saja.
   Ganti teks dalam tanda kutip sesuai keinginanmu, lalu simpan file.
   Tanda [NAMA_PACAR], [NAMA_SAYA], dst. adalah contoh sementara —
   ganti dengan nama asli supaya terasa personal.

   Tips: jangan hapus tanda koma (,) dan kurung kurawal { }.
   ===================================================================== */

window.LW_CONFIG = {

  /* ---------- 1. Identitas ---------- */
  personal: {
    namaPacar:        "Monic",        // misal: "Alya"
    namaSaya:         "Niam",         // misal: "Bima"
    panggilanSayang:  "kotok",  // misal: "beb" / "duh"
    tanggalUlangTahun:"06 November 2026", // misal: "12 Mei 2004"
    ucapanPembuka:
      "Happy Birthday - selamat ulang tahun, sayang. " +
      "Kamar kecil ini aku buat khusus buat kamu, isinya kenangan kita berdua."
  },

  /* Judul pembuka website */
  judulPembuka: "A little room, just for you.",

  /* ---------- 2. Halaman buku scrapbook ---------- */
  // Setiap objek = satu halaman buku (di desktop tampil dua halaman berdampingan)
  buku: {
    judul: "Our Little World",
    subjudul: "kumpulan hal kecil yang jadi besar karena ada kamu",
    halaman: [

      /* Halaman 0: Sampul */
      {
        tipe: "sampul",
        judul: "Our Little World",
        subjudul: "kumpulan hal kecil yang jadi besar karena ada kamu",
        pembuat: "dibuat khusus untuk Monic ♡"
      },

      /* Halaman 1: Cerita kami */
      {
        tipe: "cerita",
        judul: "Halo, ini cerita kita",
        isi: [
          "Ini buku kecil berisi dunia kita berdua. Isinya seru-seru banget, ada ketemu, ketawa, cerita receh, dan beberapa hal yang pengen aku inget terus.",
          "Namanya Our Little World, karena buat aku, dunia terasa lebih hangat semenjak ada kamu di dalamnya."
        ],
        dekorasi: "bunga"
      },

      /* Halaman 2: Momen awal */
      {
        tipe: "momen",
        judul: "Awalnya kita",
        tanggal: "5 Desember 2021",
        isi: [
          "Masih inget pertama kali kita kenalan? Pertama kali ketemu di ML kemudian lanjut ke chat whatsapp, kita masih saling malu-malu.",
          "Dari situ kita mulai sering mabar, ngobrol dan sampai ga chat-chatan lama. sampai akhirnya di tahun 2023 kita mulai sering chat, mabar, dan kemudian mengungkapkan perasaan kita."
        ],
        foto: "assets/foto1.jpeg",
        captionFoto: "chat pertama kita"
      },

      /* Halaman 3: Galeri foto */
      {
        tipe: "galeri",
        judul: "Galeri kita",
        foto: [
          {
            src: "assets/foto2.jpeg",
            caption: "Kenangan pertama",
            cerita: "Hari pertama kita jalan bareng. Aku grogi, kamu pura-pura santai. Kita berdua sama-sama bohong."
          },
          {
            src: "assets/foto3.jpeg",
            caption: "Konser pertama kita",
            cerita: "Konser pertama kita bersama, antri lama, kehujanan, pulang malem, tapi selalu jadi kenangan indah."
          },
          {
            src: "assets/foto4.jpeg",
            caption: "Jalan bareng kamu",
            cerita: "Kita jalan-jalan bareng, explore tempat baru, dan ngobrol sampe lupa waktu."
          },
          {
            src: "assets/foto5.jpeg",
            caption: "Night ride bareng kamu",
            cerita: "Night ride pertama kita, menikmati malam yang indah di jakarta, walaupun tidak tahu arah."
          }
        ]
      },

      /* Halaman 4: Momen lucu */
      {
        tipe: "lucu",
        judul: "Arsip hal lucu",
        isi: [
          "• Waktu kita call berjam-jam pas masih LDR, momen yang gabisa dilupakan.",
          "• Waktu pertama kita ketemu, kamu nyamperin aku dan kita berdua masih malu-malu, tp aku yang lebih grogi.",
          "• Percakapan jam 2 pagi yang isinya cuma 'udah tidur?' 'belum' berulang sepuluh kali."
        ],
        kutipan: {
          teks: "“Aku paling suka versi kamu yang lagi nggak bisa berhenti tertawa.”",
          dari: "catatan kecil untuk monic"
        }
      },

      /* Halaman 5: Hal kecil yang aku suka */
      {
        tipe: "suka",
        judul: "Hal kecil yang aku suka dari kamu",
        daftar: [
          "Caramu ketawa sampai lupa diri sendiri.",
          "Kamu selalu inget hal-hal kecil yang aku pernah bilang sekilas (kadang lupa soalnya memori 2GB).",
          "Suka cerita tentang hari kamu, walau cuma hal sepele.",
          "Punya cara menenangkan diriku tanpa perlu banyak kata.",
          "Suka liat kamu pas ada bocil.",
          "Kamu capek pun tetep perhatian sama orang lain."
        ],
        dekorasi: "stiker"
      },

      /* Halaman 6: Surat ulang tahun */
      {
        tipe: "surat",
        judul: "Selamat ulang tahun, monic sayangku",
        isi: [
          "Hari ini hari kamu. Aku harap kamu inget betapa berharganya dirimu, bukan cuma hari ini, tapi setiap hari.",
          "Makasih udah sabar sama aku, udah jadi tempat cerita, udah bikin hari-hari biasa terasa berarti.",
          "Semoga tahun ini lebih lembut ke kamu. Semoga mimpi-mimpimu pelan-pelan kejadian, dan semoga kamu selalu sehat dan bahagia.",
          "Aku di sini, terus. Pelan-pelan juga nggak apa-apa, yang penting bareng."
        ],
        penutup: "Dengan sayang yang sama besarnya setiap hari,",
        tandaTangan: "Niam"
      }
    ]
  },

  /* ---------- 3. Pesan pinguin (Peluk Pinguin) ---------- */
  // Ditampilkan berurutan tiap dipeluk, lalu mengulang dari awal.
  pesanPinguin: [
    "Capek, ya? Sini, aku peluk dulu.",
    "Aku bangga sama kamu.",
    "Pinguinnya memang di sini, tapi pelukannya dari aku.",
    "Jangan lupa makan hari ini, ya.",
    "Kalau dunia lagi berat, boleh pinjam bahuku.",
    "Kamu udah jauh lebih kuat dari yang kamu kira.",
    "Happy birthday, monic sayangku. Aku sayang kamu."
  ],

  /* ---------- 4. Kuis Tentang Kita ---------- */
  // Ganti pertanyaan & jawaban sesuka hati. "benar" harus salah satu isi "pilihan".
  pertanyaanKuis: [
    {
      pertanyaan: "Kapan hari jadi kita?",
      pilihan: [
        "Setiap tanggal 20",
        "Tanggal 27",
        "Tanggal 7",
        "Tanggal 1"
      ],
      benar: "Tanggal 7",
      hint: "Cek lagi chat kita yang tanggal segitu deh~",
      salah: "Hmm, aku inget banget tanggal itu loh. Coba inget-inget pelan-pelan!"
    },
    {
      pertanyaan: "Makanan apa yang paling sering kamu minta aku beliin?",
      pilihan: [
        "Bakso",
        "Nasi goreng",
        "Gorengan",
        "Sushi"
      ],
      benar: "Sushi",
      hint: "Yang mentah...",
      salah: "Bukan itu, hehe. Yang ikan itu lho!"
    },
    {
      pertanyaan: "Nama panggilan yang aku pakai buat kamu?",
      pilihan: [
        "Sayang",
        "Kotok",
        "Boss",
        "Beb"
      ],
      benar: "Kotok",
      hint: "Yang paling sering aku sebut tiap chat~",
      salah: "Aku sering manggil kamu yang itu lho!"
    }
  ],

  /* ---------- 5. Puzzle Foto ---------- */
  // Ganti "src" dengan foto kalian (misal: assets/foto-kita.jpg)
  fotoPuzzle: "assets/foto7.jpeg",
  captionPuzzle: "Susun kenangan kita (6 potongan)",

  /* ---------- 6. Detail Hadiah ---------- */
  // Dipakai di KOTAK HADIAH kamar & PETI HADIAH akhir game — supaya isinya sama.
  detailHadiah: {
    judul: "Hadiah kecil untuk monic sayangku",
    pesan:
      "Hadiahnya nggak mahal-mahal amat, tapi dibikin sepenuh hati. " +
      "Semoga bisa nemenin kamu tidur, belajar, dan cerita seharian.",
    daftar: [
      {
        nama: "Anting",
        catatan: "Biar kamu nggak sendirian pas tidur, ada aku di telingamu."
      },
      {
        nama: "Voucher makan berdua",
        catatan: "Berlaku kapan aja, besok spesial."
      },
      {
        nama: "Website ini",
        catatan: "Yang ini versi digital dulu, walaupun masih sederhana."
      }
    ]
  },

  /* ---------- 7. Detail kue ulang tahun ---------- */
  kue: {
    ajakan: "Kue ulang tahunmu sudah siap! Ketuk lilinnya dan buat permintaan, ya.",
    pesanSetelahPadam: "Permintaanmu sudah diteruskan ke langit. Semoga cepat terkabul!"
  },

  /* ---------- 8. Bingkai foto kamar ---------- */
  bingkai: {
    src: "assets/foto6.jpeg",
    caption: "Foto kita favoritku."
  },

  /* ---------- 9. Musik & suara ---------- */
  musik: {
    // Isi dengan path file musikmu, contoh: "assets/musik.mp3"
    // Jika file tidak ada, website memutar musik lembut buatan (WebAudio) sebagai pengganti.
    file: "assets/lagu.mp3",
    volume: 0.35
  },
  // Isi dengan path rekaman suaramu, contoh: "assets/suara.mp3"
  // Jika kosong ("") atau file tidak ada, tombol "Dengar suaraku" disembunyikan otomatis.
  rekamanSuara: "assets/vo.mp3",

  /* ---------- 10. Koleksi rak ---------- */
  koleksiRak: {
    deadpool: {
      nama: "Deadpool",
      cerita: "Action figure Deadpool - pose santai, siap nemenin kamu nonton film."
    },
    lego: {
      nama: "LEGO F1 Ferrari",
      cerita: "Miniatur mobil F1 Ferrari merah - walaupun di realife jarang menang."
    }
  },

  /* ---------- 11. Karakter game ---------- */
  game: {
    karakter: "kelinci",   // "kelinci" atau "penguin" (mengubah bentuk karakter game)
    namaKarakter: "Kelinci Kecil"
  }
};
