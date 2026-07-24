import type { PageServerLoad } from './$types';
import { dbAll } from '$lib/server/db';
import type { Adventure } from '$lib/shared/types';

export const load: PageServerLoad = async () => {
  const adventures = await dbAll(`
    SELECT a.*, u.name as author_name
    FROM adventures a
    JOIN users u ON a.author_id = u.id
    WHERE a.is_draft = 0 AND a.visibility = 'family'
    ORDER BY a.start_date DESC NULLS LAST
  `) as Adventure[];

  const adventuresWithCoords = adventures.filter(a => a.lat && a.lng);
  const adventuresWithoutCoords = adventures.filter(a => !a.lat || !a.lng);

  const bucketList = await dbAll(`
    SELECT bl.*, u.name as created_by_name
    FROM bucket_list bl
    JOIN users u ON bl.created_by = u.id
    ORDER BY bl.created_at DESC
  `) as any[];

  const bucketListWithCoords = bucketList.filter((b: any) => b.lat && b.lng);

  return {
    adventures: adventuresWithCoords,
    adventuresWithoutCoords,
    bucketList: bucketListWithCoords
  };
};
