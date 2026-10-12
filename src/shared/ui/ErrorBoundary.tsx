'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { normalizeError } from '@/shared/lib/normalizeError';

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
};

/** Localized texts of the default fallback UI (`errors.route.*`, `errors.boundary.*`). */
type ErrorBoundaryLabels = {
  title: string;
  description: string;
  reload: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryProps & { labels: ErrorBoundaryLabels },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: undefined,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error', error, errorInfo);
    }

    let message = this.props.labels.description;

    try {
      message = normalizeError(error, this.props.labels.description);
    } catch (normalizeErrorFailure) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to normalize error', normalizeErrorFailure);
      }
    }

    this.setState({ hasError: true, message });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  render() {
    const { hasError, message } = this.state;
    const { fallback, children, labels } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-foreground"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-destructive">{labels.title}</h2>
            <p className="text-muted-foreground">{message ?? labels.description}</p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          >
            {labels.reload}
          </button>
        </div>
      );
    }

    return (children as React.ReactNode) ?? null;
  }
}

/**
 * Catches render errors below it and shows a localized fallback. The class component can't use
 * hooks, so this wrapper resolves the texts and passes them down.
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  const t = useTranslations('errors');
  const labels: ErrorBoundaryLabels = {
    title: t('route.title'),
    description: t('route.description'),
    reload: t('boundary.reload'),
  };
  return <ErrorBoundaryInner {...props} labels={labels} />;
}

export default ErrorBoundary;
