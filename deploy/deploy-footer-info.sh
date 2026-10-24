#!/bin/bash
# Run from the authorized OVH root console; preserve the existing checkout.
set -Eeuo pipefail
[[ $EUID = 0 ]] || { echo 'Exécuter avec sudo bash.'; exit 1; }
cd /srv/imf/app
exec 9>/run/lock/imf-contact-deploy.lock
flock -n 9
app=/srv/imf/app
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dist=".next-footer-$stamp"
backup="/root/imf-footer-$stamp"
dropin=/etc/systemd/system/imf-validation.service.d/99-contact-build.conf
nginx_file=$(readlink -f /etc/nginx/sites-enabled/imf-tn)
footer_ref=a61b7a18041e3d2853c972b79bc630d3399bfab7
footer_base=a0a2147c8587da23f9d95c0be169f317bffde5ed
contact_ref=8db48edc87e70071d1057c70742368fc30095c48
contact_base=a9e671547c7f888300e3cc33680880386b014ef4
g() { runuser -u imf -- git -C "$app" "$@"; }
test "$(systemctl show imf-validation -p WorkingDirectory --value)" = "$app"
test "$(systemctl show imf-validation -p User --value)" = imf
test -f /etc/imf/validation.env
test -f "$nginx_file"

# A listener on the target port must belong to this exact service.
ss -H -lntp '( sport = :3001 )' | python3 -c '
import pathlib,re,sys
text=sys.stdin.read()
if text.strip():
 pids=set(re.findall(r"pid=(\d+)",text))
 if not pids or any("/imf-validation.service" not in pathlib.Path("/proc/"+p+"/cgroup").read_text() for p in pids):
  raise SystemExit("Port 3001 utilisé par un autre service : déploiement arrêté.")
'
python3 - "$nginx_file" <<'PY'
from pathlib import Path
import re,sys
text=Path(sys.argv[1]).read_text()
if len(re.findall(r'proxy_pass\s+http://127\.0\.0\.1:300[01];',text))!=1:
    raise SystemExit('Configuration Nginx différente : déploiement arrêté.')
PY

install -d -m 700 "$backup"
echo "SAUVEGARDE : $backup"
g fetch --no-tags origin fix/footer-info-email fix/contact-apartment-dropdown
g diff --binary "$footer_base" "$footer_ref" -- \
  ':(literal)src/components/site/Footer.tsx' > "$backup/footer.patch"
g diff --binary "$contact_base" "$contact_ref" -- \
  ':(literal)src/app/[locale]/(site)/contact/page.tsx' \
  ':(literal)src/components/site/ContactForm.tsx' > "$backup/contact.patch"
test -s "$backup/footer.patch"
test -s "$backup/contact.patch"
footer_needed=1
contact_needed=1
if g apply --reverse --check < "$backup/footer.patch" 2>/dev/null; then footer_needed=0;
else g apply --check < "$backup/footer.patch"; fi
if g apply --reverse --check < "$backup/contact.patch" 2>/dev/null; then contact_needed=0;
else g apply --check < "$backup/contact.patch"; fi

g diff --binary HEAD > "$backup/local-changes.patch"
g diff --cached --binary > "$backup/staged-changes.patch"
cp -a "$app/.git/index" "$backup/index"
tar -C "$app" -cf "$backup/source.tar" src docs tsconfig.json
cp -a "$nginx_file" "$backup/nginx.conf"
if [[ -e $dropin ]]; then cp -a "$dropin" "$backup/service.conf"; fi
cutover=0
rollback() {
  code=$?
  trap - ERR
  set +e
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
if [[ $footer_needed = 1 ]]; then g apply < "$backup/footer.patch"; fi
if [[ $contact_needed = 1 ]]; then g apply < "$backup/contact.patch"; fi

# Keep the current build running while compiling to a separate directory.
systemd-run --unit="imf-footer-build-$stamp" --collect --wait --pipe \
  --uid=imf --working-directory="$app" \
  --property=EnvironmentFile=/etc/imf/validation.env \
  /usr/bin/env "IMF_BUILD_DIR=$dist" /bin/bash -c \
  'npm run typecheck && npm run test:property && npm run build'
test -s "$app/$dist/BUILD_ID"

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
        if self.footer and tag=='a': self.emails.add(attrs.get('href',''))
        if tag=='select' and attrs.get('id')=='cf-lot': self.apartments=True
    def handle_endtag(self,tag):
        if tag=='footer': self.footer=False
page=Page(); page.feed(Path(sys.argv[1]).read_text())
expected={'mailto:contact@imf-immobiliere.tn','mailto:info@imf-immobiliere.tn'}
sys.exit(0 if expected <= page.emails and page.apartments else 1)
PY
wait_page() {
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
wait_page http://127.0.0.1:3001/fr/contact
echo 'LOCAL_OK — deux emails et sélecteur Appartement présents.'
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
wait_page https://imf-immobiliere.tn/fr/contact \
  --resolve imf-immobiliere.tn:443:127.0.0.1
systemctl is-active imf-validation
trap - ERR
echo 'HTTPS_OK — contact@imf-immobiliere.tn et info@imf-immobiliere.tn dans le footer.'
echo "DEPLOIEMENT_TERMINE — sauvegarde : $backup"
