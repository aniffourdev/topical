export type AIProvider = 'gemini' | 'groq' | 'openai' | 'anthropic';
export type ContentType = 'pillar' | 'cluster';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  description?: string;
  wp_site_url?: string;
  wp_username?: string;
  wp_app_password?: string;
  n8n_webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Pillar {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  url_slug: string;
  focus_keyword?: string;
  search_volume?: number;
  generation_method: 'manual' | 'csv_upload';
  article_status: 'pending' | 'writing' | 'published' | 'failed';
  wp_post_id?: number;
  wp_post_url?: string;
  clusters?: Cluster[];
}

export interface Cluster {
  id: string;
  pillar_id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  url_slug: string;
  focus_keyword?: string;
  search_volume?: number;
  article_status: 'pending' | 'writing' | 'published' | 'failed';
  wp_post_id?: number;
  wp_post_url?: string;
}
