// controllers/public/parcellePublicController.js
// Contrôleur public pour la recherche de parcelles (accessible sans authentification)

const Parcelle = require("../../models/agences/Parcelle");
const Ilot = require("../../models/agences/Ilot");
const Zone = require("../../models/agences/Zone");
const Quartier = require("../../models/agences/Quartier");
const Ville = require("../../models/agences/Ville");
const Agence = require("../../models/Agence");
const mongoose = require("mongoose");

/**
 * Recherche publique de parcelles avec filtres avancés
 * GET /api/public/parcelles/search
 * Query params: ville, quartier, cite (zone), agence, prixMin, prixMax, page, limit
 */
exports.searchParcelles = async (req, res) => {
  try {
    const {
      ville,
      quartier,
      cite, // Zone/Cité
      agence,
      prixMin,
      prixMax,
      superficieMin,
      superficieMax,
      page = 1,
      limit = 20,
      sortBy = "createdAt", // createdAt, prix, superficie
      sortOrder = "desc", // asc, desc
    } = req.query;

    // Construire le filtre de base : seulement les parcelles à vendre et vérifiées
    const filter = {
      statut: "avendre",
      verified: true,
    };

    // Filtre par ville
    let ilotIds = null;
    if (ville) {
      const villeDoc = await Ville.findOne({
        nom: { $regex: new RegExp(ville, "i") },
      });
      if (villeDoc) {
        const quartiers = await Quartier.find({ ville: villeDoc._id }).select("_id");
        const quartierIds = quartiers.map((q) => q._id);
        const zones = await Zone.find({ quartier: { $in: quartierIds } }).select("_id");
        const zoneIds = zones.map((z) => z._id);
        const ilots = await Ilot.find({ zone: { $in: zoneIds } }).select("_id");
        ilotIds = ilots.map((i) => i._id.toString());
      } else {
        // Si la ville n'existe pas, retourner un tableau vide
        return res.status(200).json({
          message: "Aucune parcelle trouvée",
          parcelles: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    }

    // Filtre par quartier
    if (quartier) {
      const quartierDoc = await Quartier.findOne({
        nom: { $regex: new RegExp(quartier, "i") },
      });
      if (quartierDoc) {
        const zones = await Zone.find({ quartier: quartierDoc._id }).select("_id");
        const zoneIds = zones.map((z) => z._id);
        const ilots = await Ilot.find({ zone: { $in: zoneIds } }).select("_id");
        const quartierIlotIds = ilots.map((i) => i._id.toString());
        if (ilotIds) {
          // Intersecter avec les filtres existants
          ilotIds = ilotIds.filter((id) => quartierIlotIds.includes(id));
        } else {
          ilotIds = quartierIlotIds;
        }
      } else {
        return res.status(200).json({
          message: "Aucune parcelle trouvée",
          parcelles: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    }

    // Filtre par cité/zone
    if (cite) {
      const zoneDoc = await Zone.findOne({
        nom: { $regex: new RegExp(cite, "i") },
      });
      if (zoneDoc) {
        const ilots = await Ilot.find({ zone: zoneDoc._id }).select("_id");
        const citeIlotIds = ilots.map((i) => i._id.toString());
        if (ilotIds) {
          // Intersecter avec les filtres existants
          ilotIds = ilotIds.filter((id) => citeIlotIds.includes(id));
        } else {
          ilotIds = citeIlotIds;
        }
      } else {
        return res.status(200).json({
          message: "Aucune parcelle trouvée",
          parcelles: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    }

    // Appliquer le filtre sur les ilots si nécessaire
    if (ilotIds && ilotIds.length > 0) {
      filter.ilot = { $in: ilotIds.map((id) => new mongoose.Types.ObjectId(id)) };
    } else if (ilotIds && ilotIds.length === 0) {
      // Aucun ilot correspondant, retourner un tableau vide
      return res.status(200).json({
        message: "Aucune parcelle trouvée",
        parcelles: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0,
      });
    }

    // Filtre par agence
    if (agence) {
      if (mongoose.Types.ObjectId.isValid(agence)) {
        filter.agenceId = agence;
      } else {
        const agenceDoc = await Agence.findOne({
          nom: { $regex: new RegExp(agence, "i") },
          statut: "actif",
        });
        if (agenceDoc) {
          filter.agenceId = agenceDoc._id;
        } else {
          return res.status(200).json({
            message: "Aucune parcelle trouvée",
            parcelles: [],
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          });
        }
      }
    }

    // Filtre par prix
    if (prixMin || prixMax) {
      filter.prix = {};
      if (prixMin) filter.prix.$gte = parseFloat(prixMin);
      if (prixMax) filter.prix.$lte = parseFloat(prixMax);
    }

    // Filtre par superficie
    if (superficieMin || superficieMax) {
      filter.superficie = {};
      if (superficieMin) filter.superficie.$gte = parseFloat(superficieMin);
      if (superficieMax) filter.superficie.$lte = parseFloat(superficieMax);
    }

    // Calculer le skip pour la pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Déterminer l'ordre de tri
    const sortOptions = {};
    if (sortBy === "prix") {
      sortOptions.prix = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "superficie") {
      sortOptions.superficie = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    }

    // Compter le total de parcelles correspondantes
    const total = await Parcelle.countDocuments(filter);

    // Récupérer les parcelles avec pagination
    const parcelles = await Parcelle.find(filter)
      .populate({
        path: "ilot",
        select: "numeroIlot images videos zone quartier",
        populate: {
          path: "zone",
          select: "nom",
          populate: {
            path: "quartier",
            select: "nom",
            populate: {
              path: "ville",
              select: "nom",
            },
          },
        },
      })
      .populate("agenceId", "nom telephone email ville adresse")
      .select("-affecteeA -vendueA -dateVente -verifiedBy -verifiedAt") // Exclure les données sensibles
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Ajouter les images et vidéos de l'îlot à chaque parcelle
    const parcellesWithIlotMedia = parcelles.map(parcelle => ({
      ...parcelle.toObject(),
      images: parcelle.ilot?.images || [],
      videos: parcelle.ilot?.videos || [],
    }));

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      message: "Parcelles trouvées avec succès",
      parcelles: parcellesWithIlotMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("❌ [SEARCH_PARCelles] Erreur:", error);
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * Récupérer les options de filtres (villes, quartiers, cités, agences)
 * GET /api/public/parcelles/filters
 */
exports.getFilterOptions = async (req, res) => {
  try {
    // Récupérer toutes les villes
    const villes = await Ville.find().select("nom").sort({ nom: 1 });

    // Récupérer tous les quartiers avec leur ville
    const quartiers = await Quartier.find()
      .populate("ville", "nom")
      .select("nom ville")
      .sort({ nom: 1 });

    // Récupérer toutes les zones/cités avec leur quartier et ville
    const zones = await Zone.find()
      .populate({
        path: "quartier",
        select: "nom",
        populate: {
          path: "ville",
          select: "nom",
        },
      })
      .select("nom quartier")
      .sort({ nom: 1 });

    // Récupérer toutes les agences actives
    const agences = await Agence.find({ statut: "actif" })
      .select("nom ville telephone")
      .sort({ nom: 1 });

    res.status(200).json({
      message: "Options de filtres récupérées avec succès",
      filters: {
        villes: villes.map((v) => ({ id: v._id, nom: v.nom })),
        quartiers: quartiers.map((q) => ({
          id: q._id,
          nom: q.nom,
          ville: q.ville?.nom || "",
        })),
        cites: zones.map((z) => ({
          id: z._id,
          nom: z.nom,
          quartier: z.quartier?.nom || "",
          ville: z.quartier?.ville?.nom || "",
        })),
        agences: agences.map((a) => ({
          id: a._id,
          nom: a.nom,
          ville: a.ville || "",
        })),
      },
    });
  } catch (error) {
    console.error("❌ [GET_FILTER_OPTIONS] Erreur:", error);
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * Récupérer les statistiques des parcelles disponibles
 * GET /api/public/parcelles/stats
 */
exports.getStats = async (req, res) => {
  try {
    const totalParcelles = await Parcelle.countDocuments({
      statut: "avendre",
      verified: true,
    });

    const prixStats = await Parcelle.aggregate([
      {
        $match: {
          statut: "avendre",
          verified: true,
          prix: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          prixMin: { $min: "$prix" },
          prixMax: { $max: "$prix" },
          prixMoyen: { $avg: "$prix" },
        },
      },
    ]);

    const superficieStats = await Parcelle.aggregate([
      {
        $match: {
          statut: "avendre",
          verified: true,
          superficie: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          superficieMin: { $min: "$superficie" },
          superficieMax: { $max: "$superficie" },
          superficieMoyenne: { $avg: "$superficie" },
        },
      },
    ]);

    res.status(200).json({
      message: "Statistiques récupérées avec succès",
      stats: {
        totalParcelles,
        prix: prixStats[0] || { prixMin: 0, prixMax: 0, prixMoyen: 0 },
        superficie: superficieStats[0] || {
          superficieMin: 0,
          superficieMax: 0,
          superficieMoyenne: 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ [GET_STATS] Erreur:", error);
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

