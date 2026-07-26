import { env } from '$env/dynamic/private';

const ONESIGNAL_APP_ID = env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = env.ONESIGNAL_REST_API_KEY;

const ONE_SIGNAL_API = 'https://api.onesignal.com/notifications';

function isConfigured(): boolean {
  return !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY);
}

async function sendNotification(payload: {
  headings?: { en: string };
  contents: { en: string };
  url?: string;
  included_segments?: string[];
  include_player_ids?: string[];
  data?: Record<string, any>;
}): Promise<boolean> {
  if (!isConfigured()) {
    console.log('[Notifications] OneSignal not configured, skipping');
    return false;
  }

  try {
    const res = await fetch(ONE_SIGNAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: payload.headings || { en: 'Family Adventures' },
        contents: payload.contents,
        url: payload.url,
        included_segments: payload.included_segments || ['Subscribed Users'],
        include_player_ids: payload.include_player_ids,
        data: payload.data || {},
        web_icon: '/icon-192x192.png'
      })
    });

    const result = await res.json();
    if (res.ok) {
      console.log('[Notifications] Sent:', result.id);
      return true;
    } else {
      console.error('[Notifications] Failed:', result);
      return false;
    }
  } catch (err) {
    console.error('[Notifications] Error:', err);
    return false;
  }
}

export async function notifyNewAdventure(adventure: {
  title: string;
  slug: string;
  authorName: string;
  siteUrl?: string;
}): Promise<void> {
  const url = siteUrl ? `${siteUrl}/adventures/${adventure.slug}` : `/adventures/${adventure.slug}`;

  await sendNotification({
    headings: { en: 'New Adventure' },
    contents: { en: `${adventure.authorName} posted: ${adventure.title}` },
    url
  });
}

export async function notifyNewComment(comment: {
  adventureTitle: string;
  adventureSlug: string;
  authorName: string;
  content: string;
  siteUrl?: string;
}): Promise<void> {
  const url = siteUrl
    ? `${siteUrl}/adventures/${comment.adventureSlug}`
    : `/adventures/${comment.adventureSlug}`;

  const preview = comment.content.length > 80
    ? comment.content.substring(0, 80) + '...'
    : comment.content;

  await sendNotification({
    headings: { en: 'New Comment' },
    contents: { en: `${comment.authorName} on "${comment.adventureTitle}": ${preview}` },
    url
  });
}

export async function notifyNewFamilyMember(member: {
  name: string;
  siteUrl?: string;
}): Promise<void> {
  const url = siteUrl ? `${siteUrl}/feed` : '/feed';

  await sendNotification({
    headings: { en: 'Welcome to the Family! 🎉' },
    contents: { en: `Everyone welcome ${member.name}! They've joined Family Adventures.` },
    url
  });
}

export async function notifyFeedItem(item: {
  userName: string;
  actionType: string;
  adventureTitle?: string;
  siteUrl?: string;
}): Promise<void> {
  const url = siteUrl ? `${siteUrl}/feed` : '/feed';
  let body = `${item.userName} `;

  switch (item.actionType) {
    case 'rated':
      body += `rated ${item.adventureTitle || 'an adventure'}`;
      break;
    case 'uploaded_photo':
      body += `added photos to ${item.adventureTitle || 'an adventure'}`;
      break;
    case 'created_story':
      body += `wrote a story for ${item.adventureTitle || 'an adventure'}`;
      break;
    default:
      body += `did something on ${item.adventureTitle || 'an adventure'}`;
  }

  await sendNotification({
    headings: { en: 'New Activity' },
    contents: { en: body },
    url
  });
}

export { isConfigured };
