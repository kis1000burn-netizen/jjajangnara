/**
 * EntryAnimation (baeby-entry-animation.js 기반)
 * 짜장나라 템플릿 진입 텍스트 애니메이션
 */
(function () {
  var JJAJANG_LETTERS = [
    { ch: "짜", color: "#d9a441", bg: "rgba(217,164,65,.22)", glow: "rgba(217,164,65,.9)" },
    { ch: "장", color: "#f3d28a", bg: "rgba(243,210,138,.22)", glow: "rgba(243,210,138,.9)" },
    { ch: "나", color: "#e8a735", bg: "rgba(232,167,53,.22)", glow: "rgba(232,167,53,.9)" },
    { ch: "라", color: "#d9a441", bg: "rgba(217,164,65,.22)", glow: "rgba(217,164,65,.9)" },
    { ch: "·", color: "#ffffff", bg: "transparent", glow: "rgba(255,255,255,.7)", dot: true },
    { ch: "세", color: "#c45c26", bg: "rgba(196,92,38,.22)", glow: "rgba(196,92,38,.9)" },
    { ch: "종", color: "#d9a441", bg: "rgba(217,164,65,.22)", glow: "rgba(217,164,65,.9)" },
    { ch: "본", color: "#f3d28a", bg: "rgba(243,210,138,.22)", glow: "rgba(243,210,138,.9)" },
    { ch: "점", color: "#e63946", bg: "rgba(230,57,70,.22)", glow: "rgba(230,57,70,.9)" }
  ];

  var JJAJANG_CYCLE_COLORS = [
    { c: "#f8f5ee", g: "rgba(248,245,238,.9)" },
    { c: "#d9a441", g: "rgba(217,164,65,.95)" },
    { c: "#f3d28a", g: "rgba(243,210,138,.95)" },
    { c: "#e8a735", g: "rgba(232,167,53,.95)" },
    { c: "#c45c26", g: "rgba(196,92,38,.95)" },
    { c: "#e63946", g: "rgba(230,57,70,.95)" },
    { c: "#ffffff", g: "rgba(255,255,255,.9)" }
  ];

  var DOMAIN_RAINBOW = ["#ff6b35", "#ffd166", "#6ee7b7", "#00c8f0", "#c084fc", "#ff80b4", "#e8a735"];
  var activeSkip = null;
  var domainStyleInjected = false;

  function injectDomainStyles() {
    if (domainStyleInjected) return;
    domainStyleInjected = true;
    if (document.getElementById("jjajang-domain-anim-style")) return;

    var style = document.createElement("style");
    style.id = "jjajang-domain-anim-style";
    style.textContent = [
      "@keyframes jj-domain-grow{",
      "0%{transform:scale(.55);}",
      "70%{transform:scale(1.08);}",
      "100%{transform:scale(1);}",
      "}",
      "@keyframes jj-domain-pulse{",
      "0%,100%{color:#ff6b35;filter:brightness(1);text-shadow:0 0 3px currentColor;transform:scale(1);}",
      "14%{color:#ffd166;}",
      "28%{color:#6ee7b7;filter:brightness(1.5);text-shadow:0 0 12px currentColor,0 0 22px currentColor;transform:scale(1.12);}",
      "42%{color:#00c8f0;}",
      "57%{color:#c084fc;filter:brightness(1.05);text-shadow:0 0 4px currentColor;transform:scale(1);}",
      "71%{color:#ff80b4;}",
      "85%{color:#e8a735;filter:brightness(1.45);text-shadow:0 0 10px currentColor,0 0 18px currentColor;transform:scale(1.08);}",
      "}",
      ".jj-domain-anim{",
      "display:block !important;",
      "visibility:hidden;",
      "opacity:0;",
      "position:relative;",
      "z-index:2;",
      "margin:0 auto;",
      "padding:.15rem .4rem;",
      "max-width:min(92vw,20rem);",
      "text-align:center;",
      "font-size:clamp(.85rem,3.4vw,1.1rem);",
      "font-weight:800;",
      "letter-spacing:.04em;",
      "line-height:1.45;",
      "transform:scale(.55);",
      "transform-origin:center center;",
      "}",
      ".jj-domain-anim.is-on{",
      "visibility:visible !important;",
      "opacity:1 !important;",
      "animation:jj-domain-grow .9s cubic-bezier(.34,1.35,.64,1) forwards;",
      "}",
      ".jj-domain-anim .jj-domain-ch{",
      "display:inline-block !important;",
      "font-weight:800;",
      "will-change:color,filter,text-shadow,transform;",
      "animation:jj-domain-pulse 2.8s ease-in-out infinite;",
      "}",
      "@media (max-width:640px){",
      ".jj-domain-anim{font-size:clamp(.72rem,3vw,.88rem);max-width:min(88vw,15rem);letter-spacing:.02em;}",
      "}"
    ].join("");
    document.head.appendChild(style);
  }

  function buildDomainNode(id, text) {
    injectDomainStyles();
    var el = document.createElement("div");
    el.id = id;
    el.className = "jj-domain-anim";
    el.setAttribute("aria-label", text);

    // 처음에는 숨김 → 큰글자 → 작은글씨 → 도메인 순서로 표시
    el.style.cssText =
      "display:block;visibility:hidden;opacity:0;position:relative;z-index:2;" +
      "margin:0 auto;padding:0.15rem 0.4rem;max-width:min(92vw,20rem);text-align:center;" +
      "font-size:clamp(0.85rem,3.4vw,1.1rem);font-weight:800;letter-spacing:0.04em;line-height:1.45;" +
      "transform:scale(0.55);transform-origin:center center;";

    for (var i = 0; i < text.length; i++) {
      var ch = document.createElement("span");
      ch.className = "jj-domain-ch";
      ch.textContent = text.charAt(i);
      ch.style.color = DOMAIN_RAINBOW[i % DOMAIN_RAINBOW.length];
      ch.style.display = "inline";
      ch.style.fontWeight = "800";
      ch.style.animationDelay = (i * 0.16) + "s";
      el.appendChild(ch);
    }

    // 빈 노드 방지용 텍스트 폴백
    if (!text) {
      el.textContent = "www.짜장나라.com";
      el.style.color = "#f3d28a";
    }

    return el;
  }

  function showDomain(cfg) {
    var domain = document.getElementById(cfg.taglineId + "-domain");
    if (!domain) return;
    domain.classList.add("is-on");
    domain.style.visibility = "visible";
    domain.style.opacity = "1";
    domain.style.display = "block";
  }

  function showTagline(cfg) {
    var tg = document.getElementById(cfg.taglineId);
    if (!tg) return;
    tg.style.opacity = "1";
    tg.style.transform = "translateY(0)";
  }

  function getViewportWidth() {
    try {
      if (globalThis.visualViewport && globalThis.visualViewport.width) {
        return globalThis.visualViewport.width;
      }
      return globalThis.innerWidth || document.documentElement.clientWidth || 960;
    } catch (_) {
      return 960;
    }
  }

  function resolveLetterWidth(vw, letterCount, optionsWidth) {
    if (typeof optionsWidth === "number" && optionsWidth > 0) {
      return optionsWidth;
    }
    // 행 좌우 패딩·오버레이 패딩·글자 간격까지 반영해 한 줄에 들어가게 맞춤
    var sidePad = 24 + 16; // overlay + row padding
    var gap = vw <= 400 ? 3 : vw <= 640 ? 4 : 5;
    var gapsTotal = Math.max(0, letterCount - 1) * gap;
    var fit = Math.floor((vw - sidePad - gapsTotal) / Math.max(letterCount, 1));
    var preferred =
      vw <= 320 ? 26 :
      vw <= 360 ? 28 :
      vw <= 390 ? 30 :
      vw <= 430 ? 32 :
      vw <= 480 ? 34 :
      vw <= 640 ? 38 :
      60;
    return Math.max(22, Math.min(preferred, fit));
  }

  function normalizeOptions(options) {
    options = options || {};
    var letters = options.letters || JJAJANG_LETTERS;
    var vw = getViewportWidth();
    var mobileLetter = resolveLetterWidth(vw, letters.length, options.letterWidth);
    return {
      overlayId: options.overlayId || "jjajang-intro-ov",
      rowId: options.rowId || "jj-row",
      taglineId: options.taglineId || "jj-tagline",
      letters: letters,
      cycleColors: options.cycleColors || JJAJANG_CYCLE_COLORS,
      taglineText: options.taglineText || "짜장나라 세종본점",
      domainText: options.domainText || "www.짜장나라.com",
      skipText: options.skipText || "탭하여 건너뛰기",
      backgroundColor: options.backgroundColor || "#111111",
      letterWidth: mobileLetter,
      letterGap: vw <= 400 ? 3 : vw <= 640 ? 4 : 5,
      animMs: options.animMs || 680,
      gapMs: options.gapMs || 255,
      fadeMs: options.fadeMs || 460,
      removeOverlay: options.removeOverlay !== false
    };
  }

  function createDefaultOverlay(options) {
    var cfg = normalizeOptions(options);
    injectDomainStyles();
    var ov = document.createElement("div");
    ov.id = cfg.overlayId;
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", cfg.taglineText);
    ov.style.cssText =
      "position:fixed;inset:0;background:" + cfg.backgroundColor + ";z-index:999999;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:18px;cursor:pointer;font-family:var(--jj-font-sans,Pretendard,'Noto Sans KR',sans-serif);" +
      "padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));box-sizing:border-box;";

    var row = document.createElement("div");
    row.id = cfg.rowId;
    row.style.cssText =
      "display:flex;align-items:center;justify-content:center;gap:" +
      cfg.letterGap +
      "px;min-height:" + Math.round(cfg.letterWidth * 1.1) + "px;" +
      "flex-wrap:nowrap;width:100%;max-width:min(96vw,560px);padding:0 8px;" +
      "box-sizing:border-box;overflow:visible;";

    var tagline = document.createElement("div");
    tagline.id = cfg.taglineId;
    tagline.innerHTML =
      '<span style="white-space:nowrap">짜장나라</span> <span style="white-space:nowrap">세종본점</span>';
    tagline.style.cssText =
      "font-size:clamp(.72rem,3.1vw,.9rem);font-weight:700;letter-spacing:.04em;color:rgba(217,164,65,.88);" +
      "opacity:0;transition:opacity .5s ease,transform .5s ease;transform:translateY(10px);" +
      "text-align:center;max-width:min(92vw,18rem);word-break:keep-all;line-height:1.35;" +
      "display:flex;flex-wrap:wrap;justify-content:center;gap:.15em .35em;padding:0 .35rem;" +
      "box-sizing:border-box;";

    var domain = buildDomainNode(cfg.taglineId + "-domain", cfg.domainText);

    var skip = document.createElement("div");
    skip.textContent = cfg.skipText;
    skip.style.cssText =
      "position:absolute;bottom:max(16px,env(safe-area-inset-bottom));right:max(16px,env(safe-area-inset-right));" +
      "font-size:.68rem;color:rgba(255,255,255,.2);letter-spacing:.1em;";

    ov.appendChild(row);
    ov.appendChild(tagline);
    ov.appendChild(domain);
    ov.appendChild(skip);
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
      var w = l.dot
        ? Math.max(16, Math.round(cfg.letterWidth * 0.48))
        : cfg.letterWidth;
      // rem 대신 px — 모바일 시스템 글자 확대 시에도 칸 밖으로 안 잘리게
      var fontPx = l.dot
        ? Math.max(14, Math.round(w * 0.72))
        : Math.max(13, Math.round(cfg.letterWidth * 0.58));
      sp.style.cssText =
        "display:inline-flex;align-items:center;justify-content:center;" +
        "width:" + w + "px;height:" + w + "px;flex:0 0 " + w + "px;" +
        "font-size:" + fontPx + "px;font-weight:900;line-height:1;" +
        "font-family:var(--jj-font-sans,Pretendard,'Noto Sans KR',sans-serif);" +
        "border-radius:50%;border:2px solid transparent;box-sizing:border-box;" +
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

    // 1) 큰 글자 순서 등장
    var lastIdx = cfg.letters.length - 1;
    for (var i = 0; i < cfg.letters.length; i++) {
      (function (idx) {
        setTimeout(function () {
          animLetter(cfg, idx, idx === lastIdx ? afterLetters : null);
        }, idx * cfg.gapMs);
      })(i);
    }

    // 2) 작은 글씨 → 3) 도메인
    function afterLetters() {
      setTimeout(function () {
        showTagline(cfg);

        setTimeout(function () {
          showDomain(cfg);

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
              }, 500);
            });
          }, 450);
        }, 420);
      }, 120);
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

  window.EntryAnimation = {
    play: play,
    skip: function () {
      if (activeSkip) activeSkip();
    },
    createDefaultOverlay: createDefaultOverlay,
    defaultLetters: JJAJANG_LETTERS,
    defaultCycleColors: JJAJANG_CYCLE_COLORS
  };

  window.BaebyEntryAnimation = window.EntryAnimation;
})();
