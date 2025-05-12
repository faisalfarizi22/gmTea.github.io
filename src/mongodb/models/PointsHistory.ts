// src/mongodb/models/PointsHistory.ts
import mongoose, { Document, Model } from 'mongoose';

// Define interface for PointsHistory document
export interface IPointsHistory extends Document {
  address: string;
  points: number;
  reason: string;
  source: 'checkin' | 'achievement' | 'referral' | 'other';
  timestamp: Date;
}

// Define the schema
const PointsHistorySchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  points: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['checkin', 'achievement', 'referral', 'other'],
    default: 'other'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Create and export the model
let PointsHistory: Model<IPointsHistory>;

// This prevents OverwriteModelError in development with hot reloading
if (mongoose.models && mongoose.models.PointsHistory) {
  PointsHistory = mongoose.models.PointsHistory as Model<IPointsHistory>;
} else {
  PointsHistory = mongoose.model<IPointsHistory>('PointsHistory', PointsHistorySchema);
}

export default PointsHistory;