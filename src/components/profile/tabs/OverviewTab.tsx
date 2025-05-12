"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FaCheckCircle, FaTrophy, FaGem, FaMedal, FaLink, FaAward, FaChevronRight } from "react-icons/fa"
import { calculateTotalPoints } from "../utils/pointCalculation"

interface OverviewTabProps {
  address: string; 
  checkinCount: number;
  leaderboardRank: number;
  highestTier: number;
  userBadges: any[];
  setShowPointsBreakdown: (show: boolean) => void;
  setActiveTab: (tab: "overview" | "badges" | "achievements" | "referrals" | "benefits") => void;
  activeBenefits: string[];
}

export default function OverviewTab({
  address,
  checkinCount,
  leaderboardRank,
  highestTier,
  userBadges,
  setShowPointsBreakdown,
  setActiveTab,
  activeBenefits
}: OverviewTabProps) {
  const [totalPoints, setTotalPoints] = useState<number>(0)
  
  // Calculate points based on user metrics
  useEffect(() => {
    // Basic points calculation - will be filled with actual data from API
    const basePoints = checkinCount * 10;
    const achievementPoints = calculateAchievementPoints(checkinCount);
    const leaderboardBonus = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
    const badgePoints = calculateBadgePoints(highestTier);
    
    setTotalPoints(basePoints + achievementPoints + leaderboardBonus + badgePoints);
  }, [checkinCount, leaderboardRank, highestTier]);
  
  // Helper function for achievement points calculation
  const calculateAchievementPoints = (checkinCount: number): number => {
    let points = 0;
    if (checkinCount >= 1) points += 50;
    if (checkinCount >= 7) points += 50;
    if (checkinCount >= 50) points += 50;
    if (checkinCount >= 100) points += 200;
    return points;
  };
  
  // Helper function for badge points calculation
  const calculateBadgePoints = (highestTier: number): number => {
    const tierPoints = [100, 250, 500, 1000, 2000];
    return highestTier >= 0 && highestTier < tierPoints.length ? tierPoints[highestTier] : 0;
  };

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

        {/* Leaderboard Rank */}
        <div className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600/10 to-transparent rounded-bl-full"></div>
          <h3 className="text-sm font-medium text-amber-600 dark:text-emerald-300/70 mb-1 flex items-center">
            <FaTrophy className="mr-2 h-3 w-3" /> Leaderboard Rank
          </h3>
          <p className="text-3xl font-bold text-amber-600 dark:text-emerald-300">
            {leaderboardRank > 0 ? `#${leaderboardRank}` : "N/A"}
          </p>
          <div className="absolute bottom-3 right-3">
            <div className="text-amber-200 dark:text-amber-600/40">
              <FaTrophy className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Points */}
        <div 
          className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden cursor-pointer"
          onClick={() => setShowPointsBreakdown(true)}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-600/10 to-transparent rounded-bl-full"></div>
          <h3 className="text-sm font-medium text-teal-600 dark:text-emerald-300/70 mb-1 flex items-center">
            <FaGem className="mr-2 h-3 w-3" /> Total Points
          </h3>
          <p className="text-3xl font-bold text-teal-600 dark:text-emerald-300">
            {totalPoints.toLocaleString()}
          </p>
          <div className="text-xs text-teal-600/70 dark:text-emerald-400/70 mt-1">
            Click for detailed breakdown
          </div>
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
                let completed = 0;
                if (checkinCount >= 1) completed++; // First check-in
                if (checkinCount >= 7) completed++; // 7 check-ins
                if (checkinCount >= 50) completed++; // 50 check-ins
                if (checkinCount >= 100) completed++; // 100 check-ins
                // Username check would be here
                if (activeBenefits.length > 0) completed++; // Has some benefits
                if (highestTier >= 0) completed++; // Common badge
                if (highestTier >= 1) completed++; // Uncommon badge
                if (highestTier >= 2) completed++; // Rare badge
                if (highestTier >= 3) completed++; // Epic badge
                if (highestTier >= 4) completed++; // Legendary badge

                const percentage = (completed / 10) * 100;

                return (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  >
                  </motion.div>
                );
              })()}
            </div>
            <div className="mt-2 flex justify-end items-center text-xs text-gray-500 dark:text-gray-400">
              <span>
                {(() => {
                  let completed = 0;
                  if (checkinCount >= 1) completed++;
                  if (checkinCount >= 7) completed++;
                  if (checkinCount >= 50) completed++;
                  if (checkinCount >= 100) completed++;
                  // Username check would be here
                  if (activeBenefits.length > 0) completed++;
                  if (highestTier >= 0) completed++;
                  if (highestTier >= 1) completed++;
                  if (highestTier >= 2) completed++;
                  if (highestTier >= 3) completed++;
                  if (highestTier >= 4) completed++;

                  return `${completed}/10 (${Math.round((completed / 10) * 100)}%)`;
                })()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}