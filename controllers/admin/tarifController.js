// controllers/admin/tarifController.js
const TarifPatrimoine = require("../../models/TarifPatrimoine");

/**
 * Créer ou mettre à jour un tarif
 * POST /api/admin/tarifs
 */
exports.setTarif = async (req, res) => {
  try {
    const { typeBien, montantAjout, commissionVente, description } = req.body;

    if (!typeBien || montantAjout === undefined) {
      return res.status(400).json({ message: "Type de bien et montant requis" });
    }

    // Chercher si le tarif existe déjà
    let tarif = await TarifPatrimoine.findOne({ typeBien });

    if (tarif) {
      // Mise à jour
      tarif.montantAjout = montantAjout;
      tarif.commissionVente = commissionVente || tarif.commissionVente;
      tarif.description = description || tarif.description;
      await tarif.save();
      
      return res.status(200).json({
        message: "Tarif mis à jour avec succès",
        tarif,
      });
    } else {
      // Création
      tarif = await TarifPatrimoine.create({
        typeBien,
        montantAjout,
        commissionVente: commissionVente || 5,
        description,
      });
      
      return res.status(201).json({
        message: "Tarif créé avec succès",
        tarif,
      });
    }
  } catch (error) {
    console.error("❌ Erreur setTarif:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les tarifs
 * GET /api/admin/tarifs
 */
exports.getAllTarifs = async (req, res) => {
  try {
    console.log("🔍 [GET_ALL_TARIFS] Requête par utilisateur:", req.user);
    const tarifs = await TarifPatrimoine.find().sort({ typeBien: 1 });
    console.log("✅ [GET_ALL_TARIFS] Nombre de tarifs trouvés:", tarifs.length);
    return res.status(200).json(tarifs);
  } catch (error) {
    console.error("❌ Erreur getAllTarifs:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer un tarif par type
 * GET /api/admin/tarifs/:typeBien
 */
exports.getTarifByType = async (req, res) => {
  try {
    console.log("🔍 [GET_TARIF_BY_TYPE] Type de bien demandé:", req.params.typeBien);
    console.log("🔍 [GET_TARIF_BY_TYPE] Utilisateur:", req.user);
    
    const tarif = await TarifPatrimoine.findOne({ typeBien: req.params.typeBien });
    
    console.log("🔍 [GET_TARIF_BY_TYPE] Tarif trouvé:", tarif ? "Oui" : "Non");
    
    if (!tarif) {
      console.log("⚠️ [GET_TARIF_BY_TYPE] Tarif non trouvé pour:", req.params.typeBien);
      return res.status(404).json({ message: "Tarif non trouvé pour ce type de bien" });
    }
    
    console.log("✅ [GET_TARIF_BY_TYPE] Tarif retourné:", tarif.typeBien);
    return res.status(200).json(tarif);
  } catch (error) {
    console.error("❌ Erreur getTarifByType:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Supprimer un tarif
 * DELETE /api/admin/tarifs/:typeBien
 */
exports.deleteTarif = async (req, res) => {
  try {
    const tarif = await TarifPatrimoine.findOneAndDelete({ typeBien: req.params.typeBien });
    
    if (!tarif) {
      return res.status(404).json({ message: "Tarif non trouvé" });
    }
    
    return res.status(200).json({ message: "Tarif supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur deleteTarif:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Initialiser les tarifs par défaut (à exécuter au démarrage)
 */
exports.initTarifsDefaut = async () => {
  try {
    const count = await TarifPatrimoine.countDocuments();
    
    if (count === 0) {
      const tarifsDefaut = [
        { 
          typeBien: "parcelle", 
          montantEnregistrement: 10000, // FCFA - Paiement unique
          montantAbonnementAnnuel: 5000, // FCFA - Chaque année
          commissionVente: 5, // 5% de commission
          description: "Parcelle de terrain" 
        },
        { 
          typeBien: "terrain", 
          montantEnregistrement: 15000,
          montantAbonnementAnnuel: 7000,
          commissionVente: 5,
          description: "Terrain nu" 
        },
        { 
          typeBien: "maison", 
          montantEnregistrement: 20000,
          montantAbonnementAnnuel: 10000,
          commissionVente: 5,
          description: "Maison d'habitation" 
        },
        { 
          typeBien: "villa", 
          montantEnregistrement: 30000,
          montantAbonnementAnnuel: 15000,
          commissionVente: 7,
          description: "Villa de standing" 
        },
        { 
          typeBien: "appartement", 
          montantEnregistrement: 15000,
          montantAbonnementAnnuel: 8000,
          commissionVente: 5,
          description: "Appartement" 
        },
        { 
          typeBien: "jardin", 
          montantEnregistrement: 8000,
          montantAbonnementAnnuel: 3000,
          commissionVente: 3,
          description: "Jardin" 
        },
        { 
          typeBien: "autre", 
          montantEnregistrement: 10000,
          montantAbonnementAnnuel: 5000,
          commissionVente: 5,
          description: "Autre type de bien" 
        },
      ];
      
      await TarifPatrimoine.insertMany(tarifsDefaut);
      console.log("✅ Tarifs par défaut initialisés (Niger - FCFA)");
      console.log("   - Enregistrement = paiement UNIQUE");
      console.log("   - Abonnement annuel = paiement RÉCURRENT");
      console.log("   - Commission vente = si vente via Softlink");
    }
  } catch (error) {
    console.error("❌ Erreur initTarifsDefaut:", error);
  }
};

