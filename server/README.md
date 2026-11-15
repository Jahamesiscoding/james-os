# JAMES OS local integrations

This starter integration server runs on `127.0.0.1` for one local user. OAuth secrets and provider tokens stay on the server. Google is requested read-only calendar access; Canvas is requested read-only access to courses, course assignments, and missing submissions. The browser receives only normalized events, tasks, and connection status.

## Start the app

1. Copy `.env.example` to `.env`.
2. Generate a session secret and a 32-byte encryption key, then put both in `.env`:

   ```sh
   openssl rand -hex 32
   openssl rand -base64 32
   ```

   Use the first output for `APP_SESSION_SECRET` and the second for `TOKEN_ENCRYPTION_KEY`.
3. Register the exact callback URLs shown in `.env.example` with each provider, then fill in the client IDs and secrets.
4. Start `npm run server` in one terminal and `npm run dev` in another. Open the Vite address and connect Google Calendar and Canvas from the sidebar. Keep `APP_BASE_URL` and `FRONTEND_URL` aligned with those local addresses.

## Provider setup

For Google, create an OAuth 2.0 Web application in Google Cloud, enable the Google Calendar API and Gmail API, and allow both local callback URIs. Calendar asks for `calendar.readonly`. School Gmail uses the separately consented `gmail.readonly` scope, searches recent messages from the configured school domain, and retrieves only message headers and snippets for the dashboard. That Gmail scope is classified as restricted by Google; a public app may need OAuth verification and a security assessment, and a school Workspace administrator may block unapproved apps. The reply signal is a keyword heuristic, so it is labeled “Possible reply” and should be checked in Gmail.

For Canvas, a Canvas administrator must issue/approve a developer key for Friends Seminary and register the local callback URI. The app asks only for the GET scopes used to list active courses, their assignments, and missing submissions. If the school does not allow student-created integrations, ask the Canvas administrator about an approved app; a manually copied Canvas token is not used.

## Data and security boundaries

- Provider tokens are AES-256-GCM encrypted in `.private/provider-tokens.enc`, with file permissions restricted to the local user. The encryption key stays in `.env`.
- Email message content is fetched for the dashboard but is not persisted by this server or sent to an AI provider. JAMES OS never sends email.
- OAuth state is checked on callback; session IDs are HttpOnly and SameSite cookies. Provider requests use bearer tokens in server-to-server headers. Credentials and tokens are never returned to React.
- The server refuses to bind to a public network interface. This is a single-user local development setup, not a deployable multi-user service.
- Before hosting JAMES OS publicly, add account authentication, per-user token storage in an encrypted managed database, HTTPS-only cookies, CSRF protection, secure secret management, deletion/revocation flows, and the providers' production OAuth review/approval. Do not expose this local integration server to the internet.
- Disconnecting/removing the encrypted token file does not delete or alter calendar or Canvas records. Google/Canvas grants can also be revoked in the provider account.
