// routes/paiementPatrimoineRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const {
  initierPaiement,
  validerPaiement,
  getMesPaiements,
  getAllPaiements,
} = require("../controllers/paiementPatrimoineController");

// Routes client
router.post("/initier", authMiddleware, authorizeRoles("User", "Client"), initierPaiement);
router.get("/mes-paiements", authMiddleware, authorizeRoles("User", "Client"), getMesPaiements);

// Routes admin
router.post("/valider", authMiddleware, authorizeRoles("Admin"), validerPaiement);
router.get("/all", authMiddleware, authorizeRoles("Admin"), getAllPaiements);

module.exports = router;

