Implementation Plan: Harmonies Auth & Stat Sync MVP
1. Project Context & Objective
Objective: Upgrade the "Harmonies" SvelteKit application to support user authentication via Supabase. We aim to persist user statistics and game history to the cloud, moving away from purely local storage.

Existing Architecture:

Framework: SvelteKit (Svelte 4).

Game Logic: Daily puzzles defined by JSON.

Current Persistence: localStorage is used to track streaks and win/loss records.

Auth Provider: Supabase (Reusing an existing project from spotle.io).

2. Database Schema (Supabase)
We will use the existing Supabase project. We need to create two new tables to handle Harmonies-specific data.

Action for Agent: Execute the following SQL to set up the schema.

SQL

-- Table 1: Aggregated User Statistics
-- Stores the user's career stats (synced from current local storage)
create table public.harmonies_stats (
  user_id uuid references auth.users not null primary key,
  games_played int default 0,
  games_won int default 0,
  current_streak int default 0,
  max_streak int default 0,
  win_distribution jsonb default '{}'::jsonb, -- e.g. {"1": 5, "2": 3} (guesses taken)
  last_played_date date,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Table 2: Game History
-- Logs every completed game for historical playback/analysis
create table public.harmonies_game_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  puzzle_date date not null, -- The date key from the JSON (e.g., "12/16/2025")
  played_at timestamp with time zone default timezone('utc'::text, now()),
  result text check (result in ('WIN', 'LOSS')),
  guesses_count int, -- How many incorrect guesses before win/loss?
  time_taken_seconds int
);

-- RLS Policies (Enable RLS on both tables)
alter table public.harmonies_stats enable row level security;
alter table public.harmonies_game_history enable row level security;

create policy "Users can view own stats" on public.harmonies_stats
  for select using (auth.uid() = user_id);

create policy "Users can update own stats" on public.harmonies_stats
  for update using (auth.uid() = user_id);

create policy "Users can insert own stats" on public.harmonies_stats
  for insert with check (auth.uid() = user_id);

create policy "Users can view own history" on public.harmonies_game_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own history" on public.harmonies_game_history
  for insert with check (auth.uid() = user_id);
3. Implementation Phases
Phase A: Authentication Setup
We are porting authentication logic from spotle.io.

Environment Variables: Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to .env.

Supabase Client: Create src/lib/supabaseClient.js using @supabase/auth-helpers-sveltekit.

Hooks: Create or update src/hooks.server.js to handle session validation.

Route Migration: Copy and adapt the following routes from the spotle.io codebase:

/login/+page.svelte (Login UI)

/login/+page.server.js (Server actions for login)

/auth/callback/+page.server.js (Handle OAuth/Magic link returns)

/auth/auth-code-error/+page.svelte (Error handling)

Phase B: Data Sync Logic (The "Merge" Strategy)
We need a robust strategy to handle the transition from Local Storage to Cloud DB when a user logs in for the first time on Harmonies.

Logic Flow:

User logs in.

Check DB: Query harmonies_stats for user_id.

Conditionals:

Case A (Fresh Cloud User): DB is empty, but Local Storage has data. Action: INSERT Local Storage data into DB.

Case B (Existing Cloud User): DB has data. Action: Overwrite Local Storage with DB data (Cloud is truth).

Case C (New User): Neither has data. Action: Initialize empty stats.

Create a Store: Create src/lib/stores/statsStore.js. This should handle the logic of "Local vs Remote". It should subscribe to the Auth store.

Phase C: Game Completion Integration
We must hook into the "Game Over" event in the current game logic.

Modifications needed in Game Logic:

Identify where the game determines "Win" or "Loss".

Construct a gameResult object:

JavaScript

const gameResult = {
    puzzle_date: "12/16/2025",
    result: "WIN", // or "LOSS"
    guesses_count: 3,
    time_taken_seconds: 45
};
Trigger Save:

Update Local Storage (as it currently does).

IF user is authenticated -> upsert to harmonies_stats AND insert into harmonies_game_history.

4. Specific Task List for Agent
Install Dependencies: Ensure @supabase/supabase-js and @supabase/auth-helpers-sveltekit are installed.

Setup Auth Routes: Implement the login page and callback routes as specified in Phase A. Add a "Login" button to the main Header/Menu.

Create Service Functions: Create a file src/lib/db/stats.js containing:

getUserStats(userId)

uploadLocalStats(userId, localStats)

recordGameResult(userId, gameData, newAggregatedStats)

Wire up Frontend:

In +layout.svelte, mount the auth listener.

In the main game component, import the stats service.

Call uploadLocalStats immediately after successful login if remote stats are null.

Call recordGameResult on game completion.

5. JSON Structure Reference
When parsing the daily game date for the database puzzle_date, reference the keys in the existing games library JSON:

JSON

"12/16/2025": {
  "categories": [...],
  ...
}
Note: Ensure the date format in the DB (YYYY-MM-DD) matches or parses correctly from the JSON keys (MM/DD/YYYY).