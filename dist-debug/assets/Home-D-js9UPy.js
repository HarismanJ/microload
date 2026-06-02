import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { p as require_react_dom } from "./drag-drop-BDqY7zvQ.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { A as convertWeight, B as LoadingSpinner, G as invalidateCache, H as getCached, K as setCached, U as getCalendarMonthCacheKey, W as getStartupSnapshot, q as setStartupSnapshot, r as useCurrentUserId, v as VALIDATION_LIMITS, w as validateNumber, x as validateBodyweight } from "./index-BNajgLSV.js";
import { n as filterByChartPeriod, r as getChartPeriodLabel, t as CHART_PERIOD_OPTIONS } from "./chartPeriods-C_WRj2FA.js";
import { n as WorkoutDayDetail, t as WeightChart } from "./WeightChart-BmQwEuO2.js";
//#region src/components/profile/BodyWeightDetail.jsx
var import_react_dom = require_react_dom();
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function BodyWeightDetail({ onBack, currentWeight, activeUnit, inputValue, onInputChange, onUnitChange, onLog, saving, error, weightPeriod, onPeriodChange, hasWeightLogs, filteredWeightLogs, chartHeight = 250, recentWeightLogs, displayWeight, deleteTargetId, onToggleDelete, deleteError, deletingId, onDeleteWeightLog, formatWeightLogLabel, showTrend = false, onToggleTrend, goalWeightKg = null, goalInput = "", onGoalInputChange, onSaveGoal, goalSaving = false, showGoal = false, onToggleGoal }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "day-detail body-weight-detail",
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
				children: "Body Weight"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "day-detail-meta",
				children: "Track new weigh-ins and review your recent trend."
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "body-stats-card body-weight-detail-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "body-stats-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "body-stats-title",
						children: "Current Weight"
					}), currentWeight !== null && currentWeight !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "body-stats-current",
						children: [
							currentWeight,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "body-stats-unit",
								children: activeUnit
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "body-stats-log-row body-stats-log-row-detail",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "body-stats-input",
							type: "number",
							min: activeUnit === "lbs" ? "44.1" : "20",
							max: activeUnit === "lbs" ? "1322.8" : "600",
							step: "0.1",
							inputMode: "decimal",
							placeholder: activeUnit === "lbs" ? "e.g. 175" : "e.g. 80",
							value: inputValue,
							onChange: (event) => onInputChange(event.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ex-period-toggle body-stats-unit-toggle",
							role: "tablist",
							"aria-label": "Weight unit",
							children: ["kg", "lbs"].map((unit) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `ex-period-btn ${activeUnit === unit ? "active" : ""}`,
								onClick: () => onUnitChange(unit),
								children: unit
							}, unit))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "body-stats-save-btn",
							onClick: onLog,
							disabled: saving || !inputValue,
							children: saving ? "Saving…" : "Log"
						})
					]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "body-stats-history-error",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "body-stats-goal-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "body-stats-goal-label",
							children: "Goal"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "body-stats-input body-stats-goal-input",
							type: "number",
							min: activeUnit === "lbs" ? "44.1" : "20",
							max: activeUnit === "lbs" ? "1322.8" : "600",
							step: "0.1",
							inputMode: "decimal",
							placeholder: activeUnit === "lbs" ? "e.g. 160" : "e.g. 72",
							value: goalInput,
							onChange: (e) => onGoalInputChange(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "body-stats-goal-unit",
							children: activeUnit
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "body-stats-save-btn",
							onClick: onSaveGoal,
							disabled: goalSaving || !goalInput,
							children: goalSaving ? "Saving…" : goalWeightKg !== null ? "Update" : "Set"
						})
					]
				}),
				hasWeightLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "body-stats-chart-header",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ex-period-toggle",
						children: CHART_PERIOD_OPTIONS.map(({ value }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `ex-period-btn ${weightPeriod === value ? "active" : ""}`,
							onClick: () => onPeriodChange(value),
							children: getChartPeriodLabel(value)
						}, value))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bw-chart-toggles",
						children: [goalWeightKg !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "bw-trend-toggle",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: showGoal,
								onChange: onToggleGoal
							}), "Goal"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "bw-trend-toggle",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: showTrend,
								onChange: onToggleTrend
							}), "Trend"]
						})]
					})]
				}),
				filteredWeightLogs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "body-stats-chart-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightChart, {
						data: filteredWeightLogs,
						unit: activeUnit,
						height: chartHeight,
						tickCount: 5,
						showTrend,
						goalWeightKg,
						showGoal
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "chart-empty",
					children: "No data in this period"
				}),
				recentWeightLogs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "body-stats-history",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "body-stats-history-title",
						children: "Recent Logs"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "body-stats-history-list",
						children: recentWeightLogs.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "body-stats-history-item",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "body-stats-history-main",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "body-stats-history-weight",
									children: [
										displayWeight(log),
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "body-stats-history-unit",
											children: activeUnit
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "body-stats-history-date",
									children: formatWeightLogLabel(log.loggedAt)
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "body-stats-history-delete",
									onClick: () => onToggleDelete(deleteTargetId === log.id ? null : log.id),
									disabled: Boolean(deletingId),
									children: deleteTargetId === log.id ? "Cancel" : "Delete"
								})]
							}), deleteTargetId === log.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "body-stats-history-confirm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "body-stats-history-confirm-text",
										children: "Delete this weigh-in? Your current bodyweight will update to the newest remaining entry."
									}),
									deleteError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "body-stats-history-error",
										children: deleteError
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "body-stats-history-actions",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "body-stats-history-cancel",
											onClick: () => onToggleDelete(null),
											disabled: Boolean(deletingId),
											children: "Keep log"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "body-stats-history-confirm-btn",
											onClick: () => onDeleteWeightLog(log.id),
											disabled: deletingId === log.id,
											children: deletingId === log.id ? "Deleting…" : "Delete forever"
										})]
									})
								]
							})]
						}, log.id))
					})]
				})
			]
		})]
	});
}
//#endregion
//#region src/components/profile/WorkoutCalendar.jsx
var DAYS = [
	"S",
	"M",
	"T",
	"W",
	"T",
	"F",
	"S"
];
var MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];
var DOT_LEVELS_BY_ENTRY_COUNT = {
	1: [2],
	2: [1, 3],
	3: [
		1,
		2,
		3
	]
};
function buildGrid(year, month) {
	const firstDow = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const cells = [];
	for (let i = 0; i < firstDow; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(d);
	return cells;
}
function WorkoutCalendar({ onDayClick, compact = false, initialMonth = null, onMonthChange = null, onCalendarPress = null, variant = "default", cardPressable = false, visualLoading = false, refreshKey = 0, onInitialLoadComplete = null }) {
	const userId = useCurrentUserId();
	const today = /* @__PURE__ */ new Date();
	const [month, setMonth] = (0, import_react.useState)(initialMonth ? new Date(new Date(initialMonth).getFullYear(), new Date(initialMonth).getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
	const [dateMap, setDateMap] = (0, import_react.useState)({});
	const [nutDates, setNutDates] = (0, import_react.useState)({});
	const [weightDates, setWeightDates] = (0, import_react.useState)({});
	const [loading, setLoading] = (0, import_react.useState)(true);
	const initialLoadReportedRef = (0, import_react.useRef)(false);
	async function loadMonth() {
		if (!userId) return;
		setLoading(true);
		const year = month.getFullYear();
		const m = month.getMonth();
		const cacheKey = `cal_${year}-${String(m + 1).padStart(2, "0")}`;
		const cached = getCached(cacheKey);
		if (cached) {
			setDateMap(cached.dateMap);
			setNutDates(cached.nutDates);
			setWeightDates(cached.weightDates || {});
			setLoading(false);
			return;
		}
		const start = new Date(year, m, 1).toISOString();
		const end = new Date(year, m + 1, 0, 23, 59, 59).toISOString();
		const startDate = `${year}-${String(m + 1).padStart(2, "0")}-01`;
		const endDate = `${year}-${String(m + 1).padStart(2, "0")}-${String(new Date(year, m + 1, 0).getDate()).padStart(2, "0")}`;
		const [{ data: sessions }, { data: nutLogs }, { data: weightLogs }] = await Promise.all([
			supabase.from("workout_sessions").select("id, started_at").eq("user_id", userId).not("finished_at", "is", null).gte("started_at", start).lte("started_at", end),
			supabase.from("nutrition_logs").select("log_date").eq("user_id", userId).gte("log_date", startDate).lte("log_date", endDate),
			supabase.from("body_weight_logs").select("logged_at").eq("user_id", userId).gte("logged_at", start).lte("logged_at", end)
		]);
		const map = {};
		sessions?.forEach((s) => {
			const d = new Date(s.started_at);
			const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			if (!map[date]) map[date] = [];
			map[date].push(s.id);
		});
		const nmap = {};
		nutLogs?.forEach((l) => {
			nmap[l.log_date] = true;
		});
		const wmap = {};
		weightLogs?.forEach((l) => {
			const d = new Date(l.logged_at);
			const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			wmap[date] = true;
		});
		setCached(cacheKey, {
			dateMap: map,
			nutDates: nmap,
			weightDates: wmap
		});
		setDateMap(map);
		setNutDates(nmap);
		setWeightDates(wmap);
		setLoading(false);
	}
	const loadMonthLatest = (0, import_react.useEffectEvent)(() => {
		loadMonth();
	});
	(0, import_react.useEffect)(() => {
		const timer = setTimeout(() => {
			loadMonthLatest();
		}, 0);
		return () => clearTimeout(timer);
	}, [
		month,
		refreshKey,
		userId
	]);
	(0, import_react.useEffect)(() => {
		if (!initialMonth) return;
		const nextMonth = new Date(new Date(initialMonth).getFullYear(), new Date(initialMonth).getMonth(), 1);
		if (Number.isNaN(nextMonth.getTime())) return;
		setMonth((current) => current.getFullYear() === nextMonth.getFullYear() && current.getMonth() === nextMonth.getMonth() ? current : nextMonth);
	}, [initialMonth]);
	(0, import_react.useEffect)(() => {
		onMonthChange?.(month);
	}, [month, onMonthChange]);
	(0, import_react.useEffect)(() => {
		if (loading || initialLoadReportedRef.current) return;
		initialLoadReportedRef.current = true;
		onInitialLoadComplete?.();
	}, [loading, onInitialLoadComplete]);
	function prevMonth() {
		setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
	}
	function nextMonth() {
		setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
	}
	const year = month.getFullYear();
	const m = month.getMonth();
	const cells = (0, import_react.useMemo)(() => buildGrid(year, m), [year, m]);
	const weekRows = Math.max(1, Math.ceil(cells.length / 7));
	const isHeatmap = compact && variant === "heatmap";
	const isHybrid = compact && variant === "hybrid";
	const isCardPressable = compact && cardPressable && !!onCalendarPress;
	const isVisuallyLoading = loading || visualLoading;
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	const isFuture = (d) => new Date(year, m, d) > today;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `cal-card ${compact ? "cal-card-compact" : ""} ${isHeatmap ? "cal-card-heatmap" : ""} ${isHybrid ? "cal-card-hybrid" : ""} ${isCardPressable ? "cal-card-pressable" : ""} ${isVisuallyLoading ? "cal-card-loading" : ""}`,
		style: compact ? { "--cal-week-rows": weekRows } : void 0,
		onClick: isCardPressable ? () => onCalendarPress?.() : void 0,
		"aria-busy": isVisuallyLoading,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cal-nav",
				onClick: isCardPressable ? (event) => event.stopPropagation() : void 0,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `cal-arrow ${compact ? "cal-arrow-compact" : ""}`,
						onClick: (event) => {
							event.stopPropagation();
							prevMonth();
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							width: "16",
							height: "16",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2.5",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15 18l-6-6 6-6" })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "cal-month-label",
						children: [
							MONTHS[m],
							" ",
							year
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `cal-arrow ${compact ? "cal-arrow-compact" : ""}`,
						onClick: (event) => {
							event.stopPropagation();
							nextMonth();
						},
						disabled: year === today.getFullYear() && m >= today.getMonth(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
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
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `cal-body ${compact && onCalendarPress && !isCardPressable ? "cal-body-pressable" : ""} ${isVisuallyLoading ? "cal-body-loading" : ""}`,
				onClick: !isCardPressable ? () => onCalendarPress?.() : void 0,
				children: [!isHeatmap && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "cal-day-headers",
					children: DAYS.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "cal-day-header",
						children: d
					}, i))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "cal-grid",
					children: cells.map((day, i) => {
						if (!day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cal-cell empty" }, i);
						const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
						const isToday = dateStr === todayStr;
						const future = isFuture(day);
						if (isVisuallyLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `cal-cell cal-cell-loading ${isToday ? "today" : ""} ${future ? "future" : ""}`,
							style: { "--cal-load-delay": `${i % 7 * 70}ms` },
							"aria-hidden": "true",
							children: !isHeatmap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-day-num cal-day-num-loading" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cal-dots cal-dots-loading",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-dot cal-dot-loading" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-dot cal-dot-loading" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-dot cal-dot-loading" })
								]
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cal-heat-indicators cal-heat-indicators-loading",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-heat-indicator cal-heat-indicator-loading" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-heat-indicator cal-heat-indicator-loading" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-heat-indicator cal-heat-indicator-loading" })
								]
							})
						}, i);
						const hasWorkout = !!dateMap[dateStr];
						const hasNut = !!nutDates[dateStr];
						const hasWeight = !!weightDates[dateStr];
						const hasData = hasWorkout || hasNut || hasWeight;
						const entryCount = Number(hasWorkout) + Number(hasNut) + Number(hasWeight);
						const dotLevels = DOT_LEVELS_BY_ENTRY_COUNT[entryCount] || [];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `cal-cell ${hasData ? "has-entry" : ""} ${isToday ? "today" : ""} ${future ? "future" : ""} ${isHeatmap || isHybrid ? `heat-${entryCount}` : ""}`,
							style: { "--cal-cell-delay": `${i % 7 * 32}ms` },
							onClick: (event) => {
								if (!isCardPressable && !future && hasData) {
									event.stopPropagation();
									onDayClick(dateMap[dateStr] || [], dateStr);
								}
							},
							title: `${dateStr}${hasWorkout ? " · Workout" : ""}${hasNut ? " · Nutrition" : ""}${hasWeight ? " · Weight" : ""}`,
							children: !isHeatmap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "cal-day-num",
								children: day
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `cal-dots ${compact ? "cal-dots-gradient" : ""}`,
								children: compact ? dotLevels.map((level, dotIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `cal-dot cal-dot-gradient cal-dot-gradient-${level}` }, `${dateStr}-dot-${dotIndex}`)) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									hasWorkout && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cal-dot cal-dot-workout" }),
									hasNut && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cal-dot cal-dot-nut" }),
									hasWeight && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cal-dot cal-dot-weight" })
								] })
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cal-heat-indicators",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `cal-heat-indicator cal-heat-indicator-workout ${hasWorkout ? "active" : ""}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `cal-heat-indicator cal-heat-indicator-nut ${hasNut ? "active" : ""}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `cal-heat-indicator cal-heat-indicator-weight ${hasWeight ? "active" : ""}` })
								]
							})
						}, i);
					})
				})]
			}),
			!compact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cal-legend",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "cal-legend-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-legend-dot cal-dot-workout" }), "Workout entry"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "cal-legend-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-legend-dot cal-dot-nut" }), "Nutrition entry"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "cal-legend-item",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cal-legend-dot cal-dot-weight" }), "Weight entry"]
					})
				]
			})
		]
	});
}
//#endregion
//#region src/components/Home.jsx
var BODY_WEIGHT_CHART_UNIT_KEY = "bodyWeightChartUnitOverride";
var HOME_STARTUP_SNAPSHOT_TTL_MS = 900 * 1e3;
function localDate(d = /* @__PURE__ */ new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayStr() {
	return localDate();
}
function formatWeightLogLabel(timestamp) {
	return new Date(timestamp).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}
function loadStoredBodyWeightChartUnit() {
	if (typeof window === "undefined") return null;
	try {
		const stored = window.localStorage.getItem(BODY_WEIGHT_CHART_UNIT_KEY);
		return stored === "kg" || stored === "lbs" ? stored : null;
	} catch {
		return null;
	}
}
var ghostChartHasPlayed = false;
var barGlowHasPlayed = false;
var BURN_R = 40;
var BURN_C = 2 * Math.PI * BURN_R;
function Home({ userId, splashDone, introMotionReady, useStartupSnapshot = false, onNavigate, onWorkoutStreakChange, onInitialReady, weightRefreshTick = 0, workoutRefreshTick = 0, onWorkoutDeleted }) {
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [todayNut, setTodayNut] = (0, import_react.useState)({
		calories: 0,
		protein: 0,
		carbs: 0,
		fat: 0,
		goal: 2e3,
		proteinGoal: 150,
		carbsGoal: 200,
		fatGoal: 65
	});
	const [workoutStreak, setWorkoutStreak] = (0, import_react.useState)(0);
	const [weightLogs, setWeightLogs] = (0, import_react.useState)([]);
	const [ghostChartPhase, setGhostChartPhase] = (0, import_react.useState)("idle");
	const [appReturnTick, setAppReturnTick] = (0, import_react.useState)(0);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [showWeightDetail, setShowWeightDetail] = (0, import_react.useState)(false);
	const [weightSheetUnit, setWeightSheetUnit] = (0, import_react.useState)(() => loadStoredBodyWeightChartUnit());
	const [bwInput, setBwInput] = (0, import_react.useState)("");
	const [bwSaving, setBwSaving] = (0, import_react.useState)(false);
	const [bwError, setBwError] = (0, import_react.useState)("");
	const [weightPeriod, setWeightPeriod] = (0, import_react.useState)("1m");
	const [showTrendLine, setShowTrendLine] = (0, import_react.useState)(() => {
		try {
			return localStorage.getItem("bw_trend_line") === "true";
		} catch {
			return false;
		}
	});
	const [goalWeightKg, setGoalWeightKg] = (0, import_react.useState)(null);
	const [goalInput, setGoalInput] = (0, import_react.useState)("");
	const [goalSaving, setGoalSaving] = (0, import_react.useState)(false);
	const [showGoalLine, setShowGoalLine] = (0, import_react.useState)(() => {
		try {
			const stored = localStorage.getItem("bw_goal_line");
			return stored !== null ? stored === "true" : false;
		} catch {
			return false;
		}
	});
	const [weightDeleteTargetId, setWeightDeleteTargetId] = (0, import_react.useState)(null);
	const [weightDeletingId, setWeightDeletingId] = (0, import_react.useState)(null);
	const [weightDeleteError, setWeightDeleteError] = (0, import_react.useState)("");
	const [selectedDay, setSelectedDay] = (0, import_react.useState)(null);
	const appWasBackgroundedRef = (0, import_react.useRef)(false);
	const burnSheetJustOpenedRef = (0, import_react.useRef)(false);
	const [calendarInitialReady, setCalendarInitialReady] = (0, import_react.useState)(false);
	const [isPhoneWidth, setIsPhoneWidth] = (0, import_react.useState)(() => typeof window !== "undefined" ? window.innerWidth <= 640 : false);
	const [burnedToday, setBurnedToday] = (0, import_react.useState)(0);
	const [burnGoal, setBurnGoal] = (0, import_react.useState)(null);
	const [burnGoalSheetOpen, setBurnGoalSheetOpen] = (0, import_react.useState)(false);
	const [burnGoalInput, setBurnGoalInput] = (0, import_react.useState)("");
	const [burnGoalError, setBurnGoalError] = (0, import_react.useState)("");
	const [burnGoalSaving, setBurnGoalSaving] = (0, import_react.useState)(false);
	const nutEmpty = todayNut.calories === 0 && todayNut.protein === 0 && todayNut.carbs === 0 && todayNut.fat === 0;
	const [barsAnimatedIn, setBarsAnimatedIn] = (0, import_react.useState)(false);
	const [barGlowActive, setBarGlowActive] = (0, import_react.useState)(false);
	const [animReady, setAnimReady] = (0, import_react.useState)(false);
	const firstEntryWidgetHold = splashDone && !introMotionReady;
	const widgetAnimationReady = animReady && !firstEntryWidgetHold;
	(0, import_react.useEffect)(() => {
		const onResize = () => setIsPhoneWidth(window.innerWidth <= 640);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	(0, import_react.useEffect)(() => {
		const contentNode = document.querySelector(".content");
		if (!(contentNode instanceof HTMLElement)) return void 0;
		const shouldLockHomeScroll = isPhoneWidth && !selectedDay && !showWeightDetail;
		contentNode.classList.toggle("content-home-locked", shouldLockHomeScroll);
		if (shouldLockHomeScroll) contentNode.scrollTop = 0;
		return () => {
			contentNode.classList.remove("content-home-locked");
		};
	}, [
		isPhoneWidth,
		selectedDay,
		showWeightDetail
	]);
	function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
		setSelectedDay({
			sessionIds: remainingSessionIds,
			dateStr
		});
		setLoading(true);
		load();
		onWorkoutDeleted?.();
	}
	function applyData({ prof, nutLogs, allSessions, weightLogs: logs }) {
		setProfile(prof);
		setWeightLogs(logs || []);
		setBurnGoal(prof?.calories_burned_goal || null);
		const goalKg = prof?.weight_goal_kg ?? null;
		setGoalWeightKg(goalKg);
		if (goalKg !== null) {
			const goalInUnit = (prof?.unit_preference || "kg") === "lbs" ? Math.round(goalKg * 2.20462 * 10) / 10 : Math.round(goalKg * 10) / 10;
			setGoalInput(String(goalInUnit));
			try {
				if (localStorage.getItem("bw_goal_line") === null) setShowGoalLine(true);
			} catch {}
		}
		const todayForBurn = todayStr();
		setBurnedToday((allSessions || []).filter((s) => s.finished_at && localDate(new Date(s.finished_at)) === todayForBurn).reduce((sum, s) => sum + (s.calories_burned || 0), 0));
		const calGoal = prof?.calories_goal || 2e3;
		const protGoal = prof?.protein_goal || 150;
		const carbGoal = prof?.carbs_goal || 200;
		const fatGoal = prof?.fat_goal || 65;
		if (nutLogs?.length) setTodayNut({
			calories: nutLogs.reduce((s, l) => s + (l.calories || 0), 0),
			protein: nutLogs.reduce((s, l) => s + (l.protein || 0), 0),
			carbs: nutLogs.reduce((s, l) => s + (l.carbs || 0), 0),
			fat: nutLogs.reduce((s, l) => s + (l.fat || 0), 0),
			goal: calGoal,
			proteinGoal: protGoal,
			carbsGoal: carbGoal,
			fatGoal
		});
		else setTodayNut({
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0,
			goal: calGoal,
			proteinGoal: protGoal,
			carbsGoal: carbGoal,
			fatGoal
		});
		const sortedWorkoutDays = [...new Set((allSessions || []).map((session) => localDate(new Date(session.started_at))))].map((dateStr) => /* @__PURE__ */ new Date(`${dateStr}T12:00:00`)).sort((a, b) => b - a);
		let streak = 0;
		if (sortedWorkoutDays.length > 0) {
			const today = /* @__PURE__ */ new Date();
			today.setHours(0, 0, 0, 0);
			if (Math.floor((today - sortedWorkoutDays[0]) / 864e5) <= 3) {
				let oldestInWindow = sortedWorkoutDays[0];
				for (let index = 1; index < sortedWorkoutDays.length; index += 1) {
					if (Math.floor((sortedWorkoutDays[index - 1] - sortedWorkoutDays[index]) / 864e5) - 1 > 3) break;
					oldestInWindow = sortedWorkoutDays[index];
				}
				const oldestMidnight = new Date(oldestInWindow);
				oldestMidnight.setHours(0, 0, 0, 0);
				streak = Math.floor((today - oldestMidnight) / 864e5) + 1;
			}
		}
		setWorkoutStreak(streak);
	}
	async function load() {
		const today = todayStr();
		const cacheKey = "home";
		const cacheVersion = 7;
		try {
			const cached = getCached(cacheKey);
			if (cached?.version === cacheVersion && cached?.userId === userId) {
				applyData(cached);
				setLoading(false);
				return;
			}
			if (useStartupSnapshot) {
				const storedSnapshot = getStartupSnapshot(cacheKey, userId);
				if (storedSnapshot?.version === cacheVersion && storedSnapshot?.userId === userId) {
					setCached(cacheKey, storedSnapshot);
					applyData(storedSnapshot);
					setLoading(false);
				}
			}
			const oneYearAgo = /* @__PURE__ */ new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			const [profileResponse, nutritionResponse, sessionsResponse, weightResponse] = await Promise.all([
				supabase.from("profiles").select("full_name, username, calories_goal, protein_goal, carbs_goal, fat_goal, unit_preference, bodyweight, calories_burned_goal, gender, weight_goal_kg").eq("id", userId).single(),
				supabase.from("nutrition_logs").select("calories, protein, carbs, fat").eq("user_id", userId).eq("log_date", today),
				supabase.from("workout_sessions").select("started_at, finished_at, calories_burned").eq("user_id", userId).not("finished_at", "is", null).gte("started_at", oneYearAgo.toISOString()),
				supabase.from("body_weight_logs").select("id, weight, unit, logged_at").eq("user_id", userId).order("logged_at", { ascending: true })
			]);
			const loadError = profileResponse.error || nutritionResponse.error || sessionsResponse.error || weightResponse.error;
			if (loadError) throw loadError;
			const result = {
				version: cacheVersion,
				userId,
				prof: profileResponse.data,
				nutLogs: nutritionResponse.data,
				allSessions: sessionsResponse.data,
				weightLogs: weightResponse.data?.map((log) => ({
					id: log.id,
					weight: log.weight,
					unit: log.unit,
					date: log.logged_at.slice(0, 10),
					loggedAt: log.logged_at
				})) || [],
				today
			};
			setCached("home", result);
			setStartupSnapshot(cacheKey, result, HOME_STARTUP_SNAPSHOT_TTL_MS, userId);
			applyData(result);
		} catch (error) {
			console.error("Home load failed:", error);
			applyData({
				prof: null,
				nutLogs: [],
				allSessions: [],
				weightLogs: []
			});
		} finally {
			setLoading(false);
		}
	}
	const loadLatest = (0, import_react.useEffectEvent)(() => {
		load();
	});
	(0, import_react.useEffect)(() => {
		setCalendarInitialReady(false);
		const timer = setTimeout(() => {
			loadLatest();
		}, 0);
		return () => clearTimeout(timer);
	}, [userId]);
	(0, import_react.useEffect)(() => {
		if (weightRefreshTick === 0) return;
		loadLatest();
	}, [weightRefreshTick]);
	(0, import_react.useEffect)(() => {
		if (workoutRefreshTick === 0) return;
		loadLatest();
	}, [workoutRefreshTick]);
	(0, import_react.useEffect)(() => {
		onWorkoutStreakChange?.(workoutStreak);
	}, [onWorkoutStreakChange, workoutStreak]);
	(0, import_react.useEffect)(() => {
		if (loading) return;
		onInitialReady?.();
	}, [loading, onInitialReady]);
	(0, import_react.useEffect)(() => {
		if (!splashDone) return;
		const t = setTimeout(() => setAnimReady(true), 80);
		return () => clearTimeout(t);
	}, [splashDone]);
	(0, import_react.useEffect)(() => {
		if (loading || !widgetAnimationReady || selectedDay || showWeightDetail) {
			setBarsAnimatedIn(false);
			return;
		}
		setBarsAnimatedIn(false);
		const timer = setTimeout(() => setBarsAnimatedIn(true), 120);
		return () => clearTimeout(timer);
	}, [
		loading,
		widgetAnimationReady,
		selectedDay,
		showWeightDetail,
		todayNut.calories,
		todayNut.protein,
		todayNut.carbs,
		todayNut.fat,
		appReturnTick
	]);
	(0, import_react.useEffect)(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				appWasBackgroundedRef.current = true;
				return;
			}
			if (document.visibilityState === "visible" && appWasBackgroundedRef.current) {
				appWasBackgroundedRef.current = false;
				ghostChartHasPlayed = false;
				barGlowHasPlayed = false;
				setAppReturnTick((t) => t + 1);
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, []);
	(0, import_react.useEffect)(() => {
		if (loading || !widgetAnimationReady || weightLogs.length > 0 || ghostChartHasPlayed) return;
		ghostChartHasPlayed = true;
		setGhostChartPhase("drawing");
		const eraseTimer = setTimeout(() => setGhostChartPhase("erasing"), 1200);
		const doneTimer = setTimeout(() => setGhostChartPhase("done"), 2800);
		return () => {
			clearTimeout(eraseTimer);
			clearTimeout(doneTimer);
		};
	}, [
		loading,
		widgetAnimationReady,
		weightLogs.length,
		appReturnTick
	]);
	(0, import_react.useEffect)(() => {
		if (loading || !widgetAnimationReady || !nutEmpty || barGlowHasPlayed) return;
		barGlowHasPlayed = true;
		setBarGlowActive(true);
		const t = setTimeout(() => setBarGlowActive(false), 1500);
		return () => clearTimeout(t);
	}, [
		loading,
		widgetAnimationReady,
		nutEmpty,
		appReturnTick
	]);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		try {
			if (weightSheetUnit === "kg" || weightSheetUnit === "lbs") window.localStorage.setItem(BODY_WEIGHT_CHART_UNIT_KEY, weightSheetUnit);
			else window.localStorage.removeItem(BODY_WEIGHT_CHART_UNIT_KEY);
		} catch {}
	}, [weightSheetUnit]);
	async function logWeightFromHome() {
		const val = parseFloat(bwInput);
		const unit = weightSheetUnit || profile?.unit_preference || "kg";
		if (bwSaving) return;
		const weightError = validateBodyweight(bwInput, unit);
		if (weightError) {
			setBwError(weightError);
			return;
		}
		setBwSaving(true);
		setBwError("");
		const profileUnit = profile?.unit_preference || unit;
		const timestamp = (/* @__PURE__ */ new Date()).toISOString();
		const nextBodyweight = Math.round(convertWeight(val, unit, profileUnit) * 10) / 10;
		const [{ data: inserted, error: insertError }, { error: profileError }] = await Promise.all([supabase.from("body_weight_logs").insert({
			user_id: userId,
			weight: val,
			unit,
			logged_at: timestamp
		}).select("id, weight, unit, logged_at").single(), supabase.from("profiles").update({ bodyweight: nextBodyweight }).eq("id", userId)]);
		if (insertError || profileError || !inserted) {
			setBwSaving(false);
			setBwError(insertError?.message || profileError?.message || "Could not save your body weight.");
			return;
		}
		invalidateCache("profile", "ranks", "home", getCalendarMonthCacheKey(timestamp));
		setProfile((current) => current ? {
			...current,
			bodyweight: nextBodyweight
		} : current);
		setWeightLogs((prev) => [...prev, {
			id: inserted.id,
			weight: inserted.weight,
			unit: inserted.unit,
			date: inserted.logged_at.slice(0, 10),
			loggedAt: inserted.logged_at
		}]);
		setBwInput("");
		setBwSaving(false);
	}
	async function saveBurnGoal() {
		const val = parseInt(burnGoalInput, 10);
		if (!userId || burnGoalSaving) return;
		const goalError = validateNumber(burnGoalInput, {
			label: "Calories-burned goal",
			min: VALIDATION_LIMITS.caloriesBurnedGoalMin,
			max: VALIDATION_LIMITS.caloriesBurnedGoalMax,
			integer: true,
			required: true
		});
		if (goalError) {
			setBurnGoalError(goalError);
			return;
		}
		setBurnGoalSaving(true);
		setBurnGoalError("");
		await supabase.from("profiles").update({ calories_burned_goal: val }).eq("id", userId);
		setBurnGoal(val);
		setBurnGoalSheetOpen(false);
		setBurnGoalSaving(false);
		invalidateCache("home", "profile");
	}
	async function saveGoalWeight() {
		if (goalSaving) return;
		const trimmed = goalInput.trim();
		const parsed = trimmed === "" ? null : parseFloat(trimmed);
		const unit = weightSheetUnit || profile?.unit_preference || "kg";
		if (parsed !== null) {
			const goalError = validateBodyweight(goalInput, unit, { label: "Goal weight" });
			if (goalError) {
				setBwError(goalError);
				return;
			}
		}
		setGoalSaving(true);
		const goalKg = parsed === null ? null : unit === "lbs" ? parsed / 2.20462 : parsed;
		await supabase.from("profiles").update({ weight_goal_kg: goalKg }).eq("id", userId);
		setGoalWeightKg(goalKg);
		if (goalKg === null) {
			setGoalInput("");
			setShowGoalLine(false);
			try {
				localStorage.removeItem("bw_goal_line");
			} catch {}
		} else try {
			if (localStorage.getItem("bw_goal_line") === null) {
				setShowGoalLine(true);
				localStorage.setItem("bw_goal_line", "true");
			}
		} catch {}
		invalidateCache("home", "profile");
		setGoalSaving(false);
	}
	async function deleteWeightLog(logId) {
		if (!logId || weightDeletingId) return;
		setWeightDeletingId(logId);
		setWeightDeleteError("");
		const removedLog = weightLogs.find((log) => log.id === logId);
		const remainingLogs = weightLogs.filter((log) => log.id !== logId);
		const latestRemainingLog = remainingLogs.at(-1);
		const nextBodyweight = latestRemainingLog ? convertWeight(latestRemainingLog.weight, latestRemainingLog.unit || profile?.unit_preference || "kg", profile?.unit_preference || "kg") : null;
		const [{ error: deleteError }, { error: profileError }] = await Promise.all([supabase.from("body_weight_logs").delete().eq("id", logId), supabase.from("profiles").update({ bodyweight: nextBodyweight }).eq("id", userId)]);
		if (deleteError || profileError) {
			setWeightDeletingId(null);
			setWeightDeleteError(deleteError?.message || profileError?.message || "Could not delete this weight log.");
			return;
		}
		invalidateCache("profile", "ranks", "home", getCalendarMonthCacheKey(removedLog?.loggedAt || removedLog?.date || /* @__PURE__ */ new Date()));
		setWeightLogs(remainingLogs);
		setProfile((current) => current ? {
			...current,
			bodyweight: nextBodyweight
		} : current);
		setWeightDeletingId(null);
		setWeightDeleteTargetId(null);
	}
	const calPct = Math.min(1, todayNut.calories / todayNut.goal);
	const effectiveBurnGoal = burnGoal ?? 0;
	const burnPct = effectiveBurnGoal > 0 ? Math.min(1, burnedToday / effectiveBurnGoal) : 0;
	const burnComplete = burnedToday >= effectiveBurnGoal;
	const burnDash = burnPct * BURN_C;
	const calBarWidth = `${barsAnimatedIn ? calPct * 100 : 0}%`;
	const activeWeightUnit = weightSheetUnit || profile?.unit_preference || "kg";
	const homeChartHeight = isPhoneWidth ? 162 : 388;
	const homeChartTickCount = 5;
	const homeChartPadding = isPhoneWidth ? "tight-mobile" : "tight";
	const filteredWeightLogs = (0, import_react.useMemo)(() => {
		return filterByChartPeriod(weightLogs, weightPeriod, (log) => log.loggedAt || log.date);
	}, [weightLogs, weightPeriod]);
	const recentWeightDelta = filteredWeightLogs.length >= 2 ? convertWeight(filteredWeightLogs.at(-1)?.weight ?? 0, filteredWeightLogs.at(-1)?.unit || activeWeightUnit, activeWeightUnit) - convertWeight(filteredWeightLogs[0]?.weight ?? 0, filteredWeightLogs[0]?.unit || activeWeightUnit, activeWeightUnit) : null;
	const recentWeightLogs = [...filteredWeightLogs].reverse().slice(0, 3);
	const displayWeight = (log) => Math.round(convertWeight(log.weight, log.unit || activeWeightUnit, activeWeightUnit) * 10) / 10;
	const displayCurrentBodyweight = profile?.bodyweight !== null && profile?.bodyweight !== void 0 ? Math.round(convertWeight(profile.bodyweight, profile?.unit_preference || activeWeightUnit, activeWeightUnit) * 10) / 10 : null;
	const calendarRefreshKey = `${weightLogs.length}:${weightLogs.at(-1)?.loggedAt || ""}:${todayNut.calories}:${todayNut.protein}:${todayNut.carbs}:${todayNut.fat}`;
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true });
	if (selectedDay) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkoutDayDetail, {
		sessionIds: selectedDay.sessionIds,
		dateStr: selectedDay.dateStr,
		onDeleteWorkout: handleDeletedWorkout,
		onRefresh: () => {
			setLoading(true);
			load();
		},
		onBack: () => setSelectedDay(null)
	});
	if (showWeightDetail) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BodyWeightDetail, {
		onBack: () => {
			setShowWeightDetail(false);
			setBwError("");
			setWeightDeleteError("");
			setWeightDeleteTargetId(null);
		},
		currentWeight: displayCurrentBodyweight,
		activeUnit: activeWeightUnit,
		inputValue: bwInput,
		onInputChange: setBwInput,
		onUnitChange: setWeightSheetUnit,
		onLog: logWeightFromHome,
		saving: bwSaving,
		error: bwError,
		weightPeriod,
		onPeriodChange: setWeightPeriod,
		hasWeightLogs: weightLogs.length > 0,
		filteredWeightLogs,
		chartHeight: isPhoneWidth ? 232 : 260,
		recentWeightLogs,
		displayWeight,
		deleteTargetId: weightDeleteTargetId,
		onToggleDelete: (nextId) => {
			setWeightDeleteTargetId(nextId);
			setWeightDeleteError("");
		},
		deleteError: weightDeleteError,
		deletingId: weightDeletingId,
		onDeleteWeightLog: deleteWeightLog,
		formatWeightLogLabel,
		showTrend: showTrendLine,
		onToggleTrend: () => {
			const next = !showTrendLine;
			setShowTrendLine(next);
			try {
				localStorage.setItem("bw_trend_line", String(next));
			} catch {}
		},
		goalWeightKg,
		goalInput,
		onGoalInputChange: setGoalInput,
		onSaveGoal: saveGoalWeight,
		goalSaving,
		showGoal: showGoalLine,
		onToggleGoal: () => {
			const next = !showGoalLine;
			setShowGoalLine(next);
			try {
				localStorage.setItem("bw_goal_line", String(next));
			} catch {}
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `home-screen${animReady ? " home-screen--ready" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "home-today-col",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "home-today-split",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "home-today-card home-today-card-clickable",
					onClick: () => onNavigate?.("nutrition"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "home-today-card-header",
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
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
										cx: "12",
										cy: "12",
										rx: "10",
										ry: "4"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12c0 4.42 4.48 8 10 8s10-3.58 10-8" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12c0-1.5 1.5-3 4-4" })
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Nutrition" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-nut-top",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "home-today-val",
								children: Math.round(todayNut.calories)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "home-today-sub",
								children: [
									"of ",
									todayNut.goal,
									" kcal"
								]
							})] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `home-today-bar home-today-bar-compact${barGlowActive ? " home-macro-track-glow" : ""}`,
							style: barGlowActive ? { "--glow-color": "var(--blue)" } : void 0,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "home-today-bar-fill",
								style: {
									width: calBarWidth,
									background: calPct >= 1 ? "#22c55e" : "var(--blue)"
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-macro-bars home-macro-bars-compact",
							children: [
								{
									label: "Protein",
									val: todayNut.protein,
									goal: todayNut.proteinGoal
								},
								{
									label: "Carbs",
									val: todayNut.carbs,
									goal: todayNut.carbsGoal
								},
								{
									label: "Fat",
									val: todayNut.fat,
									goal: todayNut.fatGoal
								}
							].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "home-macro-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "home-macro-meta",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "home-macro-label",
										children: m.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "home-macro-right",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "home-macro-val",
											children: [Math.round(m.val), "g"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "home-macro-goal",
											children: [
												" / ",
												m.goal,
												"g"
											]
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `home-macro-track${barGlowActive ? " home-macro-track-glow" : ""}`,
									style: barGlowActive ? { "--glow-color": "var(--blue)" } : void 0,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "home-macro-fill",
										style: {
											width: `${barsAnimatedIn ? Math.min(100, m.val / m.goal * 100) : 0}%`,
											background: "var(--blue)"
										}
									})
								})]
							}, m.label))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "home-today-card home-today-card-clickable home-burned-widget",
					onClick: () => {
						setBurnGoalInput(burnGoal ? String(burnGoal) : "");
						burnSheetJustOpenedRef.current = true;
						setBurnGoalSheetOpen(true);
						setTimeout(() => {
							burnSheetJustOpenedRef.current = false;
						}, 300);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-today-card-header",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Calories Burned" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-burn-ring-wrap",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
								width: "100",
								height: "100",
								viewBox: "0 0 100 100",
								"aria-hidden": "true",
								className: barGlowActive && burnedToday === 0 ? "home-burn-ring-glow" : void 0,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
										id: "blg",
										x1: "0",
										y1: "0",
										x2: "1",
										y2: "1",
										children: [
											!burnComplete && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("animateTransform", {
												attributeName: "gradientTransform",
												type: "rotate",
												from: "0 0.5 0.5",
												to: "360 0.5 0.5",
												dur: "4s",
												repeatCount: "indefinite"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "0%",
												stopColor: burnComplete ? "#4ade80" : "#fbbf24"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "40%",
												stopColor: burnComplete ? "#22c55e" : "#f97316"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "80%",
												stopColor: burnComplete ? "#16a34a" : "#dc2626"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "100%",
												stopColor: burnComplete ? "#4ade80" : "#fbbf24"
											})
										]
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
										cx: "50",
										cy: "50",
										r: BURN_R,
										fill: "none",
										stroke: "var(--surface2)",
										strokeWidth: "8"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
										cx: "50",
										cy: "50",
										r: BURN_R,
										fill: "none",
										stroke: "url(#blg)",
										strokeWidth: "8",
										strokeDasharray: `${barsAnimatedIn ? burnDash : 0} ${BURN_C}`,
										strokeLinecap: "round",
										transform: "rotate(-90 50 50)",
										style: { transition: "stroke-dasharray 0.88s cubic-bezier(0.22, 1, 0.36, 1) 80ms" }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
										x: "50",
										y: "47",
										textAnchor: "middle",
										dominantBaseline: "middle",
										fill: "var(--text)",
										fontSize: "18",
										fontWeight: "800",
										fontFamily: "inherit",
										children: burnedToday
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
										x: "50",
										y: "62",
										textAnchor: "middle",
										fill: "var(--muted)",
										fontSize: "9",
										fontFamily: "inherit",
										children: "kcal"
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-burn-update-btn",
							children: "Update Goal"
						})
					]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "home-insights-grid",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "home-section home-section-weight",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "home-weight-card home-weight-card-clickable",
					onClick: () => {
						setBwInput("");
						setBwError("");
						setWeightDeleteError("");
						setWeightDeleteTargetId(null);
						setShowWeightDetail(true);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "home-weight-cap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "home-weight-cap-label",
								children: "Body Weight"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "home-weight-cap-sublabel",
								children: "Tap to expand"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-weight-header",
							children: recentWeightDelta !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `home-weight-chip ${recentWeightDelta === 0 ? "neutral" : recentWeightDelta > 0 ? "up" : "down"}`,
								children: [
									recentWeightDelta > 0 ? "+" : "",
									recentWeightDelta.toFixed(1),
									" ",
									activeWeightUnit
								]
							})
						}),
						weightLogs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "home-weight-chart-wrap",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightChart, {
								data: filteredWeightLogs,
								unit: activeWeightUnit,
								height: homeChartHeight,
								tickCount: homeChartTickCount,
								padding: homeChartPadding,
								animationReady: widgetAnimationReady,
								showTrend: showTrendLine,
								goalWeightKg,
								showGoal: showGoalLine
							})
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "home-chart-empty",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
								className: "home-chart-ghost",
								viewBox: "0 0 300 162",
								width: "100%",
								height: homeChartHeight,
								style: { display: "block" },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
									className: `home-chart-ghost-path home-chart-ghost-path--${ghostChartPhase}`,
									points: "30,118 55,124 80,110 105,115 130,100 155,88 175,92 200,75 225,68 250,58 275,45 292,38",
									fill: "none",
									stroke: "var(--blue)",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									pathLength: "1",
									strokeDasharray: "1",
									strokeDashoffset: "1"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `home-chart-empty-label${ghostChartPhase === "done" || ghostChartHasPlayed && ghostChartPhase === "idle" ? " home-chart-empty-label--visible" : ""}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "No weight history yet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "home-chart-empty-sublabel",
									children: "Tap here or use the + button to add an entry"
								})]
							})]
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "home-section home-section-calendar",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkoutCalendar, {
					compact: true,
					variant: "hybrid",
					visualLoading: firstEntryWidgetHold,
					refreshKey: calendarRefreshKey,
					onInitialLoadComplete: () => setCalendarInitialReady(true),
					onDayClick: (sessionIds, dateStr) => setSelectedDay({
						sessionIds,
						dateStr
					})
				})
			})]
		})]
	}), burnGoalSheetOpen && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "home-weight-modal-overlay",
		onClick: () => {
			if (!burnSheetJustOpenedRef.current) setBurnGoalSheetOpen(false);
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "home-weight-modal",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "home-weight-sheet-handle" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "home-weight-modal-title",
					children: "Daily Burn Goal"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "home-weight-panel-log-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "home-weight-panel-input",
							type: "number",
							min: "1",
							max: VALIDATION_LIMITS.caloriesBurnedGoalMax,
							step: "1",
							inputMode: "numeric",
							placeholder: "e.g. 500",
							value: burnGoalInput,
							onChange: (e) => {
								setBurnGoalError("");
								setBurnGoalInput(e.target.value);
							},
							onKeyDown: (e) => e.key === "Enter" && saveBurnGoal(),
							autoFocus: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "home-weight-panel-unit",
							children: "kcal"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "home-weight-panel-save",
							onClick: saveBurnGoal,
							disabled: burnGoalSaving,
							children: burnGoalSaving ? "…" : "Save"
						})
					]
				}),
				burnGoalError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "quick-weight-error",
					children: burnGoalError
				})
			]
		})
	}), document.body)] });
}
//#endregion
export { Home as default };

//# sourceMappingURL=Home-D-js9UPy.js.map