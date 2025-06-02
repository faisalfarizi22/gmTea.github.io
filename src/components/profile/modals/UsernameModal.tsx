"use client"

import { motion } from "framer-motion"
import { FaTimes } from "react-icons/fa"
import { useState, useEffect } from "react" 
import { ethers } from "ethers"
import UsernameRegistration from "@/components/UsernameRegistration"

interface UsernameModalProps {
  address: string
  hasReferrer: boolean
  onClose: () => void
  onRegistrationComplete: () => void
  signer?: ethers.Signer | null 
}

export default function UsernameModal({
  address,
  hasReferrer,
  onClose,
  onRegistrationComplete,
  signer
}: UsernameModalProps) {
  const [signerLoading, setSignerLoading] = useState(true)
  const [signerError, setSignerError] = useState<string | null>(null)
  const [validatedSigner, setValidatedSigner] = useState<ethers.Signer | null>(null)
  
  useEffect(() => {
    async function validateSigner() {
      try {
        setSignerLoading(true)
        setSignerError(null)
        
        if (signer) {
          try {
            const signerAddress = await signer.getAddress()
            console.log("✅ Signer address:", signerAddress)
            setValidatedSigner(signer) 
          } catch (error) {
            console.error("❌ Error validating signer:", error)
            setSignerError("Failed to validate signer from wallet")
            setValidatedSigner(null)
          }
        } else {
          console.log("⚠️ No signer provided")
          setSignerError("Wallet connection required")
          setValidatedSigner(null)
        }
      } catch (error) {
        console.error("Error in validateSigner:", error)
        setSignerError("Unexpected error validating signer")
        setValidatedSigner(null)
      } finally {
        setSignerLoading(false)
      }
    }
    
    validateSigner()
  }, [signer])
  
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <motion.div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm dark:bg-black dark:bg-opacity-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        ></motion.div>

        <motion.div
          className="inline-block overflow-hidden text-left align-bottom transition-all transform sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
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

          <div className="relative">
            {signerLoading ? (
              <div className="flex items-center justify-center min-h-[200px] bg-white dark:bg-gray-800 rounded-lg p-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Loading wallet...</span>
              </div>
            ) : signerError ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="text-red-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Wallet Connection Error</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{signerError}</p>
                <div className="mt-4">
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <UsernameRegistration
                address={address}
                signer={validatedSigner} 
                onRegistrationComplete={onRegistrationComplete}
                hasReferrer={hasReferrer}
              />
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}