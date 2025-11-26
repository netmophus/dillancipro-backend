// controllers/banque/banqueIHEController.js
const IHE = require("../../models/banque/IHE");
const IHEMedia = require("../../models/banque/IHEMedia");
const User = require("../../models/User");
const mongoose = require("mongoose");

/**
 * 📝 Créer une nouvelle IHE
 * POST /api/banque/ihe
 */
exports.createIHE = async (req, res) => {
  try {
    const {
      type,
      titre,
      description,
      nomClient,
      valeurAdjudication,
      valeurDation,
      valeurNetteComptable,
      valeurComptable,
      valeurAcquisition,
      valeurCession,
      dateAcquisition,
      superficie,
      uniteSuperficie,
      localisation,
      caracteristiques,
      notes,
      commentaires,
      // Champs réglementaires
      dateReclassement,
      dureeMaximaleDetention,
      planCession,
    } = req.body;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Créer l'IHE avec isolation par banque
    const nouvelleIHE = new IHE({
      type,
      titre,
      description,
      nomClient,
      valeurAdjudication,
      valeurDation,
      valeurNetteComptable,
      valeurComptable,
      valeurAcquisition,
      valeurCession,
      dateAcquisition: dateAcquisition ? new Date(dateAcquisition) : undefined,
      superficie,
      uniteSuperficie: uniteSuperficie || "m²",
      localisation,
      caracteristiques,
      notes,
      commentaires,
      // Champs réglementaires
      dateReclassement: dateReclassement ? new Date(dateReclassement) : undefined,
      dureeMaximaleDetention: dureeMaximaleDetention || 60, // 5 ans par défaut
      planCession,
      banqueId: req.user._id, // Isolation par banque
      saisiPar: req.user._id,
      statut: "en_attente_validation",
    });

    await nouvelleIHE.save();

    res.status(201).json({
      message: "✅ IHE créée avec succès, en attente de validation",
      ihe: nouvelleIHE,
    });
  } catch (error) {
    console.error("❌ Erreur createIHE:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 📋 Lister toutes les IHE de la banque (avec filtres)
 * GET /api/banque/ihe
 */
exports.getIHEs = async (req, res) => {
  try {
    const { statut, type, search } = req.query;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Construire le filtre avec isolation par banque
    const filter = {
      banqueId: new mongoose.Types.ObjectId(req.user._id),
    };

    if (statut) {
      filter.statut = statut;
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        { titre: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
      ];
    }

    const ihes = await IHE.find(filter)
      .populate("saisiPar", "fullName phone")
      .populate("validePar", "fullName phone")
      .populate("rejetePar", "fullName phone")
      .populate({
        path: "partageAvecAgences.agenceId",
        select: "nom ville telephone",
      })
      .populate({
        path: "partageAvecAgences.partagePar",
        select: "fullName phone",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Ajouter les médias pour chaque IHE
    const ihesAvecMedias = await Promise.all(
      ihes.map(async (ihe) => {
        const medias = await IHEMedia.find({ iheId: ihe._id })
          .sort({ ordre: 1, createdAt: 1 })
          .lean();
        return {
          ...ihe,
          medias,
        };
      })
    );

    res.status(200).json({
      count: ihesAvecMedias.length,
      ihes: ihesAvecMedias,
    });
  } catch (error) {
    console.error("❌ Erreur getIHEs:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 🔍 Obtenir une IHE spécifique par ID
 * GET /api/banque/ihe/:id
 */
exports.getIHEById = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    const ihe = await IHE.findOne({
      _id: id,
      banqueId: req.user._id, // Isolation par banque
    })
      .populate("saisiPar", "fullName phone")
      .populate("validePar", "fullName phone")
      .populate("rejetePar", "fullName phone")
      .populate("partageAvecAgences.agenceId", "nom telephone")
      .populate("partageAvecAgences.partagePar", "fullName phone")
      .lean();

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Récupérer les médias
    const medias = await IHEMedia.find({ iheId: ihe._id })
      .populate("uploadPar", "fullName phone")
      .sort({ ordre: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      ihe: {
        ...ihe,
        medias,
      },
    });
  } catch (error) {
    console.error("❌ Erreur getIHEById:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * ✏️ Mettre à jour une IHE
 * PUT /api/banque/ihe/:id
 */
exports.updateIHE = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    // Convertir l'ID utilisateur en ObjectId pour la comparaison
    const banqueId = new mongoose.Types.ObjectId(req.user._id);

    // Vérifier que l'IHE appartient à la banque
    const ihe = await IHE.findOne({
      _id: id,
      banqueId: banqueId,
    });

    if (!ihe) {
      console.error("❌ [updateIHE] IHE non trouvée ou n'appartient pas à la banque:", {
        iheId: id,
        banqueId: banqueId.toString(),
        userBanqueId: req.user._id,
        userRole: req.user.role,
      });
      return res.status(404).json({ message: "IHE non trouvée ou vous n'avez pas l'autorisation de la modifier" });
    }

    // Si l'IHE était validée et qu'on la modifie, remettre en attente de validation
    // (sauf si c'est un Admin qui modifie)
    const etaitValidee = ihe.statut === "valide";
    const doitRevalider = etaitValidee && req.user.role !== "Admin";
    
    // Si l'IHE était "a_corriger" (rejetée), permettre à l'agent de la corriger
    // et la remettre en attente de validation après correction
    const etaitACorriger = ihe.statut === "a_corriger";
    const estAgentQuiASaisi = ihe.saisiPar.toString() === req.user._id.toString();

    // Mettre à jour les données (sauf les champs protégés)
    const champsProteges = ["banqueId", "saisiPar", "_id", "createdAt", "updatedAt"];
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && !champsProteges.includes(key)) {
        ihe[key] = updateData[key];
      }
    });

    // Si l'IHE était validée et qu'on la modifie, remettre en attente de validation
    if (doitRevalider) {
      ihe.statut = "en_attente_validation";
      ihe.validePar = undefined;
      ihe.valideLe = undefined;
    }
    
    // Si l'IHE était "a_corriger" et que c'est l'agent qui l'a saisie qui la modifie,
    // la remettre en attente de validation après correction
    if (etaitACorriger && estAgentQuiASaisi) {
      ihe.statut = "en_attente_validation";
      // Conserver le motif de rejet pour référence, mais permettre une nouvelle validation
      // Les champs rejetePar, rejeteLe et motifRejet restent pour l'historique
    }

    await ihe.save();

    let message = "✅ IHE mise à jour avec succès";
    if (etaitACorriger && estAgentQuiASaisi && ihe.statut === "en_attente_validation") {
      message = "✅ IHE corrigée et remise en attente de validation";
    }

    res.status(200).json({
      message,
      ihe,
    });
  } catch (error) {
    console.error("❌ Erreur updateIHE:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 🗑️ Supprimer une IHE
 * DELETE /api/banque/ihe/:id
 */
exports.deleteIHE = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est une banque ou admin
    if (req.user.role !== "Banque" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Accès interdit" });
    }

    const filter = { _id: id };
    
    // Si banque, vérifier l'isolation
    if (req.user.role === "Banque") {
      filter.banqueId = req.user._id;
    }

    const ihe = await IHE.findOne(filter);

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Supprimer les médias associés
    await IHEMedia.deleteMany({ iheId: id });

    // Supprimer l'IHE
    await IHE.findByIdAndDelete(id);

    res.status(200).json({
      message: "✅ IHE supprimée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur deleteIHE:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * ✅ Valider une IHE (Manager banque ou Admin)
 * POST /api/banque/ihe/:id/valider
 */
exports.validerIHE = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est Manager banque ou Admin
    if (req.user.role !== "Banque" && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Seuls les managers banque et admins peuvent valider",
      });
    }

    const ihe = await IHE.findById(id);

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Vérifier l'isolation si c'est une banque (pas admin)
    if (req.user.role === "Banque" && ihe.banqueId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Vous ne pouvez valider que les IHE de votre banque",
      });
    }

    // Permettre la validation d'une IHE en attente ou corrigée après rejet
    if (ihe.statut !== "en_attente_validation" && ihe.statut !== "a_corriger") {
      return res.status(400).json({
        message: `Cette IHE n'est pas en attente de validation (statut: ${ihe.statut})`,
      });
    }

    ihe.statut = "valide";
    ihe.validePar = req.user._id;
    ihe.valideLe = new Date();

    await ihe.save();

    res.status(200).json({
      message: "✅ IHE validée avec succès",
      ihe,
    });
  } catch (error) {
    console.error("❌ Erreur validerIHE:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * ❌ Rejeter une IHE (Manager banque ou Admin)
 * POST /api/banque/ihe/:id/rejeter
 */
exports.rejeterIHE = async (req, res) => {
  try {
    const { id } = req.params;
    const { motifRejet } = req.body;

    if (!motifRejet) {
      return res.status(400).json({ message: "Le motif de rejet est requis" });
    }

    // Vérifier que l'utilisateur est Manager banque ou Admin
    if (req.user.role !== "Banque" && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Seuls les managers banque et admins peuvent rejeter",
      });
    }

    const ihe = await IHE.findById(id);

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Vérifier l'isolation si c'est une banque (pas admin)
    if (req.user.role === "Banque" && ihe.banqueId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Vous ne pouvez rejeter que les IHE de votre banque",
      });
    }

    if (ihe.statut !== "en_attente_validation" && ihe.statut !== "a_corriger") {
      return res.status(400).json({
        message: `Cette IHE n'est pas en attente de validation (statut: ${ihe.statut})`,
      });
    }

    // Rejeter = remettre en attente de correction par l'agent qui a saisi
    // L'IHE revient à l'agent pour correction ou suppression
    ihe.statut = "a_corriger";
    ihe.rejetePar = req.user._id;
    ihe.rejeteLe = new Date();
    ihe.motifRejet = motifRejet;
    // Réinitialiser les champs de validation pour permettre une nouvelle validation après correction
    ihe.validePar = undefined;
    ihe.valideLe = undefined;

    await ihe.save();

    res.status(200).json({
      message: "❌ IHE rejetée - Retournée à l'agent pour correction",
      ihe,
    });
  } catch (error) {
    console.error("❌ Erreur rejeterIHE:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 🗺️ Obtenir les IHE avec coordonnées géographiques pour la carte
 * GET /api/banque/ihe/carte
 */
exports.getIHEsPourCarte = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    const banqueId = new mongoose.Types.ObjectId(req.user._id);

    // Récupérer uniquement les IHE avec coordonnées géographiques valides
    const ihes = await IHE.find({
      banqueId,
      "localisation.latitude": { $exists: true, $ne: null, $ne: 0 },
      "localisation.longitude": { $exists: true, $ne: null, $ne: 0 },
      // Retourner toutes les IHE avec coordonnées, pas seulement celles validées ou en vente
    })
      .select("reference titre type statut valeurComptable localisation createdAt")
      .lean();

    // Formater pour la carte (info-bulles)
    const ihesPourCarte = ihes.map((ihe) => ({
      id: ihe._id,
      reference: ihe.reference,
      titre: ihe.titre,
      type: ihe.type,
      statut: ihe.statut,
      valeurComptable: ihe.valeurComptable,
      latitude: ihe.localisation.latitude,
      longitude: ihe.localisation.longitude,
      adresse: ihe.localisation.adresse,
      ville: ihe.localisation.ville,
      quartier: ihe.localisation.quartier,
      createdAt: ihe.createdAt,
    }));

    res.status(200).json({
      count: ihesPourCarte.length,
      ihes: ihesPourCarte,
    });
  } catch (error) {
    console.error("❌ Erreur getIHEsPourCarte:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 📊 Statistiques des IHE pour le dashboard banque
 * GET /api/banque/ihe/stats
 */
exports.getIHEStats = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    const banqueId = new mongoose.Types.ObjectId(req.user._id);

    // Statistiques par statut
    const statsParStatut = await IHE.aggregate([
      { $match: { banqueId } },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          totalValeurComptable: { $sum: { $ifNull: ["$valeurComptable", 0] } },
        },
      },
    ]);

    const stats = statsParStatut.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        totalValeurComptable: item.totalValeurComptable,
      };
      return acc;
    }, {});

    // Statistiques par type
    const statsParType = await IHE.aggregate([
      { $match: { banqueId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Total général
    const totalIHE = await IHE.countDocuments({ banqueId });
    const totalValeurComptable = await IHE.aggregate([
      { $match: { banqueId } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$valeurComptable", 0] } },
        },
      },
    ]);

    // IHE récentes (5 dernières)
    const ihesRecentes = await IHE.find({ banqueId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("reference titre type statut valeurComptable createdAt")
      .lean();

    // Statistiques réglementaires (alertes)
    const statsReglementaires = await IHE.aggregate([
      { $match: { banqueId } },
      {
        $group: {
          _id: "$statutAlerteReglementaire",
          count: { $sum: 1 },
          totalValeurComptable: { $sum: { $ifNull: ["$valeurComptable", 0] } },
        },
      },
    ]);

    const statsAlertes = statsReglementaires.reduce((acc, item) => {
      acc[item._id || "ok"] = {
        count: item.count,
        totalValeurComptable: item.totalValeurComptable,
      };
      return acc;
    }, {});

    res.status(200).json({
      totalIHE,
      totalValeurComptable: totalValeurComptable[0]?.total || 0,
      parStatut: stats,
      parType: statsParType,
      ihesRecentes,
      alertesReglementaires: statsAlertes,
    });
  } catch (error) {
    console.error("❌ Erreur getIHEStats:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * ⚠️ Obtenir les IHE à risque (approchant ou dépassant la date limite de cession)
 * GET /api/banque/ihe/alertes-reglementaires
 */
exports.getIHEsARisque = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    const banqueId = new mongoose.Types.ObjectId(req.user._id);
    const { niveauAlerte } = req.query; // "attention", "urgent", "depasse", ou tous si non spécifié

    // Construire le filtre
    const filter = {
      banqueId,
      dateLimiteCession: { $exists: true, $ne: null },
      statut: { $nin: ["vendu", "rejete"] }, // Exclure les IHE vendues ou rejetées
    };

    // Filtrer par niveau d'alerte si spécifié
    if (niveauAlerte) {
      filter.statutAlerteReglementaire = niveauAlerte;
    } else {
      // Par défaut, récupérer toutes les IHE à risque (pas "ok")
      filter.statutAlerteReglementaire = { $in: ["attention", "urgent", "depasse"] };
    }

    const ihesARisque = await IHE.find(filter)
      .populate("saisiPar", "fullName phone")
      .populate("validePar", "fullName phone")
      .sort({ dateLimiteCession: 1 }) // Trier par date limite croissante (les plus urgentes en premier)
      .lean();

    // Calculer les jours restants pour chaque IHE
    const maintenant = new Date();
    const ihesAvecDetails = ihesARisque.map((ihe) => {
      const dateLimite = new Date(ihe.dateLimiteCession);
      const diffMs = dateLimite - maintenant;
      const joursRestants = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const moisRestants = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

      return {
        ...ihe,
        joursRestants,
        moisRestants,
        estDepasse: joursRestants < 0,
      };
    });

    // Statistiques rapides
    const stats = {
      total: ihesAvecDetails.length,
      depasse: ihesAvecDetails.filter((i) => i.estDepasse).length,
      urgent: ihesAvecDetails.filter((i) => i.statutAlerteReglementaire === "urgent" && !i.estDepasse).length,
      attention: ihesAvecDetails.filter((i) => i.statutAlerteReglementaire === "attention").length,
    };

    res.status(200).json({
      count: ihesAvecDetails.length,
      stats,
      ihes: ihesAvecDetails,
    });
  } catch (error) {
    console.error("❌ Erreur getIHEsARisque:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

