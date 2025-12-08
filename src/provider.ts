import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers"

export interface GolojanProfile extends Record<string, unknown> {
  sub?: string
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  name?: string
  avatar?: string
  picture?: string
}

const DEFAULT_SCOPE = "openid profile email"
const AUTHORIZE_URL = "https://accounts.golojan.com/oauth2/authorize"
const TOKEN_URL = "https://accounts.golojan.com/oauth2/token"
const USERINFO_URL = "https://accounts.golojan.com/oauth2/userinfo"

export default function GolojanProvider<P extends GolojanProfile>(
  options: OAuthUserConfig<P>,
): OAuthConfig<P> {
  const {
    authorization: userAuthorization,
    token: userToken,
    userinfo: userUserinfo,
    profile: userProfile,
    checks: userChecks,
    client: userClient,
    ...rest
  } = options

  const authorization = normalizeAuthorization(userAuthorization)
  const token = userToken ?? { url: TOKEN_URL }
  const userinfo = userUserinfo ?? { url: USERINFO_URL }
  const checks = normalizeChecks(userChecks)
  const client = normalizeClient(userClient)
  const profile = userProfile ?? mapProfile

  return {
    id: "golojan",
    name: "Golojan",
    type: "oauth",
    authorization,
    token,
    userinfo,
    profile,
    checks,
    client,
    ...rest,
  }
}

function normalizeAuthorization(
  authorization?: OAuthUserConfig<GolojanProfile>["authorization"],
): OAuthConfig<GolojanProfile>["authorization"] {
  if (typeof authorization === "string") {
    return authorization
  }

  const params = {
    scope: DEFAULT_SCOPE,
    ...(authorization?.params ?? {}),
  }

  return {
    url: authorization?.url ?? AUTHORIZE_URL,
    params,
  }
}

type ProviderCheck = "pkce" | "state" | "none"

function normalizeChecks(
  checks?: OAuthConfig<GolojanProfile>["checks"],
): OAuthConfig<GolojanProfile>["checks"] {
  const merged = new Set<ProviderCheck>(["pkce", "state"])

  if (checks) {
    for (const value of checks) {
      if (isProviderCheck(value)) {
        merged.add(value)
      }
    }
  }

  return Array.from(merged) as OAuthConfig<GolojanProfile>["checks"]
}

function isProviderCheck(value: unknown): value is ProviderCheck {
  return value === "pkce" || value === "state" || value === "none"
}

function normalizeClient(
  client?: OAuthConfig<GolojanProfile>["client"],
): OAuthConfig<GolojanProfile>["client"] {
  if (!client) {
    return { token_endpoint_auth_method: "client_secret_post" }
  }

  return {
    token_endpoint_auth_method: "client_secret_post",
    ...client,
  }
}

function mapProfile(profile: GolojanProfile) {
  const identifier = profile.id ?? profile.sub
  if (!identifier) {
    throw new Error("Golojan profile payload did not include an id or sub field")
  }

  return {
    id: identifier,
    name: composeName(profile),
    email: profile.email ?? null,
    image: profile.avatar ?? profile.picture ?? null,
  }
}

function composeName(profile: GolojanProfile): string | null {
  if (typeof profile.name === "string" && profile.name.trim().length > 0) {
    return profile.name
  }

  const parts = [profile.firstName, profile.lastName]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

  if (parts.length > 0) {
    return parts.join(" ")
  }

  return profile.email ?? null
}
