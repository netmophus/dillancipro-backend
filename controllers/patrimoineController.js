// controllers/patrimoineController.js
const PatrimoineFoncier = require("../models/PatrimoineFoncier");
const BienImmobilier = require("../models/agences/BienImmobilier");

/**
 * Créer un bien dans le patrimoine
 * POST /api/client/patrimoine
 */
exports.createPatrimoine = async (req, res) => {
  try {
    const clientId = req.user._id || req.user.id;

    const {
      type,
      reference,
      titre,
      description,
      superficie,
      valeurEstimee,
      localisation,
      titreFoncier,
      numeroTitre,
      dateAcquisition,
      modeAcquisition,
      statut,
      caracteristiques,
      notes,
      videoUrl,
    } = req.body;

    // Récupérer les photos et documents uploadés
    const photos = Array.isArray(req.cloudinary?.images)
      ? req.cloudinary.images
      : [];
    const documents = Array.isArray(req.cloudinary?.documents)
      ? req.cloudinary.documents
      : [];

    // Parser localisation et caracteristiques si nécessaire
    let localisationData = localisation;
    if (typeof localisation === "string") {
      try {
        localisationData = JSON.parse(localisation);
      } catch (e) {
        localisationData = {};
      }
    }

    let caracteristiquesData = caracteristiques;
    if (typeof caracteristiques === "string") {
      try {
        caracteristiquesData = JSON.parse(caracteristiques);
      } catch (e) {
        caracteristiquesData = {};
      }
    }

    const patrimoine = await PatrimoineFoncier.create({
      clientId,
      type,
      reference,
      titre,
      description,
      superficie: superficie ? parseFloat(superficie) : undefined,
      valeurEstimee: valeurEstimee ? parseFloat(valeurEstimee) : undefined,
      localisation: localisationData,
      titreFoncier,
      numeroTitre,
      dateAcquisition,
      modeAcquisition,
      statut: statut || "possede",
      caracteristiques: caracteristiquesData,
      notes,
      photos,
      documents,
      videoUrl: videoUrl || undefined,
      // Statuts de paiement par défaut
      enregistrementStatut: "en_attente",
      abonnementStatut: "en_attente",
      visible: false, // Invisible jusqu'au paiement
      statutVerification: "non_verifie",
    });

    return res.status(201).json({
      message: "Bien ajouté à votre patrimoine avec succès. Veuillez procéder au paiement d'enregistrement.",
      patrimoine,
      paiementRequis: true,
      redirectUrl: `/user/paiement-enregistrement/${patrimoine._id}`,
    });
  } catch (error) {
    console.error("❌ Erreur création patrimoine:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les biens du patrimoine du client
 * GET /api/client/patrimoine
 */
exports.getPatrimoine = async (req, res) => {
  try {
    const clientId = req.user._id || req.user.id;
    const { type, statut } = req.query;

    const filter = { clientId };
    if (type) filter.type = type;
    if (statut) filter.statut = statut;

    const biens = await PatrimoineFoncier.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(biens);
  } catch (error) {
    console.error("❌ Erreur récupération patrimoine:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer un bien par ID
 * GET /api/client/patrimoine/:id
 */
exports.getPatrimoineById = async (req, res) => {
  try {
    console.log("🔍 [GET_PATRIMOINE_BY_ID] Request ID:", req.params.id);
    console.log("🔍 [GET_PATRIMOINE_BY_ID] User:", req.user);
    
    const bien = await PatrimoineFoncier.findById(req.params.id);
    console.log("🔍 [GET_PATRIMOINE_BY_ID] Bien trouvé:", bien ? bien._id : "non");

    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Vérifier que le bien appartient bien au client
    const clientId = req.user._id || req.user.id;
    console.log("🔍 [GET_PATRIMOINE_BY_ID] Client ID:", clientId);
    console.log("🔍 [GET_PATRIMOINE_BY_ID] Bien clientId:", bien.clientId);
    
    if (bien.clientId.toString() !== clientId.toString()) {
      console.log("❌ [GET_PATRIMOINE_BY_ID] ID mismatch:", bien.clientId, "!=", clientId);
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    console.log("✅ [GET_PATRIMOINE_BY_ID] Accès autorisé");
    return res.status(200).json(bien);
  } catch (error) {
    console.error("❌ Erreur récupération bien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Modifier un bien
 * PUT /api/client/patrimoine/:id
 */
exports.updatePatrimoine = async (req, res) => {
  try {
    const bien = await PatrimoineFoncier.findById(req.params.id);

    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Vérifier que le bien appartient au client
    const clientId = req.user._id || req.user.id;
    if (bien.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    const updateData = { ...req.body };

    // Ajouter les nouvelles photos/documents
    const newPhotos = Array.isArray(req.cloudinary?.images)
      ? req.cloudinary.images
      : [];
    const newDocuments = Array.isArray(req.cloudinary?.documents)
      ? req.cloudinary.documents
      : [];

    if (newPhotos.length) {
      updateData.photos = [...(bien.photos || []), ...newPhotos];
    }
    if (newDocuments.length) {
      updateData.documents = [...(bien.documents || []), ...newDocuments];
    }

    // Parser localisation et caracteristiques si nécessaire
    if (updateData.localisation && typeof updateData.localisation === "string") {
      try {
        updateData.localisation = JSON.parse(updateData.localisation);
      } catch (e) {}
    }

    if (updateData.caracteristiques && typeof updateData.caracteristiques === "string") {
      try {
        updateData.caracteristiques = JSON.parse(updateData.caracteristiques);
      } catch (e) {}
    }

    const updated = await PatrimoineFoncier.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Bien mis à jour avec succès",
      patrimoine: updated,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour patrimoine:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Supprimer un bien
 * DELETE /api/client/patrimoine/:id
 */
exports.deletePatrimoine = async (req, res) => {
  try {
    const bien = await PatrimoineFoncier.findById(req.params.id);

    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Vérifier que le bien appartient au client
    const clientId = req.user._id || req.user.id;
    if (bien.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    await PatrimoineFoncier.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Bien supprimé de votre patrimoine" });
  } catch (error) {
    console.error("❌ Erreur suppression patrimoine:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Statistiques du patrimoine consolidé
 * GET /api/client/patrimoine/stats
 */
exports.getPatrimoineStats = async (req, res) => {
  try {
    const clientId = req.user._id || req.user.id;

    // Biens personnels
    const biensPersonnels = await PatrimoineFoncier.find({ clientId });
    
    const totalBiensPersonnels = biensPersonnels.length;
    const superficieTotalePersonnelle = biensPersonnels.reduce(
      (sum, b) => sum + (b.superficie || 0),
      0
    );
    const valeurTotalePersonnelle = biensPersonnels.reduce(
      (sum, b) => sum + (b.valeurEstimee || 0),
      0
    );

    const biensParType = biensPersonnels.reduce((acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      totalBiensPersonnels,
      superficieTotalePersonnelle,
      valeurTotalePersonnelle,
      biensParType,
    });
  } catch (error) {
    console.error("❌ Erreur stats patrimoine:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer les biens immobiliers publics pour la homepage
 * GET /api/public/patrimoine
 */
exports.getPublicPatrimoine = async (req, res) => {
  try {
    // Récupérer seulement les biens immobiliers vérifiés par l'admin
    const biens = await BienImmobilier.find({
      verified: true // Seulement les biens vérifiés
    })
    .populate("agenceId", "nom ville telephone")
    .populate("affecteeA", "fullName phone email")
    .sort({ createdAt: -1 })
    .limit(20); // Limiter à 20 biens pour la homepage
    
    res.json({
      message: "Biens immobiliers publics récupérés avec succès",
      patrimoine: biens,
      total: biens.length
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

