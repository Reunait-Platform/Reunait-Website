import HomepageSection from '../model/homepageModel.js';
import redis from '../services/redisClient.js';

// Controller to fetch a policy
export const getPolicy = async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['privacy', 'terms', 'refunds'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid policy type. Must be privacy, terms, or refunds.'
            });
        }

        // Redis Cache Keys
        const CACHE_KEY = `policy:cache:${type}`;
        const ENABLED_KEY = `policy:cache:${type}:enabled`;

        // Check Redis Cache
        try {
            const enabled = await redis.get(ENABLED_KEY);
            if (enabled === 'true') {
                const cached = await redis.get(CACHE_KEY);
                if (cached) {
                    return res.status(200).json({
                        success: true,
                        data: JSON.parse(cached)
                    });
                }
            }
        } catch (e) {
            console.error(`Redis read error for policy ${type}:`, e?.message || e);
        }

        // Fetch from MongoDB
        const policy = await HomepageSection.findOne({ section: type, isActive: true });

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: `Policy of type '${type}' not found.`
            });
        }

        const policyData = {
            title: policy.title,
            subtitle: policy.subtitle,
            sections: policy.data?.sections || []
        };

        // Write back to Redis cache
        try {
            await redis.set(CACHE_KEY, JSON.stringify(policyData));
            await redis.set(ENABLED_KEY, 'true');
        } catch (e) {
            console.error(`Redis write error for policy ${type}:`, e?.message || e);
        }

        // Return response
        return res.status(200).json({
            success: true,
            data: policyData
        });

    } catch (error) {
        console.error('Error in getPolicy:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch policy data.'
        });
    }
};


