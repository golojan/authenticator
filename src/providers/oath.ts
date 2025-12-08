// providers/golojan.ts
import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers";
import { GolojanProfile } from "./next-auth";

/**
 * GolojanProvider
 *
 * Usage:
 *   GolojanProvider({
 *     clientId: process.env.GOLOJAN_CLIENT_ID!,
 *     clientSecret: process.env.GOLOJAN_CLIENT_SECRET!,
 *   })
 */
export function GolojanOathProvider<P extends GolojanProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: "golojan",
    name: "Golojan",
    type: "oauth",
    // You can supply either a string or an object for authorization.
    // The object lets you set default params (eg. scope) and also pass checks (PKCE).
    authorization: {
      url: "https://accounts.golojan.com/oauth/authorize",
      params: {
        // adjust scope as needed
        scope: "openid profile email",
        // you can add other default params here
      },
    },
    token: "https://accounts.golojan.com/oauth/token",
    userinfo: "https://accounts.golojan.com/oauth/me",
    // If your provider uses standard OpenID Connect userinfo claims,
    // the `userinfo` endpoint will be used. Otherwise adapt below.
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    // If your provider uses non-standard responses (e.g. nested keys),
    // implement the mapping in `profile`.
    profile(profile) {
      // adapt the mapping to the exact shape returned by your /me endpoint
      return {
        id: profile.id, // support 'sub' if OpenID
        name:  `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || null,
        email: profile.email ?? null,
        image: (profile as any).avatar_url ?? null,
      } as any;
    },
    /**
     * Optional: checks like 'pkce' or 'state' can be passed when calling
     * auth() (NextAuth will handle pkce automatically for supported flows).
     *
     * If your Golojan server requires `code_challenge` and `code_challenge_method=S256`,
     * NextAuth will automatically handle pkce when 'checks' contains 'pkce'.
     *
     * You do NOT normally need to set checks here — they can be passed in
     * auth() or as `authorization.params` if you need specific behavior.
     */
  };
}

export default GolojanOathProvider;
