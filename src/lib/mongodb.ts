import { MongoClient, Db } from 'mongodb';

// Function to get the URI dynamically to avoid stale closures in dev
function getMongoUri(): string | undefined {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (uri && uri.includes('localhost')) {
    console.warn('⚠️ Warning: Using local MongoDB URI even though Atlas might be intended if MONGO_URI is not set first.');
  }
  return uri;
}

function getDbName(): string {
  return process.env.MONGO_DB || process.env.MONGODB_DB_NAME || 'vidinsight';
}

export function isMongoConfigured(): boolean {
  return !!getMongoUri();
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

async function createClientPromise(uri: string): Promise<MongoClient> {
  // Log masked URI for verification
  const maskedUri = uri.replace(/\/\/.*:.*@/, '//****:****@');
  console.log(`🚀 Attempting to connect to MongoDB with URI: ${maskedUri}`);
  
  const newClient = new MongoClient(uri);
  try {
    const connectedClient = await newClient.connect();
    console.log('✅ MongoDB connected successfully!');
    return connectedClient;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Db> {
  const uri = getMongoUri();
  const dbName = getDbName();

  if (!uri) {
    throw new Error('MongoDB is not configured. Please add MONGO_URI to .env');
  }

  if (process.env.NODE_ENV === 'development') {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
      _currentUri?: string;
    };

    // If URI changed, we MUST re-create the promise
    if (globalWithMongo._currentUri !== uri) {
      console.log('🔄 MongoDB URI changed, re-creating connection...');
      globalWithMongo._currentUri = uri;
      globalWithMongo._mongoClientPromise = createClientPromise(uri);
    }

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = createClientPromise(uri);
    }
    
    const client = await globalWithMongo._mongoClientPromise;
    return client.db(dbName);
  }

  if (!clientPromise) {
    clientPromise = createClientPromise(uri);
  }
  const client = await clientPromise;
  return client.db(dbName);
}

