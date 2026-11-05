/* =====================================================================
   Penyimpanan lokal (localStorage) — aman dipakai walau file dibuka
   langsung dari disk (file://). Jika localStorage diblokir, otomatis
   memakai penyimpanan sementara di memori.
   ===================================================================== */
(function () {
  var mem = {};
  var ok = true;
  try {
    localStorage.setItem("__lw_test", "1");
    localStorage.removeItem("__lw_test");
  } catch (e) {
    ok = false;
  }

  var Store = {
    get: function (key, fallback) {
      try {
        var raw = ok ? localStorage.getItem(key) : mem[key];
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      var raw;
      try { raw = JSON.stringify(value); } catch (e) { raw = String(value); }
      try {
        if (ok) localStorage.setItem(key, raw);
        else mem[key] = raw;
      } catch (e) {
        mem[key] = raw;
      }
    },
    remove: function (key) {
      try {
        if (ok) localStorage.removeItem(key);
        delete mem[key];
      } catch (e) { delete mem[key]; }
    }
  };

  /* Kunci penyimpanan dipakai seluruh modul */
  Store.K = {
    SCRAPBOOK_PAGE: "lw_scrapbook_page",
    GAME:           "lw_game_progress",
    PENGUIN:        "lw_penguin_index",
    AUDIO:          "lw_audio_settings",
    HUGS:           "lw_penguin_hugs"
  };

  window.LWStore = Store;
})();
