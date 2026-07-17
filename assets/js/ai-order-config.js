(function () {
  "use strict";

  globalThis.JJAJANG_AI_ORDER_CONFIG = Object.freeze({
    minimumOrderAmount: 15000,
    products: [
      { id: "jjajang", name: "짜장면", price: 8000, large: true, aliases: ["짜장면", "자장면", "짜장", "자장"] },
      { id: "jjambbong", name: "짬뽕", price: 9000, large: true, aliases: ["짬뽕", "짬뽕면"] },
      { id: "jjamjja", name: "짬짜면", price: 9000, large: false, aliases: ["짬짜면", "짬자면", "짬짜"] },
      { id: "kongguksu", name: "콩국수", price: 10000, large: true, aliases: ["콩국수", "콩국"] },
      { id: "chadol-jjambbong", name: "차돌짬뽕", price: 12000, large: true, aliases: ["차돌짬뽕", "차돌 짬뽕", "차돌짬뽕면"] },
      { id: "tangmini", name: "미니탕수육", price: 12000, large: false, aliases: ["미니탕수육", "초미니탕수육", "미니탕수", "탕수육미니"] },
      { id: "tangjung", name: "탕수육(중)", price: 17000, large: false, aliases: ["탕수육", "탕수육중", "탕수육 중", "탕수육중간"] },
      { id: "jjambbongbap", name: "짬뽕밥", price: 10000, large: true, aliases: ["짬뽕밥"] },
      { id: "bokkeumbap", name: "볶음밥", price: 10000, large: true, aliases: ["볶음밥", "복음밥"] },
      { id: "mapabap", name: "마파두부밥", price: 10000, large: false, aliases: ["마파두부밥", "마파두부", "마파밥"] },
      { id: "bibimbap", name: "중화비빔밥", price: 10000, large: true, aliases: ["중화비빔밥", "비빔밥", "중화 비빔밥"] },
      { id: "jeyukbap", name: "제육덮밥", price: 11000, large: true, aliases: ["제육덮밥", "제육밥", "제육"] },
      { id: "japchaebap", name: "잡채밥", price: 11000, large: false, aliases: ["잡채밥", "잡채"] }
    ],
    sets: [
      {
        id: "solo",
        name: "혼밥세트",
        price: 16000,
        pick: 1,
        tangTitle: "초미니탕수육",
        defaultMains: ["짜장면"],
        desc: "초미니탕수육 + 메인 1개 · 짜장/짬뽕 추가금 0원 · 짬짜면/볶음밥/중화비빔밥 +1,000원 · 제육덮밥 +2,000원 · 잡채밥 +3,000원",
        voiceGuide: "혼밥세트는 필수 메뉴 초미니탕수육 한 개와 메인 메뉴 한 개로 구성됩니다. 기본 메인은 짜장면입니다."
      },
      {
        id: "couple",
        name: "달달커플세트",
        price: 22000,
        pick: 2,
        tangTitle: "초미니탕수육",
        defaultMains: ["짜장면", "짬뽕"],
        desc: "초미니탕수육 + 메인 2개 · 변경 추가금은 메뉴 1개당 각각 적용됩니다.",
        voiceGuide: "달달커플세트는 필수 메뉴 초미니탕수육 한 개와 메인 메뉴 두 개로 구성됩니다. 기본 메인은 짜장면과 짬뽕입니다."
      },
      {
        id: "family",
        name: "패밀리세트",
        price: 31000,
        pick: 3,
        tangTitle: "미니탕수육",
        defaultMains: ["짜장면", "짬뽕", "짜장면"],
        desc: "미니탕수육 + 메인 3개 · 변경 추가금은 메뉴 1개당 각각 적용됩니다.",
        voiceGuide: "패밀리세트는 필수 메뉴 미니탕수육 한 개와 메인 메뉴 세 개로 구성됩니다. 기본 메인은 짜장면, 짬뽕, 짜장면입니다."
      }
    ],
    voice: {
      opening: "최소 주문금액은 만 오천 원입니다. 먼저 단품으로 주문하실지, 세트메뉴로 주문하실지, 또는 세트메뉴에 단품을 추가하실지 말씀해 주세요.",
      chooseMode: "주문 유형을 먼저 말씀해 주세요. 단품, 세트, 세트에 단품 추가 중에서 선택할 수 있습니다.",
      singleReady: "단품 주문으로 안내하겠습니다. 메뉴명과 수량을 말씀해 주세요.",
      setReady: "세트 주문으로 안내하겠습니다. 혼밥세트, 달달커플세트, 패밀리세트 중에서 말씀해 주세요.",
      mixedReady: "세트에 단품 추가 주문으로 안내하겠습니다. 먼저 구성할 세트 이름을 말씀해 주세요.",
      minimumOrder: "최소 주문금액은 만 오천 원입니다. 다른 메뉴를 추가 주문해 주세요.",
      setConfirmAsk: "다른 추가 주문이 없으시면, 필수 메뉴와 기본 메인으로 구성해도 괜찮으실까요? 괜찮으시면 네, 구성을 바꾸시려면 구성 변경이라고 말씀해 주세요. 네라고 하시면 주문 화면으로 연결됩니다.",
      setConfirmYes: "알겠습니다. 필수 메뉴와 기본 메인으로 구성해 주문 화면으로 연결합니다.",
      setConfirmChange: "구성 화면으로 이동합니다. 메인 메뉴를 직접 선택해 주세요."
    }
  });
})();
