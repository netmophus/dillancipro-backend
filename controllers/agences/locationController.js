// controllers/agences/locationController.js
const Location = require("../../models/agences/Location");
const mongoose = require("mongoose");

/**
 * 🏠 Créer une nouvelle location
 * POST /api/agence/locations
 */
exports.createLocation = async (req, res) => {
  try {
    const agenceId = req.user.agenceId;
    const proprietaireId = req.user.id;
    const userRole = req.user.role;

    console.log("🏠 [CREATE_LOCATION] User:", { agenceId, proprietaireId, userRole });

    // Pour les Admins, utiliser l'agenceId fourni dans le body ou null
    let finalAgenceId = agenceId;
    if (userRole === "Admin" && !agenceId) {
      finalAgenceId = req.body.agenceId || null;
      console.log("🏠 [CREATE_LOCATION] Admin - agenceId from body:", finalAgenceId);
    }

    if (!finalAgenceId && userRole !== "Admin") {
      return res.status(400).json({ message: "Agence non identifiée" });
    }

    // Générer une référence unique
    const reference = Location.generateReference();

    // Mapper les données du formulaire vers le modèle
    const locationData = {
      titre: req.body.titre,
      description: req.body.description,
      type: req.body.typeBien || req.body.type,
      ville: req.body.ville,
      quartier: req.body.quartier,
      adresse: req.body.adresse,
      superficie: parseFloat(req.body.superficie),
      chambres: parseInt(req.body.nombreChambres),
      salleDeBain: parseInt(req.body.nombreSallesDeBain),
      salon: req.body.nombreSalons ? parseInt(req.body.nombreSalons) > 0 : true,
      prixMensuel: parseFloat(req.body.prixMensuel),
      caution: parseFloat(req.body.depotGarantie),
      meuble: req.body.meuble === 'true' || req.body.meuble === true,
      statut: req.body.statut || 'disponible',
      agenceId: finalAgenceId ? new mongoose.Types.ObjectId(finalAgenceId) : null,
      proprietaire: new mongoose.Types.ObjectId(proprietaireId),
      reference,
      dateDisponibilite: new Date()
    };

    console.log("🏠 [CREATE_LOCATION] Données mappées:", {
      titre: locationData.titre,
      type: locationData.type,
      superficie: locationData.superficie,
      chambres: locationData.chambres,
      salleDeBain: locationData.salleDeBain,
      salon: locationData.salon,
      prixMensuel: locationData.prixMensuel,
      caution: locationData.caution,
      meuble: locationData.meuble,
      coordonnees: locationData.coordonnees
    });

    // Mapper les coordonnées GPS
    if (req.body.latitude && req.body.longitude) {
      locationData.coordonnees = {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude)
      };
    }

    // Mapper les services
    if (req.body.services) {
      const services = JSON.parse(req.body.services);
      locationData.climatisation = services.climatisation || false;
      locationData.internet = services.wifi || false;
      locationData.parking = services.parking || false;
      locationData.ascenseur = services.ascenseur || false;
      locationData.balcon = services.balcon || false;
      locationData.garage = services.gardiennage || false;
    }

    const location = new Location(locationData);
    await location.save();

    // Gérer l'upload des images si présentes
    const uploadedImages = req.cloudinary?.images || [];
    if (uploadedImages.length > 0) {
      const images = uploadedImages.map((image, index) => ({
        url: image.url,
        alt: `Image ${index + 1} - ${location.titre}`,
        ordre: index,
        cloudinaryPublicId: image.public_id,
      }));

      location.images = images;
      await location.save();

      console.log(`📸 [CREATE_LOCATION] ${uploadedImages.length} image(s) Cloudinary associée(s) à ${location.reference}`);
    }

    console.log(`✅ Location créée: ${location.reference} par ${proprietaireId}`);

    res.status(201).json({
      message: "Location créée avec succès",
      location: {
        id: location._id,
        reference: location.reference,
        titre: location.titre,
        ville: location.ville,
        prixMensuel: location.prixMensuel,
        statut: location.statut
      }
    });
  } catch (error) {
    console.error("❌ Erreur createLocation:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 📋 Récupérer toutes les locations de l'agence
 * GET /api/agence/locations
 */
exports.getAllLocations = async (req, res) => {
  try {
    const agenceId = req.user.agenceId;
    const userRole = req.user.role;
    const { 
      page = 1, 
      limit = 10, 
      statut, 
      type, 
      ville, 
      prixMin, 
      prixMax,
      chambres,
      meuble,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    console.log("🔍 [GET_ALL_LOCATIONS] User role:", userRole);
    console.log("🔍 [GET_ALL_LOCATIONS] Agence ID:", agenceId);
    console.log("🔍 [GET_ALL_LOCATIONS] Query params:", req.query);

    // Si c'est un Admin, on peut récupérer toutes les locations
    // Sinon, on filtre par agence
    const filter = {};
    if (userRole === "Admin") {
      // Admin peut voir toutes les locations
      console.log("✅ [GET_ALL_LOCATIONS] Mode admin - voir toutes les locations");
    } else {
      // TEMPORAIRE : Pour les tests, afficher toutes les locations même en tant qu'Agence
      console.log("🔧 [GET_ALL_LOCATIONS] Mode agence - AFFICHAGE DE TOUTES LES LOCATIONS (TEMPORAIRE)");
      // if (!agenceId) {
      //   return res.status(400).json({ message: "Agence non identifiée" });
      // }
      // filter.agenceId = new mongoose.Types.ObjectId(agenceId);
      // console.log("✅ [GET_ALL_LOCATIONS] Mode agence - filtrer par agence:", agenceId);
    }

    if (statut) filter.statut = statut;
    if (type) filter.type = type;
    if (ville) filter.ville = new RegExp(ville, "i");
    if (prixMin || prixMax) {
      filter.prixMensuel = {};
      if (prixMin) filter.prixMensuel.$gte = parseInt(prixMin);
      if (prixMax) filter.prixMensuel.$lte = parseInt(prixMax);
    }
    if (chambres) filter.chambres = parseInt(chambres);
    if (meuble !== undefined) filter.meuble = meuble === "true";

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const locations = await Location.find(filter)
      .populate("proprietaire", "fullName phone email")
      .populate("agenceId", "nom ville telephone")
      .populate("commercial", "nom prenom telephone")
      .populate("locataireActuel", "fullName phone")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Location.countDocuments(filter);

    console.log(`📋 ${locations.length} locations récupérées pour l'agence ${agenceId}`);
    
    // Log des images pour debugging
    locations.forEach((location, index) => {
      console.log(`🖼️ [GET_ALL_LOCATIONS] Location ${index + 1}:`, {
        id: location._id,
        titre: location.titre,
        imagesCount: location.images?.length || 0,
        firstImageUrl: location.images?.[0]?.url || "Aucune image"
      });
    });

    res.json({
      locations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("❌ Erreur getAllLocations:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 🔍 Récupérer une location par ID
 * GET /api/agence/locations/:id
 */
exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const agenceId = req.user.agenceId;
    const userRole = req.user.role;

    // Construction du filtre
    const filter = { _id: id };
    if (userRole !== "Admin" && agenceId) {
      filter.agenceId = new mongoose.Types.ObjectId(agenceId);
    }

    const location = await Location.findOne(filter)
      .populate("proprietaire", "fullName phone email")
      .populate("commercial", "nom prenom telephone")
      .populate("locataireActuel", "fullName phone")
      .populate("visites.visiteur", "fullName phone")
      .populate("demandes.demandeur", "fullName phone email");

    if (!location) {
      return res.status(404).json({ message: "Location non trouvée" });
    }

    // Incrémenter le nombre de vues
    location.nombreVues += 1;
    await location.save();

    console.log(`🔍 Location ${id} consultée`);

    res.json(location);
  } catch (error) {
    console.error("❌ Erreur getLocationById:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * ✏️ Mettre à jour une location
 * PUT /api/agence/locations/:id
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const agenceId = req.user.agenceId;
    const userRole = req.user.role;

    console.log("✏️ [UPDATE_LOCATION] User:", { agenceId, userRole });

    // Pour les Admins, permettre la modification de toute location
    // Pour les Agences, seulement leurs locations
    const filter = { _id: id };
    if (userRole !== "Admin") {
      if (!agenceId) {
        return res.status(400).json({ message: "Agence non identifiée" });
      }
      filter.agenceId = new mongoose.Types.ObjectId(agenceId);
    }

    const location = await Location.findOne(filter);
    if (!location) {
      return res.status(404).json({ message: "Location non trouvée" });
    }

    // Mapper les données du formulaire vers le modèle
    const updateData = {
      titre: req.body.titre,
      description: req.body.description,
      type: req.body.typeBien || req.body.type,
      ville: req.body.ville,
      quartier: req.body.quartier,
      adresse: req.body.adresse,
      superficie: parseFloat(req.body.superficie),
      chambres: parseInt(req.body.nombreChambres),
      salleDeBain: parseInt(req.body.nombreSallesDeBain),
      salon: req.body.nombreSalons ? parseInt(req.body.nombreSalons) > 0 : true,
      prixMensuel: parseFloat(req.body.prixMensuel),
      caution: parseFloat(req.body.depotGarantie),
      meuble: req.body.meuble === 'true' || req.body.meuble === true,
      statut: req.body.statut || 'disponible',
    };

    // Mapper les coordonnées GPS
    if (req.body.latitude && req.body.longitude) {
      updateData.coordonnees = {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude)
      };
    }

    // Mapper les services
    if (req.body.services) {
      const services = JSON.parse(req.body.services);
      updateData.climatisation = services.climatisation || false;
      updateData.internet = services.wifi || false;
      updateData.parking = services.parking || false;
      updateData.ascenseur = services.ascenseur || false;
      updateData.balcon = services.balcon || false;
      updateData.garage = services.gardiennage || false;
    }

    // Mettre à jour la location
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        location[key] = updateData[key];
      }
    });

    location.updatedAt = new Date();
    await location.save();

    // Gérer les nouvelles images si présentes
    const uploadedUpdateImages = req.cloudinary?.images || [];
    if (uploadedUpdateImages.length > 0) {
      const startingOrder = Array.isArray(location.images) ? location.images.length : 0;
      const newImages = uploadedUpdateImages.map((image, index) => ({
        url: image.url,
        alt: `Image ${startingOrder + index + 1} - ${location.titre}`,
        ordre: startingOrder + index,
        cloudinaryPublicId: image.public_id,
      }));

      location.images = [...(location.images || []), ...newImages];
      await location.save();
      console.log(`📸 [UPDATE_LOCATION] ${uploadedUpdateImages.length} nouvelle(s) image(s) Cloudinary ajoutée(s)`);
    }

    // Gérer les images existantes à conserver
    if (req.body.existingImages) {
      const existingImages = JSON.parse(req.body.existingImages);
      location.images = existingImages;
      await location.save();
      console.log(`📸 Images existantes mises à jour: ${existingImages.length}`);
    }

    console.log(`✅ Location mise à jour: ${location.reference}`);

    res.json({
      message: "Location mise à jour avec succès",
      location
    });
  } catch (error) {
    console.error("❌ Erreur updateLocation:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 🗑️ Supprimer une location
 * DELETE /api/agence/locations/:id
 */
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const agenceId = req.user.agenceId;

    if (!agenceId) {
      return res.status(400).json({ message: "Agence non identifiée" });
    }

    const location = await Location.findOne({
      _id: id,
      agenceId: new mongoose.Types.ObjectId(agenceId)
    });

    if (!location) {
      return res.status(404).json({ message: "Location non trouvée" });
    }

    // Vérifier si la location est actuellement louée
    if (location.statut === "loue") {
      return res.status(400).json({ 
        message: "Impossible de supprimer une location actuellement louée" 
      });
    }

    await Location.findByIdAndDelete(id);

    console.log(`🗑️ Location ${id} supprimée`);

    res.json({ message: "Location supprimée avec succès" });
  } catch (error) {
    console.error("❌ Erreur deleteLocation:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 📊 Statistiques des locations
 * GET /api/agence/locations/stats
 */
exports.getLocationStats = async (req, res) => {
  try {
    const agenceId = req.user.agenceId;
    const userRole = req.user.role;

    // Construction du filtre pour l'admin
    const matchFilter = {};
    if (userRole !== "Admin" && agenceId) {
      matchFilter.agenceId = new mongoose.Types.ObjectId(agenceId);
    } else if (userRole === "Admin") {
      // Admin voit toutes les stats
      console.log("✅ [GET_LOCATION_STATS] Mode admin - toutes les stats");
    }

    const stats = await Location.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalLocations: { $sum: 1 },
          locationsDisponibles: {
            $sum: { $cond: [{ $eq: ["$statut", "disponible"] }, 1, 0] }
          },
          locationsLouees: {
            $sum: { $cond: [{ $eq: ["$statut", "loue"] }, 1, 0] }
          },
          locationsIndisponibles: {
            $sum: { $cond: [{ $eq: ["$statut", "indisponible"] }, 1, 0] }
          },
          prixMoyen: { $avg: "$prixMensuel" },
          superficieMoyenne: { $avg: "$superficie" },
          totalVues: { $sum: "$nombreVues" },
          totalFavoris: { $sum: "$nombreFavoris" },
          totalDemandes: { $sum: "$nombreDemandes" }
        }
      }
    ]);

    // Statistiques par type
    const statsParType = await Location.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          prixMoyen: { $avg: "$prixMensuel" }
        }
      }
    ]);

    // Statistiques par ville
    const statsParVille = await Location.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$ville",
          count: { $sum: 1 },
          prixMoyen: { $avg: "$prixMensuel" }
        }
      }
    ]);

    const result = stats[0] || {
      totalLocations: 0,
      locationsDisponibles: 0,
      locationsLouees: 0,
      locationsIndisponibles: 0,
      prixMoyen: 0,
      superficieMoyenne: 0,
      totalVues: 0,
      totalFavoris: 0,
      totalDemandes: 0
    };

    res.json({
      ...result,
      statsParType,
      statsParVille
    });
  } catch (error) {
    console.error("❌ Erreur getLocationStats:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 📋 Récupérer toutes les locations disponibles (route publique - sans authentification)
 * GET /api/agence/locations/public
 */
exports.getAllPublicLocations = async (req, res) => {
  try {
    // Récupérer toutes les locations disponibles (statut = "disponible")
    const locations = await Location.find({ statut: "disponible" })
      .populate("agenceId", "nom ville telephone")
      .populate("proprietaire", "fullName phone")
      .sort({ createdAt: -1 })
      .limit(50); // Limiter à 50 locations pour la homepage
    
    console.log(`✅ ${locations.length} locations publiques trouvées`);

    res.json({
      message: "Locations publiques récupérées avec succès",
      locations,
      total: locations.length
    });
  } catch (error) {
    console.error("❌ Erreur getAllPublicLocations:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 🔍 Recherche de locations (pour les clients)
 * GET /api/locations/search
 */
exports.searchLocations = async (req, res) => {
  try {
    const { 
      ville, 
      type, 
      prixMin, 
      prixMax, 
      chambres, 
      meuble,
      superficieMin,
      superficieMax,
      latitude,
      longitude,
      rayon = 10, // en km
      page = 1,
      limit = 12
    } = req.query;

    // Construction du filtre
    const filter = { statut: "disponible" };

    if (ville) filter.ville = new RegExp(ville, "i");
    if (type) filter.type = type;
    if (prixMin || prixMax) {
      filter.prixMensuel = {};
      if (prixMin) filter.prixMensuel.$gte = parseInt(prixMin);
      if (prixMax) filter.prixMensuel.$lte = parseInt(prixMax);
    }
    if (chambres) filter.chambres = parseInt(chambres);
    if (meuble !== undefined) filter.meuble = meuble === "true";
    if (superficieMin || superficieMax) {
      filter.superficie = {};
      if (superficieMin) filter.superficie.$gte = parseInt(superficieMin);
      if (superficieMax) filter.superficie.$lte = parseInt(superficieMax);
    }

    // Recherche géographique si coordonnées fournies
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = parseFloat(rayon) / 6371; // Conversion en radians

      filter["coordonnees.latitude"] = {
        $gte: lat - radius,
        $lte: lat + radius
      };
      filter["coordonnees.longitude"] = {
        $gte: lng - radius,
        $lte: lng + radius
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const locations = await Location.find(filter)
      .populate("proprietaire", "fullName phone")
      .populate("agenceId", "nom telephone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Location.countDocuments(filter);

    console.log(`🔍 ${locations.length} locations trouvées pour la recherche`);

    res.json({
      locations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("❌ Erreur searchLocations:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 📅 Planifier une visite
 * POST /api/locations/:id/visite
 */
exports.planifierVisite = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateVisite, message } = req.body;
    const visiteurId = req.user.id;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ message: "Location non trouvée" });
    }

    const visite = {
      visiteur: new mongoose.Types.ObjectId(visiteurId),
      dateVisite: new Date(dateVisite),
      statut: "planifiee",
      commentaire: message
    };

    location.visites.push(visite);
    await location.save();

    console.log(`📅 Visite planifiée pour la location ${id}`);

    res.json({
      message: "Visite planifiée avec succès",
      visite
    });
  } catch (error) {
    console.error("❌ Erreur planifierVisite:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

/**
 * 📝 Faire une demande de location
 * POST /api/locations/:id/demande
 */
exports.faireDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, dureeSouhaitee, dateDebutSouhaitee } = req.body;
    const demandeurId = req.user.id;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ message: "Location non trouvée" });
    }

    if (location.statut !== "disponible") {
      return res.status(400).json({ 
        message: "Cette location n'est plus disponible" 
      });
    }

    const demande = {
      demandeur: new mongoose.Types.ObjectId(demandeurId),
      dateDemande: new Date(),
      statut: "en_attente",
      message,
      dureeSouhaitee,
      dateDebutSouhaitee: dateDebutSouhaitee ? new Date(dateDebutSouhaitee) : null
    };

    location.demandes.push(demande);
    location.nombreDemandes += 1;
    await location.save();

    console.log(`📝 Demande de location faite pour ${id}`);

    res.json({
      message: "Demande envoyée avec succès",
      demande
    });
  } catch (error) {
    console.error("❌ Erreur faireDemande:", error);
    return res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};
