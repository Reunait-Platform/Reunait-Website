import express from 'express';
import Case from '../model/caseModel.js';
import User from '../model/userModel.js';

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

    // Create notification object
    const notification = {
      message: message.trim(),
      time: new Date(),
      ipAddress: (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || req.connection.remoteAddress || 'Unknown',
      phoneNumber: phoneNumber || null,
      isRead: false
    };

    // Add notification to the case
    await Case.findByIdAndUpdate(caseId, {
      $push: { notifications: notification }
    });

    // Add notification to the case owner's user document
    await User.findOneAndUpdate(
      { clerkUserId: caseData.caseOwner },
      { $push: { notifications: notification } }
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Report submitted successfully',
      reportId: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
