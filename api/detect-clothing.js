// Vercel Edge Function for AI Clothing Detection using Vercel AI Gateway
// POST /api/detect-clothing

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

export const config = {
  runtime: 'edge',
  maxDuration: 300,
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
    const { image, type } = await req.json();
    
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = getSystemPrompt(type);
    
    // Ensure image has proper data URL format for Vercel AI SDK
    const imageUrl = image.startsWith('data:') 
      ? image 
      : `data:image/jpeg;base64,${image}`;

    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageUrl,
            },
            {
              type: 'text',
              text: 'Analyze this image carefully. For each clothing item, provide precise bounding box coordinates. Take your time to ensure accuracy. Return ONLY valid JSON array.',
            },
          ],
        },
      ],
      maxTokens: 4000,
    });

    const text = result.text || '';

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
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function getSystemPrompt(type) {
  const basePrompt = `You are a precision fashion AI that analyzes clothing images and provides EXACT bounding box locations.

CRITICAL INSTRUCTIONS FOR BOUNDING BOX ACCURACY:
1. Mentally divide the image into a 100x100 grid
2. For each item, identify the EXACT pixel boundaries
3. x = percentage from LEFT edge (0 = far left, 100 = far right)
4. y = percentage from TOP edge (0 = top, 100 = bottom)
5. width and height = size as percentage of total image dimensions
6. Boxes should be TIGHT around the visible garment only
7. Do NOT include hangers, mannequins, or background in the box
8. If items overlap, draw boxes that best capture each individual item

BOUNDING BOX GUIDELINES:
- A shirt hanging on the left third of the image: x ≈ 5-15, width ≈ 20-30
- A shirt in the center: x ≈ 35-45, width ≈ 20-30  
- A shirt on the right: x ≈ 65-75, width ≈ 20-30
- Items at the top of frame: y ≈ 0-20
- Items in the middle: y ≈ 30-50
- Items at the bottom: y ≈ 60-80
- Typical shirt/top height: 25-40% of image
- Typical pants height: 40-60% of image
- Typical full outfit: 60-80% of image height

For EACH clothing item, provide:
- name: Specific descriptive name (e.g., "Navy Blue Slim Fit Oxford Shirt", not just "shirt")
- category: One of [tops, bottoms, outerwear, shoes, accessories]
- colors: Array of specific colors (e.g., ["navy blue", "white stripes"])
- style: One of [casual, formal, smart-casual, athletic, evening]
- pattern: One of [solid, striped, plaid, floral, printed, checkered, other]
- material: Best guess (e.g., "cotton oxford", "raw denim", "merino wool")
- confidence: 0-100 how confident in identification AND bounding box accuracy
- boundingBox: Object with PRECISE coordinates as percentages:
  - x: left edge as % from left (0-100)
  - y: top edge as % from top (0-100)  
  - width: width as % of image (0-100)
  - height: height as % of image (0-100)

ACCURACY CHECK before returning:
- Does the box actually contain the item?
- Is the box tight around the garment (not too much empty space)?
- Do overlapping items have separate, distinct boxes?
- Are x + width <= 100 and y + height <= 100?

Return ONLY a JSON array. Example for items in a closet:
[
  {
    "name": "Light Blue Oxford Button-Down Shirt",
    "category": "tops",
    "colors": ["light blue"],
    "style": "smart-casual",
    "pattern": "solid",
    "material": "cotton oxford",
    "confidence": 92,
    "boundingBox": {
      "x": 5,
      "y": 10,
      "width": 22,
      "height": 35
    }
  },
  {
    "name": "Charcoal Grey Wool Blazer",
    "category": "outerwear",
    "colors": ["charcoal grey"],
    "style": "formal",
    "pattern": "solid",
    "material": "wool blend",
    "confidence": 88,
    "boundingBox": {
      "x": 30,
      "y": 8,
      "width": 25,
      "height": 42
    }
  }
]`;

  if (type === 'closet') {
    return basePrompt + `

CLOSET PHOTO SPECIFIC INSTRUCTIONS:
- This is a photo of an open closet/wardrobe
- Items are typically HANGING vertically
- Scan LEFT to RIGHT, identifying each distinct garment
- Hanging items usually have:
  - Small x values on left, larger on right
  - y starting near top (5-15%)
  - width of 15-30% each
  - height of 30-50% for tops, 50-70% for dresses/coats
- Folded items on shelves have smaller heights
- Look for partially visible items behind others
- Each hanging item should get its own bounding box
- If garments overlap, estimate where each one's boundaries would be`;
  }

  if (type === 'flatlay') {
    return basePrompt + `

FLAT LAY SPECIFIC INSTRUCTIONS:
- Items are laid flat on a surface, viewed from above
- Items should NOT overlap significantly
- Each item should have clear boundaries
- Boxes should be very tight around each piece
- Common layout patterns:
  - Grid arrangement: items evenly spaced
  - Outfit layout: top at top, bottom below, accessories around
- Typical dimensions for flat lay items:
  - Tops: 25-40% width, 20-35% height
  - Bottoms: 20-35% width, 30-45% height
  - Small accessories: 10-20% width/height`;
  }

  // Single item
  return basePrompt + `

SINGLE ITEM/OUTFIT SPECIFIC INSTRUCTIONS:
- Focus on the main garment(s) in frame
- If multiple pieces (outfit), identify each separately
- Box should exclude mannequin/hanger but include full garment
- For worn outfits: separate boxes for top, bottom, and visible accessories`;
}
