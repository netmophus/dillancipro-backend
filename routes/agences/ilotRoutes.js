const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const {
  createIlot,
  updateIlot,
  deleteIlot,
  getAllIlots,
  getParcellesByIlot,
} = require("../../controllers/agences/ilotController");

// ➕ Créer un îlot
router.post("/", authMiddleware, authorizeRoles("Agence"), createIlot);

// ✏️ Modifier un îlot
router.put("/:id", authMiddleware, authorizeRoles("Agence"), updateIlot);

// ❌ Supprimer un îlot
router.delete("/:id", authMiddleware, authorizeRoles("Agence"), deleteIlot);

// ✅ Récupérer tous les îlots
router.get("/",  authMiddleware, authorizeRoles("Agence", "Commercial", "Admin"), getAllIlots);

router.get("/:id/parcelles", authMiddleware, authorizeRoles("Agence","Commercial"), getParcellesByIlot);

module.exports = router;
