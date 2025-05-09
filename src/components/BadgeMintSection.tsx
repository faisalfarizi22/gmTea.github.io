"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ethers } from "ethers"
import {
  FaLeaf,
  FaWallet,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaCopy,
  FaChevronRight,
  FaGem,
  FaMedal,
  FaLock,
  FaRegLightbulb,
} from "react-icons/fa"
import { BADGE_TIERS, BADGE_CONTRACT_ADDRESS } from "@/utils/constants"
import { getUserHighestTier, hasUserMintedTier, getBadgeContract, getProvider, checkUsername } from "@/utils/badgeWeb3"
import GMTeaBadgeABI from "../abis/GMTeaBadgeABI.json"
import TierBenefits from "./TierBenefits"

interface BadgeMintSectionProps {
  address: string
  signer: ethers.Signer | null
  onMintComplete?: () => void
}

// Transaction state type
type TxState = {
  status: "idle" | "preparing" | "awaiting_wallet" | "pending" | "success" | "error"
  error: string | null
  txHash: string | null
  confirmations: number
}

// Badge supply info
interface BadgeSupply {
  maxSupply: number
  currentSupply: number
}

const BadgeMintSection: React.FC<BadgeMintSectionProps> = ({ address, signer, onMintComplete }) => {
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
  const [activeTab, setActiveTab] = useState("overview") // 'overview', 'benefits', 'collection'

  // Badge tier information with benefits
  const badgeTiers = [
    {
      id: 0,
      name: "Common",
      color: BADGE_TIERS.COMMON.color,
      description: "Entry-level badge with basic benefits",
      checkinBoost: "1.05x",
      referralReward: "5%",
      icon: <FaLeaf />,
    },
    {
      id: 1,
      name: "Uncommon",
      color: BADGE_TIERS.UNCOMMON.color,
      description: "Enhanced benefits and special features",
      checkinBoost: "1.12x",
      referralReward: "10%",
      icon: <FaLeaf />,
    },
    {
      id: 2,
      name: "Rare",
      color: BADGE_TIERS.RARE.color,
      description: "Premium access and additional perks",
      checkinBoost: "1.25x",
      referralReward: "15%",
      icon: <FaLeaf />,
    },
    {
      id: 3,
      name: "Epic",
      color: BADGE_TIERS.EPIC.color,
      description: "Superior benefits and exclusive features",
      checkinBoost: "1.5x",
      referralReward: "20%",
      icon: <FaLeaf />,
    },
    {
      id: 4,
      name: "Legendary",
      color: BADGE_TIERS.LEGENDARY.color,
      description: "Ultimate tier with maximum rewards",
      checkinBoost: "1.8x",
      referralReward: "25%",
      icon: <FaLeaf />,
    },
  ]

  // Load user's highest tier, contract prices, supplies, and username
  useEffect(() => {
    const loadUserData = async () => {
      if (!address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Load user's highest tier
        const tier = await getUserHighestTier(address)
        setHighestTier(tier)

        // Set selected tier based on highest tier
        if (tier === -1) {
          setSelectedTier(0) // No badges, select COMMON
        } else if (tier < 4) {
          setSelectedTier(tier + 1) // Select next tier
        } else {
          setSelectedTier(-1) // Has all badges
        }

        // Load username
        try {
          const userUsername = await checkUsername(address)
          setUsername(userUsername)
        } catch (error) {
          console.error("Error loading username:", error)
          setUsername(null)
        }
      } catch (error) {
        console.error("Error loading user tier:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const loadContractData = async () => {
      try {
        setLoadingPrices(true)
        setLoadingSupplies(true)

        const provider = getProvider()
        if (!provider) return

        const badgeContract = getBadgeContract(provider)

        // Load prices for all tiers
        const prices = []
        const supplies = []

        for (let i = 0; i < 5; i++) {
          // Get price
          const price = await badgeContract.tierPrices(i)
          prices.push(ethers.utils.formatEther(price))

          // Get supplies
          const maxSupply = await badgeContract.tierMaxSupplies(i)
          const currentSupply = await badgeContract.tierCurrentSupplies(i)

          supplies.push({
            maxSupply: maxSupply.toNumber(),
            currentSupply: currentSupply.toNumber(),
          })
        }

        setContractPrices(prices)
        setBadgeSupplies(supplies)
      } catch (error) {
        console.error("Error loading contract data:", error)
      } finally {
        setLoadingPrices(false)
        setLoadingSupplies(false)
      }
    }

    loadUserData()
    loadContractData()
  }, [address])

  // Handle confirmation polling when transaction is pending
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (txState.status === "pending" && txState.txHash) {
      // Poll for transaction receipt
      intervalId = setInterval(async () => {
        try {
          const provider = getProvider()
          if (!provider) return

          const receipt = await provider.getTransactionReceipt(txState.txHash!)

          if (receipt) {
            clearInterval(intervalId!)

            if (receipt.status === 1) {
              // Transaction successful
              console.log("Transaction successful!", receipt)

              try {
                // Refresh highest tier after successful mint
                const newTier = await getUserHighestTier(address)

                // Update highest tier state
                setHighestTier(newTier)

                // Set next tier as selected for minting
                if (newTier < 4) {
                  // Move directly to the next tier
                  const nextTier = newTier + 1
                  setSelectedTier(nextTier)

                  // Pre-select the tier element to scroll it into view when modal is closed
                  setTimeout(() => {
                    const tierElement = document.getElementById(`tier-${nextTier}`)
                    if (tierElement) {
                      tierElement.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                  }, 300)
                } else {
                  setSelectedTier(-1) // Has all badges
                }

                // Also reload supplies
                const badgeContract = getBadgeContract(provider)
                const newSupplies = [...badgeSupplies]

                // Update the just-minted tier's supply
                const justMintedTier = selectedTier
                if (justMintedTier >= 0 && justMintedTier < newSupplies.length) {
                  const currentSupply = await badgeContract.tierCurrentSupplies(justMintedTier)
                  newSupplies[justMintedTier].currentSupply = currentSupply.toNumber()
                  setBadgeSupplies(newSupplies)
                }

                // Update transaction state to success
                setTxState((prev) => ({
                  ...prev,
                  status: "success",
                  confirmations: receipt.confirmations,
                }))

                // Show success modal
                setShowSuccessModal(true)

                // Notify parent component
                if (onMintComplete) {
                  onMintComplete()
                }
              } catch (error) {
                console.error("Error updating tier data:", error)
                // Still show success even if tier update fails
                setTxState((prev) => ({
                  ...prev,
                  status: "success",
                  confirmations: receipt.confirmations,
                }))
                setShowSuccessModal(true)
              }
            } else {
              // Transaction failed
              setTxState((prev) => ({
                ...prev,
                status: "error",
                error: "Transaction failed on the blockchain",
              }))
            }
          }
        } catch (error) {
          console.error("Error checking transaction receipt:", error)
        }
      }, 3000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [txState.status, txState.txHash, address, onMintComplete, badgeSupplies, selectedTier])

  // Get tier price from contract
  const getTierPrice = (tier: number): string => {
    if (contractPrices.length > 0 && tier < contractPrices.length) {
      return contractPrices[tier]
    }
    return "0"
  }

  // Get tier status: available, owned, locked, or sold out
  const getTierStatus = (tier: number): string => {
    if (highestTier >= tier) {
      return "owned"
    }

    if (tier === highestTier + 1) {
      return "available"
    }

    if (badgeSupplies.length > tier && badgeSupplies[tier].currentSupply >= badgeSupplies[tier].maxSupply) {
      return "sold out"
    }

    return "locked"
  }

  // Check if user can mint badge
  const canMintBadge = (tier: number): boolean => {
    // If user has no badges, they can only mint tier 0
    if (highestTier === -1 && tier === 0) return true

    // If user already has this tier or higher, they can't mint it
    if (tier <= highestTier) return false

    // User can only mint the next tier after their highest one
    return tier === highestTier + 1
  }

  // Handle mint process
  const handleMint = async (): Promise<void> => {
    if (!address || !signer || selectedTier < 0 || selectedTier >= badgeTiers.length || !username) {
      console.log("Basic validation failed:", { address, signer, selectedTier, username })
      return
    }

    try {
      // Set transaction state to preparing
      setTxState({
        status: "preparing",
        error: null,
        txHash: null,
        confirmations: 0,
      })

      // Use a timeout to ensure UI updates before continuing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check if user already has this tier badge
      console.log("Checking if user has already minted this tier...")
      try {
        const hasMinted = await hasUserMintedTier(address, selectedTier)
        if (hasMinted) {
          console.log("User already owns this badge tier")
          setTxState({
            status: "error",
            error: `You already own the ${badgeTiers[selectedTier].name} badge`,
            txHash: null,
            confirmations: 0,
          })
          return
        }
      } catch (error) {
        console.log("Error checking tier ownership, continuing anyway:", error)
      }

      // Set state to awaiting wallet confirmation immediately
      console.log("Setting status to awaiting_wallet")
      setTxState((prev) => ({ ...prev, status: "awaiting_wallet" }))

      // Create contract instance directly with signer
      console.log("Creating contract instance...")
      const badgeContractAddress = BADGE_CONTRACT_ADDRESS
      const badgeContract = new ethers.Contract(badgeContractAddress, GMTeaBadgeABI, signer)

      // Get price directly from the contract
      console.log("Getting price from contract...")
      const contractPrice = await badgeContract.tierPrices(selectedTier)
      console.log(`Price for tier ${selectedTier} from contract: ${ethers.utils.formatEther(contractPrice)} ETH`)

      // Always use high gas limit for referral processing
      const gasLimit = 1000000

      // Direct contract call
      console.log("About to request wallet confirmation...")
      try {
        const tx = await badgeContract.mintBadge(address, selectedTier, {
          value: contractPrice, // Use price from contract
          gasLimit: gasLimit,
        })

        console.log("Transaction sent:", tx.hash)
        setTxState({
          status: "pending",
          error: null,
          txHash: tx.hash,
          confirmations: 0,
        })
      } catch (txError: any) {
        console.error("Transaction failed:", txError)
        setTxState({
          status: "error",
          error: txError.message || "Transaction failed",
          txHash: null,
          confirmations: 0,
        })
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

  // Copy transaction hash to clipboard
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

  // Add notification (simplified version)
  const addNotification = (message: string, type: "success" | "error" | "info") => {
    // For simplicity, we're just using an alert
    // In a real app, you'd use a proper notification system
    alert(`${type.toUpperCase()}: ${message}`)
  }

  // Reset transaction state
  const resetTxState = () => {
    setTxState({
      status: "idle",
      error: null,
      txHash: null,
      confirmations: 0,
    })
    setShowSuccessModal(false)
  }

  // Render transaction status
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

  // Success modal
  const renderSuccessModal = () => {
    if (!showSuccessModal) return null

    // Find the tier that was just minted (previous selected tier)
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
            You have successfully minted the {mintedTier?.name} badge.
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
                // Reset modal first
                resetTxState()

                // Show loading indicator
                setIsLoading(true)

                // Re-fetch user tier data and contract data
                try {
                  // Load updated highest tier
                  const newTier = await getUserHighestTier(address)
                  setHighestTier(newTier)

                  // Update selected tier to the next one after the new highest tier
                  if (newTier < 4) {
                    // Set next tier as selected
                    setSelectedTier(newTier + 1)

                    // Scroll to the new tier
                    setTimeout(() => {
                      const tierElement = document.getElementById(`tier-${newTier + 1}`)
                      if (tierElement) {
                        tierElement.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                    }, 300)
                  } else {
                    setSelectedTier(-1) // Has all badges
                  }

                  // Also refresh badge supplies
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

                  // Also trigger the onMintComplete callback if provided
                  if (onMintComplete) {
                    onMintComplete()
                  }
                } catch (error) {
                  console.error("Error refreshing data:", error)
                } finally {
                  setIsLoading(false)
                }
              }}
              className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/20 text-sm font-medium flex items-center justify-center"
            >
              <FaSpinner className={`mr-2 ${isLoading ? "animate-spin" : "hidden"}`} />
              Continue
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Get badge color by tier
  const getBadgeColor = (tier: number) => {
    if (tier < 0 || tier >= badgeTiers.length) return "#6b7280"
    return badgeTiers[tier].color
  }

  // Get tier icon
  const getTierIcon = (tier: number) => {
    return <FaLeaf />
  }

  // Render the collection tab content
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
                  {/* Badge background with geometric patterns */}
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

                  {/* Geometric patterns with animated light */}
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

                  {/* Badge content */}
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
                      <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white border border-white/20">
                        Activated
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-xs text-white/70 border border-white/10">
                        {tierStatus === "available" ? "Available" : tierStatus === "sold out" ? "Sold Out" : "Locked"}
                      </div>
                    )}
                  </div>

                  {/* Animated glow effect for owned badges */}
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

                  {/* Animated shine effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                    style={{
                      background: "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)",
                      backgroundSize: "200% 200%",
                      animation: "shine 3s infinite linear",
                    }}
                  ></div>

                  {/* Lock icon for locked badges */}
                  {tierStatus === "locked" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <FaLock className="text-white/70 h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Badge info footer */}
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

        {/* Collection progress */}
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

  // Render the benefits tab content
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

  // Get button text based on tier status
  const getMintButtonText = (tier: number): string => {
    const status = getTierStatus(tier)
    if (status === "owned") return "Owned"
    if (status === "locked") return "Locked"
    if (status === "sold out") return "Sold Out"
    return "Mint"
  }

  // Get button style based on tier status
  const getMintButtonStyle = (tier: number): string => {
    const status = getTierStatus(tier)
    if (status === "owned")
      return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
    if (status === "locked" || status === "sold out")
      return "bg-gray-200 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-500/30 cursor-not-allowed"
    return "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white transition-all shadow-lg hover:shadow-emerald-500/20"
  }

  // Get status badge style based on tier status
  const getStatusBadgeStyle = (status: string): string => {
    switch (status) {
      case "owned":
        return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      case "available":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse"
      case "sold out":
        return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
      default: // locked
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
      {/* Header with subtle glow effect */}
      <div className="relative p-6 border-b border-gray-200 dark:border-emerald-500/20 bg-gradient-to-r from-gray-50 to-white dark:from-emerald-900/20 dark:to-teal-900/20 overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[100%] opacity-30 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 animate-aurora"></div>
        </div>

        <div className="relative flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-300 flex items-center">
            <FaLeaf className="mr-2 text-emerald-500 dark:text-emerald-400" /> GMTea Badge Collection
          </h2>
        </div>
      </div>

      {/* Tab Navigation - Sleek, minimal design */}
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
                {/* Collection Status - 5 columns */}
                <div className="md:col-span-5">
                  <div className="bg-white dark:bg-black/60 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-emerald-500/20 shadow-xl h-full">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300 mb-4 flex items-center">
                      <FaMedal className="mr-2 text-emerald-500 dark:text-emerald-400" /> Your Collection
                    </h3>

                    {/* Collection Status */}
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

                      {/* Username Status */}
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

                    {/* Badge Collection - Rectangular design */}
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
                              {/* Status indicator at the top */}
                              <div className="absolute top-1 left-0 right-0 flex justify-center z-10">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                                    tierStatus,
                                  )}`}
                                >
                                  {isOwned ? "Owned" : isAvailable ? "Available" : isSoldOut ? "Sold Out" : "Locked"}
                                </span>
                              </div>

                              {/* Rectangular Badge */}
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
                                {/* Badge Content */}
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

                                {/* Animated effect for owned badges */}
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

                              {/* Price Tag */}
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

                {/* Badge Minting Section - 7 columns */}
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

                        {/* Selected tier details */}
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
                                {/* Animated glow */}
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

                                {/* Transaction status */}
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

                                {/* Mint button */}
                                <button
                                  onClick={handleMint}
                                  disabled={
                                    (txState.status !== "idle" && txState.status !== "error") ||
                                    !signer ||
                                    !canMintBadge(selectedTier) ||
                                    loadingPrices ||
                                    !username
                                  }
                                  className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center ${
                                    (txState.status !== "idle" && txState.status !== "error") ||
                                    !signer ||
                                    !canMintBadge(selectedTier) ||
                                    loadingPrices ||
                                    !username
                                      ? "bg-gray-100 dark:bg-emerald-900/20 text-gray-400 dark:text-emerald-200/30 cursor-not-allowed"
                                      : getMintButtonStyle(selectedTier)
                                  }`}
                                >
                                  {txState.status === "idle" || txState.status === "error" ? (
                                    <>
                                      {getTierStatus(selectedTier) === "available" && <FaWallet className="mr-2" />}
                                      {getMintButtonText(selectedTier)}
                                      {getTierStatus(selectedTier) === "available" && (
                                        <FaChevronRight className="ml-2" />
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <FaSpinner className="animate-spin mr-2" />
                                      Processing...
                                    </>
                                  )}
                                </button>

                                {/* Username warning */}
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

                                {/* Reset button when wallet popup might be stuck */}
                                {txState.status === "awaiting_wallet" && (
                                  <button
                                    onClick={() => {
                                      setTxState({
                                        status: "idle",
                                        error: null,
                                        txHash: null,
                                        confirmations: 0,
                                      })
                                    }}
                                    className="w-full mt-3 py-2 border border-red-300 dark:border-red-500/30 text-red-500 dark:text-red-400 rounded-lg flex justify-center items-center font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                  >
                                    Cancel and reset
                                  </button>
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

                        {/* Badge comparison table - Futuristic design */}
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

      {/* Success modal */}
      {renderSuccessModal()}

      {/* Custom animation styles */}
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
      `}</style>
    </motion.div>
  )
}

export default BadgeMintSection