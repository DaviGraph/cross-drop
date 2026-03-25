export interface DroppedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  code: string;
  droppedAt: string;
  expiresAt: string;
  blobUrl?: string;
}

export interface FeedbackEntry {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
}

const DROPS_KEY = 'crossdrop_drops';
const FEEDBACK_KEY = 'crossdrop_feedback';
const ONBOARDING_KEY = 'crossdrop_onboarded';
const TOOLTIP_KEY = 'crossdrop_tooltips_seen';

// File blob storage (in-memory, since localStorage can't store blobs)
const fileStore = new Map<string, Blob>();

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function saveDroppedFile(file: DroppedFile, blob: Blob): void {
  const drops = getDroppedFiles();
  drops.unshift(file);
  localStorage.setItem(DROPS_KEY, JSON.stringify(drops));
  fileStore.set(file.code, blob);
}

export function getDroppedFiles(): DroppedFile[] {
  const raw = localStorage.getItem(DROPS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getDropByCode(code: string): DroppedFile | undefined {
  return getDroppedFiles().find(d => d.code === code);
}

export function getFileBlob(code: string): Blob | undefined {
  return fileStore.get(code);
}

export function isExpired(file: DroppedFile): boolean {
  return new Date() > new Date(file.expiresAt);
}

export function saveFeedback(entry: FeedbackEntry): void {
  const all = getAllFeedback();
  all.unshift(entry);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
}

export function getAllFeedback(): FeedbackEntry[] {
  const raw = localStorage.getItem(FEEDBACK_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function setOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function hasSeenTooltip(key: string): boolean {
  const seen = JSON.parse(localStorage.getItem(TOOLTIP_KEY) || '{}');
  return !!seen[key];
}

export function markTooltipSeen(key: string): void {
  const seen = JSON.parse(localStorage.getItem(TOOLTIP_KEY) || '{}');
  seen[key] = true;
  localStorage.setItem(TOOLTIP_KEY, JSON.stringify(seen));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getFileTypeIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '📦';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
  return '📎';
}

export function formatDropTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}
