import type { PageServerLoad } from './$types';
import { dbGet, dbAll } from '$lib/server/db';
import type { Adventure } from '$lib/shared/types';

export const load: PageServerLoad = async () => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // Get adventures that happened on this day in previous years
  const memories = dbAll(`
    SELECT a.*, u.name as author_name
    FROM adventures a
    JOIN users u ON a.author_id = u.id
    WHERE a.is_draft = 0 
      AND a.visibility = 'family'
      AND CAST(strftime('%m', a.start_date) AS INTEGER) = ?
      AND CAST(strftime('%d', a.start_date) AS INTEGER) = ?
      AND strftime('%Y', a.start_date) < strftime('%Y', 'now')
    ORDER BY a.start_date DESC
  `, currentMonth, currentDay) as Adventure[];

  // Group by year
  const yearGroups = new Map<number, Adventure[]>();
  memories.forEach(m => {
    const year = new Date(m.start_date!).getFullYear();
    if (!yearGroups.has(year)) {
      yearGroups.set(year, []);
    }
    yearGroups.get(year)!.push(m);
  });

  const memoriesGrouped = Array.from(yearGroups.entries())
    .map(([year, adventures]) => ({
      year,
      monthName: new Date(adventures[0].start_date!).toLocaleDateString('en-US', { month: 'long' }),
      day: currentDay,
      adventures
    }))
    .sort((a, b) => b.year - a.year);

  // Get upcoming anniversaries (within next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const allAdventures = dbAll(`
    SELECT * FROM adventures
    WHERE is_draft = 0 AND start_date IS NOT NULL
    ORDER BY start_date
  `) as Adventure[];

  const upcomingAnniversaries = allAdventures
    .filter(a => {
      if (!a.start_date) return false;
      const adventureDate = new Date(a.start_date);
      const thisYearAnniversary = new Date(today.getFullYear(), adventureDate.getMonth(), adventureDate.getDate());
      
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(thisYearAnniversary.getFullYear() + 1);
      }
      
      return thisYearAnniversary <= thirtyDaysFromNow && thisYearAnniversary >= today;
    })
    .map(a => {
      const adventureDate = new Date(a.start_date!);
      const yearsAgo = today.getFullYear() - adventureDate.getFullYear();
      return { ...a, yearsAgo };
    })
    .sort((a, b) => {
      const aDate = new Date(a.start_date!);
      const bDate = new Date(b.start_date!);
      const aThisYear = new Date(today.getFullYear(), aDate.getMonth(), aDate.getDate());
      const bThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      if (aThisYear < today) aThisYear.setFullYear(aThisYear.getFullYear() + 1);
      if (bThisYear < today) bThisYear.setFullYear(bThisYear.getFullYear() + 1);
      return aThisYear.getTime() - bThisYear.getTime();
    });

  return {
    memories: memoriesGrouped,
    upcomingAnniversaries
  };
};
