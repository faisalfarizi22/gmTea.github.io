// src/components/UsernameRegistration.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUserAlt, 
  FaSpinner, 
  FaCheck, 
  FaTimes, 
  FaLock, 
  FaInfoCircle, 
  FaUserFriends, 
  FaExclamationTriangle,
  FaArrowRight
} from 'react-icons/fa';
import { ethers } from 'ethers';
import { isUsingDBMode } from '@/hooks/useDBMode';

interface UsernameRegistrationProps {
  address: string;
  signer: ethers.Signer | null;
  onRegistrationComplete: () => void;
  hasReferrer?: boolean; // Prop to check if user already has a referrer
}

// Define enum for registration type
enum RegistrationType {
  Referral = 'referral'
}

// Define interface for registration state
interface RegistrationState {
  type: RegistrationType;
  username: string;
  referrerUsername: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  txHash: string | null;
}

// Registration process steps
type RegistrationStep = 
  | 'idle'
  | 'registering_username'
  | 'linking_referrer'
  | 'completed'
  | 'failed';

const UsernameRegistration: React.FC<UsernameRegistrationProps> = ({
  address,
  signer,
  onRegistrationComplete,
  hasReferrer = false
}) => {
  // State for DB mode detection
  const [usingDBMode, setUsingDBMode] = useState<boolean>(isUsingDBMode());
  
  // State for form inputs
  const [username, setUsername] = useState('');
  const [referrerUsername, setReferrerUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [referrerError, setReferrerError] = useState('');
  
  // State for registration
  const [registrationState, setRegistrationState] = useState<RegistrationState>({
    type: RegistrationType.Referral,
    username: '',
    referrerUsername: '',
    isLoading: false,
    error: null,
    success: false,
    txHash: null
  });

  // Registration process tracking
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('idle');
  const [processError, setProcessError] = useState<string | null>(null);
  const [usernameTxHash, setUsernameTxHash] = useState<string | null>(null);
  const [referralTxHash, setReferralTxHash] = useState<string | null>(null);
  
  // State for real-time validation
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingReferrer, setIsCheckingReferrer] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isReferrerValid, setIsReferrerValid] = useState<boolean | null>(null);
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null);
  const [referrerAtCapacity, setReferrerAtCapacity] = useState<boolean>(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);


  
  // Check and update DB mode status
  useEffect(() => {
    setUsingDBMode(isUsingDBMode());
  }, []);

  // Normalize input to lowercase
  const normalizeLowercase = (input: string): string => {
    return input.toLowerCase();
  };
  
  // Helper function to check current step
  function isCurrentStep(step: RegistrationStep, value: RegistrationStep): boolean {
    return step === value;
  }

  // Validate username format
  const validateUsername = (input: string) => {
    // First normalize to lowercase for validation
    const normalizedInput = normalizeLowercase(input);
    
    if (normalizedInput.length < 3) {
      return 'Username should be at least 3 characters';
    }
    if (normalizedInput.length > 20) {
      return 'Username should be at most 20 characters';
    }
    if (!/^[a-z0-9_]+$/.test(normalizedInput)) {
      return 'Username can only contain lowercase letters, numbers, and underscores';
    }
    return '';
  };

  // Check if username is available using API
  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) return;
    
    try {
      setIsCheckingUsername(true);
      
      const normalizedUsername = normalizeLowercase(usernameToCheck);
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(normalizedUsername)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setUsernameError(errorData.message || 'Could not check username availability');
        setIsUsernameAvailable(false);
        return;
      }
      
      const data = await response.json();
      setIsUsernameAvailable(data.isAvailable);
      
      if (!data.isAvailable) {
        setUsernameError('This username is already taken');
      } else {
        setUsernameError('');
      }
      
    } catch (error) {
      console.error('Error checking username availability:', error);
      setUsernameError('Could not check username availability');
      setIsUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Check if referrer exists and has not reached the referral limit
  const checkReferrerValidity = async (referrerToCheck: string) => {
    if (!referrerToCheck || referrerToCheck.length < 3) return;
    
    try {
      setIsCheckingReferrer(true);
      setIsReferrerValid(null);
      setReferrerAddress(null);
      setReferrerAtCapacity(false);
      
      const normalizedReferrer = normalizeLowercase(referrerToCheck);
      
      const response = await fetch(`/api/check-referrer?username=${encodeURIComponent(normalizedReferrer)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setReferrerError(errorData.message || 'Could not verify referrer');
        setIsReferrerValid(false);
        return;
      }
      
      const data = await response.json();
      
      if (!data.isValid) {
        setIsReferrerValid(false);
        setReferrerError('Referrer username not found');
        return;
      }
      
      if (data.atCapacity) {
        setIsReferrerValid(false);
        setReferrerAtCapacity(true);
        setReferrerError('This referrer has reached their maximum invitation limit');
        return;
      }
      
      setReferrerAddress(data.address || null);
      setIsReferrerValid(true);
      setReferrerError('');
      
    } catch (error) {
      console.error('Error checking referrer validity:', error);
      setIsReferrerValid(false);
      setReferrerError('Could not verify referrer');
    } finally {
      setIsCheckingReferrer(false);
    }
  };

  // Handle username input change with debounce
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Store lowercase version in state
    const normalizedValue = normalizeLowercase(value);
    setUsername(normalizedValue);
    // Show the normalized value in the input
    e.target.value = normalizedValue;
    
    // Reset validation states
    setIsUsernameAvailable(null);
    
    // Validate format first
    const formatError = validateUsername(normalizedValue);
    setUsernameError(formatError);
    
    // If format is valid, check availability with debounce
    if (!formatError && normalizedValue.length >= 3) {
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to delay the check
      const newTimeout = setTimeout(() => {
        checkUsernameAvailability(normalizedValue);
      }, 500);
      
      setTypingTimeout(newTimeout as unknown as NodeJS.Timeout);
    }
  };

  // Handle referrer input change with debounce
  const handleReferrerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Store lowercase version in state
    const normalizedValue = normalizeLowercase(value);
    setReferrerUsername(normalizedValue);
    // Show the normalized value in the input
    e.target.value = normalizedValue;
    
    // Reset validation states
    setIsReferrerValid(null);
    setReferrerAtCapacity(false);
    
    if (normalizedValue === '') {
      setReferrerError('Please enter a referrer username');
      return;
    }
    
    // Validate format first
    const formatError = validateUsername(normalizedValue);
    setReferrerError(formatError);
    
    // If format is valid, check referrer with debounce
    if (!formatError && normalizedValue.length >= 3) {
      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to delay the check
      const newTimeout = setTimeout(() => {
        checkReferrerValidity(normalizedValue);
      }, 500);
      
      setTypingTimeout(newTimeout as unknown as NodeJS.Timeout);
    }
  };

  // Import registerWithReferral function from badgeWeb3 utils
  const importRegisterWithReferral = async () => {
    const { registerWithReferral } = await import('@/utils/badgeWeb3');
    return registerWithReferral;
  };

  // Two-step registration process
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signer) {
      setProcessError('Wallet not connected');
      return;
    }
    
    // Username and referrerUsername are already lowercase from the handlers
    const normalizedUsername = normalizeLowercase(username);
    const normalizedReferrer = normalizeLowercase(referrerUsername);
    
    // Validate inputs
    const usernameFormatError = validateUsername(normalizedUsername);
    if (usernameFormatError) {
      setUsernameError(usernameFormatError);
      return;
    }
    
    // Validate referrer
    if (!normalizedReferrer) {
      setReferrerError('Please enter a referrer username');
      return;
    }
    
    const referrerFormatError = validateUsername(normalizedReferrer);
    if (referrerFormatError) {
      setReferrerError(referrerFormatError);
      return;
    }
    
    // Final validation checks if needed
    if (isUsernameAvailable === null) {
      try {
        setIsCheckingUsername(true);
        await checkUsernameAvailability(normalizedUsername);
      } finally {
        setIsCheckingUsername(false);
      }
    }
    
    if (isReferrerValid === null) {
      try {
        setIsCheckingReferrer(true);
        await checkReferrerValidity(normalizedReferrer);
      } finally {
        setIsCheckingReferrer(false);
      }
    }
    
    // Check validation results
    if (isUsernameAvailable === false) {
      setUsernameError('This username is already taken');
      return;
    }
    
    if (isReferrerValid === false) {
      if (referrerAtCapacity) {
        setReferrerError('This referrer has reached their maximum invitation limit');
      } else {
        setReferrerError('Referrer username not found');
      }
      return;
    }
    
    // Begin registration process
    setRegistrationState({
      ...registrationState,
      username: normalizedUsername,
      referrerUsername: normalizedReferrer,
      isLoading: true,
      error: null,
      success: false,
      txHash: null
    });
    
    setProcessError(null);
    setCurrentStep('registering_username');
    
    try {
      // Import the registerWithReferral function
      const registerWithReferral = await importRegisterWithReferral();
      
      // Execute the registration process with visual steps
      const result = await registerWithReferral(signer, normalizedUsername, normalizedReferrer);
      
      if (result.success) {
        // Registration completed successfully
        setRegistrationState({
          ...registrationState,
          isLoading: false,
          success: true,
          txHash: result.txHash || null
        });
        
        setCurrentStep('completed');
        setReferralTxHash(result.txHash || null);
        
        // Notify parent component of successful registration
        setTimeout(() => {
          onRegistrationComplete();
        }, 2000);
      } else {
        // Registration failed
        setCurrentStep('failed');
        
        // Check if error is about referral limit
        if (result.error && result.error.includes("reached max referrals")) {
          setReferrerAtCapacity(true);
          setReferrerError('This referrer has reached their maximum invitation limit');
          setProcessError('This referrer has reached their maximum invitation limit (10 users). Please try a different referrer.');
        } else {
          setProcessError(result.error || 'Registration could not be completed');
        }
        
        setRegistrationState({
          ...registrationState,
          isLoading: false,
          error: result.error || 'Registration could not be completed'
        });
      }
    } catch (error: any) {
      setCurrentStep('failed');
      
      // Check if error is about referral limit
      if (error.message && error.message.includes("reached max referrals")) {
        setReferrerAtCapacity(true);
        setReferrerError('This referrer has reached their maximum invitation limit');
        setProcessError('This referrer has reached their maximum invitation limit (10 users). Please try a different referrer.');
      } else {
        setProcessError(error.message || 'Registration could not be completed');
      }
      
      setRegistrationState({
        ...registrationState,
        isLoading: false,
        error: error.message || 'Registration could not be completed'
      });
    }
  };

  // Reset registration process
  const resetRegistration = () => {
    setCurrentStep('idle');
    setProcessError(null);
    setRegistrationState({
      ...registrationState,
      isLoading: false,
      error: null,
      success: false,
      txHash: null
    });
  };

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 text-gray-800 dark:text-white p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center mr-3">
            <FaUserAlt className="text-white text-sm" />
          </div>
          <div>
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
              Set Your Identity
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300">Join the GM Tea community</p>
          </div>
        </div>
        
        <motion.div 
          className="mb-5 text-sm text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <p className="leading-relaxed">
            Choose a unique username for the GM Tea ecosystem.
            This will be your identity for all community interactions.
          </p>
          <div className="mt-2 text-xs font-medium text-red-400 flex items-center">
            <FaInfoCircle className="mr-1 text-xs" />
            Username cannot be changed after registration
          </div>
        </motion.div>
        
        {/* If user already has a referrer, show a notice */}
        {hasReferrer && (
          <motion.div 
            className="mb-4 bg-blue-50 dark:bg-blue-900/30 rounded-md p-3 border border-blue-200 dark:border-blue-800/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-start">
              <div className="bg-blue-600 rounded-md p-1.5 mr-2">
                <FaLock className="text-white text-xs" />
              </div>
              <div>
                <h3 className="font-medium text-blue-700 dark:text-blue-300 text-sm mb-0.5">Already Verified</h3>
                <p className="text-xs text-blue-600 dark:text-blue-200">
                  You're already registered with a referral.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Required Referral Notice */}
        {!hasReferrer && (
          <motion.div 
            className="mb-4 bg-amber-50 dark:bg-amber-900/30 rounded-md p-3 border border-amber-200 dark:border-amber-700/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-start">
              <div className="bg-amber-500 rounded-md p-1.5 mr-2">
                <FaInfoCircle className="text-white text-xs" />
              </div>
              <div>
                <h3 className="font-medium text-amber-700 dark:text-amber-300 text-sm mb-0.5">Referral Needed</h3>
                <p className="text-xs text-amber-700 dark:text-amber-200">
                  Please enter the username of someone who invited you to GM Tea.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Registration Progress Roadmap - Shows only during or after registration */}
        {currentStep !== 'idle' && (
          <motion.div 
            className="mb-6 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">Registration Progress</h4>
<div className="relative">
  {/* Progress Line */}
  <div className="absolute left-4 top-0 w-0.5 h-full bg-gray-200 dark:bg-gray-700 z-0"></div>
  
  {/* Step 1: Registering Username */}
  <div className="relative z-10 flex items-start mb-4">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 
      ${currentStep === 'registering_username' ? 'bg-blue-500 animate-pulse' : 
        currentStep === 'linking_referrer' || currentStep === 'completed' ? 'bg-emerald-500' : 
        currentStep === 'failed' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
      {currentStep === 'registering_username' ? (
        <FaSpinner className="text-white text-sm animate-spin" />
      ) : currentStep === 'linking_referrer' || currentStep === 'completed' ? (
        <FaCheck className="text-white text-sm" />
      ) : currentStep === 'failed' ? (
        <FaTimes className="text-white text-sm" />
      ) : (
        <span className="text-white text-xs font-medium">1</span>
      )}
    </div>
    <div className="pt-1">
      <h5 className={`text-sm font-medium 
        ${currentStep === 'registering_username' ? 'text-blue-600 dark:text-blue-400' : 
          currentStep === 'linking_referrer' || currentStep === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 
          currentStep === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
        Registering Username
      </h5>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {currentStep === 'registering_username' ? 'Creating your on-chain identity...' : 
          currentStep === 'linking_referrer' || currentStep === 'completed' ? 'Username registered successfully' : 
          currentStep === 'failed' ? 'Failed to register username' : 'Waiting to start'}
      </p>
    </div>
  </div>
  
  {/* Step 2: Linking Referrer */}
  <div className="relative z-10 flex items-start mb-4">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 
      ${currentStep === 'linking_referrer' ? 'bg-blue-500 animate-pulse' : 
        currentStep === 'completed' ? 'bg-emerald-500' : 
        currentStep === 'failed' && processError && processError.includes('referrer') ? 'bg-red-500' :
        'bg-gray-300 dark:bg-gray-600'}`}>
      {currentStep === 'linking_referrer' ? (
        <FaSpinner className="text-white text-sm animate-spin" />
      ) : currentStep === 'completed' ? (
        <FaCheck className="text-white text-sm" />
      ) : currentStep === 'failed' && processError && processError.includes('referrer') ? (
        <FaTimes className="text-white text-sm" />
      ) : (
        <span className="text-white text-xs font-medium">2</span>
      )}
    </div>
    <div className="pt-1">
      <h5 className={`text-sm font-medium 
        ${currentStep === 'linking_referrer' ? 'text-blue-600 dark:text-blue-400' : 
          currentStep === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 
          currentStep === 'failed' && processError && processError.includes('referrer') ? 'text-red-600 dark:text-red-400' : 
          'text-gray-600 dark:text-gray-400'}`}>
        Linking Referrer
      </h5>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {currentStep === 'linking_referrer' ? 'Establishing referral relationship...' : 
          currentStep === 'completed' ? 'Referrer linked successfully' : 
          currentStep === 'failed' && processError && processError.includes('referrer') ? 'Failed to link referrer' : 
          'Waiting to start'}
      </p>
    </div>
  </div>
  
  {/* Step 3: Complete */}
  <div className="relative z-10 flex items-start">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 
      ${currentStep === 'completed' ? 'bg-emerald-500' : 
        'bg-gray-300 dark:bg-gray-600'}`}>
      {currentStep === 'completed' ? (
        <FaCheck className="text-white text-sm" />
      ) : (
        <span className="text-white text-xs font-medium">3</span>
      )}
    </div>
    <div className="pt-1">
      <h5 className={`text-sm font-medium 
        ${currentStep === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 
          'text-gray-600 dark:text-gray-400'}`}>
        Registration Complete
      </h5>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {currentStep === 'completed' ? 
          'Welcome to GM Tea! Your identity is now secured on the blockchain.' : 
          'Awaiting completion'}
      </p>
      {currentStep === 'completed' && referralTxHash && (
        <a
          href={`https://sepolia.tea.xyz/tx/${referralTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs inline-flex items-center mt-1 transition-colors"
        >
          View on blockchain
          <svg className="w-2.5 h-2.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
        </a>
      )}
    </div>
  </div>
</div>

{/* Error Message */}
{processError && (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-300 rounded-md"
  >
    <div className="flex items-start">
      <div className="bg-red-400 dark:bg-red-600 rounded-md p-1.5 mr-2 flex-shrink-0">
        <FaTimes className="text-white text-xs" />
      </div>
      <div>
        <p className="text-xs">{processError}</p>
        <button 
          onClick={resetRegistration}
          className="mt-2 text-xs bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 px-3 py-1 rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </motion.div>
)}

{/* Only show form when in IDLE state or FAILED state */}
{(isCurrentStep(currentStep, 'idle') || isCurrentStep(currentStep, 'failed')) && (
  <button
    onClick={resetRegistration}
    className="mt-4 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
  >
    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
    Back to form
  </button>
)}
</motion.div>
)}

{/* Registration Form */}
{(!hasReferrer && (currentStep === 'idle' || currentStep === 'failed')) && (
  <motion.form 
    onSubmit={handleSubmit}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3, duration: 0.4 }}
    className="space-y-4"
  >
    {/* Username Input */}
    <div className="space-y-1.5">
      <label 
        htmlFor="username" 
        className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center"
      >
        <span className="mr-2">Username</span>
        <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">lowercase only</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <FaUserAlt className="text-gray-500 dark:text-gray-400 text-xs" />
        </div>
        <input
          type="text"
          id="username"
          className={`w-full pl-8 pr-3 py-2 rounded-md text-sm border ${
            usernameError
              ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/10'
              : isUsernameAvailable === true
              ? 'border-emerald-300 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
          } text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-200`}
          placeholder="e.g., tea_lover"
          onChange={handleUsernameChange}
          disabled={registrationState.isLoading}
          autoComplete="off"
          required
        />
        
        {/* Show spinner when checking */}
        {isCheckingUsername && (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
            <FaSpinner className="text-gray-400 text-xs animate-spin" />
          </div>
        )}
        
        {/* Show check mark if username is available */}
        {!isCheckingUsername && isUsernameAvailable === true && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
          >
            <FaCheck className="text-emerald-500 text-xs" />
          </motion.div>
        )}
        
        {/* Show X mark if username is not available */}
        {!isCheckingUsername && isUsernameAvailable === false && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
          >
            <FaTimes className="text-red-500 text-xs" />
          </motion.div>
        )}
      </div>
      
      {/* Username validation message */}
      {usernameError && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 dark:text-red-400 flex items-center"
        >
          <FaTimes className="mr-1 flex-shrink-0 text-xs" />
          {usernameError}
        </motion.p>
      )}
      
      {/* Username available message */}
      {!usernameError && isUsernameAvailable === true && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-emerald-500 dark:text-emerald-400 flex items-center"
        >
          <FaCheck className="mr-1 flex-shrink-0 text-xs" />
          Username available
        </motion.p>
      )}
    </div>
    
    {/* Referrer Input */}
    <div className="space-y-1.5">
      <label 
        htmlFor="referrer" 
        className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center"
      >
        <span className="mr-2">Referrer's Username</span>
        <span className="text-xs text-red-500 dark:text-red-400">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <FaUserFriends className="text-gray-500 dark:text-gray-400 text-xs" />
        </div>
        <input
          type="text"
          id="referrer"
          className={`w-full pl-8 pr-3 py-2 rounded-md text-sm border ${
            referrerError
              ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/10'
              : isReferrerValid === true
              ? 'border-emerald-300 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
          } text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-200`}
          placeholder="Who invited you?"
          onChange={handleReferrerChange}
          disabled={registrationState.isLoading}
          autoComplete="off"
          required
        />
        
        {/* Show spinner when checking */}
        {isCheckingReferrer && (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
            <FaSpinner className="text-gray-400 text-xs animate-spin" />
          </div>
        )}
        
        {/* Show check mark if referrer is valid */}
        {!isCheckingReferrer && isReferrerValid === true && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
          >
            <FaCheck className="text-emerald-500 text-xs" />
          </motion.div>
        )}
        
        {/* Show X mark if referrer is not valid */}
        {!isCheckingReferrer && isReferrerValid === false && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
          >
            <FaTimes className="text-red-500 text-xs" />
          </motion.div>
        )}
      </div>
      
      {/* Special warning for capacity limit */}
      {referrerAtCapacity && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-orange-500 dark:text-orange-400 flex items-center"
        >
          <FaExclamationTriangle className="mr-1 flex-shrink-0 text-xs" />
          This referrer has reached their maximum invitation limit (10 users)
        </motion.p>
      )}
      {/* Other referrer validation message */}
      {referrerError && !referrerAtCapacity && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 dark:text-red-400 flex items-center"
        >
          <FaTimes className="mr-1 flex-shrink-0 text-xs" />
          {referrerError}
        </motion.p>
      )}
      
      {/* Referrer valid message */}
      {!referrerError && isReferrerValid === true && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-emerald-500 dark:text-emerald-400 flex items-center"
        >
          <FaCheck className="mr-1 flex-shrink-0 text-xs" />
          Referrer found and has invitation capacity
        </motion.p>
      )}
    </div>
    
    {/* Warning if signer not available but blockchain mode is active */}
    {!usingDBMode && !signer && (
      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-md">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-300">
            Wallet connection is required for username registration. Please make sure your wallet is connected.
          </p>
        </div>
      </div>
    )}

    {/* Submit Button */}
    <motion.div
      whileHover={{ scale: registrationState.isLoading || registrationState.success ? 1 : 1.01 }}
      whileTap={{ scale: registrationState.isLoading || registrationState.success ? 1 : 0.99 }}
    >
      <button
        type="submit"
        disabled={
          registrationState.isLoading || 
          registrationState.success || 
          isCheckingUsername || 
          isCheckingReferrer || 
          isUsernameAvailable === false || 
          isReferrerValid === false ||
          referrerAtCapacity ||
          !!usernameError ||
          !!referrerError ||
          (!usingDBMode && !signer)
        }
        className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
          registrationState.isLoading 
            ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
            : registrationState.success
            ? 'bg-emerald-600 text-white cursor-not-allowed'
            : isCheckingUsername || isCheckingReferrer || isUsernameAvailable === false || isReferrerValid === false || !!usernameError || !!referrerError || referrerAtCapacity || (!usingDBMode && !signer)
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white shadow-sm hover:shadow-md'
        }`}
      >
        {registrationState.isLoading ? (
          <span className="flex items-center justify-center">
            <FaSpinner className="animate-spin mr-2 text-xs" />
            Processing...
          </span>
        ) : registrationState.success ? (
          <span className="flex items-center justify-center">
            <FaCheck className="mr-2 text-xs" />
            Registration Complete
          </span>
        ) : isCheckingUsername || isCheckingReferrer ? (
          <span className="flex items-center justify-center">
            <FaSpinner className="animate-spin mr-2 text-xs" />
            Validating...
          </span>
        ) : !usingDBMode && !signer ? (
          <span className="flex items-center justify-center">
            Wallet Connection Required
          </span>
        ) : (
          'Begin Registration'
        )}
      </button>
    </motion.div>
  </motion.form>
)}

{/* Only show information box when in IDLE state or FAILED state */}
{(currentStep === 'idle' || currentStep === 'failed') && (
  <motion.div 
    className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-md"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.4 }}
  >
    <h3 className="text-blue-700 dark:text-blue-300 text-xs font-medium mb-1">
      About Referral Registration
    </h3>
    <p className="text-blue-600 dark:text-blue-200 text-xs leading-relaxed">
      GM Tea uses referrals to build a high-quality community. Each referrer can invite up to 10 users.
      Referrers earn rewards when you mint badges, and you'll enjoy community perks through their invitation.
    </p>
  </motion.div>
)}
</motion.div>
    </div>
  );
};

export default UsernameRegistration;