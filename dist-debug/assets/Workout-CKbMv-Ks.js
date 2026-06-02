const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ExerciseDetail-bpYIGxwe.js","assets/rolldown-runtime-CvHMtSRF.js","assets/index-BNajgLSV.js","assets/preload-helper-CCDVmQCD.js","assets/dist-B65an-qx.js","assets/body-diagram-9cYNiocp.js","assets/react-vendor-BqgOqDvu.js","assets/drag-drop-BDqY7zvQ.js","assets/supabase-CCACEYhB.js","assets/supabase-BKYoYWHZ.js","assets/theme-CXEPPnky.js","assets/RankBadge-BtaAzhvV.js","assets/rollingRanks-BNemOpZT.js","assets/chartPeriods-C_WRj2FA.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { a as DndContext, c as TouchSensor, d as useSensors, f as CSS, i as verticalListSortingStrategy, l as closestCenter, n as arrayMove, o as MeasuringStrategy, p as require_react_dom, r as useSortable, s as PointerSensor, t as SortableContext, u as useSensor } from "./drag-drop-BDqY7zvQ.js";
import { t as __vitePreload } from "./preload-helper-CCDVmQCD.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { B as LoadingSpinner, C as validateLength, F as getWeightInputMax, G as invalidateCache, I as getWeightInputMin, L as isRepsWithinInputRange, M as getProfileBodyweightKg, N as getSetVolumeInUnit, O as DEFAULT_BODYWEIGHT_KG, P as getSetVolumeKg, R as isWeightWithinInputRange, a as scheduleRestEndNotification, b as trimToMax, c as loadBattleRecap, d as publishWorkoutRoomEvent, f as resolveWorkoutRoomIfComplete, g as RestTimePicker, h as calculateORM, i as cancelRestNotification, j as fromKg, k as MAX_REPS, m as getMuscleCountMET, p as CARDIO_MET, r as useCurrentUserId, s as getBattleModeLabel, u as loadOpponentEvents, v as VALIDATION_LIMITS, w as validateNumber, z as toKg } from "./index-BNajgLSV.js";
import { b as upsertExerciseRankStates, c as updateRollingScore, f as expandAnchors, h as tierColor, i as clampContinuousTierScore, l as ANCHORS, m as getTierIdx, p as getProgress, u as TIERS, v as fetchExerciseRankStates, y as mapExerciseRankStates } from "./rollingRanks-BNemOpZT.js";
import { n as fetchExercises, t as createCustomExercise } from "./exercises-DX-XFagI.js";
import { r as fetchProfileWithWorkoutCount, t as ACHIEVEMENTS } from "./achievements-Cvgw88zh.js";
import { n as normalizeSearchValue, r as scoreExerciseMatch, t as matchesSearchQuery } from "./exerciseSearch-yksvqij-.js";
//#region src/data/templates.js
var import_react_dom = require_react_dom();
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var TEMPLATES = [
	{
		id: "push",
		name: "Push",
		description: "Chest · Shoulders · Triceps",
		exercises: [
			{
				name: "Bench Press",
				sets: 4,
				reps: 8
			},
			{
				name: "Incline Bench Press",
				sets: 3,
				reps: 10
			},
			{
				name: "Military Press",
				sets: 3,
				reps: 8
			},
			{
				name: "Dumbbell Lateral Raise",
				sets: 3,
				reps: 15
			},
			{
				name: "Tricep Pushdown",
				sets: 3,
				reps: 12
			}
		]
	},
	{
		id: "pull",
		name: "Pull",
		description: "Back · Biceps",
		exercises: [
			{
				name: "Pull Ups",
				sets: 4,
				reps: 8
			},
			{
				name: "Bent Over Row",
				sets: 4,
				reps: 8
			},
			{
				name: "Lat Pulldown",
				sets: 3,
				reps: 10
			},
			{
				name: "Barbell Curl",
				sets: 3,
				reps: 12
			},
			{
				name: "Face Pull",
				sets: 3,
				reps: 15
			}
		]
	},
	{
		id: "legs",
		name: "Legs",
		description: "Quads · Hamstrings · Glutes · Calves",
		exercises: [
			{
				name: "Squat",
				sets: 4,
				reps: 8
			},
			{
				name: "Romanian Deadlift",
				sets: 3,
				reps: 10
			},
			{
				name: "Horizontal Leg Press",
				sets: 3,
				reps: 12
			},
			{
				name: "Lying Leg Curl",
				sets: 3,
				reps: 12
			},
			{
				name: "Machine Calf Raise",
				sets: 4,
				reps: 15
			}
		]
	},
	{
		id: "upper",
		name: "Upper Body",
		description: "Chest · Back · Shoulders · Arms",
		exercises: [
			{
				name: "Bench Press",
				sets: 4,
				reps: 8
			},
			{
				name: "Bent Over Row",
				sets: 4,
				reps: 8
			},
			{
				name: "Military Press",
				sets: 3,
				reps: 10
			},
			{
				name: "Lat Pulldown",
				sets: 3,
				reps: 10
			},
			{
				name: "Barbell Curl",
				sets: 2,
				reps: 12
			},
			{
				name: "Tricep Pushdown",
				sets: 2,
				reps: 12
			}
		]
	},
	{
		id: "lower",
		name: "Lower Body",
		description: "Quads · Hamstrings · Glutes · Calves",
		exercises: [
			{
				name: "Squat",
				sets: 4,
				reps: 6
			},
			{
				name: "Romanian Deadlift",
				sets: 3,
				reps: 10
			},
			{
				name: "Horizontal Leg Press",
				sets: 3,
				reps: 12
			},
			{
				name: "Lying Leg Curl",
				sets: 3,
				reps: 12
			},
			{
				name: "Hip Thrust",
				sets: 3,
				reps: 12
			},
			{
				name: "Machine Calf Raise",
				sets: 3,
				reps: 15
			}
		]
	},
	{
		id: "full-body",
		name: "Full Body",
		description: "All muscle groups",
		exercises: [
			{
				name: "Squat",
				sets: 3,
				reps: 8
			},
			{
				name: "Bench Press",
				sets: 3,
				reps: 8
			},
			{
				name: "Bent Over Row",
				sets: 3,
				reps: 8
			},
			{
				name: "Military Press",
				sets: 3,
				reps: 10
			},
			{
				name: "Romanian Deadlift",
				sets: 3,
				reps: 10
			}
		]
	}
];
//#endregion
//#region src/components/ProgressionSuggestion.jsx
var import_jsx_runtime = require_jsx_runtime();
var ACTION_CONFIG = {
	increase_weight: {
		label: "Level Up",
		colorClass: "ps-green"
	},
	increase_reps: {
		label: "More Reps",
		colorClass: "ps-green"
	},
	maintain: {
		label: "Maintain",
		colorClass: "ps-yellow"
	},
	deload: {
		label: "Deload",
		colorClass: "ps-amber"
	}
};
function ProgressionSuggestion({ suggestion, unitPreference, onApply }) {
	if (!suggestion) return null;
	const { action, activeSetIndex, suggestedWeightKg, suggestedReps, reasoning, isBodyweightOnly } = suggestion;
	const config = ACTION_CONFIG[action];
	if (!config) return null;
	const setNumber = Number.isInteger(activeSetIndex) ? activeSetIndex + 1 : null;
	const badgeLabel = setNumber ? `Set ${setNumber} Suggestion` : "Suggestion";
	const applyWeight = suggestedWeightKg !== null ? Math.round(fromKg(suggestedWeightKg, unitPreference) * 10) / 10 : null;
	const displayWeight = applyWeight !== null && !(isBodyweightOnly && suggestedWeightKg === 0) ? applyWeight : null;
	const applyLabel = displayWeight !== null && suggestedReps !== null ? `${displayWeight} × ${suggestedReps}` : displayWeight !== null ? `${displayWeight} ${unitPreference}` : suggestedReps !== null ? `${suggestedReps} reps` : null;
	const fullReasoning = reasoning ? `${config.label} — ${reasoning}` : config.label;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `progression-suggestion ${config.colorClass}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "ps-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `ps-badge ${config.colorClass}`,
				children: badgeLabel
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ps-reasoning",
				children: fullReasoning
			})]
		}), applyLabel && onApply && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "ps-apply-btn",
			type: "button",
			onClick: () => onApply(applyWeight, suggestedReps),
			children: applyLabel
		})]
	});
}
//#endregion
//#region src/lib/plateUtils.js
var PLATE_SIZES_KG = [
	1.25,
	2.5,
	5,
	10,
	20,
	25
];
var PLATE_SIZES_LBS = [
	2.5,
	5,
	10,
	25,
	35,
	45
];
var BAR_OPTIONS_KG = [
	{
		label: "Standard",
		weight: 20
	},
	{
		label: "Women's",
		weight: 15
	},
	{
		label: "EZ Bar",
		weight: 10
	}
];
var BAR_OPTIONS_LBS = [
	{
		label: "Standard",
		weight: 45
	},
	{
		label: "Women's",
		weight: 35
	},
	{
		label: "EZ Bar",
		weight: 25
	}
];
var PLATE_EQUIPMENT = new Set([
	"Barbell",
	"EZ Bar",
	"Smith Machine",
	"Plate Loaded"
]);
var DEFAULT_BAR_INDEX = {
	"Barbell": 0,
	"Smith Machine": 0,
	"EZ Bar": 2,
	"Plate Loaded": 0
};
/** Total weight = bar + 2 × sum of plates per side */
function platesToWeight(barWeight, platesPerSide) {
	return barWeight + 2 * platesPerSide.reduce((s, p) => s + p, 0);
}
/**
* Snap a target weight (in kg) to the nearest achievable plate combination
* for the given equipment and unit preference.
*
* Strategy:
*   1. Convert target from kg to display unit.
*   2. Use the default bar for this equipment.
*   3. Find the per-side plate load = (target - bar) / 2.
*   4. Round per-side load DOWN to the nearest achievable combination
*      (largest plates first, greedy). "Down" ensures we never suggest
*      more weight than intended when the target sits between combinations.
*   5. Return bar + 2 × snapped per-side as kg.
*
* Returns the original targetKg unchanged if equipment is not plate-based
* or if the target is below the bare bar weight.
*/
function snapToPlates(targetKg, unit, equipment) {
	if (!PLATE_EQUIPMENT.has(equipment)) return targetKg;
	const barOptions = unit === "lbs" ? BAR_OPTIONS_LBS : BAR_OPTIONS_KG;
	const plateSizes = unit === "lbs" ? PLATE_SIZES_LBS : PLATE_SIZES_KG;
	const LBS_TO_KG = .453592;
	const targetDisplay = unit === "lbs" ? targetKg / LBS_TO_KG : targetKg;
	const barWeight = barOptions[DEFAULT_BAR_INDEX[equipment] ?? 0].weight;
	if (targetDisplay <= barWeight) return unit === "lbs" ? barWeight * LBS_TO_KG : barWeight;
	const sorted = [...plateSizes].sort((a, b) => b - a);
	const smallest = sorted[sorted.length - 1];
	let remaining = (targetDisplay - barWeight) / 2;
	let perSide = 0;
	for (const p of sorted) while (remaining >= p) {
		perSide += p;
		remaining -= p;
	}
	if (remaining > .001) perSide += smallest;
	const snappedDisplay = barWeight + 2 * perSide;
	return unit === "lbs" ? snappedDisplay * LBS_TO_KG : snappedDisplay;
}
/**
* Greedy decomposition of totalWeight into a bar + plates per side.
* Returns { barIndex, platesPerSide: number[] } sorted largest-first.
* If totalWeight is less than the smallest bar, returns barIndex 0 with no plates.
*/
function weightToPlates(totalWeight, unit, equipment = "Barbell") {
	const barOptions = unit === "lbs" ? BAR_OPTIONS_LBS : BAR_OPTIONS_KG;
	const plateSizes = unit === "lbs" ? PLATE_SIZES_LBS : PLATE_SIZES_KG;
	const defaultIdx = DEFAULT_BAR_INDEX[equipment] ?? 0;
	const barIndex = totalWeight >= barOptions[defaultIdx].weight ? defaultIdx : 0;
	const barWeight = barOptions[barIndex].weight;
	const tolerance = .01;
	let remaining = (totalWeight - barWeight) / 2;
	if (remaining < 0) return {
		barIndex,
		platesPerSide: []
	};
	const plates = [];
	const sorted = [...plateSizes].sort((a, b) => b - a);
	for (const p of sorted) while (remaining >= p - tolerance) {
		plates.push(p);
		remaining -= p;
	}
	return {
		barIndex,
		platesPerSide: plates
	};
}
//#endregion
//#region src/components/PlateCalculator.jsx
function PlateCalculator({ unit, equipment, currentWeight, onConfirm, onClose }) {
	const barOptions = unit === "lbs" ? BAR_OPTIONS_LBS : BAR_OPTIONS_KG;
	const plateSizes = unit === "lbs" ? PLATE_SIZES_LBS : PLATE_SIZES_KG;
	function getInitialState() {
		const parsed = Number(currentWeight);
		if (parsed > 0) {
			const { barIndex, platesPerSide } = weightToPlates(parsed, unit, equipment);
			return {
				barIndex,
				platesPerSide
			};
		}
		return {
			barIndex: DEFAULT_BAR_INDEX[equipment] ?? 0,
			platesPerSide: []
		};
	}
	const [barIndex, setBarIndex] = (0, import_react.useState)(() => getInitialState().barIndex);
	const [platesPerSide, setPlatesPerSide] = (0, import_react.useState)(() => getInitialState().platesPerSide);
	const barWeight = barOptions[barIndex].weight;
	const total = platesToWeight(barWeight, platesPerSide);
	const perSideTotal = platesPerSide.reduce((s, p) => s + p, 0);
	function addPlate(p) {
		setPlatesPerSide((prev) => [...prev, p].sort((a, b) => b - a));
	}
	function removePlate(index) {
		setPlatesPerSide((prev) => prev.filter((_, i) => i !== index));
	}
	function formatWeight(w) {
		return Number.isInteger(w) ? String(w) : String(Math.round(w * 100) / 100);
	}
	const content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "plate-calc-overlay",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "plate-calc-sheet",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "plate-calc-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "plate-calc-title",
						children: "Plate Calculator"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "plate-calc-close",
						onClick: onClose,
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "18",
							height: "18",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2.5",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "18",
								y1: "6",
								x2: "6",
								y2: "18"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "6",
								y1: "6",
								x2: "18",
								y2: "18"
							})]
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "plate-calc-section-label",
					children: "Bar"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "plate-calc-bar-row",
					children: barOptions.map((opt, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: `plate-calc-bar-btn ${barIndex === idx ? "active" : ""}`,
						onClick: () => setBarIndex(idx),
						children: [opt.label, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "plate-calc-bar-weight",
							children: [
								opt.weight,
								" ",
								unit
							]
						})]
					}, opt.label))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "plate-calc-section-label",
					children: "Add per side"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "plate-calc-plates-row",
					children: plateSizes.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "plate-calc-plate-btn",
						onClick: () => addPlate(p),
						children: formatWeight(p)
					}, p))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "plate-calc-section-label",
					children: ["Per side", platesPerSide.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "plate-calc-clear",
						onClick: () => setPlatesPerSide([]),
						children: "Clear"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "plate-calc-per-side",
					children: platesPerSide.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "plate-calc-empty",
						children: "No plates added"
					}) : platesPerSide.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "plate-calc-tag",
						onClick: () => removePlate(i),
						children: [formatWeight(p), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "10",
							height: "10",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "3",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "18",
								y1: "6",
								x2: "6",
								y2: "18"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "6",
								y1: "6",
								x2: "18",
								y2: "18"
							})]
						})]
					}, i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "plate-calc-total-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "plate-calc-total-formula",
						children: [
							barWeight,
							" + (",
							formatWeight(perSideTotal),
							" × 2) ="
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "plate-calc-total-value",
						children: [
							formatWeight(total),
							" ",
							unit
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "plate-calc-confirm",
					onClick: () => onConfirm(total),
					disabled: total <= 0,
					children: [
						"Use ",
						formatWeight(total),
						" ",
						unit
					]
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(content, document.body) : null;
}
//#endregion
//#region src/lib/progressiveOverload.js
var HISTORY_SESSION_LIMIT = 8;
var DECISION_SESSION_LIMIT = 6;
var GOAL_INFERENCE_SESSION_LIMIT = 3;
var SAME_SET_BASELINE_LIMIT = 3;
var E1RM_TREND_WINDOW = 3;
var E1RM_NOISE_BAND = .015;
var SAME_LOAD_TOLERANCE_KG = .25;
var REACCLIMATION_HOLD_DAYS = 8;
var REACCLIMATION_REDUCE_ONE_DAYS = 15;
var REACCLIMATION_REDUCE_TWO_DAYS = 28;
var WEIGHT_INCREMENTS_KG = {
	"Barbell": 2.5,
	"EZ Bar": 2.5,
	"Smith Machine": 2.5,
	"Plate Loaded": 2.5,
	"Dumbbell": 5,
	"Machine": 5,
	"Cable": 5,
	"Kettlebell": 4,
	"Bodyweight": 2.5,
	"Other": 2.5
};
var WEIGHT_INCREMENTS_LBS = {
	"Barbell": 5,
	"EZ Bar": 5,
	"Smith Machine": 5,
	"Plate Loaded": 5,
	"Dumbbell": 5,
	"Machine": 5,
	"Cable": 5,
	"Kettlebell": 8,
	"Bodyweight": 5,
	"Other": 5
};
function getWeightIncrement(equipment, unitPreference = "kg") {
	if (unitPreference === "lbs") return toKg(WEIGHT_INCREMENTS_LBS[equipment] ?? 5, "lbs");
	return WEIGHT_INCREMENTS_KG[equipment] ?? 2.5;
}
function calcOrmKg(weightKg, reps) {
	if (!reps || reps <= 0) return 0;
	if (reps === 1) return weightKg;
	return calculateORM(weightKg, reps);
}
function clamp$1(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function roundToIncrement(weightKg, incrementKg) {
	if (!incrementKg || incrementKg <= 0) return Math.round(weightKg * 10) / 10;
	return Math.ceil(weightKg / incrementKg) * incrementKg;
}
function roundToSignedIncrement(weightKg, incrementKg) {
	if (!incrementKg || incrementKg <= 0) return Math.round(weightKg * 10) / 10;
	if (weightKg >= 0) return roundToIncrement(weightKg, incrementKg);
	return -roundToIncrement(Math.abs(weightKg), incrementKg);
}
function createWeightSnapper(equipment, unitPreference, incrementKg) {
	return function snapWeight(weightKg) {
		if (weightKg === null || weightKg === void 0) return null;
		if (PLATE_EQUIPMENT.has(equipment)) return snapToPlates(Math.max(0, weightKg), unitPreference, equipment);
		if (equipment === "Bodyweight") return roundToSignedIncrement(weightKg, incrementKg);
		return roundToIncrement(Math.max(0, weightKg), incrementKg);
	};
}
function formatWeightDisplay(weightKg, unit) {
	if (weightKg === null || weightKg === void 0) return "";
	if (unit === "lbs") return `${Math.round(weightKg * 2.20462)} lbs`;
	return `${Math.round(weightKg * 10) / 10} kg`;
}
function median(values = []) {
	if (!values.length) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[mid];
	return (sorted[mid - 1] + sorted[mid]) / 2;
}
function isFiniteNumber(value) {
	return Number.isFinite(value);
}
function isSameLoad(weightA, weightB) {
	return isFiniteNumber(weightA) && isFiniteNumber(weightB) && Math.abs(weightA - weightB) <= SAME_LOAD_TOLERANCE_KG;
}
function getWorkingSets(sets = []) {
	const validSets = sets.filter((set) => set.reps !== null && set.reps !== void 0);
	const weightedSets = validSets.filter((set) => isFiniteNumber(set.weightKg) && set.weightKg > 0);
	return weightedSets.length > 0 ? weightedSets : validSets;
}
function getFirstWorkingSet(session) {
	return getWorkingSets(session?.sets || [])[0] || null;
}
function getBestSessionOrmKg(session) {
	const workingSets = getWorkingSets(session?.sets || []);
	const best = Math.max(...workingSets.map((set) => Number(set.estimatedOrmKg) || 0), 0);
	return best > 0 ? best : null;
}
function formatObjectiveLabel(objective) {
	if (objective === "strength") return "Strength";
	if (objective === "endurance") return "Endurance";
	return "Hypertrophy";
}
function buildRepRangeFromCenter(centerValue) {
	const roundedCenter = clamp$1(Math.round(centerValue), 1, 100);
	if (roundedCenter <= 6) {
		const lower = clamp$1(roundedCenter - 1, 3, 6);
		const upper = clamp$1(roundedCenter + 1, lower, 6);
		return {
			objective: "strength",
			center: roundedCenter,
			lower,
			upper,
			midpoint: Math.round((lower + upper) / 2),
			lowerHalfTarget: lower
		};
	}
	if (roundedCenter <= 15) {
		const lower = clamp$1(roundedCenter - 2, 6, 15);
		const upper = clamp$1(roundedCenter + 2, lower, 15);
		return {
			objective: "hypertrophy",
			center: roundedCenter,
			lower,
			upper,
			midpoint: Math.round((lower + upper) / 2),
			lowerHalfTarget: clamp$1(Math.floor((lower + upper) / 2), lower, upper)
		};
	}
	const lower = clamp$1(roundedCenter - 3, 12, 20);
	const upper = clamp$1(roundedCenter + 3, lower, 20);
	return {
		objective: "endurance",
		center: roundedCenter,
		lower,
		upper,
		midpoint: Math.round((lower + upper) / 2),
		lowerHalfTarget: clamp$1(Math.floor((lower + upper) / 2), lower, upper)
	};
}
function formatRepRange(repRange) {
	return `${repRange.lower}-${repRange.upper} reps`;
}
function clampRepsToRange(reps, repRange) {
	if (!isFiniteNumber(reps)) return repRange.lower;
	return clamp$1(Math.round(reps), repRange.lower, repRange.upper);
}
function buildFallbackObjectiveProfile(fallbackReps) {
	if (!isFiniteNumber(fallbackReps) || fallbackReps <= 0) return null;
	return {
		...buildRepRangeFromCenter(fallbackReps),
		sampleSize: 1,
		inferredFromCurrentWorkout: true
	};
}
function inferObjectiveProfile(sessions = [], fallbackReps = null) {
	const firstSetReps = sessions.slice(-GOAL_INFERENCE_SESSION_LIMIT).map(getFirstWorkingSet).map((set) => set?.reps).filter((reps) => isFiniteNumber(reps) && reps > 0);
	const center = median(firstSetReps);
	if (!isFiniteNumber(center)) return buildFallbackObjectiveProfile(fallbackReps);
	return {
		...buildRepRangeFromCenter(center),
		sampleSize: firstSetReps.length,
		inferredFromCurrentWorkout: false
	};
}
function getReacclimationTier(daysSinceLast) {
	if (!isFiniteNumber(daysSinceLast)) return "none";
	if (daysSinceLast > REACCLIMATION_REDUCE_TWO_DAYS) return "reduce_two";
	if (daysSinceLast >= REACCLIMATION_REDUCE_ONE_DAYS) return "reduce_one";
	if (daysSinceLast >= REACCLIMATION_HOLD_DAYS) return "hold";
	return "none";
}
function reduceWeightTarget(weightKg, incrementKg, snapWeight, { percent = 0, increments = 0 } = {}) {
	if (!isFiniteNumber(weightKg)) return null;
	const targetDropKg = Math.max(percent > 0 ? weightKg * percent : 0, increments > 0 ? incrementKg * increments : 0);
	const candidates = [];
	if (percent > 0) {
		const percentCandidate = snapWeight(weightKg * (1 - percent));
		if (isFiniteNumber(percentCandidate) && percentCandidate < weightKg - SAME_LOAD_TOLERANCE_KG) candidates.push(percentCandidate);
	}
	if (increments > 0) {
		const incrementCandidate = snapWeight(weightKg - incrementKg * increments);
		if (isFiniteNumber(incrementCandidate) && incrementCandidate < weightKg - SAME_LOAD_TOLERANCE_KG) candidates.push(incrementCandidate);
	}
	if (!candidates.length) {
		const fallback = snapWeight(weightKg - Math.max(incrementKg, targetDropKg || incrementKg));
		return isFiniteNumber(fallback) ? fallback : snapWeight(weightKg);
	}
	return candidates.sort((candidateA, candidateB) => Math.abs(weightKg - candidateA - targetDropKg) - Math.abs(weightKg - candidateB - targetDropKg))[0];
}
function buildSessionSet(record) {
	const unit = record.unit || "kg";
	const weight = record.weight === null || record.weight === void 0 ? null : Number(record.weight);
	const reps = record.reps === null || record.reps === void 0 ? null : Number(record.reps);
	const weightKg = weight === null ? null : toKg(weight, unit);
	const estimatedOrmKg = (record.estimated_1rm === null || record.estimated_1rm === void 0 ? null : toKg(Number(record.estimated_1rm), unit)) ?? (isFiniteNumber(weightKg) && isFiniteNumber(reps) && reps > 0 ? calcOrmKg(weightKg, reps) : null);
	const completedAt = record.completed_at || record.created_at || null;
	const rawRest = record.rest_before_seconds;
	const restBeforeSeconds = rawRest === null || rawRest === void 0 ? null : Math.max(0, Number(rawRest) || 0);
	return {
		weight,
		weightKg,
		reps,
		unit,
		estimated_1rm: record.estimated_1rm === null || record.estimated_1rm === void 0 ? null : Number(record.estimated_1rm),
		estimatedOrmKg,
		duration_seconds: record.duration_seconds === null || record.duration_seconds === void 0 ? null : Number(record.duration_seconds),
		set_number: Number(record.set_number) || 1,
		completed_at: completedAt,
		rest_before_seconds: isFiniteNumber(restBeforeSeconds) ? restBeforeSeconds : null
	};
}
async function fetchRecentSessions(userId, exerciseIds, supabase, currentSessionId = null) {
	if (!exerciseIds.length || !userId) return {};
	let query = supabase.from("workout_sets").select(`
      exercise_id,
      weight,
      reps,
      unit,
      estimated_1rm,
      set_number,
      duration_seconds,
      completed_at,
      rest_before_seconds,
      created_at,
      session_id,
      workout_sessions!inner(started_at)
    `).eq("user_id", userId).in("exercise_id", exerciseIds).order("created_at", { ascending: false }).limit(exerciseIds.length * 80);
	if (currentSessionId) query = query.neq("session_id", currentSessionId);
	const { data, error } = await query;
	if (error || !data?.length) return {};
	const groupedByExercise = {};
	for (const row of data) {
		const exerciseId = row.exercise_id;
		const sessionId = row.session_id;
		if (!groupedByExercise[exerciseId]) groupedByExercise[exerciseId] = /* @__PURE__ */ new Map();
		if (!groupedByExercise[exerciseId].has(sessionId)) groupedByExercise[exerciseId].set(sessionId, {
			sessionId,
			sessionDate: new Date(row.workout_sessions.started_at),
			sets: []
		});
		groupedByExercise[exerciseId].get(sessionId).sets.push(buildSessionSet(row));
	}
	const sessionsByExercise = {};
	for (const exerciseId of Object.keys(groupedByExercise)) {
		const sessions = [...groupedByExercise[exerciseId].values()].sort((sessionA, sessionB) => sessionA.sessionDate - sessionB.sessionDate).slice(-HISTORY_SESSION_LIMIT);
		for (const session of sessions) session.sets.sort((setA, setB) => setA.set_number - setB.set_number);
		sessionsByExercise[exerciseId] = sessions;
	}
	return sessionsByExercise;
}
function getComparableSessions(sessions = []) {
	return sessions.map((session) => ({
		...session,
		sets: (session.sets || []).filter((set) => isFiniteNumber(set.reps) && isFiniteNumber(set.weightKg) && isFiniteNumber(set.estimatedOrmKg)).map((set) => ({
			weightKg: set.weightKg,
			reps: set.reps,
			estimatedOrmKg: set.estimatedOrmKg,
			set_number: set.set_number,
			completed_at: set.completed_at || null,
			rest_before_seconds: isFiniteNumber(set.rest_before_seconds) ? set.rest_before_seconds : null
		}))
	})).filter((session) => getWorkingSets(session.sets).length > 0).slice(-DECISION_SESSION_LIMIT);
}
function evaluateHistoricalSession(session, repRange, incrementKg) {
	const workingSets = getWorkingSets(session?.sets || []);
	const firstSet = workingSets[0] || null;
	if (!firstSet) return {
		session,
		workingSets,
		firstSet: null,
		firstSetWeightKg: null,
		firstSetReps: null,
		success: false,
		firstSetAtCeiling: false,
		laterSetsInRangeCount: 0,
		laterSetsCount: 0,
		loadDropFailed: false,
		bestOrmKg: getBestSessionOrmKg(session)
	};
	const enoughSetsInRange = workingSets.filter((set) => set.reps >= repRange.lower).length >= Math.ceil(workingSets.length * (2 / 3));
	const plannedWeightKg = firstSet.weightKg;
	const loadDropFailed = isFiniteNumber(plannedWeightKg) && workingSets.some((set) => isFiniteNumber(set.weightKg) && set.weightKg < plannedWeightKg - incrementKg - SAME_LOAD_TOLERANCE_KG);
	const laterSets = workingSets.slice(1);
	return {
		session,
		workingSets,
		firstSet,
		firstSetWeightKg: firstSet.weightKg ?? null,
		firstSetReps: firstSet.reps ?? null,
		success: firstSet.reps >= repRange.lower && enoughSetsInRange && !loadDropFailed,
		firstSetAtCeiling: firstSet.reps >= repRange.upper,
		laterSetsInRangeCount: laterSets.filter((set) => set.reps >= repRange.lower).length,
		laterSetsCount: laterSets.length,
		loadDropFailed,
		bestOrmKg: getBestSessionOrmKg(session)
	};
}
function countTrailingFailedEvaluations(evaluations = []) {
	let misses = 0;
	for (let index = evaluations.length - 1; index >= 0; index -= 1) {
		if (evaluations[index]?.success) break;
		misses += 1;
	}
	return misses;
}
function getRollingOrmTrend(evaluations = []) {
	const values = evaluations.map((evaluation) => evaluation.bestOrmKg).filter((value) => isFiniteNumber(value) && value > 0);
	const recent = values.slice(-E1RM_TREND_WINDOW);
	const previous = values.slice(-(E1RM_TREND_WINDOW * 2), -E1RM_TREND_WINDOW);
	const recentMedian = median(recent);
	const previousMedian = median(previous);
	if (!isFiniteNumber(recentMedian) || !isFiniteNumber(previousMedian) || previousMedian <= 0) return {
		direction: "neutral",
		recentMedian,
		previousMedian
	};
	if (recentMedian > previousMedian * (1 + E1RM_NOISE_BAND)) return {
		direction: "positive",
		recentMedian,
		previousMedian
	};
	if (recentMedian < previousMedian * (1 - E1RM_NOISE_BAND)) return {
		direction: "negative",
		recentMedian,
		previousMedian
	};
	return {
		direction: "neutral",
		recentMedian,
		previousMedian
	};
}
function findMostRecentWorkingSet(sessions = []) {
	const latestSession = sessions[sessions.length - 1];
	const workingSets = getWorkingSets(latestSession?.sets || []);
	for (let index = workingSets.length - 1; index >= 0; index -= 1) {
		const set = workingSets[index];
		if (isFiniteNumber(set.reps) && isFiniteNumber(set.weightKg)) return set;
	}
	return null;
}
function findHistoricalSetByIndex(successfulEvaluations = [], setIndex) {
	for (let index = successfulEvaluations.length - 1; index >= 0; index -= 1) {
		const set = successfulEvaluations[index]?.session?.sets?.[setIndex];
		if (set && isFiniteNumber(set.reps) && isFiniteNumber(set.weightKg)) return {
			...set,
			source: "latest_success"
		};
	}
	return null;
}
function findMedianSuccessfulSetByIndex(successfulEvaluations = [], setIndex, snapWeight) {
	const recentSuccessfulSets = successfulEvaluations.slice(-SAME_SET_BASELINE_LIMIT).map((evaluation) => evaluation.session?.sets?.[setIndex]).filter((set) => set && isFiniteNumber(set.reps) && isFiniteNumber(set.weightKg));
	if (!recentSuccessfulSets.length) return null;
	const medianWeight = median(recentSuccessfulSets.map((set) => set.weightKg));
	const medianReps = median(recentSuccessfulSets.map((set) => set.reps));
	if (!isFiniteNumber(medianWeight) || !isFiniteNumber(medianReps)) return null;
	return {
		weightKg: snapWeight(medianWeight),
		reps: Math.round(medianReps),
		source: "median_success"
	};
}
function getHistoricalBaselineSet(successfulEvaluations, sessions, setIndex, snapWeight) {
	const exactMatch = findHistoricalSetByIndex(successfulEvaluations, setIndex);
	if (exactMatch) return exactMatch;
	const medianMatch = findMedianSuccessfulSetByIndex(successfulEvaluations, setIndex, snapWeight);
	if (medianMatch) return medianMatch;
	const recentWorkingSet = findMostRecentWorkingSet(sessions);
	if (recentWorkingSet) return {
		...recentWorkingSet,
		source: "recent_working"
	};
	return null;
}
function getHistoricalMedianRestSeconds(sessions = [], setNumber) {
	return median(sessions.flatMap((session) => session.sets || []).filter((set) => set.set_number === setNumber).map((set) => set.rest_before_seconds).filter((value) => isFiniteNumber(value) && value > 0));
}
function buildAnalysisConfidence(decisionSessions, successfulEvaluations, objectiveProfile) {
	if (!decisionSessions.length || !objectiveProfile) return "low";
	if (decisionSessions.length >= 4 && successfulEvaluations.length >= 2 && objectiveProfile.sampleSize >= 2) return "high";
	if (decisionSessions.length >= 2) return "medium";
	return "low";
}
function analyzeHistoryCore(sessions, equipment, unitPreference, fallbackReps = null) {
	const decisionSessions = getComparableSessions(sessions);
	const objectiveProfile = inferObjectiveProfile(decisionSessions, fallbackReps);
	if (!decisionSessions.length || !objectiveProfile) return null;
	const incrementKg = getWeightIncrement(equipment, unitPreference);
	const snapWeight = createWeightSnapper(equipment, unitPreference, incrementKg);
	const evaluations = decisionSessions.map((session) => evaluateHistoricalSession(session, objectiveProfile, incrementKg));
	const successfulEvaluations = evaluations.filter((evaluation) => evaluation.success);
	const latestEvaluation = evaluations[evaluations.length - 1] || null;
	const firstWorkingSet = getFirstWorkingSet(decisionSessions[decisionSessions.length - 1]);
	const baseBaselineSet = getHistoricalBaselineSet(successfulEvaluations, decisionSessions, 0, snapWeight) || firstWorkingSet;
	const sameLoadSuccessStreak = (() => {
		if (!latestEvaluation?.success || !isFiniteNumber(latestEvaluation.firstSetWeightKg)) return 0;
		const anchorWeight = latestEvaluation.firstSetWeightKg;
		let streak = 0;
		for (let index = evaluations.length - 1; index >= 0; index -= 1) {
			const evaluation = evaluations[index];
			if (!evaluation?.success || !isSameLoad(evaluation.firstSetWeightKg, anchorWeight)) break;
			streak += 1;
		}
		return streak;
	})();
	const ormTrend = getRollingOrmTrend(evaluations);
	const daysSinceLast = latestEvaluation ? (Date.now() - latestEvaluation.session.sessionDate.getTime()) / (1e3 * 60 * 60 * 24) : null;
	const trailingMisses = countTrailingFailedEvaluations(evaluations);
	const confidence = buildAnalysisConfidence(decisionSessions, successfulEvaluations, objectiveProfile);
	const workingSetWeights = decisionSessions.flatMap((session) => getWorkingSets(session.sets)).map((set) => set.weightKg).filter(isFiniteNumber);
	return {
		decisionSessions,
		objectiveProfile,
		incrementKg,
		snapWeight,
		unitPreference,
		evaluations,
		successfulEvaluations,
		latestEvaluation,
		baseBaselineSet,
		sameLoadSuccessStreak,
		ormTrend,
		daysSinceLast,
		trailingMisses,
		confidence,
		isBodyweightOnly: equipment === "Bodyweight" && workingSetWeights.length > 0 && workingSetWeights.every((weightKg) => Math.abs(weightKg) < SAME_LOAD_TOLERANCE_KG),
		objectiveLabel: formatObjectiveLabel(objectiveProfile.objective),
		repRangeText: formatRepRange(objectiveProfile)
	};
}
function buildMaintainReason(analysis, message) {
	return `${analysis.objectiveLabel} focus (${analysis.repRangeText}) — ${message}`;
}
function buildHighLevelSuggestionFromAnalysis(analysis) {
	if (!analysis?.baseBaselineSet) return {
		action: "first_time",
		suggestedWeightKg: null,
		suggestedReps: null,
		reasoning: "",
		confidence: "low",
		objective: analysis?.objectiveProfile?.objective || null,
		repRange: analysis?.objectiveProfile || null,
		planMode: "none",
		objectiveLabel: analysis?.objectiveLabel || "Strength",
		repRangeText: analysis?.repRangeText || "",
		isBodyweightOnly: false
	};
	const { baseBaselineSet, confidence, daysSinceLast, incrementKg, isBodyweightOnly, latestEvaluation, objectiveLabel, objectiveProfile, ormTrend, repRangeText, sameLoadSuccessStreak, snapWeight, trailingMisses } = analysis;
	const baseWeightKg = baseBaselineSet.weightKg ?? latestEvaluation?.firstSetWeightKg ?? null;
	const baseReps = clampRepsToRange(baseBaselineSet.reps ?? latestEvaluation?.firstSetReps ?? objectiveProfile.center, objectiveProfile);
	const lowerHalfTarget = objectiveProfile.lowerHalfTarget;
	const reacclimationTier = getReacclimationTier(daysSinceLast);
	const trendIsNegative = ormTrend.direction === "negative";
	const trendIsPositive = ormTrend.direction === "positive";
	const loadDisplay = formatWeightDisplay(baseWeightKg, analysis.unitPreference);
	const latestFailedHard = latestEvaluation?.loadDropFailed || (latestEvaluation?.firstSetReps ?? objectiveProfile.lower) < objectiveProfile.lower;
	if (isBodyweightOnly) {
		if (trailingMisses >= 3) return {
			action: "deload",
			suggestedWeightKg: null,
			suggestedReps: lowerHalfTarget,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — three recent misses suggest a short recovery week, so work near the bottom of the range before pushing reps again.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "recovery_week",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		if (reacclimationTier === "reduce_two") return {
			action: "maintain",
			suggestedWeightKg: null,
			suggestedReps: lowerHalfTarget,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — it has been more than 4 weeks, so reacclimate at the lower half of the range first.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "reacclimate_reduce_two",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		if (reacclimationTier === "reduce_one") return {
			action: "maintain",
			suggestedWeightKg: null,
			suggestedReps: lowerHalfTarget,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — after more than 2 weeks away, start back in the lower half of the range and rebuild from there.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "reacclimate_reduce_one",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		if (reacclimationTier === "hold") return {
			action: "maintain",
			suggestedWeightKg: null,
			suggestedReps: baseReps,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — after a short layoff, repeat your last successful target before progressing upward.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "reacclimate_hold",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		if (!latestEvaluation?.success) return {
			action: "maintain",
			suggestedWeightKg: null,
			suggestedReps: trailingMisses >= 2 ? lowerHalfTarget : baseReps,
			reasoning: buildMaintainReason(analysis, trailingMisses >= 2 ? "the last 2 sessions fell short, so stay conservative and rebuild from the lower half of the range." : "last session fell short of the range, so repeat the target before pushing higher reps."),
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: trailingMisses >= 2 ? "conservative_reduce" : "maintain",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		if (sameLoadSuccessStreak >= 2 && latestEvaluation.firstSetAtCeiling) return {
			action: "increase_reps",
			suggestedWeightKg: null,
			suggestedReps: baseReps + 1,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — you have hit the top of the range for 2 sessions, so add a rep and keep the pattern moving forward.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_reps",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		if (latestEvaluation.firstSetReps < objectiveProfile.upper) return {
			action: "increase_reps",
			suggestedWeightKg: null,
			suggestedReps: Math.min(objectiveProfile.upper, baseReps + 1),
			reasoning: `${objectiveLabel} focus (${repRangeText}) — stay within the range and add a rep before pushing beyond it.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_reps",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
		return {
			action: "maintain",
			suggestedWeightKg: null,
			suggestedReps: baseReps,
			reasoning: buildMaintainReason(analysis, "repeat the current target and keep accumulating high-quality reps."),
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "maintain",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: true
		};
	}
	if (trailingMisses >= 3) return {
		action: "deload",
		suggestedWeightKg: reduceWeightTarget(baseWeightKg, incrementKg, snapWeight, {
			percent: .0625,
			increments: 1
		}),
		suggestedReps: lowerHalfTarget,
		reasoning: `${objectiveLabel} focus (${repRangeText}) — three consecutive misses call for a short recovery week, so reduce the load slightly and work in the lower half of the range.`,
		confidence,
		objective: objectiveProfile.objective,
		repRange: objectiveProfile,
		planMode: "recovery_week",
		objectiveLabel,
		repRangeText,
		isBodyweightOnly: false
	};
	if (reacclimationTier === "reduce_two") return {
		action: "maintain",
		suggestedWeightKg: reduceWeightTarget(baseWeightKg, incrementKg, snapWeight, {
			percent: .075,
			increments: 2
		}),
		suggestedReps: lowerHalfTarget,
		reasoning: `${objectiveLabel} focus (${repRangeText}) — it has been more than 4 weeks, so ease back in with a lighter opener and the lower half of the range.`,
		confidence,
		objective: objectiveProfile.objective,
		repRange: objectiveProfile,
		planMode: "reacclimate_reduce_two",
		objectiveLabel,
		repRangeText,
		isBodyweightOnly: false
	};
	if (reacclimationTier === "reduce_one") return {
		action: "maintain",
		suggestedWeightKg: reduceWeightTarget(baseWeightKg, incrementKg, snapWeight, {
			percent: .05,
			increments: 1
		}),
		suggestedReps: lowerHalfTarget,
		reasoning: `${objectiveLabel} focus (${repRangeText}) — after more than 2 weeks away, start one step lighter and rebuild from the lower half of the range.`,
		confidence,
		objective: objectiveProfile.objective,
		repRange: objectiveProfile,
		planMode: "reacclimate_reduce_one",
		objectiveLabel,
		repRangeText,
		isBodyweightOnly: false
	};
	if (!latestEvaluation?.success) {
		if (latestFailedHard || trailingMisses >= 2) return {
			action: "maintain",
			suggestedWeightKg: reduceWeightTarget(baseWeightKg, incrementKg, snapWeight, { increments: 1 }),
			suggestedReps: lowerHalfTarget,
			reasoning: buildMaintainReason(analysis, trailingMisses >= 2 ? "the last 2 sessions fell short, so back off one increment and rebuild from the lower half of the range." : `last session dropped below the range, so repeat it more conservatively at ${loadDisplay}.`),
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "conservative_reduce",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
		return {
			action: "maintain",
			suggestedWeightKg: snapWeight(baseWeightKg),
			suggestedReps: clamp$1(baseReps, objectiveProfile.lower, objectiveProfile.upper),
			reasoning: buildMaintainReason(analysis, "repeat your last successful target and rebuild consistency before progressing upward."),
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "maintain",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
	}
	if (reacclimationTier === "hold") return {
		action: "maintain",
		suggestedWeightKg: snapWeight(baseWeightKg),
		suggestedReps: baseReps,
		reasoning: `${objectiveLabel} focus (${repRangeText}) — after a short break, match your last successful target before progressing upward again.`,
		confidence,
		objective: objectiveProfile.objective,
		repRange: objectiveProfile,
		planMode: "reacclimate_hold",
		objectiveLabel,
		repRangeText,
		isBodyweightOnly: false
	};
	if (objectiveProfile.objective === "strength") {
		if (sameLoadSuccessStreak >= 2 && latestEvaluation.firstSetAtCeiling && !trendIsNegative) return {
			action: "increase_weight",
			suggestedWeightKg: snapWeight(baseWeightKg + incrementKg),
			suggestedReps: objectiveProfile.lower,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — you have hit the top of the range for 2 same-load sessions, so add one increment and reset to the low end of the range.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_weight",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
		if (latestEvaluation.firstSetReps < objectiveProfile.upper) return {
			action: "increase_reps",
			suggestedWeightKg: snapWeight(baseWeightKg),
			suggestedReps: Math.min(objectiveProfile.upper, baseReps + 1),
			reasoning: `${objectiveLabel} focus (${repRangeText}) — stay at the same load and climb toward the top of the range before adding weight.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_reps",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
	}
	if (objectiveProfile.objective === "hypertrophy") {
		const laterSetsStable = latestEvaluation.laterSetsCount === 0 || latestEvaluation.laterSetsInRangeCount >= Math.ceil(latestEvaluation.laterSetsCount / 2);
		if (sameLoadSuccessStreak >= 2 && latestEvaluation.firstSetAtCeiling && laterSetsStable && !trendIsNegative) return {
			action: "increase_weight",
			suggestedWeightKg: snapWeight(baseWeightKg + incrementKg),
			suggestedReps: objectiveProfile.lowerHalfTarget,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — your last 2 same-load sessions reached the top of the range with enough later-set quality, so add one increment and work from the lower half of the range.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_weight",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
		if (latestEvaluation.firstSetReps < objectiveProfile.upper) return {
			action: "increase_reps",
			suggestedWeightKg: snapWeight(baseWeightKg),
			suggestedReps: Math.min(objectiveProfile.upper, baseReps + 1),
			reasoning: `${objectiveLabel} focus (${repRangeText}) — add a rep within the range before bumping the load.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_reps",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
	}
	if (objectiveProfile.objective === "endurance") {
		if (sameLoadSuccessStreak >= 2 && latestEvaluation.firstSetAtCeiling && !trendIsNegative) return {
			action: "increase_weight",
			suggestedWeightKg: snapWeight(baseWeightKg + incrementKg),
			suggestedReps: objectiveProfile.midpoint,
			reasoning: `${objectiveLabel} focus (${repRangeText}) — you have stayed at the top of the range for 2 same-load sessions, so add one increment and move back toward the middle of the range.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_weight",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
		if (latestEvaluation.firstSetReps < objectiveProfile.upper) return {
			action: "increase_reps",
			suggestedWeightKg: snapWeight(baseWeightKg),
			suggestedReps: Math.min(objectiveProfile.upper, baseReps + 1),
			reasoning: `${objectiveLabel} focus (${repRangeText}) — keep building reps before progressing the load.`,
			confidence,
			objective: objectiveProfile.objective,
			repRange: objectiveProfile,
			planMode: "increase_reps",
			objectiveLabel,
			repRangeText,
			isBodyweightOnly: false
		};
	}
	return {
		action: "maintain",
		suggestedWeightKg: snapWeight(baseWeightKg),
		suggestedReps: baseReps,
		reasoning: buildMaintainReason(analysis, trendIsPositive ? "hold the current target and confirm it again before progressing upward." : "repeat the current target and keep the quality of your sets high."),
		confidence,
		objective: objectiveProfile.objective,
		repRange: objectiveProfile,
		planMode: "maintain",
		objectiveLabel,
		repRangeText,
		isBodyweightOnly: false
	};
}
function parseLoggedStrengthSet(set, unitPreference) {
	const parsedReps = Number.parseInt(set?.reps, 10);
	const reps = Number.isFinite(parsedReps) ? parsedReps : null;
	const parsedWeight = set?.weight !== "" && set?.weight !== null && set?.weight !== void 0 ? Number.parseFloat(set.weight) : null;
	const weightKg = parsedWeight === null || !Number.isFinite(parsedWeight) ? null : toKg(parsedWeight, unitPreference);
	const rawRest = set?.restBeforeSeconds ?? set?.rest_before_seconds;
	const restBeforeSeconds = rawRest === null || rawRest === void 0 ? null : Math.max(0, Number(rawRest) || 0);
	return {
		reps,
		weightKg,
		restBeforeSeconds: isFiniteNumber(restBeforeSeconds) ? restBeforeSeconds : null,
		completedAt: set?.completedAt || set?.completed_at || null
	};
}
function buildCurrentWorkoutObjectiveProfile(currentSets, activeSetIndex) {
	const fallbackReps = [...currentSets.slice(0, activeSetIndex).map((set) => Number.parseInt(set?.reps, 10)), Number.parseInt(currentSets[activeSetIndex]?.reps, 10)].filter((reps) => Number.isFinite(reps) && reps > 0)[0];
	return buildFallbackObjectiveProfile(fallbackReps);
}
function buildCurrentSessionFallbackSuggestion(currentSets, equipment, unitPreference = "kg") {
	const activeSetIndex = currentSets.findIndex((set) => !set.done);
	if (activeSetIndex === -1) return null;
	const objectiveProfile = buildCurrentWorkoutObjectiveProfile(currentSets, activeSetIndex);
	if (!objectiveProfile) return null;
	const objectiveLabel = formatObjectiveLabel(objectiveProfile.objective);
	const repRangeText = formatRepRange(objectiveProfile);
	const activeSet = parseLoggedStrengthSet(currentSets[activeSetIndex], unitPreference);
	const previousCompleted = activeSetIndex > 0 ? parseLoggedStrengthSet(currentSets[activeSetIndex - 1], unitPreference) : null;
	const baseline = activeSetIndex === 0 ? activeSet : previousCompleted;
	if (!baseline || !isFiniteNumber(baseline.reps)) return null;
	const isBodyweightOnly = equipment === "Bodyweight" && (!isFiniteNumber(baseline.weightKg) || Math.abs(baseline.weightKg) < SAME_LOAD_TOLERANCE_KG);
	return {
		activeSetIndex,
		action: "maintain",
		suggestedWeightKg: isBodyweightOnly ? 0 : isFiniteNumber(baseline.weightKg) ? baseline.weightKg : null,
		suggestedReps: clampRepsToRange(baseline.reps, objectiveProfile),
		reasoning: `${objectiveLabel} focus (${repRangeText}) — no comparable history yet, so use your current workout baseline and adjust from there.`,
		confidence: "low",
		isBodyweightOnly
	};
}
function chooseBackedOffWeight(plannedWeightKg, actualWeightKg, incrementKg, snapWeight) {
	if (!isFiniteNumber(plannedWeightKg)) return null;
	let candidate = snapWeight(plannedWeightKg - incrementKg);
	if (isFiniteNumber(actualWeightKg) && actualWeightKg < candidate - SAME_LOAD_TOLERANCE_KG) candidate = snapWeight(actualWeightKg);
	if (!isFiniteNumber(candidate) || candidate >= plannedWeightKg - SAME_LOAD_TOLERANCE_KG) {
		const actualCandidate = isFiniteNumber(actualWeightKg) ? snapWeight(actualWeightKg) : null;
		if (isFiniteNumber(actualCandidate) && actualCandidate < plannedWeightKg - SAME_LOAD_TOLERANCE_KG) return actualCandidate;
	}
	return candidate;
}
function classifyFatigueLevel({ objectiveProfile, previousActual, previousPlanned, incrementKg }) {
	const actualReps = previousActual?.reps;
	if (!isFiniteNumber(actualReps)) return "none";
	const plannedReps = isFiniteNumber(previousPlanned?.reps) ? previousPlanned.reps : objectiveProfile.upper;
	const plannedWeightKg = previousPlanned?.weightKg;
	const actualWeightKg = previousActual?.weightKg;
	const weightDroppedLarge = isFiniteNumber(plannedWeightKg) && isFiniteNumber(actualWeightKg) && actualWeightKg < plannedWeightKg - incrementKg - SAME_LOAD_TOLERANCE_KG;
	if (objectiveProfile.objective === "strength") return weightDroppedLarge || actualReps <= objectiveProfile.lower - 1 ? "medium" : "none";
	if (objectiveProfile.objective === "hypertrophy") {
		if (weightDroppedLarge || actualReps <= Math.floor(plannedReps * .8)) return "medium";
		if (actualReps <= objectiveProfile.lower + 1) return "light";
		return "none";
	}
	if (weightDroppedLarge) return "medium";
	if (actualReps < objectiveProfile.midpoint) return "medium";
	if (actualReps < plannedReps) return "light";
	return "none";
}
function softenFatigueLevel(level) {
	if (level === "medium") return "light";
	if (level === "light") return "none";
	return "none";
}
function applyFatigueAdjustment({ plannedSet, previousActual, previousPlanned, objectiveProfile, incrementKg, snapWeight, historicalMedianRestSeconds }) {
	if (!plannedSet) return null;
	const rawLevel = classifyFatigueLevel({
		objectiveProfile,
		previousActual,
		previousPlanned,
		incrementKg
	});
	const shouldSoften = rawLevel !== "none" && isFiniteNumber(previousActual?.restBeforeSeconds) && isFiniteNumber(historicalMedianRestSeconds) && previousActual.restBeforeSeconds < historicalMedianRestSeconds * .8;
	const fatigueLevel = shouldSoften ? softenFatigueLevel(rawLevel) : rawLevel;
	if (fatigueLevel === "none") return {
		...plannedSet,
		fatigueAdjustment: "none",
		softenedForRest: shouldSoften
	};
	if (objectiveProfile.objective === "strength") {
		if (fatigueLevel === "light") return {
			...plannedSet,
			action: "maintain",
			reps: objectiveProfile.lower,
			fatigueAdjustment: "range_floor",
			softenedForRest: shouldSoften
		};
		return {
			...plannedSet,
			action: "maintain",
			weightKg: chooseBackedOffWeight(plannedSet.weightKg, previousActual?.weightKg, incrementKg, snapWeight),
			reps: objectiveProfile.lower,
			fatigueAdjustment: "weight_down",
			softenedForRest: shouldSoften
		};
	}
	if (objectiveProfile.objective === "hypertrophy") {
		if (fatigueLevel === "light") return {
			...plannedSet,
			action: "maintain",
			reps: Math.max(objectiveProfile.lower, (plannedSet.reps ?? objectiveProfile.lower) - 1),
			fatigueAdjustment: "reps_down",
			softenedForRest: shouldSoften
		};
		return {
			...plannedSet,
			action: "maintain",
			weightKg: chooseBackedOffWeight(plannedSet.weightKg, previousActual?.weightKg, incrementKg, snapWeight),
			reps: objectiveProfile.lowerHalfTarget,
			fatigueAdjustment: "weight_down",
			softenedForRest: shouldSoften
		};
	}
	if (fatigueLevel === "light") return {
		...plannedSet,
		action: "maintain",
		reps: Math.max(objectiveProfile.midpoint, (plannedSet.reps ?? objectiveProfile.midpoint) - 1),
		fatigueAdjustment: "reps_mid",
		softenedForRest: shouldSoften
	};
	return {
		...plannedSet,
		action: "maintain",
		weightKg: isFiniteNumber(previousActual?.weightKg) && previousActual.weightKg < (plannedSet.weightKg ?? Infinity) ? previousActual.weightKg : plannedSet.weightKg,
		reps: objectiveProfile.midpoint,
		fatigueAdjustment: "reps_mid",
		softenedForRest: shouldSoften
	};
}
function applyHighLevelPlanToBaseline({ baselineSet, highLevelSuggestion, objectiveProfile, incrementKg, snapWeight }) {
	if (!baselineSet) return null;
	let weightKg = isFiniteNumber(baselineSet.weightKg) ? baselineSet.weightKg : null;
	let reps = clampRepsToRange(baselineSet.reps ?? objectiveProfile.center, objectiveProfile);
	switch (highLevelSuggestion.planMode) {
		case "increase_weight":
			if (isFiniteNumber(weightKg)) weightKg = snapWeight(weightKg + incrementKg);
			reps = highLevelSuggestion.suggestedReps ?? objectiveProfile.lowerHalfTarget;
			break;
		case "increase_reps":
			reps = Math.min(objectiveProfile.upper, reps + 1);
			break;
		case "recovery_week":
			if (isFiniteNumber(weightKg)) weightKg = reduceWeightTarget(weightKg, incrementKg, snapWeight, {
				percent: .0625,
				increments: 1
			});
			reps = objectiveProfile.lowerHalfTarget;
			break;
		case "reacclimate_reduce_two":
			if (isFiniteNumber(weightKg)) weightKg = reduceWeightTarget(weightKg, incrementKg, snapWeight, {
				percent: .075,
				increments: 2
			});
			reps = objectiveProfile.lowerHalfTarget;
			break;
		case "reacclimate_reduce_one":
		case "conservative_reduce":
			if (isFiniteNumber(weightKg)) weightKg = reduceWeightTarget(weightKg, incrementKg, snapWeight, {
				percent: .05,
				increments: 1
			});
			reps = objectiveProfile.lowerHalfTarget;
			break;
		default: break;
	}
	return {
		action: highLevelSuggestion.action,
		weightKg,
		reps,
		source: baselineSet.source || "recent_working"
	};
}
function buildSetBaseline({ setIndex, analysis, highLevelSuggestion }) {
	const historicalBaseline = getHistoricalBaselineSet(analysis.successfulEvaluations, analysis.decisionSessions, setIndex, analysis.snapWeight);
	if (!historicalBaseline && setIndex > 0) return null;
	const baseline = historicalBaseline || analysis.baseBaselineSet;
	const plannedSet = setIndex === 0 ? {
		action: highLevelSuggestion.action,
		weightKg: highLevelSuggestion.suggestedWeightKg,
		reps: highLevelSuggestion.suggestedReps,
		source: baseline?.source || "recent_working"
	} : applyHighLevelPlanToBaseline({
		baselineSet: baseline,
		highLevelSuggestion,
		objectiveProfile: analysis.objectiveProfile,
		incrementKg: analysis.incrementKg,
		snapWeight: analysis.snapWeight
	});
	if (!plannedSet) return null;
	return {
		...plannedSet,
		usedFallback: baseline?.source === "median_success" || baseline?.source === "recent_working"
	};
}
function buildCurrentSetReason({ activeSetIndex, highLevelSuggestion, fatigueAdjustment, usedFallback, softenedForRest }) {
	const prefix = `${highLevelSuggestion.objectiveLabel} focus (${highLevelSuggestion.repRangeText}) — `;
	const setNumber = activeSetIndex + 1;
	const previousSetNumber = activeSetIndex;
	const fallbackNote = usedFallback ? ` This set uses your recent successful history as the baseline because there was no exact prior Set ${setNumber}.` : "";
	const restNote = softenedForRest ? ` Your previous rest was shorter than usual, so the adjustment stays one step more conservative.` : "";
	if (activeSetIndex === 0) return `${highLevelSuggestion.reasoning}${fallbackNote}`;
	if (fatigueAdjustment === "range_floor") return `${prefix}Set ${previousSetNumber} landed just under the planned range, so keep Set ${setNumber} at the low end of the range.${fallbackNote}${restNote}`;
	if (fatigueAdjustment === "reps_down") return `${prefix}Set ${previousSetNumber} came in near the bottom of the range, so keep the load and trim Set ${setNumber} by 1 rep.${fallbackNote}${restNote}`;
	if (fatigueAdjustment === "weight_down") return `${prefix}Set ${previousSetNumber} fell short, so back off 1 increment and work at the lower end of the range for Set ${setNumber}.${fallbackNote}${restNote}`;
	if (fatigueAdjustment === "reps_mid") return `${prefix}Set ${previousSetNumber} faded, so bring Set ${setNumber} back toward the middle of the range.${fallbackNote}${restNote}`;
	return `${prefix}Set ${previousSetNumber} stayed on plan, so keep Set ${setNumber} at the planned target.${fallbackNote}`;
}
function buildCurrentSetSuggestion({ sessions = [], currentSets = [], equipment, unitPreference = "kg" }) {
	if (!currentSets.length) return null;
	const activeSetIndex = currentSets.findIndex((set) => !set.done);
	if (activeSetIndex === -1) return null;
	const analysis = analyzeHistoryCore(sessions, equipment, unitPreference);
	if (!analysis) return buildCurrentSessionFallbackSuggestion(currentSets, equipment, unitPreference);
	const highLevelSuggestion = buildHighLevelSuggestionFromAnalysis(analysis);
	if (highLevelSuggestion.action === "first_time") return buildCurrentSessionFallbackSuggestion(currentSets, equipment, unitPreference);
	let previousPlanned = null;
	for (let setIndex = 0; setIndex <= activeSetIndex; setIndex += 1) {
		const baselinePlan = buildSetBaseline({
			setIndex,
			analysis,
			highLevelSuggestion
		});
		if (!baselinePlan) return buildCurrentSessionFallbackSuggestion(currentSets, equipment, unitPreference);
		let plannedSet = baselinePlan;
		if (setIndex > 0) {
			const previousActual = parseLoggedStrengthSet(currentSets[setIndex - 1], unitPreference);
			const historicalMedianRestSeconds = getHistoricalMedianRestSeconds(analysis.decisionSessions, setIndex);
			plannedSet = applyFatigueAdjustment({
				plannedSet: baselinePlan,
				previousActual,
				previousPlanned,
				objectiveProfile: analysis.objectiveProfile,
				incrementKg: analysis.incrementKg,
				snapWeight: analysis.snapWeight,
				historicalMedianRestSeconds
			});
		} else plannedSet = {
			...baselinePlan,
			fatigueAdjustment: "none",
			softenedForRest: false
		};
		previousPlanned = plannedSet;
		if (setIndex === activeSetIndex) {
			const isBodyweightOnly = highLevelSuggestion.isBodyweightOnly && (!isFiniteNumber(plannedSet.weightKg) || Math.abs(plannedSet.weightKg) < SAME_LOAD_TOLERANCE_KG);
			return {
				activeSetIndex,
				action: plannedSet.action,
				suggestedWeightKg: isBodyweightOnly ? 0 : plannedSet.weightKg,
				suggestedReps: plannedSet.reps,
				reasoning: buildCurrentSetReason({
					activeSetIndex,
					highLevelSuggestion,
					fatigueAdjustment: plannedSet.fatigueAdjustment,
					usedFallback: plannedSet.usedFallback,
					softenedForRest: plannedSet.softenedForRest
				}),
				confidence: highLevelSuggestion.confidence,
				isBodyweightOnly
			};
		}
	}
	return null;
}
//#endregion
//#region src/lib/exerciseOptions.js
var SUPPORTED_MUSCLES = [
	"Chest",
	"Upper Chest",
	"Lower Chest",
	"Triceps",
	"Front Delts",
	"Lateral Delts",
	"Rear Delts",
	"Shoulders",
	"Quads",
	"Glutes",
	"Hamstrings",
	"Core",
	"Abs",
	"Obliques",
	"Lower Back",
	"Traps",
	"Lats",
	"Upper Back",
	"Biceps",
	"Forearms",
	"Calves",
	"Shins",
	"Adductors",
	"Abductors",
	"Hip Flexors",
	"Neck",
	"Rhomboids"
];
var CUSTOM_EQUIPMENT_OPTIONS = [
	"Bodyweight",
	"Barbell",
	"EZ Bar",
	"Dumbbell",
	"Cable",
	"Machine",
	"Smith Machine",
	"Kettlebell",
	"Plate Loaded",
	"Other"
];
//#endregion
//#region src/lib/calorieMath.js
var FALLBACK_CARDIO_MET = 6;
/**
* Estimate calories burned for a workout session.
*
* @param {Array} exercises - Array of exercise objects:
*   { name, isCardio, primary_muscles, secondary_muscles, sets }
*   Cardio sets must have { durationSeconds: number }.
*   Strength sets only need to exist (count is used for MET weighting).
* @param {number} durationSeconds - Total workout duration in seconds
* @param {number} bodyweightKg - User body weight in kg
* @returns {number} Estimated kcal burned (rounded integer, minimum 0)
*/
function estimateCaloriesBurned(exercises, durationSeconds, bodyweightKg) {
	const bw = Number.isFinite(bodyweightKg) && bodyweightKg > 0 ? bodyweightKg : DEFAULT_BODYWEIGHT_KG;
	const cardioExs = exercises.filter((ex) => ex.isCardio);
	const strengthExs = exercises.filter((ex) => !ex.isCardio);
	let burned = 0;
	let cardioDurationSec = 0;
	for (const ex of cardioExs) {
		const met = CARDIO_MET[ex.name] ?? FALLBACK_CARDIO_MET;
		for (const set of ex.sets) {
			const dur = set.durationSeconds || 0;
			burned += met * bw * (dur / 3600);
			cardioDurationSec += dur;
		}
	}
	if (strengthExs.length > 0) {
		const strengthDur = Math.max(0, durationSeconds - cardioDurationSec);
		let totalSets = 0;
		let weightedMET = 0;
		for (const ex of strengthExs) {
			const setCount = Math.max(1, ex.sets.length);
			const met = getMuscleCountMET(ex);
			weightedMET += met * setCount;
			totalSets += setCount;
		}
		const avgMET = totalSets > 0 ? weightedMET / totalSets : 4.5;
		burned += avgMET * bw * (strengthDur / 3600);
	}
	return Math.max(0, Math.round(burned));
}
//#endregion
//#region src/lib/localDraftSanitizers.js
var MAX_DRAFT_EXERCISES = 100;
var MAX_DRAFT_SETS_PER_EXERCISE = 100;
var MAX_DRAFT_NOTE_ENTRIES = 80;
var MAX_TEMPLATE_IDS = 100;
var MAX_ID_LENGTH = 120;
function finiteNumber(value, fallback = 0) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function safeString(value, maxLength = MAX_ID_LENGTH) {
	return trimToMax(String(value ?? ""), maxLength);
}
function isPlainObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sanitizeTimestamp(value, fallback = Date.now()) {
	const numeric = finiteNumber(value, fallback);
	const now = Date.now();
	return clamp(numeric, now - 10080 * 60 * 1e3, now + 3600 * 1e3);
}
function sanitizeStrengthSet(set = {}) {
	const repsText = String(set.reps ?? "");
	const parsedReps = Number.parseInt(repsText, 10);
	const weightText = String(set.weight ?? "");
	const parsedRest = set.restBeforeSeconds ?? set.rest_before_seconds;
	const restNumber = parsedRest === null || parsedRest === void 0 ? null : finiteNumber(parsedRest, null);
	return {
		reps: Number.isInteger(parsedReps) && parsedReps >= 1 && parsedReps <= 9999 ? String(parsedReps) : "",
		weight: weightText.length <= 16 ? weightText : "",
		done: Boolean(set.done),
		completedAt: set.completedAt || set.completed_at || null,
		restBeforeSeconds: restNumber === null ? null : clamp(Math.round(restNumber), VALIDATION_LIMITS.restSecondsMin, VALIDATION_LIMITS.restSecondsMax)
	};
}
function sanitizeCardioSet(set = {}) {
	return {
		duration: clamp(Math.round(finiteNumber(set.duration ?? set.durationSeconds ?? set.duration_seconds, 0)), 0, VALIDATION_LIMITS.cardioDurationMaxSeconds),
		done: Boolean(set.done),
		completedAt: set.completedAt || set.completed_at || null
	};
}
function sanitizeWorkoutExercise(exercise = {}) {
	const category = safeString(exercise.category, 80);
	const isCardio = category === "Cardio";
	const sets = Array.isArray(exercise.sets) ? exercise.sets.slice(0, MAX_DRAFT_SETS_PER_EXERCISE) : [];
	const sanitizedSets = sets.length ? sets.map((set) => isCardio ? sanitizeCardioSet(set) : sanitizeStrengthSet(set)) : [isCardio ? sanitizeCardioSet() : sanitizeStrengthSet()];
	return {
		id: exercise.id === null || exercise.id === void 0 ? null : safeString(exercise.id, MAX_ID_LENGTH),
		name: safeString(exercise.name, VALIDATION_LIMITS.customExerciseNameMaxLength),
		category,
		equipment: safeString(exercise.equipment, 80),
		unit: exercise.unit === "lbs" ? "lbs" : "kg",
		restSeconds: clamp(Math.round(finiteNumber(exercise.restSeconds ?? exercise.default_rest_seconds, 90)), VALIDATION_LIMITS.restSecondsMin, VALIDATION_LIMITS.restSecondsMax),
		primary_muscles: Array.isArray(exercise.primary_muscles) ? exercise.primary_muscles.slice(0, 20).map((muscle) => safeString(muscle, 80)).filter(Boolean) : [],
		secondary_muscles: Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles.slice(0, 20).map((muscle) => safeString(muscle, 80)).filter(Boolean) : [],
		sets: sanitizedSets
	};
}
function sanitizeExerciseNotes(notes) {
	if (!isPlainObject(notes)) return {};
	const entries = Object.entries(notes).slice(0, MAX_DRAFT_NOTE_ENTRIES);
	return Object.fromEntries(entries.map(([key, value]) => [safeString(key, MAX_ID_LENGTH), safeString(value, VALIDATION_LIMITS.exerciseNoteMaxLength)]).filter(([key]) => Boolean(key)));
}
function sanitizeNotesOpen(notesOpen) {
	if (!isPlainObject(notesOpen)) return {};
	const entries = Object.entries(notesOpen).slice(0, MAX_DRAFT_NOTE_ENTRIES);
	return Object.fromEntries(entries.map(([key, value]) => [safeString(key, MAX_ID_LENGTH), Boolean(value)]).filter(([key]) => Boolean(key)));
}
function sanitizeRestTimer(restTimer) {
	if (!isPlainObject(restTimer)) return null;
	const endTime = finiteNumber(restTimer.endTime, 0);
	if (!endTime || endTime <= Date.now()) return null;
	return {
		endTime,
		total: clamp(Math.round(finiteNumber(restTimer.total, VALIDATION_LIMITS.restSecondsMax)), VALIDATION_LIMITS.restSecondsMin, VALIDATION_LIMITS.restSecondsMax),
		exerciseName: safeString(restTimer.exerciseName, VALIDATION_LIMITS.customExerciseNameMaxLength),
		completed: Boolean(restTimer.completed)
	};
}
function sanitizeWorkoutDraft(rawDraft, expectedVersion) {
	if (!isPlainObject(rawDraft) || rawDraft.version !== expectedVersion) return null;
	const workoutExercises = Array.isArray(rawDraft.workoutExercises) ? rawDraft.workoutExercises.slice(0, MAX_DRAFT_EXERCISES).map(sanitizeWorkoutExercise) : [];
	return {
		version: expectedVersion,
		savedAt: sanitizeTimestamp(rawDraft.savedAt),
		sessionId: rawDraft.sessionId ? safeString(rawDraft.sessionId, MAX_ID_LENGTH) : null,
		startedAt: sanitizeTimestamp(rawDraft.startedAt),
		workoutExercises,
		exerciseNotes: sanitizeExerciseNotes(rawDraft.exerciseNotes),
		notesOpen: sanitizeNotesOpen(rawDraft.notesOpen),
		restTimer: sanitizeRestTimer(rawDraft.restTimer),
		defaultUnit: rawDraft.defaultUnit === "lbs" ? "lbs" : "kg",
		defaultRest: clamp(Math.round(finiteNumber(rawDraft.defaultRest, 90)), VALIDATION_LIMITS.restSecondsMin, VALIDATION_LIMITS.restSecondsMax),
		roomId: rawDraft.roomId ? safeString(rawDraft.roomId, MAX_ID_LENGTH) : void 0
	};
}
function sanitizeHiddenTemplateIds(value, validIds = []) {
	const validIdSet = new Set(validIds.map((id) => String(id)));
	if (!Array.isArray(value)) return [];
	return [...new Set(value.slice(0, MAX_TEMPLATE_IDS).map((id) => safeString(id, MAX_ID_LENGTH)).filter((id) => validIdSet.size === 0 || validIdSet.has(id)))];
}
//#endregion
//#region src/components/Workout.jsx
var ExerciseDetail = (0, import_react.lazy)(() => __vitePreload(() => import("./ExerciseDetail-bpYIGxwe.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13])));
var WORKOUT_DRAFT_VERSION = 1;
var SOLO_WORKOUT_DRAFT_MAX_AGE_MS = 720 * 60 * 1e3;
var SHARED_WORKOUT_DRAFT_MAX_AGE_MS = 1440 * 60 * 1e3;
var defaultSet = () => ({
	reps: "",
	weight: "",
	done: false,
	completedAt: null,
	restBeforeSeconds: null
});
var defaultCardioSet = () => ({
	duration: 0,
	done: false,
	completedAt: null
});
function normalizeStrengthSet(set = {}) {
	const rawRest = set.restBeforeSeconds ?? set.rest_before_seconds;
	const parsedRest = rawRest === null || rawRest === void 0 ? null : Number(rawRest);
	return {
		...defaultSet(),
		...set,
		reps: set.reps ?? "",
		weight: set.weight ?? "",
		done: Boolean(set.done),
		completedAt: set.completedAt ?? set.completed_at ?? null,
		restBeforeSeconds: Number.isFinite(parsedRest) ? Math.max(0, parsedRest) : null
	};
}
function normalizeCardioSet(set = {}) {
	const parsedDuration = Number(set.duration);
	return {
		...defaultCardioSet(),
		...set,
		duration: Number.isFinite(parsedDuration) && parsedDuration >= 0 ? Math.min(parsedDuration, VALIDATION_LIMITS.cardioDurationMaxSeconds) : 0,
		done: Boolean(set.done),
		completedAt: set.completedAt ?? set.completed_at ?? null
	};
}
function normalizeWorkoutExercise(exercise) {
	if (!exercise) return exercise;
	const normalizeSet = exercise.category === "Cardio" ? normalizeCardioSet : normalizeStrengthSet;
	const normalizedSets = Array.isArray(exercise.sets) && exercise.sets.length > 0 ? exercise.sets.map(normalizeSet) : [normalizeSet()];
	return {
		...exercise,
		sets: normalizedSets
	};
}
function normalizeWorkoutExercises(exercises = []) {
	return exercises.map(normalizeWorkoutExercise);
}
function getRestBeforeSecondsForCompletedSet(sets, setIdx, completedAtMs) {
	for (let index = setIdx - 1; index >= 0; index -= 1) {
		const previousSet = sets[index];
		if (!previousSet?.done || !previousSet?.completedAt) continue;
		const previousCompletedAtMs = Date.parse(previousSet.completedAt);
		if (!Number.isFinite(previousCompletedAtMs)) continue;
		const diffSeconds = Math.round((completedAtMs - previousCompletedAtMs) / 1e3);
		return diffSeconds > 0 ? diffSeconds : null;
	}
	return null;
}
function markExerciseSetCompleted(exercise, setIdx, { completedAtMs = Date.now(), deriveRest = true } = {}) {
	const completedAt = new Date(completedAtMs).toISOString();
	const restBeforeSeconds = exercise.category === "Cardio" || !deriveRest ? null : getRestBeforeSecondsForCompletedSet(exercise.sets, setIdx, completedAtMs);
	return {
		...exercise,
		sets: exercise.sets.map((set, index) => {
			if (index !== setIdx) return set;
			return exercise.category === "Cardio" ? {
				...set,
				done: true,
				completedAt
			} : {
				...set,
				done: true,
				completedAt,
				restBeforeSeconds
			};
		})
	};
}
function clearExerciseSetCompletion(exercise, setIdx) {
	return {
		...exercise,
		sets: exercise.sets.map((set, index) => {
			if (index !== setIdx) return set;
			return exercise.category === "Cardio" ? {
				...set,
				done: false,
				completedAt: null
			} : {
				...set,
				done: false,
				completedAt: null,
				restBeforeSeconds: null
			};
		})
	};
}
function getWorkoutDraftStorageKey(userId, roomId = null) {
	return roomId ? `battleWorkoutDraft:${roomId}:${userId}` : `workoutDraft:${userId}`;
}
function readStoredWorkoutDraft(userId, roomId = null) {
	if (!userId || typeof window === "undefined") return {
		draft: null,
		expiredSessionId: null
	};
	try {
		const raw = window.localStorage.getItem(getWorkoutDraftStorageKey(userId, roomId));
		if (!raw) return {
			draft: null,
			expiredSessionId: null
		};
		const parsed = sanitizeWorkoutDraft(JSON.parse(raw), WORKOUT_DRAFT_VERSION);
		if (!parsed) {
			window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId));
			return {
				draft: null,
				expiredSessionId: null
			};
		}
		const maxAgeMs = roomId ? SHARED_WORKOUT_DRAFT_MAX_AGE_MS : SOLO_WORKOUT_DRAFT_MAX_AGE_MS;
		if (parsed.savedAt && Date.now() - parsed.savedAt > maxAgeMs) {
			window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId));
			return {
				draft: null,
				expiredSessionId: parsed.sessionId || null
			};
		}
		return {
			draft: parsed,
			expiredSessionId: null
		};
	} catch {
		return {
			draft: null,
			expiredSessionId: null
		};
	}
}
function writeStoredWorkoutDraft(userId, draft, roomId = null) {
	if (!userId || !draft || typeof window === "undefined") return;
	try {
		const sanitized = sanitizeWorkoutDraft(draft, WORKOUT_DRAFT_VERSION);
		if (!sanitized) return;
		window.localStorage.setItem(getWorkoutDraftStorageKey(userId, roomId), JSON.stringify(sanitized));
	} catch {}
}
function clearStoredWorkoutDraft(userId, roomId = null) {
	if (!userId || typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId));
	} catch {}
}
function getRankRatio(exercise, ormKg, bodyweightKg) {
	if (!bodyweightKg) return 0;
	return exercise.equipment === "Bodyweight" ? (ormKg + bodyweightKg) / bodyweightKg : ormKg / bodyweightKg;
}
function getContinuousExerciseScore(exercise, ormKg, bodyweightKg, thresholds) {
	const ratio = getRankRatio(exercise, ormKg, bodyweightKg);
	const tierIdx = getTierIdx(ratio, thresholds);
	const progress = getProgress(ratio, thresholds, tierIdx);
	return clampContinuousTierScore(tierIdx + Math.min(.999, progress / 100));
}
function createRestTimer(seconds, exerciseName) {
	return {
		endTime: Date.now() + seconds * 1e3,
		total: seconds,
		exerciseName,
		completed: false
	};
}
function getRemainingRestSeconds(restTimer) {
	return Math.max(0, Math.ceil((restTimer.endTime - Date.now()) / 1e3));
}
function buildRemoteWorkouts(events, exerciseLibrary, participants = []) {
	const exerciseLookup = new Map((exerciseLibrary || []).map((exercise) => [exercise.id, exercise]));
	const orderedEvents = [...events || []].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
	const participantsById = new Map((participants || []).map((participant) => [participant.user_id, participant]));
	const workoutsByUser = /* @__PURE__ */ new Map();
	const ensureWorkout = (userId) => {
		if (!workoutsByUser.has(userId)) {
			const participant = participantsById.get(userId);
			workoutsByUser.set(userId, {
				userId,
				name: participant?.profile?.full_name || participant?.profile?.username || "Friend",
				status: "live",
				exercises: /* @__PURE__ */ new Map(),
				order: [],
				lastEventAt: null
			});
		}
		return workoutsByUser.get(userId);
	};
	const ensureExercise = (workout, exerciseId, exerciseName, fallbackUnit = "kg", fallbackCategory = "Live battle") => {
		const key = exerciseId ?? exerciseName;
		if (!key) return null;
		if (!workout.exercises.has(key)) {
			const meta = exerciseId ? exerciseLookup.get(exerciseId) : null;
			workout.exercises.set(key, {
				key,
				id: exerciseId ?? null,
				name: exerciseName || meta?.name || "Exercise",
				category: meta?.category || fallbackCategory,
				unit: fallbackUnit,
				sets: []
			});
			workout.order.push(key);
		}
		return workout.exercises.get(key);
	};
	for (const event of orderedEvents) {
		const payload = event.payload || {};
		const workout = ensureWorkout(event.user_id);
		workout.lastEventAt = event.created_at;
		if (event.event_type === "workout_finished") {
			workout.status = "finished";
			continue;
		}
		if (event.event_type === "workout_cancelled") {
			workout.status = "left";
			continue;
		}
		if (event.event_type === "exercise_added") {
			const ids = payload.exerciseIds || [];
			const names = payload.exerciseNames || [];
			const categories = payload.exerciseCategories || [];
			const count = Math.max(ids.length, names.length);
			for (let i = 0; i < count; i += 1) ensureExercise(workout, ids[i] ?? null, names[i] ?? null, "kg", categories[i] || "Live battle");
		}
		if (event.event_type === "set_completed") {
			const exercise = ensureExercise(workout, payload.exerciseId ?? null, payload.exerciseName ?? null, payload.unit || "kg", payload.category || "Live battle");
			if (!exercise) continue;
			const setIndex = Math.max(0, (Number(payload.setNumber) || 1) - 1);
			while (exercise.sets.length <= setIndex) exercise.sets.push(exercise.category === "Cardio" ? defaultCardioSet() : defaultSet());
			exercise.unit = payload.unit || exercise.unit || "kg";
			exercise.sets[setIndex] = exercise.category === "Cardio" ? {
				duration: Number(payload.durationSeconds ?? payload.duration_seconds) || 0,
				done: true
			} : {
				weight: Number(payload.weight) || 0,
				reps: Number(payload.reps) || 0,
				done: true
			};
		}
		if (event.event_type === "set_removed") {
			const exercise = ensureExercise(workout, payload.exerciseId ?? null, payload.exerciseName ?? null, payload.unit || "kg", payload.category || "Live battle");
			if (!exercise) continue;
			const setIndex = Math.max(0, (Number(payload.setNumber) || 1) - 1);
			if (setIndex < exercise.sets.length) exercise.sets.splice(setIndex, 1);
		}
	}
	return [...workoutsByUser.values()].map((workout) => ({
		...workout,
		exercises: workout.order.map((key) => workout.exercises.get(key)).filter(Boolean)
	})).sort((a, b) => {
		if (a.status !== b.status) {
			if (a.status === "live") return -1;
			if (b.status === "live") return 1;
		}
		return a.name.localeCompare(b.name);
	});
}
function SortableRoutineRow({ name, children }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: name });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: setNodeRef,
		style: {
			transform: CSS.Translate.toString(transform),
			transition,
			opacity: isDragging ? .4 : 1
		},
		children: children({
			listeners,
			attributes
		})
	});
}
function SortableExerciseBlock({ id, children }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: setNodeRef,
		className: "sortable-exercise-shell",
		style: {
			transform: CSS.Translate.toString(transform),
			transition,
			opacity: isDragging ? .4 : 1
		},
		children: children({
			listeners,
			attributes,
			isDragging
		})
	});
}
function Workout({ onStatusChange, onFinish, battleRoom, onBattleRoomClosed, startEmptyWorkoutTick = 0, resumeWorkoutTick = 0, isVisible = false }) {
	const userId = useCurrentUserId();
	const [activeWorkout, setActiveWorkout] = (0, import_react.useState)(false);
	const [seconds, setSeconds] = (0, import_react.useState)(0);
	const [showExercises, setShowExercises] = (0, import_react.useState)(false);
	const [pickerExiting, setPickerExiting] = (0, import_react.useState)(false);
	const [selected, setSelected] = (0, import_react.useState)([]);
	const [workoutExercises, setWorkoutExercises] = (0, import_react.useState)([]);
	const [exerciseLibrary, setExerciseLibrary] = (0, import_react.useState)([]);
	const [sessionId, setSessionId] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [detailExerciseId, setDetailExerciseId] = (0, import_react.useState)(null);
	const [deleteConfirmExId, setDeleteConfirmExId] = (0, import_react.useState)(null);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [confirmAction, setConfirmAction] = (0, import_react.useState)(null);
	const [confirmBusy, setConfirmBusy] = (0, import_react.useState)(false);
	const [defaultRest, setDefaultRest] = (0, import_react.useState)(90);
	const [restTimer, setRestTimer] = (0, import_react.useState)(null);
	const [editingRest, setEditingRest] = (0, import_react.useState)(null);
	const [editingCardioDuration, setEditingCardioDuration] = (0, import_react.useState)(null);
	const sensors = useSensors(useSensor(TouchSensor, { activationConstraint: {
		delay: 100,
		tolerance: 6
	} }), useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
	const [userBodyweightKg, setUserBodyweightKg] = (0, import_react.useState)(null);
	const [prevSetsMap, setPrevSetsMap] = (0, import_react.useState)({});
	const [recentSessionsMap, setRecentSessionsMap] = (0, import_react.useState)({});
	const [plateCalc, setPlateCalc] = (0, import_react.useState)(null);
	const [defaultUnit, setDefaultUnit] = (0, import_react.useState)("kg");
	const [swipeState, setSwipeState] = (0, import_react.useState)(null);
	const swipeRef = (0, import_react.useRef)(null);
	const swipeRafRef = (0, import_react.useRef)(null);
	const workoutStartRef = (0, import_react.useRef)(null);
	const [templateSwipeState, setTemplateSwipeState] = (0, import_react.useState)(null);
	const templateSwipeRef = (0, import_react.useRef)(null);
	const [exerciseNotes, setExerciseNotes] = (0, import_react.useState)({});
	const [notesOpen, setNotesOpen] = (0, import_react.useState)({});
	const [battleEvents, setBattleEvents] = (0, import_react.useState)([]);
	const [battleProjection, setBattleProjection] = (0, import_react.useState)(null);
	const [battleSyncError, setBattleSyncError] = (0, import_react.useState)("");
	const [battleNotice, setBattleNotice] = (0, import_react.useState)("");
	const [savedWorkoutDraft, setSavedWorkoutDraft] = (0, import_react.useState)(null);
	const [savedWorkoutDraftBusy, setSavedWorkoutDraftBusy] = (0, import_react.useState)(false);
	const [savedBattleWorkoutDraft, setSavedBattleWorkoutDraft] = (0, import_react.useState)(null);
	const [expiredWorkoutDraftSessionId, setExpiredWorkoutDraftSessionId] = (0, import_react.useState)(null);
	const [expiredBattleWorkoutDraftSessionId, setExpiredBattleWorkoutDraftSessionId] = (0, import_react.useState)(null);
	const [battleDraftReady, setBattleDraftReady] = (0, import_react.useState)(false);
	const [battleDraftBusy, setBattleDraftBusy] = (0, import_react.useState)(false);
	const [battleFeedHidden, setBattleFeedHidden] = (0, import_react.useState)(() => {
		try {
			return localStorage.getItem("battleFeedHidden") === "1";
		} catch {
			return false;
		}
	});
	const [battleStarting, setBattleStarting] = (0, import_react.useState)(false);
	const [showCustomExerciseForm, setShowCustomExerciseForm] = (0, import_react.useState)(false);
	const [savingCustomExercise, setSavingCustomExercise] = (0, import_react.useState)(false);
	const [customExerciseError, setCustomExerciseError] = (0, import_react.useState)("");
	const [customExerciseForm, setCustomExerciseForm] = (0, import_react.useState)({
		name: "",
		category: "",
		equipment: "Bodyweight",
		primary_muscles: [],
		secondary_muscles: [],
		default_rest_seconds: 90
	});
	const battleStartedRoomRef = (0, import_react.useRef)(null);
	const completedBattleRoomRef = (0, import_react.useRef)(null);
	const isFinishingRef = (0, import_react.useRef)(false);
	const latestWorkoutDraftRef = (0, import_react.useRef)(null);
	const latestBattleWorkoutDraftRef = (0, import_react.useRef)(null);
	const [dragHintKey, setDragHintKey] = (0, import_react.useState)(null);
	const dragHintTimerRef = (0, import_react.useRef)(null);
	const battleModeActive = Boolean(battleRoom?.id) && completedBattleRoomRef.current !== battleRoom.id;
	const surfacedRemoteFinishEventIdsRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const [userRoutines, setUserRoutines] = (0, import_react.useState)([]);
	const [hiddenTemplates, setHiddenTemplates] = (0, import_react.useState)(() => {
		try {
			return sanitizeHiddenTemplateIds(JSON.parse(localStorage.getItem("hiddenTemplates") || "[]"), TEMPLATES.map((t) => t.id));
		} catch {
			return [];
		}
	});
	const [showRoutineBuilder, setShowRoutineBuilder] = (0, import_react.useState)(false);
	const [routineName, setRoutineName] = (0, import_react.useState)("");
	const [routineDesc, setRoutineDesc] = (0, import_react.useState)("");
	const [routineExercises, setRoutineExercises] = (0, import_react.useState)([]);
	const [routineError, setRoutineError] = (0, import_react.useState)("");
	const [editingRoutineId, setEditingRoutineId] = (0, import_react.useState)(null);
	const [pickerContext, setPickerContext] = (0, import_react.useState)("workout");
	(0, import_react.useEffect)(() => {
		if (!userId) return void 0;
		let cancelled = false;
		const init = async () => {
			setLoading(true);
			try {
				const [exercises, { data: prof }, { data: routines }, { data: restPrefs }] = await Promise.all([
					fetchExercises(userId),
					supabase.from("profiles").select("default_rest_seconds, unit_preference, bodyweight").eq("id", userId).single(),
					supabase.from("user_routines").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
					supabase.from("user_exercise_preferences").select("exercise_id, rest_seconds").eq("user_id", userId)
				]);
				if (cancelled) return;
				const prefMap = new Map((restPrefs || []).map((p) => [p.exercise_id, p.rest_seconds]));
				setExerciseLibrary((exercises || []).map((ex) => prefMap.has(ex.id) ? {
					...ex,
					default_rest_seconds: prefMap.get(ex.id)
				} : ex));
				setDefaultRest(prof?.default_rest_seconds ?? 90);
				setDefaultUnit(prof?.unit_preference || "kg");
				setUserBodyweightKg(getProfileBodyweightKg(prof));
				setUserRoutines(routines || []);
				const soloDraftState = readStoredWorkoutDraft(userId);
				setSavedWorkoutDraft(soloDraftState.draft);
				setExpiredWorkoutDraftSessionId(soloDraftState.expiredSessionId);
			} catch (err) {
				if (!cancelled) setBattleSyncError(err.message || "Could not load your workout setup.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		init();
		return () => {
			cancelled = true;
		};
	}, [userId]);
	(0, import_react.useEffect)(() => {
		if (!battleNotice) return void 0;
		const timer = setTimeout(() => setBattleNotice(""), 2200);
		return () => clearTimeout(timer);
	}, [battleNotice]);
	const clearWorkoutDraft = (0, import_react.useCallback)(() => {
		if (!userId) return;
		latestWorkoutDraftRef.current = null;
		clearStoredWorkoutDraft(userId);
		setSavedWorkoutDraft(null);
	}, [userId]);
	const flushWorkoutDraft = (0, import_react.useCallback)(() => {
		if (!userId) return;
		const draft = latestWorkoutDraftRef.current;
		if (!draft) return;
		writeStoredWorkoutDraft(userId, {
			...draft,
			savedAt: Date.now()
		});
	}, [userId]);
	const clearBattleWorkoutDraft = (0, import_react.useCallback)(() => {
		if (!userId || !battleRoom?.id) return;
		latestBattleWorkoutDraftRef.current = null;
		clearStoredWorkoutDraft(userId, battleRoom.id);
		setSavedBattleWorkoutDraft(null);
	}, [battleRoom?.id, userId]);
	const flushBattleWorkoutDraft = (0, import_react.useCallback)(() => {
		if (!userId || !battleRoom?.id) return;
		const draft = latestBattleWorkoutDraftRef.current;
		if (!draft) return;
		writeStoredWorkoutDraft(userId, {
			...draft,
			savedAt: Date.now()
		}, battleRoom.id);
	}, [battleRoom?.id, userId]);
	(0, import_react.useEffect)(() => {
		if (!userId || !battleRoom?.id) {
			setSavedBattleWorkoutDraft(null);
			setExpiredBattleWorkoutDraftSessionId(null);
			setBattleDraftReady(!battleRoom?.id);
			latestBattleWorkoutDraftRef.current = null;
			return;
		}
		const battleDraftState = readStoredWorkoutDraft(userId, battleRoom.id);
		setSavedBattleWorkoutDraft(battleDraftState.draft);
		setExpiredBattleWorkoutDraftSessionId(battleDraftState.expiredSessionId);
		setBattleDraftReady(true);
	}, [battleRoom?.id, userId]);
	(0, import_react.useEffect)(() => {
		if (!userId || !activeWorkout || !sessionId || battleModeActive) {
			latestWorkoutDraftRef.current = null;
			return;
		}
		const startedAt = workoutStartRef.current || Date.now();
		workoutStartRef.current = startedAt;
		latestWorkoutDraftRef.current = {
			version: WORKOUT_DRAFT_VERSION,
			savedAt: Date.now(),
			sessionId,
			startedAt,
			workoutExercises,
			exerciseNotes,
			notesOpen,
			restTimer: restTimer && getRemainingRestSeconds(restTimer) > 0 ? restTimer : null,
			defaultUnit,
			defaultRest
		};
		const timer = setTimeout(() => flushWorkoutDraft(), 160);
		return () => clearTimeout(timer);
	}, [
		activeWorkout,
		battleModeActive,
		defaultRest,
		defaultUnit,
		exerciseNotes,
		flushWorkoutDraft,
		notesOpen,
		restTimer,
		sessionId,
		userId,
		workoutExercises
	]);
	(0, import_react.useEffect)(() => {
		if (!userId || !battleModeActive || !battleRoom?.id || !activeWorkout || !sessionId) {
			latestBattleWorkoutDraftRef.current = null;
			return;
		}
		const startedAt = workoutStartRef.current || Date.now();
		workoutStartRef.current = startedAt;
		latestBattleWorkoutDraftRef.current = {
			version: WORKOUT_DRAFT_VERSION,
			savedAt: Date.now(),
			sessionId,
			startedAt,
			workoutExercises,
			exerciseNotes,
			notesOpen,
			restTimer: restTimer && getRemainingRestSeconds(restTimer) > 0 ? restTimer : null,
			defaultUnit,
			defaultRest,
			roomId: battleRoom.id
		};
		const timer = setTimeout(() => flushBattleWorkoutDraft(), 160);
		return () => clearTimeout(timer);
	}, [
		activeWorkout,
		battleModeActive,
		battleRoom?.id,
		defaultRest,
		defaultUnit,
		exerciseNotes,
		flushBattleWorkoutDraft,
		notesOpen,
		restTimer,
		sessionId,
		userId,
		workoutExercises
	]);
	(0, import_react.useEffect)(() => {
		if (!userId) return void 0;
		const handlePageHide = () => {
			flushWorkoutDraft();
			flushBattleWorkoutDraft();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushWorkoutDraft();
				flushBattleWorkoutDraft();
			}
		};
		window.addEventListener("pagehide", handlePageHide);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			window.removeEventListener("pagehide", handlePageHide);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [
		flushBattleWorkoutDraft,
		flushWorkoutDraft,
		userId
	]);
	(0, import_react.useEffect)(() => {
		if (!userId || !expiredWorkoutDraftSessionId) return void 0;
		let cancelled = false;
		const cleanup = async () => {
			try {
				await supabase.from("workout_sessions").delete().eq("id", expiredWorkoutDraftSessionId).eq("user_id", userId).is("finished_at", null);
			} finally {
				if (!cancelled) setExpiredWorkoutDraftSessionId(null);
			}
		};
		cleanup();
		return () => {
			cancelled = true;
		};
	}, [expiredWorkoutDraftSessionId, userId]);
	(0, import_react.useEffect)(() => {
		if (!userId || !expiredBattleWorkoutDraftSessionId) return void 0;
		let cancelled = false;
		const cleanup = async () => {
			try {
				if (battleRoom?.id) {
					await publishWorkoutRoomEvent(battleRoom.id, userId, "workout_stale", { sessionId: expiredBattleWorkoutDraftSessionId });
					await resolveWorkoutRoomIfComplete(battleRoom.id, userId);
				}
				await supabase.from("workout_sessions").delete().eq("id", expiredBattleWorkoutDraftSessionId).eq("user_id", userId).is("finished_at", null);
			} finally {
				if (!cancelled) setExpiredBattleWorkoutDraftSessionId(null);
			}
		};
		cleanup();
		return () => {
			cancelled = true;
		};
	}, [
		battleRoom?.id,
		expiredBattleWorkoutDraftSessionId,
		userId
	]);
	const performStartWorkout = async ({ isBattleStart = false } = {}) => {
		if (battleStarting || activeWorkout || sessionId) return false;
		if (!userId) return false;
		setBattleStarting(true);
		setBattleSyncError("");
		const optimistic = !isBattleStart;
		if (optimistic) {
			workoutStartRef.current = Date.now();
			setActiveWorkout(true);
		}
		try {
			const { data: sess, error: sessionError } = await supabase.from("workout_sessions").insert({ user_id: userId }).select().single();
			if (sessionError) throw sessionError;
			if (!sess) throw new Error("Could not create your workout session.");
			if (!optimistic) {
				workoutStartRef.current = Date.now();
				setActiveWorkout(true);
			}
			setSessionId(sess.id);
			writeStoredWorkoutDraft(userId, {
				version: WORKOUT_DRAFT_VERSION,
				savedAt: Date.now(),
				sessionId: sess.id,
				startedAt: workoutStartRef.current,
				workoutExercises: [],
				exerciseNotes: {},
				notesOpen: {},
				restTimer: null,
				defaultUnit,
				defaultRest
			}, battleModeActive ? battleRoom?.id : null);
			if (battleModeActive && isBattleStart) try {
				await publishBattleEvent("workout_started", {});
			} catch (err) {
				setBattleSyncError(err.message || "Could not announce your battle workout start.");
			}
			return true;
		} catch (err) {
			if (optimistic) {
				setActiveWorkout(false);
				workoutStartRef.current = null;
			}
			setBattleSyncError(err.message || "Could not start your workout.");
			return false;
		} finally {
			setBattleStarting(false);
		}
	};
	async function publishBattleEvent(eventType, payload = {}) {
		if (!battleRoom?.id || !userId) return;
		await publishWorkoutRoomEvent(battleRoom.id, userId, eventType, payload);
	}
	async function resolveCurrentBattleRoom() {
		if (!battleRoom?.id) return false;
		return resolveWorkoutRoomIfComplete(battleRoom.id, userId);
	}
	async function loadCurrentBattleRecap() {
		if (!battleRoom?.id || !userId) return null;
		return loadBattleRecap(battleRoom.id, userId);
	}
	const refreshBattleProjection = (0, import_react.useCallback)(async () => {
		if (!battleRoom?.id || !userId) {
			setBattleProjection(null);
			return null;
		}
		try {
			const projection = await loadBattleRecap(battleRoom.id, userId);
			setBattleProjection(projection);
			return projection;
		} catch {
			return null;
		}
	}, [battleRoom?.id, userId]);
	const startBattleWorkout = (0, import_react.useEffectEvent)(() => {
		performStartWorkout({ isBattleStart: true });
	});
	const loadUserRoutines = async (uid) => {
		const { data } = await supabase.from("user_routines").select("*").eq("user_id", uid).order("created_at", { ascending: false });
		if (data) setUserRoutines(data);
	};
	const loadRecentExerciseHistory = (0, import_react.useCallback)(async (exercisesToAnalyze, uid, sid) => {
		const validExercises = exercisesToAnalyze.filter((ex) => ex?.id);
		if (!validExercises.length || !uid) return;
		const sessionsByExercise = await fetchRecentSessions(uid, validExercises.map((ex) => ex.id), supabase, sid);
		const prevSetUpdates = {};
		const recentSessionUpdates = {};
		for (const ex of validExercises) {
			const exerciseSessions = sessionsByExercise[ex.id] || [];
			const latestSession = exerciseSessions.at(-1);
			recentSessionUpdates[ex.id] = exerciseSessions;
			prevSetUpdates[ex.id] = (latestSession?.sets || []).map((set) => ({
				weight: set.weight,
				reps: set.reps,
				unit: set.unit,
				duration_seconds: set.duration_seconds,
				set_number: set.set_number
			}));
		}
		setPrevSetsMap((prev) => ({
			...prev,
			...prevSetUpdates
		}));
		setRecentSessionsMap((prev) => ({
			...prev,
			...recentSessionUpdates
		}));
	}, []);
	const progressionMap = (0, import_react.useMemo)(() => {
		const nextMap = {};
		workoutExercises.forEach((exercise) => {
			if (exercise.category === "Cardio") return;
			const suggestion = buildCurrentSetSuggestion({
				sessions: recentSessionsMap[exercise.id] || [],
				currentSets: exercise.sets,
				equipment: exercise.equipment,
				unitPreference: exercise.unit || defaultUnit
			});
			if (suggestion) nextMap[exercise.id] = suggestion;
		});
		return nextMap;
	}, [
		defaultUnit,
		recentSessionsMap,
		workoutExercises
	]);
	(0, import_react.useEffect)(() => {
		if (!Object.keys(prevSetsMap).length) return;
		setWorkoutExercises((prev) => prev.map((ex) => {
			const prevSet = prevSetsMap[ex.id]?.[0];
			if (!prevSet) return ex;
			const first = ex.sets[0];
			if (first.weight !== "" || first.reps !== "") return ex;
			const weight = prevSet.unit === ex.unit ? prevSet.weight : prevSet.unit === "lbs" ? Math.round(prevSet.weight * .453592 * 10) / 10 : Math.round(prevSet.weight * 2.20462 * 10) / 10;
			return {
				...ex,
				sets: ex.sets.map((s, i) => i === 0 ? {
					...s,
					weight: String(weight),
					reps: String(prevSet.reps)
				} : s)
			};
		}));
	}, [prevSetsMap]);
	(0, import_react.useEffect)(() => {
		if (!restTimer) return;
		if (restTimer.completed) {
			const timeout = setTimeout(() => setRestTimer(null), 1200);
			return () => clearTimeout(timeout);
		}
		const tick = () => {
			if (Math.ceil((restTimer.endTime - Date.now()) / 1e3) <= 0) setRestTimer((current) => current ? {
				...current,
				endTime: Date.now(),
				completed: true
			} : null);
			else setRestTimer((r) => r ? { ...r } : null);
		};
		const t = setTimeout(tick, 500);
		return () => clearTimeout(t);
	}, [restTimer]);
	(0, import_react.useEffect)(() => {
		if (startEmptyWorkoutTick === 0) return;
		if (!activeWorkout && !sessionId) performStartWorkout();
	}, [startEmptyWorkoutTick]);
	(0, import_react.useEffect)(() => {
		if (!activeWorkout) {
			setSeconds(0);
			workoutStartRef.current = null;
			return;
		}
		if (!workoutStartRef.current) workoutStartRef.current = Date.now();
		const interval = setInterval(() => {
			setSeconds(Math.floor((Date.now() - workoutStartRef.current) / 1e3));
		}, 1e3);
		return () => clearInterval(interval);
	}, [activeWorkout]);
	(0, import_react.useEffect)(() => {
		const roomId = battleRoom?.id;
		if (!roomId || !userId) return;
		let mounted = true;
		const loadEvents = async () => {
			try {
				const events = await loadOpponentEvents(roomId, userId);
				if (mounted) {
					setBattleEvents(events);
					setBattleSyncError("");
				}
				refreshBattleProjection();
			} catch (err) {
				if (mounted) setBattleSyncError(err.message || "Could not sync your battle feed.");
			}
		};
		loadEvents();
		const channel = supabase.channel(`workout-room-${roomId}`).on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "workout_room_events",
			filter: `room_id=eq.${roomId}`
		}, (payload) => {
			if (!mounted) return;
			const row = payload.new;
			if (!row || row.user_id === userId) return;
			if (row.event_type === "workout_finished") {
				if (!surfacedRemoteFinishEventIdsRef.current.has(row.id)) {
					surfacedRemoteFinishEventIdsRef.current.add(row.id);
					setBattleNotice(`${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || "Your friend"} finished their workout.`);
				}
			}
			setBattleEvents((prev) => [row, ...prev.filter((event) => event.id !== row.id)].slice(0, 100));
			refreshBattleProjection();
		}).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "workout_rooms",
			filter: `id=eq.${roomId}`
		}, (payload) => {
			if (payload.new?.status === "finished" || payload.new?.status === "cancelled") {
				refreshBattleProjection();
				onBattleRoomClosed?.(payload.new.status);
			}
		}).subscribe();
		return () => {
			mounted = false;
			supabase.removeChannel(channel);
		};
	}, [
		battleRoom,
		onBattleRoomClosed,
		refreshBattleProjection,
		userId
	]);
	(0, import_react.useEffect)(() => {
		if (!battleRoom?.id || !battleDraftReady || savedBattleWorkoutDraft || battleDraftBusy || loading || activeWorkout || sessionId || battleStartedRoomRef.current === battleRoom.id || completedBattleRoomRef.current === battleRoom.id) return;
		let cancelled = false;
		const roomId = battleRoom.id;
		const timer = setTimeout(async () => {
			const started = await startBattleWorkout();
			if (!cancelled && started) battleStartedRoomRef.current = roomId;
		}, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		activeWorkout,
		battleDraftBusy,
		battleDraftReady,
		battleRoom?.id,
		loading,
		savedBattleWorkoutDraft,
		sessionId
	]);
	(0, import_react.useEffect)(() => {
		if (!battleRoom?.id) {
			completedBattleRoomRef.current = null;
			setBattleProjection(null);
		}
	}, [battleRoom?.id]);
	const resumeSavedBattleWorkout = (0, import_react.useCallback)(async () => {
		if (!battleModeActive || !battleRoom?.id || !battleDraftReady || !savedBattleWorkoutDraft || activeWorkout || sessionId || loading || battleDraftBusy || !userId) return;
		setBattleDraftBusy(true);
		try {
			const { data: sessionRow, error } = await supabase.from("workout_sessions").select("id").eq("id", savedBattleWorkoutDraft.sessionId).eq("user_id", userId).is("finished_at", null).maybeSingle();
			if (error || !sessionRow) {
				clearBattleWorkoutDraft();
				setBattleSyncError("Your shared workout could not be resumed.");
				return;
			}
			const restoredStartedAt = savedBattleWorkoutDraft.startedAt || Date.now();
			const restoredExercises = Array.isArray(savedBattleWorkoutDraft.workoutExercises) ? normalizeWorkoutExercises(savedBattleWorkoutDraft.workoutExercises) : [];
			const restoredRestTimer = savedBattleWorkoutDraft.restTimer && getRemainingRestSeconds(savedBattleWorkoutDraft.restTimer) > 0 ? savedBattleWorkoutDraft.restTimer : null;
			workoutStartRef.current = restoredStartedAt;
			setSessionId(savedBattleWorkoutDraft.sessionId);
			setDefaultUnit(savedBattleWorkoutDraft.defaultUnit || defaultUnit);
			setDefaultRest(savedBattleWorkoutDraft.defaultRest ?? defaultRest);
			setWorkoutExercises(restoredExercises);
			setExerciseNotes(savedBattleWorkoutDraft.exerciseNotes || {});
			setNotesOpen(savedBattleWorkoutDraft.notesOpen || {});
			setRestTimer(restoredRestTimer);
			setSeconds(Math.max(0, Math.floor((Date.now() - restoredStartedAt) / 1e3)));
			setActiveWorkout(true);
			setSavedBattleWorkoutDraft(null);
			if (restoredRestTimer) scheduleRestEndNotification(getRemainingRestSeconds(restoredRestTimer), restoredRestTimer.exerciseName);
			if (restoredExercises.length > 0) loadRecentExerciseHistory(restoredExercises, userId, savedBattleWorkoutDraft.sessionId);
		} finally {
			setBattleDraftBusy(false);
		}
	}, [
		activeWorkout,
		battleDraftBusy,
		battleDraftReady,
		battleModeActive,
		battleRoom?.id,
		clearBattleWorkoutDraft,
		defaultRest,
		defaultUnit,
		loadRecentExerciseHistory,
		loading,
		savedBattleWorkoutDraft,
		sessionId,
		userId
	]);
	(0, import_react.useEffect)(() => {
		if (!battleModeActive || !battleRoom?.id || !battleDraftReady || !savedBattleWorkoutDraft || activeWorkout || sessionId || loading || battleDraftBusy || !userId) return void 0;
		let cancelled = false;
		const timer = setTimeout(async () => {
			try {
				if (cancelled) return;
				await resumeSavedBattleWorkout();
			} catch {}
		}, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		activeWorkout,
		battleDraftBusy,
		battleDraftReady,
		battleModeActive,
		battleRoom?.id,
		clearBattleWorkoutDraft,
		defaultRest,
		defaultUnit,
		loading,
		resumeSavedBattleWorkout,
		savedBattleWorkoutDraft,
		sessionId,
		userId
	]);
	(0, import_react.useEffect)(() => {
		if (resumeWorkoutTick === 0) return;
		if (activeWorkout || sessionId || loading) return;
		if (savedWorkoutDraft) {
			resumeSavedWorkout();
			return;
		}
		if (savedBattleWorkoutDraft) resumeSavedBattleWorkout();
	}, [
		activeWorkout,
		loading,
		resumeSavedWorkout,
		resumeSavedBattleWorkout,
		resumeWorkoutTick,
		savedBattleWorkoutDraft,
		savedWorkoutDraft,
		sessionId
	]);
	(0, import_react.useEffect)(() => {
		onStatusChange?.({
			active: activeWorkout,
			resumable: activeWorkout || Boolean(savedWorkoutDraft) || Boolean(savedBattleWorkoutDraft),
			seconds,
			restTimer: restTimer ? {
				...restTimer,
				secondsLeft: getRemainingRestSeconds(restTimer)
			} : null
		});
	}, [
		activeWorkout,
		onStatusChange,
		restTimer,
		savedBattleWorkoutDraft,
		savedWorkoutDraft,
		seconds
	]);
	const showDragHint = (key) => {
		clearTimeout(dragHintTimerRef.current);
		setDragHintKey(key);
		dragHintTimerRef.current = setTimeout(() => setDragHintKey(null), 1500);
	};
	const formatTime = (s) => {
		const h = Math.floor(s / 3600);
		const m = Math.floor(s % 3600 / 60);
		const sec = s % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
		return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
	};
	const confirmCancel = async () => {
		const cancelledSessionId = sessionId;
		if (sessionId) await supabase.from("workout_sessions").delete().eq("id", sessionId);
		if (battleModeActive && userId) try {
			await publishBattleEvent("workout_cancelled", { sessionId: cancelledSessionId });
			if (await resolveCurrentBattleRoom()) onBattleRoomClosed?.("cancelled");
			else onBattleRoomClosed?.("left");
		} catch (err) {
			setBattleSyncError(err.message || "Could not update your battle room.");
		}
		setActiveWorkout(false);
		setWorkoutExercises([]);
		setSessionId(null);
		setBattleStarting(false);
		battleStartedRoomRef.current = null;
		completedBattleRoomRef.current = battleRoom?.id || null;
		setBattleEvents([]);
		setPrevSetsMap({});
		setRecentSessionsMap({});
		cancelRestNotification();
		setRestTimer(null);
		setExerciseNotes({});
		setNotesOpen({});
		if (battleModeActive) clearBattleWorkoutDraft();
		else clearWorkoutDraft();
	};
	const restartWorkoutFromSavedDraft = async () => {
		if (!savedWorkoutDraft || !userId) return;
		const { error } = await supabase.from("workout_sessions").delete().eq("id", savedWorkoutDraft.sessionId).eq("user_id", userId);
		if (error) {
			setBattleSyncError(error.message || "Could not start a fresh workout.");
			return;
		}
		clearWorkoutDraft();
		await performStartWorkout();
	};
	const closeConfirm = () => {
		if (!confirmBusy) setConfirmAction(null);
	};
	const getFinishableSetMeta = (0, import_react.useCallback)((exercise, set, index) => {
		if (exercise.category === "Cardio") {
			const duration = Number(set.duration) || 0;
			const valid = Number.isFinite(duration) && duration > 0;
			return {
				exerciseId: exercise.id,
				setIndex: index,
				duration,
				shouldInclude: valid,
				incomplete: valid && !set.done,
				completedAt: set.completedAt || null,
				restBeforeSeconds: null
			};
		}
		const weight = Number.parseFloat(set.weight);
		const reps = Number.parseInt(set.reps, 10);
		const validReps = Number.isInteger(reps) && reps > 0 && reps <= 9999;
		const validWeight = isWeightWithinInputRange(weight, {
			equipment: exercise.equipment,
			unit: exercise.unit,
			bodyweightKg: userBodyweightKg
		});
		return {
			exerciseId: exercise.id,
			setIndex: index,
			weight: Number.isFinite(weight) ? weight : 0,
			reps: Number.isInteger(reps) ? reps : 0,
			shouldInclude: validReps && validWeight,
			incomplete: validReps && validWeight && !set.done,
			completedAt: set.completedAt || null,
			restBeforeSeconds: Number.isFinite(set.restBeforeSeconds) ? set.restBeforeSeconds : null
		};
	}, [userBodyweightKg]);
	const hasIncompleteFinishableSets = (0, import_react.useCallback)(() => workoutExercises.some((exercise) => exercise.sets.some((set, index) => getFinishableSetMeta(exercise, set, index).incomplete)), [getFinishableSetMeta, workoutExercises]);
	const buildWorkoutExercisesWithIncompleteSetsDone = (0, import_react.useCallback)((sourceExercises = workoutExercises) => sourceExercises.map((exercise, exerciseIndex) => {
		let nextExercise = exercise;
		const completionBaseMs = Date.now() + exerciseIndex * 25;
		nextExercise.sets.forEach((set, index) => {
			if (!getFinishableSetMeta(nextExercise, set, index).incomplete) return;
			nextExercise = markExerciseSetCompleted(nextExercise, index, {
				completedAtMs: completionBaseMs + index,
				deriveRest: false
			});
		});
		return nextExercise;
	}), [getFinishableSetMeta, workoutExercises]);
	const promptFinishWorkout = (0, import_react.useCallback)(() => {
		setConfirmAction(hasIncompleteFinishableSets() ? "incomplete" : "finish");
	}, [hasIncompleteFinishableSets]);
	const runConfirmedAction = async () => {
		if (!confirmAction || confirmBusy || isFinishingRef.current) return;
		isFinishingRef.current = true;
		setConfirmBusy(true);
		try {
			if (confirmAction === "cancel") await confirmCancel();
			if (confirmAction === "incomplete") {
				const completedExercises = buildWorkoutExercisesWithIncompleteSetsDone();
				setWorkoutExercises(completedExercises);
				await finishWorkout(completedExercises);
			}
			if (confirmAction === "finish") await finishWorkout();
			if (confirmAction === "restart") await restartWorkoutFromSavedDraft();
			setConfirmAction(null);
		} catch (err) {
			console.error("runConfirmedAction failed:", err);
		} finally {
			setConfirmBusy(false);
			isFinishingRef.current = false;
		}
	};
	const finishWorkout = async (exercisesOverride = workoutExercises) => {
		const setsToInsert = [];
		exercisesOverride.forEach((ex) => {
			ex.sets.forEach((s, i) => {
				const meta = getFinishableSetMeta(ex, s, i);
				if (!meta.shouldInclude) return;
				if (ex.category === "Cardio") setsToInsert.push({
					user_id: userId,
					session_id: sessionId,
					exercise_id: ex.id,
					set_number: i + 1,
					duration_seconds: meta.duration,
					completed_at: meta.completedAt,
					rest_before_seconds: null
				});
				else setsToInsert.push({
					user_id: userId,
					session_id: sessionId,
					exercise_id: ex.id,
					set_number: i + 1,
					reps: meta.reps,
					weight: meta.weight,
					unit: ex.unit,
					equipment: ex.equipment,
					estimated_1rm: calculateORM(meta.weight, meta.reps),
					completed_at: meta.completedAt,
					rest_before_seconds: meta.restBeforeSeconds
				});
			});
		});
		const exerciseIds = exercisesOverride.map((e) => e.id);
		const [{ data: prevBests }, { data: prof }, rankStatesResult] = await Promise.all([
			supabase.from("exercise_prs").select("exercise_id, best_1rm_kg").eq("user_id", userId).in("exercise_id", exerciseIds),
			fetchProfileWithWorkoutCount(userId, [
				"gender",
				"bodyweight",
				"unit_preference",
				"lifetime_volume_kg"
			]),
			fetchExerciseRankStates(userId, exerciseIds)
		]);
		const prevOrmKg = {};
		for (const pr of prevBests || []) if (pr.best_1rm_kg) prevOrmKg[pr.exercise_id] = pr.best_1rm_kg;
		const newOrmKg = { ...prevOrmKg };
		for (const s of setsToInsert) if (s.estimated_1rm !== null && s.estimated_1rm !== void 0) {
			const kg = s.unit === "lbs" ? s.estimated_1rm * .453592 : s.estimated_1rm;
			newOrmKg[s.exercise_id] = Math.max(newOrmKg[s.exercise_id] || 0, kg);
		}
		const sessionBestOrmKg = {};
		for (const s of setsToInsert) {
			if (s.estimated_1rm === null || s.estimated_1rm === void 0) continue;
			const kg = s.unit === "lbs" ? s.estimated_1rm * .453592 : s.estimated_1rm;
			sessionBestOrmKg[s.exercise_id] = Math.max(sessionBestOrmKg[s.exercise_id] || 0, kg);
		}
		const bwKg = getProfileBodyweightKg(prof, DEFAULT_BODYWEIGHT_KG);
		const genderKey = prof?.gender?.toLowerCase() === "female" ? "female" : "male";
		const rankUps = [];
		for (const ex of exercisesOverride) {
			const anchors = ANCHORS[genderKey]?.[ex.name];
			if (!anchors) continue;
			const thresholds = expandAnchors(anchors);
			const hadPrevOrm = Object.prototype.hasOwnProperty.call(prevOrmKg, ex.id);
			if (!Object.prototype.hasOwnProperty.call(newOrmKg, ex.id)) continue;
			const prevOrm = hadPrevOrm ? prevOrmKg[ex.id] : null;
			const newOrm = newOrmKg[ex.id];
			if (hadPrevOrm && newOrm <= prevOrm) continue;
			const prevIdx = hadPrevOrm ? getTierIdx(getRankRatio(ex, prevOrm, bwKg), thresholds) : null;
			const newIdx = getTierIdx(getRankRatio(ex, newOrm, bwKg), thresholds);
			if (!hadPrevOrm || newIdx > prevIdx) rankUps.push({
				exercise: ex.name,
				from: hadPrevOrm ? TIERS[prevIdx] : "Unranked",
				to: TIERS[newIdx],
				color: tierColor(TIERS[newIdx])
			});
		}
		const newAchievements = [];
		const prevOrmByName = {};
		const newOrmByName = {};
		for (const ex of exercisesOverride) {
			const name = ex.name.toLowerCase();
			const prev = prevOrmKg[ex.id] || 0;
			const next = newOrmKg[ex.id] || 0;
			if (prev > 0) prevOrmByName[name] = Math.max(prevOrmByName[name] || 0, prev);
			if (next > 0) newOrmByName[name] = Math.max(newOrmByName[name] || 0, next);
		}
		const prevTotalVolumeKg = prof?.lifetime_volume_kg ?? 0;
		const newTotalVolumeKg = prevTotalVolumeKg + setsToInsert.reduce((sum, s) => {
			return sum + getSetVolumeKg({
				weight: s.weight,
				reps: s.reps,
				unit: s.unit,
				equipment: s.equipment,
				bodyweightKg: bwKg
			});
		}, 0);
		const prevSessionCount_ = Math.max(0, Number(prof?.workout_count) || 0);
		const newSessionCount = prevSessionCount_ + 1;
		for (const a of ACHIEVEMENTS) if (a.match) {
			const prevBest = Object.entries(prevOrmByName).filter(([n]) => n.includes(a.match)).reduce((m, [, v]) => Math.max(m, v), 0);
			const newBest = Object.entries(newOrmByName).filter(([n]) => n.includes(a.match)).reduce((m, [, v]) => Math.max(m, v), 0);
			if (prevBest < a.kgTarget && newBest >= a.kgTarget) newAchievements.push(a);
		} else if (a.sessions !== void 0) {
			if (prevSessionCount_ < a.sessions && newSessionCount >= a.sessions) newAchievements.push(a);
		} else if (a.totalVolumeKg !== void 0) {
			if (prevTotalVolumeKg < a.totalVolumeKg && newTotalVolumeKg >= a.totalVolumeKg) newAchievements.push(a);
		}
		const caloriesBurned = estimateCaloriesBurned(exercisesOverride.map((ex) => {
			const includedSets = ex.sets.map((s, i) => {
				const meta = getFinishableSetMeta(ex, s, i);
				if (!meta.shouldInclude) return null;
				return ex.category === "Cardio" ? { durationSeconds: meta.duration } : {};
			}).filter(Boolean);
			if (includedSets.length === 0) return null;
			return {
				name: ex.name,
				isCardio: ex.category === "Cardio",
				primary_muscles: ex.primary_muscles || [],
				secondary_muscles: ex.secondary_muscles || [],
				sets: includedSets
			};
		}).filter(Boolean), seconds, bwKg);
		if (sessionId) {
			const seen = /* @__PURE__ */ new Set();
			const prUpserts = exercisesOverride.filter((ex) => {
				if (seen.has(ex.id) || newOrmKg[ex.id] === void 0) return false;
				if (newOrmKg[ex.id] <= (prevOrmKg[ex.id] || 0)) return false;
				seen.add(ex.id);
				return true;
			}).map((ex) => ({
				user_id: userId,
				exercise_id: ex.id,
				best_1rm_kg: newOrmKg[ex.id],
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}));
			const nowIso = (/* @__PURE__ */ new Date()).toISOString();
			const rankStatesByExerciseId = mapExerciseRankStates(rankStatesResult.rows);
			const activeRankStateUpserts = exercisesOverride.map((ex) => {
				const sessionOrmKg = sessionBestOrmKg[ex.id];
				if (!Number.isFinite(sessionOrmKg)) return null;
				const anchors = ANCHORS[genderKey]?.[ex.name];
				if (!anchors) return null;
				const thresholds = expandAnchors(anchors);
				const sessionScore = getContinuousExerciseScore(ex, sessionOrmKg, bwKg, thresholds);
				const previousState = rankStatesByExerciseId.get(ex.id) || null;
				const previousStoredScore = Number.isFinite(previousState?.current_score) ? Number(previousState.current_score) : null;
				const previousBestOrm = prevOrmKg[ex.id];
				const fallbackPriorScore = Number.isFinite(previousBestOrm) ? getContinuousExerciseScore(ex, previousBestOrm, bwKg, thresholds) : sessionScore;
				const priorScore = previousStoredScore ?? fallbackPriorScore;
				const nextScore = updateRollingScore({
					priorScore,
					priorLastRankedAt: previousState?.last_ranked_at ?? null,
					sessionScore,
					now: nowIso
				});
				const previousPeakScore = Number.isFinite(previousState?.peak_score) ? Number(previousState.peak_score) : priorScore;
				return {
					exerciseId: ex.id,
					currentScore: nextScore,
					peakScore: Math.max(previousPeakScore, nextScore),
					lastRankedAt: nowIso,
					updatedAt: nowIso
				};
			}).filter(Boolean);
			const sessionOps = [supabase.from("workout_sessions").update({
				finished_at: (/* @__PURE__ */ new Date()).toISOString(),
				exercise_notes: exerciseNotes,
				calories_burned: caloriesBurned
			}).eq("id", sessionId), supabase.from("profiles").update({ lifetime_volume_kg: newTotalVolumeKg }).eq("id", userId)];
			if (setsToInsert.length > 0) sessionOps.push(supabase.from("workout_sets").insert(setsToInsert.map((set) => ({
				user_id: set.user_id,
				session_id: set.session_id,
				exercise_id: set.exercise_id,
				set_number: set.set_number,
				reps: set.reps,
				weight: set.weight,
				unit: set.unit,
				estimated_1rm: set.estimated_1rm,
				duration_seconds: set.duration_seconds,
				completed_at: set.completed_at,
				rest_before_seconds: set.rest_before_seconds
			}))));
			if (prUpserts.length > 0) sessionOps.push(supabase.from("exercise_prs").upsert(prUpserts, { onConflict: "user_id,exercise_id" }));
			if (activeRankStateUpserts.length > 0) sessionOps.push(upsertExerciseRankStates(userId, activeRankStateUpserts));
			await Promise.all(sessionOps);
		}
		const now = /* @__PURE__ */ new Date();
		invalidateCache("home", "ranks", "profile", "achievements", `cal_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
		const unit = prof?.unit_preference || defaultUnit;
		const totalVolume = Math.round(setsToInsert.reduce((sum, s) => sum + getSetVolumeInUnit({
			weight: s.weight,
			reps: s.reps,
			unit: s.unit,
			equipment: s.equipment,
			bodyweightKg: bwKg
		}, unit), 0));
		const totalVolumeKg = setsToInsert.reduce((sum, s) => {
			return sum + getSetVolumeKg({
				weight: s.weight,
				reps: s.reps,
				unit: s.unit,
				equipment: s.equipment,
				bodyweightKg: bwKg
			});
		}, 0);
		const summary = {
			durationSeconds: seconds,
			caloriesBurned,
			totalSets: setsToInsert.length,
			totalVolume,
			unit,
			exercises: exercisesOverride.map((ex) => {
				if (ex.category === "Cardio") {
					const sets = ex.sets.map((set, index) => {
						const meta = getFinishableSetMeta(ex, set, index);
						return meta.shouldInclude ? { durationSeconds: meta.duration } : null;
					}).filter(Boolean);
					return sets.length > 0 ? {
						name: ex.name,
						sets,
						isCardio: true
					} : null;
				}
				return {
					name: ex.name,
					sets: ex.sets.map((set, index) => {
						const meta = getFinishableSetMeta(ex, set, index);
						return meta.shouldInclude ? {
							weight: meta.weight,
							reps: meta.reps,
							unit: ex.unit
						} : null;
					}).filter(Boolean)
				};
			}).filter((ex) => ex && ex.sets.length > 0),
			rankUps,
			newAchievements
		};
		if (battleModeActive && userId) try {
			await publishBattleEvent("workout_finished", {
				durationSeconds: seconds,
				totalSets: setsToInsert.length,
				totalExercises: exercisesOverride.length,
				totalVolume,
				totalVolumeKg,
				unit
			});
			summary.battle = await loadCurrentBattleRecap();
			if (await resolveCurrentBattleRoom()) {
				completedBattleRoomRef.current = null;
				onBattleRoomClosed?.("finished");
			} else {
				completedBattleRoomRef.current = battleRoom.id;
				onBattleRoomClosed?.("waiting");
			}
		} catch (err) {
			setBattleSyncError(err.message || "Could not finish the battle room cleanly.");
			return;
		}
		setActiveWorkout(false);
		setWorkoutExercises([]);
		setSessionId(null);
		setBattleStarting(false);
		battleStartedRoomRef.current = battleRoom?.id && completedBattleRoomRef.current === battleRoom.id ? battleRoom.id : null;
		setPrevSetsMap({});
		setRecentSessionsMap({});
		cancelRestNotification();
		setRestTimer(null);
		setExerciseNotes({});
		setNotesOpen({});
		if (battleModeActive) clearBattleWorkoutDraft();
		else clearWorkoutDraft();
		onFinish?.(summary);
	};
	const confirmDialog = confirmAction && typeof document !== "undefined" ? (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "confirm-overlay",
		"data-tab-swipe-ignore": "true",
		role: "presentation",
		onClick: closeConfirm,
		onTouchStart: (e) => e.stopPropagation(),
		onTouchEnd: (e) => e.stopPropagation(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "confirm-sheet",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "workout-confirm-title",
			onClick: (e) => e.stopPropagation(),
			onTouchStart: (e) => e.stopPropagation(),
			onTouchEnd: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "workout-confirm-title",
					className: "confirm-title",
					children: confirmAction === "finish" ? "Finish Workout?" : confirmAction === "restart" ? "Start Fresh Workout?" : confirmAction === "incomplete" ? "Incomplete Workout" : "Cancel Workout?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "confirm-body",
					children: confirmAction === "finish" ? "Your workout will be saved." : confirmAction === "incomplete" ? "You have incomplete sets with recorded repetitions. Would you like to mark all completed sets before finishing this workout?" : confirmAction === "restart" ? "All progress in the current saved workout will be lost." : "All progress will be lost."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "confirm-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "confirm-keep",
						onClick: closeConfirm,
						disabled: confirmBusy,
						children: confirmAction === "incomplete" ? "Back" : "Keep Going"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: confirmAction === "cancel" || confirmAction === "restart" ? "confirm-discard" : "confirm-submit",
						onClick: runConfirmedAction,
						disabled: confirmBusy,
						children: confirmBusy ? "Working..." : confirmAction === "finish" ? "Finish" : confirmAction === "restart" ? "Start Fresh" : confirmAction === "incomplete" ? "Check and Finish" : "Discard"
					})]
				})
			]
		})
	}), document.body) : null;
	const openRoutineBuilder = (routine = null) => {
		if (routine) {
			setRoutineName(routine.name);
			setRoutineDesc(routine.description || "");
			setRoutineExercises(routine.exercises || []);
			setEditingRoutineId(routine.id);
		} else {
			setRoutineName("");
			setRoutineDesc("");
			setRoutineExercises([]);
			setEditingRoutineId(null);
		}
		setShowRoutineBuilder(true);
		setRoutineError("");
	};
	const closeRoutineBuilder = () => {
		setShowRoutineBuilder(false);
		setRoutineName("");
		setRoutineDesc("");
		setRoutineExercises([]);
		setEditingRoutineId(null);
		setRoutineError("");
	};
	const saveRoutine = async () => {
		const nameError = validateLength(routineName, {
			label: "Routine name",
			min: 1,
			max: VALIDATION_LIMITS.routineNameMaxLength,
			required: true
		});
		const descError = validateLength(routineDesc, {
			label: "Routine description",
			max: VALIDATION_LIMITS.routineDescriptionMaxLength
		});
		if (nameError || descError) {
			setRoutineError(nameError || descError);
			return;
		}
		if (routineExercises.length === 0) {
			setRoutineError("Add at least one exercise.");
			return;
		}
		const payload = {
			name: routineName.trim(),
			description: routineDesc.trim(),
			exercises: routineExercises
		};
		if (editingRoutineId) await supabase.from("user_routines").update(payload).eq("id", editingRoutineId);
		else await supabase.from("user_routines").insert({
			...payload,
			user_id: userId
		});
		await loadUserRoutines(userId);
		closeRoutineBuilder();
	};
	const hideTemplate = (id) => {
		const updated = sanitizeHiddenTemplateIds([...hiddenTemplates, id], TEMPLATES.map((t) => t.id));
		setHiddenTemplates(updated);
		localStorage.setItem("hiddenTemplates", JSON.stringify(updated));
	};
	const deleteRoutine = async (id) => {
		await supabase.from("user_routines").delete().eq("id", id);
		setUserRoutines((prev) => prev.filter((r) => r.id !== id));
	};
	const toggleSelect = (id) => {
		setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
	};
	const fmtRest = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
	const fmtDur = (total) => {
		const minutes = Math.floor(total / 60);
		const secondsPart = total % 60;
		return `${minutes}:${String(secondsPart).padStart(2, "0")}`;
	};
	const fmtBattleMetric = (metric, value) => {
		if (value === null || value === void 0) return "—";
		const suffix = metric.display?.includes("min") && !metric.display?.includes("/") ? "" : metric.display?.includes("MET") ? "" : "x";
		return `${Number(value).toFixed(2)}${suffix}`;
	};
	const handleAddExercises = () => {
		if (pickerContext === "routine") {
			const toAdd = exerciseLibrary.filter((e) => selected.includes(e.id)).filter((e) => !routineExercises.find((r) => r.name === e.name)).map((e) => ({
				name: e.name,
				sets: 3
			}));
			setRoutineExercises((prev) => [...prev, ...toAdd]);
			closePicker();
			return;
		}
		const toAdd = exerciseLibrary.filter((e) => selected.includes(e.id)).filter((e) => !workoutExercises.find((p) => p.id === e.id)).map((e) => ({
			...e,
			sets: [e.category === "Cardio" ? defaultCardioSet() : defaultSet()],
			unit: defaultUnit,
			restSeconds: e.default_rest_seconds ?? defaultRest
		}));
		setWorkoutExercises((prev) => [...prev, ...toAdd]);
		closePicker();
		loadRecentExerciseHistory(toAdd, userId, sessionId);
		if (battleModeActive && userId && toAdd.length > 0) publishBattleEvent("exercise_added", {
			exerciseIds: toAdd.map((ex) => ex.id),
			exerciseNames: toAdd.map((ex) => ex.name),
			exerciseCategories: toAdd.map((ex) => ex.category)
		}).then(() => {
			refreshBattleProjection();
		}).catch((err) => {
			setBattleSyncError(err.message || "Could not sync your added exercises.");
		});
	};
	const closePicker = () => {
		setPickerExiting(true);
		setTimeout(() => {
			setShowExercises(false);
			setPickerExiting(false);
			setSelected([]);
			setSearchQuery("");
		}, 280);
	};
	const startFromTemplate = async (template) => {
		if (!userId) return;
		const [{ data, error }, { data: prof }] = await Promise.all([supabase.from("workout_sessions").insert({ user_id: userId }).select().single(), supabase.from("profiles").select("unit_preference").eq("id", userId).single()]);
		if (!error) setSessionId(data.id);
		const unit = prof?.unit_preference || "kg";
		workoutStartRef.current = Date.now();
		setDefaultUnit(unit);
		const exercises = template.exercises.map((t) => {
			const normalizedTemplateName = normalizeSearchValue(t.name);
			const found = exerciseLibrary.find((e) => normalizeSearchValue(e.name) === normalizedTemplateName) || exerciseLibrary.find((e) => matchesSearchQuery(t.name, e.name, e.category, e.equipment, (e.primary_muscles || []).join(" "), (e.secondary_muscles || []).join(" ")));
			if (!found) return null;
			return {
				...found,
				unit,
				restSeconds: found.default_rest_seconds ?? defaultRest,
				sets: Array.from({ length: t.sets }, () => defaultSet())
			};
		}).filter(Boolean);
		writeStoredWorkoutDraft(userId, {
			version: WORKOUT_DRAFT_VERSION,
			savedAt: Date.now(),
			sessionId: data?.id || null,
			startedAt: workoutStartRef.current,
			workoutExercises: exercises,
			exerciseNotes: {},
			notesOpen: {},
			restTimer: null,
			defaultUnit: unit,
			defaultRest
		}, battleModeActive ? battleRoom?.id : null);
		setWorkoutExercises(exercises);
		setActiveWorkout(true);
		loadRecentExerciseHistory(exercises, userId, data?.id || null);
	};
	const resumeSavedWorkout = (0, import_react.useCallback)(async () => {
		if (!savedWorkoutDraft || !userId || savedWorkoutDraftBusy) return;
		setSavedWorkoutDraftBusy(true);
		try {
			const { data: sessionRow, error } = await supabase.from("workout_sessions").select("id").eq("id", savedWorkoutDraft.sessionId).eq("user_id", userId).is("finished_at", null).maybeSingle();
			if (error || !sessionRow) {
				clearWorkoutDraft();
				setBattleSyncError("Your saved workout could not be resumed.");
				return;
			}
			const restoredStartedAt = savedWorkoutDraft.startedAt || Date.now();
			const restoredExercises = Array.isArray(savedWorkoutDraft.workoutExercises) ? normalizeWorkoutExercises(savedWorkoutDraft.workoutExercises) : [];
			const restoredRestTimer = savedWorkoutDraft.restTimer && getRemainingRestSeconds(savedWorkoutDraft.restTimer) > 0 ? savedWorkoutDraft.restTimer : null;
			workoutStartRef.current = restoredStartedAt;
			setSessionId(savedWorkoutDraft.sessionId);
			setDefaultUnit(savedWorkoutDraft.defaultUnit || defaultUnit);
			setDefaultRest(savedWorkoutDraft.defaultRest ?? defaultRest);
			setWorkoutExercises(restoredExercises);
			setExerciseNotes(savedWorkoutDraft.exerciseNotes || {});
			setNotesOpen(savedWorkoutDraft.notesOpen || {});
			setRestTimer(restoredRestTimer);
			setSeconds(Math.max(0, Math.floor((Date.now() - restoredStartedAt) / 1e3)));
			setActiveWorkout(true);
			setSavedWorkoutDraft(null);
			if (restoredRestTimer) scheduleRestEndNotification(getRemainingRestSeconds(restoredRestTimer), restoredRestTimer.exerciseName);
			if (restoredExercises.length > 0) loadRecentExerciseHistory(restoredExercises, userId, savedWorkoutDraft.sessionId);
		} finally {
			setSavedWorkoutDraftBusy(false);
		}
	}, [
		clearWorkoutDraft,
		defaultRest,
		defaultUnit,
		loadRecentExerciseHistory,
		savedWorkoutDraft,
		savedWorkoutDraftBusy,
		userId
	]);
	const discardSavedWorkout = async () => {
		if (!savedWorkoutDraft || !userId || savedWorkoutDraftBusy) return;
		setSavedWorkoutDraftBusy(true);
		try {
			const { error } = await supabase.from("workout_sessions").delete().eq("id", savedWorkoutDraft.sessionId).eq("user_id", userId);
			if (error) {
				setBattleSyncError(error.message || "Could not discard your saved workout.");
				return;
			}
			clearWorkoutDraft();
		} finally {
			setSavedWorkoutDraftBusy(false);
		}
	};
	function formatDraftSavedAt(timestamp) {
		if (!timestamp) return "Saved recently";
		const diffMs = Date.now() - timestamp;
		const diffMinutes = Math.max(0, Math.round(diffMs / 6e4));
		if (diffMinutes < 1) return "Saved just now";
		if (diffMinutes === 1) return "Saved 1 minute ago";
		if (diffMinutes < 60) return `Saved ${diffMinutes} minutes ago`;
		const diffHours = Math.round(diffMinutes / 60);
		if (diffHours === 1) return "Saved 1 hour ago";
		if (diffHours < 24) return `Saved ${diffHours} hours ago`;
		return `Saved on ${new Date(timestamp).toLocaleDateString()}`;
	}
	const filteredLibrary = (0, import_react.useMemo)(() => {
		if (!searchQuery.trim()) return exerciseLibrary;
		return exerciseLibrary.filter((e) => matchesSearchQuery(searchQuery, e.name, e.category, e.equipment, (e.primary_muscles || []).join(" "), (e.secondary_muscles || []).join(" "))).sort((a, b) => {
			const diff = scoreExerciseMatch(searchQuery, b) - scoreExerciseMatch(searchQuery, a);
			return diff !== 0 ? diff : a.name.length - b.name.length;
		});
	}, [exerciseLibrary, searchQuery]);
	const addSet = (exId) => {
		setWorkoutExercises((prev) => prev.map((ex) => {
			if (ex.id !== exId) return ex;
			const last = ex.sets[ex.sets.length - 1];
			const nextSet = ex.category === "Cardio" ? {
				...defaultCardioSet(),
				duration: last?.duration ?? 0
			} : {
				...defaultSet(),
				weight: last?.weight ?? "",
				reps: last?.reps ?? ""
			};
			return {
				...ex,
				sets: [...ex.sets, nextSet]
			};
		}));
	};
	const removeSet = (exId) => {
		const ex = workoutExercises.find((item) => item.id === exId);
		if (!ex || ex.sets.length === 1) return;
		const removedSetNumber = ex.sets.length;
		setWorkoutExercises((prev) => prev.map((item) => {
			if (item.id !== exId || item.sets.length === 1) return item;
			return {
				...item,
				sets: item.sets.slice(0, -1)
			};
		}));
		if (battleModeActive && userId) publishBattleEvent("set_removed", {
			exerciseId: ex.id,
			exerciseName: ex.name,
			category: ex.category,
			equipment: ex.equipment,
			setNumber: removedSetNumber,
			unit: ex.unit
		}).then(() => {
			refreshBattleProjection();
		}).catch((err) => {
			setBattleSyncError(err.message || "Could not sync your removed set.");
		});
	};
	const applyProgressionSuggestion = (exId, weight, reps) => {
		setWorkoutExercises((prev) => prev.map((ex) => {
			if (ex.id !== exId) return ex;
			const activeSetIndex = ex.sets.findIndex((set) => !set.done);
			if (activeSetIndex === -1) return ex;
			return {
				...ex,
				sets: ex.sets.map((set, index) => {
					if (index !== activeSetIndex) return set;
					return {
						...set,
						...weight !== null ? { weight: String(weight) } : {},
						...reps !== null ? { reps: String(reps) } : {}
					};
				})
			};
		}));
	};
	const updateSet = (exId, setIdx, field, value) => {
		let nextValue = value;
		if (field === "reps") if (value === "") nextValue = "";
		else {
			const parsed = Number.parseInt(value, 10);
			if (Number.isNaN(parsed)) return;
			nextValue = String(Math.max(0, Math.min(MAX_REPS, parsed)));
		}
		let completedSetPayload = null;
		setWorkoutExercises((prev) => prev.map((ex) => {
			if (ex.id !== exId) return ex;
			if (field === "done") {
				if (value === true) {
					if (ex.category === "Cardio") {
						const duration = Number(ex.sets[setIdx]?.duration) || 0;
						if (duration <= 0) return ex;
						const nextExercise = markExerciseSetCompleted(ex, setIdx, {
							completedAtMs: Date.now(),
							deriveRest: false
						});
						completedSetPayload = {
							ex: nextExercise,
							setIdx,
							duration,
							isCardio: true
						};
						return nextExercise;
					}
					const completedSet = ex.sets[setIdx];
					const weight = Number.parseFloat(completedSet.weight);
					const reps = Number.parseInt(completedSet.reps, 10);
					const validWeight = isWeightWithinInputRange(weight, {
						equipment: ex.equipment,
						unit: ex.unit,
						bodyweightKg: userBodyweightKg
					});
					const validReps = isRepsWithinInputRange(reps);
					if (!validWeight || !validReps) return ex;
					const nextExercise = markExerciseSetCompleted(ex, setIdx, {
						completedAtMs: Date.now(),
						deriveRest: true
					});
					completedSetPayload = {
						ex: nextExercise,
						setIdx,
						weight,
						reps
					};
					return nextExercise;
				}
				return clearExerciseSetCompletion(ex, setIdx);
			}
			const sets = ex.sets.map((set, index) => index === setIdx ? {
				...set,
				[field]: nextValue
			} : set);
			return {
				...ex,
				sets
			};
		}));
		if (completedSetPayload) {
			if (!completedSetPayload.isCardio) {
				setRestTimer(createRestTimer(completedSetPayload.ex.restSeconds, completedSetPayload.ex.name));
				scheduleRestEndNotification(completedSetPayload.ex.restSeconds, completedSetPayload.ex.name);
			}
			if (battleModeActive && userId) publishBattleEvent("set_completed", completedSetPayload.isCardio ? {
				exerciseId: completedSetPayload.ex.id,
				exerciseName: completedSetPayload.ex.name,
				category: completedSetPayload.ex.category,
				equipment: completedSetPayload.ex.equipment,
				setNumber: completedSetPayload.setIdx + 1,
				durationSeconds: completedSetPayload.duration
			} : {
				exerciseId: completedSetPayload.ex.id,
				exerciseName: completedSetPayload.ex.name,
				category: completedSetPayload.ex.category,
				equipment: completedSetPayload.ex.equipment,
				setNumber: completedSetPayload.setIdx + 1,
				weight: completedSetPayload.weight,
				reps: completedSetPayload.reps,
				unit: completedSetPayload.ex.unit
			}).then(() => {
				refreshBattleProjection();
			}).catch((err) => {
				setBattleSyncError(err.message || "Could not sync your completed set.");
			});
		}
	};
	const removeExercise = (exId) => {
		setWorkoutExercises((prev) => prev.filter((ex) => ex.id !== exId));
	};
	function toggleBattleFeed() {
		setBattleFeedHidden((prev) => {
			const next = !prev;
			try {
				localStorage.setItem("battleFeedHidden", next ? "1" : "0");
			} catch {}
			return next;
		});
	}
	const customExerciseCategoryOptions = (0, import_react.useMemo)(() => {
		const categories = new Set(exerciseLibrary.map((exercise) => exercise.category).filter(Boolean));
		categories.add("Custom");
		return [...categories].sort((a, b) => a.localeCompare(b));
	}, [exerciseLibrary]);
	function resetCustomExerciseForm() {
		setCustomExerciseForm({
			name: "",
			category: customExerciseCategoryOptions[0] || "Custom",
			equipment: "Bodyweight",
			primary_muscles: [],
			secondary_muscles: [],
			default_rest_seconds: defaultRest
		});
		setCustomExerciseError("");
	}
	function toggleMuscleSelection(field, muscle) {
		setCustomExerciseForm((prev) => {
			const current = prev[field];
			const exists = current.includes(muscle);
			const next = exists ? current.filter((item) => item !== muscle) : [...current, muscle];
			let siblingField = field === "primary_muscles" ? "secondary_muscles" : "primary_muscles";
			let sibling = prev[siblingField];
			if (!exists && sibling.includes(muscle)) sibling = sibling.filter((item) => item !== muscle);
			return {
				...prev,
				[field]: next,
				[siblingField]: sibling
			};
		});
	}
	async function handleSaveCustomExercise() {
		if (!userId) return;
		const name = customExerciseForm.name.trim();
		const category = customExerciseForm.category.trim();
		const nameError = validateLength(name, {
			label: "Exercise name",
			min: VALIDATION_LIMITS.customExerciseNameMinLength,
			max: VALIDATION_LIMITS.customExerciseNameMaxLength,
			required: true
		});
		const restError = validateNumber(customExerciseForm.default_rest_seconds, {
			label: "Rest time",
			min: VALIDATION_LIMITS.restSecondsMin,
			max: VALIDATION_LIMITS.restSecondsMax,
			integer: true,
			required: true
		});
		if (nameError || !category || restError) {
			setCustomExerciseError(nameError || (!category ? "Name and category are required." : "") || restError);
			return;
		}
		if (customExerciseForm.primary_muscles.length === 0) {
			setCustomExerciseError("Pick at least one primary muscle.");
			return;
		}
		setSavingCustomExercise(true);
		setCustomExerciseError("");
		try {
			const created = await createCustomExercise(userId, {
				name,
				category,
				equipment: customExerciseForm.equipment,
				primary_muscles: customExerciseForm.primary_muscles,
				secondary_muscles: customExerciseForm.secondary_muscles,
				default_rest_seconds: Number(customExerciseForm.default_rest_seconds)
			});
			setExerciseLibrary((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
			if (pickerContext === "routine") setRoutineExercises((prev) => [...prev, {
				name: created.name,
				sets: 3
			}]);
			else {
				const customExercise = {
					...created,
					sets: [created.category === "Cardio" ? defaultCardioSet() : defaultSet()],
					unit: defaultUnit,
					restSeconds: created.default_rest_seconds ?? defaultRest
				};
				setWorkoutExercises((prev) => [...prev, customExercise]);
				loadRecentExerciseHistory([customExercise], userId, sessionId);
			}
			resetCustomExerciseForm();
			setShowCustomExerciseForm(false);
			closePicker();
			setSearchQuery("");
		} catch (err) {
			setCustomExerciseError(err.code === "23505" ? "You already have an exercise with that name." : err.message || "Could not save your custom exercise.");
		} finally {
			setSavingCustomExercise(false);
		}
	}
	const handleTouchStart = (exId, idx, e) => {
		cancelAnimationFrame(swipeRafRef.current);
		swipeRef.current = {
			exId,
			idx,
			startX: e.touches[0].clientX,
			dx: 0
		};
		setSwipeState({
			exId,
			idx,
			dx: 0
		});
	};
	const handleTouchMove = (exId, idx, e) => {
		const ref = swipeRef.current;
		if (!ref || ref.exId !== exId || ref.idx !== idx) return;
		ref.dx = Math.min(0, e.touches[0].clientX - ref.startX);
		cancelAnimationFrame(swipeRafRef.current);
		swipeRafRef.current = requestAnimationFrame(() => {
			if (swipeRef.current?.exId === exId && swipeRef.current?.idx === idx) setSwipeState({
				exId,
				idx,
				dx: swipeRef.current.dx
			});
		});
	};
	const handleTouchEnd = (exId, idx) => {
		cancelAnimationFrame(swipeRafRef.current);
		const dx = swipeRef.current?.dx || 0;
		swipeRef.current = null;
		setSwipeState(null);
		if (dx < -(window.innerWidth * .7)) {
			const ex = workoutExercises.find((item) => item.id === exId);
			setWorkoutExercises((exs) => exs.map((ex) => {
				if (ex.id !== exId || ex.sets.length === 1) return ex;
				return {
					...ex,
					sets: ex.sets.filter((_, j) => j !== idx)
				};
			}));
			if (battleModeActive && userId && ex && ex.sets.length > 1) publishBattleEvent("set_removed", {
				exerciseId: ex.id,
				exerciseName: ex.name,
				category: ex.category,
				equipment: ex.equipment,
				setNumber: idx + 1,
				unit: ex.unit
			}).then(() => {
				refreshBattleProjection();
			}).catch((err) => {
				setBattleSyncError(err.message || "Could not sync your removed set.");
			});
		}
	};
	const handleTemplateTouchStart = (id, e) => {
		templateSwipeRef.current = {
			id,
			startX: e.touches[0].clientX,
			dx: 0
		};
		setTemplateSwipeState({
			id,
			dx: 0
		});
	};
	const handleTemplateTouchMove = (id, e) => {
		const ref = templateSwipeRef.current;
		if (!ref || ref.id !== id) return;
		const dx = Math.min(0, e.touches[0].clientX - ref.startX);
		ref.dx = dx;
		setTemplateSwipeState({
			id,
			dx
		});
	};
	const handleTemplateTouchEnd = (id, onDelete) => {
		const dx = templateSwipeRef.current?.dx || 0;
		templateSwipeRef.current = null;
		setTemplateSwipeState(null);
		if (dx < -(window.innerWidth * .8)) onDelete();
	};
	const updateRestTime = async (exId, seconds) => {
		setWorkoutExercises((prev) => prev.map((e) => e.id === exId ? {
			...e,
			restSeconds: seconds
		} : e));
		setExerciseLibrary((prev) => prev.map((e) => e.id === exId ? {
			...e,
			default_rest_seconds: seconds
		} : e));
		setEditingRest(null);
		await supabase.from("user_exercise_preferences").upsert({
			user_id: userId,
			exercise_id: exId,
			rest_seconds: seconds
		}, { onConflict: "user_id,exercise_id" });
	};
	if (detailExerciseId) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
		fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExerciseDetail, {
			exerciseId: detailExerciseId,
			onBack: () => setDetailExerciseId(null)
		})
	});
	const remoteWorkouts = buildRemoteWorkouts(battleEvents, exerciseLibrary, battleRoom?.opponentProfile ? [{
		user_id: battleRoom.opponentId,
		profile: battleRoom.opponentProfile
	}] : []);
	if (showCustomExerciseForm) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "picker-page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "picker-sticky-top",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "picker-header",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "back-btn",
						onClick: () => {
							setShowCustomExerciseForm(false);
							setCustomExerciseError("");
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
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "picker-title",
						children: "Custom Exercise"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "add-selected-btn",
						onClick: handleSaveCustomExercise,
						disabled: savingCustomExercise,
						children: savingCustomExercise ? "Saving..." : "Save"
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "picker-list custom-exercise-form",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "picker-search",
					type: "text",
					placeholder: "Exercise name",
					value: customExerciseForm.name,
					maxLength: VALIDATION_LIMITS.customExerciseNameMaxLength,
					onChange: (e) => {
						setCustomExerciseError("");
						setCustomExerciseForm((prev) => ({
							...prev,
							name: e.target.value
						}));
					},
					autoFocus: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "custom-field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Category" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "custom-select",
						value: customExerciseForm.category,
						onChange: (e) => setCustomExerciseForm((prev) => ({
							...prev,
							category: e.target.value
						})),
						children: customExerciseCategoryOptions.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: option,
							children: option
						}, option))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "custom-form-grid",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "custom-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Equipment" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "custom-select",
							value: customExerciseForm.equipment,
							onChange: (e) => setCustomExerciseForm((prev) => ({
								...prev,
								equipment: e.target.value
							})),
							children: CUSTOM_EQUIPMENT_OPTIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: option,
								children: option
							}, option))
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "custom-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Default Rest (sec)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "picker-search custom-number",
							type: "number",
							min: VALIDATION_LIMITS.restSecondsMin,
							max: VALIDATION_LIMITS.restSecondsMax,
							step: "1",
							inputMode: "numeric",
							value: customExerciseForm.default_rest_seconds,
							onChange: (e) => {
								setCustomExerciseError("");
								setCustomExerciseForm((prev) => ({
									...prev,
									default_rest_seconds: e.target.value
								}));
							}
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "custom-muscle-group",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "custom-muscle-title",
						children: "Primary Muscles"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "custom-muscle-chips",
						children: SUPPORTED_MUSCLES.map((muscle) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `custom-muscle-chip ${customExerciseForm.primary_muscles.includes(muscle) ? "active" : ""}`,
							onClick: () => toggleMuscleSelection("primary_muscles", muscle),
							children: muscle
						}, `primary-${muscle}`))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "custom-muscle-group",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "custom-muscle-title",
						children: "Secondary Muscles"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "custom-muscle-chips",
						children: SUPPORTED_MUSCLES.map((muscle) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `custom-muscle-chip secondary ${customExerciseForm.secondary_muscles.includes(muscle) ? "active" : ""}`,
							onClick: () => toggleMuscleSelection("secondary_muscles", muscle),
							children: muscle
						}, `secondary-${muscle}`))
					})]
				}),
				customExerciseError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-panel-error",
					children: customExerciseError
				})
			]
		})]
	});
	if (showExercises) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `picker-page picker-page-exercises${pickerExiting ? " picker-page-exit" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "picker-sticky-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "picker-header",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "back-btn",
						onClick: closePicker,
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
						children: "Select Exercises"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "add-selected-btn",
						onClick: handleAddExercises,
						disabled: selected.length === 0,
						style: {
							opacity: selected.length === 0 ? 0 : 1,
							pointerEvents: selected.length === 0 ? "none" : "auto"
						},
						children: [
							"Add (",
							selected.length,
							")"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "battle-panel-toggle",
						onClick: () => {
							resetCustomExerciseForm();
							setShowCustomExerciseForm(true);
						},
						children: "Custom"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "picker-search",
				type: "text",
				placeholder: "Search exercises...",
				value: searchQuery,
				onChange: (e) => setSearchQuery(e.target.value),
				maxLength: VALIDATION_LIMITS.searchMaxLength
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "exercise-list picker-list",
			children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true }) : filteredLibrary.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					color: "var(--muted)",
					textAlign: "center",
					padding: "40px 0"
				},
				children: "No exercises found"
			}) : filteredLibrary.map((ex, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `exercise-item ${selected.includes(ex.id) ? "selected" : ""}`,
				style: { "--exercise-enter-delay": `${Math.min(index, 10) * 42}ms` },
				onClick: () => toggleSelect(ex.id),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "exercise-item-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `exercise-checkbox ${selected.includes(ex.id) ? "checked" : ""}`,
						children: selected.includes(ex.id) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							width: "12",
							height: "12",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "white",
							strokeWidth: "3",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "20 6 9 17 4 12" })
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "exercise-name",
						children: ex.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "exercise-category",
						children: [
							ex.category,
							" · ",
							ex.equipment
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "info-btn",
					onClick: (e) => {
						e.stopPropagation();
						setDetailExerciseId(ex.id);
					},
					children: "i"
				})]
			}, ex.id))
		})]
	});
	if (showRoutineBuilder) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "picker-page",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "picker-sticky-top",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "picker-header",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "back-btn",
							onClick: closeRoutineBuilder,
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
							children: editingRoutineId ? "Edit Routine" : "Create Routine"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "add-selected-btn",
							onClick: saveRoutine,
							disabled: !routineName.trim() || routineExercises.length === 0,
							style: { opacity: !routineName.trim() || routineExercises.length === 0 ? .4 : 1 },
							children: "Save"
						})
					]
				}),
				routineError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-panel-error",
					children: routineError
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "picker-search",
					type: "text",
					placeholder: "Routine name...",
					value: routineName,
					maxLength: VALIDATION_LIMITS.routineNameMaxLength,
					onChange: (e) => {
						setRoutineError("");
						setRoutineName(e.target.value);
					},
					autoFocus: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "picker-search",
					style: { marginTop: 8 },
					type: "text",
					placeholder: "Description (optional)...",
					value: routineDesc,
					maxLength: VALIDATION_LIMITS.routineDescriptionMaxLength,
					onChange: (e) => {
						setRoutineError("");
						setRoutineDesc(e.target.value);
					}
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "picker-list",
			children: [routineExercises.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					color: "var(--muted)",
					textAlign: "center",
					padding: "32px 0",
					fontSize: 14
				},
				children: "No exercises added yet"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DndContext, {
				sensors,
				collisionDetection: closestCenter,
				onDragEnd: ({ active, over }) => {
					if (!over || active.id === over.id) return;
					setRoutineExercises((prev) => {
						return arrayMove(prev, prev.findIndex((e) => e.name === active.id), prev.findIndex((e) => e.name === over.id));
					});
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableContext, {
					items: routineExercises.map((e) => e.name),
					strategy: verticalListSortingStrategy,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "routine-exercise-list",
						children: routineExercises.map((ex, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableRoutineRow, {
							name: ex.name,
							children: ({ listeners, attributes }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "routine-exercise-row",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											position: "relative",
											flexShrink: 0
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "routine-drag-handle",
											...listeners,
											...attributes,
											onClick: () => showDragHint(ex.name),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
												width: "14",
												height: "14",
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
														x1: "8",
														y1: "6",
														x2: "16",
														y2: "6"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
														x1: "8",
														y1: "12",
														x2: "16",
														y2: "12"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
														x1: "8",
														y1: "18",
														x2: "16",
														y2: "18"
													})
												]
											})
										}), dragHintKey === ex.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "drag-hint-bubble",
											children: "Hold & drag to reorder"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "routine-exercise-name",
										children: ex.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "set-controls",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "set-ctrl-btn",
												onClick: () => setRoutineExercises((prev) => prev.map((e, j) => j === i ? {
													...e,
													sets: Math.max(1, e.sets - 1)
												} : e)),
												children: "−"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "set-count",
												children: [ex.sets, " sets"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "set-ctrl-btn add",
												onClick: () => setRoutineExercises((prev) => prev.map((e, j) => j === i ? {
													...e,
													sets: e.sets + 1
												} : e)),
												children: "+"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "routine-remove-btn",
										onClick: () => setRoutineExercises((prev) => prev.filter((_, j) => j !== i)),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
											width: "14",
											height: "14",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
												x1: "18",
												y1: "6",
												x2: "6",
												y2: "18"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
												x1: "6",
												y1: "6",
												x2: "18",
												y2: "18"
											})]
										})
									})
								]
							})
						}, ex.name))
					})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "empty-workout-btn",
				style: { marginTop: 12 },
				onClick: () => {
					setPickerContext("routine");
					setShowExercises(true);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: "20",
					height: "20",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "var(--blue)",
					strokeWidth: "2",
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
				}), "Add Exercise"]
			})]
		})]
	});
	if (activeWorkout) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "workout-screen",
			style: restTimer ? { paddingBottom: 190 } : {},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "timer-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "timer-label",
						children: "Workout in progress"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "timer-clock",
						children: formatTime(seconds)
					})]
				}),
				battleModeActive && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "battle-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "battle-panel-head",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-panel-eyebrow",
									children: "Battle Mode"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-panel-title",
									children: `Training with ${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || "friend"}`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "battle-panel-mode",
									children: [getBattleModeLabel(battleRoom.battle_mode), " battle"]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "battle-panel-head-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "battle-panel-toggle",
									onClick: toggleBattleFeed,
									children: battleFeedHidden ? "Show feed" : "Hide feed"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-panel-status",
									children: "Live"
								})]
							})]
						}),
						battleProjection && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "battle-projection-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "battle-projection-top",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-panel-card-label",
									children: "Projected Score"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-panel-card-body",
									children: battleProjection.status === "waiting" ? "Live projection until both workouts finish." : battleProjection.verdict
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "battle-projection-score",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: battleProjection.points?.you ?? 0 }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: ":" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: battleProjection.points?.opponent ?? 0 })
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-projection-metrics",
								children: battleProjection.metrics?.map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "battle-projection-metric",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: metric.winner === "you" ? "is-leading" : "",
											children: metric.available ? fmtBattleMetric(metric, metric.yourValue) : "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: metric.label }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: metric.winner === "opponent" ? "is-leading" : "",
											children: metric.available ? fmtBattleMetric(metric, metric.opponentValue) : "—"
										})
									]
								}, metric.id))
							})]
						}),
						!battleFeedHidden && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "battle-panel-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "battle-opponent-card-head",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "battle-panel-card-label",
										children: "Opponent Workout"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "battle-panel-card-body",
										children: `${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || "Your opponent"}'s logged exercises and completed sets.`
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "battle-readonly-badge",
										children: "Their sets"
									})]
								}),
								remoteWorkouts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-feed-empty",
									children: "Your friend has not logged anything yet."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-opponent-workout",
									children: remoteWorkouts.map((workout) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "battle-remote-card",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "battle-remote-card-header",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "battle-readonly-label-row",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "battle-readonly-pill",
													children: workout.name
												}), workout.status !== "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `battle-readonly-subtle battle-remote-status-${workout.status}`,
													children: workout.status === "finished" ? "Finished" : "Left"
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "battle-panel-card-body",
												children: workout.exercises.length === 0 ? "No logged exercises yet." : `${workout.exercises.length} exercise${workout.exercises.length === 1 ? "" : "s"} in progress`
											})] })
										}), workout.exercises.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "battle-readonly-empty",
											children: "Waiting for the first exercise."
										}) : workout.exercises.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "exercise-block battle-readonly-exercise",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "exercise-block-header",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															flex: 1,
															minWidth: 0
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "exercise-block-name",
															children: ex.name
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "exercise-category",
															children: ex.category
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															alignItems: "center",
															gap: 10
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "unit-toggle battle-readonly-unit-toggle",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																className: `unit-btn ${ex.unit === "kg" ? "active" : ""}`,
																type: "button",
																tabIndex: -1,
																children: "kg"
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																className: `unit-btn ${ex.unit === "lbs" ? "active" : ""}`,
																type: "button",
																tabIndex: -1,
																children: "lbs"
															})]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "set-count battle-readonly-set-count",
															children: [ex.sets.length, " sets"]
														})]
													})]
												}),
												ex.category === "Cardio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "set-row header-row",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-set",
															children: "Entry"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-prev",
															children: "Previous"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-kg",
															children: "Duration"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "col-reps" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "col-done" })
													]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "set-row header-row",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-set",
															children: "Set"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-prev",
															children: "Previous"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-kg",
															children: ex.unit
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-reps",
															children: "Reps"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "col-done" })
													]
												}),
												ex.sets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "battle-readonly-empty",
													children: "Exercise added. Waiting for the first logged set."
												}) : ex.sets.map((set, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "set-row-wrapper",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "set-row done battle-readonly-row",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "col-set",
																children: index + 1
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "col-prev",
																children: "—"
															}),
															ex.category === "Cardio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "col-kg set-input battle-readonly-input",
																children: fmtDur(Number(set.duration) || 0)
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "col-reps set-input battle-readonly-input",
																children: "—"
															})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "col-kg set-input battle-readonly-input",
																children: set.weight || 0
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "col-reps set-input battle-readonly-input",
																children: set.reps || 0
															})] }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "col-done done-btn checked battle-readonly-done",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
																	width: "14",
																	height: "14",
																	viewBox: "0 0 24 24",
																	fill: "none",
																	stroke: "currentColor",
																	strokeWidth: "3",
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "20 6 9 17 4 12" })
																})
															})
														]
													})
												}, `${workout.userId}-${ex.key}-${index}`))
											]
										}, `${workout.userId}-${ex.key}`))]
									}, workout.userId))
								}),
								battleSyncError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "battle-panel-error",
									children: battleSyncError
								})
							]
						})
					]
				}),
				battleNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-room-notice",
					children: battleNotice
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DndContext, {
					sensors,
					collisionDetection: closestCenter,
					measuring: { droppable: { strategy: MeasuringStrategy.Always } },
					onDragEnd: ({ active, over }) => {
						if (!over || active.id === over.id) return;
						setWorkoutExercises((prev) => {
							const oldIdx = prev.findIndex((exercise) => exercise.id === active.id);
							const newIdx = prev.findIndex((exercise) => exercise.id === over.id);
							if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
							return arrayMove(prev, oldIdx, newIdx);
						});
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableContext, {
						items: workoutExercises.map((e) => e.id),
						strategy: verticalListSortingStrategy,
						children: workoutExercises.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableExerciseBlock, {
							id: ex.id,
							children: ({ listeners, attributes }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "exercise-block",
								"data-tab-swipe-ignore": "true",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "remove-exercise-btn",
										onClick: () => setDeleteConfirmExId(ex.id),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
											width: "11",
											height: "11",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "3 6 5 6 21 6" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })
											]
										})
									}),
									deleteConfirmExId === ex.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "exercise-delete-confirm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "exercise-delete-confirm-text",
											children: "Remove exercise?"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "exercise-delete-confirm-actions",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "exercise-delete-cancel",
												onClick: () => setDeleteConfirmExId(null),
												children: "Cancel"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "exercise-delete-remove",
												onClick: () => {
													removeExercise(ex.id);
													setDeleteConfirmExId(null);
												},
												children: "Remove"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "exercise-block-header",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													position: "relative",
													flexShrink: 0
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: "drag-handle",
													...listeners,
													...attributes,
													onClick: () => showDragHint(ex.id),
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
														width: "16",
														height: "16",
														viewBox: "0 0 24 24",
														fill: "none",
														stroke: "currentColor",
														strokeWidth: "2",
														strokeLinecap: "round",
														strokeLinejoin: "round",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
																x1: "8",
																y1: "6",
																x2: "16",
																y2: "6"
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
																x1: "8",
																y1: "12",
																x2: "16",
																y2: "12"
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
																x1: "8",
																y1: "18",
																x2: "16",
																y2: "18"
															})
														]
													})
												}), dragHintKey === ex.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "drag-hint-bubble",
													children: "Hold & drag to reorder"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													flex: 1,
													minWidth: 0
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "exercise-block-name",
													children: ex.name
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "exercise-category",
													children: [ex.category, (ex.equipment === "Dumbbell" || ex.name === "Cable Lateral Raise") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "db-per-hint-inline",
														children: " · log 1 side"
													})]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													alignItems: "center",
													gap: 10
												},
												children: [ex.category !== "Cardio" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "unit-toggle",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: `unit-btn ${ex.unit === "kg" ? "active" : ""}`,
														onClick: () => {
															if (ex.unit === "kg") return;
															setWorkoutExercises((prev) => prev.map((e) => e.id === ex.id ? {
																...e,
																unit: "kg",
																sets: e.sets.map((s) => ({
																	...s,
																	weight: Math.round(s.weight * .453592 * 10) / 10
																}))
															} : e));
														},
														children: "kg"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: `unit-btn ${ex.unit === "lbs" ? "active" : ""}`,
														onClick: () => {
															if (ex.unit === "lbs") return;
															setWorkoutExercises((prev) => prev.map((e) => e.id === ex.id ? {
																...e,
																unit: "lbs",
																sets: e.sets.map((s) => ({
																	...s,
																	weight: Math.round(s.weight * 2.20462 * 10) / 10
																}))
															} : e));
														},
														children: "lbs"
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "set-controls",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "set-ctrl-btn",
															onClick: () => removeSet(ex.id),
															children: "−"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "set-count",
															children: [
																ex.sets.length,
																" ",
																ex.category === "Cardio" ? "entries" : "sets"
															]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "set-ctrl-btn add",
															onClick: () => addSet(ex.id),
															children: "+"
														})
													]
												})]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rest-time-row",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "rest-time-label",
												children: "Rest"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "rest-time-btn",
												onClick: () => setEditingRest(editingRest === ex.id ? null : ex.id),
												children: fmtRest(ex.restSeconds)
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													marginLeft: "auto",
													display: "flex",
													alignItems: "center",
													gap: 6
												},
												children: [editingRest === ex.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: "rest-done-btn",
													style: { marginLeft: 0 },
													onClick: () => updateRestTime(ex.id, ex.restSeconds),
													children: "Done"
												}), ex.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: "info-btn info-btn-sm",
													onClick: (e) => {
														e.stopPropagation();
														setDetailExerciseId(ex.id);
													},
													children: "i"
												})]
											})
										]
									}),
									editingRest === ex.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "rest-wheel-panel",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RestTimePicker, {
											value: ex.restSeconds,
											onChange: (s) => setWorkoutExercises((prev) => prev.map((e) => e.id === ex.id ? {
												...e,
												restSeconds: s
											} : e))
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										className: `exercise-notes-toggle ${notesOpen[ex.id] ? "open" : ""}`,
										onClick: () => setNotesOpen((prev) => ({
											...prev,
											[ex.id]: !prev[ex.id]
										})),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
												width: "13",
												height: "13",
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "14 2 14 8 20 8" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
														x1: "16",
														y1: "13",
														x2: "8",
														y2: "13"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
														x1: "16",
														y1: "17",
														x2: "8",
														y2: "17"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "10 9 9 9 8 9" })
												]
											}),
											"Notes",
											exerciseNotes[ex.id] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "notes-dot" })
										]
									}),
									notesOpen[ex.id] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										className: "exercise-notes-input",
										placeholder: "Add notes for this exercise...",
										value: exerciseNotes[ex.id] || "",
										onChange: (e) => setExerciseNotes((prev) => ({
											...prev,
											[ex.id]: e.target.value
										})),
										maxLength: VALIDATION_LIMITS.exerciseNoteMaxLength,
										rows: 3
									}),
									ex.category !== "Cardio" && progressionMap[ex.id] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressionSuggestion, {
										suggestion: progressionMap[ex.id],
										unitPreference: ex.unit,
										onApply: (weight, reps) => applyProgressionSuggestion(ex.id, weight, reps)
									}),
									ex.category === "Cardio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "set-row cardio-row header-row",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "col-set",
												children: "Set"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "col-prev",
												children: "Previous"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "col-kg",
												children: "Duration"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "col-done" })
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "set-row header-row",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "col-set",
												children: "Set"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "col-prev",
												children: "Previous"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "col-kg",
												children: [ex.unit, (ex.equipment === "Dumbbell" || ex.name === "Cable Lateral Raise") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "db-per-hint",
													children: "per side"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "col-reps",
												children: "Reps"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "col-done" })
										]
									}),
									ex.sets.map((s, i) => {
										const isActive = swipeState?.exId === ex.id && swipeState?.idx === i;
										const dx = isActive ? swipeState.dx : 0;
										const deleteBg = dx < -20 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "set-row-delete-bg",
											style: { width: Math.abs(dx) },
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
												style: {
													width: Math.min(20, Math.abs(dx) * .25),
													height: Math.min(20, Math.abs(dx) * .25)
												},
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "white",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "3 6 5 6 21 6" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })
												]
											})
										});
										const swipeProps = {
											onTouchStart: (e) => handleTouchStart(ex.id, i, e),
											onTouchMove: (e) => handleTouchMove(ex.id, i, e),
											onTouchEnd: () => handleTouchEnd(ex.id, i),
											onTouchCancel: () => {
												cancelAnimationFrame(swipeRafRef.current);
												swipeRef.current = null;
												setSwipeState(null);
											}
										};
										const rowStyle = {
											transform: `translateX(${dx}px)`,
											transition: isActive ? "none" : "transform 0.2s ease"
										};
										if (ex.category === "Cardio") {
											const isPickerOpen = editingCardioDuration?.exId === ex.id && editingCardioDuration?.idx === i;
											const durSecs = Number(s.duration) || 0;
											const durationValid = durSecs > 0;
											const durHrs = Math.floor(durSecs / 3600);
											const durMins = Math.floor(durSecs % 3600 / 60);
											const durSecRem = durSecs % 60;
											const fmtDur = (total) => {
												const h = Math.floor(total / 3600);
												const m = Math.floor(total % 3600 / 60);
												const sc = total % 60;
												if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}`;
												return `${m}:${String(sc).padStart(2, "0")}`;
											};
											const setDur = (total) => updateSet(ex.id, i, "duration", Math.max(0, Math.min(VALIDATION_LIMITS.cardioDurationMaxSeconds, total)));
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "set-row-wrapper",
												...swipeProps,
												children: [
													deleteBg,
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: `set-row cardio-row ${s.done ? "done" : ""}`,
														style: rowStyle,
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "col-set",
																children: i + 1
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "col-prev",
																children: (() => {
																	const p = prevSetsMap[ex.id]?.[i];
																	if (!p || !p.duration_seconds) return "—";
																	return fmtDur(p.duration_seconds);
																})()
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																className: `cardio-duration-btn${isPickerOpen ? " open" : ""}`,
																disabled: s.done,
																onClick: () => setEditingCardioDuration(isPickerOpen ? null : {
																	exId: ex.id,
																	idx: i
																}),
																children: durationValid ? fmtDur(durSecs) : "0:00"
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																className: `col-done done-btn ${s.done ? "checked" : ""}`,
																disabled: !s.done && !durationValid,
																onClick: () => {
																	updateSet(ex.id, i, "done", !s.done);
																	setEditingCardioDuration(null);
																},
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
																	width: "14",
																	height: "14",
																	viewBox: "0 0 24 24",
																	fill: "none",
																	stroke: "currentColor",
																	strokeWidth: "3",
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "20 6 9 17 4 12" })
																})
															})
														]
													}),
													isPickerOpen && !s.done && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "cardio-duration-panel",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "rtp",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "rtp-unit",
																	children: [
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																			className: "rtp-btn",
																			onClick: () => setDur((durHrs + 1) * 3600 + durMins * 60 + durSecRem),
																			children: "+"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "rtp-val",
																			children: durHrs
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																			className: "rtp-btn",
																			onClick: () => setDur(Math.max(0, durHrs - 1) * 3600 + durMins * 60 + durSecRem),
																			children: "−"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "rtp-label",
																			children: "hr"
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
																			onClick: () => {
																				const nm = durMins + 1 >= 60 ? 0 : durMins + 1;
																				setDur((durMins + 1 >= 60 ? durHrs + 1 : durHrs) * 3600 + nm * 60 + durSecRem);
																			},
																			children: "+"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "rtp-val",
																			children: durMins
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																			className: "rtp-btn",
																			onClick: () => {
																				const nm = durMins - 1 < 0 ? durHrs > 0 ? 59 : 0 : durMins - 1;
																				setDur((durMins - 1 < 0 ? Math.max(0, durHrs - 1) : durHrs) * 3600 + nm * 60 + durSecRem);
																			},
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
																			onClick: () => {
																				const ns = durSecRem + 5 >= 60 ? 0 : durSecRem + 5;
																				const nm = durSecRem + 5 >= 60 ? durMins + 1 >= 60 ? 0 : durMins + 1 : durMins;
																				setDur((durSecRem + 5 >= 60 && durMins + 1 >= 60 ? durHrs + 1 : durHrs) * 3600 + nm * 60 + ns);
																			},
																			children: "+"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "rtp-val",
																			children: String(durSecRem).padStart(2, "0")
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																			className: "rtp-btn",
																			onClick: () => {
																				const ns = durSecRem - 5 < 0 ? 55 : durSecRem - 5;
																				const nm = durSecRem - 5 < 0 ? durMins - 1 < 0 ? durHrs > 0 ? 59 : 0 : durMins - 1 : durMins;
																				setDur((durSecRem - 5 < 0 && durMins - 1 < 0 ? Math.max(0, durHrs - 1) : durHrs) * 3600 + nm * 60 + ns);
																			},
																			children: "−"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "rtp-label",
																			children: "sec"
																		})
																	]
																})
															]
														})
													})
												]
											}, i);
										}
										const enteredWeight = Number.parseFloat(s.weight);
										const enteredReps = Number.parseInt(s.reps, 10);
										const weightValid = isWeightWithinInputRange(enteredWeight, {
											equipment: ex.equipment,
											unit: ex.unit,
											bodyweightKg: userBodyweightKg
										});
										const repsValid = isRepsWithinInputRange(enteredReps);
										const minWeight = getWeightInputMin(ex.equipment, ex.unit, userBodyweightKg);
										const maxWeight = getWeightInputMax(ex.equipment, ex.unit);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "set-row-wrapper",
											...swipeProps,
											children: [deleteBg, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `set-row ${s.done ? "done" : ""} ${PLATE_EQUIPMENT.has(ex.equipment) ? "plate-row" : ""}`,
												style: rowStyle,
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "col-set",
														children: i + 1
													}),
													(() => {
														const p = prevSetsMap[ex.id]?.[i];
														if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "col-prev",
															children: "—"
														});
														const w = p.unit === ex.unit ? p.weight : p.unit === "lbs" ? Math.round(p.weight * .453592 * 10) / 10 : Math.round(p.weight * 2.20462 * 10) / 10;
														return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
															className: "col-prev col-prev-btn",
															disabled: s.done,
															onClick: () => {
																updateSet(ex.id, i, "weight", String(w));
																updateSet(ex.id, i, "reps", String(p.reps));
															},
															children: [
																w,
																" × ",
																p.reps
															]
														});
													})(),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "col-kg-wrap",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															className: "set-input",
															type: "number",
															inputMode: minWeight < 0 ? "text" : "decimal",
															value: s.weight,
															placeholder: "0",
															min: String(minWeight),
															max: String(maxWeight),
															disabled: s.done,
															onChange: (e) => updateSet(ex.id, i, "weight", e.target.value)
														}), PLATE_EQUIPMENT.has(ex.equipment) && !s.done && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															className: "plate-icon-btn",
															onClick: () => setPlateCalc({
																exId: ex.id,
																setIndex: i
															}),
															title: "Plate calculator",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
																width: "16",
																height: "16",
																viewBox: "0 0 24 24",
																fill: "none",
																stroke: "currentColor",
																strokeWidth: "2",
																strokeLinecap: "round",
																strokeLinejoin: "round",
																children: [
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
																		y: "7",
																		width: "3",
																		height: "10",
																		rx: "1"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
																		x: "15",
																		y: "7",
																		width: "3",
																		height: "10",
																		rx: "1"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
																		x1: "9",
																		y1: "12",
																		x2: "15",
																		y2: "12"
																	})
																]
															})
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														className: "col-reps set-input",
														type: "number",
														inputMode: "numeric",
														value: s.reps,
														placeholder: "10",
														min: "0",
														max: String(MAX_REPS),
														disabled: s.done,
														onChange: (e) => updateSet(ex.id, i, "reps", e.target.value)
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: `col-done done-btn ${s.done ? "checked" : ""}`,
														disabled: !s.done && (!weightValid || !repsValid),
														onClick: () => updateSet(ex.id, i, "done", !s.done),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
															width: "14",
															height: "14",
															viewBox: "0 0 24 24",
															fill: "none",
															stroke: "currentColor",
															strokeWidth: "3",
															strokeLinecap: "round",
															strokeLinejoin: "round",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "20 6 9 17 4 12" })
														})
													})
												]
											})]
										}, i);
									})
								]
							})
						}, ex.id))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "workout-actions",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "action-btn",
						onClick: () => {
							setPickerContext("workout");
							setShowExercises(true);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "var(--blue)",
							strokeWidth: "2",
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
						}), "Add Exercise"]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "workout-end-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "cancel-btn",
						onClick: () => setConfirmAction("cancel"),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "finish-btn",
						onClick: promptFinishWorkout,
						children: "Finish Workout"
					})]
				})
			]
		}),
		isVisible && restTimer && typeof document !== "undefined" && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rest-overlay",
			children: (() => {
				const secondsLeft = getRemainingRestSeconds(restTimer);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rest-overlay-name",
						children: restTimer.exerciseName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rest-countdown",
						children: fmtRest(secondsLeft)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rest-progress-track",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rest-progress-fill",
							style: { width: `${secondsLeft / restTimer.total * 100}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rest-overlay-actions",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rest-step-overlay-btn",
								onClick: () => setRestTimer((r) => {
									if (!r) return null;
									const updated = {
										...r,
										endTime: r.endTime - 5e3
									};
									scheduleRestEndNotification(Math.max(0, (updated.endTime - Date.now()) / 1e3), r.exerciseName);
									return updated;
								}),
								children: "−5s"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rest-skip-btn",
								onClick: () => {
									cancelRestNotification();
									setRestTimer(null);
								},
								children: "Skip"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rest-step-overlay-btn",
								onClick: () => setRestTimer((r) => {
									if (!r) return null;
									const updated = {
										...r,
										endTime: r.endTime + 5e3
									};
									scheduleRestEndNotification((updated.endTime - Date.now()) / 1e3, r.exerciseName);
									return updated;
								}),
								children: "+5s"
							})
						]
					})
				] });
			})()
		}), document.body),
		confirmDialog,
		plateCalc && (() => {
			const pcEx = workoutExercises.find((e) => e.id === plateCalc.exId);
			const pcSet = pcEx?.sets[plateCalc.setIndex];
			if (!pcEx || !pcSet) return null;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlateCalculator, {
				unit: pcEx.unit,
				equipment: pcEx.equipment,
				currentWeight: Number(pcSet.weight) || 0,
				onConfirm: (total) => {
					updateSet(plateCalc.exId, plateCalc.setIndex, "weight", String(total));
					setPlateCalc(null);
				},
				onClose: () => setPlateCalc(null)
			});
		})()
	] });
	if (battleModeActive) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "workout-screen",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "section",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-lobby-card",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "battle-panel-eyebrow",
							children: "Battle Active"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "battle-lobby-title",
							children: `Starting workout with ${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || "your friend"}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "battle-lobby-body",
							children: "Both sides jump into a new empty workout automatically. Completed sets and added exercises will sync live."
						})
					] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, {}),
				battleSyncError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-panel-error",
					style: { marginTop: 14 },
					children: battleSyncError
				})
			]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "workout-screen",
		children: [
			savedWorkoutDraft && !battleModeActive && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "section-title",
					children: "Resume Workout"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "battle-lobby-card workout-draft-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "battle-panel-eyebrow",
							children: "Saved Workout"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "battle-lobby-title",
							children: savedWorkoutDraft.workoutExercises?.length ? `${savedWorkoutDraft.workoutExercises.length} exercise${savedWorkoutDraft.workoutExercises.length === 1 ? "" : "s"} ready to resume` : "Continue your in-progress workout"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "battle-lobby-body",
							children: [formatDraftSavedAt(savedWorkoutDraft.savedAt), ". Your unfinished workout was kept locally so you can pick up where you left off."]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "workout-draft-actions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "confirm-discard",
							onClick: discardSavedWorkout,
							disabled: savedWorkoutDraftBusy,
							children: savedWorkoutDraftBusy ? "Working..." : "Discard"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "confirm-submit",
							onClick: resumeSavedWorkout,
							disabled: savedWorkoutDraftBusy,
							children: savedWorkoutDraftBusy ? "Working..." : "Resume"
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "section-title",
						children: "Routines"
					}),
					battleModeActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "battle-lobby-card",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-panel-eyebrow",
								children: "Battle Active"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-lobby-title",
								children: `${battleRoom.opponentProfile?.full_name || battleRoom.opponentProfile?.username || "Your friend"} is waiting`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "battle-lobby-body",
								children: "A new empty workout will start automatically and completed sets will sync live."
							})
						] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "template-list",
						children: [userRoutines.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "template-section-label",
								children: "My Routines"
							}),
							userRoutines.map((r) => {
								const isActive = templateSwipeState?.id === r.id;
								const dx = isActive ? templateSwipeState.dx : 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "template-swipe-wrapper",
									onTouchStart: (e) => handleTemplateTouchStart(r.id, e),
									onTouchMove: (e) => handleTemplateTouchMove(r.id, e),
									onTouchEnd: () => handleTemplateTouchEnd(r.id, () => deleteRoutine(r.id)),
									onTouchCancel: () => {
										templateSwipeRef.current = null;
										setTemplateSwipeState(null);
									},
									children: [dx < -20 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "set-row-delete-bg",
										style: { width: Math.abs(dx) },
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
											style: {
												width: Math.min(20, Math.abs(dx) * .25),
												height: Math.min(20, Math.abs(dx) * .25)
											},
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "white",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "3 6 5 6 21 6" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })
											]
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "template-card",
										style: {
											transform: `translateX(${dx}px)`,
											transition: isActive ? "none" : "transform 0.2s ease"
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "template-icon-btn template-icon-btn-danger",
												onClick: () => deleteRoutine(r.id),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
													width: "14",
													height: "14",
													viewBox: "0 0 24 24",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "2",
													strokeLinecap: "round",
													strokeLinejoin: "round",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "3 6 5 6 21 6" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })
													]
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "template-info",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "template-name",
														children: r.name
													}),
													r.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "template-meta",
														children: r.description
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "template-exercises",
														children: (r.exercises || []).map((e) => e.name).join(" · ")
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "template-actions",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: "template-icon-btn",
													onClick: () => openRoutineBuilder(r),
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
														width: "14",
														height: "14",
														viewBox: "0 0 24 24",
														fill: "none",
														stroke: "currentColor",
														strokeWidth: "2",
														strokeLinecap: "round",
														strokeLinejoin: "round",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })]
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													className: "start-btn",
													onClick: () => startFromTemplate(r),
													children: "Start"
												})]
											})
										]
									})]
								}, r.id);
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "template-section-label",
								style: { marginTop: 4 },
								children: "Suggested Routines"
							})
						] }), TEMPLATES.filter((t) => !hiddenTemplates.includes(t.id)).map((t) => {
							const isActive = templateSwipeState?.id === t.id;
							const dx = isActive ? templateSwipeState.dx : 0;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "template-swipe-wrapper",
								onTouchStart: (e) => handleTemplateTouchStart(t.id, e),
								onTouchMove: (e) => handleTemplateTouchMove(t.id, e),
								onTouchEnd: () => handleTemplateTouchEnd(t.id, () => hideTemplate(t.id)),
								onTouchCancel: () => {
									templateSwipeRef.current = null;
									setTemplateSwipeState(null);
								},
								children: [dx < -20 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "set-row-delete-bg",
									style: { width: Math.abs(dx) },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
										style: {
											width: Math.min(20, Math.abs(dx) * .25),
											height: Math.min(20, Math.abs(dx) * .25)
										},
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "white",
										strokeWidth: "2",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "3 6 5 6 21 6" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })
										]
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "template-card",
									style: {
										transform: `translateX(${dx}px)`,
										transition: isActive ? "none" : "transform 0.2s ease"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "template-icon-btn template-icon-btn-danger",
											onClick: () => hideTemplate(t.id),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
												width: "14",
												height: "14",
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "2",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "3 6 5 6 21 6" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })
												]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "template-info",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "template-name",
													children: t.name
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "template-meta",
													children: t.description
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "template-exercises",
													children: t.exercises.map((e) => e.name).join(" · ")
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "template-actions",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "template-icon-btn",
												onClick: () => openRoutineBuilder({
													name: t.name,
													description: t.description,
													exercises: t.exercises.map((e) => ({
														name: e.name,
														sets: e.sets
													}))
												}),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
													width: "14",
													height: "14",
													viewBox: "0 0 24 24",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "2",
													strokeLinecap: "round",
													strokeLinejoin: "round",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })]
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "start-btn",
												onClick: () => startFromTemplate(t),
												children: "Start"
											})]
										})
									]
								})]
							}, t.id);
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "section-title",
					children: "New Workout"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "new-workout-btns",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "empty-workout-btn",
						onClick: () => {
							if (savedWorkoutDraft) setConfirmAction("restart");
							else performStartWorkout();
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "var(--blue)",
							strokeWidth: "2",
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
						}), "Empty Workout"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "empty-workout-btn",
						onClick: () => openRoutineBuilder(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							width: "20",
							height: "20",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "var(--blue)",
							strokeWidth: "2",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "17 21 17 13 7 13 7 21" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "7 3 7 8 15 8" })
							]
						}), "Create Routine"]
					})]
				})]
			})
		]
	}), confirmDialog] });
}
//#endregion
export { Workout as default };

//# sourceMappingURL=Workout-CKbMv-Ks.js.map