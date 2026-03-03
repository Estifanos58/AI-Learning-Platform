'use client';

/**
 * Reusable loading, empty, and error state components
 */

export interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-primary hover:underline font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorState({
  title = 'Error',
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-primary hover:underline font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
