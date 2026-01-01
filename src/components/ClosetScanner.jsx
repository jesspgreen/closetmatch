import React, { useState, useRef } from 'react';
import { Camera, X, Loader, Check, ChevronRight, Shirt, AlertCircle, CheckSquare, Square, ZoomIn, ZoomOut } from 'lucide-react';

// Category colors for bounding boxes
const categoryColors = {
  tops: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' },      // violet
  bottoms: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },   // blue
  outerwear: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' }, // amber
  shoes: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },     // emerald
  accessories: { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)' }, // pink
};

const selectedColor = { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.3)' }; // green for selected

export default function ClosetScanner({ onItemsDetected, onCancel }) {
  const [step, setStep] = useState('intro'); // intro, capture, analyzing, results
  const [scanType, setScanType] = useState('closet'); // closet, flatlay
  const [image, setImage] = useState(null); // base64 of uploaded image
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Handle image selection
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Please use an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setStep('analyzing');
      analyzeImage(e.target.result);
    };
    reader.onerror = () => {
      setError('Failed to read image. Please try again.');
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

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setStep('capture');
        return;
      }

      if (data.items && data.items.length > 0) {
        const itemsWithIds = data.items.map((item, index) => ({
          ...item,
          id: Date.now() + index,
          sourceImage: imageData,
        }));
        setItems(itemsWithIds);
        setSelectedItems(new Set(itemsWithIds.map(item => item.id)));
        setStep('results');
      } else {
        setError('No clothing items detected. Try a clearer photo with better lighting.');
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
  const toggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  // Confirm selected items
  const confirmItems = () => {
    const selected = items.filter(item => selectedItems.has(item.id));
    onItemsDetected(selected.map(item => ({
      ...item,
      sourceImage: image,
    })));
  };

  // Reset and try again
  const retryCapture = () => {
    setStep('capture');
    setImage(null);
    setItems([]);
    setSelectedItems(new Set());
    setError('');
    setHoveredItem(null);
  };

  // Get color for bounding box
  const getBoxColor = (item) => {
    if (selectedItems.has(item.id)) {
      return selectedColor;
    }
    return categoryColors[item.category] || categoryColors.tops;
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
                Take a photo of your closet or lay out items flat. Our AI will identify each piece and show you exactly where it found them.
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

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[3/4] bg-stone-900 border-2 border-dashed border-stone-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/50 transition-colors"
            >
              <Camera size={48} className="text-stone-600 mb-4" />
              <p className="text-stone-500">Tap to take photo</p>
              <p className="text-stone-600 text-xs mt-1">or select from gallery</p>
            </button>

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
              AI is identifying each item and its location...
            </p>
          </div>
        )}

        {/* Results Step with Bounding Boxes */}
        {step === 'results' && (
          <div className="flex flex-col h-full">
            {/* Image with Bounding Boxes */}
            <div className="relative flex-shrink-0" ref={imageContainerRef}>
              <div className="relative w-full">
                <img 
                  src={image} 
                  alt="Scanned closet" 
                  className="w-full h-auto"
                />
                
                {/* Bounding Box Overlays */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ overflow: 'visible' }}
                >
                  {items.map((item) => {
                    const box = item.boundingBox;
                    if (!box) return null;
                    
                    const color = getBoxColor(item);
                    const isHovered = hoveredItem === item.id;
                    const isSelected = selectedItems.has(item.id);
                    
                    return (
                      <g key={item.id}>
                        {/* Bounding box rectangle */}
                        <rect
                          x={`${box.x}%`}
                          y={`${box.y}%`}
                          width={`${box.width}%`}
                          height={`${box.height}%`}
                          fill={color.bg}
                          stroke={color.border}
                          strokeWidth={isHovered || isSelected ? 3 : 2}
                          className="pointer-events-auto cursor-pointer transition-all"
                          onClick={() => toggleItem(item.id)}
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          style={{ 
                            opacity: isSelected ? 1 : 0.7,
                            filter: isHovered ? 'brightness(1.2)' : 'none'
                          }}
                        />
                        
                        {/* Selection checkmark */}
                        {isSelected && (
                          <circle
                            cx={`${box.x + box.width - 2}%`}
                            cy={`${box.y + 2}%`}
                            r="12"
                            fill="#22c55e"
                            className="pointer-events-none"
                          />
                        )}
                        
                        {/* Label */}
                        {showLabels && (
                          <g className="pointer-events-none">
                            <rect
                              x={`${box.x}%`}
                              y={`${box.y - 6}%`}
                              width={`${Math.min(box.width + 10, 40)}%`}
                              height="6%"
                              fill={color.border}
                              rx="4"
                            />
                            <text
                              x={`${box.x + 1}%`}
                              y={`${box.y - 2}%`}
                              fill="white"
                              fontSize="10"
                              fontWeight="500"
                              className="pointer-events-none"
                            >
                              {item.name.substring(0, 20)}{item.name.length > 20 ? '...' : ''}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-2">
                {Object.entries(categoryColors).map(([cat, colors]) => {
                  const count = items.filter(i => i.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <div key={cat} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: colors.border }}
                      />
                      <span className="text-xs text-white">{cat} ({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-stone-900 border-t border-stone-800">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-violet-400"
                >
                  {selectedItems.size === items.length ? (
                    <>
                      <CheckSquare size={18} />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square size={18} />
                      Select All
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`text-sm ${showLabels ? 'text-violet-400' : 'text-stone-500'}`}
                >
                  {showLabels ? 'Hide Labels' : 'Show Labels'}
                </button>
              </div>
              
              <p className="text-stone-400 text-xs mb-3 text-center">
                Tap boxes on image to select/deselect items
              </p>

              {/* Item List (scrollable) */}
              <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`w-full p-2 rounded-lg flex items-center gap-3 text-left transition-all ${
                      selectedItems.has(item.id)
                        ? 'bg-green-500/20 border border-green-500'
                        : 'bg-stone-800 border border-stone-700'
                    } ${hoveredItem === item.id ? 'ring-2 ring-violet-500' : ''}`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[item.category]?.border || '#8b5cf6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200 truncate">{item.name}</p>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedItems.has(item.id) ? 'bg-green-500' : 'bg-stone-600'
                    }`}>
                      {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={retryCapture}
                  className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-xl"
                >
                  Retake
                </button>
                <button
                  onClick={confirmItems}
                  disabled={selectedItems.size === 0}
                  className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  Add {selectedItems.size} Items
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
