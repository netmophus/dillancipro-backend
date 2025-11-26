// controllers/public/locationPublicController.js
// Contrôleur public pour la recherche de locations (accessible sans authentification)

const Location = require("../../models/agences/Location");
const Agence = require("../../models/Agence");
const Ville = require("../../models/agences/Ville");
const Quartier = require("../../models/agences/Quartier");

/**
 * Recherche publique de locations avec filtres avancés
 * GET /api/public/locations/search
 * Query params: ville, quartier, type, agence, prixMin, prixMax, superficieMin, superficieMax, chambres, page, limit
 */
exports.searchLocations = async (req, res) => {
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
      chambres,
      meuble,
      page = 1,
      limit = 20,
      sortBy = "createdAt", // createdAt, prixMensuel, superficie
      sortOrder = "desc", // asc, desc
    } = req.query;

    // Construire le filtre de base : seulement les locations disponibles
    const filter = {
      statut: "disponible",
    };

    // Filtre par ville
    if (ville) {
      filter.ville = { $regex: new RegExp(ville, "i") };
    }

    // Filtre par quartier
    if (quartier) {
      filter.quartier = { $regex: new RegExp(quartier, "i") };
    }

    // Filtre par type
    if (type) {
      filter.type = type;
    }

    // Filtre par agence
    if (agence) {
      if (require("mongoose").Types.ObjectId.isValid(agence)) {
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
            message: "Aucune location trouvée",
            locations: [],
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          });
        }
      }
    }

    // Filtre par prix mensuel
    if (prixMin || prixMax) {
      filter.prixMensuel = {};
      if (prixMin) filter.prixMensuel.$gte = parseFloat(prixMin);
      if (prixMax) filter.prixMensuel.$lte = parseFloat(prixMax);
    }

    // Filtre par superficie
    if (superficieMin || superficieMax) {
      filter.superficie = {};
      if (superficieMin) filter.superficie.$gte = parseFloat(superficieMin);
      if (superficieMax) filter.superficie.$lte = parseFloat(superficieMax);
    }

    // Filtre par nombre de chambres
    if (chambres) {
      filter.chambres = parseInt(chambres);
    }

    // Filtre par meublé
    if (meuble !== undefined && meuble !== "") {
      filter.meuble = meuble === "true" || meuble === true;
    }

    // Calculer le skip pour la pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Déterminer l'ordre de tri
    const sortOptions = {};
    if (sortBy === "prixMensuel") {
      sortOptions.prixMensuel = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "superficie") {
      sortOptions.superficie = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    }

    // Compter le total de locations correspondantes
    const total = await Location.countDocuments(filter);

    // Récupérer les locations avec pagination
    const locations = await Location.find(filter)
      .populate("agenceId", "nom telephone email ville adresse")
      .populate("proprietaire", "fullName phone")
      .select("-locataireActuel -dateDebutLocation -dateFinLocation -visites -demandes -evaluations") // Exclure les données sensibles
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      message: "Locations trouvées avec succès",
      locations,
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
    console.error("❌ [SEARCH_LOCATIONS] Erreur:", error);
    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * Récupérer les options de filtres (villes, quartiers, types, agences)
 * GET /api/public/locations/filters
 */
exports.getFilterOptions = async (req, res) => {
  try {
    // Récupérer toutes les villes distinctes depuis les locations
    const villes = await Location.distinct("ville");
    const villesList = villes
      .filter((v) => v)
      .map((nom) => ({ id: nom, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));

    // Récupérer tous les quartiers distincts depuis les locations
    const quartiers = await Location.distinct("quartier");
    const quartiersList = quartiers
      .filter((q) => q)
      .map((nom) => ({ id: nom, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));

    // Types de logements disponibles
    const types = [
      { id: "Villa", nom: "Villa" },
      { id: "Appartement", nom: "Appartement" },
      { id: "Studio", nom: "Studio" },
      { id: "Maison", nom: "Maison" },
      { id: "Duplex", nom: "Duplex" },
      { id: "Chambre", nom: "Chambre" },
      { id: "Autre", nom: "Autre" },
    ];

    // Récupérer toutes les agences actives
    const agences = await Agence.find({ statut: "actif" })
      .select("nom ville telephone")
      .sort({ nom: 1 });

    res.status(200).json({
      message: "Options de filtres récupérées avec succès",
      filters: {
        villes: villesList,
        quartiers: quartiersList,
        types,
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
 * Récupérer les statistiques des locations disponibles
 * GET /api/public/locations/stats
 */
exports.getStats = async (req, res) => {
  try {
    const totalLocations = await Location.countDocuments({
      statut: "disponible",
    });

    const prixStats = await Location.aggregate([
      {
        $match: {
          statut: "disponible",
          prixMensuel: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          prixMin: { $min: "$prixMensuel" },
          prixMax: { $max: "$prixMensuel" },
          prixMoyen: { $avg: "$prixMensuel" },
        },
      },
    ]);

    const superficieStats = await Location.aggregate([
      {
        $match: {
          statut: "disponible",
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
        totalLocations,
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

