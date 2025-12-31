import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase credentials missing!');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => supabase !== null;

// ==================== STORAGE CONFIGURATION ====================
const BUCKET_NAME = 'wardrobe-images';
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// ==================== STORAGE HELPERS ====================

/**
 * Validate file before upload
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error?: string}}
 */
export const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  // Check file type (also handle HEIC from iPhones)
  const fileType = file.type.toLowerCase();
  if (!ALLOWED_TYPES.includes(fileType) && !file.name.toLowerCase().endsWith('.heic')) {
    return { valid: false, error: 'Only JPG, PNG, WebP, and HEIC images are allowed' };
  }

  return { valid: true };
};

/**
 * Upload an image to Supabase Storage (private bucket with signed URLs)
 * @param {File} file - The image file to upload
 * @param {string} userId - User's ID for organizing files
 * @returns {Promise<{signedUrl: string, path: string, expiresAt: number} | null>}
 */
export const uploadImage = async (file, userId) => {
  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    console.error('Validation error:', validation.error);
    return null;
  }

  try {
    // Create unique filename within user's folder
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to private bucket
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg'
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get signed URL (expires in 7 days)
    const signedUrlResult = await getSignedUrl(data.path);
    
    if (!signedUrlResult) {
      console.error('Failed to get signed URL');
      return null;
    }

    return {
      signedUrl: signedUrlResult.signedUrl,
      path: data.path,
      expiresAt: signedUrlResult.expiresAt
    };
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
};

/**
 * Get a signed URL for a file (expires after set time)
 * @param {string} path - The file path in storage
 * @param {number} expiresIn - Expiry time in seconds (default 7 days)
 * @returns {Promise<{signedUrl: string, expiresAt: number} | null>}
 */
export const getSignedUrl = async (path, expiresIn = SIGNED_URL_EXPIRY) => {
  if (!supabase || !path) return null;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return {
      signedUrl: data.signedUrl,
      expiresAt: Date.now() + (expiresIn * 1000)
    };
  } catch (err) {
    console.error('Failed to get signed URL:', err);
    return null;
  }
};

/**
 * Refresh signed URLs for wardrobe items that are expiring soon
 * @param {Array} wardrobe - Array of wardrobe items
 * @param {number} refreshThreshold - Refresh if expiring within this many ms (default 1 day)
 * @returns {Promise<Array>} - Updated wardrobe with fresh URLs
 */
export const refreshExpiredUrls = async (wardrobe, refreshThreshold = 24 * 60 * 60 * 1000) => {
  if (!supabase || !wardrobe?.length) return wardrobe;

  const now = Date.now();
  const updatedWardrobe = await Promise.all(
    wardrobe.map(async (item) => {
      // Skip items without photos or paths
      if (!item.isPhoto || !item.imagePath) return item;

      // Check if URL is expiring soon
      const expiresAt = item.imageExpiresAt || 0;
      if (expiresAt - now > refreshThreshold) {
        // URL still valid, no refresh needed
        return item;
      }

      // Refresh the signed URL
      const newUrl = await getSignedUrl(item.imagePath);
      if (newUrl) {
        return {
          ...item,
          image: newUrl.signedUrl,
          imageExpiresAt: newUrl.expiresAt
        };
      }

      return item;
    })
  );

  return updatedWardrobe;
};

/**
 * Delete an image from Supabase Storage
 * @param {string} path - The file path to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteImage = async (path) => {
  if (!supabase || !path) return false;

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete failed:', err);
    return false;
  }
};

/**
 * Compress image before upload
 * @param {File} file - Original file
 * @param {number} maxWidth - Max width in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>}
 */
export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// ==================== AUTH HELPERS ====================

export const signUp = async (email, password) => {
  if (!supabase) return { error: 'Supabase not configured' };
  return supabase.auth.signUp({ email, password });
};

export const signIn = async (email, password) => {
  if (!supabase) return { error: 'Supabase not configured' };
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  if (!supabase) return;
  return supabase.auth.signOut();
};

export const getUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
