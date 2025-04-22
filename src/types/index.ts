export interface GMMessage {
    user: string;
    timestamp: number;
    message: string;
  }
  
  export interface UserCheckin {
    lastCheckinTime: number;
    checkinCount: number;
  }
  
  export interface Web3State {
    isConnected: boolean;
    address: string | null;
    provider: any;
    signer: any;
    contract: any;
    isLoading: boolean;
    error: string | null;
    chainId: number | null;
  }
  
  export interface CheckinStats {
    userCheckinCount: number;
    timeUntilNextCheckin: number;
  }