// routes/ventePatrimoineRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const {
  soumettreVente,
  getMesVentes,
  getAllVentes,
  validerVente,
  rejeterVente,
  marquerVendue,
  annulerVente,
  contreProposer,
  accepterContreProposition,
  refuserContreProposition,
} = require("../controllers/ventePatrimoineController");

// Routes client
router.post("/soumettre", authMiddleware, authorizeRoles("User", "Client"), soumettreVente);
router.get("/mes-ventes", authMiddleware, authorizeRoles("User", "Client"), getMesVentes);
router.put("/:id/accepter-contre-proposition", authMiddleware, authorizeRoles("User", "Client"), accepterContreProposition);
router.put("/:id/refuser-contre-proposition", authMiddleware, authorizeRoles("User", "Client"), refuserContreProposition);
router.delete("/:id/annuler", authMiddleware, authorizeRoles("User", "Client"), annulerVente);

// Routes admin
router.get("/all", authMiddleware, authorizeRoles("Admin"), getAllVentes);
router.put("/:id/contre-proposer", authMiddleware, authorizeRoles("Admin"), contreProposer);
router.post("/:id/valider", authMiddleware, authorizeRoles("Admin"), validerVente);
router.post("/:id/rejeter", authMiddleware, authorizeRoles("Admin"), rejeterVente);
router.post("/:id/marquer-vendue", authMiddleware, authorizeRoles("Admin"), marquerVendue);

module.exports = router;

