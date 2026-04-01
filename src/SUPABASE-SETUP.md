# Supabase Configuration for VoiceInvoice

## Auth Settings

### Site URL
```
https://voiceinvoice.zeroorigine.com
```

### Redirect URLs
```
https://voiceinvoice.zeroorigine.com/**
http://localhost:3000/**
```

### Email Templates
Update the following email templates to replace "Supabase" branding with "VoiceInvoice":
- Confirm signup
- Reset password
- Magic link

### OAuth Providers
- Enable Google OAuth (optional but recommended)
- Set callback URL: `https://voiceinvoice.zeroorigine.com/api/auth/callback`

## Database
Run the migration SQL to create all tables, RLS policies, functions, and triggers.

## Environment Variables Needed
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key from API settings
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (server-only, never expose to client)
