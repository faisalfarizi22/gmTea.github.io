"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  FaTrophy,
  FaSpinner,
  FaCheckCircle,
  FaRedo,
  FaLeaf,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaUsers,
  FaCalendarCheck,
} from "react-icons/fa"
import { formatAddress, formatTimestamp } from "@/utils/web3"
import type { ethers } from "ethers"
import {
  getLeaderboardData,
  getUserLeaderboardRank,
  getWalletStats,
  type LeaderboardEntry,
} from "../utils/leaderboradUtils"
import { COLORS } from "@/utils/constants"

// Extend the LeaderboardEntry type from utils
interface LeaderboardEntryWithUserFlag extends LeaderboardEntry {
  isCurrentUser: boolean
}

interface LeaderboardProps {
  contract: ethers.Contract | null
  currentUserAddress: string | null
  userCheckinCount?: number
}

/**
 * Leaderboard Component
 *
 * Displays a leaderboard of users with the most check-ins in a Web3 application
 */
const Leaderboard: React.FC<LeaderboardProps> = ({ contract, currentUserAddress, userCheckinCount = 0 }) => {
  // State management
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryWithUserFlag[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [totalEntries, setTotalEntries] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [isJumpingToUser, setIsJumpingToUser] = useState<boolean>(false)
  const [activeWallets, setActiveWallets] = useState<number>(0)
  const [todayCheckins, setTodayCheckins] = useState<number>(0)
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true)

  const ENTRIES_PER_PAGE = 10

  /**
   * Load wallet statistics
   */
  const loadWalletStats = async () => {
    if (!contract) return

    try {
      setIsLoadingStats(true)

      // Use the new getWalletStats function to get accurate counts
      const { activeWallets: totalActiveWallets, todayCheckins: totalTodayCheckins } = await getWalletStats(contract)

      setActiveWallets(totalActiveWallets)
      setTodayCheckins(totalTodayCheckins)

      console.log(`Loaded wallet stats: ${totalActiveWallets} active wallets, ${totalTodayCheckins} today's check-ins`)
    } catch (error) {
      console.error("Error loading wallet statistics:", error)
      // Set fallback values
      setActiveWallets(leaderboard.length)
      setTodayCheckins(Math.floor(leaderboard.length / 3))
    } finally {
      setIsLoadingStats(false)
    }
  }

  /**
   * Load leaderboard data from the blockchain
   */
  const loadLeaderboard = async (page = 1, jumpToUser = false) => {
    if (!contract) return

    try {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      if (jumpToUser) {
        setIsJumpingToUser(true)
      }

      setError(null)

      // Calculate the limit based on whether we're loading the first page or more
      // For the first page, we'll get 1000 entries to calculate total, but only display ENTRIES_PER_PAGE
      const limit = page === 1 ? 1000 : page * ENTRIES_PER_PAGE

      // Fetch leaderboard data using our utility function
      const leaderboardData = await getLeaderboardData(contract, limit)

      // Store total entries count on first load
      if (page === 1) {
        setTotalEntries(leaderboardData.length)

        // Also load wallet statistics when we first load the leaderboard
        loadWalletStats()
      }

      // Add the isCurrentUser flag to each entry
      const allUsers: LeaderboardEntryWithUserFlag[] = leaderboardData.map((entry) => ({
        ...entry,
        isCurrentUser: currentUserAddress ? entry.address.toLowerCase() === currentUserAddress.toLowerCase() : false,
      }))

      // Get user's rank if they have a connected wallet
      let userRankValue = null
      if (currentUserAddress) {
        try {
          // First check if rank is already found in our data
          const userIndex = allUsers.findIndex(
            (entry) => entry.address.toLowerCase() === currentUserAddress.toLowerCase(),
          )

          if (userIndex !== -1) {
            userRankValue = userIndex + 1
            setUserRank(userRankValue)
          } else if (userCheckinCount > 0) {
            // If not in top users but has check-ins, try to get rank from contract
            userRankValue = await getUserLeaderboardRank(contract, currentUserAddress)
            setUserRank(userRankValue)
          } else {
            setUserRank(null)
          }

          // If we're jumping to user's rank, calculate the correct page
          if (jumpToUser && userRankValue) {
            const userPage = Math.ceil(userRankValue / ENTRIES_PER_PAGE)
            setCurrentPage(userPage)
            page = userPage
          }
        } catch (rankError) {
          console.error("Error getting user rank:", rankError)
        }
      }

      // Calculate start and end indices for the current page
      const startIndex = (page - 1) * ENTRIES_PER_PAGE
      const endIndex = startIndex + ENTRIES_PER_PAGE

      // Get entries for the current page
      const pageEntries = allUsers.slice(startIndex, endIndex)

      // Set leaderboard data for the current page
      setLeaderboard(pageEntries)
    } catch (error) {
      console.error("Error loading leaderboard:", error)
      setError("Failed to load leaderboard data")

      // Set mock data for development/preview
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        address: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
        checkinCount: 100 - i,
        lastCheckin: Math.floor(Date.now() / 1000) - i * 3600,
        isCurrentUser: i === 15 && currentUserAddress !== null,
      }))

      setTotalEntries(mockData.length)
      setActiveWallets(mockData.length)
      setTodayCheckins(Math.floor(mockData.length / 3))

      // Calculate start and end indices for the current page
      const startIndex = (page - 1) * ENTRIES_PER_PAGE
      const endIndex = startIndex + ENTRIES_PER_PAGE

      // Get entries for the current page
      const pageEntries = mockData.slice(startIndex, endIndex)

      setLeaderboard(pageEntries)

      // Set mock user rank
      if (currentUserAddress) {
        setUserRank(16) // Mock rank
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      setIsJumpingToUser(false)
    }
  }

  // Load leaderboard on component mount and when contract or user changes
  useEffect(() => {
    if (contract) {
      loadLeaderboard(currentPage)

      // Refresh every 5 minutes
      const interval = setInterval(
        () => {
          loadLeaderboard(currentPage)
        },
        5 * 60 * 1000,
      )

      return () => clearInterval(interval)
    }
  }, [contract, currentUserAddress, userCheckinCount])

  // Load new page when currentPage changes
  useEffect(() => {
    if (contract && !isJumpingToUser) {
      loadLeaderboard(currentPage)
    }
  }, [currentPage])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalEntries / ENTRIES_PER_PAGE)) {
      setCurrentPage(newPage)
    }
  }

  // Jump to user's rank
  const jumpToUserRank = () => {
    if (userRank) {
      loadLeaderboard(1, true)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-emerald-100 dark:border-emerald-900/30 transition-all duration-300">
      {/* Header with emerald styling */}
      <div className="bg-emerald-50 dark:bg-emerald-100 py-4 px-6 border-b border-emerald-100 dark:border-emerald-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative mr-3">
              <FaLeaf className="h-6 w-6 text-emerald-500" />
              <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-600 flex items-center">
                GM Check-in Champions
              </h2>
              <p className="text-emerald-600 dark:text-emerald-500 text-sm">
                Top users who consistently show up and check in
              </p>
            </div>
          </div>

          {/* Jump to my rank button */}
          {currentUserAddress && userRank && !isLoading && (
            <button
              onClick={jumpToUserRank}
              disabled={isJumpingToUser}
              className="flex items-center space-x-2 bg-emerald-50 dark:bg-transparent px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-colors text-sm text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800"
            >
              <FaUser className="h-3 w-3 text-emerald-300" />
              <span>Jump to My Rank (#{userRank})</span>
            </button>
          )}
        </div>
      </div>

      {/* Wallet Statistics Section */}
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

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => loadLeaderboard(1)} />
        ) : (
          <LeaderboardContent
            leaderboard={leaderboard}
            userRank={userRank}
            currentUserAddress={currentUserAddress}
            userCheckinCount={userCheckinCount}
            onRefresh={() => loadLeaderboard(currentPage)}
            currentPage={currentPage}
            totalPages={Math.ceil(totalEntries / ENTRIES_PER_PAGE)}
            onPageChange={handlePageChange}
            isLoadingMore={isLoadingMore}
            entriesPerPage={ENTRIES_PER_PAGE}
          />
        )}
      </div>
    </div>
  )
}

// Loading state component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-8">
    <FaSpinner className="animate-spin text-emerald-500 text-2xl mb-2" />
    <p className="text-gray-500 dark:text-gray-400">Loading leaderboard...</p>
  </div>
)

// Error state component
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-8">
    <p className="text-red-500">{error}</p>
    <button
      onClick={onRetry}
      className="mt-2 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm transition-colors"
    >
      Try Again
    </button>
  </div>
)

// Pagination component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading: boolean
}) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []

    // Always show first page
    pages.push(1)

    // Calculate range around current page
    let rangeStart = Math.max(2, currentPage - 1)
    let rangeEnd = Math.min(totalPages - 1, currentPage + 1)

    // Adjust range to always show 3 pages if possible
    if (rangeEnd - rangeStart < 2) {
      if (rangeStart === 2) {
        rangeEnd = Math.min(totalPages - 1, rangeEnd + 1)
      } else if (rangeEnd === totalPages - 1) {
        rangeStart = Math.max(2, rangeStart - 1)
      }
    }

    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push("...")
    }

    // Add range pages
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push("...")
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-center mt-6 space-x-2">
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className={`p-2 rounded-md ${
          currentPage === 1 || isLoading
            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
        }`}
      >
        <FaChevronLeft className="h-4 w-4" />
      </button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) => (
        <button
          key={index}
          onClick={() => (typeof page === "number" ? onPageChange(page) : null)}
          disabled={isLoading || page === "..."}
          className={`w-8 h-8 flex items-center justify-center rounded-md ${
            page === currentPage
              ? "bg-emerald-500 text-white"
              : page === "..."
                ? "text-gray-500 dark:text-gray-400 cursor-default"
                : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          }`}
        >
          {page}
        </button>
      ))}

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className={`p-2 rounded-md ${
          currentPage === totalPages || isLoading
            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
        }`}
      >
        <FaChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// Leaderboard content component
const LeaderboardContent = ({
  leaderboard,
  userRank,
  currentUserAddress,
  userCheckinCount,
  onRefresh,
  currentPage,
  totalPages,
  onPageChange,
  isLoadingMore,
  entriesPerPage,
}: {
  leaderboard: LeaderboardEntryWithUserFlag[]
  userRank: number | null
  currentUserAddress: string | null
  userCheckinCount: number
  onRefresh: () => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoadingMore: boolean
  entriesPerPage: number
}) => {
  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No check-ins recorded yet. Be the first to check in!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Current user stats if they're on the leaderboard */}
      {currentUserAddress && (userRank || userCheckinCount > 0) && (
        <UserStats userRank={userRank} userCheckinCount={userCheckinCount} />
      )}

      {/* Leaderboard table */}
      <LeaderboardTable
        leaderboard={leaderboard}
        currentPage={currentPage}
        entriesPerPage={entriesPerPage}
        isLoadingMore={isLoadingMore}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          isLoading={isLoadingMore}
        />
      )}

      {/* Message for users not on the leaderboard */}
      {currentUserAddress && !userRank && leaderboard.length > 0 && userCheckinCount === 0 && (
        <div className="mt-4 p-4 border-t border-emerald-100 dark:border-emerald-800/30">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            You haven't made it to the leaderboard yet. Keep checking in daily to climb the ranks!
          </p>
        </div>
      )}

      {/* Refresh button */}
      <div className="mt-4 text-right">
        <button
          onClick={onRefresh}
          disabled={isLoadingMore}
          className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm flex items-center justify-center mx-auto transition-colors disabled:opacity-50"
        >
          <FaRedo className={`w-3 h-3 mr-1 ${isLoadingMore ? "animate-spin" : ""}`} />
          Refresh Leaderboard
        </button>
      </div>
    </div>
  )
}

// User stats component
const UserStats = ({
  userRank,
  userCheckinCount,
}: {
  userRank: number | null
  userCheckinCount: number
}) => (
  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg mb-6 border border-emerald-100 dark:border-emerald-800/30 transition-all duration-300">
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
          ) : userCheckinCount > 0 ? (
            <span>Keep checking in to climb the ranks!</span>
          ) : (
            <span>Complete your first check-in to join the leaderboard!</span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm border border-emerald-200 dark:border-emerald-800/30">
          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center">
            <FaCheckCircle className="w-4 h-4 mr-1 text-emerald-500" />
            {userCheckinCount || 0} check-ins
          </span>
        </div>
      </div>
    </div>
  </div>
)

// Leaderboard table component
const LeaderboardTable = ({
  leaderboard,
  currentPage,
  entriesPerPage,
  isLoadingMore,
}: {
  leaderboard: LeaderboardEntryWithUserFlag[]
  currentPage: number
  entriesPerPage: number
  isLoadingMore: boolean
}) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800/30">
        <tr>
          <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Rank
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Address
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Check-ins
          </th>
          <th className="py-3 px-4 text-left text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider hidden md:table-cell">
            Last Check-in
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/30">
        {isLoadingMore
          ? // Loading placeholder rows
            Array.from({ length: entriesPerPage }).map((_, index) => (
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
                <td className="py-3 px-4 whitespace-nowrap hidden md:table-cell">
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </td>
              </tr>
            ))
          : leaderboard.map((entry, index) => {
              // Calculate the actual rank based on the current page
              const actualRank = (currentPage - 1) * entriesPerPage + index + 1

              return (
                <tr
                  key={entry.address}
                  className={`transition-colors duration-150 ${
                    entry.isCurrentUser
                      ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/30"
                      : index % 2 === 0
                        ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  style={entry.isCurrentUser ? { borderLeft: `4px solid ${COLORS.teaMedium}` } : {}}
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {actualRank === 1 ? (
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                          <FaTrophy className="text-yellow-500" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center">
                          <span
                            className={`font-mono ${entry.isCurrentUser ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                          >
                            #{actualRank}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`${
                          entry.isCurrentUser
                            ? "font-bold text-emerald-600 dark:text-emerald-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {formatAddress(entry.address)}
                      </span>
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
                          actualRank === 1
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            : "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                        }`}
                      >
                        {entry.checkinCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {entry.lastCheckin ? formatTimestamp(entry.lastCheckin) : "N/A"}
                  </td>
                </tr>
              )
            })}
      </tbody>
    </table>
  </div>
)

export default Leaderboard