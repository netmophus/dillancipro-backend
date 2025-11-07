// routes/agences/agenceStatsRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const { getAgenceStats, getAgenceProfile } = require("../../controllers/agences/agenceStatsController");

// 📊 Statistiques de l'agence
router.get("/stats", authMiddleware, authorizeRoles("Agence", "Admin"), getAgenceStats);

// 🏢 Informations de l'agence
router.get("/profile", authMiddleware, authorizeRoles("Agence", "Admin"), getAgenceProfile);

module.exports = router;

