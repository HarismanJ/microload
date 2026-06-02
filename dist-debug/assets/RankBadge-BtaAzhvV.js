import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { d as TIER_COLORS } from "./rollingRanks-BNemOpZT.js";
//#region src/components/RankBadge.jsx
var import_jsx_runtime = require_jsx_runtime();
var SHIELD = "M24 4 L41 13 L41 30 Q41 43 24 47 Q7 43 7 30 L7 13 Z";
function Unranked({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "24",
				cy: "24",
				r: "19",
				fill: c + "12",
				stroke: c,
				strokeWidth: "1.5",
				strokeDasharray: "5 3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "24",
				cy: "24",
				r: "12",
				fill: "none",
				stroke: c,
				strokeWidth: "1",
				opacity: "0.35",
				strokeDasharray: "3 5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: "24",
				y: "32",
				textAnchor: "middle",
				fill: c,
				fontSize: "22",
				fontWeight: "700",
				fontFamily: "system-ui, sans-serif",
				opacity: "0.85",
				children: "?"
			})
		]
	});
}
function Iron({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: SHIELD,
				fill: c + "18",
				stroke: c,
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "13",
				y: "17",
				width: "22",
				height: "3.5",
				rx: "1",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "13",
				y: "23",
				width: "22",
				height: "3.5",
				rx: "1",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "13",
				y: "29",
				width: "22",
				height: "3.5",
				rx: "1",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "16",
				cy: "13",
				r: "1.8",
				fill: c,
				opacity: "0.55"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "32",
				cy: "13",
				r: "1.8",
				fill: c,
				opacity: "0.55"
			})
		]
	});
}
function Bronze({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: SHIELD,
				fill: c + "18",
				stroke: c,
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,11 26.5,30 24,34 21.5,30",
				fill: c,
				opacity: "0.9"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "15",
				y: "27.5",
				width: "18",
				height: "3.5",
				rx: "1.5",
				fill: c,
				opacity: "0.85"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: "24",
				cy: "37",
				rx: "4",
				ry: "2.8",
				fill: c,
				opacity: "0.75"
			})
		]
	});
}
function Silver({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: SHIELD,
				fill: c + "18",
				stroke: c,
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "15",
				y1: "13",
				x2: "33",
				y2: "37",
				stroke: c,
				strokeWidth: "2.8",
				strokeLinecap: "round",
				opacity: "0.9"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "33",
				y1: "13",
				x2: "15",
				y2: "37",
				stroke: c,
				strokeWidth: "2.8",
				strokeLinecap: "round",
				opacity: "0.9"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "10",
				y1: "21",
				x2: "20",
				y2: "21",
				stroke: c,
				strokeWidth: "2.2",
				strokeLinecap: "round",
				opacity: "0.75"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "28",
				y1: "21",
				x2: "38",
				y2: "21",
				stroke: c,
				strokeWidth: "2.2",
				strokeLinecap: "round",
				opacity: "0.75"
			})
		]
	});
}
function Gold({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: SHIELD,
				fill: c + "18",
				stroke: c,
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M22 32 C20 30 16 28 14 25 C16 24.5 18.5 26 20 28",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M22 28 C19 27 15 23 14 19 C16.5 19 19 21.5 20.5 24",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M22 24 C20 22 17.5 18 17 14 C19.5 14.5 21.5 17.5 22 21",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M26 32 C28 30 32 28 34 25 C32 24.5 29.5 26 28 28",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M26 28 C29 27 33 23 34 19 C31.5 19 29 21.5 27.5 24",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M26 24 C28 22 30.5 18 31 14 C28.5 14.5 26.5 17.5 26 21",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "13",
				x2: "24",
				y2: "33",
				stroke: c,
				strokeWidth: "1.5",
				strokeLinecap: "round",
				opacity: "0.6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M20 33 Q24 36 28 33",
				fill: "none",
				stroke: c,
				strokeWidth: "2",
				strokeLinecap: "round",
				opacity: "0.9"
			})
		]
	});
}
function Platinum({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,3 41,12.5 41,31.5 24,41 7,31.5 7,12.5",
				fill: c + "18",
				stroke: c,
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,10 35,16 35,28 24,34 13,28 13,16",
				fill: "none",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.55"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,17 29,20 29,26 24,29 19,26 19,20",
				fill: c,
				opacity: "0.3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "22",
				x2: "24",
				y2: "10",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "22",
				x2: "35",
				y2: "16",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "22",
				x2: "35",
				y2: "28",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "22",
				x2: "24",
				y2: "34",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "22",
				x2: "13",
				y2: "28",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "22",
				x2: "13",
				y2: "16",
				stroke: c,
				strokeWidth: "1.2",
				opacity: "0.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "24",
				cy: "22",
				r: "3.5",
				fill: c
			})
		]
	});
}
function Diamond({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,3 43,20 24,46 5,20",
				fill: c + "15",
				stroke: c,
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,3 5,20 14,20",
				fill: c,
				opacity: "0.18"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,3 43,20 34,20",
				fill: c,
				opacity: "0.32"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,3 14,20 24,20",
				fill: c,
				opacity: "0.12"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,3 24,20 34,20",
				fill: c,
				opacity: "0.24"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "5",
				y1: "20",
				x2: "43",
				y2: "20",
				stroke: c,
				strokeWidth: "1.5",
				opacity: "0.75"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "14",
				y1: "20",
				x2: "24",
				y2: "46",
				stroke: c,
				strokeWidth: "0.9",
				opacity: "0.35"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "34",
				y1: "20",
				x2: "24",
				y2: "46",
				stroke: c,
				strokeWidth: "0.9",
				opacity: "0.35"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "24",
				y1: "20",
				x2: "24",
				y2: "46",
				stroke: c,
				strokeWidth: "0.8",
				opacity: "0.2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M41 9 L41 13 M39 11 L43 11",
				stroke: c,
				strokeWidth: "1.3",
				strokeLinecap: "round",
				opacity: "0.7"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M8 13 L8 16 M6.5 14.5 L9.5 14.5",
				stroke: c,
				strokeWidth: "1.1",
				strokeLinecap: "round",
				opacity: "0.55"
			})
		]
	});
}
function Master({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M6 37 L6 20 L15 30 L24 8 L33 30 L42 20 L42 37 Z",
				fill: c + "20",
				stroke: c,
				strokeWidth: "1.8",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M10 37 L10 24 L15 30 L24 12 L33 30 L38 24 L38 37",
				fill: "none",
				stroke: c,
				strokeWidth: "0.9",
				opacity: "0.4",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "6",
				y: "37",
				width: "36",
				height: "6.5",
				rx: "2",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,5 27,10 24,13 21,10",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "6",
				cy: "21",
				r: "2.5",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "42",
				cy: "21",
				r: "2.5",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "24",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "33",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			})
		]
	});
}
function Grandmaster({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M4 37 L4 22 L11 31 L17 13 L24 4 L31 13 L37 31 L44 22 L44 37 Z",
				fill: c + "20",
				stroke: c,
				strokeWidth: "1.8",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M8 37 L8 26 L11 31 L17 13 L24 7 L31 13 L37 31 L40 26 L40 37",
				fill: "none",
				stroke: c,
				strokeWidth: "0.9",
				opacity: "0.35",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "4",
				y: "37",
				width: "40",
				height: "6.5",
				rx: "2",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: "24,2 27.5,8 24,12 20.5,8",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "17",
				cy: "14",
				r: "2.2",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "31",
				cy: "14",
				r: "2.2",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "4",
				cy: "23",
				r: "2.5",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "44",
				cy: "23",
				r: "2.5",
				fill: c
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "13",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "21",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "29",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "37",
				cy: "40.5",
				r: "2",
				fill: "rgba(0,0,0,0.35)"
			})
		]
	});
}
function Elite({ c }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		width: "100%",
		height: "100%",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M23 22 C20 18 14 15 8 16 C10 12 14 10 18 12 C16 9 16 5 20 5 C21 8 22 12 23 16",
				fill: c + "22",
				stroke: c,
				strokeWidth: "1.6",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M25 22 C28 18 34 15 40 16 C38 12 34 10 30 12 C32 9 32 5 28 5 C27 8 26 12 25 16",
				fill: c + "22",
				stroke: c,
				strokeWidth: "1.6",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M24 5 C27 9 28 14 24 19 C20 14 21 9 24 5 Z",
				fill: c,
				opacity: "0.85"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M20 22 Q24 28 28 22 L28 32 Q24 38 20 32 Z",
				fill: c + "28",
				stroke: c,
				strokeWidth: "1.5",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "18",
				y: "38",
				width: "12",
				height: "4",
				rx: "2",
				fill: c,
				opacity: "0.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "15",
				y: "42",
				width: "18",
				height: "3",
				rx: "1.5",
				fill: c,
				opacity: "0.5"
			})
		]
	});
}
var BADGE_COMPONENTS = {
	Unranked,
	Iron,
	Bronze,
	Silver,
	Gold,
	Platinum,
	Diamond,
	Master,
	Grandmaster,
	Elite
};
function RankBadge({ tier, size = 44 }) {
	const Comp = BADGE_COMPONENTS[tier];
	const c = TIER_COLORS[tier];
	if (!Comp) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: {
			width: size,
			height: size,
			flexShrink: 0
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Comp, { c })
	});
}
//#endregion
export { RankBadge as t };

//# sourceMappingURL=RankBadge-BtaAzhvV.js.map