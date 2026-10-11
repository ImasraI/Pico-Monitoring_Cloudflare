# Pico Monitoring repository workflow

When publishing completed project changes, push the same resulting branch to both repositories:

- `github`: https://github.com/PM-2006/Pico-Monitoring.git
- `colleague`: https://github.com/ImasraI/Pico-Monitoring_Cloudflare.git

Fetch both repositories before publishing. Preserve changes from both histories, resolve any conflicts, and verify the merged result. Use normal pushes; never overwrite either repository with a force push. Report a permission or synchronization failure clearly if either push cannot finish.
