"use client"

import { useState, useEffect, useCallback } from "react"
import Head from "next/head"
import { motion } from "framer-motion"
import { FaNetworkWired, FaLeaf } from "react-icons/fa"
import Navbar from "@/components/Navbar"
import WalletRequired from "@/components/WalletRequired"
import AudioPlayer from "@/components/AudioPlayer"
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
import { useUserData } from "@/hooks/useUserData"
import { useNotifications } from "@/hooks/useNotifications"
import { getAvatarUrl } from "../profile/utils/profileUtils"
import { TEA_SEPOLIA_CHAIN_ID } from "@/utils/constants"
import { connectWallet, switchToTeaSepolia, getContract } from "@/utils/web3"
import { getUserSocialBenefits } from "@/utils/socialBenefitsUtils"
import { UserSocialBenefits } from "@/types/user"
import type { Web3State } from "@/types"
import { ethers } from "ethers"

// Type for the active tab
type ActiveTab = "overview" | "badges" | "achievements" | "referrals" | "benefits"

export default function ProfilePage() {
  // Web3 state
  const [web3State, setWeb3State] = useState<Web3State>({
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    contract: null,
    isLoading: false,
    error: null,
    chainId: null,
  })

  // UI state
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false)
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false)
  const [showPointsBreakdown, setShowPointsBreakdown] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview")
  const [socialBenefits, setSocialBenefits] = useState<UserSocialBenefits>({
    usernameColor: null,
    avatarFrame: null,
    isFrameAnimated: false,
    chatEmotes: false,
    coloredText: false,
    messageEffects: false,
    profileBackground: null
  })

  // Get notifications hook
  const { 
    notifications, 
    addNotification, 
    removeNotification 
  } = useNotifications()

  // Use userData hook
  const {
    userData: {
      checkinCount,
      leaderboardRank,
      leaderboardPoints,
      hasUsername,
      username,
      hasReferrer,
      highestTier,
      userBadges,
      activeBenefits,
      referralStats,
      isLoadingUserData,
      dataLoaded
    },
    loadUserData
  } = useUserData({
    web3State,
    addNotification
  })

  // Connect wallet function
  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return

    try {
      console.log("Connecting wallet...")
      setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }))

      // Check if already connected through provider
      const ethereum = (window as any).ethereum
      let address, provider, signer, chainId

      if (ethereum && ethereum.selectedAddress) {
        // Wallet already connected
        address = ethereum.selectedAddress
        provider = new ethers.providers.Web3Provider(ethereum)
        signer = provider.getSigner()
        chainId = Number.parseInt(ethereum.chainId, 16)
      } else {
        // Not connected, use normal connectWallet function
        const result = await connectWallet()

        if (!result || !result.address) {
          throw new Error("Failed to connect: No address returned")
        }
        ;({ signer, address, chainId, provider } = result)
      }

      const isCorrectNetwork = chainId === TEA_SEPOLIA_CHAIN_ID
      setShowNetworkAlert(!isCorrectNetwork)

      const contract = getContract(signer)

      // Update state
      setWeb3State({
        isConnected: true,
        address,
        provider,
        signer,
        contract,
        isLoading: false,
        error: null,
        chainId,
      })

      // Set to localStorage for persistence
      localStorage.setItem("walletConnected", "true")
      localStorage.setItem("walletAddress", address)

      // Load user data
      if (isCorrectNetwork) {
        await loadUserData(address, contract)
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error)

      setWeb3State((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error.message || "Failed to connect wallet",
      }))

      addNotification(error.message || "Failed to connect wallet", "error")

      // Clear any stored connection data
      localStorage.removeItem("walletConnected")
      localStorage.removeItem("walletAddress")
    }
  }, [web3State.isLoading, loadUserData, addNotification])

  // Disconnect wallet function
  const handleDisconnectWallet = useCallback(() => {
    // Reset web3 state
    setWeb3State({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      contract: null,
      isLoading: false,
      error: null,
      chainId: null,
    })

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
      setWeb3State((prev) => ({ ...prev, isLoading: true }))

      await switchToTeaSepolia()
      setShowNetworkAlert(false)

      // Reconnect with correct network
      await handleConnectWallet()
    } catch (error) {
      console.error("Error switching network:", error)
      setWeb3State((prev) => ({ ...prev, isLoading: false }))
    }
  }, [handleConnectWallet])

  // Attempt to reconnect wallet on page load
  useEffect(() => {
    const checkPreviousConnection = async () => {
      try {
        const wasConnected = localStorage.getItem("walletConnected") === "true"
        const storedAddress = localStorage.getItem("walletAddress")

        if (wasConnected && storedAddress && !web3State.isConnected && !web3State.isLoading) {
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
  }, [handleConnectWallet, web3State.isConnected, web3State.isLoading])

  // Use Ethereum Events hook
  useEthereumEvents({
    accountsChanged: (accounts) => {
      if (accounts.length === 0) {
        handleDisconnectWallet()
      } else if (web3State.address !== accounts[0] && web3State.isConnected) {
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

  // Load user data on connection - with debounce to prevent multiple loads
  useEffect(() => {
    if (!web3State.isConnected || !web3State.address || !web3State.contract) return

    // Add a check to prevent redundant loading
    if (!dataLoaded && !isLoadingUserData) {
      loadUserData(web3State.address, web3State.contract)
    }

    // Set up refresh interval - update every 2 minutes (increased from 1 minute)
    const refreshInterval = setInterval(() => {
      if (web3State.address && web3State.contract && !isLoadingUserData) {
        loadUserData(web3State.address, web3State.contract)
      }
    }, 120000)

    return () => clearInterval(refreshInterval)
  }, [web3State.isConnected, web3State.address, web3State.contract, loadUserData, dataLoaded, isLoadingUserData])

  // Update social benefits when highest tier changes
  useEffect(() => {
    setSocialBenefits(getUserSocialBenefits(highestTier))
  }, [highestTier])

  // Handle username registration completion
  const handleRegistrationComplete = async () => {
    if (!web3State.address || !web3State.contract) return

    // Reload user data to update username status
    await loadUserData(web3State.address, web3State.contract)

    // Hide username modal
    setShowUsernameModal(false)
  }

  // Copy address to clipboard
  const copyAddressToClipboard = () => {
    if (web3State.address) {
      navigator.clipboard.writeText(web3State.address)
      addNotification("Address copied to clipboard!", "success")
    }
  }

  // Handle referral rewards claim completion
  const handleRewardsClaimComplete = () => {
    // Refresh user data after claiming rewards
    if (web3State.address && web3State.contract) {
      loadUserData(web3State.address, web3State.contract)
      addNotification("Rewards claimed successfully!", "success")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/90 tea-leaf-pattern text-gray-800 dark:text-emerald-50">
      <Head>
        <title>Digital Profile | GM TEA</title>
        <meta name="description" content="View your GM TEA profile and digital credentials" />
      </Head>

      <Navbar
        address={web3State.address}
        connectWallet={handleConnectWallet}
        disconnectWallet={handleDisconnectWallet}
        isConnecting={web3State.isLoading}
      />

      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Network alert */}
        {showNetworkAlert && (
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
                    onClick={handleSwitchNetwork}
                    className="px-4 py-1.5 rounded-lg bg-white text-yellow-700 text-sm font-medium hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all shadow-md"
                  >
                    Switch Network
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <WalletRequired
          isConnected={web3State.isConnected}
          connectWallet={handleConnectWallet}
          isConnecting={web3State.isLoading}
        >
          {/* Main Profile Content */}
          {!web3State.isConnected || (isLoadingUserData && !dataLoaded) ? (
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
                {web3State.isConnected
                  ? "Loading digital credentials..."
                  : "Connect wallet to access your digital profile"}
              </p>
              <p className="text-emerald-600/60 dark:text-emerald-500/60 text-sm mt-2">
                {web3State.isConnected ? "Retrieving your on-chain data" : "Authentication required"}
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
                address={web3State.address}
                username={username}
                highestTier={highestTier}
                avatarUrl={web3State.address ? getAvatarUrl(web3State.address) : null}
                hasUsername={hasUsername}
                showUsernameModal={() => setShowUsernameModal(true)}
                copyAddressToClipboard={copyAddressToClipboard}
              />
              
              {/* Tab navigation */}
              <div className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl overflow-hidden border border-gray-200 dark:border-emerald-500/20 shadow-lg">
                <ProfileTabs
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  referralStats={referralStats}
                />
                
                <div className="p-6">
                  {/* Tab content */}
                  {activeTab === "overview" && web3State.address && (
                    <OverviewTab
                        address={web3State.address}
                        checkinCount={checkinCount}
                        leaderboardRank={leaderboardRank}
                        highestTier={highestTier}
                        userBadges={userBadges}
                        setShowPointsBreakdown={setShowPointsBreakdown}
                        setActiveTab={(tab) => setActiveTab(tab as ActiveTab)}
                        activeBenefits={activeBenefits}
                    />
                    )}
                  
                  {activeTab === "badges" && (
                    <BadgesTab address={web3State.address} />
                  )}
                  
                  {activeTab === "achievements" && (
                    <AchievementsTab
                      checkinCount={checkinCount}
                      username={username}
                      highestTier={highestTier}
                    />
                  )}
                  
                  {activeTab === "referrals" && (
                    <ReferralsTab
                      address={web3State.address}
                      signer={web3State.signer}
                      username={username}
                      showUsernameModal={() => setShowUsernameModal(true)}
                      onRewardsClaimComplete={handleRewardsClaimComplete}
                    />
                  )}
                  
                  {activeTab === "benefits" && (
                    <BenefitsTab
                      highestTier={highestTier}
                      address={web3State.address}
                      username={username}
                      socialBenefits={socialBenefits}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Username Registration Modal */}
          {showUsernameModal && web3State.address && web3State.signer && (
            <UsernameModal
              address={web3State.address}
              signer={web3State.signer}
              hasReferrer={hasReferrer}
              onClose={() => setShowUsernameModal(false)}
              onRegistrationComplete={handleRegistrationComplete}
            />
          )}

          {/* Points Breakdown Modal */}
          {showPointsBreakdown && web3State.address && (
            <PointsBreakdownModal
              onClose={() => setShowPointsBreakdown(false)}
              address={web3State.address}
              checkinCount={checkinCount}
              leaderboardRank={leaderboardRank}
              highestTier={highestTier}
            />
          )}

          {/* Audio Player - Fixed position */}
          <AudioPlayer initialVolume={0.3} />
        </WalletRequired>
      </main>

      <footer className="mt-auto py-8 border-t border-gray-200 dark:border-emerald-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-emerald-500 dark:bg-emerald-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-emerald-300/70">
                GM Onchain — Built for the Tea Sepolia Testnet
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-emerald-300/70">
                <div className="h-2 w-2 bg-emerald-500 dark:bg-emerald-500 rounded-full"></div>
                <span>Daily GM check-ins on the blockchain</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Notifications */}
      <ProfileNotifications 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />

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