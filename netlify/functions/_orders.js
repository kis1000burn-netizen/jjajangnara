const { connectLambda, getStore } = require("@netlify/blobs");

const STORE_NAME = "jjajangnara-pos-orders";
const ORDER_PREFIX = "orders/";
const RUNTIME_KEY = "system/store-runtime";
const ALLOWED_STATUSES = new Set([
  "new",
  "accepted",
  "cooking",
  "ready",
  "delivering",
  "completed",
  "canceled",
]);

function getOrderStore(event) {
  connectLambda(event);
  return getStore(STORE_NAME);
}

function orderKey(orderId) {
  return `${ORDER_PREFIX}${String(orderId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function assertOrderData(order, orderId, amount) {
  if (!order || !Array.isArray(order.cart) || order.cart.length === 0) {
    throw new Error("주문 메뉴 정보가 없습니다.");
  }
  if (!order.address || !order.phone) {
    throw new Error("배달 주소와 연락처가 필요합니다.");
  }
  if (Number(order.total) !== Number(amount)) {
    throw new Error("결제 금액과 주문 금액이 일치하지 않습니다.");
  }
  return {
    orderId,
    items: order.cart.map((item) => ({
      type: String(item.type || "single"),
      id: String(item.id || ""),
      name: String(item.name || "메뉴"),
      detail: String(item.detail || ""),
      price: Number(item.price) || 0,
    })),
    total: Number(order.total),
    utensils: String(order.utensils || ""),
    address: String(order.address).slice(0, 300),
    phone: String(order.phone).slice(0, 50),
    request: String(order.request || "없음").slice(0, 500),
    orderedAt: order.date || new Date().toISOString(),
  };
}

async function savePaidOrder(event, orderData, paymentData) {
  const store = getOrderStore(event);
  const normalized = assertOrderData(orderData, paymentData.orderId, paymentData.totalAmount);
  const key = orderKey(paymentData.orderId);
  const existing = await store.get(key, { type: "json" });
  if (existing) return existing;

  const now = new Date().toISOString();
  const record = {
    ...normalized,
    status: "new",
    createdAt: now,
    updatedAt: now,
    printedAt: null,
    printRequestedAt: now,
    payment: {
      paymentKey: paymentData.paymentKey,
      method: paymentData.method,
      status: paymentData.status,
      approvedAt: paymentData.approvedAt || now,
    },
  };
  await store.setJSON(key, record);
  return record;
}

async function listOrders(event) {
  const store = getOrderStore(event);
  const { blobs } = await store.list({ prefix: ORDER_PREFIX });
  const records = await Promise.all(
    blobs.slice(-300).map((blob) => store.get(blob.key, { type: "json" }))
  );
  return records
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function updateOrder(event, orderId, changes) {
  const store = getOrderStore(event);
  const key = orderKey(orderId);
  const current = await store.get(key, { type: "json" });
  if (!current) return null;

  const next = { ...current, updatedAt: new Date().toISOString() };
  if (changes.status) {
    if (!ALLOWED_STATUSES.has(changes.status)) {
      throw new Error("허용되지 않은 주문 상태입니다.");
    }
    next.status = changes.status;
  }
  if (changes.printRequestedAt) next.printRequestedAt = String(changes.printRequestedAt);
  if (changes.printedAt) next.printedAt = String(changes.printedAt);
  await store.setJSON(key, next);
  return next;
}

async function getRuntimeStatus(event) {
  const store = getOrderStore(event);
  const saved = await store.get(RUNTIME_KEY, { type: "json" });
  return {
    heartbeatAt: saved?.heartbeatAt || null,
    stationName: saved?.stationName || "counter-pos",
    holiday: Boolean(saved?.holiday),
    holidayMessage: saved?.holidayMessage || "오늘은 휴무일입니다.",
    holidayUntil: saved?.holidayUntil || null,
    updatedAt: saved?.updatedAt || null,
  };
}

async function updateRuntimeStatus(event, changes) {
  const store = getOrderStore(event);
  const current = await getRuntimeStatus(event);
  const next = {
    ...current,
    updatedAt: new Date().toISOString(),
  };
  if (changes.heartbeatAt) next.heartbeatAt = String(changes.heartbeatAt);
  if (changes.stationName) next.stationName = String(changes.stationName).slice(0, 80);
  if (typeof changes.holiday === "boolean") next.holiday = changes.holiday;
  if (typeof changes.holidayMessage === "string") {
    next.holidayMessage = changes.holidayMessage.trim().slice(0, 200) || "오늘은 휴무일입니다.";
  }
  if (Object.prototype.hasOwnProperty.call(changes, "holidayUntil")) {
    next.holidayUntil = changes.holidayUntil ? String(changes.holidayUntil).slice(0, 10) : null;
  }
  await store.setJSON(RUNTIME_KEY, next);
  return next;
}

module.exports = {
  ALLOWED_STATUSES,
  assertOrderData,
  getRuntimeStatus,
  listOrders,
  savePaidOrder,
  updateOrder,
  updateRuntimeStatus,
};
