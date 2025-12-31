import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image, X, RotateCcw, Check, Loader, AlertCircle } from 'lucide-react';
import { uploadImage, compressImage, validateFile } from '../lib/supabase';

export default function PhotoUploader({ onUpload, onCancel, userId }) {
  const [mode, setMode] = useState('select'); // select, camera, preview
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Open file picker
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setError('');

    // Preview the image
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('camera');
      setError('');
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please use file upload instead.');
      } else {
        setError('Could not access camera. Please use file upload instead.');
      }
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    stopCamera();
    setMode('preview');
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Reset to selection
  const reset = () => {
    setPreview(null);
    setMode('select');
    setError('');
    stopCamera();
  };

  // Upload the photo
  const handleUpload = async () => {
    if (!preview) return;

    setUploading(true);
    setError('');

    try {
      // Convert base64 to blob
      const response = await fetch(preview);
      const blob = await response.blob();
      
      // Compress image
      const compressed = await compressImage(
        new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      );
      
      // Upload to Supabase (now returns signed URL)
      const result = await uploadImage(
        new File([compressed], 'photo.jpg', { type: 'image/jpeg' }),
        userId
      );

      if (result) {
        // Pass back signedUrl, path, and expiry
        onUpload({
          url: result.signedUrl,
          path: result.path,
          expiresAt: result.expiresAt
        });
      } else {
        setError('Upload failed. Please check your connection and try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between bg-stone-950">
        <h3 className="font-medium text-stone-200">
          {mode === 'select' && 'Add Photo'}
          {mode === 'camera' && 'Take Photo'}
          {mode === 'preview' && 'Preview'}
        </h3>
        <button onClick={() => { stopCamera(); onCancel(); }}>
          <X size={24} className="text-stone-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        
        {/* Selection Mode */}
        {mode === 'select' && (
          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={startCamera}
              className="w-full p-6 bg-stone-900 border border-stone-800 rounded-2xl flex items-center gap-4 hover:border-violet-500/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Camera size={28} className="text-violet-400" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-stone-200">Take Photo</h4>
                <p className="text-xs text-stone-500">Use your camera</p>
              </div>
            </button>

            <button
              onClick={handleFileSelect}
              className="w-full p-6 bg-stone-900 border border-stone-800 rounded-2xl flex items-center gap-4 hover:border-violet-500/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Image size={28} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-stone-200">Choose from Gallery</h4>
                <p className="text-xs text-stone-500">Select an existing photo</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileChange}
              className="hidden"
            />

            {error && (
              <div className="p-4 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Security note */}
            <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-xl">
              <p className="text-xs text-stone-500 text-center">
                📷 Photos are stored securely and only visible to you
              </p>
            </div>
          </div>
        )}

        {/* Camera Mode */}
        {mode === 'camera' && (
          <div className="w-full max-w-md">
            <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viewfinder overlay */}
              <div className="absolute inset-4 border-2 border-white/30 rounded-xl pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={reset}
                className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center"
              >
                <X size={24} className="text-stone-400" />
              </button>
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-full border-4 border-stone-900" />
              </button>
              <div className="w-14" /> {/* Spacer for centering */}
            </div>
          </div>
        )}

        {/* Preview Mode */}
        {mode === 'preview' && preview && (
          <div className="w-full max-w-md">
            <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-3 mb-4">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                disabled={uploading}
                className="flex-1 py-4 bg-stone-800 text-stone-300 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw size={20} />
                Retake
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-4 bg-violet-500 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Use Photo
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
