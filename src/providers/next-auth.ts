import { OIDCConfig, OIDCUserConfig } from "@auth/core/providers"
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
  options: OIDCUserConfig<P>,
): OIDCConfig<P> {
  const { type: _ignoredType, ...baseOptions } = options as OIDCUserConfig<P> & { type?: unknown }

  const {
    authorization: userAuthorization,
    token: userToken,
    userinfo: userUserinfo,
    profile: userProfile,
    checks: userChecks,
    client: userClient,
    ...rest
  } = baseOptions

  const authorization = normalizeAuthorization(userAuthorization)
  const token = userToken ?? { url: TOKEN_URL }
  const userinfo = userUserinfo ?? { url: USERINFO_URL }
  const checks = normalizeChecks(userChecks)
  const client = normalizeClient(userClient)
  const profile = userProfile ?? mapProfile

  return {
    id: "golojan",
    name: "Golojan",
    type: "oidc" as const,
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
  authorization?: OIDCUserConfig<GolojanProfile>["authorization"],
): OIDCConfig<GolojanProfile>["authorization"] {
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
  checks?: OIDCConfig<GolojanProfile>["checks"],
): OIDCConfig<GolojanProfile>["checks"] {
  const merged = new Set<ProviderCheck>(["pkce", "state"])

  if (checks) {
    for (const value of checks) {
      if (isProviderCheck(value)) {
        merged.add(value)
      }
    }
  }

  return Array.from(merged) as OIDCConfig<GolojanProfile>["checks"]
}

function isProviderCheck(value: unknown): value is ProviderCheck {
  return value === "pkce" || value === "state" || value === "none"
}

function normalizeClient(
  client?: OIDCConfig<GolojanProfile>["client"],
): OIDCConfig<GolojanProfile>["client"] {
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
