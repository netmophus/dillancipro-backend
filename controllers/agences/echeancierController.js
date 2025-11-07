const Echeancier = require("../../models/agences/Echeancier");
const Paiement = require("../../models/agences/Paiement");
const Parcelle = require("../../models/agences/Parcelle");
const User = require("../../models/User");
const PartielPaiement = require("../../models/agences/PartielPaiement");
const Vente = require("../../models/agences/Vente");

/**
 * Créer un échéancier pour un paiement
 * POST /api/agence/echeanciers
 */
exports.creerEcheancier = async (req, res) => {
  try {
    const { paiementId, echeances } = req.body;
    const commercialId = req.user._id;
    const agenceId = req.user.agenceId;

    if (!paiementId || !echeances || !Array.isArray(echeances) || echeances.length === 0) {
      return res.status(400).json({
        message: "Paiement et échéances sont requis"
      });
    }

    // Vérifier que le paiement existe
    const paiement = await Paiement.findById(paiementId)
      .populate("parcelle", "affecteeA agenceId")
      .populate("client", "fullName phone");

    if (!paiement) {
      return res.status(404).json({ message: "Paiement non trouvé" });
    }

    // Vérifier que la parcelle est affectée à ce commercial
    if (paiement.parcelle.affecteeA.toString() !== commercialId.toString()) {
      return res.status(403).json({ message: "Cette parcelle ne vous est pas affectée" });
    }

    // Vérifier qu'il n'y a pas déjà un échéancier pour ce paiement
    const echeancierExistant = await Echeancier.findOne({ paiement: paiementId });
    if (echeancierExistant) {
      return res.status(400).json({ message: "Un échéancier existe déjà pour ce paiement" });
    }

    // Calculer le total des échéances
    const totalEcheances = echeances.reduce((sum, e) => sum + parseFloat(e.montant || 0), 0);

    // Vérifier que le total correspond au montant total du paiement
    if (Math.abs(totalEcheances - paiement.montantTotal) > 0.01) {
      return res.status(400).json({
        message: `Le total des échéances (${totalEcheances.toLocaleString()} FCFA) ne correspond pas au montant total du paiement (${paiement.montantTotal.toLocaleString()} FCFA)`
      });
    }

    // Créer l'échéancier
    const echeancier = await Echeancier.create({
      paiement: paiementId,
      client: paiement.client._id,
      commercial: commercialId,
      parcelle: paiement.parcelle._id,
      agenceId: agenceId || paiement.parcelle.agenceId,
      montantTotal: paiement.montantTotal,
      montantPaye: paiement.montantPaye || 0,
      montantRestant: paiement.montantTotal - (paiement.montantPaye || 0),
      statut: "en_cours",
      echeances: echeances.map(e => ({
        dateEcheance: new Date(e.dateEcheance),
        montant: parseFloat(e.montant),
        statut: "a_venir",
        notes: e.notes || "",
      })),
      historique: [
        {
          action: "echeancier_cree",
          description: `Échéancier créé par le commercial ${req.user.fullName || req.user.phone}`,
          acteur: commercialId,
          acteurType: "Commercial",
          acteurNom: req.user.fullName || req.user.phone,
          donnees: {
            nombreEcheances: echeances.length,
            montantTotal: paiement.montantTotal,
          },
        },
      ],
    });

    // Peupler les relations pour la réponse
    await echeancier.populate([
      { path: "paiement", select: "montantTotal montantPaye statut" },
      { path: "client", select: "fullName phone email" },
      { path: "commercial", select: "fullName phone email" },
      { path: "parcelle", select: "numeroParcelle prix" },
      { path: "agenceId", select: "nom" },
    ]);

    console.log(`✅ [ECHEANCIER] Échéancier créé: ${echeancier._id} pour paiement ${paiementId}`);

    return res.status(201).json({
      message: "Échéancier créé avec succès",
      echeancier,
    });
  } catch (error) {
    console.error("❌ Erreur création échéancier:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la création de l'échéancier",
    });
  }
};

/**
 * Récupérer un échéancier par son ID
 * GET /api/agence/echeanciers/:id
 */
exports.getEcheancierById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const echeancier = await Echeancier.findById(id)
      .populate("paiement")
      .populate("client", "fullName phone email")
      .populate("commercial", "fullName phone email")
      .populate("parcelle", "numeroParcelle prix superficie")
      .populate("agenceId", "nom");

    if (!echeancier) {
      return res.status(404).json({ message: "Échéancier non trouvé" });
    }

    // Vérifier les permissions
    const isAuthorized =
      userRole === "Admin" ||
      (userRole === "Commercial" && echeancier.commercial._id.toString() === userId.toString()) ||
      (userRole === "User" && echeancier.client._id.toString() === userId.toString()) ||
      (userRole === "Agence" && echeancier.agenceId._id.toString() === req.user.agenceId?.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir cet échéancier" });
    }

    return res.status(200).json(echeancier);
  } catch (error) {
    console.error("❌ Erreur récupération échéancier:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la récupération de l'échéancier",
    });
  }
};

/**
 * Récupérer tous les échéanciers d'un commercial
 * GET /api/agence/echeanciers/commercial
 */
exports.getEcheanciersCommercial = async (req, res) => {
  try {
    const commercialId = req.user._id;

    const echeanciers = await Echeancier.find({ commercial: commercialId })
      .populate("paiement", "montantTotal montantPaye statut")
      .populate("client", "fullName phone email")
      .populate("parcelle", "numeroParcelle prix")
      .sort({ createdAt: -1 });

    return res.status(200).json(echeanciers);
  } catch (error) {
    console.error("❌ Erreur récupération échéanciers commercial:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la récupération des échéanciers",
    });
  }
};

/**
 * Récupérer tous les échéanciers d'une agence (pour l'admin de l'agence)
 * GET /api/agence/echeanciers/agence
 */
exports.getEcheanciersAgence = async (req, res) => {
  try {
    const agenceId = req.user.agenceId;

    if (!agenceId) {
      return res.status(403).json({ message: "Vous devez être associé à une agence" });
    }

    const echeanciers = await Echeancier.find({ agenceId: agenceId })
      .populate("paiement", "montantTotal montantPaye statut")
      .populate("client", "fullName phone email")
      .populate("commercial", "fullName phone email")
      .populate("parcelle", "numeroParcelle prix")
      .sort({ createdAt: -1 });

    return res.status(200).json(echeanciers);
  } catch (error) {
    console.error("❌ Erreur récupération échéanciers agence:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la récupération des échéanciers",
    });
  }
};

/**
 * Récupérer tous les échéanciers d'un client
 * GET /api/agence/echeanciers/client
 */
exports.getEcheanciersClient = async (req, res) => {
  try {
    const clientId = req.user._id;

    const echeanciers = await Echeancier.find({ client: clientId })
      .populate("paiement", "montantTotal montantPaye statut")
      .populate("commercial", "fullName phone email")
      .populate("parcelle", "numeroParcelle prix")
      .sort({ createdAt: -1 });

    return res.status(200).json(echeanciers);
  } catch (error) {
    console.error("❌ Erreur récupération échéanciers client:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la récupération des échéanciers",
    });
  }
};

/**
 * Récupérer l'échéancier d'un paiement
 * GET /api/agence/echeanciers/paiement/:paiementId
 */
exports.getEcheancierByPaiement = async (req, res) => {
  try {
    const { paiementId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const echeancier = await Echeancier.findOne({ paiement: paiementId })
      .populate("paiement")
      .populate("client", "fullName phone email")
      .populate("commercial", "fullName phone email")
      .populate("parcelle", "numeroParcelle prix")
      .populate("agenceId", "nom");

    if (!echeancier) {
      return res.status(404).json({ message: "Échéancier non trouvé pour ce paiement" });
    }

    // Vérifier les permissions
    const isAuthorized =
      userRole === "Admin" ||
      (userRole === "Commercial" && echeancier.commercial._id.toString() === userId.toString()) ||
      (userRole === "User" && echeancier.client._id.toString() === userId.toString()) ||
      (userRole === "Agence" && echeancier.agenceId._id.toString() === req.user.agenceId?.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir cet échéancier" });
    }

    return res.status(200).json(echeancier);
  } catch (error) {
    console.error("❌ Erreur récupération échéancier par paiement:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la récupération de l'échéancier",
    });
  }
};

/**
 * Modifier un échéancier (ajouter/modifier/supprimer des échéances)
 * PUT /api/agence/echeanciers/:id
 */
exports.modifierEcheancier = async (req, res) => {
  try {
    const { id } = req.params;
    const { echeances } = req.body;
    const commercialId = req.user._id;

    if (!echeances || !Array.isArray(echeances)) {
      return res.status(400).json({ message: "Les échéances sont requises" });
    }

    const echeancier = await Echeancier.findById(id);
    if (!echeancier) {
      return res.status(404).json({ message: "Échéancier non trouvé" });
    }

    // Vérifier les permissions : commercial propriétaire, admin agence ou admin système
    const userRole = req.user.role;
    const agenceId = req.user.agenceId;
    const isAuthorized =
      echeancier.commercial.toString() === commercialId.toString() ||
      userRole === "Admin" ||
      (userRole === "Agence" && echeancier.agenceId.toString() === agenceId?.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cet échéancier" });
    }

    // Calculer le total des nouvelles échéances
    const totalEcheances = echeances.reduce((sum, e) => sum + parseFloat(e.montant || 0), 0);

    // Permettre à l'admin agence de modifier le montant total si nécessaire
    const nouveauMontantTotal = req.body.montantTotal || echeancier.montantTotal;
    
    // Vérifier que le total correspond (avec tolérance pour l'admin agence)
    if (Math.abs(totalEcheances - nouveauMontantTotal) > 0.01) {
      return res.status(400).json({
        message: `Le total des échéances (${totalEcheances.toLocaleString()} FCFA) ne correspond pas au montant total (${nouveauMontantTotal.toLocaleString()} FCFA)`
      });
    }

    // Mettre à jour le montant total si fourni (pour l'admin agence)
    if (req.body.montantTotal && (userRole === "Agence" || userRole === "Admin")) {
      echeancier.montantTotal = nouveauMontantTotal;
      echeancier.montantRestant = nouveauMontantTotal - echeancier.montantPaye;
    }

    // Mettre à jour les échéances
    // Conserver les échéances déjà payées et mettre à jour les autres
    const echeancesMisesAJour = echeances.map(e => {
      // Si l'échéance a un _id, c'est une modification
      if (e._id) {
        const ancienneEcheance = echeancier.echeances.find(ech => ech._id.toString() === e._id.toString());
        // Si elle est déjà payée, on ne change que les notes
        if (ancienneEcheance && ancienneEcheance.statut === "payee") {
          return {
            ...ancienneEcheance.toObject(),
            notes: e.notes || ancienneEcheance.notes,
          };
        }
      }
      // Nouvelle échéance ou modification d'une non payée
      return {
        dateEcheance: new Date(e.dateEcheance),
        montant: parseFloat(e.montant),
        statut: e.statut || "a_venir",
        notes: e.notes || "",
      };
    });

    echeancier.echeances = echeancesMisesAJour;

    // Ajouter à l'historique
    echeancier.historique.push({
      action: "echeancier_modifie",
      description: `Échéancier modifié par ${req.user.fullName || req.user.phone}`,
      acteur: commercialId,
      acteurType: req.user.role === "Admin" ? "Admin" : "Commercial",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        nombreEcheances: echeances.length,
      },
    });

    await echeancier.save();

    await echeancier.populate([
      { path: "paiement", select: "montantTotal montantPaye statut" },
      { path: "client", select: "fullName phone email" },
      { path: "commercial", select: "fullName phone email" },
      { path: "parcelle", select: "numeroParcelle prix" },
    ]);

    console.log(`✅ [ECHEANCIER] Échéancier ${id} modifié`);

    return res.status(200).json({
      message: "Échéancier modifié avec succès",
      echeancier,
    });
  } catch (error) {
    console.error("❌ Erreur modification échéancier:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors de la modification de l'échéancier",
    });
  }
};

/**
 * Marquer une échéance comme payée
 * PUT /api/agence/echeanciers/:id/echeance/:echeanceId/payer
 */
exports.marquerEcheancePayee = async (req, res) => {
  try {
    const { id, echeanceId } = req.params;
    const { montant, recuUrl, notes } = req.body;
    const commercialId = req.user._id;

    const echeancier = await Echeancier.findById(id);
    if (!echeancier) {
      return res.status(404).json({ message: "Échéancier non trouvé" });
    }

    // Vérifier les permissions
    if (echeancier.commercial.toString() !== commercialId.toString() && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cet échéancier" });
    }

    // Trouver l'échéance
    const echeance = echeancier.echeances.find(e => e._id.toString() === echeanceId);
    if (!echeance) {
      return res.status(404).json({ message: "Échéance non trouvée" });
    }

    if (echeance.statut === "payee") {
      return res.status(400).json({ message: "Cette échéance est déjà marquée comme payée" });
    }

    // Mettre à jour l'échéance
    echeance.statut = "payee";
    echeance.datePaiementReelle = new Date();
    if (recuUrl) echeance.recuUrl = recuUrl;
    if (notes) echeance.notes = notes;

    // Mettre à jour les montants de l'échéancier
    echeancier.montantPaye += echeance.montant;
    echeancier.montantRestant = echeancier.montantTotal - echeancier.montantPaye;

    // Mettre à jour le statut de l'échéancier
    if (echeancier.montantRestant <= 0) {
      echeancier.statut = "termine";
    }

    // Créer un paiement partiel pour cette échéance (si pas déjà existant)
    const paiementPartielExistant = await PartielPaiement.findOne({
      paiement: echeancier.paiement,
      montant: echeance.montant,
      datePaiement: echeance.datePaiementReelle,
    });

    if (!paiementPartielExistant) {
      await PartielPaiement.create({
        paiement: echeancier.paiement,
        montant: echeance.montant,
        recuUrl: echeance.recuUrl,
        datePaiement: echeance.datePaiementReelle,
      });

      // Mettre à jour le paiement principal
      const paiement = await Paiement.findById(echeancier.paiement);
      if (paiement) {
        paiement.montantPaye = echeancier.montantPaye;
        paiement.montantRestant = echeancier.montantRestant;
        paiement.statut = echeancier.montantRestant <= 0 ? "paid" : "unpaid";
        await paiement.save();
      }
    }

    // Ajouter à l'historique
    echeancier.historique.push({
      action: "echeance_payee",
      description: `Échéance du ${new Date(echeance.dateEcheance).toLocaleDateString()} marquée comme payée (${echeance.montant.toLocaleString()} FCFA)`,
      acteur: commercialId,
      acteurType: req.user.role === "Admin" ? "Admin" : "Commercial",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        echeanceId: echeance._id,
        montant: echeance.montant,
        dateEcheance: echeance.dateEcheance,
      },
    });

    await echeancier.save();

    await echeancier.populate([
      { path: "paiement", select: "montantTotal montantPaye statut" },
      { path: "client", select: "fullName phone email" },
      { path: "commercial", select: "fullName phone email" },
      { path: "parcelle", select: "numeroParcelle prix" },
    ]);

    console.log(`✅ [ECHEANCIER] Échéance ${echeanceId} marquée comme payée`);

    return res.status(200).json({
      message: "Échéance marquée comme payée avec succès",
      echeancier,
    });
  } catch (error) {
    console.error("❌ Erreur marquage échéance payée:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors du marquage de l'échéance",
    });
  }
};

/**
 * Rembourser complètement le client et remettre la parcelle en vente
 * POST /api/agence/echeanciers/:id/rembourser
 */
exports.rembourserClient = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const agenceId = req.user.agenceId;

    // Seule l'agence ou l'admin peut rembourser
    if (userRole !== "Agence" && userRole !== "Admin") {
      return res.status(403).json({ message: "Seule l'agence peut effectuer un remboursement" });
    }

    const echeancier = await Echeancier.findById(id)
      .populate("paiement")
      .populate("parcelle")
      .populate("client");

    if (!echeancier) {
      return res.status(404).json({ message: "Échéancier non trouvé" });
    }

    // Vérifier que l'échéancier appartient à l'agence
    if (userRole === "Agence" && echeancier.agenceId.toString() !== agenceId.toString()) {
      return res.status(403).json({ message: "Cet échéancier n'appartient pas à votre agence" });
    }

    const montantARembourser = echeancier.montantPaye || 0;

    if (montantARembourser <= 0) {
      return res.status(400).json({ message: "Aucun montant à rembourser" });
    }

    // 1. Annuler l'échéancier
    echeancier.statut = "annule";
    echeancier.historique.push({
      action: "remboursement_effectue",
      description: `Remboursement effectué par ${req.user.fullName || req.user.phone}. Montant remboursé: ${montantARembourser.toLocaleString()} FCFA`,
      acteur: req.user._id,
      acteurType: userRole === "Admin" ? "Admin" : "Agence",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        montantRembourse: montantARembourser,
      },
    });

    // 2. Réinitialiser le paiement
    if (echeancier.paiement) {
      const paiement = await Paiement.findById(echeancier.paiement._id);
      if (paiement) {
        paiement.montantPaye = 0;
        paiement.montantRestant = paiement.montantTotal;
        paiement.statut = "unpaid";
        await paiement.save();
      }
    }

    // 3. Supprimer les paiements partiels associés
    if (echeancier.paiement) {
      await PartielPaiement.deleteMany({ paiement: echeancier.paiement._id });
    }

    // 4. Supprimer la vente associée si elle existe
    if (echeancier.parcelle) {
      const vente = await Vente.findOne({ parcelle: echeancier.parcelle._id });
      if (vente) {
        await Vente.findByIdAndDelete(vente._id);
      }
    }

    // 5. Remettre la parcelle en vente (disponible)
    if (echeancier.parcelle) {
      const parcelle = await Parcelle.findById(echeancier.parcelle._id);
      if (parcelle) {
        parcelle.statut = "avendre"; // Statut pour remettre en vente
        parcelle.vendueA = undefined;
        parcelle.dateVente = undefined;
        await parcelle.save();
        console.log(`✅ [ECHEANCIER] Parcelle ${parcelle.numeroParcelle} remise en vente`);
      }
    }

    await echeancier.save();

    await echeancier.populate([
      { path: "paiement", select: "montantTotal montantPaye statut" },
      { path: "client", select: "fullName phone email" },
      { path: "commercial", select: "fullName phone email" },
      { path: "parcelle", select: "numeroParcelle prix statut" },
    ]);

    console.log(`✅ [ECHEANCIER] Remboursement effectué pour ${echeancier._id} - Montant: ${montantARembourser.toLocaleString()} FCFA`);

    return res.status(200).json({
      message: `Remboursement effectué avec succès. Montant remboursé: ${montantARembourser.toLocaleString()} FCFA. La parcelle a été remise en vente.`,
      echeancier,
      montantRembourse: montantARembourser,
    });
  } catch (error) {
    console.error("❌ Erreur remboursement:", error);
    return res.status(500).json({
      message: error.message || "Erreur lors du remboursement",
    });
  }
};

/**
 * Mettre à jour automatiquement le statut des échéances (en retard)
 * Cette fonction peut être appelée périodiquement (cron job)
 */
exports.mettreAJourStatutsEcheances = async () => {
  try {
    const maintenant = new Date();
    const echeanciers = await Echeancier.find({ statut: "en_cours" });

    for (const echeancier of echeanciers) {
      let modifie = false;
      for (const echeance of echeancier.echeances) {
        if (echeance.statut === "a_venir" && new Date(echeance.dateEcheance) < maintenant) {
          echeance.statut = "en_retard";
          modifie = true;
        }
      }
      if (modifie) {
        await echeancier.save();
        console.log(`✅ [ECHEANCIER] Statuts mis à jour pour ${echeancier._id}`);
      }
    }
  } catch (error) {
    console.error("❌ Erreur mise à jour statuts échéances:", error);
  }
};

