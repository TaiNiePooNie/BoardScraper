# Instructions for AI agents working on this repo

## Art requests: the CHATGPT_CALL / CHATGPT_RESPONSE handshake

BoardBuddy's UI art is made by ChatGPT/Codex; the code is written by Claude. They talk through files in the **repository root**:

| File | Written by | Meaning |
|---|---|---|
| `CHATGPT_CALL_<topic>.md` | Claude | **Open request.** ChatGPT/Codex: do this now. |
| `CHATGPT_RESPONSE_<topic>.md` | ChatGPT/Codex | **Done.** Same file, renamed, with a report appended. Claude picks it up from here. |

### ChatGPT / Codex: what to do when a `CHATGPT_CALL_*.md` file exists on `main`

1. Read the call file completely, plus the **Style Bible** in `ui-art-requests.md` (palette, sticker treatment, mascot "Buddy"). Every asset must match it.
2. Generate every asset exactly as specified (filenames, formats, dimensions, transparency, size limits). Save into `/public/assets/`.
3. Add each new file to `/public/assets/manifest.json`.
4. Rename the call file from `CHATGPT_CALL_<topic>.md` to `CHATGPT_RESPONSE_<topic>.md` (same `<topic>`) and append a `## Response` section listing every file delivered (name, size, dimensions) and anything you couldn't do exactly as asked.
5. Commit on a new branch `art/<topic>`, open a pull request, and **merge it into `main` yourself without waiting for a human review**. Don't modify code outside `/public/assets/` and the call/response file.
6. Originality rules from `ui-art-requests.md` always apply: no copying existing games, brands, logos or real people.

### Claude: when new images are needed

Never ask the user to produce art. Write a new `CHATGPT_CALL_<topic>.md` (format: `### Asset Required:` blocks as in `ui-art-requests.md`), merge it to `main`, ship code that falls back gracefully until the art exists, then check `main` periodically for `CHATGPT_RESPONSE_<topic>.md` and integrate the delivered files.
