# Search launch — imf-immobiliere.tn

The owner confirmed https://imf-immobiliere.tn and contact@imf-immobiliere.tn on 22 September 2026. The code uses this exact domain spelling as its canonical origin. Configure the domain in Vercel and DNS, enable HTTPS, and redirect www to this origin. Redirect any owned former site domain permanently to the matching new URL. Mailbox hosting and delivery are separate from the public contact address and have not been tested in this change.

After deployment, check /robots.txt, /sitemap.xml and /llms.txt without authentication. Public pages permit crawling; account/admin pages carry noindex. Robots rules do not replace authentication.

Verify domain ownership in Google Search Console and Bing Webmaster Tools, then submit https://imf-immobiliere.tn/sitemap.xml. Verification requires the owner's account and DNS access. No verification token is invented by this code.

Use Search Console URL Inspection for the home page and the two active projects. Check the structured data and canonical URLs on deployed HTML. FAQ markup matches the visible answers; it does not promise a Google FAQ rich result. llms.txt is an optional content guide, not an indexing guarantee.

Public routes include French, Arabic and English alternatives. No country restriction is applied: Tunisian residents and Tunisian buyers abroad can discover the same pages. Keep availability and prices current. Record Search Console/Bing indexing reports after launch; analytics only measures visits, not indexing.

External search and AI services decide whether and when to index or cite the pages. A working deployment and crawl access are prerequisites; ranking cannot be guaranteed.

## Accès réel des robots et hébergement

Audit du dépôt : aucun `vercel.json`, aucune règle WAF ni filtre de User-Agent dans le middleware. La CSP à nonce et les protections des fichiers CAD/PDF sont conservées. `PUBLIC_FILE` laisse passer `/robots.txt`, `/llms.txt`, `/llms-full.txt` et `/sitemap.xml` sans redirection de langue.

Le test HTTP de la production existante avec `GPTBot/1.1` sur `/fr` a renvoyé 200 avec du HTML, quatre scripts JSON-LD et les alternatives `fr`, `ar`, `en`, `x-default`. Cela ne prouve pas le passage de tous les robots depuis leurs réseaux réels. Le refus précédemment signalé n'a pas été reproduit et sa cause n'est pas établie. Le compte Vercel connecté ne trouve pas ce projet et ne dispose d'aucune équipe accessible : la configuration du tableau de bord n'a donc pas pu être inspectée.

Si un refus persiste après déploiement :

1. Ouvrir le projet IMF dans Vercel, **Security → Firewall → Traffic**, filtrer l'URL, l'heure du refus et le robot ; relever la règle/action responsable et l'identifiant de requête. Un User-Agent envoyé avec curl n'authentifie pas le robot.
2. Dans **Security → Firewall → Rules → Bot Management → AI Bots**, ouvrir les réglages et choisir **Log** pour **AI crawlers** et **AI assistants**, puis **Review Changes → Publish**. Cela permet le passage tout en conservant la journalisation. Ne pas laisser ces catégories en **Deny** si l'objectif est leur accès public.
3. Examiner les règles personnalisées **Deny/Challenge** et les restrictions géographiques : elles ne doivent pas bloquer les robots vérifiés sur les pages publiques. Autoriser Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended et Applebot-Extended. Privilégier les signaux de bots vérifiés aux exceptions fondées uniquement sur un User-Agent falsifiable ; garder `/api/`, l'authentification et les espaces privés protégés.
4. Vérifier **Attack Challenge Mode**, **Bot Protection** et **Settings → Deployment Protection** : les visiteurs publics ne doivent pas recevoir de challenge ou de connexion sur le domaine de production. Examiner une éventuelle protection Cloudflare en amont. Corriger uniquement la règle identifiée ; ne pas désactiver la protection DDoS globale.
5. Refaire les tests de `scripts/verify-search-http.cjs` sur le domaine public et vérifier un passage réel dans les journaux. `robots.txt` ne peut pas annuler un blocage au niveau du réseau ou du WAF.

Références Vercel : https://vercel.com/docs/bot-management et https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets ; réglages distincts crawlers/assistants : https://vercel.com/changelog/block-ai-crawlers-and-assistants-independently-with-managed-rules .

## Décision : aucune fausse API pour les agents

Ne pas publier `/.well-known/poppy.json`, `/.well-known/openid-configuration`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, `/auth.md`, `/.well-known/api-catalog`, `/.well-known/ai-catalog.json`, `/.well-known/agent-skills/index.json`, ni DNS-AID. IMF n'expose aucune API publique pour les agents et l'espace client est privé. Ces métadonnées décriraient des services inexistants, augmenteraient la surface exposée et n'apporteraient pas de bénéfice démontré au référencement.
