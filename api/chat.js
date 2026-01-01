// Vercel Edge Function for AI Chat using Vercel AI Gateway
// POST /api/chat

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

export const config = {
  runtime: 'edge',
};

// Configure Anthropic with AI Gateway
const anthropic = createAnthropic({
  baseURL: 'https://gateway.ai.vercel.sh/v1/anthropic',
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { messages, system, max_tokens = 1000 } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: system || 'You are a helpful AI fashion stylist.',
      messages,
      maxTokens: max_tokens,
    });

    // Convert stream to text for compatibility with existing frontend
    let fullText = '';
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }

    // Return in same format as before for frontend compatibility
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: fullText }],
      usage: await result.usage,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
