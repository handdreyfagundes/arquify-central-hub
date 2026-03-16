-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files');

-- Allow authenticated users to delete project files
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files');

-- Add columns to arquivos table for revision linking and custom tabs
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS revisao_id uuid REFERENCES revisoes(id) ON DELETE SET NULL;
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS aba text NOT NULL DEFAULT 'projeto';
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS storage_path text;