import axios, { type AxiosError } from "axios"
import { authConfig } from "./env"
import axiosInstance from "./utils/axios"

export type AuthenticatorOptions = {
  /** OAuth redirect URI registered with the client */
  redirectUri: string
  /** Optional space or array separated scopes */
  scope?: string | string[]
  /** Optional CSRF token */
  state?: string
  /** Optional nonce forwarded to the authorisation server */
  nonce?: string
  /** Authenticated user identifier issuing the authorisation request */
  userId?: number
  /** Additional properties appended to the authorisation payload */
  extraParams?: Record<string, unknown>
}

export type AuthenticatorConfig = {
  clientId: string
  clientSecret: string
  options?: AuthenticatorOptions
}

export type AuthoriseOverrides = Partial<AuthenticatorOptions>
export type AuthorizeOverrides = AuthoriseOverrides

export type TokenRequestDto = {
  grantType: "authorization_code" | "refresh_token"
  code?: string
  clientId?: string
  redirectUri?: string
  refreshToken?: string
}

type ResolvedOptions = Required<Pick<AuthenticatorOptions, "redirectUri">> &
  Omit<AuthenticatorOptions, "redirectUri">

const AUTHORISE_ENDPOINT = "/authorize"

export class Authenticator {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly baseOptions?: AuthenticatorOptions

  constructor({ clientId, clientSecret, options }: AuthenticatorConfig) {
    validateRequired("clientId", clientId)
    validateRequired("clientSecret", clientSecret)

    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseOptions = options ? { ...options } : undefined
  }

  async authorise(overrides?: AuthoriseOverrides): Promise<TokenRequestDto> {
    const resolved = resolveOptions(this.baseOptions, overrides)

    validateRequired("options.redirectUri", resolved.redirectUri)

    const payload = buildAuthorizationPayload(this.clientId, this.clientSecret, resolved)

    try {
      const { data } = await axiosInstance.post<TokenRequestDto>(AUTHORISE_ENDPOINT, payload)
      return data
    } catch (error) {
      throw toAuthorizationError(error)
    }
  }

  async authorize(overrides?: AuthoriseOverrides): Promise<TokenRequestDto> {
    return this.authorise(overrides)
  }
}

function resolveOptions(base?: AuthenticatorOptions, override?: AuthoriseOverrides): ResolvedOptions {
  if (!base && !override) {
    return normalizeOptions()
  }

  const mergedExtraParams = {
    ...(base?.extraParams ?? {}),
    ...(override?.extraParams ?? {}),
  }

  const merged: Partial<AuthenticatorOptions> = {
    ...(base ?? {}),
    ...(override ?? {}),
  }

  if (Object.keys(mergedExtraParams).length > 0) {
    merged.extraParams = mergedExtraParams
  }

  return normalizeOptions(merged)
}

function normalizeOptions(options?: Partial<AuthenticatorOptions>): ResolvedOptions {
  return {
    redirectUri: options?.redirectUri?.trim() ?? "",
    scope: options?.scope ?? authConfig.DEFAULT_SCOPE,
    state: options?.state,
    nonce: options?.nonce,
    userId: typeof options?.userId === "number" ? options.userId : undefined,
    extraParams: options?.extraParams,
  }
}

function buildAuthorizationPayload(
  clientId: string,
  clientSecret: string,
  options: ResolvedOptions,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    clientId,
    clientSecret,
    redirectUri: options.redirectUri,
  }

  const scopeValue = toScopeString(options.scope)
  if (scopeValue) {
    payload.scope = scopeValue
  }

  if (options.state) {
    payload.state = options.state
  }

  if (options.nonce) {
    payload.nonce = options.nonce
  }

  if (typeof options.userId === "number") {
    payload.userId = options.userId
  }

  if (options.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      if (value === undefined) {
        continue
      }
      payload[key] = value
    }
  }

  return payload
}

function toScopeString(scope?: string | string[]): string {
  if (!scope || (Array.isArray(scope) && scope.length === 0)) {
    return authConfig.DEFAULT_SCOPE
  }
  if (Array.isArray(scope)) {
    return scope.join(" ")
  }
  return scope
}

function validateRequired(field: string, value: string | undefined | null) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required`)
  }
}

function toAuthorizationError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const message = extractAxiosMessage(error)
    const status = error.response?.status
    const statusText = status ? ` with status ${status}` : ""
    const details = message ? `: ${message}` : "."
    const err = new Error(`Authorisation request failed${statusText}${details}`)
    err.name = "AuthenticatorError"
    return err
  }

  return error instanceof Error ? error : new Error("Authorisation request failed.")
}

function extractAxiosMessage(error: AxiosError): string | undefined {
  const data = error.response?.data

  if (!data) {
    return error.message
  }

  if (typeof data === "string") {
    return data
  }

  if (typeof data === "object") {
    if (typeof (data as { message?: unknown }).message === "string") {
      return (data as { message?: string }).message
    }

    if (typeof (data as { error?: unknown }).error === "string") {
      return (data as { error?: string }).error
    }
  }

  return undefined
}
