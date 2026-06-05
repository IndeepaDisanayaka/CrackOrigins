import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting
// Note: This works for single-instance deployments. For distributed systems, use Redis.
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

export function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    
    // Explicitly check path to avoid interfering with other routes like /api/auth
    if (!pathname.startsWith('/api/external')) {
      return NextResponse.next();
    }
    
    // 1. Rate Limiting Check (5 requests per minute)
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const limitInfo = rateLimitMap.get(ip);

    if (limitInfo && now < limitInfo.resetTime) {
      if (limitInfo.count >= 5) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded. Maximum 5 requests per minute allowed.' 
          },
          { status: 429 }
        );
      }
      limitInfo.count++;
    } else {
      // Initialize or Reset limit
      rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    }

    // 2. Security Key Validation
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    const VALID_API_KEY = process.env.EXTERNAL_API_SECRET || '21e5caaf781bbbea00e4af909a724253';

    if (apiKey !== VALID_API_KEY && authHeader !== `Bearer ${VALID_API_KEY}`) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access Denied: Invalid Security Credentials' 
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware Error: ", error);
    return NextResponse.next();
  }
}

// Ensure middleware only runs on relevant paths
export const config = {
  matcher: ['/api/external/:path*'],
};
