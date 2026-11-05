/* =====================================================================
   Audio — pemutar musik yang konsisten di seluruh website
   ---------------------------------------------------------------------
   - Jika config.musik.file tersedia  → memakai file itu (mp3/ogg).
   - Jika tidak ada / gagal dimuat    → memutar musik lembut hasil
     WebAudio (pengganti lokal, tanpa file).
   - Status (main/jeda/volume) disimpan lokal dan tetap konsisten
     saat berpindah antar kamar, buku, dan game.
   ===================================================================== */
(function () {
  var Store = window.LWStore;
  var settings = Store.get(Store.K.AUDIO, { volume: 0.35, muted: false });

  var Audio_ = {
    _audioEl: null,      // untuk file musik
    _ctx: null,          // WebAudio untuk fallback
    _fallbackOn: false,
    _timer: null,
    playing: false,
    source: null,        // "file" | "fallback"
    voiceEl: null,
    _onStateChange: null
  };

  /* ---------- API umum ---------- */
  Audio_.onChange = function (fn) { Audio_._onStateChange = fn; };
  Audio_._emit = function () {
    if (Audio_._onStateChange) Audio_._onStateChange(Audio_.playing, settings);
  };
  Audio_.getState = function () { return { playing: Audio_.playing, volume: settings.volume, muted: settings.muted }; };

  function save() { Store.set(Store.K.AUDIO, settings); }

  /* ---------- File musik ---------- */
  function ensureEl() {
    if (Audio_._audioEl) return Audio_._audioEl;
    var src = (window.LW_CONFIG.musik && window.LW_CONFIG.musik.file) || "";
    if (!src) return null;
    var el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.src = src;
    el.volume = settings.muted ? 0 : settings.volume;
    el.addEventListener("canplay", function () { Audio_.source = "file"; });
    el.addEventListener("error", function () {
      // File tidak ada → pindah ke musik pengganti
      Audio_.source = "fallback";
      if (Audio_.playing) { Audio_._stopFile(); Audio_._startFallback(); }
    });
    Audio_._audioEl = el;
    Audio_.source = "file";
    return el;
  }

  Audio_._stopFile = function () {
    if (Audio_._audioEl) { try { Audio_._audioEl.pause(); } catch (e) {} }
  };

  /* ---------- Musik pengganti (WebAudio) ----------
     Melodi pentatonik lembut + latar hangat, dibuat dari osilator.
     Tidak butuh file apa pun.                                        */
  Audio_._startFallback = function () {
    if (Audio_._fallbackOn) return;
    try {
      if (!Audio_._ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        Audio_._ctx = new AC();
      }
      var ctx = Audio_._ctx;
      if (ctx.state === "suspended") ctx.resume();

      var master = ctx.createGain();
      master.gain.value = settings.muted ? 0 : settings.volume * 0.5;
      master.connect(ctx.destination);
      Audio_._fallbackMaster = master;

      // Nada dasar (dampai pentatonik hangat)
      var scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
      var bass  = [130.81, 146.83, 164.81, 196.0];
      var step = 0;

      function note(freq, dur, type, vol) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        o.connect(g); g.connect(master);
        o.start();
        o.stop(ctx.currentTime + dur + 0.05);
      }

      Audio_._timer = setInterval(function () {
        if (!Audio_._fallbackOn) return;
        var s = step++;
        if (s % 2 === 0) note(scale[(s * 3) % scale.length], 1.8, "sine", 0.22);
        if (s % 4 === 0) note(bass[(s / 4) % bass.length], 2.6, "triangle", 0.16);
        if (s % 8 === 3) note(scale[(s * 5 + 2) % scale.length] * 2, 1.2, "sine", 0.08);
      }, 900);

      Audio_._fallbackOn = true;
      Audio_.source = "fallback";
    } catch (e) { /* senyap jika audio tidak didukung */ }
  };

  Audio_._stopFallback = function () {
    if (Audio_._timer) { clearInterval(Audio_._timer); Audio_._timer = null; }
    if (Audio_._fallbackMaster) {
      try { Audio_._fallbackMaster.disconnect(); } catch (e) {}
      Audio_._fallbackMaster = null;
    }
    Audio_._fallbackOn = false;
  };

  /* ---------- Kontrol publik ---------- */
  Audio_.play = function () {
    var el = ensureEl();
    Audio_.playing = true;
    if (Audio_.source === "file" && el) {
      el.volume = settings.muted ? 0 : settings.volume;
      var p = el.play();
      if (p && p.catch) {
        p.catch(function () {
          // Autoplay ditolak / file bermasalah → fallback
          Audio_.source = "fallback";
          Audio_._startFallback();
        });
      }
    } else {
      Audio_._startFallback();
    }
    Audio_._emit();
  };

  Audio_.pause = function () {
    Audio_.playing = false;
    Audio_._stopFile();
    Audio_._stopFallback();
    Audio_._emit();
  };

  Audio_.toggle = function () {
    if (Audio_.playing) Audio_.pause(); else Audio_.play();
  };

  Audio_.setVolume = function (v) {
    settings.volume = Math.max(0, Math.min(1, v));
    if (settings.volume > 0) settings.muted = false;
    if (Audio_._audioEl) Audio_._audioEl.volume = settings.muted ? 0 : settings.volume;
    if (Audio_._fallbackMaster) {
      try { Audio_._fallbackMaster.gain.value = settings.muted ? 0 : settings.volume * 0.5; } catch (e) {}
    }
    save();
    Audio_._emit();
  };

  Audio_.toggleMute = function () {
    settings.muted = !settings.muted;
    Audio_.setVolume(settings.volume);
  };

  /* ---------- Rekaman suara pinguin ---------- */
  Audio_.hasVoice = function () {
    if (Audio_.voiceChecked) return !!Audio_.voiceAvailable;
    return false; // belum selesai dicek → hasilnya menyusul lewat onVoiceAvailability
  };
  // Cek ketersediaan file rekaman suara saat halaman dibuka.
  // Jika file belum ada, tombol suara disembunyikan (pengalaman teks tetap lengkap).
  Audio_.cekVoice = function () {
    var src = (window.LW_CONFIG.rekamanSuara || "").trim();
    if (!src) { Audio_.voiceChecked = true; Audio_.voiceAvailable = false; return; }
    var probe = new Audio();
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", function () {
      Audio_.voiceChecked = true; Audio_.voiceAvailable = true;
      if (Audio_._onVoiceAvailability) Audio_._onVoiceAvailability(true);
    });
    probe.addEventListener("error", function () {
      Audio_.voiceChecked = true; Audio_.voiceAvailable = false; Audio_.voiceBroken = true;
      if (Audio_._onVoiceAvailability) Audio_._onVoiceAvailability(false);
    });
    probe.src = src;
  };
  Audio_.onVoiceAvailability = function (fn) { Audio_._onVoiceAvailability = fn; };
  Audio_.playVoice = function () {
    if (!Audio_.hasVoice()) return;
    if (!Audio_.voiceEl) {
      Audio_.voiceEl = new Audio(window.LW_CONFIG.rekamanSuara.trim());
      Audio_.voiceEl.addEventListener("error", function () {
        Audio_.voiceBroken = true;
        if (Audio_._onVoiceError) Audio_._onVoiceError();
      });
    }
    Audio_.voiceEl.currentTime = 0;
    Audio_.voiceEl.volume = settings.muted ? 0 : Math.min(1, settings.volume + 0.3);
    var p = Audio_.voiceEl.play();
    if (p && p.catch) p.catch(function () {});
  };
  Audio_.onVoiceError = function (fn) { Audio_._onVoiceError = fn; };

  window.LWAudio = Audio_;
})();
