ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS profile_image_file_id UUID;
