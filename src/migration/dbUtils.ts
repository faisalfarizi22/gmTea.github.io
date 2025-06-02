import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function connectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log(`Connecting to MongoDB at ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      
      await mongoose.connect(MONGODB_URI, {
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