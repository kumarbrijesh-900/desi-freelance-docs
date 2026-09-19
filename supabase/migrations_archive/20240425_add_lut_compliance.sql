-- Add LUT Compliance fields to user_profiles
-- Critical for Export/SEZ billing logic

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS lut_number TEXT,
ADD COLUMN IF NOT EXISTS lut_validity TEXT;

COMMENT ON COLUMN public.user_profiles.lut_number IS 'Letter of Undertaking number for zero-rated exports.';
COMMENT ON COLUMN public.user_profiles.lut_validity IS 'Standardized financial year key (e.g., fy_2025_26).';
