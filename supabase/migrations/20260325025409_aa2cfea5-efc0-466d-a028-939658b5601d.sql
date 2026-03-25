-- Create drops table for file sharing
CREATE TABLE public.drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  dropped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

-- Anyone can read drops (no auth required)
CREATE POLICY "Anyone can read drops" ON public.drops
  FOR SELECT USING (true);

-- Anyone can insert drops (no auth required)
CREATE POLICY "Anyone can insert drops" ON public.drops
  FOR INSERT WITH CHECK (true);

-- Create index on code for fast lookups
CREATE INDEX idx_drops_code ON public.drops(code);

-- Create index on expires_at for cleanup
CREATE INDEX idx_drops_expires_at ON public.drops(expires_at);

-- Create storage bucket for dropped files
INSERT INTO storage.buckets (id, name, public)
VALUES ('drops', 'drops', true);

-- Anyone can upload to drops bucket
CREATE POLICY "Anyone can upload drops" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'drops');

-- Anyone can read drops files
CREATE POLICY "Anyone can read drops" ON storage.objects
  FOR SELECT USING (bucket_id = 'drops');

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

-- Anyone can read feedback (for admin page)
CREATE POLICY "Anyone can read feedback" ON public.feedback
  FOR SELECT USING (true);