"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { FaNetworkWired, FaLeaf } from "react-icons/fa"
import ProfileHeader from "@/components/profile/ProfileHeader"
import ProfileTabs from "@/components/profile/ProfileTabs"
import ProfileNotifications from "@/components/profile/ProfileNotifications"
import UsernameModal from "@/components/profile/modals/UsernameModal"
import PointsBreakdownModal from "@/components/profile/modals/PointBreakdownModal"
import OverviewTab from "@/components/profile/tabs/OverviewTab"
import BadgesTab from "@/components/profile/tabs/BadgesTab"
import AchievementsTab from "@/components/profile/tabs/AchievementsTab"
import ReferralsTab from "@/components/profile/tabs/ReferralsTab"
import BenefitsTab from "@/components/profile/tabs/BenefitsTab"
import { useEthereumEvents } from "@/hooks/useEthereumEvents"
import { useUserDataCombined } from "@/hooks/useUserData"
import { useNotifications } from "@/hooks/useNotifications"
import { getAvatarUrl } from "../profile/utils/profileUtils"
import { TEA_SEPOLIA_CHAIN_ID } from "@/utils/constants"
import { switchToTeaSepolia } from "@/utils/web3"
import { getUserSocialBenefits } from "@/utils/socialBenefitsUtils"
import type { UserSocialBenefits } from "@/types/user"
import { useWalletState } from "@/hooks/useWalletState"

// Type for the active tab
type ActiveTab = "overview" | "badges" | "achievements" | "referrals" | "benefits"

export default function ProfilePage() {
  // Get current account using ThirdWeb
  const { web3State, connectWallet, disconnectWallet, switchNetwork } = useWalletState()

  const { address, signer, provider, isConnected, isLoading: isWalletConnecting, chainId: walletChainId } = web3State

  const adaptedConnectWallet = async (): Promise<void> => {
    await connectWallet()
  }

  // UI state
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false)
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false)
  const [showPointsBreakdown, setShowPointsBreakdown] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview")
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [socialBenefits, setSocialBenefits] = useState<UserSocialBenefits>({
    usernameColor: null,
    avatarFrame: null,
    isFrameAnimated: false,
    chatEmotes: false,
    coloredText: false,
    messageEffects: false,
    profileBackground: null,
  })

  // Get notifications hook
  const { notifications, addNotification, removeNotification } = useNotifications()

  // Use userData from database
  const {
    userData,
    badges,
    checkins,
    referrals,
    activities,
    isLoading: isLoadingUserData,
    refetch: refreshUserData,
  } = useUserDataCombined(address)

  // Connect wallet function
  const handleConnectWallet = useCallback(async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error("Error connecting wallet:", error)
      addNotification("Failed to connect wallet", "error")
    }
  }, [connectWallet, addNotification])

  // Disconnect wallet function
  const handleDisconnectWallet = useCallback(() => {
    // Reset UI state
    setShowNetworkAlert(false)
    setShowUsernameModal(false)
    setShowPointsBreakdown(false)

    // Clear local storage
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")

    console.log("Wallet disconnected")
  }, [])

  // Switch network function
  const handleSwitchNetwork = useCallback(async () => {
    try {
      setIsConnecting(true)

      await switchToTeaSepolia()
      setShowNetworkAlert(false)

      // Reconnect with correct network
      await handleConnectWallet()
    } catch (error) {
      console.error("Error switching network:", error)
    } finally {
      setIsConnecting(false)
    }
  }, [handleConnectWallet])

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        // If navigating to the profile page
        if (event.detail.tab === "profile") {
          // If a specific subtab is specified
          if (event.detail.subtab) {
            setActiveTab(event.detail.subtab as ActiveTab);
          }
        }
      }
    };

    window.addEventListener("navigate", handleNavigate as EventListener);
    return () => {
      window.removeEventListener("navigate", handleNavigate as EventListener);
    };
  }, []);

  // Attempt to reconnect wallet on page load
  useEffect(() => {
    const checkPreviousConnection = async () => {
      try {
        const wasConnected = localStorage.getItem("walletConnected") === "true"
        const storedAddress = localStorage.getItem("walletAddress")

        if (wasConnected && storedAddress && !address && !isConnecting) {
          const ethereum = (window as any).ethereum
          if (!ethereum) return

          const accounts = await ethereum.request({ method: "eth_accounts" })
          if (accounts && accounts.length > 0 && accounts.includes(storedAddress.toLowerCase())) {
            await handleConnectWallet()
          } else {
            localStorage.removeItem("walletConnected")
            localStorage.removeItem("walletAddress")
          }
        }
      } catch (error) {
        console.error("Error checking previous connection:", error)
        localStorage.removeItem("walletConnected")
        localStorage.removeItem("walletAddress")
      }
    }

    const timer = setTimeout(() => {
      checkPreviousConnection()
    }, 500)

    return () => clearTimeout(timer)
  }, [handleConnectWallet, address, isConnecting])

  // Use Ethereum Events hook
  useEthereumEvents({
    accountsChanged: (accounts) => {
      if (accounts.length === 0) {
        handleDisconnectWallet()
      } else if (accounts[0] !== address) {
        handleConnectWallet()
      }
    },
    chainChanged: () => {
      window.location.reload()
    },
    disconnect: () => {
      handleDisconnectWallet()
    },
  })

  // Debug log for signer in ProfilePage
  useEffect(() => {
    console.log("ProfilePage - signer status:", !!signer)

    if (signer) {
      signer
        .getAddress()
        .then((signerAddress) => {
          console.log("ProfilePage - verified signer address:", signerAddress)
        })
        .catch((err) => {
          console.error("Error getting signer address:", err)
        })
    }
  }, [signer])

  // Set up refresh interval for user data
  useEffect(() => {
    if (!address) return

    // Set up refresh interval - update every 2 minutes
    const refreshInterval = setInterval(() => {
      if (address && !isLoadingUserData) {
        refreshUserData()
      }
    }, 120000)

    return () => clearInterval(refreshInterval)
  }, [address, refreshUserData, isLoadingUserData])

  // Update social benefits when highest tier changes
  useEffect(() => {
    if (userData) {
      setSocialBenefits(getUserSocialBenefits(userData.highestBadgeTier))
    }
  }, [userData])

  // Handle username registration completion
  const handleRegistrationComplete = async () => {
    // Refresh user data to update username status
    refreshUserData()

    // Hide username modal
    setShowUsernameModal(false)
  }

  // Copy address to clipboard
  const copyAddressToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      addNotification("Address copied to clipboard!", "success")
    }
  }

  // Handle referral rewards claim completion
  const handleRewardsClaimComplete = () => {
    // Refresh user data after claiming rewards
    refreshUserData()
    addNotification("Rewards claimed successfully!", "success")
  }

  // Check if user has a referrer
  const hasReferrer = userData?.referrer ? true : false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/90 tea-leaf-pattern text-gray-800 dark:text-emerald-50">
      <main className=" pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Network alert */}
        {walletChainId && walletChainId !== TEA_SEPOLIA_CHAIN_ID && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 backdrop-blur-md p-4 border-l-4 border-yellow-600 shadow-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaNetworkWired className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-white">
                    Please switch to the Tea Sepolia Testnet to view your digital profile.
                  </p>
                </div>
                <div>
                  <button
                    onClick={switchNetwork}
                    className="px-4 py-1.5 rounded-lg bg-white text-yellow-700 text-sm font-medium hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all shadow-md"
                  >
                    Switch Network
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Profile Content */}
        {!address || isLoadingUserData ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaLeaf className="text-emerald-400 text-2xl animate-pulse" />
              </div>
            </div>
            <p className="text-emerald-500 dark:text-emerald-300 mt-6 font-medium tracking-wide">
              {address ? "Loading digital credentials..." : "Connect wallet to access your digital profile"}
            </p>
            <p className="text-emerald-600/60 dark:text-emerald-500/60 text-sm mt-2">
              {address ? "Retrieving your on-chain data" : "Authentication required"}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Profile Header */}
            <ProfileHeader
              address={address}
              username={userData?.username || null}
              highestTier={userData?.highestBadgeTier || -1}
              avatarUrl={address ? getAvatarUrl(address) : null}
              hasUsername={!!userData?.username}
              showUsernameModal={() => setShowUsernameModal(true)}
              copyAddressToClipboard={copyAddressToClipboard}
            />

            {/* Tab navigation */}
            <div className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl overflow-hidden border border-gray-200 dark:border-emerald-500/20 shadow-lg">
              <ProfileTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                badgeCount={badges.length}
                checkinCount={userData?.checkinCount || 0}
                referralCount={referrals.length}
              />

              <div className="p-6">
                {/* Tab content */}
                {activeTab === "overview" && address && (
                  <OverviewTab
                    address={address}
                    checkinCount={userData?.checkinCount || 0}
                    leaderboardRank={userData?.rank || 0}
                    highestTier={userData?.highestBadgeTier || -1}
                    userBadges={badges}
                    setShowPointsBreakdown={setShowPointsBreakdown}
                    setActiveTab={(tab) => setActiveTab(tab as ActiveTab)}
                    activeBenefits={[]} // Can be computed based on tier
                  />
                )}

                {activeTab === "badges" && <BadgesTab address={address} badges={badges} />}

                {activeTab === "achievements" && (
                  <AchievementsTab
                    checkinCount={userData?.checkinCount || 0}
                    username={userData?.username || null}
                    highestTier={userData?.highestBadgeTier || -1}
                  />
                )}

                {activeTab === "referrals" && (
                  <ReferralsTab
                    address={web3State.address}
                    signer={web3State.signer}
                    username={userData?.username || null}
                    showUsernameModal={() => setShowUsernameModal(true)}
                    onRewardsClaimComplete={handleRewardsClaimComplete}
                  />
                )}

                {activeTab === "benefits" && (
                  <BenefitsTab
                    highestTier={userData?.highestBadgeTier || -1}
                    address={address}
                    username={userData?.username || null}
                    socialBenefits={socialBenefits}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Username Registration Modal */}
        {showUsernameModal && address && (
          <UsernameModal
            address={address}
            signer={signer}
            hasReferrer={hasReferrer}
            onClose={() => setShowUsernameModal(false)}
            onRegistrationComplete={handleRegistrationComplete}
          />
        )}
        {/* Points Breakdown Modal */}
        {showPointsBreakdown && address && userData && (
          <PointsBreakdownModal
            onClose={() => setShowPointsBreakdown(false)}
            address={address}
            checkinCount={userData.checkinCount}
            leaderboardRank={userData.rank || 0}
            highestTier={userData.highestBadgeTier}
          />
        )}

      </main>

      {/* Notifications */}
      <ProfileNotifications notifications={notifications} removeNotification={removeNotification} />

      {/* Custom animation styles */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }

        .tea-leaf-pattern {
          background-color: #f9fafb;
          background-image: radial-gradient(rgba(16, 185, 129, 0.07) 1px, transparent 1px);
          background-size: 25px 25px;
        }

        .dark .tea-leaf-pattern {
          background-color: #000000;
          background-image: radial-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px);
          background-size: 25px 25px;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* CSS for modal blur fix */
        @supports (transform: translateZ(0)) {
          .modal-container {
            transform: translateZ(0);
            backface-visibility: hidden;
            will-change: transform;
          }
        }
        
        @supports (-webkit-backdrop-filter: none) {
          .modal-container {
            transform: translate3d(0, 0, 0);
          }
        }
        
        .modal-content {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  )
}
