"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FaCheckCircle, FaTrophy, FaGem, FaMedal, FaAward, FaChevronRight } from "react-icons/fa"
import { calculateAchievementPoints, calculateBadgePoints } from "@/utils/pointCalculation"
import { useDBData } from "@/hooks/useDBData"

interface OverviewTabProps {
  address: string
  checkinCount: number
  leaderboardRank: number
  checkinLeaderboardRank?: number
  highestTier: number
  userBadges: any[]
  setShowPointsBreakdown: (show: boolean) => void
  setActiveTab: (tab: "overview" | "badges" | "achievements" | "referrals" | "benefits") => void
  activeBenefits: string[]
}

export default function OverviewTab({
  address,
  checkinCount,
  leaderboardRank,
  checkinLeaderboardRank,
  highestTier,
  userBadges,
  setShowPointsBreakdown,
  setActiveTab,
  activeBenefits,
}: OverviewTabProps) {
  const [totalPoints, setTotalPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [rankDisplayMode, setRankDisplayMode] = useState<"points" | "checkins">("points")
  const [fetchedCheckinRank, setFetchedCheckinRank] = useState<number | null>(null)
  const [isLoadingRank, setIsLoadingRank] = useState<boolean>(false)

  // Fetch points data directly from API
  const { data: pointsData, isLoading: pointsLoading } = useDBData<{
    total: number
    breakdown: {
      checkins: number
      achievements: number
      badges: number
    }
  }>(`/api/points/${address}`)

  // Use data from API or calculate if not available
  useEffect(() => {
    if (pointsData && pointsData.total !== undefined) {
      // Use total from API if available
      setTotalPoints(pointsData.total)
      setIsLoading(false)
      console.log("Using points from API:", pointsData.total)
    } else if (!pointsLoading) {
      // Calculate points if API doesn't provide or is not available
      const baseCheckinPoints = checkinCount * 10
      const achievementPoints = calculateAchievementPoints(checkinCount)
      const badgePoints = calculateBadgePoints(highestTier)

      // Calculate total (no leaderboard bonus anymore)
      const total = baseCheckinPoints + achievementPoints + badgePoints

      setTotalPoints(total)
      setIsLoading(false)
      console.log("Calculated points locally:", total, {
        baseCheckinPoints,
        achievementPoints,
        badgePoints,
      })
    }
  }, [pointsData, pointsLoading, address, checkinCount, highestTier])

  // Function to fetch checkin rank - this uses the improved API endpoint
  const fetchCheckinRank = async () => {
    if (!address || checkinCount <= 0) {
      return
    }

    try {
      setIsLoadingRank(true)
      
      // Force a fresh rank calculation by adding refresh=true
      const response = await fetch(`/api/leaderboard/checkins?userAddress=${address}&refresh=true`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.userRank) {
          console.log("[OverviewTab] Fetched checkin rank:", data.userRank)
          setFetchedCheckinRank(data.userRank)
        } else {
          console.log("[OverviewTab] No rank found in API response")
          setFetchedCheckinRank(null)
        }
      } else {
        console.error("[OverviewTab] Error response from API:", response.status)
        setFetchedCheckinRank(null)
      }
    } catch (error) {
      console.error("[OverviewTab] Error fetching checkin rank:", error)
      setFetchedCheckinRank(null)
    } finally {
      setIsLoadingRank(false)
    }
  }

  // Effect to fetch checkin rank when needed
  useEffect(() => {
    // When switching to checkins rank display or when the component mounts
    // and we're on checkins display, fetch the rank if we don't have it
    if (rankDisplayMode === "checkins" && !fetchedCheckinRank && address && checkinCount > 0) {
      fetchCheckinRank()
    }
  }, [rankDisplayMode, address, checkinCount])

  // Set initial checkin rank from props if available
  useEffect(() => {
    if (checkinLeaderboardRank && checkinLeaderboardRank > 0) {
      setFetchedCheckinRank(checkinLeaderboardRank)
    }
  }, [checkinLeaderboardRank])

  // Toggle between points and checkin leaderboard rank display
  const toggleRankDisplayMode = () => {
    const newMode = rankDisplayMode === "points" ? "checkins" : "points"
    console.log(`[OverviewTab] Switching rank display to: ${newMode}`)
    
    // If switching to checkins mode and we don't have a rank, fetch it
    if (newMode === "checkins" && !fetchedCheckinRank && !isLoadingRank && address && checkinCount > 0) {
      fetchCheckinRank()
    }
    
    setRankDisplayMode(newMode)
  }

  // Get the appropriate rank based on current display mode
  const getCurrentRank = () => {
    if (rankDisplayMode === "points") {
      return leaderboardRank && leaderboardRank > 0 ? `#${leaderboardRank}` : "Not Ranked"
    } else {
      // For checkin rank, use fetched rank or prop
      const checkinRank = fetchedCheckinRank || checkinLeaderboardRank
      
      if (isLoadingRank) {
        return "Loading..."
      } else if (checkinRank && checkinRank > 0) {
        return `#${checkinRank}`
      } else if (checkinCount <= 0) {
        return "Not Ranked"
      } else {
        return "Unknown" // Fallback if we have checkins but no rank
      }
    }
  }

  // For debugging - log the ranks
  useEffect(() => {
    console.log("[OverviewTab] Points Rank:", leaderboardRank)
    console.log("[OverviewTab] Checkin Rank from Props:", checkinLeaderboardRank)
    console.log("[OverviewTab] Fetched Checkin Rank:", fetchedCheckinRank)
  }, [leaderboardRank, checkinLeaderboardRank, fetchedCheckinRank])

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Check-ins */}
        <div className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-600/10 to-transparent rounded-bl-full"></div>
          <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-300/70 mb-1 flex items-center">
            <FaCheckCircle className="mr-2 h-3 w-3" /> Total Check-ins
          </h3>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{checkinCount}</p>
          <div className="absolute bottom-3 right-3">
            <div className="text-emerald-200 dark:text-emerald-600/40">
              <FaCheckCircle className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Points */}
        <div
          className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
          onClick={() => setShowPointsBreakdown(true)}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-600/10 to-transparent rounded-bl-full"></div>
          <h3 className="text-sm font-medium text-teal-600 dark:text-emerald-300/70 mb-1 flex items-center">
            <FaGem className="mr-2 h-3 w-3" /> Total Points
          </h3>
          {isLoading ? (
            <div className="flex items-center">
              <p className="text-2xl font-bold text-teal-600/70 dark:text-emerald-300/70">Loading...</p>
              <div className="ml-2 w-4 h-4 border-2 border-teal-600/30 dark:border-emerald-400/30 border-t-teal-500 dark:border-t-emerald-300 rounded-full animate-spin"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-teal-600 dark:text-emerald-300">
              {(totalPoints || 0).toLocaleString()}
            </p>
          )}
          <div className="text-xs text-teal-600/70 dark:text-emerald-400/70 mt-1">Click for detailed breakdown</div>
          <div className="absolute bottom-3 right-3">
            <div className="text-teal-200 dark:text-teal-600/40">
              <FaGem className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-600/10 to-transparent rounded-bl-full"></div>
          <h3 className="text-sm font-medium text-purple-600 dark:text-emerald-300/70 mb-1 flex items-center">
            <FaMedal className="mr-2 h-3 w-3" /> Badges Collected
          </h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-emerald-300">{userBadges.length}/5</p>
          <div className="absolute bottom-3 right-3">
            <div className="text-purple-200 dark:text-purple-600/40">
              <FaMedal className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Leaderboard Rank */}
        <div
          className={`bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden cursor-pointer transition-colors ${
            isLoadingRank 
              ? "bg-gray-50 dark:bg-gray-900/10" 
              : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
          }`}
          onClick={!isLoadingRank ? toggleRankDisplayMode : undefined}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600/10 to-transparent rounded-bl-full"></div>
          <h3 className="text-sm font-medium text-amber-600 dark:text-emerald-300/70 mb-1 flex items-center">
            <FaTrophy className="mr-2 h-3 w-3" />
            Leaderboard Rank
          </h3>
          {isLoadingRank && rankDisplayMode === "checkins" ? (
            <div className="flex items-center">
              <p className="text-2xl font-bold text-amber-600/70 dark:text-emerald-300/70">Loading...</p>
              <div className="ml-2 w-4 h-4 border-2 border-amber-600/30 dark:border-emerald-400/30 border-t-amber-500 dark:border-t-emerald-300 rounded-full animate-spin"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-amber-600 dark:text-emerald-300">{getCurrentRank()}</p>
          )}
          <div className="text-xs text-amber-600/70 dark:text-emerald-400/70 mt-1">
            {rankDisplayMode === "points" ? "by points" : "by check-ins"}
            {!isLoadingRank && <span> </span>}
          </div>
          <div className="absolute bottom-3 right-3">
            <div className="text-amber-200 dark:text-amber-600/40">
              <FaTrophy className="h-8 w-8" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Achievement Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 mt-6 p-6 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-300 flex items-center">
            <FaAward className="mr-2 h-5 w-5 text-emerald-500 dark:text-emerald-400/80" />
            Achievement Progress
          </h3>

          <button
            onClick={() => setActiveTab("achievements")}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center"
          >
            View all <FaChevronRight className="ml-1 h-3 w-3" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Progress bar */}
          <div className="relative">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              {(() => {
                let completed = 0
                if (checkinCount >= 1) completed++ // First check-in
                if (checkinCount >= 7) completed++ // 7 check-ins
                if (checkinCount >= 50) completed++ // 50 check-ins
                if (checkinCount >= 100) completed++ // 100 check-ins
                // Username check would be here
                if (activeBenefits.length > 0) completed++ // Has some benefits
                if (highestTier >= 0) completed++ // Common badge
                if (highestTier >= 1) completed++ // Uncommon badge
                if (highestTier >= 2) completed++ // Rare badge
                if (highestTier >= 3) completed++ // Epic badge
                if (highestTier >= 4) completed++ // Legendary badge

                const percentage = (completed / 10) * 100

                return (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  ></motion.div>
                )
              })()}
            </div>
            <div className="mt-2 flex justify-end items-center text-xs text-gray-500 dark:text-gray-400">
              <span>
                {(() => {
                  let completed = 0
                  if (checkinCount >= 1) completed++
                  if (checkinCount >= 7) completed++
                  if (checkinCount >= 50) completed++
                  if (checkinCount >= 100) completed++
                  // Username check would be here
                  if (activeBenefits.length > 0) completed++
                  if (highestTier >= 0) completed++
                  if (highestTier >= 1) completed++
                  if (highestTier >= 2) completed++
                  if (highestTier >= 3) completed++
                  if (highestTier >= 4) completed++

                  return `${completed}/10 (${Math.round((completed / 10) * 100)}%)`
                })()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}