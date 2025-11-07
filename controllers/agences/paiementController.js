const Paiement = require("../../models/agences/Paiement");
const PartielPaiement = require("../../models/agences/PartielPaiement");
const Parcelle = require("../../models/agences/Parcelle");
const BienImmobilier = require("../../models/agences/BienImmobilier");
const User = require("../../models/User");
const PatrimoineFoncier = require("../../models/PatrimoineFoncier");
const Vente = require("../../models/agences/Vente");
const Notaire = require("../../models/Notaire");

const mongoose = require("mongoose");



// exports.getParcellesVendues = async (req, res) => {
//   try {
//     const commercialId = req.user._id;

//     const paiements = await Paiement.find()
//       .populate({
//         path: "parcelle",
//         match: { affecteeA: commercialId },
//         populate: { path: "ilot", select: "numeroIlot" },
//       })
//       .populate("client", "phone");

//     // Filtrer les paiements où la parcelle est bien affectée au commercial
//     const filtered = paiements.filter(p => p.parcelle !== null);

//     res.status(200).json(filtered);
//   } catch (err) {
//     console.error("❌ Erreur chargement parcelles vendues :", err);
//     res.status(500).json({ message: "Erreur serveur" });
//   }
// };


// controllers/agences/paiementController.js
exports.getParcellesVendues = async (req, res) => {
  try {
    const commercialId = req.user.id; // <- PAS _id
    console.log("GET /paiements/parcelles-vendues — commercialId:", commercialId);

    const paiements = await Paiement.find()
      .populate({
        path: "parcelle",
        match: { affecteeA: commercialId },
        select: "numeroParcelle prix statut ilot",
        populate: { path: "ilot", select: "numeroIlot" },
      })
      .populate("client", "fullName phone")
      .sort({ createdAt: -1 });

    // on ne renvoie que les paiements dont la parcelle est bien affectée à ce commercial
    const filtered = paiements.filter((p) => p.parcelle);

    // Pour chaque paiement, récupérer la vente associée si elle existe
    const paiementsAvecVentes = await Promise.all(
      filtered.map(async (paiement) => {
        const paiementObj = paiement.toObject ? paiement.toObject() : paiement;
        
        // Trouver la vente associée à cette parcelle
        if (paiement.parcelle && paiement.parcelle._id) {
          const vente = await Vente.findOne({ parcelle: paiement.parcelle._id })
            .populate("notaireId", "fullName cabinetName phone email")
            .select("_id statut notaireId dateAssignationNotaire");
          
          if (vente) {
            paiementObj.vente = vente.toObject ? vente.toObject() : vente;
          }
        }
        
        return paiementObj;
      })
    );

    console.log(`✅ [PARCELLES_VENDUES] ${paiementsAvecVentes.length} paiements avec ${paiementsAvecVentes.filter(p => p.vente).length} ventes associées`);

    return res.status(200).json(paiementsAvecVentes);
  } catch (err) {
    console.error("❌ Erreur getParcellesVendues:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};



 exports.enregistrerPaiement = async (req, res) => {
   try {
     const { parcelleId } = req.params;
     const { telephone, nom, typePaiement, montant } = req.body;

   const recuUrl = req.cloudinary?.recu?.url || null;
   const recuPublicId = req.cloudinary?.recu?.public_id || null;

     const parcelle = await Parcelle.findById(parcelleId);
     if (!parcelle) return res.status(404).json({ message: "Parcelle non trouvée" });

     let client = await User.findOne({ phone: telephone });
     if (!client) {
       // Créer le client avec fullName si fourni, sinon utiliser un nom par défaut
       const clientFullName = nom && nom.trim() ? nom.trim() : `Client ${telephone}`;
       client = await User.create({ 
         phone: telephone, 
         password: "123456", 
         role: "User",
         fullName: clientFullName, // ✅ S'assurer que fullName est dans User
       });
       
       // Créer aussi le UserProfile si le nom est fourni
       if (nom && nom.trim()) {
         const UserProfile = require("../../models/UserProfile");
         await UserProfile.create({
           userId: client._id,
           fullName: nom.trim(),
         });
       }
     }

     const montantTotal = parcelle.prix;

  const montantPaye = Number(montant || 0);
     const montantRestant = montantTotal - montantPaye;
     const statut = montantRestant <= 0 ? "paid" : "unpaid";

     const paiement = await Paiement.create({
       parcelle: parcelle._id,
       client: client._id,
       typePaiement,
       montantTotal,
       montantPaye,
       montantRestant,
       statut,

      recuUrl: typePaiement === "total" ? recuUrl : null,
     recuPublicId: typePaiement === "total" ? recuPublicId : null, // (si tu veux stocker le public_id)
     });

     if (typePaiement === "partiel") {
       await PartielPaiement.create({
         paiement: paiement._id,
         montant: montantPaye,

      recuUrl,
        recuPublicId,
       });
     }

    parcelle.statut = statut === "paid" ? "vendue" : "reserved";
    parcelle.vendueA = client._id;
    parcelle.dateVente = new Date();
    await parcelle.save();

    // Créer ou mettre à jour l'enregistrement Vente
    let vente = await Vente.findOne({ parcelle: parcelle._id });
    const commercialId = req.user._id;
    const agenceId = req.user.agenceId || parcelle.agenceId;

    if (vente) {
      // Mettre à jour la vente existante
      vente.montantTotal = montantTotal;
      vente.montantPaye = montantPaye;
      vente.clientId = client._id;
      vente.commercialId = commercialId;
      vente.statut = statut === "paid" ? "paiement_complet" : "en_attente_paiement";
      await vente.save();
    } else {
      // Créer une nouvelle vente
      vente = await Vente.create({
        parcelle: parcelle._id,
        acquereurNom: nom || client.fullName || `Client ${telephone}`,
        acquereurTelephone: telephone,
        clientId: client._id,
        commercialId: commercialId,
        typePaiement,
        montantTotal,
        montantPaye,
        recuUrl: typePaiement === "total" ? recuUrl : null,
        dateVente: new Date(),
        agenceId: agenceId,
        statut: statut === "paid" ? "paiement_complet" : "en_attente_paiement",
        historique: [
          {
            action: "vente_initiee",
            description: `Vente initiée par le commercial ${req.user.fullName || req.user.phone}`,
            acteur: req.user._id,
            acteurType: "Commercial",
            acteurNom: req.user.fullName || req.user.phone,
            donnees: {
              typePaiement,
              montantTotal,
              montantPaye,
            },
          },
        ],
      });
    }

    // Si le paiement est complet ET qu'un notaire a été choisi par l'agence, transférer automatiquement
    if (statut === "paid" && vente.notaireId) {
      const notaire = await Notaire.findById(vente.notaireId);
      if (notaire && notaire.statut === "actif") {
        vente.statut = "en_attente_notaire";
        vente.dateAssignationNotaire = new Date();
        vente.historique.push({
          action: "paiement_complet_transfert_notaire",
          description: `Paiement complet effectué - Vente transférée automatiquement au notaire ${notaire.fullName || notaire.cabinetName || "N/A"}`,
          acteur: req.user._id,
          acteurType: "Commercial",
          acteurNom: req.user.fullName || req.user.phone,
        });
        await vente.save();
        console.log(`✅ [VENTE_PARCELLE] Vente ${vente._id} transférée automatiquement au notaire`);
      }
    }

    res.status(201).json({ message: "Paiement enregistré avec succès" });
  } catch (error) {
    console.error("❌ Erreur enregistrement paiement :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};




exports.ajouterPaiementPartiel = async (req, res) => {
  try {
    const { paiementId } = req.params;

   const { montant } = req.body;
  const recuUrl = req.cloudinary?.recu?.url || null;
  const recuPublicId = req.cloudinary?.recu?.public_id || null;

    const paiement = await Paiement.findById(paiementId)
      .populate("parcelle")
      .populate("client");
    if (!paiement) return res.status(404).json({ message: "Paiement non trouvé" });

    await PartielPaiement.create({
      paiement: paiement._id,
    montant: Number(montant || 0),
   recuUrl,
    recuPublicId,
    });

    const ancienStatut = paiement.statut;
    paiement.montantPaye += parseInt(montant);
    paiement.montantRestant = paiement.montantTotal - paiement.montantPaye;
    paiement.statut = paiement.montantRestant <= 0 ? "paid" : "unpaid";
    await paiement.save();

    if (paiement.statut === "paid") {
      await Parcelle.findByIdAndUpdate(paiement.parcelle, { statut: "vendue" });
      
      // 🏠 CRÉATION AUTOMATIQUE DU PATRIMOINE FONCIER
      if (ancienStatut === "unpaid" && paiement.statut === "paid") {
        console.log("✅ [PATRIMOINE] Paiement complet détecté - Création du patrimoine pour client:", paiement.client._id);
        
        try {
          const parcelle = paiement.parcelle;
          
          // Récupérer la vente associée
          const vente = await Vente.findOne({ parcelle: parcelle._id });
          
          // 🔔 TRANSFERT AUTOMATIQUE AU NOTAIRE SI CHOISI PAR L'AGENCE
          if (vente && vente.notaireId) {
            console.log(`⚖️ [VENTE_PARCELLE] Paiement complet - Transfert automatique au notaire: ${vente.notaireId}`);
            
            // Vérifier que le notaire existe et est actif
            const notaire = await Notaire.findById(vente.notaireId);
            if (notaire && notaire.statut === "actif") {
              // Mettre à jour la vente pour transférer au notaire
              vente.statut = "en_attente_notaire";
              vente.dateAssignationNotaire = new Date();
              
              // Ajouter à l'historique
              vente.historique.push({
                action: "paiement_complet_transfert_notaire",
                description: `Paiement complet effectué - Vente transférée automatiquement au notaire ${notaire.fullName || notaire.cabinetName || "N/A"}`,
                acteur: req.user._id,
                acteurType: req.user.role === "Agence" ? "Agence" : "Commercial",
                acteurNom: req.user.fullName || req.user.phone,
                donnees: {
                  notaireId: notaire._id,
                  notaireNom: notaire.fullName || notaire.cabinetName,
                  montantTotal: paiement.montantTotal,
                  montantPaye: paiement.montantPaye,
                },
              });
              
              await vente.save();
              console.log(`✅ [VENTE_PARCELLE] Vente ${vente._id} transférée au notaire ${notaire.fullName || notaire.cabinetName}`);
            } else {
              console.warn(`⚠️ [VENTE_PARCELLE] Notaire ${vente.notaireId} non trouvé ou inactif - Statut: ${vente.statut}`);
              // Si le notaire n'existe pas ou est inactif, mettre le statut à "paiement_complet" en attente d'assignation
              vente.statut = "paiement_complet";
              vente.historique.push({
                action: "paiement_complet_sans_notaire",
                description: "Paiement complet effectué - En attente d'assignation d'un notaire par l'agence",
                acteur: req.user._id,
                acteurType: req.user.role === "Agence" ? "Agence" : "Commercial",
                acteurNom: req.user.fullName || req.user.phone,
              });
              await vente.save();
            }
          } else if (vente) {
            // Pas de notaire choisi, mettre le statut à "paiement_complet"
            vente.statut = "paiement_complet";
            vente.historique.push({
              action: "paiement_complet",
              description: "Paiement complet effectué - En attente d'assignation d'un notaire par l'agence",
              acteur: req.user._id,
              acteurType: req.user.role === "Agence" ? "Agence" : "Commercial",
              acteurNom: req.user.fullName || req.user.phone,
            });
            await vente.save();
            console.log(`ℹ️ [VENTE_PARCELLE] Vente ${vente._id} - Paiement complet mais pas de notaire assigné`);
          }
          
          // Vérifier si le patrimoine n'existe pas déjà
          const patrimoineExistant = await PatrimoineFoncier.findOne({
            venteAgenceId: vente?._id
          });
          
          if (!patrimoineExistant && parcelle) {
            const nouveauPatrimoine = await PatrimoineFoncier.create({
              clientId: paiement.client._id,
              type: "parcelle",
              source: "agence",
              venteAgenceId: vente?._id,
              agenceOrigine: parcelle.agenceId,
              typeBienAgence: "parcelle",
              
              // Informations de base
              reference: parcelle.numeroParcelle,
              titre: `Parcelle ${parcelle.numeroParcelle} - Îlot ${parcelle.ilot?.numeroIlot || 'N/A'}`,
              description: parcelle.description || `Parcelle achetée via agence`,
              superficie: parcelle.superficie || 0,
              valeurEstimee: parcelle.prix || 0,
              
              // Localisation
              localisation: {
                adresse: parcelle.adresse || "",
                ville: parcelle.ville || "",
                quartier: parcelle.quartier || "",
                latitude: parcelle.localisation?.lat,
                longitude: parcelle.localisation?.lng,
              },
              
              // Documents et médias
              documents: parcelle.documents || [],
              photos: parcelle.images || [],
              videoUrl: parcelle.video || "",
              
              // Informations juridiques
              dateAcquisition: new Date(),
              modeAcquisition: "achat",
              
              // Statut
              statut: "possede",
              
              // Paiement déjà effectué via agence
              enregistrementStatut: "paye",
              montantEnregistrement: paiement.montantTotal,
              dateEnregistrement: new Date(),
              
              // Abonnement actif pour 1 an
              abonnementStatut: "actif",
              dateDebutAbonnement: new Date(),
              dateExpirationAbonnement: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 an
              
              // Visible immédiatement
              visible: true,
              
              // Vérifié automatiquement (acheté via agence)
              statutVerification: "verifie",
              dateVerification: new Date(),
              notesVerification: "Bien acheté via agence - vérifié automatiquement",
            });
            
            console.log("✅ [PATRIMOINE] Patrimoine créé avec succès:", nouveauPatrimoine._id);
          } else if (patrimoineExistant) {
            console.log("⚠️ [PATRIMOINE] Patrimoine déjà existant pour cette vente");
          }
        } catch (patrimoineError) {
          console.error("❌ [PATRIMOINE] Erreur lors de la création du patrimoine:", patrimoineError);
          // On ne bloque pas le paiement si la création du patrimoine échoue
        }
      }
    }

    res.status(200).json({ message: "Paiement partiel ajouté avec succès" });
  } catch (error) {
    console.error("❌ Erreur ajout paiement partiel :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Assigner un notaire à une vente de parcelle (pour l'agence)
 * PUT /api/agence/paiements/vente/:venteId/notaire
 */
exports.assignerNotaireAVente = async (req, res) => {
  try {
    const { venteId } = req.params;
    const { notaireId } = req.body;
    const userRole = req.user.role;
    const agenceId = req.user.agenceId;

    if (!notaireId) {
      return res.status(400).json({ message: "L'ID du notaire est requis" });
    }

    // Seules les agences et les admins peuvent assigner un notaire
    if (userRole !== "Agence" && userRole !== "Admin") {
      return res.status(403).json({ message: "Seule l'agence peut assigner un notaire" });
    }

    // Récupérer la vente
    const vente = await Vente.findById(venteId).populate("parcelle", "agenceId");
    
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que l'agence est bien propriétaire de cette vente
    if (userRole === "Agence" && vente.agenceId.toString() !== agenceId.toString()) {
      return res.status(403).json({ message: "Cette vente n'appartient pas à votre agence" });
    }

    // Vérifier que le notaire existe et est actif
    const notaire = await Notaire.findById(notaireId);
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }
    if (notaire.statut !== "actif") {
      return res.status(400).json({ message: "Ce notaire n'est pas actif" });
    }

    // Assigner le notaire à la vente
    vente.notaireId = notaireId;
    
    // Si le paiement est déjà complété, transférer immédiatement au notaire
    if (vente.statut === "paiement_complet") {
      vente.statut = "en_attente_notaire";
      vente.dateAssignationNotaire = new Date();
    }
    
    // Ajouter à l'historique
    vente.historique.push({
      action: "notaire_assigné",
      description: `Notaire ${notaire.fullName || notaire.cabinetName || "N/A"} assigné à la vente par l'agence`,
      acteur: req.user._id,
      acteurType: userRole === "Admin" ? "Admin" : "Agence",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        notaireId: notaire._id,
        notaireNom: notaire.fullName || notaire.cabinetName,
      },
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "parcelle", select: "numeroParcelle prix" },
      { path: "clientId", select: "fullName phone" },
      { path: "commercialId", select: "fullName phone" },
      { path: "notaireId", select: "fullName cabinetName phone" },
    ]);

    console.log(`✅ [VENTE_PARCELLE] Notaire ${notaire.fullName || notaire.cabinetName} assigné à la vente ${vente._id}`);

    return res.status(200).json({
      message: "Notaire assigné avec succès à la vente",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur assignation notaire:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Transférer une vente au notaire par le commercial (après paiement complet)
 * PUT /api/agence/paiements/vente/:venteId/transférer-notaire
 */
exports.transférerAuNotaireParCommercial = async (req, res) => {
  try {
    const { venteId } = req.params;
    const { notaireId } = req.body;
    const commercialId = req.user._id;
    const commercialRole = req.user.role;

    if (!notaireId) {
      return res.status(400).json({ message: "L'ID du notaire est requis" });
    }

    // Seuls les commerciaux peuvent utiliser cette fonction
    if (commercialRole !== "Commercial") {
      return res.status(403).json({ message: "Seul le commercial peut transférer la vente au notaire" });
    }

    // Récupérer la vente avec la parcelle
    const vente = await Vente.findById(venteId)
      .populate("parcelle", "affecteeA agenceId numeroParcelle")
      .populate("clientId", "fullName phone")
      .populate("commercialId", "fullName phone");

    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    // Vérifier que la parcelle est affectée à ce commercial
    if (!vente.parcelle || String(vente.parcelle.affecteeA) !== String(commercialId)) {
      return res.status(403).json({ message: "Cette vente ne vous appartient pas" });
    }

    // Vérifier que le paiement est complet
    if (vente.statut !== "paiement_complet") {
      return res.status(400).json({ 
        message: `Le paiement doit être complet pour transférer au notaire. Statut actuel: ${vente.statut}` 
      });
    }

    // Vérifier que le notaire existe et est actif
    const notaire = await Notaire.findById(notaireId);
    if (!notaire) {
      return res.status(404).json({ message: "Notaire non trouvé" });
    }
    if (notaire.statut !== "actif") {
      return res.status(400).json({ message: "Ce notaire n'est pas actif" });
    }

    // Assigner le notaire et transférer la vente
    vente.notaireId = notaireId;
    vente.statut = "en_attente_notaire";
    vente.dateAssignationNotaire = new Date();

    // Ajouter à l'historique
    vente.historique.push({
      action: "transféré_au_notaire_par_commercial",
      description: `Vente transférée au notaire ${notaire.fullName || notaire.cabinetName || "N/A"} par le commercial ${req.user.fullName || req.user.phone}`,
      acteur: req.user._id,
      acteurType: "Commercial",
      acteurNom: req.user.fullName || req.user.phone,
      donnees: {
        notaireId: notaire._id,
        notaireNom: notaire.fullName || notaire.cabinetName,
        parcelleNumero: vente.parcelle?.numeroParcelle,
        clientNom: vente.clientId?.fullName || vente.acquereurNom,
      },
    });

    await vente.save();

    // Peupler pour la réponse
    await vente.populate([
      { path: "parcelle", select: "numeroParcelle prix" },
      { path: "clientId", select: "fullName phone" },
      { path: "commercialId", select: "fullName phone" },
      { path: "notaireId", select: "fullName cabinetName phone email" },
      { path: "agenceId", select: "nom" },
    ]);

    console.log(`✅ [VENTE_PARCELLE] Commercial ${req.user.fullName || req.user.phone} a transféré la vente ${vente._id} au notaire ${notaire.fullName || notaire.cabinetName}`);

    return res.status(200).json({
      message: "Vente transférée au notaire avec succès",
      vente,
    });
  } catch (error) {
    console.error("❌ Erreur transfert au notaire par commercial:", error);
    return res.status(500).json({ message: error.message });
  }
};


 

  // Liste des paiements partiels d'un paiement (contrôle d'accès inclus)


exports.getPaiementsPartiels = async (req, res) => {
  try {
    const paiementId = req.params.paiementId;
    const commercialId = req.user.id;

    console.log("▶️ [GET] /paiements/partiels/:paiementId —", paiementId, "commercial:", commercialId);

    // 🔒 SÉCURITÉ MULTI-AGENCE: Vérifier l'agenceId en plus de l'affectation
    const paiement = await Paiement.findById(paiementId).populate({
      path: "parcelle",
      select: "affecteeA agenceId",
    });
    if (!paiement || !paiement.parcelle) {
      return res.status(404).json({ message: "Paiement introuvable" });
    }
    if (String(paiement.parcelle.affecteeA) !== String(commercialId)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    
    // 🔒 Vérification supplémentaire de l'agenceId
    if (req.user.agenceId && String(paiement.parcelle.agenceId) !== String(req.user.agenceId)) {
      return res.status(403).json({ message: "Accès refusé - Agence différente" });
    }

    // Charge les versements partiels
    const items = await PartielPaiement.find({ paiement: paiementId })
      .sort({ createdAt: 1 }); // plus sûr que datePaiement

    const totalPaye = items.reduce((s, r) => s + (r.montant || 0), 0);

    return res.json({
      count: items.length,
      items,
      resume: {
        totalPaye,
        totalRestant: Math.max((paiement.montantTotal || 0) - totalPaye, 0),
      },
    });
  } catch (e) {
    console.error("❌ getPaiementsPartiels:", e);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};



// Détail d’un paiement (avec contrôle que la parcelle est bien affectée au commercial connecté)
exports.getPaiementById = async (req, res) => {
  try {
    const paiementId = req.params.paiementId;
    const commercialId = req.user.id;

    console.log("▶️ [GET] /paiements/:paiementId —", paiementId, "commercial:", commercialId);

    const paiement = await Paiement.findById(paiementId)
      .populate({
        path: "parcelle",
        select: "numeroParcelle affecteeA ilot prix statut",
        populate: { path: "ilot", select: "numeroIlot" },
      })
      .populate("client", "fullName phone");

    if (!paiement || !paiement.parcelle) {
      return res.status(404).json({ message: "Paiement introuvable" });
    }
    if (String(paiement.parcelle.affecteeA) !== String(commercialId)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    return res.json(paiement);
  } catch (e) {
    console.error("❌ getPaiementById:", e);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};



  // Résumé des paiements partiels du commercial connecté
exports.getPaiementsPartielsStats = async (req, res) => {
  try {
    const commercialId = req.user?._id || req.user?.id;
    console.log("▶️ [GET] /paiements/stats/partiels — req.user:", req.user, "=> commercialId:", commercialId);
    if (!commercialId) return res.status(401).json({ message: "Non authentifié" });

    // 🔒 SÉCURITÉ MULTI-AGENCE: Filtrer par agenceId
    let matchCondition = { affecteeA: commercialId };
    
    if (req.user.agenceId) {
      matchCondition.agenceId = req.user.agenceId;
      console.log("🔒 [PAIEMENTS_STATS] Filtrage par agenceId:", req.user.agenceId);
    }

    const paiements = await Paiement.find(
      {},
      "typePaiement montantTotal montantPaye montantRestant statut parcelle createdAt"
    ).populate({
      path: "parcelle",
      match: matchCondition,
      select: "numeroParcelle affecteeA agenceId",
    });

    const rows = paiements.filter((p) => p.parcelle); // uniquement ceux liés à ses parcelles
    const partiels = rows.filter(
      (p) => p.typePaiement === "partiel" || p.statut === "unpaid"
    );

    const countPartiels = partiels.length;
    const totalMontant = partiels.reduce((s, p) => s + (Number(p.montantTotal) || 0), 0);
    const totalPaye = partiels.reduce((s, p) => s + (Number(p.montantPaye) || 0), 0);
    const totalRestant = partiels.reduce((s, p) => s + (Number(p.montantRestant) || 0), 0);

    console.log("✅ Partiels => count:", countPartiels, "payé:", totalPaye, "reste:", totalRestant);
    return res.json({ countPartiels, totalMontant, totalPaye, totalRestant });
  } catch (e) {
    console.error("❌ getPaiementsPartielsStats:", e);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Statistiques d’encaissements (CA en cours) du commercial connecté
exports.getEncaissementsTotaux = async (req, res) => {
  try {
    const commercialId = req.user?._id || req.user?.id;
    console.log("▶️ [GET] /paiements/stats/encaissements — req.user:", req.user, "=> commercialId:", commercialId);
    if (!commercialId) return res.status(401).json({ message: "Non authentifié" });

    const paiements = await Paiement.find(
      {},
      "montantPaye statut createdAt parcelle"
    )
      .populate({
        path: "parcelle",
        match: { affecteeA: commercialId },
        select: "numeroParcelle ilot",
        populate: { path: "ilot", select: "numeroIlot" },
      })
      .sort({ createdAt: -1 });

    const rows = paiements.filter((p) => p.parcelle);

    const encaisse = rows.reduce((s, p) => s + (Number(p.montantPaye) || 0), 0);
    const paidCount = rows.filter((p) => p.statut === "paid").length;
    const unpaidCount = rows.filter((p) => p.statut === "unpaid").length;

    const derniers = rows.slice(0, 5).map((p) => ({
      id: p._id,
      montant: Number(p.montantPaye) || 0,
      statut: p.statut,
      date: p.createdAt,
      parcelle: p.parcelle?.numeroParcelle || "-",
      ilot: p.parcelle?.ilot?.numeroIlot || "-",
    }));

    console.log("✅ Encaissements => total:", encaisse, "paid:", paidCount, "unpaid:", unpaidCount);
    return res.json({ encaisse, paidCount, unpaidCount, derniers });
  } catch (e) {
    console.error("❌ getEncaissementsTotaux:", e);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

