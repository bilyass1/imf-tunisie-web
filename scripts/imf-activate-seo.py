#!/usr/bin/env python3
"""Activate the validated VPS candidate; --rollback restores the previous service.

Keeps Nginx, the active checkout, service environment and customer data in place.
Only installs its own systemd drop-in. A failed activation removes that drop-in
and restarts the original service. Never runs migrations or restores a database.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import signal
import subprocess
import sys
import time
import urllib.request

APP = Path('/srv/imf/app')
CANDIDATE = Path('/srv/imf/seo-candidate-6458988')
CONTROL = Path('/root/imf-seo-6458988')
VALIDATION = CONTROL / 'candidate.json'
TRANSACTION = CONTROL / 'activation.json'
DROPIN = Path('/etc/systemd/system/imf-validation.service.d/zz-seo-candidate-6458988.conf')
UNIT = 'imf-validation'
DOMAIN = 'imf-immobiliere.tn'
CONFIG = ('[Service]\nWorkingDirectory=' + str(CANDIDATE) + '\nExecStart=\n'
          'ExecStart=/usr/bin/env IMF_BUILD_DIR=.next-seo /usr/bin/node ' + str(CANDIDATE) +
          '/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3001\n')


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def command(args, timeout=90):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    require(result.returncode == 0, 'Commande échouée : ' + ' '.join(args[:4]))
    return result.stdout.strip()


def systemctl(*args):
    return command(['/usr/bin/systemctl', *args])


def properties():
    result = systemctl('show', UNIT, '--no-pager', '-p', 'WorkingDirectory', '-p', 'User',
                       '-p', 'ActiveState', '-p', 'MainPID', '-p', 'ExecStart')
    return dict(line.split('=', 1) for line in result.splitlines() if '=' in line)


def save(transaction):
    temporary = TRANSACTION.with_suffix('.tmp')
    temporary.write_text(json.dumps(transaction, indent=2) + '\n')
    temporary.chmod(0o600)
    os.replace(temporary, TRANSACTION)


def read_public(path):
    request = urllib.request.Request('http://127.0.0.1:3001' + path,
                                     headers={'Host': DOMAIN, 'X-Forwarded-Proto': 'https'})
    with urllib.request.urlopen(request, timeout=5) as response:
        require(response.status == 200, 'Réponse HTTP inattendue : ' + path)
        return response.read()


def wait_ready():
    deadline = time.monotonic() + 60
    while True:
        try:
            require(len(read_public('/fr')) > 100, 'Page publique vide')
            return
        except (OSError, RuntimeError):
            require(time.monotonic() < deadline, 'Service HTTP non prêt après 60 secondes')
            time.sleep(1)


def preflight():
    validation = json.loads(VALIDATION.read_text())
    require(validation.get('validated') is True and validation['candidate'] == str(CANDIDATE),
            'Candidat non validé')
    require(not CANDIDATE.is_symlink() and (CANDIDATE / '.git').is_file(), 'Worktree candidat invalide')
    require((CANDIDATE / '.next-seo/BUILD_ID').read_text().strip() == validation['build_id'],
            'Build différent de celui validé')
    require((CANDIDATE / 'node_modules/next/dist/bin/next').is_file(), 'Exécutable Next absent')
    require(not os.path.lexists(DROPIN), 'Drop-in déjà présent ; examiner ou utiliser --rollback')
    if TRANSACTION.exists():
        previous = json.loads(TRANSACTION.read_text())
        require(previous.get('status') == 'rolled_back', 'Une bascule est déjà enregistrée : examiner son état')
    current = properties()
    require(current.get('User') == 'imf' and current.get('WorkingDirectory') == str(APP),
            'Configuration du service différente de celle attendue')
    require(current.get('ActiveState') == 'active' and int(current.get('MainPID', '0')) > 0,
            'Service initial non actif : arrêt avant bascule')
    require(str(APP / 'node_modules/next/dist/bin/next') in current.get('ExecStart', '')
            and '--port 3001' in current['ExecStart'], 'Commande initiale du service inattendue')
    require(APP.joinpath('data').is_dir(), 'Dossier des données existantes absent')
    require(Path('/etc/imf/validation.env').is_file(), 'Environnement de production attendu absent')
    nginx = Path('/etc/nginx/sites-enabled/imf-tn').read_text()
    require(len(re.findall(r'proxy_pass\s+http://127\.0\.0\.1:3001\s*;', nginx)) == 1,
            'Proxy Nginx différent de celui attendu')
    command(['/usr/sbin/nginx', '-t'])
    wait_ready()
    (CONTROL / 'service.before.txt').write_text(systemctl('cat', UNIT, '--no-pager') + '\n')
    return {'status': 'prepared', 'candidate': str(CANDIDATE), 'original_directory': str(APP),
            'build_id': validation['build_id'], 'previous': current}


def connect_existing_data():
    owner = pwd.getpwnam('imf')
    source, target = APP / 'data', CANDIDATE / 'data'
    require(source.is_dir(), 'Données existantes absentes')
    if target.is_symlink():
        require(target.resolve() == source.resolve(), 'Lien de données candidat différent : arrêt')
    else:
        if target.exists():
            require(target.is_dir(), 'Le chemin data du candidat n’est pas un dossier')
            preserved = CONTROL / 'candidate-test-data'
            require(not os.path.lexists(preserved), 'Anciennes données de test déjà sauvegardées : arrêt')
            target.rename(preserved)
        target.symlink_to(source, target_is_directory=True)
        os.lchown(target, owner.pw_uid, owner.pw_gid)
    for name in ('.env', '.env.local', '.env.production', '.env.production.local'):
        original, linked = APP / name, CANDIDATE / name
        if os.path.lexists(linked):
            require(linked.is_symlink() and original.is_file() and linked.resolve() == original.resolve(),
                    'Environnement candidat différent : ' + name)
        elif original.is_file():
            linked.symlink_to(original)
            os.lchown(linked, owner.pw_uid, owner.pw_gid)


def dropin_content():
    return CONFIG + 'ReadWritePaths=' + str(CANDIDATE / '.next-seo') + ' ' + str((APP / 'data').resolve()) + '\n'


def smoke():
    for name in ('verify-search-http.cjs', 'test-jsonld.cjs'):
        logfile = CONTROL / ('live-' + name + '.log')
        print('Contrôle public : ' + name, flush=True)
        with logfile.open('w') as output:
            process = subprocess.Popen(['/usr/sbin/runuser', '-u', 'imf', '--', '/usr/bin/node',
                                        'scripts/' + name, 'http://127.0.0.1:3001'], cwd=CANDIDATE,
                                       env={'PATH': '/usr/local/bin:/usr/bin:/bin', 'LANG': 'C.UTF-8'},
                                       stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                require(process.wait(timeout=600) == 0, 'Contrôle HTTP échoué : voir ' + str(logfile))
            finally:
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait(timeout=5)
    for path in ('/robots.txt', '/llms.txt', '/sitemap.xml', '/fr', '/fr/projets/residence-la-gloire'):
        command(['/usr/bin/curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
                 '--max-time', '30', '--resolve', DOMAIN + ':443:127.0.0.1',
                 '--output', '/dev/null', 'https://' + DOMAIN + path], timeout=40)
    markdown = command(['/usr/bin/curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
                        '--max-time', '30', '--resolve', DOMAIN + ':443:127.0.0.1',
                        '-H', 'Accept: text/markdown', '-D', '-', 'https://' + DOMAIN + '/fr'], timeout=40)
    require(re.search(r'^content-type:\s*text/markdown', markdown, re.I | re.M), 'Markdown HTTPS absent')
    require(any(re.search(r'(?:^|,)\s*accept\s*(?:,|$)', line.split(':', 1)[1], re.I)
                for line in markdown.splitlines() if line.lower().startswith('vary:')),
            'Vary Accept absent en HTTPS')
    paths = ['models/la-gloire/floor-plans.json', 'media/marassim/facade-client-20261027.webp']
    paths += ['documents/diar-al-yassamine/' + name + '.web.pdf'
              for name in ('decision-prix-2025-03-03', 'liste-projets-2025-12-18')]
    for path in paths:
        require(read_public('/' + path) == (CANDIDATE / 'public' / path).read_bytes(),
                'Fichier public différent : ' + path)
    current = properties()
    require(current['ActiveState'] == 'active' and current['WorkingDirectory'] == str(CANDIDATE),
            'Le candidat n’est pas le service actif')


def rollback(transaction):
    require(transaction['candidate'] == str(CANDIDATE)
            and transaction['original_directory'] == str(APP), 'Sauvegarde de bascule inattendue')
    require(properties()['WorkingDirectory'] in (str(APP), str(CANDIDATE)),
            'Service reconfiguré depuis la bascule : retour automatique arrêté')
    if os.path.lexists(DROPIN):
        require(not DROPIN.is_symlink() and hashlib.sha256(DROPIN.read_bytes()).hexdigest()
                == transaction['dropin_sha256'], 'Drop-in modifié depuis la bascule : arrêt')
        DROPIN.unlink()
    systemctl('daemon-reload')
    require(properties()['WorkingDirectory'] == str(APP), 'Ancienne configuration non restaurée')
    systemctl('restart', UNIT)
    wait_ready()
    transaction['status'] = 'rolled_back'
    save(transaction)
    print('RETOUR_ANCIENNE_VERSION_OK — données existantes conservées.', flush=True)


def activate():
    transaction = preflight()
    connect_existing_data()
    content = dropin_content()
    transaction['dropin_sha256'] = hashlib.sha256(content.encode()).hexdigest()
    save(transaction)
    DROPIN.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    temporary = DROPIN.with_suffix('.tmp')
    temporary.write_text(content)
    temporary.chmod(0o644)
    try:
        os.replace(temporary, DROPIN)
        systemctl('daemon-reload')
        current = properties()
        require(current['WorkingDirectory'] == str(CANDIDATE)
                and str(CANDIDATE / 'node_modules/next/dist/bin/next') in current['ExecStart']
                and 'IMF_BUILD_DIR=.next-seo' in current['ExecStart'], 'Drop-in non appliqué comme attendu')
        print('Bascule du service sur le candidat validé…', flush=True)
        systemctl('restart', UNIT)
        wait_ready()
        smoke()
        transaction['status'] = 'active'
        save(transaction)
    except BaseException:
        print('Bascule interrompue ; restauration du service précédent…', flush=True)
        rollback(transaction)
        raise
    print('DEPLOIEMENT_TERMINE=https://' + DOMAIN, flush=True)
    print('CANDIDAT_ACTIF=' + str(CANDIDATE), flush=True)
    print('Contrôles HTTP, HTTPS, Markdown, JSON-LD et fichiers publics réussis.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rollback', action='store_true')
    options = parser.parse_args()
    require(os.geteuid() == 0, 'Exécuter avec sudo python3')
    require(CONTROL.is_dir() and not CONTROL.is_symlink() and CONTROL.stat().st_uid == 0
            and not CONTROL.stat().st_mode & 0o077, 'État de validation root privé absent')
    os.umask(0o077)
    def interrupted(_number, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGHUP, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    with open('/run/lock/imf-contact-deploy.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Un autre déploiement utilise déjà le verrou')
        if options.rollback:
            rollback(json.loads(TRANSACTION.read_text()))
        else:
            activate()


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print('ARRÊT : ' + (str(error) or 'interruption'), file=sys.stderr)
        print('État et journaux : ' + str(CONTROL), file=sys.stderr)
        sys.exit(1)
