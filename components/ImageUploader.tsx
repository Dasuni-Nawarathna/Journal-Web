'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { ImageIcon, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';

interface UploadedImage {
  url: string;
  path: string;
  name: string;
}

interface ImageUploaderProps {
  userId: string;
  entryId: string | null;
  onImageUploaded?: (image: UploadedImage) => void;
}

export default function ImageUploader({ userId, entryId, onImageUploaded }: ImageUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!userId) {
      setStatus({ type: 'error', text: 'You must be logged in to upload images.' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', text: 'Only image files are allowed (PNG, JPG, WEBP).' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: 'error', text: 'Image must be smaller than 5MB.' });
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      // Verify the user session is still active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus({ type: 'error', text: 'Session expired. Please sign in again.' });
        setIsUploading(false);
        return;
      }

      // Build a clean file name — flat path inside bucket (no folder nesting)
      // This avoids RLS folder-matching issues with storage.foldername()
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const rand = Math.random().toString(36).substring(2, 6);
      // Flat path: uid_timestamp_random.ext — no subfolder
      const filePath = `${userId}_${timestamp}_${rand}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('memory-images')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Surface Supabase's exact error message for easy debugging
        console.error('Supabase Storage upload error:', uploadError);
        
        if (uploadError.message.includes('Bucket not found')) {
          setStatus({ type: 'error', text: '🪣 Bucket "memory-images" not found. Create it in Supabase → Storage.' });
        } else if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy') || uploadError.message.includes('violates')) {
          setStatus({ type: 'error', text: '🔒 Permission denied. Run the storage policy SQL in Supabase → SQL Editor.' });
        } else if (uploadError.message.includes('Duplicate')) {
          setStatus({ type: 'error', text: 'A file with this name already exists. Please rename and try again.' });
        } else {
          setStatus({ type: 'error', text: `Upload error: ${uploadError.message}` });
        }
        return;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memory-images')
        .getPublicUrl(filePath);

      const newImage: UploadedImage = {
        url: publicUrl,
        path: filePath,
        name: file.name,
      };

      setUploadedImages((prev) => [...prev, newImage]);
      setStatus({ type: 'success', text: '✨ Photo added to your memory!' });
      onImageUploaded?.(newImage);

      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error('Unexpected upload error:', err);
      setStatus({ type: 'error', text: err.message || 'Unexpected error. Check browser console for details.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDeleteImage = async (image: UploadedImage) => {
    try {
      const { error } = await supabase.storage.from('memory-images').remove([image.path]);
      if (error) throw error;
      setUploadedImages((prev) => prev.filter((img) => img.path !== image.path));
    } catch (err: any) {
      console.error('Error deleting image:', err);
      setStatus({ type: 'error', text: `Delete failed: ${err.message}` });
    }
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
          uploadedImages.length > 0
            ? 'bg-sage/40 border-sage/75 text-espresso shadow-sm'
            : 'bg-paper border border-blush/35 text-espresso/80 hover:bg-canvas/80 hover:text-espresso shadow-sm'
        }`}
        title="Attach photos to this memory"
      >
        <ImageIcon className="w-3 h-3 text-lavender font-bold" />
        <span>
          {uploadedImages.length > 0
            ? `${uploadedImages.length} Photo${uploadedImages.length > 1 ? 's' : ''}`
            : 'Add Photo'}
        </span>
      </button>

      {/* Floating uploader panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-9 left-0 w-72 bg-paper/95 backdrop-blur-md border border-blush/35 rounded-2xl shadow-xl p-4 space-y-3 z-50"
          >
            {/* Header */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-espresso/85 flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-blush fill-blush animate-pulse" />
                <span>Memory Photos</span>
              </div>
              <button
                onClick={() => { setIsOpen(false); setStatus(null); }}
                className="p-0.5 rounded text-espresso/60 hover:text-espresso transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all space-y-2 ${
                isUploading
                  ? 'opacity-60 cursor-not-allowed border-blush/40'
                  : isDragging
                    ? 'border-lavender bg-lavender/20 cursor-copy'
                    : 'border-blush/50 hover:border-lavender hover:bg-lavender/15 cursor-pointer'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-lavender animate-spin" />
                  <span className="text-[10px] text-espresso/80 font-bold">Uploading to Supabase...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-espresso/60 mx-auto" />
                  <p className="text-[10px] text-espresso/75 font-semibold leading-relaxed">
                    <span className="font-bold text-espresso">Click to browse</span> or drag & drop<br />
                    PNG, JPG, WEBP • Max 5MB
                  </p>
                </>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Status message */}
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-[10px] px-3 py-2 rounded-xl font-bold flex items-start gap-1.5 leading-relaxed ${
                    status.type === 'success'
                      ? 'bg-sage/40 text-espresso'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {status.type === 'success' ? (
                    <Check className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-rose-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{status.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Uploaded image thumbnails */}
            {uploadedImages.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-espresso/70 font-bold uppercase tracking-wider">
                  Attached ({uploadedImages.length})
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {uploadedImages.map((img) => (
                    <div
                      key={img.path}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-blush/20 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                        className="absolute inset-0 bg-espresso/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick setup reminder */}
            <div className="text-[9px] text-espresso/60 leading-relaxed border-t border-canvas pt-2 space-y-0.5 font-semibold">
              <p>💡 Requires bucket <code className="font-mono bg-canvas px-0.5 rounded">memory-images</code> in Supabase Storage.</p>
              <p>🔓 Enable <strong>public access</strong> and disable RLS on the bucket, or add INSERT policy for authenticated users.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
