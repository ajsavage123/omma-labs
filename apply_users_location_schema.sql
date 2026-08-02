-- Adds location column to users table if it doesn't already exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
