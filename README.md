# TopicMap Pro

Production-ready multi-tenant SaaS for SEO topical mapping with Supabase auth/data, AI generation, WordPress credential handoff, and n8n webhook publishing.

## Setup

1. Create `.env`:

```bash
VITE_SUPABASE_URL=https://sjnlwncrdbgzxyybxgsy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

2. Run SQL in `supabase/schema.sql`.
3. Install dependencies and run `npm run dev`.

## n8n workflow migration required

1. Delete **Schedule Trigger** node.
2. Delete all Google Sheets nodes (`GET STATUS`, `Get Data`, `Get Clusters For Pillar`, `MARK PROCESSING`, `UPDATE STATUS`, `UPDATE STATUS - QA Failed`, `Update row in sheet`, `Update row in sheet1`, `Get Pin Details`).
3. Add **Webhook** node (`POST`) as trigger.
4. Replace references to `$('Get Data').first().json` with `$('Webhook').first().json`.
5. Add final HTTP Request node posting results to `{{ $('Webhook').first().json.saas_callback_url }}`.
6. Configure WordPress node to use dynamic values from webhook payload (`WP Site URL`, `WP Username`, `WP App Password`).
