const mongoose = require("mongoose");
const PatrimoineFoncier = require("./models/PatrimoineFoncier");

// Connexion à MongoDB
mongoose.connect("mongodb://localhost:27017/geofoncier", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkPatrimoine() {
  try {
    console.log("🔍 [CHECK_PATRIMOINE] Vérification des biens immobiliers...");
    
    // Récupérer tous les biens
    const allBiens = await PatrimoineFoncier.find({});
    console.log(`📊 [CHECK_PATRIMOINE] Total des biens: ${allBiens.length}`);
    
    // Vérifier les champs visible et statutVerification
    allBiens.forEach((bien, index) => {
      console.log(`\n🏠 [CHECK_PATRIMOINE] Bien ${index + 1}:`);
      console.log(`   ID: ${bien._id}`);
      console.log(`   Titre: ${bien.titre}`);
      console.log(`   Type: ${bien.type}`);
      console.log(`   Valeur estimée: ${bien.valeurEstimee}`);
      console.log(`   Visible: ${bien.visible}`);
      console.log(`   Statut vérification: ${bien.statutVerification}`);
      console.log(`   Images: ${bien.images?.length || 0}`);
      console.log(`   Localisation: ${bien.localisation?.ville || 'Non spécifiée'}`);
      
      // Vérifier les champs manquants
      const missingFields = [];
      if (bien.visible === undefined) missingFields.push('visible');
      if (bien.statutVerification === undefined) missingFields.push('statutVerification');
      
      if (missingFields.length > 0) {
        console.log(`   ⚠️  Champs manquants: ${missingFields.join(', ')}`);
      } else {
        console.log(`   ✅ Tous les champs requis sont présents`);
      }
    });
    
    // Compter les biens avec les champs requis
    const biensWithVisible = await PatrimoineFoncier.countDocuments({ visible: true });
    const biensWithStatutVerification = await PatrimoineFoncier.countDocuments({ statutVerification: "verifie" });
    const biensPublics = await PatrimoineFoncier.countDocuments({ 
      visible: true, 
      statutVerification: "verifie" 
    });
    
    console.log(`\n📈 [CHECK_PATRIMOINE] Statistiques:`);
    console.log(`   Biens avec visible=true: ${biensWithVisible}`);
    console.log(`   Biens avec statutVerification="verifie": ${biensWithStatutVerification}`);
    console.log(`   Biens publics (visible=true ET statutVerification="verifie"): ${biensPublics}`);
    
    if (biensPublics === 0) {
      console.log(`\n⚠️  [CHECK_PATRIMOINE] Aucun bien public trouvé!`);
      console.log(`   Il faut soit:`);
      console.log(`   1. Ajouter les champs 'visible' et 'statutVerification' aux biens existants`);
      console.log(`   2. Ou modifier la requête pour ne pas filtrer sur ces champs`);
    }
    
  } catch (error) {
    console.error("❌ [CHECK_PATRIMOINE] Erreur:", error);
  } finally {
    mongoose.connection.close();
  }
}

checkPatrimoine();
