// Vercel Edge Function for AI Clothing Detection
// POST /api/detect-clothing

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image, type } = await req.json();
    
    // image: base64 encoded image
    // type: 'closet' | 'flatlay' | 'single'

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = getSystemPrompt(type);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image.replace(/^data:image\/\w+;base64,/, ''),
                },
              },
              {
                type: 'text',
                text: 'Analyze this image and identify all clothing items. Return ONLY valid JSON.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({ items, raw: text }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Try object format
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      const items = parsed.items || [parsed];
      return new Response(JSON.stringify({ items, raw: text }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ items: [], raw: text, error: 'Could not parse items' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Detection error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function getSystemPrompt(type) {
  const basePrompt = `You are a fashion AI that analyzes clothing images. 
Identify each distinct clothing item and return structured data.

For EACH item found, provide:
- name: Descriptive name (e.g., "Navy Blue Oxford Shirt")
- category: One of [tops, bottoms, outerwear, shoes, accessories]
- colors: Array of colors (e.g., ["navy", "white"])
- style: One of [casual, formal, smart-casual, athletic, evening]
- pattern: One of [solid, striped, plaid, floral, printed, other]
- material: Best guess (e.g., "cotton", "denim", "wool", "leather")
- confidence: 0-100 how confident you are

Return ONLY a JSON array, no other text. Example:
[
  {
    "name": "Navy Blue Oxford Shirt",
    "category": "tops",
    "colors": ["navy"],
    "style": "smart-casual",
    "pattern": "solid",
    "material": "cotton",
    "confidence": 95
  }
]`;

  if (type === 'closet') {
    return basePrompt + `

This is a photo of an open closet or wardrobe. Identify ALL visible clothing items.
Look for items hanging, folded, or stored. Be thorough - users want a complete inventory.
If items are partially visible or overlapping, still try to identify them.`;
  }

  if (type === 'flatlay') {
    return basePrompt + `

This is a flat lay photo with multiple clothing items laid out.
Identify each distinct item separately. Items should be clearly visible.`;
  }

  // Single item
  return basePrompt + `

This is a photo of a single clothing item or outfit.
If it's an outfit with multiple pieces, identify each piece separately.`;
}
