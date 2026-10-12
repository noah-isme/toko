'use client';

import { Share2, Twitter, Facebook, MessageCircle, Link2, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

/** Keys under `product.share.platforms` in the message catalogs. */
type PlatformLabelKey = 'twitter' | 'facebook' | 'message' | 'copy';

const SOCIAL_PLATFORMS = {
  twitter: {
    labelKey: 'twitter',
    icon: Twitter,
    href: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  facebook: {
    labelKey: 'facebook',
    icon: Facebook,
    href: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  message: {
    labelKey: 'message',
    icon: MessageCircle,
    href: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  copy: {
    labelKey: 'copy',
    icon: Link2,
    href: null,
  },
} satisfies Record<PlatformLabelKey, { labelKey: PlatformLabelKey; [key: string]: unknown }>;

export function SocialShare({ url, title, description, image, className = '' }: SocialShareProps) {
  const t = useTranslations('product.share');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: t('copied.title'),
        description: t('copied.description'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: t('copyFailed.title'),
        description: t('copyFailed.description'),
      });
    }
  }, [url, toast, t]);

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
            {t('button')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={handleNativeShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            {t('native')}
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
              {t(`platforms.${platform.labelKey}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Inline share buttons variant
export function SocialShareInline({ url, title, description, className = '' }: SocialShareProps) {
  const t = useTranslations('product.share');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: t('copied.title'),
        description: t('copied.description'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: t('copyFailed.title'),
        description: t('copyFailed.description'),
      });
    }
  }, [url, toast, t]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={t('inline.copyLink')}>
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(SOCIAL_PLATFORMS.twitter.href(url, title), '_blank')}
        aria-label={t('inline.twitter')}
      >
        <Twitter className="h-4 w-4 text-blue-500" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(SOCIAL_PLATFORMS.facebook.href(url), '_blank')}
        aria-label={t('inline.facebook')}
      >
        <Facebook className="h-4 w-4 text-blue-700" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(SOCIAL_PLATFORMS.message.href(url, title), '_blank')}
        aria-label={t('inline.message')}
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
        aria-label={t('inline.native')}
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
