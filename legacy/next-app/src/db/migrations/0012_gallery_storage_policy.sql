-- NOTE: These policies hardcode bucket_id = 'gallery'. If the bucket name
-- is customized via NEXT_PUBLIC_STORAGE_BUCKET_GALLERY, this migration must
-- be regenerated with the matching bucket name.
CREATE POLICY "gallery_insert_authenticated"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery');--> statement-breakpoint

CREATE POLICY "gallery_delete_authenticated"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'gallery');--> statement-breakpoint

CREATE POLICY "gallery_select_public"
ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'gallery');
