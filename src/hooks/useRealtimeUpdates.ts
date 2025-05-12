// src/hooks/useRealtimeUpdates.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useActiveWalletConnectionStatus, useActiveAccount } from "thirdweb/react"; // Updated ThirdWeb imports

interface UpdateData {
  type: string;
  data: any;
}

export function useRealtimeUpdates(
  onUserUpdate?: (type: string, data: any) => void,
  onGlobalUpdate?: (type: string, data: any) => void
) {
  const connectionStatus = useActiveWalletConnectionStatus(); // Get ThirdWeb connection status
  const account = useActiveAccount(); // Get active account
  const address = account?.address || null; // Get the address or null
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize the socket connection
    const initSocket = async () => {
      try {
        // First, ping the socket endpoint to initialize it on the server
        await fetch('/api/socket');
        
        // Then connect to the socket
        const socketInstance = io({
          path: '/api/socket',
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected');
          setConnected(true);
          
          // Subscribe to updates for the current user if logged in
          if (address) {
            socketInstance.emit('subscribe', address);
          }
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
          setConnected(false);
        });

        socketInstance.on('user-update', (data: UpdateData) => {
          console.log('User update received:', data);
          if (onUserUpdate) {
            onUserUpdate(data.type, data.data);
          }
        });

        socketInstance.on('global-update', (data: UpdateData) => {
          console.log('Global update received:', data);
          if (onGlobalUpdate) {
            onGlobalUpdate(data.type, data.data);
          }
        });

        setSocket(socketInstance);

        // Clean up function
        return () => {
          if (socketInstance) {
            socketInstance.disconnect();
          }
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initSocket();
  }, []);

  // Subscribe to user updates when address changes
  useEffect(() => {
    if (socket && address) {
      // Unsubscribe from previous address if any
      socket.emit('unsubscribe', address);
      
      // Subscribe to new address
      socket.emit('subscribe', address);
    }
  }, [socket, address]);

  return { 
    connected,
    isConnected: connectionStatus === "connected"
  };
}

export default useRealtimeUpdates;