// src/mongodb/models/SyncStatus.ts
import mongoose, { Document, Model } from 'mongoose';

// Define interface for SyncStatus document
export interface ISyncStatus extends Document {
  contractAddress: string;
  lastProcessedBlock: number;
  lastSyncTimestamp: Date;
  isCurrentlySyncing: boolean;
}

// Define the schema
const SyncStatusSchema = new mongoose.Schema({
  contractAddress: {
    type: String,
    required: true,
    unique: true
  },
  lastProcessedBlock: {
    type: Number,
    required: true,
    default: 0
  },
  lastSyncTimestamp: {
    type: Date,
    default: Date.now
  },
  isCurrentlySyncing: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Create and export the model
let SyncStatus: Model<ISyncStatus>;

// This prevents OverwriteModelError in development with hot reloading
if (mongoose.models && mongoose.models.SyncStatus) {
  SyncStatus = mongoose.models.SyncStatus as Model<ISyncStatus>;
} else {
  SyncStatus = mongoose.model<ISyncStatus>('SyncStatus', SyncStatusSchema);
}

export default SyncStatus;