const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-DBdfLvla.js","assets/definitions-DSvdkVWR.js","assets/dist-B65an-qx.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { a as registerPlugin, t as Capacitor } from "./dist-B65an-qx.js";
import { t as __vitePreload } from "./preload-helper-CCDVmQCD.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { B as LoadingSpinner, G as invalidateCache, r as useCurrentUserId } from "./index-BNajgLSV.js";
import { t as BarcodeFormat } from "./definitions-DSvdkVWR.js";
import { a as buildFoodPayload, c as getFoodFormError, i as EMPTY_FOOD_FORM, l as isFoodFormValid, n as lookupUsdaBarcode, s as foodToFormValues, t as FoodEditorFields } from "./FoodEditorFields-Cn6yrGUM.js";
import { t as Html5Qrcode } from "./scanner-CdCVLrI_.js";
//#region node_modules/@capacitor-mlkit/barcode-scanning/dist/esm/index.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var BarcodeScanner$1 = registerPlugin("BarcodeScanner", { web: () => __vitePreload(() => import("./web-DBdfLvla.js").then((m) => new m.BarcodeScannerWeb()), __vite__mapDeps([0,1,2])) });
//#endregion
//#region src/components/nutrition/BarcodeScanner.jsx
var import_jsx_runtime = require_jsx_runtime();
var USE_NATIVE_PHONE_SCANNER = Capacitor.getPlatform() !== "web";
var NATIVE_SCANNER = typeof window !== "undefined" && "BarcodeDetector" in window;
var FOOD_BARCODE_PATTERN = /^\d{6,14}$/;
var NATIVE_SCAN_FORMATS = [
	BarcodeFormat.Ean13,
	BarcodeFormat.Ean8,
	BarcodeFormat.UpcA,
	BarcodeFormat.UpcE
];
var ACCEPTED_WEB_FORMATS = [
	"ean_13",
	"ean_8",
	"upc_a",
	"upc_e"
];
function getScannedValue(barcode) {
	return String(barcode?.rawValue || barcode?.displayValue || barcode || "").trim();
}
function isAcceptedFoodBarcode(barcode) {
	const value = getScannedValue(barcode);
	if (!FOOD_BARCODE_PATTERN.test(value)) return false;
	const format = barcode?.format;
	if (!format) return true;
	return [
		BarcodeFormat.Ean13,
		BarcodeFormat.Ean8,
		BarcodeFormat.UpcA,
		BarcodeFormat.UpcE,
		...ACCEPTED_WEB_FORMATS
	].includes(format);
}
function parseOFF(product) {
	const n = product.nutriments || {};
	const suffix = (n["energy-kcal_serving"] ? "serving" : "100g") === "serving" ? "_serving" : "_100g";
	const kcal = n[`energy-kcal${suffix}`] || n["energy-kcal"] || 0;
	const serving_size = product.serving_quantity || 100;
	const serving_unit = product.serving_quantity_unit || "g";
	return {
		name: product.product_name || "",
		brand: product.brands?.split(",")[0]?.trim() || "",
		serving_size: String(serving_size),
		serving_unit: serving_unit || "g",
		calories: String(Math.round(kcal)),
		protein: String(+(n[`proteins${suffix}`] || n.proteins || 0).toFixed(1)),
		carbs: String(+(n[`carbohydrates${suffix}`] || n.carbohydrates || 0).toFixed(1)),
		fat: String(+(n[`fat${suffix}`] || n.fat || 0).toFixed(1)),
		fiber: String(+(n[`fiber${suffix}`] || n.fiber || 0).toFixed(1)),
		sugar: String(+(n[`sugars${suffix}`] || n.sugars || 0).toFixed(1)),
		saturated_fat: String(+(n[`saturated-fat${suffix}`] || n["saturated-fat"] || 0).toFixed(1)),
		sodium: String(Math.round((n[`sodium${suffix}`] || n.sodium || 0) * 1e3)),
		potassium: String(Math.round((n[`potassium${suffix}`] || n.potassium || 0) * 1e3)),
		cholesterol: String(Math.round((n[`cholesterol${suffix}`] || n.cholesterol || 0) * 1e3)),
		vitamin_a: String(+(n[`vitamin-a${suffix}`] || n["vitamin-a"] || 0).toFixed(1)),
		vitamin_c: String(+(n[`vitamin-c${suffix}`] || n["vitamin-c"] || 0).toFixed(1)),
		calcium: String(Math.round((n[`calcium${suffix}`] || n.calcium || 0) * 1e3)),
		iron: String(+(n[`iron${suffix}`] || n.iron || 0).toFixed(2))
	};
}
function BarcodeScanner({ onSave, onBack }) {
	const userId = useCurrentUserId();
	const [phase, setPhase] = (0, import_react.useState)("scanning");
	const [errorMsg, setErrorMsg] = (0, import_react.useState)("");
	const [form, setForm] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [manualCode, setManualCode] = (0, import_react.useState)("");
	const [manualLooking, setManualLooking] = (0, import_react.useState)(false);
	const [torchOn, setTorchOn] = (0, import_react.useState)(false);
	const [torchSupported, setTorchSupported] = (0, import_react.useState)(false);
	const [nativeScanOpening, setNativeScanOpening] = (0, import_react.useState)(false);
	const scannerRef = (0, import_react.useRef)(null);
	const videoRef = (0, import_react.useRef)(null);
	const animFrameRef = (0, import_react.useRef)(null);
	const scannedRef = (0, import_react.useRef)(false);
	const runningRef = (0, import_react.useRef)(false);
	const trackRef = (0, import_react.useRef)(null);
	function stopCamera() {
		runningRef.current = false;
		if (animFrameRef.current) {
			cancelAnimationFrame(animFrameRef.current);
			animFrameRef.current = null;
		}
		if (scannerRef.current) scannerRef.current.stop().catch(() => {});
		if (USE_NATIVE_PHONE_SCANNER) {
			BarcodeScanner$1.removeAllListeners().catch(() => {});
			BarcodeScanner$1.stopScan().catch(() => {});
		}
		document.querySelectorAll("video").forEach((v) => {
			v.srcObject?.getTracks().forEach((t) => t.stop());
			v.srcObject = null;
		});
	}
	async function startNativePhoneScan() {
		if (!USE_NATIVE_PHONE_SCANNER || scannedRef.current || nativeScanOpening) return;
		setNativeScanOpening(true);
		setErrorMsg("");
		try {
			const { supported } = await BarcodeScanner$1.isSupported();
			if (!supported) {
				setErrorMsg("Barcode scanning is not supported on this device.");
				setPhase("error");
				return;
			}
			let cameraPermission = (await BarcodeScanner$1.checkPermissions()).camera;
			if (cameraPermission !== "granted") cameraPermission = (await BarcodeScanner$1.requestPermissions()).camera;
			if (cameraPermission !== "granted") {
				setErrorMsg("Camera access denied. Please allow camera access and try again.");
				setPhase("error");
				return;
			}
			const { barcodes } = await BarcodeScanner$1.scan({
				formats: NATIVE_SCAN_FORMATS,
				autoZoom: true
			});
			const rawValue = getScannedValue((barcodes || []).find(isAcceptedFoodBarcode));
			if (!rawValue) {
				setErrorMsg("Scan the numeric product barcode on the package, not a QR code or promo code.");
				return;
			}
			scannedRef.current = true;
			await lookup(rawValue);
		} catch (error) {
			const message = String(error?.message || error || "");
			if (!/cancel|cancell|user.*closed|dismiss/i.test(message)) setErrorMsg("Could not start the camera scanner. You can still enter the barcode manually.");
		} finally {
			setNativeScanOpening(false);
		}
	}
	function handleBack() {
		stopCamera();
		onBack();
	}
	(0, import_react.useEffect)(() => {
		if (USE_NATIVE_PHONE_SCANNER) {
			startNativePhoneScan();
			return () => {
				BarcodeScanner$1.removeAllListeners().catch(() => {});
				BarcodeScanner$1.stopScan().catch(() => {});
			};
		}
		if (NATIVE_SCANNER) {
			let detector;
			try {
				detector = new BarcodeDetector({ formats: ACCEPTED_WEB_FORMATS });
			} catch {
				initFallback();
				return;
			}
			runningRef.current = true;
			async function start() {
				let stream;
				try {
					stream = await navigator.mediaDevices.getUserMedia({ video: {
						facingMode: { ideal: "environment" },
						width: { ideal: 1280 },
						height: { ideal: 720 }
					} });
				} catch {
					if (!runningRef.current) return;
					setErrorMsg("Camera access denied. Please allow camera access and try again.");
					setPhase("error");
					return;
				}
				if (!runningRef.current) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				const video = videoRef.current;
				if (!video) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				video.srcObject = stream;
				const track = stream.getVideoTracks()[0];
				trackRef.current = track;
				video.addEventListener("loadedmetadata", () => {
					const capabilities = track.getCapabilities?.() || {};
					if (capabilities.focusMode?.includes("continuous")) track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
					if (capabilities.torch) setTorchSupported(true);
				}, { once: true });
				try {
					await video.play();
				} catch {}
				async function scan() {
					if (!runningRef.current || scannedRef.current) return;
					if (video.readyState >= 2) try {
						const acceptedBarcode = (await detector.detect(video)).find(isAcceptedFoodBarcode);
						if (acceptedBarcode && !scannedRef.current) {
							scannedRef.current = true;
							stopCamera();
							lookup(getScannedValue(acceptedBarcode));
							return;
						}
					} catch {}
					if (runningRef.current) animFrameRef.current = requestAnimationFrame(scan);
				}
				animFrameRef.current = requestAnimationFrame(scan);
			}
			start();
		} else initFallback();
		function initFallback() {
			const scanner = new Html5Qrcode("barcode-reader");
			scannerRef.current = scanner;
			scanner.start({ facingMode: "environment" }, {
				fps: 15,
				qrbox: {
					width: 280,
					height: 140
				},
				aspectRatio: 1.333
			}, async (barcode) => {
				if (scannedRef.current || !FOOD_BARCODE_PATTERN.test(getScannedValue(barcode))) return;
				scannedRef.current = true;
				runningRef.current = false;
				await scanner.stop();
				document.querySelectorAll("video").forEach((v) => {
					v.srcObject?.getTracks().forEach((t) => t.stop());
					v.srcObject = null;
				});
				lookup(getScannedValue(barcode));
			}, () => {}).then(() => {
				runningRef.current = true;
				const video = document.querySelector("#barcode-reader video");
				if (video?.srcObject) {
					const track = video.srcObject.getVideoTracks()[0];
					if (track) {
						trackRef.current = track;
						const capabilities = track.getCapabilities?.() || {};
						if (capabilities.focusMode?.includes("continuous")) track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
						if (capabilities.torch) setTorchSupported(true);
					}
				}
			}).catch(() => {
				setErrorMsg("Camera access denied. Please allow camera access and try again.");
				setPhase("error");
			});
		}
		return () => {
			runningRef.current = false;
			if (animFrameRef.current) {
				cancelAnimationFrame(animFrameRef.current);
				animFrameRef.current = null;
			}
			if (scannerRef.current) scannerRef.current.stop().catch(() => {});
			document.querySelectorAll("video").forEach((v) => {
				v.srcObject?.getTracks().forEach((t) => t.stop());
				v.srcObject = null;
			});
		};
	}, []);
	function handleTapFocus(e) {
		const track = trackRef.current;
		if (!track) return;
		const capabilities = track.getCapabilities?.() || {};
		if (!capabilities.focusMode?.includes("manual") && !capabilities.pointOfInterest) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width;
		const y = (e.clientY - rect.top) / rect.height;
		const constraints = {};
		if (capabilities.pointOfInterest) constraints.pointOfInterest = {
			x,
			y
		};
		if (capabilities.focusMode?.includes("manual")) constraints.focusMode = "manual";
		track.applyConstraints({ advanced: [constraints] }).then(() => {
			if (capabilities.focusMode?.includes("continuous")) setTimeout(() => {
				track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
			}, 1500);
		}).catch(() => {});
	}
	function toggleTorch() {
		const track = trackRef.current;
		if (!track) return;
		const next = !torchOn;
		track.applyConstraints({ advanced: [{ torch: next }] }).then(() => setTorchOn(next)).catch(() => {});
	}
	async function handleManualLookup() {
		const code = manualCode.trim();
		if (!code) return;
		scannedRef.current = true;
		stopCamera();
		setManualLooking(true);
		await lookup(code);
		setManualLooking(false);
	}
	async function lookup(barcode) {
		setPhase("loading");
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1e4);
		try {
			try {
				const food = await lookupUsdaBarcode(barcode, { signal: controller.signal });
				if (food) {
					clearTimeout(timeout);
					setForm(foodToFormValues(food));
					setPhase("confirm");
					return;
				}
			} catch {}
			const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { signal: controller.signal });
			clearTimeout(timeout);
			const json = await res.json();
			if (json.status !== 1 || !json.product) {
				setErrorMsg("Product not found. You can enter details manually.");
				setForm(EMPTY_FOOD_FORM);
				setPhase("confirm");
				return;
			}
			setForm(parseOFF(json.product));
			setPhase("confirm");
		} catch (e) {
			clearTimeout(timeout);
			if (e.name === "AbortError") {
				setErrorMsg("Lookup timed out. You can enter details manually.");
				setForm(EMPTY_FOOD_FORM);
				setPhase("confirm");
			} else {
				setErrorMsg("Network error. Check your connection.");
				setPhase("error");
			}
		}
	}
	async function save() {
		if (!userId) return;
		const validationError = getFoodFormError(form);
		if (validationError) {
			setErrorMsg(validationError);
			return;
		}
		setSaving(true);
		const { data, error } = await supabase.from("foods").insert(buildFoodPayload(form, userId)).select().single();
		setSaving(false);
		if (error) {
			setErrorMsg(error.message);
			return;
		}
		invalidateCache(`user_foods:${userId}`);
		onSave(data);
	}
	const set = (key, val) => setForm((f) => ({
		...f,
		[key]: val
	}));
	if (phase === "scanning") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bs-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bs-header",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "back-btn",
				onClick: handleBack,
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
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "picker-title",
				children: "Scan Barcode"
			})]
		}), USE_NATIVE_PHONE_SCANNER ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bs-native-shell",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-native-icon",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "30",
						height: "30",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2.2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 5h2M19 5h2M3 19h2M19 19h2" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 3v4M19 3v4M5 17v4M19 17v4" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 10h8M8 14h8" })
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-native-title",
					children: "Native scanner ready"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-native-sub",
					children: "Your phone is using the native camera scanner for better focus and faster barcode detection."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "bs-native-open-btn",
					onClick: startNativePhoneScan,
					disabled: nativeScanOpening || manualLooking,
					children: nativeScanOpening ? "Opening…" : "Open Camera"
				}),
				errorMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-inline-error",
					children: errorMsg
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bs-viewfinder",
			onClick: handleTapFocus,
			children: [
				NATIVE_SCANNER ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
					ref: videoRef,
					className: "bs-reader",
					autoPlay: true,
					playsInline: true,
					muted: true
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "barcode-reader",
					className: "bs-reader"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-overlay",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bs-target" })
				}),
				torchSupported && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `bs-torch-btn ${torchOn ? "on" : ""}`,
					onClick: (e) => {
						e.stopPropagation();
						toggleTorch();
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "18",
						height: "18",
						viewBox: "0 0 24 24",
						fill: torchOn ? "currentColor" : "none",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 2h6l1 7H8L9 2z" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 9l-2 13h12L16 9" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: "12",
								y1: "13",
								x2: "12",
								y2: "17"
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bs-hint",
					children: "Tap to focus · Point at a food barcode"
				})
			]
		})]
	});
	if (phase === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bs-screen bs-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { size: "lg" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "bs-loading-text",
			children: "Looking up product…"
		})]
	});
	if (phase === "error") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bs-screen bs-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "bs-error-msg",
			children: errorMsg
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "nut-add-to-log-btn",
			onClick: onBack,
			children: "Go Back"
		})]
	});
	const valid = isFoodFormValid(form);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bs-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bs-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "back-btn",
					onClick: onBack,
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "picker-title",
					children: "Confirm Food"
				})]
			}),
			errorMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bs-not-found-note",
				children: errorMsg
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bs-verify-note",
				children: "Scanned nutrition data may not be fully accurate. Please verify the food details before adding it to your log."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bs-manual",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bs-manual-label",
						children: "Or enter barcode manually"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bs-manual-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "bs-manual-input",
							type: "text",
							inputMode: "numeric",
							placeholder: "e.g. 0123456789012",
							value: manualCode,
							maxLength: 32,
							onChange: (e) => setManualCode(e.target.value),
							onKeyDown: (e) => e.key === "Enter" && handleManualLookup()
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "bs-manual-btn",
							onClick: handleManualLookup,
							disabled: !manualCode.trim() || manualLooking,
							children: manualLooking ? "…" : "Look up"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bs-manual-hint",
						children: "Type the numbers printed below the barcode on the packaging (including the numbers at each end)"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FoodEditorFields, {
				form,
				onFieldChange: set
			}),
			!valid && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bs-not-found-note",
				children: getFoodFormError(form)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "nut-add-to-log-btn",
				onClick: save,
				disabled: saving || !valid,
				children: saving ? "Saving…" : "Add Food"
			})
		]
	});
}
//#endregion
export { BarcodeScanner as default };

//# sourceMappingURL=BarcodeScanner-CzLgLEgU.js.map