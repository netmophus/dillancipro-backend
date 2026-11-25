// controllers/agences/lotissementController.js
const mongoose = require("mongoose");
const Lotissement = require("../../models/agences/Lotissement");
const Zone = require("../../models/agences/Zone");
const Ilot = require("../../models/agences/Ilot");

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

// Vidéos : tableau JSON stringifié ou tableau ; seules les URL http(s) valides sont gardées
const parseVideos = (raw) => {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      list = [raw];
    }
  }
  const clean = [];
  for (const v of list) {
    const s = String(v || "").trim();
    if (!s) continue;
    let u;
    try {
      u = new URL(s);
    } catch {
      return { error: `URL de vidéo invalide : ${s}` };
    }
    if (!["http:", "https:"].includes(u.protocol)) return { error: `URL de vidéo invalide : ${s}` };
    clean.push(s);
  }
  return { videos: clean };
};

const parseLocalisation = (body) => {
  const { lat, lng } = body;
  if (lat === undefined && lng === undefined) return {};
  if (lat === "" && lng === "") return { localisation: undefined };
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    return { error: "Coordonnées GPS invalides." };
  }
  return { localisation: { lat: la, lng: ln } };
};

const parseSurface = (v) => {
  if (v === undefined || v === "") return {};
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { error: "La surface doit être un nombre positif." };
  return { surfaceTotale: n };
};

// Un lotissement n'est accessible que par son agence
const loadOwned = async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400).json({ message: "Identifiant invalide." });
    return null;
  }
  const lot = await Lotissement.findById(req.params.id);
  if (!lot) {
    res.status(404).json({ message: "Lotissement non trouvé" });
    return null;
  }
  if (String(lot.agenceId) !== String(req.user.agenceId)) {
    res.status(403).json({ message: "Ce lotissement n'appartient pas à votre agence." });
    return null;
  }
  return lot;
};

exports.createLotissement = async (req, res) => {
  try {
    if (!req.user.agenceId) return res.status(400).json({ message: "Aucune agence associée à cet utilisateur." });

    const nom = String(req.body.nom || "").trim();
    const { zone } = req.body;
    if (!nom) return res.status(400).json({ message: "Le nom du lotissement est requis." });
    if (!zone || !isId(zone)) return res.status(400).json({ message: "La zone est requise." });

    const z = await Zone.findById(zone).select("quartier");
    if (!z) return res.status(404).json({ message: "Zone introuvable." });

    const surf = parseSurface(req.body.surfaceTotale);
    if (surf.error) return res.status(400).json({ message: surf.error });
    const loc = parseLocalisation(req.body);
    if (loc.error) return res.status(400).json({ message: loc.error });
    const vid = parseVideos(req.body.videos);
    if (vid.error) return res.status(400).json({ message: vid.error });

    const exists = await Lotissement.findOne({ zone, nom, agenceId: req.user.agenceId });
    if (exists) {
      return res.status(400).json({ message: `Un lotissement "${nom}" existe déjà dans cette zone pour votre agence.` });
    }

    const lotissement = await Lotissement.create({
      nom,
      zone,
      quartier: z.quartier,
      agenceId: req.user.agenceId,
      description: String(req.body.description || "").trim(),
      ...surf,
      ...(loc.localisation ? { localisation: loc.localisation } : {}),
      images: req.cloudinary?.images || [],
      videos: vid.videos,
    });
    return res.status(201).json({ message: "Lotissement créé avec succès", lotissement });
  } catch (error) {
    console.error("[CREATE_LOTISSEMENT] Erreur:", error.message);
    return res.status(500).json({ message: "Erreur lors de la création du lotissement" });
  }
};

exports.updateLotissement = async (req, res) => {
  try {
    const lot = await loadOwned(req, res);
    if (!lot) return;

    if (req.body.nom !== undefined) {
      const nom = String(req.body.nom).trim();
      if (!nom) return res.status(400).json({ message: "Le nom du lotissement est requis." });
      lot.nom = nom;
    }
    // Changer de zone est refusé s'il y a déjà des îlots (cohérence zone des îlots)
    if (req.body.zone && String(req.body.zone) !== String(lot.zone)) {
      if (!isId(req.body.zone)) return res.status(400).json({ message: "Zone invalide." });
      const nbIlots = await Ilot.countDocuments({ lotissement: lot._id });
      if (nbIlots > 0) {
        return res.status(400).json({ message: "Impossible de changer la zone : des îlots sont rattachés à ce lotissement." });
      }
      const z = await Zone.findById(req.body.zone).select("quartier");
      if (!z) return res.status(404).json({ message: "Zone introuvable." });
      lot.zone = req.body.zone;
      lot.quartier = z.quartier;
    }
    if (req.body.description !== undefined) lot.description = String(req.body.description).trim();

    const surf = parseSurface(req.body.surfaceTotale);
    if (surf.error) return res.status(400).json({ message: surf.error });
    if (surf.surfaceTotale !== undefined) lot.surfaceTotale = surf.surfaceTotale;

    const loc = parseLocalisation(req.body);
    if (loc.error) return res.status(400).json({ message: loc.error });
    if ("localisation" in loc) lot.localisation = loc.localisation;

    if (req.body.videos !== undefined) {
      const vid = parseVideos(req.body.videos);
      if (vid.error) return res.status(400).json({ message: vid.error });
      lot.videos = vid.videos;
    }

    // Images : conserver celles indiquées (keepImages, JSON) puis ajouter les nouvelles
    let kept = lot.images;
    if (req.body.keepImages !== undefined) {
      try {
        const arr = JSON.parse(req.body.keepImages);
        kept = Array.isArray(arr) ? arr.filter((u) => lot.images.includes(u)) : lot.images;
      } catch {
        return res.status(400).json({ message: "keepImages invalide." });
      }
    }
    lot.images = [...kept, ...(req.cloudinary?.images || [])];

    await lot.save();
    return res.status(200).json({ message: "Lotissement mis à jour", lotissement: lot });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Un lotissement portant ce nom existe déjà dans cette zone pour votre agence." });
    }
    console.error("[UPDATE_LOTISSEMENT] Erreur:", error.message);
    return res.status(500).json({ message: "Erreur lors de la mise à jour du lotissement" });
  }
};

exports.deleteLotissement = async (req, res) => {
  try {
    const lot = await loadOwned(req, res);
    if (!lot) return;
    const nbIlots = await Ilot.countDocuments({ lotissement: lot._id });
    if (nbIlots > 0) {
      return res.status(400).json({
        message: `Suppression impossible : ${nbIlots} îlot(s) sont rattachés à ce lotissement.`,
      });
    }
    await lot.deleteOne();
    return res.status(200).json({ message: "Lotissement supprimé avec succès" });
  } catch (error) {
    console.error("[DELETE_LOTISSEMENT] Erreur:", error.message);
    return res.status(500).json({ message: "Erreur lors de la suppression du lotissement" });
  }
};

exports.getAllLotissements = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== "Admin") {
      if (!req.user.agenceId) return res.status(200).json([]);
      filter.agenceId = req.user.agenceId;
    }
    if (req.query.zone && isId(req.query.zone)) filter.zone = req.query.zone;

    const lots = await Lotissement.find(filter)
      .populate("zone", "nom")
      .populate("quartier", "nom")
      .sort({ nom: 1 });
    return res.status(200).json(lots);
  } catch (error) {
    console.error("[GET_LOTISSEMENTS] Erreur:", error.message);
    return res.status(500).json({ message: "Erreur lors du chargement des lotissements" });
  }
};

exports.getIlotsByLotissement = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Identifiant invalide." });
    const lot = await Lotissement.findById(req.params.id).select("agenceId");
    if (!lot) return res.status(404).json({ message: "Lotissement non trouvé" });
    if (String(lot.agenceId) !== String(req.user.agenceId)) {
      return res.status(403).json({ message: "Ce lotissement n'appartient pas à votre agence." });
    }
    const ilots = await Ilot.find({ lotissement: lot._id }).select("numeroIlot surfaceTotale").sort({ numeroIlot: 1 });
    return res.status(200).json(ilots);
  } catch (error) {
    console.error("[GET_ILOTS_LOTISSEMENT] Erreur:", error.message);
    return res.status(500).json({ message: "Erreur lors du chargement des îlots" });
  }
};
