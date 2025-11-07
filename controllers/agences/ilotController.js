// controllers/agences/ilotController.js
const Ilot = require("../../models/agences/Ilot");
const Zone = require("../../models/agences/Zone");
const Quartier = require("../../models/agences/Quartier");
const Parcelle = require("../../models/agences/Parcelle");


// ➕ Créer un îlot (agence déduite via l'utilisateur connecté)
exports.createIlot = async (req, res) => {
  try {
    console.log("📝 [CREATE_ILOT] Début création îlot");
    console.log("📝 [CREATE_ILOT] Body:", req.body);
    console.log("📝 [CREATE_ILOT] User:", { id: req.user.id, role: req.user.role, agenceId: req.user.agenceId });

    const { numeroIlot, zone, quartier, surfaceTotale } = req.body;
    if (!zone || !quartier) {
      return res.status(400).json({ message: "zone et quartier sont requis." });
    }

    // Vérifier que l'utilisateur a une agence (sauf pour Admin)
    if (req.user.role !== "Admin" && !req.user.agenceId) {
      return res.status(400).json({ message: "Aucune agence associée à cet utilisateur." });
    }

    const z = await Zone.findById(zone).select("quartier nom");
    if (!z) return res.status(404).json({ message: "Zone introuvable." });

    const q = await Quartier.findById(quartier).select("nom");
    if (!q) return res.status(404).json({ message: "Quartier introuvable." });

    console.log("📝 [CREATE_ILOT] Zone:", { _id: z._id, nom: z.nom, quartier: z.quartier });
    console.log("📝 [CREATE_ILOT] Quartier:", { _id: q._id, nom: q.nom });

    if (String(z.quartier) !== String(quartier)) {
      return res.status(400).json({ message: "La zone ne correspond pas au quartier fourni." });
    }

    const exists = await Ilot.findOne({ zone, numeroIlot });
    if (exists) {
      console.log("❌ [CREATE_ILOT] Îlot déjà existant");
      return res.status(400).json({ message: "Un îlot avec ce numéro existe déjà dans cette zone." });
    }

    // Utiliser l'agenceId de l'utilisateur connecté
    const agenceId = req.user.role === "Admin" ? req.user.agenceId : req.user.agenceId;

    const ilot = await Ilot.create({
      numeroIlot,
      zone,
      quartier,
      agenceId: agenceId, // 🔗 on rattache à l'agence de l'utilisateur
      surfaceTotale,
    });

    console.log("✅ [CREATE_ILOT] Îlot créé:", { _id: ilot._id, numeroIlot: ilot.numeroIlot, agenceId: ilot.agenceId });

    return res.status(201).json({ message: "Îlot créé avec succès", ilot });
  } catch (error) {
    console.error("❌ [CREATE_ILOT] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ✏️ Modifier un îlot
exports.updateIlot = async (req, res) => {
  try {
    const ilot = await Ilot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ilot) {
      return res.status(404).json({ message: "Îlot non trouvé" });
    }
    res.status(200).json({ message: "Îlot mis à jour", ilot });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ Supprimer un îlot
exports.deleteIlot = async (req, res) => {
  try {
    const ilot = await Ilot.findByIdAndDelete(req.params.id);
    if (!ilot) {
      return res.status(404).json({ message: "Îlot non trouvé" });
    }
    res.status(200).json({ message: "Îlot supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




exports.getAllIlots = async (req, res) => {
  try {
    console.log("📝 [GET_ILOTS] Début récupération îlots");
    console.log("📝 [GET_ILOTS] User connecté:", { id: req.user.id, role: req.user.role });

    // 🔒 SÉCURITÉ MULTI-AGENCE: Filtrer par agenceId sauf pour Admin
    let filter = {};
    
    if (req.user.role === "Agence" || req.user.role === "Commercial") {
      console.log("📝 [GET_ILOTS] Mode Agence/Commercial - Filtrage par agenceId");
      
      if (!req.user.agenceId) {
        console.log("❌ [GET_ILOTS] Pas d'agenceId trouvé pour cet utilisateur");
        return res.status(200).json([]);
      }
      
      filter.agenceId = req.user.agenceId;
    }
    // Si Admin: pas de filtre, voit tout

    const ilots = await Ilot.find(filter)
      .populate("zone", "nom")
      .populate("quartier", "nom");
    
    console.log("✅ [GET_ILOTS] Îlots trouvés:", ilots.length);

    res.status(200).json(ilots);
  } catch (error) {
    console.error("❌ [GET_ILOTS] Erreur:", error);
    res.status(500).json({ message: "Erreur lors du chargement des îlots" });
  }
};



exports.getParcellesByIlot = async (req, res) => {
  try {
    const ilotId = req.params.id;
    const parcelles = await Parcelle.find({ ilot: ilotId })
      .select("numeroParcelle superficie prix statut")
      .sort({ numeroParcelle: 1 });
    res.status(200).json(parcelles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

