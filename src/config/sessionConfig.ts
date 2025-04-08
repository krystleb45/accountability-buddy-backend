import dotenv from "dotenv";

dotenv.config();

interface SessionConfig {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  cookie: {
    secure: boolean;
    maxAge: number; // Cookie expiration in milliseconds
  };
  store?: string; // Optional store, e.g., Redis
}

const sessionConfig: SessionConfig = {
  secret: process.env.SESSION_SECRET || "default-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10), // Default: 1 day
  },
  store: process.env.SESSION_STORE || undefined, // Optional session store (e.g., Redis)
};

export default sessionConfig;