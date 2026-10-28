#!/bin/bash
# Deploy the reviewed PR4 integration, preserving the VPS working tree and index.
set -Eeuo pipefail
[[ $EUID = 0 ]] || { echo 'Exécuter avec sudo bash.'; exit 1; }
revision=${1:?Révision complète requise}
[[ $revision =~ ^[0-9a-f]{40}$ ]] || exit 1
base=a0a2147c8587da23f9d95c0be169f317bffde5ed
app=/srv/imf/app
cd "$app"
exec 9>/run/lock/imf-contact-deploy.lock
flock -n 9
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dist=".next-pr4-$stamp"
backup="/root/imf-pr4-$stamp"
dropin=/etc/systemd/system/imf-validation.service.d/99-pr4-build.conf
nginx_file=$(readlink -f /etc/nginx/sites-enabled/imf-tn)
g() { runuser -u imf -- /usr/bin/git -C "$app" "$@"; }
test "$(g rev-parse --show-toplevel)" = "$app"
test "$(systemctl show imf-validation -p WorkingDirectory --value)" = "$app"
test "$(systemctl show imf-validation -p User --value)" = imf
test -f /etc/imf/validation.env
test -f "$nginx_file"
test "$(df --output=avail -k "$app" | tail -n 1)" -ge 2097152 || {
  echo 'Moins de 2 Go libres : arrêt avant modification.'; exit 1;
}
ss -H -lntp '( sport = :3001 )' | python3 -c '
import pathlib,re,sys
text=sys.stdin.read()
if text.strip():
 pids=set(re.findall(r"pid=(\d+)",text))
 if not pids or any("/imf-validation.service" not in pathlib.Path("/proc/"+p+"/cgroup").read_text() for p in pids):
  raise SystemExit("Port 3001 utilisé par un autre service : arrêt.")
'
python3 - "$nginx_file" <<'PY'
from pathlib import Path
import re,sys
if len(re.findall(r'proxy_pass\s+http://127\.0\.0\.1:300[01];',Path(sys.argv[1]).read_text()))!=1:
    raise SystemExit('Configuration Nginx différente : arrêt avant modification.')
PY

g fetch --no-tags origin refs/heads/deploy/pr4-ovh
g cat-file -e "$revision^{commit}"
g merge-base --is-ancestor "$base" "$revision"
install -d -m 700 "$backup"
echo "SAUVEGARDE : $backup"
g show "$revision:deploy/prepare-pr4.py" > "$backup/prepare.py"
python3 "$backup/prepare.py" prepare --app "$app" --workspace "$backup" \
  --base "$base" --revision "$revision"
g diff --binary HEAD > "$backup/local-changes.patch"
g diff --cached --binary > "$backup/staged-changes.patch"
cp -a "$app/.git/index" "$backup/index"
tar -C "$app" -cf "$backup/source.tar" \
  src scripts docs package.json package-lock.json tsconfig.json next-env.d.ts next.config.mjs
cp -a "$nginx_file" "$backup/nginx.conf"
if [[ -e $dropin ]]; then cp -a "$dropin" "$backup/service.conf"; fi
cutover=0
rollback() {
  code=$?
  trap - ERR
  set +e
  python3 "$backup/prepare.py" restore --app "$app" --workspace "$backup"
  tar -C "$app" -xf "$backup/source.tar"
  if [[ $cutover = 1 ]]; then
    cp -a "$backup/nginx.conf" "$nginx_file"
    if [[ -e $backup/service.conf ]]; then cp -a "$backup/service.conf" "$dropin";
    else rm -f "$dropin"; fi
    systemctl daemon-reload
    systemctl restart imf-validation
    nginx -t && systemctl reload nginx
    journalctl -u imf-validation -n 15 --no-pager
  fi
  echo "DÉPLOIEMENT INTERROMPU — sauvegarde : $backup"
  exit "$code"
}
trap rollback ERR
python3 "$backup/prepare.py" apply --app "$app" --workspace "$backup"

# Regression checks have no production environment file or database credentials.
systemd-run --unit="imf-pr4-checks-$stamp" --collect --wait --pipe \
  --uid=imf --working-directory="$app" \
  /usr/bin/env -u DATABASE_URL -u POSTGRES_URL NODE_ENV=test "IMF_BUILD_DIR=$dist" \
  /bin/bash -c 'npm run models:gloire-plans && npm run typecheck && npm run lint && npm test'
systemd-run --unit="imf-pr4-build-$stamp" --collect --wait --pipe \
  --uid=imf --working-directory="$app" \
  --property=EnvironmentFile=/etc/imf/validation.env \
  /usr/bin/env "IMF_BUILD_DIR=$dist" /usr/bin/npm run build
test -s "$app/$dist/BUILD_ID"
for document in decision-prix-2025-03-03 liste-projets-2025-12-18; do
  cmp "$app/source-assets/documents/diar-al-yassamine/$document.pdf" \
    "$app/public/documents/diar-al-yassamine/$document.web.pdf"
done

cat > "$backup/check-page.py" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import sys
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.footer=False; self.emails=set(); self.apartments=False
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='footer': self.footer=True
        if self.footer and tag=='a': self.emails.add(attrs.get('href','').lower())
        if tag=='select' and attrs.get('id')=='cf-lot': self.apartments=True
    def handle_endtag(self,tag):
        if tag=='footer': self.footer=False
page=Page(); page.feed(Path(sys.argv[1]).read_text())
expected={'mailto:contact@imf-immobiliere.tn','mailto:info@imf-immobiliere.tn'}
sys.exit(0 if expected<=page.emails and page.apartments else 1)
PY
wait_contact() {
  local url=$1
  shift
  for attempt in {1..20}; do
    if curl --fail --silent --max-time 5 \
      -H 'Host: imf-immobiliere.tn' -H 'X-Forwarded-Proto: https' \
      "$@" --output "$backup/check.html" "$url" && \
      python3 "$backup/check-page.py" "$backup/check.html"; then return 0; fi
    sleep 1
  done
  echo 'Contrôle du footer et du formulaire non confirmé.'
  return 1
}
check_assets() {
  local origin=$1
  shift
  curl --fail --silent --show-error --max-time 20 "$@" \
    "$origin/models/la-gloire/floor-plans.json" --output "$backup/floors.json"
  python3 - "$backup/floors.json" <<'PY'
from pathlib import Path
import json,sys
data=json.loads(Path(sys.argv[1]).read_text())
assert [floor['floor'] for floor in data['floors']]==list(range(6))
assert all('triangles' in floor and floor['texture'].endswith('.webp') for floor in data['floors'])
PY
  curl --fail --silent --show-error --max-time 20 "$@" \
    "$origin/media/marassim/facade-client-20261027.webp" --output "$backup/marassim.webp"
  cmp "$backup/marassim.webp" "$app/public/media/marassim/facade-client-20261027.webp"
  curl --fail --silent --show-error --max-time 20 "$@" \
    "$origin/fr/projets/complexe-marassim" --output "$backup/project.html"
  grep -q 'facade-client-20261027.webp' "$backup/project.html"
  curl --fail --silent --show-error --max-time 20 "$@" \
    "$origin/fr/projets/residence-la-gloire" --output "$backup/gloire.html"
  python3 - "$backup/gloire.html" <<'PY'
from pathlib import Path
import sys
html=Path(sys.argv[1]).read_text()
assert 'id="plans-ensemble"' in html
assert 'data-viewer-mounted="true"' in html, 'La Gloire must mount without waiting for a click or scrolling'
assert '/models/la-gloire/la-gloire-web.glb' in html, 'Model preload must be present in the initial page'
for document in ['PLANCHERDC',*[f'PLANCHE{i}ETAGE' for i in range(1,6)],'PLANCHESOUS-SOL']:
    assert '/fr/projets/residence-la-gloire/plans/'+document in html
PY
  for document in decision-prix-2025-03-03 liste-projets-2025-12-18; do
    curl --fail --silent --show-error --max-time 30 "$@" \
      "$origin/documents/diar-al-yassamine/$document.web.pdf" --output "$backup/$document.pdf"
    cmp "$backup/$document.pdf" "$app/source-assets/documents/diar-al-yassamine/$document.pdf"
  done
}

cutover=1
install -d -m 755 "$(dirname "$dropin")"
cat > "$dropin" <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/env IMF_BUILD_DIR=$dist /usr/bin/node $app/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3001
ReadWritePaths=$app/$dist
EOF
systemctl daemon-reload
systemctl restart imf-validation
for locale in fr en ar; do wait_contact "http://127.0.0.1:3001/$locale/contact"; done
check_assets http://127.0.0.1:3001
echo 'LOCAL_OK — footer, appartements, plans 3D, sept plans d’ensemble, PDF complets et photo Marassim.'
python3 - "$nginx_file" <<'PY'
from pathlib import Path
import re,sys
path=Path(sys.argv[1])
text,count=re.subn(r'proxy_pass\s+http://127\.0\.0\.1:300[01];',
    'proxy_pass http://127.0.0.1:3001;',path.read_text())
if count!=1: raise SystemExit('Configuration Nginx modifiée simultanément.')
path.write_text(text)
PY
nginx -t
systemctl reload nginx
wait_contact https://imf-immobiliere.tn/fr/contact \
  --resolve imf-immobiliere.tn:443:127.0.0.1
check_assets https://imf-immobiliere.tn \
  --resolve imf-immobiliere.tn:443:127.0.0.1
curl --fail --silent --show-error --max-time 20 \
  --resolve imf-immobiliere.tn:443:127.0.0.1 \
  https://imf-immobiliere.tn/fr/connexion --output /dev/null
systemctl is-active imf-validation
trap - ERR
echo 'HTTPS_OK — PR4 vérifiée sur imf-immobiliere.tn.'
echo "REVISION : $revision"
echo "DEPLOIEMENT_TERMINE — sauvegarde : $backup"
