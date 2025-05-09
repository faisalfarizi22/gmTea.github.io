"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { formatAddress } from "@/utils/web3"
import ThemeToggle from "./ThemeToggle"
import { useRouter } from "next/router"
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
} from "react-icons/fa"
import ConnectWalletButton from "./ConnectWalletButton"
import { getUserReferralStats, checkUsername } from "@/utils/badgeWeb3"
import ActivitySidebar from "./ActivitySidebar"
import SettingsModal from "./SettingsModal"
import ColoredUsername from "@/components/user/ColoredUsername";
import AvatarWithFrame from "@/components/user/AvatarWithFrame";
import { getUserHighestTier } from "@/utils/badgeWeb3";
import { getTierName, getUsernameColor } from "@/utils/socialBenefitsUtils";

interface NavbarProps {
  address: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isConnecting: boolean
  scrollToLeaderboard?: () => void // Function to scroll to leaderboard
  scrollToMintSection?: () => void // Function to scroll to mint section
}

// Function to generate avatar URL using DiceBear
const getAvatarUrl = (address: string): string => `https://api.dicebear.com/6.x/identicon/svg?seed=${address}`

const Navbar: React.FC<NavbarProps> = ({
  address,
  connectWallet,
  disconnectWallet,
  isConnecting,
  scrollToLeaderboard,
  scrollToMintSection,
}) => {
  const router = useRouter()
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
  const [activeMenu, setActiveMenu] = useState("dashboard")
  const [isLoadingUserData, setIsLoadingUserData] = useState(false)
  const [highestTier, setHighestTier] = useState<number>(-1);

  // Load user data when address is available
  useEffect(() => {
    const loadUserData = async () => {
      if (!address) return;

      setIsLoadingUserData(true);
      try {
        // Get username
        const usernameResult = await checkUsername(address);
        setUsername(usernameResult);

        // Get highest tier badge
        const highestTierResult = await getUserHighestTier(address);
        setHighestTier(highestTierResult);

        // Get referral stats
        const stats = await getUserReferralStats(address);
        if (stats) {
          setReferralStats(stats);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadUserData();
  }, [address]);

  // Set active menu based on current route
  useEffect(() => {
    if (router.pathname === "/") {
      setActiveMenu("dashboard")
    } else if (router.pathname === "/profile") {
      setActiveMenu("profile")
    }
  }, [router.pathname])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close dropdown when clicking outside
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

  // Close mobile menu when screen size increases
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Handle hover enter with delay
  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setIsDropdownOpen(true)
  }

  // Handle hover leave with delay
  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsDropdownOpen(false)
    }, 300)
    setHoverTimeout(timeout as unknown as NodeJS.Timeout)
  }

  // Calculate total reward amount
  const totalRewardAmount =
    Number.parseFloat(referralStats.claimedRewardsAmount) + Number.parseFloat(referralStats.pendingRewardsAmount)

  // Handle navigation
  const handleNav = (menu: string) => {
    setActiveMenu(menu);
    setMobileMenuOpen(false);
  
    if (menu === "dashboard") {
      // If already on home page, scroll to top smoothly
      if (router.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Navigate to home page and then scroll to top
        router.push("/").then(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    } else if (menu === "leaderboard") {
      // Navigate to home if not there, then scroll to leaderboard
      if (router.pathname !== "/") {
        router.push("/").then(() => {
          if (scrollToLeaderboard) {
            setTimeout(() => {
              scrollToLeaderboard();
            }, 500); // Increased timeout for better reliability
          }
        });
      } else if (scrollToLeaderboard) {
        // If already on home page, scroll directly to leaderboard
        scrollToLeaderboard();
      }
    } else if (menu === "profile") {
      // Navigate to profile page
      router.push("/profile");
    } else if (menu === "mint") {
      // If on home page, scroll to mint section with smooth behavior
      if (router.pathname === "/") {
        // Use the scrollToMintSection function as the primary method
        if (scrollToMintSection) {
          scrollToMintSection();
        } else {
          // Fallback to direct element selection if function not available
          scrollToBadgeSection();
        }
      } else {
        // Navigate to home page then scroll to mint section
        router.push("/").then(() => {
          // Use a longer timeout to ensure the page is fully loaded
          setTimeout(() => {
            if (scrollToMintSection) {
              scrollToMintSection();
            } else {
              // Fallback to direct element selection
              scrollToBadgeSection();
            }
          }, 600); // Increased timeout for more reliable scrolling after navigation
        });
      }
    }
  };

 const scrollToBadgeSection = () => {
  let headingElement = Array.from(document.querySelectorAll('h2, h3, h4'))
    .find(el => el.textContent?.includes('Digital Badge Collection'));
  
  let badgeSection: Element | null = null;
  
  if (headingElement) {
    const closestDiv = headingElement.closest('div');
    if (closestDiv) {
      badgeSection = closestDiv;
    }
  }
  if (!badgeSection) {
    badgeSection = document.querySelector('.badge-mint-section') || 
                   document.querySelector('[data-section="badge-mint"]');
  }
  if (!badgeSection) {
    badgeSection = document.querySelector('div.mb-8.mt-8:has(.text-emerald-500)');
  }
  if (!badgeSection) {
    badgeSection = document.querySelector('div:has(h2):has(.text-emerald-500)');
  }

  if (badgeSection) {
    const navbarHeight = 80; // Approximate height of navbar
    const badgeSectionPosition = badgeSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
    
    window.scrollTo({
      top: badgeSectionPosition,
      behavior: 'smooth'
    });
    
    setActiveMenu("mint");
  }
};

  // Handler to open activity sidebar
  const handleOpenActivitySidebar = () => {
    setShowActivitySidebar(true)
    setIsDropdownOpen(false)
    document.body.style.overflow = "hidden" // Prevent scrolling when sidebar is open
  }

  // Handler to close activity sidebar
  const handleCloseActivitySidebar = () => {
    setShowActivitySidebar(false)
    document.body.style.overflow = "" // Restore scrolling
  }

  // Handler for settings modal
  const handleOpenSettings = () => {
    setShowSettingsModal(true)
    setIsDropdownOpen(false)
  }

  // Handler to close settings modal
  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  // Copy wallet address to clipboard
  const copyAddressToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      alert("Address copied to clipboard!")
    }
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
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

            {/* Central Menu - Desktop (no icons) */}
            {address && (
              <div className="hidden md:flex items-center justify-center space-x-10">
                {/* Dashboard (Home) */}
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

                {/* Mint - Active */}
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

                {/* Leaderboard */}
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

                {/* Deploy */}
                <button className={`relative text-sm font-medium px-1 py-2 transition-colors ${
                    activeMenu === "leaderboard"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400"
                  }`}
                >
                  Deploy
                </button>
              </div>
            )}

            {/* Right Side Navigation */}
            <div className="hidden md:flex items-center gap-4">
              {/* Theme Toggle Button */}
              <ThemeToggle />

              {/* Wallet Connection with Hover Dropdown */}
              {!address ? (
                <ConnectWalletButton connectWallet={connectWallet} />
              ) : (
                <div
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Wallet Button - Shows username or address with avatar */}
                  <button className="flex items-center gap-2 bg-white dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border border-gray-200 dark:border-emerald-500/20 shadow-sm">
                    {/* Avatar */}
                    <div className="h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
                      <AvatarWithFrame
                        avatarUrl={getAvatarUrl(address) || "/placeholder.svg"}
                        badgeTier={highestTier}
                        size="xs"
                      />
                    </div>
                    {username ? (
                      <ColoredUsername 
                        username={username} 
                        badgeTier={highestTier} 
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-800 dark:text-emerald-300">
                        {formatAddress(address)}
                      </span>
                    )}
                    <FaChevronDown
                      className={`h-3 w-3 text-emerald-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Hover Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-emerald-500/20 z-50 overflow-hidden">
                      {/* Header with username and address */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-emerald-500/20 bg-gray-50 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
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

                      {/* Menu Items */}
                      <div className="py-1">
                        {/* Referral Rewards */}
                        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-emerald-800/30">
                          <div className="flex items-center gap-2">
                            <FaGift className="text-emerald-500" size={14} />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Referral rewards</span>
                          </div>
                          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            {totalRewardAmount.toFixed(4)} TEA
                          </span>
                        </div>

                        {/* Profile Page */}
                        <div className="space-y-4">
                        {/* Contracts section with Coming Soon overlay */}
                        <div className="relative">
                          {/* Coming Soon Overlay for Contracts */}
                          <div className="absolute inset-0 z-20 backdrop-blur-md bg-emerald-900/40 flex items-center justify-center rounded-lg">
                            <div className="text-center">
                              <h2 className="text-emerald-300 text-xs font-bold tracking-wider">COMING SOON</h2>
                              <p className="text-emerald-200/80 mt-1 text-xs">Profile under development</p>
                            </div>
                          </div>
                        <button
                          onClick={() => handleNav("profile")}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <FaIdCard className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Profile page</span>
                        </button>
                        </div>
                        </div>

                        {/* On-chain Activity */}
                        <button
                          onClick={handleOpenActivitySidebar}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <FaHistory className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">On-chain activity</span>
                        </button>

                        {/* Settings */}
                        <button
                          onClick={handleOpenSettings}
                          className="px-4 py-3 w-full flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors border-b border-gray-200 dark:border-emerald-800/30 text-left"
                        >
                          <FaCog className="text-emerald-500" size={14} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Settings</span>
                        </button>

                        {/* Disconnect */}
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

            {/* Mobile Menu Button */}
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

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className={`fixed inset-0 top-16 bg-white dark:bg-gray-900 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-4 pt-4 pb-6 space-y-6">
          <div className="flex flex-col space-y-4">
            {/* Show address or connect button */}
            {!address ? (
              <div className="px-2 py-2">
                <ConnectWalletButton connectWallet={connectWallet} />
              </div>
            ) : (
              <div className="px-2 py-2 flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div className="h-6 w-6 rounded-full overflow-hidden">
                      <AvatarWithFrame
                        avatarUrl={getAvatarUrl(address) || "/placeholder.svg"}
                        badgeTier={highestTier}
                        size="xs"
                      />
                    </div>
                    {username ? (
                      <ColoredUsername 
                        username={username} 
                        badgeTier={highestTier} 
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        {formatAddress(address)}
                      </span>
                    )}

                    {highestTier >= 0 && (
                        <span 
                          className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: getUsernameColor(highestTier) ? `${getUsernameColor(highestTier)}20` : undefined,
                            color: getUsernameColor(highestTier) || undefined 
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

                {/* Mobile Menu Items */}
                <div className="grid grid-cols-1 gap-2">
                  {/* Dashboard */}
                  <button
                    onClick={() => handleNav("dashboard")}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      activeMenu === "dashboard"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="font-medium">Dashboard</span>
                  </button>

                  {/* Mint - Active */}
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

                  {/* Leaderboard */}
                  <button
                    onClick={() => handleNav("leaderboard")}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      activeMenu === "leaderboard"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="font-medium">Leaderboard</span>
                  </button>

                  {/* Profile - Now Active */}
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

                  {/* Activity */}
                  <button
                    onClick={handleOpenActivitySidebar}
                    className="flex items-center space-x-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center space-x-3">
                      <FaHistory className="h-5 w-5" />
                      <span className="font-medium">On-chain Activity</span>
                    </div>
                  </button>

                  {/* Settings */}
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

      {/* Activity Sidebar */}
      {showActivitySidebar && address && <ActivitySidebar address={address} onClose={handleCloseActivitySidebar} />}

      {/* Settings Modal */}
      {showSettingsModal && <SettingsModal onClose={handleCloseSettings} />}
    </>
  )
}

export default Navbar