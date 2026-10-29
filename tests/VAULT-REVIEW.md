# Vault review — 29 October 2026

The existing Render full-site-test branch now includes the current main-branch UI and branding plus the Vault review module. Production main is unchanged.

Features: profile photo crop/zoom/position, bio and visibility preferences, member-view preview, posts/photos, short video reels, expiring stories, reversible likes/follows, Following feed, own-content deletion, and existing static achievement totals. Social counts never change progress points.

Data is browser-local: text/preferences in localStorage, media in IndexedDB. This is not a shared-member backend or real authentication/privacy enforcement. Sample members are explicitly fictional. Browser storage can be cleared or evicted. Shared accounts, moderation and server-verified awards remain production work.

Validation: `node --test tests/vault-review.test.cjs` (8 checks). Browser checks passed for creating text posts/stories, likes, follows, Following feed, profile name/bio save, and phone-width layout. The browser file-chooser integration timed out, so photo crop/video playback end-to-end testing remains outstanding. File type and size rejection tests pass.
