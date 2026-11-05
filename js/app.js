/* =====================================================================
   Pengendali utama — menghubungkan kamar 3D, buku, PC/game, pinguin,
   musik, dan semua popup. Tanpa memuat ulang halaman.
   ===================================================================== */
(function () {
  var C = window.LW_CONFIG;
  var Store = window.LWStore;

  var $ = function (s) { return document.querySelector(s); };
  var roomRoot = $("#room-root");
  var layerRoot = $("#layer-root");
  var toastEl = $("#toast");
  var labelLayer = $("#label-layer");

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var inRoom = true;
  var penguinIndex = Store.get(Store.K.PENGUIN, 0);
  var hugCount = Store.get(Store.K.HUGS, 0);

  /* ============ Toast ============ */
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add("tampil");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("tampil"); }, ms || 3200);
  }

  /* ============ Isi teks personal ============ */
  function fillPersonal() {
    var P = C.personal;
    $$("[data-isi='namaPacar']").forEach(function (e) { e.textContent = P.namaPacar; });
    $$("[data-isi='namaSaya']").forEach(function (e) { e.textContent = P.namaSaya; });
    $$("[data-isi='panggilanSayang']").forEach(function (e) { e.textContent = P.panggilanSayang; });
    $$("[data-isi='tanggalUlangTahun']").forEach(function (e) { e.textContent = P.tanggalUlangTahun; });
    $$("[data-isi='ucapanPembuka']").forEach(function (e) { e.textContent = P.ucapanPembuka; });
    $$(".judul-pembuka").forEach(function (e) { e.textContent = C.judulPembuka; });
    $$("[data-isi='namaPacarKuis']").forEach(function (e) { e.textContent = P.namaPacar; });
  }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ============ Label objek 3D ============ */
  var LABELS = {
    buku:     "📖 Buka Scrapbook",
    pc:       "🎮 Main Birthday Quest",
    penguin:  "🐧 Peluk Pinguin",
    kue:      "🎂 Lihat Kue",
    speaker:  "🎵 Musik",
    bingkai:  "🖼️ Lihat Foto",
    hadiah:   "🎁 Kotak Hadiah",
    deadpool: "Deadpool",
    lego:     "LEGO F1"
  };

  function renderLabels() {
    requestAnimationFrame(renderLabels);
    updateBackBtn();
    if (!inRoom || !LWRoom.available) return;
    var list = LWRoom.getScreenLabels();
    var existing = labelLayer.children;
    var map = {};
    Array.prototype.forEach.call(existing, function (node) { map[node.dataset.id] = node; });

    list.forEach(function (item) {
      var node = map[item.id];
      if (!node) {
        node = document.createElement("button");
        node.className = "room-label";
        node.dataset.id = item.id;
        node.innerHTML = '<span class="dot"></span><span class="teks">' + (LABELS[item.id] || item.id) + "</span>";
        node.addEventListener("click", function () { interact(item.id); });
        labelLayer.appendChild(node);
        map[item.id] = node;
      }
      node.style.transform = "translate(" + Math.round(item.x) + "px," + Math.round(item.y) + "px)";
      delete map[item.id];
    });
    for (var k in map) {
      if (map[k].parentNode) map[k].parentNode.removeChild(map[k]);
    }
  }

  /* ============ Interaksi objek ============ */
  function interact(id) {
    // Klik area kosong saat sedang mendekat → kembali ke kamar
    if (id === "__latar__") {
      if (inRoom && LWRoom._focused) backToRoom();
      return;
    }
    if (!inRoom) return;
    // Klik objek yang sama lagi → kembali ke kamar (bukan menjalankan aksi ulang)
    if (id && LWRoom._focused === id) {
      backToRoom();
      return;
    }
    switch (id) {
      case "buku":     openScrapbook(); break;
      case "pc":       openPC(); break;
      case "penguin":  hugPenguin(); break;
      case "kue":      openKue(); break;
      case "speaker":  toggleMusicFromRoom(); break;
      case "bingkai":  openBingkai(); break;
      case "hadiah":   openHadiah(); break;
      case "deadpool": toast(C.koleksiRak.deadpool.cerita, 4200); LWRoom.focus("deadpool", 900); break;
      case "lego":     toast(C.koleksiRak.lego.cerita, 4200); LWRoom.focus("lego", 900); break;
    }
  }

  function backToRoom() {
    inRoom = true;
    document.body.classList.remove("di-luar-kamar");
    layerRoot.innerHTML = "";
    labelLayer.classList.remove("disembunyikan");
    // Tutup gelembung pesan pinguin (kalau masih terbuka)
    var bub = document.getElementById("penguin-bubble");
    if (bub && bub.parentNode) bub.parentNode.removeChild(bub);
    LWRoom.reset(1000);
    LWRoom.setScreenOn(false);
    LWRoom.closeBook3D();
    if (LWGame.hide) LWGame.hide();
    refreshMusicBtn();
    updateBackBtn();
  }

  /* ============ Tombol "Kembali ke kamar" ============ */
  var backBtn = document.getElementById("back-room");
  function updateBackBtn() {
    if (!backBtn) return;
    var modalTerbuka = !!document.querySelector(".modal-Backdrop");
    var show = inRoom && !modalTerbuka && !!LWRoom.available && !!LWRoom._focused;
    backBtn.classList.toggle("tampil", show);
  }
  if (backBtn) backBtn.addEventListener("click", backToRoom);

  /* ============ Buku scrapbook ============ */
  function openScrapbook() {
    inRoom = false;
    labelLayer.classList.add("disembunyikan");
    LWRoom.focus("buku", 1100);
    setTimeout(function () {
      LWRoom.openBook3D();
      setTimeout(function () {
        document.body.classList.add("di-luar-kamar");
        layerRoot.innerHTML = "";
        var wrap = document.createElement("section");
        wrap.className = "layer layer-buku";
        wrap.setAttribute("aria-label", "Buku Our Little World");
        layerRoot.appendChild(wrap);
        LWScrapbook.mount(wrap);
        LWScrapbook.onClose = function () {
          LWScrapbook.onLeave();
          backToRoom();
        };
        wrap.focus();
      }, reducedMotion ? 0 : 520);
    }, reducedMotion ? 0 : 1000);
  }

  /* ============ PC → Birthday Quest ============ */
  function openPC() {
    inRoom = false;
    labelLayer.classList.add("disembunyikan");
    LWRoom.focus("pc", 1100);
    setTimeout(function () {
      LWRoom.setScreenOn(true);
      setTimeout(showPCScreen, reducedMotion ? 0 : 420);
    }, reducedMotion ? 0 : 1000);
  }

  function showPCScreen() {
    document.body.classList.add("di-luar-kamar");
    layerRoot.innerHTML = "";
    var wrap = document.createElement("section");
    wrap.className = "layer layer-pc";
    wrap.setAttribute("aria-label", "Layar komputer — Birthday Quest");
    layerRoot.innerHTML = "";
    layerRoot.appendChild(wrap);

    var progress = Store.get(Store.K.GAME, null);
    var adaLanjutan = progress && !progress.hadiahDibuka;

    wrap.innerHTML =
      '<div class="pc-monitor">' +
      '  <div class="pc-layar">' +
      '    <div class="pc-selamat">Welcome, birthday girl!</div>' +
      '    <p class="pc-sub">Ada petualangan kecil dan hadiah yang menunggumu.</p>' +
      '    <div class="pc-menu">' +
      '      <button class="btn btn-utama pc-mulai">✨ Mulai</button>' +
      (adaLanjutan ? '      <button class="btn btn-soft pc-lanjut">▶ Lanjutkan</button>' : "") +
      '      <button class="btn btn-tipis pc-kembali">← Kembali ke kamar</button>' +
      "    </div>" +
      '    <div class="pc-game-holder"></div>' +
      "  </div>" +
      '  <div class="pc-kaki"></div>' +
      "</div>";

    wrap.querySelector(".pc-kembali").onclick = backToRoom;
    wrap.querySelector(".pc-mulai").onclick = function () {
      var p = Store.get(Store.K.GAME, null);
      if (p && p.tahap > 1 && !p.hadiahDibuka) {
        // Ada kemajuan tersimpan — minta konfirmasi di dalam layar (tanpa dialog browser)
        tanyaMulaiUlang(wrap);
        return;
      }
      LWGame.resetSemua();
      mulaiGame(wrap);
    };
    var lanjut = wrap.querySelector(".pc-lanjut");
    if (lanjut) lanjut.onclick = function () { mulaiGame(wrap); };
    wrap.querySelector(".pc-mulai").focus();
  }

  function tanyaMulaiUlang(wrap) {
    var menu = wrap.querySelector(".pc-menu");
    var asli = menu.innerHTML;
    menu.innerHTML =
      '<p class="pc-konfirmasi">Mulai ulang berarti kemajuan game yang tersimpan akan dihapus. Yakin?</p>' +
      '<button class="btn btn-soft pc-batal">Batal</button>' +
      '<button class="btn btn-utama pc-ya">Ya, mulai ulang</button>';
    menu.querySelector(".pc-batal").onclick = function () {
      menu.innerHTML = asli;
      pasangMenuAwal(wrap);
    };
    menu.querySelector(".pc-ya").onclick = function () {
      LWGame.resetSemua();
      mulaiGame(wrap);
    };
    menu.querySelector(".pc-batal").focus();
  }

  // Pasang ulang handler menu (setelah konfirmasi dibatalkan)
  function pasangMenuAwal(wrap) {
    var mulai = wrap.querySelector(".pc-mulai");
    var lanjut = wrap.querySelector(".pc-lanjut");
    var kembali = wrap.querySelector(".pc-kembali");
    if (kembali) kembali.onclick = backToRoom;
    if (mulai) mulai.onclick = function () {
      LWGame.resetSemua();
      mulaiGame(wrap);
    };
    if (lanjut) lanjut.onclick = function () { mulaiGame(wrap); };
  }

  function confirmMulaiUlang() { return true; }

  function mulaiGame(wrap) {
    var holder = wrap.querySelector(".pc-game-holder");
    wrap.querySelector(".pc-menu").style.display = "none";
    wrap.querySelector(".pc-selamat").style.display = "none";
    wrap.querySelector(".pc-sub").style.display = "none";
    wrap.classList.add("mode-game");
    holder.innerHTML = "";
    var gameEl = document.createElement("div");
    gameEl.className = "game-shell";
    holder.appendChild(gameEl);
    LWGame.mount(gameEl);
    LWGame.show();
    LWGame.onExit = backToRoom;
    setTimeout(function () { LWGame.resize(); }, 60);
  }

  /* ============ Pinguin ============ */
  function hugPenguin() {
    LWRoom.focus("penguin", 850);
    LWRoom.penguinHug();
    var pesan = C.pesanPinguin[penguinIndex % C.pesanPinguin.length];
    penguinIndex = (penguinIndex + 1) % C.pesanPinguin.length;
    hugCount++;
    Store.set(Store.K.PENGUIN, penguinIndex);
    Store.set(Store.K.HUGS, hugCount);

    setTimeout(function () { showPenguinBubble(pesan); }, reducedMotion ? 0 : 500);
  }

  function showPenguinBubble(pesan) {
    var old = $("#penguin-bubble");
    if (old) old.parentNode.removeChild(old);
    var b = document.createElement("div");
    b.id = "penguin-bubble";
    b.className = "speech-bubble";
    b.setAttribute("role", "status");
    b.innerHTML = '<p>' + pesan + "</p>";

    if (LWAudio.hasVoice()) {
      var v = document.createElement("button");
      v.className = "btn btn-tipis voice-btn";
      v.textContent = "🎙️ Dengar suaraku";
      v.addEventListener("click", function () { LWAudio.playVoice(); });
      b.appendChild(v);
    } else {
      // Jika file rekaman baru selesai dicek, tombol menyusul masuk
      var onAvail = function (ok) {
        LWAudio.onVoiceAvailability(null);
        if (ok && b.parentNode) {
          var v2 = document.createElement("button");
          v2.className = "btn btn-tipis voice-btn";
          v2.textContent = "🎙️ Dengar suaraku";
          v2.addEventListener("click", function () { LWAudio.playVoice(); });
          b.insertBefore(v2, close);
        }
      };
      LWAudio.onVoiceAvailability(onAvail);
    }
    var close = document.createElement("button");
    close.className = "bubble-close";
    close.setAttribute("aria-label", "Tutup pesan");
    close.textContent = "×";
    close.addEventListener("click", function () { if (b.parentNode) b.parentNode.removeChild(b); });
    b.appendChild(close);

    roomRoot.appendChild(b);
    // Posisikan dekat pinguin (pojok kiri bawah layar biar tidak menutupi)
    setTimeout(function () {
      if (b.parentNode) b.classList.add("tampil");
    }, 20);
    clearTimeout(b._t);
    b._t = setTimeout(function () {
      if (b.parentNode) { b.classList.remove("tampil"); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 500); }
    }, 7000);
  }

  LWAudio.onVoiceError(function () {
    var v = document.querySelector(".voice-btn");
    if (v) { v.disabled = true; v.textContent = "Suara belum tersedia"; }
  });

  /* ============ Kue ulang tahun ============ */
  function openKue() {
    LWRoom.focus("kue", 900);
    openModal({
      judul: "Kue ulang tahun",
      isiHTML: "<p>" + C.kue.ajakan + "</p>",
      aksi: [
        {
          teks: "🕯️ Tiup lilinnya", utama: true,
          fn: function (modal) {
            LWRoom.blowCandle();
            modal.querySelector(".modal-isi").innerHTML = "<p>" + C.kue.pesanSetelahPadam + "</p> 🎉";
            modal.querySelector(".modal-aksi").innerHTML = "";
            tambahTutup(modal);
          }
        }
      ]
    });
  }

  /* ============ Bingkai foto ============ */
  function openBingkai() {
    var img = new Image();
    img.alt = C.bingkai.caption;
    img.src = C.bingkai.src;
    img.className = "modal-foto";
    img.onerror = function () {
      var ph = document.createElement("div");
      ph.className = "foto-placeholder besar";
      ph.innerHTML = "<span>Foto kalian berdua</span><em>taruh filenya di folder assets</em>";
      img.parentNode.replaceChild(ph, img);
    };
    openModal({
      judul: "Foto favoritku",
      isiHTML: "",
      custom: function (isi) { isi.appendChild(img); var p = document.createElement("p"); p.textContent = C.bingkai.caption; isi.appendChild(p); }
    });
  }

  /* ============ Kotak hadiah (sumber data sama dengan game) ============ */
  function openHadiah() {
    var H = C.detailHadiah;
    var html = "<p>" + H.pesan + "</p>";
    (H.daftar || []).forEach(function (d) {
      html += '<div class="hadiah-item"><strong>♡ ' + d.nama + "</strong><span>" + d.catatan + "</span></div>";
    });
    openModal({ judul: H.judul, isiHTML: html, aksi: [{ teks: "Tutup", utama: false, fn: closeModal }] });
  }

  /* ============ Modal generik ============ */
  function hapusModalDom() {
    var m = document.querySelector(".modal-Backdrop");
    if (m) m.parentNode.removeChild(m);
  }

  function closeModal() {
    hapusModalDom();
    // Menutup modal sekaligus mengembalikan kamera ke posisi awal kamar
    if (LWRoom && LWRoom.available && LWRoom._focused && inRoom) {
      LWRoom.reset(900);
    }
    updateBackBtn();
  }

  function openModal(opt) {
    hapusModalDom();
    var m = document.createElement("div");
    m.className = "modal-Backdrop";
    m.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="' + (opt.judul || "Keterangan") + '">' +
      '  <button class="modal-x" aria-label="Tutup">×</button>' +
      '  <h3 class="modal-judul">' + (opt.judul || "") + "</h3>" +
      '  <div class="modal-isi">' + (opt.isiHTML || "") + "</div>" +
      '  <div class="modal-aksi"></div>' +
      "</div>";
    layerRoot.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) closeModal(); });
    m.querySelector(".modal-x").addEventListener("click", closeModal);
    var aksi = m.querySelector(".modal-aksi");
    (opt.aksi || []).forEach(function (a) {
      var b = document.createElement("button");
      b.className = "btn " + (a.utama ? "btn-utama" : "btn-soft");
      b.textContent = a.teks;
      b.addEventListener("click", function () { a.fn(m); });
      aksi.appendChild(b);
    });
    if (opt.custom) opt.custom(m.querySelector(".modal-isi"));
    if (!aksi.children.length && !opt.custom) tambahTutup(m);
    var f = m.querySelector(".modal-x");
    if (f) f.focus();
    return m;
  }
  function tambahTutup(m) {
    var aksi = m.querySelector(".modal-aksi");
    if (!aksi) return;
    var b = document.createElement("button");
    b.className = "btn btn-soft";
    b.textContent = "Tutup";
    b.addEventListener("click", closeModal);
    aksi.appendChild(b);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /* ============ Musik ============ */
  var musicBtn = $("#music-btn");
  var volumeEl = $("#music-volume");

  function refreshMusicBtn() {
    var st = LWAudio.getState();
    musicBtn.textContent = st.playing ? "⏸ Musik" : "▶ Musik";
    musicBtn.setAttribute("aria-pressed", st.playing ? "true" : "false");
    musicBtn.classList.toggle("aktif", st.playing);
  }
  function toggleMusicFromRoom() {
    LWAudio.toggle();
    toast(LWAudio.getState().playing ? "Musiknya nyala, ya ♪" : "Musiknya dijeda sebentar.", 2200);
  }
  musicBtn.addEventListener("click", function () { LWAudio.toggle(); });
  LWAudio.onChange(refreshMusicBtn);
  volumeEl.value = String(Math.round(LWAudio.getState().volume * 100));
  volumeEl.addEventListener("input", function () { LWAudio.setVolume(Number(volumeEl.value) / 100); });

  /* ============ Navigasi cepat (aksesibilitas) ============ */
  $$("[data-pergi]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.dataset.pergi;
      if (!inRoom) backToRoom();
      setTimeout(function () { interact(target); }, inRoom ? 0 : 900);
    });
  });

  /* ============ Layar alternatif tanpa WebGL ============ */
  function buildFallback() {
    document.body.classList.add("tanpa-webgl");
    setStatus("Mode ringan aktif — semua fitur tetap bisa dibuka.", "siap");
    roomRoot.innerHTML =
      '<div class="fallback">' +
      '  <div class="fallback-kamar" role="img" aria-label="Ilustrasi kamar">' +
      '    <div class="fb-jendela"></div><div class="fb-kasur"><div class="fb-pinguin">🐧</div></div>' +
      '    <div class="fb-meja"><div class="fb-buku">📖</div></div>' +
      '    <div class="fb-pc">🖥️</div><div class="fb-rak">🧸 🏎️</div>' +
      '    <div class="fb-kue">🎂</div><div class="fb-hadiah">🎁</div>' +
      "  </div>" +
      '  <p class="fallback-catatan">Perangkat ini memakai tampilan kamar ringan, tapi semua hadiahnya tetap bisa dibuka:</p>' +
      '  <div class="fallback-tombol">' +
      '    <button class="btn btn-utama" data-fb="buku">📖 Buka Scrapbook</button>' +
      '    <button class="btn btn-utama" data-fb="pc">🎮 Main Birthday Quest</button>' +
      '    <button class="btn btn-soft" data-fb="penguin">🐧 Peluk Pinguin</button>' +
      '    <button class="btn btn-soft" data-fb="hadiah">🎁 Kotak Hadiah</button>' +
      '    <button class="btn btn-soft" data-fb="kue">🎂 Kue Ulang Tahun</button>' +
      "  </div>" +
      "</div>";

    $$(".fallback [data-fb]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.dataset.fb;
        if (id === "buku") openScrapbookFallback();
        else if (id === "pc") openPCFallback();
        else if (id === "penguin") {
          var pesan = C.pesanPinguin[penguinIndex % C.pesanPinguin.length];
          penguinIndex = (penguinIndex + 1) % C.pesanPinguin.length;
          Store.set(Store.K.PENGUIN, penguinIndex);
          toast(pesan, 5000);
        }
        else if (id === "hadiah") openHadiah();
        else if (id === "kue") openKue();
      });
    });
  }

  function openScrapbookFallback() {
    inRoom = false;
    document.body.classList.add("di-luar-kamar");
    layerRoot.innerHTML = "";
    var wrap = document.createElement("section");
    wrap.className = "layer layer-buku";
    layerRoot.appendChild(wrap);
    LWScrapbook.mount(wrap);
    LWScrapbook.onClose = function () { LWScrapbook.onLeave(); backToRoomFallback(); };
  }
  function openPCFallback() {
    var fakeWrap = document.createElement("div");
    showPCScreenInto(fakeWrap);
  }
  function showPCScreenInto() {
    document.body.classList.add("di-luar-kamar");
    layerRoot.innerHTML = "";
    var wrap = document.createElement("section");
    wrap.className = "layer layer-pc";
    layerRoot.appendChild(wrap);
    wrap.innerHTML =
      '<div class="pc-monitor"><div class="pc-layar">' +
      '  <div class="pc-selamat">Welcome, birthday girl!</div>' +
      '  <p class="pc-sub">Ada petualangan kecil dan hadiah yang menunggumu.</p>' +
      '  <div class="pc-menu"><button class="btn btn-utama pc-mulai">✨ Mulai</button>' +
      '  <button class="btn btn-tipis pc-kembali">← Kembali</button></div>' +
      '  <div class="pc-game-holder"></div>' +
      "</div></div>";
    wrap.querySelector(".pc-kembali").addEventListener("click", backToRoomFallback);
    wrap.querySelector(".pc-mulai").addEventListener("click", function () {
      var holder = wrap.querySelector(".pc-game-holder");
      wrap.querySelector(".pc-menu").style.display = "none";
      wrap.querySelector(".pc-selamat").style.display = "none";
      wrap.querySelector(".pc-sub").style.display = "none";
      var gameEl = document.createElement("div");
      gameEl.className = "game-shell";
      holder.appendChild(gameEl);
      LWGame.mount(gameEl);
      LWGame.show();
      LWGame.onExit = backToRoomFallback;
    });
  }
  function backToRoomFallback() {
    inRoom = true;
    document.body.classList.remove("di-luar-kamar");
    layerRoot.innerHTML = "";
    if (LWGame.hide) LWGame.hide();
    refreshMusicBtn();
  }

  /* ============ Intro pembuka ============ */
  function setStatus(teks, kelas) {
    var s = document.getElementById("intro-status");
    if (!s) return;
    s.textContent = teks;
    s.className = "intro-status " + (kelas || "");
  }

  function setupIntro() {
    var intro = $("#intro");
    $("#intro-mulai").addEventListener("click", function () {
      intro.classList.add("pergi");
      setTimeout(function () { intro.style.display = "none"; }, reducedMotion ? 0 : 700);
      if (reducedMotion) {
        // Biarkan musik tetap manual (hormati preferensi gerak)
      }
    });
    $("#intro-mulai").focus();
  }

  /* ============ Mulai ============ */
  function boot() {
    fillPersonal();
    setupIntro();

    // Cek apakah file rekaman suara tersedia (async; tombol menyusul jika ada)
    if (LWAudio.cekVoice) LWAudio.cekVoice();

    // Mode ringan tanpa 3D — buka dengan tambahan #tanpa3d di alamat website
    if (window.location.hash.indexOf("tanpa3d") >= 0) LWRoom.available = false;

    if (LWRoom.available) {
      try {
        LWRoom.init({
          container: roomRoot,
          reducedMotion: reducedMotion,
          callbacks: {
            onInteract: interact,
            onHover: function (id) { /* label disorot lewat CSS */ },
            onCameraArrive: function () {}
          }
        });
        LWRoom.setCameraHome(true);
        renderLabels();
        setStatus("Kamar 3D siap dijelajahi!", "siap");
      } catch (e) {
        console.error("Gagal memuat scene 3D:", e);
        LWRoom.available = false;
        buildFallback();
      }
    } else {
      buildFallback();
    }

    refreshMusicBtn();

    // Resize game saat layar berubah
    window.addEventListener("resize", function () {
      if (LWGame.resize) LWGame.resize();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
