const DemandeCreditHypothecaire = require("../../models/banque/DemandeCreditHypothecaire");
const Notaire = require("../../models/Notaire");

// Récupérer toutes les demandes assignées à un notaire
exports.getDemandesNotaire = async (req, res) => {
  try {
    // Récupérer le notaire depuis l'utilisateur connecté
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });
    
    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const { statut, page = 1, limit = 10 } = req.query;
    const filter = { notaireId: notaire._id };

    if (statut) {
      filter.statut = statut;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const demandes = await DemandeCreditHypothecaire.find(filter)
      .populate("banqueId", "fullName phone")
      .populate("soumisPar", "fullName phone")
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
    console.error("Erreur récupération demandes notaire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Récupérer une demande par ID (pour notaire)
exports.getDemandeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });

    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      notaireId: notaire._id,
    })
      .populate("banqueId", "fullName phone")
      .populate("soumisPar", "fullName phone email")
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

// Accepter une demande et commencer le traitement
exports.accepterDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });

    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      notaireId: notaire._id,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (demande.statut !== "soumis_par_banque") {
      return res.status(400).json({
        success: false,
        message: "Cette demande ne peut plus être acceptée",
      });
    }

    demande.statut = "en_traitement_notaire";
    demande.dateTraitementNotaire = new Date();
    demande.traitePar = userId;

    await demande.save();

    res.json({
      success: true,
      message: "Demande acceptée, traitement en cours",
      demande,
    });
  } catch (error) {
    console.error("Erreur acceptation demande:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Formaliser la convention d'ouverture de crédit
exports.formaliserConvention = async (req, res) => {
  try {
    const { id } = req.params;
    const { conventionOuvertureCredit, commentairesNotaire } = req.body;
    
    console.log("📋 Formalisation convention - Données reçues:", {
      id,
      conventionOuvertureCredit,
      commentairesNotaire,
    });
    
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });

    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      notaireId: notaire._id,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (demande.statut !== "en_traitement_notaire") {
      return res.status(400).json({
        success: false,
        message: "La demande doit être en traitement pour formaliser la convention",
      });
    }

    if (!conventionOuvertureCredit || !conventionOuvertureCredit.url) {
      return res.status(400).json({
        success: false,
        message: "Le document de convention est requis",
      });
    }

    demande.statut = "convention_formalisee";
    
    // Initialiser documentsNotaire s'il n'existe pas
    if (!demande.documentsNotaire || typeof demande.documentsNotaire !== 'object') {
      demande.documentsNotaire = {};
    }
    
    // Initialiser autresDocuments s'il n'existe pas
    if (!demande.documentsNotaire.autresDocuments) {
      demande.documentsNotaire.autresDocuments = [];
    }
    
    demande.documentsNotaire.conventionOuvertureCredit = {
      url: conventionOuvertureCredit.url,
      nom: conventionOuvertureCredit.nom || "Convention d'ouverture de crédit",
      dateCreation: new Date(),
    };
    
    // Ajouter le numéro de convention s'il est fourni
    if (conventionOuvertureCredit.numeroConvention) {
      demande.documentsNotaire.conventionOuvertureCredit.numeroConvention = conventionOuvertureCredit.numeroConvention;
    }
    
    demande.dateConventionFormalisee = new Date();
    if (commentairesNotaire) {
      demande.commentairesNotaire = commentairesNotaire;
    }

    console.log("💾 Sauvegarde demande avec documentsNotaire:", JSON.stringify(demande.documentsNotaire, null, 2));
    
    await demande.save();

    res.json({
      success: true,
      message: "Convention d'ouverture de crédit formalisée avec succès",
      demande,
    });
  } catch (error) {
    console.error("Erreur formalisation convention:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Enregistrer l'inscription hypothécaire
exports.enregistrerInscriptionHypothecaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { acteHypothecaire, dateInscription, commentairesNotaire } = req.body;
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });

    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      notaireId: notaire._id,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (demande.statut !== "convention_formalisee") {
      return res.status(400).json({
        success: false,
        message: "La convention doit être formalisée avant l'inscription hypothécaire",
      });
    }

    demande.statut = "inscription_hypothecaire_en_cours";
    
    // Initialiser documentsNotaire s'il n'existe pas
    if (!demande.documentsNotaire) {
      demande.documentsNotaire = {
        conventionOuvertureCredit: demande.documentsNotaire?.conventionOuvertureCredit || null,
        acteHypothecaire: null,
        autresDocuments: [],
      };
    }
    
    if (acteHypothecaire && acteHypothecaire.url) {
      demande.documentsNotaire.acteHypothecaire = {
        url: acteHypothecaire.url,
        nom: acteHypothecaire.nom || "Acte hypothécaire",
        dateCreation: new Date(),
      };
    }
    
    if (dateInscription) {
      demande.dateInscriptionHypothecaire = new Date(dateInscription);
    }
    if (commentairesNotaire) {
      demande.commentairesNotaire = commentairesNotaire;
    }

    await demande.save();

    res.json({
      success: true,
      message: "Inscription hypothécaire enregistrée",
      demande,
    });
  } catch (error) {
    console.error("Erreur enregistrement inscription hypothécaire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Finaliser l'inscription hypothécaire
exports.finaliserInscriptionHypothecaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroActe, dateFinalisation, commentairesNotaire } = req.body;
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });

    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      notaireId: notaire._id,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (demande.statut !== "inscription_hypothecaire_en_cours") {
      return res.status(400).json({
        success: false,
        message: "L'inscription hypothécaire doit être en cours",
      });
    }

    demande.statut = "inscription_hypothecaire_terminee";
    if (numeroActe && demande.documentsNotaire?.acteHypothecaire) {
      demande.documentsNotaire.acteHypothecaire.numeroActe = numeroActe;
    }
    if (dateFinalisation) {
      demande.dateInscriptionHypothecaire = new Date(dateFinalisation);
    }
    if (commentairesNotaire) {
      demande.commentairesNotaire = commentairesNotaire;
    }

    await demande.save();

    res.json({
      success: true,
      message: "Inscription hypothécaire finalisée avec succès",
      demande,
    });
  } catch (error) {
    console.error("Erreur finalisation inscription hypothécaire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// Rejeter une demande
exports.rejeterDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { motifRejet } = req.body;
    const userId = req.user._id;
    const notaire = await Notaire.findOne({ userId });

    if (!notaire) {
      return res.status(404).json({
        success: false,
        message: "Notaire non trouvé",
      });
    }

    const demande = await DemandeCreditHypothecaire.findOne({
      _id: id,
      notaireId: notaire._id,
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    if (
      demande.statut === "credit_octroye" ||
      demande.statut === "inscription_hypothecaire_terminee"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cette demande ne peut plus être rejetée",
      });
    }

    demande.statut = "rejete";
    demande.motifRejet = motifRejet || "Rejetée par le notaire";

    await demande.save();

    res.json({
      success: true,
      message: "Demande rejetée",
      demande,
    });
  } catch (error) {
    console.error("Erreur rejet demande:", error);
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
    const banqueId = req.user.banqueId;

    if (!banqueId) {
      return res.status(400).json({
        success: false,
        message: "Banque non identifiée",
      });
    }

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

