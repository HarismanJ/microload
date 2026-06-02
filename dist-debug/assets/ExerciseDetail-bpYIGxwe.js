import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react, t as Model } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { B as LoadingSpinner, r as useCurrentUserId } from "./index-BNajgLSV.js";
import { n as filterByChartPeriod, r as getChartPeriodLabel, t as CHART_PERIOD_OPTIONS } from "./chartPeriods-C_WRj2FA.js";
import { _ as weightForOrm, a as getContinuousTierScore, d as TIER_COLORS, f as expandAnchors, g as tierGroup, h as tierColor, l as ANCHORS, m as getTierIdx, n as ALL_TIME_RANK_MODE, o as inferRatioFromScore, p as getProgress, r as applyInactivityDecay, s as resolveTierFromScore, u as TIERS, v as fetchExerciseRankStates } from "./rollingRanks-BNemOpZT.js";
import { t as RankBadge } from "./RankBadge-BtaAzhvV.js";
//#region src/components/exercise/ExerciseChart.jsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function ExerciseChart({ data, unit = "kg" }) {
	if (!data || data.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "chart-empty",
		children: "No history yet"
	});
	const W = 300, H = 130;
	const padL = 46, padR = 12, padT = 12, padB = 28;
	const plotW = W - padL - padR;
	const plotH = H - padT - padB;
	const values = data.map((d) => d.orm);
	const rawMin = Math.min(...values);
	const rawMax = Math.max(...values);
	const range = rawMax - rawMin || 1;
	const minVal = rawMin - range * .1;
	const maxVal = rawMax + range * .1;
	const xAt = (i) => padL + (data.length === 1 ? plotW / 2 : i / (data.length - 1) * plotW);
	const yAt = (v) => padT + plotH - (v - minVal) / (maxVal - minVal) * plotH;
	const pts = data.map((d, i) => `${xAt(i)},${yAt(d.orm)}`).join(" ");
	const areaBase = padT + plotH;
	const area = `${padL},${areaBase} ${pts} ${xAt(data.length - 1)},${areaBase}`;
	const yTicks = [
		0,
		.5,
		1
	].map((t) => ({
		y: padT + plotH * (1 - t),
		label: (minVal + (maxVal - minVal) * t).toFixed(1)
	}));
	const xLabelIdx = [...new Set([
		0,
		Math.floor((data.length - 1) / 2),
		data.length - 1
	])];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${W} ${H}`,
		width: "100%",
		style: {
			overflow: "visible",
			display: "block"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
				id: "orm-grad",
				x1: "0",
				y1: "0",
				x2: "0",
				y2: "1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "0%",
					stopColor: "var(--blue)",
					stopOpacity: "0.28"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "100%",
					stopColor: "var(--blue)",
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
			data.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: area,
				fill: "url(#orm-grad)"
			}),
			data.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
				points: pts,
				fill: "none",
				stroke: "var(--blue)",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			data.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: xAt(i),
				cy: yAt(d.orm),
				r: data.length === 1 ? 4 : 3,
				fill: "var(--blue)"
			}, i)),
			xLabelIdx.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: xAt(i),
				y: H - 6,
				fontSize: "8.5",
				fill: "#6b7280",
				textAnchor: "middle",
				children: data[i].date.slice(5).replace("-", "/")
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
	});
}
//#endregion
//#region src/components/exercise/ExerciseDetail.jsx
var EXERCISE_DAILY_ORM_POINTS_RPC = "get_exercise_daily_orm_points";
var EXERCISE_HISTORY_SUMMARY_RPC = "get_exercise_history_summary";
var MUSCLE_MAP = {
	"Chest": ["chest"],
	"Upper Chest": ["chest"],
	"Lower Chest": ["chest"],
	"Triceps": ["triceps"],
	"Front Delts": ["front-deltoids"],
	"Lateral Delts": ["front-deltoids", "back-deltoids"],
	"Rear Delts": ["back-deltoids"],
	"Shoulders": ["front-deltoids", "back-deltoids"],
	"Quads": ["quadriceps"],
	"Glutes": ["gluteal"],
	"Hamstrings": ["hamstring"],
	"Core": ["abs", "obliques"],
	"Abs": ["abs"],
	"Obliques": ["obliques"],
	"Lower Back": ["lower-back"],
	"Traps": ["trapezius"],
	"Lats": ["upper-back"],
	"Upper Back": ["upper-back", "trapezius"],
	"Biceps": ["biceps"],
	"Forearms": ["forearm"],
	"Calves": ["calves"],
	"Shins": ["calves"],
	"Adductors": ["adductor"],
	"Abductors": ["abductors"],
	"Hip Flexors": ["quadriceps"],
	"Neck": ["neck"],
	"Rhomboids": ["upper-back"]
};
var MUSCLE_LABEL = {
	"neck": "Neck",
	"chest": "Chest",
	"triceps": "Triceps",
	"front-deltoids": "Front Delts",
	"back-deltoids": "Rear Delts",
	"biceps": "Biceps",
	"forearm": "Forearms",
	"obliques": "Obliques",
	"abs": "Abs",
	"adductor": "Adductors",
	"quadriceps": "Quads",
	"abductors": "Abductors",
	"calves": "Calves",
	"trapezius": "Traps",
	"upper-back": "Upper Back",
	"lower-back": "Lower Back",
	"gluteal": "Glutes",
	"hamstring": "Hamstrings"
};
function buildDiagramEntries(primaryMuscles = [], secondaryMuscles = []) {
	const entries = [];
	const seen = /* @__PURE__ */ new Map();
	const addEntries = (muscles, frequency) => {
		muscles.forEach((name) => {
			const mapped = MUSCLE_MAP[name];
			if (!mapped?.length) return;
			const prev = seen.get(name);
			if (prev) {
				prev.frequency = Math.max(prev.frequency, frequency);
				return;
			}
			const entry = {
				name,
				muscles: mapped,
				frequency
			};
			seen.set(name, entry);
			entries.push(entry);
		});
	};
	addEntries(secondaryMuscles, 1);
	addEntries(primaryMuscles, 2);
	return entries;
}
function lbsToKg(v) {
	return v * .453592;
}
function kgToLbs(v) {
	return v * 2.20462;
}
function isMissingExerciseHistoryRpc(error, functionName) {
	const code = error?.code || "";
	const message = error?.message?.toLowerCase?.() || "";
	return code === "PGRST202" || message.includes(functionName.toLowerCase()) || message.includes("could not find the function");
}
async function fetchExerciseDailyOrmPoints(userId, exerciseId) {
	const { data, error } = await supabase.rpc(EXERCISE_DAILY_ORM_POINTS_RPC, {
		p_user_id: userId,
		p_exercise_id: exerciseId
	});
	if (error) {
		if (isMissingExerciseHistoryRpc(error, EXERCISE_DAILY_ORM_POINTS_RPC)) return {
			rows: [],
			missingFunction: true
		};
		throw error;
	}
	return {
		rows: data ?? [],
		missingFunction: false
	};
}
async function fetchExerciseHistorySummary(userId, exerciseId) {
	const { data, error } = await supabase.rpc(EXERCISE_HISTORY_SUMMARY_RPC, {
		p_user_id: userId,
		p_exercise_id: exerciseId
	});
	if (error) {
		if (isMissingExerciseHistoryRpc(error, EXERCISE_HISTORY_SUMMARY_RPC)) return {
			row: null,
			missingFunction: true
		};
		throw error;
	}
	return {
		row: data?.[0] ?? null,
		missingFunction: false
	};
}
function deriveExerciseHistoryFromSets(sets = []) {
	if (!sets.length) return {
		chartData: [],
		stats: null
	};
	let bestOrmKg = 0;
	let bestSet = null;
	let totalVolumeKg = 0;
	const chartPointsByDate = /* @__PURE__ */ new Map();
	sets.forEach((set) => {
		const ormKg = set.unit === "lbs" ? lbsToKg(set.estimated_1rm) : set.estimated_1rm;
		const weightKg = set.unit === "lbs" ? lbsToKg(set.weight) : set.weight;
		const date = String(set.created_at || "").split("T")[0];
		totalVolumeKg += weightKg * set.reps;
		if (ormKg > bestOrmKg) {
			bestOrmKg = ormKg;
			bestSet = {
				weight: set.weight,
				reps: set.reps,
				unit: set.unit
			};
		}
		const existingPoint = chartPointsByDate.get(date);
		if (!existingPoint || ormKg > existingPoint.orm) chartPointsByDate.set(date, {
			date,
			orm: ormKg
		});
	});
	return {
		chartData: [...chartPointsByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
		stats: {
			bestOrmKg,
			bestSet,
			totalVolumeKg,
			totalSets: sets.length
		}
	};
}
function ExerciseDetail({ exerciseId, onBack, rankMode = ALL_TIME_RANK_MODE }) {
	const userId = useCurrentUserId();
	const [exercise, setExercise] = (0, import_react.useState)(null);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [chartData, setChartData] = (0, import_react.useState)([]);
	const [stats, setStats] = (0, import_react.useState)(null);
	const [activeRankState, setActiveRankState] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [chartPeriod, setChartPeriod] = (0, import_react.useState)("all");
	const [muscleLabel, setMuscleLabel] = (0, import_react.useState)(null);
	const handleMuscleClick = (0, import_react.useCallback)(({ muscle, data }) => {
		setMuscleLabel(data?.exercises?.find(Boolean) || MUSCLE_LABEL[muscle] || muscle);
	}, []);
	async function load() {
		if (!userId) return;
		setLoading(true);
		const [{ data: ex }, { data: prof }, activeRankResult, dailyHistoryResult, summaryResult] = await Promise.all([
			supabase.from("exercises").select("*").eq("id", exerciseId).single(),
			supabase.from("profiles").select("bodyweight, gender, unit_preference").eq("id", userId).single(),
			fetchExerciseRankStates(userId, [exerciseId]),
			fetchExerciseDailyOrmPoints(userId, exerciseId),
			fetchExerciseHistorySummary(userId, exerciseId)
		]);
		setExercise(ex);
		setProfile(prof);
		setActiveRankState(activeRankResult.rows.find((row) => row.exercise_id === exerciseId) || null);
		if (dailyHistoryResult.missingFunction || summaryResult.missingFunction) {
			const { data: sets, error: setsError } = await supabase.from("workout_sets").select("estimated_1rm, weight, reps, unit, created_at").eq("user_id", userId).eq("exercise_id", exerciseId).not("estimated_1rm", "is", null).order("created_at", { ascending: true }).limit(500);
			if (setsError) throw setsError;
			const legacyHistory = deriveExerciseHistoryFromSets(sets || []);
			setChartData(legacyHistory.chartData);
			setStats(legacyHistory.stats);
			setLoading(false);
			return;
		}
		const nextChartData = (dailyHistoryResult.rows || []).map((row) => ({
			date: String(row.day).slice(0, 10),
			orm: Number(row.best_orm_kg) || 0
		})).filter((point) => point.date && point.orm > 0);
		const summaryRow = summaryResult.row;
		const nextStats = summaryRow && Number(summaryRow.total_sets) > 0 ? {
			bestOrmKg: Number(summaryRow.best_orm_kg) || 0,
			bestSet: {
				weight: Number(summaryRow.best_set_weight) || 0,
				reps: Number(summaryRow.best_set_reps) || 0,
				unit: summaryRow.best_set_unit || "kg"
			},
			totalVolumeKg: Number(summaryRow.total_volume_kg) || 0,
			totalSets: Number(summaryRow.total_sets) || 0
		} : null;
		setChartData(nextChartData);
		setStats(nextStats);
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
	}, [exerciseId, userId]);
	const useLbs = profile?.unit_preference === "lbs";
	const fmt = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;
	const displayUnit = useLbs ? "lbs" : "kg";
	const gender = profile?.gender?.toLowerCase() === "female" ? "female" : "male";
	const bodyweightKg = profile?.bodyweight ? useLbs ? lbsToKg(profile.bodyweight) : profile.bodyweight : null;
	const filteredChart = filterByChartPeriod(chartData, chartPeriod, (point) => point.date);
	const chartDisplay = useLbs ? filteredChart.map((d) => ({
		...d,
		orm: kgToLbs(d.orm)
	})) : filteredChart;
	const rankModeLabel = rankMode === "active" ? "Active" : "All-Time";
	const isBW = exercise?.equipment === "Bodyweight";
	const exerciseAnchors = exercise ? ANCHORS[gender]?.[exercise.name] : null;
	let allTimeRankSection = null;
	if (stats && bodyweightKg && exerciseAnchors) {
		const thresholds = expandAnchors(exerciseAnchors);
		const ratio = isBW ? (stats.bestOrmKg + bodyweightKg) / bodyweightKg : stats.bestOrmKg / bodyweightKg;
		const tierIdx = getTierIdx(ratio, thresholds);
		const tier = TIERS[tierIdx];
		const color = tierColor(tier);
		const progress = getProgress(ratio, thresholds, tierIdx);
		const isMax = tierIdx === TIERS.length - 1;
		allTimeRankSection = {
			tierIdx,
			tier,
			color,
			progress,
			isMax,
			nextTier: !isMax ? TIERS[tierIdx + 1] : null,
			targetKg: !isMax ? isBW ? thresholds[tierIdx + 1] * bodyweightKg - bodyweightKg : thresholds[tierIdx + 1] * bodyweightKg : null,
			ratio
		};
	}
	let activeRankSection = null;
	if (bodyweightKg && exerciseAnchors) {
		const thresholds = expandAnchors(exerciseAnchors);
		const storedScore = Number.isFinite(activeRankState?.current_score) ? Number(activeRankState.current_score) : null;
		const fallbackScore = allTimeRankSection ? getContinuousTierScore(allTimeRankSection) : null;
		const activeScore = storedScore !== null ? applyInactivityDecay(storedScore, activeRankState?.last_ranked_at).score : fallbackScore;
		if (activeScore !== null) {
			const resolved = resolveTierFromScore(activeScore);
			const targetKg = !resolved.isMax ? isBW ? thresholds[resolved.tierIdx + 1] * bodyweightKg - bodyweightKg : thresholds[resolved.tierIdx + 1] * bodyweightKg : null;
			activeRankSection = {
				...resolved,
				ratio: inferRatioFromScore(activeScore, thresholds),
				targetKg
			};
		}
	}
	const rankSection = rankMode === "active" ? activeRankSection || allTimeRankSection : allTimeRankSection;
	const ironTargetKg = !stats && exerciseAnchors && bodyweightKg ? isBW ? expandAnchors(exerciseAnchors)[1] * bodyweightKg - bodyweightKg : expandAnchors(exerciseAnchors)[1] * bodyweightKg : null;
	const displayVolume = stats ? useLbs ? kgToLbs(stats.totalVolumeKg) >= 1e3 ? `${(kgToLbs(stats.totalVolumeKg) / 1e3).toFixed(1)}k lbs` : `${kgToLbs(stats.totalVolumeKg).toFixed(0)} lbs` : stats.totalVolumeKg >= 1e3 ? `${(stats.totalVolumeKg / 1e3).toFixed(1)}k kg` : `${stats.totalVolumeKg.toFixed(0)} kg` : "—";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "ex-detail",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "ex-detail-header",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "ex-back-btn",
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
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-detail-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ex-detail-name",
					children: exercise?.name ?? "—"
				}), exercise && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-detail-meta",
					children: [
						exercise.category,
						" · ",
						exercise.equipment
					]
				})]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ex-loading",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { size: "md" })
		}) : exercise?.category === "Cardio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ex-no-data",
			children: "Cardio exercise — logged by duration, no strength rank."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			(exercise?.equipment === "Dumbbell" || exercise?.name === "Cable Lateral Raise") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-db-hint",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "2.5",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "12",
							cy: "12",
							r: "10"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: "12",
							y1: "8",
							x2: "12",
							y2: "12"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: "12",
							y1: "16",
							x2: "12.01",
							y2: "16"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: exercise?.equipment === "Dumbbell" ? "Log the weight of one dumbbell." : "Log the weight for one side." })]
			}),
			stats ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-stats-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ex-stat",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-stat-value",
							children: fmt(stats.bestOrmKg)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-stat-label",
							children: "Best 1RM"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ex-stat",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-stat-value",
							children: displayVolume
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-stat-label",
							children: "Volume"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ex-stat",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-stat-value",
							children: stats.totalSets
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-stat-label",
							children: "Sets Done"
						})]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ex-no-data",
				children: "No workout data yet — log this exercise to see your stats"
			}),
			stats?.bestSet && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ex-section-title",
					children: "Best Set"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-best-set",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ex-best-weight",
							children: [
								stats.bestSet.weight,
								" ",
								stats.bestSet.unit
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ex-best-sep",
							children: "×"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ex-best-reps",
							children: [stats.bestSet.reps, " reps"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ex-best-orm",
							children: [
								"(",
								fmt(stats.bestOrmKg),
								" est. 1RM)"
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-section-title",
					children: [
						"Strength Rank (",
						rankModeLabel,
						")"
					]
				}), rankSection ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-rank-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ex-rank-top",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "tier-badge",
								style: {
									background: rankSection.color + "22",
									color: rankSection.color
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
									tier: tierGroup(rankSection.tier),
									size: 18
								}), rankSection.tier]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-rank-ratio",
								children: [rankSection.ratio.toFixed(2), "× BW"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-progress-track",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ex-progress-fill",
								style: {
									width: `${rankSection.progress}%`,
									background: rankSection.color
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ex-progress-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ex-progress-pct",
									children: rankSection.isMax ? "100%" : `${rankSection.progress}%`
								}),
								rankSection.nextTier && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ex-next-label",
									children: ["→ ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: { color: TIER_COLORS[tierGroup(rankSection.nextTier)] },
										children: rankSection.nextTier
									})]
								}),
								rankSection.isMax && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ex-next-label",
									style: { color: TIER_COLORS.Elite },
									children: "Max Rank"
								})
							]
						}),
						rankSection.targetKg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ex-rank-targets",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-targets-label",
								children: [
									isBW ? "Added weight" : "Target 1RM",
									" to reach ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: { color: TIER_COLORS[tierGroup(rankSection.nextTier)] },
										children: rankSection.nextTier
									}),
									": ",
									fmt(rankSection.targetKg)
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ex-target-chips",
								children: [
									1,
									3,
									5,
									8
								].map((reps) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ex-target-chip",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "chip-reps",
										children: reps === 1 ? "1 rep" : `${reps} reps`
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "chip-weight",
										children: fmt(weightForOrm(rankSection.targetKg, reps))
									})]
								}, reps))
							})]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-rank-card ex-rank-unranked",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-rank-top",
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-unranked-hint",
							children: !bodyweightKg ? "Add your bodyweight in Profile to see your rank" : !exerciseAnchors ? "No strength standards for this exercise yet" : "Log this exercise to earn a rank"
						}),
						ironTargetKg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ex-rank-targets",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-targets-label",
								children: [
									isBW ? "Added weight" : "Target 1RM",
									" to reach ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: { color: TIER_COLORS.Iron },
										children: "Iron"
									}),
									": ",
									fmt(ironTargetKg)
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ex-target-chips",
								children: [
									1,
									3,
									5,
									8
								].map((reps) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ex-target-chip",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "chip-reps",
										children: reps === 1 ? "1 rep" : `${reps} reps`
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "chip-weight",
										children: fmt(weightForOrm(ironTargetKg, reps))
									})]
								}, reps))
							})]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-section-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ex-section-title",
						children: "1RM Progress"
					}), chartData.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ex-period-toggle",
						children: CHART_PERIOD_OPTIONS.map(({ value }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `ex-period-btn ${chartPeriod === value ? "active" : ""}`,
							onClick: () => setChartPeriod(value),
							children: getChartPeriodLabel(value)
						}, value))
					})]
				}), chartData.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "chart-empty",
					children: "No data yet — log this exercise to track your progress"
				}) : chartDisplay.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ex-chart-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExerciseChart, {
						data: chartDisplay,
						unit: displayUnit
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "chart-empty",
					children: "No data in this period"
				})]
			}),
			exercise && (exercise.primary_muscles?.length > 0 || exercise.secondary_muscles?.length > 0) && (() => {
				const diagramEntries = buildDiagramEntries(exercise.primary_muscles || [], exercise.secondary_muscles || []);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-section",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-section-title",
							children: "Muscles Worked"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ex-muscle-legend",
							children: [exercise.primary_muscles?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-muscle-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ex-muscle-dot primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Primary:" }),
									" ",
									exercise.primary_muscles.join(", ")
								] })]
							}), exercise.secondary_muscles?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-muscle-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ex-muscle-dot secondary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Secondary:" }),
									" ",
									exercise.secondary_muscles.join(", ")
								] })]
							})]
						}),
						muscleLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-muscle-tooltip",
							children: muscleLabel
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ex-muscle-models",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-muscle-model",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ex-muscle-model-label",
									children: "Front"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Model, {
									data: diagramEntries,
									type: "anterior",
									onClick: handleMuscleClick,
									bodyColor: "rgba(255, 255, 255, 0.16)",
									highlightedColors: ["rgba(59, 158, 255, 0.42)", "#3b9eff"],
									style: {
										width: "100%",
										aspectRatio: "1 / 2"
									}
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ex-muscle-model",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ex-muscle-model-label",
									children: "Back"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Model, {
									data: diagramEntries,
									type: "posterior",
									onClick: handleMuscleClick,
									bodyColor: "rgba(255, 255, 255, 0.16)",
									highlightedColors: ["rgba(59, 158, 255, 0.42)", "#3b9eff"],
									style: {
										width: "100%",
										aspectRatio: "1 / 2"
									}
								})]
							})]
						})
					]
				});
			})(),
			exerciseAnchors && bodyweightKg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ex-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ex-section-title",
					children: "All Tier Targets"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ex-tier-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ex-tier-table-header",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ex-tier-col-tier",
								children: "Tier"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ex-tier-col-rep",
								children: "1 rep"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ex-tier-col-rep",
								children: "3 reps"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ex-tier-col-rep",
								children: "5 reps"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ex-tier-col-rep",
								children: "8 reps"
							})
						]
					}), TIERS.map((tier, i) => {
						const thresholds = expandAnchors(exerciseAnchors);
						const targetKg = isBW ? thresholds[i] * bodyweightKg - bodyweightKg : thresholds[i] * bodyweightKg;
						const isCurrent = rankSection?.tier === tier;
						const color = tierColor(tier);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `ex-tier-row${isCurrent ? " ex-tier-row-current" : ""}`,
							style: isCurrent ? { borderColor: color + "66" } : {},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ex-tier-col-tier",
								style: { color: isCurrent ? color : void 0 },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
									tier: tierGroup(tier),
									size: 13
								}), tier]
							}), !isBW && targetKg <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ex-tier-col-rep",
								style: {
									gridColumn: "span 4",
									textAlign: "center",
									color: "var(--muted)",
									fontSize: 10
								},
								children: ["0 ", displayUnit]
							}) : [
								1,
								3,
								5,
								8
							].map((reps) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ex-tier-col-rep",
								children: fmt(weightForOrm(targetKg, reps))
							}, reps))]
						}, tier);
					})]
				})]
			})
		] })]
	});
}
//#endregion
export { ExerciseDetail as default };

//# sourceMappingURL=ExerciseDetail-bpYIGxwe.js.map