import { useState, useEffect, useCallback } from 'react';
import { refreshExpiredUrls } from '../lib/supabase';

/**
 * Custom hook to manage wardrobe with automatic signed URL refresh
 * @param {string} storageKey - localStorage key for wardrobe
 * @param {Array} defaultValue - default wardrobe items
 * @returns {[Array, Function, boolean]} - [wardrobe, setWardrobe, isRefreshing]
 */
export function useWardrobeWithUrlRefresh(storageKey = 'closetmatch_wardrobe', defaultValue = []) {
  const [wardrobe, setWardrobe] = useState(defaultValue);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load wardrobe from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWardrobe(parsed);
        }
      }
    } catch (e) {
      console.log('Could not load wardrobe');
    }
    setLoaded(true);
  }, [storageKey]);

  // Refresh expired URLs after loading
  useEffect(() => {
    if (!loaded || wardrobe.length === 0) return;

    const refreshUrls = async () => {
      // Check if any items have photos that might need refreshing
      const hasPhotos = wardrobe.some(item => item.isPhoto && item.imagePath);
      if (!hasPhotos) return;

      setIsRefreshing(true);
      try {
        const refreshedWardrobe = await refreshExpiredUrls(wardrobe);
        
        // Only update if URLs actually changed
        const hasChanges = refreshedWardrobe.some((item, i) => 
          item.image !== wardrobe[i]?.image
        );
        
        if (hasChanges) {
          setWardrobe(refreshedWardrobe);
        }
      } catch (e) {
        console.error('Failed to refresh URLs:', e);
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshUrls();
  }, [loaded]); // Only run once after initial load

  // Save wardrobe to localStorage whenever it changes
  useEffect(() => {
    if (!loaded) return; // Don't save until we've loaded
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(wardrobe));
    } catch (e) {
      console.log('Could not save wardrobe');
    }
  }, [wardrobe, storageKey, loaded]);

  // Periodic refresh (every 6 hours while app is open)
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasPhotos = wardrobe.some(item => item.isPhoto && item.imagePath);
      if (!hasPhotos) return;

      try {
        const refreshedWardrobe = await refreshExpiredUrls(wardrobe);
        const hasChanges = refreshedWardrobe.some((item, i) => 
          item.image !== wardrobe[i]?.image
        );
        if (hasChanges) {
          setWardrobe(refreshedWardrobe);
        }
      } catch (e) {
        console.error('Periodic refresh failed:', e);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    return () => clearInterval(interval);
  }, [wardrobe]);

  return [wardrobe, setWardrobe, isRefreshing];
}

export default useWardrobeWithUrlRefresh;
