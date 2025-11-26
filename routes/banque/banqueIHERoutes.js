// routes/banque/banqueIHERoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const {
  createIHE,
  getIHEs,
  getIHEById,
  updateIHE,
  deleteIHE,
  validerIHE,
  rejeterIHE,
  getIHEStats,
  getIHEsPourCarte,
  getIHEsARisque,
} = require("../../controllers/banque/banqueIHEController");

const {
  addMedia,
  getMedias,
  updateMedia,
  deleteMedia,
} = require("../../controllers/banque/banqueIHEMediaController");

const {
  partagerIHEAvecAgence,
  getIHEsPartagees,
  retirerPartage,
  getAgencesActives,
} = require("../../controllers/banque/banqueIHEShareController");

// Routes principales IHE
router.post("/", authMiddleware, createIHE);
router.get("/", authMiddleware, getIHEs);

// Routes spécifiques (doivent être définies AVANT les routes paramétrées)
router.get("/stats", authMiddleware, getIHEStats);
router.get("/carte", authMiddleware, getIHEsPourCarte);
router.get("/alertes-reglementaires", authMiddleware, getIHEsARisque);
router.get("/partagees", authMiddleware, getIHEsPartagees);
router.get("/agences", authMiddleware, getAgencesActives); // Route spécifique avant /:id

// Routes paramétrées (doivent être définies APRÈS les routes spécifiques)
router.get("/:id", authMiddleware, getIHEById);
router.put("/:id", authMiddleware, updateIHE);
router.delete("/:id", authMiddleware, deleteIHE);

// Routes validation
router.post("/:id/valider", authMiddleware, validerIHE);
router.post("/:id/rejeter", authMiddleware, rejeterIHE);

// Routes partage avec agences
router.post("/:iheId/partager/:agenceId", authMiddleware, partagerIHEAvecAgence);
router.delete("/:iheId/partage/:agenceId", authMiddleware, retirerPartage);

// Routes médias
router.post("/:iheId/media", authMiddleware, addMedia);
router.get("/:iheId/media", authMiddleware, getMedias);
router.put("/:iheId/media/:mediaId", authMiddleware, updateMedia);
router.delete("/:iheId/media/:mediaId", authMiddleware, deleteMedia);

module.exports = router;

