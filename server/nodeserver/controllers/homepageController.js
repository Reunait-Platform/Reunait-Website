// Homepage data controller
// This endpoint is public and doesn't require authentication

import HomepageSection from '../model/homepageModel.js';
import redis from '../services/redisClient.js';

export const getHomepageData = async (req, res) => {
    try {
        // Redis keys
        const CACHE_KEY = 'homepage:cache';
        const ENABLED_KEY = 'homepage:cache:enabled';

        // Check if cache is enabled and present
        try {
            const enabled = await redis.get(ENABLED_KEY);
            if (enabled === 'true') {
                const cached = await redis.get(CACHE_KEY);
                if (cached) {
                    const json = JSON.parse(cached);
                    return res.status(200).json(json);
                }
            }
        } catch (e) {
            // On Redis error, fall back to DB fetch
            console.error('Homepage cache read error:', e?.message || e);
        }

        // Fetch homepage data from MongoDB (fresh)
        const homepageData = await HomepageSection.getHomepageData();

        // Write to Redis (best-effort)
        try {
            await redis.set(CACHE_KEY, JSON.stringify(homepageData));
            await redis.set(ENABLED_KEY, 'true');
        } catch (e) {
            console.error('Homepage cache write error:', e?.message || e);
        }

        // CORS headers (no HTTP cache headers to keep response always fresh via Redis policy)
        res.set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        });

        res.status(200).json(homepageData);

    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch homepage data',
            data: []
        });
    }
};

