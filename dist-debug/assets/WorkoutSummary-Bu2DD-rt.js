import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
//#region src/styles/WorkoutSummary.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
//#endregion
//#region src/components/WorkoutSummary.jsx
var import_jsx_runtime = require_jsx_runtime();
function fmtTime(s) {
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const sec = s % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${sec}s`;
	return `${sec}s`;
}
function fmtVolume(v) {
	if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
	return String(v);
}
function fmtMetricValue(metric, value) {
	if (value === null || value === void 0) return "—";
	const suffix = metric.display?.includes("min") && !metric.display?.includes("/") ? "" : metric.display?.includes("MET") ? "" : "x";
	return `${value.toFixed(2)}${suffix}`;
}
function getBattleOutcome(battle) {
	if (!battle) return null;
	if (battle.status === "waiting") return {
		pill: "Live Battle",
		title: "Waiting for final result",
		body: battle.verdict,
		tone: "waiting"
	};
	if (battle.winner === "you") return {
		pill: "Victory",
		title: "You won the battle",
		body: battle.verdict,
		tone: "win"
	};
	if (battle.winner === "opponent") return {
		pill: "Defeat",
		title: `${battle.opponentName} won the battle`,
		body: battle.verdict,
		tone: "loss"
	};
	return {
		pill: battle.status === "cancelled" ? "Cancelled" : "Tie",
		title: battle.status === "cancelled" ? "Battle cancelled" : "Battle ended in a draw",
		body: battle.verdict,
		tone: battle.status === "cancelled" ? "waiting" : "tie"
	};
}
function WorkoutSummary({ summary, onDismiss }) {
	const [show, setShow] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const t = setTimeout(() => setShow(true), 30);
		return () => clearTimeout(t);
	}, []);
	const handleDismiss = () => {
		setShow(false);
		setTimeout(onDismiss, 280);
	};
	const { durationSeconds, caloriesBurned = 0, totalSets, totalVolume, unit, exercises, rankUps, newAchievements = [], battle = null, battleOnly = false } = summary;
	const battleOutcome = getBattleOutcome(battle);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `ws-overlay ${show ? "ws-overlay-in" : ""}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `ws-screen ${show ? "ws-screen-in" : ""}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ws-header",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `ws-check ${show ? "ws-check-in" : ""}`,
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
							className: "ws-title",
							children: battleOnly ? "Battle Result Ready" : "Workout Complete"
						}),
						!battleOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ws-duration",
							children: fmtTime(durationSeconds)
						})
					]
				}),
				!battleOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ws-stats",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-stat",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-stat-value",
								children: totalSets
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-stat-label",
								children: "Sets"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ws-stat-divider" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-stat",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-stat-value",
								children: exercises.length
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-stat-label",
								children: "Exercises"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ws-stat-divider" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-stat",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-stat-value",
								children: fmtVolume(totalVolume)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ws-stat-label",
								children: [
									"Volume (",
									unit,
									")"
								]
							})]
						}),
						caloriesBurned > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ws-stat-divider" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-stat",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ws-stat-value",
								children: ["~", caloriesBurned]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-stat-label",
								children: "kcal"
							})]
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ws-body",
					children: [
						battle && battleOutcome && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-section",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ws-section-title",
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
								}), `${battle.battleModeLabel || "Hybrid"} Head To Head`]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `ws-battle-card ws-battle-card-${battleOutcome.tone}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ws-battle-head",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-battle-pill",
											children: battleOutcome.pill
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-battle-title",
											children: battleOutcome.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-battle-subtitle",
											children: battleOutcome.body
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ws-battle-score",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "ws-battle-score-item",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: battle.points?.you ?? 0 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "You" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "ws-battle-score-sep",
												children: ":"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "ws-battle-score-item",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: battle.points?.opponent ?? 0 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: battle.opponentName })]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ws-battle-metrics",
										children: battle.metrics?.map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "ws-battle-metric-row",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: `ws-battle-metric-value ${metric.winner === "you" ? "is-winner" : ""}`,
													children: metric.available ? fmtMetricValue(metric, metric.yourValue) : "—"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "ws-battle-metric-center",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "ws-battle-metric-label",
														children: metric.label
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "ws-battle-metric-unit",
														children: metric.available ? metric.display : metric.unavailableText || "Needs both lifters to log this metric"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: `ws-battle-metric-value ${metric.winner === "opponent" ? "is-winner" : ""}`,
													children: metric.available ? fmtMetricValue(metric, metric.opponentValue) : "—"
												})
											]
										}, metric.id))
									}),
									battle.bodyweightFallbackUsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ws-battle-note",
										children: "Bodyweight was missing for at least one lifter, so this recap filled the gap from the available bodyweights in the room or a 170 lb default."
									})
								]
							})]
						}),
						!battleOnly && newAchievements.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-section",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ws-section-title",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "14",
									height: "14",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
										cx: "12",
										cy: "8",
										r: "6"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" })]
								}), "Achievements Unlocked"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-achievements",
								children: newAchievements.map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `ws-achievement-card ${show ? "ws-achievement-in" : ""}`,
									style: { "--delay": `${.1 + i * .08}s` },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "ws-achievement-badge",
										children: a.emoji ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: { fontSize: "20px" },
											children: a.emoji
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
											width: "16",
											height: "16",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
												cx: "12",
												cy: "8",
												r: "6"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" })]
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ws-achievement-info",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-achievement-title",
											children: a.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-achievement-desc",
											children: a.desc
										})]
									})]
								}, a.id))
							})]
						}),
						!battleOnly && rankUps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-section",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ws-section-title",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
									width: "14",
									height: "14",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" })
								}), "Rank Ups"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-rankups",
								children: rankUps.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `ws-rankup-card ${show ? "ws-rankup-in" : ""}`,
									style: {
										"--delay": `${.15 + i * .1}s`,
										"--tier-color": r.color
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-rankup-arrow",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
												width: "16",
												height: "16",
												viewBox: "0 0 24 24",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "2.5",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 19V5M5 12l7-7 7 7" })
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "ws-rankup-info",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "ws-rankup-exercise",
												children: r.exercise
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "ws-rankup-from",
												children: r.from
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-rankup-new",
											children: r.to
										})
									]
								}, r.exercise))
							})]
						}),
						!battleOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ws-section",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ws-section-title",
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
								}), "Exercises"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ws-exercises",
								children: exercises.map((ex) => {
									if (ex.isCardio) {
										const totalMin = Math.round(ex.sets.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "ws-exercise-row",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "ws-exercise-name",
												children: ex.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "ws-exercise-meta",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													ex.sets.length,
													" ",
													ex.sets.length !== 1 ? "entries" : "entry"
												] }), totalMin > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "ws-exercise-top",
													children: [totalMin, " min"]
												})]
											})]
										}, ex.name);
									}
									const top = ex.sets.reduce((best, s) => s.weight > best ? s.weight : best, 0);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ws-exercise-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "ws-exercise-name",
											children: ex.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "ws-exercise-meta",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												ex.sets.length,
												" set",
												ex.sets.length !== 1 ? "s" : ""
											] }), top > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ws-exercise-top",
												children: [
													top,
													" ",
													ex.sets[0]?.unit
												]
											})]
										})]
									}, ex.name);
								})
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "ws-done-btn",
					onClick: handleDismiss,
					children: battleOnly ? "Close" : "Done"
				})
			]
		})
	});
}
//#endregion
export { WorkoutSummary as default };

//# sourceMappingURL=WorkoutSummary-Bu2DD-rt.js.map