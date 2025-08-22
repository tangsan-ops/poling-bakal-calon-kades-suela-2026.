-- Tabel kandidat
create table if not exists public.candidates (
  id text primary key,
  nama text not null,
  alias text
);

-- Preload 6 kandidat (idempotent)
insert into public.candidates (id, nama, alias) values
  ('c1','Rosyidi','Pak Eko'),
  ('c2','Rodi Atmaja','Pak Osi'),
  ('c3','Marja Ulpah','Pak Alesa'),
  ('c4','Sar''i','Pk Ogi'),
  ('c5','H. Azhar Hamidi','H. Dadik'),
  ('c6','Khairul Muttaqin','Jae Lolo')
on conflict (id) do update set nama=excluded.nama, alias=excluded.alias;

-- Tabel suara
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  candidate_id text not null references public.candidates(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Aktifkan RLS
alter table public.votes enable row level security;

-- Kebijakan: izinkan semua klien anon melakukan insert 1 suara (unik per device)
create policy if not exists vote_insert on public.votes
for insert to anon
with check (true);

-- Agregasi hasil (agar bisa dibaca publik tanpa data device)
create or replace view public.votes_aggregate as
select candidate_id, count(*)::bigint as total
from public.votes
group by candidate_id;

grant select on public.votes_aggregate to anon;