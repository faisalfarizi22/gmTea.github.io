export interface BadgeMetadata {
    tier: number;
    mintTimestamp: number;
  }
  
  export interface Badge {
    tokenId: number;
    tier: number;
    tierName: string;
    mintedAt: number;
  }
  
  export interface UserBadgeInfo {
    hasBadges: boolean;
    badges: Badge[];
    highestTier: number;
    highestTierName: string;
    canUpgrade: boolean;
    nextTier?: number;
    nextTierName?: string;
  }
  
  export interface MintingState {
    isLoading: boolean;
    error: string | null;
    success: boolean;
    txHash: string | null;
  }
  
  export interface RefundPolicy {
    timeThreshold: number; 
    refundPercentage: number; 
  }
  
  export interface ReferralStats {
    totalReferrals: number;
    pendingRewardsAmount: string; 
    claimedRewardsAmount: string; 
  }
  
  export enum RegistrationType {
    None = "none",
    Username = "username",
    Referral = "referral"
  }
  
  export interface RegistrationState {
    type: RegistrationType;
    username: string;
    referrerUsername: string;
    isLoading: boolean;
    error: string | null;
    success: boolean;
    txHash: string | null;
  }