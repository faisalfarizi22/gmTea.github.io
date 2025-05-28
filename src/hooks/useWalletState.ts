import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { 
  getContract, 
  getCurrentChainId,
  isChainSupported,
  getChainConfig
} from "@/utils/web3";
import { useEthereumEvents } from "./useEthereumEvents";

export interface Web3State {
  isConnected: boolean;
  address: string | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  contract: ethers.Contract | null;
  isLoading: boolean;
  error: string | null;
  chainId: number | null;
}

export function useWalletState() {
  const [web3State, setWeb3State] = useState<Web3State>({
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    contract: null,
    isLoading: false,
    error: null,
    chainId: null,
  });

  // Check wallet connection on initial load
  useEffect(() => {
    const checkConnection = async () => {
      const wasConnected = localStorage.getItem("walletConnected") === "true";
      const storedAddress = localStorage.getItem("walletAddress");
      
      if (wasConnected && storedAddress) {
        // Check if wallet is still connected
        const isStillConnected = await checkWalletConnected();
        
        if (isStillConnected) {
          handleConnectWallet();
        } else {
          // Clean up localStorage if wallet is not connected anymore
          localStorage.removeItem("walletConnected");
          localStorage.removeItem("walletAddress");
        }
      }
    };
    
    checkConnection();
  }, []);

  // Gunakan custom hook untuk event handling
  useEthereumEvents({
    accountsChanged: (accounts) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        handleDisconnectWallet();
      } else if (accounts[0] !== web3State.address) {
        handleConnectWallet();
      }
    },
    chainChanged: (chainId) => {
      console.log('Chain changed:', chainId);
      // Refresh the connection to update contract and chain info
      if (web3State.isConnected) {
        handleConnectWallet();
      }
    }
  });

  // Check if wallet is connected (works with thirdweb)
  const checkWalletConnected = async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;
      
      const ethereum = (window as any).ethereum;
      if (!ethereum) return false;
      
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error("Error checking wallet connection:", error);
      return false;
    }
  };

  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return false;

    try {
      console.log("Connecting wallet...");
      setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check if window.ethereum is available (should be after thirdweb connection)
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error("No Ethereum provider found. Please connect your wallet first.");
      }

      const ethereum = window.ethereum;
      
      // Get accounts (should already be connected via thirdweb)
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      
      if (!accounts || accounts.length === 0) {
        // If no accounts, request them (fallback)
        const requestedAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (!requestedAccounts || requestedAccounts.length === 0) {
          throw new Error("No accounts returned from wallet");
        }
      }

      // Create provider and signer
      const provider = new ethers.providers.Web3Provider(ethereum, "any");
      const signer = provider.getSigner();
      const address = accounts[0] || await signer.getAddress();
      
      // Get network info
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      
      // Get contract for the current chain
      const contract = getContract(signer, chainId);

      // Update state
      setWeb3State({
        isConnected: true,
        address,
        provider,
        signer,
        contract,
        isLoading: false,
        error: null,
        chainId,
      });

      // Store connection info in localStorage
      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletAddress", address);

      console.log("Wallet connected successfully:", address, "Chain:", chainId);
      return true;
    } catch (error: any) {
      console.error("Error connecting wallet:", error);

      setWeb3State((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error.message || "Failed to connect wallet",
      }));

      // Clear any stored connection data
      localStorage.removeItem("walletConnected");
      localStorage.removeItem("walletAddress");
      return false;
    }
  }, [web3State.isLoading]);

  const handleDisconnectWallet = useCallback(() => {
    // Reset web3 state
    setWeb3State({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      contract: null,
      isLoading: false,
      error: null,
      chainId: null,
    });

    // Clear local storage
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletAddress");

    console.log("Wallet disconnected");
  }, []);

  const handleSwitchNetwork = useCallback(async (targetChainId?: number) => {
    try {
      setWeb3State((prev) => ({ ...prev, isLoading: true }));
      
      if (!targetChainId) {
        targetChainId = 10218; // Tea Sepolia Chain ID as default
      }
      
      const chainConfig = getChainConfig(targetChainId);
      if (!chainConfig) {
        throw new Error(`Unsupported chain ID: ${targetChainId}`);
      }

      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error("No Ethereum provider found");
      }

      // Buat objek baru dengan hanya properti standar EIP-3085
      const standardChainConfig = {
        chainId: chainConfig.chainId,
        chainName: chainConfig.chainName,
        nativeCurrency: chainConfig.nativeCurrency,
        rpcUrls: chainConfig.rpcUrls,
        blockExplorerUrls: chainConfig.blockExplorerUrls
      };

      try {
        // Try to switch to the chain
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainConfig.chainId }],
        });
      } catch (switchError: any) {
        // If chain is not added, add it
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [standardChainConfig], // Gunakan config yang sudah difilter
          });
        } else {
          throw switchError;
        }
      }
      
      // Reconnect wallet after network switch to update contract
      await handleConnectWallet();
      
      return true;
    } catch (error) {
      console.error("Error switching network:", error);
      setWeb3State((prev) => ({ 
        ...prev, 
        isLoading: false,
        error: `Failed to switch network: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      return false;
    }
  }, [handleConnectWallet]);

  const isOnSupportedNetwork = useCallback(() => {
    return web3State.chainId ? isChainSupported(web3State.chainId) : false;
  }, [web3State.chainId]);

  const getCurrentChainInfo = useCallback(() => {
    return web3State.chainId ? getChainConfig(web3State.chainId) : null;
  }, [web3State.chainId]);

  return {
    web3State,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,
    switchNetwork: handleSwitchNetwork,
    isOnSupportedNetwork,
    getCurrentChainInfo
  };
}