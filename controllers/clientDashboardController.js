// controllers/clientDashboardController.js
const Parcelle = require("../models/agences/Parcelle");
const BienImmobilier = require("../models/agences/BienImmobilier");
const Paiement = require("../models/agences/Paiement");
const PartielPaiement = require("../models/agences/PartielPaiement");
const Vente = require("../models/agences/Vente");
const PatrimoineFoncier = require("../models/PatrimoineFoncier");
const Agence = require("../models/Agence");

/**
 * Dashboard du client - Toutes ses informations
 * GET /api/client/dashboard
 */
exports.getClientDashboard = async (req, res) => {
  try {
    const clientId = req.user.id;

    // 1) Récupérer les parcelles achetées par ce client
    const parcelles = await Parcelle.find({ vendueA: clientId })
      .populate("ilot", "numeroIlot")
      .populate({
        path: "ilot",
        populate: [
          { path: "zone", select: "nom" },
          { path: "quartier", select: "nom" },
        ],
      })
      .populate("affecteeA", "fullName phone")
      .sort({ dateVente: -1 });

    // 2) Récupérer les paiements du client
    const paiements = await Paiement.find({ client: clientId })
      .populate({
        path: "parcelle",
        select: "numeroParcelle prix ilot",
        populate: { path: "ilot", select: "numeroIlot" },
      })
      .sort({ datePaiement: -1 });

    // 3) Pour chaque paiement partiel, récupérer l'historique des versements
    const paiementsAvecHistorique = await Promise.all(
      paiements.map(async (paiement) => {
        if (paiement.typePaiement === "partiel") {
          const versements = await PartielPaiement.find({ paiement: paiement._id }).sort({
            datePaiement: -1,
          });
          return {
            ...paiement.toObject(),
            versements,
          };
        }
        return paiement.toObject();
      })
    );

    // 4) Calculer les statistiques
    const totalParcelles = parcelles.length;
    const montantTotalAchat = parcelles.reduce((sum, p) => sum + (p.prix || 0), 0);

    const totalPaiements = paiements.reduce((sum, p) => sum + (p.montantTotal || 0), 0);
    const totalPaye = paiements.reduce((sum, p) => sum + (p.montantPaye || 0), 0);
    const totalRestant = paiements.reduce((sum, p) => sum + (p.montantRestant || 0), 0);

    const paiementsPartiels = paiements.filter((p) => p.typePaiement === "partiel").length;
    const paiementsComplets = paiements.filter((p) => p.typePaiement === "total").length;

    const paiementsEnCours = paiements.filter((p) => p.statut === "unpaid").length;
    const paiementsSoldes = paiements.filter((p) => p.statut === "paid").length;

    // 5) Récupérer les ventes (informations complémentaires)
    const ventes = await Vente.find()
      .populate({
        path: "parcelle",
        match: { vendueA: clientId },
      })
      .sort({ dateVente: -1 });

    const ventesFiltered = ventes.filter((v) => v.parcelle !== null);

    // 6) Récupérer le patrimoine personnel du client
    const patrimoinePersonnel = await PatrimoineFoncier.find({ clientId });
    const totalPatrimoinePersonnel = patrimoinePersonnel.length;
    const superficiePatrimoine = patrimoinePersonnel.reduce(
      (sum, b) => sum + (b.superficie || 0),
      0
    );
    const valeurPatrimoine = patrimoinePersonnel.reduce(
      (sum, b) => sum + (b.valeurEstimee || 0),
      0
    );

    // Statistiques consolidées
    const totalBiensConsolides = totalParcelles + totalPatrimoinePersonnel;
    const superficieTotaleConsolidee = parcelles.reduce((sum, p) => sum + (p.superficie || 0), 0) + superficiePatrimoine;

    return res.status(200).json({
      // Statistiques
      stats: {
        // Parcelles achetées via agence
        totalParcelles,
        montantTotalAchat,
        totalPaiements,
        totalPaye,
        totalRestant,
        paiementsPartiels,
        paiementsComplets,
        paiementsEnCours,
        paiementsSoldes,

        // Patrimoine personnel
        totalPatrimoinePersonnel,
        superficiePatrimoine,
        valeurPatrimoine,

        // Consolidé
        totalBiensConsolides,
        superficieTotaleConsolidee,
      },

      // Données détaillées
      parcelles,
      paiements: paiementsAvecHistorique,
      ventes: ventesFiltered,
      patrimoinePersonnel,
    });
  } catch (error) {
    console.error("❌ Erreur getClientDashboard:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * Mes achats via agence - Parcelles et biens immobiliers
 * GET /api/client/mes-achats-agence
 */
exports.getMesAchatsAgence = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    console.log("📝 [MES_ACHATS] Récupération des achats pour client:", clientId);

    // 1️⃣ Récupérer les paiements du client
    const paiements = await Paiement.find({ client: clientId })
      .populate({
        path: "parcelle",
        populate: [
          { path: "ilot", select: "numeroIlot" },
          { path: "agenceId", select: "nom" }
        ]
      })
      .sort({ datePaiement: -1 })
      .lean();

    // 2️⃣ Pour chaque paiement, récupérer l'historique des versements partiels
    const achats = await Promise.all(
      paiements.map(async (paiement) => {
        let versements = [];
        let pourcentagePaye = 0;
        
        if (paiement.typePaiement === "partiel") {
          versements = await PartielPaiement.find({ paiement: paiement._id })
            .sort({ datePaiement: 1 })
            .lean();
        }
        
        if (paiement.montantTotal > 0) {
          pourcentagePaye = ((paiement.montantPaye / paiement.montantTotal) * 100).toFixed(1);
        }
        
        // Récupérer la vente associée
        const vente = await Vente.findOne({ parcelle: paiement.parcelle?._id }).lean();
        
        // Vérifier si déjà ajouté au patrimoine
        const dansPatrimoine = await PatrimoineFoncier.findOne({
          venteAgenceId: vente?._id
        }).lean();

        return {
          _id: paiement._id,
          type: "parcelle",
          bien: paiement.parcelle,
          agence: paiement.parcelle?.agenceId,
          paiement: {
            typePaiement: paiement.typePaiement,
            montantTotal: paiement.montantTotal,
            montantPaye: paiement.montantPaye,
            montantRestant: paiement.montantRestant,
            statut: paiement.statut,
            pourcentagePaye: parseFloat(pourcentagePaye),
            datePaiement: paiement.datePaiement,
            recuUrl: paiement.recuUrl,
          },
          versements,
          vente,
          dansPatrimoine: !!dansPatrimoine,
          patrimoineId: dansPatrimoine?._id,
          dateAchat: vente?.dateVente || paiement.datePaiement,
        };
      })
    );

    // 3️⃣ Statistiques
    const totalAchats = achats.length;
    const achatsPayes = achats.filter(a => a.paiement.statut === "paid").length;
    const achatsEnCours = achats.filter(a => a.paiement.statut === "unpaid").length;
    const montantTotalAchats = achats.reduce((sum, a) => sum + (a.paiement.montantTotal || 0), 0);
    const montantPaye = achats.reduce((sum, a) => sum + (a.paiement.montantPaye || 0), 0);
    const montantRestant = achats.reduce((sum, a) => sum + (a.paiement.montantRestant || 0), 0);
    const dansPatrimoine = achats.filter(a => a.dansPatrimoine).length;

    console.log("✅ [MES_ACHATS] Statistiques calculées:", {
      total: totalAchats,
      payes: achatsPayes,
      enCours: achatsEnCours,
      dansPatrimoine
    });

    return res.status(200).json({
      stats: {
        totalAchats,
        achatsPayes,
        achatsEnCours,
        montantTotalAchats,
        montantPaye,
        montantRestant,
        dansPatrimoine,
      },
      achats,
    });
  } catch (error) {
    console.error("❌ Erreur getMesAchatsAgence:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

