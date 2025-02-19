// User type definition
export interface User {
  id: string; // Unique user identifier
  name: string; // User's name
  email: string; // User's email address
  passwordHash?: string; // Optional password hash for scenarios excluding password
  role?: "user" | "admin"; // Optional role for authorization
  isActive?: boolean; // Indicates if the user is active
  createdAt?: Date; // Timestamp for account creation
  updatedAt?: Date; // Timestamp for last update
}

// Token payload type for JWT
export interface TokenPayload {
  id: string; // User ID
  email: string; // Email address
  role?: "user" | "admin"; // Role for authorization
  iat: number; // Issued at
  exp: number; // Expiry
}

// Redis client configuration
export interface RedisConfig {
  host: string; // Redis server hostname
  port: number; // Redis server port
  password?: string; // Optional Redis password for authentication
  tls?: boolean; // Indicates if TLS is enabled for secure communication
}

// General key-value pair type for dynamic objects
export interface KeyValue {
  [key: string]: any; // Flexible key-value pairs
}
