import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaPlus, FaSpinner, FaTimes, FaInfoCircle, FaLock, FaComment } from 'react-icons/fa';
import ForumList from './ForumList';
import CreateThreadModal from '@/components/CreateThreadModal';
import ThreadDetail from '@/components/ThreadDetail';
import { useGMTeaChat } from '@/hooks/useGMTeaChat';
import { ethers } from 'ethers';

interface ForumOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForumOverlay: React.FC<ForumOverlayProps> = ({ isOpen, onClose }) => {
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreads, setActiveThreads] = useState<any[]>([]);
  const [inactiveThreads, setInactiveThreads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contractConfig, setContractConfig] = useState<any>(null);
  
  const { getThreads, createThread, getContractConfig } = useGMTeaChat();
  
  // Load threads when overlay opens
  useEffect(() => {
    const loadThreads = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        // Load contract configuration
        const config = await getContractConfig();
        setContractConfig(config);
        
        // Load threads
        const result = await getThreads(0, 100);
        if (result) {
          setThreads(result);
          
          // Sort threads by status and timestamp (newest first)
          const active = result.filter((thread: any) => thread.isActive);
          const inactive = result.filter((thread: any) => !thread.isActive);
          
          // Sort by timestamp descending
          active.sort((a: any, b: any) => b.timestamp - a.timestamp);
          inactive.sort((a: any, b: any) => b.timestamp - a.timestamp);
          
          setActiveThreads(active);
          setInactiveThreads(inactive);
        }
      } catch (error) {
        console.error("Error loading threads:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThreads();
  }, [isOpen, getThreads, getContractConfig]);
  
  const handleCreateThread = async (title: string, initialMessage: string) => {
    try {
      // First, create the thread with initialMessage included
      const threadId = await createThread(title, initialMessage);
      setIsModalOpen(false);
      
      if (!threadId) {
        console.error("Failed to get thread ID");
        return;
      }
      
      // Navigate to the newly created thread
      setActiveThreadId(threadId);
      
      // Reload threads in the background
      const result = await getThreads(0, 100);
      if (result) {
        setThreads(result);
        
        // Sort by timestamp descending
        const active = result
          .filter((thread: any) => thread.isActive)
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
        
        const inactive = result
          .filter((thread: any) => !thread.isActive)
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
        
        setActiveThreads(active);
        setInactiveThreads(inactive);
      }
    } catch (error) {
      console.error("Error creating thread:", error);
    }
  };
  
  const handleThreadClick = (threadId: number) => {
    setActiveThreadId(threadId);
  };
  
  const handleBackToList = () => {
    setActiveThreadId(null);
    
    // Refresh threads list when returning from a thread view
    const refreshThreads = async () => {
      try {
        const result = await getThreads(0, 100);
        if (result) {
          setThreads(result);
          
          // Sort by timestamp descending
          const active = result
            .filter((thread: any) => thread.isActive)
            .sort((a: any, b: any) => b.timestamp - a.timestamp);
          
          const inactive = result
            .filter((thread: any) => !thread.isActive)
            .sort((a: any, b: any) => b.timestamp - a.timestamp);
          
          setActiveThreads(active);
          setInactiveThreads(inactive);
        }
      } catch (error) {
        console.error("Error refreshing threads:", error);
      }
    };
    
    refreshThreads();
  };
  
  if (!isOpen) return null;
  
  // Format fee display
  const formatFee = (fee: any) => {
    if (!fee) return "1 TEA";
    try {
      return `${ethers.utils.formatEther(fee)} TEA`;
    } catch (e) {
      return "1 TEA";
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden backdrop-blur-sm bg-gray-900/75">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" onClick={onClose}></div>
        
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
          <div className="pointer-events-auto w-screen max-w-2xl">
            <div className="flex h-full flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 shadow-2xl border-l border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  {activeThreadId !== null ? (
                    <button 
                      onClick={handleBackToList} 
                      className="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 p-2 rounded-full transition-colors"
                    >
                      <FaChevronLeft className="h-5 w-5" />
                    </button>
                  ) : null}
                  
                  {activeThreadId !== null ? 'Thread Discussion' : 'Community Forum'}
                </h2>
                
                <div className="flex items-center">
                  {!activeThreadId && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="mr-3 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm hover:shadow transition-all"
                    >
                      <FaPlus className="mr-2 h-4 w-4" />
                      New Thread
                    </button>
                  )}
                  
                  <button 
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 p-2 rounded-full transition-colors"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full border-b-2 border-t-2 border-emerald-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-emerald-500"></div>
                      </div>
                    </div>
                  </div>
                ) : activeThreadId !== null ? (
                  <ThreadDetail 
                    threadId={activeThreadId} 
                    isOverlay={true}
                    onThreadClosed={handleBackToList}
                  />
                ) : (
                  <>
                    <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <FaInfoCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div className="text-emerald-800 dark:text-emerald-200">
                            <p className="font-semibold mb-2">Forum Rules:</p>
                            <ul className="space-y-1.5 text-sm">
                              <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                <span>Creating a new thread costs <span className="font-medium">{contractConfig?.threadCreationFee ? formatFee(contractConfig.threadCreationFee) : "1 TEA"}</span> and requires at least <span className="font-medium">{contractConfig?.threadCreationCheckinsRequired || 2}</span> check-ins.</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                <span>Replying to threads is <span className="font-semibold text-emerald-600 dark:text-emerald-300">completely free</span> - you only need {contractConfig?.minimumCheckinsRequired || 1} check-in.</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                <span>Be respectful and follow community guidelines.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {activeThreads.length > 0 && (
                      <div className="mb-10">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mr-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            </div>
                            Active Discussions
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{activeThreads.length} threads</span>
                        </div>
                        <ForumList 
                          threads={activeThreads} 
                          onThreadClick={handleThreadClick}
                          isOverlay={true}
                        />
                      </div>
                    )}
                    
                    {inactiveThreads.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 mr-2">
                              <FaLock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            </div>
                            Closed Discussions
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{inactiveThreads.length} threads</span>
                        </div>
                        <ForumList 
                          threads={inactiveThreads}
                          onThreadClick={handleThreadClick}
                          isOverlay={true}
                        />
                      </div>
                    )}
                    
                    {threads.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                          <FaComment className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No discussions yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                          Be the first to start a discussion in this community!
                        </p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="inline-flex items-center px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-sm hover:shadow transition-all"
                        >
                          <FaPlus className="mr-2" />
                          Create the First Thread
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CreateThreadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateThread}
      />
    </div>
  );
};

export default ForumOverlay;