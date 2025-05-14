// src/mongodb/connection.ts
import mongoose from 'mongoose';

// Definisikan tipe untuk objek cache mongoose
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Deklarasi untuk memperluas tipe global
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined; // Ganti nama untuk menghindari kebingungan
}

// Inisialisasi cache
const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

// Tetapkan ke global jika belum diset
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function dbConnect() {
  if (cached.conn) {
    console.log('Using cached MongoDB connection.');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    // Get the MongoDB URI from environment variables
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
      );
    }

    console.log('Attempting to connect to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully.');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

// FUNGSI BARU UNTUK DISCONNECT
export async function dbDisconnect() {
  if (cached.conn) {
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('MongoDB disconnected and cache cleared.');
  } else {
    console.log('No active MongoDB connection to disconnect.');
  }
}

// Export default untuk kompatibilitas dengan kode yang sudah ada
export default dbConnect;