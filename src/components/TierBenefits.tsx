"use client"

import type React from "react"
import { motion } from "framer-motion"
import {
  FaGem,
  FaCoffee,
  FaComments,
  FaVoteYea,
  FaMoneyBillWave,
  FaShieldAlt,
  FaMedal,
  FaCrown,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaPalette,
  FaUserCircle,
  FaBolt,
  FaImage,
} from "react-icons/fa"
import { BADGE_TIERS } from "@/utils/constants"

interface TierBenefitsProps {
  selectedTier: number
}

interface BenefitItem {
  icon: React.ReactNode
  title: string
  tiers: {
    [key: number]: string | boolean
  }
}

const TierBenefits: React.FC<TierBenefitsProps> = ({ selectedTier }) => {
  const badgeTiers = [
    {
      id: 0,
      name: "Common",
      color: BADGE_TIERS.COMMON.color,
      description: "Entry-level badge with basic benefits",
      checkinBoost: "1.1x",
      referralReward: "5%",
    },
    {
      id: 1,
      name: "Uncommon",
      color: BADGE_TIERS.UNCOMMON.color,
      description: "Enhanced benefits and special features",
      checkinBoost: "1.2x",
      referralReward: "10%",
    },
    {
      id: 2,
      name: "Rare",
      color: BADGE_TIERS.RARE.color,
      description: "Premium access and additional perks",
      checkinBoost: "1.3x",
      referralReward: "15%",
    },
    {
      id: 3,
      name: "Epic",
      color: BADGE_TIERS.EPIC.color,
      description: "Superior benefits and exclusive features",
      checkinBoost: "1.4x",
      referralReward: "20%",
    },
    {
      id: 4,
      name: "Legendary",
      color: BADGE_TIERS.LEGENDARY.color,
      description: "Ultimate tier with maximum rewards",
      checkinBoost: "1.5x",
      referralReward: "25%",
    },
  ]

  const benefits: BenefitItem[] = [
    {
      icon: <FaCoffee />,
      title: "Daily Check-in Points",
      tiers: {
        0: "10 pts/day",
        1: "10 pts/day",
        2: "10 pts/day",
        3: "10 pts/day",
        4: "10 pts/day",
      },
    },
    {
      icon: <FaBolt />,
      title: "Check-in Boost Multiplier",
      tiers: {
        0: "1.1x",
        1: "1.2x",
        2: "1.3x",
        3: "1.4x",
        4: "1.5x",
      },
    },
    {
      icon: <FaVoteYea />,
      title: "Proposal Voting Power",
      tiers: {
        0: "1x",
        1: "2x",
        2: "3x",
        3: "5x",
        4: "10x",
      },
    },
    {
      icon: <FaMoneyBillWave />,
      title: "Referral Rewards",
      tiers: {
        0: "5%",
        1: "10%",
        2: "15%",
        3: "20%",
        4: "25%",
      },
    },
    {
      icon: <FaPalette />,
      title: "Colored Username",
      tiers: {
        0: false,
        1: true,
        2: true,
        3: true,
        4: true,
      },
    },
    {
      icon: <FaImage />,
      title: "Avatar Frame",
      tiers: {
        0: false,
        1: false,
        2: true,
        3: true,
        4: true,
      },
    },
    {
      icon: <FaComments />,
      title: "Community Chat Access",
      tiers: {
        0: true,
        1: true,
        2: true,
        3: true,
        4: true,
      },
    },
  ]

  const getTierName = (tier: number) => {
    if (tier < 0) return "None"

    const tierKey = Object.keys(BADGE_TIERS).find((key) => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === tier)

    if (!tierKey) return "Unknown"
    return BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].name
  }

  const getTierColor = (tier: number) => {
    if (tier < 0) return "#6b7280" 

    const tierKey = Object.keys(BADGE_TIERS).find((key) => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === tier)

    if (!tierKey) return BADGE_TIERS.COMMON.color
    return BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].color
  }

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 0:
        return <FaShieldAlt />
      case 1:
        return <FaShieldAlt />
      case 2:
        return <FaMedal />
      case 3:
        return <FaGem />
      case 4:
        return <FaCrown />
      default:
        return <FaShieldAlt />
    }
  }

  const getTierById = (tierId: number) => {
    return badgeTiers.find((tier) => tier.id === tierId) || badgeTiers[0]
  }

  const currentTier = getTierById(Math.max(0, selectedTier))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-black/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-emerald-500/20"
    >
      <div className="p-6 border-b border-gray-200 dark:border-emerald-500/20 bg-gradient-to-r from-gray-50 to-white dark:from-emerald-900/20 dark:to-teal-900/20">
        <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-300 flex items-center">
          <span className="text-emerald-600 dark:text-emerald-400 mr-2">{getTierIcon(Math.max(0, selectedTier))}</span>
          <span>Badge Benefits: {getTierName(selectedTier)} Tier</span>
        </h2>
        <p className="text-gray-600 dark:text-emerald-200/70 mt-2">
          Each tier unlocks new benefits while retaining all benefits from lower tiers.
        </p>

        {selectedTier >= 0 && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-emerald-900/20 border border-gray-200 dark:border-emerald-500/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-emerald-200/60">Description</p>
                <p className="text-gray-700 dark:text-emerald-100">{currentTier.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-emerald-200/60">Check-in Boost</p>
                <p className="text-gray-800 dark:text-emerald-100 font-semibold">{currentTier.checkinBoost}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-emerald-200/60">Referral Reward</p>
                <p className="text-gray-800 dark:text-emerald-100 font-semibold">{currentTier.referralReward}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-3 text-left text-sm font-medium text-gray-500 dark:text-emerald-200/80 w-1/3">
                  Benefit
                </th>
                {[0, 1, 2, 3, 4].map((tier) => (
                  <th key={tier} className="py-3 text-center text-sm font-medium" style={{ color: getTierColor(tier) }}>
                    <div className="flex flex-col items-center">
                      <span>{getTierName(tier)}</span>
                      <div
                        className={`mt-1 w-full h-1 rounded-full ${
                          selectedTier >= tier ? "bg-emerald-500/60" : "bg-gray-200 dark:bg-gray-700/30"
                        }`}
                      ></div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benefits.map((benefit, index) => {
                const tierValue = benefit.tiers[selectedTier];
                const isActive = selectedTier >= 0;
                const textColor = isActive
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-gray-400 dark:text-gray-500";

                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-emerald-900/10 transition-colors">
                    <td className="py-4 text-gray-700 dark:text-emerald-200 border-t border-gray-200 dark:border-emerald-800/30">
                      <div className="flex items-center">
                        <div className="text-emerald-500 dark:text-emerald-400/90 mr-3">{benefit.icon}</div>
                        <span>{benefit.title}</span>
                      </div>
                    </td>
                    {[0, 1, 2, 3, 4].map((tier) => {
                      const tierValue = benefit.tiers[tier];
                      const isActive = selectedTier >= tier;
                      const textColor = isActive
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-gray-400 dark:text-gray-500";

                      return (
                        <td
                          key={tier}
                          className={`py-4 text-center border-t border-gray-200 dark:border-emerald-800/30 ${textColor}`}
                        >
                          {typeof tierValue === "boolean" ? (
                            tierValue ? (
                              <span
                                className={`inline-flex items-center justify-center rounded-full p-1 ${
                                  isActive ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-gray-100 dark:bg-gray-800/40"
                                }`}
                              >
                                <FaCheck
                                  className={
                                    isActive
                                      ? "text-emerald-500 dark:text-emerald-400"
                                      : "text-gray-400 dark:text-gray-500"
                                  }
                                />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-full p-1 bg-gray-100 dark:bg-gray-800/40">
                                <FaTimes className="text-gray-400 dark:text-gray-500" />
                              </span>
                            )
                          ) : (
                            <span>{tierValue}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-emerald-900/10 border border-gray-200 dark:border-emerald-500/20">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-emerald-300 mb-3">Social Benefits</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="bg-emerald-100 dark:bg-emerald-500/10 p-2 rounded-lg mr-3">
                <FaPalette className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-emerald-200">Colored Username</h4>
                <p className="text-gray-600 dark:text-emerald-200/60 text-sm">
                  Your username will change color based on your highest tier badge. Higher tiers unlock more vibrant and
                  unique colors.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-emerald-100 dark:bg-emerald-500/10 p-2 rounded-lg mr-3">
                <FaImage className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-emerald-200">Avatar Frames</h4>
                <p className="text-gray-600 dark:text-emerald-200/60 text-sm">
                  Unlock decorative frames for your profile avatar. Rare tier and above get animated frames with special
                  effects.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-emerald-100 dark:bg-emerald-500/10 p-2 rounded-lg mr-3">
                <FaUserCircle className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-emerald-200">Profile Customization</h4>
                <p className="text-gray-600 dark:text-emerald-200/60 text-sm">
                  Higher tiers unlock more profile customization options including badges, backgrounds, and special
                  effects.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-emerald-100 dark:bg-emerald-500/10 p-2 rounded-lg mr-3">
                <FaComments className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-emerald-200">Chat Privileges</h4>
                <p className="text-gray-600 dark:text-emerald-200/60 text-sm">
                  Higher tiers get special chat emotes, colored text, and custom message effects in community chats.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-gray-500 dark:text-emerald-200/50 text-sm italic flex items-center">
          <FaInfoCircle className="mr-2" />
          Your current tier is: {selectedTier >= 0 ? getTierName(selectedTier) : "None"}.
          {selectedTier < 4 && " Mint higher tier badges to unlock more benefits."}
        </p>
      </div>
    </motion.div>
  )
}

export default TierBenefits