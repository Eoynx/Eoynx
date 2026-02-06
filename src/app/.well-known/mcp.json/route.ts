import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com';

  return NextResponse.json({
    name: 'eoynx-mcp',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    endpoint: `${baseUrl}/api/agent/mcp`,
    documentation: `${baseUrl}/api/ai-manifest.json`,
    health: `${baseUrl}/api/agent/health`,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}