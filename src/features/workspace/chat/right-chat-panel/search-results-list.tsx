'use client';

import { UserProfile } from '@/src/lib/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/src/components/common/states';
import { Loader2, MessageCircle } from 'lucide-react';

interface SearchResultsListProps {
  isLoading: boolean;
  results: UserProfile[];
  onSelect: (profile: UserProfile) => void;
}

export function SearchResultsList({ isLoading, results, onSelect }: SearchResultsListProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Searching users...
      </div>
    );
  }

  if (results.length === 0) {
    return <EmptyState icon="🔎" title="No users found" description="Try another name" />;
  }

  return (
    <div className="space-y-1">
      {results.map((profile) => {
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unnamed user';
        return (
          <div
            key={profile.userId}
            className="group flex items-center justify-between rounded-md border border-transparent px-2 py-2 hover:bg-accent/50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.department || profile.universityId || profile.userId}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onSelect(profile)}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
