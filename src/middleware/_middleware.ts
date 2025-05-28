// src/pages/_middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbFix from './dbFix';

// Middleware untuk aplikasi Next.js
export default function middleware(request: NextRequest) {
  // Cek apakah request ke endpoint API leaderboard atau users
  if (request.nextUrl.pathname.includes('/api/leaderboard') || 
      request.nextUrl.pathname.includes('/api/users')) {
    
    // Buat objek response
    const response = NextResponse.next();
    
    // Konversi req dan res untuk kompatibilitas dengan middleware dbFix
    const req = {
      url: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams)
    };
    
    const res = {
      setHeader: () => {} // Mock function
    };
    
    // Panggil middleware dbFix
    dbFix(req as any, res as any, () => {
      // Tidak perlu melakukan apa-apa di sini karena kita hanya 
      // ingin menjalankan logika dbFix, bukan memodifikasi response
    });
    
    return response;
  }
  
  // Lanjutkan untuk request lain
  return NextResponse.next();
}

// Konfigurasi middleware untuk dijalankan hanya pada path tertentu
export const config = {
  matcher: ['/api/leaderboard/:path*', '/api/users/:path*'],
};