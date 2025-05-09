import { useState, useCallback } from "react"
import { ethers } from "ethers"
import { Web3State } from "@/types"
import { getUserHighestTier, getUserBadges, checkUsername, checkReferrer, getProvider } from "@/utils/badgeWeb3"
import { getUserLeaderboardRank } from "@/utils/leaderboradUtils"
import { getUserBenefits, getUserReferralStats } from "@/utils/rewardsUtils"
import { NotificationType } from "./useNotifications"

interface UserData {
  checkinCount: number
  leaderboardRank: number
  leaderboardPoints: number
  hasUsername: boolean | null
  username: string | null
  hasReferrer: boolean
  highestTier: number
  userBadges: any[]
  activeBenefits: string[]
  referralStats: {
    totalReferrals: number
    totalRewards: string
    pendingRewards: string
    highestTier: number
  }
  isLoadingUserData: boolean
  dataLoaded: boolean
}

interface UseUserDataProps {
  web3State: Web3State
  addNotification: (message: string, type: NotificationType) => void
}

export function useUserData({ web3State, addNotification }: UseUserDataProps) {
  // Initialize user data state with default values
  const [userData, setUserData] = useState<UserData>({
    checkinCount: 0,
    leaderboardRank: 0,
    leaderboardPoints: 0,
    hasUsername: null,
    username: null,
    hasReferrer: false,
    highestTier: -1,
    userBadges: [],
    activeBenefits: [],
    referralStats: {
      totalReferrals: 0,
      totalRewards: "0",
      pendingRewards: "0",
      highestTier: 0,
    },
    isLoadingUserData: false,
    dataLoaded: false
  })

  // Load user data
  const loadUserData = useCallback(async (address: string, contract: ethers.Contract) => {
    if (!address || !contract) {
      setUserData(prev => ({ ...prev, isLoadingUserData: false }))
      return
    }

    setUserData(prev => ({ ...prev, isLoadingUserData: true }))
    addNotification("Loading your profile data...", "info")

    try {
      // Get check-in count
      let count = 0
      try {
        const checkinData = await contract.getCheckinCount(address)
        count = ethers.BigNumber.isBigNumber(checkinData) ? checkinData.toNumber() : Number(checkinData)
      } catch (e) {
        console.warn("Error loading check-in count:", e)

        try {
          // Fallback to direct mapping access if function fails
          const userDataResult = await contract.userCheckins(address)
          if (userDataResult && userDataResult.checkinCount) {
            count = ethers.BigNumber.isBigNumber(userDataResult.checkinCount)
              ? userDataResult.checkinCount.toNumber()
              : Number(userDataResult.checkinCount)
          }
        } catch (mappingError) {
          console.warn("Error accessing user data:", mappingError)
        }
      }

      // Get leaderboard rank
      let rank = 0
      try {
        const userRank = await getUserLeaderboardRank(contract, address)
        rank = userRank !== null ? userRank : 0
      } catch (rankError) {
        console.warn("Error getting leaderboard rank:", rankError)
        // Fallback rank calculation
        rank = count > 0 ? Math.max(1, Math.floor(100 / (count + 1))) : 0
      }

      // Calculate points - 10 points per check-in plus bonuses
      let points = count * 10

      // Add bonus points based on check-in milestones
      if (count >= 50) points += 500
      else if (count >= 25) points += 250
      else if (count >= 10) points += 100
      else if (count >= 5) points += 50

      // Also add bonus based on rank if available
      if (rank > 0 && rank <= 10) {
        // Top 10 bonus
        points += 1000 - (rank - 1) * 100
      } else if (rank > 10 && rank <= 50) {
        // Top 50 bonus
        points += 100
      }

      // Check if user has a username
      let usernameResult = null
      let hasUsernameResult = null
      let hasReferrerResult = false
      
      try {
        const badgeProvider = getProvider()
        if (badgeProvider) {
          usernameResult = await checkUsername(address)
          hasUsernameResult = !!usernameResult
          
          // Check if user has a referrer (only if they have a username)
          if (hasUsernameResult) {
            hasReferrerResult = await checkReferrer(address)
          }
        }
      } catch (e) {
        console.warn("Error checking username:", e)
      }

      // Load user badges and tier information
      let highestTierResult = -1
      let userBadgesResult: any[] = []
      
      try {
        highestTierResult = await getUserHighestTier(address)
        userBadgesResult = await getUserBadges(address) || []
      } catch (e) {
        console.warn("Error loading badges:", e)
      }

      // Load active benefits
      let benefitsResult: string[] = []
      try {
        benefitsResult = await getUserBenefits(address) || []
      } catch (e) {
        console.warn("Error loading benefits:", e)
      }

      // Load referral stats
      let referralStatsResult = {
        totalReferrals: 0,
        totalRewards: "0",
        pendingRewards: "0",
        highestTier: 0,
      }
      
      try {
        const stats = await getUserReferralStats(address)
        if (stats) {
          referralStatsResult = stats
        }
      } catch (e) {
        console.warn("Error loading referral stats:", e)
      }

      // Update all user data at once
      setUserData({
        checkinCount: count,
        leaderboardRank: rank,
        leaderboardPoints: points,
        hasUsername: hasUsernameResult,
        username: usernameResult,
        hasReferrer: !!hasReferrerResult,
        highestTier: highestTierResult,
        userBadges: userBadgesResult,
        activeBenefits: benefitsResult,
        referralStats: referralStatsResult,
        isLoadingUserData: false,
        dataLoaded: true
      })

      addNotification("Profile data updated successfully", "success")
    } catch (error) {
      console.error("Error loading user data:", error)
      addNotification("Error loading profile data", "error")
      setUserData(prev => ({ ...prev, isLoadingUserData: false }))
    }
  }, [addNotification])

  return {
    userData,
    loadUserData
  }
}