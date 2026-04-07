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
      situationGeographique,
      descriptionPhysique,
      atoutsMajeurs,
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
    
    // Parser les URLs vidéos (Vimeo, YouTube, etc.) - Optionnel
    let videosData = [];
    if (videos !== undefined) {
      // Si c'est une chaîne JSON
      if (typeof videos === "string") {
        try {
          const parsed = JSON.parse(videos);
          videosData = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // Si le parsing échoue, traiter comme tableau ou valeur unique
          videosData = Array.isArray(videos) ? videos : [videos];
        }
      } else if (Array.isArray(videos)) {
        videosData = videos;
      } else {
        videosData = [videos];
      }
      videosData = videosData.filter(v => v && v.trim && v.trim() !== "");
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

    // Convertir les coordonnées en nombres ou null
    if (localisationData) {
      // Latitude
      if (localisationData.latitude !== null && localisationData.latitude !== undefined && localisationData.latitude !== "") {
        const latNum = parseFloat(localisationData.latitude);
        localisationData.latitude = isNaN(latNum) ? null : latNum;
        console.log(`✅ [CREATE_BIEN] Latitude convertie: ${localisationData.latitude}`);
      } else {
        localisationData.latitude = null;
        console.log("⚠️ [CREATE_BIEN] Latitude vide ou null");
      }

      // Longitude
      if (localisationData.longitude !== null && localisationData.longitude !== undefined && localisationData.longitude !== "") {
        const lngNum = parseFloat(localisationData.longitude);
        localisationData.longitude = isNaN(lngNum) ? null : lngNum;
        console.log(`✅ [CREATE_BIEN] Longitude convertie: ${localisationData.longitude}`);
      } else {
        localisationData.longitude = null;
        console.log("⚠️ [CREATE_BIEN] Longitude vide ou null");
      }
      
      console.log("📍 [CREATE_BIEN] Localisation finale:", {
        ville: localisationData.ville,
        quartier: localisationData.quartier,
        latitude: localisationData.latitude,
        longitude: localisationData.longitude
      });
    }

    // Parser caracteristiques si c'est une chaîne JSON - Optionnel
    let caracteristiquesData = caracteristiques || {};
    if (typeof caracteristiques === "string") {
      try {
        caracteristiquesData = JSON.parse(caracteristiques);
      } catch (e) {
        caracteristiquesData = {};
      }
    }
    
    // Vérifier si caracteristiquesData contient des valeurs valides (non vides)
    const hasValidCaracteristiques = caracteristiquesData && Object.keys(caracteristiquesData).length > 0 && 
      Object.values(caracteristiquesData).some(v => {
        if (v === null || v === undefined || v === "") return false;
        if (v === false) return false; // Les booléens false sont considérés comme valides
        if (Array.isArray(v)) return v.length > 0;
        return true;
      });

    // Parser atoutsMajeurs si c'est un tableau ou une chaîne
    let atoutsMajeursData = [];
    if (atoutsMajeurs) {
      if (Array.isArray(atoutsMajeurs)) {
        atoutsMajeursData = atoutsMajeurs.filter(a => a && a.trim() !== "");
      } else if (typeof atoutsMajeurs === "string") {
        try {
          const parsed = JSON.parse(atoutsMajeurs);
          atoutsMajeursData = Array.isArray(parsed) ? parsed.filter(a => a && a.trim() !== "") : [];
        } catch (e) {
          // Si ce n'est pas du JSON, traiter comme un seul élément
          if (atoutsMajeurs.trim() !== "") {
            atoutsMajeursData = [atoutsMajeurs.trim()];
          }
        }
      }
    }

    // Traiter situationGeographique et descriptionPhysique (peuvent être des tableaux si envoyés plusieurs fois via FormData)
    let situationGeographiqueFinal = situationGeographique;
    if (Array.isArray(situationGeographique)) {
      // Prendre la première valeur non vide
      situationGeographiqueFinal = situationGeographique.find(s => s && s.trim() !== "") || undefined;
    } else if (typeof situationGeographique === "string" && situationGeographique.trim() === "") {
      situationGeographiqueFinal = undefined;
    }

    let descriptionPhysiqueFinal = descriptionPhysique;
    if (Array.isArray(descriptionPhysique)) {
      // Prendre la première valeur non vide
      descriptionPhysiqueFinal = descriptionPhysique.find(d => d && d.trim() !== "") || undefined;
    } else if (typeof descriptionPhysique === "string" && descriptionPhysique.trim() === "") {
      descriptionPhysiqueFinal = undefined;
    }

    const bien = await BienImmobilier.create({
      type,
      titre,
      description,
      situationGeographique: situationGeographiqueFinal,
      descriptionPhysique: descriptionPhysiqueFinal,
      atoutsMajeurs: atoutsMajeursData.length > 0 ? atoutsMajeursData : undefined,
      prix: parseFloat(prix),
      superficie: superficie ? parseFloat(superficie) : undefined,
      statut: statut || "disponible",
      localisation: localisationData,
      images,
      videos: videosData.length > 0 ? videosData : undefined, // URLs vidéos (Vimeo, YouTube, etc.) - Optionnel
      documents: documents.length > 0 ? documents : undefined, // Documents - Optionnel
      visite360: visite360 || undefined, // Visite 360 - Optionnel
      caracteristiques: hasValidCaracteristiques ? caracteristiquesData : undefined, // Caractéristiques - Optionnel
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
    const bienId = req.params.id;
    console.log("🔵 [GET_BIEN_BY_ID] Récupération bien ID:", bienId);
    
    // Utiliser lean() pour obtenir un objet JavaScript pur
    const bien = await BienImmobilier.findById(bienId)
      .populate("affecteeA", "fullName phone")
      .populate("vendueA", "fullName phone")
      .populate("agenceId", "nom telephone")
      .lean();

    if (!bien) {
      console.log("❌ [GET_BIEN_BY_ID] Bien non trouvé pour ID:", bienId);
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Log des champs spécifiques
    console.log("✅ [GET_BIEN_BY_ID] Bien trouvé:", bien.titre);
    console.log("📍 [GET_BIEN_BY_ID] situationGeographique:", bien.situationGeographique, "Type:", typeof bien.situationGeographique, "Truthy:", !!bien.situationGeographique);
    console.log("🏗️ [GET_BIEN_BY_ID] descriptionPhysique:", bien.descriptionPhysique, "Type:", typeof bien.descriptionPhysique, "Truthy:", !!bien.descriptionPhysique);
    console.log("⭐ [GET_BIEN_BY_ID] atoutsMajeurs:", bien.atoutsMajeurs, "Type:", typeof bien.atoutsMajeurs, "IsArray:", Array.isArray(bien.atoutsMajeurs), "Length:", bien.atoutsMajeurs?.length);
    
    // S'assurer que tous les champs sont bien présents dans la réponse
    const responseData = {
      ...bien,
      situationGeographique: bien.situationGeographique || null,
      descriptionPhysique: bien.descriptionPhysique || null,
      atoutsMajeurs: Array.isArray(bien.atoutsMajeurs) ? bien.atoutsMajeurs : (bien.atoutsMajeurs ? [bien.atoutsMajeurs] : []),
    };
    
    console.log("📦 [GET_BIEN_BY_ID] Données finales envoyées:", {
      situationGeographique: responseData.situationGeographique,
      descriptionPhysique: responseData.descriptionPhysique,
      atoutsMajeurs: responseData.atoutsMajeurs,
      hasSituationGeo: !!responseData.situationGeographique,
      hasDescPhysique: !!responseData.descriptionPhysique,
      hasAtouts: responseData.atoutsMajeurs.length > 0
    });

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ [GET_BIEN_BY_ID] Erreur récupération bien:", error);
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
    
    // Gérer les URLs vidéos - Remplacer au lieu d'ajouter
    if (updateData.videos !== undefined) {
      let videosArray = [];
      
      // Si c'est une chaîne JSON (envoyé depuis le frontend)
      if (typeof updateData.videos === "string") {
        try {
          const parsed = JSON.parse(updateData.videos);
          videosArray = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // Si le parsing échoue, essayer comme tableau direct ou valeur unique
          videosArray = Array.isArray(updateData.videos) 
            ? updateData.videos 
            : [updateData.videos];
        }
      } else if (Array.isArray(updateData.videos)) {
        // Si c'est déjà un tableau (multer peut créer un tableau)
        videosArray = updateData.videos;
      } else {
        // Si c'est une valeur unique
        videosArray = [updateData.videos];
      }
      
      // Filtrer les valeurs vides et mettre à jour
      updateData.videos = videosArray.filter(v => v && v.trim && v.trim() !== "");
      // Si le tableau est vide après filtrage, cela supprimera toutes les vidéos existantes
    }

    // Parser localisation et caracteristiques si nécessaire
    let localisationData = updateData.localisation;
    if (localisationData && typeof localisationData === "string") {
      try {
        localisationData = JSON.parse(localisationData);
      } catch (e) {
        localisationData = {};
      }
    }

    // Convertir les coordonnées en nombres ou null (comme dans createBien)
    if (localisationData) {
      // Latitude
      if (localisationData.latitude !== null && localisationData.latitude !== undefined && localisationData.latitude !== "") {
        const latNum = parseFloat(localisationData.latitude);
        localisationData.latitude = isNaN(latNum) ? null : latNum;
        console.log(`✅ [UPDATE_BIEN] Latitude convertie: ${localisationData.latitude}`);
      } else {
        localisationData.latitude = null;
        console.log("⚠️ [UPDATE_BIEN] Latitude vide ou null");
      }

      // Longitude
      if (localisationData.longitude !== null && localisationData.longitude !== undefined && localisationData.longitude !== "") {
        const lngNum = parseFloat(localisationData.longitude);
        localisationData.longitude = isNaN(lngNum) ? null : lngNum;
        console.log(`✅ [UPDATE_BIEN] Longitude convertie: ${localisationData.longitude}`);
      } else {
        localisationData.longitude = null;
        console.log("⚠️ [UPDATE_BIEN] Longitude vide ou null");
      }
      
      console.log("📍 [UPDATE_BIEN] Localisation finale:", {
        ville: localisationData.ville,
        quartier: localisationData.quartier,
        latitude: localisationData.latitude,
        longitude: localisationData.longitude
      });
      
      updateData.localisation = localisationData;
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

    // Traiter situationGeographique et descriptionPhysique (peuvent être des tableaux si envoyés plusieurs fois via FormData)
    if (updateData.situationGeographique !== undefined) {
      let situationGeographiqueFinal = updateData.situationGeographique;
      if (Array.isArray(situationGeographiqueFinal)) {
        // Prendre la première valeur non vide
        situationGeographiqueFinal = situationGeographiqueFinal.find(s => s && typeof s === "string" && s.trim() !== "") || null;
      } else if (typeof situationGeographiqueFinal === "string") {
        situationGeographiqueFinal = situationGeographiqueFinal.trim() !== "" ? situationGeographiqueFinal.trim() : null;
      }
      // Utiliser null au lieu de undefined pour permettre la suppression explicite
      updateData.situationGeographique = situationGeographiqueFinal || null;
    }

    if (updateData.descriptionPhysique !== undefined) {
      let descriptionPhysiqueFinal = updateData.descriptionPhysique;
      if (Array.isArray(descriptionPhysiqueFinal)) {
        // Prendre la première valeur non vide
        descriptionPhysiqueFinal = descriptionPhysiqueFinal.find(d => d && typeof d === "string" && d.trim() !== "") || null;
      } else if (typeof descriptionPhysiqueFinal === "string") {
        descriptionPhysiqueFinal = descriptionPhysiqueFinal.trim() !== "" ? descriptionPhysiqueFinal.trim() : null;
      }
      // Utiliser null au lieu de undefined pour permettre la suppression explicite
      updateData.descriptionPhysique = descriptionPhysiqueFinal || null;
    }

    // Traiter atoutsMajeurs
    if (updateData.atoutsMajeurs !== undefined) {
      let atoutsMajeursData = [];
      if (Array.isArray(updateData.atoutsMajeurs)) {
        atoutsMajeursData = updateData.atoutsMajeurs.filter(a => a && a.trim && a.trim() !== "");
      } else if (typeof updateData.atoutsMajeurs === "string") {
        try {
          const parsed = JSON.parse(updateData.atoutsMajeurs);
          atoutsMajeursData = Array.isArray(parsed) ? parsed.filter(a => a && a.trim && a.trim() !== "") : [];
        } catch (e) {
          // Si ce n'est pas du JSON, traiter comme un seul élément
          if (updateData.atoutsMajeurs.trim() !== "") {
            atoutsMajeursData = [updateData.atoutsMajeurs.trim()];
          }
        }
      }
      // Si le tableau est vide, cela supprimera tous les atouts existants
      updateData.atoutsMajeurs = atoutsMajeursData.length > 0 ? atoutsMajeursData : [];
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

