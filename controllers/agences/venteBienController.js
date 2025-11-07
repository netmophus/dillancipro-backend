// controllers/agences/venteBienController.js
const VenteBienImmobilier = require("../../models/agences/VenteBienImmobilier");
const BienImmobilier = require("../../models/agences/BienImmobilier");
const UserProfile = require("../../models/UserProfile");
const Agence = require("../../models/Agence");

/**
 * Récupérer toutes les ventes d'un commercial
 * GET /api/agence/ventes/commercial
 */
exports.getMesVentesCommercial = async (req, res) => {
  try {
    const ventes = await VenteBienImmobilier.find({ commercialId: req.user._id })
      .populate("bienId", "titre type prix superficie localisation images statut")
      .populate("clientId", "fullName phone email")
      .populate("commercialId", "fullName phone email")
      .populate("agenceId", "nom")
      .populate("notaireId", "fullName cabinetName phone email")
      .sort({ createdAt: -1 });

    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur récupération ventes commercial:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer toutes les ventes d'un client
 * GET /api/agence/ventes/client
 */
exports.getMesVentesClient = async (req, res) => {
  try {
    const ventes = await VenteBienImmobilier.find({ clientId: req.user._id })
      .populate("bienId", "titre type prix superficie localisation images statut")
      .populate("clientId", "fullName phone email")
      .populate("commercialId", "fullName phone email")
      .populate("agenceId", "nom")
      .populate("notaireId", "fullName cabinetName phone email")
      .sort({ createdAt: -1 });

    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur récupération ventes client:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer toutes les ventes d'une agence
 * GET /api/agence/ventes/agence
 */
exports.getMesVentesAgence = async (req, res) => {
  try {
    if (!req.user.agenceId) {
      return res.status(403).json({ message: "Vous devez être associé à une agence" });
    }

    const ventes = await VenteBienImmobilier.find({ agenceId: req.user.agenceId })
      .populate("bienId", "titre type prix superficie localisation images statut")
      .populate("clientId", "fullName phone email")
      .populate("commercialId", "fullName phone email")
      .populate("agenceId", "nom")
      .populate("notaireId", "fullName cabinetName phone email")
      .sort({ createdAt: -1 });

    return res.status(200).json(ventes);
  } catch (error) {
    console.error("❌ Erreur récupération ventes agence:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer une vente spécifique par ID
 * GET /api/agence/ventes/:id
 */
exports.getVenteById = async (req, res) => {
  try {
    const venteId = req.params.id;
    const vente = await VenteBienImmobilier.findById(venteId)
      .populate("bienId")
      .populate("clientId", "fullName phone email")
      .populate("commercialId", "fullName phone email")
      .populate("agenceId", "nom")
      .populate("notaireId", "fullName cabinetName phone email address");

    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier les permissions : commercial, client ou agence peuvent voir
    const userRole = req.user.role;
    const isAuthorized = 
      (userRole === "Commercial" && vente.commercialId._id.toString() === req.user._id.toString()) ||
      (userRole === "User" && vente.clientId._id.toString() === req.user._id.toString()) ||
      (userRole === "Agence" && vente.agenceId._id.toString() === req.user.agenceId?.toString()) ||
      userRole === "Admin";

    if (!isAuthorized) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir cette vente" });
    }

    return res.status(200).json(vente);
  } catch (error) {
    console.error("❌ Erreur récupération vente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Marquer la vente comme signée (par commercial, client ou agence)
 * POST /api/agence/ventes/:id/signature
 */
exports.signerVente = async (req, res) => {
  try {
    const venteId = req.params.id;
    const { signatureType } = req.body; // "commercial", "client", ou "agence"

    const vente = await VenteBienImmobilier.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est en attente de signature
    if (vente.statut !== "en_attente_signature") {
      return res.status(400).json({ 
        message: "Cette vente n'est pas en attente de signature. Statut actuel: " + vente.statut 
      });
    }

    // Vérifier les permissions selon le type de signature
    if (signatureType === "commercial") {
      if (req.user.role !== "Commercial" || vente.commercialId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à signer en tant que commercial" });
      }
    } else if (signatureType === "client") {
      if (req.user.role !== "User" || vente.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à signer en tant que client" });
      }
    } else if (signatureType === "agence") {
      if (req.user.role !== "Agence" || vente.agenceId.toString() !== req.user.agenceId?.toString()) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à signer en tant qu'agence" });
      }
    } else {
      return res.status(400).json({ message: "Type de signature invalide" });
    }

    // Marquer la signature selon le type
    const now = new Date();
    if (signatureType === "commercial") {
      vente.signatures.commercial = true;
      vente.signatures.dateSignatureCommercial = now;
    } else if (signatureType === "client") {
      vente.signatures.client = true;
      vente.signatures.dateSignatureClient = now;
    } else if (signatureType === "agence") {
      vente.signatures.agence = true;
      vente.signatures.dateSignatureAgence = now;
    }

    // Ajouter à l'historique
    const acteurNom = req.user.fullName || req.user.phone;
    vente.historique.push({
      action: "signature",
      description: `Vente signée par ${signatureType}: ${acteurNom}`,
      acteur: req.user._id,
      acteurType: req.user.role,
      acteurNom: acteurNom,
      donnees: {
        signatureType: signatureType,
        date: now,
      },
    });

    // Vérifier si toutes les parties ont signé
    const toutesSignees = vente.signatures.commercial && 
                          vente.signatures.client && 
                          vente.signatures.agence;

    if (toutesSignees && vente.statut !== "signee") {
      vente.statut = "signee";
      vente.dateSignature = now;
      vente.historique.push({
        action: "toutes_signatures_reçues",
        description: "Toutes les parties ont signé la vente. Prêt pour le transfert d'argent.",
        acteur: req.user._id,
        acteurType: "Système",
        acteurNom: "Système",
        donnees: {
          date: now,
        },
      });
    }
    
    await vente.save();

    return res.status(200).json({
      message: `Vente signée avec succès par ${signatureType}`,
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur signature vente:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Finaliser la vente (transférer l'argent à l'agence)
 * POST /api/agence/ventes/:id/finaliser
 * Seulement accessible par Admin ou Agence
 */
exports.finaliserVenteAvecTransfert = async (req, res) => {
  try {
    const venteId = req.params.id;
    const vente = await VenteBienImmobilier.findById(venteId);

    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la vente est signée
    if (vente.statut !== "signee") {
      return res.status(400).json({ 
        message: "La vente doit être signée avant la finalisation. Statut actuel: " + vente.statut 
      });
    }

    // Vérifier les permissions (Admin ou Agence propriétaire)
    if (req.user.role !== "Admin") {
      if (req.user.role !== "Agence" || vente.agenceId.toString() !== req.user.agenceId?.toString()) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à finaliser cette vente" });
      }
    }

    // Vérifier si l'argent a déjà été transféré
    if (vente.argentTransfere) {
      return res.status(400).json({ message: "L'argent a déjà été transféré" });
    }

    // Mettre à jour le statut
    vente.statut = "finalisee";
    vente.dateFinalisation = new Date();
    vente.argentTransfere = true;

    // Mettre à jour le bien - maintenant vraiment vendu
    const bien = await BienImmobilier.findById(vente.bienId);
    if (bien) {
      bien.statut = "vendu";
      await bien.save();
    }

    // Ajouter à l'historique
    const acteurNom = req.user.fullName || req.user.phone;
    vente.historique.push({
      action: "vente_finalisee_avec_transfert",
      description: `Vente finalisée - Argent (${vente.prixVente} FCFA) transféré à l'agence`,
      acteur: req.user._id,
      acteurType: req.user.role,
      acteurNom: acteurNom,
      donnees: {
        montant: vente.prixVente,
        dateTransfert: new Date(),
        agenceId: vente.agenceId,
      },
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "bienId", select: "titre type prix statut" },
      { path: "clientId", select: "fullName phone email" },
      { path: "commercialId", select: "fullName phone email" },
      { path: "agenceId", select: "nom" },
      { path: "notaireId", select: "fullName cabinetName" },
    ]);

    return res.status(200).json({
      message: "Vente finalisée avec succès. L'argent a été transféré à l'agence.",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur finalisation vente:", error);
    return res.status(500).json({ message: error.message });
  }
};

