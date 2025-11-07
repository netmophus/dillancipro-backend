// controllers/admin/gestionAbonnementController.js
const PatrimoineFoncier = require("../../models/PatrimoineFoncier");
const PaiementPatrimoine = require("../../models/PaiementPatrimoine");

/**
 * Récupérer tous les biens avec abonnement expiré
 * GET /api/admin/patrimoine/abonnements/expires
 */
exports.getBiensAbonnementExpire = async (req, res) => {
  try {
    const today = new Date();
    
    const biensExpires = await PatrimoineFoncier.find({
      dateExpirationAbonnement: { $lt: today },
      abonnementStatut: { $in: ["actif", "expire"] },
      visible: true, // Encore visibles mais expirés
    })
      .populate("clientId", "fullName phone email")
      .sort({ dateExpirationAbonnement: 1 });
    
    return res.status(200).json(biensExpires);
  } catch (error) {
    console.error("❌ Erreur getBiensAbonnementExpire:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les biens dont l'abonnement expire bientôt (dans X jours)
 * GET /api/admin/patrimoine/abonnements/expire-bientot?jours=30
 */
exports.getBiensAbonnementExpireBientot = async (req, res) => {
  try {
    const jours = parseInt(req.query.jours) || 30;
    const today = new Date();
    const dateMax = new Date();
    dateMax.setDate(dateMax.getDate() + jours);
    
    const biens = await PatrimoineFoncier.find({
      dateExpirationAbonnement: {
        $gte: today,
        $lte: dateMax,
      },
      abonnementStatut: "actif",
      visible: true,
    })
      .populate("clientId", "fullName phone email")
      .sort({ dateExpirationAbonnement: 1 });
    
    return res.status(200).json(biens);
  } catch (error) {
    console.error("❌ Erreur getBiensAbonnementExpireBientot:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Désactiver MANUELLEMENT un bien (abonnement non renouvelé)
 * POST /api/admin/patrimoine/:id/desactiver
 */
exports.desactiverBien = async (req, res) => {
  try {
    const bienId = req.params.id;
    const adminId = req.user.id;
    const { motifDesactivation } = req.body;
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    if (!bien.visible) {
      return res.status(400).json({ message: "Ce bien est déjà désactivé" });
    }
    
    // Désactiver
    bien.visible = false;
    bien.abonnementStatut = "expire";
    bien.desactivePar = adminId;
    bien.dateDesactivation = new Date();
    bien.motifDesactivation = motifDesactivation || "Abonnement annuel non renouvelé";
    await bien.save();
    
    return res.status(200).json({
      message: "Bien désactivé avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur desactiverBien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Réactiver MANUELLEMENT un bien (après paiement)
 * POST /api/admin/patrimoine/:id/reactiver
 */
exports.reactiverBien = async (req, res) => {
  try {
    const bienId = req.params.id;
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    if (bien.visible) {
      return res.status(400).json({ message: "Ce bien est déjà actif" });
    }
    
    // Réactiver
    bien.visible = true;
    bien.abonnementStatut = "actif";
    bien.desactivePar = null;
    bien.dateDesactivation = null;
    bien.motifDesactivation = null;
    await bien.save();
    
    return res.status(200).json({
      message: "Bien réactivé avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur reactiverBien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Enregistrer un paiement d'abonnement annuel
 * POST /api/admin/patrimoine/:id/payer-abonnement
 */
exports.enregistrerPaiementAbonnement = async (req, res) => {
  try {
    const bienId = req.params.id;
    const { montant, methodePaiement, transactionId } = req.body;
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    // Créer le paiement
    const anneeActuelle = new Date().getFullYear();
    const paiement = await PaiementPatrimoine.create({
      clientId: bien.clientId,
      patrimoineId: bien._id,
      typePaiement: "abonnement_annuel",
      anneeAbonnement: anneeActuelle,
      montant,
      statut: "paye",
      methodePaiement,
      transactionId,
      datePaiement: new Date(),
    });
    
    // Mettre à jour le bien
    bien.abonnementStatut = "actif";
    bien.dernierPaiementAbonnementId = paiement._id;
    
    if (!bien.dateDebutAbonnement) {
      bien.dateDebutAbonnement = new Date();
    }
    
    // Calculer nouvelle date d'expiration (1 an)
    const nouvelleExpiration = new Date();
    nouvelleExpiration.setFullYear(nouvelleExpiration.getFullYear() + 1);
    bien.dateExpirationAbonnement = nouvelleExpiration;
    
    // Ajouter à l'historique
    bien.historiqueAbonnements.push({
      paiementId: paiement._id,
      datePaiement: new Date(),
      montant,
    });
    
    bien.visible = true;
    await bien.save();
    
    return res.status(200).json({
      message: "Paiement d'abonnement enregistré avec succès",
      paiement,
      nouvelleExpiration,
    });
  } catch (error) {
    console.error("❌ Erreur enregistrerPaiementAbonnement:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Valider l'abonnement pour un bien (paiement espèces)
 * PUT /api/admin/patrimoine/:id/abonnement-valider
 */
exports.validerAbonnement = async (req, res) => {
  try {
    const bienId = req.params.id;
    const adminId = req.user._id || req.user.id;
    
    console.log("🔍 [VALIDER_ABONNEMENT] ID bien:", bienId);
    console.log("🔍 [VALIDER_ABONNEMENT] Admin ID:", adminId);
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    console.log("🔍 [VALIDER_ABONNEMENT] Statut actuel:", bien.abonnementStatut);
    
    // Activer l'abonnement
    bien.abonnementStatut = "actif";
    bien.dateDebutAbonnement = new Date();
    
    // Calculer la date d'expiration (1 an à partir de maintenant)
    const dateExpiration = new Date();
    dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
    bien.dateExpirationAbonnement = dateExpiration;
    
    bien.visible = true;
    await bien.save();
    
    console.log("✅ [VALIDER_ABONNEMENT] Abonnement activé pour le bien:", bien.titre);
    
    return res.status(200).json({
      message: "✅ Abonnement activé avec succès",
      bien,
      dateExpiration: bien.dateExpirationAbonnement,
    });
  } catch (error) {
    console.error("❌ Erreur validerAbonnement:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Statistiques abonnements
 * GET /api/admin/patrimoine/abonnements/stats
 */
exports.getStatsAbonnements = async (req, res) => {
  try {
    const today = new Date();
    const dans30jours = new Date();
    dans30jours.setDate(dans30jours.getDate() + 30);
    
    const stats = {
      total: await PatrimoineFoncier.countDocuments(),
      actifs: await PatrimoineFoncier.countDocuments({ abonnementStatut: "actif", visible: true }),
      expires: await PatrimoineFoncier.countDocuments({ 
        abonnementStatut: "expire",
        dateExpirationAbonnement: { $lt: today },
        visible: true,
      }),
      expireSous30jours: await PatrimoineFoncier.countDocuments({
        dateExpirationAbonnement: { $gte: today, $lte: dans30jours },
        abonnementStatut: "actif",
        visible: true,
      }),
      desactives: await PatrimoineFoncier.countDocuments({ visible: false }),
    };
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error("❌ Erreur getStatsAbonnements:", error);
    return res.status(500).json({ message: error.message });
  }
};

