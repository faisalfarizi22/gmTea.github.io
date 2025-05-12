"use client"

import { motion } from "framer-motion"
import UserBadges from "@/components/UserBadges" 

interface BadgesTabProps {
  address: string | null;
  badges?: Array<{
    tokenId: number;
    tier: number;
    tierName: string;
    mintedAt: string;
    transactionHash: string;
    referrer?: string;
  }>;
}

export default function BadgesTab({ address, badges = [] }: BadgesTabProps) {
  // The UserBadges component will handle the data fetching internally
  // We just need to pass the wallet address
  
  const isLoading = !address;

  if (isLoading) {
    return (
      <motion.div
        key="badges-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center p-12"
      >
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
          <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="badges"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* 
        Pass the address to UserBadges component
        The UserBadges component will handle fetching the badges data
        from the API endpoint based on this address
      */}
      {address && <UserBadges address={address} />}
    </motion.div>
  )
}