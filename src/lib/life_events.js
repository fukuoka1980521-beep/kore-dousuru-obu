// Life-event search/suggest — thin, named wrappers around search.js's
// generic display_name/aliases matching. No new matching logic: a life
// event record shape (display_name, aliases) is identical to a waste item's
// for search purposes, so reusing searchItems()/fuzzySuggestItems() keeps
// the tested tier ①-⑤ behavior (see search.js) instead of forking it.
import { searchItems, fuzzySuggestItems } from './search.js';

export function searchLifeEvents(events, query) {
  return searchItems(events, query);
}

export function fuzzySuggestLifeEvents(events, query, limit = 5) {
  return fuzzySuggestItems(events, query, limit);
}

export function resolveLifeEventDeepLink(events, eventId) {
  if (!eventId) return { ok: false, reason: 'MISSING_ID' };
  const record = events.find((e) => e.event_id === eventId);
  if (!record) return { ok: false, reason: 'UNKNOWN_ID' };
  return { ok: true, item: record };
}
