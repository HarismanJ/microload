import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { A as convertWeight, C as validateLength, F as getWeightInputMax, G as invalidateCache, I as getWeightInputMin, L as isRepsWithinInputRange, M as getProfileBodyweightKg, N as getSetVolumeInUnit, O as DEFAULT_BODYWEIGHT_KG, P as getSetVolumeKg, R as isWeightWithinInputRange, h as calculateORM, r as useCurrentUserId, v as VALIDATION_LIMITS, w as validateNumber } from "./index-BNajgLSV.js";
//#region src/components/profile/WorkoutDayDetail.jsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function formatDuration(start, end) {
	if (!start || !end) return null;
	const mins = Math.round((new Date(end) - new Date(start)) / 6e4);
	if (mins < 60) return `${mins}m`;
	return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function formatDate(dateStr) {
	return (/* @__PURE__ */ new Date(dateStr + "T12:00:00")).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric"
	});
}
function formatStartTime(ts) {
	if (!ts) return null;
	return new Date(ts).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit"
	});
}
function dayBounds(dateStr) {
	const [year, month, day] = dateStr.split("-").map(Number);
	return {
		startIso: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
		endIso: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()
	};
}
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
	"vitamin_a",
	"vitamin_c",
	"vitamin_d",
	"magnesium",
	"zinc",
	"folate",
	"vitamin_b12",
	"vitamin_b6"
].join(", ");
var NUTRIENT_FIELDS = [
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
	"vitamin_a",
	"vitamin_c",
	"vitamin_d",
	"magnesium",
	"zinc",
	"folate",
	"vitamin_b12",
	"vitamin_b6"
];
var INTEGER_NUTRIENTS = new Set([
	"calories",
	"sodium",
	"potassium",
	"cholesterol",
	"calcium",
	"magnesium",
	"vitamin_a"
]);
function sumNut(logs, key) {
	return logs.reduce((s, l) => s + (l[key] || 0), 0);
}
function buildUpdatedNutritionLog(log, foodName, servings) {
	const nextServings = Number(servings);
	const ratio = nextServings / (Number(log.servings) || 1);
	const updated = {
		food_name: foodName.trim(),
		servings: nextServings
	};
	NUTRIENT_FIELDS.forEach((key) => {
		const scaled = Number(log[key] || 0) * ratio;
		updated[key] = INTEGER_NUTRIENTS.has(key) ? Math.round(scaled) : Math.round(scaled * 100) / 100;
	});
	return updated;
}
function WorkoutDayDetail({ sessionId = null, sessionIds = [], dateStr, onBack, onDeleteWorkout, onRefresh }) {
	const userId = useCurrentUserId();
	const mountedRef = (0, import_react.useRef)(true);
	(0, import_react.useEffect)(() => () => {
		mountedRef.current = false;
	}, []);
	const [workoutSessions, setWorkoutSessions] = (0, import_react.useState)([]);
	const [nutLogs, setNutLogs] = (0, import_react.useState)([]);
	const [weightLogs, setWeightLogs] = (0, import_react.useState)([]);
	const [profileMeta, setProfileMeta] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [editingSetId, setEditingSetId] = (0, import_react.useState)(null);
	const [setEditDraft, setSetEditDraft] = (0, import_react.useState)({
		weight: "",
		reps: ""
	});
	const [setEditError, setSetEditError] = (0, import_react.useState)("");
	const [savingSetId, setSavingSetId] = (0, import_react.useState)(null);
	const [deleteSetTargetId, setDeleteSetTargetId] = (0, import_react.useState)(null);
	const [deletingSetId, setDeletingSetId] = (0, import_react.useState)(null);
	const [deleteSetError, setDeleteSetError] = (0, import_react.useState)("");
	const [deleteTargetId, setDeleteTargetId] = (0, import_react.useState)(null);
	const [deletingId, setDeletingId] = (0, import_react.useState)(null);
	const [deleteError, setDeleteError] = (0, import_react.useState)("");
	const [editingFoodLogId, setEditingFoodLogId] = (0, import_react.useState)(null);
	const [foodEditDraft, setFoodEditDraft] = (0, import_react.useState)({
		foodName: "",
		servings: ""
	});
	const [foodEditError, setFoodEditError] = (0, import_react.useState)("");
	const [savingFoodLogId, setSavingFoodLogId] = (0, import_react.useState)(null);
	const [nutritionDeleteTargetId, setNutritionDeleteTargetId] = (0, import_react.useState)(null);
	const [deletingNutritionId, setDeletingNutritionId] = (0, import_react.useState)(null);
	const [nutritionDeleteError, setNutritionDeleteError] = (0, import_react.useState)("");
	const [weightDeleteTargetId, setWeightDeleteTargetId] = (0, import_react.useState)(null);
	const [deletingWeightId, setDeletingWeightId] = (0, import_react.useState)(null);
	const [weightDeleteError, setWeightDeleteError] = (0, import_react.useState)("");
	async function load() {
		if (!userId) return;
		setLoading(true);
		setWorkoutSessions([]);
		setEditingSetId(null);
		setSetEditError("");
		setDeleteSetTargetId(null);
		setDeleteSetError("");
		setDeleteError("");
		setDeleteTargetId(null);
		setEditingFoodLogId(null);
		setFoodEditError("");
		setNutritionDeleteTargetId(null);
		setNutritionDeleteError("");
		setWeightDeleteTargetId(null);
		setWeightDeleteError("");
		const activeSessionIds = sessionIds.length ? sessionIds : sessionId ? [sessionId] : [];
		const { startIso, endIso } = dayBounds(dateStr);
		const promises = [
			supabase.from("nutrition_logs").select(NUTRITION_LOG_SELECT).eq("user_id", userId).eq("log_date", dateStr).order("created_at"),
			supabase.from("body_weight_logs").select("id, weight, unit, logged_at").eq("user_id", userId).gte("logged_at", startIso).lte("logged_at", endIso).order("logged_at", { ascending: false }),
			supabase.from("profiles").select("bodyweight, unit_preference").eq("id", userId).single()
		];
		if (activeSessionIds.length) promises.push(supabase.from("workout_sessions").select("id, started_at, finished_at, notes, exercise_notes, calories_burned").eq("user_id", userId).in("id", activeSessionIds).order("started_at"), supabase.from("workout_sets").select("id, session_id, exercise_id, set_number, reps, weight, unit, estimated_1rm, duration_seconds, exercises(name, category, equipment)").eq("user_id", userId).in("session_id", activeSessionIds).order("session_id").order("exercise_id").order("set_number"));
		const results = await Promise.all(promises);
		const nutData = results[0].data || [];
		const weightData = results[1].data || [];
		const profileData = results[2].data || null;
		setNutLogs(nutData);
		setWeightLogs(weightData);
		setProfileMeta(profileData);
		if (activeSessionIds.length) {
			const sessions = results[3].data || [];
			const sets = results[4].data || [];
			const groupMap = {};
			sets.forEach((set) => {
				if (!groupMap[set.session_id]) groupMap[set.session_id] = {};
				if (!groupMap[set.session_id][set.exercise_id]) groupMap[set.session_id][set.exercise_id] = {
					exerciseId: set.exercise_id,
					name: set.exercises.name,
					category: set.exercises.category,
					equipment: set.exercises.equipment,
					sets: []
				};
				groupMap[set.session_id][set.exercise_id].sets.push(set);
			});
			setWorkoutSessions(sessions.map((sess) => ({
				...sess,
				groups: Object.values(groupMap[sess.id] || {})
			})));
		}
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
	}, [
		sessionId,
		sessionIds,
		dateStr,
		userId
	]);
	function startSetEdit(set) {
		setEditingSetId(set.id);
		setDeleteSetTargetId(null);
		setSetEditDraft({
			weight: String(set.weight),
			reps: String(set.reps)
		});
		setSetEditError("");
	}
	async function handleUpdateSet(set, group) {
		if (!set?.id || savingSetId) return;
		const weight = parseFloat(setEditDraft.weight);
		const reps = parseInt(setEditDraft.reps, 10);
		const allowsAssistance = group?.equipment === "Bodyweight";
		const bodyweightKg = getProfileBodyweightKg(profileMeta);
		if (!isWeightWithinInputRange(weight, {
			equipment: group?.equipment,
			unit: set.unit,
			bodyweightKg
		}) || !isRepsWithinInputRange(reps)) {
			setSetEditError(allowsAssistance ? "Enter a valid weight and 1 to 9999 reps before confirming. Assisted sets can use negative weight down to your bodyweight." : "Enter a valid weight and at least 1 rep before confirming.");
			return;
		}
		setSavingSetId(set.id);
		setSetEditError("");
		const estimatedOrm = calculateORM(weight, reps);
		const { error } = await supabase.from("workout_sets").update({
			weight,
			reps,
			estimated_1rm: estimatedOrm
		}).eq("id", set.id);
		if (error) {
			setSavingSetId(null);
			setSetEditError(error.message || "Could not update this set.");
			return;
		}
		invalidateCache("home", "profile", "ranks", "achievements", `cal_${dateStr.slice(0, 7)}`);
		setWorkoutSessions((prev) => prev.map((sess) => ({
			...sess,
			groups: sess.groups.map((group) => ({
				...group,
				sets: group.sets.map((existing) => existing.id === set.id ? {
					...existing,
					weight,
					reps,
					estimated_1rm: estimatedOrm
				} : existing)
			}))
		})));
		setSavingSetId(null);
		setEditingSetId(null);
		onRefresh?.();
	}
	async function handleDeleteSet(sessionId, group, set) {
		if (!set?.id || deletingSetId) return;
		const renumberTargets = group.sets.filter((existing) => existing.id !== set.id).map((existing, index) => ({
			...existing,
			nextSetNumber: index + 1
		})).filter((existing) => existing.set_number !== existing.nextSetNumber);
		setDeletingSetId(set.id);
		setDeleteSetError("");
		const bwKg = getProfileBodyweightKg(profileMeta, DEFAULT_BODYWEIGHT_KG);
		const setVolumeKg = getSetVolumeKg({
			weight: set.weight,
			reps: set.reps,
			unit: set.unit,
			equipment: group?.equipment,
			bodyweightKg: bwKg
		});
		const [{ error: deleteError }, { data: profileVol }] = await Promise.all([supabase.from("workout_sets").delete().eq("id", set.id), supabase.from("profiles").select("lifetime_volume_kg").eq("id", userId).single()]);
		if (!mountedRef.current) return;
		if (deleteError) {
			setDeletingSetId(null);
			setDeleteSetError(deleteError.message || "Could not delete this set.");
			return;
		}
		const newLifetimeVolumeKg = Math.max(0, (profileVol?.lifetime_volume_kg ?? 0) - setVolumeKg);
		supabase.from("profiles").update({ lifetime_volume_kg: newLifetimeVolumeKg }).eq("id", userId);
		if (renumberTargets.length) {
			const renumberError = (await Promise.all(renumberTargets.map((existing) => supabase.from("workout_sets").update({ set_number: existing.nextSetNumber }).eq("id", existing.id)))).find((result) => result.error)?.error;
			if (renumberError) {
				setDeletingSetId(null);
				setDeleteSetError(renumberError.message || "This set was deleted, but the remaining set order could not be updated cleanly.");
				await load();
				return;
			}
		}
		invalidateCache("home", "profile", "ranks", "achievements", `cal_${dateStr.slice(0, 7)}`);
		setWorkoutSessions((prev) => prev.map((sess) => sess.id !== sessionId ? sess : {
			...sess,
			groups: sess.groups.map((existingGroup) => existingGroup.exerciseId !== group.exerciseId ? existingGroup : {
				...existingGroup,
				sets: existingGroup.sets.filter((existingSet) => existingSet.id !== set.id).map((existingSet, index) => ({
					...existingSet,
					set_number: index + 1
				}))
			}).filter((existingGroup) => existingGroup.sets.length > 0)
		}));
		setDeletingSetId(null);
		setDeleteSetTargetId(null);
		if (editingSetId === set.id) {
			setEditingSetId(null);
			setSetEditError("");
		}
		onRefresh?.();
	}
	function startFoodLogEdit(item) {
		setEditingFoodLogId(item.id);
		setNutritionDeleteTargetId(null);
		setFoodEditDraft({
			foodName: item.food_name || "",
			servings: String(item.servings ?? 1)
		});
		setFoodEditError("");
	}
	async function handleUpdateFoodLog(item) {
		if (!item?.id || savingFoodLogId) return;
		const servings = parseFloat(foodEditDraft.servings);
		const foodName = foodEditDraft.foodName.trim();
		const nameError = validateLength(foodName, {
			label: "Food name",
			min: 1,
			max: VALIDATION_LIMITS.foodNameMaxLength,
			required: true
		});
		if (nameError) {
			setFoodEditError(nameError);
			return;
		}
		const servingsError = validateNumber(foodEditDraft.servings, {
			label: "Servings",
			min: .01,
			max: VALIDATION_LIMITS.nutritionAmountMax,
			required: true,
			decimals: 2
		});
		if (servingsError) {
			setFoodEditError(servingsError);
			return;
		}
		setSavingFoodLogId(item.id);
		setFoodEditError("");
		const updates = buildUpdatedNutritionLog(item, foodName, servings);
		const { error } = await supabase.from("nutrition_logs").update(updates).eq("id", item.id);
		if (error) {
			setSavingFoodLogId(null);
			setFoodEditError(error.message || "Could not update this food log.");
			return;
		}
		invalidateCache("home", `nut_${dateStr}`, `cal_${dateStr.slice(0, 7)}`);
		setNutLogs((prev) => prev.map((log) => log.id === item.id ? {
			...log,
			...updates
		} : log));
		setSavingFoodLogId(null);
		setEditingFoodLogId(null);
		onRefresh?.();
	}
	async function handleDeleteWorkout(targetSessionId) {
		if (!targetSessionId || deletingId) return;
		setDeletingId(targetSessionId);
		setDeleteError("");
		const calKey = `cal_${dateStr.slice(0, 7)}`;
		const bwKg = getProfileBodyweightKg(profileMeta, DEFAULT_BODYWEIGHT_KG);
		const targetSession = workoutSessions.find((sess) => sess.id === targetSessionId);
		const sessionVolumeKg = (targetSession?.groups || []).reduce((sum, group) => sum + group.sets.reduce((s2, set) => s2 + getSetVolumeKg({
			weight: set.weight,
			reps: set.reps,
			unit: set.unit,
			equipment: group.equipment,
			bodyweightKg: bwKg
		}), 0), 0);
		const { data: profileVol } = await supabase.from("profiles").select("lifetime_volume_kg").eq("id", userId).single();
		const newLifetimeVolumeKg = Math.max(0, (profileVol?.lifetime_volume_kg ?? 0) - sessionVolumeKg);
		const affectedExerciseIds = [...new Set((targetSession?.groups || []).map((g) => g.exerciseId).filter(Boolean))];
		const [{ error }, { error: profileError }] = await Promise.all([supabase.from("workout_sessions").delete().eq("id", targetSessionId), supabase.from("profiles").update({ lifetime_volume_kg: newLifetimeVolumeKg }).eq("id", userId)]);
		if (error || profileError) {
			setDeletingId(null);
			setDeleteError(error?.message || profileError?.message || "Could not delete this workout.");
			return;
		}
		if (affectedExerciseIds.length > 0) {
			const { data: remainingBests } = await supabase.from("workout_sets").select("exercise_id, estimated_1rm, unit").eq("user_id", userId).in("exercise_id", affectedExerciseIds).not("estimated_1rm", "is", null);
			const newBestByExercise = {};
			for (const s of remainingBests || []) {
				const kg = s.unit === "lbs" ? s.estimated_1rm * .453592 : s.estimated_1rm;
				newBestByExercise[s.exercise_id] = Math.max(newBestByExercise[s.exercise_id] || 0, kg);
			}
			try {
				await Promise.all(affectedExerciseIds.map((exId) => newBestByExercise[exId] ? supabase.from("exercise_prs").upsert({
					user_id: userId,
					exercise_id: exId,
					best_1rm_kg: newBestByExercise[exId],
					updated_at: (/* @__PURE__ */ new Date()).toISOString()
				}, { onConflict: "user_id,exercise_id" }) : supabase.from("exercise_prs").delete().eq("user_id", userId).eq("exercise_id", exId)));
			} catch (err) {
				console.error("PR cache update failed after workout deletion:", err);
			}
		}
		const remainingSessions = workoutSessions.filter((sess) => sess.id !== targetSessionId);
		invalidateCache("home", "profile", "ranks", "achievements", calKey);
		setWorkoutSessions(remainingSessions);
		setDeletingId(null);
		setDeleteTargetId(null);
		onDeleteWorkout?.({
			sessionId: targetSessionId,
			remainingSessionIds: remainingSessions.map((sess) => sess.id),
			dateStr
		});
		onRefresh?.();
	}
	async function handleDeleteNutritionLog(logId) {
		if (!logId || deletingNutritionId) return;
		setDeletingNutritionId(logId);
		setNutritionDeleteError("");
		const { error } = await supabase.from("nutrition_logs").delete().eq("id", logId);
		if (error) {
			setDeletingNutritionId(null);
			setNutritionDeleteError(error.message || "Could not delete this nutrition log.");
			return;
		}
		invalidateCache("home", `nut_${dateStr}`, `cal_${dateStr.slice(0, 7)}`);
		setNutLogs((prev) => prev.filter((log) => log.id !== logId));
		setDeletingNutritionId(null);
		setNutritionDeleteTargetId(null);
		onRefresh?.();
	}
	async function handleDeleteWeightLog(logId) {
		if (!logId || deletingWeightId) return;
		setDeletingWeightId(logId);
		setWeightDeleteError("");
		const [{ error: deleteError }, { data: latestLog, error: latestError }] = await Promise.all([supabase.from("body_weight_logs").delete().eq("id", logId), supabase.from("body_weight_logs").select("weight, unit").eq("user_id", userId).order("logged_at", { ascending: false }).limit(1).maybeSingle()]);
		if (deleteError || latestError) {
			setDeletingWeightId(null);
			setWeightDeleteError(deleteError?.message || latestError?.message || "Could not delete this weight log.");
			return;
		}
		const { error: profileError } = await supabase.from("profiles").update({ bodyweight: latestLog ? convertWeight(latestLog.weight, latestLog.unit || profileMeta?.unit_preference || "kg", profileMeta?.unit_preference || "kg") : null }).eq("id", userId);
		if (profileError) {
			setDeletingWeightId(null);
			setWeightDeleteError(profileError.message || "Could not update current bodyweight.");
			return;
		}
		invalidateCache("profile", "ranks", "home", `cal_${dateStr.slice(0, 7)}`);
		setWeightLogs((prev) => prev.filter((log) => log.id !== logId));
		setDeletingWeightId(null);
		setWeightDeleteTargetId(null);
		onRefresh?.();
	}
	const singleSession = workoutSessions.length === 1 ? workoutSessions[0] : null;
	const duration = singleSession ? formatDuration(singleSession.started_at, singleSession.finished_at) : null;
	const totalSessions = workoutSessions.length;
	const totalExercises = workoutSessions.reduce((sum, sess) => sum + sess.groups.length, 0);
	const totalSets = workoutSessions.reduce((sum, sess) => sum + sess.groups.reduce((groupSum, group) => groupSum + group.sets.length, 0), 0);
	const profileBodyweightKg = getProfileBodyweightKg(profileMeta, DEFAULT_BODYWEIGHT_KG);
	const totalVolume = workoutSessions.reduce((sum, sess) => sum + sess.groups.reduce((groupSum, group) => groupSum + group.sets.reduce((setSum, set) => setSum + getSetVolumeInUnit({
		weight: set.weight,
		reps: set.reps,
		unit: set.unit,
		equipment: group.equipment,
		bodyweightKg: profileBodyweightKg
	}, profileMeta?.unit_preference || "kg"), 0), 0), 0);
	const totalCaloriesBurned = workoutSessions.reduce((sum, sess) => sum + (sess.calories_burned || 0), 0);
	const totalCals = sumNut(nutLogs, "calories");
	const totalProtein = sumNut(nutLogs, "protein");
	const totalCarbs = sumNut(nutLogs, "carbs");
	const totalFat = sumNut(nutLogs, "fat");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "day-detail",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "day-detail-header",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "day-detail-back-btn",
				onClick: onBack,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
					width: "20",
					height: "20",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "2.5",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 12H5M12 5l-7 7 7 7" })
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "day-detail-date",
				children: formatDate(dateStr)
			}), (duration || totalSessions > 1) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "day-detail-meta",
				children: singleSession ? `${duration}${totalSets > 0 ? ` · ${totalSets} sets` : ""}` : `${totalSessions} workouts${totalSets > 0 ? ` · ${totalSets} sets` : ""}`
			})] })]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "day-detail-loading",
			"aria-live": "polite",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "day-detail-calendar-loader",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "day-detail-calendar-loader-top",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "day-detail-calendar-loader-grid",
					children: Array.from({ length: 9 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `day-detail-calendar-cell day-detail-calendar-cell-${index + 1}` }, index))
				})]
			})
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "day-detail-content",
			children: [
				workoutSessions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "day-section-title",
						children: "Workout"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "day-summary-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-summary-stat",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-value",
									children: totalSessions > 1 ? totalSessions : totalExercises
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-label",
									children: totalSessions > 1 ? "Workouts" : "Exercises"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-summary-stat",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-value",
									children: totalSets
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-label",
									children: "Sets"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-summary-stat",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-value",
									children: totalVolume >= 1e3 ? `${(totalVolume / 1e3).toFixed(1)}k` : totalVolume.toFixed(0)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-label",
									children: "Volume"
								})]
							}),
							totalCaloriesBurned > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-summary-stat",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "day-summary-value",
									children: ["~", totalCaloriesBurned]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-summary-label",
									children: "kcal"
								})]
							})
						]
					}),
					workoutSessions.map((sess, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "day-session-block",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-session-top",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-session-title",
									children: totalSessions > 1 ? `Workout #${idx + 1}` : "Workout"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "day-session-meta",
									children: [
										formatStartTime(sess.started_at),
										sess.finished_at ? ` · ${formatDuration(sess.started_at, sess.finished_at)}` : "",
										sess.groups.length ? ` · ${sess.groups.length} exercises` : ""
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "day-delete-btn",
									onClick: () => {
										setDeleteTargetId(deleteTargetId === sess.id ? null : sess.id);
										setDeleteError("");
									},
									disabled: Boolean(deletingId),
									children: deleteTargetId === sess.id ? "Cancel" : "Delete workout"
								})]
							}),
							deleteTargetId === sess.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-delete-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "day-delete-title",
										children: "Delete this workout?"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "day-delete-text",
										children: "This removes only this session and its sets. Your ranks, profile stats, streaks, achievements, and calendar will update from the remaining workouts."
									}),
									deleteError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "day-delete-error",
										children: deleteError
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "day-delete-actions",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "day-delete-cancel",
											onClick: () => setDeleteTargetId(null),
											disabled: Boolean(deletingId),
											children: "Keep workout"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "day-delete-confirm",
											onClick: () => handleDeleteWorkout(sess.id),
											disabled: deletingId === sess.id,
											children: deletingId === sess.id ? "Deleting…" : "Delete forever"
										})]
									})
								]
							}),
							sess.groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-exercise-block",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "day-exercise-header",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-exercise-name",
											children: group.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-exercise-category",
											children: group.category
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "day-sets-header",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Set" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Weight" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reps" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Est. 1RM" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
										]
									}),
									group.sets.map((set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "day-set-item",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "day-set-row",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "day-set-num",
														children: set.set_number
													}),
													set.duration_seconds != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: { gridColumn: "span 3" },
														children: [Math.round(set.duration_seconds / 60), " min"]
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
															set.weight,
															" ",
															set.unit
														] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: set.reps }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "day-set-orm",
															children: set.estimated_1rm ? `${set.estimated_1rm.toFixed(1)} ${set.unit}` : "—"
														})
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "day-set-actions",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "day-edit-btn",
															onClick: () => {
																if (editingSetId === set.id) {
																	setEditingSetId(null);
																	setSetEditError("");
																	return;
																}
																startSetEdit(set);
															},
															disabled: Boolean(savingSetId) || Boolean(deletingSetId),
															children: editingSetId === set.id ? "Cancel" : "Edit"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "day-edit-btn day-edit-btn-danger",
															onClick: () => {
																setDeleteSetTargetId(deleteSetTargetId === set.id ? null : set.id);
																setDeleteSetError("");
																if (editingSetId === set.id) {
																	setEditingSetId(null);
																	setSetEditError("");
																}
															},
															disabled: Boolean(savingSetId) || Boolean(deletingSetId),
															children: deleteSetTargetId === set.id ? "Cancel" : "Delete"
														})]
													})
												]
											}),
											editingSetId === set.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "day-edit-card",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "day-edit-grid day-edit-grid-2",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
															className: "day-edit-field",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "day-edit-label",
																children: group.equipment === "Bodyweight" ? `Added / assisted weight (${set.unit})` : `Weight (${set.unit})`
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																className: "day-edit-input",
																type: "number",
																min: String(getWeightInputMin(group.equipment, set.unit, getProfileBodyweightKg(profileMeta))),
																max: String(getWeightInputMax(group.equipment, set.unit)),
																step: "0.1",
																value: setEditDraft.weight,
																onChange: (e) => setSetEditDraft((draft) => ({
																	...draft,
																	weight: e.target.value
																}))
															})]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
															className: "day-edit-field",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "day-edit-label",
																children: "Reps"
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																className: "day-edit-input",
																type: "number",
																min: "1",
																max: String(9999),
																step: "1",
																value: setEditDraft.reps,
																onChange: (e) => setSetEditDraft((draft) => ({
																	...draft,
																	reps: e.target.value
																}))
															})]
														})]
													}),
													group.equipment === "Bodyweight" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "day-edit-hint",
														children: "Use a negative weight for assisted machine reps."
													}),
													setEditError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "day-delete-error",
														children: setEditError
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "day-delete-actions",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "day-delete-cancel",
															onClick: () => {
																setEditingSetId(null);
																setSetEditError("");
															},
															disabled: Boolean(savingSetId),
															children: "Keep original"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "day-delete-confirm",
															onClick: () => handleUpdateSet(set, group),
															disabled: savingSetId === set.id,
															children: savingSetId === set.id ? "Saving…" : "Confirm update"
														})]
													})
												]
											}),
											deleteSetTargetId === set.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "day-delete-card",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "day-delete-title",
														children: "Delete this set?"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "day-delete-text",
														children: "This removes only this set. Remaining sets in this exercise will shift up and your ranks, stats, and history will recalculate from the sets left."
													}),
													deleteSetError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "day-delete-error",
														children: deleteSetError
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "day-delete-actions",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "day-delete-cancel",
															onClick: () => {
																setDeleteSetTargetId(null);
																setDeleteSetError("");
															},
															disabled: Boolean(deletingSetId),
															children: "Keep set"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "day-delete-confirm",
															onClick: () => handleDeleteSet(sess.id, group, set),
															disabled: deletingSetId === set.id,
															children: deletingSetId === set.id ? "Deleting…" : "Delete forever"
														})]
													})
												]
											})
										]
									}, set.id)),
									sess.exercise_notes?.[group.exerciseId] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "day-exercise-note",
										children: sess.exercise_notes[group.exerciseId]
									})
								]
							}, `${sess.id}-${group.name}`)),
							sess.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-notes",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-notes-label",
									children: "Notes"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-notes-text",
									children: sess.notes
								})]
							})
						]
					}, sess.id))
				] }),
				nutLogs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "day-section-title",
						children: "Nutrition"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "day-nut-summary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "day-nut-cal",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "day-nut-cal-val",
								children: Math.round(totalCals)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "day-nut-cal-unit",
								children: "kcal"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "day-nut-macros",
							children: [
								{
									label: "Protein",
									val: totalProtein,
									color: "#3b9eff"
								},
								{
									label: "Carbs",
									val: totalCarbs,
									color: "#a855f7"
								},
								{
									label: "Fat",
									val: totalFat,
									color: "#f97316"
								}
							].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-nut-macro",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "day-nut-macro-val",
									style: { color: m.color },
									children: [Math.round(m.val), "g"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "day-nut-macro-label",
									children: m.label
								})]
							}, m.label))
						})]
					}),
					nutritionDeleteError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "day-delete-error",
						children: nutritionDeleteError
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "day-meal-block",
						children: nutLogs.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "day-meal-item",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "day-meal-row",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "day-meal-food",
										children: item.food_name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "day-meal-right",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "day-meal-meta",
												children: [
													item.servings,
													"× · ",
													Math.round(item.calories),
													" kcal"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "day-edit-btn",
												onClick: () => {
													if (editingFoodLogId === item.id) {
														setEditingFoodLogId(null);
														setFoodEditError("");
														return;
													}
													startFoodLogEdit(item);
												},
												disabled: Boolean(savingFoodLogId),
												children: editingFoodLogId === item.id ? "Cancel" : "Edit"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "day-meal-delete-btn",
												onClick: () => {
													setNutritionDeleteTargetId(nutritionDeleteTargetId === item.id ? null : item.id);
													setNutritionDeleteError("");
												},
												disabled: Boolean(deletingNutritionId),
												children: nutritionDeleteTargetId === item.id ? "Cancel" : "Delete"
											})
										]
									})]
								}),
								editingFoodLogId === item.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "day-edit-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "day-edit-grid day-edit-grid-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "day-edit-field day-edit-field-wide",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "day-edit-label",
													children: "Food name"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "day-edit-input",
													value: foodEditDraft.foodName,
													maxLength: VALIDATION_LIMITS.foodNameMaxLength,
													onChange: (e) => setFoodEditDraft((draft) => ({
														...draft,
														foodName: e.target.value
													}))
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "day-edit-field",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "day-edit-label",
													children: "Servings"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "day-edit-input",
													type: "number",
													min: "0.01",
													max: VALIDATION_LIMITS.nutritionAmountMax,
													step: "0.01",
													inputMode: "decimal",
													value: foodEditDraft.servings,
													onChange: (e) => setFoodEditDraft((draft) => ({
														...draft,
														servings: e.target.value
													}))
												})]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-edit-hint",
											children: "Calories and nutrients will rescale from the original log when you confirm."
										}),
										foodEditError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-delete-error",
											children: foodEditError
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "day-delete-actions",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "day-delete-cancel",
												onClick: () => {
													setEditingFoodLogId(null);
													setFoodEditError("");
												},
												disabled: Boolean(savingFoodLogId),
												children: "Keep original"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "day-delete-confirm",
												onClick: () => handleUpdateFoodLog(item),
												disabled: savingFoodLogId === item.id,
												children: savingFoodLogId === item.id ? "Saving…" : "Confirm update"
											})]
										})
									]
								}),
								nutritionDeleteTargetId === item.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "day-delete-card",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-delete-title",
											children: "Delete this food log?"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-delete-text",
											children: "This removes only this nutrition entry from the day totals."
										}),
										nutritionDeleteError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "day-delete-error",
											children: nutritionDeleteError
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "day-delete-actions",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "day-delete-cancel",
												onClick: () => setNutritionDeleteTargetId(null),
												disabled: Boolean(deletingNutritionId),
												children: "Keep log"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "day-delete-confirm",
												onClick: () => handleDeleteNutritionLog(item.id),
												disabled: deletingNutritionId === item.id,
												children: deletingNutritionId === item.id ? "Deleting…" : "Delete forever"
											})]
										})
									]
								})
							]
						}, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "day-micros-block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "day-micros-title",
							children: "Micronutrients"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "day-micros-grid",
							children: [
								{
									label: "Fiber",
									val: sumNut(nutLogs, "fiber"),
									unit: "g"
								},
								{
									label: "Sugar",
									val: sumNut(nutLogs, "sugar"),
									unit: "g"
								},
								{
									label: "Sat. Fat",
									val: sumNut(nutLogs, "saturated_fat"),
									unit: "g"
								},
								{
									label: "Sodium",
									val: sumNut(nutLogs, "sodium"),
									unit: "mg"
								},
								{
									label: "Potassium",
									val: sumNut(nutLogs, "potassium"),
									unit: "mg"
								},
								{
									label: "Cholesterol",
									val: sumNut(nutLogs, "cholesterol"),
									unit: "mg"
								},
								{
									label: "Vitamin D",
									val: sumNut(nutLogs, "vitamin_d"),
									unit: "mcg"
								},
								{
									label: "Magnesium",
									val: sumNut(nutLogs, "magnesium"),
									unit: "mg"
								},
								{
									label: "Zinc",
									val: sumNut(nutLogs, "zinc"),
									unit: "mg"
								},
								{
									label: "Folate",
									val: sumNut(nutLogs, "folate"),
									unit: "mcg"
								},
								{
									label: "Vitamin B12",
									val: sumNut(nutLogs, "vitamin_b12"),
									unit: "mcg"
								},
								{
									label: "Vitamin B6",
									val: sumNut(nutLogs, "vitamin_b6"),
									unit: "mg"
								}
							].filter((m) => m.val > 0).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-micro-item",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "day-micro-label",
									children: m.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "day-micro-val",
									children: [m.val < 10 ? m.val.toFixed(1) : Math.round(m.val), m.unit]
								})]
							}, m.label))
						})]
					})
				] }),
				weightLogs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "day-section-title",
					children: "Body Weight"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "day-weight-block",
					children: weightLogs.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "day-weight-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "day-weight-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "day-weight-value",
								children: [
									log.weight,
									" ",
									log.unit
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "day-weight-time",
								children: formatStartTime(log.logged_at)
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "day-weight-delete-btn",
								onClick: () => {
									setWeightDeleteTargetId(weightDeleteTargetId === log.id ? null : log.id);
									setWeightDeleteError("");
								},
								disabled: Boolean(deletingWeightId),
								children: weightDeleteTargetId === log.id ? "Cancel" : "Delete"
							})]
						}), weightDeleteTargetId === log.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "day-delete-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-delete-title",
									children: "Delete this weight log?"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-delete-text",
									children: "This removes only this weigh-in. Your current bodyweight will update to the newest remaining entry."
								}),
								weightDeleteError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "day-delete-error",
									children: weightDeleteError
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "day-delete-actions",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "day-delete-cancel",
										onClick: () => setWeightDeleteTargetId(null),
										disabled: Boolean(deletingWeightId),
										children: "Keep log"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "day-delete-confirm",
										onClick: () => handleDeleteWeightLog(log.id),
										disabled: deletingWeightId === log.id,
										children: deletingWeightId === log.id ? "Deleting…" : "Delete forever"
									})]
								})
							]
						})]
					}, log.id))
				})] }),
				workoutSessions.length === 0 && nutLogs.length === 0 && weightLogs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ex-no-data",
					children: "No activity recorded for this day"
				})
			]
		})]
	});
}
//#endregion
//#region src/components/profile/WeightChart.jsx
function getPointDate(point) {
	const d = point?.loggedAt ? new Date(point.loggedAt) : point?.date ? /* @__PURE__ */ new Date(`${point.date}T12:00:00`) : null;
	return d && !Number.isNaN(d.getTime()) ? d : null;
}
function formatXAxisLabel(point, spanDays) {
	const sourceDate = getPointDate(point);
	if (!sourceDate) return "";
	if (spanDays > 365) return `${sourceDate.toLocaleDateString("en-US", { month: "short" })} '${String(sourceDate.getFullYear()).slice(2)}`;
	return sourceDate.toLocaleDateString("en-US", {
		day: "numeric",
		month: "short"
	});
}
function getNiceStep(range, tickCount) {
	const roughStep = Math.max(range, 1) / Math.max(1, tickCount - 1);
	const scale = 10 ** Math.floor(Math.log10(roughStep));
	const fraction = roughStep / scale;
	if (fraction <= 1) return 1 * scale;
	if (fraction <= 2) return 2 * scale;
	if (fraction <= 2.5) return 2.5 * scale;
	if (fraction <= 5) return 5 * scale;
	return 10 * scale;
}
function formatWeightTick(value, step) {
	if (step >= 1) return String(Math.round(value));
	if (step >= .5) return value.toFixed(1);
	return value.toFixed(2);
}
function linearRegression(points) {
	const n = points.length;
	if (n < 2) return null;
	let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
	for (const { x, y } of points) {
		sumX += x;
		sumY += y;
		sumXY += x * y;
		sumX2 += x * x;
	}
	const denom = n * sumX2 - sumX * sumX;
	if (denom === 0) return null;
	const slope = (n * sumXY - sumX * sumY) / denom;
	return {
		slope,
		intercept: (sumY - slope * sumX) / n
	};
}
function WeightChart({ data, unit = "kg", height = 130, tickCount = 3, padding = "default", animationReady = true, showTrend = false, goalWeightKg = null, showGoal = false }) {
	const containerRef = (0, import_react.useRef)(null);
	const gradientBaseId = (0, import_react.useId)();
	const [containerWidth, setContainerWidth] = (0, import_react.useState)(0);
	const [lineDrawn, setLineDrawn] = (0, import_react.useState)(false);
	const accentColor = "var(--blue)";
	const gradientId = `weight-grad-${gradientBaseId.replace(/:/g, "")}`;
	const dataSignature = (0, import_react.useMemo)(() => (data || []).map((point) => `${point.id ?? point.loggedAt ?? point.date ?? ""}:${point.weight}:${point.unit || unit}`).join("|"), [data, unit]);
	(0, import_react.useEffect)(() => {
		const node = containerRef.current;
		if (!node) return;
		const updateWidth = () => {
			const nextWidth = Math.round(node.getBoundingClientRect().width || 0);
			if (!nextWidth) return;
			setContainerWidth((prev) => prev === nextWidth ? prev : nextWidth);
		};
		updateWidth();
		if (typeof ResizeObserver === "undefined") return void 0;
		const observer = new ResizeObserver(() => updateWidth());
		observer.observe(node);
		return () => observer.disconnect();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!data?.length) return void 0;
		setLineDrawn(false);
		if (!animationReady) return void 0;
		const animationFrame = requestAnimationFrame(() => {
			setLineDrawn(true);
		});
		return () => cancelAnimationFrame(animationFrame);
	}, [
		animationReady,
		dataSignature,
		containerWidth,
		unit,
		height,
		tickCount
	]);
	if (!data || data.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "chart-empty",
		children: "No weight history yet"
	});
	const normalizedData = data.map((point) => ({
		...point,
		displayWeight: convertWeight(point.weight, point.unit || unit, unit)
	}));
	const goalDisplay = showGoal && goalWeightKg !== null ? convertWeight(goalWeightKg, "kg", unit) : null;
	const tightPadding = padding === "tight";
	const mobileTightPadding = padding === "tight-mobile";
	const W = containerWidth || 300;
	const H = height;
	const padL = mobileTightPadding ? 30 : tightPadding ? 34 : 46;
	const padR = mobileTightPadding ? 18 : tightPadding ? 8 : 12;
	const padT = mobileTightPadding ? 14 : tightPadding ? 4 : 12;
	const padB = mobileTightPadding ? 22 : tightPadding ? 10 : 28;
	const plotW = W - padL - padR;
	const plotH = H - padT - padB;
	const values = normalizedData.map((d) => d.displayWeight);
	const domainValues = goalDisplay !== null ? [...values, goalDisplay] : values;
	const rawMin = Math.min(...domainValues);
	const rawMax = Math.max(...domainValues);
	const niceStep = getNiceStep(rawMax - rawMin || Math.max(Math.abs(rawMax), 1) * .25, tickCount);
	let minVal = Math.floor(rawMin / niceStep) * niceStep;
	let maxVal = Math.ceil(rawMax / niceStep) * niceStep;
	if (minVal === maxVal) {
		minVal -= niceStep;
		maxVal += niceStep;
	} else if (!tightPadding && !mobileTightPadding) {
		if (rawMin === minVal) minVal -= niceStep;
		if (rawMax === maxVal) maxVal += niceStep;
	}
	const xAt = (i) => padL + (normalizedData.length === 1 ? plotW / 2 : i / (normalizedData.length - 1) * plotW);
	const yAt = (v) => padT + plotH - (v - minVal) / (maxVal - minVal) * plotH;
	const pts = normalizedData.map((d, i) => `${xAt(i)},${yAt(d.displayWeight)}`).join(" ");
	const areaBase = padT + plotH;
	const area = `${padL},${areaBase} ${pts} ${xAt(normalizedData.length - 1)},${areaBase}`;
	const yTicks = [];
	for (let value = minVal; value <= maxVal + niceStep * .001; value += niceStep) yTicks.push({
		y: yAt(value),
		label: formatWeightTick(value, niceStep)
	});
	const n = normalizedData.length - 1;
	const xLabelIdx = [...new Set([
		0,
		Math.round(n / 4),
		Math.round(n / 2),
		Math.round(3 * n / 4),
		n
	])];
	const firstDate = getPointDate(normalizedData[0]);
	const lastDate = getPointDate(normalizedData.at(-1));
	const spanDays = firstDate && lastDate ? (lastDate - firstDate) / 864e5 : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: containerRef,
		style: { width: "100%" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${W} ${H}`,
			width: "100%",
			height,
			style: {
				overflow: "visible",
				display: "block"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: gradientId,
					x1: "0",
					y1: "0",
					x2: "0",
					y2: "1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0%",
						stopColor: accentColor,
						stopOpacity: "0.28"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "100%",
						stopColor: accentColor,
						stopOpacity: "0"
					})]
				}) }),
				yTicks.map(({ y, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: padL,
					y1: y,
					x2: padL + plotW,
					y2: y,
					stroke: "rgba(255,255,255,0.06)",
					strokeWidth: "1"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: padL - 5,
					y: y + 3.5,
					fontSize: "8.5",
					fill: "#6b7280",
					textAnchor: "end",
					children: label
				})] }, y)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: padL,
					y1: padT + plotH,
					x2: padL + plotW,
					y2: padT + plotH,
					stroke: "rgba(255,255,255,0.1)",
					strokeWidth: "1"
				}),
				normalizedData.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
					points: area,
					fill: `url(#${gradientId})`,
					style: {
						opacity: lineDrawn ? 1 : 0,
						transition: "opacity 640ms ease 980ms"
					}
				}),
				normalizedData.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
					points: pts,
					fill: "none",
					stroke: accentColor,
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					pathLength: "1",
					strokeDasharray: "1",
					strokeDashoffset: lineDrawn ? 0 : 1,
					style: { transition: "stroke-dashoffset 1480ms cubic-bezier(0.22, 1, 0.36, 1) 220ms" }
				}),
				normalizedData.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: xAt(i),
					cy: yAt(d.displayWeight),
					r: normalizedData.length === 1 ? 4 : 3,
					fill: accentColor,
					style: {
						opacity: lineDrawn ? 1 : 0,
						transition: `opacity 280ms ease ${normalizedData.length === 1 ? 420 : 1260 + i * 90}ms`
					}
				}, i)),
				goalDisplay !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: padL,
					y1: yAt(goalDisplay),
					x2: padL + plotW,
					y2: yAt(goalDisplay),
					stroke: "#5ecc8b",
					strokeWidth: "1.5",
					strokeDasharray: "5 4",
					strokeLinecap: "round",
					opacity: "0.85"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
					x: padL + plotW - 4,
					y: yAt(goalDisplay) - 3,
					fontSize: "8",
					fill: "#5ecc8b",
					textAnchor: "end",
					opacity: "0.9",
					children: ["Goal ", formatWeightTick(goalDisplay, niceStep)]
				})] }),
				showTrend && (() => {
					const reg = linearRegression(normalizedData.map((d, i) => ({
						x: xAt(i),
						y: yAt(d.displayWeight)
					})));
					if (!reg) return null;
					const x0 = xAt(0);
					const x1 = xAt(normalizedData.length - 1);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: x0,
						y1: reg.slope * x0 + reg.intercept,
						x2: x1,
						y2: reg.slope * x1 + reg.intercept,
						stroke: "var(--blue)",
						strokeWidth: "1.5",
						strokeDasharray: "4 3",
						strokeLinecap: "round",
						opacity: "0.7"
					}) });
				})(),
				xLabelIdx.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: xAt(i),
					y: H - 6,
					fontSize: "8.5",
					fill: "#6b7280",
					textAnchor: "middle",
					children: formatXAxisLabel(normalizedData[i], spanDays)
				}, i)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: padL - 5,
					y: padT - 3,
					fontSize: "8",
					fill: "#6b7280",
					textAnchor: "end",
					children: unit
				})
			]
		})
	});
}
//#endregion
export { WorkoutDayDetail as n, WeightChart as t };

//# sourceMappingURL=WeightChart-BmQwEuO2.js.map