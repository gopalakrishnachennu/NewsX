const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

require('dotenv').config({ path: '.env.local' });

console.log("Initializing...");

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                    : undefined,
            }),
        });
    }
    console.log("Initialized.");

    // Try accessing firestore
    const db = getFirestore();
    console.log("Firestore instance created.");

    console.log("Success");
} catch (e) {
    console.error("Error:", e);
}
