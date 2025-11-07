// scripts/fixGeographicEntitiesAgenceId.js
const mongoose = require("mongoose");
const Ville = require("../models/agences/Ville");
const Quartier = require("../models/agences/Quartier");
const Zone = require("../models/agences/Zone");
const Ilot = require("../models/agences/Ilot");
const Agence = require("../models/Agence");

async function fixGeographicEntitiesAgenceId() {
  try {
    console.log("🔧 Début de la correction des entités géographiques sans agenceId...");

    // 1. Corriger les Villes
    const villesSansAgence = await Ville.find({ 
      $or: [
        { agenceId: { $exists: false } },
        { agenceId: null }
      ]
    });

    console.log(`📊 Trouvé ${villesSansAgence.length} villes sans agenceId`);

    // Pour les villes, on peut les associer à la première agence trouvée
    const premiereAgence = await Agence.findOne();
    if (premiereAgence && villesSansAgence.length > 0) {
      await Ville.updateMany(
        { 
          $or: [
            { agenceId: { $exists: false } },
            { agenceId: null }
          ]
        },
        { agenceId: premiereAgence._id }
      );
      console.log(`✅ ${villesSansAgence.length} villes associées à l'agence: ${premiereAgence.nom}`);
    }

    // 2. Corriger les Quartiers
    const quartiersSansAgence = await Quartier.find({ 
      $or: [
        { agenceId: { $exists: false } },
        { agenceId: null }
      ]
    });

    console.log(`📊 Trouvé ${quartiersSansAgence.length} quartiers sans agenceId`);

    for (const quartier of quartiersSansAgence) {
      // Trouver l'agence via la ville du quartier
      const ville = await Ville.findById(quartier.ville);
      if (ville && ville.agenceId) {
        await Quartier.findByIdAndUpdate(quartier._id, { 
          agenceId: ville.agenceId 
        });
        console.log(`✅ Quartier ${quartier.nom} associé à l'agence via sa ville`);
      }
    }

    // 3. Corriger les Zones
    const zonesSansAgence = await Zone.find({ 
      $or: [
        { agenceId: { $exists: false } },
        { agenceId: null }
      ]
    });

    console.log(`📊 Trouvé ${zonesSansAgence.length} zones sans agenceId`);

    for (const zone of zonesSansAgence) {
      // Trouver l'agence via le quartier de la zone
      const quartier = await Quartier.findById(zone.quartier);
      if (quartier && quartier.agenceId) {
        await Zone.findByIdAndUpdate(zone._id, { 
          agenceId: quartier.agenceId 
        });
        console.log(`✅ Zone ${zone.nom} associée à l'agence via son quartier`);
      }
    }

    // 4. Corriger les Îlots
    const ilotsSansAgence = await Ilot.find({ 
      $or: [
        { agenceId: { $exists: false } },
        { agenceId: null }
      ]
    });

    console.log(`📊 Trouvé ${ilotsSansAgence.length} îlots sans agenceId`);

    for (const ilot of ilotsSansAgence) {
      // Trouver l'agence via la zone de l'îlot
      const zone = await Zone.findById(ilot.zone);
      if (zone && zone.agenceId) {
        await Ilot.findByIdAndUpdate(ilot._id, { 
          agenceId: zone.agenceId 
        });
        console.log(`✅ Îlot ${ilot.numeroIlot} associé à l'agence via sa zone`);
      }
    }

    console.log("✅ Correction des entités géographiques terminée !");
    
    // Vérification finale
    const villesAvecAgence = await Ville.countDocuments({ 
      agenceId: { $exists: true, $ne: null } 
    });
    const quartiersAvecAgence = await Quartier.countDocuments({ 
      agenceId: { $exists: true, $ne: null } 
    });
    const zonesAvecAgence = await Zone.countDocuments({ 
      agenceId: { $exists: true, $ne: null } 
    });
    const ilotsAvecAgence = await Ilot.countDocuments({ 
      agenceId: { $exists: true, $ne: null } 
    });
    
    console.log(`📊 Vérification finale:`);
    console.log(`   - Villes avec agenceId: ${villesAvecAgence}`);
    console.log(`   - Quartiers avec agenceId: ${quartiersAvecAgence}`);
    console.log(`   - Zones avec agenceId: ${zonesAvecAgence}`);
    console.log(`   - Îlots avec agenceId: ${ilotsAvecAgence}`);

  } catch (error) {
    console.error("❌ Erreur lors de la correction:", error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/geofency")
    .then(() => {
      console.log("🔌 Connecté à MongoDB");
      return fixGeographicEntitiesAgenceId();
    })
    .then(() => {
      console.log("✅ Script terminé");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erreur:", error);
      process.exit(1);
    });
}

module.exports = fixGeographicEntitiesAgenceId;
