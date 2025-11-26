const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const {
  getDemandesNotaire,
  getDemandeById,
  accepterDemande,
  formaliserConvention,
  enregistrerInscriptionHypothecaire,
  finaliserInscriptionHypothecaire,
  rejeterDemande,
} = require("../../controllers/notaire/demandeCreditHypothecaireController");

// Routes protégées pour les notaires
router.get("/", authMiddleware, getDemandesNotaire);
router.get("/:id", authMiddleware, getDemandeById);
router.put("/:id/accepter", authMiddleware, accepterDemande);
router.put("/:id/formaliser-convention", authMiddleware, formaliserConvention);
router.put("/:id/enregistrer-inscription", authMiddleware, enregistrerInscriptionHypothecaire);
router.put("/:id/finaliser-inscription", authMiddleware, finaliserInscriptionHypothecaire);
router.put("/:id/rejeter", authMiddleware, rejeterDemande);

module.exports = router;

