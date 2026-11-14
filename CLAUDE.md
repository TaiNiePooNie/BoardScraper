# BoardBuddy (repo: BoardScraper)

See README.md for the stack, layout and env vars.

## Art workflow (always)

When the UI needs new images, follow the CHATGPT_CALL / CHATGPT_RESPONSE handshake in **AGENTS.md**:
write `CHATGPT_CALL_<topic>.md` in the repo root (asset specs in the `### Asset Required:` format, referencing the
Style Bible in `ui-art-requests.md`), merge it to `main`, make the code fall back gracefully until the art lands,
then poll `main` for `CHATGPT_RESPONSE_<topic>.md` and integrate the files. ChatGPT/Codex merges its own art PRs.

## Working with the owner

- The owner works from a phone: give step-by-step instructions for any setup outside the repo (Vercel, Google, Resend…).
- Open a PR for every change and merge it after CI passes, unless told otherwise.
