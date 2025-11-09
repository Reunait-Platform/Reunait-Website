import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config/config.js";

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to get currency exponent (decimal places)
// Source: https://razorpay.com/docs/payments/international-payments/#supported-currencies
const getCurrencyExponent = (currency) => {
    const currencyUpper = currency.toUpperCase();
    return config.razorpay.currencyExponents[currencyUpper] ?? 2; // Default to 2 (most currencies)
};

// Helper function to check if currency is zero-decimal
const isZeroDecimalCurrency = (currency) => {
    return getCurrencyExponent(currency) === 0;
};

// Helper function to check if currency is three-decimal
const isThreeDecimalCurrency = (currency) => {
    return getCurrencyExponent(currency) === 3;
};

// Helper function to convert amount to smallest currency unit
// Razorpay requires amounts in smallest currency subunit
// Exponent 0: 1 unit = 1 subunit (e.g., ¥1 = 1 yen)
// Exponent 2: 1 unit = 100 subunits (e.g., ₹1 = 100 paise, $1 = 100 cents)
// Exponent 3: 1 unit = 1000 subunits (e.g., 1 BHD = 1000 fils)
const convertToSmallestUnit = (amount, currency) => {
    const exponent = getCurrencyExponent(currency);
    if (exponent === 0) {
        return Math.round(amount); // No conversion needed
    } else if (exponent === 3) {
        return Math.round(amount * 1000); // Convert to smallest unit (e.g., fils)
    } else {
        return Math.round(amount * 100); // Convert to paise/cents (default)
    }
};

// Helper function to convert from smallest unit to main unit
const convertFromSmallestUnit = (amount, currency) => {
    const exponent = getCurrencyExponent(currency);
    if (exponent === 0) {
        return amount; // No conversion needed
    } else if (exponent === 3) {
        return amount / 1000; // Convert from smallest unit
    } else {
        return amount / 100; // Convert from paise/cents (default)
    }
};

// POST /api/donations/create-order
// Create a Razorpay order for donation
// Best Practice: Dynamic currency support - accepts any valid ISO 4217 currency code
// Razorpay will validate amounts and return errors if invalid
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

        // Optional: Check if currency is in supported list (if configured)
        // Note: Razorpay supports 100+ currencies, so this is just a UI preference
        if (config.razorpay.supportedCurrencies.length > 0 && 
            !config.razorpay.supportedCurrencies.includes(currencyUpper)) {
            return res.status(400).json({
                success: false,
                message: `Currency ${currencyUpper} is not enabled. Supported currencies: ${config.razorpay.supportedCurrencies.join(", ")}`,
            });
        }

        // Validate amount
        if (!amount || typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid donation amount. Amount must be a positive number.",
            });
        }

        // Convert to smallest currency unit as per Razorpay requirements
        // Razorpay requires amounts in smallest currency subunit
        const amountInSmallestUnit = convertToSmallestUnit(amount, currencyUpper);
        
        // Basic validation: amount must be at least 1 in smallest unit
        if (amountInSmallestUnit < 1) {
            return res.status(400).json({
                success: false,
                message: "Amount is too small. Minimum amount is 1 in the smallest currency unit.",
            });
        }

        // Best Practice: Generate unique receipt to prevent duplicate orders
        // Receipt must be unique - using timestamp + random string ensures uniqueness
        const receiptId = `donation_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Create Razorpay order
        const options = {
            amount: amountInSmallestUnit, // Amount in smallest currency unit
            currency: currencyUpper, // Use uppercase currency code
            receipt: receiptId, // Unique receipt prevents duplicate orders
            notes: {
                purpose: "donation",
                platform: "reunait",
                currency: currencyUpper,
            },
        };

        // Best Practice: Create order with unique receipt (idempotency at application level)
        const order = await razorpay.orders.create(options);

        return res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
                isZeroDecimal: isZeroDecimalCurrency(currencyUpper),
                isThreeDecimal: isThreeDecimalCurrency(currencyUpper),
                exponent: getCurrencyExponent(currencyUpper),
            },
        });
    } catch (error) {
        try {
            console.error("[POST /api/donations/create-order]", error);
        } catch {}
        
        // Better error handling (best practice)
        if (error.error && error.error.description) {
            return res.status(400).json({
                success: false,
                message: error.error.description || "Failed to create donation order.",
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Failed to create donation order. Please try again.",
        });
    }
});

// POST /api/donations/verify-payment
// Verify payment signature and status after successful payment
// Best Practice: Verifies signature AND checks payment/order status from Razorpay API
router.post("/donations/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing payment verification data.",
            });
        }

        // Best Practice: Verify signature first
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest("hex");

        const isSignatureValid = generatedSignature === razorpay_signature;

        if (!isSignatureValid) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed. Invalid signature.",
            });
        }

        // Best Practice: Fetch and verify payment status from Razorpay API
        let payment, order;
        try {
            payment = await razorpay.payments.fetch(razorpay_payment_id);
            order = await razorpay.orders.fetch(razorpay_order_id);
        } catch (razorpayError) {
            try {
                console.error("[POST /api/donations/verify-payment] Razorpay API error:", razorpayError);
            } catch {}
            return res.status(500).json({
                success: false,
                message: "Failed to fetch payment details from Razorpay.",
            });
        }

        // Best Practice: Verify payment status is 'captured' and order status is 'paid'
        if (payment.status !== "captured") {
            return res.status(400).json({
                success: false,
                message: `Payment not captured. Current status: ${payment.status}`,
                data: {
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    status: payment.status,
                },
            });
        }

        if (order.status !== "paid") {
            return res.status(400).json({
                success: false,
                message: `Order not paid. Current status: ${order.status}`,
                data: {
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    orderStatus: order.status,
                    paymentStatus: payment.status,
                },
            });
        }

        // Best Practice: Verify amount matches
        if (payment.amount !== order.amount) {
            return res.status(400).json({
                success: false,
                message: "Payment amount mismatch with order amount.",
            });
        }

        return res.json({
            success: true,
            data: {
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: convertFromSmallestUnit(payment.amount, payment.currency),
                currency: payment.currency,
                status: payment.status,
                orderStatus: order.status,
                method: payment.method,
                createdAt: payment.created_at,
            },
            message: "Payment verified successfully.",
        });
    } catch (error) {
        try {
            console.error("[POST /api/donations/verify-payment]", error);
        } catch {}
        return res.status(500).json({
            success: false,
            message: "Payment verification failed. Please contact support.",
        });
    }
});

// POST /api/donations/callback
// Razorpay callback URL handler (for redirect flow)
// Best Practice: Callback URL receives POST data from Razorpay after payment
// This endpoint verifies payment and redirects user to frontend
// Official Docs: https://razorpay.com/docs/payments/payment-gateway/callback-url/
// Note: Razorpay sends data as form-encoded POST parameters
router.post("/donations/callback", async (req, res) => {
    try {
        // Razorpay sends payment details as POST parameters (form-encoded)
        // Handle both form-encoded and JSON (for flexibility)
        const razorpay_payment_id = req.body.razorpay_payment_id || req.body["razorpay_payment_id"];
        const razorpay_order_id = req.body.razorpay_order_id || req.body["razorpay_order_id"];
        const razorpay_signature = req.body.razorpay_signature || req.body["razorpay_signature"];
        const error = req.body.error || req.body["error"]; // Present if payment failed

        const frontendBase = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";

        // Handle payment failure
        if (error) {
            const errorDescription = error.description || error.reason || "Payment failed";
            const errorCode = error.code || "PAYMENT_FAILED";
            // Redirect to frontend with error status
            return res.redirect(`${frontendBase}/donate?payment_status=failed&error=${encodeURIComponent(errorDescription)}&error_code=${errorCode}`);
        }

        // Validate required parameters
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Missing payment details")}`);
        }

        // Verify payment signature
        const order = await razorpay.orders.fetch(razorpay_order_id);
        if (!order) {
            return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Order not found")}`);
        }

        // Generate signature for verification
        const message = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(message)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Invalid payment signature")}`);
        }

        // Fetch payment details
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (!payment) {
            return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Payment not found")}`);
        }

        // Verify payment status
        if (payment.status !== "captured") {
            return res.redirect(`${frontendBase}/donate?payment_status=failed&error=${encodeURIComponent(`Payment not captured. Status: ${payment.status}`)}`);
        }

        // Verify order status
        if (order.status !== "paid") {
            return res.redirect(`${frontendBase}/donate?payment_status=failed&error=${encodeURIComponent(`Order not paid. Status: ${order.status}`)}`);
        }

        // Verify amount matches
        if (payment.amount !== order.amount) {
            return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Payment amount mismatch")}`);
        }

        // Payment verified successfully - redirect to frontend with success status
        // Include payment details in URL for frontend to display
        const amount = convertFromSmallestUnit(payment.amount, payment.currency);
        return res.redirect(
            `${frontendBase}/donate?payment_status=success&payment_id=${razorpay_payment_id}&order_id=${razorpay_order_id}&amount=${amount}&currency=${payment.currency}`
        );
    } catch (error) {
        try {
            console.error("[POST /api/donations/callback]", error);
        } catch {}
        const frontendBase = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendBase}/donate?payment_status=error&error=${encodeURIComponent("Payment verification failed")}`);
    }
});

// POST /api/donations/webhook
// Razorpay webhook handler for payment events
// Best Practice: Webhooks provide real-time payment event notifications
// This route should be publicly accessible (no auth) but signature-verified
// Note: This route must use raw body parser (configured in index.js)
router.post("/donations/webhook", async (req, res) => {
    try {
        const webhookSignature = req.headers["x-razorpay-signature"];
        const webhookBody = req.body;

        if (!webhookSignature) {
            return res.status(400).json({
                success: false,
                message: "Missing webhook signature.",
            });
        }

        // Best Practice: Verify webhook signature
        // webhookBody is a Buffer when using raw body parser
        const text = webhookBody.toString();
        // Strict: Use only RAZORPAY_WEBHOOK_SECRET (do not fallback to key secret)
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            try {
                console.error("[POST /api/donations/webhook] Missing RAZORPAY_WEBHOOK_SECRET");
            } catch {}
            return res.status(500).json({
                success: false,
                message: "Webhook misconfigured. Missing RAZORPAY_WEBHOOK_SECRET.",
            });
        }
        const generatedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(text)
            .digest("hex");
        
        // Parse JSON body
        const webhookData = JSON.parse(text);

        const isSignatureValid = generatedSignature === webhookSignature;

        if (!isSignatureValid) {
            try {
                console.error("[POST /api/donations/webhook] Invalid webhook signature");
            } catch {}
            return res.status(400).json({
                success: false,
                message: "Invalid webhook signature.",
            });
        }

        const event = webhookData.event;
        const payload = webhookData.payload;

        // Best Practice: Handle different payment events
        switch (event) {
            case "payment.captured":
                // Payment successfully captured
                // You can update your database, send confirmation emails, etc.
                try {
                    console.log(`[WEBHOOK] Payment captured: ${payload.payment.entity.id}`);
                    // TODO: Store donation record in database
                    // TODO: Send confirmation email
                } catch (error) {
                    try {
                        console.error("[POST /api/donations/webhook] Error processing payment.captured:", error);
                    } catch {}
                }
                break;

            case "payment.failed":
                // Payment failed
                try {
                    console.log(`[WEBHOOK] Payment failed: ${payload.payment.entity.id}`);
                    // TODO: Log failed payment, notify user if needed
                } catch (error) {
                    try {
                        console.error("[POST /api/donations/webhook] Error processing payment.failed:", error);
                    } catch {}
                }
                break;

            case "order.paid":
                // Order marked as paid
                try {
                    console.log(`[WEBHOOK] Order paid: ${payload.order.entity.id}`);
                    // TODO: Update order status in database
                } catch (error) {
                    try {
                        console.error("[POST /api/donations/webhook] Error processing order.paid:", error);
                    } catch {}
                }
                break;

            default:
                // Handle other events if needed
                try {
                    console.log(`[WEBHOOK] Unhandled event: ${event}`);
                } catch {}
        }

        // Best Practice: Always return 200 to acknowledge receipt
        return res.status(200).json({ success: true, message: "Webhook received" });
    } catch (error) {
        try {
            console.error("[POST /api/donations/webhook]", error);
        } catch {}
        // Best Practice: Return 200 even on error to prevent Razorpay from retrying
        // Log the error for investigation
        return res.status(200).json({ success: false, message: "Webhook processing error" });
    }
});

// GET /api/donations/currencies
// Get supported currencies and their display information
// Best Practice: Dynamic currency configuration
router.get("/donations/currencies", async (req, res) => {
    try {
        // Industry Standard: Top 20-25 most popular currencies (industry best practice)
        // Major platforms (Stripe, PayPal, Shopify) show 15-30 currencies
        // This list covers ~90% of global payment volume
        // Users can override via SUPPORTED_CURRENCIES environment variable for more currencies
        const defaultCurrencies = [
            // Top 10 by global usage (most popular first - industry standard)
            'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'NZD',
            // Next 10-15 by regional importance
            'SGD', 'HKD', 'AED', 'SAR', 'MXN', 'BRL', 'ZAR', 'KRW', 'TRY', 'RUB',
            'THB', 'MYR', 'IDR', 'PHP', 'PKR'
        ];
        
        const currencies = (config.razorpay.supportedCurrencies.length > 0
            ? config.razorpay.supportedCurrencies
            : defaultCurrencies) // Industry-standard curated list (25 currencies)
            .map(code => ({
                code,
                isZeroDecimal: isZeroDecimalCurrency(code),
                isThreeDecimal: isThreeDecimalCurrency(code),
                exponent: getCurrencyExponent(code),
            }));

        return res.json({
            success: true,
            data: {
                currencies,
            },
        });
    } catch (error) {
        try {
            console.error("[GET /api/donations/currencies]", error);
        } catch {}
        return res.status(500).json({
            success: false,
            message: "Failed to fetch currency information.",
        });
    }
});

export default router;

