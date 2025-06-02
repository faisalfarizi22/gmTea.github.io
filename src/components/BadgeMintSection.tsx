"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ethers } from "ethers"
import {
  FaLeaf, FaWallet, FaSpinner, FaCheck, FaTimes, FaInfoCircle, FaCopy,
  FaChevronRight, FaGem, FaMedal, FaLock, FaRegLightbulb,
} from "react-icons/fa"
import { BADGE_TIERS, BADGE_CONTRACT_ADDRESS } from "@/utils/constants"
import { getUserHighestTier, hasUserMintedTier, getBadgeContract, getProvider, checkUsername } from "@/utils/badgeWeb3"
import GMTeaBadgeABI from "../abis/GMTeaBadgeABI.json"
import TierBenefits from "./TierBenefits"

interface BadgeMintSectionProps {
  address: string
  signer: ethers.Signer | null
  onMintComplete?: () => void
  badges?: Array<{
    tokenId: number;
    tier: number;
    mintedAt: string | number;
    transactionHash?: string;
  }>
}

type TxState = {
  status: "idle" | "preparing" | "awaiting_wallet" | "pending" | "success" | "error"
  error: string | null
  txHash: string | null
  confirmations: number
}

interface BadgeSupply {
  maxSupply: number
  currentSupply: number
}

interface Notification {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface NotificationProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

interface NotificationContainerProps {
  notifications: Notification[];
  removeNotification: (id: number) => void;
}

const BadgeMintSection: React.FC<BadgeMintSectionProps> = ({ address, signer, onMintComplete, badges = [] }) => {
  const [highestTier, setHighestTier] = useState<number>(-1)
  const [selectedTier, setSelectedTier] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState(true)
  const [contractPrices, setContractPrices] = useState<string[]>([])
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [badgeSupplies, setBadgeSupplies] = useState<BadgeSupply[]>([])
  const [loadingSupplies, setLoadingSupplies] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [txState, setTxState] = useState<TxState>({
    status: "idle",
    error: null,
    txHash: null,
    confirmations: 0,
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationIdRef = useRef<number>(0);
  const badgeTiers = [
    {
      id: 0,
      name: "Common",
      color: BADGE_TIERS.COMMON.color,
      description: "Entry-level badge with basic benefits",
      checkinBoost: "1.1x",
      referralReward: "5%",
      icon: <FaLeaf />,
    },
    {
      id: 1,
      name: "Uncommon",
      color: BADGE_TIERS.UNCOMMON.color,
      description: "Enhanced benefits and special features",
      checkinBoost: "1.2x",
      referralReward: "10%",
      icon: <FaLeaf />,
    },
    {
      id: 2,
      name: "Rare",
      color: BADGE_TIERS.RARE.color,
      description: "Premium access and additional perks",
      checkinBoost: "1.3x",
      referralReward: "15%",
      icon: <FaLeaf />,
    },
    {
      id: 3,
      name: "Epic",
      color: BADGE_TIERS.EPIC.color,
      description: "Superior benefits and exclusive features",
      checkinBoost: "1.4x",
      referralReward: "20%",
      icon: <FaLeaf />,
    },
    {
      id: 4,
      name: "Legendary",
      color: BADGE_TIERS.LEGENDARY.color,
      description: "Ultimate tier with maximum rewards",
      checkinBoost: "1.5x",
      referralReward: "25%",
      icon: <FaLeaf />,
    },
  ]

  const hasUserMintedTier = (tier: number): boolean => {
    if (!badges || !Array.isArray(badges)) {
      return false;
    }
    return badges.some(badge => badge.tier === tier);
  };
  
  useEffect(() => {
    console.log("Badges from props:", badges);
    
    let maxTier = -1;
    
    if (badges && badges.length > 0) {
      for (const badge of badges) {
        if (badge.tier > maxTier) {
          maxTier = badge.tier;
        }
      }
      console.log("Highest tier from badges:", maxTier);
    } else {
      console.log("No badges found, default to -1");
    }
    
    setHighestTier(maxTier);
    
    if (maxTier === -1) {
      setSelectedTier(0);
    } else if (maxTier < 4) {
      setSelectedTier(maxTier + 1);
    } else {
      setSelectedTier(-1);
    }
  }, [badges]);

  const loadContractData = async () => {
    try {
      setLoadingPrices(true);
      setLoadingSupplies(true);

      let provider = null;
      if (signer) {
        provider = signer.provider;
      }

      if (!provider) {
        provider = getProvider();
      }

      if (!provider) {
        console.error("Provider not available");
        return;
      }

      const badgeContract = new ethers.Contract(
        BADGE_CONTRACT_ADDRESS,
        GMTeaBadgeABI,
        provider
      );

      console.log("Loading contract data using contract at:", BADGE_CONTRACT_ADDRESS);

      const prices = [];
      const supplies = [];

      for (let i = 0; i < 5; i++) {
        try {
          const price = await badgeContract.tierPrices(i);
          console.log(`Tier ${i} price:`, ethers.utils.formatEther(price));
          prices.push(ethers.utils.formatEther(price));

          const maxSupply = await badgeContract.tierMaxSupplies(i);
          const currentSupply = await badgeContract.tierCurrentSupplies(i);

          console.log(`Tier ${i} supply:`, {
            max: maxSupply.toNumber(),
            current: currentSupply.toNumber()
          });

          supplies.push({
            maxSupply: maxSupply.toNumber(),
            currentSupply: currentSupply.toNumber(),
          });
        } catch (tierError) {
          console.error(`Error fetching data for tier ${i}:`, tierError);
          prices.push("0");
          supplies.push({
            maxSupply: 1000,
            currentSupply: 0
          });
        }
      }

      setContractPrices(prices);
      setBadgeSupplies(supplies);
    } catch (error) {
      console.error("Error in loadContractData:", error);
      setContractPrices(["0", "0", "0", "0", "0"]);
      setBadgeSupplies([
        { maxSupply: 1000, currentSupply: 0 },
        { maxSupply: 1000, currentSupply: 0 },
        { maxSupply: 1000, currentSupply: 0 },
        { maxSupply: 1000, currentSupply: 0 },
        { maxSupply: 1000, currentSupply: 0 }
      ]);
    } finally {
      setLoadingPrices(false);
      setLoadingSupplies(false);
    }
  };

useEffect(() => {
  const loadData = async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let maxTier = -1;
      if (badges && badges.length > 0) {
        for (const badge of badges) {
          if (badge.tier > maxTier) {
            maxTier = badge.tier;
          }
        }
      }
      
      setHighestTier(maxTier);
      
      if (maxTier === -1) {
        setSelectedTier(0);
      } else if (maxTier < 4) {
        setSelectedTier(maxTier + 1);
      } else {
        setSelectedTier(-1);
      }

      try {
        const userUsername = await checkUsername(address);
        setUsername(userUsername);
      } catch (error) {
        console.error("Error loading username:", error);
        setUsername(null);
      }

      await loadContractData();
    } catch (error) {
      console.error("Error loading user and contract data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  loadData();
}, [address, signer, badges]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        try {
          const userUsername = await checkUsername(address)
          setUsername(userUsername)
        } catch (error) {
          console.error("Error loading username:", error)
          setUsername(null)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const loadContractData = async () => {
      try {
        setLoadingPrices(true);
        setLoadingSupplies(true);

        const provider = getProvider();
        if (!provider) {
          console.error("Provider not available for loading contract data");
          return;
        }

        const badgeContract = getBadgeContract(provider);
        if (!badgeContract) {
          console.error("Badge contract not initialized correctly");
          return;
        }

        console.log("Loading contract data from contract:", BADGE_CONTRACT_ADDRESS);

        console.log("Contract methods:", 
          "tierPrices:", typeof badgeContract.tierPrices, 
          "tierMaxSupplies:", typeof badgeContract.tierMaxSupplies,
          "tierCurrentSupplies:", typeof badgeContract.tierCurrentSupplies
        );

        const prices = [];
        const supplies = [];

        for (let i = 0; i < 5; i++) {
          try {
            const pricePromise = badgeContract.tierPrices(i);
            const price = await Promise.race([
              pricePromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Price fetch timeout")), 10000))
            ]);
            
            console.log(`Tier ${i} price:`, ethers.utils.formatEther(price));
            prices.push(ethers.utils.formatEther(price));

            const maxSupplyPromise = badgeContract.tierMaxSupplies(i);
            const maxSupply = await Promise.race([
              maxSupplyPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Max supply fetch timeout")), 10000))
            ]);

            const currentSupplyPromise = badgeContract.tierCurrentSupplies(i);
            const currentSupply = await Promise.race([
              currentSupplyPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Current supply fetch timeout")), 10000))
            ]);

            console.log(`Tier ${i} supply:`, {
              max: maxSupply.toNumber(),
              current: currentSupply.toNumber()
            });

            supplies.push({
              maxSupply: maxSupply.toNumber(),
              currentSupply: currentSupply.toNumber(),
            });
          } catch (tierError) {
            console.error(`Error fetching data for tier ${i}:`, tierError);
            prices[i] = prices[i] || "0";
            supplies[i] = supplies[i] || { maxSupply: 1000, currentSupply: 0 };
          }
        }

        if (prices.length > 0) {
          setContractPrices(prices);
          console.log("Updated contract prices:", prices);
        }

        if (supplies.length > 0) {
          setBadgeSupplies(supplies);
          console.log("Updated badge supplies:", supplies);
        }
      } catch (error) {
        console.error("Error loading contract data:", error);
      } finally {
        setLoadingPrices(false);
        setLoadingSupplies(false);
      }
    };

    const loadData = async () => {
    if (address) {
      await Promise.all([
        loadUserData(),
        loadContractData()
      ]);
    }
  };
    loadData()
    loadUserData()
    loadContractData()
  }, [address, signer])

  const getTierPrice = (tier: number): string => {
  if (contractPrices && contractPrices.length > tier && tier >= 0) {
    return contractPrices[tier] || "0";
  }
  return "0";
};

const getTierStatus = (tier: number): string => {
  if (hasUserMintedTier(tier)) {
    return "owned";
  }

  if (tier === highestTier + 1) {
    return "available";
  }

  if (badgeSupplies && badgeSupplies.length > tier && tier >= 0) {
    const supply = badgeSupplies[tier];
    if (supply && supply.currentSupply >= supply.maxSupply) {
      return "sold out";
    }
  }

    return "locked"
  }

  const canMintBadge = (tier: number): boolean => {
    if (highestTier === -1 && tier === 0) return true

    if (hasUserMintedTier(tier)) return false

    return tier === highestTier + 1
  }

  const handleMint = async (): Promise<void> => {
  if (!address || !signer || selectedTier < 0 || selectedTier >= badgeTiers.length || !username) {
    console.log("Basic validation failed:", { address, signer, selectedTier, username })
    return
  }

  try {
    setTxState({
      status: "preparing",
      error: null,
      txHash: null,
      confirmations: 0,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    console.log("Checking if user has already minted this tier...")
    if (hasUserMintedTier(selectedTier)) {
      console.log("User already owns this badge tier")
      setTxState({
        status: "error",
        error: `You already own the ${badgeTiers[selectedTier].name} badge`,
        txHash: null,
        confirmations: 0,
      })
      return
    }

    console.log("Setting status to awaiting_wallet")
    setTxState((prev) => ({ ...prev, status: "awaiting_wallet" }))

    console.log("Creating contract instance...")
    const badgeContractAddress = BADGE_CONTRACT_ADDRESS
    const badgeContract = new ethers.Contract(badgeContractAddress, GMTeaBadgeABI, signer)

    console.log("Getting price from contract...")
    const contractPrice = await badgeContract.tierPrices(selectedTier)
    console.log(`Price for tier ${selectedTier} from contract: ${ethers.utils.formatEther(contractPrice)} ETH`)

    const gasLimit = 1000000

    console.log("About to request wallet confirmation...")
      try {
        const tx = await badgeContract.mintBadge(address, selectedTier, {
          value: contractPrice,
          gasLimit: gasLimit,
        })

        console.log("Transaction sent:", tx.hash)
        setTxState({
          status: "pending",
          error: null,
          txHash: tx.hash,
          confirmations: 0,
        })

        console.log("Waiting for transaction confirmation...")
        const receipt = await tx.wait();
        console.log("Transaction confirmed!", receipt);

        setTxState({
          status: "success",
          error: null,
          txHash: tx.hash,
          confirmations: receipt.confirmations || 1
        });

        if (selectedTier > highestTier) {
          setHighestTier(selectedTier);
        }

        setBadgeSupplies(prevSupplies => {
          const newSupplies = [...prevSupplies];
          if (newSupplies[selectedTier]) {
            newSupplies[selectedTier].currentSupply += 1;
          }
          return newSupplies;
        });

        setShowSuccessModal(true);

        if (onMintComplete) {
          onMintComplete();
        }
      } catch (txError: any) {
        console.error("Transaction failed:", txError);
        const { message, type } = parseTransactionError(txError);
        
        setTxState({
          status: "error",
          error: message,
          txHash: null,
          confirmations: 0,
        });
        
        addNotification(message, type);
      }
    } catch (error: any) {
      console.error("Unexpected error in handleMint:", error)
      setTxState({
        status: "error",
        error: error.message || "An unexpected error occurred",
        txHash: null,
        confirmations: 0,
      })
    }
  }

  const parseTransactionError = (error: any): { message: string; type: "error" | "info" } => {
    if (!error) return { message: "Unknown error occurred", type: "error" };
    
    const errorString = error.toString().toLowerCase();
    
    if (
      errorString.includes("user rejected") || 
      errorString.includes("user denied") || 
      errorString.includes("rejected by user") ||
      errorString.includes("transaction was rejected")
    ) {
      return {
        message: "Transaction was canceled in your wallet",
        type: "info"
      };
    }
    
    if (errorString.includes("gas") && errorString.includes("limit")) {
      return {
        message: "Transaction failed: Gas limit estimation error",
        type: "error"
      };
    }
    
    if (errorString.includes("network") || errorString.includes("connection")) {
      return {
        message: "Network connection issue. Please check your internet and try again.",
        type: "error"
      };
    }
    
    if (errorString.includes("{") && errorString.includes("}")) {
      try {
        const basicMessage = error.message?.split("(")[0]?.trim() || "Transaction failed";
        return {
          message: basicMessage,
          type: "error"
        };
      } catch (e) {
      }
    }
    
    return {
      message: error.message || "Transaction failed",
      type: "error"
    };
  };

  

  const copyTxHashToClipboard = () => {
    if (!txState.txHash) return

    navigator.clipboard
      .writeText(txState.txHash)
      .then(() => {
        addNotification("Transaction hash copied to clipboard", "success")
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
      })
  }

  const addNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++notificationIdRef.current;
    
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
    
    return id;
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const resetTxState = () => {
    setTxState({
      status: "idle",
      error: null,
      txHash: null,
      confirmations: 0,
    })
    setShowSuccessModal(false)
  }

  const renderTransactionStatus = () => {
    switch (txState.status) {
      case "preparing":
        return (
          <div className="flex items-center text-emerald-400">
            <FaSpinner className="animate-spin mr-2" />
            <span>Preparing transaction...</span>
          </div>
        )
      case "awaiting_wallet":
        return (
          <div className="flex items-center text-emerald-400">
            <FaSpinner className="animate-spin mr-2" />
            <span>Confirm in your wallet...</span>
          </div>
        )
      case "pending":
        return (
          <div className="flex flex-col">
            <div className="flex items-center text-emerald-400 mb-1">
              <FaSpinner className="animate-spin mr-2" />
              <span>Transaction pending...</span>
            </div>
            {txState.txHash && (
              <div className="flex items-center text-sm text-emerald-300/70">
                <span className="mr-1">Tx:</span>
                <a
                  href={`https://sepolia.tea.xyz/tx/${txState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline truncate max-w-xs"
                >
                  {txState.txHash.substring(0, 10)}...{txState.txHash.substring(txState.txHash.length - 8)}
                </a>
                <button onClick={copyTxHashToClipboard} className="ml-1 text-emerald-300/50 hover:text-emerald-400">
                  <FaCopy size={14} />
                </button>
              </div>
            )}
          </div>
        )
      case "success":
        return (
          <div className="flex items-center text-emerald-400">
            <FaCheck className="mr-2" />
            <span>Transaction successful!</span>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center text-red-400">
            <FaTimes className="mr-2" />
            <span>{txState.error || "Transaction failed"}</span>
          </div>
        )
      default:
        return null
    }
  }

  const renderSuccessModal = () => {
    if (!showSuccessModal) return null

    const mintedTierIndex = selectedTier > 0 ? selectedTier - 1 : 0
    const mintedTier = badgeTiers[mintedTierIndex]

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-emerald-500/20"
        >
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-emerald-400 text-3xl">{mintedTier?.icon || <FaLeaf />}</div>
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-3 text-emerald-600 dark:text-emerald-400">Badge Minted!</h2>
          <p className="text-gray-600 dark:text-emerald-300/70 text-center mb-4">
            Successfully minted
          </p>

          {txState.txHash && (
            <div className="bg-gray-50 dark:bg-emerald-900/10 p-4 rounded-xl mb-6 border border-gray-200 dark:border-emerald-700/30">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600 dark:text-emerald-300/70 font-medium">Transaction:</p>
                <button
                  onClick={copyTxHashToClipboard}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm flex items-center"
                >
                  <FaCopy className="mr-1" size={14} /> Copy
                </button>
              </div>
              <a
                href={`https://sepolia.tea.xyz/tx/${txState.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm break-all"
              >
                {txState.txHash}
              </a>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={async () => {
                resetTxState()

                setIsLoading(true)

                try {
                  const newTier = await getUserHighestTier(address)
                  setHighestTier(newTier)

                  if (newTier < 4) {
                    setSelectedTier(newTier + 1)

                    setTimeout(() => {
                      const tierElement = document.getElementById(`tier-${newTier + 1}`)
                      if (tierElement) {
                        tierElement.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                    }, 300)
                  } else {
                    setSelectedTier(-1)
                  }

                  const provider = getProvider()
                  if (provider) {
                    const badgeContract = getBadgeContract(provider)
                    const supplies = []

                    for (let i = 0; i < 5; i++) {
                      const maxSupply = await badgeContract.tierMaxSupplies(i)
                      const currentSupply = await badgeContract.tierCurrentSupplies(i)

                      supplies.push({
                        maxSupply: maxSupply.toNumber(),
                        currentSupply: currentSupply.toNumber(),
                      })
                    }

                    setBadgeSupplies(supplies)
                  }

                  if (onMintComplete) {
                    onMintComplete()
                  }
                } catch (error) {
                  console.error("Error refreshing data:", error)
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
              className={`w-full py-3 px-6 rounded-lg transition-all text-sm font-medium flex items-center justify-center ${
                isLoading 
                  ? "bg-gray-400 cursor-not-allowed text-gray-200" 
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg hover:shadow-emerald-500/20"
              }`}
            >
              <FaSpinner className={`mr-2 ${isLoading ? "animate-spin" : "hidden"}`} />
              {isLoading ? "Loading..." : "Continue"}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const getBadgeColor = (tier: number) => {
    if (tier < 0 || tier >= badgeTiers.length) return "#6b7280"
    return badgeTiers[tier].color
  }

  const getTierIcon = (tier: number) => {
    return <FaLeaf />
  }

  const renderCollectionTab = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {badgeTiers.map((tier, index) => {
            const tierStatus = getTierStatus(index)
            const isOwned = tierStatus === "owned"

            return (
              <div
                key={index}
                className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  !isOwned ? "opacity-60" : ""
                }`}
              >
                <div className="aspect-square relative overflow-hidden rounded-2xl">
                  <div
                    className={`absolute inset-0 ${
                      isOwned
                        ? "bg-gradient-to-br from-black/20 to-black/60"
                        : "bg-gradient-to-br from-black/40 to-black/80"
                    }`}
                    style={{
                      backgroundImage: isOwned
                        ? `radial-gradient(circle at 30% 30%, ${getBadgeColor(index)}30 0%, transparent 70%), 
                           radial-gradient(circle at 70% 70%, ${getBadgeColor(index)}20 0%, transparent 70%)`
                        : "",
                    }}
                  ></div>

                  <div className="absolute inset-0 opacity-30">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern
                          id={`grid-${index}`}
                          width="40"
                          height="40"
                          patternUnits="userSpaceOnUse"
                          patternTransform="rotate(30)"
                        >
                          <path
                            d="M 0,20 L 40,20 M 20,0 L 20,40"
                            stroke={getBadgeColor(index)}
                            strokeWidth="0.5"
                            strokeOpacity="0.3"
                            fill="none"
                          />
                        </pattern>
                        <linearGradient id={`light-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="transparent" />
                          <stop offset="50%" stopColor={getBadgeColor(index)} />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#grid-${index})`} />
                      {isOwned && (
                        <>
                          <rect
                            width="200%"
                            height="10"
                            fill={`url(#light-${index})`}
                            opacity="0.7"
                            transform="rotate(30)"
                            className="animate-light-horizontal"
                          />
                          <rect
                            width="10"
                            height="200%"
                            fill={`url(#light-${index})`}
                            opacity="0.7"
                            transform="rotate(30)"
                            className="animate-light-vertical"
                          />
                        </>
                      )}
                    </svg>
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm transition-all duration-300 ${
                        isOwned ? "bg-white/10" : "bg-black/30"
                      } group-hover:scale-110`}
                      style={{
                        boxShadow: isOwned ? `0 0 30px ${getBadgeColor(index)}70` : "",
                        border: `1px solid ${getBadgeColor(index)}${isOwned ? "50" : "30"}`,
                      }}
                    >
                      <div className="flex items-center justify-center w-8 h-8" style={{ color: getBadgeColor(index) }}>
                        {getTierIcon(index)}
                      </div>
                    </div>

                    <h3
                      className="text-lg font-bold mb-1 transition-all duration-300"
                      style={{ color: isOwned ? getBadgeColor(index) : "#fff" }}
                    >
                      {tier.name}
                    </h3>

                    {isOwned ? (
                      <div className="">
                        
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-xs text-white/70 border border-white/10">
                        {tierStatus === "available" ? "Available" : tierStatus === "sold out" ? "Sold Out" : "Locked"}
                      </div>
                    )}
                  </div>

                  {isOwned && (
                    <>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                        style={{
                          background: `radial-gradient(circle at center, ${getBadgeColor(index)} 0%, transparent 70%)`,
                        }}
                      ></div>
                      <div
                        className="absolute -inset-1 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-700"
                        style={{
                          background: `radial-gradient(circle at center, ${getBadgeColor(index)} 0%, transparent 70%)`,
                        }}
                      ></div>
                    </>
                  )}

                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                    style={{
                      background: "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)",
                      backgroundSize: "200% 200%",
                      animation: "shine 3s infinite linear",
                    }}
                  ></div>

                  {tierStatus === "locked" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <FaLock className="text-white/70 h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isOwned ? (
                      <span className="text-emerald-500 dark:text-emerald-400 font-medium">Active</span>
                    ) : (
                      <span>{getTierPrice(index)} TEA</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-emerald-500/20 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300 mb-4 flex items-center">
            <FaMedal className="mr-2 text-emerald-500 dark:text-emerald-400" /> Collection Progress
          </h3>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-emerald-200/70">Completion</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {Math.min(highestTier + 1, 5)}/5
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((highestTier + 1) / 5) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                  boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
                }}
              ></motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-emerald-900/10 rounded-lg p-4 border border-gray-200 dark:border-emerald-500/20 backdrop-blur-sm">
              <p className="text-xs text-gray-500 dark:text-emerald-200/60 mb-1">Highest Tier</p>
              <p
                className="font-semibold text-lg"
                style={{ color: highestTier >= 0 ? getBadgeColor(highestTier) : "#6b7280" }}
              >
                {highestTier >= 0 ? badgeTiers[highestTier].name : "None"}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-emerald-900/10 rounded-lg p-4 border border-gray-200 dark:border-emerald-500/20 backdrop-blur-sm">
              <p className="text-xs text-gray-500 dark:text-emerald-200/60 mb-1">Next Tier</p>
              <p
                className="font-semibold text-lg"
                style={{ color: highestTier < 4 ? getBadgeColor(highestTier + 1) : "#6b7280" }}
              >
                {highestTier < 4 ? badgeTiers[highestTier + 1].name : "Complete"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const renderBenefitsTab = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <TierBenefits selectedTier={highestTier} />
      </motion.div>
    )
  }

  const getMintButtonText = (tier: number): string => {
    const status = getTierStatus(tier)
    if (status === "owned") return "Owned"
    if (status === "locked") return "Locked"
    if (status === "sold out") return "Sold Out"
    return "Mint"
  }

  const getMintButtonStyle = (tier: number): string => {
    const status = getTierStatus(tier)
    if (status === "owned")
      return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
    if (status === "locked" || status === "sold out")
      return "bg-gray-200 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-500/30 cursor-not-allowed"
    return "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white transition-all shadow-lg hover:shadow-emerald-500/20"
  }

  const getStatusBadgeStyle = (status: string): string => {
    switch (status) {
      case "owned":
        return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      case "available":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse"
      case "sold out":
        return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
      default:
        return "bg-gray-200 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-500/30"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8 mt-8 bg-white dark:bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-emerald-500/20"
    >
      <div className="relative p-6 border-b border-gray-200 dark:border-emerald-500/20 bg-gradient-to-r from-gray-50 to-white dark:from-emerald-900/20 dark:to-teal-900/20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[100%] opacity-30 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 animate-aurora"></div>
        </div>

        <div className="relative flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-300 flex items-center">
            <FaLeaf className="mr-2 text-emerald-500 dark:text-emerald-400" /> GMTea Badge Collection
          </h2>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-emerald-500/20 bg-gray-50 dark:bg-emerald-900/10">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
              activeTab === "overview"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-600 dark:text-emerald-200/50 hover:text-gray-800 dark:hover:text-emerald-200/80"
            }`}
          >
            <span className="flex items-center">
              <FaRegLightbulb className="mr-2 h-4 w-4" />
              Mint Badges
            </span>
            {activeTab === "overview" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400"
                initial={false}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab("benefits")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
              activeTab === "benefits"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-600 dark:text-emerald-200/50 hover:text-gray-800 dark:hover:text-emerald-200/80"
            }`}
          >
            <span className="flex items-center">
              <FaGem className="mr-2 h-4 w-4" />
              Benefits
            </span>
            {activeTab === "benefits" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400"
                initial={false}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab("collection")}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
              activeTab === "collection"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-600 dark:text-emerald-200/50 hover:text-gray-800 dark:hover:text-emerald-200/80"
            }`}
          >
            <span className="flex items-center">
              <FaMedal className="mr-2 h-4 w-4" />
              Collection
            </span>
            {activeTab === "collection" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400"
                initial={false}
              />
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                  <div className="bg-white dark:bg-black/60 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-emerald-500/20 shadow-xl h-full">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300 mb-4 flex items-center">
                      <FaMedal className="mr-2 text-emerald-500 dark:text-emerald-400" /> Your Collection
                    </h3>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-emerald-200/70">Highest Badge:</span>
                        {isLoading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-emerald-900/30 h-6 w-24 rounded"></div>
                        ) : (
                          <span
                            className="font-medium"
                            style={{ color: highestTier >= 0 ? getBadgeColor(highestTier) : "#6b7280" }}
                          >
                            {highestTier >= 0 ? badgeTiers[highestTier].name : "None"}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-emerald-200/70">Completion:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {isLoading ? (
                            <div className="animate-pulse bg-gray-200 dark:bg-emerald-900/30 h-6 w-16 rounded"></div>
                          ) : (
                            `${Math.min(highestTier + 1, 5)} / 5`
                          )}
                        </span>
                      </div>

                      <div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${isLoading ? 0 : Math.min(((highestTier + 1) / 5) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{
                              background: "linear-gradient(90deg, #10b981, #34d399)",
                              boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
                            }}
                          ></motion.div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-emerald-900/10 rounded-xl border border-gray-200 dark:border-emerald-500/20">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-emerald-200/70">Username:</span>
                          {isLoading ? (
                            <div className="animate-pulse bg-gray-200 dark:bg-emerald-900/30 h-6 w-24 rounded"></div>
                          ) : (
                            <span
                              className={`font-medium ${username ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                            >
                              {username || "Not Set"}
                            </span>
                          )}
                        </div>

                        {!username && (
                          <div className="mt-2 text-xs text-red-500 dark:text-red-400">
                            <FaInfoCircle className="inline mr-1" /> You need to set a username before minting badges.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-800 dark:text-emerald-300 mb-4">
                        Badge Collection:
                      </h4>

                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {badgeTiers.map((tier, index) => {
                          const tierStatus = getTierStatus(index)
                          const isOwned = tierStatus === "owned"
                          const isAvailable = tierStatus === "available"
                          const isSoldOut = tierStatus === "sold out"
                          const isLocked = tierStatus === "locked"
                          const isSelected = selectedTier === index

                          return (
                            <motion.div
                              key={index}
                              id={`tier-${index}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className={`relative cursor-pointer ${isSelected ? "z-10" : ""}`}
                              onClick={() => setSelectedTier(index)}
                            >
                              <div className="absolute top-1 left-0 right-0 flex justify-center z-10">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                                    tierStatus,
                                  )}`}
                                >
                                  {isOwned ? "Owned" : isAvailable ? "Available" : isSoldOut ? "Sold Out" : "Locked"}
                                </span>
                              </div>

                              <div
                                className={`
                                  aspect-square relative overflow-hidden rounded-lg transition-all duration-300
                                  ${isOwned ? "backdrop-blur-sm shadow-lg" : "opacity-60"}
                                  ${isSelected ? "scale-105 shadow-xl ring-2" : "hover:scale-102"}
                                `}
                                style={{
                                  backgroundColor: `${getBadgeColor(index)}10`,
                                  boxShadow: isOwned ? `0 0 15px ${getBadgeColor(index)}30` : "none",
                                  borderColor: isSelected ? getBadgeColor(index) : "transparent",
                                }}
                              >
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                  <div
                                    className={`
                                      w-10 h-10 flex items-center justify-center rounded-full mb-1 mt-3
                                      ${
                                        isOwned
                                          ? "bg-gradient-to-br from-white/20 to-white/5 dark:from-emerald-500/20 dark:to-emerald-500/5"
                                          : "bg-white/10 dark:bg-emerald-900/20"
                                      }
                                    `}
                                    style={isOwned ? { boxShadow: `0 0 10px ${getBadgeColor(index)}40` } : {}}
                                  >
                                    <div
                                      className="flex items-center justify-center w-5 h-5"
                                      style={{ color: getBadgeColor(index) }}
                                    >
                                      {getTierIcon(index)}
                                    </div>
                                  </div>

                                  <p className="text-xs font-bold text-center" style={{ color: getBadgeColor(index) }}>
                                    {tier.name}
                                  </p>
                                </div>

                                {isOwned && (
                                  <>
                                    <div
                                      className="absolute inset-0 opacity-20"
                                      style={{
                                        background: `radial-gradient(circle at center, ${getBadgeColor(index)}40 0%, transparent 70%)`,
                                      }}
                                    ></div>
                                    <div
                                      className="absolute inset-0 opacity-10 animate-pulse"
                                      style={{
                                        background: `linear-gradient(45deg, transparent 40%, ${getBadgeColor(index)} 50%, transparent 60%)`,
                                        backgroundSize: "200% 200%",
                                        animation: "gradient-shift 3s ease infinite",
                                      }}
                                    ></div>
                                  </>
                                )}

                                {isAvailable && (
                                  <div
                                    className="absolute inset-0 animate-pulse opacity-10"
                                    style={{
                                      background: `radial-gradient(circle at center, ${getBadgeColor(index)} 0%, transparent 70%)`,
                                    }}
                                  ></div>
                                )}
                              </div>

                              <div className="text-center mt-1">
                                <span className="text-[10px] text-gray-500 dark:text-emerald-200/50">
                                  {loadingPrices ? (
                                    <span className="animate-pulse">...</span>
                                  ) : (
                                    `${getTierPrice(index)} TEA`
                                  )}
                                </span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="bg-white dark:bg-black/60 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-emerald-500/20 shadow-xl h-full">
                    {highestTier < 4 ? (
                      <>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300 flex items-center">
                            <FaLeaf className="mr-2 text-emerald-500 dark:text-emerald-400" />
                            Available Badge to Mint
                          </h3>
                          <p className="text-gray-600 dark:text-emerald-200/70 text-sm mt-1">
                            Mint your next tier to unlock more benefits:
                          </p>
                        </div>

                        {selectedTier >= 0 && selectedTier < badgeTiers.length ? (
                          <div className="bg-gray-50 dark:bg-emerald-900/10 rounded-xl p-6 border border-gray-200 dark:border-emerald-500/20">
                            <div className="flex items-start">
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mr-4 relative overflow-hidden"
                                style={{
                                  background: `linear-gradient(135deg, ${getBadgeColor(selectedTier)}20, ${getBadgeColor(selectedTier)}05)`,
                                  border: `2px solid ${getBadgeColor(selectedTier)}30`,
                                }}
                              >
                                <div
                                  className="flex items-center justify-center w-8 h-8"
                                  style={{ color: getBadgeColor(selectedTier) }}
                                >
                                  {getTierIcon(selectedTier)}
                                </div>
                                <div
                                  className="absolute inset-0 opacity-30 animate-pulse"
                                  style={{
                                    background: `radial-gradient(circle at center, ${getBadgeColor(selectedTier)} 0%, transparent 70%)`,
                                  }}
                                ></div>
                              </div>

                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300">
                                    {badgeTiers[selectedTier].name} Badge
                                  </h3>

                                  <div
                                    className="px-3 py-1 rounded-full text-xs font-medium border"
                                    style={{
                                      backgroundColor: `${getBadgeColor(selectedTier)}20`,
                                      color: getBadgeColor(selectedTier),
                                      borderColor: `${getBadgeColor(selectedTier)}30`,
                                    }}
                                  >
                                    {getTierStatus(selectedTier) === "available"
                                      ? "Available Now"
                                      : getTierStatus(selectedTier) === "owned"
                                        ? "Owned"
                                        : getTierStatus(selectedTier) === "sold out"
                                          ? "Sold Out"
                                          : "Locked"}
                                  </div>
                                </div>

                                <p className="text-gray-600 dark:text-emerald-200/70 text-sm mt-1 mb-3">
                                  {badgeTiers[selectedTier].description}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                  <div className="bg-white dark:bg-emerald-900/10 rounded-lg p-3 border border-gray-200 dark:border-emerald-500/20">
                                    <div className="text-xs text-gray-500 dark:text-emerald-200/60">Check-in Boost</div>
                                    <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                      {badgeTiers[selectedTier].checkinBoost}
                                    </div>
                                  </div>

                                  <div className="bg-white dark:bg-emerald-900/10 rounded-lg p-3 border border-gray-200 dark:border-emerald-500/20">
                                    <div className="text-xs text-gray-500 dark:text-emerald-200/60">
                                      Referral Reward
                                    </div>
                                    <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                      {badgeTiers[selectedTier].referralReward}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center mb-4">
                                  <div className="text-sm text-gray-600 dark:text-emerald-200/70">
                                    Supply:{" "}
                                    {loadingSupplies ? (
                                      <FaSpinner className="animate-spin h-3 w-3 inline ml-1" />
                                    ) : (
                                      `${badgeSupplies[selectedTier]?.currentSupply} / ${badgeSupplies[selectedTier]?.maxSupply}`
                                    )}
                                  </div>

                                  <div className="text-sm text-gray-600 dark:text-emerald-200/70">
                                    Price:{" "}
                                    {loadingPrices ? (
                                      <FaSpinner className="animate-spin h-3 w-3 inline ml-1" />
                                    ) : (
                                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        {getTierPrice(selectedTier)} TEA
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <AnimatePresence mode="wait">
                                  {txState.status !== "idle" && (
                                    <motion.div
                                      key={txState.status}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      transition={{ duration: 0.3 }}
                                      className="mb-4 p-3 bg-white dark:bg-emerald-900/10 rounded-lg border border-gray-200 dark:border-emerald-500/20"
                                    >
                                      {renderTransactionStatus()}
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="flex space-x-3 items-center">
                                  <button
                                    onClick={handleMint}
                                    disabled={
                                      (txState.status !== "idle" && txState.status !== "error") ||
                                      !signer ||
                                      !canMintBadge(selectedTier) ||
                                      loadingPrices ||
                                      !username
                                    }
                                    className={`
                                      flex-1 py-3 px-4 rounded-lg font-medium relative overflow-hidden group
                                      ${
                                        (txState.status !== "idle" && txState.status !== "error") ||
                                        !signer ||
                                        !canMintBadge(selectedTier) ||
                                        loadingPrices ||
                                        !username
                                          ? "bg-gray-100 dark:bg-emerald-900/20 text-gray-400 dark:text-emerald-200/30 cursor-not-allowed"
                                          : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white transition-all shadow-lg"
                                      }
                                    `}
                                  >
                                  {canMintBadge(selectedTier) && signer && username && (txState.status === "idle" || txState.status === "error") && (
                                    <>
                                      <div className="absolute inset-0 w-full h-full">
                                        <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer"></div>
                                      </div>
                                      <div className="absolute inset-0 opacity-20">
                                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                          <defs>
                                            <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                                              <path d="M 0,10 L 20,10 M 10,0 L 10,20" stroke="white" strokeWidth="0.5" fill="none" />
                                            </pattern>
                                          </defs>
                                          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                                        </svg>
                                      </div>
                                      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-emerald-400 blur-xl"></div>
                                    </>
                                  )}

                                  <span className="relative flex items-center justify-center">
                                    {txState.status === "idle" || txState.status === "error" ? (
                                      <>
                                        {getTierStatus(selectedTier) === "available" && <FaWallet className="mr-2" />}
                                        {getMintButtonText(selectedTier)}
                                        {getTierStatus(selectedTier) === "available" && (
                                          <FaChevronRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <FaSpinner className="animate-spin mr-2" />
                                        Processing
                                      </>
                                    )}
                                  </span>
                                </button>

                                {txState.status === "awaiting_wallet" && (
                                  <button
                                    onClick={() => {
                                      setTxState({
                                        status: "idle",
                                        error: null,
                                        txHash: null,
                                        confirmations: 0,
                                      });
                                    }}
                                    className="w-28 py-2.5 relative overflow-hidden group rounded-lg flex justify-center items-center font-medium transition-all border border-red-300/50 dark:border-red-500/30 text-red-500 dark:text-red-400 hover:text-white"
                                  >
                                    <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-red-500 to-rose-500"></div>
                                    
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
                                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                          <pattern id="cancel-pattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                                            <path d="M 0,10 L 20,10 M 10,0 L 10,20" stroke="white" strokeWidth="0.5" fill="none" />
                                          </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill="url(#cancel-pattern)" />
                                      </svg>
                                    </div>
                                    
                                    <span className="relative flex items-center">
                                      <FaTimes className="mr-1.5 h-3.5 w-3.5" />
                                      Cancel
                                    </span>
                                  </button>
                                )}
                              </div>

                              {!username && getTierStatus(selectedTier) === "available" && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20 text-sm text-red-500 dark:text-red-400">
                                  <FaInfoCircle className="inline mr-1" />
                                  You need to set a username first before minting badges.
                                  <a
                                    href="/profile"
                                    className="ml-2 underline hover:text-red-600 dark:hover:text-red-300"
                                  >
                                    Go to Profile Page
                                  </a>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 dark:bg-emerald-900/10 rounded-xl p-6 border border-gray-200 dark:border-emerald-500/20 h-full flex flex-col items-center justify-center">
                            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 mb-4 relative">
                              <FaInfoCircle className="text-emerald-500 dark:text-emerald-400 text-2xl" />
                              <div className="absolute inset-0 rounded-full border border-emerald-200 dark:border-emerald-500/30 animate-pulse"></div>
                            </div>
                            <h4 className="text-lg font-medium text-gray-800 dark:text-emerald-300 mb-2">
                              Select a Badge
                            </h4>
                            <p className="text-center text-gray-600 dark:text-emerald-200/70 mb-4">
                              Please select a badge from the collection on the left to view details.
                            </p>
                          </div>
                        )}

                        <div className="mt-6 bg-gray-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-gray-200 dark:border-emerald-500/20">
                          <h4 className="font-medium text-gray-800 dark:text-emerald-300 mb-3">
                            Badge Benefits Comparison
                          </h4>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-emerald-800/30">
                              <thead>
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-emerald-200/80 uppercase tracking-wider">
                                    Badge
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-emerald-200/80 uppercase tracking-wider">
                                    Check-in Boost
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-emerald-200/80 uppercase tracking-wider">
                                    Referral Reward
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-emerald-800/30">
                                {badgeTiers.map((tier, index) => {
                                  const isActive = highestTier >= index

                                  return (
                                    <tr
                                      key={index}
                                      className={
                                        index === selectedTier
                                          ? "bg-emerald-50 dark:bg-emerald-500/10"
                                          : index % 2 === 0
                                            ? "bg-gray-50 dark:bg-emerald-900/10"
                                            : "bg-white dark:bg-transparent"
                                      }
                                      onClick={() => setSelectedTier(index)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div
                                            className="flex-shrink-0 h-6 w-6 flex items-center justify-center mr-2"
                                            style={{ color: tier.color }}
                                          >
                                            {getTierIcon(index)}
                                          </div>
                                          <div
                                            className={`font-medium ${isActive ? "text-gray-800 dark:text-emerald-300" : "text-gray-500 dark:text-emerald-200/50"}`}
                                          >
                                            {tier.name}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                        <span
                                          className={
                                            isActive
                                              ? "text-emerald-600 dark:text-emerald-400"
                                              : "text-gray-500 dark:text-emerald-200/50"
                                          }
                                        >
                                          {tier.checkinBoost}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                        <span
                                          className={
                                            isActive
                                              ? "text-emerald-600 dark:text-emerald-400"
                                              : "text-gray-500 dark:text-emerald-200/50"
                                          }
                                        >
                                          {tier.referralReward}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-emerald-200/50 mt-4">
                            Badges must be minted sequentially, starting from Common. Each tier unlocks additional
                            benefits while maintaining those from previous tiers.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-12">
                        <div className="relative w-24 h-24 mb-6">
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-200 dark:border-emerald-500/30 animate-pulse"></div>
                          <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-300 dark:border-emerald-400 animate-spin"></div>
                          <div className="absolute inset-4 rounded-full border-2 border-emerald-200 dark:border-emerald-300/60"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FaLeaf className="text-emerald-500 dark:text-emerald-400 text-4xl" />
                          </div>
                        </div>

                        <h4 className="text-xl font-bold mb-2 text-emerald-600 dark:text-emerald-400">
                          Collection Complete!
                        </h4>
                        <p className="text-gray-600 dark:text-emerald-200/70 text-center max-w-lg mb-6">
                          Congratulations! You've collected all available badges in the GM Tea collection. You now enjoy
                          the maximum benefits across all platform features.
                        </p>

                        <div className="grid grid-cols-5 gap-4 mb-8">
                          {badgeTiers.map((tier, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex flex-col items-center"
                            >
                              <div
                                className="w-14 h-14 relative flex items-center justify-center rounded-lg"
                                style={{
                                  background: `linear-gradient(135deg, ${tier.color}30, ${tier.color}10)`,
                                  boxShadow: `0 0 10px ${tier.color}40`,
                                  border: `1px solid ${tier.color}30`,
                                }}
                              >
                                <div style={{ color: tier.color }} className="text-xl">
                                  {getTierIcon(index)}
                                </div>
                                <div
                                  className="absolute inset-0 opacity-20"
                                  style={{
                                    background: `radial-gradient(circle at center, ${tier.color} 0%, transparent 70%)`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-emerald-200/70 mt-2">{tier.name}</span>
                            </motion.div>
                          ))}
                        </div>

                        <div className="bg-gray-50 dark:bg-emerald-900/10 rounded-xl p-5 border border-gray-200 dark:border-emerald-500/20 max-w-md">
                          <h5 className="font-medium text-gray-800 dark:text-emerald-300 mb-3 text-center">
                            Your Maximum Benefits
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-emerald-900/10 rounded-lg p-3 border border-gray-200 dark:border-emerald-500/20">
                              <div className="text-xs text-gray-500 dark:text-emerald-200/60">Check-in Boost</div>
                              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                {badgeTiers[4].checkinBoost}
                              </div>
                            </div>

                            <div className="bg-white dark:bg-emerald-900/10 rounded-lg p-3 border border-gray-200 dark:border-emerald-500/20">
                              <div className="text-xs text-gray-500 dark:text-emerald-200/60">Referral Reward</div>
                              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                {badgeTiers[4].referralReward}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "benefits" && (
            <motion.div
              key="benefits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderBenefitsTab()}
            </motion.div>
          )}

          {activeTab === "collection" && (
            <motion.div
              key="collection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderCollectionTab()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {renderSuccessModal()}

      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />

      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes aurora {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes light-horizontal {
          0% { transform: translateX(-100%) rotate(30deg); }
          100% { transform: translateX(100%) rotate(30deg); }
        }

        @keyframes light-vertical {
          0% { transform: translateY(-100%) rotate(30deg); }
          100% { transform: translateY(100%) rotate(30deg); }
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .animate-light-horizontal {
          animation: light-horizontal 3s infinite linear;
        }

        .animate-light-vertical {
          animation: light-vertical 3s infinite linear;
        }

        @keyframes notification-progress {
          from { width: 100%; }
          to { width: 0%; }
        }

        .animate-notification-progress {
          animation: notification-progress 5s linear forwards;
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-shimmer {
          animation: shimmer 2.5s infinite;
        }
      `}</style>
    </motion.div>
  )
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const colorSchemes = {
    success: {
      bg: "bg-gradient-to-r from-emerald-500/90 to-teal-600/90",
      border: "border-emerald-400",
      icon: <FaCheck className="h-5 w-5 text-white" />,
      ringColor: "emerald-400"
    },
    error: {
      bg: "bg-gradient-to-r from-rose-500/90 to-red-600/90",
      border: "border-rose-400",
      icon: <FaTimes className="h-5 w-5 text-white" />,
      ringColor: "rose-400"
    },
    info: {
      bg: "bg-gradient-to-r from-blue-500/90 to-indigo-600/90",
      border: "border-blue-400",
      icon: <FaInfoCircle className="h-5 w-5 text-white" />,
      ringColor: "blue-400"
    }
  };
  
  const scheme = colorSchemes[type] || colorSchemes.info;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`${scheme.bg} backdrop-blur-md border ${scheme.border}/30 rounded-xl shadow-2xl p-4 max-w-sm w-full flex items-center relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`grid-${type}`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <path d="M 0,10 L 20,10 M 10,0 L 10,20" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${type})`} />
        </svg>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full bg-white/40 animate-notification-progress"></div>
      </div>
      
      <div className="relative mr-3 flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm`}>
          {scheme.icon}
        </div>
        <div className={`absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-50`}></div>
      </div>
      
      <div className="flex-1 text-white text-sm font-medium pr-8">{message}</div>
      
      <button 
        onClick={onClose} 
        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
      >
        <FaTimes className="h-3 w-3" />
      </button>
    </motion.div>
  );
};

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BadgeMintSection