// controllers/banque/banqueIHEMediaController.js
const IHE = require("../../models/banque/IHE");
const IHEMedia = require("../../models/banque/IHEMedia");
const mongoose = require("mongoose");

/**
 * 📸 Ajouter un média (photo, vidéo, document) à une IHE
 * POST /api/banque/ihe/:iheId/media
 */
exports.addMedia = async (req, res) => {
  try {
    const { iheId } = req.params;
    const { type, titre, description, url, typeFichier, taille, duree, ordre } = req.body;

    console.log("📸 [addMedia] Requête reçue:", {
      iheId,
      type,
      titre,
      url: url ? url.substring(0, 50) + "..." : null,
      userId: req.user._id,
      userRole: req.user.role,
    });

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Validation des champs requis
    if (!type || !titre || !url) {
      return res.status(400).json({
        message: "Les champs 'type', 'titre' et 'url' sont requis",
      });
    }

    // Convertir l'ID utilisateur en ObjectId pour la comparaison
    const banqueId = new mongoose.Types.ObjectId(req.user._id);

    // Vérifier que l'IHE existe et appartient à la banque
    const ihe = await IHE.findOne({
      _id: iheId,
      banqueId: banqueId,
    });

    if (!ihe) {
      console.error("❌ [addMedia] IHE non trouvée:", {
        iheId,
        banqueId: banqueId.toString(),
        userBanqueId: req.user._id,
      });
      return res.status(404).json({ message: "IHE non trouvée ou vous n'avez pas l'autorisation" });
    }

    // Créer le média
    const media = new IHEMedia({
      iheId,
      type,
      titre,
      description: description || "",
      url,
      typeFichier,
      taille,
      duree,
      ordre: ordre || 0,
      uploadPar: req.user._id,
    });

    await media.save();

    console.log("✅ [addMedia] Média créé avec succès:", {
      mediaId: media._id,
      type: media.type,
      titre: media.titre,
    });

    res.status(201).json({
      message: "✅ Média ajouté avec succès",
      media,
    });
  } catch (error) {
    console.error("❌ Erreur addMedia:", error);
    console.error("❌ Détails erreur:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 📋 Lister tous les médias d'une IHE
 * GET /api/banque/ihe/:iheId/media
 */
exports.getMedias = async (req, res) => {
  try {
    const { iheId } = req.params;
    const { type } = req.query;

    console.log("📸 [getMedias] Requête reçue:", {
      iheId,
      type,
      userId: req.user._id,
      userRole: req.user.role,
    });

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Convertir l'ID utilisateur en ObjectId pour la comparaison
    const banqueId = new mongoose.Types.ObjectId(req.user._id);

    // Vérifier que l'IHE existe et appartient à la banque
    const ihe = await IHE.findOne({
      _id: iheId,
      banqueId: banqueId,
    });

    if (!ihe) {
      console.error("❌ [getMedias] IHE non trouvée:", {
        iheId,
        banqueId: banqueId.toString(),
        userBanqueId: req.user._id,
      });
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    const filter = { iheId };
    if (type) {
      filter.type = type;
    }

    console.log("📸 [getMedias] Filtre de recherche:", filter);

    const medias = await IHEMedia.find(filter)
      .populate("uploadPar", "fullName phone")
      .sort({ ordre: 1, createdAt: 1 })
      .lean();

    console.log("📸 [getMedias] Médias trouvés:", medias.length, medias);

    res.status(200).json({
      count: medias.length,
      medias,
    });
  } catch (error) {
    console.error("❌ Erreur getMedias:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * ✏️ Mettre à jour un média
 * PUT /api/banque/ihe/:iheId/media/:mediaId
 */
exports.updateMedia = async (req, res) => {
  try {
    const { iheId, mediaId } = req.params;
    const updateData = req.body;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Vérifier que l'IHE existe et appartient à la banque
    const ihe = await IHE.findOne({
      _id: iheId,
      banqueId: req.user._id,
    });

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Vérifier que le média existe et appartient à l'IHE
    const media = await IHEMedia.findOne({
      _id: mediaId,
      iheId,
    });

    if (!media) {
      return res.status(404).json({ message: "Média non trouvé" });
    }

    // Mettre à jour
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        media[key] = updateData[key];
      }
    });

    await media.save();

    res.status(200).json({
      message: "✅ Média mis à jour avec succès",
      media,
    });
  } catch (error) {
    console.error("❌ Erreur updateMedia:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 🗑️ Supprimer un média
 * DELETE /api/banque/ihe/:iheId/media/:mediaId
 */
exports.deleteMedia = async (req, res) => {
  try {
    const { iheId, mediaId } = req.params;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Vérifier que l'IHE existe et appartient à la banque
    const ihe = await IHE.findOne({
      _id: iheId,
      banqueId: req.user._id,
    });

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Supprimer le média
    const media = await IHEMedia.findOneAndDelete({
      _id: mediaId,
      iheId,
    });

    if (!media) {
      return res.status(404).json({ message: "Média non trouvé" });
    }

    res.status(200).json({
      message: "✅ Média supprimé avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur deleteMedia:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

