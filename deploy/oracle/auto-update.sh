#!/usr/bin/env bash
set -euo pipefail
exec 9>/run/lock/danto-update.lock
flock -n 9 || exit 0
state=/var/lib/danto-deploy
repo=ImasraI/Pico-Monitoring_Cloudflare
mkdir -p "$state"
sha=$(curl --fail --silent --show-error --retry 2 "https://api.github.com/repos/$repo/commits/main" | /usr/bin/node -e 'let s="";for await(const c of process.stdin)s+=c;const j=JSON.parse(s);if(!/^[a-f0-9]{40}$/.test(j.sha))process.exit(1);console.log(j.sha)')
if [[ -f "$state/current-commit" && $(cat "$state/current-commit") == "$sha" ]]; then exit 0; fi
echo "Building Oracle backend at $sha"
work=$(mktemp -d /var/tmp/danto-build.XXXXXX)
trap 'rm -rf -- "$work"' EXIT
curl --fail --silent --show-error --retry 2 "https://codeload.github.com/$repo/tar.gz/$sha" -o "$work/source.tar.gz"
mkdir "$work/source"
tar -xzf "$work/source.tar.gz" -C "$work/source" --strip-components=1
mkdir -p "$work/source/node_modules/typescript"
curl --fail --silent --show-error --retry 2 https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz -o "$work/typescript.tar.gz"
tar -xzf "$work/typescript.tar.gz" -C "$work/source/node_modules/typescript" --strip-components=1
chown -R ubuntu:ubuntu "$work"
runuser -u ubuntu -- bash -c 'cd "$1"; node scripts/build-oracle.mjs; for f in dist/oracle/*.mjs; do node --check "$f"; done' bash "$work/source"
# Test migrations and module imports against an empty, disposable database.
runuser -u ubuntu -- env DATA_DIR="$work/test-data" LOCAL_TEST=1 node "$work/source/dist/oracle/server.mjs" --migrate-only
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$state/backup-$stamp"
mkdir -m 700 "$backup"
cp -a /opt/danto "$backup/code"
was_running=false
systemctl is-active --quiet danto && was_running=true
systemctl stop danto
recover() {
  echo 'Deployment failed; restoring previous code. Database backup retained for manual recovery.' >&2
  cp -a "$backup/code/." /opt/danto/
  if $was_running; then systemctl restart danto; fi
}
trap 'recover; rm -rf -- "$work"' ERR
# Service is stopped, so SQLite WAL and database are captured consistently.
cp -a /var/lib/danto "$backup/data"
cp -a "$work/source/dist/oracle/." /opt/danto/
chown -R root:root /opt/danto
find /opt/danto -type d -exec chmod 755 {} +
find /opt/danto -type f -exec chmod 644 {} +
systemctl start danto
healthy=false
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:3000/healthz >/dev/null; then healthy=true; break; fi
  sleep 1
done
$healthy
printf '%s\n' "$sha" > "$state/current-commit"
trap - ERR
echo "Deployed $sha; backup: $backup"
