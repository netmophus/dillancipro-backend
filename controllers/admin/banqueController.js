const Banque = require('../../models/Banque');

// Récupérer toutes les banques
exports.getAllBanques = async (req, res) => {
  try {
    const banques = await Banque.find().sort({ ordre: 1, createdAt: -1 });
    res.json({ success: true, banques });
  } catch (error) {
    console.error('Erreur lors de la récupération des banques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer les banques actives (pour la page publique)
exports.getBanquesActives = async (req, res) => {
  try {
    const banques = await Banque.find({ actif: true }).sort({ ordre: 1, createdAt: -1 });
    res.json({ success: true, banques });
  } catch (error) {
    console.error('Erreur lors de la récupération des banques actives:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer une banque par ID
exports.getBanqueById = async (req, res) => {
  try {
    const banque = await Banque.findById(req.params.id);
    if (!banque) {
      return res.status(404).json({ success: false, message: 'Banque non trouvée' });
    }
    res.json({ success: true, banque });
  } catch (error) {
    console.error('Erreur lors de la récupération de la banque:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Créer une nouvelle banque
exports.createBanque = async (req, res) => {
  try {
    const { nom, services, description, produits, avantages, contact, adresse, localisation, logo, ordre, actif } = req.body;

    // Vérifier si la banque existe déjà
    const banqueExistante = await Banque.findOne({ nom });
    if (banqueExistante) {
      return res.status(400).json({ success: false, message: 'Une banque avec ce nom existe déjà' });
    }

    const banque = new Banque({
      nom,
      services,
      description,
      produits: produits || [],
      avantages: avantages || [],
      contact: contact || {},
      adresse: adresse || "",
      localisation: localisation || {},
      logo,
      ordre: ordre || 0,
      actif: actif !== undefined ? actif : true,
    });

    await banque.save();
    res.status(201).json({ success: true, message: 'Banque créée avec succès', banque });
  } catch (error) {
    console.error('Erreur lors de la création de la banque:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Mettre à jour une banque
exports.updateBanque = async (req, res) => {
  try {
    const { nom, services, description, produits, avantages, contact, adresse, localisation, logo, ordre, actif } = req.body;

    // Vérifier si une autre banque avec le même nom existe
    if (nom) {
      const banqueExistante = await Banque.findOne({ nom, _id: { $ne: req.params.id } });
      if (banqueExistante) {
        return res.status(400).json({ success: false, message: 'Une banque avec ce nom existe déjà' });
      }
    }

    const banque = await Banque.findByIdAndUpdate(
      req.params.id,
      {
        ...(nom && { nom }),
        ...(services && { services }),
        ...(description && { description }),
        ...(produits !== undefined && { produits }),
        ...(avantages !== undefined && { avantages }),
        ...(contact && { contact }),
        ...(adresse !== undefined && { adresse }),
        ...(localisation !== undefined && { localisation }),
        ...(logo !== undefined && { logo }),
        ...(ordre !== undefined && { ordre }),
        ...(actif !== undefined && { actif }),
      },
      { new: true, runValidators: true }
    );

    if (!banque) {
      return res.status(404).json({ success: false, message: 'Banque non trouvée' });
    }

    res.json({ success: true, message: 'Banque mise à jour avec succès', banque });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la banque:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Supprimer une banque
exports.deleteBanque = async (req, res) => {
  try {
    const banque = await Banque.findByIdAndDelete(req.params.id);
    if (!banque) {
      return res.status(404).json({ success: false, message: 'Banque non trouvée' });
    }
    res.json({ success: true, message: 'Banque supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la banque:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

