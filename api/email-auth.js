// Vercel Edge Function for Email OAuth Callback
// GET/POST /api/email-auth

export const config = {
  runtime: 'edge',
};

const PROVIDERS = {
  gmail: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  outlook: {
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  },
  yahoo: {
    tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
    clientId: process.env.YAHOO_CLIENT_ID,
    clientSecret: process.env.YAHOO_CLIENT_SECRET,
  },
};

export default async function handler(req) {
  const url = new URL(req.url);

  // Handle OAuth callback (GET with code)
  if (req.method === 'GET') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return redirectWithError(error);
    }

    if (!code || !state) {
      return redirectWithError('Missing code or state');
    }

    // Decode state (provider:userId:redirectPath)
    let provider, userId, redirectPath;
    try {
      const decoded = atob(state);
      [provider, userId, redirectPath] = decoded.split(':');
    } catch {
      return redirectWithError('Invalid state');
    }

    const config = PROVIDERS[provider];
    if (!config) {
      return redirectWithError('Unknown provider');
    }

    // Exchange code for tokens
    try {
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: `${url.origin}/api/email-auth`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        console.error('Token exchange failed:', err);
        return redirectWithError('Token exchange failed');
      }

      const tokens = await tokenResponse.json();

      // Return tokens to frontend via postMessage
      // In production, store in Supabase and just return success
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Connecting...</title></head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'EMAIL_AUTH_SUCCESS',
              provider: '${provider}',
              tokens: ${JSON.stringify(tokens)}
            }, window.location.origin);
            window.close();
          </script>
          <p>Connected! This window will close automatically.</p>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });

    } catch (error) {
      console.error('OAuth error:', error);
      return redirectWithError('Authentication failed');
    }
  }

  // Handle token refresh (POST)
  if (req.method === 'POST') {
    try {
      const { provider, refreshToken } = await req.json();

      const config = PROVIDERS[provider];
      if (!config) {
        return new Response(JSON.stringify({ error: 'Unknown provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const tokens = await tokenResponse.json();
      return new Response(JSON.stringify(tokens), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

function redirectWithError(error) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Error</title></head>
    <body>
      <script>
        window.opener.postMessage({
          type: 'EMAIL_AUTH_ERROR',
          error: '${error}'
        }, window.location.origin);
        window.close();
      </script>
      <p>Error: ${error}</p>
    </body>
    </html>
  `;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
