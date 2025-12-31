// Vercel Edge Function for Fetching and Parsing Emails
// POST /api/parse-emails

export const config = {
  runtime: 'edge',
};

// Retailers to search for
const RETAILER_PATTERNS = [
  { name: 'Amazon', from: ['amazon.com'], subjects: ['Your order', 'Order confirmed', 'shipped'] },
  { name: 'Nordstrom', from: ['nordstrom.com'], subjects: ['Order confirmation', 'Your order'] },
  { name: 'Target', from: ['target.com'], subjects: ['Order confirmation', 'shipped'] },
  { name: 'Zara', from: ['zara.com'], subjects: ['Order confirmation', 'Purchase'] },
  { name: 'H&M', from: ['hm.com'], subjects: ['Order confirmation', 'Thank you'] },
  { name: 'Uniqlo', from: ['uniqlo.com'], subjects: ['Order confirmation'] },
  { name: 'Nike', from: ['nike.com'], subjects: ['Order confirmed', 'shipped'] },
  { name: 'Adidas', from: ['adidas.com'], subjects: ['Order confirmation'] },
  { name: 'Gap', from: ['gap.com', 'oldnavy.com', 'bananarepublic.com'], subjects: ['Order'] },
  { name: "Macy's", from: ['macys.com'], subjects: ['Order confirmation'] },
  { name: 'ASOS', from: ['asos.com'], subjects: ['Order confirmed'] },
  { name: 'J.Crew', from: ['jcrew.com'], subjects: ['Order confirmation'] },
];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { provider, accessToken, maxResults = 50 } = await req.json();

    if (!provider || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing provider or token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let emails = [];

    switch (provider) {
      case 'gmail':
        emails = await fetchGmailEmails(accessToken, maxResults);
        break;
      case 'outlook':
        emails = await fetchOutlookEmails(accessToken, maxResults);
        break;
      case 'yahoo':
        emails = await fetchYahooEmails(accessToken, maxResults);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // Parse emails to extract clothing items
    const items = await parseEmailsForClothing(emails);

    return new Response(JSON.stringify({ 
      emailsScanned: emails.length,
      items 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Email parsing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ==================== GMAIL ====================
async function fetchGmailEmails(accessToken, maxResults) {
  const emails = [];
  
  // Build search query for clothing retailers
  const retailerDomains = RETAILER_PATTERNS.flatMap(r => r.from);
  const query = `from:(${retailerDomains.join(' OR ')}) subject:(order OR confirmation OR shipped) newer_than:1y`;

  try {
    // Search for emails
    const searchResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      console.error('Gmail search failed:', await searchResponse.text());
      return emails;
    }

    const searchData = await searchResponse.json();
    const messageIds = searchData.messages || [];

    // Fetch each email (in parallel, max 10 at a time)
    const batchSize = 10;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async ({ id }) => {
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (msgResponse.ok) {
            return msgResponse.json();
          }
          return null;
        })
      );

      for (const msg of batchResults) {
        if (msg) {
          emails.push(parseGmailMessage(msg));
        }
      }
    }
  } catch (error) {
    console.error('Gmail fetch error:', error);
  }

  return emails;
}

function parseGmailMessage(message) {
  const headers = message.payload?.headers || [];
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  let body = '';
  if (message.payload?.body?.data) {
    body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  } else if (message.payload?.parts) {
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
    if (textPart?.body?.data) {
      body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  }

  return {
    id: message.id,
    from: getHeader('From'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body,
  };
}

// ==================== OUTLOOK ====================
async function fetchOutlookEmails(accessToken, maxResults) {
  const emails = [];
  
  const retailerDomains = RETAILER_PATTERNS.flatMap(r => r.from);
  const filter = retailerDomains.map(d => `contains(from/emailAddress/address,'${d}')`).join(' or ');

  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$filter=(${filter})&$top=${maxResults}&$orderby=receivedDateTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('Outlook fetch failed:', await response.text());
      return emails;
    }

    const data = await response.json();
    for (const msg of data.value || []) {
      emails.push({
        id: msg.id,
        from: msg.from?.emailAddress?.address || '',
        subject: msg.subject || '',
        date: msg.receivedDateTime || '',
        body: msg.body?.content || '',
      });
    }
  } catch (error) {
    console.error('Outlook fetch error:', error);
  }

  return emails;
}

// ==================== YAHOO ====================
async function fetchYahooEmails(accessToken, maxResults) {
  // Yahoo Mail API is more limited
  // This is a simplified implementation
  const emails = [];

  try {
    const response = await fetch(
      `https://api.mail.yahoo.com/v1/messages?count=${maxResults}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('Yahoo fetch failed:', await response.text());
      return emails;
    }

    const data = await response.json();
    for (const msg of data.messages || []) {
      emails.push({
        id: msg.id,
        from: msg.from || '',
        subject: msg.subject || '',
        date: msg.date || '',
        body: msg.snippet || '',
      });
    }
  } catch (error) {
    console.error('Yahoo fetch error:', error);
  }

  return emails;
}

// ==================== PARSE EMAILS FOR CLOTHING ====================
async function parseEmailsForClothing(emails) {
  const items = [];

  for (const email of emails) {
    // Identify retailer
    const retailer = RETAILER_PATTERNS.find(r => 
      r.from.some(domain => email.from.toLowerCase().includes(domain))
    );

    if (!retailer) continue;

    // Extract items from email body using AI
    const extractedItems = await extractItemsFromEmail(email, retailer.name);
    items.push(...extractedItems);
  }

  // Deduplicate by name similarity
  const uniqueItems = deduplicateItems(items);

  return uniqueItems;
}

async function extractItemsFromEmail(email, retailerName) {
  // Use Claude to parse the email
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are an AI that extracts clothing items from order confirmation emails.
Extract ONLY clothing, shoes, and accessories. Ignore electronics, home goods, etc.

For each item found, return:
- name: Product name
- category: tops/bottoms/outerwear/shoes/accessories
- colors: Array of colors mentioned
- price: Price if visible
- retailer: "${retailerName}"

Return ONLY a JSON array. If no clothing items found, return [].`,
        messages: [{
          role: 'user',
          content: `Extract clothing items from this order email:\n\nSubject: ${email.subject}\n\n${email.body.substring(0, 5000)}`
        }],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';

    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.map(item => ({
        ...item,
        source: 'email',
        emailDate: email.date,
        emailId: email.id,
      }));
    }
  } catch (error) {
    console.error('Item extraction error:', error);
  }

  return [];
}

function deduplicateItems(items) {
  const seen = new Map();
  
  for (const item of items) {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}
