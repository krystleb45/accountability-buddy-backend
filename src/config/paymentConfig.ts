import Stripe from "stripe";
import https from "https";

// Validate the presence of the secret key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not defined.");
}

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
  maxNetworkRetries: 3,
  timeout: 80000,
  httpAgent: new https.Agent({ keepAlive: true }),
});


export default stripe;
