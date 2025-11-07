// controllers/agences/agenceStatsController.js
const Parcelle = require("../../models/agences/Parcelle");
const BienImmobilier = require("../../models/agences/BienImmobilier");
const User = require("../../models/User");
const Paiement = require("../../models/agences/Paiement");
const PartielPaiement = require("../../models/agences/PartielPaiement");
const Vente = require("../../models/agences/Vente");
const Ville = require("../../models/agences/Ville");
const Quartier = require("../../models/agences/Quartier");
const Zone = require("../../models/agences/Zone");
const Ilot = require("../../models/agences/Ilot");
const Agence = require("../../models/Agence");
const mongoose = require("mongoose");

/**
 * 📊 Statistiques globales de l'agence
 * GET /api/agence/stats
 */
exports.getAgenceStats = async (req, res) => {
  try {
    const agenceId = req.user.agenceId; // Récupéré depuis le middleware d'auth

    if (!agenceId) {
      return res.status(400).json({ message: "Agence non identifiée" });
    }

    // 1️⃣ STATISTIQUES DES PARCELLES
    const parcellesStats = await Parcelle.aggregate([
      { $match: { agenceId: new mongoose.Types.ObjectId(agenceId) } },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          totalSuperficie: { $sum: { $ifNull: ["$superficie", 0] } },
          totalPrix: { $sum: { $ifNull: ["$prix", 0] } },
        },
      },
    ]);

    const parcellesParStatut = parcellesStats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        superficie: item.totalSuperficie,
        prix: item.totalPrix,
      };
      return acc;
    }, {});

    const totalParcelles = parcellesStats.reduce((sum, item) => sum + item.count, 0);
    const parcellesDisponibles = parcellesParStatut.avendre?.count || 0;
    const parcellesVendues = parcellesParStatut.vendue?.count || 0;
    const parcellesReservees = parcellesParStatut.reserved?.count || 0;

    // 2️⃣ CHIFFRE D'AFFAIRES (basé sur les parcelles vendues)
    const chiffreAffaires = parcellesParStatut.vendue?.prix || 0;
    const superficieTotale = parcellesStats.reduce((sum, item) => sum + item.totalSuperficie, 0);
    const superficieVendue = parcellesParStatut.vendue?.superficie || 0;

    // 3️⃣ STATISTIQUES DES PAIEMENTS
    const paiementsData = await Paiement.aggregate([
      {
        $lookup: {
          from: "parcelles",
          localField: "parcelle",
          foreignField: "_id",
          as: "parcelleDoc",
        },
      },
      { $unwind: "$parcelleDoc" },
      {
        $match: {
          "parcelleDoc.agenceId": new mongoose.Types.ObjectId(agenceId),
        },
      },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          totalMontant: { $sum: { $ifNull: ["$montantTotal", 0] } },
          totalPaye: { $sum: { $ifNull: ["$montantPaye", 0] } },
          totalRestant: { $sum: { $ifNull: ["$montantRestant", 0] } },
        },
      },
    ]);

    const paiementsParStatut = paiementsData.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        montantTotal: item.totalMontant,
        montantPaye: item.totalPaye,
        montantRestant: item.totalRestant,
      };
      return acc;
    }, {});

    const totalEncaissements = paiementsData.reduce(
      (sum, item) => sum + item.totalPaye,
      0
    );
    const totalPaiementsEnCours = paiementsParStatut.unpaid?.count || 0;
    const montantRestantTotal = paiementsParStatut.unpaid?.montantRestant || 0;

    // 4️⃣ STATISTIQUES DES COMMERCIAUX (seulement ceux de cette agence)
    const commerciaux = await User.countDocuments({ 
      role: "Commercial",
      agenceId: new mongoose.Types.ObjectId(agenceId)
    });

    // Top 3 commerciaux par nombre de ventes
    const topCommerciaux = await Parcelle.aggregate([
      {
        $match: {
          agenceId: new mongoose.Types.ObjectId(agenceId),
          statut: "vendue",
          affecteeA: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$affecteeA",
          totalVentes: { $sum: 1 },
          totalCA: { $sum: { $ifNull: ["$prix", 0] } },
        },
      },
      { $sort: { totalVentes: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: "$userDoc" },
      {
        $project: {
          commercialId: "$_id",
          nom: "$userDoc.fullName",
          phone: "$userDoc.phone",
          totalVentes: 1,
          totalCA: 1,
        },
      },
    ]);

    // 5️⃣ VENTES RÉCENTES (10 dernières) - Filtrer directement par agenceId
    const ventesRecentes = await Vente.find({ agenceId: new mongoose.Types.ObjectId(agenceId) })
      .populate({
        path: "parcelle",
        populate: { path: "ilot", select: "numeroIlot" },
      })
      .sort({ dateVente: -1 })
      .limit(10)
      .lean();

    const ventesRecentesFiltered = ventesRecentes
      .filter((v) => v.parcelle !== null)
      .map((v) => ({
        _id: v._id,
        parcelleNumero: v.parcelle.numeroParcelle,
        ilotNumero: v.parcelle.ilot?.numeroIlot || "N/A",
        acquereur: v.acquereurNom,
        montant: v.montantPaye,
        typePaiement: v.typePaiement,
        dateVente: v.dateVente,
      }));

    // 6️⃣ STATISTIQUES GÉOGRAPHIQUES
    // Villes, quartiers et zones sont partagés entre toutes les agences
    const villes = await Ville.countDocuments(); // Toutes les villes
    const quartiers = await Quartier.countDocuments(); // Tous les quartiers
    const zones = await Zone.countDocuments(); // Toutes les zones
    // Seuls les îlots sont isolés par agence
    const ilots = await Ilot.countDocuments({ agenceId: new mongoose.Types.ObjectId(agenceId) });

    // 7️⃣ ÉVOLUTION DES VENTES PAR MOIS (6 derniers mois)
    const sixMoisAgo = new Date();
    sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 6);

    const ventesByMonth = await Vente.aggregate([
      {
        $lookup: {
          from: "parcelles",
          localField: "parcelle",
          foreignField: "_id",
          as: "parcelleDoc",
        },
      },
      { $unwind: "$parcelleDoc" },
      {
        $match: {
          "parcelleDoc.agenceId": new mongoose.Types.ObjectId(agenceId),
          dateVente: { $gte: sixMoisAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$dateVente" },
            month: { $month: "$dateVente" },
          },
          count: { $sum: 1 },
          totalMontant: { $sum: { $ifNull: ["$montantPaye", 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 8️⃣ PAIEMENTS PARTIELS EN COURS
    const paiementsPartiels = await Paiement.countDocuments({
      typePaiement: "partiel",
      statut: "unpaid",
    });

    // 9️⃣ STATISTIQUES DES BIENS IMMOBILIERS
    console.log("📝 [AGENCE_STATS] Calcul des statistiques biens pour agence:", agenceId);
    
    const biensStats = await BienImmobilier.aggregate([
      { $match: { agenceId: new mongoose.Types.ObjectId(agenceId) } },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          totalSuperficie: { $sum: { $ifNull: ["$superficie", 0] } },
          totalPrix: { $sum: { $ifNull: ["$prix", 0] } },
        },
      },
    ]);

    const biensParStatut = biensStats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        superficie: item.totalSuperficie,
        prix: item.totalPrix,
      };
      return acc;
    }, {});

    const totalBiens = biensStats.reduce((sum, item) => sum + item.count, 0);
    const biensDisponibles = biensParStatut.disponible?.count || 0;
    const biensVendus = biensParStatut.vendu?.count || 0;
    const biensReserves = biensParStatut.reserve?.count || 0;

    const biensCA = biensParStatut.vendu?.prix || 0;
    const biensSuperficieTotale = biensStats.reduce((sum, item) => sum + item.totalSuperficie, 0);
    const biensSuperficieVendue = biensParStatut.vendu?.superficie || 0;

    console.log("✅ [AGENCE_STATS] Statistiques biens calculées:", {
      total: totalBiens,
      vendus: biensVendus,
      disponibles: biensDisponibles,
      ca: biensCA
    });

    // Retourner toutes les statistiques
    return res.status(200).json({
      // Parcelles
      totalParcelles,
      parcellesDisponibles,
      parcellesVendues,
      parcellesReservees,
      superficieTotale,
      superficieVendue,
      
      // Financier
      chiffreAffaires,
      totalEncaissements,
      totalPaiementsEnCours,
      montantRestantTotal,
      paiementsPartiels,

      // Commerciaux
      totalCommerciaux: commerciaux,
      topCommerciaux,

      // Géographie
      statistiquesGeographiques: {
        villes,
        quartiers,
        zones,
        ilots,
      },

      // Activités récentes
      ventesRecentes: ventesRecentesFiltered,
      ventesByMonth,

      // Biens Immobiliers
      biens: {
        total: totalBiens,
        disponibles: biensDisponibles,
        vendus: biensVendus,
        reserves: biensReserves,
        ca: biensCA,
        superficieTotale: biensSuperficieTotale,
        superficieVendue: biensSuperficieVendue,
      }
    });
  } catch (error) {
    console.error("❌ Erreur getAgenceStats:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 🏢 Informations de l'agence
 * GET /api/agence/profile
 */
exports.getAgenceProfile = async (req, res) => {
  try {
    const agenceId = req.user.agenceId;

    if (!agenceId) {
      return res.status(400).json({ message: "Agence non identifiée" });
    }

    const agence = await Agence.findById(agenceId).select(
      "nom telephone nif rccm description fichiers createdAt"
    );

    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    // Normaliser la réponse pour exposer directement le logo si présent
    const payload = {
      _id: agence._id,
      nom: agence.nom,
      telephone: agence.telephone,
      nif: agence.nif,
      rccm: agence.rccm,
      description: agence.description || "",
      createdAt: agence.createdAt,
      logo: agence.fichiers?.logo || null,
    };

    res.json(payload);
  } catch (error) {
    console.error("❌ Erreur getAgenceProfile:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

