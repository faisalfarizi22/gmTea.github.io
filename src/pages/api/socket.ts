// src/pages/api/socket.ts
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { createAdapter } from '@socket.io/redis-adapter';

// Interface untuk memperluas tipe socket server di Next.js
interface ServerWithIO {
  io?: Server;
}

interface SocketWithServer {
  server: ServerWithIO;
}

// Create Redis client for Socket.IO with Upstash Redis
const pubClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

// Membuat instance baru untuk subClient
const subClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

// Keep track of active socket connections
let io: Server;

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!res.socket) {
    res.status(500).end();
    return;
  }
  
  // Type assertion untuk socket dan server
  const socket = res.socket as unknown as SocketWithServer;
  
  // Periksa apakah server.io sudah ada
  if (socket.server.io) {
    io = socket.server.io;
    res.end();
    return;
  }

  // Create a new Socket.IO server
  const httpServer = socket.server as any;
  
  io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST']
    },
    adapter: createAdapter(pubClient, subClient),
    // Short ping timeout for serverless environment
    pingTimeout: 20000,
  });
  
  // Simpan instance io di server
  socket.server.io = io;

  // Set up socket event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Subscribe to specific user updates
    socket.on('subscribe', (address: string) => {
      // Join a room named after the user's address
      address = address.toLowerCase();
      socket.join(address);
      console.log(`Client ${socket.id} subscribed to updates for ${address}`);
    });

    // Unsubscribe from user updates
    socket.on('unsubscribe', (address: string) => {
      address = address.toLowerCase();
      socket.leave(address);
      console.log(`Client ${socket.id} unsubscribed from updates for ${address}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  res.end();
}

// Helper function to emit update events to clients
export function emitUserUpdate(address: string, updateType: string, data: any) {
  if (!io) return;
  
  address = address.toLowerCase();
  io.to(address).emit('user-update', { type: updateType, data });
}

// Helper function to emit global updates (e.g., new checkins to leaderboard)
export function emitGlobalUpdate(updateType: string, data: any) {
  if (!io) return;
  
  io.emit('global-update', { type: updateType, data });
}