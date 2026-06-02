const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ExerciseDetail-bpYIGxwe.js","assets/rolldown-runtime-CvHMtSRF.js","assets/index-BNajgLSV.js","assets/preload-helper-CCDVmQCD.js","assets/dist-B65an-qx.js","assets/body-diagram-9cYNiocp.js","assets/react-vendor-BqgOqDvu.js","assets/drag-drop-BDqY7zvQ.js","assets/supabase-CCACEYhB.js","assets/supabase-BKYoYWHZ.js","assets/theme-CXEPPnky.js","assets/RankBadge-BtaAzhvV.js","assets/rollingRanks-BNemOpZT.js","assets/chartPeriods-C_WRj2FA.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react, t as Model } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { p as require_react_dom } from "./drag-drop-BDqY7zvQ.js";
import { t as __vitePreload } from "./preload-helper-CCDVmQCD.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { B as LoadingSpinner, F as getWeightInputMax, G as invalidateCache, H as getCached, I as getWeightInputMin, K as setCached, L as isRepsWithinInputRange, R as isWeightWithinInputRange, W as getStartupSnapshot, h as calculateORM, q as setStartupSnapshot, r as useCurrentUserId, v as VALIDATION_LIMITS, x as validateBodyweight } from "./index-BNajgLSV.js";
import { _ as weightForOrm, a as getContinuousTierScore, b as upsertExerciseRankStates, c as updateRollingScore, d as TIER_COLORS, f as expandAnchors, g as tierGroup, h as tierColor, i as clampContinuousTierScore, l as ANCHORS, m as getTierIdx, n as ALL_TIME_RANK_MODE, o as inferRatioFromScore, p as getProgress, r as applyInactivityDecay, s as resolveTierFromScore, t as ACTIVE_RANK_MODE, u as TIERS, v as fetchExerciseRankStates, y as mapExerciseRankStates } from "./rollingRanks-BNemOpZT.js";
import { n as fetchExercises } from "./exercises-DX-XFagI.js";
import { t as RankBadge } from "./RankBadge-BtaAzhvV.js";
/* empty css               */
import { r as scoreExerciseMatch, t as matchesSearchQuery } from "./exerciseSearch-yksvqij-.js";
//#region src/components/Ranks.jsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_react_dom = require_react_dom();
var import_jsx_runtime = require_jsx_runtime();
var ExerciseDetail = (0, import_react.lazy)(() => __vitePreload(() => import("./ExerciseDetail-bpYIGxwe.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13])));
var TIER_GROUPS = [
	"Unranked",
	"Iron",
	"Bronze",
	"Silver",
	"Gold",
	"Platinum",
	"Diamond",
	"Master",
	"Grandmaster",
	"Elite"
];
var SECONDARY_MUSCLE_WEIGHT = .35;
var MUSCLE_GROUPS = [
	{
		key: "chest",
		label: "Chest",
		muscles: [
			"Chest",
			"Upper Chest",
			"Lower Chest"
		],
		chartMuscles: ["chest"]
	},
	{
		key: "front-deltoids",
		label: "Shoulders",
		muscles: [
			"Front Delts",
			"Lateral Delts",
			"Shoulders"
		],
		chartMuscles: ["front-deltoids", "back-deltoids"]
	},
	{
		key: "biceps",
		label: "Biceps",
		muscles: ["Biceps"],
		chartMuscles: ["biceps"]
	},
	{
		key: "triceps",
		label: "Triceps",
		muscles: ["Triceps"],
		chartMuscles: ["triceps"]
	},
	{
		key: "forearm",
		label: "Forearms",
		muscles: ["Forearms"],
		chartMuscles: ["forearm"]
	},
	{
		key: "abs",
		label: "Abs",
		muscles: ["Abs", "Core"],
		chartMuscles: ["abs"]
	},
	{
		key: "obliques",
		label: "Obliques",
		muscles: ["Obliques", "Core"],
		chartMuscles: ["obliques"]
	},
	{
		key: "quadriceps",
		label: "Quads",
		muscles: ["Quads", "Hip Flexors"],
		chartMuscles: ["quadriceps"]
	},
	{
		key: "adductor",
		label: "Adductors",
		muscles: ["Adductors"],
		chartMuscles: ["adductor"]
	},
	{
		key: "abductors",
		label: "Abductors",
		muscles: ["Abductors"],
		chartMuscles: ["abductors"]
	},
	{
		key: "calves",
		label: "Calves",
		muscles: ["Calves", "Shins"],
		chartMuscles: ["calves"]
	},
	{
		key: "gluteal",
		label: "Glutes",
		muscles: ["Glutes"],
		chartMuscles: ["gluteal"]
	},
	{
		key: "hamstring",
		label: "Hamstrings",
		muscles: ["Hamstrings"],
		chartMuscles: ["hamstring"]
	},
	{
		key: "lower-back",
		label: "Lower Back",
		muscles: ["Lower Back"],
		chartMuscles: ["lower-back"]
	},
	{
		key: "trapezius",
		label: "Traps",
		muscles: ["Traps"],
		chartMuscles: ["trapezius"]
	},
	{
		key: "upper-back",
		label: "Upper/Middle Back",
		muscles: [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		chartMuscles: ["upper-back"]
	},
	{
		key: "neck",
		label: "Neck",
		muscles: ["Neck"],
		chartMuscles: ["neck"]
	}
];
var MUSCLE_CHART_COLORS = TIER_GROUPS.slice(1).map((group) => TIER_COLORS[group]);
var MUSCLE_GROUP_KEYS = new Set(MUSCLE_GROUPS.map((group) => group.key));
var RANK_DISPLAY_MODE_STORAGE_KEY = "ranks:display-mode";
function lbsToKg(v) {
	return v * .453592;
}
function kgToLbs(v) {
	return v * 2.20462;
}
function getLiftRank(lift, ormKg, bodyweightKg, gender) {
	const anchors = ANCHORS[gender]?.[lift.name];
	if (!anchors || !bodyweightKg) return null;
	const thresholds = expandAnchors(anchors);
	const isBW = lift.equipment === "Bodyweight";
	const ratio = isBW ? (ormKg + bodyweightKg) / bodyweightKg : ormKg / bodyweightKg;
	const tierIdx = getTierIdx(ratio, thresholds);
	const tier = TIERS[tierIdx];
	const isMax = tierIdx === TIERS.length - 1;
	return {
		thresholds,
		isBW,
		ratio,
		tierIdx,
		tier,
		color: tierColor(tier),
		progress: getProgress(ratio, thresholds, tierIdx),
		isMax,
		nextTier: !isMax ? TIERS[tierIdx + 1] : null
	};
}
function getLiftScoreFromOrm(lift, ormKg, bodyweightKg, thresholds = []) {
	if (!Number.isFinite(ormKg) || !bodyweightKg || !thresholds.length) return null;
	const ratio = lift.equipment === "Bodyweight" ? (ormKg + bodyweightKg) / bodyweightKg : ormKg / bodyweightKg;
	const tierIdx = getTierIdx(ratio, thresholds);
	const progress = getProgress(ratio, thresholds, tierIdx);
	return clampContinuousTierScore(tierIdx + Math.min(.999, progress / 100));
}
function getRankFromScore(lift, score, thresholds = []) {
	return {
		...resolveTierFromScore(score),
		thresholds,
		isBW: lift.equipment === "Bodyweight",
		ratio: inferRatioFromScore(score, thresholds)
	};
}
function readRankDisplayMode() {
	try {
		return localStorage.getItem(RANK_DISPLAY_MODE_STORAGE_KEY) === "all_time" ? ALL_TIME_RANK_MODE : ACTIVE_RANK_MODE;
	} catch {
		return ACTIVE_RANK_MODE;
	}
}
function getMuscleContributionWeight(lift, muscleGroup) {
	const primaryMuscles = lift.primary_muscles || [];
	const secondaryMuscles = lift.secondary_muscles || [];
	if (muscleGroup.muscles.some((muscle) => primaryMuscles.includes(muscle))) return 1;
	return muscleGroup.muscles.some((muscle) => secondaryMuscles.includes(muscle)) ? SECONDARY_MUSCLE_WEIGHT : 0;
}
function buildMuscleGroupRank(muscleGroup, liftsWithDetails) {
	const matchingLifts = liftsWithDetails.filter((lift) => getMuscleContributionWeight(lift, muscleGroup) > 0);
	const contributions = matchingLifts.filter((lift) => lift.cardRank).map((lift) => {
		const muscleWeight = getMuscleContributionWeight(lift, muscleGroup);
		const score = getContinuousTierScore(lift.cardRank);
		return {
			lift,
			score,
			muscleWeight,
			weightedScore: score * muscleWeight
		};
	}).sort((a, b) => b.weightedScore - a.weightedScore);
	if (!contributions.length) return {
		...muscleGroup,
		tier: "Unranked",
		color: TIER_COLORS.Unranked,
		progress: 0,
		isMax: false,
		nextTier: null,
		tierIdx: -1,
		matchingLiftCount: matchingLifts.length,
		contributionCount: 0,
		chartFrequency: 0
	};
	const resolvedRank = resolveTierFromScore(contributions[0].weightedScore);
	return {
		...muscleGroup,
		...resolvedRank,
		matchingLiftCount: matchingLifts.length,
		contributionCount: contributions.length,
		chartFrequency: TIER_GROUPS.indexOf(tierGroup(resolvedRank.tier))
	};
}
function TierSwiper({ thresholds, isBW, bodyweightKg, currentTierIdx, fmt, useLbs }) {
	const total = TIERS.length;
	const [idx, setIdx] = (0, import_react.useState)(currentTierIdx ?? 0);
	const [motionDir, setMotionDir] = (0, import_react.useState)(null);
	const startX = (0, import_react.useRef)(null);
	const go = (delta) => {
		setMotionDir(delta > 0 ? "next" : "prev");
		setIdx((i) => (i + delta + total) % total);
	};
	const onTouchStart = (e) => {
		startX.current = e.touches[0].clientX;
	};
	const onTouchEnd = (e) => {
		if (startX.current === null) return;
		const dx = e.changedTouches[0].clientX - startX.current;
		if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
		startX.current = null;
	};
	const tier = TIERS[idx];
	const color = tierColor(tier);
	const targetKg = isBW ? thresholds[idx] * bodyweightKg - bodyweightKg : thresholds[idx] * bodyweightKg;
	const isCurrent = idx === currentTierIdx;
	const stageClass = motionDir ? `tier-swiper-stage tier-swiper-stage-${motionDir}` : "tier-swiper-stage";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "tier-swiper",
		"data-tab-swipe-ignore": "true",
		onTouchStart,
		onTouchEnd,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "tier-swiper-header",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "tier-swiper-arrow",
					onClick: () => go(-1),
					children: "‹"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "tier-swiper-label-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: stageClass,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "tier-swiper-label",
							style: { color },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
									tier: tierGroup(tier),
									size: 14
								}),
								tier,
								isCurrent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tier-swiper-you",
									children: "(current)"
								})
							]
						})
					}, `label-${idx}-${motionDir ?? "idle"}`)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "tier-swiper-arrow",
					onClick: () => go(1),
					children: "›"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "tier-swiper-body",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: stageClass,
				children: [!isBW && targetKg <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "tier-swiper-bw-hint",
					children: ["Complete a set with 0 ", useLbs ? "lbs" : "kg"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lift-target-chips",
					children: [
						1,
						3,
						5,
						8
					].map((reps) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "target-chip",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "chip-reps",
							children: reps === 1 ? "1 rep" : `${reps} reps`
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "chip-weight",
							children: fmt(weightForOrm(targetKg, reps))
						})]
					}, reps))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "tier-swiper-dots",
					children: TIER_GROUPS.slice(1).map((g, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "tier-swiper-dot",
						style: { background: Math.floor(idx / 3) === i ? TIER_COLORS[g] : void 0 }
					}, g))
				})]
			}, `body-${idx}-${motionDir ?? "idle"}`)
		})]
	});
}
function Ranks({ refreshTick = 0 }) {
	const userId = useCurrentUserId();
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [lifts, setLifts] = (0, import_react.useState)([]);
	const [rankDisplayMode, setRankDisplayMode] = (0, import_react.useState)(readRankDisplayMode);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [loadError, setLoadError] = (0, import_react.useState)(null);
	const [muscleLoadingActive, setMuscleLoadingActive] = (0, import_react.useState)(true);
	const [muscleRevealActive, setMuscleRevealActive] = (0, import_react.useState)(false);
	const [detailExerciseId, setDetailExerciseId] = (0, import_react.useState)(null);
	const [search, setSearch] = (0, import_react.useState)("");
	const [selectedMuscleGroup, setSelectedMuscleGroup] = (0, import_react.useState)(null);
	const [bwInput, setBwInput] = (0, import_react.useState)("");
	const [bwError, setBwError] = (0, import_react.useState)("");
	const [bwSaving, setBwSaving] = (0, import_react.useState)(false);
	const [editingLiftId, setEditingLiftId] = (0, import_react.useState)(null);
	const [topSetForm, setTopSetForm] = (0, import_react.useState)({
		weight: "",
		reps: "1"
	});
	const [topSetSaving, setTopSetSaving] = (0, import_react.useState)(false);
	const [topSetError, setTopSetError] = (0, import_react.useState)("");
	const [topSetNotice, setTopSetNotice] = (0, import_react.useState)("");
	const [ormCalcOpen, setOrmCalcOpen] = (0, import_react.useState)(false);
	const [ormWeight, setOrmWeight] = (0, import_react.useState)("");
	const [ormReps, setOrmReps] = (0, import_react.useState)("");
	const [ormUnit, setOrmUnit] = (0, import_react.useState)("kg");
	(0, import_react.useEffect)(() => {
		try {
			localStorage.setItem(RANK_DISPLAY_MODE_STORAGE_KEY, rankDisplayMode);
		} catch {}
	}, [rankDisplayMode]);
	async function saveBW() {
		const val = parseFloat(bwInput);
		const unit = profile?.unit_preference || "kg";
		if (!userId) return;
		const weightError = validateBodyweight(bwInput, unit);
		if (weightError) {
			setBwError(weightError);
			return;
		}
		setBwSaving(true);
		setBwError("");
		await Promise.all([supabase.from("profiles").update({ bodyweight: val }).eq("id", userId), supabase.from("body_weight_logs").insert({
			user_id: userId,
			weight: val,
			unit
		})]);
		invalidateCache("ranks", "profile", "home");
		setProfile((p) => ({
			...p,
			bodyweight: val
		}));
		setBwInput("");
		setBwSaving(false);
	}
	function isValidRanksSnapshot(data, expectedUserId) {
		return data?.userId === expectedUserId && data?.profile && Array.isArray(data.lifts) && data.lifts.length > 0 && data.lifts.every((lift) => Array.isArray(lift.primary_muscles) && Array.isArray(lift.secondary_muscles));
	}
	async function load() {
		if (!userId) return;
		const cached = getCached("ranks");
		if (isValidRanksSnapshot(cached, userId)) {
			setProfile(cached.profile);
			setLifts(cached.lifts);
			setLoading(false);
			return;
		}
		const snapshot = getStartupSnapshot("ranks", userId);
		if (isValidRanksSnapshot(snapshot, userId)) {
			setCached("ranks", snapshot);
			setProfile(snapshot.profile);
			setLifts(snapshot.lifts);
			setLoading(false);
			return;
		}
		try {
			const anchorNames = Object.keys(ANCHORS.male);
			const anchorNameSet = new Set(anchorNames);
			const [{ data: profileData }, { data: prsData }, exerciseRows, rankStatesResult] = await Promise.all([
				supabase.from("profiles").select("gender, bodyweight, unit_preference").eq("id", userId).single(),
				supabase.from("exercise_prs").select("exercise_id, best_1rm_kg").eq("user_id", userId),
				fetchExercises(userId),
				fetchExerciseRankStates(userId)
			]);
			const exerciseById = new Map((exerciseRows ?? []).map((ex) => [ex.id, ex]));
			const liftMap = {};
			prsData?.forEach((pr) => {
				const exerciseName = exerciseById.get(pr.exercise_id)?.name;
				if (!exerciseName) return;
				liftMap[exerciseName] = {
					ormKg: pr.best_1rm_kg,
					exerciseId: pr.exercise_id
				};
			});
			const rankStateByExerciseId = mapExerciseRankStates(rankStatesResult.rows);
			const preferredExercisesByName = /* @__PURE__ */ new Map();
			for (const ex of exerciseRows ?? []) {
				if (!anchorNameSet.has(ex.name)) continue;
				const existing = preferredExercisesByName.get(ex.name);
				const isGlobal = ex.user_id === null || ex.user_id === void 0;
				const existingIsGlobal = existing?.user_id === null || existing?.user_id === void 0;
				if (!existing || isGlobal && !existingIsGlobal) preferredExercisesByName.set(ex.name, ex);
			}
			const allLifts = anchorNames.map((name) => preferredExercisesByName.get(name)).filter(Boolean).map((ex) => ({
				name: ex.name,
				category: ex.category,
				equipment: ex.equipment,
				exerciseId: ex.id,
				ormKg: liftMap[ex.name]?.ormKg ?? null,
				primary_muscles: ex.primary_muscles || [],
				secondary_muscles: ex.secondary_muscles || [],
				activeCurrentScore: rankStateByExerciseId.get(ex.id)?.current_score ?? null,
				activePeakScore: rankStateByExerciseId.get(ex.id)?.peak_score ?? null,
				activeLastRankedAt: rankStateByExerciseId.get(ex.id)?.last_ranked_at ?? null
			}));
			const cardioLifts = (exerciseRows ?? []).filter((ex) => ex.category === "Cardio" && ex.id).map((ex) => ({
				name: ex.name,
				category: ex.category,
				equipment: ex.equipment,
				exerciseId: ex.id,
				ormKg: null,
				primary_muscles: [],
				secondary_muscles: [],
				activeCurrentScore: null,
				activePeakScore: null,
				activeLastRankedAt: null
			}));
			const ranksData = {
				userId,
				profile: profileData,
				lifts: [...allLifts, ...cardioLifts]
			};
			setCached("ranks", ranksData);
			setStartupSnapshot("ranks", ranksData, void 0, userId);
			setProfile(profileData);
			setLifts(allLifts);
		} catch (err) {
			console.error("Ranks load failed:", err);
			setLoadError(err?.message || "Could not load ranks.");
		} finally {
			setLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		const timer = setTimeout(() => {
			load();
		}, 0);
		return () => clearTimeout(timer);
	}, [refreshTick, userId]);
	function openTopSetEditor(lift) {
		setEditingLiftId(lift.exerciseId);
		setTopSetForm({
			weight: lift.equipment === "Bodyweight" ? "0" : "",
			reps: "1"
		});
		setTopSetError("");
		setTopSetNotice("");
	}
	function closeTopSetEditor() {
		setEditingLiftId(null);
		setTopSetForm({
			weight: "",
			reps: "1"
		});
		setTopSetError("");
	}
	const useLbs = profile?.unit_preference === "lbs";
	const fmt = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;
	const gender = profile?.gender?.toLowerCase() === "female" ? "female" : "male";
	const profileLoaded = !loading && profile !== null;
	const bodyweightKg = profile?.bodyweight ? useLbs ? lbsToKg(profile.bodyweight) : profile.bodyweight : null;
	const missingBodyweight = profileLoaded && (profile.bodyweight === null || profile.bodyweight === void 0);
	const isActiveMode = rankDisplayMode === ACTIVE_RANK_MODE;
	const rankNow = Date.now();
	const liftsWithDetails = (0, import_react.useMemo)(() => {
		const now = Date.now();
		return lifts.map((lift) => {
			const anchors = ANCHORS[gender]?.[lift.name] ?? null;
			const thresholds = anchors ? expandAnchors(anchors) : null;
			const allTimeCardRank = lift.ormKg !== null && bodyweightKg && anchors ? getLiftRank(lift, lift.ormKg, bodyweightKg, gender) : null;
			let activeScore = null;
			if (bodyweightKg && thresholds) {
				if (lift.ormKg !== null && Number.isFinite(lift.activeCurrentScore)) activeScore = applyInactivityDecay(Number(lift.activeCurrentScore), lift.activeLastRankedAt, now).score;
				else if (allTimeCardRank) activeScore = getContinuousTierScore(allTimeCardRank);
			}
			const activeCardRank = activeScore !== null && thresholds ? getRankFromScore(lift, activeScore, thresholds) : null;
			return {
				...lift,
				anchors,
				thresholds,
				allTimeCardRank,
				activeCardRank,
				activeScore,
				cardRank: isActiveMode ? activeCardRank : allTimeCardRank
			};
		});
	}, [
		lifts,
		gender,
		bodyweightKg,
		isActiveMode
	]);
	const muscleGroupRanks = (0, import_react.useMemo)(() => MUSCLE_GROUPS.map((group) => buildMuscleGroupRank(group, liftsWithDetails)), [liftsWithDetails]);
	const selectedMuscleGroupData = muscleGroupRanks.find((group) => group.key === selectedMuscleGroup) ?? null;
	const muscleChartData = muscleGroupRanks.filter((group) => group.chartFrequency > 0).map((group) => ({
		name: group.label,
		muscles: group.chartMuscles,
		frequency: group.chartFrequency
	}));
	const muscleChartSignature = muscleGroupRanks.map((group) => `${group.key}:${group.tier}:${group.chartFrequency}`).join("|");
	(0, import_react.useEffect)(() => {
		if (loading || !muscleChartSignature) {
			setMuscleLoadingActive(true);
			setMuscleRevealActive(false);
			return;
		}
		setMuscleRevealActive(true);
		const loadingOff = setTimeout(() => setMuscleLoadingActive(false), 720);
		const revealOff = setTimeout(() => setMuscleRevealActive(false), 1260);
		return () => {
			clearTimeout(loadingOff);
			clearTimeout(revealOff);
		};
	}, [loading, muscleChartSignature]);
	const filteredLifts = (0, import_react.useMemo)(() => liftsWithDetails.filter((lift) => {
		if (selectedMuscleGroupData && getMuscleContributionWeight(lift, selectedMuscleGroupData) === 0) return false;
		if (!search.trim()) return true;
		return matchesSearchQuery(search, lift.name, lift.category, lift.equipment, (lift.primary_muscles || []).join(" "), (lift.secondary_muscles || []).join(" "));
	}).slice().sort((a, b) => {
		if (search.trim()) {
			const diff = scoreExerciseMatch(search, b) - scoreExerciseMatch(search, a);
			if (diff !== 0) return diff;
			const lengthDiff = a.name.length - b.name.length;
			if (lengthDiff !== 0) return lengthDiff;
		}
		if (!a.cardRank && !b.cardRank) return a.name.localeCompare(b.name);
		if (!a.cardRank) return 1;
		if (!b.cardRank) return -1;
		if (b.cardRank.tierIdx !== a.cardRank.tierIdx) return b.cardRank.tierIdx - a.cardRank.tierIdx;
		if (b.cardRank.ratio !== a.cardRank.ratio) return b.cardRank.ratio - a.cardRank.ratio;
		return a.name.localeCompare(b.name);
	}), [
		liftsWithDetails,
		selectedMuscleGroupData,
		search
	]);
	const editingLift = liftsWithDetails.find((lift) => lift.exerciseId === editingLiftId) ?? null;
	const enteredWeight = Number.parseFloat(topSetForm.weight);
	const enteredReps = Number.parseInt(topSetForm.reps, 10);
	const weightReady = editingLift && topSetForm.weight !== "" && Number.isFinite(enteredWeight) && isWeightWithinInputRange(enteredWeight, {
		equipment: editingLift.equipment,
		unit: useLbs ? "lbs" : "kg",
		bodyweightKg
	});
	const repsReady = topSetForm.reps !== "" && isRepsWithinInputRange(enteredReps);
	const previewOrm = editingLift && weightReady && repsReady ? calculateORM(enteredWeight, enteredReps) : null;
	const previewOrmKg = previewOrm === null ? null : useLbs ? lbsToKg(previewOrm) : previewOrm;
	const previewAllTimeRank = editingLift && previewOrmKg !== null ? getLiftRank(editingLift, previewOrmKg, bodyweightKg, gender) : null;
	const previewActiveRank = (() => {
		if (!editingLift || previewOrmKg === null || !editingLift.thresholds || !bodyweightKg) return null;
		const sessionScore = getLiftScoreFromOrm(editingLift, previewOrmKg, bodyweightKg, editingLift.thresholds);
		if (sessionScore === null) return null;
		return getRankFromScore(editingLift, updateRollingScore({
			priorScore: Number.isFinite(editingLift.activeCurrentScore) ? applyInactivityDecay(Number(editingLift.activeCurrentScore), editingLift.activeLastRankedAt, rankNow).score : editingLift.allTimeCardRank ? getContinuousTierScore(editingLift.allTimeCardRank) : sessionScore,
			priorLastRankedAt: editingLift.activeLastRankedAt,
			sessionScore,
			now: rankNow
		}), editingLift.thresholds);
	})();
	const previewRank = isActiveMode ? previewActiveRank : previewAllTimeRank;
	const improvesTopSet = editingLift && previewOrmKg !== null ? editingLift.ormKg === null || previewOrmKg > editingLift.ormKg + .01 : false;
	async function saveTopSet(lift) {
		if (topSetSaving) return;
		const weight = Number.parseFloat(topSetForm.weight);
		const reps = Number.parseInt(topSetForm.reps, 10);
		const validWeight = isWeightWithinInputRange(weight, {
			equipment: lift.equipment,
			unit: useLbs ? "lbs" : "kg",
			bodyweightKg
		});
		const validReps = isRepsWithinInputRange(reps);
		if (!validWeight || !validReps) {
			setTopSetError("Enter a valid weight and reps first.");
			return;
		}
		const estimated1RM = calculateORM(weight, reps);
		const estimated1RMKg = useLbs ? lbsToKg(estimated1RM) : estimated1RM;
		if (!(lift.ormKg === null || estimated1RMKg > lift.ormKg + .01)) {
			setTopSetError("That set does not beat your current top set, so your rank would stay the same.");
			return;
		}
		setTopSetSaving(true);
		setTopSetError("");
		if (!userId) {
			setTopSetSaving(false);
			return;
		}
		const unit = useLbs ? "lbs" : "kg";
		const { error } = await supabase.from("workout_sets").insert({
			user_id: userId,
			session_id: null,
			exercise_id: lift.exerciseId,
			set_number: 1,
			reps,
			weight,
			unit,
			estimated_1rm: estimated1RM
		});
		if (error) {
			setTopSetSaving(false);
			setTopSetError(error.message || "Could not save your imported top set.");
			return;
		}
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		await supabase.from("exercise_prs").upsert({
			user_id: userId,
			exercise_id: lift.exerciseId,
			best_1rm_kg: estimated1RMKg,
			updated_at: nowIso
		}, { onConflict: "user_id,exercise_id" });
		let nextActiveScore = null;
		let nextActivePeakScore = null;
		if (bodyweightKg && lift.thresholds) {
			const sessionScore = getLiftScoreFromOrm(lift, estimated1RMKg, bodyweightKg, lift.thresholds);
			if (sessionScore !== null) {
				const currentActiveScore = Number.isFinite(lift.activeCurrentScore) ? applyInactivityDecay(Number(lift.activeCurrentScore), lift.activeLastRankedAt, nowIso).score : lift.allTimeCardRank ? getContinuousTierScore(lift.allTimeCardRank) : sessionScore;
				nextActiveScore = updateRollingScore({
					priorScore: currentActiveScore,
					priorLastRankedAt: lift.activeLastRankedAt,
					sessionScore,
					now: nowIso
				});
				const previousPeak = Number.isFinite(lift.activePeakScore) ? Number(lift.activePeakScore) : currentActiveScore;
				nextActivePeakScore = Math.max(previousPeak, nextActiveScore);
				await upsertExerciseRankStates(userId, [{
					exerciseId: lift.exerciseId,
					currentScore: nextActiveScore,
					peakScore: nextActivePeakScore,
					lastRankedAt: nowIso,
					updatedAt: nowIso
				}]);
			}
		}
		invalidateCache("ranks", "profile", "achievements");
		setLifts((prev) => prev.map((item) => item.exerciseId === lift.exerciseId ? {
			...item,
			ormKg: Math.max(item.ormKg ?? 0, estimated1RMKg),
			activeCurrentScore: nextActiveScore ?? item.activeCurrentScore,
			activePeakScore: nextActivePeakScore ?? item.activePeakScore,
			activeLastRankedAt: nextActiveScore !== null ? nowIso : item.activeLastRankedAt
		} : item));
		const savedAllTimeRank = getLiftRank(lift, estimated1RMKg, bodyweightKg, gender);
		const savedActiveRank = nextActiveScore !== null && lift.thresholds ? getRankFromScore(lift, nextActiveScore, lift.thresholds) : null;
		const savedRank = isActiveMode ? savedActiveRank || savedAllTimeRank : savedAllTimeRank;
		setTopSetNotice(savedRank ? `${lift.name} saved. ${isActiveMode ? "Active" : "All-time"} rank: ${savedRank.tier}.` : `${lift.name} saved as your top set.`);
		setTopSetSaving(false);
		closeTopSetEditor();
	}
	if (detailExerciseId) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExerciseDetail, {
			exerciseId: detailExerciseId,
			rankMode: rankDisplayMode,
			onBack: () => setDetailExerciseId(null)
		})
	});
	const ormCalcW = parseFloat(ormWeight);
	const ormCalcR = parseInt(ormReps);
	const ormResult = Number.isFinite(ormCalcW) && ormCalcW > 0 && Number.isFinite(ormCalcR) && ormCalcR >= 1 && ormCalcR <= 36 ? (() => {
		const resultKg = calculateORM(ormUnit === "lbs" ? ormCalcW * .453592 : ormCalcW, ormCalcR);
		return ormUnit === "lbs" ? Math.round(resultKg * 2.20462 * 10) / 10 : resultKg;
	})() : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "ranks-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-header",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ranks-title-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ranks-title",
							children: "Strength Ranks"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "orm-calc-btn",
							onClick: () => setOrmCalcOpen(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
								width: "14",
								height: "14",
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "2",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
										x: "4",
										y: "2",
										width: "16",
										height: "20",
										rx: "2"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
										x1: "8",
										y1: "6",
										x2: "16",
										y2: "6"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
										x1: "8",
										y1: "10",
										x2: "16",
										y2: "10"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
										x1: "8",
										y1: "14",
										x2: "12",
										y2: "14"
									})
								]
							}), "1RM Calculator"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ranks-subtitle",
						children: [
							isActiveMode ? "Current ranks track recent form with rolling updates and a 21-day inactivity grace period." : "All-time ranks are based on your best recorded 1RM for each exercise.",
							" ",
							"· ",
							TIERS.length,
							" tiers · ",
							lifts.length,
							" exercises"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ranks-mode-toggle",
						role: "tablist",
						"aria-label": "Rank display mode",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `ranks-mode-btn ${rankDisplayMode === "active" ? "active" : ""}`,
							onClick: () => setRankDisplayMode(ACTIVE_RANK_MODE),
							children: "Current"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `ranks-mode-btn ${rankDisplayMode === "all_time" ? "active" : ""}`,
							onClick: () => setRankDisplayMode(ALL_TIME_RANK_MODE),
							children: "All-Time"
						})]
					})
				]
			}),
			topSetNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-notice ranks-notice-success",
				children: topSetNotice
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "ranks-dropdown",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
					className: "ranks-dropdown-summary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ranks-dropdown-label",
						children: "Rank Legend"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ranks-dropdown-value",
						children: [TIER_GROUPS.length, " tiers"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "tier-legend",
					children: TIER_GROUPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "tier-legend-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
							tier: g,
							size: 22
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: g })]
					}, g))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-muscle-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ranks-muscle-panel-top",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ranks-muscle-title",
							children: "Muscle Group Ranks"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ranks-muscle-subtitle" })] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "ranks-filter-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ranks-filter-label",
							children: "Muscle Filter"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ranks-select-wrap",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "ranks-select",
								value: selectedMuscleGroup || "",
								onChange: (e) => setSelectedMuscleGroup(e.target.value || null),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "All muscle groups"
								}), muscleGroupRanks.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: group.key,
									children: [
										group.label,
										" · ",
										group.tier
									]
								}, group.key))]
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `ranks-muscle-map-shell ${muscleLoadingActive ? "ranks-muscle-map-shell-loading" : ""} ${muscleRevealActive ? "ranks-muscle-map-shell-revealing" : ""}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ranks-muscle-models",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `ranks-muscle-model ${muscleLoadingActive ? "ranks-muscle-model-loading" : ""} ${muscleRevealActive ? "ranks-muscle-model-revealing" : ""}`,
								style: {
									...muscleLoadingActive ? { "--loading-delay": "0ms" } : {},
									...muscleRevealActive ? { "--reveal-delay": "0ms" } : {}
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ranks-muscle-model-label",
									children: "Front"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ranks-muscle-model-stack",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ranks-muscle-model-base",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Model, {
											data: muscleChartData,
											type: "anterior",
											bodyColor: "rgba(255, 255, 255, 0.14)",
											highlightedColors: MUSCLE_CHART_COLORS,
											onClick: ({ muscle }) => {
												if (!MUSCLE_GROUP_KEYS.has(muscle)) return;
												setSelectedMuscleGroup((current) => current === muscle ? null : muscle);
											},
											style: {
												width: "100%",
												aspectRatio: "1 / 2"
											}
										})
									}), (muscleLoadingActive || muscleRevealActive) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ranks-muscle-model-loader-layer",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Model, {
											data: muscleChartData,
											type: "anterior",
											bodyColor: "rgba(255, 255, 255, 0.14)",
											highlightedColors: MUSCLE_CHART_COLORS,
											style: {
												width: "100%",
												aspectRatio: "1 / 2"
											}
										})
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `ranks-muscle-model ${muscleLoadingActive ? "ranks-muscle-model-loading" : ""} ${muscleRevealActive ? "ranks-muscle-model-revealing" : ""}`,
								style: {
									...muscleLoadingActive ? { "--loading-delay": "150ms" } : {},
									...muscleRevealActive ? { "--reveal-delay": "80ms" } : {}
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ranks-muscle-model-label",
									children: "Back"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ranks-muscle-model-stack",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ranks-muscle-model-base",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Model, {
											data: muscleChartData,
											type: "posterior",
											bodyColor: "rgba(255, 255, 255, 0.14)",
											highlightedColors: MUSCLE_CHART_COLORS,
											onClick: ({ muscle }) => {
												if (!MUSCLE_GROUP_KEYS.has(muscle)) return;
												setSelectedMuscleGroup((current) => current === muscle ? null : muscle);
											},
											style: {
												width: "100%",
												aspectRatio: "1 / 2"
											}
										})
									}), (muscleLoadingActive || muscleRevealActive) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ranks-muscle-model-loader-layer",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Model, {
											data: muscleChartData,
											type: "posterior",
											bodyColor: "rgba(255, 255, 255, 0.14)",
											highlightedColors: MUSCLE_CHART_COLORS,
											style: {
												width: "100%",
												aspectRatio: "1 / 2"
											}
										})
									})]
								})]
							})]
						})
					}),
					selectedMuscleGroupData && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ranks-muscle-active",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "tier-badge",
							style: {
								background: selectedMuscleGroupData.color + "22",
								color: selectedMuscleGroupData.color
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
								tier: selectedMuscleGroupData.contributionCount > 0 ? tierGroup(selectedMuscleGroupData.tier) : "Unranked",
								size: 18
							}), selectedMuscleGroupData.label]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ranks-muscle-active-copy",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ranks-muscle-active-tier",
								style: { color: selectedMuscleGroupData.contributionCount > 0 ? selectedMuscleGroupData.color : "var(--muted)" },
								children: selectedMuscleGroupData.tier
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ranks-muscle-active-sub",
								children: [
									selectedMuscleGroupData.matchingLiftCount,
									" exercise",
									selectedMuscleGroupData.matchingLiftCount === 1 ? "" : "s",
									" in this group",
									selectedMuscleGroupData.contributionCount > 0 ? ` · ${selectedMuscleGroupData.contributionCount} ranked` : ""
								]
							})]
						})]
					})
				]
			}),
			missingBodyweight && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-bw-prompt",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ranks-bw-prompt-title",
						children: "Set your bodyweight to unlock ranks"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ranks-bw-prompt-sub",
						children: "Your strength tier is calculated as your 1RM relative to bodyweight."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ranks-bw-prompt-row",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "ranks-bw-input",
								type: "number",
								min: useLbs ? "44.1" : "20",
								max: useLbs ? "1322.8" : "600",
								step: "0.1",
								inputMode: "decimal",
								placeholder: useLbs ? "e.g. 175" : "e.g. 80",
								value: bwInput,
								onChange: (e) => {
									setBwError("");
									setBwInput(e.target.value);
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ranks-bw-unit",
								children: useLbs ? "lbs" : "kg"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "ranks-bw-save",
								onClick: saveBW,
								disabled: bwSaving || !bwInput,
								children: bwSaving ? "Saving…" : "Save"
							})
						]
					}),
					bwError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ranks-notice",
						children: bwError
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "ranks-search",
				type: "text",
				placeholder: selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} exercises...` : "Search exercises...",
				value: search,
				onChange: (e) => setSearch(e.target.value),
				maxLength: VALIDATION_LIMITS.searchMaxLength
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true }) : loadError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-empty",
				children: loadError
			}) : filteredLifts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-empty",
				children: selectedMuscleGroupData ? `No exercises match ${selectedMuscleGroupData.label.toLowerCase()}${search.trim() ? ` for "${search.trim()}"` : ""}.` : search.trim() ? `No exercises match "${search.trim()}".` : "No exercises found."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lift-cards",
				children: filteredLifts.map((lift) => {
					const thresholds = lift.thresholds;
					const isLogged = lift.ormKg !== null;
					const cardRank = lift.cardRank;
					const isEditing = editingLiftId === lift.exerciseId;
					if (!isLogged || !bodyweightKg) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lift-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "lift-card-top",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-name",
									children: lift.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-category",
									children: lift.category
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "info-btn",
									onClick: () => setDetailExerciseId(lift.exerciseId),
									children: "i"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-tier-row",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "tier-badge",
									style: {
										background: "#4b556322",
										color: "#4b5563"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
										tier: "Unranked",
										size: 18
									}), "Unranked"]
								})
							}),
							lift.category !== "Cardio" && (!bodyweightKg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-no-bw",
								children: "Add bodyweight in Profile to see targets"
							}) : thresholds && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TierSwiper, {
								thresholds,
								isBW: lift.equipment === "Bodyweight",
								bodyweightKg,
								currentTierIdx: null,
								fmt,
								useLbs
							})),
							lift.category !== "Cardio" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "lift-import-btn",
								onClick: () => isEditing ? closeTopSetEditor() : openTopSetEditor(lift),
								children: isEditing ? "Cancel" : isLogged ? "Update top set" : "Add top set"
							}),
							lift.category !== "Cardio" && isEditing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "lift-import-panel",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-title",
										children: "Manual rank update"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-sub",
										children: lift.equipment === "Bodyweight" ? "Enter the added or assisted weight for your best set. Use a negative number for assisted machine reps." : "Enter your best set and we’ll use it as your imported top set."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-import-grid",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "lift-import-field",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lift.equipment === "Bodyweight" ? "Added / assisted weight" : "Weight" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "lift-import-input-wrap",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "lift-import-input",
													type: "number",
													inputMode: getWeightInputMin(lift.equipment, useLbs ? "lbs" : "kg", bodyweightKg) < 0 ? "text" : "decimal",
													min: String(getWeightInputMin(lift.equipment, useLbs ? "lbs" : "kg", bodyweightKg)),
													max: String(getWeightInputMax(lift.equipment, useLbs ? "lbs" : "kg")),
													step: "any",
													value: topSetForm.weight,
													onChange: (e) => {
														setTopSetForm((prev) => ({
															...prev,
															weight: e.target.value
														}));
														setTopSetError("");
														setTopSetNotice("");
													}
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: useLbs ? "lbs" : "kg" })]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "lift-import-field",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reps" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: "lift-import-input",
												type: "number",
												min: "1",
												max: String(9999),
												step: "1",
												value: topSetForm.reps,
												onChange: (e) => {
													setTopSetForm((prev) => ({
														...prev,
														reps: e.target.value
													}));
													setTopSetError("");
													setTopSetNotice("");
												}
											})]
										})]
									}),
									previewOrmKg !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-import-preview",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Est. 1RM" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmt(previewOrmKg) })]
									}),
									previewRank ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-import-rank",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "tier-badge",
											style: {
												background: previewRank.color + "22",
												color: previewRank.color
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
												tier: tierGroup(previewRank.tier),
												size: 18
											}), previewRank.tier]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "lift-import-ratio",
											children: [previewRank.ratio.toFixed(2), "× BW"]
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-hint",
										children: bodyweightKg ? "Enter a set to preview the rank." : "Set bodyweight first to preview the rank."
									}),
									previewOrmKg !== null && !improvesTopSet && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-hint",
										children: "Your current top set is still higher, so saving this would not change your rank."
									}),
									topSetError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-error",
										children: topSetError
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "lift-import-save",
										onClick: () => saveTopSet(lift),
										disabled: !weightReady || !repsReady || !improvesTopSet || topSetSaving,
										children: topSetSaving ? "Saving…" : isLogged ? "Update top set" : "Save as top set"
									})
								]
							})
						]
					}, lift.name);
					const { isBW, ratio, tier, color, progress, isMax, nextTier, tierIdx } = cardRank;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lift-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "lift-card-top",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-name",
									children: lift.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-category",
									children: lift.category
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 10
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-right",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "lift-orm",
											children: fmt(lift.ormKg)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "lift-ratio",
											children: [ratio.toFixed(2), "× BW"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "info-btn",
										onClick: () => setDetailExerciseId(lift.exerciseId),
										children: "i"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "lift-tier-row",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "tier-badge",
										style: {
											background: color + "22",
											color
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
											tier: tierGroup(tier),
											size: 18
										}), tier]
									}),
									nextTier && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "lift-next-label",
										children: ["→ ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: { color: tierColor(nextTier) },
											children: nextTier
										})]
									}),
									isMax && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "lift-next-label",
										style: { color: TIER_COLORS.Elite },
										children: "Max Rank"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-progress-track",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-progress-fill",
									style: {
										width: `${progress}%`,
										background: color
									}
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-progress-pct",
								children: isMax ? "100%" : `${progress}%`
							}),
							thresholds && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TierSwiper, {
								thresholds,
								isBW,
								bodyweightKg,
								currentTierIdx: tierIdx,
								fmt,
								useLbs
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "lift-import-btn",
								onClick: () => isEditing ? closeTopSetEditor() : openTopSetEditor(lift),
								children: isEditing ? "Cancel" : "Update top set"
							}),
							isEditing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "lift-import-panel",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-title",
										children: "Manual rank update"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-sub",
										children: isBW ? "Enter the added or assisted weight for your imported best set. Use a negative number for assisted machine reps." : "Enter a better top set to update your best lift and rank."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-import-grid",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "lift-import-field",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isBW ? "Added / assisted weight" : "Weight" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "lift-import-input-wrap",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "lift-import-input",
													type: "number",
													inputMode: getWeightInputMin(lift.equipment, useLbs ? "lbs" : "kg", bodyweightKg) < 0 ? "text" : "decimal",
													min: String(getWeightInputMin(lift.equipment, useLbs ? "lbs" : "kg", bodyweightKg)),
													max: String(getWeightInputMax(lift.equipment, useLbs ? "lbs" : "kg")),
													step: "any",
													value: topSetForm.weight,
													onChange: (e) => {
														setTopSetForm((prev) => ({
															...prev,
															weight: e.target.value
														}));
														setTopSetError("");
														setTopSetNotice("");
													}
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: useLbs ? "lbs" : "kg" })]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "lift-import-field",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reps" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: "lift-import-input",
												type: "number",
												min: "1",
												max: String(9999),
												step: "1",
												value: topSetForm.reps,
												onChange: (e) => {
													setTopSetForm((prev) => ({
														...prev,
														reps: e.target.value
													}));
													setTopSetError("");
													setTopSetNotice("");
												}
											})]
										})]
									}),
									previewOrmKg !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-import-preview",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Est. 1RM" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: fmt(previewOrmKg) })]
									}),
									previewRank ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-import-rank",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "tier-badge",
											style: {
												background: previewRank.color + "22",
												color: previewRank.color
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
												tier: tierGroup(previewRank.tier),
												size: 18
											}), previewRank.tier]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "lift-import-ratio",
											children: [previewRank.ratio.toFixed(2), "× BW"]
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-hint",
										children: "Enter a set to preview the updated rank."
									}),
									previewOrmKg !== null && !improvesTopSet && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-hint",
										children: "Your current top set is still higher, so saving this would not change your rank."
									}),
									topSetError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-import-error",
										children: topSetError
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "lift-import-save",
										onClick: () => saveTopSet(lift),
										disabled: !weightReady || !repsReady || !improvesTopSet || topSetSaving,
										children: topSetSaving ? "Saving…" : "Update top set"
									})
								]
							})
						]
					}, lift.name);
				})
			})
		]
	}), ormCalcOpen && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "confirm-overlay",
		onClick: () => setOrmCalcOpen(false),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "confirm-sheet orm-calc-sheet",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "orm-calc-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "orm-calc-title",
						children: "1RM Calculator"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "unit-toggle",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `unit-btn ${ormUnit === "kg" ? "active" : ""}`,
							onClick: () => setOrmUnit("kg"),
							children: "kg"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `unit-btn ${ormUnit === "lbs" ? "active" : ""}`,
							onClick: () => setOrmUnit("lbs"),
							children: "lbs"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "orm-calc-sub",
					children: "Estimate your one-rep max from any working set"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lift-import-grid",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "lift-import-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Weight (",
							ormUnit,
							")"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lift-import-input-wrap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "lift-import-input",
								type: "number",
								inputMode: "decimal",
								min: "0",
								step: "any",
								placeholder: "0",
								value: ormWeight,
								onChange: (e) => setOrmWeight(e.target.value)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ormUnit })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "lift-import-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reps" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "lift-import-input",
							type: "number",
							inputMode: "numeric",
							min: "1",
							max: "36",
							step: "1",
							placeholder: "0",
							value: ormReps,
							onChange: (e) => setOrmReps(e.target.value)
						})]
					})]
				}),
				ormResult !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "orm-calc-result",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "orm-calc-result-label",
						children: "Estimated 1RM"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "orm-calc-result-value",
						children: [
							ormResult,
							" ",
							ormUnit
						]
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "orm-calc-placeholder",
					children: "Enter weight and reps to see your estimate"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "confirm-keep",
					onClick: () => setOrmCalcOpen(false),
					children: "Done"
				})
			]
		})
	}), document.body)] });
}
//#endregion
export { Ranks as default };

//# sourceMappingURL=Ranks-DjZVOPzH.js.map