// controllers/agences/notaireController.js
const Notaire = require("../../models/Notaire");

/**
 * Récupérer tous les notaires actifs (route publique - sans authentification)
 * GET /api/agence/notaires/public
 */
exports.getNotairesActifsPublic = async (req, res) => {
  try {
    const notaires = await Notaire.find({ statut: "actif" })
      .select("fullName email phone cabinetName ville quartier adresse")
      .sort({ fullName: 1 })
      .limit(20); // Limiter à 20 notaires pour la homepage

    console.log(`✅ ${notaires.length} notaires publics récupérés`);

    return res.status(200).json({
      message: "Notaires publics récupérés avec succès",
      notaires,
      total: notaires.length
    });
  } catch (error) {
    console.error("❌ Erreur récupération notaires publics:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les notaires actifs (pour sélection dans formulaire de vente)
 * GET /api/agence/notaires/actifs
 */
exports.getNotairesActifs = async (req, res) => {
  try {
    const notaires = await Notaire.find({ statut: "actif" })
      .select("fullName email phone cabinetName ville quartier")
      .sort({ fullName: 1 });

    return res.status(200).json(notaires);
  } catch (error) {
    console.error("❌ Erreur récupération notaires actifs:", error);
    return res.status(500).json({ message: error.message });
  }
};

