import User from "../model/userModel.js";

export function notificationsInterceptor(options = {}) {
  const {
    enabledHeader = "X-Include-Notifications",
    readLimit = 20,
  } = options;

  return async function notificationsMiddleware(req, res, next) {
    // Only attach for authenticated users when header is present
    try {
      const wantsNotifications = String(req.header(enabledHeader) || "").trim() === "1";
      if (!wantsNotifications) return next();

      // Patch res.json to inject notifications on success
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        try {
          const status = res.statusCode || 200;
          const is2xx = status >= 200 && status < 300;
          if (!is2xx) return originalJson(body);

          // Resolve auth user id (supports req.auth as function or object)
          const authInfo = typeof req.auth === "function" ? req.auth() : req.auth;
          const userId = authInfo?.userId;
          if (!userId) return originalJson(body);

          // Fetch notifications for the user
          const userDoc = await User.findOne({ clerkUserId: userId }).select("notifications").lean();
          const raw = Array.isArray(userDoc?.notifications) ? userDoc.notifications : [];

          // Sort by time desc
          const sorted = raw.slice().sort((a, b) => {
            const at = a?.time ? new Date(a.time).getTime() : 0;
            const bt = b?.time ? new Date(b.time).getTime() : 0;
            return bt - at;
          });

          const unread = sorted.filter((n) => n?.isRead !== true);
          const read = sorted.filter((n) => n?.isRead === true).slice(0, readLimit);

          const wire = (unread.concat(read)).map((n) => ({
            id: String(n._id),
            message: n.message || "",
            isRead: Boolean(n.isRead),
            isClickable: n.isClickable !== false,
            navigateTo: n.navigateTo || null,
            time: n.time || null,
          }));

          const unreadCount = unread.length;

          if (body && typeof body === "object") {
            const existingMeta = (body._meta && typeof body._meta === "object") ? body._meta : {};
            body = { ...body, _meta: { ...existingMeta, notifications: wire, unreadCount } };
          }
        } catch (e) {
          try { console.error("[notificationsInterceptor] attach failed", e); } catch {}
          // Fail-open: do not block the response
        }
        return originalJson(body);
      };
    } catch (e) {
      // If anything goes wrong, continue normally
    }
    return next();
  };
}

export default notificationsInterceptor;


