import React, { useState } from 'react';
import { Plus, X, Camera } from 'lucide-react';
import PhotoUploader from './PhotoUploader';
import { deleteImage } from '../lib/supabase';

const categories = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];

const categoryEmojis = {
  tops: ['👔', '👕', '🧥', '🧶', '👚'],
  bottoms: ['👖', '🩳', '🩱'],
  outerwear: ['🧥', '🧣', '🧤'],
  shoes: ['👟', '👞', '👠', '🥾', '👢'],
  accessories: ['👜', '🎒', '👒', '🧢', '⌚', '👓'],
};

const styleOptions = ['casual', 'formal', 'smart-casual', 'athletic', 'evening'];

export default function AddItemModal({ isOpen, onClose, onAdd, userId }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('tops');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('casual');
  const [location, setLocation] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👔');
  
  // Photo state - now includes path and expiry for signed URLs
  const [photoData, setPhotoData] = useState(null); // { url, path, expiresAt }
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  const handlePhotoUpload = (data) => {
    // data = { url, path, expiresAt }
    setPhotoData(data);
    setShowPhotoUploader(false);
  };

  const removePhoto = async () => {
    if (photoData?.path) {
      await deleteImage(photoData.path);
    }
    setPhotoData(null);
  };

  const resetForm = () => {
    setName('');
    setCategory('tops');
    setColor('');
    setStyle('casual');
    setLocation('');
    setSelectedEmoji('👔');
    setPhotoData(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      id: Date.now(),
      name: name.trim(),
      category,
      colors: color ? [color.toLowerCase().trim()] : [],
      style,
      location: location.trim(),
      // Photo or emoji
      image: photoData?.url || selectedEmoji,
      imagePath: photoData?.path || null,
      imageExpiresAt: photoData?.expiresAt || null,
      isPhoto: !!photoData,
      wears: 0,
      createdAt: Date.now(),
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  if (showPhotoUploader) {
    return (
      <PhotoUploader
        userId={userId}
        onUpload={handlePhotoUpload}
        onCancel={() => setShowPhotoUploader(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-stone-900 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-stone-200">Add New Item</h2>
          <button onClick={handleClose}>
            <X size={24} className="text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload */}
          <div>
            <label className="text-sm text-stone-400 mb-2 block">Photo</label>
            {photoData ? (
              <div className="relative w-32 h-32">
                <img 
                  src={photoData.url} 
                  alt="Item" 
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPhotoUploader(true)}
                className="w-full p-4 border-2 border-dashed border-stone-700 rounded-xl flex items-center justify-center gap-3 hover:border-violet-500/50 transition-colors"
              >
                <Camera size={24} className="text-stone-500" />
                <span className="text-stone-400">Add Photo</span>
              </button>
            )}
          </div>

          {/* Emoji Selector (only if no photo) */}
          {!photoData && (
            <div>
              <label className="text-sm text-stone-400 mb-2 block">Or choose an icon</label>
              <div className="flex gap-2 flex-wrap">
                {categoryEmojis[category]?.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                      selectedEmoji === emoji 
                        ? 'bg-violet-500/30 border-2 border-violet-500 scale-110' 
                        : 'bg-stone-800 border border-stone-700 hover:border-stone-600'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-sm text-stone-400 mb-2 block">Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Blue Oxford Shirt"
              required
              className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm text-stone-400 mb-2 block">Category</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    if (!photoData) setSelectedEmoji(categoryEmojis[cat]?.[0] || '👔');
                  }}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    category === cat 
                      ? 'bg-violet-500 text-white' 
                      : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-sm text-stone-400 mb-2 block">Primary Color</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g., Navy, Black, White"
              className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Style */}
          <div>
            <label className="text-sm text-stone-400 mb-2 block">Style</label>
            <div className="flex gap-2 flex-wrap">
              {styleOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    style === s 
                      ? 'bg-violet-500 text-white' 
                      : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm text-stone-400 mb-2 block">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Main Closet - Left Side"
              className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 bg-violet-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-violet-400 transition-colors disabled:opacity-50 disabled:hover:bg-violet-500"
          >
            <Plus size={20} />
            Add to Wardrobe
          </button>
        </form>
      </div>
    </div>
  );
}
