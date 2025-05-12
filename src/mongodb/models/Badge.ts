// src/mongodb/models/Badge.ts
import mongoose, { Document, Model } from 'mongoose';

// Define interface for Badge document
export interface IBadge extends Document {
  tokenId: number;
  owner: string;
  tier: number;
  mintedAt: Date;
  transactionHash: string;
  referrer?: string | null;
}

// Define the schema
const BadgeSchema = new mongoose.Schema({
  tokenId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: String,
    required: true,
    lowercase: true,
    index: true // Index by owner address
  },
  tier: {
    type: Number,
    required: true,
    index: true // Index by tier
  },
  mintedAt: {
    type: Date,
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  referrer: {
    type: String,
    lowercase: true,
    default: null,
    index: true // Index by referrer address
  }
}, { timestamps: true });

// Create and export the model
let Badge: Model<IBadge>;

// This prevents OverwriteModelError in development with hot reloading
if (mongoose.models && mongoose.models.Badge) {
  Badge = mongoose.models.Badge as Model<IBadge>;
} else {
  Badge = mongoose.model<IBadge>('Badge', BadgeSchema);
}

export default Badge;