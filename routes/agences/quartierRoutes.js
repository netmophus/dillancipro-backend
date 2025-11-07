const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { getAllQuartiers } = require("../../controllers/agences/quartierController");

// 🌐 LECTURE SEULE: Les agences peuvent seulement voir les quartiers (données partagées)
// 🏛️ La création/modification/suppression se fait via /api/admin/geographic/
router.get("/", authMiddleware, getAllQuartiers); // Accessible à tous les rôles

module.exports = router;