// src/migration/dbUtils.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local if it exists
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Fallback to .env if .env.local doesn't exist
dotenv.config();

// MongoDB connection URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI || '';

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log(`Connecting to MongoDB at ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      
      await mongoose.connect(MONGODB_URI, {
        // Options
      });
      
      console.log('MongoDB connected successfully');
    } else {
      console.log('MongoDB already connected');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected successfully');
    } else {
      console.log('MongoDB already disconnected');
    }
  } catch (error) {
    console.error('MongoDB disconnect error:', error);
    throw error;
  }
}