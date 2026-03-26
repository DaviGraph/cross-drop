import { supabase } from "@/integrations/supabase/client";

export interface DroppedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  code: string;
  droppedAt: string;
  expiresAt: string;
  storagePath: string;
  deleteAfterDownload: boolean;
  downloaded: boolean;
  viewCount: number;
}

export interface FeedbackEntry {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
}

const ONBOARDING_KEY = 'crossdrop_onboarded';
const TOOLTIP_KEY = 'crossdrop_tooltips_seen';
const USER_ID_KEY = 'crossdrop_user_id';

export function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function mapDrop(data: any): DroppedFile {
  return {
    id: data.id,
    name: data.file_name,
    size: Number(data.file_size),
    type: data.file_type,
    code: data.code,
    droppedAt: data.dropped_at,
    expiresAt: data.expires_at,
    storagePath: data.storage_path,
    deleteAfterDownload: data.delete_after_download ?? false,
    downloaded: data.downloaded ?? false,
    viewCount: data.view_count ?? 0,
  };
}

export async function uploadAndSaveDrop(
  file: File,
  options?: { deleteAfterDownload?: boolean; expiresMinutes?: number }
): Promise<DroppedFile> {
  const code = generateCode();
  const storagePath = `${code}/${file.name}`;
  const userId = getOrCreateUserId();

  const { error: uploadError } = await supabase.storage
    .from('drops')
    .upload(storagePath, file);

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error: dbError } = await supabase
    .from('drops')
    .insert({
      code,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      storage_path: storagePath,
      user_id: userId,
      delete_after_download: options?.deleteAfterDownload ?? false,
      expires_minutes: options?.expiresMinutes ?? 5,
    })
    .select()
    .single();

  if (dbError) throw new Error(`Save failed: ${dbError.message}`);

  return mapDrop(data);
}

export async function getDropByCode(code: string): Promise<DroppedFile | null> {
  const { data, error } = await supabase
    .from('drops')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) return null;
  return mapDrop(data);
}

export function getFileDownloadUrl(storagePath: string): string {
  const { data } = supabase.storage.from('drops').getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getRecentDrops(): Promise<DroppedFile[]> {
  const userId = getOrCreateUserId();
  const { data, error } = await supabase
    .from('drops')
    .select('*')
    .eq('user_id', userId)
    .order('dropped_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(mapDrop);
}

export function isExpired(file: DroppedFile): boolean {
  return new Date() > new Date(file.expiresAt);
}

export async function incrementViewCount(dropId: string, currentCount: number): Promise<void> {
  await supabase
    .from('drops')
    .update({ view_count: currentCount + 1 })
    .eq('id', dropId);
}

export async function markDownloaded(dropId: string): Promise<void> {
  await supabase
    .from('drops')
    .update({ downloaded: true, downloaded_at: new Date().toISOString() })
    .eq('id', dropId);
}

export async function deleteDropAfterDownload(drop: DroppedFile): Promise<void> {
  // Delete file from storage
  await supabase.storage.from('drops').remove([drop.storagePath]);
  // Delete record from database
  await supabase.from('drops').delete().eq('id', drop.id);
}

export async function saveFeedback(rating: number, message: string): Promise<void> {
  const { error } = await supabase
    .from('feedback')
    .insert({ rating, message: message || null });
  if (error) throw new Error(`Failed to save feedback: ${error.message}`);
}

export async function getAllFeedback(): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(f => ({
    id: f.id,
    rating: f.rating,
    message: f.message || '',
    createdAt: f.created_at,
  }));
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
