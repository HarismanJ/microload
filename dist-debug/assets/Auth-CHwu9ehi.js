const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-Cfquo4uC.js","assets/dist-B65an-qx.js","assets/supabase-BKYoYWHZ.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { a as registerPlugin, t as Capacitor } from "./dist-B65an-qx.js";
import { t as __vitePreload } from "./preload-helper-CCDVmQCD.js";
import { n as __rest } from "./supabase-BKYoYWHZ.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { E as validatePassword, S as validateEmail, v as VALIDATION_LIMITS } from "./index-BNajgLSV.js";
//#region node_modules/@capgo/capacitor-social-login/dist/esm/social-login.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var GOOGLE_OFFLINE_REFRESH_MESSAGE = "Google refresh() is not available when using offline mode. Offline mode only returns serverAuthCode for backend token exchange. Send serverAuthCode to your backend and refresh tokens there, or switch google.mode to 'online' for client-side refresh.";
var rawSocialLogin = registerPlugin("SocialLogin", { web: () => __vitePreload(() => import("./web-Cfquo4uC.js").then((m) => new m.SocialLoginWeb()), __vite__mapDeps([0,1,2])) });
var SocialLoginClient = class {
	constructor() {
		this.initialize = this.initialize.bind(this);
		this.refresh = this.refresh.bind(this);
	}
	async initialize(options) {
		await rawSocialLogin.initialize(options);
		this.initializeOptions = options;
	}
	async login(options) {
		return rawSocialLogin.login(options);
	}
	async logout(options) {
		return rawSocialLogin.logout(options);
	}
	async isLoggedIn(options) {
		return rawSocialLogin.isLoggedIn(options);
	}
	async getAuthorizationCode(options) {
		return rawSocialLogin.getAuthorizationCode(options);
	}
	async refresh(options) {
		var _a, _b;
		if (options.provider === "google" && ((_b = (_a = this.initializeOptions) === null || _a === void 0 ? void 0 : _a.google) === null || _b === void 0 ? void 0 : _b.mode) === "offline") console.warn(`[SocialLogin] ${GOOGLE_OFFLINE_REFRESH_MESSAGE}`);
		return rawSocialLogin.refresh(options);
	}
	async refreshToken(options) {
		return rawSocialLogin.refreshToken(options);
	}
	async handleRedirectCallback() {
		return rawSocialLogin.handleRedirectCallback();
	}
	async decodeIdToken(options) {
		return rawSocialLogin.decodeIdToken(options);
	}
	async getAccessTokenExpirationDate(options) {
		return rawSocialLogin.getAccessTokenExpirationDate(options);
	}
	async isAccessTokenAvailable(options) {
		return rawSocialLogin.isAccessTokenAvailable(options);
	}
	async isAccessTokenExpired(options) {
		return rawSocialLogin.isAccessTokenExpired(options);
	}
	async isRefreshTokenAvailable(options) {
		return rawSocialLogin.isRefreshTokenAvailable(options);
	}
	async providerSpecificCall(options) {
		return rawSocialLogin.providerSpecificCall(options);
	}
	async getPluginVersion() {
		return rawSocialLogin.getPluginVersion();
	}
	async openSecureWindow(options) {
		return rawSocialLogin.openSecureWindow(options);
	}
};
var SocialLoginBase = rawSocialLogin;
var SocialLogin = new SocialLoginClient();
//#endregion
//#region node_modules/@capgo/capacitor-social-login/dist/esm/auth-connect.js
var AUTH_CONNECT_PROVIDERS = [
	"auth0",
	"azure",
	"cognito",
	"okta",
	"onelogin"
];
var DEFAULT_SCOPES = {
	auth0: "openid profile email offline_access",
	azure: "openid profile email",
	cognito: "openid profile email",
	okta: "openid profile email offline_access",
	onelogin: "openid profile email"
};
var DEFAULT_RESOURCE_URLS = { azure: "https://graph.microsoft.com/v1.0/me" };
var DEFAULT_AUTHORITY_HOST = "https://login.microsoftonline.com";
var ensureProtocol = (value) => {
	if (value.startsWith("http://") || value.startsWith("https://")) return value;
	return `https://${value}`;
};
var trimTrailingSlash = (value) => value.replace(/\/+$/, "");
var joinUrl = (base, path) => {
	return `${trimTrailingSlash(base)}/${path.replace(/^\/+/, "")}`;
};
var mergeRecords = (base, overrides) => {
	if (!base && !overrides) return;
	return Object.assign(Object.assign({}, base !== null && base !== void 0 ? base : {}), overrides !== null && overrides !== void 0 ? overrides : {});
};
var validatePreset = (providerId, preset) => {
	if (!preset.clientId) throw new Error(`[authConnect] ${providerId} requires clientId.`);
	if (!preset.redirectUrl) throw new Error(`[authConnect] ${providerId} requires redirectUrl.`);
};
var buildAuth0Config = (preset) => {
	validatePreset("auth0", preset);
	if (!preset.domain) throw new Error("[authConnect] auth0 requires domain.");
	const base = trimTrailingSlash(ensureProtocol(preset.domain));
	return buildConfigFromPreset("auth0", preset, {
		authorizationBaseUrl: joinUrl(base, "authorize"),
		accessTokenEndpoint: joinUrl(base, "oauth/token"),
		resourceUrl: joinUrl(base, "userinfo"),
		logoutUrl: joinUrl(base, "v2/logout"),
		additionalParameters: preset.audience ? { audience: preset.audience } : void 0
	});
};
var buildAzureConfig = (preset) => {
	var _a, _b;
	validatePreset("azure", preset);
	const tenantId = (_a = preset.tenantId) !== null && _a !== void 0 ? _a : "common";
	const base = joinUrl(trimTrailingSlash(ensureProtocol((_b = preset.authorityHost) !== null && _b !== void 0 ? _b : DEFAULT_AUTHORITY_HOST)), `${tenantId}/oauth2/v2.0`);
	return buildConfigFromPreset("azure", preset, {
		authorizationBaseUrl: joinUrl(base, "authorize"),
		accessTokenEndpoint: joinUrl(base, "token"),
		resourceUrl: DEFAULT_RESOURCE_URLS.azure
	});
};
var buildCognitoConfig = (preset) => {
	validatePreset("cognito", preset);
	if (!preset.domain) throw new Error("[authConnect] cognito requires domain.");
	const base = trimTrailingSlash(ensureProtocol(preset.domain));
	return buildConfigFromPreset("cognito", preset, {
		authorizationBaseUrl: joinUrl(base, "oauth2/authorize"),
		accessTokenEndpoint: joinUrl(base, "oauth2/token"),
		resourceUrl: joinUrl(base, "oauth2/userInfo"),
		logoutUrl: joinUrl(base, "logout")
	});
};
var buildOktaConfig = (preset) => {
	validatePreset("okta", preset);
	if (!preset.issuer) throw new Error("[authConnect] okta requires issuer.");
	const base = trimTrailingSlash(ensureProtocol(preset.issuer));
	return buildConfigFromPreset("okta", preset, {
		authorizationBaseUrl: joinUrl(base, "v1/authorize"),
		accessTokenEndpoint: joinUrl(base, "v1/token"),
		resourceUrl: joinUrl(base, "v1/userinfo"),
		logoutUrl: joinUrl(base, "v1/logout")
	});
};
var buildOneLoginConfig = (preset) => {
	validatePreset("onelogin", preset);
	if (!preset.issuer) throw new Error("[authConnect] onelogin requires issuer.");
	const base = trimTrailingSlash(ensureProtocol(preset.issuer));
	return buildConfigFromPreset("onelogin", preset, {
		authorizationBaseUrl: joinUrl(base, "auth"),
		accessTokenEndpoint: joinUrl(base, "token"),
		resourceUrl: joinUrl(base, "me"),
		logoutUrl: joinUrl(base, "logout")
	});
};
var buildConfigFromPreset = (providerId, preset, defaults) => {
	var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
	const additionalParameters = mergeRecords(defaults.additionalParameters, preset.additionalParameters);
	const additionalResourceHeaders = mergeRecords(defaults.additionalResourceHeaders, preset.additionalResourceHeaders);
	const config = {
		appId: preset.clientId,
		authorizationBaseUrl: (_b = (_a = preset.authorizationBaseUrl) !== null && _a !== void 0 ? _a : defaults.authorizationBaseUrl) !== null && _b !== void 0 ? _b : "",
		accessTokenEndpoint: (_c = preset.accessTokenEndpoint) !== null && _c !== void 0 ? _c : defaults.accessTokenEndpoint,
		redirectUrl: preset.redirectUrl,
		resourceUrl: (_d = preset.resourceUrl) !== null && _d !== void 0 ? _d : defaults.resourceUrl,
		responseType: (_f = (_e = preset.responseType) !== null && _e !== void 0 ? _e : defaults.responseType) !== null && _f !== void 0 ? _f : "code",
		pkceEnabled: (_h = (_g = preset.pkceEnabled) !== null && _g !== void 0 ? _g : defaults.pkceEnabled) !== null && _h !== void 0 ? _h : true,
		scope: (_k = (_j = preset.scope) !== null && _j !== void 0 ? _j : defaults.scope) !== null && _k !== void 0 ? _k : DEFAULT_SCOPES[providerId],
		additionalParameters,
		additionalResourceHeaders,
		logoutUrl: (_l = preset.logoutUrl) !== null && _l !== void 0 ? _l : defaults.logoutUrl,
		logsEnabled: (_m = preset.logsEnabled) !== null && _m !== void 0 ? _m : defaults.logsEnabled
	};
	if (!config.authorizationBaseUrl) throw new Error(`[authConnect] ${providerId} authorizationBaseUrl is required.`);
	return config;
};
var buildAuthConnectProviders = (presets) => {
	if (!presets) return {};
	const providers = {};
	if (presets.auth0) providers.auth0 = buildAuth0Config(presets.auth0);
	if (presets.azure) providers.azure = buildAzureConfig(presets.azure);
	if (presets.cognito) providers.cognito = buildCognitoConfig(presets.cognito);
	if (presets.okta) providers.okta = buildOktaConfig(presets.okta);
	if (presets.onelogin) providers.onelogin = buildOneLoginConfig(presets.onelogin);
	return providers;
};
var isAuthConnectProvider = (provider) => AUTH_CONNECT_PROVIDERS.includes(provider);
var isAuthConnectProviderOptions = (options) => isAuthConnectProvider(options.provider);
var isAuthConnectLoginOptions = (options) => isAuthConnectProvider(options.provider);
var mapLoginOptions = (options) => {
	var _a;
	if (isAuthConnectLoginOptions(options)) return {
		provider: "oauth2",
		options: Object.assign({ providerId: options.provider }, (_a = options.options) !== null && _a !== void 0 ? _a : {})
	};
	return options;
};
var mapProviderOptions = (options) => {
	if (isAuthConnectProviderOptions(options)) return {
		provider: "oauth2",
		providerId: options.provider
	};
	return options;
};
var mapRefreshOptions = (options) => mapLoginOptions(options);
var mergeOAuth2Configs = (presets, oauth2) => {
	if (!Object.keys(presets).length && !oauth2) return oauth2;
	return Object.assign(Object.assign({}, presets), oauth2 !== null && oauth2 !== void 0 ? oauth2 : {});
};
var createAuthConnectClient = (client) => ({
	initialize: async (options) => {
		const { authConnect, oauth2 } = options, rest = __rest(options, ["authConnect", "oauth2"]);
		const mergedOauth2 = mergeOAuth2Configs(buildAuthConnectProviders(authConnect), oauth2);
		const payload = Object.assign(Object.assign({}, rest), mergedOauth2 ? { oauth2: mergedOauth2 } : {});
		return client.initialize(payload);
	},
	login: async (options) => {
		if (isAuthConnectProvider(options.provider)) {
			const mapped = mapLoginOptions(options);
			const response = await client.login(mapped);
			return {
				provider: options.provider,
				result: response.result
			};
		}
		return client.login(options);
	},
	logout: async (options) => client.logout(mapProviderOptions(options)),
	isLoggedIn: async (options) => client.isLoggedIn(mapProviderOptions(options)),
	getAuthorizationCode: async (options) => client.getAuthorizationCode(mapProviderOptions(options)),
	refresh: async (options) => client.refresh(mapRefreshOptions(options)),
	providerSpecificCall: async (options) => client.providerSpecificCall(options),
	getPluginVersion: async () => client.getPluginVersion()
});
createAuthConnectClient(SocialLoginBase);
//#endregion
//#region src/components/Auth.jsx
var import_jsx_runtime = require_jsx_runtime();
function Auth({ recoveryMode = false, onRecoveryDone }) {
	const [mode, setMode] = (0, import_react.useState)(recoveryMode ? "reset" : "signin");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [showConfirm, setShowConfirm] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (recoveryMode) {
			setMode("reset");
			setPassword("");
			setConfirmPassword("");
			setError(null);
			setMessage(null);
		}
	}, [recoveryMode]);
	async function handleGoogleSignIn() {
		setLoading(true);
		setError(null);
		try {
			if (Capacitor.isNativePlatform()) {
				await SocialLogin.initialize({ google: { webClientId: "1052822933922-r7sa24t8buocnadn6emof98hp6dmndjo.apps.googleusercontent.com" } });
				const { result } = await SocialLogin.login({
					provider: "google",
					options: { scopes: ["email", "profile"] }
				});
				const { error } = await supabase.auth.signInWithIdToken({
					provider: "google",
					token: result.idToken
				});
				if (error) setError(error.message);
			} else {
				const { error } = await supabase.auth.signInWithOAuth({
					provider: "google",
					options: { redirectTo: window.location.origin }
				});
				if (error) setError(error.message);
			}
		} catch {
			setError("Google sign-in failed. Please try again.");
		}
		setLoading(false);
	}
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);
		if (mode !== "reset") {
			const emailError = validateEmail(email);
			if (emailError) {
				setError(emailError);
				setLoading(false);
				return;
			}
		}
		if (mode === "signup" || mode === "reset") {
			const passwordError = validatePassword(password);
			if (passwordError) {
				setError(passwordError);
				setLoading(false);
				return;
			}
		}
		if (mode === "signup") {
			if (password !== confirmPassword) {
				setError("Passwords do not match.");
				setLoading(false);
				return;
			}
			const { error } = await supabase.auth.signUp({
				email: email.trim(),
				password,
				options: { emailRedirectTo: `${window.location.origin}/confirm.html` }
			});
			if (error) setError(error.message);
			else setMessage("Check your email for a confirmation link. Be sure to check your spam folder.");
		} else if (mode === "forgot") {
			const redirectTo = Capacitor.isNativePlatform() ? "microload://reset-password" : `${window.location.origin}/reset-password.html`;
			const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
			if (error) setError(error.message);
			else setMessage("Check your email for a password reset link. Be sure to check your spam folder.");
		} else if (mode === "reset") {
			if (password !== confirmPassword) {
				setError("Passwords do not match.");
				setLoading(false);
				return;
			}
			const { error } = await supabase.auth.updateUser({ password });
			if (error) setError(error.message);
			else {
				setMessage("Password updated. You can now sign in.");
				onRecoveryDone?.();
			}
		} else {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});
			if (error) setError(error.message);
		}
		setLoading(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			height: "100dvh",
			padding: "24px",
			background: "var(--bg)"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "158",
			height: "36",
			viewBox: "0 0 210 48",
			xmlns: "http://www.w3.org/2000/svg",
			style: { marginBottom: 32 },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "0",
					y: "10",
					width: "6",
					height: "28",
					rx: "2",
					style: { fill: "var(--blue)" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "9",
					y: "4",
					width: "6",
					height: "40",
					rx: "2",
					style: { fill: "var(--blue)" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "18",
					y: "0",
					width: "6",
					height: "48",
					rx: "2",
					style: { fill: "var(--blue)" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "27",
					y: "4",
					width: "6",
					height: "40",
					rx: "2",
					style: { fill: "var(--blue)" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "36",
					y: "10",
					width: "6",
					height: "28",
					rx: "2",
					style: { fill: "var(--blue)" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
					x: "50",
					y: "34",
					fontFamily: "system-ui, -apple-system, sans-serif",
					fontSize: "26",
					fontWeight: "700",
					fill: "#ffffff",
					letterSpacing: "-0.5",
					children: ["micro", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tspan", {
						style: { fill: "var(--blue)" },
						children: "load"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				width: "100%",
				maxWidth: 360,
				background: "var(--surface)",
				borderRadius: 16,
				padding: 24,
				border: "1px solid var(--border)"
			},
			children: [
				mode !== "forgot" && mode !== "reset" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						marginBottom: 24,
						background: "var(--bg)",
						borderRadius: 10,
						padding: 4
					},
					children: ["signin", "signup"].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setMode(m);
							setError(null);
							setMessage(null);
						},
						style: {
							flex: 1,
							padding: "8px 0",
							border: "none",
							borderRadius: 8,
							fontWeight: 600,
							fontSize: 14,
							cursor: "pointer",
							transition: "all 0.15s",
							background: mode === m ? "var(--blue)" : "transparent",
							color: mode === m ? "#fff" : "var(--muted)"
						},
						children: m === "signin" ? "Sign In" : "Sign Up"
					}, m))
				}),
				mode === "forgot" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { marginBottom: 20 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setMode("signin");
								setError(null);
								setMessage(null);
							},
							style: {
								background: "none",
								border: "none",
								color: "var(--blue)",
								fontSize: 14,
								cursor: "pointer",
								padding: 0
							},
							children: "← Back to Sign In"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "var(--text)",
								fontSize: 15,
								fontWeight: 600,
								marginTop: 12
							},
							children: "Reset Password"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "var(--muted)",
								fontSize: 13,
								marginTop: 4
							},
							children: "Enter your email and we'll send you a reset link."
						})
					]
				}),
				mode === "reset" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { marginBottom: 20 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => supabase.auth.signOut(),
							style: {
								background: "none",
								border: "none",
								color: "var(--blue)",
								fontSize: 14,
								cursor: "pointer",
								padding: 0
							},
							children: "← Back to Sign In"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "var(--text)",
								fontSize: 15,
								fontWeight: 600,
								marginTop: 12
							},
							children: "Set New Password"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "var(--muted)",
								fontSize: 13,
								marginTop: 4
							},
							children: "Enter and confirm your new password."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit,
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 14
					},
					children: [
						mode !== "reset" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							placeholder: "Email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							maxLength: VALIDATION_LIMITS.emailMaxLength,
							required: true,
							style: {
								background: "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: 10,
								padding: "12px 14px",
								color: "var(--text)",
								fontSize: 15,
								outline: "none",
								width: "100%"
							}
						}),
						mode !== "forgot" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { position: "relative" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: showPassword ? "text" : "password",
								placeholder: "Password",
								value: password,
								onChange: (e) => setPassword(e.target.value),
								minLength: mode === "signup" || mode === "reset" ? VALIDATION_LIMITS.passwordMinLength : void 0,
								maxLength: VALIDATION_LIMITS.passwordMaxLength,
								required: true,
								style: {
									background: "var(--bg)",
									border: "1px solid var(--border)",
									borderRadius: 10,
									padding: "12px 44px 12px 14px",
									color: "var(--text)",
									fontSize: 15,
									outline: "none",
									width: "100%"
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowPassword((v) => !v),
								style: {
									position: "absolute",
									right: 12,
									top: "50%",
									transform: "translateY(-50%)",
									background: "none",
									border: "none",
									cursor: "pointer",
									padding: 0,
									color: "var(--muted)",
									display: "flex",
									alignItems: "center"
								},
								children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
											x1: "1",
											y1: "1",
											x2: "23",
											y2: "23"
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
										cx: "12",
										cy: "12",
										r: "3"
									})]
								})
							})]
						}),
						(mode === "signup" || mode === "reset") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { position: "relative" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: showConfirm ? "text" : "password",
								placeholder: "Confirm Password",
								value: confirmPassword,
								onChange: (e) => setConfirmPassword(e.target.value),
								minLength: VALIDATION_LIMITS.passwordMinLength,
								maxLength: VALIDATION_LIMITS.passwordMaxLength,
								required: true,
								style: {
									background: "var(--bg)",
									border: "1px solid var(--border)",
									borderRadius: 10,
									padding: "12px 44px 12px 14px",
									color: "var(--text)",
									fontSize: 15,
									outline: "none",
									width: "100%"
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowConfirm((v) => !v),
								style: {
									position: "absolute",
									right: 12,
									top: "50%",
									transform: "translateY(-50%)",
									background: "none",
									border: "none",
									cursor: "pointer",
									padding: 0,
									color: "var(--muted)",
									display: "flex",
									alignItems: "center"
								},
								children: showConfirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
											x1: "1",
											y1: "1",
											x2: "23",
											y2: "23"
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
										cx: "12",
										cy: "12",
										r: "3"
									})]
								})
							})]
						}),
						mode === "signin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setMode("forgot");
								setError(null);
								setMessage(null);
							},
							style: {
								background: "none",
								border: "none",
								color: "var(--blue)",
								fontSize: 13,
								cursor: "pointer",
								textAlign: "right",
								padding: 0,
								marginTop: -6
							},
							children: "Forgot password?"
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "#ff6b6b",
								fontSize: 13,
								textAlign: "center"
							},
							children: error
						}),
						message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "#4ade80",
								fontSize: 13,
								textAlign: "center"
							},
							children: message
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: loading,
							style: {
								background: "var(--blue)",
								color: "#fff",
								border: "none",
								borderRadius: 10,
								padding: "13px",
								fontWeight: 700,
								fontSize: 15,
								cursor: loading ? "not-allowed" : "pointer",
								opacity: loading ? .7 : 1,
								marginTop: 4
							},
							children: loading ? "..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : mode === "reset" ? "Update Password" : "Send Reset Link"
						})
					]
				}),
				(mode === "signin" || mode === "signup") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 10,
						margin: "16px 0"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
							flex: 1,
							height: 1,
							background: "var(--border)"
						} }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: {
								color: "var(--muted)",
								fontSize: 13
							},
							children: "or"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
							flex: 1,
							height: 1,
							background: "var(--border)"
						} })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: loading,
					onClick: handleGoogleSignIn,
					style: {
						width: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 10,
						padding: "12px",
						borderRadius: 10,
						border: "1px solid var(--border)",
						background: "var(--bg)",
						color: "var(--text)",
						fontSize: 15,
						fontWeight: 600,
						cursor: loading ? "not-allowed" : "pointer",
						opacity: loading ? .7 : 1
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "18",
						height: "18",
						viewBox: "0 0 48 48",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								fill: "#EA4335",
								d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								fill: "#4285F4",
								d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								fill: "#FBBC05",
								d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								fill: "#34A853",
								d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								fill: "none",
								d: "M0 0h48v48H0z"
							})
						]
					}), "Continue with Google"]
				})] })
			]
		})]
	});
}
//#endregion
export { Auth as default };

//# sourceMappingURL=Auth-CHwu9ehi.js.map