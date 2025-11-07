const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { getAllZones } = require("../../controllers/agences/zoneController");

// 🌐 LECTURE SEULE: Les agences peuvent seulement voir les zones (données partagées)
// 🏛️ La création/modification/suppression se fait via /api/admin/geographic/
router.get("/", authMiddleware, getAllZones); // Accessible à tous les rôles

module.exports = router;