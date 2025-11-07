// controllers/agences/profilCommercialController.js
const path = require("path");
const ProfilCommercial = require("../../models/agences/ProfilCommercial");
const Agence = require("../../models/Agence");

// Helper: récupère l'agence de l'utilisateur Agence connecté (admin)
async function resolveAgenceId(req, fallbackFromBody = true) {
  if (req.user?.role === "Agence") {
    const ag = await Agence.findOne({ admin: req.user.id }).select("_id");
    if (ag?._id) return ag._id;
  }
  return fallbackFromBody ? req.body?.agenceId : undefined;
}

// GET /api/agence/commerciaux/me/profil (Commercial)
exports.meGetProfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const profil = await ProfilCommercial.findOne({ userId })
      .populate("userId", "phone fullName")
      .populate("agenceId", "nom");
    if (!profil) {
      return res.status(404).json({ message: "Profil introuvable" });
    }
    res.json(profil);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PATCH /api/agence/commerciaux/me/profil (Commercial) — infos basiques (pas la commission)
exports.meUpdateProfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const update = {
      fullName: req.body.fullName,
      adresse: req.body.adresse, // {ligne1, ligne2, ville, region, codePostal, pays}
    };
    const profil = await ProfilCommercial.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json({ message: "Profil mis à jour", profil });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// GET /api/agence/commerciaux/:id/profil (Agence & Commercial)
exports.getProfil = async (req, res) => {
  try {
    const userId = req.params.id;
    const profil = await ProfilCommercial.findOne({ userId })
      .populate("userId", "phone fullName")
      .populate("agenceId", "nom");
    if (!profil) {
      return res.status(404).json({ message: "Profil introuvable" });
    }
    res.json(profil);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PUT /api/agence/commerciaux/:id/profil (Agence) — upsert complet (hors fichiers)
exports.upsertProfil = async (req, res) => {
  try {
    const userId = req.params.id;
    const agenceId = await resolveAgenceId(req, true);

    const update = {
      userId,
      agenceId,
      fullName: req.body.fullName,
      adresse: req.body.adresse,
      // commission peut être mise ici si tu veux permettre en PUT
      ...(req.body.commission && {
        commission: {
          mode: req.body.commission.mode,
          valeur: req.body.commission.valeur,
          devise: req.body.commission.devise,
          actif: req.body.commission.actif,
        },
      }),
    };

    const profil = await ProfilCommercial.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ message: "Profil enregistré", profil });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PATCH /api/agence/commerciaux/:id/profil/commission (Agence)
exports.updateCommission = async (req, res) => {
  try {
    const userId = req.params.id;
    const { mode, valeur, devise, actif } = req.body;

    if (mode === "pourcentage" && (valeur < 0 || valeur > 100)) {
      return res.status(400).json({ message: "Pourcentage hors limites (0-100)" });
    }

    const profil = await ProfilCommercial.findOneAndUpdate(
      { userId },
      {
        $set: {
          commission: {
            mode: mode || "pourcentage",
            valeur: typeof valeur === "number" ? valeur : 0,
            devise: devise || "XOF",
            actif: typeof actif === "boolean" ? actif : true,
          },
        },
      },
      { new: true, upsert: true }
    );

    res.json({ message: "Commission mise à jour", profil });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PATCH /api/agence/commerciaux/:id/profil/photo (Agence & Commercial)
// PATCH /api/agence/commerciaux/:id/profil/photo
exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.params.id;

    const url = req.cloudinary?.photo?.url;        // ← URL Cloudinary
    const publicId = req.cloudinary?.photo?.public_id;

    if (!url) {
      return res.status(400).json({ message: "Fichier photo manquant" });
    }

    const profil = await ProfilCommercial.findOneAndUpdate(
      { userId },
      { $set: { photoUrl: url, photoPublicId: publicId } },
      { new: true, upsert: true }
    );

    res.json({ message: "Photo mise à jour", profil });
  } catch (e) {
    console.error("❌ uploadPhoto:", e);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


// PATCH /api/agence/commerciaux/:id/profil/piece (Agence & Commercial)
// PATCH /api/agence/commerciaux/:id/profil/piece
exports.uploadPieceIdentite = async (req, res) => {
  try {
    const userId = req.params.id;
    const { typePiece, numero, dateDelivrance, dateExpiration } = req.body;

    const setObj = {
      "pieceIdentite.typePiece": typePiece || "AUTRE",
      "pieceIdentite.numero": numero || "",
      "pieceIdentite.dateDelivrance": dateDelivrance || null,
      "pieceIdentite.dateExpiration": dateExpiration || null,
    };

    if (req.cloudinary?.pieceFichier?.url) {
      setObj["pieceIdentite.fichierUrl"] = req.cloudinary.pieceFichier.url;
      setObj["pieceIdentite.publicId"] = req.cloudinary.pieceFichier.public_id;
    }

    const profil = await ProfilCommercial.findOneAndUpdate(
      { userId },
      { $set: setObj },
      { new: true, upsert: true }
    );

    res.json({ message: "Pièce d’identité mise à jour", profil });
  } catch (e) {
    console.error("❌ uploadPieceIdentite:", e);
    res.status(500).json({ message: "Erreur serveur" });
  }
};