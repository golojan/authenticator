export type AuthenticatorOptions = {
    /** OAuth redirect URI registered with the client */
    redirectUri: string;
    /** Optional space or array separated scopes */
    scope?: string | string[];
    /** OAuth response type; defaults to `code` */
    responseType?: string;
    /** Optional CSRF token; generated when omitted */
    state?: string;
    /** Authorization endpoint; defaults to the Golojan accounts endpoint */
    authUrl?: string;
    /** Additional query parameters to append to the authorize URL */
    extraParams?: Record<string, string | number | boolean | null | undefined>;
};
export type AuthenticatorConfig = {
    clientId: string;
    clientSecret: string;
    options?: AuthenticatorOptions;
};
export type AuthenticatorResponse = {
    uri: string;
    success: boolean;
    state: string;
    issuedAt: string;
    codeVerifier: string;
    codeChallenge: string;
    params: Record<string, string>;
};
export declare function Authenticator({ clientId, clientSecret, options }: AuthenticatorConfig): Promise<AuthenticatorResponse>;
//# sourceMappingURL=index.d.ts.map