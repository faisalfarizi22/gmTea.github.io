import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { 
  FaSpinner, 
  FaLeaf, 
  FaShieldAlt, 
  FaMedal, 
  FaGem, 
  FaCrown,
  FaExpand,
  FaAngleRight,
  FaCertificate,
  FaCheck
} from 'react-icons/fa';
import { BADGE_TIERS } from '@/utils/constants';
import { getBadgeContract, getProvider } from '@/utils/badgeWeb3';
import { Badge, UserBadgeInfo } from '@/types/badge';

interface UserBadgesProps {
  address: string;
}

const UserBadges: React.FC<UserBadgesProps> = ({ address }) => {
  const [badgeInfo, setBadgeInfo] = useState<UserBadgeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
  const fetchUserBadges = async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch from database API instead of blockchain
      const response = await fetch(`/api/badges/${address}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.badges || data.badges.length === 0) {
        // No badges found
        setBadgeInfo({
          hasBadges: false,
          badges: [],
          highestTier: -1,
          highestTierName: 'None',
          canUpgrade: false
        });
        setIsLoading(false);
        return;
      }
      
      // Process badges from API response
      const badges: Badge[] = data.badges.map((badge: any) => ({
        tokenId: badge.tokenId || 0,
        tier: badge.tier,
        tierName: getTierName(badge.tier),
        mintedAt: new Date(badge.mintedAt).getTime() / 1000
      }));
      
      // Sort badges by tier (ascending)
      badges.sort((a, b) => a.tier - b.tier);
      
      // Get highest tier
      const highestTier = Math.max(...badges.map(badge => badge.tier));
      
      // Determine if upgrade is available
      const canUpgrade = highestTier < 4; // 4 is LEGENDARY
      
      // Get next tier info if available
      let nextTier: number | undefined;
      let nextTierName: string | undefined;
      
      if (canUpgrade) {
        nextTier = highestTier + 1;
        nextTierName = getTierName(nextTier);
      }
      
      setBadgeInfo({
        hasBadges: true,
        badges,
        highestTier,
        highestTierName: getTierName(highestTier), 
        canUpgrade,
        nextTier,
        nextTierName
      });
      
      // Set the highest tier badge as selected by default
      if (badges.length > 0) {
        const highestBadge = badges.find(badge => badge.tier === highestTier) || badges[0];
        setSelectedBadge(highestBadge);
      }
    } catch (error: any) {
      console.error('Error fetching user badges:', error);
      // Fallback to blockchain if API fails
      try {
        console.log('Falling back to blockchain for badge data');
        const provider = getProvider();
        
        if (!provider) {
          throw new Error('Provider not available');
        }
  
        const badgeContract = getBadgeContract(provider);
        
        // Get user's badge balance
        const balance = await badgeContract.balanceOf(address);
        // ... original blockchain code here
      } catch (fallbackError: any) {
        console.error('Fallback to blockchain also failed:', fallbackError);
        setError(error.message || 'Failed to load badges');
      }
    } finally {
      setIsLoading(false);
      // Delay the animation completion flag slightly for visual effect
      setTimeout(() => setAnimationComplete(true), 800);
    }
  };

  fetchUserBadges();
}, [address]);

  const handleBadgeSelect = (badge: Badge) => {
    setSelectedBadge(badge);
  };

  // Get tier icon based on tier number
  const getTierIcon = (tier: number) => {
    return <FaLeaf className="h-full w-full" />;
  };

  // Calculate rarity percentage based on tier
  const getRarityPercentage = (tier: number): string => {
    switch(tier) {
      case 0: return "100%";
      case 1: return "40%";
      case 2: return "15%";
      case 3: return "5%";
      case 4: return "1%";
      default: return "N/A";
    }
  };

  // Get benefits based on tier
  const getBadgeBenefits = (tier: number): string[] => {
    const baseBenefits = ["Community Chat Access"];
    
    if (tier >= 1) {
      baseBenefits.push("Colored Username");
    }
    
    if (tier >= 2) {
      baseBenefits.push("Avatar Frame");
    }
    
    return baseBenefits;
  };

  // Get stats based on tier
  const getBadgeStats = (tier: number) => {
    const tiers = [
      {
        checkinBoost: "1.1x",
        referralReward: "5%",
        votingPower: "1x"
      },
      {
        checkinBoost: "1.2x",
        referralReward: "10%",
        votingPower: "2x"
      },
      {
        checkinBoost: "1.3x",
        referralReward: "15%",
        votingPower: "3x"
      },
      {
        checkinBoost: "1.4x",
        referralReward: "20%",
        votingPower: "5x"
      },
      {
        checkinBoost: "1.5x",
        referralReward: "25%",
        votingPower: "10x"
      }
    ];
    
    return tiers[tier] || tiers[0];
  };

  // Loading state with futuristic animation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20 min-h-[50vh]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
          <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FaLeaf className="text-emerald-500 dark:text-emerald-400 text-2xl animate-pulse" />
          </div>
        </div>
        <p className="text-emerald-600 dark:text-emerald-300 mt-6 font-medium tracking-wide">Loading digital credentials...</p>
        <p className="text-emerald-500/60 dark:text-emerald-500/60 text-sm mt-2">Connecting to blockchain network</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-red-200 dark:border-red-500/20">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 flex items-center justify-center bg-red-100 dark:bg-red-500/20 rounded-full mr-4">
            <FaLeaf className="text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Connection Error</h3>
        </div>
        <p className="text-red-600 dark:text-red-300 mb-4 leading-relaxed">
          We encountered an issue while retrieving your digital credentials.
        </p>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-500/20">
          <p className="text-red-500 dark:text-red-300/80 font-mono text-sm">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 py-2 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-600/30 dark:hover:bg-red-600/50 transition-colors text-red-600 dark:text-red-100 rounded-lg flex items-center justify-center"
        >
          <FaLeaf className="mr-2" /> Reconnect
        </button>
      </div>
    );
  }

  // No badges state
  if (!badgeInfo?.hasBadges) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8 bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20"
      >
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-700/20 rounded-full mb-6 border border-emerald-300 dark:border-emerald-500/30"
          >
            <FaLeaf className="h-12 w-12 text-emerald-500 dark:text-emerald-400/80" />
          </motion.div>
          
          <motion.h3 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-3"
          >
            Begin Your Digital Journey
          </motion.h3>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-gray-700 dark:text-emerald-200/80 mb-6 leading-relaxed"
          >
            You haven't minted any GM Tea badges yet. Start with the Common badge to unlock exclusive benefits and begin building your digital collection.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-500/30 mb-6"
          >
            <h4 className="text-emerald-700 dark:text-emerald-300 font-medium mb-2">First Badge Perks:</h4>
            <ul className="text-sm text-gray-700 dark:text-emerald-200/70 space-y-2">
              <li className="flex items-center">
                <div className="w-4 h-4 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 rounded-full mr-2">
                  <FaLeaf className="h-2 w-2 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span>Daily check-in points with 1.1x multiplier</span>
              </li>
              <li className="flex items-center">
                <div className="w-4 h-4 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 rounded-full mr-2">
                  <FaLeaf className="h-2 w-2 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span>5% referral rewards on invites</span>
              </li>
              <li className="flex items-center">
                <div className="w-4 h-4 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 rounded-full mr-2">
                  <FaLeaf className="h-2 w-2 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span>Access to community chat features</span>
              </li>
            </ul>
          </motion.div>
          
          <motion.a
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            href="/mint"
            className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center font-medium"
          >
            <FaLeaf className="mr-2" />
            Mint Your First Badge 
            <FaAngleRight className="ml-2" />
          </motion.a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-black/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-emerald-500/20 overflow-hidden"
    >
      {/* Header with glassmorphism effect */}
      <div className="p-6 md:p-8 border-b border-gray-200 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-transparent dark:bg-gradient-to-r dark:from-emerald-300 dark:to-teal-200 dark:bg-clip-text mb-2">
              Your Digital Collection
            </h2>
            <p className="text-gray-600 dark:text-emerald-300/70 text-sm md:text-base">
              Tier progression: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{badgeInfo.badges.length}/5</span> badges unlocked
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-900/30 mr-3"
              style={badgeInfo.highestTier >= 0 ? { borderColor: `${getBadgeColor(badgeInfo.highestTier, true)}` } : {}}
            >
              {badgeInfo.highestTier >= 0 ? (
                <div className="w-6 h-6 text-emerald-600 dark:text-emerald-400" style={{ color: getBadgeColor(badgeInfo.highestTier) }}>
                  {getTierIcon(badgeInfo.highestTier)}
                </div>
              ) : (
                <FaLeaf className="h-5 w-5 text-emerald-400/60" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-emerald-300/60">Highest Tier</p>
              <p className="font-bold text-sm md:text-base" style={{ color: badgeInfo.highestTier >= 0 ? getBadgeColor(badgeInfo.highestTier) : '#64748b' }}>
                {badgeInfo.highestTierName}
              </p>
            </div>
            
            {badgeInfo.canUpgrade && (
              <div className="ml-6 px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-500/30 animate-pulse">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Next: <span className="font-medium">{badgeInfo.nextTierName}</span>
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6 relative h-2">
          <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
            {/* Animated progress fill */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (badgeInfo.badges.length / 5) * 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full"
            >
              <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm animate-pulse"></div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* Badge Collection - 3 columns */}
        <div className="lg:col-span-3 p-6 md:p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-emerald-300 mb-6 flex items-center">
            <FaCertificate className="mr-2 text-emerald-500 dark:text-emerald-400/60" />
            Digital Credentials
          </h3>
          
          {/* Hexagonal Badge Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[0, 1, 2, 3, 4].map((tier) => {
              const badge = badgeInfo.badges.find(b => b.tier === tier);
              const isOwned = !!badge;
              const isSelected = selectedBadge?.tier === tier;
              
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * tier }}
                  onClick={() => badge && handleBadgeSelect(badge)}
                  className={`relative overflow-hidden ${isOwned ? 'cursor-pointer' : 'opacity-50'}`}
                >
                  {/* Hexagon Shape */}
                  <div 
                    className={`
                      aspect-square relative overflow-hidden transition-all duration-300
                      ${isOwned ? 'backdrop-blur-sm shadow-lg' : 'grayscale'}
                      ${isSelected ? 'scale-105 shadow-xl ring-2' : 'hover:scale-102'}
                    `}
                    style={{ 
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      backgroundColor: `${getBadgeColor(tier, false)}20`,
                      boxShadow: isOwned ? `0 0 15px ${getBadgeColor(tier, false)}30` : 'none',
                      borderColor: isSelected ? getBadgeColor(tier) : 'transparent',
                    }}
                  >
                    {/* Badge Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <div 
                        className={`
                          w-10 h-10 flex items-center justify-center rounded-full mb-1
                          ${isOwned ? 'bg-gradient-to-br from-white/40 to-white/20 dark:from-black/40 dark:to-black/20' : 'bg-gray-200 dark:bg-gray-900/60'}
                        `}
                        style={isOwned ? { boxShadow: `0 0 10px ${getBadgeColor(tier, false)}40` } : {}}
                      >
                        <div className="w-5 h-5" style={{ color: getBadgeColor(tier) }}>
                          {getTierIcon(tier)}
                        </div>
                      </div>
                      
                      <p className="text-xs font-bold text-center" style={{ color: getBadgeColor(tier) }}>
                        {getTierName(tier)}
                      </p>
                      
                      <p className="text-[10px] text-gray-500 dark:text-emerald-300/70 mt-0.5">
                        {isOwned ? 'OWNED' : 'LOCKED'}
                      </p>
                    </div>
                    
                    {/* Animated effect for owned badges */}
                    {isOwned && (
                      <>
                        <div 
                          className="absolute inset-0 opacity-20" 
                          style={{ 
                            background: `radial-gradient(circle at center, ${getBadgeColor(tier, false)}40 0%, transparent 70%)`,
                          }}
                        ></div>
                        <div 
                          className="absolute inset-0 opacity-10 animate-pulse" 
                          style={{ 
                            background: `linear-gradient(45deg, transparent 40%, ${getBadgeColor(tier)} 50%, transparent 60%)`,
                            backgroundSize: '200% 200%',
                            animation: 'gradient-shift 3s ease infinite'
                          }}
                        ></div>
                      </>
                    )}
                    
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 border-2" style={{ 
                        borderColor: getBadgeColor(tier),
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      }}></div>
                    )}
                    
                    {/* Lock icon for locked badges */}
                    {!isOwned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-black/50">
                        <FaLeaf className="text-gray-400 dark:text-gray-500/50 h-6 w-6" />
                      </div>
                    )}
                  </div>
                  
                  {/* Badge name */}
                  <p className="text-center text-[11px] mt-2 font-medium" style={{ 
                    color: isOwned ? getBadgeColor(tier) : 'rgba(100, 116, 139, 0.6)'
                  }}>
                    {getTierName(tier)}
                  </p>
                  
                  {/* Minting date if owned */}
                  {badge?.mintedAt && (
                    <p className="text-center text-[10px] text-gray-500 dark:text-emerald-500/50">
                      {new Date(badge.mintedAt * 1000).toLocaleDateString()}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
          
          {/* Statistics section */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 backdrop-blur-sm rounded-xl border border-emerald-200 dark:border-emerald-600/20 p-4 mt-4">
            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-3">Collection Stats</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/80 dark:bg-black/30 rounded-lg p-3">
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mb-1">Badges Owned</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{badgeInfo.badges.length}/5</p>
              </div>
              
              <div className="bg-white/80 dark:bg-black/30 rounded-lg p-3">
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mb-1">Highest Rarity</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {badgeInfo.highestTier >= 0 ? getRarityPercentage(badgeInfo.highestTier) : "N/A"}
                </p>
              </div>
              
              <div className="bg-white/80 dark:bg-black/30 rounded-lg p-3">
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mb-1">First Minted</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {badgeInfo.badges.length > 0 
                    ? new Date(badgeInfo.badges[0].mintedAt * 1000).toLocaleDateString() 
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selected Badge Details - 2 columns */}
        <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-emerald-500/20 bg-gray-50 dark:bg-emerald-900/5">
          <AnimatePresence mode="wait">
            {selectedBadge ? (
              <motion.div
                key={`badge-${selectedBadge.tokenId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6 md:p-8 h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-semibold" style={{ color: getBadgeColor(selectedBadge.tier) }}>
                    {selectedBadge.tierName} Badge
                  </h3>
                  
                  <div 
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${getBadgeColor(selectedBadge.tier, false)}20`,
                      color: getBadgeColor(selectedBadge.tier)
                    }}
                  >
                    Top {getRarityPercentage(selectedBadge.tier)}
                  </div>
                </div>
                
                {/* Badge visualization */}
                <div className="w-full aspect-square max-w-[180px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full opacity-20 animate-pulse"
                    style={{ 
                      background: `radial-gradient(circle at center, ${getBadgeColor(selectedBadge.tier)} 0%, transparent 70%)`,
                    }}
                  ></div>
                  
                  <div className="absolute inset-[15%] rounded-full flex items-center justify-center" style={{ 
  background: `linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)`,
  border: `2px solid ${getBadgeColor(selectedBadge.tier, true)}40`,
  boxShadow: `0 4px 12px rgba(0,0,0,0.1)`
}}>
  <div 
    className="w-16 h-16 text-center"
    style={{ color: getBadgeColor(selectedBadge.tier) }}
  >
    {getTierIcon(selectedBadge.tier)}
  </div>
</div>

<div 
  className="absolute inset-0 rounded-full"
  style={{ 
    border: `1px solid ${getBadgeColor(selectedBadge.tier, true)}30`,
    background: `linear-gradient(45deg, transparent, ${getBadgeColor(selectedBadge.tier, true)}10 50%, transparent)`,
  }}
></div>

<div className="absolute inset-0 rounded-full animate-spin-slow"
  style={{ 
    borderTop: `1px dotted ${getBadgeColor(selectedBadge.tier, true)}30`,
    borderBottom: `1px dotted ${getBadgeColor(selectedBadge.tier, true)}20`,
  }}
></div>
</div>

{/* Badge details */}
<div className="space-y-4">
  <div className="bg-white dark:bg-black/30 backdrop-blur-md rounded-lg p-4 border border-gray-200 dark:border-emerald-500/10">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-gray-500 dark:text-emerald-500/70 mb-1">Badge ID</p>
        <p className="font-medium text-gray-800 dark:text-emerald-300">#{selectedBadge.tokenId}</p>
      </div>
      
      <div>
        <p className="text-xs text-gray-500 dark:text-emerald-500/70 mb-1">Minted On</p>
        <p className="font-medium text-gray-800 dark:text-emerald-300">
          {new Date(selectedBadge.mintedAt * 1000).toLocaleDateString()}
        </p>
      </div>
      
      <div>
        <p className="text-xs text-gray-500 dark:text-emerald-500/70 mb-1">Status</p>
        <p className="font-medium text-gray-800 dark:text-emerald-300">Soulbound</p>
      </div>
      
      <div>
        <p className="text-xs text-gray-500 dark:text-emerald-500/70 mb-1">Tier</p>
        <p className="font-medium" style={{ color: getBadgeColor(selectedBadge.tier) }}>
          {selectedBadge.tierName}
        </p>
      </div>
    </div>
  </div>
  
  {/* Badge stats */}
  <div className="bg-white dark:bg-black/30 backdrop-blur-md rounded-lg p-4 border border-gray-200 dark:border-emerald-500/10">
    <h4 className="text-sm font-medium text-gray-700 dark:text-emerald-300 mb-3">Badge Stats</h4>
    
    <div className="grid grid-cols-3 gap-3">
      <div>
        <p className="text-[10px] text-gray-500 dark:text-emerald-500/70 mb-1">Check-in Boost</p>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {getBadgeStats(selectedBadge.tier).checkinBoost}
        </p>
      </div>
      
      <div>
        <p className="text-[10px] text-gray-500 dark:text-emerald-500/70 mb-1">Referral %</p>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {getBadgeStats(selectedBadge.tier).referralReward}
        </p>
      </div>
      
      <div>
        <p className="text-[10px] text-gray-500 dark:text-emerald-500/70 mb-1">Voting Power</p>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {getBadgeStats(selectedBadge.tier).votingPower}
        </p>
      </div>
    </div>
  </div>
  
  {/* Badge benefits */}
  <div className="bg-white dark:bg-black/30 backdrop-blur-md rounded-lg p-4 border border-gray-200 dark:border-emerald-500/10">
    <h4 className="text-sm font-medium text-gray-700 dark:text-emerald-300 mb-3">Benefits</h4>
    
    <div className="space-y-2">
      {getBadgeBenefits(selectedBadge.tier).map((benefit, index) => (
        <div key={index} className="flex items-center">
          <div 
            className="w-4 h-4 flex items-center justify-center rounded-full mr-2"
            style={{ backgroundColor: `${getBadgeColor(selectedBadge.tier, true)}30` }}
          >
            <FaCheck className="h-2 w-2" style={{ color: getBadgeColor(selectedBadge.tier) }} />
          </div>
          <p className="text-sm text-gray-700 dark:text-emerald-300/80">{benefit}</p>
        </div>
      ))}
    </div>
  </div>
  
  {/* Blockchain verification */}
  <div className="bg-white dark:bg-black/30 backdrop-blur-md rounded-lg p-4 border border-gray-200 dark:border-emerald-500/10">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-medium text-gray-700 dark:text-emerald-300">Blockchain Verification</h4>
      <p className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Verified</p>
    </div>
    
    <p className="text-xs text-gray-500 dark:text-emerald-300/50 mt-2">
      This badge is stored on the blockchain and can't be transferred or altered. It represents your authentic contribution to the community.
    </p>
    
    <div className="mt-3 flex justify-end">
      <a 
        href={`https://sepolia.tea.xyz/token/${selectedBadge.tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs flex items-center text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
      >
        <FaExpand className="mr-1 h-3 w-3" /> View on Explorer
      </a>
    </div>
  </div>
</div>
</motion.div>
) : (
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="p-6 md:p-8 h-full flex flex-col items-center justify-center"
>
  <div className="w-16 h-16 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
    <FaLeaf className="h-6 w-6 text-emerald-500 dark:text-emerald-400/60" />
  </div>
  <p className="text-center text-gray-500 dark:text-emerald-300/70">
    Select a badge to view its details
  </p>
</motion.div>
)}
</AnimatePresence>
</div>
</div>

{/* Custom animation style */}
<style jsx global>{`
  @keyframes gradient-shift {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin-slow {
    animation: spin-slow 20s linear infinite;
  }
  
  .hover\\:scale-102:hover {
    transform: scale(1.02);
  }
`}</style>
</motion.div>
);
};

// Helper function to get badge color based on tier (with light mode support)
const getBadgeColor = (tier: number, isLightMode: boolean = false) => {
  const tierKey = Object.keys(BADGE_TIERS).find(
    key => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === tier
  );
  
  if (!tierKey) return BADGE_TIERS.COMMON.color;
  
  const color = BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].color;
  
  // For light mode, we want the colors to be more vibrant/darker
  if (isLightMode) {
    switch(tier) {
      case 0: return "#10b981"; // emerald-500 instead of 400
      case 1: return "#0891b2"; // cyan-600 instead of 500
      case 2: return "#8b5cf6"; // violet-500 instead of 400
      case 3: return "#f59e0b"; // amber-500 instead of 400
      case 4: return "#ef4444"; // red-500 instead of 400
      default: return color;
    }
  }
  
  return color;
};

// Helper function to get tier name based on tier
const getTierName = (tier: number) => {
  const tierKey = Object.keys(BADGE_TIERS).find(
    key => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === tier
  );
  
  if (!tierKey) return "Unknown";
  return BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].name;
};

export default UserBadges;