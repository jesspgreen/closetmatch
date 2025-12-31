import React, { useState, useEffect, useRef } from 'react'
import { Camera, Search, Grid3X3, ShoppingBag, Sparkles, MapPin, Plus, X, ChevronRight, Heart, Check, AlertTriangle, Filter, Star, Zap, ArrowLeft, Users, MessageCircle, Share2, Crown, Clock, Send, Globe, Lock, CheckCircle, Loader, Brain, Scan, Palette, Wand2, Sparkle, Bot } from 'lucide-react'

// Local storage helpers
const storage = {
  get: (key, fallback) => {
    try {
      const item = localStorage.getItem(`closetmatch_${key}`)
      return item ? JSON.parse(item) : fallback
    } catch { return fallback }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`closetmatch_${key}`, JSON.stringify(value))
    } catch {}
  }
}

// Default wardrobe items
const defaultWardrobe = [
  { id: 1, name: 'Navy Blazer', category: 'tops', colors: ['navy'], style: 'formal', occasion: ['work', 'date'], location: 'Main Closet - Left', image: '🧥', wears: 24 },
  { id: 2, name: 'White Oxford Shirt', category: 'tops', colors: ['white'], style: 'smart-casual', occasion: ['work', 'casual'], location: 'Main Closet - Center', image: '👔', wears: 42 },
  { id: 3, name: 'Black Slim Jeans', category: 'bottoms', colors: ['black'], style: 'casual', occasion: ['casual', 'date'], location: 'Dresser - Drawer 2', image: '👖', wears: 56 },
  { id: 4, name: 'Camel Wool Coat', category: 'outerwear', colors: ['tan'], style: 'formal', occasion: ['work', 'date'], location: 'Hall Closet', image: '🧥', wears: 18 },
  { id: 5, name: 'White Sneakers', category: 'shoes', colors: ['white'], style: 'casual', occasion: ['casual'], location: 'Shoe Rack', image: '👟', wears: 67 },
  { id: 6, name: 'Burgundy Sweater', category: 'tops', colors: ['burgundy'], style: 'smart-casual', occasion: ['casual', 'date'], location: 'Main Closet - Right', image: '🧶', wears: 31 },
  { id: 7, name: 'Gray Chinos', category: 'bottoms', colors: ['gray'], style: 'smart-casual', occasion: ['work', 'casual'], location: 'Dresser - Drawer 3', image: '👖', wears: 44 },
  { id: 8, name: 'Brown Loafers', category: 'shoes', colors: ['brown'], style: 'smart-casual', occasion: ['work', 'date'], location: 'Shoe Rack', image: '👞', wears: 38 },
]

const categories = ['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories']

export default function App() {
  // Core state
  const [activeTab, setActiveTab] = useState('closet')
  const [wardrobe, setWardrobe] = useState(() => storage.get('wardrobe', defaultWardrobe))
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  
  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isAITyping, setIsAITyping] = useState(false)
  const chatEndRef = useRef(null)
  
  // Shopping mode
  const [shoppingItem, setShoppingItem] = useState(null)
  const [aiMatches, setAiMatches] = useState([])
  const [matchExplanation, setMatchExplanation] = useState('')
  
  // CV Capture
  const [showCVCapture, setShowCVCapture] = useState(false)
  const [cvStep, setCvStep] = useState('capture')
  const [cvResults, setCvResults] = useState(null)

  // Persist wardrobe to localStorage
  useEffect(() => {
    storage.set('wardrobe', wardrobe)
  }, [wardrobe])

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Filter wardrobe
  const filteredWardrobe = wardrobe.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory
    const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return categoryMatch && searchMatch
  })

  // AI Chat function
  const sendMessage = async () => {
    if (!chatInput.trim()) return
    
    const userMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsAITyping(true)

    const wardrobeContext = wardrobe.map(item => 
      `- ${item.name}: ${item.colors.join('/')} ${item.category}, ${item.style}, for ${item.occasion.join('/')}, at ${item.location}`
    ).join('\n')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert personal stylist AI for ClosetMatch. Help users create outfits from their wardrobe.

User's wardrobe:
${wardrobeContext}

Guidelines:
- Reference specific items by name and location
- Suggest complete outfits when appropriate
- Be warm and encouraging
- Keep responses concise (2-3 paragraphs max)`,
          messages: [...chatMessages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content?.[0]?.text || "I'd love to help! Tell me more about the occasion."
      }])
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having connection issues. Try your Navy Blazer with White Oxford Shirt and Gray Chinos for a classic look!"
      }])
    }
    
    setIsAITyping(false)
  }

  // AI Matching
  const getAIMatches = async (item) => {
    setIsAITyping(true)
    
    const otherItems = wardrobe.filter(w => w.id !== item.id).map(w => 
      `${w.name} (${w.colors.join('/')}, ${w.category})`
    ).join(', ')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `I have: ${item.name} (${item.colors.join('/')} ${item.category}, ${item.style}).

My wardrobe: ${otherItems}

Return JSON only: {"matches":[{"name":"exact item name","score":85,"reason":"5 words"}],"explanation":"1 sentence"}`
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const matchedItems = (parsed.matches || []).map(m => {
          const found = wardrobe.find(w => w.name.toLowerCase().includes(m.name.toLowerCase().split(' ')[0]))
          return found ? { ...found, matchScore: m.score, reason: m.reason } : null
        }).filter(Boolean).slice(0, 5)
        
        setAiMatches(matchedItems)
        setMatchExplanation(parsed.explanation || '')
      }
    } catch {
      // Fallback matches
      setAiMatches(wardrobe.filter(w => w.id !== item.id).slice(0, 3).map(w => ({
        ...w, matchScore: 80, reason: 'Complementary style'
      })))
    }
    
    setIsAITyping(false)
  }

  // Simulated CV
  const runCVAnalysis = () => {
    setCvStep('analyzing')
    setTimeout(() => {
      setCvResults({
        colors: ['gray'],
        category: 'tops',
        subcategory: 'sweater',
        style: 'smart-casual',
        confidence: 91,
        suggestedName: 'Gray Sweater'
      })
      setCvStep('results')
    }, 2000)
  }

  const addCVItem = () => {
    if (!cvResults) return
    setWardrobe([...wardrobe, {
      id: Date.now(),
      name: cvResults.suggestedName,
      category: cvResults.category,
      colors: cvResults.colors,
      style: cvResults.style,
      occasion: ['casual'],
      location: '',
      image: '👔',
      wears: 0
    }])
    setShowCVCapture(false)
    setCvStep('capture')
    setCvResults(null)
  }

  const getCategoryEmoji = (cat) => ({ tops: '👔', bottoms: '👖', outerwear: '🧥', shoes: '👟', accessories: '👜' }[cat] || '👕')

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-stone-950 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-wider text-violet-100">
              Closet<span className="font-semibold text-violet-400">Match</span>
              <span className="ml-2 text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">AI</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAIChat(true)} className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Bot size={18} className="text-violet-400" />
            </button>
            <button onClick={() => setShowCVCapture(true)} className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Scan size={18} className="text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 px-5 pb-24">
        {activeTab === 'closet' && (
          <div className="space-y-4">
            <button onClick={() => setShowAIChat(true)} className="w-full p-4 bg-gradient-to-r from-violet-950/50 to-purple-900/30 border border-violet-500/30 rounded-2xl flex items-center gap-4">
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

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selectedCategory === cat ? 'bg-violet-500 text-white' : 'bg-stone-900/60 text-stone-400 border border-stone-800'}`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredWardrobe.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); getAIMatches(item) }}
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
                <Zap size={14} />AI Shopping Mode
              </span>
            </div>

            {!shoppingItem ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-48 h-64 bg-stone-900 border-2 border-dashed border-stone-700 rounded-3xl flex flex-col items-center justify-center mb-6">
                  <Scan size={48} className="text-stone-600 mb-4" />
                  <p className="text-stone-500 text-sm text-center px-4">AI analyzes & finds matches</p>
                </div>
                <button
                  onClick={() => {
                    setCvStep('analyzing')
                    setTimeout(() => {
                      const item = { id: 'temp', name: 'Gray Blazer', colors: ['gray'], category: 'tops', style: 'formal', image: '🧥' }
                      setShoppingItem(item)
                      getAIMatches(item)
                      setCvStep('results')
                    }, 2000)
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-violet-500 text-white rounded-2xl font-semibold flex items-center gap-3"
                >
                  <Camera size={20} />AI Capture
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-stone-900/80 rounded-2xl p-5 border border-violet-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-stone-800 rounded-xl flex items-center justify-center text-4xl">{shoppingItem.image}</div>
                    <div className="flex-1">
                      <p className="text-xs text-violet-400 uppercase">AI Detected</p>
                      <h3 className="text-lg font-medium text-stone-200">{shoppingItem.name}</h3>
                    </div>
                    <button onClick={() => { setShoppingItem(null); setAiMatches([]) }}><X size={20} className="text-stone-500" /></button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-stone-400 mb-2 flex items-center gap-2">
                    <Brain size={14} className="text-violet-400" />AI Matches
                  </h3>
                  {matchExplanation && <p className="text-xs text-stone-500 mb-3 p-3 bg-stone-900/50 rounded-lg">{matchExplanation}</p>}
                  
                  {isAITyping ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader size={24} className="text-violet-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiMatches.map(match => (
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
            <button onClick={() => setShowAIChat(true)} className="w-full p-5 bg-gradient-to-r from-violet-950/50 to-purple-900/30 border border-violet-500/30 rounded-2xl text-left">
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
                <Share2 size={16} />Share
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
              {wardrobe.slice(0, 9).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); getAIMatches(item) }}
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800 px-2 py-2 z-20 pb-safe">
        <div className="flex justify-around">
          {[
            { id: 'closet', icon: Grid3X3, label: 'Closet' },
            { id: 'shopping', icon: ShoppingBag, label: 'Shop' },
            { id: 'stylist', icon: Crown, label: 'Stylist' },
            { id: 'social', icon: Users, label: 'Social' },
            { id: 'matches', icon: Brain, label: 'AI Match' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${activeTab === tab.id ? 'text-violet-400 bg-violet-500/10' : 'text-stone-500'}`}
            >
              <tab.icon size={20} />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Bot size={20} className="text-violet-400" />
              </div>
              <div>
                <h3 className="font-medium text-stone-200">AI Style Assistant</h3>
                <p className="text-xs text-emerald-400">Online • Knows your wardrobe</p>
              </div>
            </div>
            <button onClick={() => setShowAIChat(false)}><X size={24} className="text-stone-500" /></button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Brain size={48} className="mx-auto text-violet-500/50 mb-4" />
                <h3 className="text-lg font-medium text-stone-300 mb-6">Ask me anything about outfits!</h3>
                {["What should I wear to a job interview?", "Create a casual weekend outfit", "What goes with my navy blazer?"].map(s => (
                  <button key={s} onClick={() => setChatInput(s)} className="block w-full px-4 py-3 bg-stone-900/50 border border-stone-800 rounded-xl text-sm text-stone-400 hover:border-violet-500/30 mb-2 text-left">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-violet-500 text-white' : 'bg-stone-800 text-stone-200'}`}>
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

          <div className="p-4 border-t border-stone-800 bg-stone-950 pb-safe">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about outfits..."
                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
              />
              <button onClick={sendMessage} disabled={!chatInput.trim() || isAITyping} className="px-4 py-3 bg-violet-500 text-white rounded-xl disabled:opacity-50">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Capture Modal */}
      {showCVCapture && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="font-medium text-stone-200">AI Scanner</h3>
            <button onClick={() => { setShowCVCapture(false); setCvStep('capture'); setCvResults(null) }}><X size={24} className="text-stone-500" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-5">
            {cvStep === 'capture' && (
              <>
                <div className="w-64 h-80 bg-stone-900 border-2 border-dashed border-stone-700 rounded-3xl flex flex-col items-center justify-center mb-6">
                  <Scan size={48} className="text-violet-500/50 mb-4" />
                  <p className="text-stone-500 text-sm">Position item in frame</p>
                </div>
                <button onClick={runCVAnalysis} className="px-8 py-4 bg-violet-500 text-white rounded-2xl font-semibold flex items-center gap-3">
                  <Scan size={20} />Analyze
                </button>
              </>
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
                    <div className="flex justify-between"><span className="text-stone-500">Colors</span><span className="text-stone-300">{cvResults.colors.join(', ')}</span></div>
                    <div className="flex justify-between"><span className="text-stone-500">Style</span><span className="text-stone-300">{cvResults.style}</span></div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowCVCapture(false); setCvStep('capture'); setCvResults(null) }} className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-xl">Cancel</button>
                  <button onClick={addCVItem} className="flex-1 py-3 bg-violet-500 text-white rounded-xl flex items-center justify-center gap-2">
                    <Plus size={18} />Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Detail */}
      {selectedItem && activeTab === 'closet' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-stone-900 rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-auto pb-safe">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-stone-200">{selectedItem.name}</h2>
              <button onClick={() => { setSelectedItem(null); setAiMatches([]) }}><X size={24} className="text-stone-500" /></button>
            </div>
            <div className="flex gap-4 mb-5">
              <div className="w-24 h-24 bg-stone-800 rounded-xl flex items-center justify-center text-5xl">{selectedItem.image}</div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-violet-400" />
                  <p className="text-sm text-violet-400">{selectedItem.location}</p>
                </div>
                <div className="flex gap-1">{selectedItem.colors.map(c => <span key={c} className="px-2 py-1 bg-stone-800 rounded text-xs">{c}</span>)}</div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-stone-400 mb-3 flex items-center gap-2"><Brain size={14} className="text-violet-400" />AI Matches</h3>
            {isAITyping ? (
              <div className="flex items-center justify-center py-6"><Loader size={20} className="text-violet-400 animate-spin" /></div>
            ) : aiMatches.length > 0 ? (
              <div className="space-y-2 mb-5">
                {aiMatches.slice(0, 3).map(m => (
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
            <button onClick={() => setActiveTab('matches')} className="w-full py-4 bg-violet-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              <Brain size={18} />See All Matches
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
