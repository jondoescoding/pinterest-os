# Security Policy

## Supported Version

Security fixes are applied to the latest commit on the default branch. Older
commits and forks are not maintained by this project.

## Report a Vulnerability

Do not open a public issue for a suspected vulnerability.

1. Open a [private security advisory](https://github.com/jondoescoding/pinterest-os/security/advisories/new).
2. Describe the affected route, commit, and deployment model.
3. Include reproduction steps with all credentials and personal data removed.
4. State the likely impact and whether exploitation has been observed.

Expect an acknowledgement within five business days. A fix timeline depends on
severity and reproducibility. Public disclosure should wait until a fix or
mitigation is available.

## Credential Exposure

If a credential may have been exposed, revoke or rotate it immediately. Removing
the value from Git does not make the old credential safe because it can remain
in commit history, forks, logs, and caches.

Never send Postiz, fal, Turso, Telegram, Channel3, cleaner, or
Pinterest OS credentials in an issue, pull request, screenshot, or test fixture.

## Deployment Boundary

Pinterest OS is designed for one trusted operator or team. Every production
deployment must configure browser or machine authentication and use HTTPS.
Provider credentials must remain server-side. See the
[deployment security guide](docs/security.md).
