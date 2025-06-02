"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { FaUser, FaClipboard, FaUsers, FaChevronRight } from "react-icons/fa"
import ReferralRewards from "@/components/ReferralRewards" 
import { ethers } from "ethers"

interface ReferralsTabProps {
  address: string | null
  signer: ethers.Signer | null
  username: string | null
  showUsernameModal: () => void
  onRewardsClaimComplete: () => void
}

export default function ReferralsTab({
  address,
  signer,
  username,
  showUsernameModal,
  onRewardsClaimComplete
}: ReferralsTabProps) {
  if (!username) {
    return (
      <motion.div
        key="referrals-no-username"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-emerald-500/20 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
              <FaUser className="h-8 w-8 text-emerald-500/50" />
            </div>
            <h3 className="text-xl font-bold text-emerald-300 mb-2">Set Username First</h3>
            <p className="text-emerald-300/70 mb-6 max-w-md mx-auto">
              You need to set a username before you can access the referral program and start earning
              rewards.
            </p>
            <button
              onClick={showUsernameModal}
              className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/20 text-sm font-medium"
            >
              Set Username Now
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="referrals"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {address && signer && (
        <ReferralRewards
          address={address}
          signer={signer}
          onClaimComplete={onRewardsClaimComplete}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-6 shadow-lg"
      >
        <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-300 mb-4">
          How Referrals Work
        </h3>
        
        <div className="space-y-4">
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-emerald-600 dark:text-emerald-300 font-medium">1</span>
            </div>
            <div className="ml-4">
              <p className="text-gray-700 dark:text-gray-300">
                Share your unique referral link with friends
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-emerald-600 dark:text-emerald-300 font-medium">2</span>
            </div>
            <div className="ml-4">
              <p className="text-gray-700 dark:text-gray-300">
                When they register and mint a badge, you earn rewards
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-emerald-600 dark:text-emerald-300 font-medium">3</span>
            </div>
            <div className="ml-4">
              <p className="text-gray-700 dark:text-gray-300">
                Higher tier badges earn you more rewards!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}