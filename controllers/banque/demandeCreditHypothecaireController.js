const DemandeCreditHypothecaire = require("../../models/banque/DemandeCreditHypothecaire");
const Notaire = require("../../models/Notaire");
const IHE = require("../../models/banque/IHE");

// Créer une nouvelle demande de crédit hypothécaire
exports.createDemande = async (req, res) => {
  try {
    const {
      notaireId,
      montantCredit,
      devise,
      dureeRemboursement,
      tauxInteret,
      bienImmobilier,
      emprunteur,
      documentsBanque,
      commentairesBanque,
      priorite,
      iheId,
    } = req.body;

    console.log("📋 Données reçues:", JSON.stringify(req.body, null, 2));

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }

    // Validation des champs requis
    if (!notaireId) {
      return res.status(400).json({
        success: false,
        message: "Le notaire est requis",
      });
    }

    if (!montantCredit || !dureeRemboursement || !tauxInteret) {
      return res.status(400).json({
        success: false,
        message: "Les informations du crédit sont incomplètes",
      });
    }

    if (!bienImmobilier || !bienImmobilier.type || !bienImmobilier.adresse || !bienImmobilier.ville || !bienImmobilier.valeurEstimee) {
      return res.status(400).json({
        success: false,
        message: "Les informations du bien immobilier sont incomplètes",
      });
    }

    if (!emprunteur || !emprunteur.nom || !emprunteur.prenom || !emprunteur.telephone) {
      return res.status(400).json({
        success: false,
        message: "Les informations de l'emprunteur sont incomplètes",
      });
    }

    // Vérifier que le notaire existe et est actif
    const notaire = await Notaire.findById(notaireId);
    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    if (notaire.statut !== "actif") {
      return res.status(400).json({
        success: false,
        message: "Le notaire sélectionné n'est pas actif",
      });
    }

    // Si une IHE est référencée, vérifier qu'elle existe
    const iheIdToUse = iheId || bienImmobilier?.iheId;
    if (iheIdToUse) {
      const ihe = await IHE.findById(iheIdToUse);
      if (!ihe) {
        return res.status(404).json({
          success: false,
          message: "IHE non trouvée",
        });
      }
    }

    // Récupérer l'ID de la banque depuis l'utilisateur connecté
    const banqueId = req.user._id;

    // Préparer les données du bien immobilier
    const bienImmobilierData = {
      type: bienImmobilier.type,
      adresse: bienImmobilier.adresse,
      ville: bienImmobilier.ville,
      valeurEstimee: parseFloat(bienImmobilier.valeurEstimee),
    };

    if (bienImmobilier.quartier) {
      bienImmobilierData.quartier = bienImmobilier.quartier;
    }

    if (bienImmobilier.superficie) {
      bienImmobilierData.superficie = parseFloat(bienImmobilier.superficie);
    }

    if (iheIdToUse) {
      bienImmobilierData.iheId = iheIdToUse;
    }

    // Préparer les documents
    const documentsBanqueData = {
      autresDocuments: documentsBanque?.autresDocuments || [],
    };

    if (documentsBanque?.titrePropriete?.url) {
      documentsBanqueData.titrePropriete = {
        url: documentsBanque.titrePropriete.url,
        nom: documentsBanque.titrePropriete.nom || "Titre de propriété",
        dateUpload: new Date(),
      };
    }

    if (documentsBanque?.notificationCredit?.url) {
      documentsBanqueData.notificationCredit = {
        url: documentsBanque.notificationCredit.url,
        nom: documentsBanque.notificationCredit.nom || "Notification de crédit",
        dateUpload: new Date(),
      };
    }

    const demande = new DemandeCreditHypothecaire({
      banqueId,
      notaireId,
      montantCredit: parseFloat(montantCredit),
      devise: devise || "FCFA",
      dureeRemboursement: parseInt(dureeRemboursement),
      tauxInteret: parseFloat(tauxInteret),
      bienImmobilier: bienImmobilierData,
      emprunteur: {
        nom: emprunteur.nom,
        prenom: emprunteur.prenom,
        telephone: emprunteur.telephone,
        email: emprunteur.email || undefined,
        adresse: emprunteur.adresse || undefined,
        profession: emprunteur.profession || undefined,
        numeroCNI: emprunteur.numeroCNI || undefined,
      },
      documentsBanque: documentsBanqueData,
      commentairesBanque: commentairesBanque || undefined,
      priorite: priorite || "normale",
      soumisPar: req.user._id,
      statut: "soumis_par_banque",
      dateSoumission: new Date(),
    });

    await demande.save();
    await demande.populate("notaireId", "fullName cabinetName email phone");
    await demande.populate("banqueId", "fullName phone");

    res.status(201).json({
      success: true,
      message: "Demande de crédit hypothécaire créée avec succès",
      demande,
    });
  } catch (error) {
    console.error("Erreur création demande crédit hypothécaire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Récupérer toutes les demandes d'une banque
exports.getDemandesBanque = async (req, res) => {
  try {
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }

    const banqueId = req.user._id;

    const { statut, notaireId, excludeStatut, page = 1, limit = 10 } = req.query;
    const filter = { banqueId };

    if (statut) {
      filter.statut = statut;
    } else if (excludeStatut) {
      // Exclure un statut spécifique seulement si aucun filtre statut n'est défini
      filter.statut = { $ne: excludeStatut };
    }

    if (notaireId) {
      filter.notaireId = notaireId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const demandes = await DemandeCreditHypothecaire.find(filter)
      .populate("notaireId", "fullName cabinetName email phone")
      .populate("soumisPar", "fullName phone")
      .populate("traitePar", "fullName phone")
      .populate("bienImmobilier.iheId", "reference titre")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await DemandeCreditHypothecaire.countDocuments(filter);

    res.json({
      success: true,
      demandes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Erreur récupération demandes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Récupérer une demande par ID
exports.getDemandeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }
    const banqueId = req.user._id;

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      banqueId,
    })
      .populate("notaireId", "fullName cabinetName email phone adresse ville")
      .populate("banqueId", "fullName phone")
      .populate("soumisPar", "fullName phone email")
      .populate("traitePar", "fullName phone email")
      .populate("bienImmobilier.iheId", "reference titre valeurComptable");

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    res.json({
      success: true,
      demande,
    });
  } catch (error) {
    console.error("Erreur récupération demande:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Mettre à jour une demande (par la banque)
exports.updateDemande = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }
    const banqueId = req.user._id;

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      banqueId,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    // La banque ne peut modifier que si le statut le permet
    if (
      demande.statut !== "soumis_par_banque" &&
      demande.statut !== "rejete"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cette demande ne peut plus être modifiée par la banque",
      });
    }

    const {
      montantCredit,
      devise,
      dureeRemboursement,
      tauxInteret,
      bienImmobilier,
      emprunteur,
      documentsBanque,
      commentairesBanque,
      priorite,
    } = req.body;

    if (montantCredit !== undefined) demande.montantCredit = montantCredit;
    if (devise) demande.devise = devise;
    if (dureeRemboursement !== undefined)
      demande.dureeRemboursement = dureeRemboursement;
    if (tauxInteret !== undefined) demande.tauxInteret = tauxInteret;
    if (bienImmobilier) demande.bienImmobilier = { ...demande.bienImmobilier, ...bienImmobilier };
    if (emprunteur) demande.emprunteur = { ...demande.emprunteur, ...emprunteur };
    if (documentsBanque) {
      demande.documentsBanque = {
        ...demande.documentsBanque,
        ...documentsBanque,
      };
    }
    if (commentairesBanque !== undefined)
      demande.commentairesBanque = commentairesBanque;
    if (priorite) demande.priorite = priorite;

    await demande.save();
    await demande.populate("notaireId", "fullName cabinetName email phone");
    await demande.populate("banqueId", "fullName phone");

    res.json({
      success: true,
      message: "Demande mise à jour avec succès",
      demande,
    });
  } catch (error) {
    console.error("Erreur mise à jour demande:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Annuler une demande
exports.annulerDemande = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }
    const banqueId = req.user._id;
    const { motif } = req.body;

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      banqueId,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (demande.statut === "credit_octroye" || demande.statut === "inscription_hypothecaire_terminee") {
      return res.status(400).json({
        success: false,
        message: "Cette demande ne peut plus être annulée",
      });
    }

    demande.statut = "annule";
    if (motif) demande.motifRejet = motif;

    await demande.save();

    res.json({
      success: true,
      message: "Demande annulée avec succès",
      demande,
    });
  } catch (error) {
    console.error("Erreur annulation demande:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Récupérer les statistiques des demandes pour une banque
exports.getStatsDemandes = async (req, res) => {
  try {
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }
    const banqueId = req.user._id;

    const stats = await DemandeCreditHypothecaire.aggregate([
      { $match: { banqueId: banqueId } },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          montantTotal: { $sum: "$montantCredit" },
        },
      },
    ]);

    const total = await DemandeCreditHypothecaire.countDocuments({ banqueId });
    const totalMontant = await DemandeCreditHypothecaire.aggregate([
      { $match: { banqueId: banqueId } },
      { $group: { _id: null, total: { $sum: "$montantCredit" } } },
    ]);

    const statsByStatut = {};
    stats.forEach((stat) => {
      statsByStatut[stat._id] = {
        count: stat.count,
        montantTotal: stat.montantTotal || 0,
      };
    });

    res.json({
      success: true,
      stats: {
        total,
        totalMontant: totalMontant[0]?.total || 0,
        parStatut: statsByStatut,
      },
    });
  } catch (error) {
    console.error("Erreur récupération stats demandes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Marquer le crédit comme octroyé (par la banque après inscription hypothécaire)
exports.marquerCreditOctroye = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "Banque") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux banques",
      });
    }
    const banqueId = req.user._id;

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      banqueId,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (demande.statut !== "inscription_hypothecaire_terminee") {
      return res.status(400).json({
        success: false,
        message: "L'inscription hypothécaire doit être terminée avant d'octroyer le crédit",
      });
    }

    demande.statut = "credit_octroye";
    demande.dateCreditOctroye = new Date();

    await demande.save();
    await demande.populate("notaireId", "fullName cabinetName email phone");
    await demande.populate("banqueId", "fullName phone");

    res.json({
      success: true,
      message: "Crédit marqué comme octroyé",
      demande,
    });
  } catch (error) {
    console.error("Erreur marquage crédit octroyé:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

