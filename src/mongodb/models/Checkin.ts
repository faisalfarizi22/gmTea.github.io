// src/mongodb/models/Checkin.ts
import mongoose, { Document, Model } from 'mongoose';

// Define interface for Checkin document
export interface ICheckin extends Document {
  address: string;
  checkinNumber: number;
  blockNumber: number;
  blockTimestamp: Date;
  transactionHash: string;
  points: number;
  boost: number;
  message: string;
  tierAtCheckin: number;
}

// Define the schema
const CheckinSchema = new mongoose.Schema({
  address: {
    type: String, 
    required: true,
    lowercase: true,
    index: true 
  },
  checkinNumber: {
    type: Number,
    required: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  blockTimestamp: {
    type: Date,
    required: true,
    index: true // Index for time-based queries
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  points: {
    type: Number,
    default: 10 // Default points value
  },
  boost: {
    type: Number,
    default: 1.0 // Default boost multiplier
  },
  message: {
    type: String,
    default: '' // GM message
  },
  tierAtCheckin: {
    type: Number,
    default: -1, // -1 means no badge at time of checkin
    index: true
  }
}, { timestamps: true });

// Compound index for user + checkin number
CheckinSchema.index({ address: 1, checkinNumber: 1 }, { unique: true });

// Create and export the model
let Checkin: Model<ICheckin>;

// This prevents OverwriteModelError in development with hot reloading
if (mongoose.models && mongoose.models.Checkin) {
  Checkin = mongoose.models.Checkin as Model<ICheckin>;
} else {
  Checkin = mongoose.model<ICheckin>('Checkin', CheckinSchema);
}

export default Checkin;