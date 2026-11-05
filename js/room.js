/* =====================================================================
   Little Room 3D — ruangan interaktif (Three.js r128)
   ---------------------------------------------------------------------
   Semua furnitur dibangun dari bentuk dasar (procedural), jadi tidak
   butuh file model apa pun. Objek interaktif punya label + sorotan.
   ===================================================================== */
(function () {
  var C = window.LW_CONFIG;
  var THREE_OK = (function () {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  })();

  var Room = {
    available: THREE_OK,
    _interactables: [],
    _anchors: {},
    _hearts: [],
    _confetti: [],
    _focused: null
  };

  /* ==================================================================
     Utilitas bentuk & tekstur
     ================================================================== */

  // Kotak membulat (rasa plush) via ExtrudeGeometry
  function roundedBox(w, h, d, r) {
    r = Math.min(r || 0.12, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
    var bevel = Math.min(r, d / 2 - 0.01);
    var shape = new THREE.Shape();
    var x = -w / 2, y = -h / 2, rw = w - bevel * 2, rh = h - bevel * 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + rw - r, y);
    shape.quadraticCurveTo(x + rw, y, x + rw, y + r);
    shape.lineTo(x + rw, y + rh - r);
    shape.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
    shape.lineTo(x + r, y + rh);
    shape.quadraticCurveTo(x, y + rh, x, y + rh - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 3, curveSegments: 6
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }

  function mat(color, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: opts.rough !== undefined ? opts.rough : 0.92,
      metalness: opts.metal !== undefined ? opts.metal : 0.02,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0,
      map: opts.map || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity !== undefined ? opts.opacity : 1,
      side: opts.side || THREE.FrontSide
    });
  }

  // Tekstur kanvas (lantai kayu, tikar, layar, dll) — tanpa file eksternal
  function canvasTexture(w, h, draw) {
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    var t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    return t;
  }

  function woodTexture() {
    return canvasTexture(512, 512, function (g, w, h) {
      g.fillStyle = "#dcb489"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? "#d3a87d" : "#e2bd94";
        g.fillRect(0, i * h / 8, w, h / 8 - 3);
        g.strokeStyle = "rgba(140,100,70,.5)";
        g.beginPath(); g.moveTo(0, i * h / 8 - 1); g.lineTo(w, i * h / 8 - 1); g.stroke();
        for (var j = 0; j < 7; j++) {
          g.strokeStyle = "rgba(160,120,88,.4)";
          g.beginPath();
          var y = i * h / 8 + 8 + Math.random() * (h / 8 - 16);
          g.moveTo(0, y);
          g.bezierCurveTo(w / 3, y + 4, 2 * w / 3, y - 4, w, y + 2);
          g.stroke();
        }
      }
    });
  }

  function rugTexture() {
    return canvasTexture(256, 256, function (g, w, h) {
      g.fillStyle = "#eab5ae"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#dfa09c";
      for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++)
        if ((x + y) % 2 === 0) g.fillRect(x * w / 6, y * h / 6, w / 6, h / 6);
      g.strokeStyle = "#c97f7f"; g.lineWidth = 12;
      g.strokeRect(10, 10, w - 20, h - 20);
      g.strokeStyle = "rgba(255,240,235,.7)"; g.lineWidth = 4;
      g.strokeRect(22, 22, w - 44, h - 44);
    });
  }

  function screenTexture() {
    return canvasTexture(512, 320, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#ffe3ec"); gr.addColorStop(1, "#ffd0dd");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff";
      g.font = "bold 34px sans-serif"; g.textAlign = "center";
      g.fillText("Birthday Quest", w / 2, 90);
      g.font = "24px sans-serif"; g.fillStyle = "#e07a9a";
      g.fillText("♡ klik untuk mulai ♡", w / 2, 150);
      // smiley
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(w / 2, 225, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e07a9a";
      g.beginPath(); g.arc(w / 2 - 12, 218, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(w / 2 + 12, 218, 4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#e07a9a"; g.lineWidth = 3;
      g.beginPath(); g.arc(w / 2, 230, 14, 0.2, Math.PI - 0.2); g.stroke();
    });
  }

  function photoTexture(label) {
    return canvasTexture(256, 320, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, "#ffd9e2"); gr.addColorStop(1, "#e9d5ff");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.85)";
      g.beginPath(); g.arc(w / 2, 125, 55, 0, Math.PI * 2); g.fill();
      g.font = "22px sans-serif"; g.fillStyle = "#b06a80"; g.textAlign = "center";
      g.fillText(label || "Foto kita", w / 2, 245);
      g.font = "15px sans-serif";
      g.fillText("(ganti dengan foto asli)", w / 2, 272);
    });
  }

  function keysTexture() {
    return canvasTexture(256, 96, function (g, w, h) {
      g.fillStyle = "#ffe9ef"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff";
      for (var y = 0; y < 3; y++) for (var x = 0; x < 12; x++)
        g.fillRect(4 + x * 21, 6 + y * 30, 17, 25);
    });
  }

  /* ==================================================================
     Instansi
     ================================================================== */
  var scene, camera, renderer, clock, container, overlayEl;
  var raycaster, pointer;
  var hovered = null;
  var camState = { target: null, home: null, tweening: false, tween: null };
  var orbit = { azimuth: 0, polar: 0, dist: 0, minAz: -0.55, maxAz: 0.75, minPolar: 0.35, maxPolar: 1.15, minDist: 5, maxDist: 20 };
  var penguinRef, candleRef, flameRef, flameLightRef, screenMat, bookRef, bookCoverRef, pcRef;
  var anim = { penguinHug: 0, penguinHugTarget: 0, curtain: 0 };
  var reducedMotion = false;
  var started = false;
  var callbacks = {};
  var perf = { shadows: true, pixelRatio: 2, particles: 1 };

  Room.init = function (opts) {
    container = opts.container;
    callbacks = opts.callbacks || {};
    reducedMotion = !!opts.reducedMotion;

    var isSmall = Math.min(window.innerWidth, window.innerHeight) < 760 || /Mobi|Android/i.test(navigator.userAgent);
    perf.shadows = !isSmall;
    perf.pixelRatio = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
    perf.particles = isSmall ? 0.6 : 1;

    var canvas = document.createElement("canvas");
    canvas.className = "room-canvas";
    container.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isSmall, alpha: false });
    renderer.setPixelRatio(perf.pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    if (perf.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    // Tone mapping agar highlight tidak "pecah" dan objek tetap terbaca jelas
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xefd9c8);
    scene.fog = new THREE.Fog(0xefd9c8, 24, 46);

    camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(-10, -10);

    buildRoom();
    buildLights();
    buildInteractables();
    setupControls();

    // Overlay label
    overlayEl = document.createElement("div");
    overlayEl.className = "room-labels";
    container.appendChild(overlayEl);

    window.addEventListener("resize", onResize);
    started = true;
    animate();
  };

  Room.setReducedMotion = function (v) { reducedMotion = v; };

  // Kumpulkan semua mesh yang bisa disentuh (untuk raycast & highlight)
  function buildInteractables() {
    Room._interactables = [];
    scene.traverse(function (o) {
      if (o.isMesh && o.userData && o.userData.interactId) Room._interactables.push(o);
    });
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /* ==================================================================
     Membangun ruangan
     ================================================================== */
  var COLORS = {
    cream: 0xf7e6d8, pink: 0xf0a9bb, pinkDeep: 0xd9788f, peach: 0xf8c39c,
    brown: 0xb98a62, brownDark: 0x8f6242, lavender: 0xb89ae0, white: 0xfff8f2,
    red: 0xd94b50, dark: 0x3b3340,
    // Warna tambahan biar kamar tidak monoton pink-cream
    mint: 0x9ed8c8, sage: 0xaec6a4, mustard: 0xe8b453,
    terracotta: 0xd98a63, mauve: 0xc9899f, rose: 0xe07a92,
    teal: 0x6fb6ad, walnut: 0xa9744f, walnutDark: 0x8a5c3b
  };

  function addMesh(parent, geo, material, x, y, z, opts) {
    opts = opts || {};
    var m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rz) m.rotation.z = opts.rz;
    if (opts.s) m.scale.set(opts.s[0], opts.s[1], opts.s[2]);
    m.castShadow = perf.shadows && opts.cast !== false;
    m.receiveShadow = perf.shadows && opts.receive !== false;
    parent.add(m);
    return m;
  }

  function buildRoom() {
    // --- Lantai kayu (lebih pekat supaya furnitur menonjol) ---
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      mat(0xffffff, { map: woodTexture(), rough: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = perf.shadows;
    scene.add(floor);

    // --- Dinding belakang (z = -5) & kiri (x = -5) ---
    var wallMat = mat(0xf5e6d8, { rough: 0.97 });
    var wallB = new THREE.Mesh(new THREE.PlaneGeometry(11, 6.6), wallMat);
    wallB.position.set(0, 3.3, -5); wallB.receiveShadow = perf.shadows;
    scene.add(wallB);
    var wallL = new THREE.Mesh(new THREE.PlaneGeometry(11, 6.6), wallMat.clone());
    wallL.rotation.y = Math.PI / 2;
    wallL.position.set(-5, 3.3, 0); wallL.receiveShadow = perf.shadows;
    scene.add(wallL);

    // --- Panel bawah dinding (wainscot) + rail: menambah warna & batas ruang ---
    var panelMat = mat(COLORS.sage, { rough: 0.92 });
    var railMat = mat(0xfff6ec, { rough: 0.85 });
    addMesh(scene, new THREE.BoxGeometry(11, 1.25, 0.09), panelMat, 0, 0.63, -4.94, { cast: false });
    addMesh(scene, new THREE.BoxGeometry(0.09, 1.25, 11), panelMat, -4.94, 0.63, 0, { cast: false });
    addMesh(scene, new THREE.BoxGeometry(11, 0.1, 0.16), railMat, 0, 1.3, -4.92, { cast: false });
    addMesh(scene, new THREE.BoxGeometry(0.16, 0.1, 11), railMat, -4.92, 1.3, 0, { cast: false });
    // Baseboard
    var bbMat = mat(0xf0e0d0, { rough: 0.9 });
    addMesh(scene, new THREE.BoxGeometry(11, 0.26, 0.14), bbMat, 0, 0.13, -4.9, { cast: false });
    addMesh(scene, new THREE.BoxGeometry(0.14, 0.26, 11), bbMat, -4.9, 0.13, 0, { cast: false });

    // --- Tikar lembut ---
    addMesh(scene, new THREE.CylinderGeometry(2.3, 2.3, 0.07, 40),
      mat(0xffffff, { map: rugTexture(), rough: 1 }), 0.4, 0.035, 1.4, { cast: false });

    // --- Jendela + tirai (dinding belakang) ---
    buildWindow();

    // --- Kasur (sisi kiri) ---
    buildBed();

    // --- Meja rendah + buku scrapbook (depan) ---
    buildLowTable();

    // --- Meja komputer + PC (kanan) ---
    buildDesk();

    // --- Rak koleksi (dinding belakang kanan) ---
    buildShelf();

    // --- Meja kue + kue ulang tahun (kiri depan) ---
    buildCakeTable();

    // --- Vas bunga, bingkai foto, speaker, kotak hadiah, kursi ---
    buildDecor();

    // --- Detail dekoratif tambahan (non-interaktif) ---
    buildWallDetails();
    buildFloorDetails();
  }

  var curtainL, curtainR;
  function buildWindow() {
    var g = new THREE.Group();
    g.position.set(-2.1, 3.35, -4.94);
    scene.add(g);

    // Cahaya sore di balik jendela (diredam supaya tidak menyilaukan)
    addMesh(g, new THREE.PlaneGeometry(2.9, 2.3),
      mat(0xfff0dc, { emissive: 0xffc98f, emissiveIntensity: 0.38, rough: 1 }), 0, 0, -0.06, { cast: false });

    // Sela-sela jendela
    var frameMat = mat(COLORS.white, { rough: 0.8 });
    addMesh(g, roundedBox(3.1, 0.16, 0.14, 0.05), frameMat, 0, 1.2, 0.02);
    addMesh(g, roundedBox(3.1, 0.16, 0.14, 0.05), frameMat, 0, -1.2, 0.02);
    addMesh(g, roundedBox(0.16, 2.5, 0.14, 0.05), frameMat, -1.5, 0, 0.02);
    addMesh(g, roundedBox(0.16, 2.5, 0.14, 0.05), frameMat, 1.5, 0, 0.02);
    addMesh(g, roundedBox(0.1, 2.4, 0.12, 0.04), frameMat, 0, 0, 0.02);
    addMesh(g, roundedBox(3.0, 0.1, 0.12, 0.04), frameMat, 0, 0, 0.02);

    // Tirai kiri & kanan (bergoyang pelan)
    var curMat = mat(COLORS.rose, { rough: 1 });
    curtainL = addMesh(g, roundedBox(0.85, 3.0, 0.22, 0.3), curMat, -1.55, -0.1, 0.28);
    curtainR = addMesh(g, roundedBox(0.85, 3.0, 0.22, 0.3), curMat.clone(), 1.55, -0.1, 0.28);
    // Rel tirai
    addMesh(g, new THREE.CylinderGeometry(0.07, 0.07, 4.0, 12),
      mat(COLORS.walnutDark, { metal: 0.4, rough: 0.5 }), 0, 1.55, 0.3, { rz: Math.PI / 2 });
    addMesh(g, new THREE.SphereGeometry(0.13, 14, 12), mat(COLORS.mustard), -2.0, 1.55, 0.3);
    addMesh(g, new THREE.SphereGeometry(0.13, 14, 12), mat(COLORS.mustard), 2.0, 1.55, 0.3);

    // Kecil-kecilan di jendela: pot tanaman di ambang
    var pot = new THREE.Group();
    pot.position.set(-1.15, -1.05, 0.16);
    g.add(pot);
    addMesh(pot, new THREE.CylinderGeometry(0.16, 0.12, 0.24, 14), mat(COLORS.terracotta, { rough: 0.9 }), 0, 0.12, 0);
    for (var i = 0; i < 4; i++) {
      var a = i / 4 * Math.PI * 2;
      addMesh(pot, new THREE.SphereGeometry(0.11, 10, 8), mat(0x8fbb7f, { rough: 1 }),
        Math.cos(a) * 0.08, 0.3 + (i % 2) * 0.08, Math.sin(a) * 0.08, { s: [1, 1.3, 1] });
    }
    // Gantungan kaus kaki kecil di rel jendela
    addMesh(g, roundedBox(0.26, 0.3, 0.06, 0.06), mat(COLORS.mustard, { rough: 1 }), 1.1, -0.9, 0.42, { rz: 0.06 });
  }

  var penguin = null;
  function buildBed() {
    var g = new THREE.Group();
    g.position.set(-2.75, 0, -0.4);
    scene.add(g);

    // Kasur
    addMesh(g, roundedBox(3.6, 0.85, 4.3, 0.35), mat(COLORS.cream, { rough: 1 }), 0, 0.45, 0);
    // Skirt/kain bawah
    addMesh(g, roundedBox(3.7, 0.3, 4.4, 0.12), mat(COLORS.pinkDeep, { rough: 1 }), 0, 0.16, 0);
    // Sprei motif titik (tetap terang biar beda dari selimut & headboard)
    var spreiMat = mat(0xffffff, {
      map: canvasTexture(256, 256, function (g2, w, h) {
        g2.fillStyle = "#fff0e4"; g2.fillRect(0, 0, w, h);
        g2.fillStyle = "#f2b9c6";
        for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) {
          g2.beginPath(); g2.arc(x * w / 6 + 20, y * h / 6 + 20, 7, 0, Math.PI * 2); g2.fill();
        }
      }), rough: 1
    });
    addMesh(g, roundedBox(3.5, 0.22, 4.15, 0.1), spreiMat, 0, 0.92, 0);

    // Selimut
    addMesh(g, roundedBox(3.45, 0.28, 2.1, 0.14), mat(COLORS.lavender, { rough: 1 }), 0, 1.04, 1.0);
    // Galur selimut biar ada aksen gelap
    addMesh(g, roundedBox(3.45, 0.1, 0.5, 0.06), mat(0xa98fd0, { rough: 1 }), 0, 1.13, 0.45);

    // Bantal
    addMesh(g, roundedBox(1.5, 0.42, 0.95, 0.28), mat(COLORS.white, { rough: 1 }), -0.85, 1.16, -1.55);
    addMesh(g, roundedBox(1.2, 0.36, 0.85, 0.25), mat(COLORS.mustard, { rough: 1 }), 0.75, 1.13, -1.6, { ry: 0.2 });
    // Bantal kecil bulat aksen
    addMesh(g, new THREE.SphereGeometry(0.3, 16, 12), mat(COLORS.mint, { rough: 1 }), -1.35, 1.12, -0.9, { s: [1, 0.55, 1] });

    // Headboard lucu
    addMesh(g, roundedBox(3.6, 1.1, 0.3, 0.35), mat(COLORS.rose, { rough: 1 }), 0, 1.5, -2.15);
    // Titik-titik dekorasi headboard
    for (var d = 0; d < 5; d++) {
      addMesh(g, new THREE.SphereGeometry(0.07, 10, 8), mat(COLORS.mustard, { rough: 0.8 }),
        -1.3 + d * 0.65, 1.72, -1.99, { cast: false });
    }

    // --- Pinguin pink Miniso ---
    penguin = buildPenguin();
    penguin.position.set(0.15, 1.15, 0.25);
    penguin.rotation.y = 0.45;
    g.add(penguin);
  }

  function buildPenguin() {
    var g = new THREE.Group();
    // Warna dasar sengaja lebih pekat: pencahayaan + tone mapping ikut
    // "mencerahkan" warna, jadi albedo harus lebih saturasi agar hasilnya hidup
    var pinkMat = mat(0xe04472, { rough: 1 });        // pink hidup
    var pinkDarkMat = mat(0xc22a57, { rough: 1 });    // aksen gelap
    var creamMat = mat(0xffeeda, { rough: 1 });       // perut & wajah (cream hangat)

    // Badan (agak lonjong, plush)
    var body = addMesh(g, new THREE.SphereGeometry(0.52, 26, 22), pinkMat, 0, 0.52, 0, { s: [1, 1.12, 0.95] });
    // Perut cream
    addMesh(g, new THREE.SphereGeometry(0.4, 22, 18), creamMat, 0, 0.47, 0.22, { s: [0.95, 1.05, 0.75] });
    // Wajah cream
    addMesh(g, new THREE.SphereGeometry(0.32, 20, 16), creamMat, 0, 0.82, 0.2, { s: [1.05, 0.85, 0.6] });
    // Jantung kecil di perut (bordir)
    addMesh(g, new THREE.SphereGeometry(0.05, 10, 8), pinkDarkMat, -0.04, 0.51, 0.53, { s: [1, 1, 0.55], cast: false });
    addMesh(g, new THREE.SphereGeometry(0.05, 10, 8), pinkDarkMat, 0.04, 0.51, 0.53, { s: [1, 1, 0.55], cast: false });
    addMesh(g, new THREE.ConeGeometry(0.07, 0.1, 12), pinkDarkMat, 0, 0.47, 0.53, { rz: Math.PI, cast: false });
    // Mata
    var eyeMat = mat(0x2e2733, { rough: 0.4 });
    addMesh(g, new THREE.SphereGeometry(0.055, 12, 10), eyeMat, -0.13, 0.85, 0.44);
    addMesh(g, new THREE.SphereGeometry(0.055, 12, 10), eyeMat, 0.13, 0.85, 0.44);
    // Kilauan mata
    addMesh(g, new THREE.SphereGeometry(0.02, 8, 8), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), -0.11, 0.87, 0.48, { cast: false });
    addMesh(g, new THREE.SphereGeometry(0.02, 8, 8), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 0.15, 0.87, 0.48, { cast: false });
    // Pipi
    var cheekMat = mat(0xff86a5, { rough: 1, transparent: true, opacity: 0.9 });
    addMesh(g, new THREE.SphereGeometry(0.075, 10, 8), cheekMat, -0.24, 0.76, 0.36, { s: [1, 0.7, 0.5], cast: false });
    addMesh(g, new THREE.SphereGeometry(0.075, 10, 8), cheekMat, 0.24, 0.76, 0.36, { s: [1, 0.7, 0.5], cast: false });
    // Paruh
    addMesh(g, new THREE.ConeGeometry(0.075, 0.15, 10), mat(0xf3943a, { rough: 0.8 }), 0, 0.75, 0.47, { rx: Math.PI / 2 });
    // Kaki
    addMesh(g, new THREE.SphereGeometry(0.11, 12, 10), mat(0xf3943a), -0.18, 0.06, 0.14, { s: [1, 0.45, 1.35] });
    addMesh(g, new THREE.SphereGeometry(0.11, 12, 10), mat(0xf3943a), 0.18, 0.06, 0.14, { s: [1, 0.45, 1.35] });

    // Sayap (pivot untuk gerak memeluk)
    g.wingL = new THREE.Group();
    g.wingL.position.set(-0.47, 0.62, 0);
    var wl = addMesh(g.wingL, new THREE.SphereGeometry(0.16, 14, 12), pinkMat, -0.06, -0.16, 0, { s: [0.55, 1.5, 0.8] });
    g.add(g.wingL);

    g.wingR = new THREE.Group();
    g.wingR.position.set(0.47, 0.62, 0);
    addMesh(g.wingR, new THREE.SphereGeometry(0.16, 14, 12), pinkMat, 0.06, -0.16, 0, { s: [0.55, 1.5, 0.8] });
    g.add(g.wingR);

    g.userData.isPenguin = true;
    g.traverse(function (o) { if (o.isMesh) o.userData.interactId = "penguin"; });
    return g;
  }

  var lowTable;
  function buildLowTable() {
    lowTable = new THREE.Group();
    lowTable.position.set(-0.9, 0, 2.7);
    scene.add(lowTable);

    addMesh(lowTable, roundedBox(2.6, 0.22, 1.6, 0.12), mat(COLORS.walnut, { rough: 0.75 }), 0, 0.78, 0);
    var legMat = mat(COLORS.walnutDark, { rough: 0.75 });
    addMesh(lowTable, new THREE.CylinderGeometry(0.1, 0.1, 0.72, 12), legMat, -1.1, 0.36, -0.6);
    addMesh(lowTable, new THREE.CylinderGeometry(0.1, 0.1, 0.72, 12), legMat, 1.1, 0.36, -0.6);
    addMesh(lowTable, new THREE.CylinderGeometry(0.1, 0.1, 0.72, 12), legMat, -1.1, 0.36, 0.6);
    addMesh(lowTable, new THREE.CylinderGeometry(0.1, 0.1, 0.72, 12), legMat, 1.1, 0.36, 0.6);

    // --- Buku scrapbook (objek utama) ---
    bookRef = new THREE.Group();
    bookRef.position.set(0, 0.9, 0);
    lowTable.add(bookRef);

    // Sampul bawah
    addMesh(bookRef, roundedBox(1.5, 0.1, 1.15, 0.06), mat(COLORS.rose, { rough: 0.8 }), 0, 0.05, 0);
    // Halaman
    addMesh(bookRef, roundedBox(1.4, 0.13, 1.05, 0.04), mat(0xfff3e0, { rough: 1 }), 0, 0.15, 0);
    // Sampul atas — pivot di tepi kiri supaya bisa "dibuka"
    bookCoverRef = new THREE.Group();
    bookCoverRef.position.set(-0.75, 0.14, 0);
    bookRef.add(bookCoverRef);
    var cover = addMesh(bookCoverRef, roundedBox(1.5, 0.09, 1.15, 0.06), mat(COLORS.rose, { rough: 0.8 }), 0.75, 0.06, 0);
    cover.userData.interactId = "buku";
    // Label tulisan di sampul
    var labelTex = canvasTexture(512, 400, function (g, w, h) {
      g.fillStyle = "#e07a92"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#fff3e6"; g.lineWidth = 8; g.strokeRect(20, 20, w - 40, h - 40);
      g.fillStyle = "#fff6ea"; g.textAlign = "center";
      g.font = "bold 52px 'Georgia', serif";
      g.fillText("Our Little", w / 2, 175);
      g.fillText("World", w / 2, 240);
      g.font = "30px sans-serif";
      g.fillText("♡", w / 2, 310);
    });
    var labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0),
      new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.9 }));
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.set(0.75, 0.108, 0);
    bookCoverRef.add(labelMesh);
    labelMesh.userData.interactId = "buku";
    // Pita
    addMesh(bookRef, roundedBox(0.16, 0.16, 1.2, 0.05), mat(COLORS.lavender), 0.45, 0.16, 0);
    bookRef.traverse(function (o) { if (o.isMesh && !o.userData.interactId) o.userData.interactId = "buku"; });

    // Bunga kecil di samping buku
    buildTinyFlowers(lowTable, 1.02, 0.9, -0.55);
  }

  function buildTinyFlowers(parent, x, y, z) {
    var g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    addMesh(g, new THREE.CylinderGeometry(0.09, 0.07, 0.22, 10), mat(0xf2e6d8), 0, 0.11, 0);
    var petal = mat(0xf7a8bd, { rough: 1 });
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2;
      addMesh(g, new THREE.SphereGeometry(0.055, 10, 8), petal, Math.cos(a) * 0.07, 0.28, Math.sin(a) * 0.07);
    }
    addMesh(g, new THREE.SphereGeometry(0.045, 10, 8), mat(0xfbd98a), 0, 0.29, 0);
  }

  function buildDesk() {
    var g = new THREE.Group();
    g.position.set(2.8, 0, -2.2);
    scene.add(g);

    // Meja
    addMesh(g, roundedBox(3.6, 0.18, 1.7, 0.08), mat(COLORS.walnut, { rough: 0.7 }), 0, 1.42, 0);
    var legMat = mat(COLORS.walnutDark, { rough: 0.75 });
    addMesh(g, roundedBox(0.16, 1.4, 0.16, 0.05), legMat, -1.6, 0.7, -0.65);
    addMesh(g, roundedBox(0.16, 1.4, 0.16, 0.05), legMat, 1.6, 0.7, -0.65);
    addMesh(g, roundedBox(0.16, 1.4, 0.16, 0.05), legMat, -1.6, 0.7, 0.65);
    addMesh(g, roundedBox(0.16, 1.4, 0.16, 0.05), legMat, 1.6, 0.7, 0.65);

    // --- PC pink ---
    pcRef = new THREE.Group();
    pcRef.position.set(0, 1.51, -0.35);
    g.add(pcRef);

    var pinkMat = mat(0xf5a9bd, { rough: 0.7 });
    addMesh(pcRef, roundedBox(1.0, 0.12, 0.55, 0.05), pinkMat, 0, 0.06, 0);           // dudukan
    addMesh(pcRef, roundedBox(0.22, 0.42, 0.2, 0.06), pinkMat, 0, 0.28, 0);           // tiang
    addMesh(pcRef, roundedBox(2.0, 1.25, 0.14, 0.08), pinkMat, 0, 1.05, 0);           // monitor
    screenMat = mat(0xffffff, { map: screenTexture(), emissive: 0xffc9d8, emissiveIntensity: 0.35, rough: 0.5 });
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), screenMat);
    screen.position.set(0, 1.05, 0.081);
    pcRef.add(screen);
    screen.userData.interactId = "pc";
    pcRef.traverse(function (o) { if (o.isMesh && !o.userData.interactId) o.userData.interactId = "pc"; });

    // Keyboard & mouse
    var kb = addMesh(g, roundedBox(1.5, 0.09, 0.55, 0.04),
      mat(0xffffff, { map: keysTexture(), rough: 0.85 }), -0.1, 1.55, 0.5, { ry: -0.06 });
    var mouse = addMesh(g, new THREE.SphereGeometry(0.16, 16, 12), mat(0xf5a9bd, { rough: 0.7 }), 0.95, 1.57, 0.5, { s: [0.8, 0.55, 1.2] });

    // Kursi lucu (warna mint biar kontras dari meja kayu)
    var chair = new THREE.Group();
    chair.position.set(0.2, 0, 1.55);
    chair.rotation.y = Math.PI + 0.35;
    g.add(chair);
    addMesh(chair, roundedBox(1.0, 0.22, 1.0, 0.2), mat(COLORS.mint, { rough: 1 }), 0, 0.85, 0);
    addMesh(chair, roundedBox(1.0, 1.0, 0.22, 0.25), mat(COLORS.mint, { rough: 1 }), 0, 1.4, -0.42);
    // Bantal sandaran kursi
    addMesh(chair, roundedBox(0.8, 0.5, 0.16, 0.14), mat(COLORS.mustard, { rough: 1 }), 0, 1.35, -0.27);
    addMesh(chair, new THREE.CylinderGeometry(0.09, 0.09, 0.8, 10), mat(COLORS.walnutDark, { rough: 0.7 }), 0, 0.4, 0);
    addMesh(chair, new THREE.CylinderGeometry(0.5, 0.5, 0.08, 16), mat(COLORS.walnutDark, { rough: 0.7 }), 0, 0.06, 0);
  }

  var shelfDeadpool = null, shelfLego = null;
  function buildShelf() {
    var g = new THREE.Group();
    g.position.set(2.6, 0, -4.75);
    scene.add(g);

    var boardMat = mat(COLORS.walnut, { rough: 0.72 });
    addMesh(g, roundedBox(3.2, 0.14, 0.8, 0.05), boardMat, 0, 2.55, 0);
    addMesh(g, roundedBox(3.2, 0.14, 0.8, 0.05), boardMat, 0, 3.75, 0);
    // Dudukan rak di dinding
    addMesh(g, roundedBox(0.12, 0.3, 0.5, 0.04), mat(COLORS.walnutDark, { rough: 0.8 }), -1.4, 2.4, -0.05, { cast: false });
    addMesh(g, roundedBox(0.12, 0.3, 0.5, 0.04), mat(COLORS.walnutDark, { rough: 0.8 }), 1.4, 2.4, -0.05, { cast: false });

    // --- Action figure Deadpool (rak bawah) ---
    shelfDeadpool = new THREE.Group();
    shelfDeadpool.position.set(-0.85, 2.62, 0.05);
    g.add(shelfDeadpool);
    var dRed = mat(0xcf3f45, { rough: 0.8 });
    var dBlack = mat(0x2f2b36, { rough: 0.8 });
    // Kaki (pose duduk santai, kaki menjulur)
    addMesh(shelfDeadpool, roundedBox(0.16, 0.4, 0.16, 0.06), dBlack, -0.11, 0.2, 0.1, { rx: 0.5 });
    addMesh(shelfDeadpool, roundedBox(0.16, 0.4, 0.16, 0.06), dBlack, 0.11, 0.2, 0.1, { rx: 0.5 });
    // Badan
    addMesh(shelfDeadpool, roundedBox(0.42, 0.5, 0.3, 0.12), dRed, 0, 0.55, 0);
    addMesh(shelfDeadpool, roundedBox(0.3, 0.24, 0.06, 0.05), dBlack, 0, 0.42, 0.14);
    // Tangan melambaikan
    addMesh(shelfDeadpool, roundedBox(0.13, 0.36, 0.13, 0.05), dRed, -0.28, 0.78, 0, { rz: 0.8 });
    addMesh(shelfDeadpool, roundedBox(0.13, 0.3, 0.13, 0.05), dRed, 0.26, 0.45, 0, { rz: -0.25 });
    // Kepala
    var head = addMesh(shelfDeadpool, new THREE.SphereGeometry(0.2, 18, 14), dRed, 0, 0.94, 0, { s: [1, 1.1, 0.95] });
    addMesh(shelfDeadpool, new THREE.SphereGeometry(0.085, 12, 10), dBlack, -0.085, 0.96, 0.15, { s: [0.8, 1.3, 0.45] });
    addMesh(shelfDeadpool, new THREE.SphereGeometry(0.085, 12, 10), dBlack, 0.085, 0.96, 0.15, { s: [0.8, 1.3, 0.45] });
    addMesh(shelfDeadpool, new THREE.SphereGeometry(0.035, 8, 8), mat(0xffffff), -0.085, 0.97, 0.2, { s: [0.7, 1.2, 0.4], cast: false });
    addMesh(shelfDeadpool, new THREE.SphereGeometry(0.035, 8, 8), mat(0xffffff), 0.085, 0.97, 0.2, { s: [0.7, 1.2, 0.4], cast: false });
    shelfDeadpool.traverse(function (o) { if (o.isMesh) o.userData.interactId = "deadpool"; });

    // --- Miniatur LEGO F1 Ferrari (rak atas) ---
    shelfLego = new THREE.Group();
    shelfLego.position.set(0.75, 3.84, 0.05);
    shelfLego.rotation.y = -0.35;
    g.add(shelfLego);
    var lRed = mat(0xd6353c, { rough: 0.55 });
    var lBlack = mat(0x26232c, { rough: 0.6 });
    var lWhite = mat(0xf6f2ee, { rough: 0.6 });
    // Moncong depan
    addMesh(shelfLego, roundedBox(0.75, 0.13, 0.28, 0.05), lRed, 0.45, 0.14, 0);
    // Bagian tengah / kokpit
    addMesh(shelfLego, roundedBox(0.7, 0.22, 0.36, 0.06), lRed, -0.05, 0.19, 0);
    addMesh(shelfLego, roundedBox(0.28, 0.16, 0.26, 0.06), lBlack, -0.08, 0.33, 0); // kokpit
    // Bagian belakang
    addMesh(shelfLego, roundedBox(0.45, 0.18, 0.32, 0.05), lRed, -0.55, 0.17, 0);
    // Sayap depan
    addMesh(shelfLego, roundedBox(0.1, 0.06, 0.62, 0.03), lWhite, 0.82, 0.08, 0);
    // Sayap belakang
    addMesh(shelfLego, roundedBox(0.08, 0.24, 0.5, 0.03), lRed, -0.82, 0.3, 0);
    addMesh(shelfLego, roundedBox(0.12, 0.05, 0.5, 0.02), lBlack, -0.82, 0.42, 0);
    // Ban hitam
    var wheelMat = mat(0x1e1b22, { rough: 0.75 });
    var hubMat = mat(0xf2e8dc, { rough: 0.5 });
    [[0.42, 0.24], [0.42, -0.24], [-0.52, 0.26], [-0.52, -0.26]].forEach(function (p) {
      addMesh(shelfLego, new THREE.CylinderGeometry(0.16, 0.16, 0.11, 16), wheelMat, p[0], 0.16, p[1], { rx: Math.PI / 2 });
      addMesh(shelfLego, new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), hubMat, p[0], 0.16, p[1], { rx: Math.PI / 2 });
    });
    shelfLego.traverse(function (o) { if (o.isMesh) o.userData.interactId = "lego"; });

    // --- Buku berdiri di rak bawah (sisi kanan) ---
    var bookColors = [COLORS.teal, COLORS.mustard, COLORS.rose, COLORS.mint, COLORS.lavender];
    var bx = 0.55;
    bookColors.forEach(function (c, i) {
      var w = 0.14;
      var h = 0.62 + (i % 3) * 0.07;
      addMesh(g, roundedBox(w, h, 0.5, 0.03), mat(c, { rough: 0.85 }), bx, 2.62 + h / 2, 0.02,
        { rz: i === 4 ? -0.22 : 0 });
      bx += w + 0.035;
    });
    // Penahan buku
    addMesh(g, roundedBox(0.08, 0.5, 0.5, 0.03), mat(COLORS.walnutDark, { rough: 0.8 }), bx + 0.05, 2.87, 0.02);

    // --- Pot tanaman kecil di rak atas (kiri) ---
    var miniPlant = new THREE.Group();
    miniPlant.position.set(-1.2, 3.84, 0.05);
    g.add(miniPlant);
    addMesh(miniPlant, new THREE.CylinderGeometry(0.16, 0.13, 0.24, 14), mat(COLORS.terracotta, { rough: 0.9 }), 0, 0.12, 0);
    addMesh(miniPlant, new THREE.TorusGeometry(0.16, 0.03, 8, 16), mat(0xc4744e, { rough: 0.9 }), 0, 0.23, 0, { rx: Math.PI / 2 });
    for (var mp = 0; mp < 5; mp++) {
      var ma = mp / 5 * Math.PI * 2;
      addMesh(miniPlant, new THREE.SphereGeometry(0.1, 10, 8), mat(0x8fbb7f, { rough: 1 }),
        Math.cos(ma) * 0.07, 0.34 + (mp % 2) * 0.07, Math.sin(ma) * 0.07, { s: [1, 1.35, 1] });
    }

    // --- Bingkai foto kecil di rak atas (tengah) ---
    var miniFrame = new THREE.Group();
    miniFrame.position.set(-0.35, 3.84, 0.1);
    miniFrame.rotation.y = 0.18;
    g.add(miniFrame);
    addMesh(miniFrame, roundedBox(0.5, 0.6, 0.06, 0.03), mat(COLORS.mustard, { rough: 0.75 }), 0, 0.3, 0);
    var miniTex = canvasTexture(96, 96, function (cv, cw, ch) {
      cv.fillStyle = "#fde3ea"; cv.fillRect(0, 0, cw, ch);
      cv.fillStyle = "#e07a92";
      cv.beginPath();
      cv.moveTo(cw / 2, ch * 0.72);
      cv.bezierCurveTo(cw * 0.14, ch * 0.46, cw * 0.3, ch * 0.2, cw / 2, ch * 0.42);
      cv.bezierCurveTo(cw * 0.7, ch * 0.2, cw * 0.86, ch * 0.46, cw / 2, ch * 0.72);
      cv.fill();
    });
    var miniPic = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.44),
      new THREE.MeshStandardMaterial({ map: miniTex, roughness: 1 }));
    miniPic.position.set(0, 0.32, 0.04);
    miniFrame.add(miniPic);
  }

  var candleFlame, candleLight, cakeGroup;
  function buildCakeTable() {
    var g = new THREE.Group();
    g.position.set(-3.8, 0, 2.9);
    scene.add(g);

    // Meja bundar kecil
    addMesh(g, new THREE.CylinderGeometry(0.85, 0.85, 0.12, 24), mat(0xf5e3d3, { rough: 0.8 }), 0, 0.92, 0);
    addMesh(g, new THREE.CylinderGeometry(0.1, 0.12, 0.9, 12), mat(COLORS.brown, { rough: 0.8 }), 0, 0.45, 0);
    addMesh(g, new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), mat(COLORS.brownDark), 0, 0.04, 0);

    // Kue
    cakeGroup = new THREE.Group();
    cakeGroup.position.set(0, 0.98, 0);
    g.add(cakeGroup);
    // Piring kue (biar kue naik dari permukaan meja)
    addMesh(cakeGroup, new THREE.CylinderGeometry(0.64, 0.6, 0.05, 28), mat(0xfffaf5, { rough: 0.5 }), 0, 0.03, 0);
    // Lapis bawah: stroberi (albedo sengaja pekat — pencahayaan + tone mapping
    // ikut mencerahkan, jadi warna dasar harus lebih saturasi agar tidak pucat)
    addMesh(cakeGroup, new THREE.CylinderGeometry(0.52, 0.55, 0.3, 24), mat(0xd44070, { rough: 0.95 }), 0, 0.2, 0);
    // Lapis atas: krim vanilla
    addMesh(cakeGroup, new THREE.CylinderGeometry(0.36, 0.38, 0.24, 22), mat(0xfff0df, { rough: 0.95 }), 0, 0.47, 0);
    // Hiasan krim di batas dua lapis
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2;
      addMesh(cakeGroup, new THREE.SphereGeometry(0.06, 10, 8), mat(0xfff5e9), Math.cos(a) * 0.5, 0.36, Math.sin(a) * 0.5);
    }
    // Butiran sprinkle warna-warni di dinding kue stroberi
    var sprinkleCols = [0xf7d774, 0x8fd3c0, 0xd85a78, 0xfff0df, 0x6fb6ad];
    for (var s = 0; s < 16; s++) {
      var sa = s / 16 * Math.PI * 2 + (s % 3) * 0.11;
      var sy = 0.11 + (s % 4) * 0.055;
      addMesh(cakeGroup, new THREE.CylinderGeometry(0.013, 0.013, 0.06, 6),
        mat(sprinkleCols[s % sprinkleCols.length], { rough: 0.6 }),
        Math.cos(sa) * 0.535, sy, Math.sin(sa) * 0.535,
        { rz: Math.PI / 2 + (s % 2 ? 0.5 : -0.4), ry: -sa, cast: false });
    }
    // Ceri di atas
    addMesh(cakeGroup, new THREE.SphereGeometry(0.085, 14, 12), mat(0xd22744, { rough: 0.45 }), 0.17, 0.66, 0.08);
    addMesh(cakeGroup, new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), mat(0x7fae6a), 0.17, 0.74, 0.08, { rz: 0.25, cast: false });
    // Lilin
    addMesh(cakeGroup, new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), mat(0xe04472), 0, 0.74, 0);
    addMesh(cakeGroup, new THREE.CylinderGeometry(0.052, 0.052, 0.05, 12), mat(0xfffaf0), 0, 0.86, 0, { cast: false });
    // Api lilin
    candleFlame = addMesh(cakeGroup, new THREE.ConeGeometry(0.055, 0.16, 10),
      mat(0xffd27a, { emissive: 0xffb347, emissiveIntensity: 1.6, rough: 0.4 }), 0, 0.97, 0, { cast: false });
    candleLight = new THREE.PointLight(0xffb46b, 0.5, 3.2);
    candleLight.position.set(0, 1.1, 0.1);
    cakeGroup.add(candleLight);
    cakeGroup.traverse(function (o) { if (o.isMesh) o.userData.interactId = "kue"; });
  }

  var speakerGrill;
  function buildDecor() {
    // --- Speaker kecil (di meja, kanan PC) ---
    var sp = new THREE.Group();
    sp.position.set(4.2, 1.51, -2.5);
    scene.add(sp);
    var body = addMesh(sp, roundedBox(0.5, 0.62, 0.45, 0.12), mat(COLORS.teal, { rough: 0.75 }), 0, 0.31, 0);
    speakerGrill = addMesh(sp, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), mat(0xfaf3ea, { rough: 0.7 }), 0, 0.34, 0.22, { rx: Math.PI / 2 });
    addMesh(sp, new THREE.SphereGeometry(0.05, 10, 8), mat(0xffe08a, { emissive: 0xffd166, emissiveIntensity: 0.7 }), 0.15, 0.55, 0.22, { cast: false });
    sp.traverse(function (o) { if (o.isMesh) o.userData.interactId = "speaker"; });

    // --- Bingkai foto (di meja, dekat PC) ---
    var fr = new THREE.Group();
    fr.position.set(1.35, 1.51, -2.65);
    fr.rotation.y = -0.25;
    scene.add(fr);
    addMesh(fr, roundedBox(0.9, 1.1, 0.09, 0.05), mat(0xf3d9c2, { rough: 0.8 }), 0, 0.55, 0);
    var photo = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.92),
      new THREE.MeshStandardMaterial({ map: photoTexture("Foto kita"), roughness: 0.9 }));
    photo.position.set(0, 0.55, 0.05);
    fr.add(photo);
    addMesh(fr, new THREE.BoxGeometry(0.08, 0.5, 0.08), mat(0xd8b99b), 0, 0.1, -0.12, { rx: 0.3 });
    fr.traverse(function (o) { if (o.isMesh) o.userData.interactId = "bingkai"; });

    // --- Kotak hadiah (di dekat meja rendah) ---
    var gift = new THREE.Group();
    gift.position.set(1.5, 0, 2.1);
    gift.rotation.y = 0.4;
    scene.add(gift);
    addMesh(gift, roundedBox(0.85, 0.6, 0.85, 0.07), mat(COLORS.pink, { rough: 0.8 }), 0, 0.3, 0);
    addMesh(gift, roundedBox(0.92, 0.16, 0.92, 0.06), mat(COLORS.pinkDeep, { rough: 0.8 }), 0, 0.66, 0);
    addMesh(gift, roundedBox(0.16, 0.78, 0.88, 0.05), mat(COLORS.mustard, { rough: 0.75 }), 0, 0.35, 0);
    addMesh(gift, roundedBox(0.88, 0.78, 0.16, 0.05), mat(COLORS.mustard, { rough: 0.75 }), 0, 0.35, 0);
    addMesh(gift, new THREE.TorusGeometry(0.14, 0.05, 10, 18), mat(COLORS.mustard), -0.1, 0.78, 0, { rx: Math.PI / 2 });
    addMesh(gift, new THREE.TorusGeometry(0.14, 0.05, 10, 18), mat(COLORS.mustard), 0.1, 0.78, 0, { rx: Math.PI / 2 });
    gift.traverse(function (o) { if (o.isMesh) o.userData.interactId = "hadiah"; });

    // --- Tanaman di sudut kiri belakang ---
    var plant = new THREE.Group();
    plant.position.set(-4.3, 0, -3.9);
    scene.add(plant);
    addMesh(plant, new THREE.CylinderGeometry(0.34, 0.26, 0.5, 16), mat(COLORS.terracotta, { rough: 0.9 }), 0, 0.25, 0);
    addMesh(plant, new THREE.TorusGeometry(0.34, 0.05, 8, 20), mat(0xc4744e, { rough: 0.9 }), 0, 0.48, 0, { rx: Math.PI / 2 });
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      addMesh(plant, new THREE.SphereGeometry(0.22, 12, 10), mat(0xa9c48f, { rough: 1 }),
        Math.cos(a) * 0.2, 0.62 + (i % 3) * 0.22, Math.sin(a) * 0.2, { s: [1, 1.3, 1] });
    }

    // --- Rak sepatu kecil / bean bag lucu dekat kasur ---
    addMesh(scene, new THREE.SphereGeometry(0.55, 20, 16), mat(COLORS.peach, { rough: 1 }),
      1.1, 0.32, 0.2, { s: [1, 0.7, 1] });

    // --- Lampu fairy di sepanjang dinding ---
    buildFairyLights();
  }

  var fairyBulbs = [], fairyLights = [];
  function buildFairyLights() {
    var pts = [];
    for (var i = 0; i <= 14; i++) {
      var t = i / 14;
      pts.push(new THREE.Vector3(-4.9, 5.4 - Math.sin(t * Math.PI) * 0.8, -4.8 + t * 9.4));
    }
    for (var j = 0; j <= 14; j++) {
      var t2 = j / 14;
      pts.push(new THREE.Vector3(-4.9 + t2 * 9.6, 5.4 - Math.sin(t2 * Math.PI) * 0.8, -4.9));
    }
    var curve = new THREE.CatmullRomCurve3(pts);
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.02, 6, false), mat(0xc9a587, { rough: 0.9 }));
    tube.castShadow = false;
    scene.add(tube);

    var colors = [0xffd9a0, 0xffb8cf, 0xd9c8f0];
    for (var k = 0; k < 22; k++) {
      var p = curve.getPoint(k / 21);
      var c = colors[k % colors.length];
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
        mat(c, { emissive: c, emissiveIntensity: 0.6, rough: 0.4 }));
      bulb.position.copy(p).y -= 0.08;
      bulb.castShadow = false;
      scene.add(bulb);
      fairyBulbs.push(bulb);
    }
    [0.15, 0.55, 0.9].forEach(function (t) {
      var p = curve.getPoint(t);
      var l = new THREE.PointLight(0xffd0a8, 0.22, 5);
      l.position.copy(p);
      scene.add(l);
      fairyLights.push(l);
    });
  }

  /* ==================================================================
     Detail dekoratif tambahan (non-interaktif) — mengisi ruang kosong
     ================================================================== */

  // Lukisan/figur dinding + bunting + jam
  function buildWallDetails() {
    // --- Rantai bunting (dinding belakang) ---
    var buntColors = [COLORS.mint, COLORS.mustard, COLORS.rose, COLORS.lavender, COLORS.teal, COLORS.peach];
    var flagGeo = (function () {
      var s = new THREE.Shape();
      s.moveTo(-0.19, 0.24); s.lineTo(0.19, 0.24); s.lineTo(0, -0.22); s.closePath();
      return new THREE.ShapeGeometry(s);
    })();
    function garland(yStart, z, xFrom, xTo, sag, count) {
      var pts = [];
      for (var i = 0; i <= 12; i++) {
        var t = i / 12;
        pts.push(new THREE.Vector3(xFrom + (xTo - xFrom) * t, yStart - Math.sin(t * Math.PI) * sag, z));
      }
      var curve = new THREE.CatmullRomCurve3(pts);
      var line = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.014, 5, false), mat(0xc9a587, { rough: 0.9 }));
      line.castShadow = false;
      scene.add(line);
      for (var k = 0; k < count; k++) {
        var p = curve.getPoint((k + 0.5) / count);
        var f = new THREE.Mesh(flagGeo, mat(buntColors[k % buntColors.length], { rough: 1, side: THREE.DoubleSide }));
        f.position.copy(p).y -= 0.05;
        f.castShadow = perf.shadows;
        scene.add(f);
      }
    }
    garland(5.15, -4.86, -4.6, 4.6, 0.5, 11);
    // Bunting di dinding kiri (menghadap +x)
    var pts2 = [];
    for (var i2 = 0; i2 <= 12; i2++) {
      var t2 = i2 / 12;
      pts2.push(new THREE.Vector3(-4.86, 5.1 - Math.sin(t2 * Math.PI) * 0.45, -4.4 + t2 * 8.8));
    }
    var c2 = new THREE.CatmullRomCurve3(pts2);
    var l2 = new THREE.Mesh(new THREE.TubeGeometry(c2, 30, 0.014, 5, false), mat(0xc9a587, { rough: 0.9 }));
    l2.castShadow = false;
    scene.add(l2);
    for (var k2 = 0; k2 < 10; k2++) {
      var p2 = c2.getPoint((k2 + 0.5) / 10);
      var f2 = new THREE.Mesh(flagGeo, mat(buntColors[(k2 + 2) % buntColors.length], { rough: 1, side: THREE.DoubleSide }));
      f2.position.copy(p2).y -= 0.05;
      f2.rotation.y = Math.PI / 2;
      f2.castShadow = perf.shadows;
      scene.add(f2);
    }

    // --- Bingkai lukisan di dinding belakang (di antara jendela & rak) ---
    function wallArt(x, y, w, h, palette, motif) {
      var g = new THREE.Group();
      g.position.set(x, y, -4.93);
      scene.add(g);
      addMesh(g, roundedBox(w, h, 0.1, 0.04), mat(COLORS.walnut, { rough: 0.7 }), 0, 0, 0, { cast: false });
      var tex = canvasTexture(256, Math.round(256 * h / w), function (cv, cw, ch) {
        cv.fillStyle = palette[0]; cv.fillRect(0, 0, cw, ch);
        cv.strokeStyle = palette[1]; cv.lineWidth = 10; cv.strokeRect(12, 12, cw - 24, ch - 24);
        cv.fillStyle = palette[1];
        if (motif === "hati") {
          cv.beginPath();
          cv.moveTo(cw / 2, ch * 0.72);
          cv.bezierCurveTo(cw * 0.16, ch * 0.48, cw * 0.3, ch * 0.22, cw / 2, ch * 0.42);
          cv.bezierCurveTo(cw * 0.7, ch * 0.22, cw * 0.84, ch * 0.48, cw / 2, ch * 0.72);
          cv.fill();
        } else if (motif === "bintang") {
          cv.font = "bold 120px serif"; cv.textAlign = "center";
          cv.fillText("★", cw / 2, ch * 0.68);
        } else {
          cv.font = "bold 74px serif"; cv.textAlign = "center";
          cv.fillText("✿", cw / 2, ch * 0.62);
        }
      });
      var art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
      art.position.z = 0.06;
      g.add(art);
    }
    wallArt(0.15, 3.55, 1.1, 0.9, ["#fff3e2", "#e07a92"], "hati");
    wallArt(0.2, 2.45, 0.85, 0.7, ["#e9f5ee", "#6fb6ad"], "bunga");
    wallArt(-1.5, 4.7, 0.8, 0.66, ["#fff6df", "#e8b453"], "bintang");

    // --- Jam dinding di dinding kiri ---
    var clock = new THREE.Group();
    clock.position.set(-4.9, 4.35, 2.4);
    clock.rotation.y = Math.PI / 2;
    scene.add(clock);
    addMesh(clock, new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28), mat(COLORS.walnut, { rough: 0.7 }), 0, 0, 0, { rx: Math.PI / 2, cast: false });
    addMesh(clock, new THREE.CylinderGeometry(0.36, 0.36, 0.11, 28), mat(0xfff7ec, { rough: 0.9 }), 0, 0, 0.02, { rx: Math.PI / 2, cast: false });
    addMesh(clock, roundedBox(0.03, 0.24, 0.03, 0.01), mat(COLORS.rose, { rough: 0.6 }), 0, 0.08, 0.09, { rz: 0.5, cast: false });
    addMesh(clock, roundedBox(0.03, 0.18, 0.03, 0.01), mat(COLORS.teal, { rough: 0.6 }), 0.06, -0.05, 0.09, { rz: -1.1, cast: false });
    for (var t = 0; t < 12; t++) {
      var ang = t / 12 * Math.PI * 2;
      addMesh(clock, new THREE.SphereGeometry(0.024, 8, 6), mat(0x8b6f60),
        Math.sin(ang) * 0.29, Math.cos(ang) * 0.29, 0.09, { cast: false });
    }

    // --- Polaroid yang ditempel di dinding kiri (di atas kasur) ---
    function pinnedPolaroid(z, y, rot, warna) {
      var g = new THREE.Group();
      g.position.set(-4.9, y, z);
      g.rotation.y = Math.PI / 2;
      g.rotation.z = rot;
      scene.add(g);
      addMesh(g, roundedBox(0.8, 0.95, 0.05, 0.02), mat(0xfffaf2, { rough: 0.95 }), 0, 0, 0, { cast: false });
      var tex = canvasTexture(128, 128, function (cv, cw, ch) {
        cv.fillStyle = warna; cv.fillRect(0, 0, cw, ch);
        cv.fillStyle = "rgba(255,255,255,.9)";
        cv.beginPath(); cv.arc(cw / 2, ch * 0.4, 24, 0, Math.PI * 2); cv.fill();
        cv.beginPath();
        cv.moveTo(18, ch * 0.9); cv.lineTo(cw * 0.4, ch * 0.55); cv.lineTo(cw * 0.6, ch * 0.75);
        cv.lineTo(cw * 0.78, ch * 0.6); cv.lineTo(cw - 12, ch * 0.9); cv.closePath(); cv.fill();
      });
      var pic = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.6),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
      pic.position.set(0, 0.1, 0.032);
      g.add(pic);
      addMesh(g, new THREE.PlaneGeometry(0.3, 0.14),
        mat(0xfff0c2, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }), 0, 0.52, 0.03, { rz: 0.1, cast: false });
    }
    pinnedPolaroid(-1.6, 3.75, -0.06, "#f7c9d4");
    pinnedPolaroid(0.1, 3.4, 0.07, "#cfe6f7");
    pinnedPolaroid(1.7, 3.9, -0.03, "#f7e6bd");
  }

  // Barang-barang kecil di lantai & meja
  function buildFloorDetails() {
    // --- Lampu berdiri di sudut kanan (agak ke belakang supaya tidak menutupi pandangan) ---
    var lamp = new THREE.Group();
    lamp.position.set(4.5, 0, 1.15);
    scene.add(lamp);
    addMesh(lamp, new THREE.CylinderGeometry(0.28, 0.32, 0.1, 18), mat(COLORS.walnutDark, { rough: 0.7 }), 0, 0.05, 0);
    addMesh(lamp, new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10), mat(0xd9c3a8, { metal: 0.5, rough: 0.4 }), 0, 1.3, 0);
    addMesh(lamp, new THREE.CylinderGeometry(0.34, 0.52, 0.62, 22, 1, true),
      mat(COLORS.mustard, { rough: 0.95, side: THREE.DoubleSide }), 0, 2.7, 0);
    addMesh(lamp, new THREE.SphereGeometry(0.16, 14, 12),
      mat(0xfff0cf, { emissive: 0xffd9a0, emissiveIntensity: 1.2, rough: 0.5 }), 0, 2.62, 0, { cast: false });
    var lampLight = new THREE.PointLight(0xffd9a8, 0.36, 7);
    lampLight.position.set(0, 2.5, 0);
    lamp.add(lampLight);

    // --- Tumpukan buku di lantai (dekat kasur) ---
    var stack = new THREE.Group();
    stack.position.set(-2.5, 0, 4.35);
    stack.rotation.y = 0.4;
    scene.add(stack);
    var bookCols = [COLORS.teal, COLORS.rose, COLORS.mustard, COLORS.lavender];
    var yy = 0;
    bookCols.forEach(function (c, i) {
      var t = 0.14 + (i % 2) * 0.02;
      addMesh(stack, roundedBox(1.0 - i * 0.06, t, 0.72 - i * 0.03, 0.03), mat(c, { rough: 0.85 }), 0, yy + t / 2, 0, { ry: (i % 2 ? -0.12 : 0.09) });
      yy += t;
    });
    // Buku terbuka di atas tumpukan
    addMesh(stack, roundedBox(0.7, 0.05, 0.5, 0.02), mat(0xfff4e4, { rough: 1 }), 0.05, yy + 0.03, 0, { ry: 0.2 });

    // --- Sepatu sandal di samping kasur ---
    var slip = new THREE.Group();
    slip.position.set(-1.55, 0, 2.0);
    slip.rotation.y = -0.5;
    scene.add(slip);
    addMesh(slip, roundedBox(0.3, 0.12, 0.62, 0.1), mat(COLORS.pink, { rough: 1 }), -0.2, 0.06, 0);
    addMesh(slip, roundedBox(0.3, 0.12, 0.62, 0.1), mat(COLORS.pink, { rough: 1 }), 0.18, 0.06, 0.12, { ry: 0.15 });
    addMesh(slip, new THREE.SphereGeometry(0.13, 12, 10), mat(0xffe1e8, { rough: 1 }), -0.2, 0.14, 0.16, { s: [1, 0.7, 1] });
    addMesh(slip, new THREE.SphereGeometry(0.13, 12, 10), mat(0xffe1e8, { rough: 1 }), 0.2, 0.14, 0.28, { s: [1, 0.7, 1] });

    // --- Keranjang anyaman berisi selimut (pojok belakang kiri) ---
    var bask = new THREE.Group();
    bask.position.set(-3.5, 0, -3.4);
    scene.add(bask);
    addMesh(bask, new THREE.CylinderGeometry(0.5, 0.42, 0.6, 18, 1, true),
      mat(0xd8b489, { rough: 1, side: THREE.DoubleSide }), 0, 0.3, 0);
    addMesh(bask, new THREE.TorusGeometry(0.5, 0.06, 8, 22), mat(0xc49a70, { rough: 1 }), 0, 0.6, 0, { rx: Math.PI / 2 });
    addMesh(bask, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 18), mat(0xc49a70, { rough: 1 }), 0, 0.04, 0);
    // Selimut digulung di dalamnya
    addMesh(bask, new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), mat(COLORS.mint, { rough: 1 }), -0.08, 0.62, 0.05, { rz: 0.25 });
    addMesh(bask, new THREE.CylinderGeometry(0.22, 0.22, 0.44, 14), mat(COLORS.lavender, { rough: 1 }), 0.16, 0.66, -0.08, { rz: -0.3 });

    // --- Aksesori meja: gelas, tempat pensil, buku catatan ---
    var deskTop = 1.51;
    // Gelas kopi
    var mug = new THREE.Group();
    mug.position.set(4.0, deskTop, -1.55);
    scene.add(mug);
    addMesh(mug, new THREE.CylinderGeometry(0.16, 0.13, 0.3, 16), mat(COLORS.rose, { rough: 0.7 }), 0, 0.15, 0);
    addMesh(mug, new THREE.TorusGeometry(0.1, 0.03, 8, 16), mat(COLORS.rose, { rough: 0.7 }), 0.17, 0.17, 0, { ry: Math.PI / 2 });
    addMesh(mug, new THREE.CylinderGeometry(0.13, 0.13, 0.03, 16), mat(0x6b4a3a, { rough: 0.6 }), 0, 0.29, 0, { cast: false });

    // Tempat pensil + pensil warna
    var cup = new THREE.Group();
    cup.position.set(1.7, deskTop, -2.55);
    scene.add(cup);
    addMesh(cup, new THREE.CylinderGeometry(0.14, 0.12, 0.3, 16), mat(COLORS.teal, { rough: 0.75 }), 0, 0.15, 0);
    [COLORS.rose, COLORS.mustard, COLORS.lavender, COLORS.mint].forEach(function (c, i) {
      var a = i / 4 * Math.PI * 2;
      addMesh(cup, new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8), mat(c, { rough: 0.7 }),
        Math.cos(a) * 0.05, 0.36, Math.sin(a) * 0.05, { rz: Math.cos(a) * 0.12, rx: Math.sin(a) * 0.12 });
    });

    // Buku catatan + pulpen di meja
    addMesh(scene, roundedBox(0.9, 0.09, 0.65, 0.03), mat(COLORS.lavender, { rough: 0.85 }), 1.55, deskTop + 0.045, -1.7, { ry: -0.25 });
    addMesh(scene, new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), mat(COLORS.mustard, { rough: 0.5 }),
      1.62, deskTop + 0.11, -1.62, { rz: Math.PI / 2, ry: -0.25 });

    // --- Bantal bintang di lantai dekat kasur ---
    var star = new THREE.Group();
    star.position.set(-0.4, 0.16, 1.5);
    star.rotation.y = 0.5;
    star.rotation.x = -0.4;
    scene.add(star);
    addMesh(star, new THREE.SphereGeometry(0.42, 18, 14), mat(COLORS.mustard, { rough: 1 }), 0, 0, 0, { s: [1, 0.45, 1] });
    for (var p = 0; p < 5; p++) {
      var ang = p / 5 * Math.PI * 2;
      addMesh(star, new THREE.SphereGeometry(0.14, 10, 8), mat(COLORS.mustard, { rough: 1 }),
        Math.cos(ang) * 0.4, 0, Math.sin(ang) * 0.4, { s: [1, 0.5, 1] });
    }

    // --- Boneka beruang kecil duduk di lantai dekat rak ---
    var bear = new THREE.Group();
    bear.position.set(4.5, 0, -0.9);
    bear.rotation.y = -0.7;
    scene.add(bear);
    addMesh(bear, new THREE.SphereGeometry(0.34, 18, 14), mat(0xd9a978, { rough: 1 }), 0, 0.36, 0, { s: [1, 1.05, 0.9] });
    addMesh(bear, new THREE.SphereGeometry(0.24, 16, 12), mat(0xd9a978, { rough: 1 }), 0, 0.82, 0.02);
    addMesh(bear, new THREE.SphereGeometry(0.09, 10, 8), mat(0xd9a978, { rough: 1 }), -0.17, 1.0, 0, {});
    addMesh(bear, new THREE.SphereGeometry(0.09, 10, 8), mat(0xd9a978, { rough: 1 }), 0.17, 1.0, 0, {});
    addMesh(bear, new THREE.SphereGeometry(0.12, 12, 10), mat(0xf3ddc0, { rough: 1 }), 0, 0.78, 0.2, { s: [1, 0.85, 0.7] });
    addMesh(bear, new THREE.SphereGeometry(0.035, 8, 6), mat(0x3b3340, { rough: 0.5 }), -0.08, 0.87, 0.2, { cast: false });
    addMesh(bear, new THREE.SphereGeometry(0.035, 8, 6), mat(0x3b3340, { rough: 0.5 }), 0.08, 0.87, 0.2, { cast: false });
    addMesh(bear, new THREE.SphereGeometry(0.04, 8, 6), mat(0x3b3340, { rough: 0.5 }), 0, 0.8, 0.27, { cast: false });
    addMesh(bear, new THREE.SphereGeometry(0.16, 12, 10), mat(0xd9a978, { rough: 1 }), -0.28, 0.3, 0.1, { s: [0.8, 1, 0.8] });
    addMesh(bear, new THREE.SphereGeometry(0.16, 12, 10), mat(0xd9a978, { rough: 1 }), 0.28, 0.3, 0.1, { s: [0.8, 1, 0.8] });
    // Syal mini biar warnanya nyambung
    addMesh(bear, new THREE.TorusGeometry(0.2, 0.06, 8, 18), mat(COLORS.teal, { rough: 1 }), 0, 0.65, 0, { rx: Math.PI / 2.1 });
  }

  /* ==================================================================
     Pencahayaan
     ================================================================== */
  function buildLights() {
    // Catatan: intensitas sengaja dijaga rendah. Semua lampu ikut menambah
    // "specular" putih yang TIDAK dikalikan warna benda — kalau terlalu kuat,
    // warna benda (pinguin, kue, dll) jadi pudar/keputihan.
    var hemi = new THREE.HemisphereLight(0xfff0e2, 0xb98d78, 0.24);
    scene.add(hemi);

    // Cahaya utama (dari arah jendela, hangat & bulat)
    var sun = new THREE.DirectionalLight(0xffe2c0, 0.64);
    sun.position.set(-7, 9, -6);
    if (perf.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
      sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
      sun.shadow.bias = -0.0012;
      sun.shadow.radius = 3;
    }
    scene.add(sun);

    // Cahaya pengisi dari depan (arah kamera) supaya wajah objek tetap terlihat
    var fill = new THREE.DirectionalLight(0xffeadb, 0.26);
    fill.position.set(8, 6, 10);
    scene.add(fill);

    // Titik lembut di tengah ruangan
    var warm = new THREE.PointLight(0xffdcc2, 0.15, 24);
    warm.position.set(2, 5, 4);
    scene.add(warm);
  }

  /* ==================================================================
     Kamera & kontrol (orbit terbatas + tween)
     ================================================================== */
  var HOME = { pos: new THREE.Vector3(7.6, 7.4, 9.6), target: new THREE.Vector3(-0.2, 1.5, -0.4) };

  var FOCUS = {
    buku:    { pos: new THREE.Vector3(1.4, 3.4, 5.6),  target: new THREE.Vector3(-0.9, 1.0, 2.7) },
    pc:      { pos: new THREE.Vector3(3.4, 3.0, 2.4),  target: new THREE.Vector3(2.8, 2.4, -2.3) },
    penguin: { pos: new THREE.Vector3(-0.6, 2.7, 2.6), target: new THREE.Vector3(-2.6, 1.7, -0.2) },
    kue:     { pos: new THREE.Vector3(-2.0, 2.4, 5.4), target: new THREE.Vector3(-3.8, 1.5, 2.9) },
    speaker: { pos: new THREE.Vector3(3.4, 3.0, 1.6),  target: new THREE.Vector3(4.1, 1.9, -2.5) },
    bingkai: { pos: new THREE.Vector3(2.0, 2.8, 1.0),  target: new THREE.Vector3(1.4, 2.1, -2.6) },
    hadiah:  { pos: new THREE.Vector3(2.4, 2.4, 4.6),  target: new THREE.Vector3(1.5, 0.6, 2.1) },
    deadpool:{ pos: new THREE.Vector3(2.6, 3.6, -0.9), target: new THREE.Vector3(1.8, 3.1, -4.7) },
    lego:    { pos: new THREE.Vector3(2.9, 4.4, -1.2), target: new THREE.Vector3(3.4, 4.2, -4.7) }
  };

  Room.setCameraHome = function (instant) {
    camState.target = HOME.target.clone();
    orbit.azimuth = 0; orbit.polar = 0;
    focusHighlight(null);
    if (instant || reducedMotion) {
      camera.position.copy(HOME.pos);
      camera.lookAt(HOME.target);
      camState.tween = null;
    } else {
      startTween(camera.position.clone(), camera.position.clone(), HOME.pos.clone(), 900);
    }
    Room._focused = null;
  };

  function startTween(fromPos, fromTarget, toPos, dur, toTarget) {
    camState.tween = {
      fromPos: fromPos, toPos: toPos,
      fromTarget: fromTarget, toTarget: toTarget || fromTarget.clone(),
      t: 0, dur: dur / 1000
    };
    camState.tweening = true;
  }

  Room.focus = function (id, dur) {
    var f = FOCUS[id];
    if (!f) return;
    Room._focused = id;
    focusHighlight(id);
    var fromTarget = camState.target ? camState.target.clone() : HOME.target.clone();
    if (reducedMotion) {
      camera.position.copy(f.pos);
      camState.target = f.target.clone();
      camera.lookAt(camState.target);
      camState.tween = null;
      if (callbacks.onCameraArrive) callbacks.onCameraArrive(id);
      return;
    }
    startTween(camera.position.clone(), fromTarget, f.pos.clone(), dur || 1200, f.target.clone());
    setTimeout(function () {
      if (callbacks.onCameraArrive) callbacks.onCameraArrive(id);
    }, (dur || 1200) + 40);
  };

  Room.reset = function (dur) {
    Room._focused = null;
    focusHighlight(null);
    if (reducedMotion) { Room.setCameraHome(true); if (callbacks.onCameraArrive) callbacks.onCameraArrive(null); return; }
    var fromTarget = camState.target ? camState.target.clone() : HOME.target.clone();
    startTween(camera.position.clone(), fromTarget, HOME.pos.clone(), dur || 1000, HOME.target.clone());
    setTimeout(function () { if (callbacks.onCameraArrive) callbacks.onCameraArrive(null); }, (dur || 1000) + 40);
  };

  function setupControls() {
    var el = renderer.domElement;
    var dragging = false, lastX = 0, lastY = 0, moved = 0;
    var pinchStart = 0, pinchDist = 0;

    function canOrbit() { return !camState.tweening && !Room._focused; }

    el.addEventListener("pointerdown", function (e) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", function (e) {
      var rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      if (canOrbit()) {
        orbit.azimuth = Math.max(orbit.minAz, Math.min(orbit.maxAz, orbit.azimuth - dx * 0.005));
        orbit.polar = Math.max(orbit.minPolar, Math.min(orbit.maxPolar, orbit.polar + dy * 0.003));
        applyOrbit();
      }
    });
    el.addEventListener("pointerup", function (e) {
      dragging = false;
      if (moved >= 8) return;
      // Klik di atas label tombol: biar tidak dihitung dua kali
      // (label sudah menjalankan aksinya sendiri lewat event click)
      if (e.target && e.target.closest && e.target.closest(".room-label, .back-room, .nav-cepat, .hud-musik")) return;
      handleClick();
    });
    el.addEventListener("pointerleave", function () { dragging = false; });

    el.addEventListener("wheel", function (e) {
      if (!canOrbit()) return;
      e.preventDefault();
      var dir = camera.position.clone().sub(camState.target || HOME.target);
      var d = dir.length() + e.deltaY * 0.01;
      d = Math.max(orbit.minDist, Math.min(orbit.maxDist, d));
      dir.setLength(d);
      camera.position.copy((camState.target || HOME.target).clone().add(dir));
    }, { passive: false });

    // Pinch zoom (HP)
    el.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && canOrbit()) {
        var d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist) {
          var dir = camera.position.clone().sub(camState.target || HOME.target);
          var nd = Math.max(orbit.minDist, Math.min(orbit.maxDist, dir.length() - (d - pinchDist) * 0.02));
          dir.setLength(nd);
          camera.position.copy((camState.target || HOME.target).clone().add(dir));
        }
        pinchDist = d;
        e.preventDefault();
      }
    }, { passive: false });
    el.addEventListener("touchend", function () { pinchDist = 0; });
  }

  function applyOrbit() {
    var t = camState.target || HOME.target;
    var r = camera.position.distanceTo(t);
    var az = Math.atan2(camera.position.x - t.x, camera.position.z - t.z) + 0;
    // Simpan radius & polar dari posisi saat ini, lalu pakai azimuth dari drag
    var pol = Math.acos(Math.max(-1, Math.min(1, (camera.position.y - t.y) / r)));
    az += orbit.azimuth;
    pol = Math.max(orbit.minPolar, Math.min(orbit.maxPolar, pol + orbit.polar));
    orbit.polar = 0; // sudah dipakai
    camera.position.set(
      t.x + r * Math.sin(pol) * Math.sin(az),
      t.y + r * Math.cos(pol),
      t.z + r * Math.sin(pol) * Math.cos(az)
    );
    camera.lookAt(t);
  }

  function handleClick() {
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(scene.children, true);
    for (var i = 0; i < hits.length; i++) {
      var id = hits[i].object.userData && hits[i].object.userData.interactId;
      if (id) {
        if (callbacks.onInteract) callbacks.onInteract(id);
        return;
      }
    }
    // Klik area kosong saat sedang mendekat ke objek → kembali ke kamar
    if (Room._focused && callbacks.onInteract) callbacks.onInteract("__latar__");
  }

  /* ==================================================================
     Animasi
     ================================================================== */
  function updateHover() {
    // Saat transisi atau sedang fokus ke objek, sorotan dikelola focusHighlight()
    if (camState.tweening || Room._focused) return;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(scene.children, true);
    var found = null;
    for (var i = 0; i < hits.length; i++) {
      var id = hits[i].object.userData && hits[i].object.userData.interactId;
      if (id) { found = id; break; }
    }
    setHovered(found);
  }

  var hoveredId = null;
  function setHovered(id) {
    if (hoveredId === id) return;
    // Matikan highlight lama
    if (hoveredId) highlight(hoveredId, false);
    hoveredId = id;
    if (id) highlight(id, true);
    container.classList.toggle("is-hovering", !!id);
    if (callbacks.onHover) callbacks.onHover(id);
  }

  function highlight(id, on) {
    scene.traverse(function (o) {
      if (o.isMesh && o.userData.interactId === id && o.material && o.material.emissive) {
        if (on) {
          if (o.userData._em === undefined) {
            o.userData._em = o.material.emissive.getHex();
            o.userData._emi = o.material.emissiveIntensity;
          }
          // Emissive rendah: kalau terlalu kuat, warna asli objek jadi pudar
          o.material.emissive.setHex(0xffd7e2);
          o.material.emissiveIntensity = 0.14;
        } else if (o.userData._em !== undefined) {
          o.material.emissive.setHex(o.userData._em);
          o.material.emissiveIntensity = o.userData._emi;
          delete o.userData._em;
          delete o.userData._emi;
        }
      }
    });
  }

  // Sorot objek yang sedang didekati supaya jelas bisa diklik untuk kembali
  function focusHighlight(id) {
    if (hoveredId && hoveredId !== id) highlight(hoveredId, false);
    if (id && hoveredId !== id) highlight(id, true);
    hoveredId = id || null;
    if (container) container.classList.toggle("is-hovering", !!id);
  }

  /* Label posisi (untuk HTML overlay) */
  var anchorDefs = {
    buku:    { get: function () { return new THREE.Vector3(-0.9, 1.65, 2.7); } },
    pc:      { get: function () { return new THREE.Vector3(2.8, 3.6, -2.3); } },
    penguin: { get: function () { return new THREE.Vector3(-2.6, 2.55, -0.15); } },
    kue:     { get: function () { return new THREE.Vector3(-3.8, 2.2, 2.9); } },
    speaker: { get: function () { return new THREE.Vector3(4.2, 2.5, -2.5); } },
    bingkai: { get: function () { return new THREE.Vector3(1.35, 3.1, -2.6); } },
    hadiah:  { get: function () { return new THREE.Vector3(1.5, 1.35, 2.1); } },
    deadpool:{ get: function () { return new THREE.Vector3(1.75, 3.9, -4.7); } },
    lego:    { get: function () { return new THREE.Vector3(3.35, 4.5, -4.7); } }
  };

  Room.getScreenLabels = function () {
    var out = [];
    if (!camera) return out;
    var w = container.clientWidth, h = container.clientHeight;
    for (var id in anchorDefs) {
      var v = anchorDefs[id].get().project(camera);
      if (v.z > 1) continue;
      out.push({
        id: id,
        x: (v.x * 0.5 + 0.5) * w,
        y: (-v.y * 0.5 + 0.5) * h
      });
    }
    return out;
  };

  /* ==================================================================
     Efek: pelukan pinguin, api lilin, konfeti
     ================================================================== */
  var heartTex = canvasTexture(64, 64, function (g, w, h) {
    g.fillStyle = "#ff8fae";
    g.beginPath();
    g.moveTo(32, 54);
    g.bezierCurveTo(-6, 28, 10, 4, 32, 20);
    g.bezierCurveTo(54, 4, 70, 28, 32, 54);
    g.fill();
  });

  Room.spawnHearts = function (pos, count) {
    count = Math.round((count || 6) * perf.particles);
    for (var i = 0; i < count; i++) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.22),
        new THREE.MeshBasicMaterial({ map: heartTex, transparent: true, depthWrite: false })
      );
      m.position.set(pos.x + (Math.random() - 0.5) * 0.7, pos.y + Math.random() * 0.2, pos.z + (Math.random() - 0.5) * 0.5);
      m.userData.vy = 0.9 + Math.random() * 0.6;
      m.userData.vx = (Math.random() - 0.5) * 0.35;
      m.userData.life = 0;
      scene.add(m);
      Room._hearts.push(m);
    }
  };

  Room.spawnConfetti = function (pos) {
    var colors = [0xff8fae, 0xffd166, 0xc8b6ff, 0xa0e7a5, 0xffc8a2];
    var count = Math.round(34 * perf.particles);
    for (var i = 0; i < count; i++) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.11, 0.16),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, transparent: true })
      );
      m.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y, pos.z + (Math.random() - 0.5) * 0.3);
      m.userData.vy = 2.2 + Math.random() * 1.8;
      m.userData.vx = (Math.random() - 0.5) * 2.2;
      m.userData.vz = (Math.random() - 0.5) * 2.2;
      m.userData.life = 0;
      scene.add(m);
      Room._confetti.push(m);
    }
  };

  Room.penguinHug = function () {
    anim.penguinHugTarget = 1;
    var p = penguin.position.clone();
    p.y += 1.4;
    Room.spawnHearts(p, 7);
    setTimeout(function () { anim.penguinHugTarget = 0; }, 1400);
  };

  Room.blowCandle = function () {
    if (!candleFlame) return;
    candleFlame.visible = false;
    if (candleLight) candleLight.intensity = 0;
    var p = cakeGroup.getWorldPosition(new THREE.Vector3());
    p.y += 1.1;
    Room.spawnConfetti(p);
    setTimeout(function () {
      candleFlame.visible = true;
      if (candleLight) candleLight.intensity = 0.9;
    }, 4200);
  };

  Room.setScreenOn = function (on) {
    if (!screenMat) return;
    screenMat.emissiveIntensity = on ? 1.1 : 0.35;
  };

  Room.openBook3D = function () {
    // Buku terangkat & sampul membuka (animasi sederhana)
    if (!bookRef) return;
    if (reducedMotion) return;
    var t = 0;
    var iv = setInterval(function () {
      t += 0.05;
      bookRef.position.y = 0.9 + Math.min(1, t) * 0.45;
      bookCoverRef.rotation.z = -Math.min(1, t * 0.9) * Math.PI * 0.92;
      if (t >= 1.25) { clearInterval(iv); }
    }, 16);
    Room._bookAnim = function (reset) {
      clearInterval(iv);
      bookRef.position.y = 0.9;
      bookCoverRef.rotation.z = 0;
    };
  };
  Room.closeBook3D = function () { if (Room._bookAnim) Room._bookAnim(); };

  /* ==================================================================
     Loop render
     ================================================================== */
  function animate() {
    requestAnimationFrame(animate);
    if (!started) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    // Tween kamera
    if (camState.tween) {
      var tw = camState.tween;
      tw.t += dt;
      var k = Math.min(1, tw.t / tw.dur);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
      camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
      camState.target = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.toTarget, e);
      camera.lookAt(camState.target);
      if (k >= 1) { camState.tween = null; camState.tweening = false; }
    } else if (!camState.target) {
      camState.target = HOME.target.clone();
    }

    if (!reducedMotion) {
      // Tirai bergoyang
      if (curtainL) curtainL.rotation.z = Math.sin(t * 0.8) * 0.02;
      if (curtainR) curtainR.rotation.z = -Math.sin(t * 0.8 + 0.6) * 0.02;
      // Kelap-kelip lampu
      for (var i = 0; i < fairyBulbs.length; i++) {
        fairyBulbs[i].material.emissiveIntensity = 0.45 + Math.sin(t * 2 + i) * 0.18;
      }
      // Pinguin: goyang lembut + gerak sayap saat dipeluk
      if (penguin) {
        anim.penguinHug += (anim.penguinHugTarget - anim.penguinHug) * Math.min(1, dt * 5);
        penguin.rotation.z = Math.sin(t * 2.2) * (0.03 + anim.penguinHug * 0.14);
        penguin.position.y = 1.15 + anim.penguinHug * 0.12 + Math.sin(t * 1.6) * 0.015;
        if (penguin.wingL) penguin.wingL.rotation.z = anim.penguinHug * 1.05;
        if (penguin.wingR) penguin.wingR.rotation.z = -anim.penguinHug * 1.05;
      }
      // Api lilin berkedip
      if (candleFlame && candleFlame.visible) {
        candleFlame.scale.set(1 + Math.sin(t * 9) * 0.12, 1 + Math.sin(t * 12) * 0.16, 1);
        if (candleLight) candleLight.intensity = 0.8 + Math.sin(t * 10) * 0.15;
      }
      // Speaker bergetar saat musik main
      if (speakerGrill && window.LWAudio && LWAudio.playing) {
        speakerGrill.scale.set(1 + Math.sin(t * 14) * 0.05, 1, 1 + Math.sin(t * 14) * 0.05);
      }
    }

    // Hati
    for (var h = Room._hearts.length - 1; h >= 0; h--) {
      var m = Room._hearts[h];
      m.userData.life += dt;
      m.position.y += m.userData.vy * dt;
      m.position.x += m.userData.vx * dt;
      m.material.opacity = 1 - m.userData.life / 2.2;
      m.lookAt(camera.position);
      if (m.userData.life > 2.2) { scene.remove(m); Room._hearts.splice(h, 1); }
    }
    // Konfeti
    for (var c = Room._confetti.length - 1; c >= 0; c--) {
      var cm = Room._confetti[c];
      cm.userData.life += dt;
      cm.userData.vy -= 5 * dt;
      cm.position.x += cm.userData.vx * dt;
      cm.position.y += cm.userData.vy * dt;
      cm.position.z += cm.userData.vz * dt;
      cm.rotation.x += dt * 6; cm.rotation.y += dt * 5;
      if (cm.position.y < 0.03) { cm.position.y = 0.03; cm.userData.vy *= -0.35; }
      if (cm.userData.life > 3) { scene.remove(cm); Room._confetti.splice(c, 1); }
    }

    if (!Room._focused) updateHover();
    renderer.render(scene, camera);
  }

  Room.dispose = function () {
    started = false;
    window.removeEventListener("resize", onResize);
  };

  // Handle internal — dipakai untuk pengaturan warna/pencahayaan saat pengembangan
  Object.defineProperty(Room, "_debug", {
    configurable: true,
    get: function () {
      return { scene: scene, renderer: renderer, camera: camera };
    }
  });

  window.LWRoom = Room;
})();
