import { t as supabase } from "./supabase-CCACEYhB.js";
import { G as invalidateCache, H as getCached, K as setCached } from "./index-BNajgLSV.js";
import { x as STRENGTHLEVEL_EXERCISES } from "./rollingRanks-BNemOpZT.js";
//#region src/data/exercises.js
var EXERCISES_CACHE_KEY = "exercises";
var CUSTOM_EXERCISE_SELECT = [
	"id",
	"name",
	"category",
	"equipment",
	"user_id",
	"primary_muscles",
	"secondary_muscles",
	"default_rest_seconds"
].join(", ");
var CARDIO_EXERCISES = [
	{
		name: "Running",
		equipment: "Bodyweight"
	},
	{
		name: "Jogging",
		equipment: "Bodyweight"
	},
	{
		name: "Walking",
		equipment: "Bodyweight"
	},
	{
		name: "Hiking",
		equipment: "Bodyweight"
	},
	{
		name: "Trail Running",
		equipment: "Bodyweight"
	},
	{
		name: "Sprinting",
		equipment: "Bodyweight"
	},
	{
		name: "Cycling",
		equipment: "Bodyweight"
	},
	{
		name: "Jump Rope",
		equipment: "Bodyweight"
	},
	{
		name: "Jumping Jacks",
		equipment: "Bodyweight"
	},
	{
		name: "Burpees",
		equipment: "Bodyweight"
	},
	{
		name: "Mountain Climbers",
		equipment: "Bodyweight"
	},
	{
		name: "High Knees",
		equipment: "Bodyweight"
	},
	{
		name: "Swimming",
		equipment: "Bodyweight"
	},
	{
		name: "HIIT",
		equipment: "Bodyweight"
	},
	{
		name: "Tabata",
		equipment: "Bodyweight"
	},
	{
		name: "Circuit Training",
		equipment: "Bodyweight"
	},
	{
		name: "Shadow Boxing",
		equipment: "Bodyweight"
	},
	{
		name: "Boxing",
		equipment: "Bodyweight"
	},
	{
		name: "Kickboxing",
		equipment: "Bodyweight"
	},
	{
		name: "Dance Cardio",
		equipment: "Bodyweight"
	},
	{
		name: "Aerobics",
		equipment: "Bodyweight"
	},
	{
		name: "Zumba",
		equipment: "Bodyweight"
	},
	{
		name: "Step Aerobics",
		equipment: "Bodyweight"
	},
	{
		name: "Treadmill",
		equipment: "Machine"
	},
	{
		name: "Stationary Bike",
		equipment: "Machine"
	},
	{
		name: "Spin Bike",
		equipment: "Machine"
	},
	{
		name: "Rowing Machine",
		equipment: "Machine"
	},
	{
		name: "Elliptical",
		equipment: "Machine"
	},
	{
		name: "Stair Climber",
		equipment: "Machine"
	},
	{
		name: "Assault Bike",
		equipment: "Machine"
	},
	{
		name: "Ski Erg",
		equipment: "Machine"
	},
	{
		name: "Versa Climber",
		equipment: "Machine"
	},
	{
		name: "Battle Ropes",
		equipment: "Other"
	}
];
var CARDIO_NAME_SET = new Set(CARDIO_EXERCISES.map((c) => c.name));
var CARDIO_EQUIPMENT_BY_NAME = new Map(CARDIO_EXERCISES.map((c) => [c.name, c.equipment]));
try {
	const prefix = "liftlog:startup-snapshot:exercises";
	Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k));
} catch {}
var CATALOG_DEFAULTS = STRENGTHLEVEL_EXERCISES.map((ex) => ({
	id: void 0,
	name: ex.name,
	category: ex.category,
	equipment: ex.equipment,
	user_id: null,
	primary_muscles: ex.primaryMuscles,
	secondary_muscles: ex.secondaryMuscles
}));
function isMissingExerciseUserColumn(error) {
	const message = error?.message?.toLowerCase?.() || "";
	return message.includes("user_id") && message.includes("exercises");
}
async function fetchExercises(userId) {
	const cacheKey = `${EXERCISES_CACHE_KEY}:${userId || "anon"}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;
	const { data: idRows, error: idError } = await supabase.from("exercises").select("id, name").is("user_id", null);
	if (idError) throw idError;
	const idByName = new Map((idRows ?? []).map((r) => [r.name, r.id]));
	const defaultExercises = CATALOG_DEFAULTS.map((ex) => ({
		...ex,
		id: idByName.get(ex.name)
	}));
	const cardioExercises = (idRows ?? []).filter((r) => CARDIO_NAME_SET.has(r.name)).map((r) => ({
		id: r.id,
		name: r.name,
		category: "Cardio",
		equipment: CARDIO_EQUIPMENT_BY_NAME.get(r.name) ?? "Bodyweight",
		user_id: null,
		primary_muscles: [],
		secondary_muscles: []
	}));
	let result = [...defaultExercises, ...cardioExercises];
	if (userId) {
		const { data: custom, error: customError } = await supabase.from("exercises").select(CUSTOM_EXERCISE_SELECT).eq("user_id", userId);
		if (customError) {
			if (!isMissingExerciseUserColumn(customError)) throw customError;
		} else if (custom?.length) result = [...defaultExercises, ...custom];
	}
	result.sort((a, b) => a.name.localeCompare(b.name));
	setCached(cacheKey, result);
	return result;
}
async function createCustomExercise(userId, payload) {
	const { data, error } = await supabase.from("exercises").insert({
		user_id: userId,
		...payload
	}).select(CUSTOM_EXERCISE_SELECT).single();
	if (error) {
		if (isMissingExerciseUserColumn(error)) {
			const missingPatchError = /* @__PURE__ */ new Error("Run sql/custom_exercises_patch.sql in Supabase before saving custom exercises.");
			missingPatchError.code = "missing_custom_exercises_patch";
			throw missingPatchError;
		}
		throw error;
	}
	invalidateCache(`${EXERCISES_CACHE_KEY}:${userId}`);
	return data;
}
//#endregion
export { fetchExercises as n, createCustomExercise as t };

//# sourceMappingURL=exercises-DX-XFagI.js.map