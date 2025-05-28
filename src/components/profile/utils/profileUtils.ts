import { BADGE_TIERS } from "@/utils/constants"

// Function to generate avatar URL using DiceBear
export const getAvatarUrl = (address: string): string => 
  `https://api.dicebear.com/6.x/identicon/svg?seed=${address}`

// Helper function to get tier color
export const getTierColor = (tier: number): string => {
  if (tier === -1) return "#6b7280" // Gray
  const tierKeys = Object.keys(BADGE_TIERS)
  if (tier >= 0 && tier < tierKeys.length) {
    const key = tierKeys[tier]
    return BADGE_TIERS[key as keyof typeof BADGE_TIERS].color
  }
  return "#6b7280" // Default gray if tier is out of range
}