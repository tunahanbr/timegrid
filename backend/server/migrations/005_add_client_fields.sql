-- Add additional fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Map contact_email to email if contact_email exists and email is null
UPDATE clients SET email = contact_email WHERE email IS NULL AND contact_email IS NOT NULL;

