/* =====================================================================
   Our Little World — buku scrapbook digital
   ---------------------------------------------------------------------
   - Desktop: dua halaman berdampingan. HP: satu halaman.
   - Cara pindah halaman: pencet langsung sisi kiri (mundur) /
     sisi kanan (lanjut) — tidak perlu tombol di bawah buku.
   - Animasi daun balik seperti membuka buku sungguhan.
   - Halaman terakhir dibaca disimpan lokal.
   ===================================================================== */
(function () {
  var C = window.LW_CONFIG;
  var Store = window.LWStore;

  var el, bookEl, pagesEl, posisiEl, hintEl, flipHostEl;
  var idx = Store.get(Store.K.SCRAPBOOK_PAGE, 0);
  var total = C.buku.halaman.length;
  var onPageChange = null;
  var animating = false;

  /* ---------- Placeholder untuk foto yang belum ada ---------- */
  function makePlaceholder(text) {
    var d = document.createElement("div");
    d.className = "foto-placeholder";
    d.innerHTML =
      '<svg viewBox="0 0 120 100" aria-hidden="true">' +
      '<rect width="120" height="100" rx="8" fill="#fbdde4"/>' +
      '<circle cx="42" cy="38" r="12" fill="#fff"/>' +
      '<path d="M18 78 L44 52 L60 68 L74 56 L102 78 Z" fill="#fff"/>' +
      "</svg>" +
      "<span>" + (text || "Foto kalian") + "</span>" +
      '<em>taruh filenya di folder assets</em>';
    return d;
  }

  function photoEl(src, caption, cerita, extraClass) {
    var wrap = document.createElement("div");
    wrap.className = "polaroid " + (extraClass || "");
    var frame = document.createElement("div");
    frame.className = "polaroid-img";
    if (src) {
      var img = document.createElement("img");
      img.alt = caption || "Foto kenangan";
      img.loading = "lazy";
      img.src = src;
      img.onerror = function () {
        frame.innerHTML = "";
        frame.appendChild(makePlaceholder(caption));
      };
      frame.appendChild(img);
    } else {
      frame.appendChild(makePlaceholder(caption));
    }
    var tape = document.createElement("span");
    tape.className = "selotip";
    frame.appendChild(tape);

    wrap.appendChild(frame);
    if (caption) {
      var cap = document.createElement("p");
      cap.className = "polaroid-caption";
      cap.textContent = caption;
      wrap.appendChild(cap);
    }
    if (cerita) {
      var story = document.createElement("p");
      story.className = "polaroid-cerita";
      story.textContent = cerita;
      wrap.appendChild(story);
    }
    return wrap;
  }

  /* ---------- Merender isi satu halaman ---------- */
  function renderPage(page, side) {
    var p = document.createElement("div");
    p.className = "page page-" + side + " tema-" + (page.tipe || "cerita");

    var inner = document.createElement("div");
    inner.className = "page-inner";

    if (page.tipe === "sampul") {
      p.classList.add("halaman-sampul");
      var wrap = document.createElement("div");
      wrap.className = "sampul-tenaga";
      wrap.innerHTML =
        '<div class="sampul-hati" aria-hidden="true">♡</div>' +
        '<h2 class="sampul-judul">' + (page.judul || C.buku.judul) + "</h2>" +
        '<div class="sampul-garis" aria-hidden="true"></div>' +
        '<p class="sampul-sub">' + (page.subjudul || C.buku.subjudul) + "</p>" +
        '<p class="sampul-pembuat">' + (page.pembuat || "") + "</p>" +
        '<p class="sampul-hint">ketuk sisi halaman untuk mulai membaca ♡</p>';
      inner.appendChild(wrap);
      addDekorasi(inner, "hati");
      p.appendChild(inner);
      return p;
    }

    var h = document.createElement("h2");
    h.className = "page-judul";
    h.textContent = page.judul || "";
    inner.appendChild(h);

    if (page.tanggal) {
      var tg = document.createElement("div");
      tg.className = "page-tanggal";
      tg.textContent = page.tanggal;
      inner.appendChild(tg);
    }

    if (page.tipe === "cerita" || page.tipe === "momen" || page.tipe === "lucu") {
      (page.isi || []).forEach(function (txt) {
        var para = document.createElement("p");
        para.className = "page-teks";
        para.textContent = txt;
        inner.appendChild(para);
      });
      if (page.foto) inner.appendChild(photoEl(page.foto, page.captionFoto));
      if (page.kutipan) {
        var q = document.createElement("blockquote");
        q.className = "page-kutipan";
        q.innerHTML = "<p>" + page.kutipan.teks + "</p><cite>" + page.kutipan.dari + "</cite>";
        inner.appendChild(q);
      }
      if (page.dekorasi) addDekorasi(inner, page.dekorasi);
    }

    if (page.tipe === "galeri") {
      var grid = document.createElement("div");
      grid.className = "galeri";
      (page.foto || []).forEach(function (f, i) {
        grid.appendChild(photoEl(f.src, f.caption, f.cerita, i % 2 ? "miring-kanan" : "miring-kiri"));
      });
      inner.appendChild(grid);
    }

    if (page.tipe === "suka") {
      var list = document.createElement("ul");
      list.className = "daftar-suka";
      (page.daftar || []).forEach(function (item) {
        var li = document.createElement("li");
        li.innerHTML = '<span class="hati">♡</span> ';
        li.appendChild(document.createTextNode(item));
        list.appendChild(li);
      });
      inner.appendChild(list);
      if (page.dekorasi) addDekorasi(inner, page.dekorasi);
    }

    if (page.tipe === "surat") {
      (page.isi || []).forEach(function (txt) {
        var para = document.createElement("p");
        para.className = "page-teks surat-teks";
        para.textContent = txt;
        inner.appendChild(para);
      });
      var pen = document.createElement("div");
      pen.className = "surat-tanda";
      pen.innerHTML = "<span>" + (page.penutup || "") + "</span><strong>" + (page.tandaTangan || "") + "</strong>";
      inner.appendChild(pen);
    }

    // Nomor halaman kecil di sudut luar
    var no = document.createElement("span");
    no.className = "page-no";
    no.setAttribute("aria-hidden", "true");
    no.textContent = (page._nomor || "");
    p.appendChild(no);

    p.appendChild(inner);
    return p;
  }

  function addDekorasi(parent, jenis) {
    var d = document.createElement("div");
    d.className = "dekorasi dekorasi-" + jenis;
    d.setAttribute("aria-hidden", "true");
    d.textContent = jenis === "bunga" ? "❀ ❀ ❀" : jenis === "hati" ? "♡ ♡ ♡" : "✿ ✦ ♡ ✦ ✿";
    parent.appendChild(d);
  }

  /* ---------- Perataan halaman ---------- */
  function isDesktop() { return window.innerWidth >= 860; }
  function clamp(i) { return Math.max(0, Math.min(total - 1, i)); }

  function currentPair() {
    if (isDesktop()) {
      // Sampul tampil di sisi kanan (seperti buku tertutup), kiri = endpaper
      if (idx === 0) return { left: -1, right: 0 };
      var left = idx % 2 === 1 ? idx : idx - 1;
      return { left: left, right: left + 1 <= total - 1 ? left + 1 : -1 };
    }
    return { left: idx, right: -1 };
  }

  function prefersReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- Render statis (tanpa animasi) ---------- */
  function render() {
    var pair = currentPair();
    pagesEl.innerHTML = "";

    C.buku.halaman.forEach(function (h, i) { h._nomor = i + 1; });

    if (pair.left >= 0) pagesEl.appendChild(renderPage(C.buku.halaman[pair.left], "left"));
    else pagesEl.appendChild(renderEndpaper());
    if (pair.right >= 0) pagesEl.appendChild(renderPage(C.buku.halaman[pair.right], "right"));

    updateInfo(pair);
    Store.set(Store.K.SCRAPBOOK_PAGE, idx);
    if (onPageChange) onPageChange(idx);
  }

  /* Halaman kiri saat buku masih tertutup (endpaper) */
  function renderEndpaper() {
    var p = document.createElement("div");
    p.className = "page page-left endpaper";
    p.setAttribute("aria-hidden", "true");
    var inner = document.createElement("div");
    inner.className = "endpaper-tenaga";
    inner.innerHTML = '<span class="endpaper-hati">♡</span><span class="endpaper-teks">our little world</span>';
    p.appendChild(inner);
    return p;
  }

  function updateInfo(pair) {
    var label;
    if (!isDesktop()) {
      label = "Halaman " + (idx + 1) + " dari " + total;
    } else if (pair.left < 0) {
      label = "Halaman 1 dari " + total;              // sampul
    } else if (pair.right >= 0) {
      label = "Halaman " + (pair.left + 1) + "–" + (pair.right + 1) + " dari " + total;
    } else {
      label = "Halaman " + (pair.left + 1) + " dari " + total;
    }
    if (posisiEl) posisiEl.textContent = label;
    if (hintEl) {
      hintEl.textContent = isDesktop()
        ? "ketuk sisi kanan untuk lanjut · sisi kiri untuk mundur ♡"
        : "usap atau ketuk sisi halaman untuk membalik ♡";
    }
  }

  /* ---------- Memutar halaman (efek daun buku) ---------- */
  function turnTo(newIdx, dir) {
    newIdx = clamp(newIdx);
    if (newIdx === idx || animating) return;

    var desk = isDesktop();
    var oldPair = currentPair();

    idx = newIdx;
    var newPair = currentPair();

    // Pasangan halaman tidak berubah (mis. sudah di halaman terakhir)
    if (oldPair.left === newPair.left && oldPair.right === newPair.right) {
      render();
      return;
    }

    // Halaman yang jadi "muka depan" daun yang dibalik
    var frontIdx;
    var anchorLeft;
    if (desk && oldPair.right >= 0) {
      if (dir > 0) { frontIdx = oldPair.right; anchorLeft = true; }
      else { frontIdx = oldPair.left; anchorLeft = false; }
    } else {
      frontIdx = oldPair.left;
      anchorLeft = dir > 0;
    }

    var oldEl = pagesEl.querySelector(".page");
    var allOld = pagesEl.querySelectorAll(".page");
    if (desk && oldPair.right >= 0 && dir > 0) oldEl = allOld[1];
    var oldRect = oldEl ? relRect(oldEl.getBoundingClientRect()) : null;
    var frontClone = oldEl ? oldEl.cloneNode(true) : null;

    render(); // halaman baru sudah tersusun di bawah daun

    // Wajah belakang daun = halaman baru yang muncul setelah daun terbalik
    var newPages = pagesEl.querySelectorAll(".page");
    var backEl = (desk && newPair.right >= 0 && dir < 0) ? newPages[1] : newPages[0];
    if (!backEl) backEl = pagesEl.querySelector(".page");
    var backClone = backEl ? backEl.cloneNode(true) : null;

    if (!frontClone || !oldRect || prefersReduced()) return;

    animating = true;
    var leaf = document.createElement("div");
    leaf.className = "daun";
    leaf.style.left = oldRect.left + "px";
    leaf.style.top = oldRect.top + "px";
    leaf.style.width = oldRect.width + "px";
    leaf.style.height = oldRect.height + "px";
    leaf.style.transformOrigin = anchorLeft ? "left center" : "right center";

    var muka = document.createElement("div");
    muka.className = "daun-muka";
    frontClone.classList.add("dalam-daun");
    muka.appendChild(frontClone);

    var belakang = document.createElement("div");
    belakang.className = "daun-belakang";
    backClone.classList.add("dalam-daun");
    belakang.appendChild(backClone);

    var bayang = document.createElement("div");
    bayang.className = "daun-bayang";

    leaf.appendChild(muka);
    leaf.appendChild(belakang);
    leaf.appendChild(bayang);
    flipHostEl.appendChild(leaf);

    var angle = anchorLeft ? -176 : 176;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        leaf.style.transform = "rotateY(" + angle + "deg)";
        bayang.style.opacity = "0.15";
      });
    });
    setTimeout(function () {
      if (leaf.parentNode) leaf.parentNode.removeChild(leaf);
      animating = false;
    }, 780);
  }

  function relRect(r) {
    var b = bookEl.getBoundingClientRect();
    return { left: r.left - b.left, top: r.top - b.top, width: r.width, height: r.height };
  }

  function go(delta) {
    var desk = isDesktop();
    var next;
    if (!desk) {
      next = idx + delta;
    } else if (idx === 0) {
      next = delta > 0 ? 1 : 0;
    } else if (delta > 0) {
      next = idx + 2;
    } else {
      next = idx <= 1 ? 0 : idx - 2;
    }
    turnTo(next, delta > 0 ? 1 : -1);
  }

  /* ---------- API publik ---------- */
  var Scrapbook = {
    mount: function (root, opts) {
      el = root;
      onPageChange = (opts && opts.onPageChange) || null;
      el.innerHTML =
        '<div class="buku-wrap">' +
        '  <div class="buku" role="group" tabindex="0" aria-label="Buku Our Little World. Ketuk sisi kanan halaman untuk lanjut, sisi kiri untuk mundur.">' +
        '    <div class="buku-sampul-buka" aria-hidden="true"></div>' +
        '    <div class="buku-halaman" id="buku-halaman"></div>' +
        '    <div class="buku-flip" aria-hidden="true"></div>' +
        '  </div>' +
        '  <div class="buku-info">' +
        '    <span class="buku-posisi" aria-live="polite"></span>' +
        '    <span class="buku-hint" aria-hidden="true"></span>' +
        "  </div>" +
        '  <button class="btn btn-utama buku-tutup">✕ Kembali ke kamar</button>' +
        "</div>";

      bookEl = el.querySelector(".buku");
      pagesEl = el.querySelector("#buku-halaman");
      flipHostEl = el.querySelector(".buku-flip");
      posisiEl = el.querySelector(".buku-posisi");
      hintEl = el.querySelector(".buku-hint");

      el.querySelector(".buku-tutup").addEventListener("click", function () {
        if (Scrapbook.onClose) Scrapbook.onClose();
      });

      /* Klik langsung di sisi halaman: kanan = lanjut, kiri = mundur */
      var pDown = null;
      bookEl.addEventListener("pointerdown", function (e) {
        pDown = { x: e.clientX, y: e.clientY };
      });
      bookEl.addEventListener("pointerup", function (e) {
        if (!pDown) return;
        var dx = Math.abs(e.clientX - pDown.x);
        var dy = Math.abs(e.clientY - pDown.y);
        pDown = null;
        if (dx > 12 || dy > 12) return;      // ini geseran/scroll, bukan ketukan
        if (animating) return;
        var r = bookEl.getBoundingClientRect();
        if (e.clientX - r.left < r.width / 2) go(-1);
        else go(1);
      });
      bookEl.addEventListener("pointercancel", function () { pDown = null; });

      /* Keyboard */
      el.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "Escape" && Scrapbook.onClose) Scrapbook.onClose();
      });

      /* Sentuhan: usap untuk ganti halaman */
      var sx = 0, sy = 0;
      bookEl.addEventListener("touchstart", function (e) {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      bookEl.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      }, { passive: true });

      idx = clamp(idx);
      render();
      bookEl.classList.add("terbuka");
    },
    reset: function () { /* biarkan halaman tersimpan */ },
    openCover: function () {
      if (bookEl) {
        bookEl.classList.remove("terbuka");
        void bookEl.offsetWidth;
        bookEl.classList.add("terbuka");
      }
    },
    getPage: function () { return idx; },
    onLeave: function () { Store.set(Store.K.SCRAPBOOK_PAGE, idx); }
  };

  window.LWScrapbook = Scrapbook;
})();
