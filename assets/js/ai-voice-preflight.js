(function () {
  "use strict";

  var SESSION_KEY = "jjajangnara-ai-voice-preflight";
  var PERSIST_KEY = "jjajangnara-ai-mic-granted";
  var activePromise = null;
  var micUnlocked = false;
  var ensurePromise = null;

  function clearGrant() {
    micUnlocked = false;
    try {
      globalThis.localStorage.removeItem(PERSIST_KEY);
    } catch (_) {}
    try {
      globalThis.sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  function saveStatus(status) {
    try {
      globalThis.sessionStorage.setItem(SESSION_KEY, status);
    } catch (_) {}
    if (status === "granted") {
      try {
        globalThis.localStorage.setItem(PERSIST_KEY, "1");
      } catch (_) {}
      micUnlocked = true;
    }
    if (status === "cancelled" || status === "text") {
      // 거절/텍스트 모드는 세션만 유지. 영구 허용 플래그는 건드리지 않음
    }
    globalThis.dispatchEvent(new CustomEvent("jjajang:voice-preflight", {
      detail: { status: status }
    }));
  }

  function isPersistentlyGranted() {
    try {
      return globalThis.localStorage.getItem(PERSIST_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function getSavedStatus() {
    // 영구 허용이 있으면 세션의 cancelled보다 우선 (모달 재등장 방지)
    if (isPersistentlyGranted()) return "granted";
    try {
      return globalThis.sessionStorage.getItem(SESSION_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function supportsSpeechRecognition() {
    return Boolean(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
  }

  function supportsMicrophoneRequest() {
    return Boolean(
      globalThis.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    );
  }

  function queryMicrophonePermission() {
    if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
      return Promise.resolve("");
    }
    return navigator.permissions.query({ name: "microphone" }).then(function (result) {
      return result && result.state ? result.state : "";
    }).catch(function () {
      // Firefox 등: microphone 쿼리 미지원
      return "";
    });
  }

  function requestMicrophoneStream() {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      stream.getTracks().forEach(function (track) {
        try {
          track.stop();
        } catch (_) {}
      });
      micUnlocked = true;
      saveStatus("granted");
      return true;
    });
  }

  /**
   * 마이크 사용 가능 여부 확인.
   * - 브라우저가 이미 허용했거나 영구 허용이면 getUserMedia를 다시 호출하지 않음 (반복 프롬프트 방지)
   * - 최초 1회만 OS 권한 창을 띄움
   */
  function ensureMicrophoneAccess() {
    if (micUnlocked) {
      return Promise.resolve(true);
    }
    if (ensurePromise) return ensurePromise;

    if (!supportsMicrophoneRequest()) {
      // getUserMedia 없이도 SpeechRecognition이 자체 권한을 받을 수 있음
      ensurePromise = Promise.resolve(supportsSpeechRecognition()).then(function (ok) {
        ensurePromise = null;
        if (ok && isPersistentlyGranted()) micUnlocked = true;
        return ok;
      });
      return ensurePromise;
    }

    ensurePromise = queryMicrophonePermission().then(function (state) {
      if (state === "denied") {
        clearGrant();
        return false;
      }

      // 브라우저가 실제로 허용한 상태만 신뢰한다.
      if (state === "granted") {
        micUnlocked = true;
        saveStatus("granted");
        return true;
      }

      // prompt 또는 Permissions API 미지원 상태에서는 사용자 클릭 시에만
      // 실제 권한을 확인한다. localStorage 기록만으로 허용을 가정하지 않는다.
      return requestMicrophoneStream().catch(function (error) {
        if (error && error.name === "NotAllowedError") {
          clearGrant();
        }
        return false;
      });
    }).then(function (ok) {
      ensurePromise = null;
      return ok;
    }).catch(function () {
      ensurePromise = null;
      return false;
    });

    return ensurePromise;
  }

  function removeModal() {
    document.getElementById("aiVoicePreflight")?.remove();
  }

  function request(options) {
    options = options || {};

    if (activePromise) return activePromise;

    activePromise = Promise.resolve().then(function () {
      return queryMicrophonePermission();
    }).then(function (permissionState) {
      var savedStatus = getSavedStatus();

      if (!options.force && (permissionState === "granted" || micUnlocked)) {
        micUnlocked = true;
        saveStatus("granted");
        activePromise = null;
        return "granted";
      }

      if (!options.force && savedStatus === "text") {
        activePromise = null;
        return "text";
      }

      return new Promise(function (resolve) {
        removeModal();
        var speechSupported = supportsSpeechRecognition();
        var microphoneSupported = supportsMicrophoneRequest();
        var root = document.createElement("div");
        root.id = "aiVoicePreflight";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "aiVoicePreflightTitle");
        root.innerHTML =
          '<div class="avp-card">' +
            '<div class="avp-eyebrow">AI VOICE ORDER · 사전 점검</div>' +
            '<h2 id="aiVoicePreflightTitle">음성 주문 이용 안내</h2>' +
            '<p>AI 주문 도우미가 메뉴와 수량을 듣기 위해 마이크 권한이 <strong>한 번</strong> 필요합니다. 허용하시면 이후에는 다시 묻지 않습니다.</p>' +
            '<ul>' +
              '<li>최소 주문금액은 <strong>15,000원</strong>입니다.</li>' +
              '<li>Chrome 또는 Edge 최신 버전을 권장합니다.</li>' +
              '<li>주소·결제 정보는 최종 주문 화면에서 다시 확인합니다.</li>' +
            '</ul>' +
            '<div class="avp-status ' + (speechSupported && microphoneSupported ? "is-ok" : "is-warning") + '">' +
              (speechSupported && microphoneSupported
                ? "현재 브라우저에서 음성 주문을 사용할 수 있습니다."
                : "현재 환경에서는 음성인식이 제한될 수 있습니다. 텍스트 주문을 이용해 주세요.") +
            '</div>' +
            '<div class="avp-error" id="aiVoicePreflightError" aria-live="polite"></div>' +
            '<div class="avp-actions">' +
              (speechSupported
                ? '<button type="button" class="avp-primary" data-avp="allow">마이크 허용 · 음성 주문 준비</button>'
                : "") +
              '<button type="button" class="avp-secondary" data-avp="text">텍스트 주문으로 계속</button>' +
              '<button type="button" class="avp-cancel" data-avp="cancel">취소</button>' +
            '</div>' +
          '</div>';

        var style = document.createElement("style");
        style.textContent =
          "#aiVoicePreflight{position:fixed;inset:0;z-index:1000002;display:grid;place-items:center;padding:1rem;" +
          "background:rgba(2,14,24,.84);backdrop-filter:blur(14px);font-family:'Segoe UI','Apple SD Gothic Neo',system-ui,sans-serif;}" +
          "#aiVoicePreflight .avp-card{width:min(520px,100%);padding:1.35rem;border-radius:1.2rem;color:#eefaff;" +
          "border:1px solid rgba(143,219,247,.3);background:linear-gradient(145deg,rgba(18,65,93,.96),rgba(5,29,47,.96));" +
          "box-shadow:inset 0 1px rgba(255,255,255,.1),0 28px 80px rgba(0,0,0,.42);}" +
          "#aiVoicePreflight .avp-eyebrow{font-size:.7rem;font-weight:800;letter-spacing:.16em;color:#72d2f4;}" +
          "#aiVoicePreflight h2{margin:.35rem 0 .65rem;font-size:1.45rem;color:#d9f5ff;}" +
          "#aiVoicePreflight p,#aiVoicePreflight li{font-size:.88rem;line-height:1.65;color:#bed9e7;}" +
          "#aiVoicePreflight ul{margin:.8rem 0;padding-left:1.25rem;}" +
          "#aiVoicePreflight .avp-status{padding:.7rem .8rem;border-radius:.7rem;font-size:.8rem;font-weight:700;}" +
          "#aiVoicePreflight .is-ok{background:rgba(45,191,132,.15);color:#9bf0ca;border:1px solid rgba(83,221,164,.24);}" +
          "#aiVoicePreflight .is-warning{background:rgba(255,176,68,.13);color:#ffd49a;border:1px solid rgba(255,188,92,.22);}" +
          "#aiVoicePreflight .avp-error{min-height:1.3rem;margin-top:.55rem;color:#ffb3b3;font-size:.78rem;}" +
          "#aiVoicePreflight .avp-actions{display:grid;gap:.5rem;margin-top:.5rem;}" +
          "#aiVoicePreflight button{min-height:46px;border-radius:.75rem;font:inherit;font-weight:800;cursor:pointer;}" +
          "#aiVoicePreflight .avp-primary{border:1px solid #8ddff9;background:linear-gradient(135deg,#299dce,#89def7);color:#062033;}" +
          "#aiVoicePreflight .avp-secondary{border:1px solid rgba(143,219,247,.28);background:rgba(11,44,68,.7);color:#eaf9ff;}" +
          "#aiVoicePreflight .avp-cancel{min-height:38px;border:0;background:transparent;color:#9ebccb;}";
        root.appendChild(style);
        document.body.appendChild(root);

        function finish(status) {
          saveStatus(status);
          removeModal();
          activePromise = null;
          resolve(status);
        }

        root.addEventListener("click", function (event) {
          var button = event.target.closest("[data-avp]");
          if (!button || button.disabled) return;
          var action = button.dataset.avp;
          if (action === "cancel") {
            finish("cancelled");
            return;
          }
          if (action === "text") {
            finish("text");
            return;
          }
          if (action !== "allow") return;

          var errorElement = root.querySelector("#aiVoicePreflightError");
          button.disabled = true;
          button.textContent = "마이크 권한 확인 중...";

          var grantFlow = microphoneSupported
            ? requestMicrophoneStream()
            : Promise.resolve(supportsSpeechRecognition()).then(function (ok) {
              if (!ok) throw new Error("unsupported");
              micUnlocked = true;
              saveStatus("granted");
              return true;
            });

          grantFlow.then(function () {
            finish("granted");
          }).catch(function (error) {
            button.disabled = false;
            button.textContent = "다시 마이크 권한 요청";
            if (error && error.name === "NotAllowedError") {
              clearGrant();
              errorElement.textContent =
                "마이크 권한이 거부되었습니다. 브라우저 주소창의 마이크 아이콘을 허용한 뒤 다시 눌러 주세요.";
            } else {
              errorElement.textContent =
                "마이크를 확인하지 못했습니다. 연결 상태를 확인하거나 텍스트 주문을 이용해 주세요.";
            }
          });
        });
      });
    }).catch(function () {
      activePromise = null;
      return getSavedStatus() || "cancelled";
    });

    return activePromise;
  }

  if (isPersistentlyGranted()) {
    try {
      globalThis.sessionStorage.setItem(SESSION_KEY, "granted");
    } catch (_) {}
  }

  globalThis.AiVoicePreflight = {
    request: request,
    getStatus: getSavedStatus,
    ensureMicrophoneAccess: ensureMicrophoneAccess,
    supportsSpeechRecognition: supportsSpeechRecognition,
    queryMicrophonePermission: queryMicrophonePermission,
    isPersistentlyGranted: isPersistentlyGranted,
    clearGrant: clearGrant
  };
})();
