// controllers/agences/clientController.js
const User = require("../../models/User");
const UserProfile = require("../../models/UserProfile");

/**
 * Récupérer tous les clients (role = "User" ou "Client")
 * GET /api/agence/clients
 */
exports.getAllClients = async (req, res) => {
  try {
    console.log("📝 [GET_CLIENTS] Début récupération clients");
    console.log("📝 [GET_CLIENTS] User connecté:", { id: req.user.id, role: req.user.role });

    // 🔒 Pour un système multi-agence, on filtre les clients qui ont acheté des parcelles de cette agence
    let clientIds = [];
    
    if (req.user.role === "Agence") {
      console.log("📝 [GET_CLIENTS] Mode Agence - Filtrage par parcelles vendues");
      
      if (!req.user.agenceId) {
        console.log("❌ [GET_CLIENTS] Pas d'agenceId trouvé");
        return res.status(200).json([]);
      }
      
      const Parcelle = require("../../models/agences/Parcelle");
      
      // Trouver tous les clients qui ont acheté des parcelles de cette agence
      const parcelles = await Parcelle.find({ 
        agenceId: req.user.agenceId, 
        vendueA: { $exists: true, $ne: null } 
      }).select("vendueA");
      
      clientIds = [...new Set(parcelles.map(p => p.vendueA?.toString()).filter(Boolean))];
      console.log("📝 [GET_CLIENTS] ClientIds trouvés:", clientIds.length);
    }

    const filter = req.user.role === "Agence" || req.user.role?.name === "Agence"
      ? { _id: { $in: clientIds }, role: { $in: ["User", "Client"] } }
      : { role: { $in: ["User", "Client"] } };

    const clients = await User.find(filter)
      .select("_id phone fullName email isActive createdAt")
      .sort({ createdAt: -1 });

    console.log("📝 [GET_CLIENTS] Clients (Users) trouvés:", clients.length);

    // Enrichir avec les profils
    const clientsWithProfile = await Promise.all(
      clients.map(async (client) => {
        const profile = await UserProfile.findOne({ userId: client._id })
          .select("fullName email");
        
        return {
          _id: client._id,
          phone: client.phone,
          fullName: profile?.fullName || client.fullName || "Sans nom",
          email: profile?.email || client.email || "",
          isActive: client.isActive,
          createdAt: client.createdAt,
        };
      })
    );

    console.log("✅ [GET_CLIENTS] Clients finaux:", clientsWithProfile.length);

    res.status(200).json(clientsWithProfile);
  } catch (error) {
    console.error("❌ [GET_CLIENTS] Erreur récupération clients:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Activer/Désactiver un client
 * PATCH /api/agence/clients/:id/toggle-active
 */
exports.toggleClientActive = async (req, res) => {
  try {
    const client = await User.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Inverser le statut
    client.isActive = !client.isActive;
    await client.save();

    res.status(200).json({
      message: `Client ${client.isActive ? "activé" : "désactivé"} avec succès`,
      isActive: client.isActive,
    });
  } catch (error) {
    console.error("❌ Erreur toggle active:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Modifier un client
 * PUT /api/agence/clients/:id
 */
exports.updateClient = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const clientId = req.params.id;

    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Vérifier si le nouveau téléphone n'est pas déjà utilisé
    if (phone && phone !== client.phone) {
      const existingPhone = await User.findOne({ phone, _id: { $ne: clientId } });
      if (existingPhone) {
        return res.status(400).json({ message: "Ce numéro est déjà utilisé" });
      }
      client.phone = phone;
    }

    // Vérifier si le nouvel email n'est pas déjà utilisé
    if (email && email.trim() !== "" && email !== client.email) {
      const existingEmail = await User.findOne({ email: email.trim(), _id: { $ne: clientId } });
      if (existingEmail) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      client.email = email.trim();
    }

    // Mettre à jour fullName dans User
    if (fullName) {
      client.fullName = fullName;
    }

    await client.save();

    // Mettre à jour aussi le profil
    if (fullName || email) {
      await UserProfile.findOneAndUpdate(
        { userId: clientId },
        {
          $set: {
            ...(fullName && { fullName }),
            ...(email && { email: email.trim() }),
          },
        },
        { upsert: true }
      );
    }

    res.status(200).json({
      message: "Client modifié avec succès",
      client,
    });
  } catch (error) {
    console.error("❌ Erreur update client:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Supprimer un client
 * DELETE /api/agence/clients/:id
 */
exports.deleteClient = async (req, res) => {
  try {
    const client = await User.findByIdAndDelete(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Supprimer aussi le profil associé
    await UserProfile.deleteOne({ userId: req.params.id });

    res.status(200).json({ message: "Client supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur suppression client:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

