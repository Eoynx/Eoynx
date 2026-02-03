/**
 * Agent Gateway - Health Check 엔드포인트
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Edge Runtime에서 uptime 추적용
const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'agent-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000) + 's',
    services: {
      gateway: 'operational',
      authentication: 'operational',
      mcp: 'operational',
      streaming: 'operational',
    },
  });
}
