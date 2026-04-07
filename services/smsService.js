const axios = require('axios');
require('dotenv').config();

// URL correcte confirmée via l'implémentation Python opérationnelle
const LAM_URL       = 'https://lamsms.lafricamobile.com/api';
const LAM_ACCOUNT   = process.env.LAM_ACCOUNT_ID || 'SOFTLINK_TECHNOLOGIES_01';
const LAM_PASSWORD  = process.env.LAM_PASSWORD   || 'N5WZqYLOuQdBiGF';
const LAM_SENDER    = process.env.LAM_SENDER      || 'SOFTLINK';

/**
 * Normalise un numéro de téléphone en format international Niger
 * Ex: 90000000 → 22790000000
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  // Déjà en format international
  if (cleaned.startsWith('+')) return cleaned.replace('+', '');
  if (cleaned.startsWith('00')) return cleaned.slice(2);
  // Numéro local Niger (8 chiffres)
  if (cleaned.length === 8) return `227${cleaned}`;
  // Déjà avec indicatif 227
  if (cleaned.startsWith('227')) return cleaned;
  return cleaned;
};

/**
 * Envoie un SMS via L'Africa Mobile
 * @param {string} to      - Numéro destinataire
 * @param {string} message - Contenu du SMS
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendSMS = async (to, message) => {
  const phone = normalizePhone(to);
  if (!phone) {
    console.error('❌ SMS — numéro invalide:', to);
    return { success: false, error: 'Numéro invalide' };
  }

  // Champs exacts confirmés par l'API LAM (accountid / sender / text)
  const payload = {
    accountid: LAM_ACCOUNT,
    password:  LAM_PASSWORD,
    sender:    LAM_SENDER,
    to:        phone,
    text:      message,
  };

  try {
    const response = await axios.post(LAM_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'text/plain',   // L'API LAM retourne un push_id en texte brut
      },
      timeout: 60000,
    });

    // L'API répond 200 + corps = push_id (entier) en cas de succès
    const body = typeof response.data === 'string'
      ? response.data.trim()
      : String(response.data ?? '').trim();

    if (response.status === 200) {
      const pushId = /^\d+$/.test(body) ? body : null;
      console.log(`✅ SMS envoyé → ${phone} | push_id: ${pushId || body}`);
      return { success: true, messageId: pushId || body };
    }

    console.error('❌ SMS échec API:', body);
    return { success: false, error: body };
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('❌ SMS erreur réseau:', detail);
    return { success: false, error: JSON.stringify(detail) };
  }
};

module.exports = { sendSMS, normalizePhone };
