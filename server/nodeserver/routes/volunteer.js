import express from "express";
import mongoose from "mongoose";
import { requireAuth, clerkClient } from "@clerk/express";
import User from "../model/userModel.js";
import Case from "../model/caseModel.js";
import PoliceStation from "../model/policeStationModel.js";
import { deleteEmbeddings } from "../services/pineconeService.js";
import { broadcastNotification } from "../services/notificationBroadcast.js";

const router = express.Router();

// Volunteer role guard
async function requireVolunteer(req, res, next) {
  try {
    const { userId } = req.auth || {};
    if (!userId) return res.status(401).json({ status: "error", message: "Unauthorized" });
    const cu = await clerkClient.users.getUser(userId);
    const role = cu?.publicMetadata?.role;
    if (role !== "volunteer") {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }
    return next();
  } catch (e) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
}

// GET /api/volunteer/verifications
router.get("/verifications", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const country = typeof req.query.country === "string" ? req.query.country : "all";

    // Clerk list with offset-based pagination; filter by publicMetadata
    const offset = (page - 1) * limit;
    const list = await clerkClient.users.getUserList({ limit, offset, orderBy: "-created_at" });
    const pending = (list?.data || []).filter((u) => {
      const meta = u?.publicMetadata || {};
      return meta?.isVerified === false && meta?.role === "general_user";
    });

    // Enrich with Mongo user profile for location
    const items = await Promise.all(pending.map(async (u) => {
      const clerkUserId = u.id;
      const email = u?.primaryEmailAddress?.emailAddress || u?.emailAddresses?.[0]?.emailAddress || "";
      const createdAt = u?.createdAt || u?.created_at || undefined;
      const mongoUser = await User.findOne({ clerkUserId }).select("fullName country state city").lean();
      return {
        clerkUserId,
        name: mongoUser?.fullName || u?.firstName || "",
        email,
        joined: createdAt,
        country: country === "all" ? (mongoUser?.country || "Unknown") : (mongoUser?.country || "Unknown"),
        state: mongoUser?.state || "",
        city: mongoUser?.city || "",
      };
    }));

    const filtered = country === "all" ? items : items.filter((i) => (i.country || "").toLowerCase() === country.toLowerCase());

    // total is approximate to page slice; Clerk doesn't provide total count straightforwardly without iterating
    return res.json({ items: filtered, page, limit, total: filtered.length, hasMore: filtered.length === limit });
  } catch (err) {
    try { console.error("[GET /api/volunteer/verifications]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/volunteer/verifications/:clerkUserId/approve
router.post("/verifications/:clerkUserId/approve", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    if (!clerkUserId) return res.status(400).json({ status: "error", message: "Missing clerkUserId" });

    let cu;
    try {
      cu = await clerkClient.users.getUser(clerkUserId);
    } catch {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const meta = cu?.publicMetadata || {};
    if (meta.role === "police" && meta.isVerified === true) {
      return res.json({ status: "success", message: "Already approved." });
    }

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role: "police", isVerified: true, lastUpdated: new Date().toISOString() },
    });

    // Update Mongo User role
    const userDoc = await User.findOneAndUpdate(
      { clerkUserId },
      { $set: { role: "police" } },
      { new: true }
    ).lean();

    // Cascade: update user's cases to reflect police role
    if (userDoc && Array.isArray(userDoc.cases) && userDoc.cases.length > 0) {
      await Case.updateMany(
        { _id: { $in: userDoc.cases } },
        { $set: { reportedBy: "police", addedBy: "police" } }
      );
    }

    // Register police station in PoliceStation collection
    // Only create if station name and country exist (state and city are optional)
    if (userDoc && userDoc.fullName && userDoc.country) {
      try {
        // Build query for existing station check
        const findQuery = {
          name: userDoc.fullName.trim(),
          country: userDoc.country.trim()
        };

        // Add state if it exists, otherwise match empty/null/missing state
        if (userDoc.state && userDoc.state.trim()) {
          findQuery.state = userDoc.state.trim();
        } else {
          findQuery.$or = [
            { state: "" },
            { state: null },
            { state: { $exists: false } }
          ];
        }

        // Add city if it exists, otherwise match empty/null/missing city
        if (userDoc.city && userDoc.city.trim()) {
          findQuery.city = userDoc.city.trim();
        } else {
          // If we already have $or for state, combine with $and
          if (findQuery.$or) {
            findQuery.$and = [
              { $or: findQuery.$or },
              { $or: [{ city: "" }, { city: null }, { city: { $exists: false } }] }
            ];
            delete findQuery.$or;
          } else {
            findQuery.$or = [
              { city: "" },
              { city: null },
              { city: { $exists: false } }
            ];
          }
        }

        // Check if station already exists (same name + location)
        const existingStation = await PoliceStation.findOne(findQuery).lean();

        if (!existingStation) {
          // Create new police station entry
          await PoliceStation.create({
            name: userDoc.fullName.trim(),
            country: userDoc.country.trim(),
            state: (userDoc.state && userDoc.state.trim()) || "",
            city: (userDoc.city && userDoc.city.trim()) || "",
            registeredBy: clerkUserId,
            isActive: true
          });
        }
        // If station exists, we don't update it (keeps original registeredBy)
      } catch (error) {
        // Log error but don't fail the verification if station creation fails
        // This could happen due to unique constraint violation or other issues
        console.error('Error creating police station entry:', error.message || error);
      }
    }

    return res.json({ status: "success", message: "Verification approved. Role updated to police." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/verifications/:id/approve]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/volunteer/verifications/:clerkUserId/deny
router.post("/verifications/:clerkUserId/deny", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    if (!clerkUserId) return res.status(400).json({ status: "error", message: "Missing clerkUserId" });

    // Hard delete in Clerk only (keep Mongo user as-is per requirement)
    try {
      await clerkClient.users.deleteUser(clerkUserId);
    } catch {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    return res.status(204).end();
  } catch (err) {
    try { console.error("[POST /api/volunteer/verifications/:id/deny]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// GET /api/volunteer/flagged
router.get("/flagged", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const country = typeof req.query.country === "string" ? req.query.country : "all";
    const skip = (page - 1) * limit;

    const filter = { isFlagged: true };
    if (country !== "all") {
      filter.country = country;
    }

    const [items, total] = await Promise.all([
      Case.find(filter)
        .select("_id fullName status country state city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Case.countDocuments(filter),
    ]);

    const mapped = items.map((c) => ({
      caseId: String(c._id),
      fullName: c.fullName,
      status: c.status,
      country: c.country,
      state: c.state,
      city: c.city,
    }));

    return res.json({ items: mapped, page, limit, total, hasMore: total > skip + items.length });
  } catch (err) {
    try { console.error("[GET /api/volunteer/flagged]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/volunteer/flagged/:caseId/unflag
router.post("/flagged/:caseId/unflag", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(404).json({ status: "error", message: "Case not found" });
    const c = await Case.findById(caseId);
    if (!c) return res.status(404).json({ status: "error", message: "Case not found" });

    c.isFlagged = false;
    c.showCase = true;
    // timeline entry
    c.timelines.push({ message: "Case unflagged by volunteer" });
    await c.save();

    // Notify owner
    if (c.caseOwner) {
      const notificationData = {
        message: `Your case '${c.fullName || ""}' is no longer under review.`,
        time: new Date(),
        isRead: false,
        isClickable: false,
        navigateTo: null
      };

      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: c.caseOwner },
        { $push: { notifications: notificationData } },
        { new: true }
      ).select('notifications').lean().catch(() => null);

      // Broadcast notification via SSE
      if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
        const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
        const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
        try {
          broadcastNotification(c.caseOwner, {
            id: String(newNotification._id),
            message: newNotification.message || '',
            isRead: Boolean(newNotification.isRead),
            isClickable: newNotification.isClickable !== false,
            navigateTo: newNotification.navigateTo || null,
            time: newNotification.time || null,
            unreadCount,
          });
        } catch (error) {
          console.error('Error broadcasting unflag notification:', error);
        }
      }

      // Update Clerk metadata to increment unread count
      try {
        const user = await clerkClient.users.getUser(c.caseOwner);
        const currentCount = user.publicMetadata?.unreadNotificationCount || 0;
        
        await clerkClient.users.updateUserMetadata(c.caseOwner, {
          publicMetadata: {
            ...user.publicMetadata,
            unreadNotificationCount: currentCount + 1
          }
        });
      } catch (error) {
        console.error('Error updating Clerk metadata for unflag notification:', error);
        // Don't fail the request if metadata update fails
      }
    }

    return res.json({ status: "success", message: "Case unflagged and made visible." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/flagged/:id/unflag]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/volunteer/flagged/:caseId/hide
router.post("/flagged/:caseId/hide", requireAuth(), requireVolunteer, async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(404).json({ status: "error", message: "Case not found" });
    const c = await Case.findById(caseId);
    if (!c) return res.status(404).json({ status: "error", message: "Case not found" });

    c.showCase = false;
    // timeline entry
    c.timelines.push({ message: "Case hidden by volunteer" });
    await c.save();

    // Best-effort Pinecone cleanup
    try { await deleteEmbeddings(caseId, c.country); } catch (e) { try { console.error("Pinecone delete failed", e?.message || e); } catch {} }

    // Notify owner
    if (c.caseOwner) {
      const notificationData = {
        message: `Your case '${c.fullName || ""}' was removed due to guideline violations.`,
        time: new Date(),
        isRead: false,
        isClickable: false,
        navigateTo: null
      };

      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: c.caseOwner },
        { $push: { notifications: notificationData } },
        { new: true }
      ).select('notifications').lean().catch(() => null);

      // Broadcast notification via SSE
      if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
        const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
        const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
        try {
          broadcastNotification(c.caseOwner, {
            id: String(newNotification._id),
            message: newNotification.message || '',
            isRead: Boolean(newNotification.isRead),
            isClickable: newNotification.isClickable !== false,
            navigateTo: newNotification.navigateTo || null,
            time: newNotification.time || null,
            unreadCount,
          });
        } catch (error) {
          console.error('Error broadcasting hide notification:', error);
        }
      }

      // Update Clerk metadata to increment unread count
      try {
        const user = await clerkClient.users.getUser(c.caseOwner);
        const currentCount = user.publicMetadata?.unreadNotificationCount || 0;
        
        await clerkClient.users.updateUserMetadata(c.caseOwner, {
          publicMetadata: {
            ...user.publicMetadata,
            unreadNotificationCount: currentCount + 1
          }
        });
      } catch (error) {
        console.error('Error updating Clerk metadata for hide notification:', error);
        // Don't fail the request if metadata update fails
      }
    }

    return res.json({ status: "success", message: "Case hidden due to guideline violations." });
  } catch (err) {
    try { console.error("[POST /api/volunteer/flagged/:id/hide]", err); } catch {}
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

export default router;


