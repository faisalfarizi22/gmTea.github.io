import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { 
  connectWallet, 
  switchToTeaSepolia, 
  getContract, 
  isWalletConnected as checkWalletConnected 
} from "@/utils/web3"; 
import { resetBlockchainErrorState } from "@/utils/badgeWeb3";

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

  useEffect(() => {
    const checkConnection = async () => {
      const wasConnected = localStorage.getItem("walletConnected") === "true";
      const storedAddress = localStorage.getItem("walletAddress");
      
      if (wasConnected && storedAddress) {
        const isStillConnected = await checkWalletConnected();
        
        if (isStillConnected) {
          handleConnectWallet();
        } else {
          localStorage.removeItem("walletConnected");
          localStorage.removeItem("walletAddress");
        }
      }
    };
    
    checkConnection();
  }, []);

  const handleConnectWallet = useCallback(async () => {
    if (web3State.isLoading) return;

    try {
      console.log("Connecting wallet...");
      setWeb3State((prev) => ({ ...prev, isLoading: true, error: null }));

      if (typeof resetBlockchainErrorState === 'function') {
        resetBlockchainErrorState();
      }

      const result = await connectWallet();

      if (!result || !result.address) {
        throw new Error("Failed to connect: No address returned");
      }

      const { signer, address, chainId, provider } = result;
      const contract = getContract(signer);

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

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletAddress", address);

      console.log("Wallet connected successfully:", address);
      return true;
    } catch (error: any) {
      console.error("Error connecting wallet:", error);

      setWeb3State((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error.message || "Failed to connect wallet",
      }));

      localStorage.removeItem("walletConnected");
      localStorage.removeItem("walletAddress");
      return false;
    }
  }, [web3State.isLoading]);

  const handleDisconnectWallet = useCallback(() => {
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

    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletAddress");

    console.log("Wallet disconnected");
  }, []);

  const handleSwitchNetwork = useCallback(async () => {
    try {
      setWeb3State((prev) => ({ ...prev, isLoading: true }));
      
      await switchToTeaSepolia();
      
      await handleConnectWallet();
      
      return true;
    } catch (error) {
      console.error("Error switching network:", error);
      setWeb3State((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [handleConnectWallet]);

  return {
    web3State,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,
    switchNetwork: handleSwitchNetwork
  };
}

export default useWalletState;