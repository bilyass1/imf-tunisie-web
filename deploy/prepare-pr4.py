#!/usr/bin/python3
"""Prepare an immutable release against the real checkout without changing its index."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import shutil
import stat
import subprocess
import tempfile

COMPATIBLE_REFS = (
    '428fd036bbeea9964b6eb4b71ece721686c07169',  # previous reviewed VPS integration
    'c28cb584f28379c2aa14955030401abaf6ab6aae',  # updated PR4: overview plans and PDFs
    '8db48edc87e70071d1057c70742368fc30095c48',  # deployed apartment dropdown
    '9e55d2b8b1a278efa23864e6c08a82f54747e038',  # deployed footer
    'a2ed78e1c27494edc77840cfef529a4fcfd3cff0',  # requested PR4
)


def digest(data):
    return hashlib.sha256(data).hexdigest() if data is not None else None


def git(app, *args, check=True):
    result = subprocess.run(['/usr/sbin/runuser', '-u', 'imf', '--', '/usr/bin/git', '-C', str(app), *args],
                            capture_output=True, timeout=60)
    if check and result.returncode:
        raise RuntimeError('Lecture Git non confirmée.')
    return result


def safe_path(app, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts:
        raise RuntimeError('Chemin de mise à jour invalide.')
    path = app
    for part in relative.parts:
        path = path / part
        if path.is_symlink():
            raise RuntimeError('Lien symbolique non accepté : ' + name)
    if path.exists() and not path.is_file():
        raise RuntimeError('Fichier attendu : ' + name)
    return path


def atomic(app, name, data, uid, gid, mode):
    target = safe_path(app, name)
    missing = []
    parent = target.parent
    while not parent.exists():
        missing.append(parent); parent = parent.parent
    for directory in reversed(missing):
        directory.mkdir(); directory.chmod(0o755); os.chown(directory, uid, gid)
    fd, temporary = tempfile.mkstemp(prefix='.imf-release-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data); stream.flush(); os.fsync(stream.fileno())
            os.fchown(stream.fileno(), uid, gid); os.fchmod(stream.fileno(), mode)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def prepare(app, workspace, base, revision):
    identity = pwd.getpwnam('imf')
    names = git(app, 'diff', '--name-only', '-z', base, revision).stdout.decode().split('\0')
    rows = []
    for name in filter(None, names):
        if name.startswith('deploy/'):
            continue
        if name != 'package.json' and not name.startswith(('src/', 'scripts/', 'public/', 'source-assets/documents/')):
            raise RuntimeError('Modification non prévue : ' + name)
        target = safe_path(app, name)
        incoming_result = git(app, 'show', revision + ':' + name, check=False)
        if incoming_result.returncode:
            raise RuntimeError('Suppression non prévue : ' + name)
        incoming = incoming_result.stdout
        previous = git(app, 'show', base + ':' + name, check=False)
        original = target.read_bytes() if target.exists() else None
        baseline = previous.stdout if previous.returncode == 0 else None
        if original == incoming:
            continue
        if original == baseline:
            merged = incoming
        elif name == 'src/lib/public-assets.json' and original is not None:
            current, added = json.loads(original), json.loads(incoming)
            if not all(isinstance(items, list) and all(isinstance(p, str) for p in items) for items in (current, added)):
                raise RuntimeError('Catalogue public à vérifier.')
            merged = (json.dumps(sorted(set(current) | set(added)), ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        elif baseline is not None and original is not None and b'\0' not in original + baseline + incoming:
            with tempfile.TemporaryDirectory(dir=workspace) as directory:
                directory = Path(directory)
                for label, data in [('current', original), ('base', baseline), ('incoming', incoming)]:
                    (directory / label).write_bytes(data)
                result = subprocess.run(['/usr/bin/git', 'merge-file', '-p', str(directory/'current'), str(directory/'base'), str(directory/'incoming')], capture_output=True, timeout=30)
            if result.returncode:
                # Only exact files from the reviewed component releases can be
                # replaced by their already-integrated equivalent. Unknown local
                # edits still stop the operation before touching the application.
                reviewed = False
                for ref in COMPATIBLE_REFS:
                    variant = git(app, 'show', ref + ':' + name, check=False)
                    if variant.returncode == 0 and original == variant.stdout:
                        reviewed = True; break
                if reviewed:
                    merged = incoming
                else:
                    conflict = workspace / 'conflicts' / name
                    conflict.parent.mkdir(parents=True, exist_ok=True); conflict.write_bytes(result.stdout)
                    raise RuntimeError('CONFLIT_LOCAL : ' + name + ' ; aucun fichier applicatif modifié.')
            else:
                merged = result.stdout
        else:
            raise RuntimeError('Fichier local différent à vérifier : ' + name)
        if name == 'package.json' and original is not None:
            before, after = json.loads(original), json.loads(merged)
            if any(before.get(key) != after.get(key) for key in ('dependencies', 'devDependencies', 'overrides')):
                raise RuntimeError('Les dépendances installées diffèrent ; arrêt avant modification.')
        details = target.stat() if target.exists() else None
        row = {'path': name, 'old': digest(original), 'new': digest(merged),
               'uid': details.st_uid if details else identity.pw_uid,
               'gid': details.st_gid if details else identity.pw_gid,
               'mode': stat.S_IMODE(details.st_mode) if details else 0o644}
        future = workspace / 'future' / name
        future.parent.mkdir(parents=True, exist_ok=True); future.write_bytes(merged)
        if original is not None:
            saved = workspace / 'original' / name
            saved.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(target, saved)
        rows.append(row)
    (workspace/'plan.json').write_text(json.dumps(rows, indent=2))
    print('PLAN_OK — ' + str(len(rows)) + ' fichiers préparés, index et modifications locales conservés.', flush=True)


def apply(app, workspace):
    rows = json.loads((workspace/'plan.json').read_text())
    for row in rows:
        path = safe_path(app, row['path'])
        if digest(path.read_bytes() if path.exists() else None) != row['old']:
            raise RuntimeError('Modification simultanée : ' + row['path'])
        if digest((workspace/'future'/row['path']).read_bytes()) != row['new']:
            raise RuntimeError('Préparation modifiée : ' + row['path'])
    for row in rows:
        atomic(app, row['path'], (workspace/'future'/row['path']).read_bytes(), row['uid'], row['gid'], row['mode'])


def restore(app, workspace):
    for row in json.loads((workspace/'plan.json').read_text()):
        if row['old'] is None:
            safe_path(app, row['path']).unlink(missing_ok=True)
        else:
            atomic(app, row['path'], (workspace/'original'/row['path']).read_bytes(), row['uid'], row['gid'], row['mode'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=('prepare', 'apply', 'restore'))
    parser.add_argument('--app', type=Path, required=True)
    parser.add_argument('--workspace', type=Path, required=True)
    parser.add_argument('--base'); parser.add_argument('--revision')
    args = parser.parse_args()
    if os.geteuid() != 0 or args.app.is_symlink(): raise RuntimeError('Console root et répertoire réel requis.')
    if args.phase == 'prepare':
        if not all(re.fullmatch('[0-9a-f]{40}', value or '') for value in (args.base, args.revision)):
            raise RuntimeError('Révisions immuables requises.')
        prepare(args.app, args.workspace, args.base, args.revision)
    elif args.phase == 'apply': apply(args.app, args.workspace)
    else: restore(args.app, args.workspace)


if __name__ == '__main__':
    try: main()
    except Exception as error:
        raise SystemExit('PRÉPARATION INTERROMPUE : ' + str(error))
