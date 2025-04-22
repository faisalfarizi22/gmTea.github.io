import { useEffect, useRef } from 'react';

type EthereumEventCallback = (...args: any[]) => void;

interface EthereumEventMap {
  accountsChanged: (accounts: string[]) => void;
  chainChanged: (chainId: string) => void;
  connect: (connectInfo: { chainId: string }) => void;
  disconnect: (error: { code: number; message: string }) => void;
  message: (message: { type: string; data: unknown }) => void;
}

/**
 * Hook to properly handle Ethereum provider events
 */
export function useEthereumEvents(eventCallbacks: Partial<EthereumEventMap>) {
  const callbacksRef = useRef(eventCallbacks);
  
  // Update ref when callbacks change
  useEffect(() => {
    callbacksRef.current = eventCallbacks;
  }, [eventCallbacks]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.warn('No Ethereum provider found. Events will not be registered.');
      return;
    }
    
    // Create stable event handlers that reference the latest callbacks
    const handlers = {
      accountsChanged: (accounts: string[]) => {
        console.log('accountsChanged event:', accounts);
        callbacksRef.current.accountsChanged?.(accounts);
      },
      chainChanged: (chainId: string) => {
        console.log('chainChanged event:', chainId);
        callbacksRef.current.chainChanged?.(chainId);
      },
      connect: (connectInfo: { chainId: string }) => {
        console.log('connect event:', connectInfo);
        callbacksRef.current.connect?.(connectInfo);
      },
      disconnect: (error: { code: number; message: string }) => {
        console.log('disconnect event:', error);
        callbacksRef.current.disconnect?.(error);
      },
      message: (message: { type: string; data: unknown }) => {
        console.log('message event:', message);
        callbacksRef.current.message?.(message);
      },
    };
    
    // Register all event handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      ethereum.on(event, handler);
    });
    
    // Cleanup function
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        ethereum.removeListener(event, handler);
      });
    };
  }, []);
}