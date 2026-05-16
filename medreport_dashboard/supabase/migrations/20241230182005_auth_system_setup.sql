-- Location: supabase/migrations/20241230182005_auth_system_setup.sql
-- Authentication system setup with user profiles and email verification
-- Integration Type: Authentication module with user management

-- 1. Create user_profiles table as intermediary for PostgREST compatibility
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    email TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- 3. Enable RLS on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies using Pattern 1 (Core User Tables - Simple only, no functions)
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow users to view other profiles (for social features)
CREATE POLICY "users_can_view_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- 5. Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        username, 
        full_name, 
        email,
        avatar_url
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- 6. Create trigger to execute the function on new user creation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 7. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for updating updated_at on user_profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- 9. Create mock data for testing authentication
DO $$
DECLARE
    user1_auth_id UUID := gen_random_uuid();
    user2_auth_id UUID := gen_random_uuid();
BEGIN
    -- Create complete auth.users records for testing
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (user1_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'demo@example.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"username": "demo_user", "full_name": "Demo User"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (user2_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'test@example.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"username": "test_user", "full_name": "Test User"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Test users already exist, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test users: %', SQLERRM;
END $$;

-- 10. Function to clean up test data (for development use)
CREATE OR REPLACE FUNCTION public.cleanup_test_auth_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_ids_to_delete UUID[];
BEGIN
    -- Get test user IDs
    SELECT ARRAY_AGG(id) INTO auth_user_ids_to_delete
    FROM auth.users
    WHERE email IN ('demo@example.com', 'test@example.com');

    -- Delete user profiles first (foreign key dependency)
    DELETE FROM public.user_profiles 
    WHERE id = ANY(auth_user_ids_to_delete);

    -- Delete auth users last
    DELETE FROM auth.users 
    WHERE id = ANY(auth_user_ids_to_delete);

    RAISE NOTICE 'Cleaned up % test users', array_length(auth_user_ids_to_delete, 1);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Cleanup failed: %', SQLERRM;
END;
$$;