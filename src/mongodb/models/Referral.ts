// src/mongodb/models/Referral.ts
import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema({
  referrer: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  referee: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    index: true
  },
  txHash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  rewardsClaimed: {
    type: Boolean,
    default: false
  },
  rewardsAmount: {
    type: Number,
    default: 0
  },
  badgeTier: {
    type: Number,
    default: -1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create or ensure index creation
ReferralSchema.index({ referrer: 1 });
ReferralSchema.index({ referee: 1 }, { unique: true });
ReferralSchema.index({ txHash: 1 });

export default mongoose.models.Referral || mongoose.model('Referral', ReferralSchema);