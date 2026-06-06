const { onCall, HttpsError } = require('firebase-functions/v2/https');

exports.extractProduct = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { image: '', title: '', price: 0, siteName: '' };
});
