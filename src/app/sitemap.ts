import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eoynx.com'
  const now = new Date()
  
  return [
    // Main Pages
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    
    // API Documentation Pages
    {
      url: `${baseUrl}/docs/api`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/authentication`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/mcp`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    
    // AI Agent Discovery Files (for AI crawlers)
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ai.txt`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    
    // API Endpoints (for documentation/discovery)
    {
      url: `${baseUrl}/api/agent`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/api/agent/health`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/api/agent/mcp`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    
    // Legal Pages
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
