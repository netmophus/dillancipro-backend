const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const {
  // Villes
  createVille,
  getAllVilles,
  updateVille,
  deleteVille,
  // Quartiers
  createQuartier,
  getAllQuartiers,
  updateQuartier,
  deleteQuartier,
  // Zones
  createZone,
  getAllZones,
  updateZone,
  deleteZone,
} = require("../../controllers/admin/geographicController");

// ==================== VILLES ====================
// 🏛️ Seul l'admin peut gérer les données géographiques nationales
router.post("/villes", authMiddleware, authorizeRoles("Admin"), createVille);
router.get("/villes", authMiddleware, authorizeRoles("Admin"), getAllVilles);
router.put("/villes/:id", authMiddleware, authorizeRoles("Admin"), updateVille);
router.delete("/villes/:id", authMiddleware, authorizeRoles("Admin"), deleteVille);

// ==================== QUARTIERS ====================
router.post("/quartiers", authMiddleware, authorizeRoles("Admin"), createQuartier);
router.get("/quartiers", authMiddleware, authorizeRoles("Admin"), getAllQuartiers);
router.put("/quartiers/:id", authMiddleware, authorizeRoles("Admin"), updateQuartier);
router.delete("/quartiers/:id", authMiddleware, authorizeRoles("Admin"), deleteQuartier);

// ==================== ZONES ====================
router.post("/zones", authMiddleware, authorizeRoles("Admin"), createZone);
router.get("/zones", authMiddleware, authorizeRoles("Admin"), getAllZones);
router.put("/zones/:id", authMiddleware, authorizeRoles("Admin"), updateZone);
router.delete("/zones/:id", authMiddleware, authorizeRoles("Admin"), deleteZone);

module.exports = router;
