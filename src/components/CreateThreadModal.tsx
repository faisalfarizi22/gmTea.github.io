import React, { useState, useEffect } from 'react';
import { FaSpinner, FaEthereum, FaCheckCircle, FaExclamationCircle, FaInfo } from 'react-icons/fa';
import { ethers } from 'ethers';

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, initialMessage: string) => Promise<void>;
}

const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadCreationFee, setThreadCreationFee] = useState<string>("1");
  const [checkinsRequired, setCheckinsRequired] = useState<number>(2);
  const [userCheckins, setUserCheckins] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'title' | 'initialMessage'>('title');
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setInitialMessage('');
      setError(null);
      setActiveTab('title');
      fetchContractInfo();
    }
  }, [isOpen]);
  
  // Fetch contract info
  const fetchContractInfo = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contractAddress = process.env.NEXT_PUBLIC_GMTEACHAT_CONTRACT_ADDRESS || "0x24e0bA33C8bDFa6f15A4E6fDCE5495a412f254b4";
      
      // Use minimal ABI for fee check
      const minimumAbi = [
        "function threadCreationFee() view returns (uint256)",
        "function threadCreationCheckinsRequired() view returns (uint256)"
      ];
      
      const contract = new ethers.Contract(contractAddress, minimumAbi, provider);
      
      // Get thread creation fee
      try {
        const fee = await contract.threadCreationFee();
        setThreadCreationFee(ethers.utils.formatEther(fee));
      } catch (e) {
        console.error("Error fetching thread creation fee:", e);
        setThreadCreationFee("1"); // Default fallback
      }
      
      // Get checkins required
      try {
        const required = await contract.threadCreationCheckinsRequired();
        setCheckinsRequired(Number(required));
      } catch (e) {
        console.error("Error fetching required checkins:", e);
        setCheckinsRequired(2); // Default fallback
      }
      
      // Get user's check-in count (using localStorage as a demo)
      // In a real app, you'd query this from your contract
      try {
        // This is a placeholder - in a real app you would get this from your contract
        const userData = localStorage.getItem('userCheckins');
        if (userData) {
          setUserCheckins(parseInt(userData, 10));
        } else {
          setUserCheckins(3); // Default for demo purposes
        }
      } catch (e) {
        console.error("Error fetching user checkins:", e);
        setUserCheckins(null);
      }
    } catch (e) {
      console.error("Error initializing fee fetch:", e);
    }
  };
  
  if (!isOpen) return null;
  
  const handleContinue = () => {
    if (!title.trim()) {
      setError("Please enter a thread title");
      return;
    }
    setActiveTab('initialMessage');
  };
  
  const handleBack = () => {
    setActiveTab('title');
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a thread title");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Pass both title and initial message to onCreate function
      await onCreate(title, initialMessage);
      setTitle('');
      setInitialMessage('');
      setActiveTab('title');
    } catch (error: any) {
      console.error("Error creating thread:", error);
      
      // Parse error message for better user feedback
      let errorMsg = "Failed to create thread. Please try again.";
      
      if (error.message) {
        if (error.message.includes("check-ins")) {
          errorMsg = `You need at least ${checkinsRequired} check-ins to create a thread.`;
        } else if (error.message.includes("fee") || error.message.includes("insufficient funds")) {
          errorMsg = `Insufficient funds to pay the thread creation fee (${threadCreationFee} TEA)`;
        } else if (error.message.includes("user rejected") || error.message.includes("rejected transaction")) {
          errorMsg = "Transaction was rejected in your wallet";
        } else {
          errorMsg = error.message;
        }
      }
      
      setError(errorMsg);
      setActiveTab('title'); // Show the error on the first tab
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const hasEnoughCheckins = userCheckins !== null && userCheckins >= checkinsRequired;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
          
          {/* Header with tabs */}
          <div className="px-6 pt-6 pb-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white" id="modal-title">
                Create New Thread
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex -mb-px">
                <button
                  className={`py-3 px-4 border-b-2 font-medium text-sm ${
                    activeTab === 'title'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('title')}
                >
                  Thread Title
                </button>
                <button
                  className={`py-3 px-4 border-b-2 font-medium text-sm ${
                    activeTab === 'initialMessage'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => title.trim() && setActiveTab('initialMessage')}
                >
                  Initial Message
                </button>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-5">
            {/* Thread creation info */}
            <div className="mb-5 rounded-lg border border-emerald-200 dark:border-emerald-800/30 overflow-hidden">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <FaEthereum className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Thread Creation Details:
                  </p>
                  <ul className="mt-1.5 text-sm space-y-1 text-emerald-700 dark:text-emerald-300">
                    <li>• Fee: <span className="font-medium">{threadCreationFee} TEA</span></li>
                    <li>• Required check-ins: <span className="font-medium">{checkinsRequired}</span></li>
                  </ul>
                  
                  {userCheckins !== null && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/30 flex items-center">
                      {hasEnoughCheckins ? (
                        <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                          <FaCheckCircle className="h-4 w-4 mr-1.5" />
                          <span>You have enough check-ins ({userCheckins}/{checkinsRequired})</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600 dark:text-amber-400 text-sm">
                          <FaExclamationCircle className="h-4 w-4 mr-1.5" />
                          <span>You need more check-ins ({userCheckins}/{checkinsRequired})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 dark:border-red-800/30 overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
                  <FaExclamationCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                </div>
              </div>
            )}
            
            {/* Tab content */}
            {activeTab === 'title' ? (
              <div>
                <div className="mb-5">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thread Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-base"
                    placeholder="What's your discussion about?"
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                    <span>Be descriptive and concise</span>
                    <span>{title.length}/100 characters</span>
                  </p>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!title.trim() || isSubmitting}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <label htmlFor="initialMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Initial Message <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="initialMessage"
                    name="initialMessage"
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-base"
                    placeholder="Share more details about your topic..."
                    rows={6}
                    maxLength={1000}
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                    <span>Your initial message will be posted automatically</span>
                    <span>{initialMessage.length}/1000 characters</span>
                  </p>
                </div>
                
                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50"
                  >
                    Back
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!title.trim() || isSubmitting || !hasEnoughCheckins}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <FaSpinner className="animate-spin h-4 w-4" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <span>Create Thread</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateThreadModal;