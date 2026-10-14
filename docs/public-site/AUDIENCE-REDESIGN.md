# Audience pages

Routes: /orthodontists and /patients are preserved. /find-orthodontist is the public specialist directory. /clinics remains accessible through its old URL but is removed from audience navigation, footer and homepage links.

Authoritative Persian content: components/marketing/content/audiences.json, extracted without rewriting from the supplied brief. Typography, color and motion inherit the current website tokens. Page-specific layout: components/marketing/styles/audiences.css.

Replaceable generated concept artwork: public/assets/audiences/placeholder-connected-care.webp. The caption explicitly identifies it as an illustration, not an actual product or person photograph. Existing local conceptual product illustrations remain in use.

Directory data: components/marketing/content/specialists.json. It is deliberately empty until approved public records are supplied. No private doctor accounts, phone numbers or patient information are exposed. Add consented verified records with id, name, city, specialty, contactUrl and optional local image. City choices are derived automatically. Publish through the normal Git deployment. No extra database or service is required; a future approved directory API can replace this curated source if needed.
