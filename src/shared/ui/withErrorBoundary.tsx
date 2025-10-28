'use client';

import { ComponentType } from 'react';

import { ErrorBoundary } from './ErrorBoundary';

export function withErrorBoundary<TProps extends object>(Component: ComponentType<TProps>) {
  const ComponentWithErrorBoundary = (props: TProps) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;

  return ComponentWithErrorBoundary as ComponentType<TProps>;
}
