

// controllers/agences/parcelleController.js
const Parcelle = require("../../models/agences/Parcelle");
const Ilot = require("../../models/agences/Ilot");

// controllers/agences/parcelleController.js (remplace uniquement cette fonction)
// controllers/agences/parcelleController.js


exports.createParcelle = async (req, res) => {
  try {
    const {
      numeroParcelle,
      ilot,
      superficie,
      prix,
      statut,
      description,
      video,
      affecteeA,
      vendueA,
      dateVente,
    } = req.body;

    // Debug utile
    console.log("createParcelle → body.numeroParcelle:", numeroParcelle);
    console.log("createParcelle → req.cloudinary:", req.cloudinary);
    console.log(
      "createParcelle → req.files keys:",
      Object.keys(req.files || {})
    );

    // Rattacher l’agence via l’îlot
    const ilotDoc = await Ilot.findById(ilot).select("agenceId");
    if (!ilotDoc) return res.status(404).json({ message: "Îlot introuvable" });
    if (!ilotDoc.agenceId)
      return res.status(400).json({ message: "Aucune agence liée à cet îlot" });

    // Anti-doublon par îlot
    const already = await Parcelle.findOne({ ilot, numeroParcelle });
    if (already)
      return res
        .status(400)
        .json({ message: "Numéro déjà utilisé pour cet îlot" });

    // Localisations (facultatif)
    const localisations = req.body.localisations
      ? JSON.parse(req.body.localisations)
      : [];

    // ✅ RÉCUPÈRE LES URLS DE CLOUDINARY (et fallback sur req.files si besoin)
    const images =
      Array.isArray(req.cloudinary?.images) && req.cloudinary.images.length
        ? req.cloudinary.images
        : Array.isArray(req.files?.images)
        ? req.files.images.map((f) => f.path)
        : [];

    const documents =
      Array.isArray(req.cloudinary?.documents) && req.cloudinary.documents.length
        ? req.cloudinary.documents
        : Array.isArray(req.files?.documents)
        ? req.files.documents.map((f) => f.path)
        : [];

    const parcelle = await Parcelle.create({
      numeroParcelle,
      ilot,
      agenceId: ilotDoc.agenceId,
      superficie: superficie || undefined,
      prix: prix || undefined,
      statut: statut || "avendre",
      description: description || "",
      videos: video ? [video] : [],
      localisation: localisations[0] || {},
      images,      // ✅ on sauve les URLs Cloudinary
      documents,   // ✅ idem
      affecteeA: affecteeA || undefined,
      vendueA: vendueA || undefined,
      dateVente: dateVente || undefined,
    });

    console.log("createParcelle → saved.images:", parcelle.images);
    console.log("createParcelle → saved.documents:", parcelle.documents);

    return res
      .status(201)
      .json({ message: "Parcelle créée avec succès", parcelle });
  } catch (error) {
    console.error("❌ Erreur création parcelle :", error);
    return res.status(500).json({ message: error.message });
  }
};


// controllers/commercial/parcelleController.js
exports.getParcelleById = async (req, res) => {
  try {
    console.log("📝 [GET_PARCELLE_BY_ID] ID demandé:", req.params.id);
    console.log("📝 [GET_PARCELLE_BY_ID] User:", req.user);
    
    const parcelle = await Parcelle.findById(req.params.id).populate("ilot");
    console.log("📝 [GET_PARCELLE_BY_ID] Parcelle trouvée:", parcelle ? "OUI" : "NON");
    
    if (!parcelle) {
      console.log("❌ [GET_PARCELLE_BY_ID] Parcelle introuvable");
      return res.status(404).json({ message: "Parcelle introuvable" });
    }
    
    console.log("✅ [GET_PARCELLE_BY_ID] Parcelle retournée:", {
      id: parcelle._id,
      numero: parcelle.numeroParcelle,
      ilot: parcelle.ilot?.numeroIlot
    });
    
    res.status(200).json(parcelle);
  } catch (error) {
    console.error("❌ [GET_PARCELLE_BY_ID] Erreur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// // ➕ Créer une parcelle

// exports.createParcellesBatch = async (req, res) => {
//   try {
//     const { parcelles } = req.body;
//     if (!Array.isArray(parcelles) || parcelles.length === 0) {
//       return res.status(400).json({ message: "Aucune parcelle fournie" });
//     }

//     // Récup une seule fois l’agence de chaque îlot
//     const uniqueIlots = [...new Set(parcelles.map((p) => String(p.ilot)))];
//     const ilotsDocs = await Ilot.find({ _id: { $in: uniqueIlots } }).select("_id agenceId");
//     const ilotToAgence = new Map(ilotsDocs.map((d) => [String(d._id), String(d.agenceId || "")]));

//     // Vérifs et enrichissement
//     const formatted = parcelles.map((p) => {
//       const agenceId = ilotToAgence.get(String(p.ilot));
//       if (!agenceId) throw new Error("Agence introuvable pour l’un des îlots");

//       return {
//         ...p,
//         agenceId, // 🔗
//       };
//     });

//     // Option: vos coordonnées auto si besoin (tu peux garder ton code existant ici)
//     const inserted = await Parcelle.insertMany(formatted, { ordered: false });

//     return res.status(201).json({
//       message: `${inserted.length} parcelle(s) créées avec succès`,
//       parcelles: inserted,
//     });
//   } catch (error) {
//     console.error("❌ Erreur création par batch :", error);
//     return res.status(500).json({ message: error.message });
//   }
// };




// Créer parcelles multiples avec coordonnées et photos individuelles
exports.createParcellesBatchIndividual = async (req, res) => {
  try {
    console.log("📝 [BATCH_INDIVIDUAL] Début création batch individuel");
    console.log("📝 [BATCH_INDIVIDUAL] Body:", req.body);

    const list = typeof req.body.parcelles === "string"
      ? JSON.parse(req.body.parcelles)
      : req.body.parcelles;

    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: "Aucune parcelle fournie" });
    }

    console.log("📝 [BATCH_INDIVIDUAL] Nombre de parcelles:", list.length);
    console.log("📝 [BATCH_INDIVIDUAL] req.cloudinary:", req.cloudinary);

    // Récupérer toutes les images et documents uploadés par parcelle
    const imagesByParcelle = req.cloudinary?.imagesByParcelle || {};
    const documentsByParcelle = req.cloudinary?.documentsByParcelle || {};

    console.log("📝 [BATCH_INDIVIDUAL] Images par parcelle:", Object.keys(imagesByParcelle));
    console.log("📝 [BATCH_INDIVIDUAL] Documents par parcelle:", Object.keys(documentsByParcelle));

    // Récupérer agenceId par îlot
    const uniqueIlots = [...new Set(list.map(p => String(p.ilot)))];
    const ilotsDocs = await Ilot.find({ _id: { $in: uniqueIlots } }).select("_id agenceId");
    const ilotToAgence = new Map(ilotsDocs.map(d => [String(d._id), d.agenceId?.toString()]));

    // Créer chaque parcelle avec ses données individuelles
    const parcellesToCreate = list.map((p, index) => {
      const agenceId = ilotToAgence.get(String(p.ilot));
      if (!agenceId) throw new Error("Agence introuvable pour l'un des îlots");

      return {
        numeroParcelle: p.numeroParcelle,
        ilot: p.ilot,
        agenceId,
        superficie: p.superficie ?? undefined,
        prix: p.prix ?? undefined,
        statut: p.statut || "avendre",
        description: p.description || "",
        videos: p.video ? [p.video] : [], // URL vidéo optionnelle
        localisation: p.localisation || {},
        images: imagesByParcelle[index] || [], // Images spécifiques à cette parcelle
        documents: documentsByParcelle[index] || [], // Documents spécifiques à cette parcelle
      };
    });

    console.log("📝 [BATCH_INDIVIDUAL] Parcelles à créer:", parcellesToCreate.length);

    const inserted = await Parcelle.insertMany(parcellesToCreate, { ordered: false });
    
    console.log("✅ [BATCH_INDIVIDUAL] Parcelles créées:", inserted.length);

    return res.status(201).json({
      message: `${inserted.length} parcelle(s) créées avec succès`,
      parcelles: inserted,
    });
  } catch (error) {
    console.error("❌ [BATCH_INDIVIDUAL] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.createParcellesBatch = async (req, res) => {
  try {
    // 1) Parse le JSON envoyé dans le FormData
    const list = typeof req.body.parcelles === "string"
      ? JSON.parse(req.body.parcelles)
      : req.body.parcelles;

    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: "Aucune parcelle fournie" });
    }

    // 2) Fichiers Cloudinary préparés par le middleware
    const images = Array.isArray(req.cloudinary?.images) ? req.cloudinary.images : [];
    const documents = Array.isArray(req.cloudinary?.documents) ? req.cloudinary.documents : [];

    // 3) Récupérer agenceId par îlot (map rapide)
    const uniqueIlots = [...new Set(list.map(p => String(p.ilot)))];
    const ilotsDocs = await Ilot.find({ _id: { $in: uniqueIlots } }).select("_id agenceId");
    const ilotToAgence = new Map(ilotsDocs.map(d => [String(d._id), d.agenceId?.toString()]));

    // Helper pour normaliser le 1er point de localisation
    const toLoc = (loc) => {
      if (!loc) return undefined;
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      // On stocke uniquement si lat/lng sont valides
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
    };

    // 4) Construire les documents à insérer
    const formatted = list.map(p => {
      const agenceId = ilotToAgence.get(String(p.ilot));
      if (!agenceId) throw new Error("Agence introuvable pour l’un des îlots");

      // prend le 1er point si fourni
      const firstLoc = Array.isArray(p.localisations) && p.localisations.length > 0
        ? toLoc(p.localisations[0])
        : undefined;

      return {
        numeroParcelle: p.numeroParcelle,
        ilot: p.ilot,
        agenceId,
        superficie: p.superficie ?? undefined,
        prix: p.prix ?? undefined,
        statut: p.statut || "avendre",
        description: p.description || "",

        // ✅ vidéo (tableau 'videos' dans le modèle)
        videos: p.video ? [String(p.video)] : [],

        // ✅ localisation (singulier dans le modèle)
        localisation: firstLoc || {},

        // ✅ mêmes fichiers pour toutes (simple)
        images,
        documents,
      };
    });

    const inserted = await Parcelle.insertMany(formatted, { ordered: false });
    return res.status(201).json({
      message: `${inserted.length} parcelle(s) créées avec succès`,
      parcelles: inserted,
    });
  } catch (error) {
    console.error("❌ Erreur création par batch :", error);
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: "Format 'parcelles' invalide (JSON attendu)" });
    }
    return res.status(500).json({ message: error.message });
  }
};


// controllers/agences/parcelleController.js
// controllers/agences/parcelleController.js
exports.updateParcelle = async (req, res) => {
  try {
    const id = req.params.id;

    console.log("📝 [UPDATE_PARCELLE] ID:", id);
    console.log("📝 [UPDATE_PARCELLE] Body keys:", Object.keys(req.body || {}));
    console.log("📝 [UPDATE_PARCELLE] Cloudinary:", req.cloudinary ? "présent" : "absent");

    // Fichiers uploadés (optionnels)
    const newImages = Array.isArray(req.cloudinary?.images) ? req.cloudinary.images : [];
    const newDocs   = Array.isArray(req.cloudinary?.documents) ? req.cloudinary.documents : [];

    console.log("📝 [UPDATE_PARCELLE] New images:", newImages.length);
    console.log("📝 [UPDATE_PARCELLE] New documents:", newDocs.length);

    const patch = {};
    const pick = (k, transform = (v)=>v) => {
      if (req.body[k] !== undefined && req.body[k] !== null && req.body[k] !== "") {
        patch[k] = transform(req.body[k]);
      }
    };

    // Traitement des champs avec sécurité
    try {
      pick("numeroParcelle", v => String(v).trim());
      pick("ilot", v => String(v).trim());
      pick("superficie", v => {
        const num = Number(String(v).replace(",", "."));
        return isNaN(num) ? undefined : num;
      });
      pick("prix", v => {
        const num = Number(String(v).replace(",", "."));
        return isNaN(num) ? undefined : num;
      });
      pick("statut", v => String(v).trim());
      pick("description", v => String(v).trim());
      pick("video", v => String(v).trim());
    } catch (pickError) {
      console.error("❌ [UPDATE_PARCELLE] Erreur lors du traitement des champs:", pickError);
      return res.status(400).json({ message: "Erreur dans les données fournies", error: pickError.message });
    }

    // 🔎 parseur tolérant: "12,34" -> 12.34
    const toNum = (val) => {
      if (val === undefined || val === null || val === "") return null;
      const n = Number(String(val).trim().replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };

    // Récupérer l'existant AVANT de calculer la localisation
    const current = await Parcelle.findById(id);
    if (!current) {
      console.error("❌ [UPDATE_PARCELLE] Parcelle non trouvée:", id);
      return res.status(404).json({ message: "Parcelle non trouvée" });
    }
    
    console.log("📝 [UPDATE_PARCELLE] Parcelle existante trouvée:", current.numeroParcelle);

    // ✅ 1) format "localisations": JSON avec [{lat,lng}, ...]
    let lat = null, lng = null;
    if (req.body.localisations) {
      try {
        const arr = JSON.parse(req.body.localisations);
        if (Array.isArray(arr) && arr.length) {
          lat = toNum(arr[0].lat);
          lng = toNum(arr[0].lng);
        }
      } catch (e) { /* ignore */ }
    }

    // ✅ 2) fallback: champs plats "lat" / "lng"
    if (lat === null && req.body.lat !== undefined) lat = toNum(req.body.lat);
    if (lng === null && req.body.lng !== undefined) lng = toNum(req.body.lng);

    // ✅ Appliquer la localisation si au moins 1 coordonnée est fournie
    if (lat !== null || lng !== null) {
      patch.localisation = {
        lat: (lat !== null ? lat : current.localisation?.lat),
        lng: (lng !== null ? lng : current.localisation?.lng),
      };
    }

    // 🎥 vidéos : si "video" fourni on remplace, sinon on ne touche pas
    if (patch.video !== undefined) {
      patch.videos = patch.video ? [patch.video] : [];
      delete patch.video;
    }

    // Merge fichiers : on AJOUTE les nouveaux (on ne supprime pas l'existant)
    // Note: Pour supprimer des fichiers existants, il faudrait envoyer une liste complète depuis le frontend
    if (newImages.length > 0) {
      patch.images = [...(current.images || []), ...newImages];
      console.log("📝 [UPDATE_PARCELLE] Images après merge:", patch.images.length);
    }
    if (newDocs.length > 0) {
      patch.documents = [...(current.documents || []), ...newDocs];
      console.log("📝 [UPDATE_PARCELLE] Documents après merge:", patch.documents.length);
    }

    // Si ilot changé, recalculer agenceId
    if (patch.ilot) {
      try {
        const ilotDoc = await Ilot.findById(patch.ilot).select("agenceId");
        if (!ilotDoc || !ilotDoc.agenceId) {
          console.error("❌ [UPDATE_PARCELLE] Îlot invalide ou agence introuvable:", patch.ilot);
          return res.status(400).json({ message: "Îlot invalide ou agence introuvable" });
        }
        patch.agenceId = ilotDoc.agenceId;
        console.log("📝 [UPDATE_PARCELLE] AgenceId mis à jour:", patch.agenceId);
      } catch (ilotError) {
        console.error("❌ [UPDATE_PARCELLE] Erreur lors de la récupération de l'îlot:", ilotError);
        return res.status(400).json({ message: "Erreur lors de la récupération de l'îlot", error: ilotError.message });
      }
    }

    console.log("📝 [UPDATE_PARCELLE] Patch final:", Object.keys(patch));
    
    try {
      const parcelle = await Parcelle.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
      if (!parcelle) {
        console.error("❌ [UPDATE_PARCELLE] Parcelle non trouvée après mise à jour");
        return res.status(404).json({ message: "Parcelle non trouvée après mise à jour" });
      }
      console.log("✅ [UPDATE_PARCELLE] Parcelle mise à jour avec succès");
      return res.status(200).json({ message: "Parcelle mise à jour", parcelle });
    } catch (updateError) {
      console.error("❌ [UPDATE_PARCELLE] Erreur lors de la mise à jour MongoDB:", updateError);
      return res.status(500).json({ 
        message: "Erreur lors de la mise à jour de la parcelle", 
        error: updateError.message,
        details: updateError.errors ? Object.keys(updateError.errors) : undefined
      });
    }
  } catch (error) {
    console.error("❌ [UPDATE_PARCELLE] Erreur générale:", error);
    console.error("❌ [UPDATE_PARCELLE] Stack:", error.stack);
    return res.status(500).json({ 
      message: "Erreur serveur lors de la mise à jour", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};



// ❌ Supprimer une parcelle
exports.deleteParcelle = async (req, res) => {
  try {
    const parcelle = await Parcelle.findByIdAndDelete(req.params.id);
    if (!parcelle) {
      return res.status(404).json({ message: "Parcelle non trouvée" });
    }
    res.status(200).json({ message: "Parcelle supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// exports.getAllParcelles = async (req, res) => {
//   try {
//     const parcelles = await Parcelle.find()
//       .populate("affecteeA") // ✅ sans le sous-populate
//       .populate("ilot");

//     res.status(200).json(parcelles);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


exports.getAllParcelles = async (req, res) => {
  try {
    console.log("📝 [GET_PARCELLES] Début récupération parcelles");
    console.log("📝 [GET_PARCELLES] User connecté:", { id: req.user.id, role: req.user.role });

    // 🔒 SÉCURITÉ MULTI-AGENCE: Filtrer par agenceId sauf pour Admin
    let filter = {};
    
    if (req.user.role === "Agence" || req.user.role === "Commercial") {
      console.log("📝 [GET_PARCELLES] Mode Agence/Commercial - Filtrage par agenceId");
      
      if (!req.user.agenceId) {
        console.log("❌ [GET_PARCELLES] Pas d'agenceId trouvé pour cet utilisateur");
        return res.status(200).json([]);
      }
      
      filter.agenceId = req.user.agenceId;
      console.log("📝 [GET_PARCELLES] Filtre appliqué:", filter);
    }
    // Si Admin: pas de filtre, voit tout

    const parcelles = await Parcelle.find(filter)
      .populate("affecteeA")
      .populate("ilot", "numeroIlot")
      .populate("agenceId", "nom telephone ville");

    console.log("✅ [GET_PARCELLES] Parcelles trouvées:", parcelles.length);

    return res.status(200).json(parcelles);
  } catch (err) {
    console.error("❌ [GET_PARCELLES] Erreur:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Récupérer les parcelles publiques à vendre pour la homepage
 * GET /api/public/parcelles
 */
exports.getPublicParcelles = async (req, res) => {
  try {
    // Récupérer seulement les parcelles à vendre (statut: "avendre") ET vérifiées par l'admin
    const parcelles = await Parcelle.find({ 
      statut: "avendre",
      verified: true // Seulement les parcelles vérifiées
    })
    .populate("ilot", "numeroIlot")
    .populate("agenceId", "nom ville telephone")
    .sort({ createdAt: -1 })
    .limit(20); // Limiter à 20 parcelles pour la homepage
    
    res.json({
      message: "Parcelles publiques récupérées avec succès",
      parcelles: parcelles,
      total: parcelles.length
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

