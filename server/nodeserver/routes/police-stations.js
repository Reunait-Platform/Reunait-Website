import express from "express";
import { requireAuth } from "@clerk/express";
import PoliceStation from "../model/policeStationModel.js";

const router = express.Router();

// GET /api/police-stations/search
// Search police stations by country, state (optional), city (optional), and name query
router.get("/search", requireAuth(), async (req, res) => {
  try {
    const { country, state, city, query } = req.query;

    // Validate required parameters
    if (!country || typeof country !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: country is required"
      });
    }

    // Validate input lengths to prevent abuse
    if (country.trim().length > 64) {
      return res.status(400).json({
        success: false,
        message: "Country name is too long"
      });
    }

    if (state && typeof state === 'string' && state.trim().length > 64) {
      return res.status(400).json({
        success: false,
        message: "State name is too long"
      });
    }

    if (city && typeof city === 'string' && city.trim().length > 64) {
      return res.status(400).json({
        success: false,
        message: "City name is too long"
      });
    }

    // Build filter - country is required, state and city are optional
    const filter = {
      country: country.trim(),
      isActive: true
    };

    // Add state if provided, otherwise match empty/null/missing state
    if (state && state.trim()) {
      filter.state = state.trim();
    } else {
      filter.$or = [
        { state: "" },
        { state: null },
        { state: { $exists: false } }
      ];
    }

    // Add city if provided, otherwise match empty/null/missing city
    if (city && city.trim()) {
      filter.city = city.trim();
    } else {
      // If we already have $or for state, combine with $and
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: [{ city: "" }, { city: null }, { city: { $exists: false } }] }
        ];
        delete filter.$or;
      } else {
        filter.$or = [
          { city: "" },
          { city: null },
          { city: { $exists: false } }
        ];
      }
    }

    // Add name search if query provided
    if (query && query.trim()) {
      const searchTerm = query.trim();
      
      // Security: Sanitize regex special characters to prevent regex injection
      // Escape special regex characters for safety
      const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Validate input length (prevent DoS via very long regex)
      if (escapedSearchTerm.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search query is too long. Maximum 100 characters allowed."
        });
      }
      
      // Use regex for case-insensitive partial matching
      filter.name = { $regex: escapedSearchTerm, $options: 'i' };
    }

    // Query police stations
    const stations = await PoliceStation.find(filter)
      .select("_id name country state city")
      .sort({ name: 1 })
      .limit(20) // Limit results for autocomplete
      .lean();

    return res.json({
      success: true,
      data: stations.map(station => ({
        id: station._id.toString(),
        name: station.name,
        city: station.city,
        state: station.state,
        country: station.country
      }))
    });
  } catch (error) {
    console.error("[GET /api/police-stations/search]", error);
    return res.status(500).json({
      success: false,
      message: "Server error while searching police stations"
    });
  }
});

export default router;

