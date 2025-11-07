// controllers/agences/bienController.js
const BienImmobilier = require("../../models/agences/BienImmobilier");
const VenteBienImmobilier = require("../../models/agences/VenteBienImmobilier");
const Agence = require("../../models/Agence");
const Notaire = require("../../models/Notaire");
const User = require("../../models/User");

/**
 * Créer un bien immobilier
 * POST /api/agence/biens
 */
exports.createBien = async (req, res) => {
  try {
    const {
      type,
      titre,
      description,
      prix,
      superficie,
      statut,
      localisation,
      videos,
      visite360,
      caracteristiques,
      featured,
      urgent,
    } = req.body;

    // Récupérer l'agence de l'utilisateur connecté
    const agence = await Agence.findOne({ admin: req.user.id });
    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    // Récupérer les images et documents uploadés via Cloudinary
    const images = Array.isArray(req.cloudinary?.images)
      ? req.cloudinary.images
      : [];
    const documents = Array.isArray(req.cloudinary?.documents)
      ? req.cloudinary.documents
      : [];
    
    // Parser les URLs vidéos (Vimeo, YouTube, etc.)
    let videosData = [];
    if (videos) {
      videosData = Array.isArray(videos) ? videos : [videos];
      videosData = videosData.filter(v => v && v.trim() !== "");
      
      // Validation: au moins 1 vidéo requise
      if (videosData.length < 1) {
        return res.status(400).json({ 
          message: "Veuillez ajouter au moins 1 lien vidéo (Vimeo, YouTube, etc.)" 
        });
      }
    } else {
      return res.status(400).json({ 
        message: "Veuillez ajouter au moins 1 lien vidéo (Vimeo, YouTube, etc.)" 
      });
    }

    // Parser localisation si c'est une chaîne JSON
    let localisationData = localisation;
    if (typeof localisation === "string") {
      try {
        localisationData = JSON.parse(localisation);
      } catch (e) {
        localisationData = {};
      }
    }

    // Parser caracteristiques si c'est une chaîne JSON
    let caracteristiquesData = caracteristiques;
    if (typeof caracteristiques === "string") {
      try {
        caracteristiquesData = JSON.parse(caracteristiques);
      } catch (e) {
        caracteristiquesData = {};
      }
    }

    const bien = await BienImmobilier.create({
      type,
      titre,
      description,
      prix: parseFloat(prix),
      superficie: superficie ? parseFloat(superficie) : undefined,
      statut: statut || "disponible",
      localisation: localisationData,
      images,
      videos: videosData, // URLs vidéos (Vimeo, YouTube, etc.)
      documents,
      visite360,
      caracteristiques: caracteristiquesData,
      agenceId: agence._id,
      featured: featured === "true" || featured === true,
      urgent: urgent === "true" || urgent === true,
    });

    return res.status(201).json({
      message: "Bien immobilier créé avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur création bien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les biens de l'agence
 * GET /api/agence/biens
 */
exports.getAllBiens = async (req, res) => {
  try {
    console.log("📝 [GET_BIENS] Début récupération biens");
    console.log("📝 [GET_BIENS] User connecté:", { id: req.user.id, role: req.user.role });

    // 🔒 SÉCURITÉ MULTI-AGENCE: Filtrer par agenceId
    if (!req.user.agenceId) {
      console.log("❌ [GET_BIENS] Pas d'agenceId trouvé pour cet utilisateur");
      return res.status(200).json([]);
    }

    const { type, statut, minPrix, maxPrix } = req.query;

    const filter = { agenceId: req.user.agenceId };

    if (type) filter.type = type;
    if (statut) filter.statut = statut;
    if (minPrix || maxPrix) {
      filter.prix = {};
      if (minPrix) filter.prix.$gte = parseFloat(minPrix);
      if (maxPrix) filter.prix.$lte = parseFloat(maxPrix);
    }

    console.log("📝 [GET_BIENS] Filtre final:", filter);

    const biens = await BienImmobilier.find(filter)
      .populate("affecteeA", "fullName phone")
      .populate("vendueA", "fullName phone")
      .sort({ createdAt: -1 });

    console.log("✅ [GET_BIENS] Biens trouvés:", biens.length);

    return res.status(200).json(biens);
  } catch (error) {
    console.error("❌ [GET_BIENS] Erreur récupération biens:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer un bien par ID
 * GET /api/agence/biens/:id
 */
exports.getBienById = async (req, res) => {
  try {
    const bien = await BienImmobilier.findById(req.params.id)
      .populate("affecteeA", "fullName phone")
      .populate("vendueA", "fullName phone")
      .populate("agenceId", "nom telephone");

    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    return res.status(200).json(bien);
  } catch (error) {
    console.error("❌ Erreur récupération bien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Modifier un bien
 * PUT /api/agence/biens/:id
 */
exports.updateBien = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = { ...req.body };

    // Ajouter les nouvelles images et documents si uploadés
    const newImages = Array.isArray(req.cloudinary?.images)
      ? req.cloudinary.images
      : [];
    const newDocuments = Array.isArray(req.cloudinary?.documents)
      ? req.cloudinary.documents
      : [];

    const currentBien = await BienImmobilier.findById(id);
    if (!currentBien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Merger les images/documents
    if (newImages.length) {
      updateData.images = [...(currentBien.images || []), ...newImages];
    }
    if (newDocuments.length) {
      updateData.documents = [
        ...(currentBien.documents || []),
        ...newDocuments,
      ];
    }
    
    // Gérer les URLs vidéos si fournies
    if (updateData.videos) {
      const newVideos = Array.isArray(updateData.videos) 
        ? updateData.videos 
        : [updateData.videos];
      const filteredVideos = newVideos.filter(v => v && v.trim() !== "");
      if (filteredVideos.length > 0) {
        updateData.videos = [...(currentBien.videos || []), ...filteredVideos];
      }
    }

    // Parser localisation et caracteristiques si nécessaire
    if (updateData.localisation && typeof updateData.localisation === "string") {
      try {
        updateData.localisation = JSON.parse(updateData.localisation);
      } catch (e) {
        // Ignore parsing errors
      }
    }

    if (
      updateData.caracteristiques &&
      typeof updateData.caracteristiques === "string"
    ) {
      try {
        updateData.caracteristiques = JSON.parse(updateData.caracteristiques);
      } catch (e) {
        // Ignore parsing errors
      }
    }

    const bien = await BienImmobilier.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Bien mis à jour avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour bien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Supprimer un bien
 * DELETE /api/agence/biens/:id
 */
exports.deleteBien = async (req, res) => {
  try {
    const bien = await BienImmobilier.findByIdAndDelete(req.params.id);

    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    return res.status(200).json({ message: "Bien supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur suppression bien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Affecter un bien à un commercial
 * PUT /api/agence/biens/:id/affecter
 */
exports.affecterBien = async (req, res) => {
  try {
    const { commercialId } = req.body;

    // Vérifier que commercialId est fourni
    if (!commercialId) {
      return res.status(400).json({ message: "ID du commercial requis" });
    }

    const bien = await BienImmobilier.findByIdAndUpdate(
      req.params.id,
      { $set: { affecteeA: commercialId } },
      { new: true }
    ).populate("affecteeA", "fullName phone")
     .populate("agenceId", "nom");

    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // 📝 Créer notification détaillée pour le bien
    const Notification = require("../../models/agences/Notification");
    
    // Déterminer l'agenceId (peuplé ou non)
    const agenceId = bien.agenceId?._id || bien.agenceId;
    
    if (!agenceId) {
      console.error("❌ [AFFECTER_BIEN] Aucun agenceId trouvé pour le bien:", req.params.id);
      return res.status(400).json({ message: "Le bien n'est associé à aucune agence" });
    }

    let message = `🏠 Nouveau bien immobilier assigné !\n\n`;
    message += `📍 ${bien.type} - ${bien.titre}\n`;
    message += `💰 Prix: ${bien.prix?.toLocaleString() || 'N/A'} FCFA\n`;
    message += `📏 Superficie: ${bien.superficie || 'N/A'} m²\n`;
    message += `🏘️ Localisation: ${bien.adresse || 'N/A'}\n`;
    if (bien.description) {
      message += `📝 Description: ${bien.description.substring(0, 100)}${bien.description.length > 100 ? '...' : ''}\n`;
    }
    message += `\n✅ Vous pouvez maintenant le consulter et le vendre.`;

    await Notification.create({
      toUser: commercialId,
      agenceId: agenceId,
      type: "AFFECTATION_BIEN",
      title: `🏠 ${bien.type} assigné`,
      message: message,
      link: "/commercial/mes-biens",
      meta: { 
        bien: {
          id: bien._id,
          type: bien.type,
          titre: bien.titre,
          prix: bien.prix,
          superficie: bien.superficie,
          adresse: bien.adresse,
          agence: bien.agenceId?.nom || null
        }
      },
    });

    return res.status(200).json({
      message: "Bien affecté avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur affectation bien:", error);
    console.error("❌ Stack trace:", error.stack);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer les biens affectés à un commercial
 * GET /api/commercial/mes-biens
 */
exports.getMesBiensCommercial = async (req, res) => {
  try {
    console.log("📝 [GET_MES_BIENS_COMMERCIAL] User:", { id: req.user.id, role: req.user.role });

    const biens = await BienImmobilier.find({ affecteeA: req.user.id })
      .populate("agenceId", "nom telephone")
      .populate("vendueA", "fullName phone")
      .sort({ createdAt: -1 });

    console.log("✅ [GET_MES_BIENS_COMMERCIAL] Biens trouvés:", biens.length);

    return res.status(200).json(biens);
  } catch (error) {
    console.error("❌ [GET_MES_BIENS_COMMERCIAL] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Vendre un bien (avec choix du notaire)
 * PUT /api/commercial/biens/:id/vendre
 */
exports.vendreBien = async (req, res) => {
  try {
    const { clientId, notaireId, prixVente, dateVente } = req.body;

    if (!clientId || !notaireId || !prixVente) {
      return res.status(400).json({ 
        message: "Client, notaire et prix de vente sont requis" 
      });
    }

    const bien = await BienImmobilier.findById(req.params.id);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Vérifier que le bien est affecté à ce commercial
    if (String(bien.affecteeA) !== String(req.user.id)) {
      return res.status(403).json({ message: "Ce bien ne vous est pas affecté" });
    }

    // Vérifier que le bien est disponible
    if (bien.statut !== "disponible") {
      return res.status(400).json({ 
        message: `Ce bien ne peut pas être vendu. Statut actuel: ${bien.statut}` 
      });
    }

    // Vérifier que le notaire existe
    const notaire = await Notaire.findById(notaireId);
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    if (notaire.statut !== "actif") {
      return res.status(400).json({ message: "Ce notaire n'est pas actif" });
    }

    // Vérifier que le client existe
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Récupérer l'agence du commercial
    const agence = await Agence.findById(bien.agenceId);
    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    // Créer la vente avec notaire
    const vente = await VenteBienImmobilier.create({
      bienId: bien._id,
      commercialId: req.user.id,
      agenceId: bien.agenceId,
      clientId: clientId,
      notaireId: notaireId,
      prixVente: parseFloat(prixVente),
      statut: "en_attente_notaire",
      dateVente: dateVente || new Date(),
      dateAssignationNotaire: new Date(),
      historique: [
        {
          action: "vente_initiee",
          description: `Vente initiée par le commercial ${req.user.fullName || req.user.phone}`,
          acteur: req.user._id,
          acteurType: "Commercial",
          acteurNom: req.user.fullName || req.user.phone,
          donnees: {
            prixVente: parseFloat(prixVente),
            notaireId: notaireId,
            notaireNom: notaire.fullName,
          },
        },
      ],
    });

    // Mettre à jour le bien - marquer comme "en cours de vente" jusqu'à finalisation
    bien.statut = "en_cours_de_vente"; // ✅ Changé de "vendu" à "en_cours_de_vente"
    bien.vendueA = clientId;
    bien.dateVente = dateVente || new Date();
    await bien.save();

    // Peupler les relations pour la réponse
    await vente.populate([
      { path: "bienId", select: "titre type prix" },
      { path: "clientId", select: "fullName phone email" },
      { path: "notaireId", select: "fullName cabinetName phone email" },
      { path: "commercialId", select: "fullName phone email" },
      { path: "agenceId", select: "nom" },
    ]);

    console.log(`✅ Vente créée: ${bien.titre} à client ${clientId} avec notaire ${notaire.fullName}`);

    return res.status(200).json({
      message: "Vente créée avec succès. En attente de traitement par le notaire.",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur vente bien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Statistiques des biens
 * GET /api/agence/biens/stats
 */
exports.getBiensStats = async (req, res) => {
  try {
    // 🔒 SÉCURITÉ MULTI-AGENCE: Filtrer par agenceId
    if (!req.user.agenceId) {
      return res.status(200).json({ message: "Aucune agence associée" });
    }

    const stats = await BienImmobilier.aggregate([
      { $match: { agenceId: req.user.agenceId } },
      {
        $group: {
          _id: {
            type: "$type",
            statut: "$statut",
          },
          count: { $sum: 1 },
          totalPrix: { $sum: "$prix" },
          totalSuperficie: { $sum: "$superficie" },
        },
      },
    ]);

    const totalBiens = await BienImmobilier.countDocuments({
      agenceId: agence._id,
    });

    const biensDisponibles = await BienImmobilier.countDocuments({
      agenceId: agence._id,
      statut: "disponible",
    });

    const biensVendus = await BienImmobilier.countDocuments({
      agenceId: agence._id,
      statut: "vendu",
    });

    const caTotal = await BienImmobilier.aggregate([
      {
        $match: {
          agenceId: agence._id,
          statut: "vendu",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$prix" },
        },
      },
    ]);

    return res.status(200).json({
      totalBiens,
      biensDisponibles,
      biensVendus,
      chiffreAffaires: caTotal[0]?.total || 0,
      detailsParType: stats,
    });
  } catch (error) {
    console.error("❌ Erreur stats biens:", error);
    return res.status(500).json({ message: error.message });
  }
};

