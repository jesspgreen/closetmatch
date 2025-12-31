// Email Provider OAuth Configuration
// Used by both frontend and API routes

export const EMAIL_PROVIDERS = {
  gmail: {
    name: 'Gmail',
    icon: '📧',
    color: '#EA4335',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    // Client ID set via env var: VITE_GOOGLE_CLIENT_ID
  },
  outlook: {
    name: 'Outlook',
    icon: '📬',
    color: '#0078D4',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['https://graph.microsoft.com/Mail.Read', 'offline_access'],
    // Client ID set via env var: VITE_MICROSOFT_CLIENT_ID
  },
  yahoo: {
    name: 'Yahoo',
    icon: '📨',
    color: '#6001D2',
    authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
    tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
    scopes: ['mail-r'],
    // Client ID set via env var: VITE_YAHOO_CLIENT_ID
  },
  icloud: {
    name: 'iCloud',
    icon: '☁️',
    color: '#999999',
    // iCloud uses app-specific passwords, not OAuth
    // We'll handle this differently
    requiresAppPassword: true,
  },
};

// Retailers to search for in emails
export const SUPPORTED_RETAILERS = [
  { id: 'amazon', name: 'Amazon', domains: ['amazon.com', 'amazon.co.uk'], fromPatterns: ['ship-confirm@amazon', 'order-update@amazon'] },
  { id: 'nordstrom', name: 'Nordstrom', domains: ['nordstrom.com'], fromPatterns: ['order@e.nordstrom.com', 'nordstrom@e.nordstrom.com'] },
  { id: 'target', name: 'Target', domains: ['target.com'], fromPatterns: ['target@em.target.com'] },
  { id: 'zara', name: 'Zara', domains: ['zara.com'], fromPatterns: ['info@email.zara.com'] },
  { id: 'hm', name: 'H&M', domains: ['hm.com'], fromPatterns: ['info@email.hm.com'] },
  { id: 'uniqlo', name: 'Uniqlo', domains: ['uniqlo.com'], fromPatterns: ['order@uniqlo.com'] },
  { id: 'gap', name: 'Gap', domains: ['gap.com'], fromPatterns: ['gap@email.gap.com'] },
  { id: 'macys', name: "Macy's", domains: ['macys.com'], fromPatterns: ['order@email.macys.com'] },
  { id: 'asos', name: 'ASOS', domains: ['asos.com'], fromPatterns: ['order@asos.com'] },
  { id: 'nike', name: 'Nike', domains: ['nike.com'], fromPatterns: ['nike@email.nike.com'] },
  { id: 'adidas', name: 'Adidas', domains: ['adidas.com'], fromPatterns: ['noreply@adidas.com'] },
  { id: 'jcrew', name: 'J.Crew', domains: ['jcrew.com'], fromPatterns: ['jcrew@email.jcrew.com'] },
  { id: 'bananarepublic', name: 'Banana Republic', domains: ['bananarepublic.com'], fromPatterns: ['email@bananarepublic.com'] },
  { id: 'oldnavy', name: 'Old Navy', domains: ['oldnavy.com'], fromPatterns: ['email@oldnavy.com'] },
  { id: 'anthropologie', name: 'Anthropologie', domains: ['anthropologie.com'], fromPatterns: ['anthropologie@email.anthropologie.com'] },
  { id: 'urbanoutfitters', name: 'Urban Outfitters', domains: ['urbanoutfitters.com'], fromPatterns: ['email@urbanoutfitters.com'] },
  { id: 'lululemon', name: 'Lululemon', domains: ['lululemon.com'], fromPatterns: ['info@e.lululemon.com'] },
  { id: 'everlane', name: 'Everlane', domains: ['everlane.com'], fromPatterns: ['hello@everlane.com'] },
  { id: 'cos', name: 'COS', domains: ['cos.com'], fromPatterns: ['orders@cos.com'] },
  { id: 'revolve', name: 'Revolve', domains: ['revolve.com'], fromPatterns: ['orders@revolve.com'] },
];

/**
 * Generate OAuth URL for a provider
 */
export function getOAuthUrl(provider, redirectUri, state) {
  const config = EMAIL_PROVIDERS[provider];
  if (!config || config.requiresAppPassword) return null;

  const clientId = getClientId(provider);
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${config.authUrl}?${params.toString()}`;
}

function getClientId(provider) {
  switch (provider) {
    case 'gmail':
      return import.meta.env.VITE_GOOGLE_CLIENT_ID;
    case 'outlook':
      return import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    case 'yahoo':
      return import.meta.env.VITE_YAHOO_CLIENT_ID;
    default:
      return null;
  }
}
