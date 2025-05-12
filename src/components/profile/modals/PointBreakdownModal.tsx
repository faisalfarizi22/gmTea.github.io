"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FaTimes, FaCheckCircle, FaGem, FaTrophy, FaAward, FaCalendarAlt, FaMedal } from "react-icons/fa"
import { 
  getNextCheckinPoints, 
  getCheckInBoost,
  TIER_NAMES
} from "../utils/pointCalculation"
import { useDBData } from '@/hooks/useDBData';

interface PointsBreakdownModalProps {
  onClose: () => void
  address: string
  checkinCount: number
  leaderboardRank: number
  highestTier: number
}

interface CheckInHistoryItem {
  checkinNumber: number;
  timestamp: string;
  points: number;
  message?: string;
  blockNumber?: number;
  boost?: number | string;
}

export default function PointsBreakdownModal({
  onClose,
  address,
  checkinCount,
  leaderboardRank,
  highestTier
}: PointsBreakdownModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [totalPoints, setTotalPoints] = useState<number>(0)
  const [checkInHistory, setCheckInHistory] = useState<CheckInHistoryItem[]>([])
  
  // Fetch checkin data and points data from API
  const { data: checkinsData, isLoading: checkinsLoading } = useDBData<{
    checkins: CheckInHistoryItem[];
    stats: { total: number };
  }>(`/api/checkins/${address}`);
  
  const { data: pointsData, isLoading: pointsLoading } = useDBData<{
    total: number;
    breakdown: { source: string; points: number; }[];
  }>(`/api/points/${address}`);
  
  // Process data when fetched
  useEffect(() => {
    if (!checkinsLoading && !pointsLoading && checkinsData && pointsData) {
      // Set total points
      setTotalPoints(pointsData.total);
      
      // Set check-in history
      if (checkinsData.checkins) {
        // Sort by check-in number, newest first
        const sortedCheckins = [...checkinsData.checkins]
          .sort((a, b) => b.checkinNumber - a.checkinNumber);
          
        setCheckInHistory(sortedCheckins);
      }
      
      setIsLoading(false);
    }
  }, [checkinsData, pointsData, checkinsLoading, pointsLoading]);
  
  // Helper to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString()
    }
  }
  
  // Helper to get tier color
  const getTierColor = (tier: number): string => {
    if (tier < 0) return "#6b7280" // Gray for no tier
    const tierColors = ["#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"]
    return tierColors[tier]
  }
  
  // Compute achievement points
  const calculateAchievementPoints = (): number => {
    let points = 0
    if (checkinCount >= 1) points += 50
    if (checkinCount >= 7) points += 50
    if (checkinCount >= 50) points += 50
    if (checkinCount >= 100) points += 200
    return points
  }
  
  // Compute leaderboard points
  const calculateLeaderboardPoints = (): number => {
    return (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0
  }
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
        <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" onClick={onClose}></div>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    )
  }
  
  const achievementPoints = calculateAchievementPoints()
  const leaderboardPoints = calculateLeaderboardPoints()
  
  // Get check-ins breakdown by badge tier
  const getCheckInBreakdownByTier = () => {
    const tierCounts: {[key: string]: {count: number, points: number}} = {};
    
    // Initialize with default values
    tierCounts['noTier'] = {count: 0, points: 0};
    for (let i = 0; i <= 4; i++) {
      tierCounts[i] = {count: 0, points: 0};
    }
    
    // Count check-ins and points per tier
    checkInHistory.forEach((checkIn: CheckInHistoryItem) => {
      // Try to determine tier from boost
      let tierFromBoost = -1;
      if (typeof checkIn.boost === 'string') {
        const boostMatch = checkIn.boost.match(/([0-9.]+)x/);
        if (boostMatch) {
          const boostValue = parseFloat(boostMatch[1]);
          // Map boost to tier
          if (boostValue >= 1.5) tierFromBoost = 4;
          else if (boostValue >= 1.4) tierFromBoost = 3;
          else if (boostValue >= 1.3) tierFromBoost = 2;
          else if (boostValue >= 1.2) tierFromBoost = 1;
          else if (boostValue >= 1.1) tierFromBoost = 0;
        }
      } else if (typeof checkIn.boost === 'number') {
        // Map boost to tier
        if (checkIn.boost >= 1.5) tierFromBoost = 4;
        else if (checkIn.boost >= 1.4) tierFromBoost = 3;
        else if (checkIn.boost >= 1.3) tierFromBoost = 2;
        else if (checkIn.boost >= 1.2) tierFromBoost = 1;
        else if (checkIn.boost >= 1.1) tierFromBoost = 0;
      }
      
      // Assign to proper tier bucket
      if (tierFromBoost < 0) {
        tierCounts['noTier'].count++;
        tierCounts['noTier'].points += checkIn.points;
      } else {
        tierCounts[tierFromBoost].count++;
        tierCounts[tierFromBoost].points += checkIn.points;
      }
    });
    
    // Create array of tier entries with check-ins
    return Object.entries(tierCounts)
      .filter(([_, {count}]) => count > 0)
      .map(([tierKey, {count, points}]) => {
        if (tierKey === 'noTier') {
          return {
            tier: -1,
            tierName: 'No Tier',
            count,
            boost: 1.0,
            points
          };
        } else {
          const tier = parseInt(tierKey);
          return {
            tier,
            tierName: TIER_NAMES[tier],
            count,
            boost: getCheckInBoost(tier),
            points
          };
        }
      });
  };
  
  const tierBreakdown = getCheckInBreakdownByTier();
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-xl shadow-xl relative max-w-md w-full border border-emerald-200/50 dark:border-emerald-500/30 overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute z-10 top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white focus:outline-none transition-all duration-200 hover:bg-white/40 dark:hover:bg-black/40"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="sr-only">Close</span>
            <FaTimes className="w-3.5 h-3.5" />
          </button>

          <div className="p-5">
            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Points & Check-ins</h3>
            </div>
            
            {/* Total Points Card */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/30 dark:to-teal-900/30 backdrop-blur-md rounded-xl p-4 border border-emerald-500/20 mb-4">
              <div className="flex items-center justify-center">
                <div className="mr-3 text-emerald-500 dark:text-emerald-400">
                  <FaGem className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-300 uppercase tracking-wider font-medium">Total Points</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                    {totalPoints.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Check-in History Section - Made Larger and More Prominent */}
            <div className="mb-4">
              <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center">
                    <FaCheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Check-in History
                  </h4>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <FaMedal className="mr-1 h-3 w-3" /> {checkinCount} total check-ins
                  </div>
                </div>
                
                <div className="h-48 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {checkInHistory.slice(0, 10).map((checkIn, index) => {
                    const { date } = formatTimestamp(checkIn.timestamp);
                    // Determine tier from boost
                    let checkInTier = -1;
                    if (typeof checkIn.boost === 'string') {
                      const boostMatch = checkIn.boost.match(/([0-9.]+)x/);
                      if (boostMatch) {
                        const boostValue = parseFloat(boostMatch[1]);
                        // Map boost to tier
                        if (boostValue >= 1.5) checkInTier = 4;
                        else if (boostValue >= 1.4) checkInTier = 3;
                        else if (boostValue >= 1.3) checkInTier = 2;
                        else if (boostValue >= 1.2) checkInTier = 1;
                        else if (boostValue >= 1.1) checkInTier = 0;
                      }
                    } else if (typeof checkIn.boost === 'number' && checkIn.boost > 1) {
                      // Map boost to tier
                      if (checkIn.boost >= 1.5) checkInTier = 4;
                      else if (checkIn.boost >= 1.4) checkInTier = 3;
                      else if (checkIn.boost >= 1.3) checkInTier = 2;
                      else if (checkIn.boost >= 1.2) checkInTier = 1;
                      else if (checkIn.boost >= 1.1) checkInTier = 0;
                    }
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.03 }}
                        className={`bg-gray-50 dark:bg-gray-800/40 rounded-lg p-2.5 text-xs border ${index === 0 ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-gray-100/50 dark:border-gray-700/30"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="relative">
                              <div className={`w-6 h-6 rounded-full ${index === 0 ? "bg-emerald-100 dark:bg-emerald-800/30" : "bg-gray-100 dark:bg-gray-700"} flex items-center justify-center`}>
                                <FaCheckCircle className={`h-3 w-3 ${index === 0 ? "text-emerald-500 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`} />
                              </div>
                              {checkInTier >= 0 && (
                                <div 
                                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800"
                                  style={{ background: getTierColor(checkInTier) }}
                                ></div>
                              )}
                            </div>
                            <div className="ml-2">
                              <p className="font-medium text-gray-700 dark:text-gray-200">
                                Check-in #{checkIn.checkinNumber}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {date} {checkInTier >= 0 && <span className="text-2xs">• {TIER_NAMES[checkInTier]} active</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{checkIn.points}
                            </p>
                            <p className="text-2xs text-gray-500 dark:text-gray-400">
                              {checkIn.boost ? (
                                <span>({checkIn.boost})</span>
                              ) : (
                                <span>base points</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                  
                  {checkinCount > 10 && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1">
                      + {checkinCount - 10} more check-ins
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Next Check-in Preview */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-md rounded-xl p-3 border border-emerald-500/20 mb-4">
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-2">
                  <FaCheckCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-900 dark:text-white">Next Check-in</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">+{getNextCheckinPoints(highestTier)}</span> 
                    {highestTier >= 0 ? ` (${getCheckInBoost(highestTier)}x boost)` : ''}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Two columns layout for smaller cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Achievements card */}
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30"
              >
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <FaAward className="h-3 w-3" />
                  </div>
                  <h5 className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-200">Achievements</h5>
                </div>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {achievementPoints}
                  <span className="text-xs font-normal text-amber-500/70 dark:text-amber-400/70 ml-1">points</span>
                </p>
                <div className="mt-1 text-2xs">
                  {checkinCount >= 1 && <div className="text-amber-600 dark:text-amber-400/80">• First Check-in (+50)</div>}
                  {checkinCount >= 7 && <div className="text-amber-600 dark:text-amber-400/80">• 7 Check-ins (+50)</div>}
                  {checkinCount >= 50 && <div className="text-amber-600 dark:text-amber-400/80">• 50 Check-ins (+50)</div>}
                  {checkinCount >= 100 && <div className="text-amber-600 dark:text-amber-400/80">• 100 Check-ins (+200)</div>}
                </div>
              </motion.div>
              
              {/* Leaderboard card */}
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30"
              >
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <FaTrophy className="h-3 w-3" />
                  </div>
                  <h5 className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-200">Leaderboard</h5>
                </div>
                {leaderboardRank > 0 ? (
                  <>
                    <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                      #{leaderboardRank}
                      <span className="text-xs font-normal text-purple-500/70 dark:text-purple-400/70 ml-1">rank</span>
                    </p>
                    <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">
                      {leaderboardPoints > 0 ? `+${leaderboardPoints} bonus points` : 'Keep climbing!'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Not ranked yet</p>
                )}
              </motion.div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Tier Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="bg-white dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30"
              >
                <h5 className="text-xs font-medium text-gray-800 dark:text-white mb-2">Tier Breakdown</h5>
                
                <div className="space-y-1.5">
                  {/* Display tier breakdown */}
                  {tierBreakdown.map((tierData, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center py-1 px-2 rounded-md bg-gray-50 dark:bg-gray-800 text-xs"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-1.5"
                          style={{ background: getTierColor(tierData.tier) }}
                        ></div>
                        <span className="text-gray-700 dark:text-gray-300">
                          {tierData.tierName} ({tierData.boost}x)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {tierData.count}×
                        </span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {tierData.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              {/* Point Calculation Summary */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="bg-white dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/30"
              >
                <h5 className="text-xs font-medium text-gray-800 dark:text-white mb-2">Points Summary</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Check-ins:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {checkInHistory.reduce((sum: number, checkIn: CheckInHistoryItem) => sum + checkIn.points, 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Achievements:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      +{achievementPoints}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Leaderboard:</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      +{leaderboardPoints}
                    </span>
                  </div>
                  
                  <div className="pt-1 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                    <span className="font-medium text-gray-800 dark:text-white">Total:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {totalPoints}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Close button */}
            <div className="mt-4">
              <button
                type="button"
                className="w-full py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-medium rounded-lg shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full transform translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full transform -translate-x-1/3 translate-y-1/2 pointer-events-none"></div>
        </motion.div>
      </div>
      
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.03);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.2);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.4);
        }
        
        .text-2xs {
          font-size: 0.65rem;
          line-height: 1rem;
        }
      `}</style>
    </div>
  )
}