/** Locations supplied by the owner; resolved from the shared Google Maps links. */
const locations: Record<string, { query: string; url: string; featureId?: string }> = {
  'residence-la-gloire': {
    query: '36.863450,10.264675',
    url: 'https://goo.gl/maps/w5Ddij5XnhBE3Y4W9',
  },
  'diar-al-yassamine': {
    query: 'QQ8V+2PG Diar al yassamine, Sidi Mansour',
    url: 'https://maps.app.goo.gl/xRwdQXSZjQcyQZk97',
    featureId: '0x1301d3001dbbd917:0xf5d162f54b877f75',
  },
};

// Resolve at display time so existing PostgreSQL records with old address
// searches use the corrected pins too, without changing commercial records.
export function projectMap(slug: string, fallbackQuery: string, locale = 'fr') {
  const location = locations[slug];
  const query = location?.query ?? fallbackQuery;
  const params = new URLSearchParams({ q: query, output: 'embed', z: '17', hl: locale });
  if (location?.featureId) params.set('ftid', location.featureId);
  return {
    embedUrl: `https://maps.google.com/maps?${params}`,
    externalUrl: location?.url ?? `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query })}`,
    ownerProvided: Boolean(location),
  };
}
