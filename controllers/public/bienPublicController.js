// controllers/public/bienPublicController.js
// Contrôleur public pour la recherche de biens immobiliers (accessible sans authentification)

const BienImmobilier = require("../../models/agences/BienImmobilier");
const Agence = require("../../models/Agence");
const mongoose = require("mongoose");

/**
 * Recherche publique de biens immobiliers avec filtres avancés
 * GET /api/public/biens/search
 * Query params: ville, quartier, type, agence, prixMin, prixMax, superficieMin, superficieMax, page, limit
 */
exports.getPublicBiensSearch = async (req, res) => {
  try {
    const {
      ville,
      quartier,
      type,
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

    const filter = {
      statut: "disponible",
      verified: true,
    };

    if (ville) {
      filter["localisation.ville"] = { $regex: new RegExp(ville, "i") };
    }
    if (quartier) {
      filter["localisation.quartier"] = { $regex: new RegExp(quartier, "i") };
    }
    if (type) {
      filter.type = type;
    }
    if (agence) {
      filter.agenceId = new mongoose.Types.ObjectId(agence);
    }
    if (prixMin) {
      filter.prix = { ...filter.prix, $gte: parseFloat(prixMin) };
    }
    if (prixMax) {
      filter.prix = { ...filter.prix, $lte: parseFloat(prixMax) };
    }
    if (superficieMin) {
      filter.superficie = { ...filter.superficie, $gte: parseFloat(superficieMin) };
    }
    if (superficieMax) {
      filter.superficie = { ...filter.superficie, $lte: parseFloat(superficieMax) };
    }

    const total = await BienImmobilier.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const biens = await BienImmobilier.find(filter)
      .populate("agenceId", "nom telephone email adresse ville")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Utiliser lean() pour obtenir des objets JavaScript purs

    // Log pour vérifier les données
    if (biens.length > 0) {
      const firstBien = biens[0];
      console.log("🔵 [PUBLIC_BIENS] Premier bien récupéré:", firstBien.titre);
      console.log("📍 [PUBLIC_BIENS] situationGeographique:", firstBien.situationGeographique, "Type:", typeof firstBien.situationGeographique);
      console.log("🏗️ [PUBLIC_BIENS] descriptionPhysique:", firstBien.descriptionPhysique, "Type:", typeof firstBien.descriptionPhysique);
      console.log("⭐ [PUBLIC_BIENS] atoutsMajeurs:", firstBien.atoutsMajeurs, "Type:", typeof firstBien.atoutsMajeurs, "IsArray:", Array.isArray(firstBien.atoutsMajeurs));
    }

    res.status(200).json({
      message: "Biens trouvés avec succès",
      biens,
      pagination: {
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("❌ Erreur getPublicBiensSearch:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * Récupérer les options de filtres pour la recherche publique
 * GET /api/public/biens/filters
 */
exports.getPublicBienFilters = async (req, res) => {
  try {
    const villes = await BienImmobilier.distinct("localisation.ville", {
      statut: "disponible",
      verified: true,
    });
    const quartiers = await BienImmobilier.distinct("localisation.quartier", {
      statut: "disponible",
      verified: true,
    });
    const types = await BienImmobilier.distinct("type", {
      statut: "disponible",
      verified: true,
    });
    const agences = await Agence.find({ statut: { $in: ["actif", "en_attente"] } })
      .select("nom")
      .sort("nom");

    res.status(200).json({
      filters: {
        villes: villes.filter(Boolean).map((v, idx) => ({ id: idx, nom: v })).sort((a, b) => a.nom.localeCompare(b.nom)),
        quartiers: quartiers.filter(Boolean).map((q, idx) => ({ id: idx, nom: q })).sort((a, b) => a.nom.localeCompare(b.nom)),
        types: types.map((t, idx) => ({ id: idx, nom: t })).sort((a, b) => a.nom.localeCompare(b.nom)),
        agences: agences.map((a) => ({ id: a._id, nom: a.nom })),
      },
    });
  } catch (error) {
    console.error("❌ Erreur getPublicBienFilters:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * Récupérer les statistiques pour la recherche publique
 * GET /api/public/biens/stats
 */
exports.getPublicBienStats = async (req, res) => {
  try {
    const stats = await BienImmobilier.aggregate([
      { $match: { statut: "disponible", verified: true } },
      {
        $group: {
          _id: null,
          minPrix: { $min: "$prix" },
          maxPrix: { $max: "$prix" },
          avgPrix: { $avg: "$prix" },
          minSuperficie: { $min: "$superficie" },
          maxSuperficie: { $max: "$superficie" },
          avgSuperficie: { $avg: "$superficie" },
          totalBiens: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      stats: {
        prix: {
          prixMin: stats[0]?.minPrix || 0,
          prixMax: stats[0]?.maxPrix || 0,
          prixMoyen: stats[0]?.avgPrix || 0,
        },
        superficie: {
          superficieMin: stats[0]?.minSuperficie || 0,
          superficieMax: stats[0]?.maxSuperficie || 0,
          superficieMoyenne: stats[0]?.avgSuperficie || 0,
        },
        totalBiens: stats[0]?.totalBiens || 0,
      },
    });
  } catch (error) {
    console.error("❌ Erreur getPublicBienStats:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

