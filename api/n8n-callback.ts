import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const { saas_record_id, saas_content_type, status, wp_post_id, wp_post_url, error_message } = req.body;
  const table = saas_content_type === 'pillar' ? 'pillars' : 'clusters';
  await supabase.from(table).update({ article_status: status === 'success' ? 'published' : 'failed', wp_post_id, wp_post_url }).eq('id', saas_record_id);
  await supabase.from('workflow_history').update({ status: status === 'success' ? 'success' : 'failed', completed_at: new Date().toISOString(), wp_post_id, wp_post_url, error_message }).eq('content_id', saas_record_id).order('created_at', { ascending: false }).limit(1);
  res.status(200).json({ ok: true });
}
