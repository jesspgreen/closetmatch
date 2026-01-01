import React, { useState, useRef, useCallback } from 'react';
import { 
  Camera, X, Loader, Check, ChevronRight, Shirt, AlertCircle, 
  CheckSquare, Square, Edit3, Save, RotateCcw, Plus, Trash2
} from 'lucide-react';
import EditableBoundingBox from './EditableBoundingBox';

// Category colors for bounding boxes
const categoryColors = {
  tops: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' },
  bottoms: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
  outerwear: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' },
  shoes: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },
  accessories: { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)' },
};

export default function ClosetScanner({ onItemsDetected, onCancel }) {
  const [step, setStep] = useState('intro');
  const [scanType, setScanType] = useState('closet');
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  
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
      const imageData = e.target.result;
      setImage(imageData);
      setStep('analyzing');
      analyzeImage(imageData);
    };
    reader.onerror = () => {
      setError('Failed to read image. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Analyze image with streaming AI
  const analyzeImage = async (imageData) => {
    setError('');
    setStreamingText('');
    setAnalyzing(true);
    
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analysis failed');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // The AI SDK stream format sends data as: 0:"text chunk"\n
        // We need to extract the actual text content
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:"')) {
            // Extract text between 0:" and trailing "
            const match = line.match(/^0:"(.*)"/);
            if (match) {
              // Unescape the string (handle \n, \", etc.)
              const unescaped = match[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
              fullText += unescaped;
            }
          } else if (line && !line.startsWith('e:') && !line.startsWith('d:')) {
            // Fallback: might be plain text
            fullText += line;
          }
        }
        
        setStreamingText(fullText);
      }

      console.log('Full streamed text:', fullText);

      // Parse the final JSON
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsedItems = JSON.parse(jsonMatch[0]);
          if (parsedItems && parsedItems.length > 0) {
            const itemsWithIds = parsedItems.map((item, index) => ({
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
        } catch (parseErr) {
          console.error('JSON parse error:', parseErr, 'Text:', jsonMatch[0]);
          setError('Could not parse AI response. Please try again.');
          setStep('capture');
        }
      } else {
        console.error('No JSON array found in:', fullText);
        setError('Could not parse AI response. Please try again.');
        setStep('capture');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
      setStep('capture');
    } finally {
      setAnalyzing(false);
      setStreamingText('');
    }
  };

  // Update an item (for editing bounding box or name)
  const updateItem = useCallback((updatedItem) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  }, []);

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

  // Delete an item
  const deleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
    setEditingItemId(null);
  };

  // Add a new manual bounding box
  const addManualBox = () => {
    const newItem = {
      id: Date.now(),
      name: 'New Item',
      category: 'tops',
      colors: [],
      style: 'casual',
      pattern: 'solid',
      material: 'unknown',
      confidence: 100,
      boundingBox: { x: 30, y: 30, width: 20, height: 30 },
      sourceImage: image,
    };
    setItems(prev => [...prev, newItem]);
    setSelectedItems(prev => new Set([...prev, newItem.id]));
    setEditingItemId(newItem.id);
  };

  // Crop image based on bounding box
  const cropImageFromBox = async (sourceImage, boundingBox) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const x = (boundingBox.x / 100) * img.width;
        const y = (boundingBox.y / 100) * img.height;
        const width = (boundingBox.width / 100) * img.width;
        const height = (boundingBox.height / 100) * img.height;

        const padding = 0.05;
        const paddedX = Math.max(0, x - width * padding);
        const paddedY = Math.max(0, y - height * padding);
        const paddedWidth = Math.min(img.width - paddedX, width * (1 + padding * 2));
        const paddedHeight = Math.min(img.height - paddedY, height * (1 + padding * 2));

        const canvas = document.createElement('canvas');
        canvas.width = paddedWidth;
        canvas.height = paddedHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          paddedX, paddedY, paddedWidth, paddedHeight,
          0, 0, paddedWidth, paddedHeight
        );

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
      img.src = sourceImage;
    });
  };

  // Confirm and crop selected items
  const confirmItems = async () => {
    const selected = items.filter(item => selectedItems.has(item.id));
    
    const itemsWithCroppedImages = await Promise.all(
      selected.map(async (item) => {
        if (item.boundingBox && image) {
          try {
            const croppedImage = await cropImageFromBox(image, item.boundingBox);
            return { ...item, croppedImage, sourceImage: image };
          } catch (err) {
            console.error('Failed to crop:', err);
            return item;
          }
        }
        return item;
      })
    );
    
    onItemsDetected(itemsWithCroppedImages);
  };

  // Reset and try again
  const retryCapture = () => {
    setStep('capture');
    setImage(null);
    setItems([]);
    setSelectedItems(new Set());
    setError('');
    setEditMode(false);
    setEditingItemId(null);
    setStreamingText('');
  };

  // Get color for item
  const getItemColor = (item) => {
    return categoryColors[item.category] || categoryColors.tops;
  };

  // Count items being detected from streaming text
  const getStreamingItemCount = () => {
    const matches = streamingText.match(/"name"\s*:/g);
    return matches ? matches.length : 0;
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
        <div className="flex items-center gap-3">
          {step === 'results' && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                editMode 
                  ? 'bg-violet-500 text-white' 
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              <Edit3 size={14} />
              {editMode ? 'Done Editing' : 'Edit Boxes'}
            </button>
          )}
          <button onClick={onCancel}>
            <X size={24} className="text-stone-500" />
          </button>
        </div>
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
                Take a photo and our AI will identify each piece. You can adjust the boxes if needed.
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

            <div className="p-4 bg-violet-950/30 border border-violet-800/30 rounded-xl">
              <div className="flex items-start gap-3">
                <Edit3 size={20} className="text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-violet-400">Editable Boxes</p>
                  <p className="text-xs text-stone-400 mt-1">
                    After scanning, you can drag and resize boxes to adjust what's captured for each item.
                  </p>
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

        {/* Analyzing Step with Streaming Feedback */}
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
            <p className="text-stone-500 text-sm text-center mb-4">
              AI is identifying each item with precise locations...
            </p>
            
            {/* Streaming progress indicator */}
            {streamingText && (
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-center gap-2 text-violet-400">
                  <Shirt size={16} />
                  <span className="text-sm">
                    Found {getStreamingItemCount()} item{getStreamingItemCount() !== 1 ? 's' : ''} so far...
                  </span>
                </div>
                <div className="mt-2 h-1 bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Step with Editable Bounding Boxes */}
        {step === 'results' && (
          <div className="flex flex-col h-full">
            {/* Edit mode instructions */}
            {editMode && (
              <div className="px-4 py-2 bg-violet-900/30 border-b border-violet-800/50">
                <p className="text-xs text-violet-300 text-center">
                  👆 Drag boxes to move • Drag corners to resize • Tap label to edit name
                </p>
              </div>
            )}
            
            {/* Image with Bounding Boxes */}
            <div 
              ref={imageContainerRef}
              className="relative flex-shrink-0"
              onClick={() => setEditingItemId(null)}
            >
              <img 
                src={image} 
                alt="Scanned closet" 
                className="w-full h-auto"
              />
              
              {/* Editable Bounding Boxes */}
              {items.map((item) => (
                <EditableBoundingBox
                  key={item.id}
                  item={item}
                  isSelected={selectedItems.has(item.id)}
                  isEditing={editMode}
                  onSelect={() => {
                    if (editMode) {
                      setEditingItemId(item.id);
                    } else {
                      toggleItem(item.id);
                    }
                  }}
                  onUpdate={updateItem}
                  onStartEdit={() => setEditingItemId(item.id)}
                  onEndEdit={() => setEditingItemId(null)}
                  containerRef={imageContainerRef}
                  color={getItemColor(item)}
                />
              ))}
              
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
              {/* Top row controls */}
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
                
                {editMode && (
                  <button
                    onClick={addManualBox}
                    className="flex items-center gap-2 text-sm text-emerald-400"
                  >
                    <Plus size={18} />
                    Add Box
                  </button>
                )}
              </div>

              {/* Item List */}
              <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded-lg flex items-center gap-3 transition-all ${
                      selectedItems.has(item.id)
                        ? 'bg-green-500/20 border border-green-500'
                        : 'bg-stone-800 border border-stone-700'
                    } ${editingItemId === item.id ? 'ring-2 ring-violet-500' : ''}`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        selectedItems.has(item.id) ? 'bg-green-500' : 'bg-stone-600'
                      }`}
                    >
                      {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
                    </button>
                    
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getItemColor(item).border }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200 truncate">{item.name}</p>
                      <p className="text-xs text-stone-500">{item.category}</p>
                    </div>
                    
                    {editMode && (
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={retryCapture}
                  className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Retake
                </button>
                <button
                  onClick={confirmItems}
                  disabled={selectedItems.size === 0}
                  className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save {selectedItems.size} Items
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
