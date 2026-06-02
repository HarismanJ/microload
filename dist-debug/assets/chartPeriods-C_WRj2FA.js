//#region src/lib/chartPeriods.js
var CHART_PERIOD_OPTIONS = [
	{
		value: "1w",
		label: "1W",
		days: 7
	},
	{
		value: "1m",
		label: "1M",
		days: 30
	},
	{
		value: "3m",
		label: "3M",
		days: 90
	},
	{
		value: "1y",
		label: "1Y",
		days: 365
	},
	{
		value: "all",
		label: "All",
		days: null
	}
];
var CHART_PERIOD_DAYS = Object.fromEntries(CHART_PERIOD_OPTIONS.filter((option) => Number.isFinite(option.days)).map((option) => [option.value, option.days]));
function getChartPeriodLabel(period) {
	return CHART_PERIOD_OPTIONS.find((option) => option.value === period)?.label || "All";
}
function filterByChartPeriod(items = [], period = "all", getDate) {
	if (period === "all") return items;
	const maxAgeDays = CHART_PERIOD_DAYS[period];
	if (!Number.isFinite(maxAgeDays)) return items;
	const now = Date.now();
	return items.filter((item) => {
		const rawDate = getDate(item);
		const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
		if (Number.isNaN(date.getTime())) return false;
		return (now - date.getTime()) / 864e5 <= maxAgeDays;
	});
}
//#endregion
export { filterByChartPeriod as n, getChartPeriodLabel as r, CHART_PERIOD_OPTIONS as t };

//# sourceMappingURL=chartPeriods-C_WRj2FA.js.map