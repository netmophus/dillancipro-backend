// controllers/agences/ilotController.js
const Ilot = require("../../models/agences/Ilot");
const Zone = require("../../models/agences/Zone");
const Quartier = require("../../models/agences/Quartier");
const Parcelle = require("../../models/agences/Parcelle");
const Agence = require("../../models/Agence");

/**
 * Génère un préfixe à partir du nom de l'agence
 * Exemple: "Agence Immobilière Générale" -> "AIG"
 */
const generateAgencePrefix = (nomAgence) => {
  if (!nomAgence) return "";
  
  // Nettoyer le nom et extraire les initiales
  const mots = nomAgence
    .trim()
    .split(/\s+/)
    .filter(mot => mot.length > 0);
  
  // Si un seul mot, prendre les 3 premières lettres en majuscules
  if (mots.length === 1) {
    return mots[0].substring(0, 3).toUpperCase();
  }
  
  // Sinon, prendre la première lettre de chaque mot (max 4 mots)
  const initiales = mots
    .slice(0, 4)
    .map(mot => mot.charAt(0).toUpperCase())
    .join("");
  
  return initiales;
};


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

    // Utiliser l'agenceId de l'utilisateur connecté
    const agenceId = req.user.role === "Admin" ? req.user.agenceId : req.user.agenceId;
    
    if (!agenceId) {
      return res.status(400).json({ message: "Aucune agence associée à cet utilisateur." });
    }

    // Récupérer l'agence pour générer le préfixe
    const agence = await Agence.findById(agenceId).select("nom");
    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée." });
    }

    // Générer le préfixe depuis le nom de l'agence
    const prefixe = generateAgencePrefix(agence.nom);
    
    // Vérifier si le numeroIlot contient déjà le préfixe
    let numeroIlotFinal = numeroIlot;
    if (prefixe && !numeroIlot.startsWith(`${prefixe}-`)) {
      numeroIlotFinal = `${prefixe}-${numeroIlot}`;
    }

    // Vérifier l'unicité avec agenceId inclus
    const exists = await Ilot.findOne({ 
      zone, 
      numeroIlot: numeroIlotFinal,
      agenceId 
    });
    if (exists) {
      console.log("❌ [CREATE_ILOT] Îlot déjà existant");
      return res.status(400).json({ 
        message: `Un îlot avec le numéro "${numeroIlotFinal}" existe déjà dans cette zone pour votre agence.` 
      });
    }

    // Récupérer les images depuis req.cloudinary ou req.files
    const images = Array.isArray(req.cloudinary?.images) && req.cloudinary.images.length
      ? req.cloudinary.images
      : Array.isArray(req.files?.images)
      ? req.files.images.map((f) => f.path)
      : [];

    // Récupérer les vidéos depuis req.body (peut être un JSON stringifié ou un tableau)
    let videos = [];
    if (req.body.videos) {
      try {
        videos = typeof req.body.videos === 'string' 
          ? JSON.parse(req.body.videos).filter(v => v && v.trim())
          : Array.isArray(req.body.videos)
          ? req.body.videos.filter(v => v && v.trim())
          : [];
      } catch (e) {
        // Si ce n'est pas du JSON, traiter comme une chaîne simple
        videos = req.body.videos.trim() ? [req.body.videos] : [];
      }
    } else if (req.body.video) {
      videos = req.body.video.trim() ? [req.body.video] : [];
    }

    const ilot = await Ilot.create({
      numeroIlot: numeroIlotFinal,
      zone,
      quartier,
      agenceId: agenceId, // 🔗 on rattache à l'agence de l'utilisateur
      surfaceTotale,
      images, // Photos partagées par toutes les parcelles de cet îlot
      videos, // Vidéos partagées par toutes les parcelles de cet îlot
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
    const ilotExistant = await Ilot.findById(req.params.id);
    if (!ilotExistant) {
      return res.status(404).json({ message: "Îlot non trouvé" });
    }

    // Si le numeroIlot est modifié, vérifier l'unicité avec le préfixe
    if (req.body.numeroIlot && req.body.numeroIlot !== ilotExistant.numeroIlot) {
      const agence = await Agence.findById(ilotExistant.agenceId).select("nom");
      if (agence) {
        const prefixe = generateAgencePrefix(agence.nom);
        let numeroIlotFinal = req.body.numeroIlot;
        
        // Ajouter le préfixe si nécessaire
        if (prefixe && !numeroIlotFinal.startsWith(`${prefixe}-`)) {
          numeroIlotFinal = `${prefixe}-${numeroIlotFinal}`;
        }

        // Vérifier l'unicité
        const exists = await Ilot.findOne({ 
          zone: req.body.zone || ilotExistant.zone,
          numeroIlot: numeroIlotFinal,
          agenceId: ilotExistant.agenceId,
          _id: { $ne: req.params.id }
        });
        
        if (exists) {
          return res.status(400).json({ 
            message: `Un îlot avec le numéro "${numeroIlotFinal}" existe déjà dans cette zone pour votre agence.` 
          });
        }

        req.body.numeroIlot = numeroIlotFinal;
      }
    }

    // Gérer les images et vidéos si fournies
    const updateData = { ...req.body };
    
    if (req.cloudinary?.images || req.files?.images) {
      const images = Array.isArray(req.cloudinary?.images) && req.cloudinary.images.length
        ? req.cloudinary.images
        : Array.isArray(req.files?.images)
        ? req.files.images.map((f) => f.path)
        : req.body.images || ilotExistant.images;
      updateData.images = images;
    }

    if (req.body.videos !== undefined) {
      updateData.videos = Array.isArray(req.body.videos) 
        ? req.body.videos.filter(v => v && v.trim())
        : req.body.video 
        ? [req.body.video]
        : ilotExistant.videos;
    }

    const ilot = await Ilot.findByIdAndUpdate(req.params.id, updateData, { new: true });
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

