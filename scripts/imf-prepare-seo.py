#!/usr/bin/env python3
"""Resolve the reviewed VPS snapshot in an isolated candidate; never activate it.

Run as root on the VPS. Default: prepare and validate. --check: repeat validation.
No checkout/reset/stash in /srv/imf/app; no production data or environment copied;
no service restart, Nginx change, remote push, or production cutover.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request

APP = Path('/srv/imf/app')
BACKUP = Path('/srv/imf/seo-review-20261031T011631Z-282827')
SNAPSHOT = '8348bef832a5a1559111b8afeebc6f450acfcfa1'
INCOMING = '6458988a5b300ecb8a82e1bc568461ef05f37329'
MERGED = 'fe690c11dccdffc5ddfdbac5914e91d00b8898f5'
CANDIDATE = Path('/srv/imf/seo-candidate-6458988')
ROOTSTATE = Path('/root/imf-seo-6458988')
STATE = ROOTSTATE / 'candidate.json'
PROJECT = 'src/app/[locale]/(site)/projets/[slug]/page.tsx'
LAZY = 'src/components/site/LazyMount.tsx'
CONFLICT = re.compile(r'^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n', re.M | re.S)


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def git(*args, data=None, index=None, check=True):
    command = ['/usr/sbin/runuser', '-u', 'imf', '--']
    if index is not None:
        command += ['env', 'GIT_INDEX_FILE=' + str(index)]
    command += ['git', '-c', 'core.hooksPath=/dev/null', '-C', str(APP), *args]
    result = subprocess.run(command, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and result.returncode:
        raise RuntimeError('Git : ' + result.stderr.decode('utf-8', errors='replace').strip()[:1200])
    return result


def text(*args, **kwargs):
    return git(*args, **kwargs).stdout.decode('utf-8').strip()


def resolve(content, path):
    content = content.replace('\r\n', '\n')
    expected = {'package.json': 1, LAZY: 3, PROJECT: 1}
    require(len(CONFLICT.findall(content)) == expected[path], 'Conflits différents : ' + path)

    def combine(match):
        ours, theirs = match.groups()
        if path == 'package.json':
            commands = []
            for side in (ours, theirs):
                item = json.loads('{' + side.strip().rstrip(',') + '}')
                require(set(item) == {'test'}, 'Conflit package.json inattendu')
                for command in item['test'].split(' && '):
                    require(re.fullmatch(r'node scripts/test-[a-z0-9-]+\.cjs', command), 'Commande de test inattendue')
                    if command not in commands:
                        commands.append(command)
            return '    "test": ' + json.dumps(' && '.join(commands)) + ',\n'
        if path == PROJECT:
            require('key={project.slug}' in ours and "eager={project.slug === 'residence-la-gloire'}" in ours,
                    'Comportement de démarrage VPS inattendu')
            require('placeholder=' in theirs, 'Placeholder SEO absent')
            require(ours.split(' minHeight=', 1)[1] == theirs.split(' minHeight=', 1)[1],
                    'Autres propriétés LazyMount différentes')
            placeholder = theirs.split('<LazyMount ', 1)[1].split(' minHeight=', 1)[0]
            return ours.replace(' minHeight=', ' ' + placeholder + ' minHeight=', 1)
        if ours.strip() == 'eager = false,' and theirs.strip() == 'placeholder,':
            return ours + theirs
        if ours.strip() == 'eager?: boolean;' and 'placeholder?:' in theirs:
            return ours + theirs
        require('data-viewer-mounted={mounted}' in ours and 'data-viewer-mounted={shown}' in theirs,
                'Conflit de rendu LazyMount inattendu')
        return theirs.replace('data-viewer-mounted={shown}', 'data-viewer-mounted={mounted}').replace(
            '{shown ? children', '{mounted ? children')

    result = CONFLICT.sub(combine, content)
    require(not re.search(r'^(<<<<<<<|=======|>>>>>>>)', result, re.M), 'Marqueur de conflit restant')
    if path == 'package.json':
        package = json.loads(result)
        require(package['dependencies']['three-mesh-bvh'] == '0.9.16', 'Dépendance 3D perdue')
        require(package['overrides']['@vercel/cli-config']['zod'] == '4.6.6', 'Correctif Zod perdu')
        require('prepare-gloire-floor-plans.mjs' in package['scripts']['prebuild'], 'Plans VPS absents du prebuild')
        require(len(package['scripts']['test'].split(' && ')) == 22, 'Liste des tests inattendue')
    return result


def candidate_is_inactive():
    require(not CANDIDATE.is_symlink() and CANDIDATE.resolve() != APP.resolve(), 'Chemin candidat invalide')
    result = subprocess.run(['/usr/bin/systemctl', 'show', 'imf-validation',
                             '-p', 'WorkingDirectory', '--value'], capture_output=True, text=True, check=True)
    active = result.stdout.strip()
    require(bool(active), 'WorkingDirectory du service inconnu')
    require(Path(active).resolve() != CANDIDATE.resolve(), 'Ce candidat est déjà actif : validation arrêtée')


def prepare():
    require(BACKUP.is_dir(), 'Sauvegarde attendue absente')
    require(not os.path.lexists(CANDIDATE), 'Candidat déjà présent ; utiliser --check pour reprendre')
    require(not STATE.exists(), 'État candidat déjà présent ; examiner avant de recommencer')
    candidate_is_inactive()
    require(git('rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False).returncode == 1,
            'Fusion active dans le dépôt de production')
    require(text('rev-parse', 'HEAD') == text('rev-parse', SNAPSHOT + '^'), 'HEAD VPS modifié depuis la sauvegarde')
    index = Path(text('rev-parse', '--git-path', 'index'))
    if not index.is_absolute():
        index = APP / index
    require(not Path(str(index) + '.lock').exists(), 'Index actif verrouillé')
    before = hashlib.sha256(index.read_bytes()).digest()
    current_index = BACKUP / ('seo-current-' + str(os.getpid()) + '.index')
    resolved_index = BACKUP / ('seo-resolved-' + str(os.getpid()) + '.index')
    git('read-tree', SNAPSHOT, index=current_index)
    git('add', '-u', index=current_index)
    git('add', '-A', '--', 'src', 'scripts', 'public', 'docs', index=current_index)
    if (APP / 'source-assets/documents').is_dir():
        git('add', '-A', '--', 'source-assets/documents', index=current_index)
    require(text('write-tree', index=current_index) == text('rev-parse', SNAPSHOT + '^{tree}'),
            'Les fichiers VPS ont changé depuis la sauvegarde ; arrêt')
    resolved = {}
    for path in ('package.json', LAZY, PROJECT):
        resolved[path] = resolve(git('show', MERGED + ':' + path).stdout.decode('utf-8'), path)
    git('read-tree', MERGED, index=resolved_index)
    for path, content in resolved.items():
        blob = text('hash-object', '-w', '--stdin', data=content.encode('utf-8'))
        git('update-index', '--add', '--cacheinfo', '100644', blob, path, index=resolved_index)
    tree = text('write-tree', index=resolved_index)
    remaining = git('grep', '-n', '-E', '^(<<<<<<< |>>>>>>> )', tree, '--', 'src', 'scripts', check=False)
    require(remaining.returncode == 1, 'Marqueurs restants ou erreur de lecture du candidat')
    # These VPS-only assets and CRM features must survive byte for byte in Git.
    entries = git('ls-tree', '-r', '-z', SNAPSHOT).stdout.split(b'\0')
    protected = ('source-assets/documents/', 'public/models/la-gloire/floor-',
                 'public/media/marassim/facade-client-20261027.webp',
                 'src/components/admin/DeleteAdminRow.tsx', 'src/lib/crm-deletion.ts')
    kept = 0
    for entry in filter(None, entries):
        metadata, raw_path = entry.split(b'\t', 1)
        path = raw_path.decode('utf-8')
        if path.startswith(protected):
            require(text('rev-parse', tree + ':' + path) == metadata.split()[2].decode(), 'Fichier VPS perdu : ' + path)
            kept += 1
    require(kept >= 11, 'Ressources VPS attendues absentes')
    sizes = git('ls-tree', '-r', '-l', tree).stdout.splitlines()
    source_bytes = sum(int(row.split(b'\t', 1)[0].split()[-1]) for row in sizes)
    deps_bytes = int(subprocess.check_output(['du', '-sk', str(APP / 'node_modules')]).split()[0]) * 1024
    needed = source_bytes + 2 * deps_bytes + 1024**3
    require(shutil.disk_usage(APP.parent).free > needed,
            'Espace insuffisant pour un candidat isolé : besoin estimé de %.1f Gio libres' % (needed / 1024**3))
    commit = text('-c', 'user.name=IMF VPS integration', '-c', 'user.email=vps-integration@localhost',
                  'commit-tree', tree, '-p', SNAPSHOT, '-p', INCOMING,
                  '-m', 'Intégrer le SEO en conservant les adaptations VPS')
    branch = 'deploy/seo-vps-6458988'
    require(git('show-ref', '--verify', '--quiet', 'refs/heads/' + branch, check=False).returncode == 1,
            'Branche candidate déjà présente')
    owner = pwd.getpwnam('imf')
    CANDIDATE.mkdir(mode=0o750)
    os.chown(CANDIDATE, owner.pw_uid, owner.pw_gid)
    git('worktree', 'add', '-b', branch, str(CANDIDATE), commit)
    require(hashlib.sha256(index.read_bytes()).digest() == before, 'Index du site actif modifié : arrêt')
    STATE.write_text(json.dumps({'candidate': str(CANDIDATE), 'commit': commit, 'tree': tree,
                                 'snapshot': SNAPSHOT, 'incoming': INCOMING}, indent=2) + '\n')
    STATE.chmod(0o600)
    print('CANDIDAT=' + str(CANDIDATE), flush=True)
    print('COMMIT_LOCAL=' + commit, flush=True)
    print('Ressources VPS protégées :', kept, flush=True)


def clean_environment():
    owner = pwd.getpwnam('imf')
    return {'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': owner.pw_dir,
            'USER': 'imf', 'LOGNAME': 'imf', 'LANG': 'C.UTF-8',
            'NEXT_TELEMETRY_DISABLED': '1', 'IMF_BUILD_DIR': '.next-seo'}


def stop_process(process):
    try:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=5)
    except ProcessLookupError:
        process.wait(timeout=5)


def check_command(name, command):
    logfile = ROOTSTATE / ('seo-' + name + '.log')
    print('\nContrôle : ' + ' '.join(command), flush=True)
    print('Journal : ' + str(logfile), flush=True)
    with logfile.open('w') as output:
        process = subprocess.Popen(['/usr/sbin/runuser', '-u', 'imf', '--', *command], cwd=CANDIDATE,
                                   env=clean_environment(), stdout=output,
                                   stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = process.wait(timeout=1800)
        except BaseException:
            stop_process(process)
            raise
    if code:
        print('\n'.join(logfile.read_text(errors='replace').splitlines()[-65:]), flush=True)
        raise RuntimeError('Échec : ' + name + '. Le site actif est conservé.')
    print('RÉUSSI : ' + name, flush=True)


def validate():
    candidate_is_inactive()
    state = json.loads(STATE.read_text())
    require(state['candidate'] == str(CANDIDATE) and state['snapshot'] == SNAPSHOT, 'État candidat inattendu')
    state['validated'] = False
    STATE.write_text(json.dumps(state, indent=2) + '\n')
    require((CANDIDATE / '.git').is_file(), 'Worktree candidat absent')
    for name in ('.env', '.env.local', '.env.production', '.env.production.local'):
        require(not os.path.lexists(CANDIDATE / name), 'Fichier environnement présent dans le candidat : arrêt')
    require(not (CANDIDATE / 'data').is_symlink(), 'Données partagées : arrêt avant tests isolés')
    for name, args in (
        ('install', ['ci', '--include=dev']), ('plans', ['run', 'models:gloire-plans']),
        ('lint', ['run', 'lint']), ('types', ['run', 'typecheck']),
        ('tests', ['test']), ('audit', ['audit', '--omit=dev', '--audit-level=high']),
        ('build', ['run', 'build']),
    ):
        check_command(name, ['/usr/bin/npm', *args])
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 3100))
    logfile = ROOTSTATE / 'seo-server.log'
    with logfile.open('w') as output:
        server = subprocess.Popen(['/usr/sbin/runuser', '-u', 'imf', '--', '/usr/bin/node', '--dns-result-order=ipv4first',
                                   str(CANDIDATE / 'node_modules/next/dist/bin/next'),
                                   'start', '--hostname', 'localhost', '--port', '3100'],
                                  cwd=CANDIDATE, env=clean_environment(), stdout=output,
                                  stderr=subprocess.STDOUT, start_new_session=True)
        try:
            deadline = time.monotonic() + 60
            while True:
                require(server.poll() is None, 'Serveur de test arrêté : voir ' + str(logfile))
                try:
                    with urllib.request.urlopen('http://127.0.0.1:3100/robots.txt', timeout=2) as response:
                        if response.status == 200:
                            break
                except OSError:
                    pass
                require(time.monotonic() < deadline, 'Serveur de test non prêt')
                time.sleep(0.3)
            check_command('http', ['/usr/bin/node', 'scripts/verify-search-http.cjs', 'http://127.0.0.1:3100'])
            check_command('jsonld-http', ['/usr/bin/node', 'scripts/test-jsonld.cjs', 'http://127.0.0.1:3100'])
            for name in ('decision-prix-2025-03-03', 'liste-projets-2025-12-18'):
                source = CANDIDATE / ('source-assets/documents/diar-al-yassamine/' + name + '.pdf')
                with urllib.request.urlopen('http://127.0.0.1:3100/documents/diar-al-yassamine/' + name + '.web.pdf', timeout=30) as response:
                    require(response.read() == source.read_bytes(), 'PDF complet non préservé : ' + name)
            plans = ['models/la-gloire/floor-plans.json'] + [
                'models/la-gloire/floor-' + str(floor) + '.webp' for floor in range(6)]
            for plan in plans:
                with urllib.request.urlopen('http://127.0.0.1:3100/' + plan, timeout=20) as response:
                    require(response.read() == (CANDIDATE / 'public' / plan).read_bytes(),
                            'Plan servi différent : ' + plan)
            photo = 'media/marassim/facade-client-20261027.webp'
            with urllib.request.urlopen('http://127.0.0.1:3100/' + photo, timeout=20) as response:
                require(response.read() == (CANDIDATE / 'public' / photo).read_bytes(), 'Photo Marassim différente')
        finally:
            stop_process(server)
    state['validated'] = True
    state['build_id'] = (CANDIDATE / '.next-seo/BUILD_ID').read_text().strip()
    STATE.write_text(json.dumps(state, indent=2) + '\n')
    print('\nCANDIDAT_VALIDE=' + str(CANDIDATE), flush=True)
    print('Tests HTTP, PDF complets, plans des six étages et photo Marassim validés.', flush=True)
    print('Serveur de test arrêté. Service public sur 3001 inchangé. Aucune bascule effectuée.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Reprendre uniquement les contrôles du candidat préparé')
    options = parser.parse_args()
    require(os.geteuid() == 0, 'Exécuter avec sudo python3')
    def interrupted(_number, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGHUP, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    os.umask(0o077)
    require(not ROOTSTATE.is_symlink(), 'Répertoire de contrôle invalide')
    ROOTSTATE.mkdir(mode=0o700, exist_ok=True)
    require(ROOTSTATE.stat().st_uid == 0 and not ROOTSTATE.stat().st_mode & 0o077,
            'Répertoire de contrôle non privé')
    with open('/run/lock/imf-contact-deploy.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Un autre déploiement utilise déjà le verrou')
        if not options.check:
            prepare()
        validate()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nInterrompu : le site public reste sur sa version actuelle.', file=sys.stderr)
        sys.exit(130)
    except (RuntimeError, subprocess.SubprocessError, OSError, ValueError, KeyError) as error:
        print('\nARRÊT : ' + str(error), file=sys.stderr)
        print('Aucune commande de bascule ou de redémarrage du service public n’a été lancée.', file=sys.stderr)
        sys.exit(1)
