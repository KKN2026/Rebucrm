-- Publieke bucket voor huisstijl-assets (o.a. bedrijfslogo). Publiek omdat het
-- logo zonder signed URL moet tonen in PDF's, het klantenportaal en
-- e-mail-headers/afbeeldingen — analoog aan 040_email_bijlagen_storage.sql
-- maar dan met public: true.
insert into storage.buckets (id, name, public)
values ('huisstijl', 'huisstijl', true)
on conflict (id) do nothing;

-- RLS op storage.objects volgt hier de conventie van de administraties-tabel
-- (001_initial_schema.sql): toegang via het profiel van de ingelogde
-- gebruiker, gescopet op diens eigen administratie_id. Bestanden worden
-- opgeslagen onder een pad dat met de administratie_id begint
-- (bv. "<administratie_id>/logo.png"), zodat (storage.foldername(name))[1]
-- de eigenaar identificeert.
create policy "huisstijl_publiek_lezen" on storage.objects
  for select using (bucket_id = 'huisstijl');

create policy "huisstijl_eigen_administratie_uploaden" on storage.objects
  for insert with check (
    bucket_id = 'huisstijl'
    and (storage.foldername(name))[1] in (
      select administratie_id::text from profielen where id = auth.uid()
    )
  );

create policy "huisstijl_eigen_administratie_updaten" on storage.objects
  for update using (
    bucket_id = 'huisstijl'
    and (storage.foldername(name))[1] in (
      select administratie_id::text from profielen where id = auth.uid()
    )
  );

create policy "huisstijl_eigen_administratie_verwijderen" on storage.objects
  for delete using (
    bucket_id = 'huisstijl'
    and (storage.foldername(name))[1] in (
      select administratie_id::text from profielen where id = auth.uid()
    )
  );
