// controllers/ventePatrimoineController.js
const VentePatrimoine = require("../models/VentePatrimoine");
const PatrimoineFoncier = require("../models/PatrimoineFoncier");
const TarifPatrimoine = require("../models/TarifPatrimoine");
const PaiementPatrimoine = require("../models/PaiementPatrimoine");

/**
 * Soumettre un bien à la vente via Softlink
 * POST /api/client/patrimoine/soumettre-vente
 */
exports.soumettreVente = async (req, res) => {
  try {
    const { patrimoineId, prixVente } = req.body;
    const vendeurId = req.user._id || req.user.id;

    console.log("🔍 [SOUMETTRE_VENTE] Demande de soumission de vente");
    console.log("🔍 [SOUMETTRE_VENTE] Bien ID:", patrimoineId);
    console.log("🔍 [SOUMETTRE_VENTE] Vendeur ID:", vendeurId);
    console.log("🔍 [SOUMETTRE_VENTE] User:", req.user);

    if (!patrimoineId || !prixVente) {
      return res.status(400).json({ message: "Bien et prix de vente requis" });
    }

    // Vérifier que le bien existe
    const bien = await PatrimoineFoncier.findById(patrimoineId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    console.log("🔍 [SOUMETTRE_VENTE] Bien trouvé:", bien.titre);
    console.log("🔍 [SOUMETTRE_VENTE] Bien clientId:", bien.clientId);
    console.log("🔍 [SOUMETTRE_VENTE] Comparaison:", bien.clientId.toString(), "===", vendeurId.toString());

    // Vérifier que le bien appartient au client
    if (bien.clientId.toString() !== vendeurId.toString()) {
      console.log("❌ [SOUMETTRE_VENTE] IDs ne correspondent pas!");
      return res.status(403).json({ message: "Vous ne pouvez pas vendre un bien qui ne vous appartient pas" });
    }

    console.log("✅ [SOUMETTRE_VENTE] Propriété vérifiée");

    // Vérifier que le bien est payé et visible
    console.log("🔍 [SOUMETTRE_VENTE] Enregistrement statut:", bien.enregistrementStatut);
    if (bien.enregistrementStatut !== "paye") {
      console.log("❌ [SOUMETTRE_VENTE] Enregistrement non payé");
      return res.status(400).json({ message: "Vous devez d'abord payer l'enregistrement avant de le mettre en vente" });
    }

    // Vérifier que l'abonnement est actif
    console.log("🔍 [SOUMETTRE_VENTE] Abonnement statut:", bien.abonnementStatut);
    if (bien.abonnementStatut !== "actif") {
      console.log("❌ [SOUMETTRE_VENTE] Abonnement non actif");
      return res.status(400).json({ message: "Votre abonnement doit être actif pour mettre ce bien en vente" });
    }

    console.log("✅ [SOUMETTRE_VENTE] Enregistrement et abonnement OK");

    // Vérifier qu'il n'est pas déjà soumis
    if (bien.soumiseVente) {
      return res.status(400).json({ message: "Ce bien est déjà soumis à la vente" });
    }

    // Récupérer le taux de commission
    const tarif = await TarifPatrimoine.findOne({ typeBien: bien.type });
    const commissionPourcentage = tarif ? tarif.commissionVente : 5;

    console.log("✅ [SOUMETTRE_VENTE] Toutes les vérifications OK, création de la vente...");
    
    // Créer la vente
    const vente = await VentePatrimoine.create({
      patrimoineId,
      vendeurId,
      prixVente,
      commissionPourcentage,
      commissionMontant: (prixVente * commissionPourcentage) / 100,
      statut: "soumise",
    });

    console.log("✅ [SOUMETTRE_VENTE] Vente créée:", vente._id);

    // Mettre à jour le bien
    bien.soumiseVente = true;
    bien.venteId = vente._id;
    bien.statut = "en_vente";
    await bien.save();

    return res.status(201).json({
      message: "Bien soumis à la vente avec succès. En attente de validation par Softlink.",
      vente: {
        id: vente._id,
        prixVente: vente.prixVente,
        commission: `${commissionPourcentage}% (${vente.commissionMontant} FCFA)`,
        statut: vente.statut,
      },
    });
  } catch (error) {
    console.error("❌ Erreur soumettreVente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer les ventes soumises d'un client
 * GET /api/client/patrimoine/mes-ventes
 */
exports.getMesVentes = async (req, res) => {
  try {
    const vendeurId = req.user._id || req.user.id;
    
    const ventes = await VentePatrimoine.find({ vendeurId })
      .populate("patrimoineId") // Populate complet pour avoir toutes les infos
      .sort({ createdAt: -1 });
    
    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur getMesVentes:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer toutes les ventes soumises (admin)
 * GET /api/admin/patrimoine/ventes
 */
exports.getAllVentes = async (req, res) => {
  try {
    const { statut } = req.query;
    
    const filter = {};
    if (statut) filter.statut = statut;
    
    const ventes = await VentePatrimoine.find(filter)
      .populate("vendeurId", "fullName phone email")
      .populate("patrimoineId") // Populate complet pour avoir toutes les infos
      .populate("valideePar", "fullName")
      .populate("acheteurId", "fullName phone")
      .sort({ createdAt: -1 });
    
    console.log("✅ [GET_ALL_VENTES] Ventes trouvées:", ventes.length);
    
    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur getAllVentes:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Valider une vente (admin Softlink)
 * POST /api/admin/patrimoine/ventes/:id/valider
 */
exports.validerVente = async (req, res) => {
  try {
    const venteId = req.params.id;
    const adminId = req.user._id || req.user.id;

    const vente = await VentePatrimoine.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    if (vente.statut !== "soumise") {
      return res.status(400).json({ message: "Cette vente a déjà été traitée" });
    }

    vente.statut = "approuvee";
    vente.valideePar = adminId;
    vente.dateValidation = new Date();
    await vente.save();

    return res.status(200).json({
      message: "Vente approuvée avec succès",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur validerVente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Rejeter une vente (admin Softlink)
 * POST /api/admin/patrimoine/ventes/:id/rejeter
 */
exports.rejeterVente = async (req, res) => {
  try {
    const venteId = req.params.id;
    const { motifRejet } = req.body;
    const adminId = req.user._id || req.user.id;

    const vente = await VentePatrimoine.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    vente.statut = "rejetee";
    vente.motifRejet = motifRejet;
    vente.valideePar = adminId;
    vente.dateValidation = new Date();
    await vente.save();

    // Mettre à jour le bien
    const bien = await PatrimoineFoncier.findById(vente.patrimoineId);
    if (bien) {
      bien.soumiseVente = false;
      bien.venteId = null;
      bien.statut = "possede";
      await bien.save();
    }

    return res.status(200).json({
      message: "Vente rejetée",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur rejeterVente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Marquer une vente comme vendue
 * POST /api/admin/patrimoine/ventes/:id/marquer-vendue
 */
exports.marquerVendue = async (req, res) => {
  try {
    const venteId = req.params.id;
    const { acheteurNom, acheteurPhone, acheteurEmail } = req.body;

    console.log("💰 [MARQUER_VENDUE] Début traitement de la vente:", venteId);

    const vente = await VentePatrimoine.findById(venteId).populate("patrimoineId");
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    if (vente.statut !== "approuvee") {
      return res.status(400).json({ message: "Cette vente doit d'abord être approuvée" });
    }

    // Récupérer le bien vendu
    const bienOriginal = await PatrimoineFoncier.findById(vente.patrimoineId);
    if (!bienOriginal) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    console.log("💰 [MARQUER_VENDUE] Bien original trouvé:", bienOriginal.titre);

    // 1. Archiver le bien chez le vendeur (A)
    bienOriginal.statut = "vendu";
    bienOriginal.visible = false;
    bienOriginal.dateVente = new Date();
    bienOriginal.acheteurNom = acheteurNom;
    bienOriginal.acheteurPhone = acheteurPhone;
    bienOriginal.soumiseVente = false;
    bienOriginal.venteId = vente._id;
    await bienOriginal.save();

    console.log("✅ [MARQUER_VENDUE] Bien archivé chez le vendeur");

    // 2. Chercher ou créer l'acheteur dans le système
    const User = require("../models/User");
    let acheteur = await User.findOne({ phone: acheteurPhone });

    if (!acheteur) {
      console.log("🔍 [MARQUER_VENDUE] Acheteur non trouvé, création d'un compte client");
      // Créer un compte User pour l'acheteur
      const acheteurFullName = acheteurNom && acheteurNom.trim() 
        ? acheteurNom.trim() 
        : `Client ${acheteurPhone}`; // ✅ S'assurer que fullName n'est jamais vide
      acheteur = await User.create({
        phone: acheteurPhone,
        password: "TempPassword123!", // Mot de passe temporaire
        role: "User",
        fullName: acheteurFullName, // ✅ S'assurer que fullName est dans User
        email: acheteurEmail || "",
      });
      console.log("✅ [MARQUER_VENDUE] Compte acheteur créé:", acheteur._id);
    } else {
      console.log("✅ [MARQUER_VENDUE] Acheteur existant trouvé:", acheteur._id);
    }

    // 3. Créer une copie du bien pour l'acheteur (B)
    const bienAcheteur = await PatrimoineFoncier.create({
      clientId: acheteur._id,
      type: bienOriginal.type,
      reference: `${bienOriginal.reference}_ACHETE`,
      titre: bienOriginal.titre,
      description: bienOriginal.description,
      superficie: bienOriginal.superficie,
      valeurEstimee: bienOriginal.valeurEstimee,
      localisation: bienOriginal.localisation,
      titreFoncier: bienOriginal.titreFoncier,
      numeroTitre: bienOriginal.numeroTitre,
      dateAcquisition: new Date(), // Date d'achat = maintenant
      modeAcquisition: "achat",
      statut: "possede",
      photos: bienOriginal.photos,
      documents: bienOriginal.documents,
      videoUrl: bienOriginal.videoUrl,
      caracteristiques: bienOriginal.caracteristiques,
      notes: bienOriginal.notes,
      
      // Statuts (l'acheteur n'a pas besoin de repayer l'enregistrement)
      enregistrementStatut: "paye", // Transféré avec le bien
      abonnementStatut: "en_attente", // Doit souscrire à un nouvel abonnement
      visible: true, // Visible dès l'acquisition
      
      // Historique de vente
      source: "achat_particulier",
      ancienProprietaire: bienOriginal.clientId,
      venteId: vente._id,
      dateAcquisitionVente: new Date(),
      
      // Vérification
      statutVerification: "verifie", // Déjà vérifié
      verifiePar: bienOriginal.verifiePar,
      dateVerification: bienOriginal.dateVerification,
    });

    console.log("✅ [MARQUER_VENDUE] Bien créé pour l'acheteur:", bienAcheteur._id);

    // 4. Mettre à jour la vente
    vente.statut = "vendue";
    vente.dateVente = new Date();
    vente.acheteurNom = acheteurNom;
    vente.acheteurPhone = acheteurPhone;
    vente.acheteurEmail = acheteurEmail;
    vente.bienAcheteurId = bienAcheteur._id;
    vente.acheteurId = acheteur._id;
    await vente.save();

    console.log("✅ [MARQUER_VENDUE] Vente mise à jour");

    // 5. Créer le paiement de commission
    const paiementCommission = await PaiementPatrimoine.create({
      clientId: vente.vendeurId,
      patrimoineId: vente.patrimoineId,
      venteId: vente._id,
      typePaiement: "commission_vente",
      montant: vente.commissionMontant,
      statut: "en_attente",
    });

    vente.paiementCommissionId = paiementCommission._id;
    await vente.save();

    console.log("✅ [MARQUER_VENDUE] Paiement commission créé:", paiementCommission._id);

    return res.status(200).json({
      message: "✅ Vente finalisée. Le bien a été transféré à l'acheteur dans son patrimoine.",
      vente,
      acheteur: {
        id: acheteur._id,
        nom: acheteur.fullName,
        phone: acheteur.phone,
        email: acheteur.email,
      },
      bienAcheteurId: bienAcheteur._id,
      commission: {
        montant: vente.commissionMontant,
        reference: paiementCommission.reference,
      },
    });
  } catch (error) {
    console.error("❌ Erreur marquerVendue:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Annuler une vente soumise (client)
 * DELETE /api/client/patrimoine/ventes/:id/annuler
 */
exports.annulerVente = async (req, res) => {
  try {
    const venteId = req.params.id;
    const vendeurId = req.user._id || req.user.id;

    const vente = await VentePatrimoine.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    if (vente.vendeurId.toString() !== vendeurId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    if (vente.statut === "vendue") {
      return res.status(400).json({ message: "Impossible d'annuler une vente déjà réalisée" });
    }

    vente.statut = "annulee";
    await vente.save();

    // Mettre à jour le bien
    const bien = await PatrimoineFoncier.findById(vente.patrimoineId);
    if (bien) {
      bien.soumiseVente = false;
      bien.venteId = null;
      bien.statut = "possede";
      await bien.save();
    }

    return res.status(200).json({ message: "Vente annulée avec succès" });
  } catch (error) {
    console.error("❌ Erreur annulerVente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Faire une contre-proposition de prix (admin)
 * PUT /api/admin/patrimoine/ventes/:id/contre-proposer
 */
exports.contreProposer = async (req, res) => {
  try {
    const venteId = req.params.id;
    const { prixPropose } = req.body;

    console.log("💰 [CONTRE_PROPOSER] Vente:", venteId, "Prix proposé:", prixPropose);

    if (!prixPropose || prixPropose <= 0) {
      return res.status(400).json({ message: "Prix invalide" });
    }

    const vente = await VentePatrimoine.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    if (vente.statut !== "soumise") {
      return res.status(400).json({ message: "Cette vente ne peut plus être modifiée" });
    }

    // Mettre à jour avec la contre-proposition
    vente.contrePropositionPrix = prixPropose;
    vente.contrePropositionDate = new Date();
    vente.statut = "contre_propose";
    await vente.save();

    console.log("✅ [CONTRE_PROPOSER] Contre-proposition enregistrée");

    return res.status(200).json({
      message: "Contre-proposition envoyée au client",
      vente: {
        id: vente._id,
        prixOriginal: vente.prixVente,
        prixPropose: vente.contrePropositionPrix,
        statut: vente.statut,
      },
    });
  } catch (error) {
    console.error("❌ Erreur contreProposer:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Accepter une contre-proposition (client)
 * PUT /api/client/patrimoine/ventes/:id/accepter-contre-proposition
 */
exports.accepterContreProposition = async (req, res) => {
  try {
    const venteId = req.params.id;
    const vendeurId = req.user._id || req.user.id;

    console.log("✅ [ACCEPTER_CONTRE_PROP] Vente:", venteId);

    const vente = await VentePatrimoine.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    if (vente.vendeurId.toString() !== vendeurId.toString()) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette vente" });
    }

    if (vente.statut !== "contre_propose") {
      return res.status(400).json({ message: "Aucune contre-proposition en attente" });
    }

    // Accepter la contre-proposition
    vente.contrePropositionAcceptee = true;
    vente.prixVente = vente.contrePropositionPrix; // Mettre à jour le prix
    vente.statut = "soumise"; // Revenir à "soumise" pour que l'admin valide finalement
    await vente.save();

    console.log("✅ [ACCEPTER_CONTRE_PROP] Contre-proposition acceptée");

    // Récupérer le tarif pour recalculer la commission
    const tarif = await TarifPatrimoine.findOne({ typeBien: vente.patrimoineId?.type });
    const commissionPourcentage = tarif ? tarif.commissionVente : 5;
    const commissionMontant = (vente.prixVente * commissionPourcentage) / 100;

    vente.commissionPourcentage = commissionPourcentage;
    vente.commissionMontant = commissionMontant;
    await vente.save();

    return res.status(200).json({
      message: "Contre-proposition acceptée. La vente sera validée par l'admin.",
      vente: {
        id: vente._id,
        prixVente: vente.prixVente,
        commission: `${commissionPourcentage}% (${commissionMontant} FCFA)`,
      },
    });
  } catch (error) {
    console.error("❌ Erreur accepterContreProposition:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Refuser une contre-proposition (client)
 * PUT /api/client/patrimoine/ventes/:id/refuser-contre-proposition
 */
exports.refuserContreProposition = async (req, res) => {
  try {
    const venteId = req.params.id;
    const vendeurId = req.user._id || req.user.id;

    console.log("❌ [REFUSER_CONTRE_PROP] Vente:", venteId);

    const vente = await VentePatrimoine.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    if (vente.vendeurId.toString() !== vendeurId.toString()) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette vente" });
    }

    if (vente.statut !== "contre_propose") {
      return res.status(400).json({ message: "Aucune contre-proposition en attente" });
    }

    // Annuler la vente
    vente.statut = "annulee";
    await vente.save();

    // Mettre à jour le bien
    const bien = await PatrimoineFoncier.findById(vente.patrimoineId);
    if (bien) {
      bien.soumiseVente = false;
      bien.venteId = null;
      bien.statut = "possede";
      await bien.save();
    }

    console.log("✅ [REFUSER_CONTRE_PROP] Contre-proposition refusée, vente annulée");

    return res.status(200).json({
      message: "Contre-proposition refusée. La vente a été annulée.",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur refuserContreProposition:", error);
    return res.status(500).json({ message: error.message });
  }
};

