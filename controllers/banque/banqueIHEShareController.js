// controllers/banque/banqueIHEShareController.js
const IHE = require("../../models/banque/IHE");
const IHEMedia = require("../../models/banque/IHEMedia");
const Agence = require("../../models/Agence");
const BienImmobilier = require("../../models/agences/BienImmobilier");
const mongoose = require("mongoose");

/**
 * 🤝 Proposer une IHE à une agence partenaire pour la vente
 * POST /api/banque/ihe/:iheId/partager/:agenceId
 */
exports.partagerIHEAvecAgence = async (req, res) => {
  try {
    const { iheId, agenceId } = req.params;

    // Vérifier que l'utilisateur est Admin banque ou Admin général
    if (req.user.role !== "Banque" && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Seuls les admins banque peuvent partager des IHE",
      });
    }

    // Vérifier que l'IHE existe et appartient à la banque
    const ihe = await IHE.findById(iheId);

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Vérifier l'isolation si c'est une banque (pas admin)
    if (req.user.role === "Banque" && ihe.banqueId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Vous ne pouvez partager que les IHE de votre banque",
      });
    }

    // Vérifier que l'IHE est validée
    if (ihe.statut !== "valide") {
      return res.status(400).json({
        message: "Seules les IHE validées peuvent être partagées",
      });
    }

    // Vérifier que l'agence existe
    const agence = await Agence.findById(agenceId);
    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    // Vérifier si déjà partagée avec cette agence
    const dejaPartagee = ihe.partageAvecAgences.some(
      (p) => p.agenceId.toString() === agenceId
    );

    if (dejaPartagee) {
      return res.status(400).json({
        message: "Cette IHE est déjà partagée avec cette agence",
      });
    }

    // Ajouter le partage
    ihe.partageAvecAgences.push({
      agenceId,
      partagePar: req.user._id,
      partageLe: new Date(),
      statut: "propose",
    });

    await ihe.save();

    // Créer un BienImmobilier à partir de l'IHE pour l'agence
    try {
      // Récupérer les médias de l'IHE
      const medias = await IHEMedia.find({ iheId: ihe._id }).sort({ ordre: 1 });
      
      // Séparer les médias par type
      const images = medias.filter(m => m.type === "photo").map(m => m.url);
      const videos = medias.filter(m => m.type === "video").map(m => m.url);
      const documents = medias.filter(m => m.type === "document").map(m => m.url);

      // Mapper le type IHE vers le type BienImmobilier
      const typeMapping = {
        "terrain": "terrain",
        "jardin": "jardin",
        "maison": "maison",
        "appartement": "appartement",
        "villa": "villa",
        "bureau": "autre",
        "entrepot": "autre",
        "autre": "autre"
      };

      // Créer le bien immobilier
      const bienImmobilier = new BienImmobilier({
        type: typeMapping[ihe.type] || "autre",
        titre: ihe.titre,
        description: ihe.description || "",
        prix: ihe.valeurCession || ihe.valeurNetteComptable || ihe.valeurComptable || 0,
        superficie: ihe.superficie,
        statut: "disponible",
        localisation: {
          adresse: ihe.localisation?.adresse || "",
          ville: ihe.localisation?.ville || ihe.ville || "",
          quartier: ihe.localisation?.quartier || ihe.quartier || "",
          latitude: ihe.localisation?.latitude || ihe.coordonnees?.lat,
          longitude: ihe.localisation?.longitude || ihe.coordonnees?.lng,
        },
        images: images,
        videos: videos,
        documents: documents,
        caracteristiques: {
          // Caractéristiques communes
          anneeConstruction: ihe.caracteristiques?.anneeConstruction,
          etatGeneral: ihe.caracteristiques?.etatGeneral || "",
          acces: ihe.caracteristiques?.acces || "",
          electricite: ihe.caracteristiques?.electricite || false,
          eau: ihe.caracteristiques?.eau || false,
          securite: ihe.caracteristiques?.securite || false,
          // Caractéristiques pour maison/villa/appartement
          nbChambres: ihe.caracteristiques?.nbChambres,
          nbSallesBain: ihe.caracteristiques?.nbSallesBain,
          nbSalons: ihe.caracteristiques?.nbSalons,
          garage: ihe.caracteristiques?.garage || false,
          piscine: ihe.caracteristiques?.piscine || false,
          jardin: ihe.caracteristiques?.jardin || false,
          climatisation: ihe.caracteristiques?.climatisation || false,
          cuisine: ihe.caracteristiques?.cuisine || "",
          // Caractéristiques pour jardin
          irrigation: ihe.caracteristiques?.irrigation || false,
          cloture: ihe.caracteristiques?.cloture || false,
          arbore: ihe.caracteristiques?.arbore || false,
          potager: ihe.caracteristiques?.potager || false,
          typesArbres: ihe.caracteristiques?.typesArbres || [],
          elementsJardin: ihe.caracteristiques?.elementsJardin || "",
          // Caractéristiques pour appartement
          etage: ihe.caracteristiques?.etage,
          ascenseur: ihe.caracteristiques?.ascenseur || false,
          balcon: ihe.caracteristiques?.balcon || false,
        },
        agenceId: agenceId,
        iheId: ihe._id, // Référence à l'IHE source
        verified: true, // Les IHE validées sont automatiquement vérifiées
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
      });

      await bienImmobilier.save();
      console.log(`✅ Bien immobilier créé pour l'agence ${agenceId} à partir de l'IHE ${ihe._id}`);
    } catch (bienError) {
      console.error("⚠️ Erreur lors de la création du bien immobilier:", bienError);
      // Ne pas bloquer le partage si la création du bien échoue
    }

    res.status(200).json({
      message: "✅ IHE proposée à l'agence avec succès",
      ihe,
    });
  } catch (error) {
    console.error("❌ Erreur partagerIHEAvecAgence:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 📋 Lister les IHE partagées avec une agence
 * GET /api/banque/ihe/partagees
 */
exports.getIHEsPartagees = async (req, res) => {
  try {
    const { agenceId, statut } = req.query;

    // Vérifier que l'utilisateur est une banque
    if (req.user.role !== "Banque") {
      return res.status(403).json({ message: "Accès réservé aux banques" });
    }

    const filter = {
      banqueId: new mongoose.Types.ObjectId(req.user._id),
      "partageAvecAgences.0": { $exists: true }, // Au moins un partage
    };

    if (agenceId) {
      filter["partageAvecAgences.agenceId"] = new mongoose.Types.ObjectId(agenceId);
    }

    if (statut) {
      filter["partageAvecAgences.statut"] = statut;
    }

    const ihes = await IHE.find(filter)
      .populate("partageAvecAgences.agenceId", "nom telephone")
      .populate("partageAvecAgences.partagePar", "fullName phone")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      count: ihes.length,
      ihes,
    });
  } catch (error) {
    console.error("❌ Erreur getIHEsPartagees:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * ❌ Retirer le partage d'une IHE avec une agence
 * DELETE /api/banque/ihe/:iheId/partage/:agenceId
 */
exports.retirerPartage = async (req, res) => {
  try {
    const { iheId, agenceId } = req.params;

    // Vérifier que l'utilisateur est Admin banque ou Admin général
    if (req.user.role !== "Banque" && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Seuls les admins banque peuvent retirer le partage",
      });
    }

    // Vérifier que l'IHE existe et appartient à la banque
    const ihe = await IHE.findById(iheId);

    if (!ihe) {
      return res.status(404).json({ message: "IHE non trouvée" });
    }

    // Vérifier l'isolation si c'est une banque (pas admin)
    if (req.user.role === "Banque" && ihe.banqueId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Vous ne pouvez retirer le partage que des IHE de votre banque",
      });
    }

    // Retirer le partage
    ihe.partageAvecAgences = ihe.partageAvecAgences.filter(
      (p) => p.agenceId.toString() !== agenceId
    );

    await ihe.save();

    // Supprimer le bien immobilier associé si il existe et n'est pas encore vendu
    try {
      const bienAssocie = await BienImmobilier.findOne({
        iheId: ihe._id,
        agenceId: agenceId,
        statut: { $in: ["disponible", "en_cours_de_vente", "reserve"] }
      });

      if (bienAssocie) {
        await BienImmobilier.findByIdAndDelete(bienAssocie._id);
        console.log(`✅ Bien immobilier ${bienAssocie._id} supprimé après retrait du partage`);
      }
    } catch (bienError) {
      console.error("⚠️ Erreur lors de la suppression du bien immobilier:", bienError);
      // Ne pas bloquer le retrait du partage si la suppression du bien échoue
    }

    res.status(200).json({
      message: "✅ Partage retiré avec succès",
      ihe,
    });
  } catch (error) {
    console.error("❌ Erreur retirerPartage:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

/**
 * 📋 Récupérer la liste des agences actives pour le partage
 * GET /api/banque/ihe/agences
 */
exports.getAgencesActives = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est une banque ou un admin
    if (req.user.role !== "Banque" && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Accès réservé aux banques et aux admins",
      });
    }

    // Récupérer les agences actives ou en attente (exclure suspendu et supprimé)
    const agences = await Agence.find({ 
      statut: { $in: ["actif", "en_attente"] } 
    })
      .select("nom telephone email adresse ville statut")
      .sort({ nom: 1 });

    res.status(200).json({
      message: "✅ Agences récupérées avec succès",
      agences,
    });
  } catch (error) {
    console.error("❌ Erreur getAgencesActives:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

