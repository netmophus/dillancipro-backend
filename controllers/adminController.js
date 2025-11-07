const User = require("../models/User");
const Agence = require("../models/Agence");



const linkAdminToAgence = async (req, res) => {
  try {
    const agenceId = req.params.id;
    const { adminId } = req.body;

    // Vérifie que l’utilisateur existe
    const adminUser = await User.findById(adminId);
    if (!adminUser) return res.status(404).json({ message: "Admin non trouvé" });

    // Vérifie que son rôle est correct
    if (adminUser.role !== "Agence") {
      return res.status(400).json({ message: "L'utilisateur n'a pas le rôle Agence" });
    }

    // Met à jour l'agence avec ce user
    const agence = await Agence.findByIdAndUpdate(
      agenceId,
      { admin: adminUser._id },
      { new: true }
    );

    if (!agence) return res.status(404).json({ message: "Agence non trouvée" });

    res.status(200).json({ message: "Admin lié à l'agence", agence });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};



const createAgenceImmobiliere = async (req, res) => {
  try {
    const {
      nom,
      nif,
      rccm,
      statutJuridique,
      dateCreation,
      promoteur,
      adresse,
      bp,
      ville,
      pays,
      telephone,
      email,
      latitude,
      longitude,
      description,
    } = req.body;

    const cloudDocs = req.cloudinaryDocs || {};

    const fichiers = {
      nifFile:
        cloudDocs.nifFile?.url || req.files?.nifFile?.[0]?.path || null,
      rccmFile:
        cloudDocs.rccmFile?.url || req.files?.rccmFile?.[0]?.path || null,
      statutFile:
        cloudDocs.statutFile?.url || req.files?.statutFile?.[0]?.path || null,
      autresFichiers:
        (cloudDocs.autresFichiers?.map((f) => f.url) ||
          req.files?.autresFichiers?.map((f) => f.path) ||
          []),
      logo: cloudDocs.logo?.url || req.files?.logo?.[0]?.path || null,
    };

    const agence = new Agence({
      nom,
      nif,
      rccm,
      statutJuridique,
      dateCreation,
      promoteur,
      adresse,
      bp,
      ville,
      pays,
      telephone,
      email,
      localisation: {
        latitude,
        longitude,
      },
      description,
      fichiers,
    });

    await agence.save();
    res.status(201).json({ message: "Agence créée avec succès", agence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};



const createAdminUser = async (req, res) => {
  try {
    const { fullName, phone, password, role } = req.body;

    if (!["Agence", "Banque", "Ministere"].includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Ce téléphone est déjà utilisé." });
    }

    // Vérifier que le fullName est fourni
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "Le nom complet est requis." });
    }

    const user = new User({ 
      fullName: fullName.trim(), // ✅ S'assurer que fullName est toujours renseigné
      phone, 
      password, 
      role 
    });
    await user.save();

    console.log(`✅ Utilisateur créé: ${fullName} (${phone}) - Rôle: ${role}`);

    res.status(201).json({ message: "Admin créé avec succès", user });
  } catch (error) {
    console.error("❌ Erreur création utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};


// GET /api/users?page=1&limit=5
const getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  const totalUsers = await User.countDocuments();
  const users = await User.find()
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 }); // facultatif

  const totalPages = Math.ceil(totalUsers / limit);

  res.json({ users, totalPages });
};



const getAllAgences = async (req, res) => {
  try {
    const agences = await Agence.find().sort({ createdAt: -1 });
    res.status(200).json(agences);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement des agences", error: error.message });
  }
};






const getUsersByRole = async (req, res) => {
  const role = req.query.role;

  try {
    const users = await User.find({ role });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};


const unlinkAdminFromAgence = async (req, res) => {
  try {
    const agence = await Agence.findById(req.params.id);
    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    agence.admin = null; // supposer que tu utilises `admin` dans ton modèle
    await agence.save();

    res.status(200).json({ message: "Liaison supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors du déliement :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

const updateAgence = async (req, res) => {
  try {
    const agenceId = req.params.id;
    const {
      nom,
      nif,
      rccm,
      statutJuridique,
      dateCreation,
      promoteur,
      adresse,
      bp,
      ville,
      pays,
      telephone,
      email,
      latitude,
      longitude,
      description,
    } = req.body;

    // Vérifier que l'agence existe
    const agence = await Agence.findById(agenceId);
    if (!agence) {
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    // Préparer les données de mise à jour
    const updateData = {
      nom,
      nif,
      rccm,
      statutJuridique,
      dateCreation,
      promoteur,
      adresse,
      bp,
      ville,
      pays,
      telephone,
      email,
      description,
    };

    // Mettre à jour la localisation si fournie
    if (latitude !== undefined || longitude !== undefined) {
      updateData.localisation = {
        latitude: latitude || agence.localisation?.latitude || "",
        longitude: longitude || agence.localisation?.longitude || "",
      };
    }

    // Gérer les fichiers uploadés - préserver les fichiers existants si non remplacés
    updateData.fichiers = { ...agence.fichiers } || {};

    if (req.cloudinaryDocs) {
      if (req.cloudinaryDocs.nifFile?.url) {
        updateData.fichiers.nifFile = req.cloudinaryDocs.nifFile.url;
      }
      if (req.cloudinaryDocs.rccmFile?.url) {
        updateData.fichiers.rccmFile = req.cloudinaryDocs.rccmFile.url;
      }
      if (req.cloudinaryDocs.statutFile?.url) {
        updateData.fichiers.statutFile = req.cloudinaryDocs.statutFile.url;
      }
      if (req.cloudinaryDocs.logo?.url) {
        updateData.fichiers.logo = req.cloudinaryDocs.logo.url;
      }
      if (Array.isArray(req.cloudinaryDocs.autresFichiers) && req.cloudinaryDocs.autresFichiers.length > 0) {
        const existingAutresFichiers = updateData.fichiers.autresFichiers || [];
        const nouveauxFichiers = req.cloudinaryDocs.autresFichiers.map((f) => f.url);
        updateData.fichiers.autresFichiers = [...existingAutresFichiers, ...nouveauxFichiers];
      }
    }

    // Compatibilité : si req.files est encore utilisé (ex. tests), conserver l'ancien comportement
    if (req.files) {
      if (req.files.nifFile?.[0]?.path) {
        updateData.fichiers.nifFile = req.files.nifFile[0].path;
      }
      if (req.files.rccmFile?.[0]?.path) {
        updateData.fichiers.rccmFile = req.files.rccmFile[0].path;
      }
      if (req.files.statutFile?.[0]?.path) {
        updateData.fichiers.statutFile = req.files.statutFile[0].path;
      }
      if (req.files.logo?.[0]?.path) {
        updateData.fichiers.logo = req.files.logo[0].path;
      }
      if (req.files.autresFichiers && req.files.autresFichiers.length > 0) {
        const existingAutresFichiers = updateData.fichiers.autresFichiers || [];
        const nouveauxFichiers = req.files.autresFichiers.map((f) => f.path);
        updateData.fichiers.autresFichiers = [...existingAutresFichiers, ...nouveauxFichiers];
      }
    }

    // Mettre à jour l'agence
    const updatedAgence = await Agence.findByIdAndUpdate(agenceId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Agence mise à jour avec succès", agence: updatedAgence });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'agence:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};


module.exports = {
  createAdminUser,
   getAllUsers,
   createAgenceImmobiliere,
   getAllAgences,
   linkAdminToAgence,
   getUsersByRole,
   unlinkAdminFromAgence,
   updateAgence,
};
