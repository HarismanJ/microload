import { t as supabase } from "./supabase-CCACEYhB.js";
//#region src/data/strengthLevelCatalog.js
var STRENGTHLEVEL_EXERCISES = [
	{
		"name": "Barbell Calf Raise",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.5,
			1,
			1.5,
			2.25,
			3.25
		]
	},
	{
		"name": "Barbell Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.2,
			.4,
			.6,
			.85,
			1.15
		]
	},
	{
		"name": "Barbell Front Raise",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Front Delts"],
		"secondaryMuscles": ["Lateral Delts"],
		"maleLevels": [
			.05,
			.2,
			.5,
			.9,
			1.45
		]
	},
	{
		"name": "Barbell Glute Bridge",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Hamstrings"],
		"secondaryMuscles": ["Core", "Adductors"],
		"maleLevels": [
			.5,
			1,
			1.5,
			2.5,
			3.5
		]
	},
	{
		"name": "Barbell Hack Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Hamstrings"],
		"maleLevels": [
			.75,
			1,
			1.75,
			2.25,
			3
		]
	},
	{
		"name": "Barbell Lunge",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Hamstrings",
			"Adductors",
			"Core"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Barbell Power Shrug",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": [
			"Glutes",
			"Quads",
			"Calves"
		],
		"maleLevels": [
			.5,
			1.25,
			2,
			3,
			4
		]
	},
	{
		"name": "Barbell Pullover",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Lats", "Chest"],
		"secondaryMuscles": ["Triceps"],
		"maleLevels": [
			.15,
			.35,
			.6,
			.9,
			1.3
		]
	},
	{
		"name": "Barbell Reverse Lunge",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Quads"],
		"secondaryMuscles": ["Hamstrings", "Adductors"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Barbell Shrug",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.5,
			1,
			1.5,
			2.25,
			3.25
		]
	},
	{
		"name": "Behind The Back Barbell Shrug",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.5,
			1,
			1.75,
			2.25,
			3.25
		]
	},
	{
		"name": "Behind The Back Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Quads",
			"Traps",
			"Forearms"
		],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.25,
			3
		]
	},
	{
		"name": "Behind The Neck Press",
		"equipment": "Barbell",
		"category": "Core",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Lateral Delts"
		],
		"secondaryMuscles": ["Upper Back", "Core"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.5
		]
	},
	{
		"name": "Bench Pin Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.75,
			1,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2
		]
	},
	{
		"name": "Bench Pull",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Bent Arm Barbell Pullover",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Chest", "Lats"],
		"secondaryMuscles": ["Triceps", "Upper Chest"],
		"maleLevels": [
			.1,
			.2,
			.3,
			.5,
			.65
		]
	},
	{
		"name": "Bent Over Row",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Box Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Quads"],
		"secondaryMuscles": [
			"Hamstrings",
			"Adductors",
			"Core"
		],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.5,
			3.25
		]
	},
	{
		"name": "Bulgarian Split Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Hamstrings",
			"Core"
		],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Cheat Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps", "Forearms"],
		"secondaryMuscles": ["Upper Back"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.5
		]
	},
	{
		"name": "Chest Press",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Chest"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Chin Ups",
		"equipment": "Bodyweight",
		"category": "Pull",
		"primaryMuscles": ["Lats", "Biceps"],
		"secondaryMuscles": [
			"Upper Back",
			"Forearms",
			"Rhomboids"
		],
		"maleLevels": [
			.9429,
			1.1571,
			1.3857,
			1.6381,
			1.8952
		]
	},
	{
		"name": "Clean",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Traps"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.75,
			1,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Clean and Jerk",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts",
			"Triceps"
		],
		"secondaryMuscles": [
			"Traps",
			"Core",
			"Upper Back"
		],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Clean and Press",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts",
			"Triceps"
		],
		"secondaryMuscles": [
			"Traps",
			"Core",
			"Upper Back"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.25,
			1.75
		]
	},
	{
		"name": "Clean High Pull",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Traps",
			"Glutes",
			"Quads"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Clean Pull",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Traps"
		],
		"secondaryMuscles": [
			"Quads",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.5,
			1,
			1.25,
			2,
			2.5
		]
	},
	{
		"name": "Close Grip Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Triceps", "Chest"],
		"secondaryMuscles": ["Front Delts", "Upper Chest"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Close Grip Incline Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Upper Chest", "Triceps"],
		"secondaryMuscles": ["Chest", "Front Delts"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.25,
			1.5
		]
	},
	{
		"name": "Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Quads",
			"Traps",
			"Upper Back",
			"Forearms"
		],
		"maleLevels": [
			1,
			1.5,
			2,
			2.5,
			3
		]
	},
	{
		"name": "Decline Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Lower Chest",
			"Chest",
			"Triceps"
		],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.5,
			1,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Deficit Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Quads",
			"Traps",
			"Upper Back",
			"Forearms"
		],
		"maleLevels": [
			1,
			1.5,
			2,
			2.5,
			3.25
		]
	},
	{
		"name": "Dips",
		"equipment": "Bodyweight",
		"category": "Push",
		"primaryMuscles": ["Lower Chest", "Triceps"],
		"secondaryMuscles": ["Chest", "Front Delts"],
		"maleLevels": [
			1.01,
			1.268,
			1.6095,
			1.9667,
			2.3381
		]
	},
	{
		"name": "Dumbbell Bench Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.2,
			.35,
			.5,
			.75,
			1
		]
	},
	{
		"name": "Dumbbell Bulgarian Split Squat",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Hamstrings",
			"Core"
		],
		"maleLevels": [
			.15,
			.25,
			.4,
			.6,
			.8
		]
	},
	{
		"name": "Dumbbell Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.1,
			.15,
			.3,
			.5,
			.65
		]
	},
	{
		"name": "Dumbbell Fly",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Chest"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.1,
			.15,
			.3,
			.5,
			.7
		]
	},
	{
		"name": "Dumbbell Lateral Raise",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Lateral Delts"],
		"secondaryMuscles": ["Traps"],
		"maleLevels": [
			.05,
			.1,
			.2,
			.3,
			.45
		]
	},
	{
		"name": "Dumbbell Row",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.2,
			.35,
			.55,
			.8,
			1.05
		]
	},
	{
		"name": "Dumbbell Shoulder Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Lateral Delts"
		],
		"secondaryMuscles": ["Upper Chest"],
		"maleLevels": [
			.15,
			.25,
			.4,
			.6,
			.75
		]
	},
	{
		"name": "Dumbbell Shrug",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.2,
			.35,
			.6,
			.9,
			1.2
		]
	},
	{
		"name": "EZ Bar Curl",
		"equipment": "EZ Bar",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.25,
			.4,
			.6,
			.85,
			1.1
		]
	},
	{
		"name": "Floor Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Front Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Core",
			"Upper Back",
			"Adductors"
		],
		"maleLevels": [
			.75,
			1,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Goblet Squat",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Core", "Adductors"],
		"maleLevels": [
			.2,
			.35,
			.55,
			.85,
			1.15
		]
	},
	{
		"name": "Good Morning",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Hamstrings",
			"Glutes",
			"Lower Back"
		],
		"secondaryMuscles": ["Core"],
		"maleLevels": [
			.25,
			.5,
			1,
			1.75,
			2.25
		]
	},
	{
		"name": "Hack Squat",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Hamstrings"],
		"maleLevels": [
			.75,
			1.25,
			2,
			2.75,
			4
		]
	},
	{
		"name": "Half Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Core"],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.25,
			3
		]
	},
	{
		"name": "Hammer Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps", "Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			.1,
			.2,
			.3,
			.45,
			.6
		]
	},
	{
		"name": "Hang Clean",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Traps"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Hang Power Clean",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Traps"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Hang Snatch",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Traps",
			"Front Delts"
		],
		"secondaryMuscles": [
			"Quads",
			"Upper Back",
			"Core"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.25,
			1.75
		]
	},
	{
		"name": "Hex Bar Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Hamstrings"
		],
		"secondaryMuscles": [
			"Lower Back",
			"Traps",
			"Forearms"
		],
		"maleLevels": [
			1,
			1.5,
			2,
			2.75,
			3.25
		]
	},
	{
		"name": "Hex Bar Shrug",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.5,
			1,
			1.75,
			2.25,
			3.25
		]
	},
	{
		"name": "Hip Adduction",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Adductors"],
		"secondaryMuscles": ["Glutes"],
		"maleLevels": [
			.5,
			.75,
			1.5,
			2.25,
			3
		]
	},
	{
		"name": "Hip Thrust",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Hamstrings"],
		"secondaryMuscles": ["Core", "Adductors"],
		"maleLevels": [
			.5,
			1,
			1.75,
			2.5,
			3.5
		]
	},
	{
		"name": "Horizontal Leg Press",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Hamstrings"],
		"maleLevels": [
			1,
			1.5,
			2.5,
			3.5,
			4.75
		]
	},
	{
		"name": "Incline Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Upper Chest",
			"Chest",
			"Front Delts"
		],
		"secondaryMuscles": ["Triceps"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Incline Dumbbell Bench Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Upper Chest",
			"Chest",
			"Front Delts"
		],
		"secondaryMuscles": ["Triceps"],
		"maleLevels": [
			.25,
			.35,
			.5,
			.65,
			.85
		]
	},
	{
		"name": "Jefferson Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Hamstrings"
		],
		"secondaryMuscles": [
			"Lower Back",
			"Adductors",
			"Forearms"
		],
		"maleLevels": [
			.75,
			1.25,
			2,
			2.75,
			3.5
		]
	},
	{
		"name": "Jefferson Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Core",
			"Hamstrings"
		],
		"maleLevels": [
			.75,
			1,
			1.5,
			2,
			2.5
		]
	},
	{
		"name": "JM Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Chest", "Front Delts"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1,
			1.5
		]
	},
	{
		"name": "Landmine Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Upper Chest",
			"Triceps"
		],
		"secondaryMuscles": ["Core", "Lateral Delts"],
		"maleLevels": [
			.2,
			.45,
			.7,
			1.1,
			1.5
		]
	},
	{
		"name": "Landmine Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Core", "Adductors"],
		"maleLevels": [
			.25,
			.75,
			1.25,
			1.75,
			2.75
		]
	},
	{
		"name": "Lat Pulldown",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lats", "Upper Back"],
		"secondaryMuscles": [
			"Biceps",
			"Forearms",
			"Rhomboids"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Leg Extension",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.5
		]
	},
	{
		"name": "Log Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Upper Chest"
		],
		"secondaryMuscles": ["Core", "Lateral Delts"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.25,
			1.75
		]
	},
	{
		"name": "Lying Leg Curl",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Hamstrings"],
		"secondaryMuscles": ["Calves"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Lying Tricep Extension",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.2,
			.35,
			.55,
			.8,
			1.1
		]
	},
	{
		"name": "Machine Calf Raise",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.5,
			1,
			1.75,
			2.75,
			4
		]
	},
	{
		"name": "Machine Chest Fly",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": ["Chest"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Machine Shoulder Press",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Lateral Delts"
		],
		"secondaryMuscles": ["Upper Chest"],
		"maleLevels": [
			.25,
			.5,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Meadows Row",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Lats",
			"Upper Back",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Biceps",
			"Rear Delts",
			"Forearms"
		],
		"maleLevels": [
			.15,
			.3,
			.5,
			.75,
			1.05
		]
	},
	{
		"name": "Military Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Front Delts", "Triceps"],
		"secondaryMuscles": [
			"Lateral Delts",
			"Upper Chest",
			"Core"
		],
		"maleLevels": [
			.4,
			.55,
			.8,
			1.05,
			1.35
		]
	},
	{
		"name": "Muscle Snatch",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Front Delts",
			"Traps",
			"Upper Back"
		],
		"secondaryMuscles": ["Glutes", "Core"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.5
		]
	},
	{
		"name": "Muscle Ups",
		"equipment": "Bodyweight",
		"category": "Push",
		"primaryMuscles": [
			"Lats",
			"Chest",
			"Triceps"
		],
		"secondaryMuscles": [
			"Upper Back",
			"Biceps",
			"Front Delts",
			"Core"
		],
		"maleLevels": [
			.8684,
			1,
			1.1542,
			1.3381,
			1.5095
		]
	},
	{
		"name": "Neck Curl",
		"equipment": "Machine",
		"category": "Core",
		"primaryMuscles": ["Neck"],
		"secondaryMuscles": [],
		"maleLevels": [
			0,
			.25,
			.5,
			1,
			1.75
		]
	},
	{
		"name": "Neck Extension",
		"equipment": "Machine",
		"category": "Core",
		"primaryMuscles": ["Neck"],
		"secondaryMuscles": [],
		"maleLevels": [
			0,
			.25,
			.5,
			1,
			1.5
		]
	},
	{
		"name": "One Arm Landmine Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Upper Chest",
			"Triceps"
		],
		"secondaryMuscles": ["Core", "Lateral Delts"],
		"maleLevels": [
			.1,
			.2,
			.35,
			.5,
			.7
		]
	},
	{
		"name": "Overhead Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts",
			"Upper Back"
		],
		"secondaryMuscles": ["Core", "Hamstrings"],
		"maleLevels": [
			.25,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Pause Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Quads",
			"Traps",
			"Upper Back",
			"Forearms"
		],
		"maleLevels": [
			1.25,
			1.5,
			2,
			2.5,
			3.25
		]
	},
	{
		"name": "Pause Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Core",
			"Hamstrings"
		],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.25,
			2.75
		]
	},
	{
		"name": "Paused Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.75,
			1,
			1.25,
			1.75,
			2
		]
	},
	{
		"name": "Pendlay Row",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Pin Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Core",
			"Hamstrings"
		],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.5,
			3.25
		]
	},
	{
		"name": "Power Clean",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Traps"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Power Snatch",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Traps",
			"Front Delts"
		],
		"secondaryMuscles": [
			"Quads",
			"Upper Back",
			"Core"
		],
		"maleLevels": [
			.5,
			.5,
			1,
			1.25,
			1.5
		]
	},
	{
		"name": "Preacher Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.2,
			.35,
			.6,
			.85,
			1.1
		]
	},
	{
		"name": "Pull Ups",
		"equipment": "Bodyweight",
		"category": "Pull",
		"primaryMuscles": ["Lats", "Upper Back"],
		"secondaryMuscles": [
			"Biceps",
			"Forearms",
			"Rhomboids"
		],
		"maleLevels": [
			.9,
			1.1273,
			1.3857,
			1.6667,
			1.9571
		]
	},
	{
		"name": "Push Jerk",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Quads",
			"Glutes"
		],
		"secondaryMuscles": ["Core", "Upper Back"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Push Press",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Quads",
			"Glutes"
		],
		"secondaryMuscles": ["Core", "Upper Back"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			1.75
		]
	},
	{
		"name": "Push Ups",
		"equipment": "Bodyweight",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Core"],
		"maleLevels": [
			.713,
			1.104,
			1.633,
			2.254,
			2.967
		]
	},
	{
		"name": "Rack Pull",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Traps",
			"Upper Back",
			"Forearms"
		],
		"maleLevels": [
			1,
			1.75,
			2.25,
			3,
			4
		]
	},
	{
		"name": "Reverse Barbell Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms", "Biceps"],
		"secondaryMuscles": [],
		"maleLevels": [
			.15,
			.3,
			.55,
			.85,
			1.2
		]
	},
	{
		"name": "Reverse Grip Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Upper Chest", "Triceps"],
		"secondaryMuscles": ["Chest", "Front Delts"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.5
		]
	},
	{
		"name": "Reverse Wrist Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			0,
			.25,
			.75,
			1.25,
			2.25
		]
	},
	{
		"name": "Romanian Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Hamstrings", "Glutes"],
		"secondaryMuscles": ["Lower Back", "Adductors"],
		"maleLevels": [
			.75,
			1,
			1.5,
			2,
			2.75
		]
	},
	{
		"name": "Safety Bar Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Upper Back",
			"Core",
			"Adductors"
		],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.25,
			3
		]
	},
	{
		"name": "Seated Cable Row",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Seated Dumbbell Shoulder Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Lateral Delts"
		],
		"secondaryMuscles": ["Upper Chest"],
		"maleLevels": [
			.15,
			.25,
			.4,
			.55,
			.75
		]
	},
	{
		"name": "Seated Leg Curl",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Hamstrings"],
		"secondaryMuscles": ["Calves"],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Seated Shoulder Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Front Delts", "Triceps"],
		"secondaryMuscles": [
			"Lateral Delts",
			"Upper Chest",
			"Core"
		],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.5
		]
	},
	{
		"name": "Shoulder Pin Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Front Delts", "Triceps"],
		"secondaryMuscles": [
			"Lateral Delts",
			"Upper Chest",
			"Core"
		],
		"maleLevels": [
			.35,
			.55,
			.85,
			1.15,
			1.5
		]
	},
	{
		"name": "Shoulder Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Front Delts", "Triceps"],
		"secondaryMuscles": [
			"Lateral Delts",
			"Upper Chest",
			"Core"
		],
		"maleLevels": [
			.35,
			.55,
			.8,
			1.1,
			1.4
		]
	},
	{
		"name": "Single Leg Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Hamstrings"],
		"secondaryMuscles": [
			"Core",
			"Lower Back",
			"Abductors"
		],
		"maleLevels": [
			0,
			.5,
			.75,
			1.5,
			2.25
		]
	},
	{
		"name": "Single Leg Romanian Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Hamstrings"],
		"secondaryMuscles": [
			"Core",
			"Lower Back",
			"Abductors"
		],
		"maleLevels": [
			0,
			.25,
			.75,
			1.25,
			2
		]
	},
	{
		"name": "Sled Leg Press",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Hamstrings"],
		"maleLevels": [
			1,
			1.75,
			2.75,
			4,
			5.25
		]
	},
	{
		"name": "Smith Machine Bench Press",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.5,
			1,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Smith Machine Shrug",
		"equipment": "Machine",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.75,
			1,
			1.75,
			2.25,
			3
		]
	},
	{
		"name": "Smith Machine Squat",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Core",
			"Hamstrings"
		],
		"maleLevels": [
			.75,
			1,
			1.5,
			2.25,
			3
		]
	},
	{
		"name": "Snatch",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Traps",
			"Front Delts"
		],
		"secondaryMuscles": [
			"Quads",
			"Upper Back",
			"Core"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.25,
			1.75
		]
	},
	{
		"name": "Snatch Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Quads",
			"Traps",
			"Upper Back",
			"Forearms"
		],
		"maleLevels": [
			.75,
			1.25,
			1.75,
			2.25,
			3
		]
	},
	{
		"name": "Snatch Pull",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Traps"
		],
		"secondaryMuscles": [
			"Quads",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.25,
			1.75
		]
	},
	{
		"name": "Spider Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.1,
			.2,
			.45,
			.7,
			1.05
		]
	},
	{
		"name": "Split Jerk",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Quads",
			"Glutes"
		],
		"secondaryMuscles": ["Core", "Upper Back"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Split Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Hamstrings",
			"Core"
		],
		"maleLevels": [
			.25,
			.75,
			1,
			1.75,
			2.25
		]
	},
	{
		"name": "Spoto Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Core",
			"Hamstrings"
		],
		"maleLevels": [
			.75,
			1.25,
			1.5,
			2.25,
			2.75
		]
	},
	{
		"name": "Stiff Leg Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Hamstrings",
			"Glutes",
			"Lower Back"
		],
		"secondaryMuscles": ["Adductors"],
		"maleLevels": [
			.75,
			1,
			1.5,
			2,
			2.75
		]
	},
	{
		"name": "Strict Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.3,
			.45,
			.65,
			.85,
			1.1
		]
	},
	{
		"name": "Sumo Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Adductors"
		],
		"secondaryMuscles": [
			"Quads",
			"Lower Back",
			"Traps",
			"Forearms"
		],
		"maleLevels": [
			1.25,
			1.5,
			2.25,
			2.75,
			3.5
		]
	},
	{
		"name": "Sumo Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Adductors"
		],
		"secondaryMuscles": ["Hamstrings", "Core"],
		"maleLevels": [
			.25,
			.75,
			1.25,
			2,
			3
		]
	},
	{
		"name": "T Bar Row",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.5,
			.75,
			1,
			1.5,
			2
		]
	},
	{
		"name": "Thruster",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts",
			"Triceps"
		],
		"secondaryMuscles": ["Core", "Upper Chest"],
		"maleLevels": [
			.25,
			.5,
			1,
			1.25,
			1.75
		]
	},
	{
		"name": "Tricep Extension",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.15,
			.35,
			.65,
			1,
			1.4
		]
	},
	{
		"name": "Tricep Pushdown",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1,
			1.5
		]
	},
	{
		"name": "Upright Row",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Lateral Delts", "Traps"],
		"secondaryMuscles": ["Front Delts", "Upper Back"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.5
		]
	},
	{
		"name": "Viking Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Upper Chest"
		],
		"secondaryMuscles": ["Core", "Lateral Delts"],
		"maleLevels": [
			.25,
			.75,
			1.25,
			1.75,
			2.5
		]
	},
	{
		"name": "Walking Lunge",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Hamstrings",
			"Adductors",
			"Core"
		],
		"maleLevels": [
			0,
			.25,
			.75,
			1.75,
			2.75
		]
	},
	{
		"name": "Wall Ball",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts"
		],
		"secondaryMuscles": ["Core", "Triceps"],
		"maleLevels": [
			.05,
			.15,
			.25,
			.4,
			.6
		]
	},
	{
		"name": "Wide Grip Bench Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2
		]
	},
	{
		"name": "Wrist Curl",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			0,
			.25,
			.75,
			1.25,
			2
		]
	},
	{
		"name": "Yates Row",
		"equipment": "Barbell",
		"category": "Pull",
		"primaryMuscles": [
			"Lats",
			"Upper Back",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Biceps",
			"Rear Delts",
			"Forearms"
		],
		"maleLevels": [
			.75,
			1,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Z Press",
		"equipment": "Barbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Core"
		],
		"secondaryMuscles": ["Upper Back", "Lateral Delts"],
		"maleLevels": [
			.3,
			.5,
			.7,
			.95,
			1.25
		]
	},
	{
		"name": "Zercher Deadlift",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Hamstrings"
		],
		"secondaryMuscles": [
			"Lower Back",
			"Traps",
			"Forearms",
			"Core"
		],
		"maleLevels": [
			.5,
			1,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Zercher Squat",
		"equipment": "Barbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Core",
			"Upper Back",
			"Adductors"
		],
		"maleLevels": [
			.5,
			1,
			1.5,
			2,
			2.5
		]
	},
	{
		"name": "Cable Bicep Curl",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.15,
			.35,
			.65,
			1.05,
			1.5
		]
	},
	{
		"name": "Cable Crunch",
		"equipment": "Cable",
		"category": "Core",
		"primaryMuscles": ["Core"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.25,
			.5,
			1,
			1.5,
			2.25
		]
	},
	{
		"name": "Cable External Rotation",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Rear Delts"],
		"secondaryMuscles": ["Upper Back"],
		"maleLevels": [
			.05,
			.1,
			.25,
			.45,
			.65
		]
	},
	{
		"name": "Cable Fly",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Chest"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.05,
			.25,
			.5,
			.85,
			1.35
		]
	},
	{
		"name": "Cable Hammer Curl",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Biceps", "Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			.1,
			.15,
			.25,
			.4,
			.55
		]
	},
	{
		"name": "Cable Kickback",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Rear Delts"],
		"maleLevels": [
			.05,
			.15,
			.25,
			.4,
			.6
		]
	},
	{
		"name": "Cable Lateral Raise",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Lateral Delts"],
		"secondaryMuscles": ["Traps"],
		"maleLevels": [
			0,
			.1,
			.25,
			.45,
			.75
		]
	},
	{
		"name": "Cable Leg Extension",
		"equipment": "Cable",
		"category": "Legs",
		"primaryMuscles": ["Quads"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.1,
			.25,
			.45,
			.75,
			1.1
		]
	},
	{
		"name": "Cable Overhead Tricep Extension",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.15,
			.3,
			.55,
			.85,
			1.25
		]
	},
	{
		"name": "Cable Pull Through",
		"equipment": "Cable",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Hamstrings"],
		"secondaryMuscles": ["Lower Back", "Adductors"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Cable Reverse Fly",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Rear Delts", "Rhomboids"],
		"secondaryMuscles": ["Upper Back", "Traps"],
		"maleLevels": [
			.05,
			.15,
			.35,
			.65,
			.95
		]
	},
	{
		"name": "Cable Shrug",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.25,
			.75,
			1,
			1.75,
			2.25
		]
	},
	{
		"name": "Cable Upright Row",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lateral Delts", "Traps"],
		"secondaryMuscles": ["Front Delts", "Upper Back"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Cable Woodchopper",
		"equipment": "Cable",
		"category": "Core",
		"primaryMuscles": ["Obliques", "Core"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.1,
			.25,
			.5,
			.85,
			1.25
		]
	},
	{
		"name": "Close Grip Lat Pulldown",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lats", "Upper Back"],
		"secondaryMuscles": [
			"Biceps",
			"Forearms",
			"Rhomboids"
		],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Face Pull",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": [
			"Rear Delts",
			"Upper Back",
			"Rhomboids"
		],
		"secondaryMuscles": ["Traps"],
		"maleLevels": [
			.15,
			.35,
			.6,
			.9,
			1.3
		]
	},
	{
		"name": "High Pulley Crunch",
		"equipment": "Cable",
		"category": "Core",
		"primaryMuscles": ["Core"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.35,
			.55,
			.8,
			1.1,
			1.45
		]
	},
	{
		"name": "Incline Cable Curl",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.1,
			.3,
			.6,
			1,
			1.5
		]
	},
	{
		"name": "Lying Cable Curl",
		"equipment": "Cable",
		"category": "Legs",
		"primaryMuscles": ["Hamstrings"],
		"secondaryMuscles": ["Calves"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1,
			1.5
		]
	},
	{
		"name": "One Arm Cable Bicep Curl",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.05,
			.15,
			.4,
			.8,
			1.2
		]
	},
	{
		"name": "One Arm Lat Pulldown",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lats", "Upper Back"],
		"secondaryMuscles": [
			"Biceps",
			"Forearms",
			"Rhomboids"
		],
		"maleLevels": [
			.15,
			.3,
			.5,
			.75,
			1.05
		]
	},
	{
		"name": "One Arm Pulldown",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lats"],
		"secondaryMuscles": ["Upper Back", "Triceps"],
		"maleLevels": [
			.05,
			.2,
			.45,
			.9,
			1.4
		]
	},
	{
		"name": "One Arm Seated Cable Row",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.25,
			.45,
			.75,
			1.1,
			1.5
		]
	},
	{
		"name": "Overhead Cable Curl",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.25,
			.25,
			.75,
			1,
			1.5
		]
	},
	{
		"name": "Reverse Grip Lat Pulldown",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lats", "Biceps"],
		"secondaryMuscles": [
			"Upper Back",
			"Forearms",
			"Rhomboids"
		],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.5,
			2
		]
	},
	{
		"name": "Reverse Grip Tricep Pushdown",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.15,
			.35,
			.6,
			1,
			1.45
		]
	},
	{
		"name": "Standing Cable Crunch",
		"equipment": "Cable",
		"category": "Core",
		"primaryMuscles": ["Core"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.25,
			.5,
			1,
			1.5,
			2.25
		]
	},
	{
		"name": "Straight Arm Pulldown",
		"equipment": "Cable",
		"category": "Pull",
		"primaryMuscles": ["Lats"],
		"secondaryMuscles": ["Upper Back", "Triceps"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1,
			1.5
		]
	},
	{
		"name": "Tricep Rope Pushdown",
		"equipment": "Cable",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.2,
			.35,
			.6,
			.9,
			1.25
		]
	},
	{
		"name": "Arnold Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Lateral Delts",
			"Triceps"
		],
		"secondaryMuscles": ["Upper Chest"],
		"maleLevels": [
			.2,
			.4,
			.6,
			.9,
			1.3
		]
	},
	{
		"name": "Bent Over Dumbbell Row",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.3,
			.6,
			.9,
			1.3,
			1.8
		]
	},
	{
		"name": "Chest Supported Dumbbell Row",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.2,
			.5,
			1,
			1.5,
			2.2
		]
	},
	{
		"name": "Close Grip Dumbbell Bench Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Triceps", "Chest"],
		"secondaryMuscles": ["Front Delts", "Upper Chest"],
		"maleLevels": [
			.3,
			.5,
			.9,
			1.4,
			2
		]
	},
	{
		"name": "Decline Dumbbell Bench Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Lower Chest",
			"Chest",
			"Triceps"
		],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.3,
			.6,
			1,
			1.4,
			1.9
		]
	},
	{
		"name": "Decline Dumbbell Fly",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Lower Chest", "Chest"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.2,
			.4,
			.6,
			1,
			1.4
		]
	},
	{
		"name": "Dumbbell Bench Pull",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.3,
			.6,
			1,
			1.5,
			2.1
		]
	},
	{
		"name": "Dumbbell Calf Raise",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.2,
			.5,
			1,
			1.7,
			2.5
		]
	},
	{
		"name": "Dumbbell Clean and Press",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts",
			"Triceps"
		],
		"secondaryMuscles": [
			"Traps",
			"Core",
			"Upper Back"
		],
		"maleLevels": [
			.3,
			.5,
			.8,
			1.1,
			1.5
		]
	},
	{
		"name": "Dumbbell Concentration Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.2,
			.3,
			.6,
			.9,
			1.2
		]
	},
	{
		"name": "Dumbbell Deadlift",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Hamstrings",
			"Lower Back"
		],
		"secondaryMuscles": [
			"Quads",
			"Traps",
			"Upper Back",
			"Forearms"
		],
		"maleLevels": [
			.4,
			.7,
			1.2,
			1.8,
			2.5
		]
	},
	{
		"name": "Dumbbell External Rotation",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Rear Delts"],
		"secondaryMuscles": ["Upper Back"],
		"maleLevels": [
			.1,
			.2,
			.4,
			.7,
			1
		]
	},
	{
		"name": "Dumbbell Face Pull",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": [
			"Rear Delts",
			"Upper Back",
			"Rhomboids"
		],
		"secondaryMuscles": ["Traps"],
		"maleLevels": [
			.1,
			.3,
			.6,
			.9,
			1.3
		]
	},
	{
		"name": "Dumbbell Floor Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Chest",
			"Triceps",
			"Front Delts"
		],
		"secondaryMuscles": ["Upper Back", "Lats"],
		"maleLevels": [
			.4,
			.6,
			.9,
			1.3,
			1.8
		]
	},
	{
		"name": "Dumbbell Front Raise",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Front Delts"],
		"secondaryMuscles": ["Lateral Delts"],
		"maleLevels": [
			.1,
			.2,
			.5,
			.8,
			1.1
		]
	},
	{
		"name": "Dumbbell Front Squat",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Core",
			"Upper Back",
			"Adductors"
		],
		"maleLevels": [
			.2,
			.5,
			.9,
			1.5,
			2.1
		]
	},
	{
		"name": "Dumbbell Hang Clean",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Traps"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.3,
			.5,
			.8,
			1.2,
			1.6
		]
	},
	{
		"name": "Dumbbell High Pull",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Traps",
			"Glutes",
			"Quads"
		],
		"secondaryMuscles": [
			"Hamstrings",
			"Upper Back",
			"Calves"
		],
		"maleLevels": [
			.2,
			.4,
			.7,
			1.1,
			1.5
		]
	},
	{
		"name": "Dumbbell Incline Y Raise",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Rear Delts", "Upper Back"],
		"secondaryMuscles": ["Traps", "Rhomboids"],
		"maleLevels": [
			.1,
			.3,
			.6,
			1,
			1.6
		]
	},
	{
		"name": "Dumbbell Lunge",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Hamstrings",
			"Adductors",
			"Core"
		],
		"maleLevels": [
			.2,
			.4,
			.8,
			1.2,
			1.7
		]
	},
	{
		"name": "Dumbbell Pullover",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Lats", "Chest"],
		"secondaryMuscles": ["Triceps"],
		"maleLevels": [
			.3,
			.6,
			.9,
			1.3,
			1.8
		]
	},
	{
		"name": "Dumbbell Push Press",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Quads",
			"Glutes"
		],
		"secondaryMuscles": ["Core", "Upper Back"],
		"maleLevels": [
			.2,
			.5,
			.8,
			1.2,
			1.6
		]
	},
	{
		"name": "Dumbbell Reverse Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms", "Biceps"],
		"secondaryMuscles": [],
		"maleLevels": [
			.2,
			.3,
			.6,
			.9,
			1.3
		]
	},
	{
		"name": "Dumbbell Reverse Fly",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Rear Delts", "Rhomboids"],
		"secondaryMuscles": ["Upper Back", "Traps"],
		"maleLevels": [
			.1,
			.2,
			.5,
			.8,
			1.2
		]
	},
	{
		"name": "Dumbbell Reverse Wrist Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			0,
			.2,
			.5,
			1,
			1.5
		]
	},
	{
		"name": "Dumbbell Romanian Deadlift",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Hamstrings", "Glutes"],
		"secondaryMuscles": ["Lower Back", "Adductors"],
		"maleLevels": [
			.3,
			.6,
			1.1,
			1.6,
			2.2
		]
	},
	{
		"name": "Dumbbell Side Bend",
		"equipment": "Dumbbell",
		"category": "Core",
		"primaryMuscles": ["Obliques"],
		"secondaryMuscles": ["Core"],
		"maleLevels": [
			.1,
			.4,
			.9,
			1.7,
			2.7
		]
	},
	{
		"name": "Dumbbell Snatch",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": [
			"Glutes",
			"Traps",
			"Front Delts"
		],
		"secondaryMuscles": [
			"Quads",
			"Upper Back",
			"Core"
		],
		"maleLevels": [
			.3,
			.5,
			.8,
			1.3,
			1.8
		]
	},
	{
		"name": "Dumbbell Split Squat",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Hamstrings",
			"Core"
		],
		"maleLevels": [
			.2,
			.5,
			.8,
			1.2,
			1.6
		]
	},
	{
		"name": "Dumbbell Squat",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": [
			"Adductors",
			"Core",
			"Hamstrings"
		],
		"maleLevels": [
			.3,
			.5,
			.9,
			1.4,
			2
		]
	},
	{
		"name": "Dumbbell Thruster",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Quads",
			"Glutes",
			"Front Delts",
			"Triceps"
		],
		"secondaryMuscles": ["Core", "Upper Chest"],
		"maleLevels": [
			.3,
			.5,
			.8,
			1.1,
			1.5
		]
	},
	{
		"name": "Dumbbell Tricep Extension",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.1,
			.3,
			.6,
			1,
			1.4
		]
	},
	{
		"name": "Dumbbell Tricep Kickback",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Rear Delts"],
		"maleLevels": [
			.1,
			.3,
			.5,
			.8,
			1.1
		]
	},
	{
		"name": "Dumbbell Upright Row",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Lateral Delts", "Traps"],
		"secondaryMuscles": ["Front Delts", "Upper Back"],
		"maleLevels": [
			.1,
			.3,
			.7,
			1.1,
			1.6
		]
	},
	{
		"name": "Dumbbell Walking Calf Raise",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.2,
			.4,
			.8,
			1.3,
			1.9
		]
	},
	{
		"name": "Dumbbell Wrist Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			.1,
			.3,
			.7,
			1.3,
			1.9
		]
	},
	{
		"name": "Dumbbell Z Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": [
			"Front Delts",
			"Triceps",
			"Core"
		],
		"secondaryMuscles": ["Upper Back", "Lateral Delts"],
		"maleLevels": [
			.2,
			.4,
			.7,
			1.1,
			1.5
		]
	},
	{
		"name": "Incline Dumbbell Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.2,
			.3,
			.5,
			.8,
			1.1
		]
	},
	{
		"name": "Incline Dumbbell Fly",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Upper Chest", "Chest"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.2,
			.4,
			.7,
			1,
			1.4
		]
	},
	{
		"name": "Incline Hammer Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps", "Forearms"],
		"secondaryMuscles": [],
		"maleLevels": [
			.1,
			.3,
			.5,
			.9,
			1.3
		]
	},
	{
		"name": "Lying Dumbbell Tricep Extension",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.1,
			.3,
			.5,
			.9,
			1.2
		]
	},
	{
		"name": "One Arm Dumbbell Preacher Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.1,
			.3,
			.6,
			.9,
			1.3
		]
	},
	{
		"name": "Renegade Row",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Core"
		],
		"secondaryMuscles": [
			"Biceps",
			"Forearms",
			"Front Delts"
		],
		"maleLevels": [
			.1,
			.3,
			.7,
			1.3,
			2
		]
	},
	{
		"name": "Seated Dumbbell Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.2,
			.4,
			.6,
			.8,
			1.1
		]
	},
	{
		"name": "Seated Dumbbell Tricep Extension",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.2,
			.5,
			.8,
			1.3,
			1.7
		]
	},
	{
		"name": "Single Leg Dumbbell Deadlift",
		"equipment": "Dumbbell",
		"category": "Legs",
		"primaryMuscles": ["Glutes", "Hamstrings"],
		"secondaryMuscles": [
			"Core",
			"Lower Back",
			"Abductors"
		],
		"maleLevels": [
			.3,
			.6,
			1,
			1.5,
			2.1
		]
	},
	{
		"name": "Tate Press",
		"equipment": "Dumbbell",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Chest", "Front Delts"],
		"maleLevels": [
			.1,
			.3,
			.5,
			.9,
			1.3
		]
	},
	{
		"name": "Zottman Curl",
		"equipment": "Dumbbell",
		"category": "Pull",
		"primaryMuscles": ["Forearms", "Biceps"],
		"secondaryMuscles": [],
		"maleLevels": [
			.1,
			.2,
			.5,
			.9,
			1.4
		]
	},
	{
		"name": "Belt Squat",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Core"],
		"maleLevels": [
			.5,
			1.25,
			2,
			3,
			4.25
		]
	},
	{
		"name": "Hip Abduction",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Abductors", "Glutes"],
		"secondaryMuscles": ["Core"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			2,
			2.75
		]
	},
	{
		"name": "Machine Back Extension",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Lower Back", "Glutes"],
		"secondaryMuscles": ["Hamstrings"],
		"maleLevels": [
			.5,
			.75,
			1.5,
			2.5,
			3.5
		]
	},
	{
		"name": "Machine Bicep Curl",
		"equipment": "Machine",
		"category": "Pull",
		"primaryMuscles": ["Biceps"],
		"secondaryMuscles": ["Forearms"],
		"maleLevels": [
			.25,
			.45,
			.75,
			1.05,
			1.4
		]
	},
	{
		"name": "Machine Lateral Raise",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": ["Lateral Delts"],
		"secondaryMuscles": ["Traps"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.5
		]
	},
	{
		"name": "Machine Reverse Fly",
		"equipment": "Machine",
		"category": "Pull",
		"primaryMuscles": ["Rear Delts", "Rhomboids"],
		"secondaryMuscles": ["Upper Back", "Traps"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Machine Row",
		"equipment": "Machine",
		"category": "Pull",
		"primaryMuscles": [
			"Upper Back",
			"Lats",
			"Rhomboids"
		],
		"secondaryMuscles": [
			"Rear Delts",
			"Biceps",
			"Forearms"
		],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.5
		]
	},
	{
		"name": "Machine Seated Crunch",
		"equipment": "Machine",
		"category": "Core",
		"primaryMuscles": ["Core"],
		"secondaryMuscles": ["Hip Flexors"],
		"maleLevels": [
			.25,
			.75,
			1,
			1.75,
			2.25
		]
	},
	{
		"name": "Machine Shrug",
		"equipment": "Machine",
		"category": "Pull",
		"primaryMuscles": ["Traps"],
		"secondaryMuscles": ["Forearms", "Upper Back"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			1.75,
			2.25
		]
	},
	{
		"name": "Machine Tricep Extension",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": ["Triceps"],
		"secondaryMuscles": ["Front Delts"],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Seated Calf Raise",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.25,
			.75,
			1.25,
			2,
			3
		]
	},
	{
		"name": "Seated Dip Machine",
		"equipment": "Machine",
		"category": "Push",
		"primaryMuscles": ["Chest", "Triceps"],
		"secondaryMuscles": ["Front Delts", "Lower Chest"],
		"maleLevels": [
			.5,
			.75,
			1.25,
			2,
			2.75
		]
	},
	{
		"name": "Single Leg Press",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Hamstrings"],
		"maleLevels": [
			.5,
			1,
			1.75,
			2.75,
			4
		]
	},
	{
		"name": "Single Leg Seated Calf Raise",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.25,
			.5,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Sled Press Calf Raise",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Calves"],
		"secondaryMuscles": [],
		"maleLevels": [
			.5,
			1.5,
			2.5,
			4,
			6
		]
	},
	{
		"name": "Standing Leg Curl",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Hamstrings"],
		"secondaryMuscles": ["Calves"],
		"maleLevels": [
			0,
			.25,
			.75,
			1.25,
			1.75
		]
	},
	{
		"name": "Vertical Leg Press",
		"equipment": "Machine",
		"category": "Legs",
		"primaryMuscles": ["Quads", "Glutes"],
		"secondaryMuscles": ["Adductors", "Hamstrings"],
		"maleLevels": [
			1,
			1.75,
			2.75,
			4,
			5.25
		]
	}
];
var LEGACY_STRENGTH_STANDARD_ALIASES = {
	"Back Extension": "Machine Back Extension",
	"Barbell Reverse Curl": "Reverse Barbell Curl",
	"Barbell Row": "Bent Over Row",
	"Bicep Curl": "Barbell Curl",
	"Cable Curl": "Cable Bicep Curl",
	"Calf Raise": "Machine Calf Raise",
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
	"Tricep Extension Machine": "Machine Tricep Extension"
};
//#endregion
//#region src/data/rankStates.js
var EXERCISE_RANK_STATES_TABLE = "exercise_rank_states";
function isMissingExerciseRankStatesTable(error) {
	const code = error?.code || "";
	const message = error?.message?.toLowerCase?.() || "";
	return code === "42P01" || message.includes("exercise_rank_states") && message.includes("does not exist");
}
async function fetchExerciseRankStates(userId, exerciseIds = null) {
	if (!userId) return {
		rows: [],
		missingTable: false
	};
	if (Array.isArray(exerciseIds) && exerciseIds.length === 0) return {
		rows: [],
		missingTable: false
	};
	let query = supabase.from(EXERCISE_RANK_STATES_TABLE).select("exercise_id, current_score, peak_score, last_ranked_at, updated_at").eq("user_id", userId);
	if (Array.isArray(exerciseIds) && exerciseIds.length > 0) query = query.in("exercise_id", exerciseIds);
	const { data, error } = await query;
	if (error) {
		if (isMissingExerciseRankStatesTable(error)) return {
			rows: [],
			missingTable: true
		};
		throw error;
	}
	return {
		rows: data ?? [],
		missingTable: false
	};
}
function mapExerciseRankStates(rows = []) {
	const byExerciseId = /* @__PURE__ */ new Map();
	for (const row of rows) {
		if (row?.exercise_id === null || row?.exercise_id === void 0) continue;
		byExerciseId.set(row.exercise_id, row);
	}
	return byExerciseId;
}
async function upsertExerciseRankStates(userId, updates = []) {
	if (!userId || updates.length === 0) return { missingTable: false };
	const payload = updates.filter((update) => update?.exerciseId !== null && update?.exerciseId !== void 0).map((update) => ({
		user_id: userId,
		exercise_id: update.exerciseId,
		current_score: update.currentScore,
		peak_score: update.peakScore,
		last_ranked_at: update.lastRankedAt,
		updated_at: update.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
	}));
	if (payload.length === 0) return { missingTable: false };
	const { error } = await supabase.from(EXERCISE_RANK_STATES_TABLE).upsert(payload, { onConflict: "user_id,exercise_id" });
	if (error) {
		if (isMissingExerciseRankStatesTable(error)) return { missingTable: true };
		throw error;
	}
	return { missingTable: false };
}
var TIERS = [
	"Iron",
	"Bronze",
	"Silver",
	"Gold",
	"Platinum",
	"Diamond",
	"Master",
	"Grandmaster",
	"Elite"
].flatMap((group) => [
	`${group} I`,
	`${group} II`,
	`${group} III`
]);
var TIER_COLORS = {
	Unranked: "#52525b",
	Iron: "#71717a",
	Bronze: "#c2773a",
	Silver: "#94a3b8",
	Gold: "#f0b429",
	Platinum: "#2dd4bf",
	Diamond: "#1d4ed8",
	Master: "#059669",
	Grandmaster: "#7c3aed",
	Elite: "#dc2626"
};
var FEMALE_STRENGTH_RATIO = .65;
var tierGroup = (tier) => tier.split(" ")[0];
var tierColor = (tier) => TIER_COLORS[tierGroup(tier)];
function round(value, digits = 4) {
	const rounded = Number(value.toFixed(digits));
	return Object.is(rounded, -0) ? 0 : rounded;
}
function midpoint(a, b) {
	return round((a + b) / 2);
}
function levelsToAnchors(levels = []) {
	const [beginner, novice, intermediate, advanced, elite] = levels.map(Number);
	return [
		0,
		round(beginner),
		midpoint(beginner, novice),
		round(novice),
		midpoint(novice, intermediate),
		round(intermediate),
		midpoint(intermediate, advanced),
		round(advanced),
		midpoint(advanced, elite),
		round(elite)
	];
}
function scaleAnchors(anchors, factor) {
	return anchors.map((value, index) => index === 0 ? 0 : round(value * factor));
}
function scaleBodyweightAnchors(anchors, factor) {
	return anchors.map((value, index) => index === 0 ? 0 : round(1 + (value - 1) * factor));
}
function buildCanonicalAnchors(gender) {
	const entries = {};
	for (const exercise of STRENGTHLEVEL_EXERCISES) {
		const maleAnchors = levelsToAnchors(exercise.maleLevels);
		entries[exercise.name] = gender === "female" ? exercise.equipment === "Bodyweight" ? scaleBodyweightAnchors(maleAnchors, FEMALE_STRENGTH_RATIO) : scaleAnchors(maleAnchors, FEMALE_STRENGTH_RATIO) : maleAnchors;
	}
	return entries;
}
function applyLegacyAliases(anchorMap) {
	const withAliases = { ...anchorMap };
	for (const [legacyName, canonicalName] of Object.entries(LEGACY_STRENGTH_STANDARD_ALIASES)) if (!withAliases[legacyName] && anchorMap[canonicalName]) withAliases[legacyName] = anchorMap[canonicalName];
	return withAliases;
}
var ANCHORS = {
	male: applyLegacyAliases(buildCanonicalAnchors("male")),
	female: applyLegacyAliases(buildCanonicalAnchors("female"))
};
function expandAnchors(anchors) {
	const thresholds = [];
	for (let i = 0; i < 9; i += 1) {
		const low = anchors[i];
		const step = (anchors[i + 1] - low) / 3;
		thresholds.push(round(low, 3));
		thresholds.push(round(low + step, 3));
		thresholds.push(round(low + step * 2, 3));
	}
	return thresholds;
}
function getTierIdx(ratio, thresholds) {
	let idx = 0;
	for (let i = 0; i < thresholds.length; i += 1) if (ratio >= thresholds[i]) idx = i;
	return idx;
}
function getProgress(ratio, thresholds, tierIdx) {
	if (tierIdx >= TIERS.length - 1) return 100;
	const low = thresholds[tierIdx];
	const high = thresholds[tierIdx + 1];
	if (high <= low) return 100;
	return Math.min(100, Math.max(0, Math.round((ratio - low) / (high - low) * 100)));
}
function weightForOrm(targetOrm, reps) {
	if (reps === 1) return targetOrm;
	const factor = (36 / (37 - reps) + 1 + reps / 30) / 2;
	return Math.round(targetOrm / factor * 2) / 2;
}
//#endregion
//#region src/lib/rollingRanks.js
var DAY_MS = 1440 * 60 * 1e3;
var ACTIVE_RANK_ALPHA = .22;
var ACTIVE_RANK_MODE = "active";
var ALL_TIME_RANK_MODE = "all_time";
function getMaxContinuousTierScore() {
	return TIERS.length - .001;
}
function clampContinuousTierScore(score) {
	if (!Number.isFinite(score)) return 0;
	return Math.max(0, Math.min(getMaxContinuousTierScore(), score));
}
function getContinuousTierScore(rank) {
	if (!rank) return null;
	return clampContinuousTierScore(rank.tierIdx + Math.min(.999, (rank.progress ?? 0) / 100));
}
function resolveTierFromScore(score) {
	const cappedScore = clampContinuousTierScore(score);
	const tierIdx = Math.floor(cappedScore);
	const tier = TIERS[tierIdx];
	const isMax = tierIdx === TIERS.length - 1;
	return {
		tierIdx,
		tier,
		color: tierColor(tier),
		progress: isMax ? 100 : Math.round((cappedScore - tierIdx) * 100),
		isMax,
		nextTier: isMax ? null : TIERS[tierIdx + 1]
	};
}
function inferRatioFromScore(score, thresholds = []) {
	if (!thresholds.length) return 0;
	const cappedScore = clampContinuousTierScore(score);
	const idx = Math.floor(cappedScore);
	const low = thresholds[idx] ?? thresholds[thresholds.length - 1] ?? 0;
	const high = thresholds[idx + 1] ?? low;
	const fractional = Math.min(.999, Math.max(0, cappedScore - idx));
	return high <= low ? low : low + (high - low) * fractional;
}
function parseDateValue(value) {
	if (!value) return null;
	const ts = new Date(value).getTime();
	return Number.isFinite(ts) ? ts : null;
}
function applyInactivityDecay(score, lastRankedAt, now = Date.now(), options = {}) {
	const graceDays = options.graceDays ?? 30;
	const decayPerDay = options.decayPerDay ?? .03;
	const maxDecay = options.maxDecay ?? 6;
	const nowTs = parseDateValue(now) ?? Date.now();
	const lastTs = parseDateValue(lastRankedAt);
	const safeScore = clampContinuousTierScore(score);
	if (lastTs === null || nowTs <= lastTs) return {
		score: safeScore,
		daysSinceRanked: 0,
		daysAfterGrace: 0,
		decayApplied: 0
	};
	const daysSinceRanked = (nowTs - lastTs) / DAY_MS;
	const daysAfterGrace = Math.max(0, daysSinceRanked - graceDays);
	const decayApplied = Math.min(maxDecay, daysAfterGrace * decayPerDay);
	return {
		score: clampContinuousTierScore(safeScore - decayApplied),
		daysSinceRanked,
		daysAfterGrace,
		decayApplied
	};
}
function updateRollingScore({ priorScore, priorLastRankedAt, sessionScore, now = Date.now(), alpha = ACTIVE_RANK_ALPHA, decayOptions = {} }) {
	const normalizedSessionScore = clampContinuousTierScore(sessionScore);
	const decayed = applyInactivityDecay(priorScore, priorLastRankedAt, now, decayOptions).score;
	return clampContinuousTierScore(decayed + alpha * (normalizedSessionScore - decayed));
}
//#endregion
export { weightForOrm as _, getContinuousTierScore as a, upsertExerciseRankStates as b, updateRollingScore as c, TIER_COLORS as d, expandAnchors as f, tierGroup as g, tierColor as h, clampContinuousTierScore as i, ANCHORS as l, getTierIdx as m, ALL_TIME_RANK_MODE as n, inferRatioFromScore as o, getProgress as p, applyInactivityDecay as r, resolveTierFromScore as s, ACTIVE_RANK_MODE as t, TIERS as u, fetchExerciseRankStates as v, STRENGTHLEVEL_EXERCISES as x, mapExerciseRankStates as y };

//# sourceMappingURL=rollingRanks-BNemOpZT.js.map