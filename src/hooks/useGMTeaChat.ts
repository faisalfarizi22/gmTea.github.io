import { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import GMTeaChatABI from '../abis/GMTeaChatABI.json';

export interface SimpleMessage {
  sender: string;
  content: string;
  timestamp: number;
}

export interface ForumMessage extends SimpleMessage {
  likes: number;
  hasLiked?: boolean;
}

export interface Thread {
  id: number;
  title: string;
  creator: string;
  timestamp: number;
  isActive: boolean;
  messageCount: number;
  initialMessage: string;
}

export interface GMTeaChatConfig {
  minimumCheckinsRequired: number;
  threadCreationCheckinsRequired: number;
  threadCreationFee: ethers.BigNumber;
  maxPrivateMessageLength: number;
  maxConversationHistory: number;
}

export const useGMTeaChat = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const contractAddress: string = process.env.NEXT_PUBLIC_GMTEACHAT_ADDRESS || "0x24e0......";
  
  const getProvider = useCallback((): ethers.providers.Web3Provider | null => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    }
    return null;
  }, []);
  
  const getThreads = useCallback(async (offset: number, limit: number): Promise<Thread[] | null> => {
    const provider = getProvider();
    if (!provider) return null;
    
    try {
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, provider);
      const [threads, total] = await contract.getThreads(offset, limit);
      
      return threads.map((thread: any, index: number) => ({
        id: offset + index,
        title: thread.title,
        creator: thread.creator,
        timestamp: Number(thread.timestamp),
        isActive: thread.isActive,
        messageCount: Number(thread.messageCount),
        initialMessage: thread.initialMessage
      }));
    } catch (err) {
      console.error("Error fetching threads:", err);
      setError("Failed to load threads");
      return null;
    }
  }, [contractAddress, getProvider]);
  
  const getThreadDetails = useCallback(async (threadId: number): Promise<Thread | null> => {
    try {
      const threads = await getThreads(threadId, 1);
      return threads?.[0] || null;
    } catch (err) {
      console.error("Error getting thread details:", err);
      return null;
    }
  }, [getThreads]);
  
  const getThreadMessages = useCallback(async (threadId: number, offset: number, limit: number): Promise<ForumMessage[]> => {
    const provider = getProvider();
    if (!provider) return [];
    
    try {
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, provider);
      const [messages, total] = await contract.getThreadMessages(threadId, offset, limit);
      
      let currentAddress: string | null = null;
      try {
        const accounts = await provider.listAccounts();
        if (accounts && accounts.length > 0) {
          currentAddress = accounts[0].toLowerCase();
        }
      } catch (e) {
        console.warn("Could not get current address:", e);
      }
      
      return messages.map((msg: any, index: number) => ({
        id: offset + index,
        sender: msg.sender,
        content: msg.content,
        timestamp: Number(msg.timestamp),
        likes: Number(msg.likes),
        hasLiked: false 
      }));
    } catch (err) {
      console.error("Error fetching thread messages:", err);
      return [];
    }
  }, [contractAddress, getProvider]);
  
  const getContractConfig = useCallback(async (): Promise<GMTeaChatConfig | null> => {
    const provider = getProvider();
    if (!provider) return null;
    
    try {
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, provider);
      
      let minimumCheckinsRequired = 1;
      let threadCreationCheckinsRequired = 2;
      let threadCreationFee = ethers.utils.parseEther("1");
      let maxPrivateMessageLength = 500;
      let maxConversationHistory = 100;
      
      try { minimumCheckinsRequired = await contract.minimumCheckinsRequired(); } 
      catch (e) { console.warn("Error getting minimumCheckinsRequired:", e); }
      
      try { threadCreationCheckinsRequired = await contract.threadCreationCheckinsRequired(); } 
      catch (e) { console.warn("Error getting threadCreationCheckinsRequired:", e); }
      
      try { threadCreationFee = await contract.threadCreationFee(); } 
      catch (e) { console.warn("Error getting threadCreationFee:", e); }
      
      try { maxPrivateMessageLength = await contract.maxPrivateMessageLength(); } 
      catch (e) { console.warn("Error getting maxPrivateMessageLength:", e); }
      
      try { maxConversationHistory = await contract.maxConversationHistory(); } 
      catch (e) { console.warn("Error getting maxConversationHistory:", e); }
      
      return {
        minimumCheckinsRequired: Number(minimumCheckinsRequired),
        threadCreationCheckinsRequired: Number(threadCreationCheckinsRequired),
        threadCreationFee,
        maxPrivateMessageLength: Number(maxPrivateMessageLength),
        maxConversationHistory: Number(maxConversationHistory)
      };
    } catch (err) {
      console.error("Error getting contract config:", err);
      return null;
    }
  }, [contractAddress, getProvider]);
  
  const createThread = useCallback(async (title: string, initialMessage: string = ""): Promise<number | null> => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
      setIsLoading(true);
      
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      let fee;
      try {
        fee = await contract.threadCreationFee();
      } catch (feeError) {
        console.error("Error getting thread creation fee:", feeError);
        fee = ethers.utils.parseEther("1"); 
      }
      
      const tx = await contract.createThread(title, initialMessage, { value: fee });
      const receipt = await tx.wait();
      
      let threadId = null;
      const threadCreatedEvent = receipt.events?.find(
        (event: any) => event.event === "ThreadCreated"
      );
      
      if (threadCreatedEvent && threadCreatedEvent.args) {
        threadId = Number(threadCreatedEvent.args.threadId);
      } else {
        const threads = await getThreads(0, 1);
        if (threads && threads.length > 0) {
          const [threadsResult, total] = await contract.getThreads(0, 0);
          if (total > 0) {
            threadId = Number(total) - 1;
          }
        }
      }
      
      return threadId;
    } catch (err: any) {
      console.error("Error creating thread:", err);
      
      if (err.message) {
        if (err.message.includes("check-ins")) {
          throw new Error("You need enough check-ins to create a thread");
        } else if (err.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds to pay the thread creation fee");
        }
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getProvider, getThreads]);
  
  const postToThread = useCallback(async (threadId: number, content: string): Promise<boolean> => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
      setIsLoading(true);
      
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      try {
        const thread = await getThreadDetails(threadId);
        if (!thread) throw new Error("Thread does not exist");
        if (!thread.isActive) throw new Error("Thread is closed");
      } catch (error) {
        console.error("Error checking thread status:", error);
      }
      
      const tx = await contract.postToThread(threadId, content);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error("Error posting to thread:", err);
      
      if (err.message) {
        if (err.message.includes("check-ins")) {
          throw new Error("You need at least one check-in to post messages");
        } else if (err.message.includes("Thread is closed")) {
          throw new Error("This thread is closed and doesn't accept new messages");
        } else if (err.message.includes("Thread does not exist")) {
          throw new Error("This thread no longer exists");
        }
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getProvider, getThreadDetails]);
  
  const likeMessage = useCallback(async (threadId: number, messageId: number): Promise<boolean> => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
      setIsLoading(true);
      
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      const tx = await contract.likeThreadMessage(threadId, messageId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error("Error liking message:", err);
      
      if (err.message && err.message.includes("Already liked")) {
        throw new Error("You have already liked this message");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getProvider]);
  
  const closeThread = useCallback(async (threadId: number): Promise<boolean> => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
      setIsLoading(true);
      
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      const tx = await contract.closeThread(threadId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error("Error closing thread:", err);
      
      if (err.message && err.message.includes("Not authorized")) {
        throw new Error("You are not authorized to close this thread");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getProvider]);
  
  const deleteThreadMessage = useCallback(async (threadId: number, messageId: number): Promise<boolean> => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
      setIsLoading(true);
      
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      const tx = await contract.deleteThreadMessage(threadId, messageId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error("Error deleting message:", err);
      
      if (err.message && err.message.includes("Not authorized")) {
        throw new Error("You are not authorized to delete this message");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getProvider]);
  
  const getConversation = useCallback(async (partnerAddress: string): Promise<SimpleMessage[]> => {
    const provider = getProvider();
    if (!provider) return [];
    
    try {
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      const messages = await contract.getConversation(partnerAddress);
      
      return messages.map((msg: any) => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: Number(msg.timestamp)
      }));
    } catch (err) {
      console.error("Error fetching conversation:", err);
      return [];
    }
  }, [contractAddress, getProvider]);

  const getConversationPartners = useCallback(async (): Promise<string[]> => {
    const provider = getProvider();
    if (!provider) return [];
    
    try {
      await provider.send("eth_requestAccounts", []);
      
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      try {
        return await contract.getConversationPartners();
      } catch (contractErr: any) {
        console.error("Contract error in getConversationPartners:", contractErr);
      
        return [];
      }
    } catch (err) {
      console.error("Error fetching conversation partners:", err);
      setError("Failed to load conversation partners");
      return [];
    }
  }, [contractAddress, getProvider]);
  
  const sendPrivateMessage = useCallback(async (recipient: string, content: string): Promise<boolean> => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
      setIsLoading(true);
      
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, GMTeaChatABI, signer);
      
      const contractConfig = await getContractConfig();
      if (contractConfig && content.length > contractConfig.maxPrivateMessageLength) {
        throw new Error(`Message too long. Maximum length is ${contractConfig.maxPrivateMessageLength} characters.`);
      }
      
      const tx = await contract.sendPrivateMessage(recipient, content);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error("Error sending private message:", err);
      
      if (err.message) {
        if (err.message.includes("check-ins")) {
          throw new Error("You need enough check-ins to send messages");
        } else if (err.message.includes("Recipient must be an active user")) {
          throw new Error("Recipient must have at least one check-in");
        }
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getProvider, getContractConfig]);
  
  return {
    isLoading,
    error,
    getThreads,
    getThreadDetails,
    getThreadMessages,
    createThread,
    postToThread,
    likeMessage,
    closeThread,
    deleteThreadMessage,
    getConversation,
    getConversationPartners,
    sendPrivateMessage,
    getContractConfig
  };
};

export default useGMTeaChat;