import dotenv from "dotenv";

dotenv.config();

interface APIKeysConfig {
  googleApiKey: string;
  firebaseApiKey: string;
  twilioApiKey: string;
  stripeApiKey: string;
}

const apiKeysConfig: APIKeysConfig = {
  googleApiKey: process.env.GOOGLE_API_KEY || "",
  firebaseApiKey: process.env.FIREBASE_API_KEY || "",
  twilioApiKey: process.env.TWILIO_API_KEY || "",
  stripeApiKey: process.env.STRIPE_API_KEY || "",
};

export default apiKeysConfig;
