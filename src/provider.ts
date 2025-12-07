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
    client: userClient,
    checks: userChecks,
    ...rest
  } = options

  const authorization = resolveAuthorization(userAuthorization)
  const token = userToken ?? { url: TOKEN_URL }
  const userinfo = userUserinfo ?? { url: USERINFO_URL }
  const profile = userProfile ?? mapProfile
  const checks = mergeChecks(userChecks)
  const client = {
    token_endpoint_auth_method: "client_secret_post" as const,
    ...(userClient ?? {}),
  }

  return {
    id: "golojan",
    name: "Golojan",
    type: "oauth",
    issuer: "https://accounts.golojan.com/oauth2",
    authorization,
    token,
    userinfo,
    profile,
    checks,
    client,
    ...rest,
  }
}

function resolveAuthorization(
  authorization?: OAuthUserConfig<GolojanProfile>["authorization"],
): OAuthConfig<GolojanProfile>["authorization"] {
  if (typeof authorization === "string") {
    return authorization
  }

  const params = {
    scope: DEFAULT_SCOPE,
    response_type: "code",
    ...(authorization?.params ?? {}),
  }

  return {
    url: authorization?.url ?? AUTHORIZE_URL,
    params,
  }
}

function mergeChecks(checks?: OAuthConfig<GolojanProfile>["checks"]): OAuthConfig<GolojanProfile>["checks"] {
  const base: Array<"pkce" | "state"> = ["pkce", "state"]
  if (!checks || checks.length === 0) {
    return base
  }

  const merged = new Set([...checks, ...base])
  return Array.from(merged) as OAuthConfig<GolojanProfile>["checks"]
}

function mapProfile(profile: GolojanProfile) {
  const identifier = profile.id ?? profile.sub ?? ""
  if (!identifier) {
    throw new Error("Golojan profile payload did not include an id or sub field")
  }

  const composedName = composeName(profile)

  return {
    id: identifier,
    name: composedName,
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
