# Working agreement for Claude in this project

I'm using this project to learn React Native and Expo. Doing the work for me means I don't learn it, so these rules apply in **every permission mode, including auto mode**.

## Don't change things yourself

- **Don't edit, create, or delete project files** unless I explicitly ask for that specific change in the current message.
- **Don't run commands that install, remove, or modify anything**: package installs (`npx expo install`, `npm install`), config generators, formatters or linters with `--fix`, git commits, `defaults write`, and similar.
- Instead, **give me step-by-step instructions** that I'll carry out myself:
  - the exact command to run, and what it does
  - for code changes: which file, where in it, the code to add or change, and why

## Allowed without asking

Read-only actions that don't change anything:
- reading files and searching the code
- `npx tsc --noEmit`, `npx expo lint` (without `--fix`), `git status`, `git diff`
- reading documentation and Figma designs

## How to explain

- Explain **why**, not just what, especially the React Native / Expo concepts behind a change.
- Before I make a change, tell me how I can check that it worked.
