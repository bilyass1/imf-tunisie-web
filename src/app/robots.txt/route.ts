import { SITE } from '@/lib/site';

const bots = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended'];
const rules = ['Allow: /', 'Disallow: /api/', 'Disallow: /*/admin', 'Disallow: /*/espace-client', 'Disallow: /*/connexion', 'Disallow: /*/inscription'];
const signal = 'Content-Signal: search=yes, ai-input=yes, ai-train=yes';

export function GET() {
  // ai-train=yes est un choix de l’entreprise. Le passer à no n’empêche pas
  // d’être cité dans les réponses IA : ai-input et search restent à yes.
  // Explicit bot groups take precedence over '*', so repeat the signal in each.
  const content = [
    `# ${SITE.name} — ${SITE.legalName}`, 'User-agent: *',
    signal, ...rules, '',
    ...bots.map(bot => `User-agent: ${bot}`), signal, ...rules, '',
    `Sitemap: ${SITE.url}/sitemap.xml`, '',
  ].join('\n');
  return new Response(content, {headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
