// scripts/fixVentesAgenceId.js
const mongoose = require("mongoose");
const Vente = require("../models/agences/Vente");
const Parcelle = require("../models/agences/Parcelle");

async function fixVentesAgenceId() {
  try {
    console.log("🔧 Début de la correction des ventes sans agenceId...");

    // Trouver toutes les ventes sans agenceId
    const ventesSansAgence = await Vente.find({ 
      $or: [
        { agenceId: { $exists: false } },
        { agenceId: null }
      ]
    });

    console.log(`📊 Trouvé ${ventesSansAgence.length} ventes sans agenceId`);

    for (const vente of ventesSansAgence) {
      console.log(`🔍 Traitement de la vente: ${vente._id}`);
      
      // Trouver l'agenceId via la parcelle
      const parcelle = await Parcelle.findById(vente.parcelle);
      
      if (parcelle && parcelle.agenceId) {
        // Mettre à jour la vente avec l'agenceId de la parcelle
        await Vente.findByIdAndUpdate(vente._id, { 
          agenceId: parcelle.agenceId 
        });
        
        console.log(`✅ Vente ${vente._id} mise à jour avec agenceId: ${parcelle.agenceId}`);
      } else {
        console.log(`⚠️  Aucune parcelle trouvée pour la vente ${vente._id}`);
      }
    }

    console.log("✅ Correction des ventes terminée !");
    
    // Vérification finale
    const ventesAvecAgence = await Vente.countDocuments({ 
      agenceId: { $exists: true, $ne: null } 
    });
    
    console.log(`📊 Vérification finale:`);
    console.log(`   - Ventes avec agenceId: ${ventesAvecAgence}`);

  } catch (error) {
    console.error("❌ Erreur lors de la correction:", error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/geofency")
    .then(() => {
      console.log("🔌 Connecté à MongoDB");
      return fixVentesAgenceId();
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

module.exports = fixVentesAgenceId;
