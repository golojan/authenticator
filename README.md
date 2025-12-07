# @golojan/oath

Light-weight OAuth helper that sends authorization requests to the Golojan Auth Service and returns the `TokenRequestDto` payload expected by the token endpoint. Instantiate the `Authenticator` class with your client credentials and call `authorise()` (or `authorize()`) to let the platform validate your client, secret, and registered application metadata.

## Build

```bash
npm run build -w apps/oath
```

## Usage

```ts
import { Authenticator } from "@golojan/oath"

async function requestAuthorisation() {
  const authenticator = new Authenticator({
    clientId: "photos-app",
    clientSecret: "super-secret-value",
    options: {
      redirectUri: "https://photos.golojan.com/auth/callback",
      scope: ["openid", "profile", "email"],
    },
  })

  const tokenRequest = await authenticator.authorise()

  console.log("Token request payload:", tokenRequest)
}
```

The returned object is a direct `TokenRequestDto` from the Auth Service. Persist or forward it to your token exchange logic as required by your application.

## API

```ts
type AuthenticatorOptions = {
  redirectUri: string
  scope?: string | string[]
  state?: string
  nonce?: string
  userId?: number
  extraParams?: Record<string, unknown>
}

type AuthenticatorConfig = {
  clientId: string
  clientSecret: string
  options?: AuthenticatorOptions
}

type AuthoriseOverrides = Partial<AuthenticatorOptions>

type TokenRequestDto = {
  grantType: "authorization_code" | "refresh_token"
  code?: string
  clientId?: string
  redirectUri?: string
  refreshToken?: string
}

class Authenticator {
  constructor(config: AuthenticatorConfig)
  authorise(overrides?: AuthoriseOverrides): Promise<TokenRequestDto>
  authorize(overrides?: AuthoriseOverrides): Promise<TokenRequestDto>
}
```

| Option        | Description                                                  | Default                                |
| ------------- | ------------------------------------------------------------ | -------------------------------------- |
| `redirectUri` | Registered redirect URI (required)                           | —                                      |
| `scope`       | Requested scopes (`string` or `string[]`)                    | `"openid profile email"`               |
                                   |

> **Note:** Provide a `redirectUri` either when constructing the `Authenticator` or via the overrides passed to `authorise()`/`authorize()`.

The method resolves with the `TokenRequestDto` returned by the Auth Service when the request succeeds.

