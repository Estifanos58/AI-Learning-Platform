export type FileCategory =
  | 'pdf'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'code'
  | 'video'
  | 'audio'
  | 'archive'
  | 'generic';

export type FileSubtype =
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'gif'
  | 'webp'
  | 'svg'
  | 'txt'
  | 'md'
  | 'csv'
  | 'json'
  | 'xml'
  | 'js'
  | 'ts'
  | 'mp4'
  | 'webm'
  | 'mov'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'ppt'
  | 'pptx'
  | 'zip'
  | 'tar'
  | 'rar'
  | '7z'
  | 'unknown';

export interface FileCategoryMeta {
  category: FileCategory;
  label: string;
  colorClass: string;
  canEmbed: boolean;
}
