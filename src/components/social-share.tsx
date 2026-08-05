'use client';

import { Share2, Twitter, Facebook, MessageCircle, Link2, Check } from 'lucide-react';
import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/shared/ui/toast';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  className?: string;
}

const SOCIAL_PLATFORMS = {
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    href: (url: string, title: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  message: {
    name: 'Message',
    icon: MessageCircle,
    href: (url: string, title: string) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  copy: {
    name: 'Copy Link',
    icon: Link2,
    href: null,
  },
};

export function SocialShare({ url, title, description, image, className = '' }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Product link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Please try manually',
      });
    }
  }, [url, toast]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      handleCopy();
    }
  }, [title, description, url, handleCopy]);

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={handleNativeShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Native Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => {
                if (!platform.href) {
                  handleCopy();
                } else {
                  window.open(platform.href(url, title), '_blank', 'noopener,noreferrer');
                }
              }}
              className="flex items-center gap-2"
            >
              <platform.icon className="h-4 w-4" />
              {platform.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Inline share buttons variant
export function SocialShareInline({ url, title, description, className = '' }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Product link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Please try manually',
      });
    }
  }, [url, toast]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        aria-label="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(SOCIAL_PLATFORMS.twitter.href(url, title), '_blank')}
        aria-label="Share on Twitter"
      >
        <Twitter className="h-4 w-4 text-blue-500" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(SOCIAL_PLATFORMS.facebook.href(url), '_blank')}
        aria-label="Share on Facebook"
      >
        <Facebook className="h-4 w-4 text-blue-700" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(SOCIAL_PLATFORMS.message.href(url, title), '_blank')}
        aria-label="Share via Message"
      >
        <MessageCircle className="h-4 w-4 text-green-500" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (navigator.share) {
            navigator.share({ title, text: description, url }).catch(() => {});
          } else {
            handleCopy();
          }
        }}
        aria-label="Native share"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}