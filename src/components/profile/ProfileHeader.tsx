"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FaUser, FaClipboard, FaPencilAlt, FaLeaf, FaChevronRight } from "react-icons/fa"
import AvatarWithFrame from "@/components/user/AvatarWithFrame"
import ColoredUsername from "@/components/user/ColoredUsername"
import Banner from "@/components/user/Banner"
import { formatAddress } from "@/utils/web3"
import { getTierColor } from "../profile/utils/profileUtils"

interface ProfileHeaderProps {
  address: string | null
  username: string | null
  highestTier: number
  avatarUrl: string | null
  hasUsername: boolean | null
  showUsernameModal: () => void
  copyAddressToClipboard: () => void
}

export default function ProfileHeader({
  address,
  username,
  highestTier,
  avatarUrl,
  hasUsername,
  showUsernameModal,
  copyAddressToClipboard
}: ProfileHeaderProps) {
  const getUserTier = () => {
    switch (highestTier) {
      case 0: return "Common"
      case 1: return "Uncommon"
      case 2: return "Rare"
      case 3: return "Epic"
      case 4: return "Legendary"
      default: return "Basic"
    }
  }

  const canEditUsername = !hasUsername

  return (
    <div className="relative">
      <div className="bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20 overflow-hidden">
        <Banner badgeTier={highestTier} />
        <div className="px-6 md:px-8 pb-6 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end">
            <div className="relative">
              <div className="relative">
                <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-900 dark:to-gray-800 border-4 border-white dark:border-black/90 shadow-xl flex items-center justify-center overflow-hidden">
                  {address ? (
                    <AvatarWithFrame
                      avatarUrl={avatarUrl || "/placeholder.svg"}
                      badgeTier={highestTier}
                      size="lg"
                    />
                  ) : (
                    <div
                      className="h-20 w-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          highestTier >= 0
                            ? `linear-gradient(135deg, ${getTierColor(highestTier)}40, ${getTierColor(highestTier)}10)`
                            : "linear-gradient(135deg, #64748b40, #64748b10)",
                        boxShadow: highestTier >= 0 ? `0 0 15px ${getTierColor(highestTier)}40` : "none",
                      }}
                    >
                      <FaUser className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {highestTier >= 0 && (
                <div
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-white dark:bg-black flex items-center justify-center border-2 shadow-lg"
                  style={{ borderColor: getTierColor(highestTier) }}
                >
                  <FaLeaf className="h-5 w-5" style={{ color: getTierColor(highestTier) }} />
                </div>
              )}
            </div>

            <div className="mt-4 md:mt-0 md:ml-6 flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-emerald-100">
                    {username ? (
                      <ColoredUsername 
                        username={username} 
                        badgeTier={highestTier} 
                        className="text-2xl md:text-3xl font-bold"
                      />
                    ) : (
                      formatAddress(address || "")
                    )}
                  </h1>

                  <div className="flex items-center mt-1 space-x-2">
                    <p
                      className="text-gray-600 dark:text-white text-opacity-90 text-sm flex items-center cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
                      onClick={copyAddressToClipboard}
                      title="Click to copy address"
                    >
                      {address ? formatAddress(address) : "No wallet connected"}
                      <FaClipboard className="ml-1.5 h-3 w-3 opacity-70" />
                    </p>
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" 
                      style={{ 
                        background: getTierColor(highestTier), 
                        color: highestTier >= 0 ? '#ffffff' : '#000000'  
                      }}
                    >
                      {getUserTier()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 flex space-x-3">
                  {canEditUsername && (
                    <button
                      onClick={showUsernameModal}
                      className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-sm flex items-center transition-colors shadow-md"
                    >
                      <FaPencilAlt className="mr-1.5 h-3 w-3" />
                      Set Username
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasUsername === false && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 backdrop-blur-sm border-l-4 border-yellow-500 p-4 rounded-xl shadow-lg"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <FaUser className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Set a username before minting badges to unlock the full digital experience.
              </p>
              <div className="mt-2">
                <button
                  onClick={showUsernameModal}
                  className="text-sm font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 flex items-center"
                >
                  Set Username <FaChevronRight className="ml-1 h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}