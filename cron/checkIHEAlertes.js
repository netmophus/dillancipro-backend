// cron/checkIHEAlertes.js
const cron = require('node-cron');
const IHE = require('../models/banque/IHE');
const User = require('../models/User');

/**
 * Vérifier et mettre à jour les statuts d'alerte réglementaire des IHE
 * Exécution : Tous les jours à 08:00
 */
const checkIHEAlertesReglementaires = () => {
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('🔍 Vérification des alertes réglementaires des IHE...');
      
      const maintenant = new Date();
      
      // Récupérer toutes les IHE avec une date limite de cession
      const ihes = await IHE.find({
        dateLimiteCession: { $exists: true, $ne: null },
        statut: { $nin: ["vendu", "rejete"] }, // Exclure les IHE vendues ou rejetées
      }).populate('banqueId', 'fullName email phone');
      
      if (ihes.length === 0) {
        console.log('✅ Aucune IHE avec date limite de cession');
        return;
      }
      
      let updated = 0;
      let depasse = 0;
      let urgent = 0;
      let attention = 0;
      
      for (const ihe of ihes) {
        const dateLimite = new Date(ihe.dateLimiteCession);
        const diffMs = dateLimite - maintenant;
        const diffMois = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
        
        let nouveauStatut = ihe.statutAlerteReglementaire;
        
        if (diffMs < 0) {
          // Date limite dépassée
          nouveauStatut = "depasse";
          depasse++;
        } else if (diffMois <= 3) {
          // Moins de 3 mois avant la date limite
          nouveauStatut = "urgent";
          urgent++;
        } else if (diffMois <= 6) {
          // Entre 3 et 6 mois avant la date limite
          nouveauStatut = "attention";
          attention++;
        } else {
          // Plus de 6 mois avant la date limite
          nouveauStatut = "ok";
        }
        
        // Mettre à jour si le statut a changé
        if (nouveauStatut !== ihe.statutAlerteReglementaire) {
          ihe.statutAlerteReglementaire = nouveauStatut;
          ihe.derniereVerificationAlerte = maintenant;
          await ihe.save();
          updated++;
          
          // Log pour les cas critiques
          if (nouveauStatut === "depasse" || nouveauStatut === "urgent") {
            console.log(`⚠️ IHE ${ihe.reference} (${ihe.titre}) - Statut: ${nouveauStatut} - Date limite: ${dateLimite.toLocaleDateString()}`);
          }
        }
      }
      
      console.log(`✅ Vérification terminée: ${updated} IHE mise(s) à jour`);
      console.log(`   - Dépassées: ${depasse}`);
      console.log(`   - Urgentes: ${urgent}`);
      console.log(`   - Attention: ${attention}`);
      
      // TODO: Envoyer notifications aux managers banque pour les IHE critiques
      // await envoyerNotificationsAlertes(ihesCritiques);
      
    } catch (error) {
      console.error('❌ Erreur checkIHEAlertesReglementaires:', error);
    }
  });
  
  console.log('⚠️ Cron job "checkIHEAlertesReglementaires" démarré - Exécution quotidienne à 08:00');
};

/**
 * Générer un rapport hebdomadaire des IHE à risque
 * Exécution : Tous les lundis à 09:00
 */
const rapportHebdomadaireIHE = () => {
  cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('📊 Génération du rapport hebdomadaire des IHE à risque...');
      
      const maintenant = new Date();
      const dans3mois = new Date();
      dans3mois.setMonth(dans3mois.getMonth() + 3);
      
      // IHE dépassant la date limite
      const ihesDepassees = await IHE.find({
        dateLimiteCession: { $lt: maintenant },
        statut: { $nin: ["vendu", "rejete"] },
      }).populate('banqueId', 'fullName').populate('saisiPar', 'fullName');
      
      // IHE approchant la date limite (moins de 3 mois)
      const ihesUrgentes = await IHE.find({
        dateLimiteCession: { 
          $gte: maintenant, 
          $lte: dans3mois 
        },
        statut: { $nin: ["vendu", "rejete"] },
      }).populate('banqueId', 'fullName').populate('saisiPar', 'fullName');
      
      console.log(`📊 Rapport hebdomadaire:`);
      console.log(`   - IHE dépassant la date limite: ${ihesDepassees.length}`);
      console.log(`   - IHE urgentes (< 3 mois): ${ihesUrgentes.length}`);
      
      // TODO: Envoyer le rapport par email aux managers et à la direction
      // await envoyerRapportHebdomadaire(ihesDepassees, ihesUrgentes);
      
    } catch (error) {
      console.error('❌ Erreur rapportHebdomadaireIHE:', error);
    }
  });
  
  console.log('📊 Cron job "rapportHebdomadaireIHE" démarré - Exécution hebdomadaire le lundi à 09:00');
};

module.exports = { 
  checkIHEAlertesReglementaires, 
  rapportHebdomadaireIHE 
};

