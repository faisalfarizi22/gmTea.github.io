export interface GMMessage {
  user: string;
  timestamp: number;
  message: string;
}

export interface UserCheckin {
  lastCheckinTime: number;
  checkinCount: number;
}

export interface Web3State {
  isConnected: boolean;
  address: string | null;
  provider: any;
  signer: any;
  contract: any;
  isLoading: boolean;
  error: string | null;
  chainId: number | null;
}

export interface CheckinStats {
  userCheckinCount: number;
  timeUntilNextCheckin: number;
}

export interface ProfileProps {
  address: string | null;
  checkinCount: number;
  leaderboardRank: number;
  leaderboardPoints: number;
  isLoading?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  progress?: number;
  total?: number;
  icon: string;
}

export interface UserProfile {
  address: string;
  username: string;
  checkinCount: number;
  leaderboardRank: number;
  leaderboardPoints: number;
  referralCount: number;
  tier: string;
  level: number;
  achievements: Achievement[];
  lastCheckin?: number;
}