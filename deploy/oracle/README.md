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

## Automatic backend updates

Verified on 2026-11-01: this VM has `danto-update.timer`, which runs `/usr/local/sbin/danto-auto-update` through `danto-update.service` about five minutes after the preceding update finishes (with timer scheduling tolerance). It received the patient portal release and restarted `danto` successfully. A Git push can therefore take several minutes to reach Oracle. Verify the running API after each release instead of treating Cloudflare completion as backend completion.

Use `systemctl status danto-update.timer`, `systemctl show danto-update.service -p Result -p ExecMainStatus`, and the release health/capability endpoints to confirm delivery. Do not upload a second manual release while that updater is running.

## Manual fallback from Windows

Build locally with `node scripts/build-oracle.mjs`. Upload only dist/oracle, never a development database. Copy its files to /opt/danto, set root ownership and directories 755/files 644, then restart `sudo systemctl restart danto`. The service applies pending migrations transactionally. Back up /var/lib/danto before schema changes.

Use Windows OpenSSH at C:\Windows\System32\OpenSSH\ssh.exe and scp.exe if they are not in PATH. Connection: ssh -i C:\Users\Arsam\.ssh\pico_oracle_20261015 ubuntu@158.179.205.161.

Check `sudo systemctl status danto`, `sudo journalctl -u danto -n 50 --no-pager`, and `curl https://api.picomonitoring.ir/healthz`.

Git pushes rebuild Cloudflare through its existing Git integration. Oracle has the separate timer described above; check its result and the API version after pushes. Use the manual fallback only when automatic delivery is unavailable. If the ephemeral IP changes, update the api A record.

## Limits and recovery

This setup uses the Always Free Micro shape and 50 GB of the account's shared 200 GB storage allowance. Do not upgrade the shape or allocate paid resources. Oracle may reclaim idle free instances. Keep encrypted backups of the database and uploaded files outside the VM; a same-disk copy does not protect against instance/volume loss. Never expose port 3000, database files, or /etc/danto.env publicly.