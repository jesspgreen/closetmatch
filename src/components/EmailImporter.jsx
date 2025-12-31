import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Loader, Check, ChevronRight, AlertCircle, 
  RefreshCw, Trash2, ShoppingBag, Calendar
} from 'lucide-react';
import { EMAIL_PROVIDERS, SUPPORTED_RETAILERS } from '../lib/emailProviders';

export default function EmailImporter({ onItemsImported, onCancel, userId }) {
  const [step, setStep] = useState('providers'); // providers, connecting, scanning, results
  const [connectedProviders, setConnectedProviders] = useState({});
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ emails: 0, items: 0 });
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');

  // Load connected providers from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('closetmatch_email_tokens');
      if (saved) {
        setConnectedProviders(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Could not load email tokens');
    }
  }, []);

  // Save connected providers
  useEffect(() => {
    try {
      localStorage.setItem('closetmatch_email_tokens', JSON.stringify(connectedProviders));
    } catch (e) {
      console.log('Could not save email tokens');
    }
  }, [connectedProviders]);

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'EMAIL_AUTH_SUCCESS') {
        const { provider, tokens } = event.data;
        setConnectedProviders(prev => ({
          ...prev,
          [provider]: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            connectedAt: Date.now(),
          }
        }));
        setConnectingProvider(null);
        setStep('providers');
      }
      
      if (event.data.type === 'EMAIL_AUTH_ERROR') {
        setError(event.data.error);
        setConnectingProvider(null);
        setStep('providers');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Start OAuth flow
  const connectProvider = (providerId) => {
    const provider = EMAIL_PROVIDERS[providerId];
    if (!provider) return;

    if (provider.requiresAppPassword) {
      // Handle iCloud separately
      setError('iCloud requires an app-specific password. This feature is coming soon.');
      return;
    }

    setConnectingProvider(providerId);
    setStep('connecting');
    setError('');

    // Build OAuth URL
    const state = btoa(`${providerId}:${userId}:/`);
    const redirectUri = `${window.location.origin}/api/email-auth`;
    
    const clientId = getClientId(providerId);
    if (!clientId) {
      setError(`${provider.name} integration not configured yet.`);
      setConnectingProvider(null);
      setStep('providers');
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `${provider.authUrl}?${params.toString()}`;
    
    // Open popup
    const popup = window.open(authUrl, 'email-auth', 'width=500,height=600');
    
    // Check if popup was blocked
    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.');
      setConnectingProvider(null);
      setStep('providers');
    }
  };

  // Disconnect provider
  const disconnectProvider = (providerId) => {
    setConnectedProviders(prev => {
      const newProviders = { ...prev };
      delete newProviders[providerId];
      return newProviders;
    });
  };

  // Scan emails for clothing purchases
  const scanEmails = async () => {
    const connectedIds = Object.keys(connectedProviders);
    if (connectedIds.length === 0) {
      setError('Connect at least one email provider first');
      return;
    }

    setScanning(true);
    setStep('scanning');
    setError('');
    setScanProgress({ emails: 0, items: 0 });
    setItems([]);

    const allItems = [];

    for (const providerId of connectedIds) {
      const tokens = connectedProviders[providerId];
      
      // Check if token needs refresh
      let accessToken = tokens.accessToken;
      if (Date.now() > tokens.expiresAt - 60000) {
        // Refresh token
        try {
          const refreshResponse = await fetch('/api/email-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: providerId,
              refreshToken: tokens.refreshToken,
            }),
          });
          
          if (refreshResponse.ok) {
            const newTokens = await refreshResponse.json();
            accessToken = newTokens.access_token;
            setConnectedProviders(prev => ({
              ...prev,
              [providerId]: {
                ...prev[providerId],
                accessToken: newTokens.access_token,
                expiresAt: Date.now() + (newTokens.expires_in * 1000),
              }
            }));
          }
        } catch (e) {
          console.error('Token refresh failed:', e);
          continue;
        }
      }

      // Scan emails
      try {
        const response = await fetch('/api/parse-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: providerId,
            accessToken,
            maxResults: 100,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setScanProgress(prev => ({
            emails: prev.emails + data.emailsScanned,
            items: prev.items + data.items.length,
          }));
          allItems.push(...data.items);
        }
      } catch (e) {
        console.error(`Scan failed for ${providerId}:`, e);
      }
    }

    setItems(allItems);
    setSelectedItems(new Set(allItems.map((_, i) => i)));
    setScanning(false);
    setStep('results');
  };

  // Toggle item selection
  const toggleItem = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // Confirm selected items
  const confirmItems = () => {
    const selected = items.filter((_, i) => selectedItems.has(i));
    onItemsImported(selected);
  };

  const connectedCount = Object.keys(connectedProviders).length;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between bg-stone-950 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Mail size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-medium text-stone-200">Import from Email</h3>
            <p className="text-xs text-stone-500">
              {connectedCount > 0 ? `${connectedCount} account${connectedCount > 1 ? 's' : ''} connected` : 'Connect your email'}
            </p>
          </div>
        </div>
        <button onClick={onCancel}>
          <X size={24} className="text-stone-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* Providers Step */}
        {step === 'providers' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/30 rounded-xl">
              <div className="flex items-start gap-3">
                <ShoppingBag size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">How it works</p>
                  <p className="text-xs text-stone-400 mt-1">
                    We scan your inbox for order confirmations from {SUPPORTED_RETAILERS.length}+ retailers 
                    and automatically extract clothing items.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-stone-400 mb-3">Connect Email Accounts</h4>
              <div className="space-y-3">
                {Object.entries(EMAIL_PROVIDERS).map(([id, provider]) => {
                  const isConnected = !!connectedProviders[id];
                  const isDisabled = provider.requiresAppPassword;
                  
                  return (
                    <div 
                      key={id}
                      className={`p-4 rounded-xl flex items-center gap-4 ${
                        isConnected 
                          ? 'bg-emerald-950/30 border border-emerald-800/30' 
                          : 'bg-stone-900 border border-stone-800'
                      } ${isDisabled ? 'opacity-50' : ''}`}
                    >
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${provider.color}20` }}
                      >
                        {provider.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-stone-200">{provider.name}</h4>
                        {isConnected ? (
                          <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check size={12} /> Connected
                          </p>
                        ) : isDisabled ? (
                          <p className="text-xs text-stone-500">Coming soon</p>
                        ) : (
                          <p className="text-xs text-stone-500">Not connected</p>
                        )}
                      </div>
                      {isConnected ? (
                        <button
                          onClick={() => disconnectProvider(id)}
                          className="p-2 text-stone-500 hover:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : !isDisabled && (
                        <button
                          onClick={() => connectProvider(id)}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {connectedCount > 0 && (
              <button
                onClick={scanEmails}
                className="w-full py-4 bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                Scan for Clothing Purchases
              </button>
            )}

            {/* Supported Retailers */}
            <div className="pt-4 border-t border-stone-800">
              <h4 className="text-sm font-medium text-stone-400 mb-3">Supported Retailers</h4>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_RETAILERS.slice(0, 12).map((retailer) => (
                  <span 
                    key={retailer.id}
                    className="px-3 py-1 bg-stone-800/50 rounded-full text-xs text-stone-400"
                  >
                    {retailer.name}
                  </span>
                ))}
                <span className="px-3 py-1 bg-stone-800/50 rounded-full text-xs text-stone-500">
                  +{SUPPORTED_RETAILERS.length - 12} more
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Connecting Step */}
        {step === 'connecting' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <Loader size={40} className="text-emerald-400 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-stone-200 mb-2">
              Connecting to {EMAIL_PROVIDERS[connectingProvider]?.name}
            </h3>
            <p className="text-stone-500 text-sm text-center">
              Complete authorization in the popup window
            </p>
          </div>
        )}

        {/* Scanning Step */}
        {step === 'scanning' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <Loader size={40} className="text-emerald-400 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-stone-200 mb-2">Scanning Emails</h3>
            <p className="text-stone-500 text-sm text-center mb-4">
              Looking for clothing purchases...
            </p>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{scanProgress.emails}</p>
                <p className="text-xs text-stone-500">Emails scanned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-400">{scanProgress.items}</p>
                <p className="text-xs text-stone-500">Items found</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && (
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle size={48} className="mx-auto text-stone-600 mb-4" />
                <h3 className="text-lg font-medium text-stone-300 mb-2">No Items Found</h3>
                <p className="text-stone-500 text-sm mb-6">
                  We couldn't find any clothing purchases in your recent emails.
                </p>
                <button
                  onClick={() => setStep('providers')}
                  className="px-6 py-3 bg-stone-800 text-stone-300 rounded-xl"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-stone-400">
                    Found {items.length} items from {scanProgress.emails} emails
                  </p>
                  <button
                    onClick={() => {
                      if (selectedItems.size === items.length) {
                        setSelectedItems(new Set());
                      } else {
                        setSelectedItems(new Set(items.map((_, i) => i)));
                      }
                    }}
                    className="text-sm text-violet-400"
                  >
                    {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => toggleItem(index)}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 text-left transition-all ${
                        selectedItems.has(index)
                          ? 'bg-violet-500/20 border-2 border-violet-500'
                          : 'bg-stone-900 border-2 border-stone-800'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedItems.has(index) ? 'bg-violet-500' : 'bg-stone-700'
                      }`}>
                        {selectedItems.has(index) && <Check size={14} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-stone-200 truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-400">
                            {item.retailer}
                          </span>
                          {item.price && (
                            <span className="text-xs text-emerald-400">${item.price}</span>
                          )}
                          {item.emailDate && (
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(item.emailDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('providers')}
                    className="flex-1 py-4 bg-stone-800 text-stone-300 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={confirmItems}
                    disabled={selectedItems.size === 0}
                    className="flex-1 py-4 bg-violet-500 text-white rounded-xl font-semibold disabled:opacity-50"
                  >
                    Add {selectedItems.size} Items
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getClientId(provider) {
  // These would come from environment variables in production
  // For now, check if they're available
  switch (provider) {
    case 'gmail':
      return import.meta.env.VITE_GOOGLE_CLIENT_ID || null;
    case 'outlook':
      return import.meta.env.VITE_MICROSOFT_CLIENT_ID || null;
    case 'yahoo':
      return import.meta.env.VITE_YAHOO_CLIENT_ID || null;
    default:
      return null;
  }
}
