// controllers/notaire/venteController.js
const mongoose = require("mongoose");
const VenteBienImmobilier = require("../../models/agences/VenteBienImmobilier");
const Vente = require("../../models/agences/Vente"); // Vente de parcelles
const BienImmobilier = require("../../models/agences/BienImmobilier");
const Notaire = require("../../models/Notaire");
const User = require("../../models/User");
const Agence = require("../../models/Agence");

/**
 * Récupérer toutes les ventes assignées à ce notaire
 * GET /api/notaire/ventes
 */
exports.getMesVentes = async (req, res) => {
  try {
    // Récupérer le notaire associé à l'utilisateur connecté
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const { statut } = req.query;
    
    const query = { notaireId: notaire._id };
    if (statut) {
      query.statut = statut;
    }

    const ventes = await VenteBienImmobilier.find(query)
      .populate("bienId") // Populate tous les champs du bien
      .populate("clientId", "fullName phone email") // ✅ Utiliser User.fullName directement
      .populate("commercialId", "fullName phone email") // ✅ Utiliser User.fullName directement
      .populate("agenceId", "nom")
      .sort({ createdAt: -1 });

    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur récupération ventes notaire:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer une vente spécifique par ID
 * GET /api/notaire/ventes/:id
 */
exports.getVenteById = async (req, res) => {
  try {
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await VenteBienImmobilier.findById(req.params.id)
      .populate("bienId") // Populate tous les champs du bien
      .populate("clientId", "fullName phone email") // ✅ Utiliser User.fullName directement
      .populate("commercialId", "fullName phone email") // ✅ Utiliser User.fullName directement
      .populate("agenceId", "nom")
      .populate("notaireId", "fullName cabinetName phone email");

    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Debug: vérifier si le bien est peuplé
    console.log(`🔍 [NOTAIRE] Vente ${req.params.id} - bienId peuplé:`, !!vente.bienId);
    if (vente.bienId) {
      console.log(`✅ [NOTAIRE] Bien trouvé: ${vente.bienId.titre}, Prix: ${vente.bienId.prix}`);
    } else {
      console.warn(`⚠️ [NOTAIRE] Bien non trouvé pour vente ${req.params.id}`);
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId && vente.notaireId._id) {
      if (vente.notaireId._id.toString() !== notaire._id.toString()) {
        return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
      }
    } else {
      // Si notaireId n'est pas peuplé, vérifier directement
      if (vente.notaireId && vente.notaireId.toString() !== notaire._id.toString()) {
        return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
      }
    }

    return res.status(200).json(vente);
  } catch (error) {
    console.error("❌ Erreur récupération vente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Mettre à jour le statut d'une vente
 * PUT /api/notaire/ventes/:id/statut
 */
exports.updateStatut = async (req, res) => {
  try {
    const { statut, notes } = req.body;

    if (!statut) {
      return res.status(400).json({ message: "Le statut est requis" });
    }

    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await VenteBienImmobilier.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    const ancienStatut = vente.statut;
    
    // Mettre à jour le statut
    vente.statut = statut;
    if (statut === "formalites_completes") {
      vente.dateCompletionFormalites = new Date();
    }
    if (notes) {
      vente.notes = notes;
    }

    // Ajouter une entrée à l'historique
    vente.historique.push({
      action: "statut_modifie",
      description: `Statut modifié de "${ancienStatut}" à "${statut}"`,
      acteur: req.user._id,
      acteurType: "Notaire",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        ancienStatut,
        nouveauStatut: statut,
        notes: notes || null,
      },
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "bienId", select: "titre type prix" },
      { path: "clientId", select: "fullName phone email" }, // ✅ Utiliser User.fullName directement
      { path: "commercialId", select: "fullName phone email" }, // ✅ Utiliser User.fullName directement
      { path: "notaireId", select: "fullName cabinetName" },
    ]);

    return res.status(200).json({
      message: "Statut mis à jour avec succès",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour statut:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Uploader un document notarial
 * POST /api/notaire/ventes/:id/documents
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { nom, type } = req.body;
    
    // Récupérer l'URL du document depuis Cloudinary
    const documentUrl = req.cloudinary?.url || req.file?.path || null;

    if (!nom || !type || !documentUrl) {
      return res.status(400).json({ message: "Nom, type et document sont requis" });
    }

    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await VenteBienImmobilier.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    // Ajouter le document (utiliser l'URL Cloudinary)
    vente.documentsNotariaux.push({
      nom,
      type,
      url: documentUrl,
      uploadPar: req.user._id,
      uploadLe: new Date(),
    });

    // Ajouter à l'historique
    vente.historique.push({
      action: "document_upload",
      description: `Document "${nom}" uploadé`,
      acteur: req.user._id,
      acteurType: "Notaire",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        documentNom: nom,
        documentType: type,
      },
    });

    await vente.save();

    return res.status(200).json({
      message: "Document uploadé avec succès",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur upload document:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Supprimer un document notarial
 * DELETE /api/notaire/ventes/:id/documents/:docId
 */
exports.deleteDocument = async (req, res) => {
  try {
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await VenteBienImmobilier.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    const docId = req.params.docId;
    const document = vente.documentsNotariaux.id(docId);
    
    if (!document) {
      return res.status(404).json({ message: "Document non trouvé" });
    }

    const docNom = document.nom;
    vente.documentsNotariaux.pull(docId);

    // Ajouter à l'historique
    vente.historique.push({
      action: "document_supprime",
      description: `Document "${docNom}" supprimé`,
      acteur: req.user._id,
      acteurType: "Notaire",
      acteurNom: req.user.fullName || req.user.phone,
    });

    await vente.save();

    return res.status(200).json({
      message: "Document supprimé avec succès",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur suppression document:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Finaliser une vente (valider les formalités)
 * PUT /api/notaire/ventes/:id/finaliser
 */
exports.finaliserVente = async (req, res) => {
  try {
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await VenteBienImmobilier.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    // Mettre à jour le statut - documents prêts, en attente de signature par toutes les parties
    vente.statut = "en_attente_signature"; // Documents prêts, attente de signature
    vente.dateCompletionFormalites = new Date();

    // Ajouter à l'historique
    vente.historique.push({
      action: "formalites_completes",
      description: "Documents de vente prêts - En attente de signature par le commercial, le client et l'agence",
      acteur: req.user._id,
      acteurType: "Notaire",
      acteurNom: req.user.fullName || req.user.phone,
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "bienId", select: "titre type prix" },
      { path: "clientId", select: "fullName phone email" }, // ✅ Utiliser User.fullName directement
      { path: "commercialId", select: "fullName phone email" }, // ✅ Utiliser User.fullName directement
      { path: "notaireId", select: "fullName cabinetName" },
    ]);

    return res.status(200).json({
      message: "Documents de vente prêts. En attente de signature par le commercial, le client et l'agence.",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur finalisation vente:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ========== VENTES DE PARCELLES ==========

/**
 * Récupérer toutes les ventes de parcelles assignées à ce notaire
 * GET /api/notaire/ventes-parcelles
 */
exports.getMesVentesParcelles = async (req, res) => {
  try {
    console.log(`🔍 [NOTAIRE] Recherche notaire pour userId: ${req.user._id}`);
    console.log(`🔍 [NOTAIRE] Modèle Vente chargé:`, typeof Vente);
    
    // Récupérer le notaire associé à l'utilisateur connecté
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      console.error(`❌ [NOTAIRE] Notaire non trouvé pour userId: ${req.user._id}`);
      return res.status(404).json({ message: "Notaire non trouvé. Vérifiez que votre compte est bien associé à un notaire." });
    }

    console.log(`✅ [NOTAIRE] Notaire trouvé: ${notaire._id} (${notaire.fullName})`);

    const { statut } = req.query;
    
    // Créer la query - MongoDB comparera automatiquement les ObjectId
    const query = { notaireId: notaire._id };
    if (statut && statut !== "all") {
      query.statut = statut;
    }

    console.log(`🔍 [NOTAIRE] Recherche ventes avec query:`, {
      notaireId: notaire._id.toString(),
      statut: query.statut || "all"
    });

    // Récupérer les ventes avec populate
    const ventes = await Vente.find(query)
      .populate("parcelle", "numeroParcelle prix superficie localisation")
      .populate("clientId", "fullName phone email")
      .populate("commercialId", "fullName phone email")
      .populate("agenceId", "nom")
      .sort({ createdAt: -1 });

    console.log(`✅ [NOTAIRE] ${ventes.length} ventes de parcelles trouvées pour le notaire ${notaire._id}`);

    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur récupération ventes parcelles notaire:", error);
    console.error("❌ Stack:", error.stack);
    return res.status(500).json({ 
      message: error.message || "Erreur lors de la récupération des ventes de parcelles",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

/**
 * Récupérer une vente de parcelle spécifique par ID
 * GET /api/notaire/ventes-parcelles/:id
 */
exports.getVenteParcelleById = async (req, res) => {
  try {
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await Vente.findById(req.params.id)
      .populate("parcelle")
      .populate("clientId", "fullName phone email")
      .populate("commercialId", "fullName phone email")
      .populate("agenceId", "nom")
      .populate("notaireId", "fullName cabinetName phone email");

    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId._id.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    return res.status(200).json(vente);
  } catch (error) {
    console.error("❌ Erreur récupération vente parcelle:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Mettre à jour le statut d'une vente de parcelle
 * PUT /api/notaire/ventes-parcelles/:id/statut
 */
exports.updateStatutParcelle = async (req, res) => {
  try {
    const { statut, notes } = req.body;

    if (!statut) {
      return res.status(400).json({ message: "Le statut est requis" });
    }

    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    const ancienStatut = vente.statut;
    
    // Mettre à jour le statut
    vente.statut = statut;
    if (statut === "formalites_completes") {
      vente.dateCompletionFormalites = new Date();
    }
    if (statut === "en_cours_notariat") {
      vente.dateAssignationNotaire = vente.dateAssignationNotaire || new Date();
    }
    if (notes) {
      vente.notes = notes;
    }

    // Ajouter une entrée à l'historique
    vente.historique.push({
      action: "statut_modifie",
      description: `Statut modifié de "${ancienStatut}" à "${statut}"`,
      acteur: req.user._id,
      acteurType: "Notaire",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        ancienStatut,
        nouveauStatut: statut,
        notes: notes || null,
      },
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "parcelle", select: "numeroParcelle prix superficie" },
      { path: "clientId", select: "fullName phone email" },
      { path: "commercialId", select: "fullName phone email" },
      { path: "notaireId", select: "fullName cabinetName" },
    ]);

    return res.status(200).json({
      message: "Statut mis à jour avec succès",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour statut parcelle:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Finaliser une vente de parcelle (valider les formalités)
 * PUT /api/notaire/ventes-parcelles/:id/finaliser
 */
exports.finaliserVenteParcelle = async (req, res) => {
  try {
    const notaire = await Notaire.findOne({ userId: req.user._id });
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est assignée à ce notaire
    if (vente.notaireId.toString() !== notaire._id.toString()) {
      return res.status(403).json({ message: "Cette vente ne vous est pas assignée" });
    }

    // Mettre à jour le statut - documents prêts, en attente de signature par toutes les parties
    vente.statut = "en_attente_signature";
    vente.dateCompletionFormalites = new Date();

    // Ajouter à l'historique
    vente.historique.push({
      action: "formalites_completes",
      description: "Documents de vente prêts - En attente de signature par le commercial, le client et l'agence",
      acteur: req.user._id,
      acteurType: "Notaire",
      acteurNom: req.user.fullName || req.user.phone,
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "parcelle", select: "numeroParcelle prix superficie" },
      { path: "clientId", select: "fullName phone email" },
      { path: "commercialId", select: "fullName phone email" },
      { path: "notaireId", select: "fullName cabinetName" },
      { path: "agenceId", select: "nom" },
    ]);

    return res.status(200).json({
      message: "Documents de vente prêts. En attente de signature par le commercial, le client et l'agence.",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur finalisation vente parcelle:", error);
    return res.status(500).json({ message: error.message });
  }
};

