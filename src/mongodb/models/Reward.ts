// src/mongodb/models/Reward.ts
import mongoose, { Document, Model } from 'mongoose';

// Define interface for Reward document
export interface IReward extends Document {
  referrer: string;
  amount: number;
  claimedAt: Date;
  transactionHash: string;
  logIndex: number;
  blockNumber: number;
  relatedBadges?: number[];
}

// Define the schema
const RewardSchema = new mongoose.Schema({
  referrer: {
    type: String,
    required: true,
    lowercase: true,
    index: true // Index by referrer address
  },
  amount: {
    type: Number,
    required: true
  },
  claimedAt: {
    type: Date,
    required: true
  },
  transactionHash: {
    type: String,
    required: true
  },
  logIndex: {
    type: Number,
    required: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  relatedBadges: {
    type: [Number],
    default: []
  }
}, { 
  timestamps: true,
  // Create a compound index on transaction hash and log index
  // to ensure uniqueness of processed events
  indexes: [
    { 
      fields: { 
        transactionHash: 1, 
        logIndex: 1 
      }, 
      unique: true 
    }
  ]
});

// Create and export the model
let Reward: Model<IReward>;

// This prevents OverwriteModelError in development with hot reloading
if (mongoose.models && mongoose.models.Reward) {
  Reward = mongoose.models.Reward as Model<IReward>;
} else {
  Reward = mongoose.model<IReward>('Reward', RewardSchema);
}

export default Reward;