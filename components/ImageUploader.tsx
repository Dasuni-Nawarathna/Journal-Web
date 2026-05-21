'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { ImageIcon, Upload, X, Loader2, Check } from 'lucide-react';

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
      setStatus({ type: 'error', text: 'Only image files are allowed.' });
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
      // Create a unique file path using userId + timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      // Upload to Supabase Storage bucket "memory-images"
      const { data, error } = await supabase.storage
        .from('memory-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memory-images')
        .getPublicUrl(fileName);

      const newImage: UploadedImage = {
        url: publicUrl,
        path: fileName,
        name: file.name,
      };

      setUploadedImages((prev) => [...prev, newImage]);
      setStatus({ type: 'success', text: '✨ Image uploaded!' });
      onImageUploaded?.(newImage);

      setTimeout(() => setStatus(null), 2500);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // Reset input so same file can be selected again
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
      await supabase.storage.from('memory-images').remove([image.path]);
      setUploadedImages((prev) => prev.filter((img) => img.path !== image.path));
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
          uploadedImages.length > 0
            ? 'bg-sage/30 border-sage text-espresso'
            : 'bg-white/60 border-blush/20 text-espresso/60 hover:bg-canvas hover:text-espresso'
        }`}
        title="Attach photos to this memory"
      >
        <ImageIcon className="w-3 h-3" />
        <span>{uploadedImages.length > 0 ? `${uploadedImages.length} Photo${uploadedImages.length > 1 ? 's' : ''}` : 'Add Photo'}</span>
      </button>

      {/* Floating uploader panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-9 left-0 w-72 bg-white/95 backdrop-blur-md border border-blush/25 rounded-2xl shadow-xl p-4 space-y-3 z-50"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-espresso/60 flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-blush" />
                <span>Memory Photos</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded text-espresso/30 hover:text-espresso transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 ${
                isDragging
                  ? 'border-lavender bg-lavender/20'
                  : 'border-blush/30 hover:border-lavender hover:bg-lavender/10'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-lavender animate-spin" />
                  <span className="text-[10px] text-espresso/60">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-espresso/30 mx-auto" />
                  <p className="text-[10px] text-espresso/50 leading-relaxed">
                    <span className="font-semibold text-espresso/70">Click to browse</span> or drag & drop<br />
                    PNG, JPG, WEBP • Max 5MB
                  </p>
                </>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
                  className={`text-[10px] px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 ${
                    status.type === 'success' ? 'bg-sage/40 text-espresso' : 'bg-blush/50 text-espresso'
                  }`}
                >
                  {status.type === 'success' ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                  {status.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Uploaded image thumbnails */}
            {uploadedImages.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-espresso/40 font-bold uppercase tracking-wider">Attached</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {uploadedImages.map((img) => (
                    <div key={img.path} className="relative group aspect-square rounded-xl overflow-hidden border border-blush/20 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Delete overlay */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                        className="absolute inset-0 bg-espresso/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup hint */}
            <p className="text-[9px] text-espresso/30 leading-relaxed border-t border-canvas pt-2">
              💡 Requires a Supabase Storage bucket named <code className="font-mono bg-canvas px-0.5 rounded">memory-images</code> with public access enabled.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
