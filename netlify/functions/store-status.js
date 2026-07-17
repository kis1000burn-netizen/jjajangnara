const { getRuntimeStatus } = require("./_orders");

function getSeoulMinutesNow(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return hour * 60 + minute;
}

function isWithinBusinessHours(runtime, now) {
  if (runtime.forceOpen) return true;
  if (runtime.forceClosed) return false;
  const current = getSeoulMinutesNow(now);
  const open = Number(runtime.openMinutes);
  const close = Number(runtime.closeMinutes);
  if (!(close > open)) return false;
  return current >= open && current < close;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const runtime = await getRuntimeStatus(event);
    const now = new Date();
    const todayInSeoul = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const heartbeatTime = runtime.heartbeatAt ? new Date(runtime.heartbeatAt).getTime() : 0;
    const posOnline = heartbeatTime > 0 && (now.getTime() - heartbeatTime) < 60000;
    const holidayActive = runtime.holiday && (
      !runtime.holidayUntil || runtime.holidayUntil >= todayInSeoul
    );
    const withinHours = isWithinBusinessHours(runtime, now);
    const deliveryAvailable = posOnline && !holidayActive && withinHours && !runtime.forceClosed;

    let closedReason = "";
    if (holidayActive) closedReason = "holiday";
    else if (runtime.forceClosed) closedReason = "forceClosed";
    else if (!withinHours) closedReason = "outsideHours";
    else if (!posOnline) closedReason = "posOffline";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        posOnline,
        deliveryAvailable,
        holiday: holidayActive,
        holidayMessage: holidayActive ? runtime.holidayMessage : "",
        holidayUntil: holidayActive ? runtime.holidayUntil : null,
        forceClosed: Boolean(runtime.forceClosed),
        forceOpen: Boolean(runtime.forceOpen),
        withinHours,
        openMinutes: runtime.openMinutes,
        closeMinutes: runtime.closeMinutes,
        closedReason,
        heartbeatAt: runtime.heartbeatAt,
        checkedAt: now.toISOString(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        posOnline: false,
        deliveryAvailable: false,
        holiday: false,
        holidayMessage: "",
        forceClosed: false,
        withinHours: false,
        closedReason: "error",
        message: error.message || "영업 상태를 확인하지 못했습니다.",
      }),
    };
  }
};
