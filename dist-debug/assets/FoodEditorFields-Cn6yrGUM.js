import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { T as validateNutritionForm, _ as NUTRITION_FIELD_LIMITS, b as trimToMax, v as VALIDATION_LIMITS } from "./index-BNajgLSV.js";
//#region src/lib/foodEditor.js
var FOOD_FORM_FIELDS = [
	{
		key: "name",
		label: "Name",
		unit: "",
		type: "text",
		required: true
	},
	{
		key: "brand",
		label: "Brand",
		unit: "",
		type: "text"
	},
	{
		key: "serving_size",
		label: "Serving Size",
		unit: "",
		type: "number",
		required: true,
		rules: NUTRITION_FIELD_LIMITS.serving_size
	},
	{
		key: "serving_unit",
		label: "Serving Unit",
		unit: "",
		type: "text"
	},
	{
		key: "calories",
		label: "Calories",
		unit: "kcal",
		type: "number",
		required: true,
		rules: NUTRITION_FIELD_LIMITS.calories
	},
	{
		key: "protein",
		label: "Protein",
		unit: "g",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.protein
	},
	{
		key: "carbs",
		label: "Carbs",
		unit: "g",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.carbs
	},
	{
		key: "fat",
		label: "Fat",
		unit: "g",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.fat
	},
	{
		key: "fiber",
		label: "Fiber",
		unit: "g",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.fiber
	},
	{
		key: "sugar",
		label: "Sugar",
		unit: "g",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.sugar
	},
	{
		key: "saturated_fat",
		label: "Saturated Fat",
		unit: "g",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.saturated_fat
	},
	{
		key: "sodium",
		label: "Sodium",
		unit: "mg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.sodium
	},
	{
		key: "potassium",
		label: "Potassium",
		unit: "mg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.potassium
	},
	{
		key: "cholesterol",
		label: "Cholesterol",
		unit: "mg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.cholesterol
	},
	{
		key: "vitamin_a",
		label: "Vitamin A",
		unit: "mcg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.vitamin_a
	},
	{
		key: "vitamin_c",
		label: "Vitamin C",
		unit: "mg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.vitamin_c
	},
	{
		key: "calcium",
		label: "Calcium",
		unit: "mg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.calcium
	},
	{
		key: "iron",
		label: "Iron",
		unit: "mg",
		type: "number",
		rules: NUTRITION_FIELD_LIMITS.iron
	}
];
var EMPTY_FOOD_FORM = {
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
function numberOrZero$1(value) {
	if (value === "" || value === null || value === void 0) return 0;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
}
function foodToFormValues(food = {}) {
	return {
		name: String(food?.name || ""),
		brand: String(food?.brand || ""),
		serving_size: String(food?.serving_size || 100),
		serving_unit: String(food?.serving_unit || "g"),
		calories: String(Math.round(Number(food?.calories) || 0)),
		protein: String(+(Number(food?.protein) || 0).toFixed(1)),
		carbs: String(+(Number(food?.carbs) || 0).toFixed(1)),
		fat: String(+(Number(food?.fat) || 0).toFixed(1)),
		fiber: String(+(Number(food?.fiber) || 0).toFixed(1)),
		sugar: String(+(Number(food?.sugar) || 0).toFixed(1)),
		saturated_fat: String(+(Number(food?.saturated_fat) || 0).toFixed(1)),
		sodium: String(Math.round(Number(food?.sodium) || 0)),
		potassium: String(Math.round(Number(food?.potassium) || 0)),
		cholesterol: String(Math.round(Number(food?.cholesterol) || 0)),
		vitamin_a: String(+(Number(food?.vitamin_a) || 0).toFixed(1)),
		vitamin_c: String(+(Number(food?.vitamin_c) || 0).toFixed(1)),
		calcium: String(Math.round(Number(food?.calcium) || 0)),
		iron: String(+(Number(food?.iron) || 0).toFixed(2))
	};
}
function isFoodFormValid(form) {
	return !validateNutritionForm(form);
}
function getFoodFormError(form) {
	return validateNutritionForm(form);
}
function buildFoodPayload(form, userId) {
	return {
		user_id: userId,
		name: form?.name?.trim() || "",
		brand: form?.brand?.trim() || null,
		serving_size: numberOrZero$1(form?.serving_size) || 100,
		serving_unit: String(form?.serving_unit || "g").trim() || "g",
		calories: numberOrZero$1(form?.calories),
		protein: numberOrZero$1(form?.protein),
		carbs: numberOrZero$1(form?.carbs),
		fat: numberOrZero$1(form?.fat),
		fiber: numberOrZero$1(form?.fiber),
		sugar: numberOrZero$1(form?.sugar),
		saturated_fat: numberOrZero$1(form?.saturated_fat),
		sodium: numberOrZero$1(form?.sodium),
		potassium: numberOrZero$1(form?.potassium),
		cholesterol: numberOrZero$1(form?.cholesterol),
		vitamin_a: numberOrZero$1(form?.vitamin_a),
		vitamin_c: numberOrZero$1(form?.vitamin_c),
		calcium: numberOrZero$1(form?.calcium),
		iron: numberOrZero$1(form?.iron)
	};
}
function foodFromFormValues(form, baseFood = {}, { persistAsNew = false } = {}) {
	const next = {
		...baseFood,
		name: form?.name?.trim() || "",
		brand: form?.brand?.trim() || null,
		serving_size: numberOrZero$1(form?.serving_size) || 100,
		serving_unit: String(form?.serving_unit || "g").trim() || "g",
		calories: numberOrZero$1(form?.calories),
		protein: numberOrZero$1(form?.protein),
		carbs: numberOrZero$1(form?.carbs),
		fat: numberOrZero$1(form?.fat),
		fiber: numberOrZero$1(form?.fiber),
		sugar: numberOrZero$1(form?.sugar),
		saturated_fat: numberOrZero$1(form?.saturated_fat),
		sodium: numberOrZero$1(form?.sodium),
		potassium: numberOrZero$1(form?.potassium),
		cholesterol: numberOrZero$1(form?.cholesterol),
		vitamin_a: numberOrZero$1(form?.vitamin_a),
		vitamin_c: numberOrZero$1(form?.vitamin_c),
		calcium: numberOrZero$1(form?.calcium),
		iron: numberOrZero$1(form?.iron)
	};
	if (persistAsNew) next.persistAsNew = true;
	else delete next.persistAsNew;
	return next;
}
//#endregion
//#region src/lib/usdaFoods.js
var USDA_API_KEY = "SJ20GBqhXe9Mzt2kXBIBvNNvcoMWSVvf0hBfcR0j";
var USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
var USDA_LOCAL_SOFT_LIMIT_PER_HOUR = 1e3;
var USDA_LOCAL_THROTTLE_KEY = "usdaRequestBucket";
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
var NUTRIENT_NUMBERS = {
	calories: [
		"208",
		"958",
		"957",
		"2048",
		"2047"
	],
	protein: ["203"],
	carbs: ["205"],
	fat: ["204"],
	fiber: ["291"],
	sugar: ["269"],
	saturated_fat: ["606"],
	sodium: ["307"],
	potassium: ["306"],
	cholesterol: ["601"],
	calcium: ["301"],
	iron: ["303"],
	magnesium: ["304"],
	zinc: ["309"],
	vitamin_a: ["318", "320"],
	vitamin_c: ["401"],
	vitamin_d: ["324", "328"]
};
var NUTRIENT_NAME_ALIASES = {
	calories: [
		"energy",
		"energy atwater specific factors",
		"energy atwater general factors"
	],
	protein: ["protein"],
	carbs: ["carbohydrate by difference", "carbohydrate"],
	fat: ["total lipid fat", "fat"],
	fiber: ["fiber total dietary", "dietary fiber"],
	sugar: ["total sugars", "sugars total including nlea"],
	saturated_fat: ["fatty acids total saturated", "saturated fat"],
	sodium: ["sodium na", "sodium"],
	potassium: ["potassium k", "potassium"],
	cholesterol: ["cholesterol"],
	calcium: ["calcium ca", "calcium"],
	iron: ["iron fe", "iron"],
	magnesium: ["magnesium mg", "magnesium"],
	zinc: ["zinc zn", "zinc"],
	vitamin_a: ["vitamin a rae", "vitamin a iu"],
	vitamin_c: ["vitamin c total ascorbic acid", "vitamin c"],
	vitamin_d: ["vitamin d d2 d3", "vitamin d"]
};
var LABEL_NUTRIENT_KEYS = {
	calories: ["calories"],
	protein: ["protein"],
	carbs: ["carbohydrates"],
	fat: ["fat"],
	fiber: ["fiber"],
	sugar: ["sugars"],
	saturated_fat: ["saturatedFat"],
	sodium: ["sodium"],
	cholesterol: ["cholesterol"]
};
function normalizeUnit(unit) {
	return String(unit || "").trim().toLowerCase() || "g";
}
function normalizeSearchValue(value) {
	return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function applySearchAliases(value) {
	let normalized = ` ${normalizeSearchValue(value)} `;
	for (const [from, to] of SEARCH_ALIAS_REPLACEMENTS) normalized = normalized.split(` ${from} `).join(` ${to} `);
	return normalizeSearchValue(normalized);
}
function buildUsdaQueries(query) {
	const queries = [];
	const push = (value) => {
		const normalized = normalizeSearchValue(value);
		if (!normalized || queries.includes(normalized)) return;
		queries.push(normalized);
	};
	const aliasNormalized = applySearchAliases(query);
	const rawNormalized = normalizeSearchValue(query);
	const longestToken = [...aliasNormalized.split(/\s+/).filter((token) => token.length >= 3)].sort((a, b) => b.length - a.length)[0] || "";
	push(aliasNormalized);
	push(rawNormalized);
	if (longestToken && longestToken !== aliasNormalized) push(longestToken);
	if (longestToken.length >= 5) push(longestToken.slice(0, 4));
	return queries.slice(0, 4);
}
function numberOrZero(value) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
}
function clampNumber(value, min, max) {
	const numeric = numberOrZero(value);
	return Math.min(max, Math.max(min, numeric));
}
function recordUsdaRequest() {
	if (typeof window === "undefined") return;
	try {
		const now = Date.now();
		const raw = JSON.parse(window.localStorage.getItem(USDA_LOCAL_THROTTLE_KEY) || "{}");
		const resetAt = Number(raw.resetAt) || 0;
		const count = now < resetAt ? Number(raw.count) || 0 : 0;
		const next = {
			resetAt: now < resetAt ? resetAt : now + 3600 * 1e3,
			count: count + 1
		};
		window.localStorage.setItem(USDA_LOCAL_THROTTLE_KEY, JSON.stringify(next));
		if (next.count > USDA_LOCAL_SOFT_LIMIT_PER_HOUR) throw new Error("USDA lookup limit reached on this device. Please try again later.");
	} catch (error) {
		if (error?.message?.includes("USDA lookup limit")) throw error;
	}
}
function normalizeNutrientName(value) {
	return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function getRawNutrientValue(nutrient) {
	if ("value" in nutrient) return numberOrZero(nutrient.value);
	if ("amount" in nutrient) return numberOrZero(nutrient.amount);
	return 0;
}
function getLabelNutrientValue(labelNutrients, nutrientKey) {
	if (!labelNutrients) return 0;
	const candidateKeys = LABEL_NUTRIENT_KEYS[nutrientKey] || [];
	for (const key of candidateKeys) {
		const rawEntry = labelNutrients[key];
		if (rawEntry && typeof rawEntry === "object") {
			if ("value" in rawEntry) return numberOrZero(rawEntry.value);
			if ("amount" in rawEntry) return numberOrZero(rawEntry.amount);
		}
	}
	return 0;
}
function getNutrientValue(nutrientKey, foodNutrients = [], labelNutrients = null) {
	const nutrientNumbers = NUTRIENT_NUMBERS[nutrientKey] || [];
	const nutrientNames = (NUTRIENT_NAME_ALIASES[nutrientKey] || []).map(normalizeNutrientName);
	for (const nutrientNumber of nutrientNumbers) for (const nutrient of foodNutrients) if (String(nutrient?.nutrientNumber || "") === nutrientNumber) return getRawNutrientValue(nutrient);
	for (const nutrientName of nutrientNames) for (const nutrient of foodNutrients) if (normalizeNutrientName(nutrient?.nutrientName || nutrient?.nutrient?.name || "") === nutrientName) return getRawNutrientValue(nutrient);
	const labelValue = getLabelNutrientValue(labelNutrients, nutrientKey);
	if (labelValue > 0) return labelValue;
	return 0;
}
function mapUsdaFood(food) {
	if (!food?.fdcId || !food?.description) return null;
	const servingSize = numberOrZero(food.servingSize) > 0 ? clampNumber(food.servingSize, NUTRITION_FIELD_LIMITS.serving_size.min, NUTRITION_FIELD_LIMITS.serving_size.max) : 100;
	const servingUnit = numberOrZero(food.servingSize) > 0 ? trimToMax(normalizeUnit(food.servingSizeUnit), VALIDATION_LIMITS.servingUnitMaxLength) : "g";
	const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];
	const labelNutrients = food.labelNutrients && typeof food.labelNutrients === "object" ? food.labelNutrients : null;
	const protein = getNutrientValue("protein", nutrients, labelNutrients);
	const carbs = getNutrientValue("carbs", nutrients, labelNutrients);
	const fat = getNutrientValue("fat", nutrients, labelNutrients);
	const calorieValue = getNutrientValue("calories", nutrients, labelNutrients);
	const estimatedCalories = protein * 4 + carbs * 4 + fat * 9;
	const calories = calorieValue > 0 ? calorieValue : estimatedCalories;
	return {
		id: null,
		remoteKey: `usda:${food.fdcId}`,
		source: "usda",
		usdaFdcId: food.fdcId,
		data_type: String(food.dataType || ""),
		is_branded: String(food.dataType || "").toLowerCase() === "branded" || Boolean(food.brandName || food.brandOwner),
		searchText: trimToMax(`${food.brandName || food.brandOwner || ""} ${String(food.description).trim()}`.trim(), VALIDATION_LIMITS.foodNameMaxLength + VALIDATION_LIMITS.foodBrandMaxLength + 1),
		name: trimToMax(String(food.description).trim(), VALIDATION_LIMITS.foodNameMaxLength),
		brand: food.brandName || food.brandOwner ? trimToMax(food.brandName || food.brandOwner, VALIDATION_LIMITS.foodBrandMaxLength) : null,
		serving_size: servingSize,
		serving_unit: servingUnit,
		calories: Math.round(clampNumber(calories, NUTRITION_FIELD_LIMITS.calories.min, NUTRITION_FIELD_LIMITS.calories.max)),
		protein: clampNumber(protein, NUTRITION_FIELD_LIMITS.protein.min, NUTRITION_FIELD_LIMITS.protein.max),
		carbs: clampNumber(carbs, NUTRITION_FIELD_LIMITS.carbs.min, NUTRITION_FIELD_LIMITS.carbs.max),
		fat: clampNumber(fat, NUTRITION_FIELD_LIMITS.fat.min, NUTRITION_FIELD_LIMITS.fat.max),
		fiber: clampNumber(getNutrientValue("fiber", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.fiber.min, NUTRITION_FIELD_LIMITS.fiber.max),
		sugar: clampNumber(getNutrientValue("sugar", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.sugar.min, NUTRITION_FIELD_LIMITS.sugar.max),
		saturated_fat: clampNumber(getNutrientValue("saturated_fat", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.saturated_fat.min, NUTRITION_FIELD_LIMITS.saturated_fat.max),
		sodium: clampNumber(getNutrientValue("sodium", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.sodium.min, NUTRITION_FIELD_LIMITS.sodium.max),
		potassium: clampNumber(getNutrientValue("potassium", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.potassium.min, NUTRITION_FIELD_LIMITS.potassium.max),
		cholesterol: clampNumber(getNutrientValue("cholesterol", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.cholesterol.min, NUTRITION_FIELD_LIMITS.cholesterol.max),
		calcium: clampNumber(getNutrientValue("calcium", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.calcium.min, NUTRITION_FIELD_LIMITS.calcium.max),
		iron: clampNumber(getNutrientValue("iron", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.iron.min, NUTRITION_FIELD_LIMITS.iron.max),
		magnesium: clampNumber(getNutrientValue("magnesium", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.magnesium.min, NUTRITION_FIELD_LIMITS.magnesium.max),
		zinc: clampNumber(getNutrientValue("zinc", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.zinc.min, NUTRITION_FIELD_LIMITS.zinc.max),
		vitamin_a: clampNumber(getNutrientValue("vitamin_a", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.vitamin_a.min, NUTRITION_FIELD_LIMITS.vitamin_a.max),
		vitamin_c: clampNumber(getNutrientValue("vitamin_c", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.vitamin_c.min, NUTRITION_FIELD_LIMITS.vitamin_c.max),
		vitamin_d: clampNumber(getNutrientValue("vitamin_d", nutrients, labelNutrients), NUTRITION_FIELD_LIMITS.vitamin_d.min, NUTRITION_FIELD_LIMITS.vitamin_d.max)
	};
}
function normalizeBarcode(code) {
	const digits = trimToMax(String(code || "").replace(/\D/g, ""), 32);
	if (!digits) return "";
	return digits.replace(/^0+/, "") || "0";
}
async function searchUsdaFoods(query, { signal, pageSize = 24 } = {}) {
	const trimmedQuery = trimToMax(String(query || "").trim(), VALIDATION_LIMITS.searchMaxLength);
	if (!trimmedQuery) return [];
	const requestedPageSize = Math.max(1, Math.min(50, pageSize));
	const candidateQueries = buildUsdaQueries(trimmedQuery);
	const foodsById = /* @__PURE__ */ new Map();
	for (const candidateQuery of candidateQueries) {
		if (signal?.aborted) break;
		const params = new URLSearchParams({
			api_key: USDA_API_KEY,
			query: candidateQuery,
			pageSize: String(requestedPageSize)
		});
		recordUsdaRequest();
		const response = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`, { signal });
		if (!response.ok) throw new Error(`USDA search failed (${response.status})`);
		const payload = await response.json();
		const foods = Array.isArray(payload?.foods) ? payload.foods : [];
		for (const food of foods) {
			const mapped = mapUsdaFood(food);
			if (!mapped) continue;
			foodsById.set(String(mapped.remoteKey), mapped);
		}
		if (foodsById.size >= requestedPageSize) break;
	}
	return [...foodsById.values()];
}
async function lookupUsdaBarcode(barcode, { signal } = {}) {
	const normalizedInput = normalizeBarcode(barcode);
	if (!normalizedInput || normalizedInput.length > 32) return null;
	const params = new URLSearchParams({
		api_key: USDA_API_KEY,
		query: trimToMax(String(barcode).replace(/\D/g, ""), 32),
		dataType: "Branded",
		pageSize: "5"
	});
	recordUsdaRequest();
	const response = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`, { signal });
	if (!response.ok) return null;
	const payload = await response.json();
	const match = (Array.isArray(payload?.foods) ? payload.foods : []).find((f) => f.gtinUpc && normalizeBarcode(f.gtinUpc) === normalizedInput);
	return match ? mapUsdaFood(match) : null;
}
//#endregion
//#region src/components/nutrition/FoodEditorFields.jsx
var import_jsx_runtime = require_jsx_runtime();
function getTextMaxLength(key) {
	if (key === "name") return VALIDATION_LIMITS.foodNameMaxLength;
	if (key === "brand") return VALIDATION_LIMITS.foodBrandMaxLength;
	if (key === "serving_unit") return VALIDATION_LIMITS.servingUnitMaxLength;
}
function fieldInputProps(field) {
	if (field.type !== "number") return { maxLength: getTextMaxLength(field.key) };
	return {
		inputMode: "decimal",
		min: field.rules?.min ?? 0,
		max: field.rules?.max,
		step: field.rules?.decimals === 0 ? 1 : .01
	};
}
function FoodEditorFields({ form, onFieldChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "cf-section",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "cf-section-title",
				children: "Food Info"
			}), FOOD_FORM_FIELDS.slice(0, 4).map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cf-field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "cf-label",
					children: [field.label, field.required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "cf-required",
						children: " *"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "cf-input-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "cf-input",
						type: field.type,
						value: form?.[field.key] ?? "",
						...fieldInputProps(field),
						onChange: (event) => onFieldChange(field.key, event.target.value)
					})
				})]
			}, field.key))]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "cf-section",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cf-section-title",
				children: ["Macros ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "cf-section-note",
					children: "per serving"
				})]
			}), FOOD_FORM_FIELDS.slice(4, 8).map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cf-field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "cf-label",
					children: [field.required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "cf-required",
						children: "* "
					}), field.label]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-input-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "cf-input",
						type: "number",
						value: form?.[field.key] ?? "",
						...fieldInputProps(field),
						onChange: (event) => onFieldChange(field.key, event.target.value)
					}), field.unit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "cf-unit",
						children: field.unit
					})]
				})]
			}, field.key))]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "cf-section",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cf-section-title",
				children: ["More Nutrition ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "cf-section-note",
					children: "(optional)"
				})]
			}), FOOD_FORM_FIELDS.slice(8).map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cf-field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "cf-label",
					children: field.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cf-input-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "cf-input",
						type: "number",
						value: form?.[field.key] ?? "",
						...fieldInputProps(field),
						onChange: (event) => onFieldChange(field.key, event.target.value)
					}), field.unit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "cf-unit",
						children: field.unit
					})]
				})]
			}, field.key))]
		})
	] });
}
//#endregion
export { buildFoodPayload as a, getFoodFormError as c, EMPTY_FOOD_FORM as i, isFoodFormValid as l, lookupUsdaBarcode as n, foodFromFormValues as o, searchUsdaFoods as r, foodToFormValues as s, FoodEditorFields as t };

//# sourceMappingURL=FoodEditorFields-Cn6yrGUM.js.map