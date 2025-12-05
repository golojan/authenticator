# @golojan/oath

Light-weight OAuth helper that produces ready-to-use authorization URLs (including PKCE parameters) for the Golojan account service. The package exposes a single `Authenticator` function that accepts your client credentials and returns the URL your users should visit to start the login flow.

## Build

```bash
npm run build -w apps/oath
```

## Usage

```ts
import { Authenticator } from "@golojan/oath"

async function createLoginUrl() {
  const response = await Authenticator({
    clientId: "photos-app",
    clientSecret: "super-secret-value",
    options: {
      redirectUri: "https://photos.golojan.com/auth/callback",
      scope: ["openid", "profile", "email"],
      extraParams: {
        prompt: "consent",
      },
    },
  })

  if (response.success) {
    console.log("Send user to:", response.uri)
    console.log("Persist code_verifier:", response.codeVerifier)
  }
}
```

The generated URI matches the expected Golojan OAuth pattern:

```
https://accounts.golojan.com/oauth2/authorize?
  client_id=photos-app&
  redirect_uri=https%3A%2F%2Fphotos.golojan.com%2Fauth%2Fcallback&
  response_type=code&
  scope=openid%20profile%20email&
  state=<random_csrf_token>&
  code_challenge=<pkce_challenge>&
  code_challenge_method=S256
```

Persist the returned `codeVerifier` securely—you will need it during the token exchange step.

## API

```ts
type AuthenticatorOptions = {
  redirectUri: string
  scope?: string | string[]
  responseType?: string
  state?: string
  authUrl?: string
  extraParams?: Record<string, string | number | boolean | null | undefined>
}

type AuthenticatorConfig = {
  clientId: string
  clientSecret: string
  options: AuthenticatorOptions
}

type AuthenticatorResponse = {
  uri: string
  success: boolean
  state: string
  issuedAt: string
  codeVerifier: string
  codeChallenge: string
  params: Record<string, string>
}
```

| Option        | Description                                                  | Default                                |
| ------------- | ------------------------------------------------------------ | -------------------------------------- |
| `redirectUri` | Registered redirect URI (required)                           | —                                      |
| `scope`       | Requested scopes (`string` or `string[]`)                    | `"openid profile email"`               |
| `responseType`| OAuth response type                                         | `"code"`                               |
| `state`       | Optional CSRF token (random value generated when omitted)    | random 24-byte string                  |
| `authUrl`     | Authorization endpoint                                      | `https://accounts.golojan.com/oauth2/authorize` |
| `extraParams` | Additional key/value query parameters                        | —                                      |

The response always sets `success` to `true` when the URI is generated successfully and includes the PKCE verifier/challenge pair alongside the computed query parameters.
