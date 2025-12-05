import { createHash, createHmac, randomBytes } from "node:crypto"

const DEFAULT_AUTH_URL = "https://accounts.golojan.com/oauth2/authorize"
const DEFAULT_SCOPE = "openid profile email"
const DEFAULT_RESPONSE_TYPE = "code"
const CODE_CHALLENGE_METHOD = "S256"

export type AuthenticatorOptions = {
  /** OAuth redirect URI registered with the client */
  redirectUri: string
  /** Optional space or array separated scopes */
  scope?: string | string[]
  /** OAuth response type; defaults to `code` */
  responseType?: string
  /** Optional CSRF token; generated when omitted */
  state?: string
  /** Authorization endpoint; defaults to the Golojan accounts endpoint */
  authUrl?: string
  /** Additional query parameters to append to the authorize URL */
  extraParams?: Record<string, string | number | boolean | null | undefined>
}

export type AuthenticatorConfig = {
  clientId: string
  clientSecret: string
  options?: AuthenticatorOptions
}

export type AuthenticatorResponse = {
  uri: string
  success: boolean
  state: string
  issuedAt: string
  codeVerifier: string
  codeChallenge: string
  params: Record<string, string>
}

export async function Authenticator({ clientId, clientSecret, options }: AuthenticatorConfig): Promise<AuthenticatorResponse> {
  validateRequired("clientId", clientId)
  validateRequired("clientSecret", clientSecret)

  const mergedOptions = normalizeOptions(options)
  validateRequired("options.redirectUri", mergedOptions.redirectUri)

  const { codeVerifier, codeChallenge } = derivePkcePair(clientSecret)
  const state = mergedOptions.state ?? generateToken(24)

  const params: Record<string, string> = {
    client_id: clientId,
    redirect_uri: mergedOptions.redirectUri,
    response_type: mergedOptions.responseType ?? DEFAULT_RESPONSE_TYPE,
    scope: toScopeString(mergedOptions.scope),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CODE_CHALLENGE_METHOD,
  }

  if (mergedOptions.extraParams) {
    for (const [key, value] of Object.entries(mergedOptions.extraParams)) {
      if (value === undefined || value === null) {
        continue
      }
      params[key] = String(value)
    }
  }

  const authorizeUrl = buildAuthorizeUrl(mergedOptions.authUrl ?? DEFAULT_AUTH_URL, params)

  return {
    uri: authorizeUrl,
    success: true,
    state,
    issuedAt: new Date().toISOString(),
    codeVerifier,
    codeChallenge,
    params,
  }
}

function normalizeOptions(options?: AuthenticatorOptions): Required<Omit<AuthenticatorOptions, "extraParams">> & { extraParams?: AuthenticatorOptions["extraParams"] } {
  const normalized: AuthenticatorOptions = options ? { ...options } : ({
    redirectUri: "",
  } as AuthenticatorOptions)

  if (!normalized.responseType) {
    normalized.responseType = DEFAULT_RESPONSE_TYPE
  }
  if (!normalized.scope) {
    normalized.scope = DEFAULT_SCOPE
  }
  if (!normalized.authUrl) {
    normalized.authUrl = DEFAULT_AUTH_URL
  }

  return normalized as Required<Omit<AuthenticatorOptions, "extraParams">> & { extraParams?: AuthenticatorOptions["extraParams"] }
}

function buildAuthorizeUrl(base: string, params: Record<string, string>): string {
  let url: URL
  try {
    url = new URL(base)
  } catch (error) {
    throw new Error(`Invalid authorization endpoint: ${base}`)
  }

  url.search = ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value)
  }
  url.search = search.toString()
  return url.toString()
}

function derivePkcePair(clientSecret: string): { codeVerifier: string; codeChallenge: string } {
  const salt = randomBytes(32)
  const verifierBuffer = createHmac("sha256", clientSecret).update(salt).digest()
  const codeVerifier = toBase64Url(verifierBuffer)
  const codeChallenge = toBase64Url(createHash("sha256").update(codeVerifier).digest())

  return { codeVerifier, codeChallenge }
}

function generateToken(bytes = 16): string {
  return toBase64Url(randomBytes(bytes))
}

function toScopeString(scope?: string | string[]): string {
  if (!scope || (Array.isArray(scope) && scope.length === 0)) {
    return DEFAULT_SCOPE
  }
  if (Array.isArray(scope)) {
    return scope.join(" ")
  }
  return scope
}

function toBase64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function validateRequired(field: string, value: string | undefined | null) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required`)
  }
}
