// controllers/admin/notaireController.js
const Notaire = require("../../models/Notaire");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

/**
 * Créer un notaire partenaire (avec compte automatique)
 * POST /api/admin/notaires
 */
exports.createNotaire = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      cabinetName,
      adresse,
      ville,
      quartier,
      notes,
      password, // Mot de passe personnalisé (optionnel)
    } = req.body;

    // Vérifier que l'email n'existe pas déjà
    const existingNotaire = await Notaire.findOne({ email });
    if (existingNotaire) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Vérifier que le téléphone n'existe pas déjà
    const existingPhone = await Notaire.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: "Ce téléphone est déjà utilisé" });
    }

    // Vérifier si un utilisateur avec cet email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
    }

    // Utiliser le mot de passe personnalisé ou un mot de passe par défaut
    const finalPassword = password && password.trim() !== "" 
      ? password.trim() 
      : "Notaire123!"; // Mot de passe par défaut
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Créer l'utilisateur avec le rôle Notaire
    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: "Notaire",
      isActive: true,
    });

    // Créer le notaire
    const notaire = await Notaire.create({
      fullName,
      email,
      phone,
      cabinetName,
      adresse,
      ville: ville || "Niamey",
      quartier,
      notes,
      userId: user._id,
      creePar: req.user._id,
      statut: "actif",
    });

    // Peupler l'utilisateur dans la réponse
    await notaire.populate("userId", "fullName email phone");

    return res.status(201).json({
      message: "Notaire créé avec succès",
      notaire,
      credentials: {
        email,
        password: finalPassword, // Mot de passe utilisé (personnalisé ou par défaut)
        message: password 
          ? "Ces identifiants doivent être communiqués au notaire."
          : "Ces identifiants doivent être communiqués au notaire. Il est recommandé de changer le mot de passe par défaut à la première connexion.",
      },
    });
  } catch (error) {
    console.error("❌ Erreur création notaire:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les notaires
 * GET /api/admin/notaires
 */
exports.getAllNotaires = async (req, res) => {
  try {
    const { statut } = req.query;
    
    const query = {};
    if (statut) {
      query.statut = statut;
    }

    const notaires = await Notaire.find(query)
      .populate("userId", "fullName email phone isActive")
      .populate("creePar", "fullName")
      .sort({ createdAt: -1 });

    return res.status(200).json(notaires);
  } catch (error) {
    console.error("❌ Erreur récupération notaires:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer un notaire par ID
 * GET /api/admin/notaires/:id
 */
exports.getNotaireById = async (req, res) => {
  try {
    const notaire = await Notaire.findById(req.params.id)
      .populate("userId", "fullName email phone isActive")
      .populate("creePar", "fullName");

    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    return res.status(200).json(notaire);
  } catch (error) {
    console.error("❌ Erreur récupération notaire:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Mettre à jour un notaire
 * PUT /api/admin/notaires/:id
 */
exports.updateNotaire = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      cabinetName,
      adresse,
      ville,
      quartier,
      statut,
      notes,
    } = req.body;

    const notaire = await Notaire.findById(req.params.id);
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    // Vérifier l'unicité de l'email si modifié
    if (email && email !== notaire.email) {
      const existing = await Notaire.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
    }

    // Vérifier l'unicité du téléphone si modifié
    if (phone && phone !== notaire.phone) {
      const existing = await Notaire.findOne({ phone, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ message: "Ce téléphone est déjà utilisé" });
      }
    }

    // Mettre à jour le notaire
    if (fullName) notaire.fullName = fullName;
    if (email) notaire.email = email;
    if (phone) notaire.phone = phone;
    if (cabinetName) notaire.cabinetName = cabinetName;
    if (adresse !== undefined) notaire.adresse = adresse;
    if (ville) notaire.ville = ville;
    if (quartier !== undefined) notaire.quartier = quartier;
    if (statut) notaire.statut = statut;
    if (notes !== undefined) notaire.notes = notes;

    await notaire.save();

    // Mettre à jour l'utilisateur associé
    if (notaire.userId) {
      const user = await User.findById(notaire.userId);
      if (user) {
        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (statut === "inactif") user.isActive = false;
        if (statut === "actif") user.isActive = true;
        await user.save();
      }
    }

    await notaire.populate("userId", "fullName email phone isActive");

    return res.status(200).json({
      message: "Notaire mis à jour avec succès",
      notaire,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour notaire:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Supprimer un notaire
 * DELETE /api/admin/notaires/:id
 */
exports.deleteNotaire = async (req, res) => {
  try {
    const notaire = await Notaire.findById(req.params.id);
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }

    // Supprimer l'utilisateur associé
    if (notaire.userId) {
      await User.findByIdAndDelete(notaire.userId);
    }

    // Supprimer le notaire
    await Notaire.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Notaire supprimé avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur suppression notaire:", error);
    return res.status(500).json({ message: error.message });
  }
};

