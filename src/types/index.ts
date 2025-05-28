import { ethers } from "ethers";

// Web3 State Interface
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

// Checkin Stats Interface
export interface CheckinStats {
  timeUntilNextCheckin: number;
  lastCheckinTime?: number;
  totalCheckins?: number;
  canCheckin?: boolean;
}

// Chain Configuration Interface
export interface ChainConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  contractAddress: string;
  logo: string;
  status: string;
}

// Navigation Event Interface
export interface NavigationEvent {
  tab: string;
  subtab?: string;
}

// Audio Player State Interface
export interface AudioState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTrack: number;
  isVisible: boolean;
}

// Ambient Sound Configuration
export interface AmbientSound {
  name: string;
  description: string;
  icon: string;
  frequency: number;
  type: OscillatorType;
}

// Theme Type
export type Theme = 'light' | 'dark';

// Notification Interface
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// Contract Transaction Response
export interface ContractTransactionResponse {
  hash: string;
  wait: () => Promise<ethers.providers.TransactionReceipt>;
}

// Navigator Metrics from Smart Contract
export interface NavigatorMetrics {
  lastBeacon: ethers.BigNumber;
  crystalCount: ethers.BigNumber;
  nextResetTime: ethers.BigNumber;
  canActivate: boolean;
  currentStreak: ethers.BigNumber;
  maxStreak: ethers.BigNumber;
  firstBeaconDay: ethers.BigNumber;
  totalDaysActive: ethers.BigNumber;
}