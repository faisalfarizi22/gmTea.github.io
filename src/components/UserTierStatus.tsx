import React, { useState, useEffect, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { 
  FaMedal, 
  FaStar, 
  FaGem, 
  FaTrophy, 
  FaCrown, 
  FaCheck, 
  FaLock, 
  FaSpinner,
  FaLeaf,
  FaShieldAlt,
  FaUsers,
  FaMoneyBillWave,
  FaChartLine,
  FaCoffee,
  FaVoteYea,
  FaBolt,
  FaRegLightbulb
} from 'react-icons/fa';
import { BADGE_TIERS } from '@/utils/constants';
import { getUserHighestTier, getUserBadges } from '@/utils/badgeWeb3';
import { getUserBenefits, getUserReferralStats } from '@/utils/rewardsUtils';

interface UserTierStatusProps {
  address: string;
  signer: ethers.Signer | null;
}

interface BadgeTierInfo {
  id: number;
  name: string;
  color: string;
  icon: JSX.Element;
  owned: boolean;
  nextToMint: boolean;
  tokenId?: number;
  mintedAt?: number;
}

const UserTierStatus: React.FC<UserTierStatusProps> = ({ address, signer }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [highestTier, setHighestTier] = useState(-1);
  const [badges, setBadges] = useState<BadgeTierInfo[]>([]);
  const [activeBenefits, setActiveBenefits] = useState<string[]>([]);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalRewards: '0',
    pendingRewards: '0',
    highestTier: 0
  });
  const [activeTab, setActiveTab] = useState('benefits'); // 'benefits' or 'referrals'

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load user's highest badge tier
        const highestTierResult = await getUserHighestTier(address);
        setHighestTier(highestTierResult);

        // Load user badges
        const userBadges = await getUserBadges(address);
        
        // Load active benefits
        const benefits = await getUserBenefits(address);
        setActiveBenefits(benefits);
        
        // Load referral stats
        const stats = await getUserReferralStats(address);
        setReferralStats(stats);

        // Create badge tier info array
        const badgeTiers: BadgeTierInfo[] = [
          {
            id: 0,
            name: 'Common',
            color: BADGE_TIERS.COMMON.color,
            icon: <FaShieldAlt />,
            owned: highestTierResult >= 0,
            nextToMint: highestTierResult === -1
          },
          {
            id: 1,
            name: 'Uncommon',
            color: BADGE_TIERS.UNCOMMON.color,
            icon: <FaShieldAlt />,
            owned: highestTierResult >= 1,
            nextToMint: highestTierResult === 0
          },
          {
            id: 2,
            name: 'Rare',
            color: BADGE_TIERS.RARE.color,
            icon: <FaMedal />,
            owned: highestTierResult >= 2,
            nextToMint: highestTierResult === 1
          },
          {
            id: 3,
            name: 'Epic',
            color: BADGE_TIERS.EPIC.color,
            icon: <FaGem />,
            owned: highestTierResult >= 3,
            nextToMint: highestTierResult === 2
          },
          {
            id: 4,
            name: 'Legendary',
            color: BADGE_TIERS.LEGENDARY.color,
            icon: <FaCrown />,
            owned: highestTierResult >= 4,
            nextToMint: highestTierResult === 3
          }
        ];

        // Add token IDs and minted timestamps from user badges
        userBadges.forEach(badge => {
          const tierIndex = badgeTiers.findIndex(tier => tier.id === badge.tier);
          if (tierIndex !== -1) {
            badgeTiers[tierIndex].tokenId = badge.tokenId;
            badgeTiers[tierIndex].mintedAt = badge.mintedAt;
          }
        });

        setBadges(badgeTiers);
      } catch (error) {
        console.error('Error loading user tier status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      loadData();
    }
  }, [address]);

  // Get tier name and color
  const getTierName = () => {
    if (highestTier === -1) return 'No Tier';
    const tierKeys = Object.keys(BADGE_TIERS);
    const key = tierKeys[highestTier];
    return BADGE_TIERS[key as keyof typeof BADGE_TIERS].name;
  };

  const getTierColor = () => {
    if (highestTier === -1) return '#6b7280'; // Gray
    const tierKeys = Object.keys(BADGE_TIERS);
    const key = tierKeys[highestTier];
    return BADGE_TIERS[key as keyof typeof BADGE_TIERS].color;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Get badge tier info based on current tier
  const getBadgeTierInfo = (tier: number) => {
    const tiers = [
      {
        checkinBoost: "1.05x",
        referralReward: "5%",
        votingPower: "1x"
      },
      {
        checkinBoost: "1.12x",
        referralReward: "10%",
        votingPower: "2x"
      },
      {
        checkinBoost: "1.25x",
        referralReward: "15%",
        votingPower: "3x"
      },
      {
        checkinBoost: "1.5x",
        referralReward: "20%",
        votingPower: "5x"
      },
      {
        checkinBoost: "1.8x",
        referralReward: "25%",
        votingPower: "10x"
      }
    ];
    
    return tier >= 0 && tier < tiers.length ? tiers[tier] : tiers[0];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-emerald-500/20 min-h-[50vh]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
          <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaLeaf className="text-emerald-400 text-2xl animate-pulse" />
          </div>
        </div>
        <p className="text-emerald-300 mt-6 font-medium tracking-wide">Loading tier data...</p>
        <p className="text-emerald-500/60 text-sm mt-2">Retrieving your digital credentials</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-black/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-emerald-500/20 overflow-hidden"
    >
      {/* Header section with current tier info */}
      <div className="relative p-6 md:p-8 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-teal-900/20">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent mb-2">
              Membership Status
            </h2>
            <p className="text-emerald-300/70 text-sm">
              Your profile tier and community benefits
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            {/* Current tier badge */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-40 group-hover:opacity-60 rounded-full blur-md transition-all duration-300"></div>
              <div 
                className="relative flex items-center justify-center h-16 w-16 rounded-full" 
                style={{ 
                  backgroundColor: `${getTierColor()}20`,
                  border: `2px solid ${getTierColor()}40`,
                }}
              >
                <div className="h-8 w-8" style={{ color: getTierColor() }}>
                  {highestTier === -1 ? (
                    <FaShieldAlt className="h-full w-full" />
                  ) : highestTier === 0 ? (
                    <FaShieldAlt className="h-full w-full" />
                  ) : highestTier === 1 ? (
                    <FaShieldAlt className="h-full w-full" />
                  ) : highestTier === 2 ? (
                    <FaMedal className="h-full w-full" />
                  ) : highestTier === 3 ? (
                    <FaGem className="h-full w-full" />
                  ) : (
                    <FaCrown className="h-full w-full" />
                  )}
                </div>
                
                {/* Animated ring around badge */}
                <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30"
                  style={{ 
                    border: `1px dashed ${getTierColor()}60`,
                  }}
                ></div>
              </div>
            </div>
            
            {/* Tier name and info */}
            <div className="ml-6">
              <h3 
                className="text-xl font-bold" 
                style={{ color: getTierColor() }}
              >
                {getTierName()} Tier
              </h3>
              <p className="text-emerald-300/70 text-sm mt-1">
                {highestTier === -1 
                  ? 'Begin your journey with your first badge' 
                  : highestTier === 4
                    ? 'Maximum tier achieved'
                    : `Next tier: ${badges[highestTier + 1]?.name}`
                }
              </p>
              
              {/* Tier stats mini-cards */}
              {highestTier >= 0 && (
                <div className="flex items-center mt-3 space-x-3">
                  <div 
                    className="flex items-center px-2 py-1 rounded-full text-xs bg-black/20"
                    style={{ color: getTierColor() }}
                  >
                    <FaBolt className="mr-1 h-2.5 w-2.5" />
                    <span>{getBadgeTierInfo(highestTier).checkinBoost} Boost</span>
                  </div>
                  
                  <div 
                    className="flex items-center px-2 py-1 rounded-full text-xs bg-black/20" 
                    style={{ color: getTierColor() }}
                  >
                    <FaMoneyBillWave className="mr-1 h-2.5 w-2.5" />
                    <span>{getBadgeTierInfo(highestTier).referralReward} Ref</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Badge progress path visualization */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 relative"
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-emerald-900/30 rounded-full"></div>
          
          {/* Animated progress bar */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ((highestTier + 1) / 5) * 100)}%` }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full z-10"
          >
            <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm"></div>
          </motion.div>
          
          {/* Badge nodes on timeline */}
          <div className="relative flex justify-between">
            {badges.map((badge, index) => (
              <motion.div 
                key={index} 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div 
                  className={`
                    z-10 w-12 h-12 rounded-full flex items-center justify-center mb-2 
                    ${badge.owned 
                      ? 'bg-gradient-to-br from-black/50 to-black/30 border-2'
                      : badge.nextToMint
                        ? 'bg-black/50 border-2 animate-pulse'
                        : 'bg-gray-900/50 border-2 border-gray-700/50'
                    }
                    relative overflow-hidden group
                  `}
                  style={{
                    borderColor: badge.owned ? `${badge.color}60` : badge.nextToMint ? `${badge.color}40` : 'transparent',
                  }}
                >
                  {/* Badge icon */}
                  <div 
                    className={`h-6 w-6 z-10 transition-transform duration-300 group-hover:scale-110`}
                    style={{ color: badge.owned ? badge.color : badge.nextToMint ? `${badge.color}80` : '#6b7280' }}
                  >
                    {badge.icon}
                  </div>
                  
                  {/* Badge glow effect */}
                  {badge.owned && (
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: `radial-gradient(circle at center, ${badge.color}30 0%, transparent 70%)`,
                      }}
                    ></div>
                  )}
                  
                  {/* Lock icon for locked badges */}
                  {!badge.owned && !badge.nextToMint && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <FaLock className="text-gray-500 h-3 w-3" />
                    </div>
                  )}
                  
                  {/* Next to mint indicator pulse */}
                  {badge.nextToMint && (
                    <div 
                      className="absolute inset-0 z-0 animate-pulse"
                      style={{ 
                        background: `radial-gradient(circle at center, ${badge.color}20 0%, transparent 70%)`,
                      }}
                    ></div>
                  )}
                </div>
                
                {/* Badge name and minted date */}
                <span 
                  className={`text-xs font-medium ${badge.owned ? 'text-emerald-300' : badge.nextToMint ? 'text-emerald-500/70' : 'text-gray-500'}`}
                  style={badge.owned ? { color: badge.color } : {}}
                >
                  {badge.name}
                </span>
                
                {badge.mintedAt && (
                  <span className="text-[10px] text-emerald-500/50 mt-1">
                    {formatDate(badge.mintedAt)}
                  </span>
                )}
                
                {badge.nextToMint && (
                  <span className="text-[10px] text-emerald-400/70 mt-1 animate-pulse">
                    Available
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Benefits and Referrals Section */}
      <div className="p-6 md:p-8">
        {/* Tab selector */}
        <div className="flex mb-6 border-b border-emerald-900/30">
          <button
            onClick={() => setActiveTab('benefits')}
            className={`pb-2 text-sm font-medium transition-colors relative ${
              activeTab === 'benefits' 
                ? 'text-emerald-400' 
                : 'text-emerald-500/50 hover:text-emerald-400/70'
            }`}
          >
            <span className="flex items-center">
              <FaRegLightbulb className="mr-2" />
              Active Benefits
            </span>
            {activeTab === 'benefits' && (
              <motion.div 
                layoutId="tabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                initial={false}
              />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('referrals')}
            className={`ml-8 pb-2 text-sm font-medium transition-colors relative ${
              activeTab === 'referrals' 
                ? 'text-emerald-400' 
                : 'text-emerald-500/50 hover:text-emerald-400/70'
            }`}
          >
            <span className="flex items-center">
              <FaUsers className="mr-2" />
              Referral Stats
            </span>
            {activeTab === 'referrals' && (
              <motion.div 
                layoutId="tabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                initial={false}
              />
            )}
          </button>
        </div>
        
        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'benefits' ? (
            <motion.div
              key="benefits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-semibold text-emerald-300 mb-4">Your Active Benefits</h3>
              
              {activeBenefits.length === 0 ? (
                <div className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-6 text-center">
                  <div className="w-16 h-16 mx-auto bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                    <FaLeaf className="h-8 w-8 text-emerald-500/50" />
                  </div>
                  <p className="text-emerald-300/70">
                    Mint your first badge to unlock benefits
                  </p>
                  <a 
                    href="/mint"
                    className="mt-4 inline-block px-4 py-2 bg-emerald-600/70 hover:bg-emerald-600 transition-colors text-white rounded-lg text-sm"
                  >
                    Mint Badge
                  </a>
                </div>
              ) : (
                <div>
                  {/* Tier Stats */}
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-4"
                    >
                      <div className="flex items-center mb-2">
                        <div 
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 mr-3"
                          style={{ color: getTierColor() }}
                        >
                          <FaCoffee className="h-4 w-4" />
                        </div>
                        <p className="text-sm text-emerald-200">Check-in Boost</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: getTierColor() }}>
                        {getBadgeTierInfo(highestTier).checkinBoost}
                      </p>
                      <p className="text-xs text-emerald-400/60 mt-1">
                        Daily points multiplier
                      </p>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-4"
                    >
                      <div className="flex items-center mb-2">
                        <div 
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 mr-3"
                          style={{ color: getTierColor() }}
                        >
                          <FaMoneyBillWave className="h-4 w-4" />
                        </div>
                        <p className="text-sm text-emerald-200">Referral Fee</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: getTierColor() }}>
                        {getBadgeTierInfo(highestTier).referralReward}
                      </p>
                      <p className="text-xs text-emerald-400/60 mt-1">
                        Of each mint price
                      </p>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-4"
                    >
                      <div className="flex items-center mb-2">
                        <div 
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 mr-3"
                          style={{ color: getTierColor() }}
                        >
                          <FaVoteYea className="h-4 w-4" />
                        </div>
                        <p className="text-sm text-emerald-200">Voting Power</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: getTierColor() }}>
                        {getBadgeTierInfo(highestTier).votingPower}
                      </p>
                      <p className="text-xs text-emerald-400/60 mt-1">
                        For community proposals
                      </p>
                    </motion.div>
                  </div>
                  
                  {/* Benefits Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeBenefits.map((benefit, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                        className="flex items-center p-4 bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20"
                      >
                        <div 
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3"
                          style={{ 
                            backgroundColor: `${getTierColor()}20`, 
                            color: getTierColor()
                          }}
                        >
                          <FaCheck className="h-3 w-3" />
                        </div>
                        <span className="text-sm text-emerald-200">{benefit}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-semibold text-emerald-300 mb-4">Your Referral Stats</h3>
              
              {/* Referral Stats Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-5"
                >
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black/30 text-emerald-400 mr-2">
                      <FaUsers className="h-3 w-3" />
                    </div>
                    <p className="text-xs text-emerald-300/70">Total Referrals</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-300">{referralStats.totalReferrals}</p>
                  <div className="mt-2 pt-2 border-t border-emerald-700/30">
                    <p className="text-xs text-emerald-400/60">
                      Users onboarded
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-5"
                >
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black/30 text-emerald-400 mr-2">
                      <FaMoneyBillWave className="h-3 w-3" />
                    </div>
                    <p className="text-xs text-emerald-300/70">Pending Rewards</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-300">
                    {parseFloat(referralStats.pendingRewards).toFixed(4)}
                    <span className="text-lg"> TEA</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-700/30">
                    <p className="text-xs text-emerald-400/60">
                      Available to claim
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-5"
                >
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black/30 text-emerald-400 mr-2">
                      <FaChartLine className="h-3 w-3" />
                    </div>
                    <p className="text-xs text-emerald-300/70">Total Claimed</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-300">
                    {parseFloat(referralStats.totalRewards).toFixed(4)}
                    <span className="text-lg"> TEA</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-700/30">
                    <p className="text-xs text-emerald-400/60">
                      Previously claimed
                    </p>
                  </div>
                </motion.div>
              </div>
              
              {/* Referral program info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gradient-to-r from-emerald-900/10 to-teal-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-6 mt-6"
              >
                <div className="flex items-start">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                    style={{ backgroundColor: `${getTierColor()}20`, color: getTierColor() }}
                  >
                    <FaLeaf className="h-6 w-6" />
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold" style={{ color: getTierColor() }}>
                      {getTierName()} Tier Referral Benefits
                    </h4>
                    
                    <p className="text-emerald-300/70 text-sm mt-1 mb-4">
                      Your current tier provides the following referral advantages:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/30 backdrop-blur-md rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div 
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-black/30 mr-2"
                            style={{ color: getTierColor() }}
                          >
                            <FaMoneyBillWave className="h-3 w-3" />
                          </div>
                          <p className="text-sm text-emerald-300">Referral Fee</p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: getTierColor() }}>
                          {referralStats.highestTier * 5 + 5}%
                        </p>
                        <p className="text-xs text-emerald-400/60 mt-1">
                          Of each mint price
                        </p>
                      </div>
                      
                      <div className="bg-black/30 backdrop-blur-md rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <div 
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-black/30 mr-2"
                            style={{ color: getTierColor() }}
                          >
                            <FaStar className="h-3 w-3" />
                          </div>
                          <p className="text-sm text-emerald-300">Referral Points</p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: getTierColor() }}>
                          {[20, 50, 100, 200, 300][referralStats.highestTier]}
                        </p>
                        <p className="text-xs text-emerald-400/60 mt-1">
                          Points per referral
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Referral link section */}
                <div className="mt-6 pt-6 border-t border-emerald-700/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="mb-4 md:mb-0">
                      <p className="text-sm text-emerald-300 font-medium">Share Your Referral Link</p>
                      <p className="text-xs text-emerald-400/60 mt-1">
                        Earn rewards when friends mint badges using your link
                      </p>
                    </div>
                    
                    <a
                      href="/referral"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/20 text-sm font-medium"
                    >
                      <FaUsers className="mr-2 h-3 w-3" />
                      Manage Referrals
                    </a>
                  </div>
                </div>
              </motion.div>
              
              {/* Claim button if there are pending rewards */}
              {parseFloat(referralStats.pendingRewards) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="mt-6 p-4 bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between"
                >
                  <div className="mb-4 md:mb-0">
                    <p className="text-sm text-emerald-300">
                      You have <span className="font-bold">{parseFloat(referralStats.pendingRewards).toFixed(4)} TEA</span> pending rewards
                    </p>
                    <p className="text-xs text-emerald-400/60 mt-1">
                      Claim now to transfer to your wallet
                    </p>
                  </div>
                  
                  <button
                    className="w-full md:w-auto px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/20 text-sm font-medium"
                  >
                    Claim Rewards
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Upgrade banner for users who can upgrade */}
      {highestTier < 4 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-4 p-6 border-t border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-teal-900/20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-start mb-4 md:mb-0">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center mr-4"
                style={{ 
                  backgroundColor: badges.find(b => b.id === highestTier + 1)?.color + '20',
                  color: badges.find(b => b.id === highestTier + 1)?.color 
                }}
              >
                {highestTier < 4 && badges[highestTier + 1]?.icon}
              </div>
              
              <div>
                <h4 className="text-base font-semibold text-emerald-300">
                  Upgrade to {highestTier < 4 ? badges[highestTier + 1]?.name : ''} Tier
                </h4>
                <p className="text-xs text-emerald-300/70 mt-1">
                  Unlock more benefits and increase your rewards
                </p>
              </div>
            </div>
            
            <a
              href="/mint"
              className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/20 text-sm font-medium"
            >
              Mint Next Badge
            </a>
          </div>
        </motion.div>
      )}
      
      {/* Custom animation style */}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </motion.div>
  );
};

export default UserTierStatus;