# Oracle backend deployment

The frontend remains on Cloudflare Workers. Setting BACKEND_ORIGIN enables the server-side /api proxy; browsers keep using the same website and cookies. Without that variable the existing Cloudflare backend stays active. An Oracle failure returns 502 instead of silently writing to the old database.

## Current VM

- VM: pico-monitoring-backend, Always Free E2.1.Micro, Stockholm.
- Ubuntu 24.04 x64, 1 GB RAM, 50 GB boot disk, 1 GB swap.
- API: https://api.picomonitoring.ir; public IP 158.179.205.161 (ephemeral).
- SSH user: ubuntu. Private key is on the owner's PC at C:\Users\Arsam\.ssh\pico_oracle_20261015. Never commit it.
- Node 24 installed in /opt/node24, linked as /usr/bin/node.
- Service: danto, code /opt/danto, private data /var/lib/danto.
- Secrets: /etc/danto.env, root-only. Caddy provides automatic HTTPS.
- No existing Cloudflare patient data was copied. Existing D1 data is retained separately.

## Enable connection after verification

In Cloudflare pico-monitoring > Settings > Runtime variables and secrets, add PROXY_SECRET as a production secret matching /etc/danto.env. Add BACKEND_ORIGIN=https://api.picomonitoring.ir. The secret must stay in server settings; never add it to public frontend variables or Git. Deploy the updated Worker. Existing sessions will require signing in again against the fresh database.

Before enabling, test healthz returns 200 and /api without the secret returns 403. Test owner sign-in and a synthetic doctor/patient workflow before collecting real data.

Rollback: remove BACKEND_ORIGIN and redeploy. This restores the old D1 backend, not any data subsequently added to Oracle. Keep the two stores separate and reconcile data before switching back after real use.

## Update backend from Windows

Build locally with `node scripts/build-oracle.mjs`. Upload only dist/oracle, never a development database. Copy its files to /opt/danto, set root ownership and directories 755/files 644, then restart `sudo systemctl restart danto`. The service applies pending migrations transactionally. Back up /var/lib/danto before schema changes.

Use Windows OpenSSH at C:\Windows\System32\OpenSSH\ssh.exe and scp.exe if they are not in PATH. Connection: ssh -i C:\Users\Arsam\.ssh\pico_oracle_20261015 ubuntu@158.179.205.161.

Check `sudo systemctl status danto`, `sudo journalctl -u danto -n 50 --no-pager`, and `curl https://api.picomonitoring.ir/healthz`.

Git pushes rebuild Cloudflare through its existing Git integration. Oracle now checks the fork main branch automatically as described below. If the ephemeral IP changes, update the api A record.

## Limits and recovery

This setup uses the Always Free Micro shape and 50 GB of the account's shared 200 GB storage allowance. Do not upgrade the shape or allocate paid resources. Oracle may reclaim idle free instances. Keep encrypted backups of the database and uploaded files outside the VM; a same-disk copy does not protect against instance/volume loss. Never expose port 3000, database files, or /etc/danto.env publicly.
## Automatic Git updates (installed November 2026)

The VM checks public `ImasraI/Pico-Monitoring_Cloudflare` branch `main` every five minutes using `danto-update.timer`. No GitHub SSH secret or paid CI service is required. A push to the upstream repository alone does not update this fork: merge upstream changes into this fork's main branch first.

The root-owned `/usr/local/sbin/danto-auto-update` downloads a specific commit, builds as the unprivileged ubuntu account with TypeScript 5.9.3, checks JavaScript syntax, and tests migrations on a disposable database. It stops the backend briefly, backs up code and private data under `/var/lib/danto-deploy/backup-*`, installs the build, starts the service, and checks loopback health. Build failures leave the running version untouched. After an activation failure it attempts to restore the old code; database migrations are NOT automatically reversed. Backups are on the same VM disk and need monitoring/periodic retention management; they do not protect against VM loss.

Commands over SSH:

```sh
sudo systemctl list-timers danto-update.timer
sudo journalctl -u danto-update.service -n 60 --no-pager
sudo cat /var/lib/danto-deploy/current-commit
sudo systemctl start danto-update.service  # check immediately
sudo systemctl disable --now danto-update.timer  # pause automatic updates
sudo systemctl enable --now danto-update.timer  # resume
```

Cloudflare continues to deploy the frontend through its existing Git integration. The two deployments are independent, so changes must remain compatible while they roll out. Protect main and review who can push: its backend code will execute on the VM. Changes to the updater/unit files require reinstalling those files on the VM; application updates are automatic. If the repository becomes private, configure read-only repository authentication before expecting polling to continue.
