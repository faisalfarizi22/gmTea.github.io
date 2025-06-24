"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ethers } from "ethers"
import { formatAddress } from "@/utils/web3"
import ThemeToggle from "./ThemeToggle"
import {
  FaLeaf,
  FaSignOutAlt,
  FaChevronDown,
  FaBars,
  FaTimes,
  FaUser,
  FaMedal,
  FaCog,
  FaHistory,
  FaGift,
  FaIdCard,
  FaCopy,
  FaTrophy,
  FaHome,
  FaTint,
  FaSync,
} from "react-icons/fa"
import ConnectWalletButton from "./ConnectWalletButton"
import { checkUsername, getProvider } from "@/utils/badgeWeb3"
import ActivitySidebar from "./ActivitySidebar"
import SettingsModal from "./SettingsModal"
import ColoredUsername from "@/components/user/ColoredUsername"
import AvatarWithFrame from "@/components/user/AvatarWithFrame"
import { getUserHighestTier } from "@/utils/badgeWeb3"
import { getTierName, getUsernameColor } from "@/utils/socialBenefitsUtils"
import { REFERRAL_CONTRACT_ADDRESS } from "@/utils/constants"
import GMTeaReferralABI from "../abis/GMTeaReferralABI.json"

interface NavbarProps {
  address: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isConnecting: boolean
  scrollToLeaderboard?: () => void
  scrollToMintSection?: () => void
  scrollToProfile?: () => void;
  signer?: ethers.Signer | null
}

const getAvatarUrl = (address: string): string => `https://api.dicebear.com/6.x/identicon/svg?seed=${address}`

const Navbar: React.FC<NavbarProps> = ({
  address,
  connectWallet,
  disconnectWallet,
  isConnecting,
  scrollToLeaderboard,
  scrollToMintSection,
  scrollToProfile,
  signer,
}) => {
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showActivitySidebar, setShowActivitySidebar] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    pendingRewardsAmount: "0",
    claimedRewardsAmount: "0",
  })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  const [highestTier, setHighestTier] = useState<number>(-1)
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [isRefreshingStats, setIsRefreshingStats] = useState(false)

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

  const fetchReferralStatsFromBlockchain = async (address: string, signer?: ethers.Signer | null) => {
    try {
      let provider: ethers.providers.Provider | null | undefined = null;
      
      if (signer) {
        provider = signer.provider;
      } else {
        provider = getEthereumProvider();
      }
      
      if (!provider) {
        provider = getProvider();
      }
      
      if (!provider) {
        return {
          totalReferrals: 0,
          pendingRewardsAmount: "0",
          claimedRewardsAmount: "0",
        };
      }

      const referralContract = new ethers.Contract(
        REFERRAL_CONTRACT_ADDRESS,
        GMTeaReferralABI,
        provider
      );
      
      const stats = await referralContract.getReferralStats(address);
      
      return {
        totalReferrals: stats.totalReferrals.toNumber(),
        pendingRewardsAmount: ethers.utils.formatEther(stats.pendingRewardsAmount),
        claimedRewardsAmount: ethers.utils.formatEther(stats.claimedRewardsAmount)
      };
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      return {
        totalReferrals: 0,
        pendingRewardsAmount: "0",
        claimedRewardsAmount: "0",
      };
    }
  };

  useEffect(() => {
    const handleReferralUpdate = () => {
      setLastUpdateTime(Date.now())
    }

    window.addEventListener('referralStatsUpdated', handleReferralUpdate)
    
    return () => {
      window.removeEventListener('referralStatsUpdated', handleReferralUpdate)
    }
  }, [])

  useEffect(() => {
    const loadUserData = async () => {
      if (!address) return

      setIsLoadingUserData(true)
      try {
        const usernameResult = await checkUsername(address)
        setUsername(usernameResult)

        const highestTierResult = await getUserHighestTier(address)
        setHighestTier(highestTierResult)

        const stats = await fetchReferralStatsFromBlockchain(address, signer)
        setReferralStats(stats)
        
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setIsLoadingUserData(false)
      }
    }

    loadUserData()
  }, [address, signer, lastUpdateTime])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setIsDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsDropdownOpen(false)
    }, 300)
    setHoverTimeout(timeout as unknown as NodeJS.Timeout)
  }

  const pendingRewardAmount = Number.parseFloat(referralStats.pendingRewardsAmount)

  const handleNav = (menu: string) => {
    setActiveMenu(menu)
    setMobileMenuOpen(false)

    if (menu === "dashboard") {
      window.dispatchEvent(new CustomEvent("navigate", { detail: { tab: "dashboard" } }))
    } else if (menu === "leaderboard") {
      window.dispatchEvent(new CustomEvent("navigate", { detail: { tab: "leaderboard" } }))
      if (scrollToLeaderboard) {
        scrollToLeaderboard()
      }
    } else if (menu === "profile") {
      window.dispatchEvent(new CustomEvent("navigate", { detail: { tab: "profile" } }))
    } else if (menu === "mint") {
      window.dispatchEvent(new CustomEvent("navigate", { detail: { tab: "mint" } }))
      if (scrollToMintSection) {
        scrollToMintSection()
      }
    }
  }

  const handleFaucetClick = () => {
    window.open("https://faucet-sepolia.tea.xyz/", "_blank", "noopener,noreferrer")
    setMobileMenuOpen(false)
  }

  const handleMultiChainGMClick = () => {
    window.open("https://app.multichaingm.com/", "_blank", "noopener,noreferrer")
    setMobileMenuOpen(false)
  }

  const handleReferralNavigation = () => {
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);

    window.dispatchEvent(new CustomEvent("navigate", { 
      detail: { 
        tab: "profile", 
        subtab: "referrals" 
      } 
    }));
  }

  const handleOpenActivitySidebar = () => {
    setShowActivitySidebar(true)
    setIsDropdownOpen(false)
    document.body.style.overflow = "hidden"
  }

  const handleCloseActivitySidebar = () => {
    setShowActivitySidebar(false)
    document.body.style.overflow = ""
  }

  const handleOpenSettings = () => {
    setShowSettingsModal(true)
    setIsDropdownOpen(false)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  const handleRefreshStats = async () => {
    if (!address || isRefreshingStats) return
    
    setIsRefreshingStats(true)
    try {
      const stats = await fetchReferralStatsFromBlockchain(address, signer)
      setReferralStats(stats)
    } catch (error) {
      console.error("Error refreshing stats:", error)
    } finally {
      setIsRefreshingStats(false)
    }
  }

  const copyAddressToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 2000)
    }
  }

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        setActiveMenu(event.detail.tab)
      }
    }

    window.addEventListener("navigate", handleNavigate as EventListener)
    return () => {
      window.removeEventListener("navigate", handleNavigate as EventListener)
    }
  }, [])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-20 transition-all duration-500 ${
          scrolled ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav("dashboard")}>
                <div className="relative">
                  <FaLeaf className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                </div>
                <span className="ml-2 text-lg md:text-xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                  GM <span className="text-emerald-500">TEA</span>
                  <span className="absolute top-5 md:top-6 ml-1 text-gray-500 dark:text-gray-300 text-xs font-medium bg-emerald-100/50 dark:bg-emerald-50/10 px-1 py-0.5 rounded-md align-middle shadow-sm">
                    Testnet
                  </span>
                </span>
              </div>
            </div>

            {address && (
              <div className="hidden md:flex items-center justify-center space-x-10">
                <button
                  onClick={() => handleNav("dashboard")}
                  className={`relative text-sm font-medium px-1 py-2 transition-colors ${
                    activeMenu === "dashboard"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                  }`}
                >
                  Dashboard
                  {activeMenu === "dashboard" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>
                  )}
                </button>

                <button
                  onClick={() => handleNav("mint")}
                  className={`relative text-sm font-medium px-1 py-2 transition-colors ${
                    activeMenu === "mint"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                  }`}
                >
                  Mint
                  {activeMenu === "mint" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>
                  )}
                </button>

                <button
                  onClick={() => handleNav("leaderboard")}
                  className={`relative text-sm font-medium px-1 py-2 transition-colors ${
                    activeMenu === "leaderboard"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                  }`}
                >
                  Leaderboard
                  {activeMenu === "leaderboard" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>
                  )}
                </button>

                <button
                  onClick={handleFaucetClick}
                  className="relative text-sm font-medium px-1 py-2 transition-colors text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                >
                  Faucet
                </button>

                <button
                  onClick={handleMultiChainGMClick}
                  className="relative text-sm font-bold bg-gradient-to-r from-cyan-700 to-emerald-300 text-transparent bg-clip-text hover:scale-105 px-1 py-2 dark:bg-gradient-to-r from-cyan-700 to-emerald-300 text-transparent bg-clip-text dark:hover:scale-105"
                >
                  MultiChainGM
                </button>
              </div>
            )}

            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />

              {!address ? (
                <ConnectWalletButton connectWallet={connectWallet} />
              ) : (
                <div
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button className="flex items-center gap-2 bg-white dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border border-gray-200 dark:border-emerald-500/20 shadow-sm">
                    <div className="h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
                      <AvatarWithFrame
                        avatarUrl={getAvatarUrl(address) || "/placeholder.svg"}
                        badgeTier={highestTier}
                        size="xs"
                      />
                    </div>
                    {username ? (
                      <ColoredUsername username={username} badgeTier={highestTier} className="text-sm" />
                    ) : (
                      <span className="text-sm font-medium text-gray-800 dark:text-emerald-300">
                        {formatAddress(address)}
                      </span>
                    )}
                    <FaChevronDown
                      className={`h-3 w-3 text-emerald-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-emerald-500/20 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-emerald-500/20 bg-gray-50 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden">
                            <AvatarWithFrame
                              avatarUrl={getAvatarUrl(address) || "/placeholder.svg"}
                              badgeTier={highestTier}
                              size="sm"
                            />
                          </div>
                          <div>
                            {username && (
                              <div className="text-sm font-semibold">
                                <ColoredUsername username={username} badgeTier={highestTier} />
                              </div>
                            )}
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                              {formatAddress(address)}
                              <button
                                onClick={copyAddressToClipboard}
                                className="ml-1 text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                              >
                                <FaCopy size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => handleNav("profile")}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <FaIdCard className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Profile page</span>
                        </button>

                        <button 
                          onClick={handleReferralNavigation}
                          className="px-4 py-3 w-full flex justify-between items-center hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FaGift className="text-emerald-500" size={14} />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Referral Rewards</span>
                            {isLoadingUserData ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
                            ) : (
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                                {Number.parseFloat(referralStats.pendingRewardsAmount).toFixed(4)}
                                <span className="text-xs ml-1 font-small text-emerald-500/70 dark:text-emerald-400/70">TEA</span>
                              </p>
                            )}
                          </div>
                        </button>

                        <button
                          onClick={handleOpenActivitySidebar}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <FaHistory className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">On-chain activity</span>
                        </button>

                        <button
                          onClick={handleRefreshStats}
                          disabled={isRefreshingStats}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left disabled:opacity-50"
                        >
                          <FaSync className={`text-emerald-500 ${isRefreshingStats ? 'animate-spin' : ''}`} size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Refresh Stats</span>
                        </button>

                        <button
                          onClick={handleOpenSettings}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <FaCog className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Settings</span>
                        </button>

                        <button
                          onClick={disconnectWallet}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors text-left"
                        >
                          <FaSignOutAlt className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Disconnect</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex md:hidden items-center space-x-3">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <FaTimes className="block h-5 w-5" aria-hidden="true" />
                ) : (
                  <FaBars className="block h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        ref={mobileMenuRef}
        className={`fixed inset-0 top-16 bg-white dark:bg-gray-900 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-4 pt-4 pb-6 space-y-6">
          <div className="flex flex-col space-y-4">
            {!address ? (
              <div className="px-2 py-2">
                <ConnectWalletButton connectWallet={connectWallet} />
              </div>
            ) : (
              <div className="px-2 py-2 flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full overflow-hidden">
                      <AvatarWithFrame
                        avatarUrl={getAvatarUrl(address) || "/placeholder.svg"}
                        badgeTier={highestTier}
                        size="xs"
                      />
                    </div>
                    {username ? (
                      <ColoredUsername username={username} badgeTier={highestTier} className="text-sm" />
                    ) : (
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        {formatAddress(address)}
                      </span>
                    )}

                    {highestTier >= 0 && (
                      <span
                        className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: getUsernameColor(highestTier)
                            ? `${getUsernameColor(highestTier)}20`
                            : undefined,
                          color: getUsernameColor(highestTier) || undefined,
                        }}
                      >
                        {getTierName(highestTier)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="ml-4 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FaSignOutAlt className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={handleMultiChainGMClick}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <FaLeaf className="h-5 w-5" />
                      <span className="font-medium bg-gradient-to-r from-cyan-700 to-emerald-300 text-transparent bg-clip-text">MultiChainGM</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNav("dashboard")}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      activeMenu === "dashboard"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FaHome className="h-5 w-5" />
                      <span className="font-medium">Dashboard</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNav("mint")}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      activeMenu === "mint"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FaMedal className="h-5 w-5" />
                      <span className="font-medium">Mint Badges</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNav("leaderboard")}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      activeMenu === "leaderboard"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FaTrophy className="h-5 w-5" />
                      <span className="font-medium">Leaderboard</span>
                    </div>
                  </button>

                  <button
                    onClick={handleFaucetClick}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <FaTint className="h-5 w-5" />
                      <span className="font-medium">Faucet</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNav("profile")}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      activeMenu === "profile"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FaUser className="h-5 w-5" />
                      <span className="font-medium">Profile</span>
                    </div>
                  </button>

                  <button
                    onClick={handleOpenActivitySidebar}
                    className="flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <FaHistory className="h-5 w-5" />
                      <span className="font-medium">On-chain Activity</span>
                    </div>
                  </button>

                  <button
                    onClick={handleOpenSettings}
                    className="flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <FaCog className="h-5 w-5" />
                      <span className="font-medium">Settings</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showActivitySidebar && address && <ActivitySidebar address={address} onClose={handleCloseActivitySidebar} />}

      {showSettingsModal && <SettingsModal onClose={handleCloseSettings} />}

      {showCopyToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/90 to-teal-600/90 backdrop-blur-md px-4 py-3 rounded-lg shadow-lg border border-emerald-400/30">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-white font-medium text-sm">Address copied successfully</span>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar