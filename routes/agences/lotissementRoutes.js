const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/roleMiddleware");
const {
  createLotissement,
  updateLotissement,
  deleteLotissement,
  getAllLotissements,
  getIlotsByLotissement,
} = require("../../controllers/agences/lotissementController");
const uploadLotissements = require("../../middlewares/uploadLotissements");

router.post("/", authMiddleware, authorizeRoles("Agence"), uploadLotissements, createLotissement);
router.put("/:id", authMiddleware, authorizeRoles("Agence"), uploadLotissements, updateLotissement);
router.delete("/:id", authMiddleware, authorizeRoles("Agence"), deleteLotissement);
router.get("/", authMiddleware, authorizeRoles("Agence", "Commercial", "Admin"), getAllLotissements);
router.get("/:id/ilots", authMiddleware, authorizeRoles("Agence", "Commercial"), getIlotsByLotissement);

module.exports = router;
