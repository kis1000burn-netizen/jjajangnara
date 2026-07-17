/**
 * EntryHub — Wither 홈스페이스형: 풀스크린 3D + 우측(모바일 하단) 말풍선·2열 메뉴
 */
(function () {
  var HUB_ID = "jjajang-entry-hub";
  var STORAGE_KEY = "jjajangnara-hub-dismissed";
  var BROWSE_VIDEO_KEY = "jjajangnara-store-video-enabled";
  var styleInjected = false;
  var DOMAIN_TEXT = "www.짜장나라.com";
  var DOMAIN_RAINBOW = ["#ff6b35", "#ffd166", "#6ee7b7", "#00c8f0", "#c084fc", "#ff80b4", "#e8a735"];
  var CHARACTER_IMAGE = "assets/character/hyerie.png";
  var GREETING = "안녕하세요! 짜장나라 세종본점입니다. 원하시는 서비스를 선택해 주세요.";
  var MENU_OPEN_DELAY = 900;

  var ACTIONS = [
    { id: "menu", title: "메뉴 보기", href: "#menu", primary: true },
    { id: "ai", title: "AI 음성 주문", href: "ai-order.html", badge: "활성" },
    { id: "member", title: "회원 · 배달", href: "member.html", badge: "준비중" },
    { id: "browse", title: "매장 둘러보기", href: "#home", browse: true },
    { id: "order", title: "바로 주문하기", href: "order.html", wide: true }
  ];

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var style = document.createElement("style");
    style.id = "jjajang-entry-hub-style";
    style.textContent = [
      /* ── 루트: 풀뷰포트 스페이스 ── */
      "#" + HUB_ID + "{position:fixed;inset:0;z-index:999990;overflow:hidden;",
      "background:radial-gradient(circle at 16% 12%,rgba(71,174,220,.28),transparent 32%),",
      "radial-gradient(circle at 84% 18%,rgba(22,103,151,.28),transparent 40%),",
      "linear-gradient(145deg,#051827 0%,#0b3550 50%,#071e31 100%);",
      "font-family:var(--jj-font-sans,Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif);color:#f1faff;",
      "opacity:0;pointer-events:none;transition:opacity .35s ease;}",
      "#" + HUB_ID + ".is-open{opacity:1;pointer-events:auto;}",

      /* 캐릭터 스테이지 = 풀블리드 — 규정선 밖 클리핑 */
      "#" + HUB_ID + " .eh-stage{position:absolute;inset:0;width:100%;height:100%;z-index:1;",
      "display:block;overflow:hidden!important;background:transparent;isolation:isolate;}",
      "#" + HUB_ID + " .eh-stage img,#" + HUB_ID + " .eh-stage canvas{",
      "width:100%!important;height:100%!important;max-width:100%;max-height:100%;",
      "object-fit:contain!important;object-position:center bottom;display:block;}",

      /* UI 오버레이 */
      "#" + HUB_ID + " .eh-ui{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;",
      "align-items:center;justify-content:flex-end;padding:24px 16px 28px;pointer-events:none;box-sizing:border-box;}",

      "#" + HUB_ID + " .eh-brand{position:absolute;top:max(14px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);",
      "width:min(92vw,420px);text-align:center;pointer-events:none;padding:0 .5rem;box-sizing:border-box;}",
      "#" + HUB_ID + " .eh-brand-title{margin:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;",
      "gap:.15em .35em;font-size:clamp(1.2rem,3.8vw,2.05rem);font-weight:800;letter-spacing:-.01em;",
      "color:#d9f5ff;text-shadow:0 0 24px rgba(137,191,255,.35);word-break:keep-all;line-height:1.2;}",
      "#" + HUB_ID + " .eh-brand-line{display:inline-block;white-space:nowrap;}",
      "#" + HUB_ID + " .eh-domain{display:block!important;visibility:visible!important;opacity:1!important;",
      "margin:.35rem auto 0;font-size:clamp(.78rem,2.8vw,.92rem);font-weight:800;letter-spacing:.04em;}",
      "#" + HUB_ID + " .eh-domain-ch{display:inline-block!important;font-weight:800;",
      "animation:eh-domain-pulse 2.8s ease-in-out infinite;}",
      "@keyframes eh-domain-pulse{",
      "0%,100%{color:#ff6b35;filter:brightness(1);text-shadow:0 0 3px currentColor;transform:scale(1);}",
      "14%{color:#ffd166;}28%{color:#6ee7b7;filter:brightness(1.5);text-shadow:0 0 12px currentColor;transform:scale(1.12);}",
      "42%{color:#00c8f0;}57%{color:#c084fc;}71%{color:#ff80b4;}",
      "85%{color:#e8a735;filter:brightness(1.45);text-shadow:0 0 10px currentColor;transform:scale(1.08);}}",

      /* PC: 오른쪽 말풍선·메뉴 스택 (Wither .ws-bubble-stack) */
      "#" + HUB_ID + " .eh-bubble-stack{position:absolute;top:50%;right:clamp(18px,5vw,84px);",
      "width:min(380px,34vw);transform:translateY(-50%);display:flex;flex-direction:column;",
      "align-items:stretch;gap:10px;pointer-events:auto;}",

      "#" + HUB_ID + " .eh-speech{position:relative;align-self:center;width:fit-content;max-width:100%;",
      "min-height:1.55em;padding:14px 22px;border-radius:999px;background:rgba(255,255,255,.94);",
      "color:#0f172a;font-size:15px;font-weight:700;line-height:1.55;word-break:keep-all;",
      "box-shadow:0 12px 36px rgba(15,23,42,.35);opacity:0;transform:translateY(12px) scale(.96);",
      "transition:opacity .45s ease,transform .45s ease;}",
      "#" + HUB_ID + " .eh-speech::before{content:'';position:absolute;top:50%;left:-10px;width:19px;height:19px;",
      "background:rgba(255,255,255,.94);clip-path:polygon(100% 0,100% 100%,0 50%);transform:translateY(-50%);}",
      "#" + HUB_ID + " .eh-speech.is-visible{opacity:1;transform:translateY(0) scale(1);}",

      "#" + HUB_ID + " .eh-menu{display:grid;grid-template-columns:1fr 1fr;gap:8px;opacity:0;",
      "transform:translateY(16px);transition:opacity .5s ease .15s,transform .5s ease .15s;pointer-events:none;}",
      "#" + HUB_ID + " .eh-menu.is-open{opacity:1;transform:translateY(0);pointer-events:auto;}",

      "#" + HUB_ID + " .eh-btn{appearance:none;display:flex;align-items:center;justify-content:center;",
      "gap:.35rem;min-height:48px;padding:10px 12px;border-radius:16px;",
      "border:1px solid rgba(155,224,250,.28);background:rgba(8,40,62,.78);color:#f1faff;",
      "font:inherit;font-size:14px;font-weight:800;letter-spacing:-.01em;word-break:keep-all;",
      "cursor:pointer;backdrop-filter:blur(12px);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 8px 20px rgba(0,12,24,.22);",
      "transition:border-color .2s ease,transform .2s ease,background .2s ease;}",
      "#" + HUB_ID + " .eh-btn:hover,#" + HUB_ID + " .eh-btn:focus-visible{transform:translateY(-1px);",
      "border-color:rgba(111,208,245,.62);background:rgba(36,120,168,.72);outline:none;}",
      "#" + HUB_ID + " .eh-btn.is-primary{border-color:rgba(17,139,198,.55);",
      "background:linear-gradient(135deg,rgba(39,151,201,.72),rgba(78,181,219,.45));}",
      "#" + HUB_ID + " .eh-btn.is-wide{grid-column:1/-1;}",
      "#" + HUB_ID + " .eh-badge{font-size:.62rem;font-weight:700;padding:.12rem .32rem;border-radius:999px;",
      "border:1px solid rgba(137,214,244,.35);color:#b9edff;background:rgba(4,35,55,.48);}",

      "#" + HUB_ID + " .eh-hint{margin:4px 0 0;text-align:center;font-size:12px;font-weight:600;",
      "color:rgba(226,232,240,.55);pointer-events:none;}",
      "#" + HUB_ID + " .eh-hint a{color:#a8e5fb;pointer-events:auto;text-decoration:none;font-weight:700;}",
      "#" + HUB_ID + " .eh-hint a:hover{color:#fff;text-decoration:underline;}",

      "body.is-entry-hub-open{overflow:hidden;}",

      /* 모바일: 상단 캐릭터 / 하단 UI 패널 (Wither ≤640px) */
      "@media (max-width:640px){",
      "#" + HUB_ID + "{display:flex;flex-direction:column;}",
      "#" + HUB_ID + " .eh-stage{position:relative!important;inset:auto!important;width:100%!important;",
      "height:56svh!important;flex-shrink:0;}",
      "#" + HUB_ID + " .eh-ui{position:relative!important;inset:auto!important;flex:1;min-height:0;",
      "justify-content:center;padding:10px 14px 16px;background:rgba(5,24,39,.92);",
      "backdrop-filter:blur(8px);overflow:hidden;}",
      "#" + HUB_ID + " .eh-brand{position:relative!important;top:auto!important;left:auto!important;",
      "transform:none!important;width:100%;margin-bottom:4px;flex-shrink:0;}",
      "#" + HUB_ID + " .eh-brand-title{font-size:clamp(1.05rem,5.2vw,1.28rem);gap:.1em .28em;",
      "letter-spacing:-.02em;}",
      "#" + HUB_ID + " .eh-brand-line{white-space:nowrap;}",
      "#" + HUB_ID + " .eh-stage{overflow:hidden!important;}",
      "#" + HUB_ID + " .eh-bubble-stack{position:relative!important;top:auto!important;right:auto!important;",
      "width:100%;transform:none!important;flex:1;min-height:0;gap:8px;}",
      "#" + HUB_ID + " .eh-speech{font-size:13px;padding:10px 16px;flex-shrink:0;}",
      "#" + HUB_ID + " .eh-speech::before{top:-10px;left:50%;right:auto;transform:translateX(-50%);",
      "clip-path:polygon(0 100%,100% 100%,50% 0);}",
      "#" + HUB_ID + " .eh-menu{flex-shrink:0;overflow-y:auto;}",
      "#" + HUB_ID + " .eh-hint{flex-shrink:0;}",
      "}"
    ].join("");
    document.head.appendChild(style);
  }

  function isDismissed() {
    try {
      return globalThis.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setDismissed() {
    try {
      globalThis.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (_) {}
  }

  function setBrowseVideoEnabled(enabled) {
    try {
      if (enabled) globalThis.sessionStorage.setItem(BROWSE_VIDEO_KEY, "1");
      else globalThis.sessionStorage.removeItem(BROWSE_VIDEO_KEY);
    } catch (_) {}
  }

  function isBrowseVideoEnabled() {
    try {
      return globalThis.sessionStorage.getItem(BROWSE_VIDEO_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function buildDomainHtml() {
    var html = "";
    for (var i = 0; i < DOMAIN_TEXT.length; i++) {
      html +=
        '<span class="eh-domain-ch" style="color:' +
        DOMAIN_RAINBOW[i % DOMAIN_RAINBOW.length] +
        ";animation-delay:" +
        (i * 0.16) +
        's">' +
        DOMAIN_TEXT.charAt(i) +
        "</span>";
    }
    return html;
  }

  function buildMenuHtml() {
    return ACTIONS.map(function (action, index) {
      var classes = "eh-btn";
      if (action.primary) classes += " is-primary";
      if (action.wide) classes += " is-wide";
      var badge = action.badge
        ? '<span class="eh-badge">' + action.badge + "</span>"
        : "";
      return (
        '<button type="button" class="' +
        classes +
        '" data-action="' +
        action.id +
        '" data-tone="' +
        ((index % 6) + 1) +
        '">' +
        "<span>" +
        action.title +
        "</span>" +
        badge +
        "</button>"
      );
    }).join("");
  }

  function ensureHub() {
    injectStyles();
    var existing = document.getElementById(HUB_ID);
    if (existing) return existing;

    var root = document.createElement("div");
    root.id = HUB_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "짜장나라 세종본점 서비스 선택");

    root.innerHTML =
      '<div class="eh-stage" id="entryCharacterStage">' +
      '<img class="eh-stage-fallback" src="' +
      CHARACTER_IMAGE +
      '" alt="짜장나라 안내 캐릭터" decoding="async" />' +
      "</div>" +
      '<div class="eh-ui">' +
      '<div class="eh-brand">' +
      '<h1 class="eh-brand-title">' +
      '<span class="eh-brand-line">짜장나라</span>' +
      '<span class="eh-brand-line">세종본점</span>' +
      "</h1>" +
      '<p class="eh-domain" aria-label="' +
      DOMAIN_TEXT +
      '">' +
      buildDomainHtml() +
      "</p>" +
      "</div>" +
      '<div class="eh-bubble-stack">' +
      '<div class="eh-speech" id="ehSpeech" role="status" aria-live="polite"></div>' +
      '<div class="eh-menu" id="ehMenu" role="navigation" aria-label="서비스 메뉴">' +
      buildMenuHtml() +
      "</div>" +
      '<p class="eh-hint">메뉴를 선택하면 이동합니다 · <a href="tel:0445893888">전화 044-589-3888</a></p>' +
      "</div>" +
      "</div>";

    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");
      if (!button) return;
      handleAction(button.getAttribute("data-action"));
    });

    document.body.appendChild(root);
    return root;
  }

  function setStatus() {
    // 로딩 상태 문구는 도메인과 겹쳐 노출하지 않음 (콘솔만 기록)
  }

  function revealUi() {
    var speech = document.getElementById("ehSpeech");
    var menu = document.getElementById("ehMenu");
    if (speech) {
      speech.textContent = GREETING;
      requestAnimationFrame(function () {
        speech.classList.add("is-visible");
      });
    }
    if (menu) {
      menu.classList.remove("is-open");
      globalThis.setTimeout(function () {
        menu.classList.add("is-open");
        if (globalThis.JjajangDetail3D && typeof globalThis.JjajangDetail3D.warm === "function") {
          globalThis.JjajangDetail3D.warm();
        }
        if (globalThis.JjajangDetail3D && typeof globalThis.JjajangDetail3D.warmDance === "function") {
          globalThis.JjajangDetail3D.warmDance();
        }
        var first = menu.querySelector(".eh-btn");
        if (first) first.focus();
      }, MENU_OPEN_DELAY);
    }
  }

  function revealStoreVideo() {
    setBrowseVideoEnabled(true);
    var media = document.getElementById("home");
    var video = document.getElementById("heroVideo");
    if (media) {
      media.hidden = false;
      media.classList.add("is-store-browse-active");
    }
    if (video) {
      video.setAttribute("preload", "auto");
      var play = function () {
        video.play().catch(function (error) {
          console.log("매장 영상 재생 실패:", error);
        });
      };
      if (video.readyState >= 2) play();
      else {
        video.addEventListener("canplay", play, { once: true });
        video.load();
      }
    }
  }

  function clearHubDismissal() {
    try {
      globalThis.sessionStorage.removeItem(STORAGE_KEY);
      globalThis.sessionStorage.removeItem(BROWSE_VIDEO_KEY);
    } catch (_) {}
  }

  function clearEntryDismissal() {
    clearHubDismissal();
    try {
      globalThis.sessionStorage.removeItem("jjajangnara-intro-seen");
    } catch (_) {}
  }

  /** PC(우측 메뉴)·모바일(하단 패널) 공통: 히어로+메뉴 허브 복귀, 진입 글자애니 생략 */
  function reopenHomeEntry() {
    useDefaultMiniRig();
    clearHubDismissal();
    try {
      globalThis.sessionStorage.setItem("jjajangnara-intro-seen", "1");
    } catch (_) {}
    document.documentElement.classList.add("entry-pending");
    document.body.classList.remove("is-intro-playing");
    if (globalThis.EntryAnimation && typeof globalThis.EntryAnimation.skip === "function") {
      try {
        globalThis.EntryAnimation.skip();
      } catch (_) {}
    }
    open({ force: true, deferCharacterStart: false });
    activateCharacter();
    revealUi();
    try {
      document.documentElement.classList.remove("entry-pending");
      if (globalThis.__entryRevealFailsafe) {
        globalThis.clearTimeout(globalThis.__entryRevealFailsafe);
        globalThis.__entryRevealFailsafe = null;
      }
    } catch (_) {}
    return true;
  }

  function useDanceMiniRig() {
    if (globalThis.JjajangDetail3D && typeof globalThis.JjajangDetail3D.activateDanceMode === "function") {
      globalThis.JjajangDetail3D.activateDanceMode();
    }
  }

  function useDefaultMiniRig() {
    if (globalThis.JjajangDetail3D && typeof globalThis.JjajangDetail3D.clearDanceMode === "function") {
      globalThis.JjajangDetail3D.clearDanceMode();
    }
  }

  function remountMiniCharacter() {
    if (globalThis.JjajangDetailCharacter && typeof globalThis.JjajangDetailCharacter.remount === "function") {
      globalThis.JjajangDetailCharacter.remount();
    }
  }

  function handleAction(actionId) {
    var action = ACTIONS.find(function (item) {
      return item.id === actionId;
    });
    if (!action) return;

    // 매장 둘러보기 · 바로 주문하기 → 댄스 리깅 활성화(사전 워밍분 사용)
    var wantsDance = action.browse === true || action.id === "order";
    if (wantsDance) {
      useDanceMiniRig();
    } else {
      useDefaultMiniRig();
    }

    if (
      action.id === "ai" &&
      globalThis.AiVoicePreflight &&
      typeof globalThis.AiVoicePreflight.request === "function"
    ) {
      globalThis.AiVoicePreflight.request().then(function (status) {
        if (status === "cancelled") return;
        setDismissed();
        close();
        globalThis.location.href = action.href;
      });
      return;
    }

    setDismissed();
    close();

    if (action.browse) {
      revealStoreVideo();
      var home = document.getElementById("home") || document.querySelector("#home");
      if (home) home.scrollIntoView({ behavior: "smooth", block: "start" });
      else globalThis.scrollTo({ top: 0, behavior: "smooth" });
      // 같은 페이지에서 미니 캐릭터를 댄스 리깅으로 즉시 교체
      remountMiniCharacter();
      return;
    }

    if (action.href.indexOf("#") === 0) {
      var el = document.querySelector(action.href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      remountMiniCharacter();
      return;
    }

    globalThis.location.href = action.href;
  }

  function mountEntryCharacter() {
    var stage = document.getElementById("entryCharacterStage");
    if (!stage) return;

    function doMount() {
      if (globalThis.HeroCharacter && typeof globalThis.HeroCharacter.mountInto === "function") {
        setStatus("3D 안내 캐릭터 준비 중…");
        Promise.resolve(globalThis.HeroCharacter.mountInto(stage))
          .then(function () {
            setStatus("3D 안내 캐릭터 준비 완료", "is-loaded");
          })
          .catch(function () {
            setStatus("이미지 안내 캐릭터로 표시 중", "is-error");
          });
        return true;
      }
      return false;
    }

    if (doMount()) return;

    var tries = 0;
    var timer = globalThis.setInterval(function () {
      tries += 1;
      if (globalThis.HeroCharacter && typeof globalThis.HeroCharacter.preload === "function") {
        globalThis.HeroCharacter.preload();
      }
      if (doMount() || tries >= 50) {
        globalThis.clearInterval(timer);
        if (tries >= 50) setStatus("이미지 안내 캐릭터로 표시 중", "is-error");
      }
    }, 100);
  }

  function open(options) {
    options = options || {};
    if (!options.force && isDismissed()) return false;

    var root = ensureHub();
    var characterActive = options.deferCharacterStart !== true;
    if (globalThis.HeroCharacter && typeof globalThis.HeroCharacter.setActive === "function") {
      globalThis.HeroCharacter.setActive("entryCharacterStage", characterActive);
    }
    document.body.classList.add("is-entry-hub-open");
    requestAnimationFrame(function () {
      root.classList.add("is-open");
      mountEntryCharacter();
      if (globalThis.HeroCharacter && typeof globalThis.HeroCharacter.preload === "function") {
        globalThis.HeroCharacter.preload();
      }
      if (!options.deferCharacterStart) {
        revealUi();
      } else {
        var speech = document.getElementById("ehSpeech");
        var menu = document.getElementById("ehMenu");
        if (speech) speech.classList.remove("is-visible");
        if (menu) menu.classList.remove("is-open");
      }
    });
    return true;
  }

  function activateCharacter() {
    if (globalThis.HeroCharacter && typeof globalThis.HeroCharacter.setActive === "function") {
      globalThis.HeroCharacter.setActive("entryCharacterStage", true);
    }
    // 진입 애니 종료 후 말풍선·메뉴 공개 (Wither menuOpenDelay 패턴)
    var speech = document.getElementById("ehSpeech");
    if (speech && !speech.classList.contains("is-visible")) {
      revealUi();
    }
  }

  function close() {
    var root = document.getElementById(HUB_ID);
    document.body.classList.remove("is-entry-hub-open");
    document.documentElement.classList.remove("entry-pending");
    if (globalThis.__entryRevealFailsafe) {
      globalThis.clearTimeout(globalThis.__entryRevealFailsafe);
      globalThis.__entryRevealFailsafe = null;
    }
    if (!root) return;
    root.classList.remove("is-open");
    if (globalThis.HeroCharacter && typeof globalThis.HeroCharacter.setActive === "function") {
      globalThis.HeroCharacter.setActive("entryCharacterStage", false);
    }
  }

  function shouldOpenOnLoad() {
    return !isDismissed();
  }

  function initStoreVideoGate() {
    var media = document.getElementById("home");
    var video = document.getElementById("heroVideo");
    if (!media) return;

    if (isBrowseVideoEnabled()) {
      media.hidden = false;
      media.classList.add("is-store-browse-active");
      return;
    }

    media.hidden = true;
    media.classList.remove("is-store-browse-active");
    if (video) {
      try {
        video.pause();
      } catch (_) {}
      video.removeAttribute("autoplay");
      video.setAttribute("preload", "none");
    }
  }

  window.EntryHub = {
    open: open,
    close: close,
    shouldOpenOnLoad: shouldOpenOnLoad,
    isDismissed: isDismissed,
    activateCharacter: activateCharacter,
    initStoreVideoGate: initStoreVideoGate,
    revealStoreVideo: revealStoreVideo,
    reopenHomeEntry: reopenHomeEntry,
    clearHubDismissal: clearHubDismissal,
    clearEntryDismissal: clearEntryDismissal
  };
})();
