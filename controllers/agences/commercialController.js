const User = require("../../models/User");
const UserProfile = require("../../models/UserProfile");
const Parcelle = require("../../models/agences/Parcelle");
const BienImmobilier = require("../../models/agences/BienImmobilier");
const fs = require("fs");
const path = require("path");
// controllers/agences/commercialController.js (ajoute ceci)
const Ilot = require("../../models/agences/Ilot");
const mongoose = require("mongoose");

const Paiement = require("../../models/agences/Paiement");

const Notification = require("../../models/agences/Notification");



exports.affecterIlotsAuCommercial = async (req, res) => {
  try {
    const commercialId = req.params.id;
    const { ilots, propagerParcelles = false } = req.body;

    if (!Array.isArray(ilots) || ilots.length === 0) {
      return res.status(400).json({ message: "Aucun îlot sélectionné" });
    }

    // upsert du profil
    await UserProfile.findOneAndUpdate(
      { userId: commercialId },
      { $setOnInsert: { userId: commercialId } },
      { new: true, upsert: true }
    );

    // affecter les îlots
    await Ilot.updateMany({ _id: { $in: ilots } }, { $set: { affecteA: commercialId } });

    // optionnel : propager l’affectation aux parcelles de ces îlots
    if (propagerParcelles) {
      await Parcelle.updateMany(
        { ilot: { $in: ilots } },
        { $set: { affecteeA: commercialId } }
      );
    }


    // … dans affecterIlotsAuCommercial, après l’updateMany :
await Notification.create({
  toUser: commercialId,
  agenceId: req.user.id,
  type: "AFFECTATION_ILOT",
  title: "Nouvel îlot affecté",
  message: "Un ou plusieurs îlots vous ont été assignés.",
  link: "/commercial/mes-ilots",
  meta: { ilots },
});

    // garder la trace côté profil (facultatif)
    await UserProfile.updateOne(
      { userId: commercialId },
      { $addToSet: { assignedIlots: { $each: ilots } } }
    );

    return res.status(200).json({ message: "Îlots affectés avec succès !" });
  } catch (error) {
    console.error("❌ Erreur affectation îlots :", error);
    return res.status(500).json({ message: "Erreur serveur lors de l'affectation des îlots" });
  }
};







// exports.getCommercialStats = async (req, res) => {
//   try {
//     const commercialId = req.user?.id; // le middleware met 'id', pas '_id'
//     if (!commercialId) {
//       return res.status(401).json({ message: "Utilisateur non authentifié" });
//     }

//     const match = { affecteeA: new mongoose.Types.ObjectId(commercialId) };

//     const agg = await Parcelle.aggregate([
//       { $match: match },
//       {
//         $group: {
//           _id: "$statut",
//           count: { $sum: 1 },
//           sumPrix: { $sum: { $ifNull: ["$prix", 0] } },
//           sumSuperficie: { $sum: { $ifNull: ["$superficie", 0] } },
//         },
//       },
//     ]);

//     const byStatus = agg.reduce(
//       (acc, cur) => {
//         acc[cur._id] = {
//           count: cur.count || 0,
//           prix: cur.sumPrix || 0,
//           superficie: cur.sumSuperficie || 0,
//         };
//         return acc;
//       },
//       {}
//     );

//     const total = agg.reduce((s, a) => s + (a.count || 0), 0);
//     const vendues = byStatus.vendue?.count || 0;
//     const disponibles = byStatus.avendre?.count || 0;
//     const reserved = byStatus.reserved?.count || 0;

//     const ca = byStatus.vendue?.prix || 0; // chiffre d’affaires (prix des vendues)
//     const superficieVendue = byStatus.vendue?.superficie || 0;
//     const superficieDisponible = byStatus.avendre?.superficie || 0;

//     const ilots = await Ilot.countDocuments({ affecteA: commercialId });

//     return res.json({
//       total,
//       vendues,
//       disponibles,
//       reserved,
//       ilots,
//       ca,
//       superficieVendue,
//       superficieDisponible,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: "Erreur serveur" });
//   }
// };






// ➕ Créer un utilisateur avec le rôle Commercial



exports.getCommercialStats = async (req, res) => {
  try {
    const commercialId = req.user?.id;
    if (!commercialId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const match = { affecteeA: new mongoose.Types.ObjectId(commercialId) };

    const agg = await Parcelle.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          sumPrix: { $sum: { $ifNull: ["$prix", 0] } },
          sumSuperficie: { $sum: { $ifNull: ["$superficie", 0] } },
        },
      },
    ]);

    const byStatus = agg.reduce((acc, cur) => {
      acc[cur._id] = {
        count: cur.count || 0,
        prix: cur.sumPrix || 0,
        superficie: cur.sumSuperficie || 0,
      };
      return acc;
    }, {});

    const total = agg.reduce((s, a) => s + (a.count || 0), 0);
    const vendues = byStatus.vendue?.count || 0;
    const disponibles = byStatus.avendre?.count || 0;
    const reserved = byStatus.reserved?.count || 0;

    const ca = byStatus.vendue?.prix || 0;
    const superficieVendue = byStatus.vendue?.superficie || 0;
    const superficieDisponible = byStatus.avendre?.superficie || 0;

    const ilots = await Ilot.countDocuments({ affecteA: commercialId });

    const payAgg = await Paiement.aggregate([
      {
        $lookup: {
          from: "parcelles",
          localField: "parcelle",
          foreignField: "_id",
          as: "parcelleDoc",
        },
      },
      { $unwind: "$parcelleDoc" },
      {
        $match: {
          "parcelleDoc.affecteeA": new mongoose.Types.ObjectId(commercialId),
        },
      },
      {
        $group: {
          _id: "$typePaiement",
          count: { $sum: 1 },
          totalMontant: { $sum: { $ifNull: ["$montantTotal", 0] } },
          totalPaye: { $sum: { $ifNull: ["$montantPaye", 0] } },
          totalRestant: { $sum: { $ifNull: ["$montantRestant", 0] } },
        },
      },
    ]);

    const byType = payAgg.reduce((acc, cur) => {
      acc[cur._id] = {
        count: cur.count || 0,
        total: cur.totalMontant || 0,
        paye: cur.totalPaye || 0,
        restant: cur.totalRestant || 0,
      };
      return acc;
    }, {});

    const paiementsTotalCount = payAgg.reduce((s, a) => s + (a.count || 0), 0);
    const encaissementsTotal = payAgg.reduce((s, a) => s + (a.totalPaye || 0), 0);

    const partielsCount = byType.partiel?.count || 0;
    const partielsMontantPaye = byType.partiel?.paye || 0;
    const partielsMontantRestant = byType.partiel?.restant || 0;

    // 📊 Statistiques des biens immobiliers
    console.log("📝 [COMMERCIAL_STATS] Calcul des statistiques biens pour commercial:", commercialId);
    
    const biensMatch = { affecteeA: new mongoose.Types.ObjectId(commercialId) };
    
    const biensAgg = await BienImmobilier.aggregate([
      { $match: biensMatch },
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
          sumPrix: { $sum: { $ifNull: ["$prix", 0] } },
          sumSuperficie: { $sum: { $ifNull: ["$superficie", 0] } },
        },
      },
    ]);

    const biensByStatus = biensAgg.reduce((acc, cur) => {
      acc[cur._id] = {
        count: cur.count || 0,
        prix: cur.sumPrix || 0,
        superficie: cur.sumSuperficie || 0,
      };
      return acc;
    }, {});

    const biensTotal = biensAgg.reduce((s, a) => s + (a.count || 0), 0);
    const biensVendus = biensByStatus.vendu?.count || 0;
    const biensDisponibles = biensByStatus.disponible?.count || 0;
    const biensReserves = biensByStatus.reserve?.count || 0;

    const biensCA = biensByStatus.vendu?.prix || 0;
    const biensSuperficieVendue = biensByStatus.vendu?.superficie || 0;
    const biensSuperficieDisponible = biensByStatus.disponible?.superficie || 0;

    console.log("✅ [COMMERCIAL_STATS] Statistiques biens calculées:", {
      total: biensTotal,
      vendus: biensVendus,
      disponibles: biensDisponibles,
      ca: biensCA
    });

    return res.json({
      // Statistiques parcelles
      total,
      vendues,
      disponibles,
      reserved,
      ilots,
      ca,
      superficieVendue,
      superficieDisponible,
      paiementsTotalCount,
      encaissementsTotal,
      partielsCount,
      partielsMontantPaye,
      partielsMontantRestant,
      
      // Statistiques biens immobiliers
      biens: {
        total: biensTotal,
        vendus: biensVendus,
        disponibles: biensDisponibles,
        reserves: biensReserves,
        ca: biensCA,
        superficieVendue: biensSuperficieVendue,
        superficieDisponible: biensSuperficieDisponible,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
};











exports.enrollCommercial = async (req, res) => {
  try {
    console.log("📝 [ENROLL] Début création commercial");
    console.log("📝 [ENROLL] Body:", req.body);
    console.log("📝 [ENROLL] User connecté:", req.user);

    const { fullName, phone } = req.body;

    // Vérifie si le téléphone est déjà utilisé
    const existing = await User.findOne({ phone });
    if (existing) {
      console.log("❌ [ENROLL] Téléphone déjà utilisé:", phone);
      return res.status(400).json({ message: "Ce numéro existe déjà." });
    }

    // Récupérer l'agence de l'utilisateur connecté
    const Agence = require("../../models/Agence");
    const agence = await Agence.findOne({ admin: req.user.id });
    console.log("📝 [ENROLL] Agence trouvée:", agence ? { _id: agence._id, nom: agence.nom } : "Non trouvée");
    
    if (!agence) {
      console.log("❌ [ENROLL] Agence non trouvée pour l'admin:", req.user.id);
      return res.status(404).json({ message: "Agence non trouvée" });
    }

    // Crée le commercial avec un mot de passe par défaut
    const user = await User.create({
      fullName,
      phone,
      password: "1234", // ⚠️ à changer plus tard
      role: "Commercial",
      agenceId: agence._id, // 🔧 Ajouter l'agenceId au commercial
    });
    console.log("✅ [ENROLL] User créé:", { _id: user._id, fullName: user.fullName, phone: user.phone, role: user.role });

    // Créer le ProfilCommercial lié à l'agence
    const ProfilCommercial = require("../../models/agences/ProfilCommercial");
    const profilCommercial = await ProfilCommercial.create({
      userId: user._id,
      agenceId: agence._id,
      fullName: fullName || "",
      commission: {
        mode: "pourcentage",
        valeur: 0,
        devise: "XOF",
        actif: true,
      },
    });
    console.log("✅ [ENROLL] ProfilCommercial créé:", { 
      _id: profilCommercial._id, 
      userId: profilCommercial.userId, 
      agenceId: profilCommercial.agenceId,
      fullName: profilCommercial.fullName
    });

    console.log(`✅ [ENROLL] Commercial créé avec succès: ${fullName} (${phone}) - Agence: ${agence.nom || agence._id}`);

    res.status(201).json(user);
  } catch (error) {
    console.error("❌ [ENROLL] Erreur création commercial :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 📄 Récupérer tous les commerciaux


// exports.getAllCommerciaux = async (req, res) => {
//   try {
//     const commerciaux = await User.find({ role: "Commercial" });

//     // Récupération des profils correspondants
//     const commerciauxAvecProfil = await Promise.all(
//       commerciaux.map(async (com) => {
//         const profil = await UserProfile.findOne({ userId: com._id });
//         return {
//           _id: com._id,
//           phone: com.phone,
//           fullName: profil?.fullName || "Nom non renseigné",
//         };
//       })
//     );

//     res.status(200).json(commerciauxAvecProfil);
//   } catch (error) {
//     console.error("❌ Erreur récupération commerciaux :", error);
//     res.status(500).json({ message: "Erreur serveur" });
//   }
// };


exports.getAllCommerciaux = async (req, res) => {
  try {
    console.log("📝 [GET_ALL] Début récupération commerciaux");
    console.log("📝 [GET_ALL] User connecté:", { id: req.user.id, role: req.user.role });

    // 🔒 SÉCURITÉ MULTI-AGENCE: Filtrer par agenceId sauf pour Admin
    let filter = { role: "Commercial" };
    
    if (req.user.role === "Agence") {
      console.log("📝 [GET_ALL] Mode Agence - Filtrage par agenceId");
      
      if (!req.user.agenceId) {
        console.log("❌ [GET_ALL] Pas d'agenceId trouvé pour cet utilisateur");
        return res.status(200).json([]);
      }
      
      // Une agence voit UNIQUEMENT ses commerciaux
      // Récupérer les userId des commerciaux de cette agence via ProfilCommercial
      const ProfilCommercial = require("../../models/agences/ProfilCommercial");
      
      const agenceId = req.user.agenceId;
      console.log("📝 [GET_ALL] Recherche ProfilCommercial avec agenceId:", agenceId);
      
      const profilsAgence = await ProfilCommercial.find({ agenceId }).select("userId fullName");
      console.log("📝 [GET_ALL] ProfilCommercial trouvés:", profilsAgence.length);
      console.log("📝 [GET_ALL] Détails des profils:", profilsAgence.map(p => ({ 
        userId: p.userId, 
        fullName: p.fullName 
      })));
      
      const userIds = profilsAgence.map(p => p.userId);
      console.log("📝 [GET_ALL] UserIds extraits:", userIds);
      
      // Ajouter le filtre par userId
      filter._id = { $in: userIds };
    }
    // Si Admin: pas de filtre supplémentaire, voit tous les commerciaux

    console.log("📝 [GET_ALL] Filtre final:", filter);

    const commerciaux = await User.find(filter)
      .select("_id phone fullName");
    
    console.log("📝 [GET_ALL] Commerciaux (Users) trouvés:", commerciaux.length);
    console.log("📝 [GET_ALL] Détails commerciaux:", commerciaux.map(c => ({ 
      _id: c._id, 
      phone: c.phone, 
      fullName: c.fullName 
    })));

    const items = await Promise.all(
      commerciaux.map(async (com) => {
        const profil = await UserProfile.findOne({ userId: com._id })
          .select("fullName");
        const name =
          (profil?.fullName && profil.fullName.trim()) ||
          (com.fullName && com.fullName.trim()) ||
          "Nom non renseigné";

        return { _id: com._id, phone: com.phone, fullName: name };
      })
    );

    console.log("✅ [GET_ALL] Items finaux à retourner:", items);
    console.log("✅ [GET_ALL] Nombre total:", items.length);

    res.status(200).json(items);
  } catch (error) {
    console.error("❌ [GET_ALL] Erreur récupération commerciaux :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};




// exports.affecterParcellesAuCommercial = async (req, res) => {
//   try {
//     const commercialId = req.params.id;
//     const { parcelles } = req.body;

//     if (!Array.isArray(parcelles) || parcelles.length === 0) {
//       return res.status(400).json({ message: "Aucune parcelle sélectionnée" });
//     }

//     // 🔄 Affectation des parcelles
//     await Promise.all(
//       parcelles.map(async (parcelleId) => {
//         await Parcelle.findByIdAndUpdate(parcelleId, {
//           affecteeA: commercialId,
//         });
//       })
//     );

//     // 🔍 Vérifie que le profil existe
//     const profile = await UserProfile.findOne({ userId: commercialId });

//     if (!profile) {
//       return res.status(404).json({ message: "Profil du commercial introuvable" });
//     }

//     // ➕ Ajoute les parcelles dans le profil (sans doublons)
//     await UserProfile.updateOne(
//       { userId: commercialId },
//       { $addToSet: { assignedParcelles: { $each: parcelles } } }
//     );

//     res.status(200).json({ message: "Parcelles affectées avec succès !" });
//   } catch (error) {
//     console.error("❌ Erreur affectation :", error);
//     res.status(500).json({ message: "Erreur serveur lors de l'affectation" });
//   }
// };




// 📄 Obtenir les parcelles affectées à un commercial

exports.affecterParcellesAuCommercial = async (req, res) => {
  try {
    const commercialId = req.params.id;
    const { parcelles } = req.body;

    if (!Array.isArray(parcelles) || parcelles.length === 0) {
      return res.status(400).json({ message: "Aucune parcelle sélectionnée" });
    }

    // 🔧 Crée le profil s'il n'existe pas (upsert)
    const profile = await UserProfile.findOneAndUpdate(
      { userId: commercialId },
      { $setOnInsert: { userId: commercialId } },
      { new: true, upsert: true }
    );

    // 🔄 Affecter les parcelles au commercial
    await Parcelle.updateMany(
      { _id: { $in: parcelles } },
      { $set: { affecteeA: commercialId } }
    );

    // 📋 Récupérer les détails des parcelles pour notification détaillée
    const parcellesDetails = await Parcelle.find({ _id: { $in: parcelles } })
      .populate('ilot', 'numeroIlot')
      .select('numeroParcelle superficie prix statut ilot');

    // 📝 Créer notification détaillée
    const parcelleCount = parcellesDetails.length;
    const totalSuperficie = parcellesDetails.reduce((sum, p) => sum + (p.superficie || 0), 0);
    const prixMin = Math.min(...parcellesDetails.map(p => p.prix || 0));
    const prixMax = Math.max(...parcellesDetails.map(p => p.prix || 0));
    
    let message = `🏡 ${parcelleCount} parcelle${parcelleCount > 1 ? 's' : ''} vous a${parcelleCount > 1 ? 'ient' : ''} été assignée${parcelleCount > 1 ? 's' : ''}.\n\n`;
    
    if (parcelleCount <= 3) {
      // Détails pour 3 parcelles ou moins
      parcellesDetails.forEach((p, index) => {
        message += `📍 Parcelle ${p.numeroParcelle} (Îlot ${p.ilot?.numeroIlot || 'N/A'})\n`;
        message += `   💰 Prix: ${p.prix?.toLocaleString() || 'N/A'} FCFA\n`;
        message += `   📏 Superficie: ${p.superficie || 'N/A'} m²\n\n`;
      });
    } else {
      // Résumé pour plus de 3 parcelles
      message += `📊 Résumé:\n`;
      message += `   📏 Superficie totale: ${totalSuperficie.toLocaleString()} m²\n`;
      message += `   💰 Prix: ${prixMin.toLocaleString()} - ${prixMax.toLocaleString()} FCFA\n`;
      message += `   🏘️ Îlots: ${[...new Set(parcellesDetails.map(p => p.ilot?.numeroIlot).filter(Boolean))].join(', ')}\n\n`;
    }
    
    message += `✅ Vous pouvez maintenant les consulter et les vendre.`;

    await Notification.create({
      toUser: commercialId,
      agenceId: req.user.id,
      type: "AFFECTATION_PARCELLE",
      title: `🏡 ${parcelleCount} parcelle${parcelleCount > 1 ? 's' : ''} assignée${parcelleCount > 1 ? 's' : ''}`,
      message: message,
      link: "/commercial/parcelles-non-vendues",
      meta: { 
        parcelles: parcellesDetails.map(p => ({
          id: p._id,
          numero: p.numeroParcelle,
          superficie: p.superficie,
          prix: p.prix,
          ilot: p.ilot?.numeroIlot
        })),
        count: parcelleCount,
        totalSuperficie,
        prixRange: { min: prixMin, max: prixMax }
      },
    });


    // ➕ Ajouter dans le profil sans doublons
    await UserProfile.updateOne(
      { userId: commercialId },
      { $addToSet: { assignedParcelles: { $each: parcelles } } }
    );

    return res.status(200).json({ message: "Parcelles affectées avec succès !" });
  } catch (error) {
    console.error("❌ Erreur affectation :", error);
    return res.status(500).json({ message: "Erreur serveur lors de l'affectation" });
  }
};





exports.getParcellesDuCommercial = async (req, res) => {
    try {
      const commercialId = req.params.id;
  
      const parcelles = await Parcelle.find({ affecteeA: commercialId })
        .populate("ilot")
        .populate("affecteeA"); // ✅ seulement l'utilisateur
  
      res.status(200).json(parcelles);
    } catch (error) {
      console.error("❌ Erreur récupération parcelles :", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  



exports.getParcellesDisponiblesParIlot = async (req, res) => {
  try {
    const ilotId = req.params.id;
    const parcelles = await Parcelle.find({
      ilot: ilotId,
      statut: "avendre",
    }).select("numeroParcelle superficie prix statut");

    res.json(parcelles);
  } catch (err) {
    console.error("❌ Erreur récupération parcelles disponibles :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};






// controllers/agences/commercialController.js (optionnel)
exports.getIlotsDuCommercial = async (req, res) => {
  try {
    const commercialId = req.params.id;
    const ilots = await Ilot.find({ affecteA: commercialId })
      .populate("zone", "nom")
      .populate("quartier", "nom");
    return res.json(ilots);
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Supprimer un commercial
exports.deleteCommercial = async (req, res) => {
  try {
    const commercialId = req.params.id;

    // Vérifier si le commercial existe
    const commercial = await User.findById(commercialId);
    if (!commercial || commercial.role !== "Commercial") {
      return res.status(404).json({ message: "Commercial non trouvé" });
    }

    // Libérer les parcelles affectées
    await Parcelle.updateMany(
      { affecteeA: commercialId },
      { $unset: { affecteeA: "" } }
    );

    // Libérer les îlots affectés
    await Ilot.updateMany(
      { affecteA: commercialId },
      { $unset: { affecteA: "" } }
    );

    // Supprimer le profil associé
    await UserProfile.deleteOne({ userId: commercialId });

    // Supprimer l'utilisateur
    await User.findByIdAndDelete(commercialId);

    return res.status(200).json({ message: "Commercial supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur suppression commercial:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};