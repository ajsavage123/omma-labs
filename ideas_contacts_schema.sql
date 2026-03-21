-- Create Idea Vault Table
create table public.ideas (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  drive_link text,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for ideas
alter table public.ideas enable row level security;

-- Policies for ideas
create policy "Users can view ideas in their workspace"
  on public.ideas for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.workspace_id = ideas.workspace_id
    )
  );

create policy "Users can insert ideas in their workspace"
  on public.ideas for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.workspace_id = workspace_id
    )
  );

create policy "Users can delete their own ideas"
  on public.ideas for delete
  using (created_by = auth.uid());


-- Create Client Contacts Table
create table public.client_contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact_number text,
  website_link text,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for client contacts
alter table public.client_contacts enable row level security;

-- Policies for client contacts
create policy "Users can view client contacts in their workspace"
  on public.client_contacts for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.workspace_id = client_contacts.workspace_id
    )
  );

create policy "Users can insert client contacts in their workspace"
  on public.client_contacts for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.workspace_id = workspace_id
    )
  );

create policy "Users can delete client contacts"
  on public.client_contacts for delete
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.workspace_id = client_contacts.workspace_id
    )
  );
