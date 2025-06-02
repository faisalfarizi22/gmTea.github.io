import { useState, useEffect } from 'react';
import { 
  useUserData as useUserDBData, 
  useUserBadges, 
  useUserCheckins, 
  useUserReferrals 
} from './useDBData';

interface UserData {
  address: string;
  username: string | null;
  highestBadgeTier: number;
  checkinCount: number;
  points: number;
  referrer?: string;
  lastCheckin?: string;
  createdAt: string;
  updatedAt: string;
  rank?: number;
}

interface BadgeData {
  tokenId: number;
  tier: number;
  tierName: string;
  mintedAt: string;
  transactionHash: string;
  referrer?: string;
}

interface CheckinData {
  checkinNumber: number;
  timestamp: string;
  transactionHash: string;
  blockNumber?: number;
  message?: string;
  points?: number;
}

interface ReferralData {
  referee: string;
  referrer: string;
  timestamp: string;
  transactionHash: string;
  rewardsClaimed: boolean;
  rewardsAmount: string;
}

interface UsernameHistory {
  username: string;
  oldUsername?: string;
  timestamp: string;
  transactionHash: string;
}

interface Activity {
  type: string;
  timestamp: string;
  details: any;
}

interface UserResponse {
  user?: UserData;
  usernameHistory?: UsernameHistory[];
}

interface BadgesResponse {
  badges?: BadgeData[];
  stats?: {
    totalBadges: number;
  };
}

interface CheckinsResponse {
  checkins?: CheckinData[];
  stats?: {
    total: number;
  };
}

interface ReferralsResponse {
  referrals?: ReferralData[];
  stats?: {
    total: number;
  };
}

export function useUserDataCombined(walletAddress: string | null) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { 
    data: userResponseRaw, 
    isLoading: userLoading, 
    error: userError, 
    refetch: refetchUser 
  } = useUserDBData(walletAddress);

  useEffect(() => {
    if (userError && (userError.message.includes('404') || userError.message.includes('Not Found'))) {
      console.warn('API endpoint not found, using fallback data', walletAddress);
      
      setUserData({
        address: walletAddress || '',
        username: null,
        highestBadgeTier: -1,
        checkinCount: 0,
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [userError, walletAddress]);
  
  const { 
    data: badgesResponseRaw, 
    isLoading: badgesLoading, 
    refetch: refetchBadges 
  } = useUserBadges(walletAddress);
  
  const { 
    data: checkinsResponseRaw, 
    isLoading: checkinsLoading, 
    refetch: refetchCheckins 
  } = useUserCheckins(walletAddress);
  
  const { 
    data: referralsResponseRaw, 
    isLoading: referralsLoading, 
    refetch: refetchReferrals 
  } = useUserReferrals(walletAddress);
  
  const userResponse = userResponseRaw as UserResponse || {};
  const badgesResponse = badgesResponseRaw as BadgesResponse || {};
  const checkinsResponse = checkinsResponseRaw as CheckinsResponse || {};
  const referralsResponse = referralsResponseRaw as ReferralsResponse || {};
  
  useEffect(() => {
    if (!userLoading && userResponse) {
      setUserData(userResponse.user || null);
    }
  }, [userResponse, userLoading]);
  
  useEffect(() => {
    if (!badgesLoading && badgesResponse) {
      setBadges(badgesResponse.badges || []);
    }
  }, [badgesResponse, badgesLoading]);
  
  useEffect(() => {
    if (!checkinsLoading && checkinsResponse) {
      setCheckins(checkinsResponse.checkins || []);
    }
  }, [checkinsResponse, checkinsLoading]);
  
  useEffect(() => {
    if (!referralsLoading && referralsResponse) {
      setReferrals(referralsResponse.referrals || []);
    }
  }, [referralsResponse, referralsLoading]);
  
  useEffect(() => {
    if (userLoading || badgesLoading || checkinsLoading || referralsLoading) {
      return;
    }
    
    const combinedActivities: Activity[] = [];
    
    (checkinsResponse.checkins || []).forEach((checkin: CheckinData) => {
      combinedActivities.push({
        type: 'checkin',
        timestamp: checkin.timestamp,
        details: checkin
      });
    });
    
    (badgesResponse.badges || []).forEach((badge: BadgeData) => {
      combinedActivities.push({
        type: 'badge',
        timestamp: badge.mintedAt,
        details: badge
      });
    });
    
    (userResponse.usernameHistory || []).forEach((history: UsernameHistory) => {
      combinedActivities.push({
        type: 'username',
        timestamp: history.timestamp,
        details: history
      });
    });
    
    (referralsResponse.referrals || []).forEach((referral: ReferralData) => {
      combinedActivities.push({
        type: 'referral',
        timestamp: referral.timestamp,
        details: referral
      });
    });
    
    const sortedActivities = combinedActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setActivities(sortedActivities);
    
    setLoading(false);
  }, [
    userResponse, badgesResponse, checkinsResponse, referralsResponse, 
    userLoading, badgesLoading, checkinsLoading, referralsLoading
  ]);
  
  const refreshAll = () => {
    refetchUser();
    refetchBadges();
    refetchCheckins();
    refetchReferrals();
  };
  
  return {
    userData,
    badges,
    checkins,
    referrals,
    activities,
    isLoading: loading || userLoading || badgesLoading || checkinsLoading || referralsLoading,
    error: userError,
    refetch: refreshAll
  };
}

export function useTierBenefits(tier: number = -1) {
  const tiers = [
    {
      name: "Common",
      color: "text-gray-300",
      bgColor: "bg-gray-700",
      price: 1,
      benefits: [
        "Access to community chat",
        "Daily GM tokens (10% boost)"
      ],
      requirements: "None"
    },
    {
      name: "Uncommon", 
      color: "text-green-400",
      bgColor: "bg-green-900",
      price: 5,
      benefits: [
        "All Common benefits",
        "Daily GM tokens (25% boost)",
        "Profile customization",
        "Early access to events"
      ],
      requirements: "Must own Common badge"
    },
    {
      name: "Rare",
      color: "text-blue-400",
      bgColor: "bg-blue-900",
      price: 12,
      benefits: [
        "All Uncommon benefits",
        "Daily GM tokens (50% boost)",
        "Special profile frame",
        "Vote on community proposals"
      ],
      requirements: "Must own Uncommon badge"
    },
    {
      name: "Epic",
      color: "text-purple-400",
      bgColor: "bg-purple-900",
      price: 18,
      benefits: [
        "All Rare benefits",
        "Daily GM tokens (100% boost)",
        "Premium profile effects",
        "Private channel access",
        "Higher referral rewards"
      ],
      requirements: "Must own Rare badge"
    },
    {
      name: "Legendary",
      color: "text-yellow-400",
      bgColor: "bg-yellow-900",
      price: 24,
      benefits: [
        "All Epic benefits",
        "Daily GM tokens (150% boost)",
        "Exclusive profile animations",
        "Community moderator status",
        "Maximum referral rewards",
        "Exclusive events access"
      ],
      requirements: "Must own Epic badge"
    }
  ];
  
  const tierInfo = tier >= 0 && tier < tiers.length ? tiers[tier] : null;
  
  const nextTier = tier >= 0 && tier < tiers.length - 1 ? tiers[tier + 1] : null;
  
  return {
    currentTier: tierInfo,
    nextTier,
    allTiers: tiers
  };
}

export default useUserDataCombined;