// cron/checkExpiration.js
const cron = require('node-cron');
const PatrimoineFoncier = require('../models/PatrimoineFoncier');

/**
 * Vérifier les biens expirés (ALERTE UNIQUEMENT, pas de désactivation auto)
 * Exécution : Tous les jours à 00:00
 */
const checkExpiration = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🔍 Vérification des biens dont l\'abonnement a expiré...');
      
      const today = new Date();
      
      // Trouver les biens dont la date d'expiration est dépassée
      const biensExpires = await PatrimoineFoncier.find({
        dateExpirationAbonnement: { $lt: today },
        abonnementStatut: 'actif',
        visible: true,
      }).populate('clientId', 'fullName phone');
      
      if (biensExpires.length === 0) {
        console.log('✅ Aucun bien avec abonnement expiré');
        return;
      }
      
      // JUSTE ALERTER, PAS DÉSACTIVER
      console.log(`⚠️ ${biensExpires.length} bien(s) avec abonnement expiré - À TRAITER MANUELLEMENT`);
      
      for (const bien of biensExpires) {
        console.log(`⚠️ ${bien.titre} - Propriétaire: ${bien.clientId?.fullName} (${bien.clientId?.phone})`);
        
        // Marquer comme expiré mais ne pas désactiver
        if (bien.abonnementStatut !== 'expire') {
          bien.abonnementStatut = 'expire';
          await bien.save();
        }
        
        // TODO: Envoyer notification à l'admin
        // await envoyerNotificationAdmin(bien);
      }
      
    } catch (error) {
      console.error('❌ Erreur checkExpiration:', error);
    }
  });
  
  console.log('⚠️ Cron job "checkExpiration" démarré - Alerte quotidienne à 00:00 (désactivation MANUELLE)');
};

/**
 * Relancer les clients 7 jours avant expiration
 * Exécution : Tous les jours à 09:00
 */
const relanceAvantExpiration = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('🔔 Vérification des biens proches de l\'expiration...');
      
      const today = new Date();
      const dans7jours = new Date();
      dans7jours.setDate(dans7jours.getDate() + 7);
      
      const biensProchesExpiration = await PatrimoineFoncier.find({
        dateExpiration: { 
          $gte: today, 
          $lte: dans7jours 
        },
        paiementStatut: 'paye',
        visible: true,
      }).populate('clientId', 'fullName phone email');
      
      if (biensProchesExpiration.length === 0) {
        console.log('✅ Aucun bien proche de l\'expiration');
        return;
      }
      
      for (const bien of biensProchesExpiration) {
        console.log(`🔔 Relance: ${bien.titre} expire le ${bien.dateExpiration.toLocaleDateString()}`);
        
        // TODO: Envoyer SMS/Email au client
        // await envoyerRelance(bien.clientId, bien);
      }
      
      console.log(`✅ ${biensProchesExpiration.length} relance(s) envoyée(s)`);
      
    } catch (error) {
      console.error('❌ Erreur relanceAvantExpiration:', error);
    }
  });
  
  console.log('🔔 Cron job "relanceAvantExpiration" démarré - Exécution quotidienne à 09:00');
};

module.exports = { checkExpiration, relanceAvantExpiration };

