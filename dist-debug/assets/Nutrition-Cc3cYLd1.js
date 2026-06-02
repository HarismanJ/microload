const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/BarcodeScanner-CzLgLEgU.js","assets/rolldown-runtime-CvHMtSRF.js","assets/index-BNajgLSV.js","assets/preload-helper-CCDVmQCD.js","assets/dist-B65an-qx.js","assets/body-diagram-9cYNiocp.js","assets/react-vendor-BqgOqDvu.js","assets/drag-drop-BDqY7zvQ.js","assets/supabase-CCACEYhB.js","assets/supabase-BKYoYWHZ.js","assets/theme-CXEPPnky.js","assets/definitions-DSvdkVWR.js","assets/scanner-CdCVLrI_.js","assets/FoodEditorFields-Cn6yrGUM.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { t as __vitePreload } from "./preload-helper-CCDVmQCD.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { B as LoadingSpinner, C as validateLength, G as invalidateCache, H as getCached, K as setCached, T as validateNutritionForm, _ as NUTRITION_FIELD_LIMITS, r as useCurrentUserId, v as VALIDATION_LIMITS, w as validateNumber } from "./index-BNajgLSV.js";
import { a as buildFoodPayload, c as getFoodFormError, i as EMPTY_FOOD_FORM, o as foodFromFormValues, r as searchUsdaFoods, s as foodToFormValues, t as FoodEditorFields } from "./FoodEditorFields-Cn6yrGUM.js";
//#region src/lib/foodSearch.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var SEARCH_ALIAS_REPLACEMENTS = [
	["pb2", "peanut butter powder"],
	["pb fit", "peanut butter powder"],
	["pbfit", "peanut butter powder"],
	["pb", "peanut butter"],
	["greek yoghurt", "greek yogurt"],
	["yoghurt", "yogurt"],
	["garbanzo beans", "chickpeas"],
	["garbanzo bean", "chickpeas"],
	["chick peas", "chickpeas"],
	["aubergine", "eggplant"],
	["courgette", "zucchini"],
	["capsicum", "bell pepper"],
	["minced", "ground"],
	["mince", "ground"]
];
function normalizeSearchValue(value = "") {
	return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function applySearchAliases(value = "") {
	let normalized = ` ${normalizeSearchValue(value)} `;
	for (const [from, to] of SEARCH_ALIAS_REPLACEMENTS) normalized = normalized.split(` ${from} `).join(` ${to} `);
	return normalizeSearchValue(normalized);
}
function tokenizeSearchValue(value = "") {
	return normalizeSearchValue(value).split(/\s+/).filter(Boolean);
}
function getSearchText(food) {
	return food?.searchText || `${food?.name || ""} ${food?.brand || ""}`;
}
function getTypoTolerance(token = "") {
	if (token.length <= 3) return 0;
	if (token.length <= 5) return 1;
	return 2;
}
function getEditDistance(a = "", b = "", maxDistance = Infinity) {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
	const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
	for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
	for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
	for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) {
		const cost = a[i - 1] === b[j - 1] ? 0 : 1;
		rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
		if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + cost);
	}
	return rows[a.length][b.length];
}
function getTokenMatchScore(queryToken, candidateToken) {
	if (!queryToken || !candidateToken) return 0;
	if (queryToken === candidateToken) return 1;
	if (queryToken.length >= 4 && (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken))) return .9;
	const maxDistance = Math.min(getTypoTolerance(queryToken), getTypoTolerance(candidateToken));
	if (maxDistance <= 0) return 0;
	const distance = getEditDistance(queryToken, candidateToken, maxDistance);
	if (distance > maxDistance) return 0;
	if (distance === 1) return .82;
	return .68;
}
function getBestTokenMatchScore(queryToken, candidateTokens = []) {
	let bestScore = 0;
	for (const candidateToken of candidateTokens) {
		const score = getTokenMatchScore(queryToken, candidateToken);
		if (score > bestScore) bestScore = score;
		if (bestScore === 1) break;
	}
	return bestScore;
}
function isGenericFood(food) {
	if (typeof food?.is_branded === "boolean") return !food.is_branded;
	const dataType = String(food?.data_type || "").toLowerCase();
	if (dataType) return dataType !== "branded";
	return !food?.brand;
}
function getGenericQueryBonus(food, queryTokens = [], normalizedQuery = "") {
	if (queryTokens.length > 0 && queryTokens.length <= 2 && !/\d/.test(normalizedQuery)) return isGenericFood(food) ? 28 : -14;
	return isGenericFood(food) ? 8 : 0;
}
function matchesFoodSearch(food, query) {
	const normalizedQuery = applySearchAliases(query);
	if (!normalizedQuery) return true;
	const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
	const haystack = applySearchAliases(getSearchText(food));
	const hayTokens = tokenizeSearchValue(haystack);
	const compactHaystack = haystack.replace(/\s+/g, "");
	return tokens.every((token) => haystack.includes(token) || compactHaystack.includes(token) || getBestTokenMatchScore(token, hayTokens) >= .68);
}
function buildFoodSearchKey(food) {
	const servingSize = Number(food?.serving_size) || 0;
	const calories = Number(food?.calories) || 0;
	return [
		normalizeSearchValue(food?.name || ""),
		normalizeSearchValue(food?.brand || ""),
		servingSize,
		String(food?.serving_unit || "").toLowerCase(),
		Math.round(calories)
	].join("|");
}
function scoreFoodSearch(food, query) {
	const normalizedQuery = applySearchAliases(query);
	if (!normalizedQuery) return 0;
	const name = applySearchAliases(food?.name || "");
	const full = applySearchAliases(getSearchText(food));
	const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
	const nameTokens = tokenizeSearchValue(name);
	const fullTokens = tokenizeSearchValue(full);
	const genericBonus = getGenericQueryBonus(food, tokens, normalizedQuery);
	if (name === normalizedQuery) return 150 + genericBonus;
	if (full === normalizedQuery) return 132 + genericBonus;
	if (name.startsWith(normalizedQuery)) return 126 + genericBonus;
	if (full.startsWith(normalizedQuery)) return 112 + genericBonus;
	if (name.includes(normalizedQuery)) return 102 + genericBonus;
	if (full.includes(normalizedQuery)) return 90 + genericBonus;
	const exactNameHits = tokens.filter((token) => nameTokens.includes(token)).length;
	const exactFullHits = tokens.filter((token) => fullTokens.includes(token)).length;
	const fuzzyScore = tokens.reduce((sum, token) => sum + getBestTokenMatchScore(token, fullTokens), 0);
	if (fuzzyScore <= 0) return 0;
	return 40 + exactNameHits * 12 + exactFullHits * 6 + Math.round(fuzzyScore * 18) + genericBonus;
}
function sortFoodsForQuery(a, b, query) {
	const scoreDiff = scoreFoodSearch(b, query) - scoreFoodSearch(a, query);
	if (scoreDiff !== 0) return scoreDiff;
	const genericDiff = Number(isGenericFood(b)) - Number(isGenericFood(a));
	if (genericDiff !== 0) return genericDiff;
	const lengthDiff = (a?.name?.length || 0) - (b?.name?.length || 0);
	if (lengthDiff !== 0) return lengthDiff;
	return String(a?.name || "").localeCompare(String(b?.name || ""));
}
function matchesStoredFood(record, food) {
	return normalizeSearchValue(record?.name || "") === normalizeSearchValue(food?.name || "") && normalizeSearchValue(record?.brand || "") === normalizeSearchValue(food?.brand || "") && Math.abs((Number(record?.serving_size) || 0) - (Number(food?.serving_size) || 0)) < .001 && String(record?.serving_unit || "").toLowerCase() === String(food?.serving_unit || "").toLowerCase() && Math.abs((Number(record?.calories) || 0) - (Number(food?.calories) || 0)) < .001;
}
function mergeFoodSearchResults(localFoods = [], remoteFoods = [], query = "") {
	const seen = /* @__PURE__ */ new Set();
	const merged = [];
	for (const food of [...remoteFoods, ...localFoods]) {
		if (!matchesFoodSearch(food, query)) continue;
		const key = buildFoodSearchKey(food);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(food);
	}
	return merged.sort((a, b) => sortFoodsForQuery(a, b, query));
}
//#endregion
//#region src/components/nutrition/CreateFood.jsx
var import_jsx_runtime = require_jsx_runtime();
var UNITS = [
	"g",
	"ml",
	"oz",
	"cup",
	"tbsp",
	"tsp",
	"piece",
	"slice",
	"scoop",
	"bar",
	"serving"
];
var USDA_SEARCH_CACHE_TTL_MS$1 = 600 * 1e3;
var USER_FOODS_CACHE_TTL_MS$1 = 300 * 1e3;
var initialForm = {
	name: "",
	brand: "",
	serving_size: "100",
	serving_unit: "g",
	calories: "",
	protein: "",
	carbs: "",
	fat: "",
	fiber: "",
	sugar: "",
	saturated_fat: "",
	sodium: "",
	potassium: "",
	cholesterol: "",
	vitamin_a: "",
	vitamin_c: "",
	calcium: "",
	iron: ""
};
var initialRecipeForm = {
	name: "",
	servings: "1"
};
var RECIPE_NUMERIC_FIELDS = [
	"calories",
	"protein",
	"carbs",
	"fat",
	"fiber",
	"sugar",
	"saturated_fat",
	"sodium",
	"potassium",
	"cholesterol",
	"vitamin_a",
	"vitamin_c",
	"calcium",
	"iron"
];
var RECIPE_MICRO_ITEMS = [
	{
		key: "fiber",
		label: "Fiber",
		unit: "g"
	},
	{
		key: "sugar",
		label: "Sugar",
		unit: "g"
	},
	{
		key: "saturated_fat",
		label: "Saturated Fat",
		unit: "g"
	},
	{
		key: "sodium",
		label: "Sodium",
		unit: "mg"
	},
	{
		key: "potassium",
		label: "Potassium",
		unit: "mg"
	},
	{
		key: "cholesterol",
		label: "Cholesterol",
		unit: "mg"
	},
	{
		key: "vitamin_a",
		label: "Vitamin A",
		unit: "mcg"
	},
	{
		key: "vitamin_c",
		label: "Vitamin C",
		unit: "mg"
	},
	{
		key: "calcium",
		label: "Calcium",
		unit: "mg"
	},
	{
		key: "iron",
		label: "Iron",
		unit: "mg"
	}
];
function Field({ label, value, onChange, placeholder = "0", type = "number", unit, required, maxLength, rules }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "cf-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "cf-label",
			children: [label, required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "cf-required",
				children: " *"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "cf-input-wrap",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "cf-input",
				type,
				value,
				onChange: (e) => onChange(e.target.value),
				placeholder,
				min: type === "number" ? rules?.min ?? 0 : void 0,
				max: type === "number" ? rules?.max : void 0,
				step: type === "number" ? rules?.decimals === 0 ? 1 : .01 : void 0,
				inputMode: type === "number" ? "decimal" : void 0,
				maxLength: type === "number" ? void 0 : maxLength
			}), unit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "cf-unit",
				children: unit
			})]
		})]
	});
}
function numberOrZero(value) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
}
function roundNumber(value, decimals = 1) {
	const factor = 10 ** decimals;
	return Math.round((numberOrZero(value) + Number.EPSILON) * factor) / factor;
}
function supportsDirectAmount(food) {
	const unit = String(food?.serving_unit || "").trim().toLowerCase();
	return unit === "g" || unit === "ml";
}
function getDirectAmountUnit(food) {
	return String(food?.serving_unit || "").trim().toLowerCase() === "ml" ? "ml" : "g";
}
function getIngredientDefaults(food) {
	if (supportsDirectAmount(food)) {
		const servingSize = numberOrZero(food?.serving_size) || 100;
		return {
			amountMode: "direct",
			amount: String(roundNumber(servingSize, 1)),
			servings: 1
		};
	}
	return {
		amountMode: "servings",
		amount: "",
		servings: 1
	};
}
function getIngredientMultiplier(food, amountMode, amount, servings) {
	if (!food) return 0;
	if (amountMode === "direct") {
		const directAmount = Number.parseFloat(amount);
		const servingSize = numberOrZero(food?.serving_size);
		if (!Number.isFinite(directAmount) || directAmount <= 0 || servingSize <= 0) return 0;
		return directAmount / servingSize;
	}
	const servingCount = Number.parseFloat(servings);
	if (!Number.isFinite(servingCount) || servingCount <= 0) return 0;
	return servingCount;
}
function buildScaledNutrients(food, multiplier) {
	return {
		calories: Math.round(numberOrZero(food?.calories) * multiplier),
		protein: roundNumber(numberOrZero(food?.protein) * multiplier, 1),
		carbs: roundNumber(numberOrZero(food?.carbs) * multiplier, 1),
		fat: roundNumber(numberOrZero(food?.fat) * multiplier, 1),
		fiber: roundNumber(numberOrZero(food?.fiber) * multiplier, 1),
		sugar: roundNumber(numberOrZero(food?.sugar) * multiplier, 1),
		saturated_fat: roundNumber(numberOrZero(food?.saturated_fat) * multiplier, 1),
		sodium: Math.round(numberOrZero(food?.sodium) * multiplier),
		potassium: Math.round(numberOrZero(food?.potassium) * multiplier),
		cholesterol: Math.round(numberOrZero(food?.cholesterol) * multiplier),
		vitamin_a: Math.round(numberOrZero(food?.vitamin_a) * multiplier),
		vitamin_c: roundNumber(numberOrZero(food?.vitamin_c) * multiplier, 1),
		calcium: Math.round(numberOrZero(food?.calcium) * multiplier),
		iron: roundNumber(numberOrZero(food?.iron) * multiplier, 2)
	};
}
function formatIngredientAmount(entry) {
	if (entry.amountMode === "direct") return `${roundNumber(entry.amount, 1)}${entry.amountUnit}`;
	const servings = roundNumber(entry.servings, 2);
	return `${servings} serving${servings === 1 ? "" : "s"}`;
}
function buildRecipePayload(userId, recipeForm, totalsPerServing) {
	return {
		user_id: userId,
		name: recipeForm.name.trim(),
		brand: null,
		serving_size: 1,
		serving_unit: "serving",
		calories: numberOrZero(totalsPerServing.calories),
		protein: numberOrZero(totalsPerServing.protein),
		carbs: numberOrZero(totalsPerServing.carbs),
		fat: numberOrZero(totalsPerServing.fat),
		fiber: numberOrZero(totalsPerServing.fiber),
		sugar: numberOrZero(totalsPerServing.sugar),
		saturated_fat: numberOrZero(totalsPerServing.saturated_fat),
		sodium: numberOrZero(totalsPerServing.sodium),
		potassium: numberOrZero(totalsPerServing.potassium),
		cholesterol: numberOrZero(totalsPerServing.cholesterol),
		vitamin_a: numberOrZero(totalsPerServing.vitamin_a),
		vitamin_c: numberOrZero(totalsPerServing.vitamin_c),
		calcium: numberOrZero(totalsPerServing.calcium),
		iron: numberOrZero(totalsPerServing.iron)
	};
}
function CreateFood({ onSave, onBack }) {
	const userId = useCurrentUserId();
	const [mode, setMode] = (0, import_react.useState)("food");
	const [form, setForm] = (0, import_react.useState)(initialForm);
	const [recipeForm, setRecipeForm] = (0, import_react.useState)(initialRecipeForm);
	const [recipeIngredients, setRecipeIngredients] = (0, import_react.useState)([]);
	const [ingredientSearch, setIngredientSearch] = (0, import_react.useState)("");
	const [ingredientResults, setIngredientResults] = (0, import_react.useState)([]);
	const [ingredientRecent, setIngredientRecent] = (0, import_react.useState)([]);
	const [ingredientCandidate, setIngredientCandidate] = (0, import_react.useState)(null);
	const [ingredientAmountMode, setIngredientAmountMode] = (0, import_react.useState)("servings");
	const [ingredientAmount, setIngredientAmount] = (0, import_react.useState)("");
	const [ingredientServings, setIngredientServings] = (0, import_react.useState)(1);
	const [localFoods, setLocalFoods] = (0, import_react.useState)([]);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [searchingIngredients, setSearchingIngredients] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [showFoodMicros, setShowFoodMicros] = (0, import_react.useState)(false);
	const [showRecipeMicros, setShowRecipeMicros] = (0, import_react.useState)(false);
	const ingredientSearchTimer = (0, import_react.useRef)();
	const set = (key, value) => setForm((current) => ({
		...current,
		[key]: value
	}));
	const setRecipe = (key, value) => setRecipeForm((current) => ({
		...current,
		[key]: value
	}));
	const recipeYield = Math.max(1, Number.parseFloat(recipeForm.servings) || 1);
	const ingredientPreviewMultiplier = getIngredientMultiplier(ingredientCandidate, ingredientAmountMode, ingredientAmount, ingredientServings);
	const ingredientPreview = ingredientCandidate ? buildScaledNutrients(ingredientCandidate, ingredientPreviewMultiplier) : null;
	const recipeTotals = (0, import_react.useMemo)(() => {
		return recipeIngredients.reduce((totals, ingredient) => {
			for (const key of RECIPE_NUMERIC_FIELDS) totals[key] += numberOrZero(ingredient.nutrients[key]);
			return totals;
		}, Object.fromEntries(RECIPE_NUMERIC_FIELDS.map((key) => [key, 0])));
	}, [recipeIngredients]);
	const recipePerServing = (0, import_react.useMemo)(() => {
		return RECIPE_NUMERIC_FIELDS.reduce((totals, key) => {
			const value = recipeTotals[key] / recipeYield;
			if ([
				"calories",
				"sodium",
				"potassium",
				"cholesterol",
				"vitamin_a",
				"calcium"
			].includes(key)) totals[key] = Math.round(value);
			else if (key === "iron") totals[key] = roundNumber(value, 2);
			else totals[key] = roundNumber(value, 1);
			return totals;
		}, {});
	}, [recipeTotals, recipeYield]);
	const manualValid = form.name.trim() && form.calories !== "" && form.serving_size !== "";
	const recipeValid = recipeForm.name.trim() && recipeIngredients.length > 0 && recipeYield > 0;
	const valid = mode === "recipe" ? recipeValid : manualValid;
	const ingredientList = ingredientSearch.trim() ? ingredientResults : ingredientRecent;
	(0, import_react.useEffect)(() => {
		setError("");
	}, [mode]);
	(0, import_react.useEffect)(() => {
		if (mode !== "recipe" || !userId) return void 0;
		let cancelled = false;
		async function loadRecipeFoodSources() {
			if (cancelled) return;
			const userFoodsCacheKey = `user_foods:${userId}`;
			const recentFoodsCacheKey = `recent_foods:${userId}`;
			const cachedFoods = getCached(userFoodsCacheKey);
			const cachedRecent = getCached(recentFoodsCacheKey);
			if (cachedFoods) setLocalFoods(cachedFoods);
			if (cachedRecent) setIngredientRecent(cachedRecent);
			if (cachedFoods && cachedRecent) return;
			const [foodsResponse, recentResponse] = await Promise.all([cachedFoods ? Promise.resolve({ data: cachedFoods }) : supabase.from("foods").select("*").eq("user_id", userId).order("id", { ascending: false }).limit(200), cachedRecent ? Promise.resolve({ data: cachedRecent.map((food) => ({
				food_id: food?.id,
				foods: food
			})) }) : supabase.from("nutrition_logs").select("food_id, foods(*)").eq("user_id", userId).not("food_id", "is", null).order("created_at", { ascending: false }).limit(40)]);
			if (cancelled) return;
			const foods = foodsResponse.data || [];
			const recentRows = recentResponse.data || [];
			const recentSeen = /* @__PURE__ */ new Set();
			const recentFoods = recentRows.filter((row) => {
				if (!row?.foods || recentSeen.has(row.food_id)) return false;
				recentSeen.add(row.food_id);
				return true;
			}).map((row) => row.foods).slice(0, 10);
			setLocalFoods(foods);
			setIngredientRecent(recentFoods);
			setCached(userFoodsCacheKey, foods, USER_FOODS_CACHE_TTL_MS$1);
			setCached(recentFoodsCacheKey, recentFoods, 300 * 1e3);
		}
		loadRecipeFoodSources().catch((loadError) => {
			if (!cancelled) console.error("Could not load recipe food sources:", loadError);
		});
		return () => {
			cancelled = true;
		};
	}, [mode, userId]);
	(0, import_react.useEffect)(() => {
		if (mode !== "recipe") return void 0;
		clearTimeout(ingredientSearchTimer.current);
		let cancelled = false;
		const controller = new AbortController();
		if (!ingredientSearch.trim()) {
			setIngredientResults([]);
			setSearchingIngredients(false);
			return () => controller.abort();
		}
		setSearchingIngredients(true);
		ingredientSearchTimer.current = setTimeout(async () => {
			const usdaCacheKey = `usda_food_search:${normalizeSearchValue(ingredientSearch)}`;
			try {
				const remoteFoods = await (() => {
					const cachedUsda = getCached(usdaCacheKey);
					if (cachedUsda) return Promise.resolve(cachedUsda);
					return searchUsdaFoods(ingredientSearch, {
						signal: controller.signal,
						pageSize: 30
					}).then((foods) => {
						setCached(usdaCacheKey, foods, USDA_SEARCH_CACHE_TTL_MS$1, { bucket: "search" });
						return foods;
					});
				})();
				if (cancelled) return;
				setIngredientResults(mergeFoodSearchResults(localFoods, remoteFoods, ingredientSearch).slice(0, 30));
			} catch (searchError) {
				if (!cancelled && searchError?.name !== "AbortError") {
					console.error("Recipe ingredient search failed:", searchError);
					setIngredientResults([]);
				}
			} finally {
				if (!cancelled) setSearchingIngredients(false);
			}
		}, 300);
		return () => {
			cancelled = true;
			clearTimeout(ingredientSearchTimer.current);
			controller.abort();
		};
	}, [
		ingredientSearch,
		localFoods,
		mode
	]);
	function selectIngredient(food) {
		const defaults = getIngredientDefaults(food);
		setIngredientCandidate(food);
		setIngredientAmountMode(defaults.amountMode);
		setIngredientAmount(defaults.amount);
		setIngredientServings(defaults.servings);
		setError("");
	}
	function addIngredient() {
		const amountError = ingredientAmountMode === "direct" ? validateNumber(ingredientAmount, {
			label: "Ingredient amount",
			min: .01,
			max: VALIDATION_LIMITS.nutritionAmountMax,
			required: true,
			decimals: 2
		}) : validateNumber(ingredientServings, {
			label: "Ingredient servings",
			min: .01,
			max: VALIDATION_LIMITS.nutritionAmountMax,
			required: true,
			decimals: 2
		});
		if (amountError) {
			setError(amountError);
			return;
		}
		const multiplier = getIngredientMultiplier(ingredientCandidate, ingredientAmountMode, ingredientAmount, ingredientServings);
		if (!ingredientCandidate || multiplier <= 0) {
			setError("Choose an ingredient and add a valid amount");
			return;
		}
		const amountValue = ingredientAmountMode === "direct" ? Number.parseFloat(ingredientAmount) : 0;
		const directUnit = getDirectAmountUnit(ingredientCandidate);
		setRecipeIngredients((current) => [...current, {
			id: `${ingredientCandidate.id ?? ingredientCandidate.remoteKey ?? buildFoodSearchKey(ingredientCandidate)}:${Date.now()}`,
			food: ingredientCandidate,
			amountMode: ingredientAmountMode,
			amount: Number.isFinite(amountValue) ? amountValue : 0,
			amountUnit: directUnit,
			servings: Number.parseFloat(ingredientServings) || 1,
			multiplier,
			nutrients: buildScaledNutrients(ingredientCandidate, multiplier)
		}]);
		setIngredientSearch("");
		setIngredientResults([]);
		setIngredientCandidate(null);
		setIngredientAmount("");
		setIngredientServings(1);
		setError("");
	}
	function removeIngredient(id) {
		setRecipeIngredients((current) => current.filter((ingredient) => ingredient.id !== id));
	}
	async function save() {
		const validationError = mode === "recipe" ? validateRecipe() : validateNutritionForm(form);
		if (validationError) {
			setError(validationError);
			return;
		}
		setSaving(true);
		setError("");
		if (!userId) {
			setSaving(false);
			setError("You need to be signed in to save foods");
			return;
		}
		const payload = mode === "recipe" ? buildRecipePayload(userId, recipeForm, recipePerServing) : {
			user_id: userId,
			name: form.name.trim(),
			brand: form.brand.trim() || null,
			serving_size: numberOrZero(form.serving_size) || 100,
			serving_unit: form.serving_unit,
			calories: numberOrZero(form.calories),
			protein: numberOrZero(form.protein),
			carbs: numberOrZero(form.carbs),
			fat: numberOrZero(form.fat),
			fiber: numberOrZero(form.fiber),
			sugar: numberOrZero(form.sugar),
			saturated_fat: numberOrZero(form.saturated_fat),
			sodium: numberOrZero(form.sodium),
			potassium: numberOrZero(form.potassium),
			cholesterol: numberOrZero(form.cholesterol),
			vitamin_a: numberOrZero(form.vitamin_a),
			vitamin_c: numberOrZero(form.vitamin_c),
			calcium: numberOrZero(form.calcium),
			iron: numberOrZero(form.iron)
		};
		const { data, error: saveError } = await supabase.from("foods").insert(payload).select().single();
		setSaving(false);
		if (saveError) {
			setError(saveError.message);
			return;
		}
		invalidateCache(`recent_foods:${userId}`, `user_foods:${userId}`);
		onSave(data);
	}
	function validateRecipe() {
		const nameError = validateLength(recipeForm.name, {
			label: "Recipe name",
			min: 1,
			max: VALIDATION_LIMITS.foodNameMaxLength,
			required: true
		});
		if (nameError) return nameError;
		const servingsError = validateNumber(recipeForm.servings, {
			label: "Servings made",
			min: .01,
			max: VALIDATION_LIMITS.nutritionAmountMax,
			required: true,
			decimals: 2
		});
		if (servingsError) return servingsError;
		if (recipeIngredients.length === 0) return "Add at least one ingredient.";
		return "";
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "cf-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-picker-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "back-btn",
					onClick: onBack,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
						width: "20",
						height: "20",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 12H5M12 5l-7 7 7 7" })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "picker-title",
					children: "Create Food"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cf-mode-toggle",
				role: "tablist",
				"aria-label": "Create mode",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `cf-mode-toggle-btn ${mode === "food" ? "active" : ""}`,
					onClick: () => setMode("food"),
					children: "Single Food"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `cf-mode-toggle-btn ${mode === "recipe" ? "active" : ""}`,
					onClick: () => setMode("recipe"),
					children: "Recipe"
				})]
			}),
			mode === "recipe" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cf-section-title",
							children: "Recipe Info"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Recipe Name",
							value: recipeForm.name,
							onChange: (value) => setRecipe("name", value),
							placeholder: "e.g. Overnight Oats",
							type: "text",
							required: true,
							maxLength: VALIDATION_LIMITS.foodNameMaxLength
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cf-row",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Servings Made",
								value: recipeForm.servings,
								onChange: (value) => setRecipe("servings", value),
								placeholder: "1",
								unit: "servings",
								required: true,
								rules: {
									min: .01,
									max: VALIDATION_LIMITS.nutritionAmountMax,
									decimals: 2
								}
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cf-section-title",
							children: "Add Ingredients"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "picker-search",
							type: "text",
							placeholder: "Search foods to add...",
							value: ingredientSearch,
							onChange: (e) => setIngredientSearch(e.target.value),
							maxLength: VALIDATION_LIMITS.searchMaxLength
						}),
						!ingredientSearch.trim() && ingredientRecent.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-list-label",
							children: "Recent"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-search-results",
							children: [
								searchingIngredients && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "nut-empty",
									children: "Searching..."
								}),
								!searchingIngredients && ingredientList.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "nut-empty",
									children: ingredientSearch.trim() ? "No foods found" : "Search to add ingredients"
								}),
								ingredientList.map((food) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `nut-search-item ${ingredientCandidate === food ? "selected" : ""}`,
									onClick: () => selectIngredient(food),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-search-info",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "nut-search-name",
												children: food.name
											}),
											food.brand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "nut-search-brand",
												children: food.brand
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "nut-search-macros",
												children: [
													"P ",
													(food.protein || 0).toFixed(0),
													"g · C ",
													(food.carbs || 0).toFixed(0),
													"g · F ",
													(food.fat || 0).toFixed(0),
													"g",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "nut-search-serving",
														children: [
															" · per ",
															food.serving_size,
															food.serving_unit
														]
													})
												]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-search-cal",
										children: [food.calories, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: " kcal" })]
									})]
								}, food.id ?? food.remoteKey ?? buildFoodSearchKey(food)))
							]
						}),
						ingredientCandidate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-ingredient-builder",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cf-ingredient-header",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "cf-ingredient-name",
										children: ingredientCandidate.name
									}), ingredientCandidate.brand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "cf-ingredient-brand",
										children: ingredientCandidate.brand
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cf-ingredient-serving",
										children: [
											"1 serving = ",
											ingredientCandidate.serving_size,
											ingredientCandidate.serving_unit
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cf-amount-toggle",
									role: "tablist",
									"aria-label": "Ingredient amount mode",
									children: [supportsDirectAmount(ingredientCandidate) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: `cf-amount-toggle-btn ${ingredientAmountMode === "direct" ? "active" : ""}`,
										onClick: () => setIngredientAmountMode("direct"),
										children: getDirectAmountUnit(ingredientCandidate)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: `cf-amount-toggle-btn ${ingredientAmountMode === "servings" ? "active" : ""}`,
										onClick: () => setIngredientAmountMode("servings"),
										children: "Servings"
									})]
								}),
								ingredientAmountMode === "direct" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cf-amount-row",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "rtp-btn",
											onClick: () => setIngredientAmount((current) => {
												const numeric = Number.parseFloat(current);
												const next = Number.isFinite(numeric) ? Math.max(1, roundNumber(numeric - 10, 1)) : 1;
												return String(next);
											}),
											children: "−"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "nut-serving-input",
											type: "number",
											value: ingredientAmount,
											min: "0.01",
											max: VALIDATION_LIMITS.nutritionAmountMax,
											step: "0.01",
											inputMode: "decimal",
											onChange: (e) => setIngredientAmount(e.target.value)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "rtp-btn",
											onClick: () => setIngredientAmount((current) => {
												const numeric = Number.parseFloat(current);
												const next = Number.isFinite(numeric) ? roundNumber(numeric + 10, 1) : numberOrZero(ingredientCandidate.serving_size) || 100;
												return String(next);
											}),
											children: "+"
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cf-amount-row",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "rtp-btn",
											onClick: () => setIngredientServings((current) => Math.max(.25, roundNumber(current - .25, 2))),
											children: "−"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "nut-serving-input",
											type: "number",
											value: ingredientServings,
											min: "0.01",
											max: VALIDATION_LIMITS.nutritionAmountMax,
											step: "0.01",
											inputMode: "decimal",
											onChange: (e) => setIngredientServings(Math.max(.25, Number.parseFloat(e.target.value) || .25))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "rtp-btn",
											onClick: () => setIngredientServings((current) => roundNumber(current + .25, 2)),
											children: "+"
										})
									]
								}),
								ingredientPreview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cf-ingredient-preview",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [ingredientPreview.calories, " kcal"] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											"P ",
											ingredientPreview.protein,
											"g"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											"C ",
											ingredientPreview.carbs,
											"g"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											"F ",
											ingredientPreview.fat,
											"g"
										] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "nut-add-to-log-btn",
									onClick: addIngredient,
									children: "Add Ingredient"
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-section",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "cf-section-title",
						children: "Recipe Totals"
					}), recipeIngredients.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-empty",
						children: "Add ingredients to build your recipe"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-recipe-summary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cf-summary-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "cf-summary-label",
										children: "Per Serving"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cf-summary-calories",
										children: [recipePerServing.calories, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: " kcal" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cf-summary-macros",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"P ",
												recipePerServing.protein,
												"g"
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"C ",
												recipePerServing.carbs,
												"g"
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"F ",
												recipePerServing.fat,
												"g"
											] })
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cf-summary-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "cf-summary-label",
										children: "Whole Recipe"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cf-summary-calories",
										children: [Math.round(recipeTotals.calories), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: " kcal" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cf-summary-macros",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"P ",
												roundNumber(recipeTotals.protein, 1),
												"g"
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"C ",
												roundNumber(recipeTotals.carbs, 1),
												"g"
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"F ",
												roundNumber(recipeTotals.fat, 1),
												"g"
											] })
										]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cf-recipe-list",
							children: recipeIngredients.map((ingredient) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cf-recipe-item",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cf-recipe-item-main",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "cf-recipe-item-name",
										children: ingredient.food.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cf-recipe-item-meta",
										children: [
											formatIngredientAmount(ingredient),
											" · ",
											ingredient.nutrients.calories,
											" kcal"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "cf-remove-btn",
									onClick: () => removeIngredient(ingredient.id),
									children: "Remove"
								})]
							}, ingredient.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "cf-toggle-micros",
							onClick: () => setShowRecipeMicros((current) => !current),
							children: [
								showRecipeMicros ? "▾" : "▸",
								" More Nutrition ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "cf-section-note",
									children: "(per serving)"
								})
							]
						}),
						showRecipeMicros && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cf-recipe-micros",
							children: RECIPE_MICRO_ITEMS.filter((item) => numberOrZero(recipePerServing[item.key]) > 0).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cf-recipe-micro-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [recipePerServing[item.key], item.unit] })]
							}, item.key))
						})
					] })]
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cf-section-title",
							children: "Food Info"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Name",
							value: form.name,
							onChange: (value) => set("name", value),
							placeholder: "e.g. Chicken Breast",
							type: "text",
							required: true,
							maxLength: VALIDATION_LIMITS.foodNameMaxLength
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Brand",
							value: form.brand,
							onChange: (value) => set("brand", value),
							placeholder: "Optional",
							type: "text",
							maxLength: VALIDATION_LIMITS.foodBrandMaxLength
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Serving Size",
								value: form.serving_size,
								onChange: (value) => set("serving_size", value),
								placeholder: "100",
								required: true,
								rules: NUTRITION_FIELD_LIMITS.serving_size
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cf-field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "cf-label",
									children: "Unit"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									className: "cf-select",
									value: form.serving_unit,
									onChange: (e) => set("serving_unit", e.target.value),
									children: UNITS.map((unit) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: unit,
										children: unit
									}, unit))
								})]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-section-title",
							children: ["Macros ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "cf-section-note",
								children: "per serving"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Calories",
							value: form.calories,
							onChange: (value) => set("calories", value),
							unit: "kcal",
							required: true,
							rules: NUTRITION_FIELD_LIMITS.calories
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Protein",
									value: form.protein,
									onChange: (value) => set("protein", value),
									unit: "g",
									rules: NUTRITION_FIELD_LIMITS.protein
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Carbs",
									value: form.carbs,
									onChange: (value) => set("carbs", value),
									unit: "g",
									rules: NUTRITION_FIELD_LIMITS.carbs
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Fat",
									value: form.fat,
									onChange: (value) => set("fat", value),
									unit: "g",
									rules: NUTRITION_FIELD_LIMITS.fat
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "cf-toggle-micros",
					onClick: () => setShowFoodMicros((current) => !current),
					children: [
						showFoodMicros ? "▾" : "▸",
						" Micronutrients ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "cf-section-note",
							children: "(optional)"
						})
					]
				}),
				showFoodMicros && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Fiber",
								value: form.fiber,
								onChange: (value) => set("fiber", value),
								unit: "g",
								rules: NUTRITION_FIELD_LIMITS.fiber
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Sugar",
								value: form.sugar,
								onChange: (value) => set("sugar", value),
								unit: "g",
								rules: NUTRITION_FIELD_LIMITS.sugar
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Saturated Fat",
								value: form.saturated_fat,
								onChange: (value) => set("saturated_fat", value),
								unit: "g",
								rules: NUTRITION_FIELD_LIMITS.saturated_fat
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Cholesterol",
								value: form.cholesterol,
								onChange: (value) => set("cholesterol", value),
								unit: "mg",
								rules: NUTRITION_FIELD_LIMITS.cholesterol
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Sodium",
								value: form.sodium,
								onChange: (value) => set("sodium", value),
								unit: "mg",
								rules: NUTRITION_FIELD_LIMITS.sodium
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Potassium",
								value: form.potassium,
								onChange: (value) => set("potassium", value),
								unit: "mg",
								rules: NUTRITION_FIELD_LIMITS.potassium
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Vitamin A",
								value: form.vitamin_a,
								onChange: (value) => set("vitamin_a", value),
								unit: "mcg",
								rules: NUTRITION_FIELD_LIMITS.vitamin_a
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Vitamin C",
								value: form.vitamin_c,
								onChange: (value) => set("vitamin_c", value),
								unit: "mg",
								rules: NUTRITION_FIELD_LIMITS.vitamin_c
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cf-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Calcium",
								value: form.calcium,
								onChange: (value) => set("calcium", value),
								unit: "mg",
								rules: NUTRITION_FIELD_LIMITS.calcium
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Iron",
								value: form.iron,
								onChange: (value) => set("iron", value),
								unit: "mg",
								rules: NUTRITION_FIELD_LIMITS.iron
							})]
						})
					]
				})
			] }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "cf-error",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "nut-add-to-log-btn",
				onClick: save,
				disabled: saving || !valid,
				children: saving ? "Saving..." : mode === "recipe" ? "Save Recipe" : "Save Food"
			})
		]
	});
}
//#endregion
//#region src/components/nutrition/NutritionFoodPicker.jsx
var BarcodeScanner = (0, import_react.lazy)(() => __vitePreload(() => import("./BarcodeScanner-CzLgLEgU.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13])));
var USDA_SEARCH_CACHE_TTL_MS = 600 * 1e3;
var USER_FOODS_CACHE_TTL_MS = 300 * 1e3;
function NutritionFoodPicker({ onAdd, onClose, heading, submitLabel }) {
	const userId = useCurrentUserId();
	const [search, setSearch] = (0, import_react.useState)("");
	const [results, setResults] = (0, import_react.useState)([]);
	const [recent, setRecent] = (0, import_react.useState)([]);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [editingSelectedFood, setEditingSelectedFood] = (0, import_react.useState)(false);
	const [selectedFoodForm, setSelectedFoodForm] = (0, import_react.useState)(EMPTY_FOOD_FORM);
	const [selectedFoodError, setSelectedFoodError] = (0, import_react.useState)("");
	const [amountMode, setAmountMode] = (0, import_react.useState)("grams");
	const [grams, setGrams] = (0, import_react.useState)("");
	const [servings, setServings] = (0, import_react.useState)("1");
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [loadingRecent, setLoadingRecent] = (0, import_react.useState)(true);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [adding, setAdding] = (0, import_react.useState)(false);
	const searchTimer = (0, import_react.useRef)();
	const pickerTitle = heading || "Add Food";
	const pickerSubmitLabel = submitLabel || "Add to Log";
	async function loadUserFoods(userId) {
		const cacheKey = `user_foods:${userId}`;
		const cached = getCached(cacheKey);
		if (cached) return cached;
		const { data, error } = await supabase.from("foods").select("*").eq("user_id", userId).order("id", { ascending: false }).limit(200);
		if (error) throw error;
		const foods = data || [];
		setCached(cacheKey, foods, USER_FOODS_CACHE_TTL_MS);
		return foods;
	}
	async function loadRecent(isCancelled) {
		if (!userId) {
			if (!isCancelled()) setLoadingRecent(false);
			return;
		}
		if (isCancelled()) return;
		const cacheKey = `recent_foods:${userId}`;
		const cached = getCached(cacheKey);
		if (cached) {
			setRecent(cached);
			setLoadingRecent(false);
			return;
		}
		const { data } = await supabase.from("nutrition_logs").select("food_id, food_name, foods(id, name, brand, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, saturated_fat, sodium, potassium, cholesterol)").eq("user_id", userId).not("food_id", "is", null).order("created_at", { ascending: false }).limit(30);
		if (isCancelled()) return;
		const seen = /* @__PURE__ */ new Set();
		const recent = (data || []).filter((r) => {
			if (!r.foods || seen.has(r.food_id)) return false;
			seen.add(r.food_id);
			return true;
		}).map((r) => r.foods).slice(0, 10);
		setCached(cacheKey, recent, 300 * 1e3);
		setRecent(recent);
		setLoadingRecent(false);
	}
	(0, import_react.useEffect)(() => {
		setLoadingRecent(true);
		let cancelled = false;
		const isCancelled = () => cancelled;
		const timer = setTimeout(() => {
			loadRecent(isCancelled);
		}, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [userId]);
	(0, import_react.useEffect)(() => {
		document.querySelector(".content")?.scrollTo(0, 0);
	}, [
		selected,
		editingSelectedFood,
		creating,
		scanning
	]);
	(0, import_react.useEffect)(() => {
		clearTimeout(searchTimer.current);
		let cancelled = false;
		const controller = new AbortController();
		let statusTimer;
		if (!userId) {
			statusTimer = setTimeout(() => {
				setResults([]);
				setSearching(false);
			}, 0);
			return () => clearTimeout(statusTimer);
		}
		if (!search.trim()) {
			statusTimer = setTimeout(() => {
				setResults([]);
				setSearching(false);
			}, 0);
			return () => clearTimeout(statusTimer);
		}
		statusTimer = setTimeout(() => {
			setSearching(true);
		}, 0);
		searchTimer.current = setTimeout(async () => {
			const usdaCacheKey = `usda_food_search:${normalizeSearchValue(search)}`;
			try {
				if (cancelled) return;
				const [localFoods, usdaFoods] = await Promise.all([loadUserFoods(userId), (() => {
					const cachedUsda = getCached(usdaCacheKey);
					if (cachedUsda) return Promise.resolve(cachedUsda);
					return searchUsdaFoods(search, {
						signal: controller.signal,
						pageSize: 30
					}).then((foods) => {
						setCached(usdaCacheKey, foods, USDA_SEARCH_CACHE_TTL_MS, { bucket: "search" });
						return foods;
					});
				})()]);
				if (cancelled) return;
				setResults(mergeFoodSearchResults(localFoods, usdaFoods, search).slice(0, 30));
			} catch (error) {
				if (cancelled || error?.name === "AbortError") return;
				console.error("Food search failed:", error);
				setResults([]);
			} finally {
				if (!cancelled) setSearching(false);
			}
		}, 300);
		return () => {
			cancelled = true;
			clearTimeout(statusTimer);
			clearTimeout(searchTimer.current);
			controller.abort();
		};
	}, [search, userId]);
	function selectFood(food) {
		setSelected(food);
		setEditingSelectedFood(false);
		setSelectedFoodForm(foodToFormValues(food));
		setSelectedFoodError("");
		setServings("1");
		const servingSize = Number(food?.serving_size) || 0;
		setGrams(servingSize > 0 ? String(servingSize) : "100");
		setAmountMode((food?.serving_unit || "").toLowerCase() === "g" ? "grams" : "servings");
	}
	function updateSelectedFoodField(key, value) {
		setSelectedFoodForm((current) => ({
			...current,
			[key]: value
		}));
		setSelectedFoodError("");
	}
	function openSelectedFoodEditor() {
		if (!selected) return;
		setSelectedFoodForm(foodToFormValues(selected));
		setSelectedFoodError("");
		setEditingSelectedFood(true);
	}
	function saveSelectedFoodEdits() {
		if (!selected) return;
		const formError = getFoodFormError(selectedFoodForm);
		if (formError) {
			setSelectedFoodError(formError);
			return;
		}
		const currentForm = foodToFormValues(selected);
		if (!(JSON.stringify(currentForm) !== JSON.stringify(selectedFoodForm))) {
			setEditingSelectedFood(false);
			return;
		}
		setSelected(foodFromFormValues(selectedFoodForm, selected, { persistAsNew: true }));
		setEditingSelectedFood(false);
	}
	function getAmountMultiplier(food) {
		if (!food) return 0;
		const servingSize = Number(food.serving_size) || 0;
		if (amountMode === "grams") {
			const gramValue = Number.parseFloat(grams);
			if (!Number.isFinite(gramValue) || gramValue <= 0 || servingSize <= 0) return 0;
			return gramValue / servingSize;
		}
		const servingsVal = Number.parseFloat(servings);
		return Number.isFinite(servingsVal) && servingsVal > 0 ? servingsVal : 0;
	}
	async function ensureFoodRecord(food) {
		if (food?.id && !food?.persistAsNew) return food;
		if (!userId) throw new Error("You need to be signed in to add foods.");
		if (!food?.persistAsNew) {
			const { data: existingRows, error: existingError } = await supabase.from("foods").select("*").eq("user_id", userId).eq("name", String(food?.name || "").trim()).limit(20);
			if (!existingError) {
				const existingMatch = (existingRows || []).find((row) => matchesStoredFood(row, food));
				if (existingMatch) return existingMatch;
			}
		}
		const payload = buildFoodPayload(foodToFormValues(food), userId);
		const { data, error } = await supabase.from("foods").insert(payload).select().single();
		if (error) throw error;
		invalidateCache(`user_foods:${userId}`);
		return data;
	}
	async function handleAdd() {
		const amountError = amountMode === "grams" ? validateNumber(grams, {
			label: "Grams",
			min: .01,
			max: VALIDATION_LIMITS.nutritionAmountMax,
			required: true,
			decimals: 2
		}) : validateNumber(servings, {
			label: "Servings",
			min: .01,
			max: VALIDATION_LIMITS.nutritionAmountMax,
			required: true,
			decimals: 2
		});
		if (amountError) {
			setSelectedFoodError(amountError);
			return;
		}
		const amountMultiplier = getAmountMultiplier(selected);
		if (!selected || amountMultiplier <= 0 || adding) return;
		setAdding(true);
		try {
			const storedFood = await ensureFoodRecord(selected);
			onAdd({
				...selected,
				...storedFood,
				id: storedFood.id
			}, amountMultiplier);
		} catch (error) {
			console.error("Could not persist selected food before logging:", error);
			onAdd(selected?.persistAsNew ? {
				...selected,
				id: null
			} : selected, amountMultiplier);
		}
	}
	if (creating) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateFood, {
		onSave: (food) => {
			setCreating(false);
			selectFood(food);
		},
		onBack: () => setCreating(false)
	});
	if (scanning) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "nut-empty",
			children: "Opening scanner..."
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BarcodeScanner, {
			onSave: (food) => {
				setScanning(false);
				selectFood(food);
			},
			onBack: () => setScanning(false)
		})
	});
	if (selected && editingSelectedFood) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "nut-picker-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-picker-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "back-btn",
					onClick: () => {
						setEditingSelectedFood(false);
						setSelectedFoodError("");
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
						width: "20",
						height: "20",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 12H5M12 5l-7 7 7 7" })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "picker-title",
					children: "Edit Nutrition"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bs-verify-note",
				children: "Adjust the food details before adding it to your log. Your edited version will be saved as a custom food when you add it."
			}),
			selectedFoodError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bs-not-found-note",
				children: selectedFoodError
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FoodEditorFields, {
				form: selectedFoodForm,
				onFieldChange: updateSelectedFoodField
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "nut-add-to-log-btn",
				onClick: saveSelectedFoodEdits,
				children: "Save Changes"
			})
		]
	});
	if (selected) {
		const m = getAmountMultiplier(selected);
		const n = {
			calories: Math.round(selected.calories * m),
			protein: +((selected.protein || 0) * m).toFixed(1),
			carbs: +((selected.carbs || 0) * m).toFixed(1),
			fat: +((selected.fat || 0) * m).toFixed(1),
			fiber: +((selected.fiber || 0) * m).toFixed(1),
			sugar: +((selected.sugar || 0) * m).toFixed(1),
			saturated_fat: +((selected.saturated_fat || 0) * m).toFixed(1),
			sodium: Math.round((selected.sodium || 0) * m),
			potassium: Math.round((selected.potassium || 0) * m),
			cholesterol: Math.round((selected.cholesterol || 0) * m)
		};
		const micros = [
			{
				label: "Fiber",
				val: n.fiber,
				unit: "g",
				show: selected.fiber > 0
			},
			{
				label: "Sugar",
				val: n.sugar,
				unit: "g",
				show: selected.sugar > 0
			},
			{
				label: "Saturated Fat",
				val: n.saturated_fat,
				unit: "g",
				show: selected.saturated_fat > 0
			},
			{
				label: "Sodium",
				val: n.sodium,
				unit: "mg",
				show: selected.sodium > 0
			},
			{
				label: "Potassium",
				val: n.potassium,
				unit: "mg",
				show: selected.potassium > 0
			},
			{
				label: "Cholesterol",
				val: n.cholesterol,
				unit: "mg",
				show: selected.cholesterol > 0
			}
		].filter((x) => x.show);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "nut-picker-screen",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-picker-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "back-btn",
						onClick: () => setSelected(null),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 12H5M12 5l-7 7 7 7" })
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "picker-title",
						children: selected.name
					}), selected.brand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-detail-brand",
						children: selected.brand
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-serving-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-serving-label",
							children: ["Amount ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "nut-serving-note",
								children: [
									"· 1 serving = ",
									selected.serving_size,
									selected.serving_unit
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-amount-toggle",
							role: "tablist",
							"aria-label": "Food amount mode",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `nut-amount-toggle-btn ${amountMode === "grams" ? "active" : ""}`,
								onClick: () => setAmountMode("grams"),
								children: "Grams"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `nut-amount-toggle-btn ${amountMode === "servings" ? "active" : ""}`,
								onClick: () => setAmountMode("servings"),
								children: "Servings"
							})]
						}),
						amountMode === "grams" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-serving-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "rtp-btn",
									onClick: () => setGrams((current) => {
										const numeric = Number.parseFloat(current);
										const next = Number.isFinite(numeric) ? Math.max(1, Math.round((numeric - 10) * 10) / 10) : 1;
										return String(next);
									}),
									children: "−"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "nut-serving-input",
									type: "number",
									value: grams,
									min: "0.01",
									max: VALIDATION_LIMITS.nutritionAmountMax,
									step: "0.01",
									inputMode: "decimal",
									onChange: (e) => setGrams(e.target.value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "rtp-btn",
									onClick: () => setGrams((current) => {
										const numeric = Number.parseFloat(current);
										const next = Number.isFinite(numeric) ? Math.round((numeric + 10) * 10) / 10 : Number(selected.serving_size) || 100;
										return String(next);
									}),
									children: "+"
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-serving-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "rtp-btn",
									onClick: () => setServings((s) => {
										const n = Number.parseFloat(s);
										return String(Number.isFinite(n) ? Math.max(.25, +Math.max(.25, n - .25).toFixed(2)) : .25);
									}),
									children: "−"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "nut-serving-input",
									type: "number",
									value: servings,
									min: "0.01",
									max: VALIDATION_LIMITS.nutritionAmountMax,
									step: "0.01",
									inputMode: "decimal",
									onChange: (e) => setServings(e.target.value),
									onBlur: (e) => {
										const n = Number.parseFloat(e.target.value);
										setServings(Number.isFinite(n) && n > 0 ? String(+Math.max(.25, n).toFixed(2)) : "0.25");
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "rtp-btn",
									onClick: () => setServings((s) => {
										const n = Number.parseFloat(s);
										return String(Number.isFinite(n) ? +(n + .25).toFixed(2) : 1);
									}),
									children: "+"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-serving-note",
							children: amountMode === "grams" ? `${grams || "0"}g selected` : `${servings} serving${Number.parseFloat(servings) === 1 ? "" : "s"} selected`
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-preview-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-preview-cal",
						children: [
							n.calories,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "kcal" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-preview-macros",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-preview-macro",
								style: { "--mc": "#a855f7" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [n.protein, "g"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Protein" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-preview-macro",
								style: { "--mc": "#f97316" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [n.carbs, "g"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Carbs" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-preview-macro",
								style: { "--mc": "#eab308" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [n.fat, "g"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Fat" })]
							})
						]
					})]
				}),
				micros.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-micros-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-micros-title",
						children: "More Nutrition"
					}), micros.map((mi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-micro-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: mi.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [mi.val, mi.unit] })]
					}, mi.label))]
				}),
				selected.persistAsNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "nut-edited-note",
					children: "This edited version will be saved as a custom food when you add it."
				}),
				selectedFoodError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-not-found-note",
					children: selectedFoodError
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-detail-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "nut-detail-edit-btn",
						onClick: openSelectedFoodEditor,
						children: "Edit Nutrition"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "nut-add-to-log-btn",
						onClick: handleAdd,
						disabled: adding,
						style: adding ? {
							opacity: .5,
							cursor: "not-allowed"
						} : void 0,
						children: pickerSubmitLabel
					})]
				})
			]
		});
	}
	const list = search.trim() ? results : recent;
	const showRecent = !search.trim();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "nut-picker-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-picker-header",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "back-btn",
						onClick: onClose,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 12H5M12 5l-7 7 7 7" })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "picker-title",
						children: pickerTitle
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "nut-create-food-btn",
						onClick: () => setCreating(true),
						title: "Create food",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "16",
							height: "16",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2.5",
							strokeLinecap: "round",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "12",
								y1: "5",
								x2: "12",
								y2: "19"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "5",
								y1: "12",
								x2: "19",
								y2: "12"
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "picker-search",
				type: "text",
				placeholder: "Search foods...",
				value: search,
				onChange: (e) => setSearch(e.target.value),
				maxLength: VALIDATION_LIMITS.searchMaxLength,
				autoFocus: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "nut-scan-banner",
				onClick: () => setScanning(true),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-scan-banner-icon",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "22",
							height: "22",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 9V5a2 2 0 0 1 2-2h4" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15 3h4a2 2 0 0 1 2 2v4" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2h-4" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 21H5a2 2 0 0 1-2-2v-4" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "7",
									y1: "12",
									x2: "7",
									y2: "12.01"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "10",
									y1: "8",
									x2: "10",
									y2: "16"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "13",
									y1: "10",
									x2: "13",
									y2: "14"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "16",
									y1: "8",
									x2: "16",
									y2: "16"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-scan-banner-text",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "nut-scan-banner-title",
							children: "Scan Barcode"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "nut-scan-banner-sub",
							children: "Instantly log any packaged food"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
						className: "nut-scan-banner-chevron",
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
			showRecent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "nut-list-label",
				children: "Recent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-search-list",
				children: [
					(searching || showRecent && loadingRecent) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true }),
					!searching && !loadingRecent && list.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-empty",
						children: search.trim() ? "No foods found — try creating one" : "No recent foods"
					}),
					list.map((food) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-search-item",
						onClick: () => selectFood(food),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-search-info",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "nut-search-name",
									children: food.name
								}),
								food.brand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "nut-search-brand",
									children: food.brand
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "nut-search-macros",
									children: [
										"P ",
										(food.protein || 0).toFixed(0),
										"g · C ",
										(food.carbs || 0).toFixed(0),
										"g · F ",
										(food.fat || 0).toFixed(0),
										"g",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "nut-search-serving",
											children: [
												" · per ",
												food.serving_size,
												food.serving_unit
											]
										})
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-search-cal",
							children: [food.calories, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: " kcal" })]
						})]
					}, food.id ?? food.remoteKey ?? buildFoodSearchKey(food)))
				]
			})
		]
	});
}
//#endregion
//#region src/components/Nutrition.jsx
var FEED_FILTERS = [
	{
		id: "all",
		label: "All"
	},
	{
		id: "calories",
		label: "Kcal"
	},
	{
		id: "protein",
		label: "Protein"
	},
	{
		id: "fat",
		label: "Fat"
	},
	{
		id: "carbs",
		label: "Carbs"
	}
];
var DEFAULT_GOALS = {
	calories: 2e3,
	protein: 150,
	carbs: 200,
	fat: 65,
	fiber: 30,
	sugar: 50,
	saturated_fat: 20,
	sodium: 2300,
	potassium: 3500,
	cholesterol: 300,
	calcium: 1e3,
	iron: 18,
	magnesium: 400,
	zinc: 11,
	vitamin_a: 900,
	vitamin_c: 90,
	vitamin_d: 15
};
var NUTRITION_LOG_SELECT = [
	"id",
	"created_at",
	"food_name",
	"servings",
	"calories",
	"protein",
	"carbs",
	"fat",
	"fiber",
	"sugar",
	"saturated_fat",
	"sodium",
	"potassium",
	"cholesterol",
	"calcium",
	"iron",
	"magnesium",
	"zinc",
	"vitamin_a",
	"vitamin_c",
	"vitamin_d"
].join(", ");
var GOAL_FIELD_RULES = {
	calories_goal: {
		...NUTRITION_FIELD_LIMITS.calories,
		min: 1,
		label: "Calories goal"
	},
	protein_goal: {
		...NUTRITION_FIELD_LIMITS.protein,
		min: 1,
		label: "Protein goal"
	},
	carbs_goal: {
		...NUTRITION_FIELD_LIMITS.carbs,
		min: 1,
		label: "Carbs goal"
	},
	fat_goal: {
		...NUTRITION_FIELD_LIMITS.fat,
		min: 1,
		label: "Fat goal"
	},
	fiber_goal: {
		...NUTRITION_FIELD_LIMITS.fiber,
		label: "Fiber goal"
	},
	sugar_goal: {
		...NUTRITION_FIELD_LIMITS.sugar,
		label: "Sugar goal"
	},
	saturated_fat_goal: {
		...NUTRITION_FIELD_LIMITS.saturated_fat,
		label: "Saturated fat goal"
	},
	sodium_goal: {
		...NUTRITION_FIELD_LIMITS.sodium,
		label: "Sodium goal"
	},
	potassium_goal: {
		...NUTRITION_FIELD_LIMITS.potassium,
		label: "Potassium goal"
	},
	cholesterol_goal: {
		...NUTRITION_FIELD_LIMITS.cholesterol,
		label: "Cholesterol goal"
	},
	calcium_goal: {
		...NUTRITION_FIELD_LIMITS.calcium,
		label: "Calcium goal"
	},
	iron_goal: {
		...NUTRITION_FIELD_LIMITS.iron,
		label: "Iron goal"
	},
	magnesium_goal: {
		...NUTRITION_FIELD_LIMITS.magnesium,
		label: "Magnesium goal"
	},
	zinc_goal: {
		...NUTRITION_FIELD_LIMITS.zinc,
		label: "Zinc goal"
	},
	vitamin_a_goal: {
		...NUTRITION_FIELD_LIMITS.vitamin_a,
		label: "Vitamin A goal"
	},
	vitamin_c_goal: {
		...NUTRITION_FIELD_LIMITS.vitamin_c,
		label: "Vitamin C goal"
	},
	vitamin_d_goal: {
		...NUTRITION_FIELD_LIMITS.vitamin_d,
		label: "Vitamin D goal"
	}
};
function goalInputProps(key) {
	const rules = GOAL_FIELD_RULES[key] || {};
	return {
		min: rules.min ?? 0,
		max: rules.max,
		step: rules.decimals === 0 ? 1 : .01,
		inputMode: "decimal"
	};
}
function localDate(d = /* @__PURE__ */ new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function today() {
	return localDate();
}
function offsetDate(dateStr, delta) {
	const d = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
	d.setDate(d.getDate() + delta);
	return localDate(d);
}
function formatDateLabel(dateStr) {
	const t = today();
	if (dateStr === t) return "Today";
	if (dateStr === offsetDate(t, -1)) return "Yesterday";
	return (/* @__PURE__ */ new Date(dateStr + "T12:00:00")).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric"
	});
}
function fmtVal(v, unit) {
	if (unit === "g") return v < 10 ? v.toFixed(1) : Math.round(v);
	return Math.round(v);
}
function formatFoodLogTime(timestamp) {
	if (!timestamp) return "Logged today";
	return new Date(timestamp).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit"
	});
}
var _animIdx = 0;
var DETAIL_RENDER_SECTIONS = [
	{
		title: "Macros",
		items: [
			{
				label: "Calories",
				key: "calories",
				unit: "kcal",
				color: "var(--blue)"
			},
			{
				label: "Protein",
				key: "protein",
				unit: "g",
				color: "var(--blue)"
			},
			{
				label: "Carbohydrates",
				key: "carbs",
				unit: "g",
				color: "var(--blue)"
			},
			{
				label: "Fat",
				key: "fat",
				unit: "g",
				color: "var(--blue)"
			},
			{
				label: "Fiber",
				key: "fiber",
				unit: "g",
				color: "#22c55e",
				type: "target"
			},
			{
				label: "Sugar",
				key: "sugar",
				unit: "g",
				color: "#f43f5e",
				type: "max"
			},
			{
				label: "Saturated Fat",
				key: "saturated_fat",
				unit: "g",
				color: "#f43f5e",
				type: "max"
			}
		]
	},
	{
		title: "Electrolytes & Minerals",
		items: [
			{
				label: "Sodium",
				key: "sodium",
				unit: "mg",
				type: "max"
			},
			{
				label: "Potassium",
				key: "potassium",
				unit: "mg",
				type: "target"
			},
			{
				label: "Calcium",
				key: "calcium",
				unit: "mg",
				type: "target"
			},
			{
				label: "Iron",
				key: "iron",
				unit: "mg",
				type: "target"
			},
			{
				label: "Magnesium",
				key: "magnesium",
				unit: "mg",
				type: "target"
			},
			{
				label: "Zinc",
				key: "zinc",
				unit: "mg",
				type: "target"
			},
			{
				label: "Cholesterol",
				key: "cholesterol",
				unit: "mg",
				type: "max"
			}
		]
	},
	{
		title: "Vitamins",
		items: [
			{
				label: "Vitamin A",
				key: "vitamin_a",
				unit: "mcg"
			},
			{
				label: "Vitamin C",
				key: "vitamin_c",
				unit: "mg"
			},
			{
				label: "Vitamin D",
				key: "vitamin_d",
				unit: "mcg"
			}
		]
	}
].map((section) => ({
	...section,
	animationIndex: _animIdx++,
	items: section.items.map((item) => ({
		...item,
		animationIndex: _animIdx++
	}))
}));
function Nutrition({ openAddFoodTick = 0 }) {
	const userId = useCurrentUserId();
	const [date, setDate] = (0, import_react.useState)(today);
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [goals, setGoals] = (0, import_react.useState)(DEFAULT_GOALS);
	const [exerciseCalories, setExerciseCalories] = (0, import_react.useState)(0);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [addingFood, setAddingFood] = (0, import_react.useState)(false);
	const [showDetail, setShowDetail] = (0, import_react.useState)(false);
	const [editingGoals, setEditingGoals] = (0, import_react.useState)(false);
	const [goalsForm, setGoalsForm] = (0, import_react.useState)(null);
	const [goalsError, setGoalsError] = (0, import_react.useState)("");
	const [savingGoals, setSavingGoals] = (0, import_react.useState)(false);
	const [feedFilter, setFeedFilter] = (0, import_react.useState)("all");
	const [feedSortDirection, setFeedSortDirection] = (0, import_react.useState)("desc");
	const [deleteTargetId, setDeleteTargetId] = (0, import_react.useState)(null);
	const [viewingLog, setViewingLog] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (openAddFoodTick === 0) return;
		setAddingFood(true);
	}, [openAddFoodTick]);
	async function load() {
		if (!userId) return;
		setLoading(true);
		const cacheKey = `nut_${date}`;
		const cached = getCached(cacheKey);
		if (cached) {
			setLogs(cached.logs);
			setGoals(cached.goals);
			setExerciseCalories(cached.exerciseCalories || 0);
			setLoading(false);
			return;
		}
		const dayStart = (/* @__PURE__ */ new Date(date + "T00:00:00")).toISOString();
		const dayEnd = (/* @__PURE__ */ new Date(date + "T23:59:59.999")).toISOString();
		const [{ data: logData }, { data: prof }, { data: sessionRows }] = await Promise.all([
			supabase.from("nutrition_logs").select(NUTRITION_LOG_SELECT).eq("user_id", userId).eq("log_date", date).order("created_at"),
			supabase.from("profiles").select("calories_goal,protein_goal,carbs_goal,fat_goal,fiber_goal,sugar_goal,saturated_fat_goal,sodium_goal,potassium_goal,cholesterol_goal,calcium_goal,iron_goal,magnesium_goal,zinc_goal,vitamin_a_goal,vitamin_c_goal,vitamin_d_goal").eq("id", userId).single(),
			supabase.from("workout_sessions").select("calories_burned").eq("user_id", userId).not("finished_at", "is", null).gte("finished_at", dayStart).lte("finished_at", dayEnd)
		]);
		const resolvedGoals = prof ? {
			calories: prof.calories_goal || DEFAULT_GOALS.calories,
			protein: prof.protein_goal || DEFAULT_GOALS.protein,
			carbs: prof.carbs_goal || DEFAULT_GOALS.carbs,
			fat: prof.fat_goal || DEFAULT_GOALS.fat,
			fiber: prof.fiber_goal || DEFAULT_GOALS.fiber,
			sugar: prof.sugar_goal || DEFAULT_GOALS.sugar,
			saturated_fat: prof.saturated_fat_goal || DEFAULT_GOALS.saturated_fat,
			sodium: prof.sodium_goal || DEFAULT_GOALS.sodium,
			potassium: prof.potassium_goal || DEFAULT_GOALS.potassium,
			cholesterol: prof.cholesterol_goal || DEFAULT_GOALS.cholesterol,
			calcium: prof.calcium_goal || DEFAULT_GOALS.calcium,
			iron: prof.iron_goal || DEFAULT_GOALS.iron,
			magnesium: prof.magnesium_goal || DEFAULT_GOALS.magnesium,
			zinc: prof.zinc_goal || DEFAULT_GOALS.zinc,
			vitamin_a: prof.vitamin_a_goal || DEFAULT_GOALS.vitamin_a,
			vitamin_c: prof.vitamin_c_goal || DEFAULT_GOALS.vitamin_c,
			vitamin_d: prof.vitamin_d_goal || DEFAULT_GOALS.vitamin_d
		} : DEFAULT_GOALS;
		const burnedKcal = (sessionRows || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0);
		setCached(cacheKey, {
			logs: logData || [],
			goals: resolvedGoals,
			exerciseCalories: burnedKcal
		});
		setLogs(logData || []);
		setGoals(resolvedGoals);
		setExerciseCalories(burnedKcal);
		setLoading(false);
	}
	const loadLatest = (0, import_react.useEffectEvent)(() => {
		load();
	});
	(0, import_react.useEffect)(() => {
		const timer = setTimeout(() => {
			loadLatest();
		}, 0);
		return () => clearTimeout(timer);
	}, [date, userId]);
	async function addLog(food, servings) {
		if (!userId) return;
		const m = servings;
		const n = (k) => +((food[k] || 0) * m).toFixed(2);
		const entry = {
			user_id: userId,
			food_id: food.id || null,
			log_date: date,
			servings: m,
			food_name: food.name,
			calories: Math.round(food.calories * m),
			protein: n("protein"),
			carbs: n("carbs"),
			fat: n("fat"),
			fiber: n("fiber"),
			sugar: n("sugar"),
			saturated_fat: n("saturated_fat"),
			sodium: Math.round((food.sodium || 0) * m),
			potassium: Math.round((food.potassium || 0) * m),
			cholesterol: Math.round((food.cholesterol || 0) * m),
			calcium: Math.round((food.calcium || 0) * m),
			iron: n("iron"),
			magnesium: Math.round((food.magnesium || 0) * m),
			zinc: n("zinc"),
			vitamin_a: Math.round((food.vitamin_a || 0) * m),
			vitamin_c: n("vitamin_c"),
			vitamin_d: n("vitamin_d")
		};
		const { data, error } = await supabase.from("nutrition_logs").insert(entry).select(NUTRITION_LOG_SELECT).single();
		if (error) {
			console.error("addLog failed:", error.message);
			return;
		}
		if (data) setLogs((prev) => [...prev, data]);
		invalidateCache("home", `nut_${date}`, `cal_${date.slice(0, 7)}`, `recent_foods:${userId}`);
		setAddingFood(false);
	}
	async function removeLog(id) {
		const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
		if (error) {
			console.error("removeLog failed:", error.message);
			return;
		}
		setLogs((prev) => prev.filter((l) => l.id !== id));
		invalidateCache("home", `nut_${date}`, `cal_${date.slice(0, 7)}`);
	}
	const sum = (key) => logs.reduce((a, l) => a + (l[key] || 0), 0);
	const totals = {
		calories: sum("calories"),
		protein: sum("protein"),
		carbs: sum("carbs"),
		fat: sum("fat"),
		fiber: sum("fiber"),
		sugar: sum("sugar"),
		saturated_fat: sum("saturated_fat"),
		sodium: sum("sodium"),
		potassium: sum("potassium"),
		cholesterol: sum("cholesterol"),
		calcium: sum("calcium"),
		iron: sum("iron"),
		magnesium: sum("magnesium"),
		zinc: sum("zinc"),
		vitamin_a: sum("vitamin_a"),
		vitamin_c: sum("vitamin_c"),
		vitamin_d: sum("vitamin_d")
	};
	function openGoalsEdit() {
		setGoalsForm({
			...goals,
			calories_goal: goals.calories,
			protein_goal: goals.protein,
			carbs_goal: goals.carbs,
			fat_goal: goals.fat,
			fiber_goal: goals.fiber,
			sugar_goal: goals.sugar,
			saturated_fat_goal: goals.saturated_fat,
			sodium_goal: goals.sodium,
			potassium_goal: goals.potassium,
			cholesterol_goal: goals.cholesterol,
			calcium_goal: goals.calcium,
			iron_goal: goals.iron,
			magnesium_goal: goals.magnesium,
			zinc_goal: goals.zinc,
			vitamin_a_goal: goals.vitamin_a,
			vitamin_c_goal: goals.vitamin_c,
			vitamin_d_goal: goals.vitamin_d
		});
		setEditingGoals(true);
	}
	async function saveGoals() {
		if (!goalsForm || !userId) return;
		for (const [key, rules] of Object.entries(GOAL_FIELD_RULES)) {
			const error = validateNumber(goalsForm[key], {
				...rules,
				required: true
			});
			if (error) {
				setGoalsError(error);
				return;
			}
		}
		setSavingGoals(true);
		setGoalsError("");
		const n = (k) => +goalsForm[k] || 0;
		const nMacro = (k) => Math.max(1, +goalsForm[k] || 0);
		const updates = {
			calories_goal: nMacro("calories_goal"),
			protein_goal: nMacro("protein_goal"),
			carbs_goal: nMacro("carbs_goal"),
			fat_goal: nMacro("fat_goal"),
			fiber_goal: n("fiber_goal"),
			sugar_goal: n("sugar_goal"),
			saturated_fat_goal: n("saturated_fat_goal"),
			sodium_goal: n("sodium_goal"),
			potassium_goal: n("potassium_goal"),
			cholesterol_goal: n("cholesterol_goal"),
			calcium_goal: n("calcium_goal"),
			iron_goal: n("iron_goal"),
			magnesium_goal: n("magnesium_goal"),
			zinc_goal: n("zinc_goal"),
			vitamin_a_goal: n("vitamin_a_goal"),
			vitamin_c_goal: n("vitamin_c_goal"),
			vitamin_d_goal: n("vitamin_d_goal")
		};
		const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
		if (error) {
			setSavingGoals(false);
			setGoalsError(error.message || "Could not save nutrition goals.");
			return;
		}
		setGoals({
			calories: updates.calories_goal,
			protein: updates.protein_goal,
			carbs: updates.carbs_goal,
			fat: updates.fat_goal,
			fiber: updates.fiber_goal,
			sugar: updates.sugar_goal,
			saturated_fat: updates.saturated_fat_goal,
			sodium: updates.sodium_goal,
			potassium: updates.potassium_goal,
			cholesterol: updates.cholesterol_goal,
			calcium: updates.calcium_goal,
			iron: updates.iron_goal,
			magnesium: updates.magnesium_goal,
			zinc: updates.zinc_goal,
			vitamin_a: updates.vitamin_a_goal,
			vitamin_c: updates.vitamin_c_goal,
			vitamin_d: updates.vitamin_d_goal
		});
		setSavingGoals(false);
		setEditingGoals(false);
	}
	const remaining = goals.calories - Math.round(totals.calories) + exerciseCalories;
	const R = 52, C = 2 * Math.PI * R;
	const dash = Math.min(1, totals.calories / goals.calories) * C;
	const feedLogs = (0, import_react.useMemo)(() => {
		const items = [...logs];
		const directionMultiplier = feedSortDirection === "asc" ? 1 : -1;
		const dateDiff = (a, b) => {
			return (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * directionMultiplier;
		};
		if (feedFilter === "all") return items.sort((a, b) => dateDiff(a, b) || ((a.id || 0) - (b.id || 0)) * directionMultiplier);
		return items.sort((a, b) => ((Number(a[feedFilter]) || 0) - (Number(b[feedFilter]) || 0)) * directionMultiplier || dateDiff(a, b) || ((a.id || 0) - (b.id || 0)) * directionMultiplier);
	}, [
		logs,
		feedFilter,
		feedSortDirection
	]);
	const feedListKey = `${date}-${feedFilter}-${feedSortDirection}-${logs.length}`;
	if (viewingLog) {
		const log = viewingLog;
		const micros = [
			{
				label: "Fiber",
				val: +(log.fiber || 0).toFixed(1),
				unit: "g"
			},
			{
				label: "Sugar",
				val: +(log.sugar || 0).toFixed(1),
				unit: "g"
			},
			{
				label: "Saturated Fat",
				val: +(log.saturated_fat || 0).toFixed(1),
				unit: "g"
			},
			{
				label: "Sodium",
				val: Math.round(log.sodium || 0),
				unit: "mg"
			},
			{
				label: "Potassium",
				val: Math.round(log.potassium || 0),
				unit: "mg"
			},
			{
				label: "Cholesterol",
				val: Math.round(log.cholesterol || 0),
				unit: "mg"
			},
			{
				label: "Calcium",
				val: Math.round(log.calcium || 0),
				unit: "mg"
			},
			{
				label: "Iron",
				val: +(log.iron || 0).toFixed(2),
				unit: "mg"
			},
			{
				label: "Magnesium",
				val: Math.round(log.magnesium || 0),
				unit: "mg"
			},
			{
				label: "Zinc",
				val: +(log.zinc || 0).toFixed(1),
				unit: "mg"
			},
			{
				label: "Vitamin A",
				val: Math.round(log.vitamin_a || 0),
				unit: "mcg"
			},
			{
				label: "Vitamin C",
				val: +(log.vitamin_c || 0).toFixed(1),
				unit: "mg"
			},
			{
				label: "Vitamin D",
				val: +(log.vitamin_d || 0).toFixed(1),
				unit: "mcg"
			}
		].filter((m) => m.val > 0);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "nut-picker-screen",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-picker-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "back-btn",
						onClick: () => setViewingLog(null),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 12H5M12 5l-7 7 7 7" })
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "picker-title",
						children: log.food_name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-detail-brand",
						children: [
							log.servings !== 1 ? `${log.servings}× servings` : "1 serving",
							" · ",
							formatFoodLogTime(log.created_at)
						]
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-preview-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-preview-cal",
						children: [
							Math.round(log.calories),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "kcal" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-preview-macros",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-preview-macro",
								style: { "--mc": "#a855f7" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [(log.protein || 0).toFixed(1), "g"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Protein" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-preview-macro",
								style: { "--mc": "#f97316" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [(log.carbs || 0).toFixed(1), "g"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Carbs" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-preview-macro",
								style: { "--mc": "#eab308" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [(log.fat || 0).toFixed(1), "g"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Fat" })]
							})
						]
					})]
				}),
				micros.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-micros-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-micros-title",
						children: "More Nutrition"
					}), micros.map((mi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-micro-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: mi.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [mi.val, mi.unit] })]
					}, mi.label))]
				})
			]
		});
	}
	if (addingFood) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NutritionFoodPicker, {
		onAdd: addLog,
		onClose: () => setAddingFood(false),
		heading: "Add Food",
		submitLabel: "Add to Log"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "nutrition-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-date-nav",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "nut-date-btn",
						onClick: () => setDate((d) => offsetDate(d, -1)),
						children: "‹"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "nut-date-label",
						children: formatDateLabel(date)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "nut-date-btn",
						onClick: () => setDate((d) => offsetDate(d, 1)),
						disabled: date === today(),
						style: { opacity: date === today() ? .3 : 1 },
						children: "›"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: `nut-goals-btn ${editingGoals ? "active" : ""}`,
						onClick: () => editingGoals ? setEditingGoals(false) : openGoalsEdit(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "13",
							height: "13",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx: "12",
									cy: "12",
									r: "3"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2v2M12 20v2M2 12h2M20 12h2" })
							]
						}), "Goals"]
					})
				]
			}),
			editingGoals && goalsForm && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-goals-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-section-title",
						children: "Macros"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-grid",
						children: [
							{
								key: "calories_goal",
								label: "Calories",
								unit: "kcal"
							},
							{
								key: "protein_goal",
								label: "Protein",
								unit: "g"
							},
							{
								key: "carbs_goal",
								label: "Carbs",
								unit: "g"
							},
							{
								key: "fat_goal",
								label: "Fat",
								unit: "g"
							}
						].map(({ key, label, unit }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-goals-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "nut-goals-label",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-goals-input-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "nut-goals-input",
									type: "number",
									value: goalsForm[key],
									...goalInputProps(key),
									onChange: (e) => {
										setGoalsError("");
										setGoalsForm((f) => ({
											...f,
											[key]: e.target.value
										}));
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "nut-goals-unit",
									children: unit
								})]
							})]
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-section-title",
						children: "Macro Detail"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-grid",
						children: [
							{
								key: "fiber_goal",
								label: "Fiber",
								unit: "g"
							},
							{
								key: "sugar_goal",
								label: "Sugar (max)",
								unit: "g"
							},
							{
								key: "saturated_fat_goal",
								label: "Sat. Fat (max)",
								unit: "g"
							},
							{
								key: "cholesterol_goal",
								label: "Chol. (max)",
								unit: "mg"
							}
						].map(({ key, label, unit }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-goals-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "nut-goals-label",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-goals-input-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "nut-goals-input",
									type: "number",
									value: goalsForm[key],
									...goalInputProps(key),
									onChange: (e) => {
										setGoalsError("");
										setGoalsForm((f) => ({
											...f,
											[key]: e.target.value
										}));
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "nut-goals-unit",
									children: unit
								})]
							})]
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-section-title",
						children: "Electrolytes & Minerals"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-grid",
						children: [
							{
								key: "sodium_goal",
								label: "Sodium (max)",
								unit: "mg"
							},
							{
								key: "potassium_goal",
								label: "Potassium",
								unit: "mg"
							},
							{
								key: "calcium_goal",
								label: "Calcium",
								unit: "mg"
							},
							{
								key: "iron_goal",
								label: "Iron",
								unit: "mg"
							},
							{
								key: "magnesium_goal",
								label: "Magnesium",
								unit: "mg"
							},
							{
								key: "zinc_goal",
								label: "Zinc",
								unit: "mg"
							}
						].map(({ key, label, unit }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-goals-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "nut-goals-label",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-goals-input-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "nut-goals-input",
									type: "number",
									value: goalsForm[key],
									...goalInputProps(key),
									onChange: (e) => {
										setGoalsError("");
										setGoalsForm((f) => ({
											...f,
											[key]: e.target.value
										}));
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "nut-goals-unit",
									children: unit
								})]
							})]
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-section-title",
						children: "Vitamins"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-goals-grid",
						children: [
							{
								key: "vitamin_a_goal",
								label: "Vitamin A",
								unit: "mcg"
							},
							{
								key: "vitamin_c_goal",
								label: "Vitamin C",
								unit: "mg"
							},
							{
								key: "vitamin_d_goal",
								label: "Vitamin D",
								unit: "mcg"
							}
						].map(({ key, label, unit }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-goals-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "nut-goals-label",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-goals-input-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "nut-goals-input",
									type: "number",
									value: goalsForm[key],
									...goalInputProps(key),
									onChange: (e) => {
										setGoalsError("");
										setGoalsForm((f) => ({
											...f,
											[key]: e.target.value
										}));
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "nut-goals-unit",
									children: unit
								})]
							})]
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-goals-actions",
						children: [
							goalsError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "cf-error",
								children: goalsError
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "nut-goals-cancel",
								onClick: () => setEditingGoals(false),
								children: "Cancel"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "nut-goals-save",
								onClick: saveGoals,
								disabled: savingGoals,
								children: savingGoals ? "Saving..." : "Save Goals"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-summary",
				onClick: () => setShowDetail((s) => !s),
				style: { cursor: "pointer" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-ring-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "120",
						height: "120",
						viewBox: "0 0 120 120",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "60",
							cy: "60",
							r: R,
							fill: "none",
							stroke: "var(--surface2)",
							strokeWidth: "9"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "60",
							cy: "60",
							r: R,
							fill: "none",
							stroke: "var(--blue)",
							strokeWidth: "9",
							strokeDasharray: `${dash} ${C}`,
							strokeLinecap: "round",
							transform: "rotate(-90 60 60)",
							style: { transition: "stroke-dasharray 0.5s ease" }
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-ring-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-ring-cal",
							children: Math.round(totals.calories)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-ring-label",
							children: "kcal"
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nut-macros",
					children: [
						[
							{
								label: "Protein",
								key: "protein",
								color: "var(--blue)"
							},
							{
								label: "Carbs",
								key: "carbs",
								color: "var(--blue)"
							},
							{
								label: "Fat",
								key: "fat",
								color: "var(--blue)"
							}
						].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-macro-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-macro-header",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "nut-macro-label",
									children: m.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "nut-macro-val",
									children: [totals[m.key].toFixed(0), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "nut-macro-goal",
										children: [
											"/",
											goals[m.key],
											"g"
										]
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "nut-macro-track",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "nut-macro-fill",
									style: {
										width: `${Math.min(100, totals[m.key] / goals[m.key] * 100)}%`,
										background: m.color
									}
								})
							})]
						}, m.label)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-remaining",
							style: { color: remaining < 0 ? "#ef4444" : "var(--muted)" },
							children: remaining > 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over goal`
						}),
						exerciseCalories > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-burned-row",
							children: [
								"~",
								exerciseCalories,
								" kcal burned today"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-expand-hint",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: showDetail ? "Hide breakdown" : "Full breakdown" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
								className: `nut-expand-chevron ${showDetail ? "open" : ""}`,
								width: "12",
								height: "12",
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "2.5",
								strokeLinecap: "round",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 9l6 6 6-6" })
							})]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `nut-detail-wrap ${showDetail ? "expanded" : ""}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "nut-detail-wrap-inner",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-detail-card",
						children: DETAIL_RENDER_SECTIONS.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-detail-section",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "nut-detail-section-title",
								style: { "--detail-index": section.animationIndex },
								children: section.title
							}), section.items.map(({ label, key, unit, color, type, animationIndex }) => {
								const val = totals[key] || 0;
								const goal = goals[key] || 1;
								const over = type === "max" && val > goal;
								const pct = Math.min(100, val / goal * 100);
								const barColor = type === "max" ? over ? "#ef4444" : "#22c55e" : color || (pct >= 100 ? "#22c55e" : "var(--blue)");
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "nut-detail-row",
									style: { "--detail-index": animationIndex },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-detail-row-header",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "nut-detail-label",
											children: [label, section.title === "Electrolytes & Minerals" && type === "max" ? " (max)" : ""]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "nut-detail-val",
											style: { color: over ? "#ef4444" : "var(--text)" },
											children: [fmtVal(val, unit), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "nut-detail-goal",
												children: [
													"/",
													goal,
													unit
												]
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "nut-micro-track",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "nut-micro-fill",
											style: {
												width: `${pct}%`,
												background: barColor
											}
										})
									})]
								}, key);
							})]
						}, section.title))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "nut-feed-section",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-feed-header",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-feed-title",
							children: "Food Log"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-feed-subtitle",
							children: logs.length ? `${logs.length} ${logs.length === 1 ? "food" : "foods"} tracked today` : "Track everything you eat in one running feed."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "nut-feed-add-btn",
							onClick: () => setAddingFood(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "+" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add Food" })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-feed-controls",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-feed-filters",
							children: FEED_FILTERS.map((filter) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `nut-feed-filter ${feedFilter === filter.id ? "active" : ""}`,
								onClick: () => setFeedFilter(filter.id),
								children: filter.label
							}, filter.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-feed-order",
							role: "group",
							"aria-label": "Sort order",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `nut-feed-order-btn ${feedSortDirection === "asc" ? "active" : ""}`,
								onClick: () => setFeedSortDirection("asc"),
								"aria-label": "Sort ascending",
								title: "Sort ascending",
								children: "↑"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `nut-feed-order-btn ${feedSortDirection === "desc" ? "active" : ""}`,
								onClick: () => setFeedSortDirection("desc"),
								"aria-label": "Sort descending",
								title: "Sort descending",
								children: "↓"
							})]
						})]
					}),
					loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true }) : logs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nut-feed-list nut-feed-list-animated",
						children: feedLogs.map((log, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "nut-feed-item",
							style: { "--feed-index": index },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-feed-rail",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nut-feed-dot" }), index < feedLogs.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nut-feed-line" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "nut-feed-card",
								onClick: () => {
									setDeleteTargetId(null);
									setViewingLog(log);
								},
								style: { cursor: "pointer" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "nut-feed-card-top",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-feed-copy",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "nut-feed-food",
											children: log.food_name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "nut-feed-meta",
											children: [
												log.servings !== 1 ? `${log.servings}× servings` : "1 serving",
												" · ",
												formatFoodLogTime(log.created_at)
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-feed-kcal",
										children: [Math.round(log.calories), " kcal"]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "nut-feed-footer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-feed-pills",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "nut-feed-pill nut-feed-pill-protein",
												children: [
													"P ",
													Math.round(log.protein || 0),
													"g"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "nut-feed-pill nut-feed-pill-carbs",
												children: [
													"C ",
													Math.round(log.carbs || 0),
													"g"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "nut-feed-pill nut-feed-pill-fat",
												children: [
													"F ",
													Math.round(log.fat || 0),
													"g"
												]
											})
										]
									}), deleteTargetId === log.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "nut-feed-delete-confirm",
										onClick: (e) => e.stopPropagation(),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "nut-feed-delete-confirm-text",
												children: "Remove this entry?"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "nut-feed-delete-cancel-btn",
												onClick: () => setDeleteTargetId(null),
												children: "Cancel"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "nut-feed-remove-btn nut-feed-remove-btn-confirm",
												onClick: () => {
													removeLog(log.id);
													setDeleteTargetId(null);
												},
												children: "Delete"
											})
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "nut-feed-remove-btn",
										onClick: (e) => {
											e.stopPropagation();
											setDeleteTargetId(log.id);
										},
										children: "Delete"
									})]
								})]
							})]
						}, log.id))
					}, feedListKey) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nut-feed-empty",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "nut-feed-empty-title",
							children: "No food tracked yet"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "nut-feed-add-btn nut-feed-add-btn-inline",
							onClick: () => setAddingFood(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "+" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add your first food" })]
						})]
					})
				]
			})
		]
	});
}
//#endregion
export { Nutrition as default };

//# sourceMappingURL=Nutrition-Cc3cYLd1.js.map