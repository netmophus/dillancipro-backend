const express = require("express");
const router = express.Router();
const multer = require("multer");


const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const { enregistrerPaiement, ajouterPaiementPartiel, getParcellesVendues, getPaiementsPartiels ,  getPaiementsPartielsStats,  getEncaissementsTotaux , getPaiementById, assignerNotaireAVente, transférerAuNotaireParCommercial} = require("../../controllers/agences/paiementController");
const { uploadRecuCloudinary } = require("../../middlewares/uploadRecuCloudinary");


// 🔒 Route pour enregistrer un paiement (total ou partiel)
router.post(
  "/vendre/:parcelleId",
  authMiddleware,
  authorizeRoles("Commercial"),
  uploadRecuCloudinary,
  enregistrerPaiement
);

// 🔄 Route pour ajouter un paiement partiel à un paiement existant
router.post(
  "/paiement-partiel/:paiementId",
  authMiddleware,
  authorizeRoles("Commercial"),
  uploadRecuCloudinary,
  ajouterPaiementPartiel
);

// Routes GET spécifiques (AVANT les routes génériques)
router.get(
  "/parcelles-vendues",
  authMiddleware,
  authorizeRoles("Commercial"),
  getParcellesVendues
);

router.get("/stats/partiels", authMiddleware, authorizeRoles("Commercial"), getPaiementsPartielsStats);
router.get("/stats/encaissements", authMiddleware, authorizeRoles("Commercial"), getEncaissementsTotaux);

// Liste des paiements partiels d'un paiement
router.get(
  "/partiels/:paiementId",
  authMiddleware,
  authorizeRoles("Commercial"),
  getPaiementsPartiels
);

// Routes PUT pour les ventes (AVANT les routes génériques)
// Route pour assigner un notaire à une vente de parcelle (pour l'agence)
router.put(
  "/vente/:venteId/notaire",
  authMiddleware,
  authorizeRoles("Agence", "Admin"),
  assignerNotaireAVente
);

// Route pour transférer une vente au notaire par le commercial (après paiement complet)
// Route sans accent pour éviter les problèmes d'encodage
router.put(
  "/vente/:venteId/transferer-notaire",
  authMiddleware,
  authorizeRoles("Commercial"),
  transférerAuNotaireParCommercial
);

// Route alternative avec accent (pour compatibilité)
router.put(
  "/vente/:venteId/transférer-notaire",
  authMiddleware,
  authorizeRoles("Commercial"),
  transférerAuNotaireParCommercial
);

// Détail d'un paiement (route générique avec paramètres - DOIT être en dernier)
router.get(
  "/:paiementId",
  authMiddleware,
  authorizeRoles("Commercial"),
  getPaiementById
);

module.exports = router;
