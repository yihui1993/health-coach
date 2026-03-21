---
name: add-food-lookup
description: Add or update a named food entry in nutrition-lookup.json. Use when the user wants to save a meal shortcut with exact macro values for future logging.
allowed-tools: Bash, Read, Write
---

Add or update a food entry in the nutrition lookup file.

## Steps

1. If not already provided, ask for:
   - Short name (key) — lowercase, memorable (e.g. "cottage cheese", "protein bar")
   - Description — longer explanation: brand, portion size, preparation
   - Calories (kcal)
   - Protein (g)
   - Carbs (g)
   - Fat (g)

2. Show the user the entry that will be added and ask for confirmation.

3. Read the current file:
```bash
cat /Users/yihuima/health-coach/data/nutrition-lookup.json
```

4. Check if the key already exists. If so, tell the user: "An entry named '[key]' already exists ([old values]). I'll replace it with the new values."

5. Merge the new entry into the JSON object and write the full updated file back to `data/nutrition-lookup.json`. Use 2-space indentation. Preserve all existing entries.

6. Confirm: "Added '[key]' — [cal] kcal, [protein]g protein, [carbs]g carbs, [fat]g fat."

## Notes
- Keys should be lowercase and concise
- Use standard JSON formatting (2-space indent)
- This file is used by /log-meal — incorrect entries will result in wrong macro logging
