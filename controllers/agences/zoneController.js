const Zone = require("../../models/agences/Zone");

// 🏛️ NOTE: La création/modification/suppression des zones se fait via /api/admin/geographic/
// Les agences ne peuvent que consulter les zones (données partagées)

// 🔍 Récupérer toutes les zones (PARTAGÉES ENTRE TOUTES LES AGENCES)
exports.getAllZones = async (req, res) => {
  try {
    console.log("📝 [GET_ZONES] User:", { id: req.user.id, role: req.user.role });
    
    // 🌐 DONNÉES PARTAGÉES: Toutes les agences voient toutes les zones
    const zones = await Zone.find()
      .populate('quartier', 'nom')
      .populate({
        path: 'quartier',
        populate: { path: 'ville', select: 'nom region' }
      })
      .sort({ nom: 1 });
    console.log(`✅ [GET_ZONES] ${zones.length} zones trouvées (partagées entre toutes les agences)`);
    return res.status(200).json(zones);
    
  } catch (err) {
    console.error("❌ [GET_ZONES] Erreur:", err);
    res.status(500).json({ message: "Erreur lors du chargement des zones" });
  }
};