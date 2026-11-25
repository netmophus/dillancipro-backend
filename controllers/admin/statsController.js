// controllers/admin/statsController.js
const User = require("../../models/User");
const Agence = require("../../models/Agence");
const Banque = require("../../models/Banque");
const Notaire = require("../../models/Notaire");
const Parcelle = require("../../models/agences/Parcelle");
const BienImmobilier = require("../../models/agences/BienImmobilier");
const Location = require("../../models/agences/Location");
const PatrimoineFoncier = require("../../models/PatrimoineFoncier");
const VentePatrimoine = require("../../models/VentePatrimoine");

// Compte sécurisé : ne fait jamais planter la réponse globale
const safeCount = (model, filter = {}) =>
  model.countDocuments(filter).catch(() => 0);

// Agrégat sécurisé (renvoie [] en cas d'erreur)
const safeAgg = (model, pipeline) =>
  model.aggregate(pipeline).catch(() => []);

const getAdminStats = async (req, res) => {
  try {
    const [
      usersTotal,
      usersActifs,
      usersParRole,
      agencesTotal,
      agencesActives,
      agencesEnAttente,
      banquesTotal,
      notairesTotal,
      parcellesTotal,
      parcellesVendues,
      parcellesAVendre,
      parcellesNonVerifiees,
      biensTotal,
      biensDisponibles,
      biensVendus,
      locationsTotal,
      patrimoineTotal,
      ventesTotal,
      ventesParStatut,
    ] = await Promise.all([
      safeCount(User),
      safeCount(User, { isActive: true }),
      safeAgg(User, [{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      safeCount(Agence),
      safeCount(Agence, { statut: "actif" }),
      safeCount(Agence, { statut: "en_attente" }),
      safeCount(Banque),
      safeCount(Notaire),
      safeCount(Parcelle),
      safeCount(Parcelle, { statut: "vendue" }),
      safeCount(Parcelle, { statut: "avendre" }),
      safeCount(Parcelle, { verified: false }),
      safeCount(BienImmobilier),
      safeCount(BienImmobilier, { statut: "disponible" }),
      safeCount(BienImmobilier, { statut: "vendu" }),
      safeCount(Location),
      safeCount(PatrimoineFoncier),
      safeCount(VentePatrimoine),
      safeAgg(VentePatrimoine, [{ $group: { _id: "$statut", count: { $sum: 1 } } }]),
    ]);

    // Normalise les agrégats en objets { clé: nombre }
    const toMap = (arr) =>
      arr.reduce((acc, item) => {
        acc[item._id || "inconnu"] = item.count;
        return acc;
      }, {});

    res.json({
      utilisateurs: {
        total: usersTotal,
        actifs: usersActifs,
        inactifs: usersTotal - usersActifs,
        parRole: toMap(usersParRole),
      },
      agences: {
        total: agencesTotal,
        actives: agencesActives,
        enAttente: agencesEnAttente,
      },
      banques: { total: banquesTotal },
      notaires: { total: notairesTotal },
      parcelles: {
        total: parcellesTotal,
        vendues: parcellesVendues,
        aVendre: parcellesAVendre,
        nonVerifiees: parcellesNonVerifiees,
      },
      biens: {
        total: biensTotal,
        disponibles: biensDisponibles,
        vendus: biensVendus,
      },
      locations: { total: locationsTotal },
      patrimoine: { total: patrimoineTotal },
      ventes: {
        total: ventesTotal,
        parStatut: toMap(ventesParStatut),
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Erreur getAdminStats:", error);
    res.status(500).json({ message: "Erreur lors du calcul des statistiques" });
  }
};

module.exports = { getAdminStats };
