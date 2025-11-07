// controllers/paiementPatrimoineController.js
const PaiementPatrimoine = require("../models/PaiementPatrimoine");
const PatrimoineFoncier = require("../models/PatrimoineFoncier");
const TarifPatrimoine = require("../models/TarifPatrimoine");

/**
 * Initier un paiement pour ajout de bien
 * POST /api/client/patrimoine/paiement/initier
 */
exports.initierPaiement = async (req, res) => {
  try {
    const { patrimoineId, methodePaiement } = req.body;
    const clientId = req.user.id;

    // Vérifier que le bien existe
    const bien = await PatrimoineFoncier.findById(patrimoineId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }

    // Vérifier que le bien appartient au client
    if (bien.clientId.toString() !== clientId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Vérifier si déjà payé
    if (bien.paiementStatut === "paye") {
      return res.status(400).json({ message: "Ce bien est déjà payé" });
    }

    // Récupérer le tarif
    const tarif = await TarifPatrimoine.findOne({ typeBien: bien.type });
    if (!tarif) {
      return res.status(404).json({ message: "Tarif non configuré pour ce type de bien" });
    }

    // Créer le paiement
    const paiement = await PaiementPatrimoine.create({
      clientId,
      patrimoineId,
      typePaiement: "ajout_bien",
      montant: tarif.montantAjout,
      statut: "en_attente",
      methodePaiement,
    });

    // TODO: Intégrer l'API de paiement mobile (CinetPay, etc.)
    // Pour l'instant, on retourne les infos pour paiement manuel

    return res.status(201).json({
      message: "Paiement initié avec succès",
      paiement: {
        id: paiement._id,
        reference: paiement.reference,
        montant: paiement.montant,
        typeBien: bien.type,
        methodePaiement: paiement.methodePaiement,
      },
      // instructions: "Veuillez effectuer le paiement via " + methodePaiement,
    });
  } catch (error) {
    console.error("❌ Erreur initierPaiement:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Valider un paiement (admin ou webhook)
 * POST /api/admin/patrimoine/paiement/valider
 */
exports.validerPaiement = async (req, res) => {
  try {
    const { paiementId, transactionId } = req.body;

    const paiement = await PaiementPatrimoine.findById(paiementId);
    if (!paiement) {
      return res.status(404).json({ message: "Paiement non trouvé" });
    }

    // Mettre à jour le paiement
    paiement.statut = "paye";
    paiement.datePaiement = new Date();
    paiement.transactionId = transactionId;
    await paiement.save();

    // Mettre à jour le bien
    const bien = await PatrimoineFoncier.findById(paiement.patrimoineId);
    if (bien) {
      bien.paiementStatut = "paye";
      bien.paiementId = paiement._id;
      bien.montantPaye = paiement.montant;
      bien.datePaiement = new Date();
      bien.visible = true; // Rendre visible
      
      // Calculer date d'expiration (3 mois)
      const expiration = new Date();
      expiration.setMonth(expiration.getMonth() + 3);
      bien.dateExpiration = expiration;
      
      await bien.save();
    }

    return res.status(200).json({
      message: "Paiement validé avec succès",
      paiement,
    });
  } catch (error) {
    console.error("❌ Erreur validerPaiement:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer les paiements d'un client
 * GET /api/client/patrimoine/paiements
 */
exports.getMesPaiements = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    const paiements = await PaiementPatrimoine.find({ clientId })
      .populate("patrimoineId", "titre type")
      .sort({ createdAt: -1 });
    
    return res.status(200).json(paiements);
  } catch (error) {
    console.error("❌ Erreur getMesPaiements:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les paiements (admin)
 * GET /api/admin/patrimoine/paiements
 */
exports.getAllPaiements = async (req, res) => {
  try {
    const { statut } = req.query;
    
    const filter = {};
    if (statut) filter.statut = statut;
    
    const paiements = await PaiementPatrimoine.find(filter)
      .populate("clientId", "fullName phone")
      .populate("patrimoineId", "titre type")
      .sort({ createdAt: -1 });
    
    return res.status(200).json(paiements);
  } catch (error) {
    console.error("❌ Erreur getAllPaiements:", error);
    return res.status(500).json({ message: error.message });
  }
};

