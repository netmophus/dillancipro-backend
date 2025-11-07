const mongoose = require('mongoose');
const Location = require('../models/agences/Location');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/geofoncier';

async function fixLocationImages() {
  try {
    console.log('🔗 Connexion à la base de données...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer toutes les locations avec des images
    const locations = await Location.find({ images: { $exists: true, $ne: [] } });
    console.log(`📋 ${locations.length} locations trouvées avec des images`);

    let fixedCount = 0;

    for (const location of locations) {
      let needsUpdate = false;
      const fixedImages = [];

      for (const image of location.images) {
        if (image.url) {
          // Vérifier si l'URL a besoin d'être corrigée
          if (image.url.includes('\\') || !image.url.startsWith('http')) {
            // Corriger le séparateur de chemin et construire l'URL complète
            const correctedPath = image.url.replace(/\\/g, '/');
            const imageUrl = `http://localhost:5000/${correctedPath}`;
            
            console.log(`🔧 Correction image pour ${location.titre}:`);
            console.log(`   Ancienne URL: ${image.url}`);
            console.log(`   Nouvelle URL: ${imageUrl}`);
            
            fixedImages.push({
              ...image,
              url: imageUrl
            });
            needsUpdate = true;
          } else {
            fixedImages.push(image);
          }
        } else {
          fixedImages.push(image);
        }
      }

      if (needsUpdate) {
        await Location.findByIdAndUpdate(location._id, { images: fixedImages });
        console.log(`✅ Location ${location.titre} mise à jour`);
        fixedCount++;
      }
    }

    console.log(`🎉 Migration terminée: ${fixedCount} locations corrigées`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion de MongoDB');
  }
}

// Exécuter la migration
if (require.main === module) {
  fixLocationImages();
}

module.exports = fixLocationImages;
