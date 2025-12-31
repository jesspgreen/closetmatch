import React, { useState, useRef } from 'react';
import { Camera, Image, X, Loader, Check, ChevronRight, Shirt, AlertCircle } from 'lucide-react';

export default function ClosetScanner({ onItemsDetected, onCancel }) {
  const [step, setStep] = useState('intro'); // intro, capture, analyzing, results
  const [scanType, setScanType] = useState('closet'); // closet, flatlay
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  
  const fileInputRef = useRef(null);

  // Handle image selection
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setStep('analyzing');
      analyzeImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Analyze image with AI
  const analyzeImage = async (imageData) => {
    setAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/detect-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          type: scanType,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setStep('capture');
        return;
      }

      if (data.items && data.items.length > 0) {
        setItems(data.items);
        // Select all items by default
        setSelectedItems(new Set(data.items.map((_, i) => i)));
        setStep('results');
      } else {
        setError('No clothing items detected. Try a clearer photo.');
        setStep('capture');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Analysis failed. Please try again.');
      setStep('capture');
    } finally {
      setAnalyzing(false);
    }
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
    onItemsDetected(selected);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between bg-stone-950 border-b border-stone-800">
        <h3 className="font-medium text-stone-200">
          {step === 'intro' && 'Scan Your Closet'}
          {step === 'capture' && 'Take Photo'}
          {step === 'analyzing' && 'Analyzing...'}
          {step === 'results' && `Found ${items.length} Items`}
        </h3>
        <button onClick={onCancel}>
          <X size={24} className="text-stone-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="p-5 space-y-6">
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Shirt size={40} className="text-violet-400" />
              </div>
              <h2 className="text-xl font-medium text-stone-200 mb-2">AI Closet Scanner</h2>
              <p className="text-stone-500 text-sm">
                Take a photo of your closet or lay out items flat. Our AI will identify each piece.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setScanType('closet'); setStep('capture'); }}
                className="w-full p-5 bg-stone-900 border border-stone-800 rounded-2xl flex items-center gap-4 hover:border-violet-500/30 transition-colors text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-3xl">
                  🚪
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-stone-200">Closet Photo</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Open your closet and photograph everything at once
                  </p>
                </div>
                <ChevronRight size={20} className="text-stone-600" />
              </button>

              <button
                onClick={() => { setScanType('flatlay'); setStep('capture'); }}
                className="w-full p-5 bg-stone-900 border border-stone-800 rounded-2xl flex items-center gap-4 hover:border-violet-500/30 transition-colors text-left"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-3xl">
                  📐
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-stone-200">Flat Lay</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Lay 5-10 items flat on a surface for best accuracy
                  </p>
                </div>
                <ChevronRight size={20} className="text-stone-600" />
              </button>
            </div>

            <div className="p-4 bg-amber-950/30 border border-amber-800/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Tips for best results</p>
                  <ul className="text-xs text-stone-400 mt-1 space-y-1">
                    <li>• Good lighting - natural light works best</li>
                    <li>• Items clearly visible and separated</li>
                    <li>• Avoid blurry or dark photos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Capture Step */}
        {step === 'capture' && (
          <div className="p-5">
            <div className="text-center mb-6">
              <p className="text-stone-400">
                {scanType === 'closet' 
                  ? 'Photograph your open closet' 
                  : 'Photograph items laid flat on a surface'}
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] bg-stone-900 border-2 border-dashed border-stone-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/50 transition-colors"
            >
              {image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover rounded-3xl" />
              ) : (
                <>
                  <Camera size={48} className="text-stone-600 mb-4" />
                  <p className="text-stone-500">Tap to take photo</p>
                  <p className="text-stone-600 text-xs mt-1">or select from gallery</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />

            {error && (
              <div className="mt-4 p-3 bg-red-950/50 border border-red-800/50 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={() => setStep('intro')}
              className="w-full mt-4 py-3 bg-stone-800 text-stone-300 rounded-xl"
            >
              Back
            </button>
          </div>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-5">
            <div className="relative mb-6">
              {image && (
                <img 
                  src={image} 
                  alt="Analyzing" 
                  className="w-48 h-64 object-cover rounded-2xl opacity-50"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Loader size={40} className="text-violet-400 animate-spin" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-medium text-stone-200 mb-2">Analyzing Your Clothes</h3>
            <p className="text-stone-500 text-sm text-center">
              AI is identifying each item...
            </p>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-stone-400">Select items to add:</p>
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

            <div className="space-y-3 mb-6">
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedItems.has(index) ? 'bg-violet-500' : 'bg-stone-700'
                  }`}>
                    {selectedItems.has(index) && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-stone-200">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-400">
                        {item.category}
                      </span>
                      {item.colors?.map((color, i) => (
                        <span key={i} className="px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-400">
                          {color}
                        </span>
                      ))}
                      <span className="text-xs text-stone-500">
                        {item.confidence}% confident
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('capture'); setImage(null); setItems([]); }}
                className="flex-1 py-4 bg-stone-800 text-stone-300 rounded-xl"
              >
                Retake
              </button>
              <button
                onClick={confirmItems}
                disabled={selectedItems.size === 0}
                className="flex-1 py-4 bg-violet-500 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                Add {selectedItems.size} Items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
