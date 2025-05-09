"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { getUserBadges } from "@/utils/badgeWeb3"
import UserBadges from "@/components/UserBadges" 

interface BadgesTabProps {
  address: string | null
}

export default function BadgesTab({ address }: BadgesTabProps) {
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUserBadges = async () => {
      if (!address) return

      setIsLoading(true)
      try {
        const badgesResult = await getUserBadges(address)
        setUserBadges(badgesResult || [])
      } catch (e) {
        console.warn("Error loading badges:", e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserBadges()
  }, [address])

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
      {/* Use the imported UserBadges component */}
      {address && <UserBadges address={address} />}
    </motion.div>
  )
}