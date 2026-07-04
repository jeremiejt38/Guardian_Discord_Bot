# E2E Manual Checklist

Prerequisites:
- A staging Discord server where the bot can be installed.
- A bot token with permissions: Manage Channels, Manage Roles, Send Messages, Connect/Speak in Voice.
- Ensure `guardian/.env` or environment variables set in CI with `DISCORD_TOKEN` and `STAGING_GUILD_ID`.

Steps:
1. Install the staging bot and give it admin-like permissions.
2. Start the bot with the staging env (or run `node guardian/e2e/run-e2e.js`).
3. Verify the `setup` category and channels are created.
4. Verify seeded messages in `welcome`, `game-updates`, `suggestions`, `serveurs` channels.
5. Trigger the Create-Channel flow (click the button) and verify a temporary voice channel is created.
6. Check that temporary voice channels are deleted when empty.
7. Add a server (via modal/command) and verify it appears in the server list and requires approval.
8. Approve the server and verify it becomes visible to members.
9. Invite a test user and verify onboarding channels/messages are created and permissions applied.
10. Clean up test data (delete test channels/servers) if desired.

Notes:
- The automated `guardian/e2e/run-e2e.js` performs non-destructive checks but requires a valid token and guild id.
- Use separate staging credentials — never run E2E on production guilds.
