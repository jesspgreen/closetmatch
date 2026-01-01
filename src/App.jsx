import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  LayoutGrid, 
  MapPin, 
  Plus, 
  X, 
  ChevronRight, 
  Users, 
  Send, 
  Loader, 
  Scan, 
  Bot,
  Brain,
  LogOut,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Shirt,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseConfigured, deleteImage } from './lib/supabase';
import { useWardrobeWithUrlRefresh } from './hooks/useWardrobeWithUrlRefresh';
import ClosetScanner from './components/ClosetScanner';
import EmailImporter from './components/EmailImporter';
import AddItemModal from './components/AddItemModal';
import CroppedImage from './components/CroppedImage';

const categories = ['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];

const categoryEmojis = {
  tops: ['👔', '👕', '🧥', '🧶', '👚'],
  bottoms: ['👖', '🩳'],
  outerwear: ['🧥', '🧣', '🧤'],
  shoes: ['👟', '👞', '👠', '🥾', '👢'],
  accessories: ['👜', '🎒', '👒', '🧢', '⌚', '👓'],
};

// ==================== AUTH SCREEN ====================
function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Authentication service not configured.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.session) {
          setMessage('Check your email for the confirmation link!');
        } else if (data.user) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-stone-950 pointer-events-none" />
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-wider text-violet-100 mb-2">
            Closet<span className="font-semibold text-violet-400">Match</span>
          </h1>
          <p className="text-stone-500 text-sm">AI-Powered Wardrobe Assistant</p>
        </div>

        <div className="w-full max-w-sm bg-stone-900/60 border border-stone-800 rounded-3xl p-6">
          <h2 className="text-xl font-medium text-stone-200 mb-6 text-center">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-12 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {message && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-xl">
                <p className="text-sm text-emerald-400">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={20} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
              className="text-sm text-stone-400 hover:text-violet-400"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== BULK ADD MODAL ====================
function BulkAddModal({ isOpen, onClose, onScanCloset, onImportEmail, onManualAdd }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-stone-900 rounded-t-3xl sm:rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-stone-200">Add Items</h2>
          <button onClick={onClose}><X size={24} className="text-stone-500" /></button>
        </div>

        <div className="space-y-3">
          <button
            onClick={onScanCloset}
            className="w-full p-5 bg-gradient-to-r from-violet-950/50 to-purple-900/30 border border-violet-500/30 rounded-2xl flex items-center gap-4 text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Scan size={28} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-violet-300">AI Closet Scanner</h4>
              <p className="text-xs text-stone-400 mt-1">Photograph your closet - AI detects all items</p>
            </div>
            <ChevronRight size={20} className="text-violet-400" />
          </button>

          <button
            onClick={onImportEmail}
            className="w-full p-5 bg-gradient-to-r from-emerald-950/50 to-teal-900/30 border border-emerald-500/30 rounded-2xl flex items-center gap-4 text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Mail size={28} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-emerald-300">Import from Email</h4>
              <p className="text-xs text-stone-400 mt-1">Scan Gmail, Outlook, Yahoo for purchases</p>
            </div>
            <ChevronRight size={20} className="text-emerald-400" />
          </button>

          <button
            onClick={onManualAdd}
            className="w-full p-5 bg-stone-800/50 border border-stone-700 rounded-2xl flex items-center gap-4 text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-stone-700/50 flex items-center justify-center">
              <Plus size={28} className="text-stone-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-stone-300">Add Manually</h4>
              <p className="text-xs text-stone-500 mt-1">Add one item at a time with photo</p>
            </div>
            <ChevronRight size={20} className="text-stone-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Use custom hook for wardrobe with auto URL refresh
  const [wardrobe, setWardrobe, isRefreshingUrls] = useWardrobeWithUrlRefresh();

  const [activeTab, setActiveTab] = useState('closet');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showClosetScanner, setShowClosetScanner] = useState(false);
  const [showEmailImporter, setShowEmailImporter] = useState(false);
  
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const chatEndRef = useRef(null);
  
  const [aiMatches, setAiMatches] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Auth
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      setUser({ email: 'demo@example.com', id: 'demo' });
      return;
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setShowProfileMenu(false);
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <Loader size={40} className="text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen onAuthSuccess={setUser} />;

  // Helpers
  const filteredWardrobe = wardrobe.filter((item) => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const addItem = (newItem) => setWardrobe((prev) => [...prev, newItem]);

  const addItemsFromScan = (items) => {
    const newItems = items.map((item, i) => ({
      id: Date.now() + i,
      name: item.name,
      category: item.category || 'tops',
      colors: item.colors || [],
      style: item.style || 'casual',
      location: '',
      // Use cropped image if available, otherwise source image
      image: item.croppedImage || item.sourceImage || categoryEmojis[item.category]?.[0] || '👔',
      isPhoto: !!(item.croppedImage || item.sourceImage),
      // Store bounding box and source for reference/re-cropping
      boundingBox: item.boundingBox || null,
      sourceImage: item.sourceImage || null,
      croppedImage: item.croppedImage || null,
      wears: 0,
      source: 'ai-scan',
      confidence: item.confidence || 0,
    }));
    setWardrobe((prev) => [...prev, ...newItems]);
    setShowClosetScanner(false);
    setShowBulkAdd(false);
  };

  const addItemsFromEmail = (items) => {
    const newItems = items.map((item, i) => ({
      id: Date.now() + i,
      name: item.name,
      category: item.category || 'tops',
      colors: item.colors || [],
      style: 'casual',
      location: '',
      image: categoryEmojis[item.category]?.[0] || '👔',
      isPhoto: false,
      wears: 0,
      source: 'email',
      retailer: item.retailer,
    }));
    setWardrobe((prev) => [...prev, ...newItems]);
    setShowEmailImporter(false);
    setShowBulkAdd(false);
  };

  const deleteItem = async (itemId) => {
    const item = wardrobe.find(i => i.id === itemId);
    if (item?.imagePath) await deleteImage(item.imagePath);
    setWardrobe((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedItem(null);
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsAITyping(true);

    const wardrobeList = wardrobe.length > 0 
      ? wardrobe.map((item) => `- ${item.name}: ${item.colors?.join('/')} ${item.category}`).join('\n')
      : 'User has no items yet.';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an AI stylist.\n\nWardrobe:\n${wardrobeList}\n\nBe concise.`,
          messages: [...chatMessages, userMessage].map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      const content = data.content?.[0]?.text || "I'd love to help!";
      setChatMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: "Connection issue." }]);
    }
    setIsAITyping(false);
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    // Get matches
    const otherItems = wardrobe.filter((w) => w.id !== item.id);
    setAiMatches(otherItems.slice(0, 3).map((w) => ({ ...w, matchScore: 80, reason: 'Complementary' })));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-stone-950 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-light tracking-wider text-violet-100">
              Closet<span className="font-semibold text-violet-400">Match</span>
            </h1>
            {isRefreshingUrls && (
              <RefreshCw size={14} className="text-violet-400 animate-spin" />
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowBulkAdd(true)}
              className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center"
            >
              <Plus size={20} className="text-white" />
            </button>
            <button 
              onClick={() => setShowAIChat(true)}
              className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
            >
              <Bot size={18} className="text-violet-400" />
            </button>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center"
            >
              <User size={18} className="text-stone-400" />
            </button>
          </div>
        </div>

        {showProfileMenu && (
          <div className="absolute right-5 top-20 w-64 bg-stone-900 border border-stone-800 rounded-xl shadow-xl z-50">
            <div className="p-4 border-b border-stone-800">
              <p className="text-sm font-medium text-stone-200 truncate">{user.email}</p>
            </div>
            <button onClick={handleSignOut} className="w-full p-4 flex items-center gap-3 hover:bg-stone-800/50">
              <LogOut size={18} className="text-stone-400" />
              <span className="text-sm text-stone-300">Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10 px-5 pb-24">
        {activeTab === 'closet' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowAIChat(true)}
                className="p-4 bg-gradient-to-r from-violet-950/50 to-purple-900/30 border border-violet-500/30 rounded-2xl"
              >
                <Brain size={24} className="text-violet-400 mb-2" />
                <h3 className="font-medium text-violet-300 text-sm">AI Stylist</h3>
              </button>
              <button 
                onClick={() => setShowBulkAdd(true)}
                className="p-4 bg-gradient-to-r from-emerald-950/50 to-teal-900/30 border border-emerald-500/30 rounded-2xl"
              >
                <Upload size={24} className="text-emerald-400 mb-2" />
                <h3 className="font-medium text-emerald-300 text-sm">Add Items</h3>
              </button>
            </div>

            {wardrobe.length > 0 && (
              <>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Search wardrobe..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-stone-900/80 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                        selectedCategory === cat 
                          ? 'bg-violet-500 text-white' 
                          : 'bg-stone-900/60 text-stone-400 border border-stone-800'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {wardrobe.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 rounded-full bg-stone-900 border-2 border-dashed border-stone-700 flex items-center justify-center mx-auto mb-6">
                  <Shirt size={40} className="text-stone-600" />
                </div>
                <h3 className="text-xl font-medium text-stone-300 mb-2">Your Wardrobe is Empty</h3>
                <p className="text-stone-500 text-sm mb-6">Scan your closet or add items manually</p>
                <button
                  onClick={() => setShowBulkAdd(true)}
                  className="px-6 py-3 bg-violet-500 text-white rounded-xl font-semibold flex items-center gap-2 mx-auto"
                >
                  <Plus size={20} />
                  Add Items
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredWardrobe.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-left hover:border-violet-500/30"
                  >
                    {/* Priority: croppedImage > CroppedImage component > image > emoji */}
                    {item.croppedImage ? (
                      <img src={item.croppedImage} alt={item.name} className="w-full h-24 object-cover rounded-xl mb-3" />
                    ) : item.isPhoto && item.boundingBox && item.sourceImage ? (
                      <CroppedImage
                        src={item.sourceImage}
                        boundingBox={item.boundingBox}
                        alt={item.name}
                        className="w-full h-24 rounded-xl mb-3"
                        fallback={categoryEmojis[item.category]?.[0] || '👔'}
                      />
                    ) : item.isPhoto && item.image && !item.image.startsWith('👔') && !item.image.startsWith('👕') ? (
                      <img src={item.image} alt={item.name} className="w-full h-24 object-cover rounded-xl mb-3" />
                    ) : (
                      <div className="w-full h-24 bg-stone-800 rounded-xl mb-3 flex items-center justify-center text-4xl">
                        {categoryEmojis[item.category]?.[0] || '👔'}
                      </div>
                    )}
                    <h3 className="font-medium text-stone-200 text-sm truncate">{item.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={10} className="text-stone-600" />
                      <p className="text-xs text-stone-500 truncate">{item.location || 'Set location'}</p>
                    </div>
                  </button>
                ))}
                
                <button
                  onClick={() => setShowBulkAdd(true)}
                  className="bg-stone-900/30 border-2 border-dashed border-stone-700 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px]"
                >
                  <Plus size={32} className="text-stone-600 mb-2" />
                  <p className="text-xs text-stone-500">Add Items</p>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="text-center py-12">
            <Brain size={48} className="mx-auto text-violet-500/50 mb-4" />
            <p className="text-stone-400">Select an item from your closet to find matches</p>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-stone-600 mb-4" />
            <p className="text-stone-500">Social features coming soon</p>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 px-2 py-2 z-20">
        <div className="flex justify-around">
          {[
            { id: 'closet', icon: LayoutGrid, label: 'Closet' },
            { id: 'matches', icon: Brain, label: 'AI Match' },
            { id: 'social', icon: Users, label: 'Social' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl ${
                activeTab === id ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <BulkAddModal
        isOpen={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        onScanCloset={() => { setShowBulkAdd(false); setShowClosetScanner(true); }}
        onImportEmail={() => { setShowBulkAdd(false); setShowEmailImporter(true); }}
        onManualAdd={() => { setShowBulkAdd(false); setShowAddItem(true); }}
      />

      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdd={addItem}
        userId={user.id}
      />

      {showClosetScanner && (
        <ClosetScanner
          onItemsDetected={addItemsFromScan}
          onCancel={() => setShowClosetScanner(false)}
        />
      )}

      {showEmailImporter && (
        <EmailImporter
          userId={user.id}
          onItemsImported={addItemsFromEmail}
          onCancel={() => setShowEmailImporter(false)}
        />
      )}

      {/* AI Chat */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
            <div className="flex items-center gap-3">
              <Bot size={20} className="text-violet-400" />
              <h3 className="font-medium text-stone-200">AI Stylist</h3>
            </div>
            <button onClick={() => setShowAIChat(false)}>
              <X size={24} className="text-stone-500" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Brain size={48} className="mx-auto text-violet-500/50 mb-4" />
                <p className="text-stone-400">Ask me about outfit ideas!</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.role === 'user' ? 'bg-violet-500' : 'bg-stone-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isAITyping && (
              <div className="flex justify-start">
                <div className="bg-stone-800 p-4 rounded-2xl">
                  <Loader size={16} className="text-violet-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-stone-800 bg-stone-950">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about outfits..."
                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500"
              />
              <button onClick={sendMessage} disabled={!chatInput.trim()} className="px-4 py-3 bg-violet-500 rounded-xl disabled:opacity-50">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-stone-900 rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-stone-200">{selectedItem.name}</h2>
              <button onClick={() => setSelectedItem(null)}>
                <X size={24} className="text-stone-500" />
              </button>
            </div>
            
            <div className="flex gap-4 mb-5">
              {selectedItem.croppedImage ? (
                <img src={selectedItem.croppedImage} alt={selectedItem.name} className="w-24 h-24 object-cover rounded-xl" />
              ) : selectedItem.isPhoto && selectedItem.boundingBox && selectedItem.sourceImage ? (
                <CroppedImage
                  src={selectedItem.sourceImage}
                  boundingBox={selectedItem.boundingBox}
                  alt={selectedItem.name}
                  className="w-24 h-24 rounded-xl"
                  fallback={categoryEmojis[selectedItem.category]?.[0] || '👔'}
                />
              ) : selectedItem.isPhoto && selectedItem.image && !selectedItem.image.startsWith('👔') ? (
                <img src={selectedItem.image} alt={selectedItem.name} className="w-24 h-24 object-cover rounded-xl" />
              ) : (
                <div className="w-24 h-24 bg-stone-800 rounded-xl flex items-center justify-center text-5xl">
                  {categoryEmojis[selectedItem.category]?.[0] || '👔'}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded text-xs">
                    {selectedItem.category}
                  </span>
                  {selectedItem.confidence && (
                    <span className="px-2 py-1 bg-stone-800 text-stone-400 rounded text-xs">
                      {selectedItem.confidence}% match
                    </span>
                  )}
                </div>
                {selectedItem.colors?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {selectedItem.colors.map((c) => (
                      <span key={c} className="px-2 py-1 bg-stone-800 rounded text-xs">{c}</span>
                    ))}
                  </div>
                )}
                {selectedItem.location && (
                  <p className="text-sm text-stone-500 flex items-center gap-1">
                    <MapPin size={12} />
                    {selectedItem.location}
                  </p>
                )}
              </div>
            </div>

            {aiMatches.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-stone-400 mb-3 flex items-center gap-2">
                  <Brain size={14} className="text-violet-400" />
                  Goes well with
                </h3>
                <div className="space-y-2 mb-5">
                  {aiMatches.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-xl">
                      {m.croppedImage ? (
                        <img src={m.croppedImage} alt={m.name} className="w-10 h-10 object-cover rounded-lg" />
                      ) : m.isPhoto && m.boundingBox && m.sourceImage ? (
                        <CroppedImage
                          src={m.sourceImage}
                          boundingBox={m.boundingBox}
                          alt={m.name}
                          className="w-10 h-10 rounded-lg"
                          fallback={categoryEmojis[m.category]?.[0] || '👔'}
                        />
                      ) : m.isPhoto && m.image && !m.image.startsWith('👔') ? (
                        <img src={m.image} alt={m.name} className="w-10 h-10 object-cover rounded-lg" />
                      ) : (
                        <div className="w-10 h-10 bg-stone-700 rounded-lg flex items-center justify-center text-xl">
                          {categoryEmojis[m.category]?.[0] || '👔'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-stone-200">{m.name}</p>
                        <p className="text-xs text-stone-500">{m.category}</p>
                      </div>
                      <span className="text-sm text-violet-400">{m.matchScore}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button 
              onClick={() => deleteItem(selectedItem.id)}
              className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Delete Item
            </button>
          </div>
        </div>
      )}

      {showProfileMenu && <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />}
    </div>
  );
}

export default App;
