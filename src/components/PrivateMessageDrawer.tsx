import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaPaperPlane, FaPlus, FaSpinner, FaTimes } from 'react-icons/fa';
import { formatDistance } from 'date-fns';
import { formatAddress } from '@/utils/web3';
import NewMessageModal from '@/components/NewMessageModal';
import { useGMTeaChat, SimpleMessage } from '@/hooks/useGMTeaChat';

interface PrivateMessageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivateMessageDrawer: React.FC<PrivateMessageDrawerProps> = ({ isOpen, onClose }) => {
  const [activePartner, setActivePartner] = useState<string | null>(null);
  const [partners, setPartners] = useState<string[]>([]);
  const [conversations, setConversations] = useState<{ [key: string]: SimpleMessage[] }>({});
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [maxMessageLength, setMaxMessageLength] = useState<number>(500);
  
  const { getConversationPartners, getConversation, sendPrivateMessage, getContractConfig } = useGMTeaChat();
  
  // Load current address
  useEffect(() => {
    const address = localStorage.getItem("walletAddress");
    if (address) {
      setCurrentAddress(address);
    }
  }, []);
  
  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getContractConfig();
        if (config) {
          setMaxMessageLength(config.maxPrivateMessageLength);
        }
      } catch (error) {
        console.error("Error loading contract config:", error);
      }
    };
    
    loadConfig();
  }, [getContractConfig]);
  
  // Load conversation partners
  useEffect(() => {
    const loadPartners = async () => {
      if (!isOpen || !currentAddress) return;
      
      setIsLoading(true);
      try {
        const partnersList = await getConversationPartners();
        setPartners(partnersList);
        
        // Load first few conversations to show previews
        const conversationsData: { [key: string]: SimpleMessage[] } = {};
        
        for (const partner of partnersList.slice(0, 5)) {
          try {
            const messages = await getConversation(partner);
            conversationsData[partner.toLowerCase()] = messages;
          } catch (error) {
            console.error(`Error loading conversation with ${partner}:`, error);
          }
        }
        
        setConversations(conversationsData);
      } catch (error) {
        console.error("Error loading conversation partners:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPartners();
  }, [isOpen, currentAddress, getConversationPartners, getConversation]);
  
  // Load active conversation
  useEffect(() => {
    const loadActiveConversation = async () => {
      if (!activePartner) return;
      
      try {
        const messages = await getConversation(activePartner);
        setConversations(prev => ({
          ...prev,
          [activePartner.toLowerCase()]: messages
        }));
      } catch (error) {
        console.error(`Error loading conversation with ${activePartner}:`, error);
      }
    };
    
    loadActiveConversation();
  }, [activePartner, getConversation]);
  
  const handleSendMessage = async () => {
    if (!activePartner || !newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendPrivateMessage(activePartner, newMessage);
      
      // Clear input
      setNewMessage('');
      
      // Reload conversation
      const messages = await getConversation(activePartner);
      setConversations(prev => ({
        ...prev,
        [activePartner.toLowerCase()]: messages
      }));
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleStartNewChat = async (recipient: string, message: string) => {
    setIsNewMessageModalOpen(false);
    
    try {
      await sendPrivateMessage(recipient, message);
      
      // Load partners again to include the new one
      const partnersList = await getConversationPartners();
      setPartners(partnersList);
      
      // Reload conversation
      const messages = await getConversation(recipient);
      setConversations(prev => ({
        ...prev,
        [recipient.toLowerCase()]: messages
      }));
      
      // Set as active partner
      setActivePartner(recipient);
    } catch (error) {
      console.error("Error starting new chat:", error);
    }
  };
  
  // Helper function to get the most recent message for a partner
  const getLastMessage = (partner: string): SimpleMessage | null => {
    const conversation = conversations[partner.toLowerCase()];
    if (!conversation || conversation.length === 0) return null;
    
    // Get most recent message (based on timestamp)
    return conversation.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl transition-transform transform-gpu duration-300 ease-in-out" 
         style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            {activePartner ? (
              <button 
                onClick={() => setActivePartner(null)} 
                className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaChevronLeft />
              </button>
            ) : null}
            
            {activePartner 
              ? `Chat with ${formatAddress(activePartner)}`
              : 'Messages'
            }
          </h2>
          
          <div className="flex items-center">
            {!activePartner && (
              <button
                onClick={() => setIsNewMessageModalOpen(true)}
                className="mr-3 text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <FaPlus />
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <FaSpinner className="animate-spin text-emerald-500" />
          </div>
        ) : activePartner ? (
          <>
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {!conversations[activePartner.toLowerCase()] || conversations[activePartner.toLowerCase()].length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400 text-center">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversations[activePartner.toLowerCase()].map((msg, index) => {
                    const isOwn = msg.sender.toLowerCase() === currentAddress?.toLowerCase();
                    
                    return (
                      <div 
                        key={index}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] px-4 py-2 rounded-lg ${
                            isOwn 
                              ? 'bg-emerald-500 text-white rounded-br-none' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 text-right ${
                            isOwn ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatDistance(new Date(msg.timestamp * 1000), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Message Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                  maxLength={maxMessageLength}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-r-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {newMessage.length}/{maxMessageLength}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {partners.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4">
                  <p className="text-gray-500 dark:text-gray-400 text-center mb-4">No messages yet. Start a conversation!</p>
                  <button
                    onClick={() => setIsNewMessageModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <FaPlus className="mr-2" />
                    New Message
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {partners.map((partner) => {
                    const lastMessage = getLastMessage(partner);
                    
                    return (
                      <div
                        key={partner}
                        onClick={() => setActivePartner(partner)}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      >
                        <div className="flex items-center mb-1">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center mr-3 font-medium">
                            {partner.substr(2, 2).toUpperCase()}
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {formatAddress(partner)}
                          </h3>
                          {lastMessage && (
                            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                              {formatDistance(new Date(lastMessage.timestamp * 1000), new Date(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        
                        {lastMessage && (
                          <div className="pl-11">
                            <p className="text-sm truncate text-gray-500 dark:text-gray-400">
                              {lastMessage.content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        onSend={handleStartNewChat}
        maxLength={maxMessageLength}
      />
    </div>
  );
};

export default PrivateMessageDrawer;