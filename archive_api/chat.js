// Vercel Edge Function - runs at the edge, very fast
// This keeps your Anthropic API key secure on the server

export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  try {
    const body = await req.json()
    
    // Rate limiting check (simple version - use Upstash Redis for production)
    // For MVP, we'll trust the client but add basic validation
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers }
      )
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: Math.min(body.max_tokens || 1000, 2000), // Cap tokens
        system: body.system,
        messages: body.messages,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Anthropic API error:', error)
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 502, headers }
      )
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), { headers })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    )
  }
}
