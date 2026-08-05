/**
 * RC1 Slice 1 — 서버 권위 주문 생성 (가격 재계산 + PAYMENT_PENDING)
 */
"use strict";

const crypto = require("crypto");
const { connectLambda, getStore } = require("@netlify/blobs");
const catalog = require("./_menu-catalog");

const STORE_NAME = "jjajangnara-pos-orders";
const RC1_PENDING_PREFIX = "rc1-pending/";
const RC1_IDEMPOTENCY_PREFIX = "rc1-idempotency/";

function getOrderStore(event) {
  connectLambda(event);
  return getStore(STORE_NAME);
}

function rc1PendingKey(orderId) {
  return `${RC1_PENDING_PREFIX}${String(orderId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function rc1IdempotencyKey(key) {
  const safe = String(key || "")
    .trim()
    .slice(0, 120)
    .replace(/[^a-zA-Z0-9._:-]/g, "_");
  return `${RC1_IDEMPOTENCY_PREFIX}${safe}`;
}

function isRc1Enabled() {
  const raw = String(process.env.RC1_SERVER_ORDER || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

function createOrderId() {
  // 충분히 무작위 — 추측 가능한 Date.now 기반 ID 금지
  return `jjn_${crypto.randomBytes(16).toString("hex")}`;
}

function createCheckoutToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function HttpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code || "BAD_REQUEST";
  return error;
}

function assertNoClientAuthorityFields(body) {
  if (!body || typeof body !== "object") return;

  // 가격·합계·메뉴명뿐 아니라 서버 권위 필드도 클라이언트가 지정할 수 없다.
  const topForbidden = [
    "price",
    "total",
    "amount",
    "unitPrice",
    "lineTotal",
    "name",
    "orderName",
    "menuName",
    "orderId",
    "expiresAt",
    "checkoutToken",
    "checkoutTokenHash",
    "status",
    "currency",
    "version",
  ];
  for (const key of topForbidden) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      throw HttpError(400, `클라이언트 ${key} 필드는 허용되지 않습니다.`, "CLIENT_AUTHORITY_FORBIDDEN");
    }
  }

  const itemForbidden = [
    "price",
    "total",
    "amount",
    "unitPrice",
    "lineTotal",
    "name",
    "menuName",
    "menuNameSnapshot",
    "orderName",
  ];
  if (Array.isArray(body.items)) {
    body.items.forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      for (const key of itemForbidden) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          throw HttpError(
            400,
            `items[${index}].${key} 필드는 허용되지 않습니다.`,
            "CLIENT_AUTHORITY_FORBIDDEN"
          );
        }
      }
    });
  }
}

/** @deprecated use assertNoClientAuthorityFields */
function assertNoClientPrices(body) {
  return assertNoClientAuthorityFields(body);
}

function createMemoryStore(seed) {
  const map = new Map();
  if (seed && typeof seed === "object") {
    for (const [key, value] of Object.entries(seed)) {
      map.set(key, value);
    }
  }
  return {
    async get(key, opts) {
      if (!map.has(key)) return null;
      const value = map.get(key);
      if (opts && opts.type === "json") {
        return JSON.parse(JSON.stringify(value));
      }
      return value;
    },
    async setJSON(key, value) {
      map.set(key, JSON.parse(JSON.stringify(value)));
    },
  };
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    throw HttpError(400, "연락처 형식이 올바르지 않습니다.", "INVALID_PHONE");
  }
  return digits;
}

function normalizeAddress(address) {
  const value = String(address || "").trim();
  if (value.length < 5 || value.length > 300) {
    throw HttpError(400, "배달 주소 길이가 올바르지 않습니다.", "INVALID_ADDRESS");
  }
  return value;
}

function normalizeQuantity(raw, label) {
  if (typeof raw === "string" && !/^\d+$/.test(raw.trim())) {
    throw HttpError(400, `${label} 수량이 올바르지 않습니다.`, "INVALID_QUANTITY");
  }
  const qty = Number(raw);
  if (!Number.isInteger(qty) || qty < 1 || qty > catalog.MAX_LINE_QUANTITY) {
    throw HttpError(400, `${label} 수량은 1~${catalog.MAX_LINE_QUANTITY}만 허용됩니다.`, "INVALID_QUANTITY");
  }
  return qty;
}

function uniqueOptionIds(optionIds) {
  if (optionIds == null) return [];
  if (!Array.isArray(optionIds)) {
    throw HttpError(400, "optionIds는 배열이어야 합니다.", "INVALID_OPTIONS");
  }
  const list = optionIds.map((id) => String(id || "").trim()).filter(Boolean);
  return [...new Set(list)];
}

function priceSingleItem(raw) {
  const menuId = String(raw.menuId || "").trim();
  if (!menuId) {
    throw HttpError(400, "menuId가 필요합니다.", "MISSING_MENU_ID");
  }
  if (raw.setId) {
    throw HttpError(400, "단품 항목에 setId를 함께 보낼 수 없습니다.", "AMBIGUOUS_ITEM");
  }

  const menu = catalog.getMenu(menuId);
  if (!menu) {
    throw HttpError(400, `존재하지 않는 메뉴입니다: ${menuId}`, "UNKNOWN_MENU");
  }

  const quantity = normalizeQuantity(raw.quantity, menu.name);
  const optionIds = uniqueOptionIds(raw.optionIds);
  const options = optionIds.map((optionId) => {
    if (!menu.options.includes(optionId)) {
      throw HttpError(400, `${menu.name}에 허용되지 않는 옵션입니다: ${optionId}`, "UNKNOWN_OPTION");
    }
    const option = catalog.getOption(optionId);
    if (!option) {
      throw HttpError(400, `존재하지 않는 옵션입니다: ${optionId}`, "UNKNOWN_OPTION");
    }
    return {
      optionId: option.id,
      nameSnapshot: option.name,
      priceSnapshot: option.price,
    };
  });

  const optionTotal = options.reduce((sum, option) => sum + option.priceSnapshot, 0);
  const unitPriceSnapshot = menu.unitPrice;
  const lineTotal = (unitPriceSnapshot + optionTotal) * quantity;

  return {
    kind: "single",
    menuId: menu.id,
    menuNameSnapshot: menu.name,
    unitPriceSnapshot,
    options,
    quantity,
    lineTotal,
  };
}

function priceSetItem(raw) {
  const setId = String(raw.setId || "").trim();
  if (!setId) {
    throw HttpError(400, "setId가 필요합니다.", "MISSING_SET_ID");
  }
  if (raw.menuId) {
    throw HttpError(400, "세트 항목에 menuId를 함께 보낼 수 없습니다.", "AMBIGUOUS_ITEM");
  }

  const set = catalog.getSet(setId);
  if (!set) {
    throw HttpError(400, `존재하지 않는 세트입니다: ${setId}`, "UNKNOWN_SET");
  }

  const quantity = normalizeQuantity(raw.quantity == null ? 1 : raw.quantity, set.name);
  if (!Array.isArray(raw.mains) || raw.mains.length !== set.pick) {
    throw HttpError(400, `${set.name}은 메인 ${set.pick}개가 필요합니다.`, "INVALID_SET_MAINS");
  }

  const mains = raw.mains.map((main, index) => {
    const mainId = String(main?.mainId || "").trim();
    const setMain = catalog.getSetMain(mainId);
    if (!setMain) {
      throw HttpError(400, `존재하지 않는 세트 메인입니다: ${mainId || `(index ${index})`}`, "UNKNOWN_SET_MAIN");
    }
    const optionIds = uniqueOptionIds(main.optionIds);
    const options = optionIds.map((optionId) => {
      if (optionId !== "double" && optionId !== "large") {
        throw HttpError(400, `세트 메인에 허용되지 않는 옵션입니다: ${optionId}`, "UNKNOWN_OPTION");
      }
      const option = catalog.getOption(optionId === "large" ? "double" : optionId);
      return {
        optionId: option.id,
        nameSnapshot: option.name,
        priceSnapshot: option.price,
      };
    });
    const optionTotal = options.reduce((sum, option) => sum + option.priceSnapshot, 0);
    return {
      mainId: setMain.id,
      nameSnapshot: setMain.name,
      extraSnapshot: setMain.extra,
      options,
      lineExtra: setMain.extra + optionTotal,
    };
  });

  const mainsExtra = mains.reduce((sum, main) => sum + main.lineExtra, 0);
  const unitPriceSnapshot = set.basePrice + mainsExtra;
  const lineTotal = unitPriceSnapshot * quantity;

  return {
    kind: "set",
    setId: set.id,
    menuNameSnapshot: set.name,
    tangNameSnapshot: set.tangName,
    unitPriceSnapshot,
    basePriceSnapshot: set.basePrice,
    mains,
    quantity,
    lineTotal,
  };
}

function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw HttpError(400, "주문 항목이 비어 있습니다.", "EMPTY_ITEMS");
  }
  if (items.length > catalog.MAXIMUM_ITEMS) {
    throw HttpError(400, "주문 항목 수가 너무 많습니다.", "TOO_MANY_ITEMS");
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw HttpError(400, `items[${index}] 형식이 올바르지 않습니다.`, "INVALID_ITEM");
    }
    if (item.setId) return priceSetItem(item);
    return priceSingleItem(item);
  });
}

function buildOrderName(pricedItems) {
  if (pricedItems.length === 0) return "짜장나라 주문";
  const first = pricedItems[0];
  const label =
    first.kind === "set"
      ? first.menuNameSnapshot
      : `${first.menuNameSnapshot}${first.options?.length ? " " + first.options.map((o) => o.nameSnapshot).join(" ") : ""}${
          first.quantity > 1 ? ` ${first.quantity}개` : ""
        }`;
  if (pricedItems.length === 1) return label.slice(0, 100);
  return `${label} 외 ${pricedItems.length - 1}건`.slice(0, 100);
}

function publicOrderView(record, checkoutToken) {
  return {
    orderId: record.orderId,
    status: record.status,
    amount: record.amount,
    orderName: record.orderName,
    checkoutToken,
    expiresAt: record.expiresAt,
    currency: record.currency,
  };
}

async function createPaymentPendingOrder(event, body, options) {
  options = options || {};
  if (!isRc1Enabled() && !options.force) {
    throw HttpError(503, "RC1 서버 주문 기능이 비활성화되어 있습니다.", "RC1_DISABLED");
  }

  assertNoClientAuthorityFields(body);

  const clientRequestId = String(body.clientRequestId || options.idempotencyKey || "").trim();
  const store = options.store || getOrderStore(event);

  if (clientRequestId) {
    const existingRef = await store.get(rc1IdempotencyKey(clientRequestId), { type: "json" });
    if (existingRef?.orderId) {
      const existing = await store.get(rc1PendingKey(existingRef.orderId), { type: "json" });
      if (existing && existing.status === "PAYMENT_PENDING") {
        if (existing.expiresAt && Date.parse(existing.expiresAt) <= Date.now()) {
          throw HttpError(409, "만료된 주문입니다. 다시 생성해 주세요.", "ORDER_EXPIRED");
        }
        const replayError = HttpError(
          409,
          "동일 요청이 이미 처리되었습니다. 기존 주문을 사용하세요.",
          "IDEMPOTENT_REPLAY"
        );
        replayError.payload = {
          orderId: existing.orderId,
          status: existing.status,
          amount: existing.amount,
          orderName: existing.orderName,
          expiresAt: existing.expiresAt,
          currency: existing.currency,
          replay: true,
        };
        throw replayError;
      }
    }
  }

  const pricedItems = priceItems(body.items);
  const amount = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  if (amount < catalog.MINIMUM_ORDER_AMOUNT) {
    throw HttpError(
      400,
      `최소 주문금액은 ${catalog.MINIMUM_ORDER_AMOUNT}원입니다.`,
      "BELOW_MINIMUM"
    );
  }

  const utensils = String(body.utensils || "O").trim().slice(0, 10) || "O";
  const phone = normalizePhone(body.phone);
  const address = normalizeAddress(body.address);
  const request = String(body.request || "없음").trim().slice(0, 500) || "없음";

  const orderId = createOrderId();
  const checkoutToken = createCheckoutToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + catalog.ORDER_TTL_MS).toISOString();

  const record = {
    orderId,
    status: "PAYMENT_PENDING",
    items: pricedItems,
    amount,
    currency: "KRW",
    orderName: buildOrderName(pricedItems),
    utensils,
    address,
    phone,
    request,
    // 원문 토큰은 저장하지 않는다. 해시만 보관.
    checkoutTokenHash: hashToken(checkoutToken),
    clientRequestId: clientRequestId || null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt,
    version: 1,
    source: "rc1-create-order",
  };

  if (Object.prototype.hasOwnProperty.call(record, "checkoutToken")) {
    throw HttpError(500, "토큰 원문 저장이 감지되어 주문을 중단합니다.", "TOKEN_PLAINTEXT_FORBIDDEN");
  }

  await store.setJSON(rc1PendingKey(orderId), record);
  if (clientRequestId) {
    await store.setJSON(rc1IdempotencyKey(clientRequestId), {
      orderId,
      createdAt: record.createdAt,
    });
  }

  return publicOrderView(record, checkoutToken);
}

async function getRc1PendingOrder(event, orderId) {
  const store = getOrderStore(event);
  return store.get(rc1PendingKey(orderId), { type: "json" });
}

function verifyCheckoutToken(record, token) {
  if (!record || !token) return false;
  const expected = String(record.checkoutTokenHash || "");
  const actual = hashToken(token);
  if (!expected || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function assertOrderPayable(record) {
  if (!record) {
    throw HttpError(404, "주문을 찾을 수 없습니다.", "ORDER_NOT_FOUND");
  }
  if (record.status !== "PAYMENT_PENDING") {
    throw HttpError(409, "결제 가능한 상태가 아닙니다.", "INVALID_STATUS");
  }
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
    throw HttpError(409, "만료된 주문입니다.", "ORDER_EXPIRED");
  }
  return record;
}

module.exports = {
  HttpError,
  assertNoClientAuthorityFields,
  assertNoClientPrices,
  assertOrderPayable,
  createCheckoutToken,
  createMemoryStore,
  createOrderId,
  createPaymentPendingOrder,
  getRc1PendingOrder,
  hashToken,
  isRc1Enabled,
  priceItems,
  publicOrderView,
  rc1IdempotencyKey,
  rc1PendingKey,
  verifyCheckoutToken,
};
