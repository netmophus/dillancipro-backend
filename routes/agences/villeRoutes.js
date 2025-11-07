const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const { getAllVilles } = require("../../controllers/agences/villeController");

// 🌐 LECTURE SEULE: Les agences peuvent seulement voir les villes (données partagées)
// 🏛️ La création/modification/suppression se fait via /api/admin/geographic/
router.get("/", authMiddleware, getAllVilles); // Accessible à tous les rôles

module.exports = router;
