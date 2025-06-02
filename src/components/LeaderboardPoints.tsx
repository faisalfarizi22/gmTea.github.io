"use client"

import type React from "react"
import type { ethers } from "ethers"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FaTrophy, FaRedo, FaGem, FaChevronLeft, FaChevronRight, FaUser, FaUsers, FaCalendarCheck } from "react-icons/fa"
import { formatAddress } from "@/utils/web3"
import ColoredUsername from "@/components/user/ColoredUsername"
import AvatarWithFrame from "@/components/user/AvatarWithFrame"
import { useUserDataCombined } from '@/hooks/useUserData'
import { useDBData } from '@/hooks/useDBData'
import { getCheckInBoost, calculateAchievementPoints, calculateBadgePoints } from "@/utils/pointCalculation"

interface LeaderboardEntry {
  address: string;
  username: string | null;
  highestBadgeTier: number;
  points: number;
  rank: number;
  isCurrentUser: boolean;
}

interface PointsLeaderboardProps {
  contract?: ethers.Contract | null;
  currentUserAddress: string | null;
}

const PointsLeaderboard: React.FC<PointsLeaderboardProps> = ({ 
  currentUserAddress,
  contract
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isJumpingToUser, setIsJumpingToUser] = useState<boolean>(false);
  const [activeWallets, setActiveWallets] = useState<number>(0);
  const [todayCheckins, setTodayCheckins] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  
  const { 
    userData, 
    isLoading: isLoadingUserData 
  } = useUserDataCombined(currentUserAddress);

  const { data: pointsData, isLoading: isLoadingPointsData } = useDBData<{
    total: number;
    breakdown: { 
      checkins: number;
      achievements: number;
      badges: number;
    };
  }>(currentUserAddress ? `/api/points/${currentUserAddress}` : null);

  const ENTRIES_PER_PAGE = 10;
  
  const totalPages = Math.ceil(totalEntries / ENTRIES_PER_PAGE);

  const getAvatarUrl = (address: string): string => 
    `https://api.dicebear.com/6.x/identicon/svg?seed=${address}`;

  const getUserPoints = () => {
    if (pointsData && pointsData.total !== undefined) {
      return pointsData.total;
    }
    
    if (userData) {
      return userData.points || 0;
    }
    
    return 0;
  };

  const loadWalletStats = async () => {
    try {
      setIsLoadingStats(true);

      const response = await fetch(`/api/checkins/latest?limit=1`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();

      const totalCheckins = data.stats?.totalCheckins || 0;
      setActiveWallets(data.stats?.activeWallets || totalEntries);
  
      const now = new Date();
      const todaySevenAM = new Date(now);
      todaySevenAM.setHours(7, 0, 0, 0);
      
      if (now < todaySevenAM) {
        todaySevenAM.setDate(todaySevenAM.getDate() - 1);
      }
      
      const todaySevenAMISO = todaySevenAM.toISOString();
      
      try {
        const todayResponse = await fetch(`/api/checkins/today?since=${encodeURIComponent(todaySevenAMISO)}`);
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayCheckins(todayData.count || 0);
        } else {
          setTodayCheckins(Math.floor(totalCheckins * 0.12)); 
        }
      } catch (error) {
        console.error("Error loading today's check-ins:", error);
        setTodayCheckins(Math.floor(totalCheckins * 0.12)); 
      }
    } catch (error) {
      console.error("Error loading wallet statistics:", error);
      setTodayCheckins(Math.floor(leaderboard.length / 3));
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadLeaderboard = async (page = 1, jumpToUser = false) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      if (jumpToUser) {
        setIsJumpingToUser(true);
      }

      setError(null);

        const endpoint = `/api/leaderboard/points?page=${page}&limit=${ENTRIES_PER_PAGE}${currentUserAddress ? `&userAddress=${currentUserAddress}` : ''}${forceRefresh ? '&refresh=true' : ''}`;
    
        const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.userRank) {
        setUserRank(data.userRank);
        
        if (jumpToUser) {
          const userPage = Math.ceil(data.userRank / ENTRIES_PER_PAGE);
          
          if (userPage !== page) {
            setCurrentPage(userPage);
            await loadLeaderboard(userPage, false);
            setIsJumpingToUser(false);
            return;
          }
        }
      }
      
      const formattedLeaderboard: LeaderboardEntry[] = data.users.map((user: any) => ({
        address: user.address,
        username: user.username || null,
        highestBadgeTier: user.highestBadgeTier || -1,
        points: user.points, 
        rank: user.rank,
        isCurrentUser: currentUserAddress ? user.address.toLowerCase() === currentUserAddress.toLowerCase() : false,
        }));
      
      setLeaderboard(formattedLeaderboard);
      setTotalEntries(data.pagination.total);
      setActiveWallets(data.pagination.total);
      
      if (page === 1) {
        loadWalletStats();
      }
      
    } catch (error) {
      console.error("Error loading points leaderboard:", error);
      setError("Failed to load leaderboard data. Please try again later.");

      const mockData = Array.from({ length: 10 }, (_, i) => ({
        address: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
        username: i % 3 === 0 ? `User${i+1}` : null,
        highestBadgeTier: i % 5,
        points: 1000 - i * 50,
        rank: (page - 1) * ENTRIES_PER_PAGE + i + 1,
        isCurrentUser: i === 7 && currentUserAddress !== null,
      }));

      setLeaderboard(mockData);
      setTotalEntries(50);
      setActiveWallets(50);
      setTodayCheckins(15);

      if (currentUserAddress) {
        setUserRank(8);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsJumpingToUser(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(currentPage);
    
    const interval = setInterval(
      () => {
        loadLeaderboard(currentPage);
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [currentUserAddress]);

  useEffect(() => {
    if (!isJumpingToUser && !isLoading) {
      loadLeaderboard(currentPage);
    }
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const jumpToUserRank = () => {
    if (userRank) {
      setIsJumpingToUser(true);
      loadLeaderboard(1, true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-emerald-700/30"
    >
      <div className="bg-emerald-50 dark:bg-emerald-900/20 py-4 px-6 border-b border-emerald-100 dark:border-emerald-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative mr-3">
              <FaGem className="h-6 w-6 text-emerald-500" />
              <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 flex items-center">
                Point Champions
              </h2>
              <p className="text-emerald-600 dark:text-emerald-400/70 text-sm">
                Top users with highest points from check-ins and achievements
              </p>
            </div>
          </div>

          {currentUserAddress && userRank && !isLoading && (
            <button
              onClick={jumpToUserRank}
              disabled={isJumpingToUser}
              className="flex items-center space-x-2 bg-emerald-50 dark:bg-transparent px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-colors text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30"
            >
              <FaUser className="h-3 w-3 text-emerald-500" />
              <span>Jump to My Rank (#{userRank})</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-6 py-3 border-b border-emerald-100 dark:border-emerald-800/30">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-2 sm:mb-0">
            <div className="flex items-center mr-6">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-800/30 mr-3">
                <FaUsers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Active Wallets</p>
                {isLoadingStats ? (
                  <div className="h-5 w-16 bg-emerald-200/50 dark:bg-emerald-700/30 rounded animate-pulse"></div>
                ) : (
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">{activeWallets.toLocaleString()}</p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-800/30 mr-3">
                <FaCalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Today's Check-ins</p>
                {isLoadingStats ? (
                  <div className="h-5 w-16 bg-emerald-200/50 dark:bg-emerald-700/30 rounded animate-pulse"></div>
                ) : (
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">{todayCheckins.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaGem className="text-emerald-400 text-2xl animate-pulse" />
              </div>
            </div>
            <p className="text-emerald-600 dark:text-emerald-400 mt-4 font-medium">Loading leaderboard data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <FaGem className="text-red-500 dark:text-red-400 text-2xl" />
            </div>
            <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
            <button
              onClick={() => loadLeaderboard(1)}
              className="mt-4 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors text-sm flex items-center mx-auto"
            >
              <FaRedo className="mr-2 h-3 w-3" /> Try Again
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="leaderboard-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {currentUserAddress && !isLoadingUserData && !isLoadingPointsData && (getUserPoints() > 0 || userRank) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg mb-6 border border-emerald-100 dark:border-emerald-800/30 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-between">
                    <div className="mb-3 md:mb-0">
                      <p className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center">
                        <span className="mr-2">👋</span> Your Leaderboard Status
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                        {userRank ? (
                          userRank === 1 ? (
                            <span className="flex items-center text-emerald-700 dark:text-emerald-300 font-bold">
                              <FaTrophy className="mr-1 text-yellow-500" /> You're at the top of the leaderboard!
                            </span>
                          ) : (
                            <span>
                              You're ranked <span className="font-bold text-emerald-700 dark:text-emerald-300">#{userRank}</span> out
                              of all users
                            </span>
                          )
                        ) : getUserPoints() > 0 ? (
                          <span>Keep earning points to climb the ranks!</span>
                        ) : (
                          <span>Complete your first check-in to earn points and join the leaderboard!</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-white dark:bg-black/60 px-4 py-2 rounded-full shadow-sm border border-emerald-200 dark:border-emerald-800/30">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center">
                          <FaGem className="w-4 h-4 mr-1 text-emerald-500" />
                          {getUserPoints().toLocaleString()} points
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {leaderboard.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="overflow-x-auto bg-white dark:bg-black/60 border border-gray-100 dark:border-emerald-800/20 rounded-xl shadow-sm"
                >
                  <table className="w-full">
                    <thead className="bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800/30">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/30">
                      {isLoadingMore
                        ? 
                          Array.from({ length: ENTRIES_PER_PAGE }).map((_, index) => (
                            <tr key={`loading-${index}`} className="animate-pulse">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              </td>
                            </tr>
                          ))
                        : leaderboard.map((entry, index) => {
                            return (
                              <motion.tr
                                key={`${entry.address}-${index}`}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + index * 0.03 }}
                                className={`transition-colors duration-150 ${
                                  entry.isCurrentUser
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/30"
                                    : index % 2 === 0
                                      ? "bg-white dark:bg-black/30 hover:bg-gray-50 dark:hover:bg-gray-800/10"
                                      : "bg-gray-50 dark:bg-gray-800/10 hover:bg-gray-100 dark:hover:bg-gray-700/10"
                                }`}
                                style={entry.isCurrentUser ? { borderLeft: `4px solid #10b981` } : {}}
                              >
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {entry.rank === 1 ? (
                                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                                        <FaTrophy className="text-yellow-500" />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 flex items-center justify-center">
                                        <span
                                          className={`font-mono ${entry.isCurrentUser ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                                        >
                                          #{entry.rank}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="h-6 w-6 rounded-full mr-2 overflow-hidden">
                                      <AvatarWithFrame
                                        avatarUrl={getAvatarUrl(entry.address)}
                                        badgeTier={entry.highestBadgeTier}
                                        size="xs"
                                      />
                                    </div>
                                    
                                    {entry.username ? (
                                      <div className={entry.isCurrentUser ? "font-bold" : ""}>
                                        <ColoredUsername 
                                          username={entry.username} 
                                          badgeTier={entry.highestBadgeTier} 
                                        />
                                      </div>
                                    ) : (
                                      <span
                                        className={`${
                                          entry.isCurrentUser
                                            ? "font-bold text-emerald-600 dark:text-emerald-400"
                                            : "text-gray-700 dark:text-gray-300"
                                        }`}
                                      >
                                        {formatAddress(entry.address)}
                                      </span>
                                    )}
                                    
                                    {entry.isCurrentUser && (
                                      <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 rounded-full">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap font-medium">
                                  <div className="flex items-center">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-sm ${
                                        entry.rank === 1
                                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                          : "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                                      }`}
                                    >
                                      {entry.points.toLocaleString()}
                                    </span>
                                    {entry.highestBadgeTier >= 0 && (
                                      <span
                                        className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400"
                                        title={`Current boost: ${getCheckInBoost(entry.highestBadgeTier).toFixed(1)}x from ${entry.highestBadgeTier >= 0 ? ["Common", "Uncommon", "Rare", "Epic", "Legendary"][entry.highestBadgeTier] : ""} tier`}
                                      >
                                        ({getCheckInBoost(entry.highestBadgeTier).toFixed(1)}x)
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            )
                          })}
                    </tbody>
                  </table>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                    <FaGem className="text-emerald-500 dark:text-emerald-400 text-3xl" />
                  </div>
                  <p className="text-gray-600 dark:text-emerald-300 text-lg font-medium mb-2">No points recorded yet</p>
                  <p className="text-gray-500 dark:text-emerald-400/70 text-center">Be the first to check in and earn points to start the leaderboard!</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-6 space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoadingMore}
                    className={`p-2 rounded-md ${
                      currentPage === 1 || isLoadingMore
                        ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    }`}
                  >
                    <FaChevronLeft className="h-4 w-4" />
                  </button>

                  {(() => {
                    const pages = []
                    const maxVisible = 5
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
                    
                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1)
                    }
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          disabled={isLoadingMore}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        >
                          1
                        </button>
                      )
                      
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="text-gray-500 dark:text-gray-400">
                            ...
                          </span>
                        )
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={isLoadingMore}
                          className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            i === currentPage
                              ? "bg-emerald-500 text-white"
                              : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          }`}
                        >
                          {i}
                        </button>
                      )
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="text-gray-500 dark:text-gray-400">
                            ...
                          </span>
                        )
                      }
                      
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          disabled={isLoadingMore}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        >
                          {totalPages}
                        </button>
                      )
                    }
                    
                    return pages
                  })()}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoadingMore}
                    className={`p-2 rounded-md ${
                      currentPage === totalPages || isLoadingMore
                        ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    }`}
                  >
                    <FaChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {currentUserAddress && !isLoadingUserData && !isLoadingPointsData && !userRank && getUserPoints() === 0 && leaderboard.length > 0 && (
                <div className="mt-6 p-4 border-t border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-emerald-300/70 text-center">
                    You haven't made it to the leaderboard yet. Complete check-ins and earn points to join the ranks!
                  </p>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={() => loadLeaderboard(currentPage)}
                  disabled={isLoadingMore}
                  className="inline-flex items-center px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors text-sm shadow-sm border border-emerald-200 dark:border-emerald-700/30"
                >
                  <FaRedo className={`w-3 h-3 mr-2 ${isLoadingMore ? "animate-spin" : ""}`} />
                  Refresh Leaderboard
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default PointsLeaderboard;