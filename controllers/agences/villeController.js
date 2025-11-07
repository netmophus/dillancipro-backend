const Ville = require("../../models/agences/Ville");

// 🏛️ NOTE: La création/modification/suppression des villes se fait via /api/admin/geographic/
// Les agences ne peuvent que consulter les villes (données partagées)

// 🔍 Récupérer toutes les villes (PARTAGÉES ENTRE TOUTES LES AGENCES)
exports.getAllVilles = async (req, res) => {
  try {
    console.log("📝 [GET_VILLES] User:", { id: req.user.id, role: req.user.role });
    
    // 🌐 DONNÉES PARTAGÉES: Toutes les agences voient toutes les villes
    const villes = await Ville.find().sort({ nom: 1 });
    console.log(`✅ [GET_VILLES] ${villes.length} villes trouvées (partagées entre toutes les agences)`);
    return res.status(200).json(villes);
    
  } catch (err) {
    console.error("❌ [GET_VILLES] Erreur:", err);
    res.status(500).json({ message: "Erreur lors du chargement des villes" });
  }
};