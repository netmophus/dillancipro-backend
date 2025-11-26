const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const {
  createDemande,
  getDemandesBanque,
  getDemandeById,
  updateDemande,
  annulerDemande,
  getStatsDemandes,
  marquerCreditOctroye,
} = require("../../controllers/banque/demandeCreditHypothecaireController");

// Routes protégées pour les banques
router.post("/", authMiddleware, createDemande);
router.get("/", authMiddleware, getDemandesBanque);
router.get("/stats", authMiddleware, getStatsDemandes);
router.get("/:id", authMiddleware, getDemandeById);
router.put("/:id", authMiddleware, updateDemande);
router.put("/:id/annuler", authMiddleware, annulerDemande);
router.put("/:id/credit-octroye", authMiddleware, marquerCreditOctroye);

module.exports = router;

