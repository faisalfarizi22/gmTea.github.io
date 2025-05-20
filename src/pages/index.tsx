"use client"

import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react"
import { ethers, BigNumber } from "ethers"
import { motion, AnimatePresence } from "framer-motion"
import StatsCard from "@/components/StatsCard"
import CountdownTimer from "@/components/CountdownTimer"
import CheckinButton from "@/components/CheckinButton"
import GMMessageList from "@/components/GMMessageList"
import { useEthereumEvents } from "@/hooks/useEthereumEvents"
import type { GMMessage, Web3State, CheckinStats } from "@/types"
import { getUserHighestTier, getUserBadges } from "@/utils/badgeWeb3"
import { connectWallet, getProvider, getContract, switchToTeaSepolia, getTotalCheckins } from "@/utils/web3"
import { CHECKIN_FEE, TEA_SEPOLIA_CHAIN_ID } from "@/utils/constants"
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
  FaNetworkWired,
  FaTrophy,
  FaGem,
  FaUser,
} from "react-icons/fa"
import AudioPlayer from "@/components/AudioPlayer"
import useUserDataCombined from "@/hooks/useUserData"
import Navbar from "@/components/Navbar"

// Lazy load components for tabs that aren't initially visible
const LazyBadgeMintSection = lazy(() => import("@/components/BadgeMintSection"))
const LazyLeaderboard = lazy(() => import("@/components/Leaderboard"))
const LazyPointsLeaderboard = lazy(() => import("@/components/LeaderboardPoints"))
const LazyProfileSection = lazy(() => import("@/components/profile/ProfilePage"))

// Notification type
interface Notification {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
}

interface UserBadge {
  tokenId: number
  tier: number
  mintedAt: number
  transactionHash?: string
}

// Tab type
type TabType = "dashboard" | "mint" | "leaderboard" | "profile"

export default function Home() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("dashboard")
  const [loadedTabs, setLoadedTabs] = useState<TabType[]>(["dashboard"])
  const [previousTab, setPreviousTab] = useState<TabType | null>(null); // Untuk menyimpan tab sebelumnya guna menentukan arah animasi

  // Refs for scrolling to sections
  const mintSectionRef = useRef<HTMLDivElement>(null)
  const leaderboardRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

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
  const [checkinStats, setCheckinStats] = useState<CheckinStats>({
    userCheckinCount: 0,
    timeUntilNextCheckin: 0,
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messages, setMessages] = useState<GMMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false)
  const [isCheckinLoading, setIsCheckinLoading] = useState<boolean>(false)
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false)
  const [globalCheckinCount, setGlobalCheckinCount] = useState<number>(0)
  const [isLoadingGlobalCount, setIsLoadingGlobalCount] = useState<boolean>(false)
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const { userData } = useUserDataCombined(web3State.address) // userData untuk Home
  const [leaderboardType, setLeaderboardType] = useState<"checkin" | "points">("checkin")

  // Forum state - keep for future implementation but removed floating button
  const [isForumOpen, setIsForumOpen] = useState(false)

 
  // Function to change active tab
  const changeTab = (tab: TabType) => {
    setPreviousTab(activeTab); // Save current tab as 'previous' before changing
    setActiveTab(tab);

    // Add to loaded tabs if not already loaded
    if (!loadedTabs.includes(tab)) {
      setLoadedTabs((prev) => [...prev, tab]);
    }
    
    // Dispatch a custom event to notify the AudioPlayer about the tab change
    window.dispatchEvent(
      new CustomEvent('tabChanged', { 
        detail: { 
          tab: tab 
        } 
      })
    );
  }

  // Scroll functions for navbar integration
  const scrollToMintSection = useCallback(() => {
    changeTab("mint")
  }, [activeTab]) // Tambahkan activeTab agar previousTab terupdate

  const scrollToLeaderboard = useCallback(() => {
    changeTab("leaderboard")
  }, [activeTab]) // Tambahkan activeTab

  const scrollToProfile = useCallback(() => {
    changeTab("profile")
  }, [activeTab]) // Tambahkan activeTab

  useEffect(() => {
    const savedPreference = localStorage.getItem("leaderboardPreference") || "checkin"
    setLeaderboardType(savedPreference as "checkin" | "points")
  }, [])

  useEffect(() => {
    localStorage.setItem("leaderboardPreference", leaderboardType)
  }, [leaderboardType])

  useEffect(() => {
    const loadBadgeData = async () => {
      if (web3State.address) {
        try {
          const badges = await getUserBadges(web3State.address)
          setUserBadges(badges)
          console.log("Loaded user badges in Home:", badges)
        } catch (error) {
          console.error("Error loading user badges in Home:", error)
          setUserBadges([])
        }
      }
    }

    if (web3State.isConnected && web3State.address) {
      loadBadgeData()
    } else {
      setUserBadges([]) // Kosongkan badges jika tidak terhubung
    }
  }, [web3State.isConnected, web3State.address])

  // Notification functions
  const addNotification = (message: string, type: "success" | "error" | "info" | "warning") => {
    const id = Math.random().toString(36).substring(2, 9)
    setNotifications((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Load user data
  const loadUserData = useCallback(async (address: string, contract: ethers.Contract) => {
    try {
      let count: number | BigNumber = 0
      try {
        count = await contract.getCheckinCount(address)
      } catch (e) {
        console.warn("Error calling getCheckinCount with address", e)
        try {
          const userDataVal = await contract.userCheckins(address)
          if (userDataVal && userDataVal.checkinCount) {
            count = userDataVal.checkinCount
          }
        } catch (mappingError) {
          console.warn("Error accessing userCheckins mapping for count", mappingError)
          count = 0
        }
      }

      let timeRemaining: number | BigNumber = 0
      try {
        timeRemaining = await contract.timeUntilNextCheckin(address)
      } catch (e) {
        console.warn("Error calling timeUntilNextCheckin", e)
        try {
          const userDataVal = await contract.userCheckins(address)
          if (userDataVal && userDataVal.lastCheckinTime) {
            const lastCheckinTime = BigNumber.isBigNumber(userDataVal.lastCheckinTime)
              ? userDataVal.lastCheckinTime.toNumber()
              : Number(userDataVal.lastCheckinTime)

            if (lastCheckinTime > 0) {
              const nextCheckinTime = lastCheckinTime + 24 * 60 * 60
              const currentTime = Math.floor(Date.now() / 1000)
              if (currentTime < nextCheckinTime) {
                timeRemaining = nextCheckinTime - currentTime
              } else {
                timeRemaining = 0
              }
            } else {
              timeRemaining = 0
            }
          }
        } catch (mappingError) {
          console.warn("Error calculating timeRemaining from mapping", mappingError)
          timeRemaining = 0
        }
      }

      setCheckinStats({
        userCheckinCount: BigNumber.isBigNumber(count) ? count.toNumber() : Number(count),
        timeUntilNextCheckin: BigNumber.isBigNumber(timeRemaining) ? timeRemaining.toNumber() : Number(timeRemaining),
      })
    } catch (error) {
      console.error("Error loading user data:", error)
      setCheckinStats({
        userCheckinCount: 0,
        timeUntilNextCheckin: 0,
      })
    }
  }, [])

  // Load recent messages
  const loadRecentMessages = useCallback(
    async (contract: ethers.Contract) => {
      try {
        setIsLoadingMessages(true)
        const cachedMessages = localStorage.getItem("gmtea_recentMessages")
        let parsedMessages: GMMessage[] = []
        let cacheValid = false

        if (cachedMessages) {
          try {
            const parsed = JSON.parse(cachedMessages)
            if (parsed.timestamp && Date.now() - parsed.timestamp < 10 * 60 * 1000) { // 10 menit cache
              parsedMessages = parsed.data
              cacheValid = true
              setMessages(parsedMessages)
              // setIsLoadingMessages(false); // Jangan set false di sini jika akan fetch lagi
            }
          } catch (e) {
            console.warn("Error parsing cached messages:", e)
          }
        }
        
        if (!cacheValid) setIsLoadingMessages(true); // Hanya set loading true jika cache tidak valid atau akan fetch

        const messagesPromise = contract.getRecentGMs()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Loading messages timeout")), 15000),
        )

        try {
          const recentGMs = await Promise.race([messagesPromise, timeoutPromise]) as any[]; // Perlu type assertion jika contract.getRecentGMs() tidak well-typed
          if (Array.isArray(recentGMs)) {
            const formattedMessages = recentGMs.map((msg) => ({
              user: msg.user,
              timestamp: BigNumber.isBigNumber(msg.timestamp) ? msg.timestamp.toNumber() : Number(msg.timestamp || 0),
              message: msg.message || "GM!",
            })).sort((a,b) => b.timestamp - a.timestamp); // Urutkan dari terbaru
            setMessages(formattedMessages)
            localStorage.setItem(
              "gmtea_recentMessages",
              JSON.stringify({ data: formattedMessages, timestamp: Date.now() }),
            )
          } else {
            console.error("Invalid messages format received:", recentGMs);
            if (!cacheValid) setMessages([]); // Hanya set kosong jika tidak ada cache valid
          }
        } catch (error) {
          console.error("Error loading fresh recent messages:", error)
          if (!cacheValid) { // Jika fetch gagal DAN cache tidak valid
             if (web3State.isConnected) { // Tampilkan pesan fallback hanya jika terhubung tapi gagal fetch
                setMessages([
                    { user: "0x123...", timestamp: Math.floor(Date.now() / 1000) - 3600, message: "GM from the Tea community! 🍵 (fallback)" },
                    { user: "0x098...", timestamp: Math.floor(Date.now() / 1000) - 7200, message: "Starting the day with a fresh cup of Tea! ☕ (fallback)" },
                ]);
             } else {
                setMessages([]);
             }
          }
          // Jika cache valid, biarkan pesan cache ditampilkan
        }
      } catch (error) {
        console.error("Outer error in loadRecentMessages:", error)
        setMessages([]) // Fallback jika ada error di luar blok try-catch fetch
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [web3State.isConnected], // Re-fetch jika status koneksi berubah
  )

  // Load global count
  const loadGlobalCount = useCallback(async () => {
    if (!web3State.contract) return

    try {
      setIsLoadingGlobalCount(true)
      const count = await getTotalCheckins(web3State.contract)
      if (count > 0) { // Hanya update jika count > 0 untuk menghindari reset ke 0 jika ada error sementara
        setGlobalCheckinCount(count)
      }
    } catch (error) {
      console.error("Error loading global check-in count:", error)
    } finally {
      setIsLoadingGlobalCount(false)
    }
  }, [web3State.contract])

  // Connect wallet function
  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return
    setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await connectWallet() // Menggunakan utilitas connectWallet
      if (!result || !result.address || !result.signer || !result.provider || !result.chainId) {
        throw new Error("Failed to connect: Essential properties missing")
      }
      const { signer, address, chainId, provider } = result;
      const contract = getContract(signer)
      setWeb3State({
        isConnected: true, address, provider, signer, contract,
        isLoading: false, error: null, chainId,
      })
      localStorage.setItem("walletConnected", "true")
      localStorage.setItem("walletAddress", address)

      if (chainId === TEA_SEPOLIA_CHAIN_ID) {
        setShowNetworkAlert(false)
        await Promise.all([loadUserData(address, contract), loadRecentMessages(contract)])
      } else {
        setShowNetworkAlert(true)
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      setWeb3State((prev) => ({
        ...prev, isConnected: false, isLoading: false,
        error: error.message || "Failed to connect wallet",
      }))
      localStorage.removeItem("walletConnected")
      localStorage.removeItem("walletAddress")
    }
  }, [web3State.isLoading, loadUserData, loadRecentMessages])

  // Disconnect wallet function
  const handleDisconnectWallet = useCallback(() => {
    setWeb3State({
      isConnected: false, address: null, provider: null, signer: null, contract: null,
      isLoading: false, error: null, chainId: null,
    })
    setCheckinStats({ userCheckinCount: 0, timeUntilNextCheckin: 0, })
    setMessages([])
    setShowNetworkAlert(false)
    setUserBadges([]) // Kosongkan badges saat disconnect
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")
    console.log("Wallet disconnected")
  }, [])

  // Handle checkin
  const handleCheckin = async (message: string) => {
    if (!web3State.contract || !web3State.signer || !web3State.address) {
        addNotification("Please connect your wallet first.", "warning");
        return;
    }
    setIsCheckinLoading(true)
    try {
      const contractWithSigner = web3State.contract.connect(web3State.signer); // Pastikan kontrak terhubung dengan signer
      const fee = ethers.utils.parseEther(CHECKIN_FEE);
      // Estimasi gas dengan penanganan error
      let gasLimit;
      try {
        gasLimit = await contractWithSigner.estimateGas.checkIn(message, { value: fee });
      } catch (gasError: any) {
        console.error("Gas estimation failed:", gasError);
        addNotification(gasError.reason || "Gas estimation failed. Try again.", "error");
        setIsCheckinLoading(false);
        return;
      }
      
      const bufferedGasLimit = gasLimit.mul(120).div(100); // Buffer 20%
      addNotification("Sending your GM to the blockchain...", "info")
      const tx = await contractWithSigner.checkIn(message, {
        value: fee,
        gasLimit: bufferedGasLimit,
      })
      console.log("Transaction sent:", tx.hash)
      addNotification("Transaction sent! Waiting for confirmation...", "info")
      await tx.wait()
      console.log("Transaction confirmed")
      addNotification("GM successfully posted! ☀️ Have a tea-riffic day!", "success")
      // Reload data setelah check-in berhasil
      await Promise.all([
          loadUserData(web3State.address, web3State.contract), 
          loadRecentMessages(web3State.contract),
          loadGlobalCount() // Update global count juga
      ]);

    } catch (error: any) {
      console.error("Error checking in:", error)
      let errorMessage = "Failed to check in."
      if (error.code === 4001) { // User rejected transaction
        errorMessage = "Transaction rejected by user."
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }
      addNotification(errorMessage, "error")
    } finally {
      setIsCheckinLoading(false)
    }
  }

  // Switch network function
  const handleSwitchNetwork = useCallback(async () => {
    setWeb3State((prev) => ({ ...prev, isLoading: true }))
    try {
      await switchToTeaSepolia() // Menggunakan utilitas switchToTeaSepolia
      // Setelah switch, event 'chainChanged' akan di-trigger oleh useEthereumEvents,
      // yang seharusnya me-reload halaman atau memanggil handleConnectWallet
      // Untuk kepastian, kita bisa panggil handleConnectWallet di sini juga
      setShowNetworkAlert(false); // Optimistic update
      await handleConnectWallet(); // Panggil connect wallet untuk sinkronisasi
    } catch (error) {
      console.error("Error switching network:", error)
      addNotification("Failed to switch network. Please do it manually in your wallet.", "error");
      setWeb3State((prev) => ({ ...prev, isLoading: false }))
    }
  }, [handleConnectWallet])

  // Forum handlers - kept for future implementation
  const openForum = useCallback(() => { setIsForumOpen(true) }, [])
  const closeForum = useCallback(() => { setIsForumOpen(false) }, [])

  // Debug log for web3State
  useEffect(() => {
    console.log("Home Web3State:", web3State);
  }, [web3State])

  // Attempt to reconnect wallet on page load
  useEffect(() => {
    const checkPreviousConnection = async () => {
      if (localStorage.getItem("walletConnected") === "true" && !web3State.isConnected && !web3State.isLoading) {
        console.log("Attempting to reconnect previous wallet session...");
        await handleConnectWallet();
      }
    }
    // Beri sedikit jeda untuk memastikan provider wallet (jika ada extension) termuat
    const timer = setTimeout(checkPreviousConnection, 500); 
    return () => clearTimeout(timer);
  }, [handleConnectWallet, web3State.isConnected, web3State.isLoading]) // Re-run if these change unexpectedly

  // Ensure contract is properly initialized
  useEffect(() => {
    if (web3State.isConnected && web3State.signer && !web3State.contract) {
      try {
        const contractInstance = getContract(web3State.signer)
        setWeb3State((prev) => ({ ...prev, contract: contractInstance, }))
      } catch (error) {
        console.error("Error re-initializing contract in Home:", error)
      }
    }
  }, [web3State.isConnected, web3State.signer, web3State.contract])


  // Use Ethereum Events hook
  useEthereumEvents({
    accountsChanged: async (accounts) => {
      console.log("Home: accountsChanged", accounts);
      if (accounts.length === 0) {
        handleDisconnectWallet()
      } else if (web3State.address && accounts[0].toLowerCase() !== web3State.address.toLowerCase()) {
        // Akun berubah, coba sambungkan ulang dengan akun baru
        console.log("Account switched, reconnecting...");
        await handleConnectWallet(); 
      } else if (!web3State.address && accounts.length > 0) {
        // Jika sebelumnya tidak ada alamat, tapi sekarang ada (misal, auto-connect oleh wallet)
        console.log("New account detected, connecting...");
        await handleConnectWallet();
      }
    },
    chainChanged: (chainIdHex) => {
      console.log("Home: chainChanged to", chainIdHex, ". Reloading for consistency.");
      // Reload halaman adalah cara paling aman untuk memastikan semua state sinkron
      window.location.reload(); 
    },
    disconnect: () => {
      console.log("Home: disconnect event from provider");
      handleDisconnectWallet()
    },
  })

  // Load user data and recent messages, and global count
  useEffect(() => {
    if (web3State.isConnected && web3State.address && web3State.contract) {
      console.log("Setting up initial data load and refresh intervals in Home")
      const loadAllInitialData = async () => {
        await Promise.all([
          loadUserData(web3State.address as string, web3State.contract as ethers.Contract),
          loadRecentMessages(web3State.contract as ethers.Contract),
          loadGlobalCount()
        ]);
      }
      loadAllInitialData();

      const userDataInterval = setInterval(() => {
        if (web3State.address && web3State.contract) { // Double check
          loadUserData(web3State.address, web3State.contract)
          loadRecentMessages(web3State.contract)
        }
      }, 60000) // Refresh user data & messages setiap 60 detik

      const globalCountInterval = setInterval(() => {
        if (web3State.contract) { // Double check
            loadGlobalCount()
        }
      }, 5 * 60 * 1000); // Refresh global count setiap 5 menit

      return () => {
        clearInterval(userDataInterval)
        clearInterval(globalCountInterval)
      }
    }
  }, [web3State.isConnected, web3State.address, web3State.contract, loadUserData, loadRecentMessages, loadGlobalCount])


  // Listen for navigation events from navbar
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        changeTab(event.detail.tab as TabType)
      }
    }
    window.addEventListener("navigate", handleNavigate as EventListener)
    return () => {
      window.removeEventListener("navigate", handleNavigate as EventListener)
    }
  }, [activeTab]) // Tambahkan activeTab agar previousTab di `changeTab` selalu up-to-date

  // --- VARIAN ANIMASI TAB YANG DIPERBARUI ---
  const tabVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      rotate: direction > 0 ? 5 : -5, // Mengurangi sudut rotasi
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      rotate: 0,
      transition: {
        x: { type: "spring", stiffness: 180, damping: 26, mass: 0.9 },
        opacity: { duration: 0.45, ease: "easeOut" },
        rotate: { duration: 0.5, ease: "easeOut" },
      },
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      rotate: direction < 0 ? -5 : 5,
      transition: {
        x: { type: "spring", stiffness: 180, damping: 26, mass: 0.9 },
        opacity: { duration: 0.35, ease: "easeIn" },
        rotate: { duration: 0.4, ease: "easeIn" },
      },
    }),
  };

  const getDirection = (current: TabType, previous: TabType | null): number => {
    if (!previous || previous === current) return 1; // Default direction or if no change
    const tabOrder: TabType[] = ["dashboard", "mint", "leaderboard", "profile"];
    const currentIndex = tabOrder.indexOf(current);
    const previousIndex = tabOrder.indexOf(previous);
    if (currentIndex === -1 || previousIndex === -1) return 1; // Fallback
    return currentIndex > previousIndex ? 1 : -1;
  };


  return (
    <div className="min-h-screen tea-leaf-pattern">
      <Navbar
        address={web3State.address}
        connectWallet={handleConnectWallet}
        disconnectWallet={handleDisconnectWallet}
        isConnecting={web3State.isLoading}
        scrollToLeaderboard={scrollToLeaderboard}
        scrollToMintSection={scrollToMintSection}
      />

      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {showNetworkAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 rounded-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 backdrop-blur-md p-4 border-l-4 border-yellow-600 shadow-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaNetworkWired className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-white">
                    Please switch to the Tea Sepolia Testnet to continue using this application.
                  </p>
                </div>
                <div>
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={web3State.isLoading}
                    className="px-4 py-1.5 rounded-lg bg-white text-yellow-700 text-sm font-medium hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all shadow-md"
                  >
                    {web3State.isLoading ? "Switching..." : "Switch Network"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* UPDATED TAB CONTAINER: Remove fixed height constraint and adjust overflow handling */}
        <div className="relative overflow-visible"> {/* Changed from overflow-hidden and removed min-h-[80vh] */}
          <AnimatePresence initial={false} mode="wait" custom={getDirection(activeTab, previousTab)}>
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                custom={getDirection(activeTab, previousTab)}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full" // Removed absolute positioning and h-full
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-6">
                     <StatsCard 
                        checkinCount={checkinStats.userCheckinCount}
                        timeUntilNextCheckin={checkinStats.timeUntilNextCheckin}
                        isLoading={web3State.isLoading}
                        globalCheckinCount={globalCheckinCount}
                        isLoadingGlobalCount={isLoadingGlobalCount}
                      />
                    <CountdownTimer
                      initialSeconds={checkinStats.timeUntilNextCheckin}
                      onComplete={() => {
                        if (web3State.address && web3State.contract) {
                          loadUserData(web3State.address, web3State.contract)
                        }
                      }}
                    />
                    <CheckinButton
                      canCheckin={checkinStats.timeUntilNextCheckin <= 0 && web3State.isConnected}
                      onCheckin={handleCheckin}
                      isLoading={isCheckinLoading}
                    />
                  </div>
                  <div className="lg:col-span-7">
                    <GMMessageList
                      messages={messages}
                      isLoading={isLoadingMessages}
                      onRefresh={() => web3State.contract && loadRecentMessages(web3State.contract)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "mint" && loadedTabs.includes("mint") && (
              <motion.div
                key="mint"
                custom={getDirection(activeTab, previousTab)}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full" 
              >
                <div ref={mintSectionRef} className="badge-mint-section" data-section="badge-mint">
                 <Suspense fallback={<div className="p-8 text-center text-emerald-500">Loading Badge Minting...</div>}>
                      <LazyBadgeMintSection
                        address={web3State.address || ""}
                        signer={web3State.signer}
                        badges={userBadges}
                        onMintComplete={async () => {
                          if (web3State.contract && web3State.address) {
                            loadGlobalCount();
                            await loadUserData(web3State.address, web3State.contract);
                            const updatedBadges = await getUserBadges(web3State.address);
                            setUserBadges(updatedBadges);
                            window.dispatchEvent(new CustomEvent("badgeUpdate", { detail: { badges: updatedBadges }}));
                            await loadRecentMessages(web3State.contract);
                          }
                        }}
                      />
                    </Suspense>
                </div>
              </motion.div>
            )}

            {activeTab === "leaderboard" && loadedTabs.includes("leaderboard") && (
              <motion.div
                key="leaderboard"
                custom={getDirection(activeTab, previousTab)}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full" 
              >
                <div ref={leaderboardRef} className="" id="leaderboard-section" data-section="leaderboard">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-black/70 backdrop-blur-md shadow-sm p-1">
                      <button
                        onClick={() => setLeaderboardType("checkin")}
                        className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                          leaderboardType === "checkin" ? "bg-emerald-500 text-white shadow-md" : "text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700"
                        }`}
                      > <FaCheckCircle className="mr-1.5 h-3.5 w-3.5 inline-block" /> Check-ins </button>
                      <button
                        onClick={() => setLeaderboardType("points")}
                        className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                          leaderboardType === "points" ? "bg-emerald-500 text-white shadow-md" : "text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700"
                        }`}
                      > <FaGem className="mr-1.5 h-3.5 w-3.5 inline-block" /> Points </button>
                    </div>
                  </div>
                  <div className="relative overflow-visible">
                    <AnimatePresence mode="wait">
                       <motion.div
                          key={leaderboardType}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          {leaderboardType === "checkin" ? (
                            <Suspense fallback={<div className="p-8 text-center text-emerald-500">Loading Check-in Leaderboard...</div>}>
                              <LazyLeaderboard currentUserAddress={web3State.address} />
                            </Suspense>
                          ) : (
                            <Suspense fallback={<div className="p-8 text-center text-emerald-500">Loading Points Leaderboard...</div>}>
                              <LazyPointsLeaderboard currentUserAddress={web3State.address} contract={web3State.contract} />
                            </Suspense>
                          )}
                       </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === "profile" && loadedTabs.includes("profile") && (
               <motion.div
                key="profile"
                custom={getDirection(activeTab, previousTab)}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full" 
              >
                <div ref={profileRef} className="mt-4 pt-4" id="profile-section" data-section="profile">
                  <Suspense fallback={<div className="p-8 text-center text-emerald-500">Loading Profile...</div>}>
                    <LazyProfileSection /> 
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
       

        <AudioPlayer initialVolume={0.3} />
      </main>

      {/* Notification container */}
      <div className="fixed bottom-4 right-4 z-[100] space-y-3 flex flex-col items-end max-h-[90vh] overflow-y-auto scrollbar-hide">
        <AnimatePresence>
            {notifications.map((notification) => (
            <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.3 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: "100%", scale: 0.5, transition: { duration: 0.4, ease: "easeIn" } }}
                transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.7 }}
                className={`w-full max-w-full rounded-lg shadow-2xl overflow-hidden backdrop-blur-md border-l-4
                ${ notification.type === "success" ? "bg-emerald-50/80 dark:bg-emerald-700/50 border-emerald-500" 
                : notification.type === "error" ? "bg-red-50/80 dark:bg-red-700/50 border-red-500" 
                : notification.type === "info" ? "bg-blue-50/80 dark:bg-blue-700/50 border-blue-500" 
                : "bg-orange-50/80 dark:bg-orange-700/50 border-orange-500" }`}
            >
                <div className="p-4 flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                    {notification.type === "success" && <FaCheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />}
                    {notification.type === "error" && <FaExclamationCircle className="h-5 w-5 text-red-500 dark:text-red-300" />}
                    {notification.type === "info" && <FaInfoCircle className="h-5 w-5 text-blue-500 dark:text-blue-300" />}
                    {notification.type === "warning" && <FaExclamationCircle className="h-5 w-5 text-orange-500 dark:text-orange-300" />}
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className={`text-sm font-medium ${
                        notification.type === "success" ? "text-emerald-800 dark:text-emerald-100" :
                        notification.type === "error" ? "text-red-800 dark:text-red-100" :
                        notification.type === "info" ? "text-blue-800 dark:text-blue-100" :
                        "text-orange-800 dark:text-orange-100"
                    }`}>{notification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                    onClick={() => removeNotification(notification.id)}
                    className="inline-flex text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white focus:outline-none"
                    >
                    <span className="sr-only">Close</span>
                    <FaTimes className="h-5 w-5" />
                    </button>
                </div>
                </div>
                {/* Progress bar */}
                <div className={`h-1 ${
                    notification.type === "success" ? "bg-emerald-500/70" :
                    notification.type === "error" ? "bg-red-500/70" :
                    notification.type === "info" ? "bg-blue-500/70" :
                    "bg-orange-500/70"
                } animate-[progress_5s_linear_forwards]`}></div>
            </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  )
}