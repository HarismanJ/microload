#!/usr/bin/env python3

import argparse
import csv
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"a": SPREADSHEET_NS}

EQUIPMENT_LABELS = {
    "barbell": "Barbell",
    "bodyweight": "Bodyweight",
    "cable": "Cable",
    "dumbbell": "Dumbbell",
    "ez bar": "EZ Bar",
    "machine": "Machine",
}

CATEGORY_MUSCLES = {
    "Push": {"Chest", "Upper Chest", "Lower Chest", "Triceps", "Front Delts", "Lateral Delts"},
    "Pull": {"Lats", "Upper Back", "Rhomboids", "Rear Delts", "Biceps", "Forearms", "Traps"},
    "Legs": {"Quads", "Glutes", "Hamstrings", "Calves", "Shins", "Adductors", "Abductors", "Hip Flexors"},
    "Core": {"Core", "Abs", "Obliques", "Lower Back", "Neck"},
}

CATEGORY_PRIORITY = ["Legs", "Pull", "Push", "Core"]

LEGACY_NAME_ALIASES = {
    "Back Extension": "Machine Back Extension",
    "Barbell Reverse Curl": "Reverse Barbell Curl",
    "Barbell Row": "Bent Over Row",
    "Bicep Curl": "Barbell Curl",
    "Calf Raise": "Machine Calf Raise",
    "Cable Curl": "Cable Bicep Curl",
    "Concentration Curl": "Dumbbell Concentration Curl",
    "Decline Dumbbell Press": "Decline Dumbbell Bench Press",
    "Dumbbell Kickback": "Dumbbell Tricep Kickback",
    "Dumbbell Press": "Dumbbell Bench Press",
    "Front Raise": "Dumbbell Front Raise",
    "Incline Dumbbell Press": "Incline Dumbbell Bench Press",
    "Lateral Raise": "Dumbbell Lateral Raise",
    "Leg Press": "Horizontal Leg Press",
    "Muscle Up": "Muscle Ups",
    "Overhead Press": "Military Press",
    "Push Up": "Push Ups",
    "Seated Row Machine": "Machine Row",
    "Shoulder Press Machine": "Machine Shoulder Press",
    "Single Arm Cable Curl": "One Arm Cable Bicep Curl",
    "Single Arm Cable Hammer Curl": "One Arm Cable Bicep Curl",
    "Single Arm Cable Lateral Raise": "Cable Lateral Raise",
    "Single Arm Cable Row": "One Arm Seated Cable Row",
    "Single Arm Lat Pulldown": "One Arm Lat Pulldown",
    "Single Leg Leg Press": "Single Leg Press",
    "Skullcrusher": "Lying Tricep Extension",
    "T-Bar Row": "T Bar Row",
    "Tricep Extension Machine": "Machine Tricep Extension",
}

DEFAULT_OUTPUT_CATALOG = Path("src/data/strengthLevelCatalog.js")
DEFAULT_OUTPUT_CSV = Path("generated/exercises_rows_strengthlevel.csv")
DEFAULT_OUTPUT_REPORT = Path("generated/strengthlevel_sync_report.json")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate LiftLog exercise/import assets from the StrengthLevel workbook."
    )
    parser.add_argument("--xlsx", required=True, help="Path to the source StrengthLevel .xlsx file.")
    parser.add_argument(
        "--existing-csv",
        help="Optional path to the current exercises CSV so ids/default rest can be preserved when possible.",
    )
    parser.add_argument(
        "--output-catalog",
        default=str(DEFAULT_OUTPUT_CATALOG),
        help=f"Generated JS catalog output path. Default: {DEFAULT_OUTPUT_CATALOG}",
    )
    parser.add_argument(
        "--output-csv",
        default=str(DEFAULT_OUTPUT_CSV),
        help=f"Generated exercises CSV output path. Default: {DEFAULT_OUTPUT_CSV}",
    )
    parser.add_argument(
        "--output-report",
        default=str(DEFAULT_OUTPUT_REPORT),
        help=f"Generated sync report output path. Default: {DEFAULT_OUTPUT_REPORT}",
    )
    return parser.parse_args()


def excel_column_index(ref):
    letters = "".join(ch for ch in ref if ch.isalpha())
    index = 0
    for ch in letters:
        index = index * 26 + ord(ch.upper()) - 64
    return index


def read_shared_strings(archive):
    path = "xl/sharedStrings.xml"
    if path not in archive.namelist():
        return []

    root = ET.fromstring(archive.read(path))
    shared = []
    for item in root.findall("a:si", NS):
        parts = [node.text or "" for node in item.iterfind(".//a:t", NS)]
        shared.append("".join(parts))
    return shared


def read_sheet_rows(xlsx_path, sheet_path):
    with zipfile.ZipFile(xlsx_path) as archive:
        shared_strings = read_shared_strings(archive)
        root = ET.fromstring(archive.read(sheet_path))

    rows = root.find("a:sheetData", NS)
    if rows is None:
        return []

    parsed_rows = []
    header = None

    for row in rows.findall("a:row", NS):
        values = {}
        max_col = 0
        for cell in row.findall("a:c", NS):
            ref = cell.attrib.get("r", "")
            col_idx = excel_column_index(ref)
            cell_type = cell.attrib.get("t")
            value_node = cell.find("a:v", NS)
            value = value_node.text if value_node is not None else ""

            if cell_type == "s" and value != "":
                value = shared_strings[int(value)]
            elif cell_type == "inlineStr":
                inline = cell.find("a:is", NS)
                value = "".join(node.text or "" for node in inline.iterfind(".//a:t", NS)) if inline is not None else ""

            values[col_idx] = value
            max_col = max(max_col, col_idx)

        row_values = [values.get(idx, "") for idx in range(1, max_col + 1)]
        if header is None:
            header = row_values
            continue

        parsed_rows.append(dict(zip(header, row_values)))

    return parsed_rows


def split_muscles(raw_value):
    if not raw_value:
        return []
    return [part.strip() for part in raw_value.split(";") if part.strip()]


def round_number(value, digits=4):
    rounded = round(float(value), digits)
    if rounded == 0:
        return 0
    return rounded


def infer_category(name, primary_muscles, secondary_muscles):
    normalized = f" {name.lower()} "

    if re.search(r"\b(crunch|woodchopper|plank|side bend|neck|twist)\b", normalized):
        return "Core"
    if re.search(r"\b(calf|leg press|leg curl|leg extension|squat|deadlift|lunge|split squat|hip |glute|adduction|abduction)\b", normalized):
        return "Legs"

    scores = {category: 0 for category in CATEGORY_MUSCLES}
    for muscle in primary_muscles:
        for category, muscle_set in CATEGORY_MUSCLES.items():
            if muscle in muscle_set:
                scores[category] += 2
    for muscle in secondary_muscles:
        for category, muscle_set in CATEGORY_MUSCLES.items():
            if muscle in muscle_set:
                scores[category] += 1

    best_score = max(scores.values()) if scores else 0
    if best_score <= 0:
        return "Pull"

    best_categories = [category for category, score in scores.items() if score == best_score]
    for category in CATEGORY_PRIORITY:
        if category in best_categories:
            return category
    return best_categories[0]


def load_existing_rows(csv_path):
    if not csv_path:
        return []

    with open(csv_path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def serialize_js(value):
    return json.dumps(value, indent=2, ensure_ascii=True)


def write_text(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_catalog_rows(workbook_rows):
    catalog_rows = []
    for row in workbook_rows:
        name = (row.get("name") or "").strip()
        if not name:
            continue

        primary_muscles = split_muscles(row.get("primary_muscle", ""))
        secondary_muscles = split_muscles(row.get("secondary_muscle", ""))
        equipment_key = (row.get("equipment") or "").strip().lower()
        equipment = EQUIPMENT_LABELS.get(equipment_key, (row.get("equipment") or "").strip().title())
        male_levels = [
            round_number(row.get("beginner", 0)),
            round_number(row.get("novice", 0)),
            round_number(row.get("intermediate", 0)),
            round_number(row.get("advanced", 0)),
            round_number(row.get("elite", 0)),
        ]

        catalog_rows.append(
            {
                "name": name,
                "equipment": equipment,
                "category": infer_category(name, primary_muscles, secondary_muscles),
                "primaryMuscles": primary_muscles,
                "secondaryMuscles": secondary_muscles,
                "maleLevels": male_levels,
            }
        )

    return catalog_rows


def build_csv_rows(catalog_rows, existing_rows):
    existing_by_name = {row["name"]: row for row in existing_rows}
    used_existing_names = set()
    max_existing_id = max((int(row["id"]) for row in existing_rows if row.get("id")), default=0)
    next_id = max_existing_id + 1 if max_existing_id else 1

    csv_rows = []
    reuse_report = []

    for row in catalog_rows:
        source_row = None
        source_name = row["name"]
        source_type = "new"

        if row["name"] in existing_by_name and row["name"] not in used_existing_names:
            source_row = existing_by_name[row["name"]]
            source_type = "exact"
        else:
            for legacy_name, canonical_name in LEGACY_NAME_ALIASES.items():
                if canonical_name != row["name"]:
                    continue
                legacy_row = existing_by_name.get(legacy_name)
                if legacy_row and legacy_name not in used_existing_names:
                    source_row = legacy_row
                    source_name = legacy_name
                    source_type = "alias"
                    break

        if source_row:
            used_existing_names.add(source_name)
            row_id = int(source_row["id"])
            default_rest_seconds = source_row.get("default_rest_seconds") or ""
        else:
            row_id = next_id
            next_id += 1
            default_rest_seconds = ""

        reuse_report.append(
            {
                "canonicalName": row["name"],
                "legacyName": source_name if source_type in {"exact", "alias"} else None,
                "reuseType": source_type,
                "assignedId": row_id,
            }
        )

        csv_rows.append(
            {
                "id": row_id,
                "name": row["name"],
                "category": row["category"],
                "equipment": row["equipment"],
                "primary_muscles": json.dumps(row["primaryMuscles"], separators=(",", ":")),
                "secondary_muscles": json.dumps(row["secondaryMuscles"], separators=(",", ":")),
                "default_rest_seconds": default_rest_seconds,
                "user_id": "",
            }
        )

    csv_rows.sort(key=lambda row: row["id"])
    unused_existing = sorted(row["name"] for row in existing_rows if row["name"] not in used_existing_names)

    return csv_rows, reuse_report, unused_existing


def write_catalog_js(path, catalog_rows):
    sorted_aliases = {key: LEGACY_NAME_ALIASES[key] for key in sorted(LEGACY_NAME_ALIASES)}
    content = (
        "// Auto-generated by scripts/sync_strengthlevel_assets.py.\n"
        "// Update the workbook, then rerun the generator instead of editing this file by hand.\n\n"
        f"export const STRENGTHLEVEL_EXERCISES = {serialize_js(catalog_rows)}\n\n"
        f"export const LEGACY_STRENGTH_STANDARD_ALIASES = {serialize_js(sorted_aliases)}\n"
    )
    write_text(path, content)


def write_csv(path, csv_rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "id",
        "name",
        "category",
        "equipment",
        "primary_muscles",
        "secondary_muscles",
        "default_rest_seconds",
        "user_id",
    ]
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)


def write_report(path, xlsx_path, existing_csv_path, catalog_rows, reuse_report, unused_existing):
    summary = {
        "sourceXlsx": xlsx_path.name,
        "existingCsv": existing_csv_path.name if existing_csv_path else None,
        "exerciseCount": len(catalog_rows),
        "exactIdMatches": sum(1 for item in reuse_report if item["reuseType"] == "exact"),
        "aliasedIdMatches": sum(1 for item in reuse_report if item["reuseType"] == "alias"),
        "newIdsAssigned": sum(1 for item in reuse_report if item["reuseType"] == "new"),
        "legacyAliases": {key: LEGACY_NAME_ALIASES[key] for key in sorted(LEGACY_NAME_ALIASES)},
        "unusedExistingExercises": unused_existing,
        "idReuse": reuse_report,
    }
    write_text(path, json.dumps(summary, indent=2, ensure_ascii=True) + "\n")


def main():
    args = parse_args()

    xlsx_path = Path(args.xlsx).expanduser().resolve()
    existing_csv_path = Path(args.existing_csv).expanduser().resolve() if args.existing_csv else None
    output_catalog = Path(args.output_catalog)
    output_csv = Path(args.output_csv)
    output_report = Path(args.output_report)

    workbook_rows = read_sheet_rows(xlsx_path, "xl/worksheets/sheet1.xml")
    catalog_rows = build_catalog_rows(workbook_rows)
    existing_rows = load_existing_rows(existing_csv_path) if existing_csv_path else []
    csv_rows, reuse_report, unused_existing = build_csv_rows(catalog_rows, existing_rows)

    write_catalog_js(output_catalog, catalog_rows)
    write_csv(output_csv, csv_rows)
    write_report(output_report, xlsx_path, existing_csv_path, catalog_rows, reuse_report, unused_existing)

    print(f"Wrote {len(catalog_rows)} exercises to {output_catalog}")
    print(f"Wrote exercise import CSV to {output_csv}")
    print(f"Wrote sync report to {output_report}")


if __name__ == "__main__":
    main()
