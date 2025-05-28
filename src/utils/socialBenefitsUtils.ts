// utils/socialBenefitsUtils.ts
import { UserSocialBenefits } from "@/types/user";
import { BADGE_TIERS } from "./constants";

// Definisikan cache memori sederhana
const memoryCache: Record<string, {data: any, timestamp: number}> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

/**
 * Fungsi cache sederhana
 */
export const cacheData = (key: string, data: any) => {
  memoryCache[key] = {
    data,
    timestamp: Date.now()
  };
};

/**
 * Mendapatkan data dari cache
 */
export const getCachedData = (key: string): any | null => {
  const cachedItem = memoryCache[key];
  if (!cachedItem) return null;
  
  if (Date.now() - cachedItem.timestamp > CACHE_TTL) {
    delete memoryCache[key];
    return null;
  }
  
  return cachedItem.data;
};

/**
 * Get username color based on user's badge tier
 * Menangani error dengan mengembalikan nilai default
 */
export const getUsernameColor = (badgeTier: number): string | null => {
  try {
    if (badgeTier < 1) return null; // Common tier tidak memiliki username berwarna
    
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

/**
 * Get avatar frame path based on user's badge tier
 * Menangani error dengan mengembalikan nilai default
 */
export const getAvatarFrame = (badgeTier: number): { url: string, isAnimated: boolean } | null => {
  try {
    if (badgeTier < 2) return null; // Rare tier dan di atasnya yang memiliki frame
    
    // Pastikan badge tier maksimal 4 (Legendary)
    const safeTier = Math.min(badgeTier, 4);
    
    return {
      url: `/assets/frames/tier-${safeTier}.png`,
      isAnimated: safeTier >= 3 // Epic dan Legendary memiliki animasi
    };
  } catch (error) {
    console.error("Error getting avatar frame:", error);
    return null;
  }
};

/**
 * Get chat privileges based on user's badge tier
 * Menangani error dengan mengembalikan nilai default
 */
export const getChatPrivileges = (badgeTier: number) => {
  try {
    return {
      customEmotes: badgeTier >= 2, // Rare and above
      coloredText: badgeTier >= 3,  // Epic and above
      messageEffects: badgeTier >= 4 // Legendary only
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

/**
 * Get all social benefits for a user based on their highest badge tier
 * Menangani error dengan mengembalikan nilai default
 */
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

/**
 * Get tier name for display
 * Menangani error dengan mengembalikan nilai default
 */
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

/**
 * Process message text to replace emote codes with emojis
 * Only works if user has customEmotes privilege
 * Menangani error dengan mengembalikan pesan asli
 */
export const processMessageEmotes = (message: string, badgeTier: number): string => {
  try {
    const chatPrivileges = getChatPrivileges(badgeTier);
    
    if (!chatPrivileges.customEmotes) return message;
    
    // Map of emote codes to emojis
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
    
    // Replace :code: with corresponding emoji
    return message.replace(/:([\w-]+):/g, (match, code) => {
      return emotes[code] || match;
    });
  } catch (error) {
    console.error("Error processing message emotes:", error);
    return message; // Return original message if any error
  }
};

/**
 * Get profile background path based on user's badge tier
 */
export const getProfileBackground = (badgeTier: number): string | null => {
    try {
      // Background hanya tersedia untuk tier 3 (Epic) dan 4 (Legendary)
      if (badgeTier < 3) return null;
      
      // Pastikan badge tier maksimal 4 (Legendary)
      const safeTier = Math.min(badgeTier, 4);
      
      return `/assets/backgrounds/Tier-${safeTier}.png`;
    } catch (error) {
      console.error("Error getting profile background:", error);
      return null;
    }
  };