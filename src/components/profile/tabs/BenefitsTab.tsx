"use client"

import { motion } from "framer-motion"
import { 
  FaPalette, 
  FaImage, 
  FaGrin, 
  FaFont, 
  FaMagic,
  FaLeaf
} from "react-icons/fa"
import { UserSocialBenefits } from "@/types/user"
import { getUsernameColor } from "@/utils/socialBenefitsUtils"
import AvatarWithFrame from "@/components/user/AvatarWithFrame"
import { getTierColor } from "../utils/profileUtils"
import ColoredUsername from "@/components/user/ColoredUsername"
import TierBenefits from "@/components/TierBenefits"

interface BenefitsTabProps {
  highestTier: number
  address: string | null
  username: string | null
  socialBenefits: UserSocialBenefits
}

export default function BenefitsTab({
  highestTier,
  address,
  username,
  socialBenefits
}: BenefitsTabProps) {
  return (
    <motion.div
      key="benefits"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl overflow-hidden border border-gray-200 dark:border-emerald-500/20 p-6">
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-300 mb-4 flex items-center">
            <FaPalette className="mr-2 h-5 w-5 text-emerald-500 dark:text-emerald-400/80" /> 
            Active Social Benefits
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BenefitCard
              title="Colored Username"
              description={highestTier >= 1 
                ? 'Your username is displayed with a special color based on your highest badge tier.' 
                : 'Unlock this feature by minting an Uncommon badge or higher.'}
              icon={<FaPalette className="h-5 w-5" />}
              isUnlocked={highestTier >= 1}
              preview={highestTier >= 1 && (
                <div className="mt-3 p-3 bg-white dark:bg-black/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-sm">Preview:</p>
                  <p className="mt-1">
                    <ColoredUsername username={username || "YourUsername"} badgeTier={highestTier} className="text-lg" />
                  </p>
                </div>
              )}
            />
          
            <BenefitCard
              title="Avatar Frame"
              description={highestTier >= 2 
                ? `Your avatar has a special ${highestTier >= 3 ? 'animated ' : ''}frame based on your highest badge tier.` 
                : 'Unlock this feature by minting a Rare badge or higher.'}
              icon={<FaImage className="h-5 w-5" />}
              isUnlocked={highestTier >= 2}
              preview={highestTier >= 2 && address && (
                <div className="mt-3 flex justify-center p-3 bg-white dark:bg-black/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <AvatarWithFrame
                    avatarUrl={`https://api.dicebear.com/6.x/identicon/svg?seed=${address}`}
                    badgeTier={highestTier}
                    size="md"
                  />
                </div>
              )}
            />
          
            <BenefitCard
              title="Chat Emotes"
              description={highestTier >= 2 
                ? 'You can use special emotes in chat messages by typing :code:' 
                : 'Unlock this feature by minting a Rare badge or higher.'}
              icon={<FaGrin className="h-5 w-5" />}
              isUnlocked={highestTier >= 2}
              preview={highestTier >= 2 && (
                <div className="mt-3 p-3 bg-white dark:bg-black/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-sm">Available emotes:</p>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="text-xl">🍵</div>
                      <div className="text-xs mt-1">:tea:</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl">🍃</div>
                      <div className="text-xs mt-1">:leaf:</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl">☀️</div>
                      <div className="text-xs mt-1">:gm:</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl">✅</div>
                      <div className="text-xs mt-1">:check:</div>
                    </div>
                  </div>
                </div>
              )}
            />
          
            <BenefitCard
              title="Colored Text"
              description={highestTier >= 3 
                ? 'Your messages in chat appear with your tier color.' 
                : 'Unlock this feature by minting an Epic badge or higher.'}
              icon={<FaFont className="h-5 w-5" />}
              isUnlocked={highestTier >= 3}
              preview={highestTier >= 3 && (
                <div className="mt-3 p-3 bg-white dark:bg-black/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-sm">Preview:</p>
                  <p className="mt-1" style={{ color: getUsernameColor(highestTier) || undefined }}>
                    This is how your text will appear in chat!
                  </p>
                </div>
              )}
            />
            
            <BenefitCard
              title="Message Effects"
              description={highestTier >= 4 
                ? 'Your messages in chat have special hover and visual effects.' 
                : 'Unlock this feature by minting a Legendary badge.'}
              icon={<FaMagic className="h-5 w-5" />}
              isUnlocked={highestTier >= 4}
              preview={highestTier >= 4 && (
                <div className="mt-3 p-3 bg-white dark:bg-black/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-sm">Preview:</p>
                  <div 
                    className="mt-1 p-2 transition-all duration-300 hover:scale-[1.01] hover:shadow-md rounded"
                    style={{ color: getUsernameColor(highestTier) || undefined }}
                  >
                    Hover over me to see the special effect!
                  </div>
                </div>
              )}
            />
            
            <BenefitCard
              title="Profile Background"
              description={highestTier >= 3 
                ? 'Your profile header has a special background effect.' 
                : 'Unlock this feature by minting an Epic badge or higher.'}
              icon={<FaImage className="h-5 w-5" />}
              isUnlocked={highestTier >= 3}
              preview={null}
            />
          </div>
        </div>
        
        <TierBenefits selectedTier={highestTier} />
      </div>
    </motion.div>
  )
}

interface BenefitCardProps {
  title: string
  description: string
  icon: React.ReactNode
  isUnlocked: boolean
  preview: React.ReactNode | null
}

function BenefitCard({ 
  title, 
  description, 
  icon, 
  isUnlocked, 
  preview 
}: BenefitCardProps) {
  return (
    <div className={`p-4 rounded-lg ${isUnlocked 
      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30' 
      : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/30'}`}>
      <div className="flex items-start">
        <div className={`p-3 rounded-lg ${isUnlocked 
          ? 'bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
          {icon}
        </div>
        <div className="ml-4">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
          
          {preview}
        </div>
      </div>
    </div>
  )
}