// controllers/admin/verificationController.js
const PatrimoineFoncier = require("../../models/PatrimoineFoncier");

/**
 * Récupérer tous les biens en attente de vérification
 * GET /api/admin/patrimoine/verifications
 */
exports.getBiensAVerifier = async (req, res) => {
  try {
    const { statutVerification } = req.query;
    
    const filter = {};
    if (statutVerification) {
      filter.statutVerification = statutVerification;
    } else {
      filter.statutVerification = { $in: ["non_verifie", "en_cours"] };
    }
    
    const biens = await PatrimoineFoncier.find(filter)
      .populate("clientId", "fullName phone email")
      .populate("verifiePar", "fullName")
      .sort({ createdAt: -1 });
    
    console.log("🔍 [GET_BIENS_VERIFIER] Nombre de biens trouvés:", biens.length);
    if (biens.length > 0 && biens[0].clientId) {
      console.log("🔍 [GET_BIENS_VERIFIER] Exemple de clientId:", biens[0].clientId);
    } else if (biens.length > 0) {
      console.log("⚠️ [GET_BIENS_VERIFIER] clientId n'est pas populé pour le premier bien");
    }
    
    return res.status(200).json(biens);
  } catch (error) {
    console.error("❌ Erreur getBiensAVerifier:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Marquer un bien comme en cours de vérification
 * PUT /api/admin/patrimoine/:id/verification/en-cours
 */
exports.marquerEnCours = async (req, res) => {
  try {
    const bienId = req.params.id;
    const adminId = req.user.id;
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    bien.statutVerification = "en_cours";
    bien.verifiePar = adminId;
    await bien.save();
    
    return res.status(200).json({
      message: "Vérification en cours",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur marquerEnCours:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Valider/Vérifier un bien
 * PUT /api/admin/patrimoine/:id/verification/valider
 */
exports.validerBien = async (req, res) => {
  try {
    const bienId = req.params.id;
    const adminId = req.user.id;
    const { notesVerification, documentsVerification } = req.body;
    
    console.log("✅ [VALIDER_BIEN] Validation du bien:", bienId);
    console.log("✅ [VALIDER_BIEN] Documents fournis:", documentsVerification?.length || 0);
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    bien.statutVerification = "verifie";
    bien.verifiePar = adminId;
    bien.dateVerification = new Date();
    bien.notesVerification = notesVerification;
    
    // Ajouter les documents de vérification s'ils sont fournis
    if (documentsVerification && documentsVerification.length > 0) {
      bien.documentsVerification = documentsVerification;
      console.log("✅ [VALIDER_BIEN] Documents de vérification ajoutés:", documentsVerification.length);
      documentsVerification.forEach((doc, index) => {
        console.log(`   Document ${index + 1}: ${doc.description || "Sans description"}`);
      });
    }
    
    await bien.save();
    
    return res.status(200).json({
      message: "✅ Bien vérifié avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur validerBien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Rejeter la vérification d'un bien
 * PUT /api/admin/patrimoine/:id/verification/rejeter
 */
exports.rejeterBien = async (req, res) => {
  try {
    const bienId = req.params.id;
    const adminId = req.user.id;
    const { motifRejetVerification } = req.body;
    
    if (!motifRejetVerification) {
      return res.status(400).json({ message: "Motif de rejet requis" });
    }
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    bien.statutVerification = "rejete";
    bien.verifiePar = adminId;
    bien.dateVerification = new Date();
    bien.motifRejetVerification = motifRejetVerification;
    await bien.save();
    
    return res.status(200).json({
      message: "Vérification rejetée",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur rejeterBien:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Statistiques de vérification
 * GET /api/admin/patrimoine/verifications/stats
 */
exports.getStatsVerification = async (req, res) => {
  try {
    const stats = {
      nonVerifies: await PatrimoineFoncier.countDocuments({ statutVerification: "non_verifie" }),
      enCours: await PatrimoineFoncier.countDocuments({ statutVerification: "en_cours" }),
      verifies: await PatrimoineFoncier.countDocuments({ statutVerification: "verifie" }),
      rejetes: await PatrimoineFoncier.countDocuments({ statutVerification: "rejete" }),
    };
    
    stats.total = stats.nonVerifies + stats.enCours + stats.verifies + stats.rejetes;
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error("❌ Erreur getStatsVerification:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Valider le paiement d'enregistrement en espèces
 * PUT /api/admin/patrimoine/:id/paiement-enregistrement-valider
 */
exports.validerPaiementEnregistrement = async (req, res) => {
  try {
    const bienId = req.params.id;
    const adminId = req.user._id || req.user.id;
    
    console.log("💰 [VALIDER_PAIEMENT] ID bien:", bienId);
    console.log("💰 [VALIDER_PAIEMENT] Admin ID:", adminId);
    
    const bien = await PatrimoineFoncier.findById(bienId);
    if (!bien) {
      return res.status(404).json({ message: "Bien non trouvé" });
    }
    
    console.log("💰 [VALIDER_PAIEMENT] Statut actuel:", bien.enregistrementStatut);
    
    // Mettre à jour le statut d'enregistrement
    bien.enregistrementStatut = "paye";
    bien.datePaiementEnregistrement = new Date();
    bien.modePaiementEnregistrement = "espece"; // Mode de paiement: espèces
    bien.validatePar = adminId; // Admin qui a validé
    bien.visible = true; // Rendre le bien visible
    await bien.save();
    
    console.log("✅ [VALIDER_PAIEMENT] Paiement validé pour le bien:", bien.titre);
    
    return res.status(200).json({
      message: "✅ Paiement d'enregistrement validé avec succès",
      bien,
    });
  } catch (error) {
    console.error("❌ Erreur validerPaiementEnregistrement:", error);
    return res.status(500).json({ message: error.message });
  }
};

