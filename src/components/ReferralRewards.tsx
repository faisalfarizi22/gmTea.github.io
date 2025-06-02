"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
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
import { checkUsername, getProvider, getReferralContract } from "@/utils/badgeWeb3"
import type { ReferralStats } from "@/types/badge"
import { REFERRAL_CONTRACT_ADDRESS } from "@/utils/constants"
import GMTeaReferralABI from "../abis/GMTeaReferralABI.json"

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

  const getEthereumProvider = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        console.warn("Ethereum object not found in window");
        return null;
      }
      
      return new ethers.providers.Web3Provider(ethereum, "any");
    } catch (error) {
      console.error("Error creating Web3Provider:", error);
      return null;
    }
  };

  const fetchReferralStatsFromBlockchain = async () => {
    if (!address) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      let provider: ethers.providers.Provider | null | undefined = null;
      
      if (signer) {
        try {
          provider = signer.provider;
          console.log("Using provider from signer");
        } catch (signerError) {
          console.warn("Could not get provider from signer:", signerError);
        }
      }
      
      if (!provider) {
        provider = getEthereumProvider();
        console.log("Using provider from window.ethereum");
      }
      
      if (!provider) {
        provider = getProvider();
        console.log("Using provider from badgeWeb3.getProvider");
      }
      
      if (!provider) {
        console.error("No provider available. Setting default stats.");
        setReferralStats({
          totalReferrals: 0,
          pendingRewardsAmount: "0",
          claimedRewardsAmount: "0",
        });
        
        const usernameResult = await checkUsername(address);
        setUsername(usernameResult);
        
        setIsLoading(false);
        return;
      }

      const referralContract = new ethers.Contract(
        REFERRAL_CONTRACT_ADDRESS,
        GMTeaReferralABI,
        provider
      );
      
      console.log("Fetching referral stats for address:", address);
      const stats = await referralContract.getReferralStats(address);
      console.log("Raw referral stats from blockchain:", stats);
      
      const formattedStats = {
        totalReferrals: stats.totalReferrals.toNumber(),
        pendingRewardsAmount: ethers.utils.formatEther(stats.pendingRewardsAmount),
        claimedRewardsAmount: ethers.utils.formatEther(stats.claimedRewardsAmount)
      };
      
      console.log("Formatted referral stats:", formattedStats);
      
      setReferralStats(formattedStats);
      
      const usernameResult = await checkUsername(address);
      setUsername(usernameResult);
      
      console.log("Loaded referral stats directly from blockchain:", formattedStats);
    } catch (error) {
      console.error("Error fetching referral stats from blockchain:", error);
      setReferralStats({
        totalReferrals: 0,
        pendingRewardsAmount: "0",
        claimedRewardsAmount: "0",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralStatsFromBlockchain();
  }, [address, claimSuccess, signer]);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await fetchReferralStatsFromBlockchain();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyLink = () => {
    const referralLink = username ? `${username}` : `${address}`;

    navigator.clipboard.writeText(referralLink);
    setCopySuccess("Copied!");

    setTimeout(() => {
      setCopySuccess("");
    }, 2000);
  };

  const handleClaimRewardsFromBlockchain = async () => {
    if (!signer) {
      setClaimError("Wallet not connected. Please connect your wallet.");
      return;
    }

    if (!referralStats) {
      setClaimError("Referral stats not loaded. Please refresh and try again.");
      return;
    }

    const pendingAmount = Number.parseFloat(referralStats.pendingRewardsAmount);
    if (pendingAmount <= 0) {
      setClaimError("No rewards available to claim.");
      return;
    }

    try {
      setIsClaiming(true);
      setClaimError(null);
      setClaimSuccess(false);
      setClaimTxHash(null);

      const currentPendingAmount = pendingAmount;
      const currentClaimedAmount = Number.parseFloat(referralStats.claimedRewardsAmount);

      const referralContract = new ethers.Contract(
        REFERRAL_CONTRACT_ADDRESS,
        GMTeaReferralABI,
        signer
      );

      const tx = await referralContract.claimRewards({
        gasLimit: 300000, 
      });

      console.log("Claim transaction sent:", tx.hash);

      await tx.wait();

      setReferralStats(prevStats => {
        if (!prevStats) return null;
        return {
          ...prevStats,
          pendingRewardsAmount: "0",
          claimedRewardsAmount: (currentClaimedAmount + currentPendingAmount).toFixed(4)
        };
      });

      setClaimSuccess(true);
      setClaimTxHash(tx.hash);

      if (onClaimComplete) {
        onClaimComplete();
      }

      setTimeout(() => {
        fetchReferralStatsFromBlockchain();
      }, 2000);
    } catch (error) {
      console.error("Error claiming rewards:", error);

      let errorMessage = "Failed to claim rewards. Please try again.";

      if (error && typeof error === 'object') {
        const err = error as any;
        
        if (err.reason) {
          errorMessage = err.reason;
        } else if (err.code === 4001) {
          errorMessage = "Transaction was rejected by user";
        } else if (err.message) {
          if (typeof err.message === 'string') {
            if (err.message.includes("user rejected")) {
              errorMessage = "Transaction rejected by user";
            } else if (err.message.includes("insufficient funds")) {
              errorMessage = "Insufficient funds to complete the transaction";
            } else if (err.message.includes("execution reverted")) {
              const revertMatch = err.message.match(/execution reverted:(.+?)(?:\n|$)/);
              errorMessage = revertMatch ? revertMatch[1].trim() : "Transaction failed on the blockchain";
            } else {
              errorMessage = err.message;
            }
          }
        }
      }

      setClaimError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  };

  useEffect(() => {
    const checkProviderStatus = async () => {
      const provider = getEthereumProvider();
      const badgeWeb3Provider = getProvider();
      
      console.log("Provider from window.ethereum:", provider ? "Available" : "Not available");
      console.log("Provider from badgeWeb3:", badgeWeb3Provider ? "Available" : "Not available");
      
      if (signer) {
        console.log("Signer provider:", signer.provider ? "Available" : "Not available");
        try {
          const network = await signer.provider?.getNetwork();
          console.log("Network from signer:", network);
        } catch (error) {
          console.warn("Could not get network from signer:", error);
        }
      } else {
        console.log("Signer not available");
      }
    };
    
    checkProviderStatus();
  }, [signer]);

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
  const referralLink = username ? `${username}` : `${address}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20 overflow-hidden"
    >
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            onClick={handleClaimRewardsFromBlockchain}
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
              <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300">Your Referral Code</h3>
              <p className="text-gray-600 dark:text-emerald-300/70 text-sm mt-1">
                Share your referral code with friends to earn rewards when they mint badges
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