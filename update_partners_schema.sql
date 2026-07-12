-- Add new columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS margin_share NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS coordinates TEXT;
