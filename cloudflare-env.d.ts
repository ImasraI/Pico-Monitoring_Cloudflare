declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DANTO_ADMIN_SETUP_KEY?: string;
  }
}
