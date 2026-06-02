import { t as supabase } from "./supabase-CCACEYhB.js";
//#region src/lib/workoutCount.js
function isMissingWorkoutCountColumn(error) {
	const code = error?.code || "";
	const details = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
	return code === "PGRST204" || details.includes("workout_count") && details.includes("profiles");
}
async function countFinishedWorkouts(userId) {
	const { count, error } = await supabase.from("workout_sessions").select("id", {
		count: "exact",
		head: true
	}).eq("user_id", userId).not("finished_at", "is", null);
	return {
		count: error ? null : Math.max(0, count || 0),
		error
	};
}
function normalizeFields(fields = []) {
	return [...new Set((Array.isArray(fields) ? fields : [fields]).map((field) => String(field || "").trim()).filter(Boolean))];
}
function normalizeWorkoutCount(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
async function fetchProfileWithWorkoutCount(userId, fields = []) {
	const normalizedFields = normalizeFields(fields);
	const selectFields = normalizeFields([...normalizedFields, "workout_count"]);
	const { data, error } = await supabase.from("profiles").select(selectFields.join(", ")).eq("id", userId).single();
	if (error) {
		if (!isMissingWorkoutCountColumn(error)) return {
			data: data ?? null,
			error,
			usedFallback: false
		};
		const fallbackQueries = [];
		if (normalizedFields.length > 0) fallbackQueries.push(supabase.from("profiles").select(normalizedFields.join(", ")).eq("id", userId).single());
		else fallbackQueries.push(Promise.resolve({
			data: {},
			error: null
		}));
		fallbackQueries.push(countFinishedWorkouts(userId));
		const [profileResult, workoutCountResult] = await Promise.all(fallbackQueries);
		if (profileResult.error) return {
			data: profileResult.data ?? null,
			error: profileResult.error,
			usedFallback: true
		};
		return {
			data: {
				...profileResult.data || {},
				workout_count: workoutCountResult.count
			},
			error: workoutCountResult.error,
			usedFallback: true
		};
	}
	const workoutCount = normalizeWorkoutCount(data?.workout_count);
	if (workoutCount !== null) return {
		data: {
			...data || {},
			workout_count: workoutCount
		},
		error: null,
		usedFallback: false
	};
	const workoutCountResult = await countFinishedWorkouts(userId);
	return {
		data: {
			...data || {},
			workout_count: workoutCountResult.count
		},
		error: workoutCountResult.error,
		usedFallback: true
	};
}
//#endregion
//#region src/data/achievements.js
var ACHIEVEMENTS = [
	{
		id: "bench_1p",
		cat: "Strength",
		tier: "bronze",
		title: "1-Plate Bench",
		desc: "Bench press 135 lbs / 60 kg",
		match: "bench",
		kgTarget: 60
	},
	{
		id: "bench_2p",
		cat: "Strength",
		tier: "silver",
		title: "2-Plate Bench",
		desc: "Bench press 225 lbs / 100 kg",
		match: "bench",
		kgTarget: 100
	},
	{
		id: "bench_3p",
		cat: "Strength",
		tier: "gold",
		title: "3-Plate Bench",
		desc: "Bench press 315 lbs / 140 kg",
		match: "bench",
		kgTarget: 140
	},
	{
		id: "bench_4p",
		cat: "Strength",
		tier: "diamond",
		title: "4-Plate Bench",
		desc: "Bench press 405 lbs / 185 kg",
		match: "bench",
		kgTarget: 185
	},
	{
		id: "squat_1p",
		cat: "Strength",
		tier: "bronze",
		title: "1-Plate Squat",
		desc: "Squat 135 lbs / 60 kg",
		match: "squat",
		kgTarget: 60
	},
	{
		id: "squat_2p",
		cat: "Strength",
		tier: "silver",
		title: "2-Plate Squat",
		desc: "Squat 225 lbs / 100 kg",
		match: "squat",
		kgTarget: 100
	},
	{
		id: "squat_3p",
		cat: "Strength",
		tier: "gold",
		title: "3-Plate Squat",
		desc: "Squat 315 lbs / 140 kg",
		match: "squat",
		kgTarget: 140
	},
	{
		id: "squat_4p",
		cat: "Strength",
		tier: "platinum",
		title: "4-Plate Squat",
		desc: "Squat 405 lbs / 185 kg",
		match: "squat",
		kgTarget: 185
	},
	{
		id: "dl_2p",
		cat: "Strength",
		tier: "bronze",
		title: "2-Plate Deadlift",
		desc: "Deadlift 225 lbs / 100 kg",
		match: "deadlift",
		kgTarget: 100
	},
	{
		id: "dl_3p",
		cat: "Strength",
		tier: "silver",
		title: "3-Plate Deadlift",
		desc: "Deadlift 315 lbs / 140 kg",
		match: "deadlift",
		kgTarget: 140
	},
	{
		id: "dl_4p",
		cat: "Strength",
		tier: "gold",
		title: "4-Plate Deadlift",
		desc: "Deadlift 405 lbs / 185 kg",
		match: "deadlift",
		kgTarget: 185
	},
	{
		id: "dl_5p",
		cat: "Strength",
		tier: "diamond",
		title: "5-Plate Deadlift",
		desc: "Deadlift 495 lbs / 225 kg",
		match: "deadlift",
		kgTarget: 225
	},
	{
		id: "ohp_1p",
		cat: "Strength",
		tier: "silver",
		title: "1-Plate Press",
		desc: "Overhead press 135 lbs / 60 kg",
		match: "overhead press",
		kgTarget: 60
	},
	{
		id: "ohp_185",
		cat: "Strength",
		tier: "gold",
		title: "Press 185",
		desc: "Overhead press 185 lbs / 84 kg",
		match: "overhead press",
		kgTarget: 84
	},
	{
		id: "ohp_2p",
		cat: "Strength",
		tier: "platinum",
		title: "2-Plate Press",
		desc: "Overhead press 225 lbs / 100 kg",
		match: "overhead press",
		kgTarget: 100
	},
	{
		id: "w1",
		cat: "Consistency",
		tier: "bronze",
		title: "First Rep",
		desc: "Complete your first workout",
		sessions: 1
	},
	{
		id: "w10",
		cat: "Consistency",
		tier: "bronze",
		title: "Warming Up",
		desc: "Complete 10 workouts",
		sessions: 10
	},
	{
		id: "w25",
		cat: "Consistency",
		tier: "silver",
		title: "Committed",
		desc: "Complete 25 workouts",
		sessions: 25
	},
	{
		id: "w50",
		cat: "Consistency",
		tier: "gold",
		title: "Dedicated",
		desc: "Complete 50 workouts",
		sessions: 50
	},
	{
		id: "w100",
		cat: "Consistency",
		tier: "platinum",
		title: "Century",
		desc: "Complete 100 workouts",
		sessions: 100
	},
	{
		id: "w365",
		cat: "Consistency",
		tier: "diamond",
		title: "Year-Round",
		desc: "Complete 365 workouts",
		sessions: 365
	},
	{
		id: "nut1",
		cat: "Nutrition",
		tier: "bronze",
		title: "Tracking Starts",
		desc: "Log your first day of food",
		nutDays: 1
	},
	{
		id: "nut7",
		cat: "Nutrition",
		tier: "silver",
		title: "Week of Macros",
		desc: "Log food for 7 days",
		nutDays: 7
	},
	{
		id: "nut30",
		cat: "Nutrition",
		tier: "gold",
		title: "Month of Macros",
		desc: "Log food for 30 days",
		nutDays: 30
	},
	{
		id: "nut100",
		cat: "Nutrition",
		tier: "platinum",
		title: "Macro Master",
		desc: "Log food for 100 days",
		nutDays: 100
	},
	{
		id: "vol_corgi",
		cat: "Volume",
		tier: "bronze",
		emoji: "🐕",
		title: "Corgi Crew",
		desc: "Reach 10,000 kg of total lifted volume — about 700 corgis.",
		totalVolumeKg: 1e4
	},
	{
		id: "vol_panda",
		cat: "Volume",
		tier: "bronze",
		emoji: "🐼",
		title: "Panda Power",
		desc: "Reach 50,000 kg of total lifted volume — about 330 giant pandas.",
		totalVolumeKg: 5e4
	},
	{
		id: "vol_bear",
		cat: "Volume",
		tier: "silver",
		emoji: "🐻",
		title: "Bear Mode",
		desc: "Reach 150,000 kg of total lifted volume — about 300 grizzly bears.",
		totalVolumeKg: 15e4
	},
	{
		id: "vol_rhino",
		cat: "Volume",
		tier: "silver",
		emoji: "🦏",
		title: "Rhino Strong",
		desc: "Reach 500,000 kg of total lifted volume — about 215 white rhinos.",
		totalVolumeKg: 5e5
	},
	{
		id: "vol_elephant",
		cat: "Volume",
		tier: "gold",
		emoji: "🐘",
		title: "Elephant Class",
		desc: "Reach 1,500,000 kg of total lifted volume — about 250 African elephants.",
		totalVolumeKg: 15e5
	},
	{
		id: "vol_orca",
		cat: "Volume",
		tier: "platinum",
		emoji: "🐬",
		title: "Orca Level",
		desc: "Reach 5,000,000 kg of total lifted volume — about 910 orcas.",
		totalVolumeKg: 5e6
	},
	{
		id: "vol_whale",
		cat: "Volume",
		tier: "diamond",
		emoji: "🐋",
		title: "Blue Whale Club",
		desc: "Reach 15,000,000 kg of total lifted volume — about 100 blue whales.",
		totalVolumeKg: 15e6
	}
];
var CATEGORIES = [
	"Strength",
	"Consistency",
	"Nutrition",
	"Volume"
];
//#endregion
export { CATEGORIES as n, fetchProfileWithWorkoutCount as r, ACHIEVEMENTS as t };

//# sourceMappingURL=achievements-Cvgw88zh.js.map