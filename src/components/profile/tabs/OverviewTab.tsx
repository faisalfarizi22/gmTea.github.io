"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FaCheckCircle, FaTrophy, FaGem, FaMedal, FaLink, FaAward, FaChevronRight } from "react-icons/fa"
import { calculateTotalPoints, estimateTotalPoints, getAccuratePointsTotal } from "../utils/pointCalculation"

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
  const [isCalculatingPoints, setIsCalculatingPoints] = useState<boolean>(false);

  // Gunakan fungsi calculateTotalPoints yang diperbaiki dari utilitas baru
  useEffect(() => {
    const fetchAccuratePoints = async () => {
      try {
        // Gunakan loading state jika perlu
        // setIsCalculatingPoints(true);
        
        const points = await getAccuratePointsTotal(
          address, // Perlu menambahkan prop address ke OverviewTab
          checkinCount,
          highestTier,
          leaderboardRank
        );
        
        setTotalPoints(points);
      } catch (error) {
        console.error("Error fetching accurate points:", error);
        // Fallback to basic calculation
        const basePoints = checkinCount * 10;
        const achievementPoints = calculateAchievementPoints(checkinCount);
        const leaderboardBonus = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
        setTotalPoints(basePoints + achievementPoints + leaderboardBonus);
      } finally {
        // setIsCalculatingPoints(false);
      }
    };
    
    fetchAccuratePoints();
  }, [address, checkinCount, highestTier, leaderboardRank]);
  
  // Helper function
  const calculateAchievementPoints = (checkinCount: number): number => {
    let points = 0;
    if (checkinCount >= 1) points += 50;
    if (checkinCount >= 7) points += 50;
    if (checkinCount >= 50) points += 50;
    if (checkinCount >= 100) points += 200;
    return points;
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

        {/* Points - Updated with proper calculation */}
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

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-300 mb-4 flex items-center">
          <FaLink className="mr-2 h-5 w-5 text-emerald-500 dark:text-emerald-400/80" /> Quick Actions
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a
            href="/mint"
            className="group flex flex-col items-center p-4 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/30 transition-all border border-emerald-200 dark:border-emerald-700/30 hover:border-emerald-300 dark:hover:border-emerald-600/50"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-900/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FaMedal className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Mint Badges</span>
          </a>

          <a
            href="/leaderboard"
            className="group flex flex-col items-center p-4 bg-amber-100 dark:bg-amber-900/20 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-all border border-amber-200 dark:border-amber-700/30 hover:border-amber-300 dark:hover:border-amber-600/50"
          >
            <div className="w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-900/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FaTrophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Leaderboard</span>
          </a>

          <a
            href="/checkin"
            className="group flex flex-col items-center p-4 bg-blue-100 dark:bg-blue-900/20 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-all border border-blue-200 dark:border-blue-700/30 hover:border-blue-300 dark:hover:border-blue-600/50"
          >
            <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-900/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FaCheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Daily Check-in</span>
          </a>

          <a
            href="/rewards"
            className="group flex flex-col items-center p-4 bg-purple-100 dark:bg-purple-900/20 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-all border border-purple-200 dark:border-purple-700/30 hover:border-purple-300 dark:hover:border-purple-600/50"
          >
            <div className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-900/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FaGem className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Rewards</span>
          </a>
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