/**
 * BaebyEntryAnimation
 * ─ Entry text animation only.
 * ─ No BaebyFlow dependency, no app initialization, no diagnostics.
 * ─ Copy this file to another template and call:
 *
 *   BaebyEntryAnimation.play({
 *     overlayId: "baeby-intro-ov",
 *     rowId: "bi-row",
 *     taglineId: "bi-tagline"
 *   }, function () {
 *     // animation finished
 *   });
 */
(function () {
  var DEFAULT_LETTERS = [
    { ch: "A",  color: "#ff6b35", bg: "rgba(255,107,53,.22)",   glow: "rgba(255,107,53,.9)"  },
    { ch: "I",  color: "#00c8f0", bg: "rgba(0,200,240,.22)",    glow: "rgba(0,200,240,.9)"   },
    { ch: "배", color: "#ffd166", bg: "rgba(255,209,102,.22)",  glow: "rgba(255,209,102,.9)" },
    { ch: "비", color: "#ff6b35", bg: "rgba(255,107,53,.22)",   glow: "rgba(255,107,53,.9)"  },
    { ch: "·",  color: "#ffffff", bg: "transparent",            glow: "rgba(255,255,255,.7)", dot: true },
    { ch: "C",  color: "#00c8f0", bg: "rgba(0,200,240,.22)",    glow: "rgba(0,200,240,.9)"   },
    { ch: "O",  color: "#6ee7b7", bg: "rgba(110,231,183,.22)",  glow: "rgba(110,231,183,.9)" },
    { ch: "M",  color: "#c084fc", bg: "rgba(192,132,252,.22)",  glow: "rgba(192,132,252,.9)" }
  ];

  var DEFAULT_CYCLE_COLORS = [
    { c: "#ffffff", g: "rgba(255,255,255,.9)"  },
    { c: "#ff6b35", g: "rgba(255,107,53,.95)"  },
    { c: "#ffd166", g: "rgba(255,209,102,.95)" },
    { c: "#6ee7b7", g: "rgba(110,231,183,.95)" },
    { c: "#00c8f0", g: "rgba(0,200,240,.95)"   },
    { c: "#c084fc", g: "rgba(192,132,252,.95)" },
    { c: "#ff80b4", g: "rgba(255,128,180,.95)" }
  ];

  var activeSkip = null;

  function normalizeOptions(options) {
    options = options || {};
    return {
      overlayId: options.overlayId || "baeby-intro-ov",
      rowId: options.rowId || "bi-row",
      taglineId: options.taglineId || "bi-tagline",
      letters: options.letters || DEFAULT_LETTERS,
      cycleColors: options.cycleColors || DEFAULT_CYCLE_COLORS,
      animMs: options.animMs || 680,
      gapMs: options.gapMs || 255,
      fadeMs: options.fadeMs || 460,
      removeOverlay: options.removeOverlay !== false
    };
  }

  function createDefaultOverlay(options) {
    var cfg = normalizeOptions(options);
    var ov = document.createElement("div");
    ov.id = cfg.overlayId;
    ov.style.cssText =
      "position:fixed;inset:0;background:#070c1a;z-index:999999;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:22px;cursor:pointer;font-family:system-ui,sans-serif;";
    ov.innerHTML =
      '<div id="' + cfg.rowId + '" style="display:flex;align-items:center;justify-content:center;gap:5px;min-height:64px;"></div>' +
      '<div id="' + cfg.taglineId + '" style="font-size:.77rem;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:rgba(0,200,240,.78);opacity:0;transition:opacity .5s ease,transform .5s ease;transform:translateY(10px);">AI 배달 어시스턴트</div>' +
      '<div style="position:absolute;bottom:22px;right:26px;font-size:.68rem;color:rgba(255,255,255,.2);letter-spacing:.1em;">tap to skip</div>';
    document.body.appendChild(ov);
    return ov;
  }

  function buildLetters(cfg) {
    var row = document.getElementById(cfg.rowId);
    if (!row) return false;
    row.innerHTML = "";
    for (var i = 0; i < cfg.letters.length; i++) {
      var l = cfg.letters[i];
      var sp = document.createElement("span");
      sp.id = cfg.rowId + "-ltr-" + i;
      sp.textContent = l.ch;
      var w = l.dot ? "28" : "56";
      sp.style.cssText =
        "display:inline-flex;align-items:center;justify-content:center;" +
        "width:" + w + "px;height:" + w + "px;" +
        "font-size:" + (l.dot ? "2" : "1.85") + "rem;font-weight:900;" +
        "font-family:'Segoe UI','Apple SD Gothic Neo',system-ui,sans-serif;" +
        "border-radius:50%;border:2px solid transparent;" +
        "color:transparent;background:" + l.bg + ";position:relative;" +
        "opacity:0;transform:translateX(80px) scale(0) rotate(220deg);";
      row.appendChild(sp);
    }
    return true;
  }

  function addRing(parent, color) {
    try {
      var r = document.createElement("div");
      r.style.cssText =
        "position:absolute;inset:-4px;border-radius:inherit;" +
        "border:2px solid " + color + ";opacity:1;pointer-events:none;" +
        "transform:scale(1);transition:opacity .55s ease,transform .55s ease;";
      parent.appendChild(r);
      setTimeout(function () {
        r.style.opacity = "0";
        r.style.transform = "scale(2.6)";
        setTimeout(function () { try { r.remove(); } catch (_) {} }, 660);
      }, 20);
    } catch (_) {}
  }

  function animLetter(cfg, i, onDone) {
    var el = document.getElementById(cfg.rowId + "-ltr-" + i);
    if (!el) { if (onDone) setTimeout(onDone, 0); return; }
    var l = cfg.letters[i];
    var finalR = l.dot ? "50%" : "10px";
    var opacMS = Math.round(cfg.animMs * 0.4);
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(safeTO);
      el.style.transition = "";
      el.style.opacity = "1";
      el.style.transform = "translateX(0) scale(1) rotate(0deg)";
      el.style.borderRadius = finalR;
      el.style.color = l.color;
      el.style.borderColor = l.color + "55";
      el.style.boxShadow = "0 0 14px " + l.glow;
      if (onDone) onDone();
    }

    var safeTO = setTimeout(finish, cfg.animMs + 350);
    el.addEventListener("transitionend", function handler(e) {
      if (e.propertyName === "transform") {
        el.removeEventListener("transitionend", handler);
        finish();
      }
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition =
          "transform " + cfg.animMs + "ms cubic-bezier(0.34,1.56,0.64,1)," +
          "opacity " + opacMS + "ms ease," +
          "border-radius " + cfg.animMs + "ms ease";
        el.style.transform = "translateX(0) scale(1) rotate(0deg)";
        el.style.opacity = "1";
        el.style.borderRadius = finalR;
      });
    });

    setTimeout(function () { addRing(el, l.color); }, Math.round(cfg.animMs * 0.68));
  }

  function colorCycleAll(cfg, onCycleDone) {
    var ci = 0;
    var per = 210;
    var wave = 28;

    function applyColor(col) {
      for (var i = 0; i < cfg.letters.length; i++) {
        (function (idx) {
          setTimeout(function () {
            var el = document.getElementById(cfg.rowId + "-ltr-" + idx);
            if (!el) return;
            el.style.transition = "color .04s,box-shadow .04s,filter .04s,transform .08s";
            el.style.color = col.c;
            el.style.boxShadow = "0 0 26px " + col.g;
            el.style.filter = "brightness(2) drop-shadow(0 0 14px " + col.g + ")";
            el.style.transform = "translateX(0) scale(1.08) rotate(0deg)";
          }, idx * wave);
        })(i);
      }
    }

    function next() {
      if (ci >= cfg.cycleColors.length) {
        var rd = wave * (cfg.letters.length - 1) + 80;
        setTimeout(function () {
          for (var i = 0; i < cfg.letters.length; i++) {
            (function (idx) {
              setTimeout(function () {
                var el = document.getElementById(cfg.rowId + "-ltr-" + idx);
                if (!el) return;
                el.style.transition = "color .4s,box-shadow .4s,filter .4s,transform .4s";
                el.style.color = cfg.letters[idx].color;
                el.style.boxShadow = "0 0 14px " + cfg.letters[idx].glow;
                el.style.filter = "";
                el.style.transform = "translateX(0) scale(1) rotate(0deg)";
              }, idx * wave);
            })(i);
          }
          setTimeout(onCycleDone, rd + 420);
        }, rd);
        return;
      }
      applyColor(cfg.cycleColors[ci++]);
      setTimeout(next, per);
    }

    next();
  }

  function runSequence(cfg, ov, onDone) {
    if (!buildLetters(cfg)) { onDone(); return; }
    var lastIdx = cfg.letters.length - 1;
    for (var i = 0; i < cfg.letters.length; i++) {
      (function (idx) {
        setTimeout(function () {
          animLetter(cfg, idx, idx === lastIdx ? afterAll : null);
        }, idx * cfg.gapMs);
      })(i);
    }

    function afterAll() {
      setTimeout(function () {
        var tg = document.getElementById(cfg.taglineId);
        if (tg) {
          tg.style.opacity = "1";
          tg.style.transform = "translateY(0)";
        }
        setTimeout(function () {
          colorCycleAll(cfg, function () {
            setTimeout(function () {
              ov.style.transition = "opacity " + cfg.fadeMs + "ms ease";
              ov.style.opacity = "0";
              setTimeout(function () {
                if (cfg.removeOverlay) {
                  try { ov.remove(); } catch (_) {}
                }
                onDone();
              }, cfg.fadeMs + 60);
            }, 400);
          });
        }, 280);
      }, 80);
    }
  }

  function play(options, onDone) {
    if (typeof options === "function") {
      onDone = options;
      options = {};
    }
    var cfg = normalizeOptions(options);
    var ov = document.getElementById(cfg.overlayId) || createDefaultOverlay(cfg);
    var called = false;

    function safeDone() {
      if (called) return;
      called = true;
      clearTimeout(safetyTO);
      activeSkip = null;
      if (onDone) onDone();
    }

    var safetyTO = setTimeout(function () {
      ov.style.transition = "opacity .4s ease";
      ov.style.opacity = "0";
      setTimeout(function () {
        if (cfg.removeOverlay) {
          try { ov.remove(); } catch (_) {}
        }
        safeDone();
      }, 450);
    }, 12000);

    activeSkip = function () {
      clearTimeout(safetyTO);
      ov.style.transition = "opacity .4s ease";
      ov.style.opacity = "0";
      setTimeout(function () {
        if (cfg.removeOverlay) {
          try { ov.remove(); } catch (_) {}
        }
        safeDone();
      }, 420);
    };

    ov.addEventListener("click", activeSkip, { once: true });

    try {
      runSequence(cfg, ov, safeDone);
    } catch (_) {
      try { ov.remove(); } catch (__) {}
      safeDone();
    }
  }

  window.BaebyEntryAnimation = {
    play: play,
    skip: function () {
      if (activeSkip) activeSkip();
    },
    createDefaultOverlay: createDefaultOverlay,
    defaultLetters: DEFAULT_LETTERS,
    defaultCycleColors: DEFAULT_CYCLE_COLORS
  };
})();
