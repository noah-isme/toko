'use client';

import { Image, X, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

interface ImageUploadProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageUpload({
  value,
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
  accept = 'image/*',
  disabled = false,
  className,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return 'Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF.';
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Ukuran file melebihi ${maxSizeMB}MB.`;
      }
      return null;
    },
    [maxSizeMB],
  );

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const newFiles = Array.from(files);
      const currentCount = value.length;
      const availableSlots = maxFiles - currentCount;

      if (availableSlots <= 0) {
        toast({
          variant: 'destructive',
          title: 'Maksimal file tercapai',
          description: `Anda hanya bisa mengunggah maksimal ${maxFiles} gambar.`,
        });
        return;
      }

      const filesToAdd = newFiles.slice(0, availableSlots);
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of filesToAdd) {
        const error = validateFile(file);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'File tidak valid',
            description: error,
          });
          continue;
        }
        validFiles.push(file);
        const preview = await createPreview(file);
        newPreviews.push(preview);
      }

      if (validFiles.length > 0) {
        onChange([...value, ...validFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);
      }
    },
    [value, maxFiles, onChange, validateFile, createPreview, toast],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      if (e.target) {
        e.target.value = '';
      }
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
      setPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const isAtMax = value.length >= maxFiles;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors',
          disabled
            ? 'border-muted-foreground/20 bg-muted/30 cursor-not-allowed'
            : 'border-border hover:border-primary/50 hover:bg-primary/5',
          isAtMax && !disabled && 'border-muted-foreground/20 bg-muted/30',
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={disabled ? 'Upload dinonaktifkan' : 'Klik atau tarik gambar ke sini untuk mengunggah'}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInputChange}
          disabled={disabled || isAtMax}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Pilih gambar untuk diunggah"
        />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Image className={cn('h-8 w-8 mb-2', disabled ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
          {!isAtMax ? (
            <>
              <p className={cn('text-sm font-medium', disabled ? 'text-muted-foreground/50' : 'text-foreground')}>
                {disabled ? 'Upload dinonaktifkan' : 'Klik atau tarik gambar ke sini'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Maksimal {maxFiles} file, {maxSizeMB}MB per file (JPEG, PNG, WebP, GIF)
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Maksimal file tercapai</p>
          )}
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-background"
            >
              <img
                src={preview}
                alt={`Pratinjau gambar ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFile(index);
                }}
                disabled={disabled || uploading.has(index)}
                className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 group-hover:opacity-100"
                aria-label={`Hapus gambar ${index + 1}`}
              >
                {uploading.has(index) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Image preview component for displaying review images
interface ReviewImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export function ReviewImage({ src, alt, className }: ReviewImageProps) {
  return (
    <img
      src={src}
      alt={alt || 'Gambar ulasan'}
      className={cn('rounded-lg object-cover', className)}
      loading="lazy"
    />
  );
}

// Image gallery for review photos
interface ReviewImageGalleryProps {
  images: string[];
  className?: string;
}

export function ReviewImageGallery({ images, className }: ReviewImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className={cn('grid gap-2 mt-3', className)}>
      {images.length === 1 && (
        <div className="aspect-video overflow-hidden rounded-lg">
          <ReviewImage src={images[0]} className="h-full w-full" />
        </div>
      )}
      {images.length === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((src, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-lg">
              <ReviewImage src={src} className="h-full w-full" />
            </div>
          ))}
        </div>
      )}
      {images.length >= 3 && (
        <div className="grid grid-cols-3 gap-2">
          {images.slice(0, 3).map((src, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-lg">
              <ReviewImage src={src} className="h-full w-full" />
            </div>
          ))}
          {images.length > 3 && (
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 font-semibold text-white">
                +{images.length - 3}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}