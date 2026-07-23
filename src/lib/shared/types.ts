export interface User {
  id: string;
  immich_user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
}

export interface Adventure {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  cover_asset_id: string | null;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  start_date: string | null;
  end_date: string | null;
  visibility: 'private' | 'family' | 'public';
  mood: string | null;
  template_type: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdventureMedia {
  id: string;
  adventure_id: string;
  immich_asset_id: string | null;
  file_path: string | null;
  media_type: 'photo' | 'video' | 'audio';
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface Comment {
  id: string;
  adventure_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author?: User;
  replies?: Comment[];
}

export interface Reaction {
  id: string;
  adventure_id: string;
  author_id: string;
  emoji: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PublicShare {
  id: string;
  adventure_id: string;
  share_token: string;
  password_hash: string | null;
  expires_at: string | null;
  allow_download: boolean;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  adventure_id: string | null;
  action_type: 'created_adventure' | 'commented' | 'reacted' | 'shared';
  metadata: string | null;
  created_at: string;
  user?: User;
  adventure?: Adventure;
}

export interface ImmichAsset {
  id: string;
  originalFileName?: string;
  originalPath?: string;
  type?: string;
  mimeType?: string;
  [key: string]: unknown;
}
