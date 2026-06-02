import { r as __toESM } from "./rolldown-runtime-CvHMtSRF.js";
import { n as require_react, t as Model } from "./body-diagram-9cYNiocp.js";
import { t as require_jsx_runtime } from "./react-vendor-BqgOqDvu.js";
import { t as supabase } from "./supabase-CCACEYhB.js";
import { A as convertWeight, B as LoadingSpinner, C as validateLength, D as validateUsername, G as invalidateCache, H as getCached, K as setCached, V as clearCache, g as RestTimePicker, l as loadHeadToHeadByOpponent, n as useCurrentUser, o as BATTLE_MODES, r as useCurrentUserId, s as getBattleModeLabel, t as useTheme, v as VALIDATION_LIMITS, w as validateNumber, y as normalizeUsername } from "./index-BNajgLSV.js";
import { n as WorkoutDayDetail } from "./WeightChart-BmQwEuO2.js";
import { a as getContinuousTierScore, d as TIER_COLORS, f as expandAnchors, g as tierGroup, h as tierColor, l as ANCHORS, m as getTierIdx, n as ALL_TIME_RANK_MODE, o as inferRatioFromScore, p as getProgress, r as applyInactivityDecay, s as resolveTierFromScore, t as ACTIVE_RANK_MODE, u as TIERS, v as fetchExerciseRankStates, y as mapExerciseRankStates } from "./rollingRanks-BNemOpZT.js";
import { n as fetchExercises } from "./exercises-DX-XFagI.js";
import { t as RankBadge } from "./RankBadge-BtaAzhvV.js";
/* empty css               */
import { n as CATEGORIES, r as fetchProfileWithWorkoutCount, t as ACHIEVEMENTS } from "./achievements-Cvgw88zh.js";
//#region src/lib/friends.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function sortByDateDesc(a, b) {
	return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
function displayName(profile) {
	return profile?.full_name || profile?.username || "Unknown user";
}
async function fetchProfilesByIds(ids) {
	if (!ids.length) return {};
	const { data, error } = await supabase.from("profiles").select("id, username, full_name").in("id", ids);
	if (error) throw error;
	return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile]));
}
async function loadFriendships(userId) {
	const { data: friendships, error } = await supabase.from("friendships").select("id, requester_id, addressee_id, status, created_at, responded_at").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order("created_at", { ascending: false });
	if (error) throw error;
	const rows = friendships ?? [];
	const profilesById = await fetchProfilesByIds([...new Set(rows.map((row) => row.requester_id === userId ? row.addressee_id : row.requester_id))]);
	const normalized = rows.map((row) => {
		const isRequester = row.requester_id === userId;
		const otherUserId = isRequester ? row.addressee_id : row.requester_id;
		return {
			...row,
			direction: row.status === "accepted" ? "friend" : isRequester ? "outgoing" : "incoming",
			otherUserId,
			otherProfile: profilesById[otherUserId] ?? null
		};
	});
	return {
		incoming: normalized.filter((row) => row.direction === "incoming").sort(sortByDateDesc),
		outgoing: normalized.filter((row) => row.direction === "outgoing").sort(sortByDateDesc),
		friends: normalized.filter((row) => row.direction === "friend").sort((a, b) => {
			return displayName(a.otherProfile).localeCompare(displayName(b.otherProfile));
		}),
		all: normalized
	};
}
async function searchFriendProfiles(searchTerm, currentUserId) {
	const term = searchTerm.trim();
	if (!term) return [];
	const rpcResult = await supabase.rpc("search_profiles_for_friendship", { p_search: term });
	if (!rpcResult.error) return rpcResult.data ?? [];
	if (!(rpcResult.error?.code === "42883" || rpcResult.error?.message?.toLowerCase?.().includes("search_profiles_for_friendship"))) throw rpcResult.error;
	const { data, error } = await supabase.from("profiles").select("id, username, full_name").ilike("username", `%${term}%`).neq("id", currentUserId).order("username", { ascending: true }).limit(8);
	if (error) throw error;
	return data ?? [];
}
async function sendFriendRequest(requesterId, addresseeId) {
	const { error } = await supabase.from("friendships").insert({
		requester_id: requesterId,
		addressee_id: addresseeId
	});
	if (error) throw error;
}
async function acceptFriendRequest(friendshipId, userId) {
	const { error } = await supabase.from("friendships").update({
		status: "accepted",
		responded_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", friendshipId).eq("addressee_id", userId);
	if (error) throw error;
}
async function removeFriendship(friendshipId, userId) {
	const { error } = await supabase.from("friendships").delete().eq("id", friendshipId).or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
	if (error) throw error;
}
//#endregion
//#region src/components/profile/FriendsSection.jsx
var import_jsx_runtime = require_jsx_runtime();
var FRIENDS_REALTIME_REFRESH_DEBOUNCE_MS = 120;
var FRIENDS_FOREGROUND_REFRESH_DEBOUNCE_MS = 180;
var FRIENDS_FALLBACK_POLL_MS = 60 * 1e3;
function getDisplayName$1(profile) {
	return profile?.full_name || profile?.username || "Unknown user";
}
function getUsername(profile) {
	return profile?.username ? `@${profile.username}` : "No username yet";
}
function getFriendlyFriendsError(err, fallback) {
	const message = err?.message || "";
	if (message.toLowerCase().includes("failed to fetch")) return "Your connection dropped for a moment. Please try again.";
	return message || fallback;
}
function FriendsSection({ userId, username, profileLoaded = false, onChallenge, onViewProfile, workoutActive = false }) {
	const [overview, setOverview] = (0, import_react.useState)({
		incoming: [],
		outgoing: [],
		friends: [],
		all: []
	});
	const [headToHead, setHeadToHead] = (0, import_react.useState)({});
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)("");
	const [search, setSearch] = (0, import_react.useState)("");
	const [friendFilter, setFriendFilter] = (0, import_react.useState)("");
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [searchResults, setSearchResults] = (0, import_react.useState)([]);
	const [searchError, setSearchError] = (0, import_react.useState)("");
	const [actionKey, setActionKey] = (0, import_react.useState)("");
	const [notice, setNotice] = (0, import_react.useState)("");
	const [battleModeFriendship, setBattleModeFriendship] = (0, import_react.useState)(null);
	const friendsRefreshTimerRef = (0, import_react.useRef)(null);
	const friendsFallbackPollRef = (0, import_react.useRef)(null);
	const friendsRealtimeHealthyRef = (0, import_react.useRef)(true);
	const hasUsername = Boolean(username?.trim());
	const missingUsername = profileLoaded && !hasUsername;
	const canSearchForFriends = profileLoaded && hasUsername;
	const clearScheduledFriendsRefresh = (0, import_react.useCallback)(() => {
		if (!friendsRefreshTimerRef.current) return;
		clearTimeout(friendsRefreshTimerRef.current);
		friendsRefreshTimerRef.current = null;
	}, [friendsRefreshTimerRef]);
	const clearFriendsFallbackPoll = (0, import_react.useCallback)(() => {
		if (!friendsFallbackPollRef.current) return;
		clearInterval(friendsFallbackPollRef.current);
		friendsFallbackPollRef.current = null;
	}, [friendsFallbackPollRef]);
	const refreshFriends = (0, import_react.useCallback)(async ({ silent = false } = {}) => {
		if (!userId) return;
		if (!silent) {
			setLoading(true);
			setError("");
		}
		try {
			const next = await loadFriendships(userId);
			setOverview(next);
			setHeadToHead(await loadHeadToHeadByOpponent(userId, next.friends.map((friendship) => friendship.otherUserId)));
			return true;
		} catch (err) {
			if (!silent) setError(getFriendlyFriendsError(err, "Could not load your friends right now."));
			return false;
		} finally {
			if (!silent) setLoading(false);
		}
	}, [userId]);
	const scheduleFriendsRefresh = (0, import_react.useCallback)(({ delayMs = 0, silent = true } = {}) => {
		if (!userId) return;
		clearScheduledFriendsRefresh();
		if (delayMs <= 0) {
			refreshFriends({ silent });
			return;
		}
		friendsRefreshTimerRef.current = setTimeout(() => {
			friendsRefreshTimerRef.current = null;
			refreshFriends({ silent });
		}, delayMs);
	}, [
		clearScheduledFriendsRefresh,
		refreshFriends,
		userId
	]);
	const restartFriendsFallbackPoll = (0, import_react.useCallback)(() => {
		clearFriendsFallbackPoll();
		if (!userId || friendsRealtimeHealthyRef.current) return;
		friendsFallbackPollRef.current = setInterval(() => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
			scheduleFriendsRefresh({ silent: true });
		}, FRIENDS_FALLBACK_POLL_MS);
	}, [
		clearFriendsFallbackPoll,
		scheduleFriendsRefresh,
		userId
	]);
	(0, import_react.useEffect)(() => {
		refreshFriends();
	}, [refreshFriends]);
	(0, import_react.useEffect)(() => {
		if (!userId) {
			clearScheduledFriendsRefresh();
			clearFriendsFallbackPoll();
			friendsRealtimeHealthyRef.current = true;
			return;
		}
		friendsRealtimeHealthyRef.current = true;
		const scheduleRealtimeRefresh = () => {
			scheduleFriendsRefresh({
				delayMs: FRIENDS_REALTIME_REFRESH_DEBOUNCE_MS,
				silent: true
			});
		};
		const scheduleForegroundRefresh = () => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
			scheduleFriendsRefresh({
				delayMs: FRIENDS_FOREGROUND_REFRESH_DEBOUNCE_MS,
				silent: true
			});
		};
		const handleVisibilityChange = () => {
			if (typeof document === "undefined" || document.visibilityState !== "visible") return;
			scheduleForegroundRefresh();
		};
		const handleChannelStatus = (status) => {
			if (status === "SUBSCRIBED") {
				const wasHealthy = friendsRealtimeHealthyRef.current;
				friendsRealtimeHealthyRef.current = true;
				clearFriendsFallbackPoll();
				if (!wasHealthy) scheduleFriendsRefresh({ silent: true });
				return;
			}
			if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
				friendsRealtimeHealthyRef.current = false;
				restartFriendsFallbackPoll();
			}
		};
		const channel = supabase.channel(`friendships-${userId}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "friendships",
			filter: `requester_id=eq.${userId}`
		}, scheduleRealtimeRefresh).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "friendships",
			filter: `addressee_id=eq.${userId}`
		}, scheduleRealtimeRefresh).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "workout_rooms",
			filter: `challenger_id=eq.${userId}`
		}, scheduleRealtimeRefresh).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "workout_rooms",
			filter: `challenged_id=eq.${userId}`
		}, scheduleRealtimeRefresh).subscribe(handleChannelStatus);
		if (typeof window !== "undefined") window.addEventListener("focus", scheduleForegroundRefresh);
		if (typeof document !== "undefined") document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			clearScheduledFriendsRefresh();
			clearFriendsFallbackPoll();
			if (typeof window !== "undefined") window.removeEventListener("focus", scheduleForegroundRefresh);
			if (typeof document !== "undefined") document.removeEventListener("visibilitychange", handleVisibilityChange);
			supabase.removeChannel(channel);
		};
	}, [
		clearFriendsFallbackPoll,
		clearScheduledFriendsRefresh,
		restartFriendsFallbackPoll,
		scheduleFriendsRefresh,
		userId
	]);
	const relationByUserId = (0, import_react.useMemo)(() => {
		return new Map(overview.all.map((row) => [row.otherUserId, row]));
	}, [overview.all]);
	const filteredFriends = (0, import_react.useMemo)(() => {
		const term = friendFilter.trim().toLowerCase();
		if (!term) return overview.friends;
		return overview.friends.filter((friendship) => {
			const full = friendship.otherProfile?.full_name?.toLowerCase() || "";
			const handle = friendship.otherProfile?.username?.toLowerCase() || "";
			return full.includes(term) || handle.includes(term);
		});
	}, [friendFilter, overview.friends]);
	(0, import_react.useEffect)(() => {
		if (!canSearchForFriends) {
			setSearchResults([]);
			setSearchError("");
			setSearching(false);
			return;
		}
		const term = search.trim();
		if (!term) {
			setSearchResults([]);
			setSearchError("");
			setSearching(false);
			return;
		}
		if (term.length < 2) {
			setSearchResults([]);
			setSearchError("");
			setSearching(false);
			return;
		}
		let cancelled = false;
		const timer = setTimeout(async () => {
			setSearching(true);
			setSearchError("");
			try {
				const results = await searchFriendProfiles(term, userId);
				if (!cancelled) setSearchResults(results.filter((profile) => !relationByUserId.has(profile.id)));
			} catch (err) {
				if (!cancelled) {
					setSearchResults([]);
					setSearchError(err.message || "Could not search for users right now.");
				}
			} finally {
				if (!cancelled) setSearching(false);
			}
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		canSearchForFriends,
		relationByUserId,
		search,
		userId
	]);
	async function handleSendRequest(profile) {
		if (!canSearchForFriends) {
			setSearchError("You need to add a username before you can search for or add friends.");
			return;
		}
		setActionKey(`send-${profile.id}`);
		setNotice("");
		setSearchError("");
		try {
			await sendFriendRequest(userId, profile.id);
			const refreshed = await refreshFriends();
			setSearchResults((results) => results.filter((result) => result.id !== profile.id));
			setNotice(refreshed ? `Friend request sent to ${getDisplayName$1(profile)}.` : `Friend request sent to ${getDisplayName$1(profile)}. Your list will refresh when the connection settles.`);
		} catch (err) {
			setSearchError(err.code === "23505" ? "You already have a pending request or friendship with that user." : getFriendlyFriendsError(err, "Could not send that friend request."));
		} finally {
			setActionKey("");
		}
	}
	async function handleAccept(friendship) {
		setActionKey(`accept-${friendship.id}`);
		setNotice("");
		setError("");
		try {
			await acceptFriendRequest(friendship.id, userId);
			await refreshFriends();
			setNotice(`You and ${getDisplayName$1(friendship.otherProfile)} are now friends.`);
		} catch (err) {
			setError(getFriendlyFriendsError(err, "Could not accept that request."));
		} finally {
			setActionKey("");
		}
	}
	async function handleRemove(friendship, label) {
		setActionKey(`remove-${friendship.id}`);
		setNotice("");
		setError("");
		try {
			await removeFriendship(friendship.id, userId);
			await refreshFriends();
			setNotice(label);
		} catch (err) {
			setError(getFriendlyFriendsError(err, "Could not update that friendship."));
		} finally {
			setActionKey("");
		}
	}
	async function handleChallenge(friendship, battleMode) {
		if (!username || !friendship.otherProfile?.username) {
			setError("Both friends need usernames before a battle can start.");
			setNotice("");
			return;
		}
		setActionKey(`challenge-${friendship.id}`);
		setError("");
		setNotice("");
		try {
			if (onChallenge) {
				await onChallenge(friendship, battleMode);
				setNotice(`${getBattleModeLabel(battleMode)} challenge sent to ${getDisplayName$1(friendship.otherProfile)}.`);
			} else setNotice(`Challenge button added for ${getDisplayName$1(friendship.otherProfile)}. Battle setup is the next piece to wire in.`);
			setBattleModeFriendship(null);
		} catch (err) {
			setError(err.code === "23505" ? "You already have a pending battle invite with that friend." : err.code === "missing_username" ? "Both friends need usernames before a battle can start." : getFriendlyFriendsError(err, "Could not send that battle invite."));
		} finally {
			setActionKey("");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "friends-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "friends-card-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "friends-card-title",
					children: "Friends"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "friends-card-subtitle",
					children: username ? `Friends can find you at @${username}` : missingUsername ? "Add a username in Edit Profile so friends can find you" : "Loading your friend profile..."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "friends-card-count",
					children: [overview.friends.length, " total"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friends-search",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "friends-search-input",
					placeholder: canSearchForFriends ? "Search by username" : missingUsername ? "Add a username to unlock friend search" : "Loading your profile...",
					value: search,
					onChange: (event) => setSearch(event.target.value),
					maxLength: VALIDATION_LIMITS.searchMaxLength,
					disabled: !canSearchForFriends
				})
			}),
			missingUsername && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friends-search-hint",
				children: "You need to enter a username in Edit Profile before you can search for friends."
			}),
			notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friends-notice",
				children: notice
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friends-error",
				children: error
			}),
			searchError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friends-error",
				children: searchError
			}),
			canSearchForFriends && search.trim().length >= 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "friends-search-results friends-scroll-panel",
				children: [
					searching && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "friends-empty",
						children: "Searching..."
					}),
					!searching && searchResults.length === 0 && !searchError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "friends-empty",
						children: "No available users found for that username."
					}),
					!searching && searchResults.map((profile) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "friends-person-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-person-name",
							children: getDisplayName$1(profile)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-person-handle",
							children: getUsername(profile)
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "friends-action-btn",
							onClick: () => handleSendRequest(profile),
							disabled: actionKey === `send-${profile.id}`,
							children: actionKey === `send-${profile.id}` ? "Sending..." : "Add"
						})]
					}, profile.id))
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "friends-groups",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "friends-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-group-title",
							children: "Incoming Requests"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-scroll-panel",
							children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { size: "md" })
							}) : overview.incoming.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: "No incoming requests."
							}) : overview.incoming.map((friendship) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "friends-person-row friends-person-row-stack",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "friends-person-name",
									children: getDisplayName$1(friendship.otherProfile)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "friends-person-handle",
									children: getUsername(friendship.otherProfile)
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "friends-row-actions",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "friends-primary-btn",
										onClick: () => handleAccept(friendship),
										disabled: actionKey === `accept-${friendship.id}`,
										children: actionKey === `accept-${friendship.id}` ? "Accepting..." : "Accept"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "friends-secondary-btn",
										onClick: () => handleRemove(friendship, "Friend request declined."),
										disabled: actionKey === `remove-${friendship.id}`,
										children: actionKey === `remove-${friendship.id}` ? "Removing..." : "Decline"
									})]
								})]
							}, friendship.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "friends-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-group-title",
							children: "Sent Requests"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-scroll-panel",
							children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { size: "md" })
							}) : overview.outgoing.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: "No pending requests sent."
							}) : overview.outgoing.map((friendship) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "friends-person-row friends-person-row-stack",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "friends-person-name",
									children: getDisplayName$1(friendship.otherProfile)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "friends-person-handle",
									children: getUsername(friendship.otherProfile)
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "friends-secondary-btn",
									onClick: () => handleRemove(friendship, "Friend request cancelled."),
									disabled: actionKey === `remove-${friendship.id}`,
									children: actionKey === `remove-${friendship.id}` ? "Removing..." : "Cancel request"
								})]
							}, friendship.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "friends-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "friends-group-head",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-group-title",
								children: "Your Friends"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "friends-list-search-input",
								placeholder: "Filter friends",
								value: friendFilter,
								onChange: (event) => setFriendFilter(event.target.value),
								maxLength: VALIDATION_LIMITS.searchMaxLength
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-scroll-panel friends-scroll-panel-friends",
							children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { size: "md" })
							}) : overview.friends.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: "No friends yet."
							}) : filteredFriends.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friends-empty",
								children: "No friends match that search."
							}) : filteredFriends.map((friendship) => {
								const tracker = headToHead[friendship.otherUserId];
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "friends-person-row friends-person-row-stack",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "friends-person-name",
											children: getDisplayName$1(friendship.otherProfile)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "friends-person-handle",
											children: getUsername(friendship.otherProfile)
										}),
										tracker?.total > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "friends-headtohead",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "friends-headtohead-label",
												children: "Head to Head"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "friends-headtohead-record",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "friends-headtohead-pill friends-headtohead-pill-win",
														children: [tracker.wins, "W"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "friends-headtohead-pill friends-headtohead-pill-loss",
														children: [tracker.losses, "L"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "friends-headtohead-pill friends-headtohead-pill-tie",
														children: [tracker.ties, "T"]
													})
												]
											})]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "friends-person-record-empty",
											children: "No battles yet."
										}),
										(!username || !friendship.otherProfile?.username) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "friends-person-hint",
											children: "Battles require usernames for both friends."
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "friends-row-actions",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "friends-secondary-btn",
												onClick: () => onViewProfile?.(friendship.otherProfile),
												children: "View Profile"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "friends-primary-btn",
												onClick: () => setBattleModeFriendship(friendship),
												disabled: actionKey === `challenge-${friendship.id}` || !username || !friendship.otherProfile?.username || workoutActive,
												children: actionKey === `challenge-${friendship.id}` ? "Sending..." : workoutActive ? "Finish workout first" : !username || !friendship.otherProfile?.username ? "Need usernames" : "Challenge"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "friends-secondary-btn",
												onClick: () => handleRemove(friendship, "Friend removed."),
												disabled: actionKey === `remove-${friendship.id}`,
												children: actionKey === `remove-${friendship.id}` ? "Removing..." : "Remove"
											})
										]
									})]
								}, friendship.id);
							})
						})]
					})
				]
			}),
			battleModeFriendship && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friends-battle-mode-overlay",
				onClick: () => setBattleModeFriendship(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "friends-battle-mode-modal",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-battle-mode-kicker",
							children: "Choose Battle"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-battle-mode-title",
							children: `Challenge ${getDisplayName$1(battleModeFriendship.otherProfile)}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "friends-battle-mode-options",
							children: BATTLE_MODES.map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "friends-battle-mode-option",
								onClick: () => handleChallenge(battleModeFriendship, mode),
								disabled: actionKey === `challenge-${battleModeFriendship.id}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: getBattleModeLabel(mode) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: mode === "strength" ? "Lifting volume and shared strength" : mode === "cardio" ? "Cardio time and intensity" : "Strength plus cardio balance" })]
							}, mode))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "friends-battle-mode-cancel",
							onClick: () => setBattleModeFriendship(null),
							disabled: actionKey === `challenge-${battleModeFriendship.id}`,
							children: "Cancel"
						})
					]
				})
			})
		]
	});
}
//#endregion
//#region src/components/profile/FriendProfileDetail.jsx
var FRIEND_TIER_GROUPS = [
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
var RANK_DISPLAY_MODE_STORAGE_KEY = "ranks:display-mode";
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
var MUSCLE_GROUP_KEYS = new Set(MUSCLE_GROUPS.map((group) => group.key));
var MUSCLE_CHART_COLORS = FRIEND_TIER_GROUPS.slice(1).map((group) => TIER_COLORS[group]);
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
		return { weightedScore: getContinuousTierScore(lift.cardRank) * muscleWeight };
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
		chartFrequency: FRIEND_TIER_GROUPS.indexOf(tierGroup(resolvedRank.tier))
	};
}
function getDisplayName(profile) {
	return profile?.full_name || profile?.username || "Friend";
}
function localDate(d = /* @__PURE__ */ new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getWorkoutStreakFromSessions(allSessions = []) {
	const sortedWorkoutDays = [...new Set((allSessions || []).map((session) => localDate(new Date(session.started_at))))].map((dateStr) => /* @__PURE__ */ new Date(`${dateStr}T12:00:00`)).sort((a, b) => b - a);
	let streak = 0;
	if (sortedWorkoutDays.length > 0) {
		const today = /* @__PURE__ */ new Date();
		today.setHours(0, 0, 0, 0);
		if (Math.floor((today - sortedWorkoutDays[0]) / 864e5) <= 3) {
			streak = 1;
			for (let index = 1; index < sortedWorkoutDays.length; index += 1) {
				if (Math.floor((sortedWorkoutDays[index - 1] - sortedWorkoutDays[index]) / 864e5) - 1 > 3) break;
				streak += 1;
			}
		}
	}
	return streak;
}
async function loadRankBundle(userId, { fallbackProfile = null, includeSessions = false } = {}) {
	const anchorNames = Object.keys(ANCHORS.male);
	const anchorNameSet = new Set(anchorNames);
	const oneYearAgo = /* @__PURE__ */ new Date();
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
	const queries = [
		supabase.from("profiles").select("full_name, username, unit_preference, gender, bodyweight").eq("id", userId).single(),
		supabase.from("exercise_prs").select("exercise_id, best_1rm_kg").eq("user_id", userId),
		fetchExercises(userId),
		supabase.from("body_weight_logs").select("weight, unit").eq("user_id", userId).order("logged_at", { ascending: false }).limit(1),
		fetchExerciseRankStates(userId)
	];
	if (includeSessions) queries.push(supabase.from("workout_sessions").select("started_at").eq("user_id", userId).not("finished_at", "is", null).gte("started_at", oneYearAgo.toISOString()));
	const [profileRes, prsRes, exerciseRows, weightLogRes, rankStatesResult, sessionsRes] = await Promise.all(queries);
	if (profileRes.error) throw profileRes.error;
	if (prsRes.error) throw prsRes.error;
	if (sessionsRes?.error) throw sessionsRes.error;
	const profileData = profileRes.data;
	if (!profileData.bodyweight && weightLogRes.data?.length > 0) {
		const latest = weightLogRes.data[0];
		profileData.bodyweight = latest.weight;
		profileData._bodyweightUnit = latest.unit || profileData.unit_preference || "kg";
	}
	const exerciseById = new Map((exerciseRows ?? []).map((ex) => [ex.id, ex]));
	const rankStateByExerciseId = mapExerciseRankStates(rankStatesResult.rows);
	const liftMap = {};
	prsRes.data?.forEach((pr) => {
		const exerciseName = exerciseById.get(pr.exercise_id)?.name;
		if (!exerciseName) return;
		liftMap[exerciseName] = {
			ormKg: pr.best_1rm_kg,
			exerciseId: pr.exercise_id
		};
	});
	const preferredExercisesByName = /* @__PURE__ */ new Map();
	for (const ex of exerciseRows ?? []) {
		if (!anchorNameSet.has(ex.name)) continue;
		const existing = preferredExercisesByName.get(ex.name);
		const isGlobal = ex.user_id === null || ex.user_id === void 0;
		const existingIsGlobal = existing?.user_id === null || existing?.user_id === void 0;
		if (!existing || isGlobal && !existingIsGlobal) preferredExercisesByName.set(ex.name, ex);
	}
	return {
		profile: profileData,
		lifts: anchorNames.map((name) => preferredExercisesByName.get(name)).filter(Boolean).map((ex) => ({
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
		})).filter((lift) => lift.ormKg !== null),
		workoutStreak: includeSessions ? getWorkoutStreakFromSessions(sessionsRes?.data || []) : 0
	};
}
function buildLiftDetails(lifts, bodyweightKg, gender, rankDisplayMode) {
	const rankNow = Date.now();
	return lifts.map((lift) => ({
		...lift,
		anchors: ANCHORS[gender]?.[lift.name] ?? null
	})).map((lift) => {
		const thresholds = lift.anchors ? expandAnchors(lift.anchors) : null;
		const allTimeCardRank = lift.ormKg !== null && bodyweightKg && lift.anchors ? getLiftRank(lift, lift.ormKg, bodyweightKg, gender) : null;
		let activeScore = null;
		if (bodyweightKg && thresholds) {
			if (Number.isFinite(lift.activeCurrentScore)) activeScore = applyInactivityDecay(Number(lift.activeCurrentScore), lift.activeLastRankedAt, rankNow).score;
			else if (allTimeCardRank) activeScore = getContinuousTierScore(allTimeCardRank);
		}
		const activeCardRank = activeScore !== null && thresholds ? getRankFromScore(lift, activeScore, thresholds) : null;
		return {
			...lift,
			thresholds,
			allTimeCardRank,
			activeScore,
			activeCardRank,
			cardRank: rankDisplayMode === "active" ? activeCardRank : allTimeCardRank
		};
	});
}
function buildMuscleChartData(muscleGroupRanks) {
	return muscleGroupRanks.filter((group) => group.chartFrequency > 0).map((group) => ({
		name: group.label,
		muscles: group.chartMuscles,
		frequency: group.chartFrequency
	}));
}
function sortLiftRows(a, b) {
	if (!a?.cardRank && !b?.cardRank) return a.name.localeCompare(b.name);
	if (!a?.cardRank) return 1;
	if (!b?.cardRank) return -1;
	if (b.cardRank.tierIdx !== a.cardRank.tierIdx) return b.cardRank.tierIdx - a.cardRank.tierIdx;
	if (b.cardRank.ratio !== a.cardRank.ratio) return b.cardRank.ratio - a.cardRank.ratio;
	return a.name.localeCompare(b.name);
}
function getComparisonLeader(selfLift, friendLift) {
	const selfScore = selfLift?.cardRank ? getContinuousTierScore(selfLift.cardRank) : -1;
	const friendScore = friendLift?.cardRank ? getContinuousTierScore(friendLift.cardRank) : -1;
	if (selfScore === friendScore) return "Tie";
	return selfScore > friendScore ? "You lead" : "Friend leads";
}
function MuscleModelPair({ label, muscleChartData, setSelectedMuscleGroup }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "friend-compare-model-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "friend-compare-model-title",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "ranks-muscle-models",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-muscle-model",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ranks-muscle-model-label",
					children: "Front"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ranks-muscle-model-stack",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
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
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-muscle-model",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ranks-muscle-model-label",
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ranks-muscle-model-stack",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
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
					})
				})]
			})]
		})]
	});
}
function FriendProfileDetail({ friendId, fallbackProfile = null, onBack }) {
	const currentUserId = useCurrentUserId();
	const [profile, setProfile] = (0, import_react.useState)(fallbackProfile);
	const [lifts, setLifts] = (0, import_react.useState)([]);
	const [workoutStreak, setWorkoutStreak] = (0, import_react.useState)(0);
	const [selfProfile, setSelfProfile] = (0, import_react.useState)(null);
	const [selfLifts, setSelfLifts] = (0, import_react.useState)([]);
	const [rankDisplayMode, setRankDisplayMode] = (0, import_react.useState)(readRankDisplayMode);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)("");
	const [search, setSearch] = (0, import_react.useState)("");
	const [selectedMuscleGroup, setSelectedMuscleGroup] = (0, import_react.useState)(null);
	const [compareMode, setCompareMode] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		try {
			localStorage.setItem(RANK_DISPLAY_MODE_STORAGE_KEY, rankDisplayMode);
		} catch {}
	}, [rankDisplayMode]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		async function load() {
			if (!friendId) return;
			setLoading(true);
			setError("");
			try {
				const [friendBundle, selfBundle] = await Promise.all([loadRankBundle(friendId, {
					fallbackProfile,
					includeSessions: true
				}), currentUserId ? loadRankBundle(currentUserId) : Promise.resolve(null)]);
				if (!cancelled) {
					setProfile(friendBundle.profile);
					setLifts(friendBundle.lifts);
					setWorkoutStreak(friendBundle.workoutStreak);
					setSelfProfile(selfBundle?.profile || null);
					setSelfLifts(selfBundle?.lifts || []);
				}
			} catch (err) {
				if (!cancelled) setError(err?.message || "Could not load this friend profile right now.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		const timer = setTimeout(load, 0);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		currentUserId,
		fallbackProfile,
		friendId
	]);
	const useLbs = profile?.unit_preference === "lbs";
	const fmt = (kg) => useLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;
	const gender = profile?.gender?.toLowerCase() === "female" ? "female" : "male";
	const bodyweightKg = profile?.bodyweight ? convertWeight(profile.bodyweight, profile?._bodyweightUnit || profile?.unit_preference || "kg", "kg") : null;
	const selfUseLbs = selfProfile?.unit_preference === "lbs";
	const selfFmt = (kg) => selfUseLbs ? `${kgToLbs(kg).toFixed(1)} lbs` : `${kg.toFixed(1)} kg`;
	const selfGender = selfProfile?.gender?.toLowerCase() === "female" ? "female" : "male";
	const selfBodyweightKg = selfProfile?.bodyweight ? convertWeight(selfProfile.bodyweight, selfProfile?.unit_preference || "kg", "kg") : null;
	const canCompare = Boolean(selfProfile?.id && selfProfile.id !== friendId);
	const isActiveMode = rankDisplayMode === ACTIVE_RANK_MODE;
	const liftsWithDetails = (0, import_react.useMemo)(() => buildLiftDetails(lifts, bodyweightKg, gender, rankDisplayMode), [
		bodyweightKg,
		gender,
		lifts,
		rankDisplayMode
	]);
	const selfLiftsWithDetails = (0, import_react.useMemo)(() => buildLiftDetails(selfLifts, selfBodyweightKg, selfGender, rankDisplayMode), [
		selfBodyweightKg,
		selfGender,
		selfLifts,
		rankDisplayMode
	]);
	const muscleGroupRanks = (0, import_react.useMemo)(() => MUSCLE_GROUPS.map((group) => buildMuscleGroupRank(group, liftsWithDetails)), [liftsWithDetails]);
	const selfMuscleGroupRanks = (0, import_react.useMemo)(() => MUSCLE_GROUPS.map((group) => buildMuscleGroupRank(group, selfLiftsWithDetails)), [selfLiftsWithDetails]);
	const selectedMuscleGroupData = muscleGroupRanks.find((group) => group.key === selectedMuscleGroup) ?? null;
	const selfSelectedMuscleGroupData = selfMuscleGroupRanks.find((group) => group.key === selectedMuscleGroup) ?? null;
	const muscleChartData = buildMuscleChartData(muscleGroupRanks);
	const selfMuscleChartData = buildMuscleChartData(selfMuscleGroupRanks);
	const filteredLifts = (0, import_react.useMemo)(() => {
		const query = search.trim().toLowerCase();
		return liftsWithDetails.filter((lift) => {
			if (selectedMuscleGroupData && getMuscleContributionWeight(lift, selectedMuscleGroupData) === 0) return false;
			if (!query) return true;
			return lift.name.toLowerCase().includes(query) || lift.category.toLowerCase().includes(query);
		}).slice().sort(sortLiftRows);
	}, [
		liftsWithDetails,
		search,
		selectedMuscleGroupData
	]);
	const comparisonRows = (0, import_react.useMemo)(() => {
		if (!canCompare) return [];
		const byName = /* @__PURE__ */ new Map();
		const includeLift = (lift) => {
			if (!lift?.cardRank) return;
			const existing = byName.get(lift.name) || {
				name: lift.name,
				category: lift.category,
				selfLift: null,
				friendLift: null
			};
			byName.set(lift.name, existing);
		};
		selfLiftsWithDetails.forEach(includeLift);
		liftsWithDetails.forEach(includeLift);
		selfLiftsWithDetails.forEach((lift) => {
			const row = byName.get(lift.name);
			if (row) row.selfLift = lift;
		});
		liftsWithDetails.forEach((lift) => {
			const row = byName.get(lift.name);
			if (row) row.friendLift = lift;
		});
		const query = search.trim().toLowerCase();
		return [...byName.values()].filter((row) => {
			if (selectedMuscleGroup) {
				const selfMatches = selfSelectedMuscleGroupData && row.selfLift ? getMuscleContributionWeight(row.selfLift, selfSelectedMuscleGroupData) > 0 : false;
				const friendMatches = selectedMuscleGroupData && row.friendLift ? getMuscleContributionWeight(row.friendLift, selectedMuscleGroupData) > 0 : false;
				if (!selfMatches && !friendMatches) return false;
			}
			if (!query) return true;
			return row.name.toLowerCase().includes(query) || row.category.toLowerCase().includes(query);
		}).sort((a, b) => sortLiftRows(a.selfLift || a.friendLift, b.selfLift || b.friendLift));
	}, [
		canCompare,
		liftsWithDetails,
		search,
		selectedMuscleGroup,
		selectedMuscleGroupData,
		selfLiftsWithDetails,
		selfSelectedMuscleGroupData
	]);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { fullPage: true });
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "friend-profile-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "friend-profile-header",
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
				children: "Friend Profile"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ranks-empty",
			children: error
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "friend-profile-screen ranks-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "friend-profile-header",
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "friend-profile-identity",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "friend-profile-title",
						children: getDisplayName(profile)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "friend-profile-subtitle",
						children: [
							profile?.username ? `@${profile.username}` : "No username",
							" · ",
							filteredLifts.length,
							" ranked exercise",
							filteredLifts.length === 1 ? "" : "s",
							" · ",
							isActiveMode ? "Current" : "All-Time",
							" ranks"
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "friend-profile-streak",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "friend-profile-streak-label",
					children: "Streak"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "friend-profile-streak-value",
					children: [
						workoutStreak,
						" day",
						workoutStreak === 1 ? "" : "s"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-mode-toggle",
				role: "tablist",
				"aria-label": "Friend rank display mode",
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
			}),
			canCompare && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "friend-profile-view-toggle",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `friend-profile-view-btn${!compareMode ? " active" : ""}`,
					onClick: () => setCompareMode(false),
					children: "Friend"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `friend-profile-view-btn${compareMode ? " active" : ""}`,
					onClick: () => setCompareMode(true),
					children: "Compare"
				})]
			}),
			!compareMode && !bodyweightKg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-notice",
				children: "This friend has not set a bodyweight yet, so ranks cannot be calculated."
			}),
			compareMode && (!bodyweightKg || !selfBodyweightKg) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-notice",
				children: !selfBodyweightKg && !bodyweightKg ? "You and this friend both need bodyweight entries for a full rank comparison." : !selfBodyweightKg ? "Add your bodyweight to compare your ranks against this friend." : "This friend has not set a bodyweight yet, so the comparison is partial."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ranks-muscle-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ranks-muscle-panel-top",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ranks-muscle-title",
							children: compareMode ? "Body Graph Comparison" : "Muscle Group Ranks"
						}) })
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
						className: "ranks-muscle-map-shell",
						children: compareMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "friend-compare-model-grid",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MuscleModelPair, {
								label: "You",
								muscleChartData: selfMuscleChartData,
								setSelectedMuscleGroup
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MuscleModelPair, {
								label: getDisplayName(profile),
								muscleChartData,
								setSelectedMuscleGroup
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ranks-muscle-models",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ranks-muscle-model",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ranks-muscle-model-label",
									children: "Front"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ranks-muscle-model-stack",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
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
									})
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ranks-muscle-model",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ranks-muscle-model-label",
									children: "Back"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ranks-muscle-model-stack",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
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
									})
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
								children: compareMode && selfSelectedMuscleGroupData ? `You: ${selfSelectedMuscleGroupData.tier} · ${getDisplayName(profile)}: ${selectedMuscleGroupData.tier}` : selectedMuscleGroupData.tier
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ranks-muscle-active-sub",
								children: compareMode && selfSelectedMuscleGroupData ? `You: ${selfSelectedMuscleGroupData.matchingLiftCount} exercise${selfSelectedMuscleGroupData.matchingLiftCount === 1 ? "" : "s"} · ${getDisplayName(profile)}: ${selectedMuscleGroupData.matchingLiftCount} exercise${selectedMuscleGroupData.matchingLiftCount === 1 ? "" : "s"}` : `${selectedMuscleGroupData.matchingLiftCount} exercise${selectedMuscleGroupData.matchingLiftCount === 1 ? "" : "s"} in this group${selectedMuscleGroupData.contributionCount > 0 ? ` · ${selectedMuscleGroupData.contributionCount} ranked` : ""}`
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "ranks-search",
				type: "text",
				placeholder: compareMode ? selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} comparisons...` : "Search rank comparisons..." : selectedMuscleGroupData ? `Search ${selectedMuscleGroupData.label.toLowerCase()} exercises...` : "Search ranked exercises...",
				value: search,
				onChange: (e) => setSearch(e.target.value)
			}),
			!compareMode && (filteredLifts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-empty",
				children: search.trim() ? `No ranked exercises match "${search.trim()}".` : "No ranked exercises to show yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lift-cards",
				children: filteredLifts.map((lift) => {
					if (!lift.cardRank) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lift-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-card-top",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-name",
									children: lift.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "lift-category",
									children: lift.category
								})] })
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
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-no-bw",
								children: "Bodyweight is needed to calculate this rank."
							})
						]
					}, lift.name);
					const { ratio, tier, color, progress, isMax, nextTier } = lift.cardRank;
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
									className: "lift-right",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "lift-orm",
										children: fmt(lift.ormKg)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lift-ratio",
										children: [ratio.toFixed(2), "× BW"]
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
							})
						]
					}, lift.name);
				})
			})),
			compareMode && (comparisonRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ranks-empty",
				children: search.trim() ? `No comparable ranked exercises match "${search.trim()}".` : "No comparable ranked exercises to show yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "friend-compare-cards",
				children: comparisonRows.map((row) => {
					const selfRank = row.selfLift?.cardRank;
					const friendRank = row.friendLift?.cardRank;
					const leader = getComparisonLeader(row.selfLift, row.friendLift);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "friend-compare-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "friend-compare-card-top",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-name",
								children: row.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lift-category",
								children: row.category
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "friend-compare-leader",
								children: leader
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "friend-compare-columns",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "friend-compare-column",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "friend-compare-column-label",
										children: "You"
									}), selfRank ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "tier-badge",
										style: {
											background: selfRank.color + "22",
											color: selfRank.color
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
											tier: tierGroup(selfRank.tier),
											size: 18
										}), selfRank.tier]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "friend-compare-metric",
										children: [
											selfFmt(row.selfLift.ormKg),
											" · ",
											selfRank.ratio.toFixed(2),
											"× BW"
										]
									})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "friend-compare-empty",
										children: "Unranked"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "friend-compare-divider" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "friend-compare-column",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "friend-compare-column-label",
										children: getDisplayName(profile)
									}), friendRank ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "tier-badge",
										style: {
											background: friendRank.color + "22",
											color: friendRank.color
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankBadge, {
											tier: tierGroup(friendRank.tier),
											size: 18
										}), friendRank.tier]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "friend-compare-metric",
										children: [
											fmt(row.friendLift.ormKg),
											" · ",
											friendRank.ratio.toFixed(2),
											"× BW"
										]
									})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "friend-compare-empty",
										children: "Unranked"
									})]
								})
							]
						})]
					}, row.name);
				})
			}))
		]
	});
}
//#endregion
//#region src/components/Achievements.jsx
var TIER_STYLES = {
	bronze: {
		color: "#cd7f32",
		bg: "rgba(205,127,50,0.15)",
		border: "rgba(205,127,50,0.4)"
	},
	silver: {
		color: "#9ca3af",
		bg: "rgba(156,163,175,0.15)",
		border: "rgba(156,163,175,0.4)"
	},
	gold: {
		color: "#eab308",
		bg: "rgba(234,179,8,0.15)",
		border: "rgba(234,179,8,0.4)"
	},
	platinum: {
		color: "#60a5fa",
		bg: "rgba(96,165,250,0.15)",
		border: "rgba(96,165,250,0.4)"
	},
	diamond: {
		color: "#a78bfa",
		bg: "rgba(167,139,250,0.15)",
		border: "rgba(167,139,250,0.4)"
	}
};
var TIER_ICONS = {
	bronze: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "18",
		height: "18",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 22V12" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 12C12 12 8 8 4 9c0 4 4 7 8 7s8-3 8-7c-4-1-8 3-8 3z" })]
	}),
	silver: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "18",
		height: "18",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "15",
			r: "5"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8.5 8.5 8 4l4 2 4-2-.5 4.5" })]
	}),
	gold: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "18",
		height: "18",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 9H4a2 2 0 0 1-2-2V5h4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18 9h2a2 2 0 0 0 2-2V5h-4" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 3h12v7a6 6 0 0 1-12 0V3z" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 22h6" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 16v6" })
		]
	}),
	platinum: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "18",
		height: "18",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 20h20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 20 2 8l5 4 5-7 5 7 5-4-2 12" })]
	}),
	diamond: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "18",
		height: "18",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12 6 4h12l4 8-10 8L2 12z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 4l4 8M18 4l-4 8M2 12h20" })]
	})
};
var CAT_ICONS = {
	Strength: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "15",
		height: "15",
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
	}),
	Consistency: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "15",
		height: "15",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "4",
				width: "18",
				height: "18",
				rx: "2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "16",
				y1: "2",
				x2: "16",
				y2: "6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "8",
				y1: "2",
				x2: "8",
				y2: "6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "3",
				y1: "10",
				x2: "21",
				y2: "10"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "9 16 11 18 15 14" })
		]
	}),
	Nutrition: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		width: "15",
		height: "15",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 6v6l4 2" })]
	})
};
function Achievements({ onBack }) {
	const userId = useCurrentUserId();
	const [unlocked, setUnlocked] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [loading, setLoading] = (0, import_react.useState)(true);
	async function load() {
		const cached = getCached("achievements");
		if (cached) {
			setUnlocked(new Set(cached));
			setLoading(false);
			return;
		}
		const [{ data: profileData }, { data: prs }, { data: nutData }] = await Promise.all([
			fetchProfileWithWorkoutCount(userId, ["lifetime_volume_kg"]),
			supabase.from("exercise_prs").select("best_1rm_kg, exercises!inner(name)").eq("user_id", userId),
			supabase.from("nutrition_logs").select("log_date").eq("user_id", userId).limit(1e3)
		]);
		const maxOrmKg = {};
		for (const pr of prs || []) {
			const name = pr.exercises.name.toLowerCase();
			if ((pr.best_1rm_kg || 0) > 0) maxOrmKg[name] = Math.max(maxOrmKg[name] || 0, pr.best_1rm_kg);
		}
		const totalVolumeKg = profileData?.lifetime_volume_kg ?? 0;
		const sessionCount = Math.max(0, Number(profileData?.workout_count) || 0);
		const nutDayCount = new Set((nutData || []).map((n) => n.log_date)).size;
		const unlockedIds = /* @__PURE__ */ new Set();
		for (const a of ACHIEVEMENTS) if (a.match) {
			if (Object.entries(maxOrmKg).filter(([name]) => name.includes(a.match)).reduce((max, [, orm]) => Math.max(max, orm), 0) >= a.kgTarget) unlockedIds.add(a.id);
		} else if (a.sessions !== void 0) {
			if ((sessionCount || 0) >= a.sessions) unlockedIds.add(a.id);
		} else if (a.nutDays !== void 0) {
			if (nutDayCount >= a.nutDays) unlockedIds.add(a.id);
		} else if (a.totalVolumeKg !== void 0) {
			if (totalVolumeKg >= a.totalVolumeKg) unlockedIds.add(a.id);
		}
		setCached("achievements", [...unlockedIds], 600 * 1e3);
		setUnlocked(unlockedIds);
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
	}, [userId]);
	const total = ACHIEVEMENTS.length;
	const count = unlocked.size;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "ach-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "ach-topbar",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "ach-back",
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
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ach-title",
				children: "Achievements"
			}), !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ach-sub",
				children: [
					count,
					" / ",
					total,
					" unlocked"
				]
			})] })]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ach-loading",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingSpinner, { size: "lg" })
		}) : CATEGORIES.map((cat) => {
			const items = ACHIEVEMENTS.filter((a) => a.cat === cat);
			const catUnlocked = items.filter((a) => unlocked.has(a.id)).length;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ach-section",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ach-section-header",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ach-section-icon",
							children: CAT_ICONS[cat]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ach-section-name",
							children: cat
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ach-section-count",
							children: [
								catUnlocked,
								"/",
								items.length
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ach-list",
					children: items.map((a) => {
						const done = unlocked.has(a.id);
						const ts = TIER_STYLES[a.tier];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `ach-card ${done ? "ach-card-done" : ""}`,
							style: done ? {
								background: ts.bg,
								borderColor: ts.border
							} : {},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "ach-badge",
								style: done ? {
									background: ts.bg,
									borderColor: ts.border,
									color: ts.color
								} : {},
								children: done ? a.emoji ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontSize: "20px",
										lineHeight: 1
									},
									children: a.emoji
								}) : TIER_ICONS[a.tier] : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									width: "15",
									height: "15",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
										x: "3",
										y: "11",
										width: "18",
										height: "11",
										rx: "2"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "ach-info",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ach-name",
									style: done ? { color: ts.color } : {},
									children: a.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "ach-desc",
									children: a.desc
								})]
							})]
						}, a.id);
					})
				})]
			}, cat);
		})]
	});
}
//#endregion
//#region src/components/Profile.jsx
function Profile({ onChallenge, onWorkoutDeleted, workoutActive = false }) {
	const currentUser = useCurrentUser();
	const { themeId, switchTheme, previewTheme, themes } = useTheme();
	const profileIdRef = (0, import_react.useRef)(null);
	(0, import_react.useRef)(null);
	const [themeToast, setThemeToast] = (0, import_react.useState)(null);
	async function savePreferredTheme() {
		if (profileIdRef.current) {
			const { error } = await supabase.from("profiles").update({ theme: themeId }).eq("id", profileIdRef.current);
			if (error) return;
			switchTheme(themeId);
			setThemeToast(themes.find((t) => t.id === themeId)?.name || themeId);
		}
	}
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [email, setEmail] = (0, import_react.useState)("");
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)({});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [saveError, setSaveError] = (0, import_react.useState)("");
	const [viewingSession, setViewingSession] = (0, import_react.useState)(null);
	const [viewingAchievements, setViewingAchievements] = (0, import_react.useState)(false);
	const [viewingFriendProfile, setViewingFriendProfile] = (0, import_react.useState)(null);
	const [showBugReport, setShowBugReport] = (0, import_react.useState)(false);
	const [bugMessage, setBugMessage] = (0, import_react.useState)("");
	const [bugSubmitting, setBugSubmitting] = (0, import_react.useState)(false);
	const [bugSubmitted, setBugSubmitted] = (0, import_react.useState)(false);
	const [bugError, setBugError] = (0, import_react.useState)("");
	async function load() {
		const cached = getCached("profile");
		const currentEmail = currentUser.email || "";
		if (cached) {
			setEmail(currentEmail || cached.email || "");
			setProfile(cached.profile);
			profileIdRef.current = cached.profile?.id ?? null;
			if (cached.profile?.theme && !localStorage.getItem("theme")) switchTheme(cached.profile.theme);
		}
		if (!cached) {
			const { data: profileData } = await supabase.from("profiles").select("id, theme, username, full_name, age, gender, unit_preference, default_rest_seconds, bodyweight").eq("id", currentUser.id).single();
			setCached("profile", {
				email: currentEmail,
				profile: profileData
			});
			setEmail(currentEmail);
			if (profileData) {
				setProfile(profileData);
				profileIdRef.current = profileData.id;
				if (profileData.theme && !localStorage.getItem("theme")) switchTheme(profileData.theme);
			}
		}
	}
	const loadLatest = (0, import_react.useEffectEvent)(() => {
		load();
	});
	(0, import_react.useEffect)(() => {
		const timer = setTimeout(() => {
			loadLatest();
		}, 0);
		return () => clearTimeout(timer);
	}, [currentUser.id]);
	function startEdit() {
		setSaveError("");
		setForm({
			username: profile?.username || "",
			full_name: profile?.full_name || "",
			age: profile?.age ?? "",
			gender: profile?.gender || "",
			unit_preference: profile?.unit_preference || "kg",
			default_rest_seconds: profile?.default_rest_seconds ?? 90
		});
		setEditing(true);
	}
	async function saveProfile() {
		setSaving(true);
		setSaveError("");
		const fullNameError = validateLength(form.full_name, {
			label: "Full name",
			min: 1,
			max: VALIDATION_LIMITS.fullNameMaxLength,
			required: true
		});
		const usernameError = validateUsername(form.username);
		const ageError = validateNumber(form.age, {
			label: "Age",
			min: VALIDATION_LIMITS.ageMin,
			max: VALIDATION_LIMITS.ageMax,
			integer: true
		});
		const restError = validateNumber(form.default_rest_seconds, {
			label: "Rest time",
			min: VALIDATION_LIMITS.restSecondsMin,
			max: VALIDATION_LIMITS.restSecondsMax,
			integer: true,
			required: true
		});
		const validationError = fullNameError || usernameError || ageError || restError;
		if (validationError) {
			setSaveError(validationError);
			setSaving(false);
			return;
		}
		const isUnitPreferenceChanging = Boolean(profile?.unit_preference && form.unit_preference && profile.unit_preference !== form.unit_preference);
		const updates = {
			...form,
			username: normalizeUsername(form.username) || null,
			full_name: form.full_name.trim(),
			age: form.age ? parseInt(form.age) : null,
			default_rest_seconds: Number(form.default_rest_seconds),
			bodyweight: form.bodyweight !== void 0 ? form.bodyweight ? parseFloat(form.bodyweight) : null : profile?.bodyweight ?? null
		};
		if (isUnitPreferenceChanging) try {
			const { data: latestWeightLog } = await supabase.from("body_weight_logs").select("weight, unit").eq("user_id", currentUser.id).order("logged_at", { ascending: false }).limit(1).maybeSingle();
			const sourceWeight = latestWeightLog?.weight ?? profile?.bodyweight;
			const sourceUnit = latestWeightLog?.unit || profile?.unit_preference || form.unit_preference;
			if (sourceWeight !== null && sourceWeight !== void 0) updates.bodyweight = Math.round(convertWeight(sourceWeight, sourceUnit, form.unit_preference) * 10) / 10;
		} catch {
			setSaving(false);
			return;
		}
		const { data, error } = await supabase.from("profiles").update(updates).eq("id", currentUser.id).select().single();
		if (!error) {
			setProfile(data);
			invalidateCache("profile", "home", "ranks");
			setEditing(false);
		} else if (error.code === "23505" || error.message?.toLowerCase().includes("username")) setSaveError("That username is already in use.");
		else setSaveError(error.message || "Could not save your profile.");
		setSaving(false);
	}
	async function signOut() {
		clearCache();
		await supabase.auth.signOut();
	}
	function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
		setViewingSession({
			sessionIds: remainingSessionIds,
			dateStr
		});
		load();
		onWorkoutDeleted?.();
	}
	const initials = profile?.full_name ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : email?.[0]?.toUpperCase() || "?";
	if (viewingAchievements) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Achievements, { onBack: () => setViewingAchievements(false) });
	if (viewingSession) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkoutDayDetail, {
		sessionIds: viewingSession.sessionIds ?? [],
		dateStr: viewingSession.dateStr,
		onDeleteWorkout: handleDeletedWorkout,
		onRefresh: load,
		onBack: () => setViewingSession(null)
	});
	if (viewingFriendProfile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FriendProfileDetail, {
		friendId: viewingFriendProfile.id,
		fallbackProfile: viewingFriendProfile,
		onBack: () => setViewingFriendProfile(null)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "profile-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "profile-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "avatar",
					children: initials
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "profile-name",
					children: profile?.full_name || profile?.username || "User"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "profile-email",
					children: email
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "achievements-btn",
				onClick: () => setViewingAchievements(true),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
					width: "16",
					height: "16",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" })
				}), "Achievements"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "theme-section",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "theme-section-label",
						children: "Theme"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "theme-swatches",
						children: themes.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "theme-swatch-wrap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `theme-swatch ${themeId === t.id ? "active" : ""}`,
								style: { background: `linear-gradient(135deg, ${t.vars["--surface2"]} 50%, ${t.accent} 50%)` },
								onClick: () => previewTheme(t.id),
								title: t.name,
								children: themeId === t.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
									width: "14",
									height: "14",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "white",
									strokeWidth: "3",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", { points: "20 6 9 17 4 12" })
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "theme-swatch-name",
								children: t.name
							})]
						}, t.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "theme-save-btn",
						onClick: savePreferredTheme,
						children: "Set as preferred colour"
					})
				]
			}),
			editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "profile-form",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "form-label",
							children: "Full Name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "form-input",
							value: form.full_name,
							maxLength: VALIDATION_LIMITS.fullNameMaxLength,
							onChange: (e) => {
								setSaveError("");
								setForm((f) => ({
									...f,
									full_name: e.target.value
								}));
							},
							placeholder: "Your name"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "form-label",
							children: "Username"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "form-input",
							value: form.username,
							maxLength: VALIDATION_LIMITS.usernameMaxLength + 1,
							onChange: (e) => {
								setSaveError("");
								setForm((f) => ({
									...f,
									username: e.target.value
								}));
							},
							placeholder: "@username"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "form-label",
							children: "Age"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "form-input",
							type: "number",
							min: VALIDATION_LIMITS.ageMin,
							max: VALIDATION_LIMITS.ageMax,
							step: "1",
							inputMode: "numeric",
							value: form.age,
							onChange: (e) => {
								setSaveError("");
								setForm((f) => ({
									...f,
									age: e.target.value
								}));
							},
							placeholder: "25"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "form-label",
							children: "Gender"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "gender-toggle",
							children: [
								"Male",
								"Female",
								"Other"
							].map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `gender-btn ${form.gender === g ? "active" : ""}`,
								onClick: () => {
									setSaveError("");
									setForm((f) => ({
										...f,
										gender: g
									}));
								},
								children: g
							}, g))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "form-label",
							children: "Unit Preference"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "gender-toggle",
							children: ["kg", "lbs"].map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `gender-btn ${form.unit_preference === u ? "active" : ""}`,
								onClick: () => {
									setSaveError("");
									setForm((f) => ({
										...f,
										unit_preference: u
									}));
								},
								children: u
							}, u))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-group",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "form-label",
							children: "Default Rest Time"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RestTimePicker, {
							value: form.default_rest_seconds,
							onChange: (s) => {
								setSaveError("");
								setForm((f) => ({
									...f,
									default_rest_seconds: s
								}));
							}
						})]
					}),
					saveError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "profile-save-error",
						children: saveError
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "form-actions",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn-cancel",
							onClick: () => {
								setSaveError("");
								setEditing(false);
							},
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn-save",
							onClick: saveProfile,
							disabled: saving,
							children: saving ? "Saving..." : "Save Changes"
						})]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "edit-profile-btn",
				onClick: startEdit,
				children: "Edit Profile"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FriendsSection, {
				userId: profile?.id,
				username: profile?.username || "",
				profileLoaded: profile !== null,
				onChallenge,
				onViewProfile: setViewingFriendProfile,
				workoutActive
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "report-bug-btn",
				onClick: () => {
					setShowBugReport(true);
					setBugMessage("");
					setBugError("");
					setBugSubmitted(false);
				},
				children: "Report a Bug"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "signout-btn",
				onClick: signOut,
				children: "Sign Out"
			})] }),
			themeToast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "theme-toast-overlay",
				onClick: () => setThemeToast(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "theme-toast-modal",
					onClick: (e) => e.stopPropagation(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "theme-toast-msg",
						children: ["Preferred colour set to ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: themeToast })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "theme-toast-ok",
						onClick: () => setThemeToast(null),
						children: "OK"
					})]
				})
			}),
			showBugReport && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bug-report-overlay",
				onClick: () => setShowBugReport(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bug-report-modal",
					onClick: (e) => e.stopPropagation(),
					children: bugSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bug-report-title",
							children: "Thanks!"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bug-report-sent",
							children: "Your report was submitted."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "theme-toast-ok",
							onClick: () => setShowBugReport(false),
							children: "Done"
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bug-report-title",
							children: "Report a Bug"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: "bug-report-textarea",
							placeholder: "Describe what happened...",
							value: bugMessage,
							onChange: (e) => setBugMessage(e.target.value),
							maxLength: VALIDATION_LIMITS.bugReportMaxLength,
							rows: 5
						}),
						bugError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bug-report-error",
							children: bugError
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bug-report-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "bug-report-cancel",
								onClick: () => setShowBugReport(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "bug-report-submit",
								disabled: bugSubmitting || !bugMessage.trim(),
								onClick: async () => {
									if (!bugMessage.trim() || bugSubmitting) return;
									const bugValidationError = validateLength(bugMessage, {
										label: "Bug report",
										min: VALIDATION_LIMITS.bugReportMinLength,
										max: VALIDATION_LIMITS.bugReportMaxLength,
										required: true
									});
									if (bugValidationError) {
										setBugError(bugValidationError);
										return;
									}
									setBugSubmitting(true);
									setBugError("");
									const since = (/* @__PURE__ */ new Date(Date.now() - 1440 * 60 * 1e3)).toISOString();
									const { count } = await supabase.from("bug_reports").select("*", {
										count: "exact",
										head: true
									}).eq("user_id", currentUser.id).gte("created_at", since);
									if (count >= 10) {
										setBugSubmitting(false);
										setBugError("You've submitted 10 reports in the last 24 hours. Please try again later.");
										return;
									}
									const { error } = await supabase.from("bug_reports").insert({
										user_id: currentUser.id,
										message: bugMessage.trim()
									});
									setBugSubmitting(false);
									if (error) setBugError("Could not submit. Please try again.");
									else {
										setBugSubmitted(true);
										setBugMessage("");
									}
								},
								children: bugSubmitting ? "Submitting..." : "Submit"
							})]
						})
					] })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "profile-made-by",
				children: "microload by Harisman"
			})
		]
	});
}
//#endregion
export { Profile as default };

//# sourceMappingURL=Profile-CQEQQtN0.js.map