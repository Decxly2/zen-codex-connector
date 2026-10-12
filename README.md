# Zen Codex Connector

A personal Firefox/Zen extension and local MCP bridge for Codex. Version0.3.1.

## Setup

Install the Mozilla-signed extension when available. Run `npm run setup` with Node.js22 or newer to generate your own random local key. Enter the token from `connection.json` only in extension Preferences. Register `node /absolute/path/server.mjs` as the `zen` stdio MCP server in your MCP client. Do not run multiple bridges on port19387.

All ordinary HTTP(S) tabs are available automatically. Private windows, local files and browser pages are excluded; protected sites may reject script injection. Click the toolbar button to pause/resume access globally; the choice persists across restarts.

## Security

The bridge binds only127.0.0.1 and requires a random256-bit bearer key. Origin and Host checks reject website-origin and DNS-rebinding requests. Background networking is restricted to the local bridge and redirects are rejected. No analytics, remote code, cookie/history/password-manager APIs, or external message listeners. Requested page content can enter your AI conversation. Full-tab access does not authorize external actions or page instructions. This software cannot protect a computer already compromised by malware.

Never commit `connection.json`, keys, browser-profile data, or a personalized legacy extension. The repository contains no personal key; each user must generate their own. `.gitignore` protects generated configuration, but review files before publishing.

## Tools and checks

`zen_status`, `zen_tabs`, `zen_read`, `zen_navigate`, `zen_click`, `zen_fill`. Read before acting and use the observation token. Password/file/hidden field filling is blocked.

Run `npm test` after setup. Tests cover authentication, Host/Origin rejection, automatic/private-tab boundaries, pause state, observations and network restrictions. Mozilla signing and validation are not a security guarantee.

The extension source is in `extension/`. No build step, external code dependencies or bundled credentials. Do not disable Firefox signature verification. Permanent installation requires a signed XPI.
