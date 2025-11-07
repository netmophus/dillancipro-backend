// controllers/admin/geographicController.js
const Ville = require("../../models/agences/Ville");
const Quartier = require("../../models/agences/Quartier");
const Zone = require("../../models/agences/Zone");

// ==================== VILLES ====================

// POST /api/admin/geographic/villes
exports.createVille = async (req, res) => {
  try {
    console.log("🏛️ [ADMIN_CREATE_VILLE] Début création ville");
    console.log("🏛️ [ADMIN_CREATE_VILLE] Body:", req.body);

    const { nom, region, codePostal, description } = req.body;

    // anti-doublon global
    const existing = await Ville.findOne({ nom });
    if (existing) {
      return res.status(400).json({ message: "Cette ville existe déjà." });
    }

    const newVille = await Ville.create({ 
      nom, 
      region, 
      codePostal, 
      description
    });
    
    console.log("✅ [ADMIN_CREATE_VILLE] Ville créée:", { _id: newVille._id, nom: newVille.nom });
    return res.status(201).json({ message: "Ville créée avec succès", ville: newVille });
  } catch (error) {
    console.error("❌ [ADMIN_CREATE_VILLE] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/geographic/villes
exports.getAllVilles = async (req, res) => {
  try {
    console.log("🏛️ [ADMIN_GET_VILLES] Récupération de toutes les villes");
    
    const villes = await Ville.find().sort({ nom: 1 });
    console.log(`✅ [ADMIN_GET_VILLES] ${villes.length} villes trouvées`);
    return res.status(200).json(villes);
  } catch (error) {
    console.error("❌ [ADMIN_GET_VILLES] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/geographic/villes/:id
exports.updateVille = async (req, res) => {
  try {
    const villeId = req.params.id;
    console.log("🏛️ [ADMIN_UPDATE_VILLE] Mise à jour ville:", villeId);

    const updatedVille = await Ville.findByIdAndUpdate(villeId, req.body, { new: true });
    
    if (!updatedVille) {
      return res.status(404).json({ message: "Ville non trouvée" });
    }
    
    console.log("✅ [ADMIN_UPDATE_VILLE] Ville mise à jour:", updatedVille.nom);
    res.status(200).json({ message: "Ville mise à jour", ville: updatedVille });
  } catch (error) {
    console.error("❌ [ADMIN_UPDATE_VILLE] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/geographic/villes/:id
exports.deleteVille = async (req, res) => {
  try {
    const villeId = req.params.id;
    console.log("🏛️ [ADMIN_DELETE_VILLE] Suppression ville:", villeId);

    const deleted = await Ville.findByIdAndDelete(villeId);
    
    if (!deleted) {
      return res.status(404).json({ message: "Ville non trouvée" });
    }
    
    console.log("✅ [ADMIN_DELETE_VILLE] Ville supprimée:", deleted.nom);
    res.status(200).json({ message: "Ville supprimée avec succès" });
  } catch (error) {
    console.error("❌ [ADMIN_DELETE_VILLE] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== QUARTIERS ====================

// POST /api/admin/geographic/quartiers
exports.createQuartier = async (req, res) => {
  try {
    console.log("🏛️ [ADMIN_CREATE_QUARTIER] Début création quartier");
    console.log("🏛️ [ADMIN_CREATE_QUARTIER] Body:", req.body);

    const { nom, ville, description } = req.body;

    // Vérifier que la ville existe
    const villeExists = await Ville.findById(ville);
    if (!villeExists) {
      return res.status(400).json({ message: "Ville non trouvée." });
    }

    // anti-doublon dans la même ville
    const existing = await Quartier.findOne({ nom, ville });
    if (existing) {
      return res.status(400).json({ message: "Ce quartier existe déjà dans cette ville." });
    }

    const newQuartier = await Quartier.create({ 
      nom, 
      ville,
      description
    });
    
    console.log("✅ [ADMIN_CREATE_QUARTIER] Quartier créé:", { _id: newQuartier._id, nom: newQuartier.nom });
    return res.status(201).json({ message: "Quartier créé avec succès", quartier: newQuartier });
  } catch (error) {
    console.error("❌ [ADMIN_CREATE_QUARTIER] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/geographic/quartiers
exports.getAllQuartiers = async (req, res) => {
  try {
    console.log("🏛️ [ADMIN_GET_QUARTIERS] Récupération de tous les quartiers");
    
    const quartiers = await Quartier.find()
      .populate('ville', 'nom region')
      .sort({ nom: 1 });
    console.log(`✅ [ADMIN_GET_QUARTIERS] ${quartiers.length} quartiers trouvés`);
    return res.status(200).json(quartiers);
  } catch (error) {
    console.error("❌ [ADMIN_GET_QUARTIERS] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/geographic/quartiers/:id
exports.updateQuartier = async (req, res) => {
  try {
    const quartierId = req.params.id;
    console.log("🏛️ [ADMIN_UPDATE_QUARTIER] Mise à jour quartier:", quartierId);

    const updatedQuartier = await Quartier.findByIdAndUpdate(quartierId, req.body, { new: true })
      .populate('ville', 'nom region');
    
    if (!updatedQuartier) {
      return res.status(404).json({ message: "Quartier non trouvé" });
    }
    
    console.log("✅ [ADMIN_UPDATE_QUARTIER] Quartier mis à jour:", updatedQuartier.nom);
    res.status(200).json({ message: "Quartier mis à jour", quartier: updatedQuartier });
  } catch (error) {
    console.error("❌ [ADMIN_UPDATE_QUARTIER] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/geographic/quartiers/:id
exports.deleteQuartier = async (req, res) => {
  try {
    const quartierId = req.params.id;
    console.log("🏛️ [ADMIN_DELETE_QUARTIER] Suppression quartier:", quartierId);

    const deleted = await Quartier.findByIdAndDelete(quartierId);
    
    if (!deleted) {
      return res.status(404).json({ message: "Quartier non trouvé" });
    }
    
    console.log("✅ [ADMIN_DELETE_QUARTIER] Quartier supprimé:", deleted.nom);
    res.status(200).json({ message: "Quartier supprimé avec succès" });
  } catch (error) {
    console.error("❌ [ADMIN_DELETE_QUARTIER] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== ZONES ====================

// POST /api/admin/geographic/zones
exports.createZone = async (req, res) => {
  try {
    console.log("🏛️ [ADMIN_CREATE_ZONE] Début création zone");
    console.log("🏛️ [ADMIN_CREATE_ZONE] Body:", req.body);

    const { nom, quartier, description } = req.body;

    // Vérifier que le quartier existe
    const quartierExists = await Quartier.findById(quartier);
    if (!quartierExists) {
      return res.status(400).json({ message: "Quartier non trouvé." });
    }

    // anti-doublon dans le même quartier
    const existing = await Zone.findOne({ nom, quartier });
    if (existing) {
      return res.status(400).json({ message: "Cette zone existe déjà dans ce quartier." });
    }

    const newZone = await Zone.create({ 
      nom, 
      quartier,
      description
    });
    
    console.log("✅ [ADMIN_CREATE_ZONE] Zone créée:", { _id: newZone._id, nom: newZone.nom });
    return res.status(201).json({ message: "Zone créée avec succès", zone: newZone });
  } catch (error) {
    console.error("❌ [ADMIN_CREATE_ZONE] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/geographic/zones
exports.getAllZones = async (req, res) => {
  try {
    console.log("🏛️ [ADMIN_GET_ZONES] Récupération de toutes les zones");
    
    const zones = await Zone.find()
      .populate('quartier', 'nom')
      .populate({
        path: 'quartier',
        populate: { path: 'ville', select: 'nom region' }
      })
      .sort({ nom: 1 });
    console.log(`✅ [ADMIN_GET_ZONES] ${zones.length} zones trouvées`);
    return res.status(200).json(zones);
  } catch (error) {
    console.error("❌ [ADMIN_GET_ZONES] Erreur:", error);
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/geographic/zones/:id
exports.updateZone = async (req, res) => {
  try {
    const zoneId = req.params.id;
    console.log("🏛️ [ADMIN_UPDATE_ZONE] Mise à jour zone:", zoneId);

    const updatedZone = await Zone.findByIdAndUpdate(zoneId, req.body, { new: true })
      .populate('quartier', 'nom')
      .populate({
        path: 'quartier',
        populate: { path: 'ville', select: 'nom region' }
      });
    
    if (!updatedZone) {
      return res.status(404).json({ message: "Zone non trouvée" });
    }
    
    console.log("✅ [ADMIN_UPDATE_ZONE] Zone mise à jour:", updatedZone.nom);
    res.status(200).json({ message: "Zone mise à jour", zone: updatedZone });
  } catch (error) {
    console.error("❌ [ADMIN_UPDATE_ZONE] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/geographic/zones/:id
exports.deleteZone = async (req, res) => {
  try {
    const zoneId = req.params.id;
    console.log("🏛️ [ADMIN_DELETE_ZONE] Suppression zone:", zoneId);

    const deleted = await Zone.findByIdAndDelete(zoneId);
    
    if (!deleted) {
      return res.status(404).json({ message: "Zone non trouvée" });
    }
    
    console.log("✅ [ADMIN_DELETE_ZONE] Zone supprimée:", deleted.nom);
    res.status(200).json({ message: "Zone supprimée avec succès" });
  } catch (error) {
    console.error("❌ [ADMIN_DELETE_ZONE] Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};
