import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbFix from './dbFix';

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes('/api/leaderboard') || 
      request.nextUrl.pathname.includes('/api/users')) {
    
    const response = NextResponse.next();
    
    const req = {
      url: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams)
    };
    
    const res = {
      setHeader: () => {} 
    };
    
    dbFix(req as any, res as any, () => {
    });
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/leaderboard/:path*', '/api/users/:path*'],
};