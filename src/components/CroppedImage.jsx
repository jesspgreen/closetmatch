import React, { useState, useEffect, useRef } from 'react';

/**
 * Displays a cropped portion of an image based on bounding box percentages
 */
export default function CroppedImage({ 
  src, 
  boundingBox, 
  alt = 'Item', 
  className = '',
  fallback = null // emoji or element to show if no image/box
}) {
  const [croppedSrc, setCroppedSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || !boundingBox) {
      setLoading(false);
      return;
    }

    const cropImage = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });

        // Calculate crop coordinates from percentages
        const x = (boundingBox.x / 100) * img.width;
        const y = (boundingBox.y / 100) * img.height;
        const width = (boundingBox.width / 100) * img.width;
        const height = (boundingBox.height / 100) * img.height;

        // Add some padding (10%)
        const padding = 0.1;
        const paddedX = Math.max(0, x - width * padding);
        const paddedY = Math.max(0, y - height * padding);
        const paddedWidth = Math.min(img.width - paddedX, width * (1 + padding * 2));
        const paddedHeight = Math.min(img.height - paddedY, height * (1 + padding * 2));

        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        canvas.width = paddedWidth;
        canvas.height = paddedHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          paddedX, paddedY, paddedWidth, paddedHeight,
          0, 0, paddedWidth, paddedHeight
        );

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCroppedSrc(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error('Failed to crop image:', err);
        setError(true);
        setLoading(false);
      }
    };

    cropImage();
  }, [src, boundingBox]);

  // No source image or bounding box - show fallback
  if (!src || !boundingBox) {
    if (fallback) {
      return (
        <div className={`flex items-center justify-center bg-stone-800 ${className}`}>
          {typeof fallback === 'string' ? (
            <span className="text-2xl">{fallback}</span>
          ) : (
            fallback
          )}
        </div>
      );
    }
    return null;
  }

  // Loading
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-stone-800 animate-pulse ${className}`}>
        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error - show original image
  if (error || !croppedSrc) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={`object-cover ${className}`}
      />
    );
  }

  // Show cropped image
  return (
    <img 
      src={croppedSrc} 
      alt={alt} 
      className={`object-cover ${className}`}
    />
  );
}

/**
 * Hook to get a cropped image URL from source and bounding box
 */
export function useCroppedImage(src, boundingBox) {
  const [croppedSrc, setCroppedSrc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!src || !boundingBox) {
      setCroppedSrc(null);
      return;
    }

    setLoading(true);

    const cropImage = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });

        const x = (boundingBox.x / 100) * img.width;
        const y = (boundingBox.y / 100) * img.height;
        const width = (boundingBox.width / 100) * img.width;
        const height = (boundingBox.height / 100) * img.height;

        const padding = 0.1;
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

        setCroppedSrc(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        console.error('Failed to crop:', err);
        setCroppedSrc(src); // Fallback to original
      } finally {
        setLoading(false);
      }
    };

    cropImage();
  }, [src, boundingBox]);

  return { croppedSrc, loading };
}
