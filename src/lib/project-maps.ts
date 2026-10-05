/** Locations supplied by the owner; resolved from the shared Google Maps links. */
const locations: Record<string, { query: string; url: string; featureId?: string }> = {
  'residence-la-gloire': {
    query: '36.8633877,10.2647763',
    url: 'https://maps.app.goo.gl/NTaTbdw559ZGenQk9?g_st=iw',
    featureId: '0x12e2b5004a0b1b4b:0xed212026a4e3b79d',
  },
  'diar-al-yassamine': {
    query: 'QQ8V+2PG Diar al yassamine, Sidi Mansour',
    url: 'https://maps.app.goo.gl/xRwdQXSZjQcyQZk97',
    featureId: '0x1301d3001dbbd917:0xf5d162f54b877f75',
  },
  'residence-zephyr': {
    query: 'QQ35+56H, Sfax, Tunisia',
    url: 'https://www.google.com/maps/search/?api=1&query=QQ35%2B56H%2C%20Sfax%2C%20Tunisia',
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
