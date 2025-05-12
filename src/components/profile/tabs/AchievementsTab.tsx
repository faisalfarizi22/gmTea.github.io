"use client"

import { motion } from "framer-motion"
import { FaCheckCircle, FaUser, FaLeaf } from "react-icons/fa"
import { getTierColor } from "../utils/profileUtils"

interface AchievementsTabProps {
  checkinCount: number
  username: string | null
  highestTier: number
}

export default function AchievementsTab({
  checkinCount,
  username,
  highestTier
}: AchievementsTabProps) {
  // We're now receiving data directly via props from the parent component
  // No need to fetch from blockchain
  
  return (
    <motion.div
      key="achievements"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* First Check-in */}
        <AchievementCard
          title="First Check-in"
          description={checkinCount >= 1 ? "Unlocked" : "Check-in to unlock"}
          icon={<FaCheckCircle className="h-5 w-5" />}
          isUnlocked={checkinCount >= 1}
          reward="+50 Points"
        />

        {/* 7 Check-ins */}
        <AchievementCard
          title="7 Check-ins"
          description={checkinCount >= 7 ? "Unlocked" : `${checkinCount}/7`}
          icon={<FaCheckCircle className="h-5 w-5" />}
          isUnlocked={checkinCount >= 7}
          reward="+50 Points"
        />

        {/* 50 Check-ins */}
        <AchievementCard
          title="50 Check-ins"
          description={checkinCount >= 50 ? "Unlocked" : `${checkinCount}/50`}
          icon={<FaCheckCircle className="h-5 w-5" />}
          isUnlocked={checkinCount >= 50}
          reward="+50 Points"
        />

        {/* 100 Check-ins */}
        <AchievementCard
          title="100 Check-ins"
          description={checkinCount >= 100 ? "Unlocked" : `${checkinCount}/100`}
          icon={<FaCheckCircle className="h-5 w-5" />}
          isUnlocked={checkinCount >= 100}
          reward="+200 Points"
        />

        {/* Username Set */}
        <AchievementCard
          title="Username Set"
          description={username ? "Unlocked" : "Register a username"}
          icon={<FaUser className="h-5 w-5" />}
          isUnlocked={!!username}
          reward="Badge Access"
        />

        {/* Common Badge */}
        <TierAchievementCard
          title="Common Badge"
          description={highestTier >= 0 ? "Unlocked" : "Mint your first badge"}
          tierLevel={0}
          currentTier={highestTier}
          reward="1.1x Boost"
        />

        {/* Uncommon Badge */}
        <TierAchievementCard
          title="Uncommon Badge"
          description={highestTier >= 1 ? "Unlocked" : "Mint the uncommon badge"}
          tierLevel={1}
          currentTier={highestTier}
          reward="1.2x Boost"
        />

        {/* Rare Badge */}
        <TierAchievementCard
          title="Rare Badge"
          description={highestTier >= 2 ? "Unlocked" : "Mint the rare badge"}
          tierLevel={2}
          currentTier={highestTier}
          reward="1.3x Boost"
        />

        {/* Epic Badge */}
        <TierAchievementCard
          title="Epic Badge"
          description={highestTier >= 3 ? "Unlocked" : "Mint the epic badge"}
          tierLevel={3}
          currentTier={highestTier}
          reward="1.4x Boost"
        />

        {/* Legendary Badge */}
        <TierAchievementCard
          title="Legendary Badge"
          description={highestTier >= 4 ? "Unlocked" : "Mint the legendary badge"}
          tierLevel={4}
          currentTier={highestTier}
          reward="1.5x Boost"
        />
      </div>
    </motion.div>
  )
}

interface AchievementCardProps {
  title: string
  description: string
  icon: React.ReactNode
  isUnlocked: boolean
  reward: string
}

function AchievementCard({
  title,
  description,
  icon,
  isUnlocked,
  reward
}: AchievementCardProps) {
  return (
    <div
      className={`rounded-xl border ${isUnlocked ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60"} p-4`}
    >
      <div className="flex items-center mb-3">
        <div
          className={`rounded-full w-10 h-10 flex items-center justify-center mr-3 ${isUnlocked ? "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400" : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600"}`}
        >
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {reward}
        </p>
      </div>
    </div>
  )
}

interface TierAchievementCardProps {
  title: string
  description: string
  tierLevel: number
  currentTier: number
  reward: string
}

function TierAchievementCard({
  title,
  description,
  tierLevel,
  currentTier,
  reward
}: TierAchievementCardProps) {
  const isUnlocked = currentTier >= tierLevel;
  
  return (
    <div
      className={`rounded-xl border ${isUnlocked ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60"} p-4`}
    >
      <div className="flex items-center mb-3">
        <div
          className={`rounded-full w-10 h-10 flex items-center justify-center mr-3 ${isUnlocked ? "bg-emerald-100 dark:bg-emerald-800/50" : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600"}`}
        >
          <FaLeaf
            className="h-5 w-5"
            style={{ color: isUnlocked ? getTierColor(tierLevel) : "currentColor" }}
          />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {reward}
        </p>
      </div>
    </div>
  )
}