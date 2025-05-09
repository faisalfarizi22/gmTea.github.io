"use client"

import { motion } from "framer-motion"
import { 
  FaRegLightbulb, 
  FaMedal, 
  FaAward, 
  FaUsers, 
  FaPalette 
} from "react-icons/fa"

type ActiveTab = "overview" | "badges" | "achievements" | "referrals" | "benefits"

interface ProfileTabsProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  referralStats: {
    pendingRewards: string
  }
}

export default function ProfileTabs({ 
  activeTab, 
  setActiveTab,
  referralStats 
}: ProfileTabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-emerald-800/30">
      <div className="flex overflow-x-auto scrollbar-hide">
        <TabButton 
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={<FaRegLightbulb className="mr-2 h-4 w-4" />}
          label="Overview"
        />
        
        <TabButton 
          active={activeTab === "badges"}
          onClick={() => setActiveTab("badges")}
          icon={<FaMedal className="mr-2 h-4 w-4" />}
          label="Badges"
        />
        
        <TabButton 
          active={activeTab === "achievements"}
          onClick={() => setActiveTab("achievements")}
          icon={<FaAward className="mr-2 h-4 w-4" />}
          label="Achievements"
        />
        
        <TabButton 
          active={activeTab === "referrals"}
          onClick={() => setActiveTab("referrals")}
          icon={<FaUsers className="mr-2 h-4 w-4" />}
          label="Referrals"
          badge={Number.parseFloat(referralStats.pendingRewards) > 0 ? 
            `${Number.parseFloat(referralStats.pendingRewards).toFixed(2)} TEA` : 
            undefined}
        />
        
        <TabButton 
          active={activeTab === "benefits"}
          onClick={() => setActiveTab("benefits")}
          icon={<FaPalette className="mr-2 h-4 w-4" />}
          label="Benefits"
        />
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: string
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
        active 
          ? "text-emerald-600 dark:text-emerald-400" 
          : "text-gray-500 hover:text-emerald-500 dark:text-emerald-500/50 dark:hover:text-emerald-400/70"
      }`}
    >
      <span className="flex items-center">
        {icon}
        {label}
        {badge && (
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-full">
            {badge}
          </span>
        )}
      </span>
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
          initial={false}
        />
      )}
    </button>
  )
}