const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/recus" });


const {
  enrollCommercial,
  getAllCommerciaux,
  affecterParcellesAuCommercial,
  getParcellesDuCommercial,
  getParcellesDisponiblesParIlot,
  getCommercialStats,
  affecterIlotsAuCommercial,
  getIlotsDuCommercial,
  deleteCommercial
} = require("../../controllers/agences/commercialController");

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");

// ➕ Créer un commercial
router.post("/", authMiddleware, authorizeRoles("Agence"), enrollCommercial);

// 📄 Récupérer la liste
router.get("/", authMiddleware, authorizeRoles("Agence"), getAllCommerciaux);



// 📄 Voir les parcelles affectées à un commercial
router.get("/:id/parcelles", authMiddleware, authorizeRoles("Agence", "Commercial"), getParcellesDuCommercial);


// ✅ Affecter des parcelles à un commercial
router.put("/:id/affecter", authMiddleware, authorizeRoles("Agence"), affecterParcellesAuCommercial);

// ✅ Parcelles disponibles d’un îlot pour un commercial
router.get(
  "/ilots/:id/parcelles-disponibles",
  authMiddleware,
  authorizeRoles("Commercial"),
  getParcellesDisponiblesParIlot
);



router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("Commercial"),
  getCommercialStats
);


router.put("/:id/affecter-ilots", authMiddleware, authorizeRoles("Agence"), affecterIlotsAuCommercial);

router.get("/:id/ilots", authMiddleware, authorizeRoles("Agence", "Commercial"), getIlotsDuCommercial);

// ❌ Supprimer un commercial
router.delete("/:id", authMiddleware, authorizeRoles("Agence"), deleteCommercial);

module.exports = router;
