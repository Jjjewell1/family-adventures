import type { TourStep } from '$lib/components/GuidedTour.svelte';

const KEY = 'fa.tour.v1';

export const tourSteps: TourStep[] = [
  {
    id: 'start',
    title: 'This is the family album',
    body: 'Everything here was added by someone in the family — a trip, a day out, or a photo worth keeping.',
    target: '[data-tour="brand"]'
  },
  {
    id: 'adventures',
    href: '/adventures',
    title: 'An adventure is one day out',
    body: 'A beach morning, a camping weekend, the school trip. Each one gathers its own photos, places and people.',
    target: '.page-header'
  },
  {
    id: 'gallery',
    href: '/gallery',
    title: 'All the photos in one place',
    body: 'Every photo from every adventure, gathered together. Tap one to open it, or long-press for more.',
    target: '.page-header'
  },
  {
    id: 'map',
    href: '/map',
    title: 'Where you have been',
    body: 'Give an adventure a location and it drops a pin here, so you can see the map of your family’s days out.',
    target: '.page-header'
  },
  {
    id: 'people',
    href: '/people',
    title: 'Who was there',
    body: 'Tag someone in a photo and they collect here, with every adventure they have been part of.',
    target: '.page-header'
  },
  {
    id: 'join',
    title: 'Want to add your own?',
    body: 'Anyone can look. To add photos and adventures, ask to join — a parent approves new accounts first.'
  }
];

/** Null until the client has read localStorage, so SSR never guesses and flashes the prompt. */
export function readTourSeen(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY) === 'done';
  } catch {
    // Private browsing and blocked storage both throw here. Treating it as unseen
    // would nag on every page load, so opt out instead.
    return true;
  }
}

export function markTourSeen() {
  try {
    window.localStorage.setItem(KEY, 'done');
  } catch {
    /* nothing to persist to; the tour simply offers itself again next visit */
  }
}
