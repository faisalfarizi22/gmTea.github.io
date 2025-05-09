"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FaTimes, FaCheckCircle, FaGem, FaTrophy, FaAward, FaCalendarAlt, FaClock, FaMedal } from "react-icons/fa"
import { 
  getNextCheckinPoints, 
  getCheckInBoost,
  simulateCheckInAndBadgeData,
  TIER_NAMES,
  getAccuratePointsTotal
} from "../utils/pointCalculation"
import { getUserBadges } from "@/utils/badgeWeb3"

interface PointsBreakdownModalProps {
  onClose: () => void
  address: string
  checkinCount: number
  leaderboardRank: number
  highestTier: number
}

interface CheckInHistoryItem {
  checkInNumber: number;
  timestamp: number;
  activeTier: number;
  tierName: string;
  boost: number;
  basePoints: number;
  points: number;
}

interface PointsData {
  checkInHistory: CheckInHistoryItem[];
  badgeAcquisitions: any[]; // Anda bisa mendefinisikan tipe lebih spesifik jika perlu
  totalPoints: number;
}

export default function PointsBreakdownModal({
  onClose,
  address,
  checkinCount,
  leaderboardRank,
  highestTier
}: PointsBreakdownModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  
  // Fetch badge data and simulate check-in history
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Gunakan fungsi yang sama untuk data poin
        const points = await getAccuratePointsTotal(
          address,
          checkinCount,
          highestTier,
          leaderboardRank
        );
        
        // Simulasi check-in history untuk UI
        const userBadges = await getUserBadges(address);
        
        // Create arrays for simulation
        const badgeTiers: number[] = [];
        const badgeAcquisitionDays: number[] = [];

        const currentDate = new Date()
        
        // Process badge data
        userBadges.forEach(badge => {
          badgeTiers.push(badge.tier)
          
          // Calculate days since badge minted (from mintedAt timestamp)
          const mintDate = new Date(badge.mintedAt * 1000)
          const daysSinceFirstCheckin = Math.floor(
            (currentDate.getTime() - mintDate.getTime()) / (24 * 60 * 60 * 1000)
          )
          
          // Days from first check-in (maximum is checkinCount - 1)
          badgeAcquisitionDays.push(
            Math.min(checkinCount - 1, Math.max(0, checkinCount - daysSinceFirstCheckin))
          )
        })
        
        // Generate accurate simulation
        const simulatedData = simulateCheckInAndBadgeData(
          checkinCount,
          badgeTiers,
          badgeAcquisitionDays
        )
        
        setPointsData(simulatedData)
      } catch (error) {
        console.error("Error fetching badge data:", error)
        
        // If error, use simplified simulation with just the highest tier badge
        if (highestTier >= 0) {
          // If we have highest tier info, simulate it being received halfway through
          const halfwayDay = Math.floor(checkinCount / 2)
          const simulatedData = simulateCheckInAndBadgeData(
            checkinCount,
            [highestTier],
            [halfwayDay]
          )
          setPointsData(simulatedData)
        } else {
          // No badges, simple simulation
          const simulatedData = simulateCheckInAndBadgeData(checkinCount, [], [])
          setPointsData(simulatedData)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [address, checkinCount, highestTier, leaderboardRank]);
  
  // Helper to format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  
  if (isLoading || !pointsData) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
        <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" onClick={onClose}></div>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 max-w-md w-full flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    )
  }
  
  const { checkInHistory, totalPoints } = pointsData
  const achievementPoints = calculateAchievementPoints()
  const leaderboardPoints = calculateLeaderboardPoints()
  
  // Sort check-in history by check-in number (newest first)
  const sortedHistory = [...checkInHistory].sort((a, b) => b.checkInNumber - a.checkInNumber)
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
      {/* Overlay with blur effect */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Modal Container with glassmorphism effect */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl relative max-w-xl w-full border border-emerald-200/50 dark:border-emerald-500/30 overflow-hidden modal-container"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full transform translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full transform -translate-x-1/3 translate-y-1/2 pointer-events-none"></div>
          
          {/* Close button */}
          <div className="absolute z-10 top-4 right-4">
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white focus:outline-none transition-all duration-200 hover:bg-white/40 dark:hover:bg-black/40"
              onClick={onClose}
              aria-label="Close modal"
            >
              <span className="sr-only">Close</span>
              <FaTimes className="w-4 h-4" />
            </button>
          </div>

          {/* Header with total points */}
          <div className="relative p-6 pt-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Points & Check-ins</h3>
              <div className="mt-4 text-center">
                <div className="inline-flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-md rounded-2xl p-6 border border-emerald-500/20">
                  <div className="mr-3 text-emerald-500 dark:text-emerald-400">
                    <FaGem className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-300 uppercase tracking-wider font-medium">Total Points</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                      {totalPoints.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Check-in History Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold text-gray-800 dark:text-white flex items-center">
                  <FaCheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Check-in History
                </h4>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <FaMedal className="mr-1 h-3 w-3" /> Badge tier active at check-in
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {sortedHistory.slice(0, 20).map((checkIn, index) => {
                  const { date, time } = formatTimestamp(checkIn.timestamp);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="bg-white dark:bg-gray-800/60 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/30 overflow-hidden"
                    >
                      <div className="flex items-center p-3">
                        <div className="flex-shrink-0 relative">
                          {/* Tier indicator dot */}
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <FaCheckCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            {checkIn.activeTier >= 0 && (
                              <div 
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                                style={{ background: getTierColor(checkIn.activeTier) }}
                                title={`${checkIn.tierName} Tier Active`}
                              ></div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Check-in #{checkIn.checkInNumber}
                              </p>
                              <div className="flex flex-wrap mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-2">
                                <span className="flex items-center">
                                  <FaCalendarAlt className="mr-1 h-3 w-3" /> {date}
                                </span>
                                <span className="flex items-center">
                                  <FaClock className="mr-1 h-3 w-3" /> {time}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                +{checkIn.points} pts
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {checkIn.activeTier >= 0 ? (
                                  <span>({checkIn.boost}x boost)</span>
                                ) : (
                                  <span>base points</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              
              {checkinCount > 20 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                  + {checkinCount - 20} more check-ins
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Achievements card */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/30"
              >
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <FaAward className="h-4 w-4" />
                  </div>
                  <h5 className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">Achievements</h5>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {achievementPoints}
                  <span className="text-sm font-normal text-amber-500/70 dark:text-amber-400/70 ml-1">points</span>
                </p>
                <div className="mt-1 text-xs">
                  {checkinCount >= 1 && <div className="text-amber-600 dark:text-amber-400/80">• First Check-in (+50)</div>}
                  {checkinCount >= 7 && <div className="text-amber-600 dark:text-amber-400/80">• 7 Check-ins (+50)</div>}
                  {checkinCount >= 50 && <div className="text-amber-600 dark:text-amber-400/80">• 50 Check-ins (+50)</div>}
                  {checkinCount >= 100 && <div className="text-amber-600 dark:text-amber-400/80">• 100 Check-ins (+200)</div>}
                </div>
              </motion.div>
              
              {/* Leaderboard card */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/30"
              >
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <FaTrophy className="h-4 w-4" />
                  </div>
                  <h5 className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">Leaderboard</h5>
                </div>
                {leaderboardRank > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      #{leaderboardRank}
                      <span className="text-sm font-normal text-purple-500/70 dark:text-purple-400/70 ml-1">rank</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {leaderboardPoints > 0 ? `+${leaderboardPoints} bonus points` : 'Keep climbing!'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not ranked yet</p>
                )}
              </motion.div>
            </div>
            
            {/* Tier Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/30 mb-6"
            >
              <h5 className="font-medium text-gray-800 dark:text-white mb-3">Tier Breakdown</h5>
              
              <div className="space-y-3">
                {/* Group check-ins by tier and find count for each tier */}
                {(() => {
                  const tierCounts: {[key: string]: {count: number, points: number}} = {};
                  
                  // Initialize with default values
                  tierCounts['noTier'] = {count: 0, points: 0};
                  for (let i = 0; i <= 4; i++) {
                    tierCounts[i] = {count: 0, points: 0};
                  }
                  
                  // Count check-ins and points per tier
                  checkInHistory.forEach((checkIn: CheckInHistoryItem) => {
                    if (checkIn.activeTier < 0) {
                      tierCounts['noTier'].count++;
                      tierCounts['noTier'].points += checkIn.points;
                    } else {
                      tierCounts[checkIn.activeTier].count++;
                      tierCounts[checkIn.activeTier].points += checkIn.points;
                    }
                  });
                  
                  // Create array of tier entries that have at least one check-in
                  const tierEntries = Object.entries(tierCounts)
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
                  
                  // Render each tier with check-in count
                  return tierEntries.map((tierData, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ background: getTierColor(tierData.tier) }}
                        ></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {tierData.tierName} ({tierData.boost}x)
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {tierData.count} check-in{tierData.count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {tierData.points} pts
                        </span>
                      </div>
                    </div>
                  ));
                })()}
                
                {/* Total calculation */}
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="font-medium text-gray-800 dark:text-white">Total Check-in Points:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {checkInHistory.reduce((sum: number, checkIn: CheckInHistoryItem) => sum + checkIn.points, 0)} pts
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* Point Calculation Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/30 mb-6"
            >
              <h5 className="font-medium text-gray-800 dark:text-white mb-3">Points Summary</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Check-in Points:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {checkInHistory.reduce((sum: number, checkIn: CheckInHistoryItem) => sum + checkIn.points, 0)} pts
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Achievement Bonus:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    +{achievementPoints} points
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Leaderboard Bonus:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    +{leaderboardPoints} points
                  </span>
                </div>
                
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                  <span className="font-medium text-gray-800 dark:text-white">Total Points:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {totalPoints} points
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* Next Check-in Preview */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-md rounded-xl p-4 border border-emerald-500/20 mb-6"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3">
                  <FaCheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Next Check-in</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    You will earn <span className="font-semibold text-emerald-600 dark:text-emerald-400">{getNextCheckinPoints(highestTier)} points</span> 
                    {highestTier >= 0 ? ` with ${getCheckInBoost(highestTier)}x tier boost` : ''}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Close button */}
            <button
              type="button"
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>
  )
}