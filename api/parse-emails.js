// Vercel Edge Function for Email Parsing using Vercel AI Gateway
// POST /api/parse-emails

import { generateText } from 'ai';
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
    const { provider, accessToken, userId } = await req.json();

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No access token provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch emails based on provider
    let emails = [];
    
    if (provider === 'gmail') {
      emails = await fetchGmailEmails(accessToken);
    } else if (provider === 'outlook') {
      emails = await fetchOutlookEmails(accessToken);
    } else if (provider === 'yahoo') {
      emails = await fetchYahooEmails(accessToken);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ items: [], message: 'No clothing purchase emails found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse emails with AI
    const items = await parseEmailsWithAI(emails);

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Parse emails error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Gmail API
async function fetchGmailEmails(accessToken) {
  const retailers = [
    'nordstrom', 'amazon', 'zara', 'hm', 'uniqlo', 'nike', 'adidas',
    'gap', 'macys', 'asos', 'jcrew', 'target', 'walmart', 'kohls'
  ];
  
  const query = retailers.map(r => `from:${r}`).join(' OR ');
  
  try {
    // Search for emails
    const searchResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      throw new Error('Failed to search Gmail');
    }

    const searchData = await searchResponse.json();
    const messageIds = searchData.messages || [];

    // Fetch email content
    const emails = await Promise.all(
      messageIds.slice(0, 20).map(async ({ id }) => {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        if (!msgResponse.ok) return null;
        
        const msgData = await msgResponse.json();
        const headers = msgData.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Get body
        let body = '';
        if (msgData.payload?.body?.data) {
          body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (msgData.payload?.parts) {
          const textPart = msgData.payload.parts.find(p => p.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }
        
        return { subject, from, date, body: body.substring(0, 2000) };
      })
    );

    return emails.filter(Boolean);
  } catch (error) {
    console.error('Gmail fetch error:', error);
    return [];
  }
}

// Outlook/Microsoft Graph API
async function fetchOutlookEmails(accessToken) {
  const retailers = ['nordstrom', 'amazon', 'zara', 'uniqlo', 'nike', 'gap', 'macys'];
  
  try {
    const filterQuery = retailers.map(r => `contains(from/emailAddress/address,'${r}')`).join(' or ');
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filterQuery)}&$top=50&$select=subject,from,receivedDateTime,bodyPreview`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Outlook emails');
    }

    const data = await response.json();
    
    return (data.value || []).map(email => ({
      subject: email.subject,
      from: email.from?.emailAddress?.address || '',
      date: email.receivedDateTime,
      body: email.bodyPreview || '',
    }));
  } catch (error) {
    console.error('Outlook fetch error:', error);
    return [];
  }
}

// Yahoo Mail API (limited functionality)
async function fetchYahooEmails(accessToken) {
  // Yahoo Mail API is more restrictive
  // This is a simplified implementation
  console.log('Yahoo mail parsing not fully implemented');
  return [];
}

// Parse emails with AI
async function parseEmailsWithAI(emails) {
  if (emails.length === 0) return [];

  const emailText = emails.map((email, i) => 
    `Email ${i + 1}:\nFrom: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\nBody: ${email.body}\n---`
  ).join('\n\n');

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are an AI that extracts clothing purchase information from emails.
      
For each clothing item found in the emails, extract:
- name: The product name
- category: One of [tops, bottoms, outerwear, shoes, accessories]
- colors: Array of colors if mentioned
- price: Price if available
- retailer: Store name
- date: Purchase date if available

Return ONLY a JSON array of items. If no clothing items found, return empty array [].

Example:
[
  {
    "name": "Classic Fit Cotton Shirt",
    "category": "tops",
    "colors": ["blue"],
    "price": "$49.99",
    "retailer": "Gap",
    "date": "2024-01-15"
  }
]`,
      messages: [
        {
          role: 'user',
          content: `Extract clothing purchases from these emails:\n\n${emailText}`,
        },
      ],
      maxTokens: 2000,
    });

    const text = result.text || '';
    
    // Extract JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error('AI parsing error:', error);
    return [];
  }
}
