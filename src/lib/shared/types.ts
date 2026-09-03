export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: 'admin' | 'member' | 'guest';
  provider: string;
  provider_id: string | null;
  approved: number;
  password_hash: string | null;
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
  cover_file_path: string | null;
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
  file_path: string | null;
  media_type: 'photo' | 'video' | 'audio';
  caption: string | null;
  hero_image: boolean;
  order_index: number;
  category: string | null;
  ai_caption: string | null;
  ai_tags: string | null;
  created_at: string;
}

export interface SubAdventure {
  id: string;
  adventure_id: string;
  title: string;
  day_number: number | null;
  note: string | null;
  rating: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  media?: SubAdventureMedia[];
}

export interface SubAdventureMedia {
  id: string;
  sub_adventure_id: string;
  file_path: string | null;
  media_type: 'photo' | 'video' | 'audio';
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface Person {
  id: string;
  name: string;
  slug: string;
  avatar_file_path: string | null;
  photo_count?: number;
  created_at: string;
}

export interface MediaPerson {
  id: string;
  media_id: string;
  person_id: string;
  face_x: number | null;
  face_y: number | null;
  face_width: number | null;
  face_height: number | null;
  tagged_by: 'user' | 'ai';
  created_at: string;
  person_name?: string;
  person_slug?: string;
  person_avatar?: string | null;
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
  action_type: 'created_adventure' | 'commented' | 'reacted' | 'shared' | 'joined' | 'rated' | 'uploaded_photo' | 'created_story';
  metadata: string | null;
  created_at: string;
  user?: User;
  adventure?: Adventure;
  target_user?: User;
  media?: AdventureMedia;
}

export interface AIConfig {
  enabled: boolean;
  url: string;
  model: string;
}

export interface AIGenerateRequest {
  type: 'description' | 'enhance' | 'story' | 'summarize' | 'tags' | 'captions' | 'bucket-suggestions' | 'plan-trip';
  title?: string;
  description?: string;
  content?: string;
  locationName?: string;
  startDate?: string;
  endDate?: string;
  mood?: string;
  templateType?: string;
  existingTags?: string[];
  adventureHistory?: { title: string; location: string; type: string }[];
  bucketList?: { title: string; location: string }[];
  mediaCaptions?: string[];
  destination?: string;
  tripDuration?: string;
  familySize?: string;
  extraNotes?: string;
}
