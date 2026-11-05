/* =====================================================================
   Birthday Quest — mini-game 3 tahap
   ---------------------------------------------------------------------
   Tahap 1: Taman Kenangan  (kumpulkan 5 hati, canvas 2D)
   Tahap 2: Kuis Tentang Kita (DOM, dari config)
   Tahap 3: Puzzle Foto (DOM, tukar 2 potongan)
   Akhir   : Peti hadiah + kejutan

   Semua kemajuan disimpan lokal. Ada tombol "Lewati tantangan".
   ===================================================================== */
(function () {
  var C = window.LW_CONFIG;
  var Store = window.LWStore;

  var DEFAULT_PROGRESS = {
    tahap: 1,
    hati: [false, false, false, false, false],
    kuisSelesai: false,
    puzzleSelesai: false,
    hadiahDibuka: false
  };

  var progress = merge(DEFAULT_PROGRESS, Store.get(Store.K.GAME, {}));
  var el, canvas, ctx, dpad;
  var raf = null, running = false;
  var lastTs = 0;

  function merge(a, b) {
    var o = {};
    for (var k in a) o[k] = a[k];
    for (var j in b) o[j] = b[j];
    o.hati = (b && b.hati && b.hati.length === 5) ? b.hati.slice() : a.hati.slice();
    return o;
  }
  function save() { Store.set(Store.K.GAME, progress); }

  /* ================= TAHAP 1: TAMAN KENANGAN ================= */
  var WORLD = { w: 900, h: 600 };
  var player = { x: 450, y: 520, r: 22, dirX: 0, dirY: 0, face: 1, bounce: 0 };
  var hearts = [
    { x: 170, y: 430 }, { x: 720, y: 440 }, { x: 300, y: 250 },
    { x: 620, y: 230 }, { x: 450, y: 120 }
  ];
  var portal = { x: 450, y: 60, open: false };
  var keys = {};
  var touchDir = { x: 0, y: 0 };

  function heartCount() { return progress.hati.filter(Boolean).length; }

  function startLoop() {
    if (running) return;
    running = true;
    lastTs = 0;
    raf = requestAnimationFrame(tick);
  }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function tick(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    if (Game._stage === 1) { updateGarden(dt); drawGarden(ts / 1000); }
    raf = requestAnimationFrame(tick);
  }

  function updateGarden(dt) {
    var dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
    if (keys.ArrowRight || keys.d || keys.D) dx += 1;
    if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
    if (keys.ArrowDown || keys.s || keys.S) dy += 1;
    dx += touchDir.x; dy += touchDir.y;
    var len = Math.hypot(dx, dy) || 1;
    var speed = 220;
    player.x += (dx / len) * speed * dt;
    player.y += (dy / len) * speed * dt;
    player.x = Math.max(40, Math.min(WORLD.w - 40, player.x));
    player.y = Math.max(40, Math.min(WORLD.h - 40, player.y));
    if (dx !== 0) player.face = dx > 0 ? 1 : -1;
    player.bounce = (dx !== 0 || dy !== 0) ? player.bounce + dt * 10 : player.bounce * 0.9;

    // Kumpulkan hati
    for (var i = 0; i < hearts.length; i++) {
      if (progress.hati[i]) continue;
      if (Math.hypot(player.x - hearts[i].x, player.y - hearts[i].y) < player.r + 20) {
        progress.hati[i] = true;
        save();
        flash("♡ Hati ke-" + heartCount() + " ketemu! " + hintForHearts());
        if (heartCount() === 5) {
          portal.open = true;
          flash("Semua hati terkumpul! Gerbang ke tahap berikutnya terbuka di atas — jalan ke sana, ya!");
        }
      }
    }
    // Portal
    if (portal.open && Math.hypot(player.x - portal.x, player.y - portal.y) < 46) {
      Game.goStage(2);
    }
  }

  function hintForHearts() {
    var tips = [
      "Ada yang nyempil di semak kiri bawah.",
      "Coba cek dekat pohon kanan.",
      "Hati ketiga suka sembunyi di tengah taman.",
      "Yang keempat di dekat jembatan kecil.",
      "Terakhir: di puncak taman, dekat gerbang."
    ];
    for (var i = 0; i < 5; i++) if (!progress.hati[i]) return tips[i];
    return "";
  }

  function drawGarden(t) {
    if (!ctx) return;
    var g = ctx;
    var sx = canvas.width / WORLD.w, sy = canvas.height / WORLD.h;
    g.setTransform(sx, 0, 0, sy, 0, 0);

    // Langit pastel
    var sky = g.createLinearGradient(0, 0, 0, WORLD.h);
    sky.addColorStop(0, "#ffe9f0"); sky.addColorStop(0.55, "#fdeef2"); sky.addColorStop(1, "#e8f3dd");
    g.fillStyle = sky; g.fillRect(0, 0, WORLD.w, WORLD.h);

    // Awan
    g.fillStyle = "rgba(255,255,255,.8)";
    cloud(g, 160 + Math.sin(t * 0.2) * 12, 70, 1);
    cloud(g, 700 + Math.sin(t * 0.15 + 2) * 14, 100, 0.8);

    // Rumput
    g.fillStyle = "#dff0cd";
    roundRect(g, 30, 30, WORLD.w - 60, WORLD.h - 60, 60); g.fill();
    g.fillStyle = "#d3ebbd";
    roundRect(g, 50, 50, WORLD.w - 100, WORLD.h - 100, 50); g.fill();

    // Jalur
    g.strokeStyle = "#f7e3cf"; g.lineWidth = 46; g.lineCap = "round";
    g.beginPath(); g.moveTo(450, 540); g.lineTo(450, 300); g.lineTo(300, 250); g.stroke();
    g.beginPath(); g.moveTo(450, 300); g.lineTo(640, 240); g.stroke();
    g.beginPath(); g.moveTo(450, 300); g.lineTo(180, 420); g.stroke();
    g.beginPath(); g.moveTo(450, 300); g.lineTo(720, 430); g.stroke();

    // Pohon & semak
    tree(g, 120, 200, 1.1); tree(g, 790, 300, 0.95); tree(g, 250, 120, 0.8);
    bush(g, 90, 500, 1); bush(g, 820, 520, 0.9); bush(g, 620, 130, 0.75);

    // Bunga kecil
    for (var f = 0; f < 14; f++) {
      var fx = 90 + ((f * 137) % (WORLD.w - 180));
      var fy = 120 + ((f * 83) % (WORLD.h - 220));
      g.fillStyle = ["#ffb7cd", "#ffd6a8", "#d9c8f0"][f % 3];
      g.beginPath(); g.arc(fx, fy, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(fx, fy, 2.4, 0, Math.PI * 2); g.fill();
    }

    // Gerbang
    drawPortal(g, t);

    // Hati
    for (var i = 0; i < hearts.length; i++) {
      if (progress.hati[i]) continue;
      var hy = hearts[i].y + Math.sin(t * 2.5 + i) * 7;
      drawHeart(g, hearts[i].x, hy, 17, "#ff8fae", t);
    }

    // Karakter
    drawPlayer(g, t);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  function cloud(g, x, y, s) {
    g.beginPath();
    g.arc(x, y, 26 * s, 0, Math.PI * 2);
    g.arc(x + 28 * s, y - 8 * s, 20 * s, 0, Math.PI * 2);
    g.arc(x + 54 * s, y, 24 * s, 0, Math.PI * 2);
    g.fill();
  }
  function tree(g, x, y, s) {
    g.fillStyle = "#c79a72";
    g.fillRect(x - 8 * s, y, 16 * s, 42 * s);
    g.fillStyle = "#a8cf8e";
    g.beginPath(); g.arc(x, y - 12 * s, 42 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b8dc9f";
    g.beginPath(); g.arc(x - 22 * s, y + 4 * s, 26 * s, 0, Math.PI * 2);
    g.arc(x + 22 * s, y + 4 * s, 26 * s, 0, Math.PI * 2); g.fill();
  }
  function bush(g, x, y, s) {
    g.fillStyle = "#bfe0a6";
    g.beginPath();
    g.arc(x, y, 24 * s, 0, Math.PI * 2);
    g.arc(x + 22 * s, y - 6 * s, 18 * s, 0, Math.PI * 2);
    g.arc(x - 22 * s, y - 4 * s, 17 * s, 0, Math.PI * 2);
    g.fill();
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function drawHeart(g, x, y, s, color, t) {
    g.save();
    g.translate(x, y);
    g.scale(1 + Math.sin((t || 0) * 5) * 0.07, 1 + Math.sin((t || 0) * 5) * 0.07);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, s * 0.9);
    g.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.6, -s * 1.2, 0, -s * 0.35);
    g.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.5, -s * 0.2, 0, s * 0.9);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.55)";
    g.beginPath(); g.arc(-s * 0.35, -s * 0.35, s * 0.18, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function drawPortal(g, t) {
    var p = portal;
    g.save();
    g.translate(p.x, p.y);
    if (p.open) {
      g.fillStyle = "rgba(255,182,205," + (0.5 + Math.sin(t * 3) * 0.2) + ")";
      g.beginPath(); g.arc(0, 0, 42, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e07a9a";
      g.font = "bold 22px sans-serif"; g.textAlign = "center";
      g.fillText("→", 0, 8);
    } else {
      g.fillStyle = "#e7d7cc";
      g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#b79a89";
      g.font = "bold 26px sans-serif"; g.textAlign = "center";
      g.fillText("🔒", 0, 9);
    }
    g.restore();
  }
  function drawPlayer(g, t) {
    g.save();
    g.translate(player.x, player.y + Math.sin(player.bounce) * 3);
    g.scale(player.face, 1);
    var k = C.game && C.game.karakter === "penguin" ? "penguin" : "kelinci";

    // Bayangan
    g.fillStyle = "rgba(140,120,110,.18)";
    g.beginPath(); g.ellipse(0, 22, 22, 7, 0, 0, Math.PI * 2); g.fill();

    if (k === "penguin") {
      g.fillStyle = "#f4b8c4";
      g.beginPath(); g.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff3e4";
      g.beginPath(); g.ellipse(2, 4, 13, 16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f6b45e";
      g.beginPath(); g.moveTo(16, -6); g.lineTo(26, -2); g.lineTo(16, 2); g.fill();
    } else {
      // Kelinci
      g.fillStyle = "#fff6ef";
      g.beginPath(); g.ellipse(-8, -26, 6, 15, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(8, -26, 6, 15, 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f9c9d6";
      g.beginPath(); g.ellipse(-8, -26, 3, 9, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(8, -26, 3, 9, 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff6ef";
      g.beginPath(); g.ellipse(0, -2, 20, 21, 0, 0, Math.PI * 2); g.fill();
    }
    // Mata & pipi
    g.fillStyle = "#3b3340";
    g.beginPath(); g.arc(-6, -6, 3, 0, Math.PI * 2); g.arc(8, -6, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(244,155,174,.6)";
    g.beginPath(); g.arc(-12, 1, 4, 0, Math.PI * 2); g.arc(14, 1, 4, 0, Math.PI * 2); g.fill();
    // Hati di dada
    drawHeart(g, 1, 8, 6, "#ff8fae", t);
    g.restore();
  }

  /* ================= TAHAP 2: KUIS ================= */
  function renderQuiz() {
    var qIndex = 0;
    var box = el.querySelector(".game-quiz");
    box.innerHTML = "";
    box.classList.add("aktif");

    var wrap = document.createElement("div");
    wrap.className = "kuis-wrap";
    box.appendChild(wrap);

    function draw() {
      var q = C.pertanyaanKuis[qIndex];
      wrap.innerHTML = "";

      var head = document.createElement("div");
      head.className = "kuis-head";
      head.innerHTML = "<span class='kuis-no'>Pertanyaan " + (qIndex + 1) + " dari " + C.pertanyaanKuis.length + "</span>";
      wrap.appendChild(head);

      var title = document.createElement("h3");
      title.className = "kuis-pertanyaan";
      title.textContent = q.pertanyaan;
      wrap.appendChild(title);

      var list = document.createElement("div");
      list.className = "kuis-pilihan";
      wrap.appendChild(list);

      var feedback = document.createElement("div");
      feedback.className = "kuis-feedback";
      feedback.setAttribute("role", "status");
      wrap.appendChild(feedback);

      (q.pilihan || []).forEach(function (p) {
        var b = document.createElement("button");
        b.className = "btn btn-soft kuis-jawab";
        b.textContent = p;
        b.addEventListener("click", function () {
          if (p === q.benar) {
            b.classList.add("benar");
            feedback.className = "kuis-feedback benar";
            feedback.textContent = "Yey, benar! ✓";
            setTimeout(function () {
              qIndex++;
              if (qIndex >= C.pertanyaanKuis.length) {
                progress.kuisSelesai = true; save();
                Game.goStage(3);
              } else draw();
            }, 900);
          } else {
            b.classList.add("salah");
            feedback.className = "kuis-feedback salah";
            feedback.innerHTML = "<strong>" + (q.salah || "Belum tepat, coba lagi ya!") + "</strong><br><em>Petunjuk: " + (q.hint || "Coba ingat-ingat lagi.") + "</em>";
          }
        });
        list.appendChild(b);
      });

      var tools = document.createElement("div");
      tools.className = "kuis-tools";
      var skip = document.createElement("button");
      skip.className = "btn btn-tipis";
      skip.textContent = "Lewati kuis";
      skip.addEventListener("click", function () {
        progress.kuisSelesai = true; save(); Game.goStage(3);
      });
      tools.appendChild(skip);
      wrap.appendChild(tools);
    }
    draw();
  }

  /* ================= TAHAP 3: PUZZLE ================= */
  function renderPuzzle() {
    var box = el.querySelector(".game-puzzle");
    box.innerHTML = "";
    box.classList.add("aktif");

    var PIECES = 6, COLS = 3, ROWS = 2;
    var tiles = [];
    for (var i = 0; i < PIECES; i++) tiles.push(i); // tiles[i] = potongan yang ada di posisi i
    var selected = -1;

    var wrap = document.createElement("div");
    wrap.className = "puzzle-wrap";
    box.appendChild(wrap);

    var info = document.createElement("p");
    info.className = "puzzle-info";
    info.textContent = "Ketuk dua potongan untuk menukar posisinya. Susun sampai gambarnya nyambung!";
    wrap.appendChild(info);

    var board = document.createElement("div");
    board.className = "puzzle-board";
    board.style.setProperty("--cols", COLS);
    board.style.setProperty("--rows", ROWS);
    wrap.appendChild(board);

    var imgOk = true;
    var testImg = new Image();
    testImg.onload = function () { board.classList.remove("puzzle-kosong"); };
    testImg.onerror = function () { imgOk = false; board.classList.add("puzzle-kosong"); };
    testImg.src = C.fotoPuzzle;

    var cells = [];
    for (var c = 0; c < PIECES; c++) {
      var cell = document.createElement("button");
      cell.className = "puzzle-cell";
      cell.type = "button";
      cell.setAttribute("aria-label", "Potongan " + (c + 1));
      cell.style.backgroundImage = "url('" + C.fotoPuzzle + "')";
      board.appendChild(cell);
      cells.push(cell);
      (function (pos) {
        cell.addEventListener("click", function () {
          if (selected === -1) {
            selected = pos;
            cells[pos].classList.add("terpilih");
            return;
          }
          if (selected === pos) {
            cells[pos].classList.remove("terpilih");
            selected = -1;
            return;
          }
          // Tukar
          var tmp = tiles[selected];
          tiles[selected] = tiles[pos];
          tiles[pos] = tmp;
          cells[selected].classList.remove("terpilih");
          selected = -1;
          paint();
          if (solved()) {
            progress.puzzleSelesai = true; save();
            setTimeout(function () { Game.goStage(4); }, 650);
          }
        });
      })(c);
    }

    function paint() {
      for (var i = 0; i < PIECES; i++) {
        var p = tiles[i];
        var col = p % COLS, row = Math.floor(p / COLS);
        cells[i].style.backgroundPosition =
          (col / (COLS - 1) * 100) + "% " + (row / (ROWS - 1) * 100) + "%";
        cells[i].classList.toggle("benar-posisi", p === i);
      }
    }
    function solved() {
      for (var i = 0; i < PIECES; i++) if (tiles[i] !== i) return false;
      return true;
    }
    paint();

    // Tombol bantu
    var tools = document.createElement("div");
    tools.className = "puzzle-tools";
    var previewBtn = document.createElement("button");
    previewBtn.className = "btn btn-soft";
    previewBtn.textContent = "Lihat gambar asli";
    var preview = document.createElement("div");
    preview.className = "puzzle-preview";
    preview.innerHTML = "<img src='" + C.fotoPuzzle + "' alt='Gambar asli puzzle' onerror=\"this.style.display='none';this.parentNode.classList.add('kosong')\"><span>" + (C.captionPuzzle || "") + "</span>";
    preview.hidden = true;
    previewBtn.addEventListener("click", function () {
      preview.hidden = !preview.hidden;
      previewBtn.textContent = preview.hidden ? "Lihat gambar asli" : "Sembunyikan gambar";
    });
    var shuffleBtn = document.createElement("button");
    shuffleBtn.className = "btn btn-soft";
    shuffleBtn.textContent = "Acak ulang";
    shuffleBtn.addEventListener("click", function () {
      for (var i = tiles.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t;
      }
      if (solved()) { shuffleBtn.click(); return; }
      paint();
    });
    var skipBtn = document.createElement("button");
    skipBtn.className = "btn btn-tipis";
    skipBtn.textContent = "Lewati puzzle";
    skipBtn.addEventListener("click", function () {
      progress.puzzleSelesai = true; save(); Game.goStage(4);
    });
    tools.appendChild(previewBtn);
    tools.appendChild(shuffleBtn);
    tools.appendChild(skipBtn);
    wrap.appendChild(tools);
    wrap.appendChild(preview);
  }

  /* ================= TAHAP 4: PETI HADIAH ================= */
  function renderChest() {
    var box = el.querySelector(".game-hadiah");
    box.innerHTML = "";
    box.classList.add("aktif");

    var hadiah = C.detailHadiah;
    var wrap = document.createElement("div");
    wrap.className = "hadiah-wrap";

    var chest = document.createElement("div");
    chest.className = "peti" + (progress.hadiahDibuka ? " terbuka" : "");
    chest.innerHTML =
      '<div class="peti-badan"></div><div class="peti-tutup"></div><div class="peti-sinar"></div>';
    wrap.appendChild(chest);

    var pesan = document.createElement("div");
    pesan.className = "hadiah-isi";
    if (progress.hadiahDibuka) isiHadiah(pesan);

    var btn = document.createElement("button");
    btn.className = "btn btn-utama";
    btn.textContent = progress.hadiahDibuka ? "Buka lagi" : "🎉 Buka peti hadiah!";
    btn.addEventListener("click", function () {
      progress.hadiahDibuka = true; save();
      chest.classList.add("terbuka");
      burstConfettiDom(box);
      isiHadiah(pesan);
      btn.textContent = "Buka lagi";
    });
    wrap.appendChild(btn);
    wrap.appendChild(pesan);
    box.appendChild(wrap);
  }

  function isiHadiah(target) {
    var hadiah = C.detailHadiah;
    target.innerHTML = "";
    var h = document.createElement("h3");
    h.textContent = hadiah.judul;
    target.appendChild(h);
    var p = document.createElement("p");
    p.className = "hadiah-pesan";
    p.textContent = hadiah.pesan;
    target.appendChild(p);
    (hadiah.daftar || []).forEach(function (d) {
      var item = document.createElement("div");
      item.className = "hadiah-item";
      item.innerHTML = "<strong>♡ " + d.nama + "</strong><span>" + d.catatan + "</span>";
      target.appendChild(item);
    });
    var lagi = document.createElement("p");
    lagi.className = "hadiah-penutup";
    lagi.textContent = "Makasih udah jadi alasan aku bikin semua ini, " +
      (C.personal.panggilanSayang || "sayang") + ". — " + (C.personal.namaSaya || "");
    target.appendChild(lagi);
  }

  function burstConfettiDom(parent) {
    var colors = ["#ff8fae", "#ffd166", "#c8b6ff", "#a0e7a5", "#ffc8a2"];
    for (var i = 0; i < 26; i++) {
      (function (i) {
        var s = document.createElement("span");
        s.className = "confetti-dom";
        s.style.background = colors[i % colors.length];
        s.style.left = (20 + Math.random() * 60) + "%";
        s.style.top = "30%";
        s.style.setProperty("--dx", ((Math.random() - 0.5) * 320) + "px");
        s.style.setProperty("--dy", (140 + Math.random() * 220) + "px");
        s.style.animationDelay = (Math.random() * 0.25) + "s";
        parent.appendChild(s);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 2600);
      })(i);
    }
  }

  /* ================= ALUR TAHAP ================= */
  function flash(text) {
    var f = el.querySelector(".game-toast");
    f.textContent = text;
    f.classList.add("tampil");
    clearTimeout(f._t);
    f._t = setTimeout(function () { f.classList.remove("tampil"); }, 4200);
  }

  var Game = {
    _stage: 1,
    onExit: null,

    mount: function (root) {
      // Selalu baca ulang progres terbaru dari penyimpanan lokal
      progress = merge(DEFAULT_PROGRESS, Store.get(Store.K.GAME, {}));
      el = root;
      el.innerHTML =
        '<div class="game-head">' +
        '  <div class="game-judul"><span class="logo-quest">🎂</span> Birthday Quest</div>' +
        '  <div class="game-tahap" id="game-tahap" aria-live="polite"></div>' +
        '  <div class="game-aksi">' +
        '    <button class="btn btn-tipis game-petunjuk">💡 Petunjuk</button>' +
        '    <button class="btn btn-tipis game-keluar">🏠 Kembali ke kamar</button>' +
        "  </div>" +
        "</div>" +
        '<div class="game-toast" role="status"></div>' +
        '<div class="game-stage">' +
        '  <canvas class="game-canvas" id="game-canvas" aria-label="Taman Kenangan"></canvas>' +
        '  <div class="game-quiz"></div>' +
        '  <div class="game-puzzle"></div>' +
        '  <div class="game-hadiah"></div>' +
        "</div>" +
        '<div class="game-dpad" id="game-dpad" aria-label="Tombol arah">' +
        '  <button class="dpad-btn dpad-atas" data-dx="0" data-dy="-1" aria-label="Atas">▲</button>' +
        '  <button class="dpad-btn dpad-kiri" data-dx="-1" data-dy="0" aria-label="Kiri">◀</button>' +
        '  <button class="dpad-btn dpad-kanan" data-dx="1" data-dy="0" aria-label="Kanan">▶</button>' +
        '  <button class="dpad-btn dpad-bawah" data-dx="0" data-dy="1" aria-label="Bawah">▼</button>' +
        "</div>";

      canvas = el.querySelector("#game-canvas");
      ctx = canvas.getContext("2d");
      dpad = el.querySelector("#game-dpad");

      el.querySelector(".game-keluar").addEventListener("click", function () {
        if (Game.onExit) Game.onExit();
      });
      el.querySelector(".game-petunjuk").addEventListener("click", showHint);

      // Keyboard
      window.addEventListener("keydown", function (e) {
        keys[e.key] = true;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) >= 0 &&
            Game._stage === 1 && el.classList.contains("aktif")) e.preventDefault();
      });
      window.addEventListener("keyup", function (e) { keys[e.key] = false; });

      // Dpad sentuh
      var btns = dpad.querySelectorAll(".dpad-btn");
      Array.prototype.forEach.call(btns, function (b) {
        var set = function (on) {
          touchDir.x = on ? Number(b.dataset.dx) : 0;
          touchDir.y = on ? Number(b.dataset.dy) : 0;
        };
        b.addEventListener("touchstart", function (e) { e.preventDefault(); set(true); }, { passive: false });
        b.addEventListener("touchend", function () { set(false); });
        b.addEventListener("mousedown", function () { set(true); });
        b.addEventListener("mouseup", function () { set(false); });
        b.addEventListener("mouseleave", function () { set(false); });
      });

      Game.goStage(progress.tahap || 1, true);
    },

    resize: function () {
      if (!canvas || !el) return;
      var rect = canvas.getBoundingClientRect();
      if (rect.width < 10) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    },

    goStage: function (n, silent) {
      if (!el) { progress.tahap = n; save(); return; }
      Game._stage = n;
      progress.tahap = n;
      save();

      var quiz = el.querySelector(".game-quiz");
      var puzzle = el.querySelector(".game-puzzle");
      var hadiah = el.querySelector(".game-hadiah");
      [quiz, puzzle, hadiah].forEach(function (b) { b.classList.remove("aktif"); b.innerHTML = ""; });
      canvas.classList.remove("sembunyi");
      dpad.classList.remove("tampil");

      var label = el.querySelector("#game-tahap");
      if (n === 1) {
        label.textContent = "Tahap 1 — Taman Kenangan (" + heartCount() + "/5 hati)";
        portal.open = heartCount() === 5;
        Game.resize();
        startLoop();
        if (!silent) flash("Kumpulkan 5 hati yang tersebar di taman!");
      } else if (n === 2) {
        stopLoop();
        canvas.classList.add("sembunyi");
        label.textContent = "Tahap 2 — Kuis Tentang Kita";
        renderQuiz();
      } else if (n === 3) {
        stopLoop();
        canvas.classList.add("sembunyi");
        label.textContent = "Tahap 3 — Puzzle Foto";
        renderPuzzle();
      } else if (n === 4) {
        stopLoop();
        canvas.classList.add("sembunyi");
        label.textContent = "Hadiah untukmu";
        renderChest();
      }
      // Dpad hanya untuk tahap taman
      dpad.classList.toggle("tampil", n === 1);
    },

    show: function () {
      if (!el) return;
      el.classList.add("aktif");
      Game.resize();
      if (Game._stage === 1) startLoop();
    },
    hide: function () {
      if (!el) return;
      el.classList.remove("aktif");
      stopLoop();
    },
    resetSemua: function () {
      progress = merge(DEFAULT_PROGRESS, {});
      save();
      Game.goStage(1, true);
    },

    /* Status internal (untuk pengembangan/pengujian) */
    debugState: function () {
      return {
        tahap: Game._stage,
        hati: heartCount(),
        portalTerbuka: portal.open,
        pemain: { x: Math.round(player.x), y: Math.round(player.y) },
        tersimpan: Store.get(Store.K.GAME, null)
      };
    }
  };

  function showHint() {
    if (Game._stage === 1) {
      flash(heartCount() === 5
        ? "Semua hati sudah terkumpul! Jalan ke gerbang di atas taman ya."
        : "Kumpulkan 5 hati dengan berjalan ke arahnya. " + hintForHearts());
    } else if (Game._stage === 2) {
      flash("Kalau bingung, coba baca lagi halaman buku Our Little World — jawabannya ada di sana!");
    } else if (Game._stage === 3) {
      flash("Ketuk satu potongan, lalu ketuk potongan lain untuk menukar. Tekan 'Lihat gambar asli' kalau lupa gambarnya.");
    } else {
      flash("Tinggal buka peti hadiahnya!");
    }
  }

  window.LWGame = Game;
})();
