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

const LazyBadgeMintSection = lazy(() => import("@/components/BadgeMintSection"))
const LazyLeaderboard = lazy(() => import("@/components/Leaderboard"))
const LazyPointsLeaderboard = lazy(() => import("@/components/LeaderboardPoints"))
const LazyProfileSection = lazy(() => import("@/components/profile/ProfilePage"))

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

type TabType = "dashboard" | "mint" | "leaderboard" | "profile"

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard")
  const [loadedTabs, setLoadedTabs] = useState<TabType[]>(["dashboard"])
  const [previousTab, setPreviousTab] = useState<TabType | null>(null); 
  const mintSectionRef = useRef<HTMLDivElement>(null)
  const leaderboardRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

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
  const { userData } = useUserDataCombined(web3State.address) 
  const [leaderboardType, setLeaderboardType] = useState<"checkin" | "points">("checkin")
  const [isForumOpen, setIsForumOpen] = useState(false)

  const changeTab = (tab: TabType) => {
    setPreviousTab(activeTab); 
    setActiveTab(tab);

    if (!loadedTabs.includes(tab)) {
      setLoadedTabs((prev) => [...prev, tab]);
    }
    
    window.dispatchEvent(
      new CustomEvent('tabChanged', { 
        detail: { 
          tab: tab 
        } 
      })
    );
  }

  const scrollToMintSection = useCallback(() => {
    changeTab("mint")
  }, [activeTab]) 

  const scrollToLeaderboard = useCallback(() => {
    changeTab("leaderboard")
  }, [activeTab])

  const scrollToProfile = useCallback(() => {
    changeTab("profile")
  }, [activeTab]) 
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
      setUserBadges([]) 
    }
  }, [web3State.isConnected, web3State.address])

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
            if (parsed.timestamp && Date.now() - parsed.timestamp < 10 * 60 * 1000) { 
              parsedMessages = parsed.data
              cacheValid = true
              setMessages(parsedMessages)
            }
          } catch (e) {
            console.warn("Error parsing cached messages:", e)
          }
        }
        
        if (!cacheValid) setIsLoadingMessages(true); 

        const messagesPromise = contract.getRecentGMs()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Loading messages timeout")), 15000),
        )

        try {
          const recentGMs = await Promise.race([messagesPromise, timeoutPromise]) as any[]; 
          if (Array.isArray(recentGMs)) {
            const formattedMessages = recentGMs.map((msg) => ({
              user: msg.user,
              timestamp: BigNumber.isBigNumber(msg.timestamp) ? msg.timestamp.toNumber() : Number(msg.timestamp || 0),
              message: msg.message || "GM!",
            })).sort((a,b) => b.timestamp - a.timestamp); 
            setMessages(formattedMessages)
            localStorage.setItem(
              "gmtea_recentMessages",
              JSON.stringify({ data: formattedMessages, timestamp: Date.now() }),
            )
          } else {
            console.error("Invalid messages format received:", recentGMs);
            if (!cacheValid) setMessages([]); 
          }
        } catch (error) {
          console.error("Error loading fresh recent messages:", error)
          if (!cacheValid) { 
             if (web3State.isConnected) { 
                setMessages([
                    { user: "0x123...", timestamp: Math.floor(Date.now() / 1000) - 3600, message: "GM from the Tea community! 🍵 (fallback)" },
                    { user: "0x098...", timestamp: Math.floor(Date.now() / 1000) - 7200, message: "Starting the day with a fresh cup of Tea! ☕ (fallback)" },
                ]);
             } else {
                setMessages([]);
             }
          }
        }
      } catch (error) {
        console.error("Outer error in loadRecentMessages:", error)
        setMessages([]) 
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [web3State.isConnected], 
  )

  
  const loadGlobalCount = useCallback(async () => {
    if (!web3State.contract) return

    try {
      setIsLoadingGlobalCount(true)
      const count = await getTotalCheckins(web3State.contract)
      if (count > 0) { 
        setGlobalCheckinCount(count)
      }
    } catch (error) {
      console.error("Error loading global check-in count:", error)
    } finally {
      setIsLoadingGlobalCount(false)
    }
  }, [web3State.contract])

  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return
    setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await connectWallet() 
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

  const handleDisconnectWallet = useCallback(() => {
    setWeb3State({
      isConnected: false, address: null, provider: null, signer: null, contract: null,
      isLoading: false, error: null, chainId: null,
    })
    setCheckinStats({ userCheckinCount: 0, timeUntilNextCheckin: 0, })
    setMessages([])
    setShowNetworkAlert(false)
    setUserBadges([]) 
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")
    console.log("Wallet disconnected")
  }, [])

  const handleCheckin = async (message: string) => {
    if (!web3State.contract || !web3State.signer || !web3State.address) {
        addNotification("Please connect your wallet first.", "warning");
        return;
    }
    setIsCheckinLoading(true)
    try {
      const contractWithSigner = web3State.contract.connect(web3State.signer); 
      const fee = ethers.utils.parseEther(CHECKIN_FEE);
      let gasLimit;
      try {
        gasLimit = await contractWithSigner.estimateGas.checkIn(message, { value: fee });
      } catch (gasError: any) {
        console.error("Gas estimation failed:", gasError);
        addNotification(gasError.reason || "Gas estimation failed. Try again.", "error");
        setIsCheckinLoading(false);
        return;
      }
      
      const bufferedGasLimit = gasLimit.mul(120).div(100); 
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
      await Promise.all([
          loadUserData(web3State.address, web3State.contract), 
          loadRecentMessages(web3State.contract),
          loadGlobalCount() 
      ]);

    } catch (error: any) {
      console.error("Error checking in:", error)
      let errorMessage = "Failed to check in."
      if (error.code === 4001) { 
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

  const handleSwitchNetwork = useCallback(async () => {
    setWeb3State((prev) => ({ ...prev, isLoading: true }))
    try {
      await switchToTeaSepolia() 
      setShowNetworkAlert(false); 
      await handleConnectWallet(); 
    } catch (error) {
      console.error("Error switching network:", error)
      addNotification("Failed to switch network. Please do it manually in your wallet.", "error");
      setWeb3State((prev) => ({ ...prev, isLoading: false }))
    }
  }, [handleConnectWallet])

  useEffect(() => {
    console.log("Home Web3State:", web3State);
  }, [web3State])

  useEffect(() => {
    const checkPreviousConnection = async () => {
      if (localStorage.getItem("walletConnected") === "true" && !web3State.isConnected && !web3State.isLoading) {
        console.log("Attempting to reconnect previous wallet session...");
        await handleConnectWallet();
      }
    }

    const timer = setTimeout(checkPreviousConnection, 500); 
    return () => clearTimeout(timer);
  }, [handleConnectWallet, web3State.isConnected, web3State.isLoading]) 

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


  useEthereumEvents({
    accountsChanged: async (accounts) => {
      console.log("Home: accountsChanged", accounts);
      if (accounts.length === 0) {
        handleDisconnectWallet()
      } else if (web3State.address && accounts[0].toLowerCase() !== web3State.address.toLowerCase()) {
        console.log("Account switched, reconnecting...");
        await handleConnectWallet(); 
      } else if (!web3State.address && accounts.length > 0) {
        console.log("New account detected, connecting...");
        await handleConnectWallet();
      }
    },
    chainChanged: (chainIdHex) => {
      console.log("Home: chainChanged to", chainIdHex, ". Reloading for consistency.");
      window.location.reload(); 
    },
    disconnect: () => {
      console.log("Home: disconnect event from provider");
      handleDisconnectWallet()
    },
  })

 
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
        if (web3State.address && web3State.contract) {
          loadUserData(web3State.address, web3State.contract)
          loadRecentMessages(web3State.contract)
        }
      }, 60000) 

      const globalCountInterval = setInterval(() => {
        if (web3State.contract) { 
            loadGlobalCount()
        }
      }, 5 * 60 * 1000); 

      return () => {
        clearInterval(userDataInterval)
        clearInterval(globalCountInterval)
      }
    }
  }, [web3State.isConnected, web3State.address, web3State.contract, loadUserData, loadRecentMessages, loadGlobalCount])


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
  }, [activeTab]) 

  const tabVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      rotate: direction > 0 ? 5 : -5,
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
    if (!previous || previous === current) return 1; 
    const tabOrder: TabType[] = ["dashboard", "mint", "leaderboard", "profile"];
    const currentIndex = tabOrder.indexOf(current);
    const previousIndex = tabOrder.indexOf(previous);
    if (currentIndex === -1 || previousIndex === -1) return 1; 
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

        <div className="relative overflow-visible"> 
          <AnimatePresence initial={false} mode="wait" custom={getDirection(activeTab, previousTab)}>
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                custom={getDirection(activeTab, previousTab)}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full" 
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-6">
                     <StatsCard 
                        address={web3State.address}
                        timeUntilNextCheckin={checkinStats.timeUntilNextCheckin}
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

      <div className="fixed bottom-4 right-4 z-50 w-full max-w-md space-y-3 flex flex-col items-end">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`w-full rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500"
                : notification.type === "error"
                  ? "bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500"
                  : notification.type === "info"
                    ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                    : "bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500"
            }`}
          >
            <div className="p-4 flex">
              <div className="flex-shrink-0">
                {notification.type === "success" && <FaCheckCircle className="h-5 w-5 text-emerald-500" />}
                {notification.type === "error" && <FaExclamationCircle className="h-5 w-5 text-red-500" />}
                {notification.type === "info" && <FaInfoCircle className="h-5 w-5 text-blue-500" />}
                {notification.type === "warning" && <FaExclamationCircle className="h-5 w-5 text-orange-500" />}
              </div>
              <div className="ml-3 flex-1"> 
                <p
                  className={`text-sm font-medium ${
                    notification.type === "success"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : notification.type === "error"
                        ? "text-red-700 dark:text-red-300"
                        : notification.type === "info"
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-orange-700 dark:text-orange-300"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-4 inline-flex text-gray-400 focus:outline-none focus:text-gray-500 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            
            <div className={`h-1 ${
                notification.type === "success" ? "bg-emerald-500 dark:bg-emerald-600" :
                notification.type === "error" ? "bg-red-500 dark:bg-red-600" :
                notification.type === "info" ? "bg-blue-500 dark:bg-blue-600" :
                "bg-orange-500 dark:bg-orange-600"
            } animate-[progress_5s_linear_forwards]`}></div>
          </div>
        ))}
      </div>
    </div>
  )
}