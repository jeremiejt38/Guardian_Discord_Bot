# Security Policy

## Supported versions

Only the latest release of Guardian Free is actively maintained and receives
security fixes.

| Version | Supported |
|---------|-----------|
| Latest  | ✅ Yes    |
| Older   | ❌ No     |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, report it privately:

1. Go to the **Security** tab of this repository
2. Click **"Report a vulnerability"** (GitHub Private Vulnerability Reporting)
3. Describe the vulnerability, steps to reproduce, and potential impact

You can expect:
- **Acknowledgement** within 72 hours
- **Status update** within 7 days
- **Fix** in the next release if confirmed, with credit to the reporter
  (unless you prefer to remain anonymous)

## Scope

The following are considered in-scope vulnerabilities:

- Authentication or authorization bypass
- Remote code execution
- Data exposure (Discord tokens, user data, database contents)
- Privilege escalation within the bot

The following are **out of scope**:

- Issues requiring physical access to the host machine
- Issues in Discord's own API or platform
- Rate limiting or spam from Discord users (by design, handled by Guardian's
  anti-spam module)

## Responsible disclosure

We follow a **90-day responsible disclosure policy**. If a fix is not
available within 90 days of a confirmed report, you are free to disclose
the vulnerability publicly.

## Security best practices for self-hosters

- Never commit your `.env` file to a public repository
- Keep `DISCORD_TOKEN` and `DATABASE_PATH` private
- Run the bot with a least-privilege system user (no root)
- Keep Node.js and dependencies up to date (`npm audit`)
