import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';

const US_STATES: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

export const load: PageServerLoad = async () => {
  const adventures = await dbAll(`
    SELECT a.*, u.name as author_name
    FROM adventures a
    JOIN users u ON a.author_id = u.id
    WHERE a.is_draft = 0
  `) as any[];

  const totalAdventures = adventures.length;
  const uniqueLocations = new Set(adventures.filter((a: any) => a.location_name).map((a: any) => a.location_name)).size;

  // States visited
  const statesVisited = new Set<string>();
  for (const adv of adventures) {
    if (adv.location_name) {
      for (const [state, abbr] of Object.entries(US_STATES)) {
        if (adv.location_name.toLowerCase().includes(state.toLowerCase()) || adv.location_name.toUpperCase().includes(abbr)) {
          statesVisited.add(abbr);
        }
      }
    }
  }

  // Adventures by year
  const byYear: Record<string, number> = {};
  for (const adv of adventures) {
    const year = adv.start_date ? adv.start_date.substring(0, 4) : 'Unknown';
    byYear[year] = (byYear[year] || 0) + 1;
  }

  // Adventures by type
  const byType: Record<string, number> = {};
  for (const adv of adventures) {
    const type = adv.template_type || 'Other';
    byType[type] = (byType[type] || 0) + 1;
  }

  // Adventures by mood
  const byMood: Record<string, number> = {};
  for (const adv of adventures) {
    if (adv.mood) {
      byMood[adv.mood] = (byMood[adv.mood] || 0) + 1;
    }
  }

  // Top authors
  const byAuthor: Record<string, number> = {};
  for (const adv of adventures) {
    byAuthor[adv.author_name] = (byAuthor[adv.author_name] || 0) + 1;
  }

  // Media count
  const allMedia = await dbAll('SELECT COUNT(*) as count FROM adventure_media');
  const totalMedia = (allMedia[0] as any)?.count || 0;

  // Total comments
  const allComments = await dbAll('SELECT COUNT(*) as count FROM comments');
  const totalComments = (allComments[0] as any)?.count || 0;

  // Bucket list stats
  const bucketItems = await dbAll('SELECT COUNT(*) as count FROM bucket_list') as any[];
  const totalBucketItems = bucketItems[0]?.count || 0;

  return {
    totalAdventures,
    uniqueLocations,
    statesVisited: Array.from(statesVisited),
    statesCount: statesVisited.size,
    byYear,
    byType,
    byMood,
    byAuthor,
    totalMedia,
    totalComments,
    totalBucketItems
  };
};
