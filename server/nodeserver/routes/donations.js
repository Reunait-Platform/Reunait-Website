import express from "express";
import DodoPayments from "dodopayments";
import { Webhook } from "svix";
import { config } from "../config/config.js";

const router = express.Router();

// Initialize DodoPayments instance
const dodoPayments = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: process.env.DODO_PAYMENTS_ENV || (process.env.NODE_ENV === "production" ? "live_mode" : "test_mode"),
});

// Helper function to get currency exponent (decimal places)
const getCurrencyExponent = (currency) => {
    const currencyUpper = currency.toUpperCase();
    return config.razorpay?.currencyExponents?.[currencyUpper] ?? 2; // Default to 2 (most currencies)
};

// Helper function to convert amount to smallest currency unit (e.g. cents, paise)
const convertToSmallestUnit = (amount, currency) => {
    const exponent = getCurrencyExponent(currency);
    if (exponent === 0) {
        return Math.round(amount);
    } else if (exponent === 3) {
        return Math.round(amount * 1000);
    } else {
        return Math.round(amount * 100);
    }
};

// Helper function to convert from smallest unit to main unit
const convertFromSmallestUnit = (amount, currency) => {
    const exponent = getCurrencyExponent(currency);
    if (exponent === 0) {
        return amount;
    } else if (exponent === 3) {
        return amount / 1000;
    } else {
        return amount / 100;
    }
};

// POST /api/donations/create-order
// Create a Dodo Payments checkout session for donation
router.post("/donations/create-order", async (req, res) => {
    try {
        const { amount, currency = "INR" } = req.body;

        // Validate currency format (ISO 4217: 3-letter uppercase code)
        const currencyUpper = currency.toUpperCase();
        if (!/^[A-Z]{3}$/.test(currencyUpper)) {
            return res.status(400).json({
                success: false,
                message: "Invalid currency code. Currency must be a valid ISO 4217 code (e.g., INR, USD, EUR).",
            });
        }

        // Validate amount
        if (!amount || typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid donation amount. Amount must be a positive number.",
            });
        }

        // Convert to smallest currency unit as per Dodo Payments requirements
        const amountInSmallestUnit = convertToSmallestUnit(amount, currencyUpper);
        
        if (amountInSmallestUnit < 1) {
            return res.status(400).json({
                success: false,
                message: "Amount is too small. Minimum amount is 1 in the smallest currency unit.",
            });
        }

        const backendBase = process.env.BACKEND_URL || "http://localhost:3001";
        const returnUrl = `${backendBase}/api/donations/callback?amount=${amount}&currency=${currencyUpper}`;

        // Create Dodo Payments checkout session
        const session = await dodoPayments.checkoutSessions.create({
            product_cart: [
                {
                    product_id: process.env.DODO_PAYMENTS_PRODUCT_ID,
                    quantity: 1,
                    amount: amountInSmallestUnit,
                }
            ],
            billing_currency: currencyUpper,
            metadata: {
                purpose: "donation",
                platform: "reunait",
                currency: currencyUpper,
                amount: amount.toString()
            },
            return_url: returnUrl,
        });

        return res.json({
            success: true,
            data: {
                checkoutUrl: session.checkout_url,
                sessionId: session.session_id,
                amount: amountInSmallestUnit,
                currency: currencyUpper,
            },
        });
    } catch (error) {
        try {
            console.error("[POST /api/donations/create-order]", error);
        } catch {}
        
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create donation checkout session. Please try again.",
        });
    }
});

// POST /api/donations/verify-payment
// Verify payment status after successful payment (either via redirect or overlay callback)
router.post("/donations/verify-payment", async (req, res) => {
    try {
        const paymentId = req.body.payment_id || req.body.razorpay_payment_id;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "Missing payment verification data.",
            });
        }

        // Fetch payment details from Dodo Payments API
        const payment = await dodoPayments.payments.retrieve(paymentId);

        // Verify payment status is succeeded/completed
        const isSuccess = payment.status === "succeeded" || payment.status === "completed";
        if (!isSuccess) {
            const failureReason = payment.error || `Payment not completed. Current status: ${payment.status}`;
            return res.status(400).json({
                success: false,
                message: failureReason,
                data: {
                    paymentId,
                    status: payment.status,
                },
            });
        }

        const mainAmount = convertFromSmallestUnit(payment.amount, payment.currency);

        return res.json({
            success: true,
            data: {
                paymentId: payment.id,
                orderId: payment.id, // For frontend backwards compatibility
                amount: mainAmount,
                currency: payment.currency,
                status: payment.status,
            },
            message: "Payment verified successfully.",
        });
    } catch (error) {
        try {
            console.error("[POST /api/donations/verify-payment]", error);
        } catch {}
        return res.status(500).json({
            success: false,
            message: error.message || "Payment verification failed. Please contact support.",
        });
    }
});

// GET & POST /api/donations/callback
// Dodo callback handler (handles both GET redirect from Dodo checkout page and any POST fallbacks)
const handleCallback = async (req, res) => {
    try {
        const paymentId = req.query?.payment_id || req.body?.payment_id;
        const status = req.query?.status || req.body?.status;
        const error = req.query?.error || req.body?.error;

        const frontendBase = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";

        if (error || status === "failed") {
            const errorDescription = error || "Payment failed";
            return res.redirect(`${frontendBase}/donate?payment_status=failed&error=${encodeURIComponent(errorDescription)}`);
        }

        if (!paymentId) {
            return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Missing payment details")}`);
        }

        // Retrieve and verify the payment
        const payment = await dodoPayments.payments.retrieve(paymentId);
        
        const isSuccess = payment.status === "succeeded" || payment.status === "completed";
        if (!isSuccess) {
            return res.redirect(`${frontendBase}/donate?payment_status=failed&error=${encodeURIComponent(`Payment not successful. Status: ${payment.status}`)}`);
        }

        const amount = convertFromSmallestUnit(payment.amount, payment.currency);

        // Redirect directly to frontend thank-you page with success parameters
        return res.redirect(
            `${frontendBase}/donate/thank-you?payment_id=${payment.id}&order_id=${payment.id}&amount=${amount}&currency=${payment.currency}`
        );
    } catch (error) {
        try {
            console.error("[CALLBACK /api/donations/callback]", error);
        } catch {}
        const frontendBase = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Payment verification failed")}`);
    }
};

router.get("/donations/callback", handleCallback);
router.post("/donations/callback", handleCallback);

// POST /api/donations/webhook
// Dodo Payments webhook handler (verified using Svix)
router.post("/donations/webhook", async (req, res) => {
    try {
        const webhookId = req.headers["webhook-id"] || req.headers["x-webhook-id"];
        const webhookSignature = req.headers["webhook-signature"] || req.headers["x-webhook-signature"];
        const webhookTimestamp = req.headers["webhook-timestamp"] || req.headers["x-webhook-timestamp"];
        const webhookBody = req.body;

        if (!webhookSignature || !webhookId || !webhookTimestamp) {
            return res.status(400).json({
                success: false,
                message: "Missing webhook headers.",
            });
        }

        const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
        if (!webhookSecret) {
            try {
                console.error("[POST /api/donations/webhook] Missing DODO_PAYMENTS_WEBHOOK_SECRET");
            } catch {}
            return res.status(500).json({
                success: false,
                message: "Webhook signing secret is not configured.",
            });
        }

        // Verify webhook signature using Svix
        const wh = new Webhook(webhookSecret);
        let payload;
        try {
            payload = wh.verify(webhookBody.toString(), {
                "webhook-id": webhookId,
                "webhook-signature": webhookSignature,
                "webhook-timestamp": webhookTimestamp,
            });
        } catch (err) {
            try {
                console.error("[POST /api/donations/webhook] Webhook verification failed:", err.message);
            } catch {}
            return res.status(400).json({
                success: false,
                message: "Invalid webhook signature.",
            });
        }

        const eventType = payload.type;
        const paymentData = payload.data;

        // Process Dodo Payments webhook events
        switch (eventType) {
            case "payment.succeeded":
                try {
                    console.log(`[WEBHOOK] Dodo Payment captured: ${paymentData.payment_id || paymentData.id}`);
                    // TODO: Store donation record in database
                    // TODO: Send confirmation email using Resend
                } catch (error) {
                    try {
                        console.error("[POST /api/donations/webhook] Error processing payment.succeeded:", error);
                    } catch {}
                }
                break;

            case "payment.failed":
                try {
                    console.log(`[WEBHOOK] Dodo Payment failed: ${paymentData.payment_id || paymentData.id}`);
                } catch (error) {
                    try {
                        console.error("[POST /api/donations/webhook] Error processing payment.failed:", error);
                    } catch {}
                }
                break;

            default:
                try {
                    console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
                } catch {}
        }

        return res.status(200).json({ success: true, message: "Webhook received" });
    } catch (error) {
        try {
            console.error("[POST /api/donations/webhook]", error);
        } catch {}
        return res.status(200).json({ success: false, message: "Webhook processing error" });
    }
});

export default router;
