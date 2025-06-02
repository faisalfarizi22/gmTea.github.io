import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useActiveWalletConnectionStatus, useActiveAccount } from "thirdweb/react"; 

interface UpdateData {
  type: string;
  data: any;
}

export function useRealtimeUpdates(
  onUserUpdate?: (type: string, data: any) => void,
  onGlobalUpdate?: (type: string, data: any) => void
) {
  const connectionStatus = useActiveWalletConnectionStatus(); 
  const account = useActiveAccount(); 
  const address = account?.address || null; 
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      try {
        
        await fetch('/api/socket');
        
        const socketInstance = io({
          path: '/api/socket',
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected');
          setConnected(true);
          
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

  useEffect(() => {
    if (socket && address) {
      socket.emit('unsubscribe', address);
      
      socket.emit('subscribe', address);
    }
  }, [socket, address]);

  return { 
    connected,
    isConnected: connectionStatus === "connected"
  };
}

export default useRealtimeUpdates;