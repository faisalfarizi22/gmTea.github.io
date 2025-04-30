import React, { useState, useEffect, useRef } from 'react';
import { FaHeart, FaRegHeart, FaLock, FaSpinner, FaShare, FaUser, FaClock, FaComment, FaExclamationCircle, FaArrowLeft, FaWallet } from 'react-icons/fa';
import { formatDistance } from 'date-fns';
import { useGMTeaChat } from '@/hooks/useGMTeaChat';
import { formatAddress, connectWallet, isWalletConnected, switchToTeaSepolia } from '@/utils/web3';
import { ethers } from 'ethers';
import PostMessage from '@/components/PostMessage';

interface ThreadDetailProps {
  threadId: number;
  isOverlay?: boolean;
  onThreadClosed?: () => void;
}

// Define the message interface to include the id property
interface ExtendedForumMessage {
  id: number;
  sender: string;
  content: string;
  timestamp: number;
  likes: number;
  hasLiked?: boolean;
}

const ThreadDetail: React.FC<ThreadDetailProps> = ({ 
  threadId, 
  isOverlay = false,
  onThreadClosed
}) => {
  const { getThreadDetails, getThreadMessages, postToThread, likeMessage, closeThread } = useGMTeaChat();
  
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<ExtendedForumMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log('ThreadDetail rendering with threadId:', threadId);

  // Check wallet connection on load
  useEffect(() => {
    const checkWallet = async () => {
      try {
        if (typeof window === 'undefined' || !window.ethereum) {
          console.log("MetaMask not available");
          return;
        }

        try {
          // Request account access directly - this will trigger MetaMask popup
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          const connected = accounts && accounts.length > 0;
          console.log("Wallet connected:", connected, "Accounts:", accounts);
          setIsWalletReady(connected);
          
          if (connected) {
            // Get the address if wallet is connected
            const address = accounts[0];
            setCurrentAddress(address);
            localStorage.setItem("walletAddress", address);
          } else {
            // If not connected, try to use cached address
            const cachedAddress = localStorage.getItem("walletAddress");
            if (cachedAddress) {
              setCurrentAddress(cachedAddress);
            }
          }
        } catch (error) {
          console.warn("Could not check wallet accounts:", error);
          // Use cached address as fallback
          const cachedAddress = localStorage.getItem("walletAddress");
          if (cachedAddress) {
            setCurrentAddress(cachedAddress);
          }
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };
    
    checkWallet();
  }, []);
  
  // Listen for wallet changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length > 0) {
          setCurrentAddress(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
          setIsWalletReady(true);
        } else {
          setIsWalletReady(false);
        }
      };
      
      const handleChainChanged = () => {
        // Reload the page on chain change as recommended by MetaMask
        window.location.reload();
      };
      
      // Add event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Clean up
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);
  
  // Load thread and messages
  useEffect(() => {
    const loadThread = async () => {
      if (threadId === undefined || threadId === null) {
        console.error("No thread ID provided");
        setLoadingError("Thread not found");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setLoadingError(null);
      
      try {
        console.log(`Loading thread details for ID: ${threadId}`);
        const threadData = await getThreadDetails(Number(threadId));
        console.log("Thread data received:", threadData);
        
        if (!threadData) {
          setLoadingError("Thread not found");
          setIsLoading(false);
          return;
        }
        
        setThread(threadData);
        
        console.log(`Loading messages for thread ID: ${threadId}`);
        const rawMessagesData = await getThreadMessages(Number(threadId), 0, 100);
        console.log("Messages data received:", rawMessagesData);
        
        // Transform the messages to include the id property explicitly
        const messagesData: ExtendedForumMessage[] = rawMessagesData.map((msg: any, index: number) => ({
          id: index, // Use the index as id if no explicit id is returned
          sender: msg.sender,
          content: msg.content,
          timestamp: Number(msg.timestamp),
          likes: Number(msg.likes),
          hasLiked: false
        }));
        
        // Mark messages that the current user has already liked
        if (currentAddress && messagesData.length > 0) {
          try {
            if (window.ethereum) {
              const provider = new ethers.providers.Web3Provider(window.ethereum);
              const signer = provider.getSigner();
              const contract = new ethers.Contract(
                process.env.NEXT_PUBLIC_GMTEACHAT_ADDRESS || "", 
                [{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"hasLiked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}], 
                provider
              );
              
              // Check which messages the current user has liked
              for (let i = 0; i < messagesData.length; i++) {
                try {
                  const hasLiked = await contract.hasLiked(currentAddress, Number(threadId) * 10000 + messagesData[i].id);
                  messagesData[i].hasLiked = hasLiked;
                } catch (e) {
                  console.warn(`Could not check if message ${messagesData[i].id} is liked:`, e);
                }
              }
            }
          } catch (e) {
            console.warn("Could not check liked status of messages:", e);
          }
        }
        
        setMessages(messagesData);
        
      } catch (error) {
        console.error("Error loading thread:", error);
        setLoadingError("Failed to load thread");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThread();
  }, [threadId, currentAddress, getThreadDetails, getThreadMessages]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Function to connect wallet - made more robust
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      console.log("Attempting to connect wallet...");
      
      // First make sure we're on the right network
      await switchToTeaSepolia();
      
      // Then connect the wallet
      const { address } = await connectWallet();
      console.log("Wallet connected with address:", address);
      
      setCurrentAddress(address);
      setIsWalletReady(true);
      localStorage.setItem("walletAddress", address);
      
      return true;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setReplyError("Failed to connect wallet. Please try again.");
      return false;
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Handler for posting a message with enhanced wallet connection and debugging
  const handlePostMessage = async (content: string) => {
    console.log("Handling post message:", content);
    if (!threadId || !content.trim()) return;
    
    // Make sure wallet is connected
    if (!isWalletReady) {
      console.log("Wallet not connected, prompting connection");
      setReplyError("Please connect your wallet to post a message");
      
      const connected = await handleConnectWallet();
      if (!connected) {
        console.log("Failed to connect wallet for posting");
        return;
      }
    }
    
    setIsReplying(true);
    setReplyError(null);
    
    try {
      // Ensure proper connection to the network
      await switchToTeaSepolia();
      
      // Connect wallet to ensure we have permissions
      const { address, provider, signer } = await connectWallet();
      console.log("Ready to post with address:", address);
      
      // Now post the message
      console.log("Posting message to thread:", content);
      await postToThread(Number(threadId), content);
      
      // Reload messages
      console.log("Reloading messages after post");
      const rawMessagesData = await getThreadMessages(Number(threadId), 0, 100);
      
      // Transform to include id
      const messagesData: ExtendedForumMessage[] = rawMessagesData.map((msg: any, index: number) => ({
        id: index,
        sender: msg.sender,
        content: msg.content,
        timestamp: Number(msg.timestamp),
        likes: Number(msg.likes),
        hasLiked: false
      }));
      
      // Update the UI with the new messages
      setMessages(messagesData);
    } catch (error: any) {
      console.error("Error posting message:", error);
      
      if (error.code === 4001) { // User rejected transaction
        setReplyError("Transaction rejected. Please approve the transaction in your wallet.");
      } else if (error.message && error.message.includes("check-ins")) {
        setReplyError("You need at least one check-in to post messages");
      } else if (error.message) {
        setReplyError(error.message);
      } else {
        setReplyError("Failed to post message. Please try again.");
      }
    } finally {
      setIsReplying(false);
    }
  };
  
  // Enhanced like handler with better wallet connection and error debugging
  const handleLikeMessage = async (messageId: number) => {
    if (!threadId) return;
    
    // Make sure wallet is connected
    if (!isWalletReady) {
      console.log("Wallet not connected for liking, prompting connection");
      
      const connected = await handleConnectWallet();
      if (!connected) {
        console.log("Failed to connect wallet for liking");
        return;
      }
    }
    
    try {
      // Ensure proper connection to the network
      await switchToTeaSepolia();
      
      // Connect wallet to ensure we have permissions
      const { address, provider, signer } = await connectWallet();
      console.log(`Ready to like message ${messageId} with address:`, address);
      
      // Now like the message
      console.log(`Liking message ${messageId} in thread ${threadId}`);
      await likeMessage(Number(threadId), messageId);
      
      // Update local state to show the like immediately
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? {...msg, likes: msg.likes + 1, hasLiked: true} 
          : msg
      ));
    } catch (error: any) {
      console.error("Error liking message:", error);
      
      // If the error contains "already liked", we'll update the UI anyway
      if (error.message && error.message.toLowerCase().includes("already liked")) {
        setMessages(messages.map(msg => 
          msg.id === messageId 
            ? {...msg, hasLiked: true} 
            : msg
        ));
      } else if (error.code === 4001) {
        alert("Transaction rejected. Please approve the transaction in your wallet.");
      } else {
        alert(error.message || "Failed to like message. Please try again.");
      }
    }
  };
  
  // Enhanced thread closing handler
  const handleCloseThread = async () => {
    if (!threadId) return;
    
    // Make sure wallet is connected
    if (!isWalletReady) {
      const connected = await handleConnectWallet();
      if (!connected) return;
    }
    
    try {
      // Ensure proper connection to the network
      await switchToTeaSepolia();
      
      // Connect wallet to ensure we have permissions
      const { address } = await connectWallet();
      console.log(`Ready to close thread ${threadId} with address:`, address);
      
      // Close the thread
      console.log(`Closing thread ${threadId}`);
      await closeThread(Number(threadId));
      setThread({...thread, isActive: false});
      
      if (isOverlay && onThreadClosed) {
        onThreadClosed();
      }
    } catch (error: any) {
      console.error("Error closing thread:", error);
      if (error.message && error.message.includes("Not authorized")) {
        alert("You are not authorized to close this thread. Only the creator can close it.");
      } else if (error.code === 4001) {
        alert("Transaction rejected. Please approve the transaction in your wallet.");
      } else {
        alert(error.message || "Failed to close thread. Please try again.");
      }
    }
  };

  const handleBackClick = () => {
    if (isOverlay && onThreadClosed) {
      onThreadClosed();
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 h-full">
        <div className="flex flex-col items-center">
          <FaSpinner className="text-emerald-500 h-8 w-8 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading thread...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (loadingError || !thread) {
    return (
      <div className="flex flex-col items-center justify-center py-12 h-full">
        <p className="text-red-500 mb-4">{loadingError || "Thread not found"}</p>
        <button 
          onClick={handleBackClick}
          className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
        >
          <FaArrowLeft className="mr-2" />
          Back to Forums
        </button>
      </div>
    );
  }
  
  const isOwner = currentAddress?.toLowerCase() === thread.creator?.toLowerCase();
  
  return (
    <div className="h-full flex flex-col">
      {/* Thread Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{thread.title}</h1>
          
          {isOwner && thread.isActive && (
            <button
              onClick={handleCloseThread}
              className="inline-flex items-center px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors self-start sm:self-auto text-sm"
            >
              <FaLock className="mr-1.5 h-3.5 w-3.5" />
              Close Thread
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center text-emerald-500 dark:text-emerald-300 mr-2">
              {thread.creator?.substr(2, 2).toUpperCase()}
            </span>
            <span>{formatAddress(thread.creator)}</span>
          </div>
          
          <div className="flex items-center">
            <span className="bg-gray-100 dark:bg-gray-700 rounded-full w-1 h-1 mx-2"></span>
            <span>{formatDistance(new Date(thread.timestamp * 1000), new Date(), { addSuffix: true })}</span>
          </div>
          
          {!thread.isActive && (
            <div className="flex items-center">
              <span className="bg-gray-100 dark:bg-gray-700 rounded-full w-1 h-1 mx-2"></span>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-full text-xs">
                Closed
              </span>
            </div>
          )}
        </div>
        
        {/* Display initial message if available */}
        {thread.initialMessage && thread.initialMessage.trim() && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
            <div className="font-medium text-emerald-700 dark:text-emerald-300 text-sm mb-2">
              Initial Message
            </div>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
              {thread.initialMessage}
            </div>
          </div>
        )}
      </div>
      
      {/* Messages section - flex-grow to take available space */}
      <div className="flex-grow overflow-y-auto">
        <div className="space-y-4 mb-6">
          {!messages || messages.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No messages yet. Be the first to post!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`p-4 rounded-lg border transition-all ${
                  message.sender.toLowerCase() === thread.creator.toLowerCase()
                    ? 'bg-white dark:bg-gray-800 border-l-4 border-l-emerald-500 border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-t-gray-700 dark:border-r-gray-700 dark:border-b-gray-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                      message.sender.toLowerCase() === thread.creator.toLowerCase()
                        ? 'bg-emerald-500'
                        : 'bg-gray-500'
                    }`}>
                      {message.sender.substr(2, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {formatAddress(message.sender)}
                        {message.sender.toLowerCase() === thread.creator.toLowerCase() && (
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            Author
                          </span>
                        )}
                        {message.sender.toLowerCase() === currentAddress?.toLowerCase() && message.sender.toLowerCase() !== thread.creator.toLowerCase() && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistance(new Date(message.timestamp * 1000), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLikeMessage(message.id)}
                      disabled={message.hasLiked}
                      className={`flex items-center gap-2 px-2 py-1 rounded-full ${
                        message.hasLiked 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-500' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                      }`}
                    >
                      {message.hasLiked ? <FaHeart className="h-3.5 w-3.5" /> : <FaRegHeart className="h-3.5 w-3.5" />}
                      <span className="text-xs font-medium">{message.likes || 0}</span>
                    </button>
                  </div>
                </div>
                
                <div className="pl-11 text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Reply section - Wallet connection prompt or PostMessage */}
      <div className="mt-auto pt-4">
        {thread.isActive ? (
          !isWalletReady ? (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-gray-700 dark:text-gray-300 mb-3">
                <p className="mb-2">Connect your wallet to join the conversation</p>
              </div>
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                {isConnecting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaWallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          ) : (
            <PostMessage 
              onPost={handlePostMessage}
              isReplying={isReplying}
              error={replyError}
            />
          )
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30 text-center">
            <p className="text-amber-700 dark:text-amber-300 text-sm">This thread is closed. New messages cannot be posted.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadDetail;