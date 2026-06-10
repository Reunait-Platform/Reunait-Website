import axios from 'axios';
import { config } from '../config/config.js';

/**
 * Triggers revalidation on the frontend for a given cache tag.
 * This runs asynchronously (fire-and-forget) and is completely non-blocking.
 * 
 * @param {string} tag - The cache tag to revalidate (e.g. 'homepage')
 */
export const triggerRevalidation = async (tag) => {
    try {
        const secret = process.env.REVALIDATE_SECRET;
        if (!secret) {
            console.warn('[Revalidation Service] REVALIDATE_SECRET is not configured. Webhook skipped.');
            return;
        }

        // Get and sanitize frontendUrl
        let rawUrl = config.frontendUrl || '';
        rawUrl = rawUrl.trim();

        if (!rawUrl) {
            console.warn('[Revalidation Service] frontendUrl is not configured. Webhook skipped.');
            return;
        }

        // Normalize protocol
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            const isProd = process.env.NODE_ENV === 'production';
            rawUrl = (isProd ? 'https://' : 'http://') + rawUrl;
        }

        // Remove trailing slashes
        rawUrl = rawUrl.replace(/\/+$/, '');

        const revalidateUrl = `${rawUrl}/api/revalidate?tag=${tag}&secret=${secret}`;

        console.log(`[Revalidation Service] Triggering revalidation for tag "${tag}" on url: ${rawUrl}`);

        // Fire-and-forget with a short timeout so we never block backend execution
        axios.post(revalidateUrl, {}, { timeout: 3000 })
            .then((res) => {
                console.log(`[Revalidation Service] Webhook response for tag "${tag}":`, res.data);
            })
            .catch((err) => {
                console.warn(`[Revalidation Service] Webhook request failed for tag "${tag}":`, err.message || err);
            });

    } catch (e) {
        console.error('[Revalidation Service] Error preparing revalidation webhook:', e.message || e);
    }
};
