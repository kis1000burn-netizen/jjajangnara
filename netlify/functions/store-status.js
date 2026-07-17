const { getRuntimeStatus } = require("./_orders");

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

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        posOnline,
        deliveryAvailable: posOnline && !holidayActive,
        holiday: holidayActive,
        holidayMessage: holidayActive ? runtime.holidayMessage : "",
        holidayUntil: holidayActive ? runtime.holidayUntil : null,
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
        message: error.message || "영업 상태를 확인하지 못했습니다.",
      }),
    };
  }
};
