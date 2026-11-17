import { File, FileCode, FileImage, FileText } from 'lucide-react';

interface WorkspaceFileIconProps {
  contentType: string;
  className?: string;
}

export function WorkspaceFileIcon({ contentType, className }: WorkspaceFileIconProps) {
  if (contentType.includes('pdf')) {
    return <FileText className={className ?? 'h-4 w-4 text-red-500'} />;
  }

  if (contentType.includes('image')) {
    return <FileImage className={className ?? 'h-4 w-4 text-purple-500'} />;
  }

  if (
    contentType.includes('json') ||
    contentType.includes('code') ||
    contentType.includes('javascript') ||
    contentType.includes('typescript') ||
    contentType.includes('text/')
  ) {
    return <FileCode className={className ?? 'h-4 w-4 text-yellow-500'} />;
  }

  return <File className={className ?? 'h-4 w-4 text-blue-500'} />;
}