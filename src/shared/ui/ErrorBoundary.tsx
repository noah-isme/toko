'use client';

import React from 'react';

import { normalizeError } from '@/shared/lib/normalizeError';

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

const DEFAULT_ERROR_MESSAGE = 'Terjadi kesalahan. Coba lagi.';

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

    let message = DEFAULT_ERROR_MESSAGE;

    try {
      message = normalizeError(error);
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
    const { fallback, children } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-foreground"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-destructive">Terjadi kesalahan</h2>
            <p className="text-muted-foreground">{message ?? DEFAULT_ERROR_MESSAGE}</p>
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
          >
            Muat Ulang
          </button>
        </div>
      );
    }

    return (children as React.ReactNode) ?? null;
  }
}

export default ErrorBoundary;
