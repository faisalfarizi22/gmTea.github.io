import { UserSocialBenefits } from "@/types/user";
import { BADGE_TIERS } from "./constants";

const memoryCache: Record<string, {data: any, timestamp: number}> = {};
const CACHE_TTL = 5 * 60 * 1000; 
export const cacheData = (key: string, data: any) => {
  memoryCache[key] = {
    data,
    timestamp: Date.now()
  };
};

export const getCachedData = (key: string): any | null => {
  const cachedItem = memoryCache[key];
  if (!cachedItem) return null;
  
  if (Date.now() - cachedItem.timestamp > CACHE_TTL) {
    delete memoryCache[key];
    return null;
  }
  
  return cachedItem.data;
};

export const getUsernameColor = (badgeTier: number): string | null => {
  try {
    if (badgeTier < 1) return null; 
    
    const tierKey = Object.keys(BADGE_TIERS).find(
      (key) => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === badgeTier
    );
    
    if (!tierKey) return null;
    return BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].color;
  } catch (error) {
    console.error("Error getting username color:", error);
    return null;
  }
};

export const getAvatarFrame = (badgeTier: number): { url: string, isAnimated: boolean } | null => {
  try {
    if (badgeTier < 2) return null; 
    
    const safeTier = Math.min(badgeTier, 4);
    
    return {
      url: `/assets/frames/tier-${safeTier}.png`,
      isAnimated: safeTier >= 3 
    };
  } catch (error) {
    console.error("Error getting avatar frame:", error);
    return null;
  }
};

export const getChatPrivileges = (badgeTier: number) => {
  try {
    return {
      customEmotes: badgeTier >= 2, 
      coloredText: badgeTier >= 3,  
      messageEffects: badgeTier >= 4 
    };
  } catch (error) {
    console.error("Error getting chat privileges:", error);
    return {
      customEmotes: false,
      coloredText: false,
      messageEffects: false
    };
  }
};

export const getUserSocialBenefits = (badgeTier: number): UserSocialBenefits => {
  try {
    const avatarFrame = getAvatarFrame(badgeTier);
    const chatPrivileges = getChatPrivileges(badgeTier);
    
    return {
      usernameColor: getUsernameColor(badgeTier),
      avatarFrame: avatarFrame?.url || null,
      isFrameAnimated: avatarFrame?.isAnimated || false,
      chatEmotes: chatPrivileges.customEmotes,
      coloredText: chatPrivileges.coloredText,
      messageEffects: chatPrivileges.messageEffects,
      profileBackground: badgeTier >= 3 ? `/assets/backgrounds/tier-${Math.min(badgeTier, 4)}.png` : null
    };
  } catch (error) {
    console.error("Error getting user social benefits:", error);
    return {
      usernameColor: null,
      avatarFrame: null,
      isFrameAnimated: false,
      chatEmotes: false,
      coloredText: false,
      messageEffects: false,
      profileBackground: null
    };
  }
};

export const getTierName = (tier: number): string => {
  try {
    switch (tier) {
      case 0: return "Common";
      case 1: return "Uncommon";
      case 2: return "Rare";
      case 3: return "Epic";
      case 4: return "Legendary";
      default: return "No Badge";
    }
  } catch (error) {
    console.error("Error getting tier name:", error);
    return "Unknown";
  }
};

export const processMessageEmotes = (message: string, badgeTier: number): string => {
  try {
    const chatPrivileges = getChatPrivileges(badgeTier);
    
    if (!chatPrivileges.customEmotes) return message;
    
    const emotes: Record<string, string> = {
      'tea': '🍵',
      'leaf': '🍃',
      'gm': '☀️',
      'check': '✅',
      'fire': '🔥',
      'rocket': '🚀',
      'heart': '❤️',
      'star': '⭐',
      'money': '💰',
      'smile': '😊'
    };
    
    return message.replace(/:([\w-]+):/g, (match, code) => {
      return emotes[code] || match;
    });
  } catch (error) {
    console.error("Error processing message emotes:", error);
    return message; 
  }
};

export const getProfileBackground = (badgeTier: number): string | null => {
    try {
      if (badgeTier < 3) return null;
      const safeTier = Math.min(badgeTier, 4);
      
      return `/assets/backgrounds/Tier-${safeTier}.png`;
    } catch (error) {
      console.error("Error getting profile background:", error);
      return null;
    }
  };