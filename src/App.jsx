import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Search, 
  LayoutGrid, 
  ShoppingBag, 
  MapPin, 
  Plus, 
  X, 
  ChevronRight, 
  Users, 
  Share2, 
  Crown, 
  Send, 
  CheckCircle, 
  Loader, 
  Scan, 
  Bot,
  Brain,
  Zap
} from 'lucide-react';

const defaultWardrobe = [
  { id: 1, name: 'Navy Blazer', category: 'tops', colors: ['navy'], style: 'formal', location: 'Main Closet - Left', image: '🧥', wears: 24 },
  { id: 2, name: 'White Oxford Shirt', category: 'tops', colors: ['white'], style: 'smart-casual', location: 'Main Closet - Center', image: '👔', wears: 42 },
  { id: 3, name: 'Black Slim Jeans', category: 'bottoms', colors: ['black'], style: 'casual', location: 'Dresser - Drawer 2', image: '👖', wears: 56 },
  { id: 4, name: 'Camel Wool Coat', category: 'outerwear', colors: ['tan'], style: 'formal', location: 'Hall Closet', image: '🧥', wears: 18 },
  { id: 5, name: 'White Sneakers', category: 'shoes', colors: ['white'], style: 'casual', location: 'Shoe Rack', image: '👟', wears: 67 },
  { id: 6, name: 'Burgundy Sweater', category: 'tops', colors: ['burgundy'], style: 'smart-casual', location: 'Main Closet - Right', image: '🧶', wears: 31 },
  { id: 7, name: 'Gray Chinos', category: 'bottoms', colors: ['gray'], style: 'smart-casual', location: 'Dresser - Drawer 3', image: '👖', wears: 44 },
  { id: 8, name: 'Brown Loafers', category: 'shoes', colors: ['brown'], style: 'smart-casual', location: 'Shoe Rack', image: '👞', wears: 38 },
];

const categories = ['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];

function App() {
  const [activeTab, setActiveTab] = useState('closet');
  const [wardrobe, setWardrobe] = useState(defaultWardrobe);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const chatEndRef = useRef(null);
  
  const [shoppingItem, setShoppingItem] = useState(null);
  const [aiMatches, setAiMatches] = useState([]);
  const [matchExplanation, setMatchExplanation] = useState('');
  
  const [showCVCapture, setShowCVCapture] = useState(false);
  const [cvStep, setCvStep] = useState('capture');
  const [cvResults, setCvResults] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('closetmatch_wardrobe');
      if (saved) {
        setWardrobe(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Could not load wardrobe');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('closetmatch_wardrobe', JSON.stringify(wardrobe));
    } catch (e) {
      console.log('Could not save wardrobe');
    }
  }, [wardrobe]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const filteredWardrobe = wardrobe.filter((item) => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsAITyping(true);

    const wardrobeList = wardrobe.map((item) => {
      return `- ${item.name}: ${item.colors.join('/')} ${item.category}, ${item.style}, at ${item.location}`;
    }).join('\n');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert personal stylist AI for ClosetMatch. Help users create outfits from their wardrobe.\n\nUser's wardrobe:\n${wardrobeList}\n\nGuidelines:\n- Reference specific items by name and location\n- Suggest complete outfits when appropriate\n- Be warm and encouraging\n- Keep responses concise (2-3 paragraphs max)`,
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      let assistantContent = "I'd love to help! Tell me more about the occasion.";
      if (data.content && data.content[0] && data.content[0].text) {
        assistantContent = data.content[0].text;
      }
      
      setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: "I'm having connection issues. Try your Navy Blazer with White Oxford Shirt and Gray Chinos for a classic look!" 
      }]);
    }
    
    setIsAITyping(false);
  };

  const getAIMatches = async (item) => {
    setIsAITyping(true);
    
    const otherItems = wardrobe
      .filter((w) => w.id !== item.id)
      .map((w) => `${w.name} (${w.colors.join('/')}, ${w.category})`)
      .join(', ');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `I have: ${item.name} (${item.colors.join('/')} ${item.category}, ${item.style}).\n\nMy wardrobe: ${otherItems}\n\nReturn JSON only: {"matches":[{"name":"exact item name","score":85,"reason":"5 words"}],"explanation":"1 sentence"}`
          }]
        })
      });

      const data = await response.json();
      let text = '';
      if (data.content && data.content[0] && data.content[0].text) {
        text = data.content[0].text;
      }
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const matches = parsed.matches || [];
        const matchedItems = matches.map((m) => {
          const found = wardrobe.find((w) => {
            const searchName = m.name.toLowerCase().split(' ')[0];
            return w.name.toLowerCase().includes(searchName);
          });
          if (found) {
            return { 
              id: found.id,
              name: found.name,
              image: found.image,
              location: found.location,
              matchScore: m.score, 
              reason: m.reason 
            };
          }
          return null;
        }).filter((x) => x !== null).slice(0, 5);
        
        setAiMatches(matchedItems);
        setMatchExplanation(parsed.explanation || '');
      }
    } catch (err) {
      const fallback = wardrobe
        .filter((w) => w.id !== item.id)
        .slice(0, 3)
        .map((w) => ({
          id: w.id,
          name: w.name,
          image: w.image,
          location: w.location,
          matchScore: 80, 
          reason: 'Complementary style'
        }));
      setAiMatches(fallback);
    }
    
    setIsAITyping(false);
  };

  const runCVAnalysis = () => {
    setCvStep('analyzing');
    setTimeout(() => {
      setCvResults({
        colors: ['gray'],
        category: 'tops',
        style: 'smart-casual',
        confidence: 91,
        suggestedName: 'Gray Sweater'
      });
      setCvStep('results');
    }, 2000);
  };

  const addCVItem = () => {
    if (!cvResults) return;
    const newItem = {
      id: Date.now(),
      name: cvResults.suggestedName,
      category: cvResults.category,
      colors: cvResults.colors,
      style: cvResults.style,
      location: '',
      image: '👔',
      wears: 0
    };
    setWardrobe((prev) => [...prev, newItem]);
    setShowCVCapture(false);
    setCvStep('capture');
    setCvResults(null);
  };

  const handleShoppingCapture = () => {
    setCvStep('analyzing');
    setTimeout(() => {
      const item = { 
        id: 'temp', 
        name: 'Gray Blazer', 
        colors: ['gray'], 
        category: 'tops', 
        style: 'formal', 
        image: '🧥', 
        location: '' 
      };
      setShoppingItem(item);
      getAIMatches(item);
      setCvStep('results');
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const openAIChat = () => setShowAIChat(true);
  const closeAIChat = () => setShowAIChat(false);
  const openCVCapture = () => setShowCVCapture(true);
  const closeCVCapture = () => {
    setShowCVCapture(false);
    setCvStep('capture');
    setCvResults(null);
  };
  const clearShoppingItem = () => {
    setShoppingItem(null);
    setAiMatches([]);
  };
  const clearSelectedItem = () => {
    setSelectedItem(null);
    setAiMatches([]);
  };
  const selectItem = (item) => {
    setSelectedItem(item);
    getAIMatches(item);
  };
  const goToMatches = () => setActiveTab('matches');

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-stone-950 pointer-events-none" />
      
      <header className="relative z-10 px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-wider text-violet-100">
              Closet<span className="font-semibold text-violet-400">Match</span>
              <span className="ml-2 text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">AI</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={openAIChat}
              className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
            >
              <Bot size={18} className="text-violet-400" />
            </button>
            <button 
              onClick={openCVCapture}
              className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"
            >
              <Scan size={18} className="text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-5 pb-24">
        {activeTab === 'closet' && (
          <div className="space-y-4">
            <button 
              onClick={openAIChat}
              className="w-full p-4 bg-gradient-to-r from-violet-950/50 to-purple-900/30 border border-violet-500/30 rounded-2xl flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Brain size={24} className="text-violet-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-medium text-violet-300">AI Style Assistant</h3>
                <p className="text-xs text-stone-400">Ask me what to wear</p>
              </div>
              <ChevronRight size={20} className="text-violet-400" />
            </button>

            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Search wardrobe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-stone-900/80 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
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

            <div className="grid grid-cols-2 gap-3">
              {filteredWardrobe.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 text-left hover:border-violet-500/30 transition-all"
                >
                  <div className="text-4xl mb-3">{item.image}</div>
                  <h3 className="font-medium text-stone-200 text-sm truncate">{item.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={10} className="text-stone-600" />
                    <p className="text-xs text-stone-500 truncate">{item.location || 'Set location'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-5">
            <div className="text-center py-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-violet-500/20 rounded-full text-amber-400 text-sm border border-amber-500/30">
                <Zap size={14} />
                AI Shopping Mode
              </span>
            </div>

            {!shoppingItem ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-48 h-64 bg-stone-900 border-2 border-dashed border-stone-700 rounded-3xl flex flex-col items-center justify-center mb-6">
                  <Scan size={48} className="text-stone-600 mb-4" />
                  <p className="text-stone-500 text-sm text-center px-4">AI analyzes and finds matches</p>
                </div>
                <button
                  onClick={handleShoppingCapture}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-violet-500 text-white rounded-2xl font-semibold flex items-center gap-3"
                >
                  <Camera size={20} />
                  AI Capture
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-stone-900/80 rounded-2xl p-5 border border-violet-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-stone-800 rounded-xl flex items-center justify-center text-4xl">
                      {shoppingItem.image}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-violet-400 uppercase">AI Detected</p>
                      <h3 className="text-lg font-medium text-stone-200">{shoppingItem.name}</h3>
                    </div>
                    <button onClick={clearShoppingItem}>
                      <X size={20} className="text-stone-500" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-stone-400 mb-2 flex items-center gap-2">
                    <Brain size={14} className="text-violet-400" />
                    AI Matches
                  </h3>
                  {matchExplanation && (
                    <p className="text-xs text-stone-500 mb-3 p-3 bg-stone-900/50 rounded-lg">{matchExplanation}</p>
                  )}
                  
                  {isAITyping ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader size={24} className="text-violet-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiMatches.map((match) => (
                        <div key={match.id} className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center gap-4">
                          <div className="text-3xl">{match.image}</div>
                          <div className="flex-1">
                            <h4 className="font-medium text-stone-200">{match.name}</h4>
                            <p className="text-xs text-violet-400">{match.reason}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin size={12} className="text-amber-500" />
                              <p className="text-xs text-amber-400">{match.location}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-violet-400">{match.matchScore}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stylist' && (
          <div className="space-y-5">
            <div className="text-center py-4">
              <h2 className="text-xl font-medium text-stone-200 mb-2">Style Assistance</h2>
            </div>
            <button 
              onClick={openAIChat}
              className="w-full p-5 bg-gradient-to-r from-violet-950/50 to-purple-900/30 border border-violet-500/30 rounded-2xl text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center text-3xl">🤖</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-violet-300">AI Style Assistant</h4>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">FREE</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Instant AI-powered outfit advice</p>
                </div>
                <ChevronRight size={20} className="text-violet-400" />
              </div>
            </button>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-stone-200">Style Feed</h2>
              <button className="px-4 py-2 bg-violet-500 text-white rounded-xl font-medium flex items-center gap-2">
                <Share2 size={16} />
                Share
              </button>
            </div>
            <div className="text-center py-12 text-stone-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Coming soon! Share outfits with the community.</p>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-5">
            <div className="text-center py-6">
              <Brain size={40} className="mx-auto text-violet-500 mb-4" />
              <h2 className="text-xl font-medium text-stone-200 mb-2">AI Match Finder</h2>
              <p className="text-stone-500 text-sm">Select an item to find perfect combinations</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {wardrobe.slice(0, 9).map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 hover:border-violet-500/30"
                >
                  <div className="text-2xl mb-1">{item.image}</div>
                  <p className="text-xs text-stone-400 truncate">{item.name.split(' ')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 px-2 py-2 z-20">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('closet')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
              activeTab === 'closet' ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'
            }`}
          >
            <LayoutGrid size={20} />
            <span className="text-xs">Closet</span>
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
              activeTab === 'shopping' ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'
            }`}
          >
            <ShoppingBag size={20} />
            <span className="text-xs">Shop</span>
          </button>
          <button
            onClick={() => setActiveTab('stylist')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
              activeTab === 'stylist' ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'
            }`}
          >
            <Crown size={20} />
            <span className="text-xs">Stylist</span>
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
              activeTab === 'social' ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'
            }`}
          >
            <Users size={20} />
            <span className="text-xs">Social</span>
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
              activeTab === 'matches' ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'
            }`}
          >
            <Brain size={20} />
            <span className="text-xs">AI Match</span>
          </button>
        </div>
      </nav>

      {showAIChat && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Bot size={20} className="text-violet-400" />
              </div>
              <div>
                <h3 className="font-medium text-stone-200">AI Style Assistant</h3>
                <p className="text-xs text-emerald-400">Online</p>
              </div>
            </div>
            <button onClick={closeAIChat}>
              <X size={24} className="text-stone-500" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Brain size={48} className="mx-auto text-violet-500/50 mb-4" />
                <h3 className="text-lg font-medium text-stone-300 mb-6">Ask me anything about outfits!</h3>
                <button 
                  onClick={() => setChatInput('What should I wear to a job interview?')}
                  className="block w-full px-4 py-3 bg-stone-900/50 border border-stone-800 rounded-xl text-sm text-stone-400 hover:border-violet-500/30 mb-2 text-left"
                >
                  What should I wear to a job interview?
                </button>
                <button 
                  onClick={() => setChatInput('Create a casual weekend outfit')}
                  className="block w-full px-4 py-3 bg-stone-900/50 border border-stone-800 rounded-xl text-sm text-stone-400 hover:border-violet-500/30 mb-2 text-left"
                >
                  Create a casual weekend outfit
                </button>
                <button 
                  onClick={() => setChatInput('What goes with my navy blazer?')}
                  className="block w-full px-4 py-3 bg-stone-900/50 border border-stone-800 rounded-xl text-sm text-stone-400 hover:border-violet-500/30 mb-2 text-left"
                >
                  What goes with my navy blazer?
                </button>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.role === 'user' ? 'bg-violet-500 text-white' : 'bg-stone-800 text-stone-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isAITyping && (
              <div className="flex justify-start">
                <div className="bg-stone-800 p-4 rounded-2xl flex items-center gap-2">
                  <Loader size={16} className="text-violet-400 animate-spin" />
                  <span className="text-sm text-stone-400">Thinking...</span>
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
                onKeyPress={handleKeyPress}
                placeholder="Ask about outfits..."
                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
              />
              <button 
                onClick={sendMessage}
                disabled={!chatInput.trim() || isAITyping}
                className="px-4 py-3 bg-violet-500 text-white rounded-xl disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCVCapture && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="font-medium text-stone-200">AI Scanner</h3>
            <button onClick={closeCVCapture}>
              <X size={24} className="text-stone-500" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-5">
            {cvStep === 'capture' && (
              <div className="text-center">
                <div className="w-64 h-80 bg-stone-900 border-2 border-dashed border-stone-700 rounded-3xl flex flex-col items-center justify-center mb-6 mx-auto">
                  <Scan size={48} className="text-violet-500/50 mb-4" />
                  <p className="text-stone-500 text-sm">Position item in frame</p>
                </div>
                <button 
                  onClick={runCVAnalysis}
                  className="px-8 py-4 bg-violet-500 text-white rounded-2xl font-semibold flex items-center gap-3 mx-auto"
                >
                  <Scan size={20} />
                  Analyze
                </button>
              </div>
            )}
            {cvStep === 'analyzing' && (
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-violet-500/20 flex items-center justify-center mb-6 mx-auto relative">
                  <Brain size={48} className="text-violet-400" />
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-stone-200">Analyzing...</h3>
              </div>
            )}
            {cvStep === 'results' && cvResults && (
              <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                  <CheckCircle size={32} className="mx-auto text-emerald-400 mb-4" />
                  <h3 className="text-lg font-medium text-stone-200">Analysis Complete</h3>
                  <p className="text-xs text-violet-400">{cvResults.confidence}% confidence</p>
                </div>
                <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 mb-4">
                  <h4 className="font-medium text-stone-200 mb-3">{cvResults.suggestedName}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Colors</span>
                      <span className="text-stone-300">{cvResults.colors.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Style</span>
                      <span className="text-stone-300">{cvResults.style}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={closeCVCapture}
                    className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addCVItem}
                    className="flex-1 py-3 bg-violet-500 text-white rounded-xl flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedItem && activeTab === 'closet' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-stone-900 rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-stone-200">{selectedItem.name}</h2>
              <button onClick={clearSelectedItem}>
                <X size={24} className="text-stone-500" />
              </button>
            </div>
            <div className="flex gap-4 mb-5">
              <div className="w-24 h-24 bg-stone-800 rounded-xl flex items-center justify-center text-5xl">
                {selectedItem.image}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-violet-400" />
                  <p className="text-sm text-violet-400">{selectedItem.location}</p>
                </div>
                <div className="flex gap-1">
                  {selectedItem.colors.map((c) => (
                    <span key={c} className="px-2 py-1 bg-stone-800 rounded text-xs">{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-stone-400 mb-3 flex items-center gap-2">
              <Brain size={14} className="text-violet-400" />
              AI Matches
            </h3>
            {isAITyping ? (
              <div className="flex items-center justify-center py-6">
                <Loader size={20} className="text-violet-400 animate-spin" />
              </div>
            ) : aiMatches.length > 0 ? (
              <div className="space-y-2 mb-5">
                {aiMatches.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-xl">
                    <span className="text-2xl">{m.image}</span>
                    <div className="flex-1">
                      <p className="text-sm text-stone-200">{m.name}</p>
                      <p className="text-xs text-violet-400">{m.reason}</p>
                    </div>
                    <span className="text-sm text-violet-400">{m.matchScore}%</span>
                  </div>
                ))}
              </div>
            ) : null}
            <button 
              onClick={goToMatches}
              className="w-full py-4 bg-violet-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Brain size={18} />
              See All Matches
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
