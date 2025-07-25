import * as admin from "firebase-admin";
import dotenv from "dotenv";
import { logger } from "../utils/winstonLogger"; // ✅ Use winston logger instead of console.log

dotenv.config();

// Check if Firebase credentials exist
const isFirebaseEnabled =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL;

if (isFirebaseEnabled) {
  // Construct service account object
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Replace escaped newlines
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  } as admin.ServiceAccount;

  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        "https://your-project.firebaseio.com",
    });
    logger.info("✅ Firebase Initialized"); // ✅ Use winston logger
  }
} else {
  logger.warn("⚠️ Firebase is not configured. Skipping initialization."); // ✅ Replace console.log
}

export default admin;
