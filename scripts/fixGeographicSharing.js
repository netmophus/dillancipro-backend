// scripts/fixGeographicSharing.js
const mongoose = require("mongoose");
const Ville = require("../models/agences/Ville");
const Quartier = require("../models/agences/Quartier");
const Zone = require("../models/agences/Zone");

async function fixGeographicSharing() {
  try {
    console.log("🔧 Début de la correction de la structure géographique...");

    // 1️⃣ CORRIGER LES VILLES
    console.log("📊 Correction des villes...");
    const villesAvecAgence = await Ville.find({ agenceId: { $exists: true, $ne: null } });
    console.log(`📊 Trouvé ${villesAvecAgence.length} villes avec agenceId`);

    for (const ville of villesAvecAgence) {
      console.log(`🔍 Traitement de la ville: ${ville.nom}`);
      
      // Retirer l'agenceId
      await Ville.findByIdAndUpdate(ville._id, { 
        $unset: { agenceId: 1 } 
      });
      
      console.log(`✅ Ville ${ville.nom} mise à jour (agenceId retiré)`);
    }

    // 2️⃣ CORRIGER LES QUARTIERS
    console.log("📊 Correction des quartiers...");
    const quartiersAvecAgence = await Quartier.find({ agenceId: { $exists: true, $ne: null } });
    console.log(`📊 Trouvé ${quartiersAvecAgence.length} quartiers avec agenceId`);

    for (const quartier of quartiersAvecAgence) {
      console.log(`🔍 Traitement du quartier: ${quartier.nom}`);
      
      // Retirer l'agenceId
      await Quartier.findByIdAndUpdate(quartier._id, { 
        $unset: { agenceId: 1 } 
      });
      
      console.log(`✅ Quartier ${quartier.nom} mis à jour (agenceId retiré)`);
    }

    // 3️⃣ CORRIGER LES ZONES
    console.log("📊 Correction des zones...");
    const zonesAvecAgence = await Zone.find({ agenceId: { $exists: true, $ne: null } });
    console.log(`📊 Trouvé ${zonesAvecAgence.length} zones avec agenceId`);

    for (const zone of zonesAvecAgence) {
      console.log(`🔍 Traitement de la zone: ${zone.nom}`);
      
      // Retirer l'agenceId
      await Zone.findByIdAndUpdate(zone._id, { 
        $unset: { agenceId: 1 } 
      });
      
      console.log(`✅ Zone ${zone.nom} mise à jour (agenceId retiré)`);
    }

    console.log("✅ Correction de la structure géographique terminée !");
    
    // Vérification finale
    const villesSansAgence = await Ville.countDocuments({ 
      agenceId: { $exists: false } 
    });
    const quartiersSansAgence = await Quartier.countDocuments({ 
      agenceId: { $exists: false } 
    });
    const zonesSansAgence = await Zone.countDocuments({ 
      agenceId: { $exists: false } 
    });
    
    console.log(`📊 Vérification finale:`);
    console.log(`   - Villes sans agenceId: ${villesSansAgence}`);
    console.log(`   - Quartiers sans agenceId: ${quartiersSansAgence}`);
    console.log(`   - Zones sans agenceId: ${zonesSansAgence}`);

  } catch (error) {
    console.error("❌ Erreur lors de la correction:", error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/geofency")
    .then(() => {
      console.log("🔌 Connecté à MongoDB");
      return fixGeographicSharing();
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

module.exports = fixGeographicSharing;
