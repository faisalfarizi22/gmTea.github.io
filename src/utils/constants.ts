export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
export const USERNAME_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_GMTEAUSERNAME_ADDRESS || "0x0000000000000000000000000000000000000000";
export const REFERRAL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GMTEAREFERRAL_ADDRESS || "0x0000000000000000000000000000000000000000";
export const BADGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GMTEABADGE_ADDRESS || "0x3008E2AB11193C92DE8a1c3b9314e69342EdAFD2";
export const MESSAGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GMTEACHAT_ADDRESS
export const TEA_SEPOLIA_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_TEA_SEPOLIA_CHAIN_ID || "10218", 10);
export const TEA_SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_TEA_SEPOLIA_RPC_URL || "https://tea-sepolia.g.alchemy.com/public";
export const TEA_SEPOLIA_CHAIN = {
  chainId: `0x${TEA_SEPOLIA_CHAIN_ID.toString(16)}`,
  chainName: "Tea Sepolia Testnet",
  nativeCurrency: {
    name: "Tea",
    symbol: "TEA",
    decimals: 18,
  },
  rpcUrls: [TEA_SEPOLIA_RPC_URL],
  blockExplorerUrls: [process.env.NEXT_PUBLIC_TEA_BLOCK_EXPLORER || "https://sepolia.tea.xyz"],
};

export const CHECKIN_FEE = process.env.NEXT_PUBLIC_CHECKIN_FEE || "0.01";

export const DAY_IN_MS = 86400000;

// Add deployment block for event fetching in the leaderboard
export const DEPLOY_BLOCK = parseInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "1155300", 10);

export const LOADING_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export const DEFAULT_MESSAGES = [
  "GM to all Tea enthusiasts! ☕",
  "Starting the day with a fresh cup of Tea! 🍵",
  "GM from the Tea network! 🌿",
  "Tea time and GM vibes! ✨",
  "Brewing success on the blockchain today! 🚀",
  "GM! May your transactions be as smooth as tea! 🍃",
  "Rise and shine on the Tea network! ☀️",
  "GM world! Tea-rrific day ahead! 🌱",
  "Steep, sip, and say GM! 🫖",
  "Morning brew and blockchain too! GM! 🌄"
];

export const TEA_GREETINGS = [
  "Tea-rrific morning to everyone!",
  "Steeped in blockchain goodness today!",
  "Brewing up some on-chain magic!",
  "A cup of GM to start the day right!",
  "Fresh leaves, fresh blocks, fresh day!",
  "GM! Let's spill the tea on blockchain today!",
  "High tea and high spirits on the network!",
  "Tea-ming with excitement for another blockchain day!",
  "Matcha energy for the blockchain today!",
  "Chamomile calm and blockchain charm!"
];

export const COLORS = {
  teaLight: "#e6f4ea",
  teaMedium: "#4e8a40",
  teaDark: "#2e5327",
  teaDeep: "#1e4020",
  glowColor: "rgba(78, 138, 64, 0.3)"
};

// Badge tier information
export const BADGE_TIERS = {
  COMMON: {
    id: 0,
    name: "Common",
    color: "#6b7280", // Gray
    price: "1"
  },
  UNCOMMON: {
    id: 1,
    name: "Uncommon",
    color: "#10b981", // Emerald
    price: "5"
  },
  RARE: {
    id: 2,
    name: "Rare",
    color: "#3b82f6", // Blue
    price: "12"
  },
  EPIC: {
    id: 3,
    name: "Epic",
    color: "#8b5cf6", // Purple
    price: "18"
  },
  LEGENDARY: {
    id: 4,
    name: "Legendary",
    color: "#f59e0b", // Amber/Gold
    price: "24"
  }
};

export const getRandomTeaGreeting = () => {
  const randomIndex = Math.floor(Math.random() * TEA_GREETINGS.length);
  return TEA_GREETINGS[randomIndex];
};