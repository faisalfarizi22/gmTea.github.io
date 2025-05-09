"use client"

import { motion } from "framer-motion"
import { FaTimes } from "react-icons/fa"
import UsernameRegistration from "@/components/UsernameRegistration"
import { ethers } from "ethers"

interface UsernameModalProps {
  address: string
  signer: ethers.Signer
  hasReferrer: boolean
  onClose: () => void
  onRegistrationComplete: () => Promise<void>
}

export default function UsernameModal({
  address,
  signer,
  hasReferrer,
  onClose,
  onRegistrationComplete
}: UsernameModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay with blur effect */}
        <motion.div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm dark:bg-black dark:bg-opacity-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        ></motion.div>

        {/* Modal panel */}
        <motion.div
          className="inline-block overflow-hidden text-left align-bottom transition-all transform sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Close button - floating outside the card for cleaner look */}
          <div className="absolute z-10 top-2 right-2 sm:top-4 sm:right-4">
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/80 dark:bg-gray-900/80 text-gray-300 hover:text-white focus:outline-none transition-all duration-200 backdrop-blur-sm hover:bg-gray-700/90"
              onClick={onClose}
              aria-label="Close modal"
            >
              <span className="sr-only">Close</span>
              <FaTimes className="w-4 h-4" />
            </button>
          </div>

          {/* Modal content */}
          <div className="relative">
            <UsernameRegistration
              address={address}
              signer={signer}
              onRegistrationComplete={onRegistrationComplete}
              hasReferrer={hasReferrer}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}