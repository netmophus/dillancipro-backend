const Quartier = require("../../models/agences/Quartier");

// 🏛️ NOTE: La création/modification/suppression des quartiers se fait via /api/admin/geographic/
// Les agences ne peuvent que consulter les quartiers (données partagées)

// 🔍 Récupérer tous les quartiers (PARTAGÉS ENTRE TOUTES LES AGENCES)
exports.getAllQuartiers = async (req, res) => {
  try {
    console.log("📝 [GET_QUARTIERS] User:", { id: req.user.id, role: req.user.role });
    
    // 🌐 DONNÉES PARTAGÉES: Toutes les agences voient tous les quartiers
    const quartiers = await Quartier.find()
      .populate('ville', 'nom region codePostal')
      .sort({ nom: 1 });
    console.log(`✅ [GET_QUARTIERS] ${quartiers.length} quartiers trouvés (partagés entre toutes les agences)`);
    return res.status(200).json(quartiers);
    
  } catch (err) {
    console.error("❌ [GET_QUARTIERS] Erreur:", err);
    res.status(500).json({ message: "Erreur lors du chargement des quartiers" });
  }
};