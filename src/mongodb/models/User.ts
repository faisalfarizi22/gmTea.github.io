// src/mongodb/models/User.ts
import mongoose, { Model, Document } from 'mongoose';

// Define the interface for User document
export interface IUser extends Document {
  address: string;
  username?: string | null;
  highestBadgeTier: number;
  checkinCount: number;
  points: number;
  referrer?: string;
  lastCheckin?: Date;
  pendingRewards?: number;
  claimedRewards?: number;
  totalReferralRewards?: number;
  lastRewardClaim?: Date;
  lastRewardUpdate?: Date;
  lastRewardSync?: Date;
  createdAt: Date;
  updatedAt: Date;
  rank?: number;
  
  // Helper method for type safety
  get(path: string): any;
}

// Define the schema
const UserSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true // Index for faster queries
  },
  username: {
    type: String,
    sparse: true, // Allow null values but index when present
    unique: true,
    lowercase: true, 
    index: true
  },
  highestBadgeTier: {
    type: Number,
    default: -1 // -1 means no badge
  },
  checkinCount: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  referrer: {
    type: String,
    sparse: true // Optional field
  },
  lastCheckin: {
    type: Date,
    sparse: true // Optional timestamp of last check-in
  },
  // New fields for reward tracking
  pendingRewards: {
    type: Number,
    default: 0
  },
  claimedRewards: {
    type: Number,
    default: 0
  },
  totalReferralRewards: {
    type: Number,
    default: 0
  },
  lastRewardClaim: {
    type: Date,
    default: null
  },
  lastRewardUpdate: {
    type: Date,
    default: null
  },
  lastRewardSync: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true // Automatically add createdAt and updatedAt
});

// Add indexes for reward-related queries
UserSchema.index({ totalReferralRewards: -1 });
UserSchema.index({ pendingRewards: -1 });

// Create and export the model
let User: Model<IUser>;

// This is to prevent "OverwriteModelError" when the model is redefined in development
if (mongoose.models && mongoose.models.User) {
  User = mongoose.models.User as Model<IUser>;
} else {
  User = mongoose.model<IUser>('User', UserSchema);
}

export default User;