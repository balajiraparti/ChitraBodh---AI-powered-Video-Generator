# Feature tracking

Read PROJECT_STATUS.md before starting feature work. Build the selected slice against its finish condition. With each feature change, update its status, evidence, checks, remaining gaps and next step in PROJECT_STATUS.md in the same change. Keep historical prototype notes as supporting evidence.

## GitHub checkpoints

After each completed implementation step, feature, or milestone, review the diff, run the relevant checks, and update PROJECT_STATUS.md with progress and remaining gaps. Stage only the intended files, keeping secrets and local artifacts out of Git. Create a descriptive commit and push the current working branch to origin. Verify the remote branch tip and include the branch and short commit ID in the handoff. If a push is blocked, tell the user what remains local and what is needed to sync it. Check for outstanding unpushed commits when resuming work.
