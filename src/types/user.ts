export interface UserSocialBenefits {
    usernameColor: string | null;
    avatarFrame: string | null;
    isFrameAnimated: boolean;
    chatEmotes: boolean;
    coloredText: boolean;
    messageEffects: boolean;
    profileBackground: string | null;
  }
  
  export interface UserProfile {
    address: string;
    username: string | null;
    badgeTier: number;
    checkinCount: number;
    avatarUrl: string;
    leaderboardRank: number;
    points: number;
    socialBenefits: UserSocialBenefits;
  }

  export interface GMMessage {
    user: string;
    message: string;
    timestamp: number;
  }