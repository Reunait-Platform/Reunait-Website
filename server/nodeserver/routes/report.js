import express from 'express';
import { clerkClient } from '@clerk/express';
import Case from '../model/caseModel.js';
import User from '../model/userModel.js';
import { broadcastNotification } from '../services/notificationBroadcast.js';

const router = express.Router();

// POST /api/report - Submit a report for a case
router.post('/report', async (req, res) => {
  try {

    const { caseId, addedBy, message, phoneNumber } = req.body;

    // Validate required fields
    if (!caseId || !addedBy || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: caseId, addedBy, and message are required'
      });
    }

    // Validate message length
    if (message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    // Find the case
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Find the case owner (user who added the case)
    const caseOwner = await User.findOne({ clerkUserId: caseData.caseOwner });
    if (!caseOwner) {
      return res.status(404).json({
        success: false,
        message: 'Case owner not found'
      });
    }

    // Append timeline event to the case (embedded)
    const clientIp = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || req.connection?.remoteAddress || 'Unknown'
    await Case.findByIdAndUpdate(caseId, {
      $push: { timelines: { message: message.trim(), time: new Date(), ipAddress: clientIp, phoneNumber: phoneNumber || null } }
    });

    // Add notification to the case owner's user document
    const notificationData = {
      message: `New tip received for ${caseData.fullName}`,
      time: new Date(),
      isRead: false,
      isClickable: true,
      navigateTo: `/cases/${String(caseData._id)}`
    };

    const updatedUser = await User.findOneAndUpdate(
      { clerkUserId: caseData.caseOwner },
      { $push: { notifications: notificationData } },
      { new: true }
    ).select('notifications').lean();

    // Broadcast notification via SSE
    if (updatedUser && updatedUser.notifications && updatedUser.notifications.length > 0) {
      const newNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
      const unreadCount = (updatedUser.notifications || []).filter(n => !n.isRead).length;
      try {
        broadcastNotification(caseData.caseOwner, {
          id: String(newNotification._id),
          message: newNotification.message || '',
          isRead: Boolean(newNotification.isRead),
          isClickable: newNotification.isClickable !== false,
          navigateTo: newNotification.navigateTo || null,
          time: newNotification.time || null,
          unreadCount,
        });
      } catch (error) {
        console.error('Error broadcasting report notification:', error);
        // Don't fail the request if broadcast fails
      }
    }

    // Update Clerk metadata to increment unread count
    try {
      const user = await clerkClient.users.getUser(caseData.caseOwner);
      const currentCount = user.publicMetadata?.unreadNotificationCount || 0;
      
      await clerkClient.users.updateUserMetadata(caseData.caseOwner, {
        publicMetadata: {
          ...user.publicMetadata,
          unreadNotificationCount: currentCount + 1
        }
      });
    } catch (error) {
      console.error('Error updating Clerk metadata for notification:', error);
      // Don't fail the request if metadata update fails
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Report submitted successfully'
    });

  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
