const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-CstV5OVV.js","assets/dist-B65an-qx.js","assets/web-CJtBSa66.js","assets/web-CKQhVdTo.js","assets/Home-D-js9UPy.js","assets/rolldown-runtime-CvHMtSRF.js","assets/drag-drop-BDqY7zvQ.js","assets/body-diagram-9cYNiocp.js","assets/react-vendor-BqgOqDvu.js","assets/WeightChart-BmQwEuO2.js","assets/supabase-CCACEYhB.js","assets/supabase-BKYoYWHZ.js","assets/chartPeriods-C_WRj2FA.js","assets/Workout-CKbMv-Ks.js","assets/preload-helper-CCDVmQCD.js","assets/achievements-Cvgw88zh.js","assets/exercises-DX-XFagI.js","assets/rollingRanks-BNemOpZT.js","assets/exerciseSearch-yksvqij-.js","assets/Ranks-DjZVOPzH.js","assets/RankBadge-BtaAzhvV.js","assets/Nutrition-Cc3cYLd1.js","assets/FoodEditorFields-Cn6yrGUM.js","assets/Profile-CQEQQtN0.js","assets/Auth-CHwu9ehi.js","assets/WorkoutSummary-Bu2DD-rt.js","assets/theme-CXEPPnky.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { n as require_client, t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { a as registerPlugin, t as Capacitor } from "./dist-B65an-qx.js";
import { t as __vitePreload } from "./preload-helper-CCDVmQCD.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { i as saveTheme, n as applyTheme, r as getSavedTheme, t as THEMES } from "./theme-CXEPPnky.js";
//#region \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
//#endregion
//#region src/App.css
var import_client = require_client();
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
//#endregion
//#region node_modules/@capacitor/app/dist/esm/index.js
var App$1 = registerPlugin("App", { web: () => __vitePreload(() => import("./web-CstV5OVV.js").then((m) => new m.AppWeb()), __vite__mapDeps([0,1])) });
//#endregion
//#region src/lib/cache.js
var store = {};
var STARTUP_SNAPSHOT_PREFIX = "liftlog:startup-snapshot:";
var DEFAULT_CACHE_TTL_MS = 1800 * 1e3;
var DEFAULT_CACHE_BUCKET = "default";
var MAX_RUNTIME_CACHE_ENTRIES = 120;
var CACHE_BUCKET_CONFIG = {
	[DEFAULT_CACHE_BUCKET]: { evictionPriority: 0 },
	search: {
		maxEntries: 30,
		evictionPriority: 1
	}
};
function getStorage() {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
function getStartupSnapshotStorageKey(key, userId = null) {
	if (userId) return `${STARTUP_SNAPSHOT_PREFIX}${key}:${userId}`;
	return `${STARTUP_SNAPSHOT_PREFIX}${key}`;
}
function removeStorageKeys(storage, keys = []) {
	keys.forEach((key) => {
		if (key) storage.removeItem(key);
	});
}
function getStartupSnapshotStorageKeysForClear(storage, key, userId = null) {
	const keys = new Set([getStartupSnapshotStorageKey(key)]);
	if (userId) {
		keys.add(getStartupSnapshotStorageKey(key, userId));
		return [...keys];
	}
	const scopedPrefix = `${getStartupSnapshotStorageKey(key)}:`;
	for (let index = 0; index < storage.length; index += 1) {
		const storageKey = storage.key(index);
		if (storageKey?.startsWith(scopedPrefix)) keys.add(storageKey);
	}
	return [...keys];
}
function clearStoredEntry(key, userId = null) {
	const storage = getStorage();
	if (!storage) return;
	try {
		removeStorageKeys(storage, getStartupSnapshotStorageKeysForClear(storage, key, userId));
	} catch {}
}
function getEntryAccessTime(entry) {
	return Number(entry?.lastAccessed || entry?.ts || 0);
}
function getBucketConfig(bucket = DEFAULT_CACHE_BUCKET) {
	return CACHE_BUCKET_CONFIG[bucket] ?? CACHE_BUCKET_CONFIG[DEFAULT_CACHE_BUCKET];
}
function isExpiredEntry(entry, now = Date.now()) {
	if (!entry) return true;
	return now - entry.ts > entry.ttl;
}
function sweepExpiredRuntimeEntries(now = Date.now()) {
	Object.entries(store).forEach(([key, entry]) => {
		if (isExpiredEntry(entry, now)) delete store[key];
	});
}
function getEntriesForEviction(bucket = null) {
	return Object.entries(store).filter(([, entry]) => bucket === null || entry.bucket === bucket).sort(([, a], [, b]) => {
		const priorityDiff = getBucketConfig(b.bucket).evictionPriority - getBucketConfig(a.bucket).evictionPriority;
		if (bucket === null && priorityDiff !== 0) return priorityDiff;
		const accessDiff = getEntryAccessTime(a) - getEntryAccessTime(b);
		if (accessDiff !== 0) return accessDiff;
		return a.ts - b.ts;
	});
}
function trimBucketEntries(bucket, maxEntries) {
	if (!bucket || !Number.isFinite(maxEntries) || maxEntries < 0) return;
	const entries = getEntriesForEviction(bucket);
	const overflow = entries.length - maxEntries;
	if (overflow <= 0) return;
	entries.slice(0, overflow).forEach(([key]) => {
		delete store[key];
	});
}
function trimGlobalEntries(maxEntries) {
	if (!Number.isFinite(maxEntries) || maxEntries < 0) return;
	const entries = getEntriesForEviction();
	const overflow = entries.length - maxEntries;
	if (overflow <= 0) return;
	entries.slice(0, overflow).forEach(([key]) => {
		delete store[key];
	});
}
function normalizeCacheOptions(options = {}) {
	if (!options || typeof options !== "object") return { bucket: DEFAULT_CACHE_BUCKET };
	const requestedBucket = typeof options.bucket === "string" && options.bucket.trim() ? options.bucket.trim() : DEFAULT_CACHE_BUCKET;
	return { bucket: Object.prototype.hasOwnProperty.call(CACHE_BUCKET_CONFIG, requestedBucket) ? requestedBucket : DEFAULT_CACHE_BUCKET };
}
function pruneRuntimeCache(now = Date.now()) {
	sweepExpiredRuntimeEntries(now);
	Object.entries(CACHE_BUCKET_CONFIG).forEach(([bucket, config]) => {
		if (!Number.isFinite(config.maxEntries)) return;
		trimBucketEntries(bucket, config.maxEntries);
	});
	trimGlobalEntries(MAX_RUNTIME_CACHE_ENTRIES);
}
function getCached(key) {
	const entry = store[key];
	if (!entry) return null;
	const now = Date.now();
	if (isExpiredEntry(entry, now)) {
		delete store[key];
		return null;
	}
	entry.lastAccessed = now;
	return entry.data;
}
function setCached(key, data, ttlMs = DEFAULT_CACHE_TTL_MS, options = {}) {
	const now = Date.now();
	const { bucket } = normalizeCacheOptions(options);
	store[key] = {
		data,
		ts: now,
		ttl: ttlMs,
		lastAccessed: now,
		bucket
	};
	pruneRuntimeCache(now);
}
function getStartupSnapshot(key, userId) {
	const storage = getStorage();
	if (!storage || !userId) return null;
	try {
		const legacyKey = getStartupSnapshotStorageKey(key);
		if (storage.getItem(legacyKey) !== null) storage.removeItem(legacyKey);
		const raw = storage.getItem(getStartupSnapshotStorageKey(key, userId));
		if (!raw) return null;
		const entry = JSON.parse(raw);
		if (!entry?.ts || !entry?.ttl || entry.userId !== userId) {
			clearStoredEntry(key, userId);
			return null;
		}
		if (Date.now() - entry.ts > entry.ttl) {
			clearStoredEntry(key, userId);
			return null;
		}
		return entry.data ?? null;
	} catch {
		clearStoredEntry(key, userId);
		return null;
	}
}
function setStartupSnapshot(key, data, ttlMs = DEFAULT_CACHE_TTL_MS, userId) {
	const storage = getStorage();
	if (!storage || !userId) return;
	try {
		storage.setItem(getStartupSnapshotStorageKey(key, userId), JSON.stringify({
			data,
			ts: Date.now(),
			ttl: ttlMs,
			userId
		}));
	} catch {}
}
function getCalendarMonthCacheKey(dateInput = /* @__PURE__ */ new Date()) {
	const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
	return `cal_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function invalidateCache(...keys) {
	keys.forEach((k) => {
		delete store[k];
		clearStoredEntry(k);
	});
}
var USER_LOCAL_KEYS = [
	"theme",
	"hiddenTemplates",
	"battleFeedHidden",
	"ranks:display-mode",
	"restTimerTargets"
];
function clearCache() {
	Object.keys(store).forEach((key) => delete store[key]);
	const storage = getStorage();
	if (!storage) return;
	try {
		const keysToRemove = [];
		for (let index = 0; index < storage.length; index += 1) {
			const key = storage.key(index);
			if (key?.startsWith(STARTUP_SNAPSHOT_PREFIX)) keysToRemove.push(key);
		}
		keysToRemove.forEach((key) => storage.removeItem(key));
		USER_LOCAL_KEYS.forEach((key) => storage.removeItem(key));
	} catch {}
}
//#endregion
//#region src/components/LoadingSpinner.jsx
var import_jsx_runtime = require_jsx_runtime();
function LoadingSpinner({ size = "md", fullPage = false }) {
	const spinner = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `spinner spinner-${size}`,
		role: "status",
		"aria-label": "Loading",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "spinner-logo-shell",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner-logo-glow" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "spinner-logo",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "spinner-logo-bar spinner-logo-bar-1" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "spinner-logo-bar spinner-logo-bar-2" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "spinner-logo-bar spinner-logo-bar-3" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "spinner-logo-bar spinner-logo-bar-4" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "spinner-logo-bar spinner-logo-bar-5" })
				]
			})]
		})
	});
	if (fullPage) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "spinner-page",
		children: spinner
	});
	return spinner;
}
//#endregion
//#region src/lib/liftMath.js
var KG_TO_LBS = 2.20462;
var LBS_TO_KG = .453592;
var MAX_REPS = 9999;
var MAX_WEIGHT = 9999;
var DEFAULT_BODYWEIGHT_KG = 170 * LBS_TO_KG;
function toKg(value, unit = "kg") {
	return unit === "lbs" ? value * LBS_TO_KG : value;
}
function fromKg(value, unit = "kg") {
	return unit === "lbs" ? value * KG_TO_LBS : value;
}
function convertWeight(value, fromUnit = "kg", toUnit = "kg") {
	if (value === null || value === void 0) return value;
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return value;
	if (fromUnit === toUnit) return numeric;
	return fromKg(toKg(numeric, fromUnit), toUnit);
}
function getProfileBodyweightKg(profile, fallback = null) {
	if (profile?.bodyweight === null || profile?.bodyweight === void 0) return fallback;
	return profile.unit_preference === "lbs" ? toKg(profile.bodyweight, "lbs") : profile.bodyweight;
}
function getWeightInputMax(equipment, unit = "kg") {
	return equipment === "Bodyweight" ? fromKg(999, unit) : MAX_WEIGHT;
}
function getWeightInputMin(equipment, unit = "kg", bodyweightKg = null) {
	if (equipment !== "Bodyweight") return 0;
	return -fromKg(bodyweightKg ?? 77.11064, unit);
}
function isRepsWithinInputRange(reps) {
	return Number.isInteger(reps) && reps >= 1 && reps <= 9999;
}
function isWeightWithinInputRange(weight, { equipment, unit = "kg", bodyweightKg = null } = {}) {
	if (!Number.isFinite(weight)) return false;
	if (weight > getWeightInputMax(equipment, unit)) return false;
	if (equipment === "Bodyweight") return weight >= getWeightInputMin(equipment, unit, bodyweightKg);
	return weight >= 0;
}
function getEffectiveLoadKg(weight, unit = "kg", equipment, bodyweightKg = null) {
	const externalKg = toKg(Number(weight) || 0, unit);
	if (equipment === "Bodyweight") return Math.max(0, (bodyweightKg ?? 77.11064) + externalKg);
	return Math.max(0, externalKg);
}
function getSetVolumeKg({ weight, reps, unit = "kg", equipment, bodyweightKg = null }) {
	const resolvedReps = Math.max(0, Number(reps) || 0);
	return getEffectiveLoadKg(weight, unit, equipment, bodyweightKg) * resolvedReps;
}
function getSetVolumeInUnit(set, targetUnit = "kg") {
	return fromKg(getSetVolumeKg(set), targetUnit);
}
//#endregion
//#region src/lib/inputValidation.js
var VALIDATION_LIMITS = {
	emailMaxLength: 254,
	passwordMinLength: 8,
	passwordMaxLength: 128,
	fullNameMaxLength: 80,
	usernameMinLength: 3,
	usernameMaxLength: 24,
	ageMin: 13,
	ageMax: 120,
	bugReportMinLength: 10,
	bugReportMaxLength: 2e3,
	bodyweightMinKg: 20,
	bodyweightMaxKg: 600,
	caloriesBurnedGoalMin: 1,
	caloriesBurnedGoalMax: 1e5,
	restSecondsMin: 0,
	restSecondsMax: 3600,
	cardioDurationMinSeconds: 1,
	cardioDurationMaxSeconds: 1440 * 60,
	exerciseNoteMaxLength: 1e3,
	customExerciseNameMinLength: 2,
	customExerciseNameMaxLength: 80,
	routineNameMaxLength: 60,
	routineDescriptionMaxLength: 240,
	searchMaxLength: 100,
	foodNameMaxLength: 120,
	foodBrandMaxLength: 80,
	servingUnitMaxLength: 20,
	nutritionAmountMax: 1e6,
	nutritionCaloriesMax: 1e6,
	nutritionMacroMax: 25e4,
	nutritionMineralMax: 1e7,
	nutritionVitaminAMax: 1e7,
	nutritionVitaminMax: 1e6
};
var NUTRITION_FIELD_LIMITS = {
	serving_size: {
		min: .01,
		max: VALIDATION_LIMITS.nutritionAmountMax,
		decimals: 2,
		label: "Serving size"
	},
	calories: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionCaloriesMax,
		decimals: 0,
		label: "Calories"
	},
	protein: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMacroMax,
		decimals: 2,
		label: "Protein"
	},
	carbs: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMacroMax,
		decimals: 2,
		label: "Carbs"
	},
	fat: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMacroMax,
		decimals: 2,
		label: "Fat"
	},
	fiber: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMacroMax,
		decimals: 2,
		label: "Fiber"
	},
	sugar: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMacroMax,
		decimals: 2,
		label: "Sugar"
	},
	saturated_fat: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMacroMax,
		decimals: 2,
		label: "Saturated fat"
	},
	sodium: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMineralMax,
		decimals: 0,
		label: "Sodium"
	},
	potassium: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMineralMax,
		decimals: 0,
		label: "Potassium"
	},
	calcium: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMineralMax,
		decimals: 0,
		label: "Calcium"
	},
	magnesium: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionMineralMax,
		decimals: 0,
		label: "Magnesium"
	},
	cholesterol: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 0,
		label: "Cholesterol"
	},
	vitamin_a: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminAMax,
		decimals: 0,
		label: "Vitamin A"
	},
	vitamin_c: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Vitamin C"
	},
	vitamin_d: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Vitamin D"
	},
	iron: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Iron"
	},
	zinc: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Zinc"
	},
	folate: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Folate"
	},
	vitamin_b12: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Vitamin B12"
	},
	vitamin_b6: {
		min: 0,
		max: VALIDATION_LIMITS.nutritionVitaminMax,
		decimals: 2,
		label: "Vitamin B6"
	}
};
function trimToMax(value, maxLength) {
	return String(value ?? "").slice(0, maxLength);
}
function hasMaxDecimals(value, maxDecimals) {
	const text = String(value ?? "").trim();
	if (!text || !text.includes(".")) return true;
	return text.split(".")[1].length <= maxDecimals;
}
function validateNumber(value, { label, min = null, max = null, required = false, integer = false, decimals = null } = {}) {
	const name = label || "Value";
	const text = String(value ?? "").trim();
	if (!text) return required ? `${name} is required.` : "";
	const numeric = Number(text);
	if (!Number.isFinite(numeric)) return `${name} must be a valid number.`;
	if (integer && !Number.isInteger(numeric)) return `${name} must be a whole number.`;
	if (decimals !== null && !hasMaxDecimals(text, decimals)) return `${name} can have at most ${decimals} decimal place${decimals === 1 ? "" : "s"}.`;
	if (min !== null && numeric < min) return `${name} must be at least ${min}.`;
	if (max !== null && numeric > max) return `${name} cannot exceed ${max.toLocaleString()}.`;
	return "";
}
function validateLength(value, { label, min = 0, max, required = false } = {}) {
	const name = label || "Value";
	const text = String(value ?? "").trim();
	if (!text) return required ? `${name} is required.` : "";
	if (text.length < min) return `${name} must be at least ${min} characters.`;
	if (max && text.length > max) return `${name} cannot exceed ${max} characters.`;
	return "";
}
function validateEmail(email) {
	const text = String(email ?? "").trim();
	if (!text) return "Email is required.";
	if (text.length > VALIDATION_LIMITS.emailMaxLength) return "Email cannot exceed 254 characters.";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Enter a valid email address.";
	return "";
}
function validatePassword(password) {
	const text = String(password ?? "");
	if (text.length < VALIDATION_LIMITS.passwordMinLength) return "Password must be at least 8 characters.";
	if (text.length > VALIDATION_LIMITS.passwordMaxLength) return "Password cannot exceed 128 characters.";
	return "";
}
function normalizeUsername(username) {
	return String(username ?? "").trim().toLowerCase().replace(/^@+/, "");
}
function validateUsername(username) {
	const text = normalizeUsername(username);
	if (!text) return "";
	if (text.length < VALIDATION_LIMITS.usernameMinLength) return "Username must be at least 3 characters.";
	if (text.length > VALIDATION_LIMITS.usernameMaxLength) return "Username cannot exceed 24 characters.";
	if (!/^[a-z0-9_]+$/.test(text)) return "Username can only use lowercase letters, numbers, and underscores.";
	return "";
}
function validateBodyweight(value, unit = "kg", { label = "Bodyweight", required = true } = {}) {
	const baseError = validateNumber(value, {
		label,
		min: 0,
		required,
		decimals: 1
	});
	if (baseError) return baseError;
	if (!String(value ?? "").trim()) return "";
	const kg = convertWeight(Number(value), unit, "kg");
	if (kg < VALIDATION_LIMITS.bodyweightMinKg || kg > VALIDATION_LIMITS.bodyweightMaxKg) return `${label} must be between ${VALIDATION_LIMITS.bodyweightMinKg} and ${VALIDATION_LIMITS.bodyweightMaxKg} kg.`;
	return "";
}
function validateNutritionForm(form) {
	const nameError = validateLength(form?.name, {
		label: "Food name",
		min: 1,
		max: VALIDATION_LIMITS.foodNameMaxLength,
		required: true
	});
	if (nameError) return nameError;
	const brandError = validateLength(form?.brand, {
		label: "Brand",
		max: VALIDATION_LIMITS.foodBrandMaxLength
	});
	if (brandError) return brandError;
	const unitError = validateLength(form?.serving_unit, {
		label: "Serving unit",
		min: 1,
		max: VALIDATION_LIMITS.servingUnitMaxLength,
		required: true
	});
	if (unitError) return unitError;
	for (const [key, rules] of Object.entries(NUTRITION_FIELD_LIMITS)) {
		const error = validateNumber(form?.[key], {
			...rules,
			required: key === "serving_size" || key === "calories"
		});
		if (error) return error;
	}
	return "";
}
//#endregion
//#region src/components/RestWheelPicker.jsx
function RestTimePicker({ value, onChange }) {
	const mins = Math.floor(value / 60);
	const secs = Math.round(value % 60 / 5) * 5;
	const set = (m, s) => {
		let total = m * 60 + s;
		if (total < VALIDATION_LIMITS.restSecondsMin) total = VALIDATION_LIMITS.restSecondsMin;
		if (total > VALIDATION_LIMITS.restSecondsMax) total = VALIDATION_LIMITS.restSecondsMax;
		onChange(total);
	};
	const minsUp = () => set(mins + 1, secs);
	const minsDown = () => set(Math.max(0, mins - 1), secs);
	const secsUp = () => secs + 5 >= 60 ? set(mins + 1, 0) : set(mins, secs + 5);
	const secsDown = () => secs - 5 < 0 ? set(Math.max(0, mins - 1), 55) : set(mins, secs - 5);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rtp",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rtp-unit",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rtp-btn",
						onClick: minsUp,
						children: "+"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rtp-val",
						children: mins
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rtp-btn",
						onClick: minsDown,
						children: "−"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rtp-label",
						children: "min"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "rtp-colon",
				children: ":"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rtp-unit",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rtp-btn",
						onClick: secsUp,
						children: "+"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rtp-val",
						children: String(secs).padStart(2, "0")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rtp-btn",
						onClick: secsDown,
						children: "−"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rtp-label",
						children: "sec"
					})
				]
			})
		]
	});
}
//#endregion
//#region src/lib/orm.js
function calculateORM(weight, reps) {
	if (reps === 1) return weight;
	const brzycki = weight * (36 / (37 - reps));
	const epley = weight * (1 + reps / 30);
	return Math.round((brzycki + epley) / 2 * 10) / 10;
}
//#endregion
//#region src/data/metValues.js
var CARDIO_MET = {
	"Running": 9.8,
	"Jogging": 7,
	"Walking": 3.5,
	"Hiking": 5.3,
	"Trail Running": 9,
	"Sprinting": 14,
	"Cycling": 8,
	"Jump Rope": 11.8,
	"Jumping Jacks": 7.7,
	"Burpees": 8,
	"Mountain Climbers": 8,
	"High Knees": 7,
	"Swimming": 6,
	"HIIT": 8,
	"Tabata": 8,
	"Circuit Training": 8,
	"Shadow Boxing": 7.8,
	"Boxing": 9.8,
	"Kickboxing": 9,
	"Dance Cardio": 6.5,
	"Aerobics": 6.5,
	"Zumba": 5.5,
	"Step Aerobics": 7.5,
	"Treadmill": 8,
	"Stationary Bike": 6.8,
	"Spin Bike": 10,
	"Rowing Machine": 7,
	"Elliptical": 5,
	"Stair Climber": 9,
	"Assault Bike": 11,
	"Ski Erg": 8,
	"Versa Climber": 11,
	"Battle Ropes": 10
};
function getMuscleCountMET(exercise) {
	const total = (exercise.primary_muscles?.length || 0) + (exercise.secondary_muscles?.length || 0);
	if (total >= 5) return 5.5;
	if (total >= 3) return 4.5;
	return 3.5;
}
//#endregion
//#region src/lib/battles.js
var BATTLE_HEAD_TO_HEAD_TABLE = "battle_head_to_head";
var FALLBACK_CARDIO_MET = 6;
var BATTLE_MODES = [
	"strength",
	"hybrid",
	"cardio"
];
var DEFAULT_BATTLE_MODE = "hybrid";
function normalizeBattleMode(mode) {
	return BATTLE_MODES.includes(mode) ? mode : DEFAULT_BATTLE_MODE;
}
function getBattleModeLabel(mode) {
	const normalized = normalizeBattleMode(mode);
	if (normalized === "strength") return "Strength";
	if (normalized === "cardio") return "Cardio";
	return "Hybrid";
}
async function fetchProfilesByIds(ids) {
	if (!ids.length) return {};
	const { data, error } = await supabase.from("profiles").select("id, username, full_name, bodyweight, unit_preference").in("id", ids);
	if (error) throw error;
	return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile]));
}
function resolveBattleBodyweights(profilesById, userId, opponentId) {
	const readKg = (profile) => {
		if (!profile || profile.bodyweight === null || profile.bodyweight === void 0) return null;
		const raw = Number(profile.bodyweight);
		if (!Number.isFinite(raw) || raw <= 0) return null;
		return profile.unit_preference === "lbs" ? toKg(raw, "lbs") : raw;
	};
	const userBw = readKg(profilesById[userId]);
	const opponentBw = readKg(profilesById[opponentId]);
	if (userBw && opponentBw) return {
		[userId]: userBw,
		[opponentId]: opponentBw,
		fallback: false
	};
	if (userBw || opponentBw) {
		const shared = userBw || opponentBw;
		return {
			[userId]: shared,
			[opponentId]: shared,
			fallback: true
		};
	}
	return {
		[userId]: DEFAULT_BODYWEIGHT_KG,
		[opponentId]: DEFAULT_BODYWEIGHT_KG,
		fallback: true
	};
}
function compareMetric(yourValue, opponentValue) {
	if (yourValue === null || opponentValue === null) return null;
	if (Math.abs(yourValue - opponentValue) <= .01) return "tie";
	return yourValue > opponentValue ? "you" : "opponent";
}
function positiveMinutes(seconds) {
	const minutes = (Number(seconds) || 0) / 60;
	return minutes > 0 ? minutes : null;
}
function createMetric(id, label, yourValue, opponentValue, display, extra = {}) {
	const available = yourValue !== null && opponentValue !== null;
	return {
		id,
		label,
		yourValue: available ? yourValue : null,
		opponentValue: available ? opponentValue : null,
		display,
		winner: compareMetric(available ? yourValue : null, available ? opponentValue : null),
		available,
		...extra
	};
}
function buildBattleMetrics(mode, yourStats, opponentStats) {
	const sharedExerciseIds = [...yourStats.exerciseStats.keys()].filter((exerciseId) => opponentStats.exerciseStats.has(exerciseId));
	const hasSharedStrength = sharedExerciseIds.length > 0;
	const yourStrengthVolumeBw = yourStats.strengthVolumeKg / yourStats.bodyweightKg;
	const opponentStrengthVolumeBw = opponentStats.strengthVolumeKg / opponentStats.bodyweightKg;
	const yourSharedVolumeBw = hasSharedStrength ? sharedExerciseIds.reduce((sum, exerciseId) => {
		const exercise = yourStats.exerciseStats.get(exerciseId);
		return sum + (exercise ? exercise.volumeKg / yourStats.bodyweightKg : 0);
	}, 0) : null;
	const opponentSharedVolumeBw = hasSharedStrength ? sharedExerciseIds.reduce((sum, exerciseId) => {
		const exercise = opponentStats.exerciseStats.get(exerciseId);
		return sum + (exercise ? exercise.volumeKg / opponentStats.bodyweightKg : 0);
	}, 0) : null;
	const yourSharedOrmBw = hasSharedStrength ? sharedExerciseIds.reduce((sum, exerciseId) => {
		const exercise = yourStats.exerciseStats.get(exerciseId);
		if (!exercise) return sum;
		return sum + (exercise.isBodyweight ? (exercise.bestOrmKg + yourStats.bodyweightKg) / yourStats.bodyweightKg : exercise.bestOrmKg / yourStats.bodyweightKg);
	}, 0) : null;
	const opponentSharedOrmBw = hasSharedStrength ? sharedExerciseIds.reduce((sum, exerciseId) => {
		const exercise = opponentStats.exerciseStats.get(exerciseId);
		if (!exercise) return sum;
		return sum + (exercise.isBodyweight ? (exercise.bestOrmKg + opponentStats.bodyweightKg) / opponentStats.bodyweightKg : exercise.bestOrmKg / opponentStats.bodyweightKg);
	}, 0) : null;
	const yourWorkoutMinutes = positiveMinutes(yourStats.durationSeconds) || positiveMinutes(yourStats.lastEventDurationSeconds) || positiveMinutes(yourStats.cardioDurationSeconds);
	const opponentWorkoutMinutes = positiveMinutes(opponentStats.durationSeconds) || positiveMinutes(opponentStats.lastEventDurationSeconds) || positiveMinutes(opponentStats.cardioDurationSeconds);
	const yourCardioMinutes = positiveMinutes(yourStats.cardioDurationSeconds);
	const opponentCardioMinutes = positiveMinutes(opponentStats.cardioDurationSeconds);
	const yourCardioDensity = yourCardioMinutes ? yourStats.cardioMetMinutes / yourCardioMinutes : null;
	const opponentCardioDensity = opponentCardioMinutes ? opponentStats.cardioMetMinutes / opponentCardioMinutes : null;
	const yourOverallDensity = yourWorkoutMinutes ? (yourStrengthVolumeBw + yourStats.cardioMetMinutes) / yourWorkoutMinutes : null;
	const opponentOverallDensity = opponentWorkoutMinutes ? (opponentStrengthVolumeBw + opponentStats.cardioMetMinutes) / opponentWorkoutMinutes : null;
	const common = {
		strengthVolume: () => createMetric("strength_volume_bw", "Strength Volume / BW", yourStrengthVolumeBw, opponentStrengthVolumeBw, "x BW volume"),
		sharedVolume: () => createMetric("shared_volume_bw", "Shared Lift Volume / BW", yourSharedVolumeBw, opponentSharedVolumeBw, "x BW volume", { unavailableText: "Needs at least one shared strength lift" }),
		sharedOrm: () => createMetric("shared_orm_bw", "Shared Lift Top Set / BW", yourSharedOrmBw, opponentSharedOrmBw, "x BW strength", { unavailableText: "Needs at least one shared strength lift" }),
		cardioMet: () => createMetric("cardio_met_minutes", "Cardio MET-Minutes", yourStats.cardioMetMinutes, opponentStats.cardioMetMinutes, "MET-min"),
		cardioDuration: () => createMetric("cardio_duration", "Cardio Duration", yourStats.cardioDurationSeconds / 60, opponentStats.cardioDurationSeconds / 60, "min"),
		cardioDensity: () => createMetric("cardio_density", "Cardio Density", yourCardioDensity, opponentCardioDensity, "MET-min / min", { unavailableText: "Needs completed cardio from both lifters" }),
		overallDensity: () => createMetric("overall_density", "Overall Work Density", yourOverallDensity, opponentOverallDensity, "score / min", { unavailableText: "Needs workout time from both lifters" })
	};
	if (mode === "strength") return {
		metrics: [
			common.strengthVolume(),
			common.sharedVolume(),
			common.sharedOrm()
		],
		sharedExerciseCount: sharedExerciseIds.length
	};
	if (mode === "cardio") return {
		metrics: [
			common.cardioMet(),
			common.cardioDuration(),
			common.cardioDensity()
		],
		sharedExerciseCount: sharedExerciseIds.length
	};
	return {
		metrics: [
			common.strengthVolume(),
			common.sharedOrm(),
			common.cardioMet(),
			common.cardioDensity(),
			common.overallDensity()
		],
		sharedExerciseCount: sharedExerciseIds.length
	};
}
function isMissingBattleHeadToHeadTable(error) {
	const code = error?.code || "";
	const message = error?.message?.toLowerCase?.() || "";
	return code === "42P01" || message.includes("battle_head_to_head") && message.includes("does not exist");
}
function createEmptyHeadToHeadSummary() {
	return {
		wins: 0,
		losses: 0,
		ties: 0,
		total: 0,
		lastBattleAt: null,
		lastOutcome: null
	};
}
function normalizeStoredHeadToHeadRow(row) {
	return {
		wins: Number(row?.wins) || 0,
		losses: Number(row?.losses) || 0,
		ties: Number(row?.ties) || 0,
		total: Number(row?.total) || 0,
		lastBattleAt: row?.last_battle_at || null,
		lastOutcome: row?.last_outcome || null
	};
}
async function loadStoredHeadToHeadSummaries(userId, opponentIds) {
	if (!userId || !opponentIds?.length) return {
		rowsByOpponent: {},
		missingTable: false
	};
	const { data, error } = await supabase.from(BATTLE_HEAD_TO_HEAD_TABLE).select("opponent_id, wins, losses, ties, total, last_battle_at, last_outcome").eq("user_id", userId).in("opponent_id", opponentIds);
	if (error) {
		if (isMissingBattleHeadToHeadTable(error)) return {
			rowsByOpponent: {},
			missingTable: true
		};
		throw error;
	}
	const rowsByOpponent = {};
	for (const row of data ?? []) {
		if (!row?.opponent_id) continue;
		rowsByOpponent[row.opponent_id] = normalizeStoredHeadToHeadRow(row);
	}
	return {
		rowsByOpponent,
		missingTable: false
	};
}
async function upsertHeadToHeadSummaries(userId, summariesByOpponent = {}) {
	const payload = Object.entries(summariesByOpponent).filter(([opponentId]) => Boolean(opponentId)).map(([opponentId, summary]) => ({
		user_id: userId,
		opponent_id: opponentId,
		wins: Number(summary?.wins) || 0,
		losses: Number(summary?.losses) || 0,
		ties: Number(summary?.ties) || 0,
		total: Number(summary?.total) || 0,
		last_battle_at: summary?.lastBattleAt || null,
		last_outcome: summary?.lastOutcome || null
	}));
	if (!userId || payload.length === 0) return { missingTable: false };
	const { error } = await supabase.from(BATTLE_HEAD_TO_HEAD_TABLE).upsert(payload, { onConflict: "user_id,opponent_id" });
	if (error) {
		if (isMissingBattleHeadToHeadTable(error)) return { missingTable: true };
		throw error;
	}
	return { missingTable: false };
}
async function findPendingBattleInviteBetween(userA, userB) {
	const { data, error } = await supabase.from("battle_invites").select("id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at").eq("status", "pending").or(`and(challenger_id.eq.${userA},challenged_id.eq.${userB}),and(challenger_id.eq.${userB},challenged_id.eq.${userA})`).order("created_at", { ascending: false }).limit(1);
	if (error) throw error;
	return data?.[0] ?? null;
}
async function createBattleInvite(challengerId, challengedId, battleMode = DEFAULT_BATTLE_MODE) {
	const profilesById = await fetchProfilesByIds([challengerId, challengedId]);
	const challenger = profilesById[challengerId];
	const challenged = profilesById[challengedId];
	if (!challenger?.username || !challenged?.username) {
		const error = /* @__PURE__ */ new Error("Both users need usernames before a battle can start.");
		error.code = "missing_username";
		throw error;
	}
	const existingPending = await findPendingBattleInviteBetween(challengerId, challengedId);
	if (existingPending) return {
		...existingPending,
		reused: true
	};
	const { data, error } = await supabase.from("battle_invites").insert({
		challenger_id: challengerId,
		challenged_id: challengedId,
		battle_mode: normalizeBattleMode(battleMode)
	}).select("id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at").single();
	if (error) throw error;
	return data;
}
async function loadPendingBattleInvite(userId) {
	const { data, error } = await supabase.from("battle_invites").select("id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at").eq("challenged_id", userId).eq("status", "pending").order("created_at", { ascending: false }).limit(1);
	if (error) throw error;
	const invite = data?.[0];
	if (!invite) return null;
	const profilesById = await fetchProfilesByIds([invite.challenger_id]);
	return {
		...invite,
		challengerProfile: profilesById[invite.challenger_id] ?? null
	};
}
async function loadLatestDeclinedBattleInvite(userId) {
	const { data, error } = await supabase.from("battle_invites").select("id, challenger_id, challenged_id, status, room_id, battle_mode, created_at, responded_at").eq("challenger_id", userId).eq("status", "declined").not("responded_at", "is", null).order("responded_at", { ascending: false }).limit(1);
	if (error) throw error;
	const invite = data?.[0];
	if (!invite) return null;
	const profilesById = await fetchProfilesByIds([invite.challenged_id]);
	return {
		...invite,
		challengedProfile: profilesById[invite.challenged_id] ?? null
	};
}
async function loadHeadToHeadByOpponentLegacy(userId, opponentIds) {
	if (!userId || !opponentIds?.length) return {};
	const pairClauses = opponentIds.flatMap((opponentId) => [`and(challenger_id.eq.${userId},challenged_id.eq.${opponentId})`, `and(challenger_id.eq.${opponentId},challenged_id.eq.${userId})`]);
	const { data, error } = await supabase.from("workout_rooms").select("id, challenger_id, challenged_id, finalized_at, ended_at, created_at, status").or(pairClauses.join(",")).in("status", ["finished", "cancelled"]).not("finalized_at", "is", null).order("finalized_at", { ascending: false });
	if (error) throw error;
	const opponentIdSet = new Set(opponentIds);
	const relevantRooms = (data ?? []).filter((room) => {
		const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id;
		return opponentIdSet.has(opponentId);
	});
	if (!relevantRooms.length) return {};
	const recaps = await Promise.all(relevantRooms.map(async (room) => {
		return {
			room,
			recap: await loadBattleRecap(room.id, userId)
		};
	}));
	const headToHead = {};
	for (const { room, recap } of recaps) {
		if (!recap || recap.status === "waiting") continue;
		const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id;
		const existing = headToHead[opponentId] || {
			wins: 0,
			losses: 0,
			ties: 0,
			total: 0,
			lastBattleAt: null,
			lastOutcome: null
		};
		existing.total += 1;
		if (recap.winner === "you") existing.wins += 1;
		else if (recap.winner === "opponent") existing.losses += 1;
		else existing.ties += 1;
		if (!existing.lastBattleAt) {
			existing.lastBattleAt = room.finalized_at || room.ended_at || room.created_at || null;
			existing.lastOutcome = recap.winner === "you" ? "win" : recap.winner === "opponent" ? "loss" : "tie";
		}
		headToHead[opponentId] = existing;
	}
	return headToHead;
}
async function rebuildHeadToHeadSummaries(userId, opponentIds) {
	const uniqueOpponentIds = [...new Set((opponentIds || []).filter(Boolean))];
	if (!userId || uniqueOpponentIds.length === 0) return {
		summaries: {},
		missingTable: false
	};
	const legacyHeadToHead = await loadHeadToHeadByOpponentLegacy(userId, uniqueOpponentIds);
	const rebuilt = Object.fromEntries(uniqueOpponentIds.map((opponentId) => [opponentId, legacyHeadToHead[opponentId] || createEmptyHeadToHeadSummary()]));
	const { missingTable } = await upsertHeadToHeadSummaries(userId, rebuilt);
	return {
		summaries: rebuilt,
		missingTable
	};
}
async function loadHeadToHeadByOpponent(userId, opponentIds) {
	const uniqueOpponentIds = [...new Set((opponentIds || []).filter(Boolean))];
	if (!userId || uniqueOpponentIds.length === 0) return {};
	const stored = await loadStoredHeadToHeadSummaries(userId, uniqueOpponentIds);
	if (stored.missingTable) return loadHeadToHeadByOpponentLegacy(userId, uniqueOpponentIds);
	const missingOpponentIds = uniqueOpponentIds.filter((opponentId) => !(opponentId in stored.rowsByOpponent));
	if (!missingOpponentIds.length) return stored.rowsByOpponent;
	const { summaries: rebuilt } = await rebuildHeadToHeadSummaries(userId, missingOpponentIds);
	return {
		...stored.rowsByOpponent,
		...rebuilt
	};
}
async function loadActiveBattleRoom(userId) {
	const { data, error } = await supabase.from("workout_rooms").select("id, invite_id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at").or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`).eq("status", "active").order("created_at", { ascending: false }).limit(1);
	if (error) throw error;
	const room = data?.[0];
	if (!room) return null;
	const { data: myLatestEvent, error: eventError } = await supabase.from("workout_room_events").select("event_type, created_at").eq("room_id", room.id).eq("user_id", userId).in("event_type", [
		"workout_finished",
		"workout_cancelled",
		"workout_stale"
	]).order("created_at", { ascending: false }).limit(1);
	if (eventError) throw eventError;
	const latestType = myLatestEvent?.[0]?.event_type;
	if (latestType === "workout_finished" || latestType === "workout_cancelled" || latestType === "workout_stale") return null;
	const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id;
	const profilesById = await fetchProfilesByIds([opponentId]);
	return {
		...room,
		opponentId,
		opponentProfile: profilesById[opponentId] ?? null
	};
}
async function loadUnseenBattleResult(userId) {
	const { data, error } = await supabase.from("workout_rooms").select("id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at, finalized_at, challenger_seen_result_at, challenged_seen_result_at").in("status", ["finished", "cancelled"]).not("finalized_at", "is", null).or(`and(challenger_id.eq.${userId},challenger_seen_result_at.is.null),and(challenged_id.eq.${userId},challenged_seen_result_at.is.null)`).order("finalized_at", { ascending: false }).limit(1);
	if (error) throw error;
	const room = data?.[0];
	if (!room) return null;
	await syncHeadToHeadSummaryForRoom(room.id, userId);
	return loadBattleRecap(room.id, userId);
}
async function markBattleResultSeen(roomId, userId) {
	const { data: room, error: roomError } = await supabase.from("workout_rooms").select("id, challenger_id, challenged_id").eq("id", roomId).single();
	if (roomError) throw roomError;
	if (!room) return;
	const seenAt = (/* @__PURE__ */ new Date()).toISOString();
	const updates = room.challenger_id === userId ? { challenger_seen_result_at: seenAt } : room.challenged_id === userId ? { challenged_seen_result_at: seenAt } : null;
	if (!updates) return;
	const { error } = await supabase.from("workout_rooms").update(updates).eq("id", roomId);
	if (error) throw error;
}
async function respondToBattleInvite(invite, action) {
	if (action === "declined") {
		const { error } = await supabase.from("battle_invites").update({
			status: "declined",
			responded_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", invite.id);
		if (error) throw error;
		return null;
	}
	const { data: room, error: roomError } = await supabase.from("workout_rooms").insert({
		invite_id: invite.id,
		challenger_id: invite.challenger_id,
		challenged_id: invite.challenged_id,
		battle_mode: normalizeBattleMode(invite.battle_mode)
	}).select("id, invite_id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at").single();
	if (roomError) throw roomError;
	const { error: inviteError } = await supabase.from("battle_invites").update({
		status: "accepted",
		responded_at: (/* @__PURE__ */ new Date()).toISOString(),
		room_id: room.id
	}).eq("id", invite.id);
	if (inviteError) throw inviteError;
	return room;
}
async function publishWorkoutRoomEvent(roomId, userId, eventType, payload = {}) {
	const { error } = await supabase.from("workout_room_events").insert({
		room_id: roomId,
		user_id: userId,
		event_type: eventType,
		payload
	});
	if (error) throw error;
}
async function loadOpponentEvents(roomId, userId, limit = 100) {
	const { data, error } = await supabase.from("workout_room_events").select("id, room_id, user_id, event_type, payload, created_at").eq("room_id", roomId).neq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
	if (error) throw error;
	return data ?? [];
}
async function resolveWorkoutRoomIfComplete(roomId, userId = null) {
	const { data, error } = await supabase.from("workout_room_events").select("user_id, event_type, created_at").eq("room_id", roomId).order("created_at", { ascending: false }).limit(20);
	if (error) throw error;
	const latestByUser = /* @__PURE__ */ new Map();
	for (const row of data ?? []) if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row.event_type);
	if ([...latestByUser.values()].some((type) => type === "workout_stale")) {
		const { error: updateError } = await supabase.from("workout_rooms").update({
			status: "cancelled",
			ended_at: (/* @__PURE__ */ new Date()).toISOString(),
			finalized_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", roomId);
		if (updateError) throw updateError;
		if (userId) await syncHeadToHeadSummaryForRoom(roomId, userId);
		return true;
	}
	if ([...latestByUser.values()].some((type) => type === "workout_cancelled")) {
		const { error: updateError } = await supabase.from("workout_rooms").update({
			status: "cancelled",
			ended_at: (/* @__PURE__ */ new Date()).toISOString(),
			finalized_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", roomId);
		if (updateError) throw updateError;
		if (userId) await syncHeadToHeadSummaryForRoom(roomId, userId);
		return true;
	}
	if (latestByUser.size >= 2 && [...latestByUser.values()].every((type) => type === "workout_finished" || type === "workout_cancelled")) {
		const { error: updateError } = await supabase.from("workout_rooms").update({
			status: "finished",
			ended_at: (/* @__PURE__ */ new Date()).toISOString(),
			finalized_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", roomId);
		if (updateError) throw updateError;
		if (userId) await syncHeadToHeadSummaryForRoom(roomId, userId);
		return true;
	}
	return false;
}
async function syncHeadToHeadSummaryForRoom(roomId, userId) {
	if (!roomId || !userId) return { missingTable: false };
	const { data: room, error } = await supabase.from("workout_rooms").select("challenger_id, challenged_id, status").eq("id", roomId).single();
	if (error) throw error;
	if (!room || room.status !== "finished" && room.status !== "cancelled") return { missingTable: false };
	const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenged_id === userId ? room.challenger_id : null;
	if (!opponentId) return { missingTable: false };
	const { missingTable } = await rebuildHeadToHeadSummaries(userId, [opponentId]);
	return { missingTable };
}
async function loadBattleRecap(roomId, userId) {
	const [{ data: room, error: roomError }, { data: events, error: eventsError }] = await Promise.all([supabase.from("workout_rooms").select("id, challenger_id, challenged_id, status, battle_mode, created_at, ended_at, finalized_at").eq("id", roomId).single(), supabase.from("workout_room_events").select("id, room_id, user_id, event_type, payload, created_at").eq("room_id", roomId).order("created_at", { ascending: true })]);
	if (roomError) throw roomError;
	if (eventsError) throw eventsError;
	if (!room) return null;
	const battleMode = normalizeBattleMode(room.battle_mode);
	const opponentId = room.challenger_id === userId ? room.challenged_id : room.challenger_id;
	const profilesById = await fetchProfilesByIds([userId, opponentId]);
	const bodyweightsById = resolveBattleBodyweights(profilesById, userId, opponentId);
	const exerciseIds = [...new Set((events ?? []).filter((event) => event.event_type === "set_completed").map((event) => event.payload?.exerciseId).filter(Boolean))];
	const exercisesById = exerciseIds.length ? Object.fromEntries(((await supabase.from("exercises").select("id, category, equipment, name").in("id", exerciseIds)).data ?? []).map((exercise) => [exercise.id, exercise])) : {};
	const makeStats = (id) => ({
		userId: id,
		name: profilesById[id]?.full_name || profilesById[id]?.username || "Unknown lifter",
		bodyweightKg: bodyweightsById[id],
		totalSets: 0,
		totalExercises: 0,
		totalVolume: 0,
		totalVolumeKg: 0,
		strengthVolumeKg: 0,
		cardioDurationSeconds: 0,
		cardioMetMinutes: 0,
		unit: "kg",
		durationSeconds: null,
		lastEventDurationSeconds: null,
		finished: false,
		cancelled: false,
		stale: false,
		exercises: /* @__PURE__ */ new Set(),
		exerciseStats: /* @__PURE__ */ new Map(),
		setLedger: /* @__PURE__ */ new Map()
	});
	const statsByUser = new Map([[room.challenger_id, makeStats(room.challenger_id)], [room.challenged_id, makeStats(room.challenged_id)]]);
	for (const event of events ?? []) {
		const stats = statsByUser.get(event.user_id);
		if (!stats) continue;
		const payload = event.payload || {};
		if (event.event_type === "exercise_added") {
			for (const name of payload.exerciseNames || []) if (name) stats.exercises.add(name);
		}
		if (event.event_type === "set_completed" || event.event_type === "set_removed") {
			const fallbackExerciseId = payload.exerciseName || `${event.user_id}-${payload.setNumber || "set"}`;
			const exerciseId = payload.exerciseId || fallbackExerciseId;
			const exerciseMeta = exercisesById[exerciseId] || null;
			const exerciseName = payload.exerciseName || exerciseMeta?.name || "Exercise";
			const unit = payload.unit || stats.unit || "kg";
			const ledgerKey = `${exerciseId}:${Number(payload.setNumber) || 1}`;
			const durationSeconds = Number(payload.durationSeconds ?? payload.duration_seconds);
			const category = payload.category || exerciseMeta?.category || (Number.isFinite(durationSeconds) && durationSeconds > 0 ? "Cardio" : "Strength");
			stats.unit = unit;
			if (exerciseName) stats.exercises.add(exerciseName);
			if (event.event_type === "set_completed") stats.setLedger.set(ledgerKey, {
				exerciseId,
				exerciseName,
				category,
				unit,
				weight: Number(payload.weight) || 0,
				reps: Number(payload.reps) || 0,
				durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0,
				met: Number(payload.met) || CARDIO_MET[exerciseName] || FALLBACK_CARDIO_MET,
				isBodyweight: payload.equipment === "Bodyweight" || exerciseMeta?.equipment === "Bodyweight"
			});
			else stats.setLedger.delete(ledgerKey);
		}
		if (event.event_type === "workout_finished") {
			stats.finished = true;
			stats.totalSets = payload.totalSets ?? stats.totalSets;
			stats.totalVolume = payload.totalVolume ?? stats.totalVolume;
			stats.totalVolumeKg = payload.totalVolumeKg ?? toKg(payload.totalVolume ?? stats.totalVolume, payload.unit || stats.unit || "kg");
			stats.unit = payload.unit || stats.unit || "kg";
			stats.durationSeconds = payload.durationSeconds ?? stats.durationSeconds;
			const exerciseCount = payload.totalExercises ?? payload.exerciseCount;
			if (exerciseCount && stats.exercises.size < exerciseCount) for (let i = stats.exercises.size; i < exerciseCount; i += 1) stats.exercises.add(`exercise-${i}`);
		}
		if (event.event_type === "workout_cancelled") stats.cancelled = true;
		if (event.event_type === "workout_stale") stats.stale = true;
	}
	for (const stats of statsByUser.values()) {
		stats.totalSets = stats.setLedger.size;
		stats.totalVolume = 0;
		stats.totalVolumeKg = 0;
		stats.strengthVolumeKg = 0;
		stats.cardioDurationSeconds = 0;
		stats.cardioMetMinutes = 0;
		stats.exerciseStats = /* @__PURE__ */ new Map();
		for (const setEntry of stats.setLedger.values()) {
			if (setEntry.category === "Cardio" || setEntry.durationSeconds > 0) {
				stats.cardioDurationSeconds += setEntry.durationSeconds;
				stats.cardioMetMinutes += (setEntry.met || FALLBACK_CARDIO_MET) * (setEntry.durationSeconds / 60);
				continue;
			}
			const setVolumeKg = getSetVolumeKg({
				weight: setEntry.weight,
				reps: setEntry.reps,
				unit: setEntry.unit,
				equipment: setEntry.isBodyweight ? "Bodyweight" : null,
				bodyweightKg: stats.bodyweightKg
			});
			const setVolume = setEntry.unit === "lbs" ? setVolumeKg * 2.20462 : setVolumeKg;
			const ormKg = toKg(calculateORM(setEntry.weight, setEntry.reps), setEntry.unit);
			stats.totalVolume += setVolume;
			stats.totalVolumeKg += setVolumeKg;
			stats.strengthVolumeKg += setVolumeKg;
			const prior = stats.exerciseStats.get(setEntry.exerciseId) || {
				id: setEntry.exerciseId,
				name: setEntry.exerciseName,
				isBodyweight: setEntry.isBodyweight,
				volumeKg: 0,
				bestOrmKg: 0
			};
			stats.exerciseStats.set(setEntry.exerciseId, {
				...prior,
				name: setEntry.exerciseName,
				isBodyweight: setEntry.isBodyweight,
				volumeKg: prior.volumeKg + setVolumeKg,
				bestOrmKg: Math.max(prior.bestOrmKg, ormKg)
			});
		}
		stats.totalExercises = stats.exercises.size;
		if (!stats.durationSeconds && room.created_at && room.status === "active") {
			const elapsed = Math.floor((Date.now() - Date.parse(room.created_at)) / 1e3);
			stats.lastEventDurationSeconds = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : null;
		}
		delete stats.exercises;
		delete stats.setLedger;
	}
	const yourStats = statsByUser.get(userId) || makeStats(userId);
	const opponentStats = statsByUser.get(opponentId) || makeStats(opponentId);
	const { metrics, sharedExerciseCount } = buildBattleMetrics(battleMode, yourStats, opponentStats);
	const points = metrics.reduce((score, metric) => {
		if (metric.winner === "you") return {
			...score,
			you: score.you + 1
		};
		if (metric.winner === "opponent") return {
			...score,
			opponent: score.opponent + 1
		};
		return score;
	}, {
		you: 0,
		opponent: 0
	});
	const status = yourStats.stale || opponentStats.stale || yourStats.cancelled || opponentStats.cancelled ? "cancelled" : yourStats.finished && opponentStats.finished ? "finished" : "waiting";
	let winner = null;
	let verdict = "";
	if (status === "finished") if (points.you !== points.opponent) {
		winner = points.you > points.opponent ? "you" : "opponent";
		verdict = winner === "you" ? `You won ${points.you}-${points.opponent} on battle metrics` : `${opponentStats.name} won ${points.opponent}-${points.you} on battle metrics`;
	} else {
		winner = "tie";
		verdict = "Split decision across the battle metrics";
	}
	else if (status === "cancelled") if (yourStats.stale || opponentStats.stale) {
		winner = null;
		verdict = "Battle voided due to inactivity";
	} else {
		winner = opponentStats.cancelled && !yourStats.cancelled ? "you" : yourStats.cancelled && !opponentStats.cancelled ? "opponent" : null;
		verdict = winner === "you" ? "Your friend left the battle" : winner === "opponent" ? "You left the battle" : "Battle cancelled";
	}
	else verdict = opponentStats.finished ? `${opponentStats.name} has finished. Waiting on final sync.` : `Waiting for ${opponentStats.name} to finish.`;
	return {
		roomId,
		battleMode,
		battleModeLabel: getBattleModeLabel(battleMode),
		created_at: room.created_at,
		ended_at: room.ended_at,
		finalized_at: room.finalized_at,
		status,
		winner,
		verdict,
		points,
		metrics,
		sharedExerciseCount,
		bodyweightFallbackUsed: bodyweightsById.fallback,
		yourStats,
		opponentStats,
		opponentName: opponentStats.name
	};
}
//#endregion
//#region node_modules/@capacitor/local-notifications/dist/esm/definitions.js
/**
* Day of the week. Used for scheduling notifications on a particular weekday.
*/
var Weekday;
(function(Weekday) {
	Weekday[Weekday["Sunday"] = 1] = "Sunday";
	Weekday[Weekday["Monday"] = 2] = "Monday";
	Weekday[Weekday["Tuesday"] = 3] = "Tuesday";
	Weekday[Weekday["Wednesday"] = 4] = "Wednesday";
	Weekday[Weekday["Thursday"] = 5] = "Thursday";
	Weekday[Weekday["Friday"] = 6] = "Friday";
	Weekday[Weekday["Saturday"] = 7] = "Saturday";
})(Weekday || (Weekday = {}));
//#endregion
//#region node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications = registerPlugin("LocalNotifications", { web: () => __vitePreload(() => import("./web-CJtBSa66.js").then((m) => new m.LocalNotificationsWeb()), __vite__mapDeps([2,1])) });
//#endregion
//#region src/lib/restNotification.js
var NOTIF_IDS = {
	workout: "rest-workout",
	quick: "rest-quick"
};
var NATIVE_NOTIF_IDS = {
	workout: 41001,
	quick: 41002
};
var USE_NATIVE_NOTIFICATIONS = Capacitor.getPlatform() !== "web";
var TIMER_STORAGE_KEY = "restTimerTargets";
function saveTimerTarget(id, targetMs, title, body) {
	try {
		const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || "{}");
		stored[id] = {
			targetMs,
			title,
			body
		};
		localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored));
	} catch {}
}
function clearTimerTarget(id) {
	try {
		const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || "{}");
		delete stored[id];
		localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored));
	} catch {}
}
function checkMissedTimers() {
	try {
		const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || "{}");
		const now = Date.now();
		if (USE_NATIVE_NOTIFICATIONS) {
			for (const [id, { targetMs }] of Object.entries(stored)) if (now >= targetMs) delete stored[id];
			localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored));
			return;
		}
		if (Notification.permission !== "granted") return;
		for (const [id, { targetMs, title, body }] of Object.entries(stored)) if (now >= targetMs) {
			new Notification(title, { body });
			delete stored[id];
		}
		localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored));
	} catch {}
}
async function getServiceWorker() {
	if (USE_NATIVE_NOTIFICATIONS) return null;
	if (!("serviceWorker" in navigator)) return null;
	try {
		return (await navigator.serviceWorker.ready).active || null;
	} catch {
		return null;
	}
}
async function requestNotificationPermission() {
	if (USE_NATIVE_NOTIFICATIONS) try {
		if ((await LocalNotifications.checkPermissions()).display === "granted") return true;
		return (await LocalNotifications.requestPermissions()).display === "granted";
	} catch {
		return false;
	}
	if (!("Notification" in window)) return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	return await Notification.requestPermission() === "granted";
}
async function scheduleRestEndNotification(seconds, exerciseName, options = {}) {
	const kind = options.kind === "quick" ? "quick" : "workout";
	const id = NOTIF_IDS[kind];
	const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
	await cancelRestNotification(kind);
	if (safeSeconds <= 0) return;
	if (!await requestNotificationPermission()) return;
	const title = options.title || (kind === "quick" ? "Timer Complete" : "Rest Over");
	const body = options.body || (kind === "quick" ? "Your quick rest timer has finished." : exerciseName ? `${exerciseName} rest is complete.` : "Time to hit your next set.");
	const targetMs = Date.now() + safeSeconds * 1e3;
	saveTimerTarget(id, targetMs, title, body);
	if (USE_NATIVE_NOTIFICATIONS) {
		try {
			await LocalNotifications.schedule({ notifications: [{
				id: NATIVE_NOTIF_IDS[kind],
				title,
				body,
				schedule: {
					at: new Date(targetMs),
					allowWhileIdle: true
				}
			}] });
		} catch {}
		return;
	}
	const sw = await getServiceWorker();
	if (sw) sw.postMessage({
		type: "SCHEDULE_NOTIFICATION",
		id,
		delayMs: safeSeconds * 1e3,
		title,
		body
	});
	else setTimeout(() => {
		if (Notification.permission === "granted") {
			new Notification(title, { body });
			clearTimerTarget(id);
		}
	}, safeSeconds * 1e3);
}
async function cancelRestNotification(kind = "workout") {
	const ids = kind === "all" ? Object.values(NOTIF_IDS) : [NOTIF_IDS[kind] || NOTIF_IDS.workout];
	ids.forEach((id) => clearTimerTarget(id));
	if (USE_NATIVE_NOTIFICATIONS) {
		const nativeIds = (kind === "all" ? Object.values(NATIVE_NOTIF_IDS) : [NATIVE_NOTIF_IDS[kind] || NATIVE_NOTIF_IDS.workout]).map((id) => ({ id }));
		try {
			await LocalNotifications.cancel({ notifications: nativeIds });
		} catch {}
		return;
	}
	const sw = await getServiceWorker();
	if (sw) ids.forEach((id) => sw.postMessage({
		type: "CANCEL_NOTIFICATION",
		id
	}));
}
//#endregion
//#region node_modules/@capacitor/network/dist/esm/index.js
var Network = registerPlugin("Network", { web: () => __vitePreload(() => import("./web-CKQhVdTo.js").then((m) => new m.NetworkWeb()), __vite__mapDeps([3,1])) });
//#endregion
//#region src/hooks/useNetworkStatus.js
function useNetworkStatus() {
	const [isOnline, setIsOnline] = (0, import_react.useState)(true);
	const [justCameOnline, setJustCameOnline] = (0, import_react.useState)(false);
	const wasOfflineRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		let backOnlineTimer;
		let offlineTimer;
		let listenerHandle;
		function applyStatus(connected) {
			if (connected) {
				clearTimeout(offlineTimer);
				if (wasOfflineRef.current) {
					setJustCameOnline(true);
					backOnlineTimer = setTimeout(() => setJustCameOnline(false), 2500);
				}
				wasOfflineRef.current = false;
				setIsOnline(true);
			} else {
				clearTimeout(backOnlineTimer);
				offlineTimer = setTimeout(() => {
					wasOfflineRef.current = true;
					setIsOnline(false);
					setJustCameOnline(false);
				}, 3e3);
			}
		}
		async function init() {
			try {
				const status = await Network.getStatus();
				setIsOnline(status.connected);
				wasOfflineRef.current = !status.connected;
				listenerHandle = await Network.addListener("networkStatusChange", (s) => {
					applyStatus(s.connected);
				});
			} catch {
				setIsOnline(navigator.onLine);
				wasOfflineRef.current = !navigator.onLine;
				const onOnline = () => applyStatus(true);
				const onOffline = () => applyStatus(false);
				window.addEventListener("online", onOnline);
				window.addEventListener("offline", onOffline);
				listenerHandle = { remove: () => {
					window.removeEventListener("online", onOnline);
					window.removeEventListener("offline", onOffline);
				} };
			}
		}
		init();
		return () => {
			clearTimeout(backOnlineTimer);
			clearTimeout(offlineTimer);
			listenerHandle?.remove();
		};
	}, []);
	return {
		isOnline,
		justCameOnline
	};
}
//#endregion
//#region src/context/UserContext.jsx
var UserContext = (0, import_react.createContext)(null);
function UserProvider({ user, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserContext.Provider, {
		value: user,
		children
	});
}
function useCurrentUser() {
	const user = (0, import_react.useContext)(UserContext);
	if (!user) throw new Error("useCurrentUser must be used within UserProvider");
	return user;
}
function useCurrentUserId() {
	return useCurrentUser().id;
}
//#endregion
//#region src/App.jsx
var Home = (0, import_react.lazy)(() => __vitePreload(() => import("./Home-D-js9UPy.js"), __vite__mapDeps([4,5,6,7,8,9,10,11,12])));
var Workout = (0, import_react.lazy)(() => __vitePreload(() => import("./Workout-CKbMv-Ks.js"), __vite__mapDeps([13,5,14,6,7,8,15,10,11,16,17,18])));
var Ranks = (0, import_react.lazy)(() => __vitePreload(() => import("./Ranks-DjZVOPzH.js"), __vite__mapDeps([19,5,14,6,7,8,20,17,10,11,16,18])));
var Nutrition = (0, import_react.lazy)(() => __vitePreload(() => import("./Nutrition-Cc3cYLd1.js"), __vite__mapDeps([21,5,14,7,8,6,22,10,11])));
var Profile = (0, import_react.lazy)(() => __vitePreload(() => import("./Profile-CQEQQtN0.js"), __vite__mapDeps([23,5,7,8,6,20,17,10,11,9,15,16])));
var Auth = (0, import_react.lazy)(() => __vitePreload(() => import("./Auth-CHwu9ehi.js"), __vite__mapDeps([24,5,14,1,11,7,8,6,10])));
var WorkoutSummary = (0, import_react.lazy)(() => __vitePreload(() => import("./WorkoutSummary-Bu2DD-rt.js"), __vite__mapDeps([25,5,7,8,6])));
function fmtTime(s) {
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const sec = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
	return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function fmtRest(s) {
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function displayName(profile) {
	return profile?.full_name || profile?.username || "Someone";
}
var TAB_ORDER = [
	"home",
	"workout",
	"ranks",
	"nutrition"
];
var INTRO_MIN_DURATION_MS = 900;
var INTRO_EXIT_DURATION_MS = 520;
var INTRO_BAR_SETTLE_MS = 420;
var BATTLE_REALTIME_REFRESH_DEBOUNCE_MS = 120;
var BATTLE_FOREGROUND_REFRESH_DEBOUNCE_MS = 180;
var BATTLE_FALLBACK_POLL_MS = 120 * 1e3;
function shouldIgnoreTabSwipeTarget(target) {
	if (!(target instanceof Element)) return false;
	return Boolean(target.closest("input, textarea, select, option, button, a, label, [role=\"button\"], [contenteditable=\"true\"], [draggable=\"true\"], [data-tab-swipe-ignore=\"true\"]"));
}
function getTabDirection(currentTab, nextTab) {
	const currentIndex = TAB_ORDER.indexOf(currentTab);
	const nextIndex = TAB_ORDER.indexOf(nextTab);
	if (currentIndex === -1 || nextIndex === -1 || currentIndex === nextIndex) return "forward";
	return nextIndex > currentIndex ? "forward" : "backward";
}
function BrandLogo({ width = 158, height = 36 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width,
		height,
		viewBox: "-16 0 210 48",
		xmlns: "http://www.w3.org/2000/svg",
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
	});
}
function InitialReadyMarker({ onReady }) {
	(0, import_react.useEffect)(() => {
		onReady();
	}, [onReady]);
	return null;
}
function AppIntroSplash({ exiting = false, ready = false }) {
	const barHeights = [
		18,
		28,
		40,
		28,
		18
	];
	const [progress, setProgress] = (0, import_react.useState)(0);
	const readyRef = (0, import_react.useRef)(ready);
	(0, import_react.useEffect)(() => {
		readyRef.current = ready;
	}, [ready]);
	(0, import_react.useEffect)(() => {
		const FILL_DURATION = 1450;
		const FILL_TARGET = 83;
		const CREEP_TARGET = 92;
		const CREEP_DURATION = 9e3;
		const COMPLETE_DURATION = 360;
		const startTime = Date.now();
		let phase = "filling";
		let idleStart = null;
		let completeStart = null;
		let completeFromPct = FILL_TARGET;
		let raf;
		function tick() {
			const now = Date.now();
			if (phase === "filling") {
				const t = Math.min((now - startTime) / FILL_DURATION, 1);
				setProgress((1 - Math.pow(1 - t, 3)) * FILL_TARGET);
				if (t >= 1) {
					phase = "idle";
					idleStart = now;
				}
			} else if (phase === "idle") {
				const t = Math.min((now - idleStart) / CREEP_DURATION, 1);
				const pct = FILL_TARGET + (1 - Math.pow(1 - t, 2)) * (CREEP_TARGET - FILL_TARGET);
				setProgress(pct);
				if (readyRef.current) {
					completeFromPct = pct;
					completeStart = now;
					phase = "completing";
				}
			} else if (phase === "completing") {
				const t = Math.min((now - completeStart) / COMPLETE_DURATION, 1);
				setProgress(completeFromPct + (1 - Math.pow(1 - t, 2)) * (100 - completeFromPct));
				if (t >= 1) return;
			}
			raf = requestAnimationFrame(tick);
		}
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `app-intro ${exiting ? "app-intro-exit" : ""}`,
		role: "status",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "app-intro-orb app-intro-orb-left" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "app-intro-orb app-intro-orb-right" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "app-intro-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "app-intro-logo-shell",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "app-intro-logo-aura",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "app-intro-logo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
								width: 192,
								height: 44
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "app-intro-bars",
						"aria-hidden": "true",
						children: barHeights.map((height, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "app-intro-bar",
							style: {
								height: `${height}px`,
								animationDelay: `${index * 120}ms`
							}
						}, height + index))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "app-intro-progress",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "app-intro-track",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "app-intro-track-fill",
								style: { width: `${progress}%` },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "app-intro-track-shimmer" })
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "app-intro-track-pct",
							children: [Math.round(progress), "%"]
						})]
					})
				]
			})
		]
	});
}
function App() {
	const { isOnline, justCameOnline } = useNetworkStatus();
	const [tab, setTab] = (0, import_react.useState)("home");
	const [tabTransitionDirection, setTabTransitionDirection] = (0, import_react.useState)("forward");
	const [tabTransitionTick, setTabTransitionTick] = (0, import_react.useState)(0);
	const [quickActionSheetOpen, setQuickActionSheetOpen] = (0, import_react.useState)(false);
	const [startEmptyWorkoutTick, setStartEmptyWorkoutTick] = (0, import_react.useState)(0);
	const [resumeWorkoutTick, setResumeWorkoutTick] = (0, import_react.useState)(0);
	const [openAddFoodTick, setOpenAddFoodTick] = (0, import_react.useState)(0);
	const [quickTimer, setQuickTimer] = (0, import_react.useState)(null);
	const [quickTimerValue, setQuickTimerValue] = (0, import_react.useState)(300);
	const [showQuickTimer, setShowQuickTimer] = (0, import_react.useState)(false);
	const [showQuickWeight, setShowQuickWeight] = (0, import_react.useState)(false);
	const [quickWeightInput, setQuickWeightInput] = (0, import_react.useState)("");
	const [quickWeightUnit, setQuickWeightUnit] = (0, import_react.useState)("kg");
	const [quickWeightSaving, setQuickWeightSaving] = (0, import_react.useState)(false);
	const [quickWeightError, setQuickWeightError] = (0, import_react.useState)("");
	const [weightRefreshTick, setWeightRefreshTick] = (0, import_react.useState)(0);
	const [workoutRefreshTick, setWorkoutRefreshTick] = (0, import_react.useState)(0);
	const [ranksRefreshTick, setRanksRefreshTick] = (0, import_react.useState)(0);
	const [homeWorkoutStreak, setHomeWorkoutStreak] = (0, import_react.useState)(0);
	const [showStreakInfo, setShowStreakInfo] = (0, import_react.useState)(false);
	const [session, setSession] = (0, import_react.useState)(void 0);
	const [recoveryMode, setRecoveryMode] = (0, import_react.useState)(false);
	const [workoutStatus, setWorkoutStatus] = (0, import_react.useState)({
		active: false,
		resumable: false,
		seconds: 0
	});
	const [restDoneToast, setRestDoneToast] = (0, import_react.useState)(null);
	const [workoutSummary, setWorkoutSummary] = (0, import_react.useState)(null);
	const [incomingBattleInvite, setIncomingBattleInvite] = (0, import_react.useState)(null);
	const [battleDecisionBusy, setBattleDecisionBusy] = (0, import_react.useState)(false);
	const [battleRoom, setBattleRoom] = (0, import_react.useState)(null);
	const [battleToast, setBattleToast] = (0, import_react.useState)("");
	const [initialScreenReady, setInitialScreenReady] = (0, import_react.useState)(false);
	const [showIntroSplash, setShowIntroSplash] = (0, import_react.useState)(true);
	const [introSplashExiting, setIntroSplashExiting] = (0, import_react.useState)(false);
	const [homeIntroMotionReady, setHomeIntroMotionReady] = (0, import_react.useState)(false);
	const tabRef = (0, import_react.useRef)("home");
	const battleRoomIdRef = (0, import_react.useRef)(null);
	const authUserIdRef = (0, import_react.useRef)(null);
	const lastDeclinedInviteIdRef = (0, import_react.useRef)(null);
	const surfacedBattleResultRoomIdsRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const ignoredActiveBattleRoomIdsRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const initialScreenReadyRef = (0, import_react.useRef)(false);
	const introStartedAtRef = (0, import_react.useRef)(Date.now());
	const introHideTimerRef = (0, import_react.useRef)(null);
	const introRemoveTimerRef = (0, import_react.useRef)(null);
	const homeIntroMotionTimerRef = (0, import_react.useRef)(null);
	const quickTimerNotificationRef = (0, import_react.useRef)({ scheduled: false });
	const battleRefreshTimerRef = (0, import_react.useRef)(null);
	const battleFallbackPollRef = (0, import_react.useRef)(null);
	const battleRefreshInFlightRef = (0, import_react.useRef)(false);
	const battleQueuedUserIdRef = (0, import_react.useRef)(null);
	const battleRealtimeHealthyRef = (0, import_react.useRef)(true);
	const runBattleRefreshRef = (0, import_react.useRef)(null);
	const tabSwipeRef = (0, import_react.useRef)({
		active: false,
		ignore: false,
		startX: 0,
		startY: 0
	});
	const onWorkoutStatus = (0, import_react.useCallback)((status) => setWorkoutStatus(status), []);
	const onWorkoutFinish = (0, import_react.useCallback)((summary) => {
		setWorkoutSummary(summary);
		setWorkoutRefreshTick((t) => t + 1);
	}, []);
	const markInitialScreenReady = (0, import_react.useCallback)(() => {
		if (initialScreenReadyRef.current) return;
		initialScreenReadyRef.current = true;
		setInitialScreenReady(true);
	}, []);
	const dismissIntroSplash = (0, import_react.useCallback)(() => {
		if (!showIntroSplash || introSplashExiting) return;
		const elapsed = Date.now() - introStartedAtRef.current;
		const waitMs = Math.max(INTRO_BAR_SETTLE_MS, INTRO_MIN_DURATION_MS - elapsed);
		clearTimeout(introHideTimerRef.current);
		clearTimeout(introRemoveTimerRef.current);
		introHideTimerRef.current = setTimeout(() => {
			setIntroSplashExiting(true);
			introRemoveTimerRef.current = setTimeout(() => {
				setShowIntroSplash(false);
			}, INTRO_EXIT_DURATION_MS);
		}, waitMs);
	}, [introSplashExiting, showIntroSplash]);
	const closeQuickActionSheet = (0, import_react.useCallback)(() => {
		setQuickActionSheetOpen(false);
		setShowQuickWeight(false);
		setQuickWeightError("");
	}, []);
	(0, import_react.useEffect)(() => {
		if (!showQuickWeight || !session?.user?.id) return;
		let cancelled = false;
		const timer = setTimeout(async () => {
			const { data } = await supabase.from("profiles").select("unit_preference").eq("id", session.user.id).maybeSingle();
			if (!cancelled && (data?.unit_preference === "kg" || data?.unit_preference === "lbs")) setQuickWeightUnit(data.unit_preference);
		}, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [session?.user?.id, showQuickWeight]);
	const handleQuickWeightSave = (0, import_react.useCallback)(async () => {
		const value = Number.parseFloat(quickWeightInput);
		const unit = quickWeightUnit || "kg";
		if (!session?.user?.id || quickWeightSaving) return;
		const weightError = validateBodyweight(quickWeightInput, unit);
		if (weightError) {
			setQuickWeightError(weightError);
			return;
		}
		setQuickWeightSaving(true);
		setQuickWeightError("");
		const timestamp = (/* @__PURE__ */ new Date()).toISOString();
		const { data: profileData, error: profileFetchError } = await supabase.from("profiles").select("unit_preference").eq("id", session.user.id).single();
		const unit2 = profileData?.unit_preference || quickWeightUnit || "kg";
		const [{ error: insertError }, { error: profileUpdateError }] = await Promise.all([supabase.from("body_weight_logs").insert({
			user_id: session.user.id,
			weight: value,
			unit: unit2,
			logged_at: timestamp
		}), supabase.from("profiles").update({ bodyweight: value }).eq("id", session.user.id)]);
		if (profileFetchError || insertError || profileUpdateError) {
			setQuickWeightSaving(false);
			setQuickWeightError(profileFetchError?.message || insertError?.message || profileUpdateError?.message || "Could not save your weight.");
			return;
		}
		setQuickWeightUnit(unit2);
		invalidateCache("home", "profile", "ranks", getCalendarMonthCacheKey(timestamp));
		setWeightRefreshTick((t) => t + 1);
		setQuickWeightInput("");
		setShowQuickWeight(false);
		setQuickActionSheetOpen(false);
		setQuickWeightSaving(false);
	}, [
		quickWeightInput,
		quickWeightSaving,
		quickWeightUnit,
		session?.user?.id
	]);
	const [quickTimerDisplay, setQuickTimerDisplay] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!quickTimer?.running) {
			setQuickTimerDisplay(quickTimer ? quickTimer.pausedSecondsLeft ?? 0 : 0);
			return;
		}
		const tick = () => {
			setQuickTimerDisplay(Math.max(0, Math.ceil((quickTimer.endTime - Date.now()) / 1e3)));
		};
		tick();
		const interval = setInterval(tick, 250);
		return () => clearInterval(interval);
	}, [quickTimer]);
	(0, import_react.useEffect)(() => {
		if (!quickTimer) {
			if (quickTimerNotificationRef.current.scheduled) {
				cancelRestNotification("quick");
				quickTimerNotificationRef.current.scheduled = false;
			}
			return;
		}
		if (!quickTimer.running) {
			if (quickTimerNotificationRef.current.scheduled && quickTimer.endTime > Date.now()) {
				cancelRestNotification("quick");
				quickTimerNotificationRef.current.scheduled = false;
			}
			return;
		}
		scheduleRestEndNotification(Math.max(0, Math.ceil((quickTimer.endTime - Date.now()) / 1e3)), null, {
			kind: "quick",
			title: "Timer Complete",
			body: "Your quick rest timer has finished."
		});
		quickTimerNotificationRef.current.scheduled = true;
	}, [
		quickTimer?.endTime,
		quickTimer?.running,
		!!quickTimer
	]);
	const navigateToTab = (0, import_react.useCallback)((nextTab) => {
		const currentTab = tabRef.current;
		if (!nextTab || nextTab === currentTab) return;
		setQuickActionSheetOpen(false);
		setTabTransitionDirection(getTabDirection(currentTab, nextTab));
		setTabTransitionTick((tick) => tick + 1);
		setTab(nextTab);
	}, []);
	const refreshBattleSummary = (0, import_react.useCallback)(async (roomId) => {
		const userId = session?.user?.id;
		if (!roomId || !userId) return;
		try {
			const battle = await loadBattleRecap(roomId, userId);
			if (!battle) return;
			if (battle.status !== "waiting") surfacedBattleResultRoomIdsRef.current.add(roomId);
			setWorkoutSummary((prev) => prev?.battle?.roomId === roomId ? {
				...prev,
				battle
			} : prev);
		} catch {}
	}, [session?.user?.id]);
	const maybeShowPendingBattleResult = (0, import_react.useCallback)(async (userId, hasActiveRoom) => {
		if (!userId || hasActiveRoom) return;
		try {
			const battle = await loadUnseenBattleResult(userId);
			if (!battle) return;
			if (surfacedBattleResultRoomIdsRef.current.has(battle.roomId)) return;
			surfacedBattleResultRoomIdsRef.current.add(battle.roomId);
			ignoredActiveBattleRoomIdsRef.current.delete(battle.roomId);
			setWorkoutSummary((prev) => {
				if (prev?.battle?.roomId === battle.roomId) return {
					...prev,
					battle,
					battleOnly: prev.battleOnly || false
				};
				if (prev) return prev;
				return {
					durationSeconds: battle.yourStats.durationSeconds ?? 0,
					totalSets: battle.yourStats.totalSets ?? 0,
					totalVolume: Math.round(battle.yourStats.totalVolume ?? 0),
					unit: battle.yourStats.unit || "kg",
					exercises: [],
					rankUps: [],
					newAchievements: [],
					battle,
					battleOnly: true
				};
			});
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		if (workoutStatus.restTimer?.secondsLeft === 0) setRestDoneToast((current) => current || "workout");
	}, [workoutStatus.restTimer?.secondsLeft]);
	(0, import_react.useEffect)(() => {
		if (!quickTimer?.running || quickTimerDisplay !== 0) return;
		if (Date.now() < quickTimer.endTime) return;
		setQuickTimer((current) => current ? {
			...current,
			running: false
		} : null);
		setRestDoneToast((current) => current || "quick");
	}, [
		quickTimer?.running,
		quickTimer?.endTime,
		quickTimerDisplay
	]);
	const dismissRestDoneToast = (0, import_react.useCallback)(() => {
		if (restDoneToast === "quick" && quickTimerDisplay === 0) {
			setQuickTimer(null);
			setShowQuickTimer(false);
		}
		setRestDoneToast(null);
	}, [quickTimerDisplay, restDoneToast]);
	(0, import_react.useEffect)(() => {
		tabRef.current = tab;
	}, [tab]);
	(0, import_react.useEffect)(() => {
		if (!battleToast) return void 0;
		const timer = setTimeout(() => setBattleToast(""), 1800);
		return () => clearTimeout(timer);
	}, [battleToast]);
	(0, import_react.useEffect)(() => {
		const pendingRecovery = localStorage.getItem("microload:pendingRecovery") === "1";
		const urlParams = new URLSearchParams(window.location.search);
		const hashParams = new URLSearchParams(window.location.hash.slice(1));
		const isRecoveryUrl = urlParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			if (session && pendingRecovery && !isRecoveryUrl) {
				localStorage.removeItem("microload:pendingRecovery");
				await supabase.auth.signOut();
				return;
			}
			authUserIdRef.current = session?.user?.id ?? null;
			const { applyTheme } = await __vitePreload(async () => {
				const { applyTheme } = await import("./theme-CXEPPnky.js").then((n) => n.a);
				return { applyTheme };
			}, __vite__mapDeps([26,5]));
			applyTheme(localStorage.getItem("theme") || "obsidian");
			if (session?.user?.id) supabase.from("profiles").select("theme").eq("id", session.user.id).single().then(({ data }) => {
				if (data?.theme) {
					localStorage.setItem("theme", data.theme);
					applyTheme(data.theme);
				}
			});
			setSession(session);
		});
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "PASSWORD_RECOVERY") {
				setRecoveryMode(true);
				setSession(session);
				return;
			}
			if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && localStorage.getItem("microload:pendingRecovery") === "1") {
				setRecoveryMode(true);
				setSession(session);
				return;
			}
			if (event === "SIGNED_OUT") {
				localStorage.removeItem("microload:pendingRecovery");
				setRecoveryMode(false);
			}
			const nextUserId = session?.user?.id ?? null;
			const prevUserId = authUserIdRef.current;
			if (prevUserId !== nextUserId) {
				clearCache();
				authUserIdRef.current = nextUserId;
				if (nextUserId && !prevUserId) supabase.from("profiles").select("theme").eq("id", nextUserId).single().then(({ data }) => {
					if (data?.theme) {
						localStorage.setItem("theme", data.theme);
						__vitePreload(async () => {
							const { applyTheme } = await import("./theme-CXEPPnky.js").then((n) => n.a);
							return { applyTheme };
						}, __vite__mapDeps([26,5])).then(({ applyTheme }) => applyTheme(data.theme));
					}
				});
			}
			setSession(session);
		});
		let deepLinkListener;
		App$1.addListener("appUrlOpen", async ({ url }) => {
			if (!url.startsWith("microload://")) return;
			const parsed = new URL(url);
			const code = parsed.searchParams.get("code");
			const type = parsed.searchParams.get("type");
			if (code) {
				await supabase.auth.exchangeCodeForSession(code);
				if (type === "recovery") {
					localStorage.setItem("microload:pendingRecovery", "1");
					setRecoveryMode(true);
				}
				return;
			}
			const params = new URLSearchParams(parsed.hash.slice(1));
			const accessToken = params.get("access_token");
			const refreshToken = params.get("refresh_token");
			if (params.get("type") === "recovery" && accessToken && refreshToken) {
				localStorage.setItem("microload:pendingRecovery", "1");
				await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken
				});
				setRecoveryMode(true);
			}
		}).then((handle) => {
			deepLinkListener = handle;
		});
		return () => {
			subscription.unsubscribe();
			deepLinkListener?.remove();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (session === void 0 || !initialScreenReady) return;
		dismissIntroSplash();
	}, [
		dismissIntroSplash,
		initialScreenReady,
		session
	]);
	(0, import_react.useEffect)(() => () => {
		clearTimeout(introHideTimerRef.current);
		clearTimeout(introRemoveTimerRef.current);
		clearTimeout(homeIntroMotionTimerRef.current);
	}, []);
	(0, import_react.useEffect)(() => {
		clearTimeout(homeIntroMotionTimerRef.current);
		setHomeIntroMotionReady(false);
	}, [session?.user?.id]);
	(0, import_react.useEffect)(() => {
		if (showIntroSplash || !session?.user?.id || homeIntroMotionReady) return;
		homeIntroMotionTimerRef.current = setTimeout(() => {
			setHomeIntroMotionReady(true);
		}, 180);
		return () => clearTimeout(homeIntroMotionTimerRef.current);
	}, [
		homeIntroMotionReady,
		session?.user?.id,
		showIntroSplash
	]);
	(0, import_react.useEffect)(() => {
		const userId = session?.user?.id;
		if (!userId) {
			lastDeclinedInviteIdRef.current = null;
			surfacedBattleResultRoomIdsRef.current = /* @__PURE__ */ new Set();
			ignoredActiveBattleRoomIdsRef.current = /* @__PURE__ */ new Set();
			return;
		}
		try {
			lastDeclinedInviteIdRef.current = localStorage.getItem(`battleDeclinedSeen:${userId}`);
		} catch {
			lastDeclinedInviteIdRef.current = null;
		}
		surfacedBattleResultRoomIdsRef.current = /* @__PURE__ */ new Set();
		ignoredActiveBattleRoomIdsRef.current = /* @__PURE__ */ new Set();
	}, [session?.user?.id]);
	(0, import_react.useEffect)(() => {
		const roomId = workoutSummary?.battle?.roomId;
		if (!roomId || workoutSummary?.battle?.status === "waiting") return;
		surfacedBattleResultRoomIdsRef.current.add(roomId);
	}, [workoutSummary]);
	const refreshBattleState = (0, import_react.useCallback)(async (userId) => {
		if (!userId) return;
		const [invite, room, declinedInvite] = await Promise.all([
			loadPendingBattleInvite(userId),
			loadActiveBattleRoom(userId),
			loadLatestDeclinedBattleInvite(userId)
		]);
		const visibleRoom = room?.id && ignoredActiveBattleRoomIdsRef.current.has(room.id) ? null : room;
		setIncomingBattleInvite(invite);
		setBattleRoom(visibleRoom);
		if (visibleRoom?.id && battleRoomIdRef.current !== visibleRoom.id) {
			battleRoomIdRef.current = visibleRoom.id;
			navigateToTab("workout");
			setBattleToast(`${displayName(visibleRoom.opponentProfile)} is ready to battle.`);
		} else if (!visibleRoom) battleRoomIdRef.current = null;
		if (declinedInvite?.id && declinedInvite.id !== lastDeclinedInviteIdRef.current) {
			lastDeclinedInviteIdRef.current = declinedInvite.id;
			try {
				localStorage.setItem(`battleDeclinedSeen:${userId}`, declinedInvite.id);
			} catch {}
			setBattleToast(`${displayName(declinedInvite.challengedProfile)} declined your battle challenge.`);
		}
		await maybeShowPendingBattleResult(userId, Boolean(visibleRoom));
	}, [maybeShowPendingBattleResult, navigateToTab]);
	const clearBattleRefreshTimer = (0, import_react.useCallback)(() => {
		clearTimeout(battleRefreshTimerRef.current);
		battleRefreshTimerRef.current = null;
	}, []);
	const clearBattleFallbackPoll = (0, import_react.useCallback)(() => {
		clearInterval(battleFallbackPollRef.current);
		battleFallbackPollRef.current = null;
	}, []);
	const runBattleRefresh = (0, import_react.useCallback)(async (userId) => {
		if (!userId) return;
		if (battleRefreshInFlightRef.current) {
			battleQueuedUserIdRef.current = userId;
			return;
		}
		battleRefreshInFlightRef.current = true;
		try {
			await refreshBattleState(userId);
		} finally {
			battleRefreshInFlightRef.current = false;
			const queuedUserId = battleQueuedUserIdRef.current;
			if (queuedUserId) {
				battleQueuedUserIdRef.current = null;
				Promise.resolve().then(() => runBattleRefreshRef.current?.(queuedUserId)).catch((err) => console.error("battle refresh failed:", err));
			}
		}
	}, [refreshBattleState]);
	runBattleRefreshRef.current = runBattleRefresh;
	const scheduleBattleRefresh = (0, import_react.useCallback)((userId, { delayMs = 0 } = {}) => {
		if (!userId) return;
		clearBattleRefreshTimer();
		if (delayMs <= 0) {
			runBattleRefresh(userId).catch((err) => console.error("battle refresh failed:", err));
			return;
		}
		battleRefreshTimerRef.current = setTimeout(() => {
			battleRefreshTimerRef.current = null;
			runBattleRefresh(userId).catch((err) => console.error("battle refresh failed:", err));
		}, delayMs);
	}, [clearBattleRefreshTimer, runBattleRefresh]);
	const restartBattleFallbackPoll = (0, import_react.useCallback)((userId) => {
		clearBattleFallbackPoll();
		if (!userId || battleRealtimeHealthyRef.current) return;
		battleFallbackPollRef.current = setInterval(() => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
			scheduleBattleRefresh(userId);
		}, BATTLE_FALLBACK_POLL_MS);
	}, [clearBattleFallbackPoll, scheduleBattleRefresh]);
	(0, import_react.useEffect)(() => {
		const userId = session?.user?.id;
		if (!userId) {
			clearBattleRefreshTimer();
			clearBattleFallbackPoll();
			battleRefreshInFlightRef.current = false;
			battleQueuedUserIdRef.current = null;
			battleRealtimeHealthyRef.current = true;
			setIncomingBattleInvite(null);
			setBattleRoom(null);
			battleRoomIdRef.current = null;
			return;
		}
		battleRealtimeHealthyRef.current = true;
		scheduleBattleRefresh(userId);
		const scheduleRealtimeRefresh = () => {
			scheduleBattleRefresh(userId, { delayMs: BATTLE_REALTIME_REFRESH_DEBOUNCE_MS });
		};
		const scheduleForegroundRefresh = () => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
			scheduleBattleRefresh(userId, { delayMs: BATTLE_FOREGROUND_REFRESH_DEBOUNCE_MS });
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState !== "visible") return;
			scheduleForegroundRefresh();
		};
		const handleChannelStatus = (status) => {
			if (status === "SUBSCRIBED") {
				const wasHealthy = battleRealtimeHealthyRef.current;
				battleRealtimeHealthyRef.current = true;
				clearBattleFallbackPoll();
				if (!wasHealthy) scheduleBattleRefresh(userId);
				return;
			}
			if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
				battleRealtimeHealthyRef.current = false;
				restartBattleFallbackPoll(userId);
			}
		};
		const channel = supabase.channel(`battle-updates-${userId}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "battle_invites",
			filter: `challenged_id=eq.${userId}`
		}, scheduleRealtimeRefresh).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "battle_invites",
			filter: `challenger_id=eq.${userId}`
		}, scheduleRealtimeRefresh).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "workout_rooms",
			filter: `challenger_id=eq.${userId}`
		}, scheduleRealtimeRefresh).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "workout_rooms",
			filter: `challenged_id=eq.${userId}`
		}, scheduleRealtimeRefresh).subscribe(handleChannelStatus);
		window.addEventListener("focus", scheduleForegroundRefresh);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			clearBattleRefreshTimer();
			clearBattleFallbackPoll();
			battleQueuedUserIdRef.current = null;
			window.removeEventListener("focus", scheduleForegroundRefresh);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			supabase.removeChannel(channel);
		};
	}, [
		clearBattleFallbackPoll,
		clearBattleRefreshTimer,
		restartBattleFallbackPoll,
		scheduleBattleRefresh,
		session?.user?.id
	]);
	(0, import_react.useEffect)(() => {
		const userId = session?.user?.id;
		if (!userId || !justCameOnline) return;
		scheduleBattleRefresh(userId);
	}, [
		justCameOnline,
		scheduleBattleRefresh,
		session?.user?.id
	]);
	async function handleChallengeFriend(friendship, battleMode = "hybrid") {
		const userId = session?.user?.id;
		if (!userId) return;
		setBattleToast((await createBattleInvite(userId, friendship.otherUserId, battleMode))?.reused ? `A challenge with ${displayName(friendship.otherProfile)} is already pending.` : `${getBattleModeLabel(battleMode)} challenge sent to ${displayName(friendship.otherProfile)}.`);
	}
	const handleNavigate = (0, import_react.useCallback)((nextTarget) => {
		if (typeof nextTarget !== "string") return;
		navigateToTab(nextTarget);
	}, [navigateToTab]);
	const switchTabByOffset = (0, import_react.useCallback)((offset) => {
		const currentIndex = TAB_ORDER.indexOf(tab);
		if (currentIndex === -1) return;
		const nextTab = TAB_ORDER[currentIndex + offset];
		if (!nextTab) return;
		handleNavigate(nextTab);
	}, [handleNavigate, tab]);
	const handleTabSwipeStart = (0, import_react.useCallback)((event) => {
		const touch = event.touches?.[0];
		if (!touch) return;
		tabSwipeRef.current = {
			active: true,
			ignore: event.touches.length > 1 || shouldIgnoreTabSwipeTarget(event.target),
			startX: touch.clientX,
			startY: touch.clientY
		};
	}, []);
	const handleTabSwipeEnd = (0, import_react.useCallback)((event) => {
		const state = tabSwipeRef.current;
		tabSwipeRef.current = {
			active: false,
			ignore: false,
			startX: 0,
			startY: 0
		};
		if (!state.active || state.ignore) return;
		const touch = event.changedTouches?.[0];
		if (!touch) return;
		const deltaX = touch.clientX - state.startX;
		const deltaY = touch.clientY - state.startY;
		const absX = Math.abs(deltaX);
		const absY = Math.abs(deltaY);
		if (absX < 56) return;
		if (absX <= absY * 1.2) return;
		switchTabByOffset(deltaX < 0 ? 1 : -1);
	}, [switchTabByOffset]);
	const handleTabSwipeCancel = (0, import_react.useCallback)(() => {
		tabSwipeRef.current = {
			active: false,
			ignore: false,
			startX: 0,
			startY: 0
		};
	}, []);
	async function handleBattleInviteResponse(action) {
		if (!incomingBattleInvite || !session?.user?.id) return;
		setBattleDecisionBusy(true);
		try {
			await respondToBattleInvite(incomingBattleInvite, action);
			await refreshBattleState(session.user.id);
			if (action === "declined") setBattleToast(`You declined ${displayName(incomingBattleInvite.challengerProfile)}'s battle.`);
		} finally {
			setBattleDecisionBusy(false);
		}
	}
	const introSplash = showIntroSplash ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppIntroSplash, {
		exiting: introSplashExiting,
		ready: initialScreenReady
	}) : null;
	const appFallback = showIntroSplash ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true });
	if (session === void 0) return introSplash || /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true });
	if (!session || recoveryMode) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Suspense, {
		fallback: appFallback,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InitialReadyMarker, { onReady: markInitialScreenReady }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Auth, {
			recoveryMode,
			onRecoveryDone: () => {
				localStorage.removeItem("microload:pendingRecovery");
				setRecoveryMode(false);
			}
		})]
	}), introSplash] });
	const profileButtonLabel = displayName(session?.user?.user_metadata) || session?.user?.email || "Profile";
	const tabs = [
		{
			id: "home",
			label: "Home",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: "22",
				height: "22",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "9 22 9 12 15 12 15 22" })]
			})
		},
		{
			id: "workout",
			label: "Workout",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: "22",
				height: "22",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 8h12M6 16h12" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "2",
						y: "10",
						width: "4",
						height: "4",
						rx: "1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "18",
						y: "10",
						width: "4",
						height: "4",
						rx: "1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "6",
						y: "6",
						width: "3",
						height: "12",
						rx: "1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "15",
						y: "6",
						width: "3",
						height: "12",
						rx: "1"
					})
				]
			})
		},
		{
			id: "ranks",
			label: "Ranks",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
				width: "22",
				height: "22",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" })
			})
		},
		{
			id: "nutrition",
			label: "Nutrition",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: "22",
				height: "22",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
						cx: "12",
						cy: "12",
						rx: "10",
						ry: "4"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12c0 4.42 4.48 8 10 8s10-3.58 10-8" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12c0-1.5 1.5-3 4-4" })
				]
			})
		}
	];
	const leftTabs = tabs.slice(0, 2);
	const rightTabs = tabs.slice(2);
	const otherScreens = {
		home: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Home, {
			userId: session.user.id,
			splashDone: !showIntroSplash,
			introMotionReady: homeIntroMotionReady,
			useStartupSnapshot: !initialScreenReady,
			onNavigate: handleNavigate,
			onWorkoutStreakChange: setHomeWorkoutStreak,
			onInitialReady: markInitialScreenReady,
			weightRefreshTick,
			workoutRefreshTick,
			onWorkoutDeleted: () => setRanksRefreshTick((t) => t + 1)
		}),
		ranks: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ranks, { refreshTick: ranksRefreshTick }),
		nutrition: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Nutrition, { openAddFoodTick }),
		profile: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Profile, {
			onChallenge: handleChallengeFriend,
			onWorkoutDeleted: () => setRanksRefreshTick((t) => t + 1),
			workoutActive: workoutStatus.active
		})
	};
	const contentScreenClassName = `content-screen content-screen-${tabTransitionDirection} content-screen-${tabTransitionTick % 2}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserProvider, {
		user: session.user,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "app",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
					className: "topbar",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "topbar-inner",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "topbar-brand",
							onClick: () => handleNavigate("home"),
							"aria-label": "Go to Home",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "topbar-actions",
							children: [tab === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `topbar-home-streak ${homeWorkoutStreak === 0 ? "topbar-home-streak-none" : ""}${homeIntroMotionReady ? " topbar-home-streak--animate" : ""}`,
								onClick: () => setShowStreakInfo(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "topbar-home-streak-fire",
									children: homeWorkoutStreak > 0 ? "🔥" : "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "topbar-home-streak-text",
									children: homeWorkoutStreak > 0 ? `${homeWorkoutStreak} ${homeWorkoutStreak === 1 ? "day" : "days"} streak` : "No streak"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `topbar-profile-btn ${tab === "profile" ? "active" : ""}`,
								onClick: () => handleNavigate("profile"),
								"aria-label": `Open profile for ${profileButtonLabel}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "20",
									height: "20",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
										cx: "12",
										cy: "7",
										r: "4"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "topbar-profile-plus",
									children: "+"
								})]
							})]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "content",
					onTouchStart: handleTabSwipeStart,
					onTouchEnd: handleTabSwipeEnd,
					onTouchCancel: handleTabSwipeCancel,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Suspense, {
						fallback: appFallback,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: tab === "workout" ? contentScreenClassName : "content-screen-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Workout, {
								onStatusChange: onWorkoutStatus,
								onFinish: onWorkoutFinish,
								battleRoom,
								startEmptyWorkoutTick,
								resumeWorkoutTick,
								isVisible: tab === "workout",
								onBattleRoomClosed: (status) => {
									const closedRoomId = battleRoomIdRef.current;
									if ((status === "waiting" || status === "left") && closedRoomId) ignoredActiveBattleRoomIdsRef.current.add(closedRoomId);
									else if (closedRoomId) ignoredActiveBattleRoomIdsRef.current.delete(closedRoomId);
									setBattleRoom(null);
									battleRoomIdRef.current = null;
									if (status === "cancelled") setBattleToast("Your friend left the battle. Your workout is continuing solo.");
									else if (status === "left") setBattleToast("You left the battle.");
									else if (status === "finished") {
										setBattleToast("Battle finished.");
										if (closedRoomId) refreshBattleSummary(closedRoomId);
									}
								}
							})
						}), tab !== "workout" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: contentScreenClassName,
							children: otherScreens[tab]
						})]
					})
				}),
				workoutStatus.active && tab !== "workout" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `workout-banner ${workoutStatus.restTimer?.secondsLeft > 0 ? "workout-banner-resting" : ""}`,
					onClick: () => navigateToTab("workout"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "workout-banner-left",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "workout-banner-dot" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "workout-banner-label",
								children: workoutStatus.restTimer?.secondsLeft > 0 ? "Resting" : "Workout in progress"
							})]
						}),
						workoutStatus.restTimer?.secondsLeft > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "workout-banner-rest",
							children: fmtRest(workoutStatus.restTimer.secondsLeft)
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "workout-banner-time",
							children: fmtTime(workoutStatus.seconds)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							width: "16",
							height: "16",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2.5",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 18l6-6-6-6" })
						})
					]
				}),
				workoutSummary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: null,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkoutSummary, {
						summary: workoutSummary,
						onDismiss: async () => {
							const battleResultRoomId = workoutSummary?.battle?.roomId ?? null;
							const shouldMarkBattleSeen = Boolean(battleResultRoomId && workoutSummary?.battle && workoutSummary.battle.status !== "waiting");
							if (shouldMarkBattleSeen) surfacedBattleResultRoomIdsRef.current.add(battleResultRoomId);
							setWorkoutSummary(null);
							if (shouldMarkBattleSeen && session?.user?.id) try {
								await markBattleResultSeen(battleResultRoomId, session.user.id);
							} catch {}
						}
					})
				}),
				incomingBattleInvite && !battleRoom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-invite-overlay",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "battle-invite-modal",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-invite-pill",
								children: "Battle Invite"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-invite-title",
								children: `${displayName(incomingBattleInvite.challengerProfile)} challenged you`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-invite-body",
								children: `${getBattleModeLabel(incomingBattleInvite.battle_mode)} battle. Accept to jump into a shared workout. You will both start in a new empty workout, and completed sets will update live.`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "battle-invite-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "battle-invite-decline",
									onClick: () => handleBattleInviteResponse("declined"),
									disabled: battleDecisionBusy,
									children: battleDecisionBusy ? "Working..." : "Decline"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "battle-invite-accept",
									onClick: () => handleBattleInviteResponse("accepted"),
									disabled: battleDecisionBusy,
									children: battleDecisionBusy ? "Working..." : "Accept"
								})]
							})
						]
					})
				}),
				battleToast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-toast",
					onClick: () => setBattleToast(""),
					children: battleToast
				}),
				restDoneToast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rest-done-overlay",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rest-done-modal",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rest-done-icon",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
									width: "28",
									height: "28",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "20 6 9 17 4 12" })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rest-done-title",
								children: restDoneToast === "quick" ? "Timer Complete" : "Rest Complete"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rest-done-body",
								children: restDoneToast === "quick" ? "Your quick rest timer has finished." : "Your workout rest timer has finished."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rest-done-btn",
								onClick: dismissRestDoneToast,
								children: "OK"
							})
						]
					})
				}),
				showStreakInfo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rest-done-overlay",
					onClick: () => setShowStreakInfo(false),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rest-done-modal streak-info-modal",
						onClick: (event) => event.stopPropagation(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rest-done-icon streak-info-icon",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🔥" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rest-done-title",
								children: "Streak Info"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rest-done-body streak-info-body",
								children: "Your streak stays alive as long as you do not miss more than 3 days in a row without a workout. If you go 4 straight days without training, your streak resets."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rest-done-btn",
								onClick: () => setShowStreakInfo(false),
								children: "OK"
							})
						]
					})
				}),
				quickActionSheetOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "quick-action-overlay",
					"data-tab-swipe-ignore": "true",
					onClick: () => {
						closeQuickActionSheet();
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "quick-action-sheet",
						onClick: (event) => event.stopPropagation(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "quick-action-handle" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "quick-action-title",
								children: "Quick Add"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "quick-action-btn quick-action-btn-primary",
								onClick: () => {
									closeQuickActionSheet();
									if (workoutStatus.resumable) {
										navigateToTab("workout");
										setResumeWorkoutTick((t) => t + 1);
									} else {
										navigateToTab("workout");
										setStartEmptyWorkoutTick((t) => t + 1);
									}
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 8h12M6 16h12" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
											x: "2",
											y: "10",
											width: "4",
											height: "4",
											rx: "1"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
											x: "18",
											y: "10",
											width: "4",
											height: "4",
											rx: "1"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
											x: "6",
											y: "6",
											width: "3",
											height: "12",
											rx: "1"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
											x: "15",
											y: "6",
											width: "3",
											height: "12",
											rx: "1"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: workoutStatus.resumable ? "Resume Workout" : "Start Empty Workout" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "quick-action-btn quick-action-btn-secondary",
								onClick: () => {
									closeQuickActionSheet();
									navigateToTab("nutrition");
									setOpenAddFoodTick((t) => t + 1);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M11 2a2 2 0 012 2" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17 6c1.7 1.4 3 3.7 3 7 0 4.4-3.6 8-8 8S4 17.4 4 13c0-3.3 1.3-5.6 3-7" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 6v4" })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Log Food" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `quick-action-btn quick-action-btn-secondary ${showQuickWeight ? "quick-action-btn-timer-active" : ""}`,
								onClick: () => {
									setShowQuickWeight((open) => !open);
									setShowQuickTimer(false);
									setQuickWeightError("");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 4h12" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 4v4a4 4 0 0 0 8 0V4" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 8v12" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 20h6" })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add Body Weight" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `quick-action-btn quick-action-btn-secondary ${showQuickTimer || quickTimer ? "quick-action-btn-timer-active" : ""}`,
								onClick: () => {
									setShowQuickTimer((open) => !open);
									setShowQuickWeight(false);
									setQuickWeightError("");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "18",
									height: "18",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											cx: "12",
											cy: "13",
											r: "8"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 9v4l2.5 2.5" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 2h6" })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: quickTimer ? `Rest Timer ${fmtRest(quickTimerDisplay)}` : "Rest Timer" })]
							}),
							(showQuickTimer || quickTimer) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "quick-timer-card",
								children: !quickTimer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RestTimePicker, {
									value: quickTimerValue,
									onChange: setQuickTimerValue
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "quick-timer-start",
									onClick: () => setQuickTimer({
										endTime: Date.now() + quickTimerValue * 1e3,
										total: quickTimerValue,
										running: true
									}),
									children: "Start"
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "quick-timer-name",
										children: quickTimerDisplay === 0 ? "Time's up!" : "Countdown"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "quick-timer-countdown",
										style: { color: quickTimerDisplay === 0 ? "#22c55e" : "var(--blue)" },
										children: fmtRest(quickTimerDisplay)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "quick-timer-track",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "quick-timer-fill",
											style: {
												width: `${quickTimerDisplay / quickTimer.total * 100}%`,
												background: quickTimerDisplay === 0 ? "#22c55e" : "var(--blue)"
											}
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "quick-timer-actions",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "quick-timer-step",
												onClick: () => setQuickTimer((current) => {
													if (!current) return null;
													if (current.running) {
														const newEnd = Math.max(Date.now(), current.endTime - 5e3);
														return {
															...current,
															endTime: newEnd
														};
													}
													return {
														...current,
														pausedSecondsLeft: Math.max(0, (current.pausedSecondsLeft ?? 0) - 5)
													};
												}),
												children: "−5s"
											}),
											quickTimerDisplay > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "quick-timer-pause",
												onClick: () => setQuickTimer((current) => {
													if (!current) return null;
													if (current.running) return {
														...current,
														running: false,
														pausedSecondsLeft: Math.max(0, Math.ceil((current.endTime - Date.now()) / 1e3))
													};
													return {
														...current,
														running: true,
														endTime: Date.now() + (current.pausedSecondsLeft ?? 0) * 1e3
													};
												}),
												children: quickTimer.running ? "Pause" : "Resume"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "quick-timer-pause",
												onClick: () => {
													setQuickTimer(null);
													setShowQuickTimer(false);
												},
												children: "Done"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "quick-timer-step",
												onClick: () => setQuickTimer((current) => {
													if (!current) return null;
													if (current.running) return {
														...current,
														endTime: current.endTime + 5e3
													};
													return {
														...current,
														pausedSecondsLeft: (current.pausedSecondsLeft ?? 0) + 5
													};
												}),
												children: "+5s"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "quick-timer-reset",
										onClick: () => {
											setQuickTimer(null);
											setShowQuickTimer(false);
										},
										children: "Reset"
									})
								] })
							}),
							showQuickWeight && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "quick-weight-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "quick-weight-note",
										children: ["Uses your preferred unit: ", quickWeightUnit]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "quick-weight-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "quick-weight-input",
											type: "number",
											inputMode: "decimal",
											min: quickWeightUnit === "lbs" ? "44.1" : "20",
											max: quickWeightUnit === "lbs" ? "1322.8" : "600",
											step: "0.1",
											placeholder: `Enter weight (${quickWeightUnit})`,
											value: quickWeightInput,
											onChange: (event) => setQuickWeightInput(event.target.value)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "quick-weight-save",
											onClick: handleQuickWeightSave,
											disabled: quickWeightSaving || !quickWeightInput.trim(),
											children: quickWeightSaving ? "Saving..." : "Save"
										})]
									}),
									quickWeightError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "quick-weight-error",
										children: quickWeightError
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "quick-action-cancel",
								onClick: () => {
									closeQuickActionSheet();
								},
								children: "Cancel"
							})
						]
					})
				}),
				(!isOnline || justCameOnline) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `offline-banner${justCameOnline ? " offline-banner-back" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "offline-banner-dot" }), justCameOnline ? "Back online" : "No internet — changes won't save"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "tabbar",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "tabbar-group",
							children: leftTabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `tab-btn ${tab === t.id ? "active" : ""}`,
								onClick: () => handleNavigate(t.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tab-icon",
									children: t.icon
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tab-label",
									children: t.label
								})]
							}, t.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: `tab-plus-btn ${quickActionSheetOpen ? "active" : ""}`,
							onClick: () => {
								setQuickActionSheetOpen((open) => !open);
								if (quickTimer) setShowQuickTimer(true);
							},
							"aria-label": "Open quick actions",
							"data-tab-swipe-ignore": "true",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tab-plus-icon",
								children: "+"
							}), quickTimer && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tab-plus-timer-badge",
								children: fmtRest(quickTimerDisplay)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "tabbar-group",
							children: rightTabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `tab-btn ${tab === t.id ? "active" : ""}`,
								onClick: () => handleNavigate(t.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tab-icon",
									children: t.icon
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tab-label",
									children: t.label
								})]
							}, t.id))
						})
					]
				})
			]
		}), introSplash] })
	});
}
//#endregion
//#region src/components/AppErrorBoundary.jsx
var AppErrorBoundary = class extends import_react.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	static getDerivedStateFromError(error) {
		return { error };
	}
	componentDidCatch(error, info) {
		window.__MICROLOAD_LAST_ERROR = {
			error,
			info
		};
		console.error("App crashed:", error, info);
	}
	render() {
		if (this.state.error) {
			const message = this.state.error?.message || String(this.state.error);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "app-crash-screen",
				role: "alert",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "app-crash-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Something went wrong" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The app hit a startup error. Refresh and try again." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "app-crash-message",
							children: message
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => window.location.reload(),
							children: "Refresh"
						})
					]
				})
			});
		}
		return this.props.children;
	}
};
//#endregion
//#region src/context/ThemeContext.jsx
var ThemeContext = (0, import_react.createContext)(null);
function ThemeProvider({ children }) {
	const [themeId, setThemeId] = (0, import_react.useState)(getSavedTheme);
	function switchTheme(id) {
		setThemeId(id);
		saveTheme(id);
	}
	function previewTheme(id) {
		setThemeId(id);
		applyTheme(id);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeContext.Provider, {
		value: {
			themeId,
			switchTheme,
			previewTheme,
			themes: THEMES
		},
		children
	});
}
var useTheme = () => (0, import_react.useContext)(ThemeContext);
//#endregion
//#region src/main.jsx
applyTheme(getSavedTheme());
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") checkMissedTimers();
});
document.addEventListener("focusout", () => {
	if (/iPad|iPhone|iPod/.test(navigator.userAgent)) setTimeout(() => window.scrollTo(0, 0), 50);
}, true);
(0, import_client.createRoot)(document.getElementById("root")).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.StrictMode, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {}) }) }) }));
//#endregion
export { convertWeight as A, LoadingSpinner as B, validateLength as C, validateUsername as D, validatePassword as E, getWeightInputMax as F, invalidateCache as G, getCached as H, getWeightInputMin as I, setCached as K, isRepsWithinInputRange as L, getProfileBodyweightKg as M, getSetVolumeInUnit as N, DEFAULT_BODYWEIGHT_KG as O, getSetVolumeKg as P, isWeightWithinInputRange as R, validateEmail as S, validateNutritionForm as T, getCalendarMonthCacheKey as U, clearCache as V, getStartupSnapshot as W, NUTRITION_FIELD_LIMITS as _, scheduleRestEndNotification as a, trimToMax as b, loadBattleRecap as c, publishWorkoutRoomEvent as d, resolveWorkoutRoomIfComplete as f, RestTimePicker as g, calculateORM as h, cancelRestNotification as i, fromKg as j, MAX_REPS as k, loadHeadToHeadByOpponent as l, getMuscleCountMET as m, useCurrentUser as n, BATTLE_MODES as o, CARDIO_MET as p, setStartupSnapshot as q, useCurrentUserId as r, getBattleModeLabel as s, useTheme as t, loadOpponentEvents as u, VALIDATION_LIMITS as v, validateNumber as w, validateBodyweight as x, normalizeUsername as y, toKg as z };

//# sourceMappingURL=index-BNajgLSV.js.map