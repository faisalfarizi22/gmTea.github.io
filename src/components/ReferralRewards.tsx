"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { ethers } from "ethers"
import { motion } from "framer-motion"
import {
  FaSpinner,
  FaEthereum,
  FaCheck,
  FaTimes,
  FaSync,
  FaLeaf,
  FaLink,
  FaClipboard,
  FaExclamationCircle,
  FaMoneyBillWave,
  FaUsers,
  FaChartLine,
} from "react-icons/fa"
import { getUserReferralStats, checkUsername, getReferralContract } from "@/utils/badgeWeb3"
import type { ReferralStats } from "@/types/badge"

interface ReferralRewardsProps {
  address: string
  signer: ethers.Signer | null
  onClaimComplete?: () => void
}

const ReferralRewards: React.FC<ReferralRewardsProps> = ({ address, signer, onClaimComplete }) => {
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState("")

  // Function to fetch referral stats
  const fetchReferralStats = async () => {
    if (!address) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const stats = await getUserReferralStats(address)

      if (stats) {
        setReferralStats(stats)
      } else {
        // Set default stats if error occurs
        setReferralStats({
          totalReferrals: 0,
          pendingRewardsAmount: "0",
          claimedRewardsAmount: "0",
        })
      }

      // Get username
      const usernameResult = await checkUsername(address)
      setUsername(usernameResult)
    } catch (error) {
      console.error("Error fetching referral stats:", error)
      // Set default stats if error occurs
      setReferralStats({
        totalReferrals: 0,
        pendingRewardsAmount: "0",
        claimedRewardsAmount: "0",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load referral stats on mount and when address or claimSuccess changes
  useEffect(() => {
    fetchReferralStats()
  }, [address, claimSuccess])

  // Manual refresh function
  const handleRefresh = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      await fetchReferralStats()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle copy to clipboard
  const handleCopyLink = () => {
    const referralLink = username ? `https://gmtea.xyz/r/${username}` : `https://gmtea.xyz/r/${address}`

    navigator.clipboard.writeText(referralLink)
    setCopySuccess("Copied!")

    setTimeout(() => {
      setCopySuccess("")
    }, 2000)
  }

  // Fixed claim rewards function that uses referral contract instead of badge contract
  const handleClaimRewards = async () => {
    // Validate inputs
    if (!signer) {
      setClaimError("Wallet not connected. Please connect your wallet.")
      return
    }

    if (!referralStats) {
      setClaimError("Referral stats not loaded. Please refresh and try again.")
      return
    }

    const pendingAmount = Number.parseFloat(referralStats.pendingRewardsAmount)
    if (pendingAmount <= 0) {
      setClaimError("No rewards available to claim.")
      return
    }

    try {
      // Reset states
      setIsClaiming(true)
      setClaimError(null)
      setClaimSuccess(false)
      setClaimTxHash(null)

      // Get referral contract instead of badge contract
      const referralContract = getReferralContract(signer)

      // Call the claimRewards function on the referral contract
      const tx = await referralContract.claimRewards({
        gasLimit: 300000, // Add explicit gas limit to avoid estimation issues
      })

      console.log("Claim transaction sent:", tx.hash)

      // Wait for transaction confirmation
      await tx.wait()

      setClaimSuccess(true)
      setClaimTxHash(tx.hash)

      // Notify parent component if callback provided
      if (onClaimComplete) {
        onClaimComplete()
      }

      // Re-fetch stats after successful claim
      setTimeout(() => {
        fetchReferralStats()
      }, 2000) // Add a small delay to allow blockchain to update
    } catch (error: any) {
      console.error("Error claiming rewards:", error)

      // Extract user-friendly error message
      let errorMessage = "Failed to claim rewards. Please try again."

      if (error.reason) {
        errorMessage = error.reason
      } else if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction rejected by user"
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction"
        } else if (error.message.includes("execution reverted")) {
          const revertMatch = error.message.match(/execution reverted:(.+?)(?:\n|$)/)
          errorMessage = revertMatch ? revertMatch[1].trim() : "Transaction failed on the blockchain"
        } else {
          errorMessage = error.message
        }
      }

      setClaimError(errorMessage)
    } finally {
      setIsClaiming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20 min-h-[50vh]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
          <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaLeaf className="text-emerald-500 dark:text-emerald-400 text-2xl animate-pulse" />
          </div>
        </div>
        <p className="text-emerald-600 dark:text-emerald-300 mt-6 font-medium tracking-wide">Loading referral data...</p>
        <p className="text-emerald-500/60 text-sm mt-2">Retrieving your referral information</p>
      </div>
    )
  }

  if (!referralStats) {
    return (
      <div className="p-6 bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20">
        <div className="flex items-center mb-4 text-yellow-500 dark:text-yellow-400">
          <FaExclamationCircle className="mr-2" />
          <h3 className="text-lg font-medium">Unable to load referral information</h3>
        </div>
        <p className="text-gray-700 dark:text-emerald-300/70 mb-4">
          There was a problem retrieving your referral stats. Please try again.
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-md transition-colors flex items-center shadow-lg hover:shadow-emerald-500/20"
        >
          <FaSync className="mr-2" /> Try Again
        </button>
      </div>
    )
  }

  const hasPendingRewards = Number.parseFloat(referralStats.pendingRewardsAmount) > 0
  const referralLink = username ? `https://gmtea.xyz/r/${username}` : `https://gmtea.xyz/r/${address}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-gray-200 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-transparent dark:bg-gradient-to-r dark:from-emerald-300 dark:to-teal-200 dark:bg-clip-text mb-2">
              Referral Program
            </h2>
            <p className="text-gray-600 dark:text-emerald-300/70 text-sm">Earn rewards by inviting others to join GM Tea</p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-4 md:mt-0 flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-50 transition-colors"
            title="Refresh data"
          >
            <FaSync className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </motion.div>
      </div>

      <div className="p-6 md:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Referrals */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-emerald-50 dark:bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-200 dark:border-emerald-500/20 p-5 relative overflow-hidden"
          >
            <div className="flex items-center mb-1">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-black/30 text-emerald-600 dark:text-emerald-400 mr-2">
                <FaUsers className="h-3 w-3" />
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">Total Referrals</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{referralStats.totalReferrals}</p>
            <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700/30">
              <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60">Users onboarded</p>
            </div>
            <div className="absolute bottom-2 right-2 opacity-10">
              <FaUsers className="h-10 w-10 text-emerald-500" />
            </div>
          </motion.div>

          {/* Pending Rewards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-emerald-50 dark:bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-200 dark:border-emerald-500/20 p-5 relative overflow-hidden"
          >
            <div className="flex items-center mb-1">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-black/30 text-emerald-600 dark:text-emerald-400 mr-2">
                <FaMoneyBillWave className="h-3 w-3" />
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">Pending Rewards</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
              {Number.parseFloat(referralStats.pendingRewardsAmount).toFixed(4)}
              <span className="text-lg ml-1 font-medium text-emerald-500/70 dark:text-emerald-400/70">TEA</span>
            </p>
            <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700/30">
              <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60">Available to claim</p>
            </div>
            <div className="absolute bottom-2 right-2 opacity-10">
              <FaMoneyBillWave className="h-10 w-10 text-emerald-500" />
            </div>
          </motion.div>

          {/* Total Claimed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-emerald-50 dark:bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-200 dark:border-emerald-500/20 p-5 relative overflow-hidden"
          >
            <div className="flex items-center mb-1">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-black/30 text-emerald-600 dark:text-emerald-400 mr-2">
                <FaChartLine className="h-3 w-3" />
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">Total Claimed</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
              {Number.parseFloat(referralStats.claimedRewardsAmount).toFixed(4)}
              <span className="text-lg ml-1 font-medium text-emerald-500/70 dark:text-emerald-400/70">TEA</span>
            </p>
            <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700/30">
              <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60">Previously claimed</p>
            </div>
            <div className="absolute bottom-2 right-2 opacity-10">
              <FaChartLine className="h-10 w-10 text-emerald-500" />
            </div>
          </motion.div>
        </div>

        {/* Claim Rewards Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mb-6 bg-emerald-50 dark:bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-200 dark:border-emerald-500/20 p-6"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FaEthereum className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300">Claim Your Rewards</h3>
              <p className="text-gray-600 dark:text-emerald-300/70 text-sm mt-1">Transfer your earned rewards to your wallet</p>
            </div>
          </div>

          {hasPendingRewards ? (
            <div className="bg-emerald-100/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-200 p-4 rounded-md mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-emerald-200 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <FaLeaf className="h-4 w-4" />
              </div>
              <p>
                You have{" "}
                <span className="font-bold">
                  {Number.parseFloat(referralStats.pendingRewardsAmount).toFixed(4)} TEA
                </span>{" "}
                pending rewards available to claim!
              </p>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-emerald-900/20 border border-gray-200 dark:border-emerald-500/30 text-gray-700 dark:text-emerald-300/70 p-4 rounded-md mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-gray-200 dark:bg-emerald-900/40 text-gray-500 dark:text-emerald-400/50">
  <FaLeaf className="h-4 w-4" />
</div>
              <p>No pending rewards available at the moment. Share your referral link to start earning!</p>
            </div>
          )}

          <button
            onClick={handleClaimRewards}
            disabled={isClaiming || !hasPendingRewards || !signer || claimSuccess}
            className={`w-full py-3 px-4 rounded-md font-medium transition-all shadow-lg ${
              isClaiming || !hasPendingRewards || !signer || claimSuccess
                ? "bg-gray-100 dark:bg-emerald-900/30 text-gray-400 dark:text-emerald-500/50 cursor-not-allowed border border-gray-200 dark:border-emerald-500/20"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white hover:shadow-emerald-500/20"
            }`}
          >
            {isClaiming ? (
              <span className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-2" />
                Claiming...
              </span>
            ) : claimSuccess ? (
              <span className="flex items-center justify-center">
                <FaCheck className="mr-2" />
                Claimed Successfully
              </span>
            ) : !hasPendingRewards ? (
              "No Rewards to Claim"
            ) : !signer ? (
              "Connect Wallet to Claim"
            ) : (
              `Claim ${Number.parseFloat(referralStats.pendingRewardsAmount).toFixed(4)} TEA`
            )}
          </button>

          {/* Error Message */}
          {claimError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 rounded-md">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400">
                  <FaTimes className="h-4 w-4" />
                </div>
                <p>{claimError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {claimSuccess && (
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-md">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <FaCheck className="h-4 w-4" />
                </div>
                <div>
                  <p>Rewards claimed successfully!</p>
                  {claimTxHash && (
                    <a
                      href={`https://sepolia.tea.xyz/tx/${claimTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline text-sm mt-1 inline-block transition-colors"
                    >
                      View transaction
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Referral Link Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 backdrop-blur-sm rounded-xl border border-emerald-200 dark:border-emerald-500/20 p-6"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FaLink className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300">Your Referral Link</h3>
              <p className="text-gray-600 dark:text-emerald-300/70 text-sm mt-1">
                Share this link with friends to earn rewards when they mint badges
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full p-3 pr-32 bg-white dark:bg-black/30 border border-emerald-200 dark:border-emerald-500/30 rounded-md text-gray-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium rounded-md transition-colors text-sm flex items-center shadow-lg hover:shadow-emerald-500/20"
            >
              <FaClipboard className="mr-1.5 h-3 w-3" />
              {copySuccess || "Copy"}
            </button>
          </div>

          {username && (
            <p className="mt-2 text-xs text-emerald-600/60 dark:text-emerald-400/60">
              Using your username <span className="font-semibold text-emerald-600 dark:text-emerald-300">{username}</span> for more memorable
              referral links.
            </p>
          )}
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-6 text-xs text-gray-600 dark:text-emerald-400/60 bg-gray-50 dark:bg-emerald-900/10 border border-gray-200 dark:border-emerald-500/20 p-4 rounded-md"
        >
          <p>
            <span className="font-medium text-gray-700 dark:text-emerald-300">How it works:</span> You earn rewards when users mint badges
            using your referral link. The percentage you earn depends on your badge tier - from 5% (Common) up to 25%
            (Legendary).
          </p>
        </motion.div>
      </div>

      {/* Custom animation style */}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </motion.div>
  )
}

export default ReferralRewards