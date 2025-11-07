// scripts/fixCommerciauxAgenceId.js
const mongoose = require("mongoose");
const User = require("../models/User");
const ProfilCommercial = require("../models/agences/ProfilCommercial");

async function fixCommerciauxAgenceId() {
  try {
    console.log("🔧 Début de la correction des commerciaux sans agenceId...");

    // Trouver tous les commerciaux sans agenceId
    const commerciauxSansAgence = await User.find({ 
      role: "Commercial", 
      $or: [
        { agenceId: { $exists: false } },
        { agenceId: null }
      ]
    });

    console.log(`📊 Trouvé ${commerciauxSansAgence.length} commerciaux sans agenceId`);

    for (const commercial of commerciauxSansAgence) {
      console.log(`🔍 Traitement du commercial: ${commercial.fullName} (${commercial.phone})`);

      // Chercher le ProfilCommercial correspondant
      const profil = await ProfilCommercial.findOne({ userId: commercial._id });
      
      if (profil && profil.agenceId) {
        // Mettre à jour le commercial avec l'agenceId du profil
        await User.findByIdAndUpdate(commercial._id, { 
          agenceId: profil.agenceId 
        });
        
        console.log(`✅ Commercial ${commercial.fullName} mis à jour avec agenceId: ${profil.agenceId}`);
      } else {
        console.log(`⚠️  Aucun profil commercial trouvé pour ${commercial.fullName}`);
      }
    }

    console.log("✅ Correction terminée !");
    
    // Vérification finale
    const commerciauxAvecAgence = await User.countDocuments({ 
      role: "Commercial", 
      agenceId: { $exists: true, $ne: null } 
    });
    
    console.log(`📊 Nombre de commerciaux avec agenceId: ${commerciauxAvecAgence}`);

  } catch (error) {
    console.error("❌ Erreur lors de la correction:", error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/geofency")
    .then(() => {
      console.log("🔌 Connecté à MongoDB");
      return fixCommerciauxAgenceId();
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

module.exports = fixCommerciauxAgenceId;
