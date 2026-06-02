import { expect } from '@playwright/test'

export async function loginAsE2EUser(page, credentials) {
  await page.goto('/')
  await page.getByPlaceholder('Email').fill(credentials.email)
  await page.getByPlaceholder('Password').fill(credentials.password)
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click()
  await visibleTabButton(page, 'Workout')
}

export async function goToTab(page, label) {
  const button = await visibleTabButton(page, label)
  await button.click()
}

export async function startEmptyWorkout(page) {
  await goToTab(page, 'Workout')
  await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Empty Workout' }).click()
  await dismissProgressionGateIfVisible(page)
  await expect(page.getByRole('button', { name: 'Add Exercise' })).toBeVisible({ timeout: 20_000 })
}

export async function addExerciseAndLogSet(page, exerciseName, set) {
  await addExercise(page, exerciseName)
  await logSetForExercise(page, exerciseName, set)
}

export async function addExercise(page, exerciseName) {
  await page.getByRole('button', { name: 'Add Exercise' }).click()
  await expect(page.getByText('Select Exercises')).toBeVisible()
  await page.getByPlaceholder('Search exercises...').fill(exerciseName)

  const exerciseItem = page.locator('.exercise-item').filter({ hasText: exerciseName }).first()
  await expect(exerciseItem).toBeVisible({ timeout: 20_000 })
  await exerciseItem.click()
  await page.getByRole('button', { name: /^Add \(1\)$/ }).click()

  await expect(exerciseBlock(page, exerciseName)).toBeVisible({ timeout: 20_000 })
}

export async function logSetForExercise(page, exerciseName, {
  weight = '60',
  reps = '5',
  markDone = true,
} = {}) {
  const block = exerciseBlock(page, exerciseName)
  await expect(block).toBeVisible({ timeout: 20_000 })
  const row = block.locator('.set-row-wrapper').first()

  const weightInput = row.locator('.col-kg-wrap input.set-input')
  const repsInput = row.locator('input.col-reps.set-input')
  await weightInput.fill(String(weight))
  await repsInput.fill(String(reps))

  if (markDone) {
    await row.locator('button.done-btn').click()
    await expect(block.locator('.set-row.done').first()).toBeVisible()
    await skipRestIfVisible(page)
  }
}

export async function logDropSetForExercise(page, exerciseName, {
  parentWeight = '80',
  parentReps = '6',
  dropWeight = '60',
  dropReps = '8',
} = {}) {
  const block = exerciseBlock(page, exerciseName)
  await expect(block).toBeVisible({ timeout: 20_000 })

  const group = block.locator('.set-group').first()
  await expect(group).toBeVisible()
  await group.getByRole('button', { name: '+ Drop Set' }).click()

  const rows = group.locator('.set-row-wrapper')
  await expect(rows).toHaveCount(2)

  await fillSetRow(rows.nth(0), { weight: parentWeight, reps: parentReps })
  await fillSetRow(rows.nth(1), { weight: dropWeight, reps: dropReps })

  await rows.nth(0).locator('button.done-btn').click()
  await expect(rows.nth(0).locator('.set-row.done')).toBeVisible()

  await rows.nth(1).locator('button.done-btn').click()
  await expect(rows.nth(1).locator('.set-row.done')).toBeVisible()

  await group.getByRole('button', { name: 'Complete Drop Sets' }).click()
  await skipRestIfVisible(page)
}

export async function finishWorkout(page, { exerciseName } = {}) {
  await skipRestIfVisible(page)
  await page.getByRole('button', { name: 'Finish Workout' }).click()
  const confirmSheet = page.locator('.confirm-sheet')
  await expect(confirmSheet).toBeVisible()
  await confirmSheet.getByRole('button', { name: /^(Finish|Check and Finish)$/ }).click()
  await completeWorkoutSaveAdGateIfVisible(page)

  const summary = page.getByRole('dialog', { name: 'Workout Summary' })
  await expect(summary).toContainText('Workout Complete', { timeout: 30_000 })
  if (exerciseName) await expect(summary).toContainText(exerciseName)
  await summary.getByRole('button', { name: 'Done' }).click()
  await expect(summary).toBeHidden({ timeout: 10_000 })
  await closePaywallIfVisible(page)
}

export async function startSuggestedRoutine(page, routineName) {
  await goToTab(page, 'Workout')
  await expect(page.getByRole('heading', { name: 'Routines' })).toBeVisible({ timeout: 20_000 })
  const routineCard = page.locator('.template-card').filter({ hasText: routineName }).first()
  await expect(routineCard.locator('.template-name')).toHaveText(routineName)
  await routineCard.getByRole('button', { name: 'Start' }).click()
  await completePlanAdGateIfVisible(page)
  await expect(page.getByRole('button', { name: 'Finish Workout' })).toBeVisible({ timeout: 20_000 })
}

export async function dismissProgressionGateIfVisible(page) {
  const skipButton = page.getByRole('button', { name: 'Train without it' }).first()
  if (!(await skipButton.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false))) return
  await skipButton.click()
  await expect(skipButton).toBeHidden({ timeout: 10_000 })
}

export async function completePlanAdGateIfVisible(page) {
  const planGate = page.locator('.ad-gate-modal').filter({ hasText: 'No Premium' }).first()
  if (!(await planGate.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false))) return

  await planGate.getByRole('button', { name: 'Watch Ad Now' }).click()
  await closePaywallIfVisible(page, { timeout: 20_000 })
}

async function completeWorkoutSaveAdGateIfVisible(page) {
  const saveGate = page.locator('.ad-gate-modal').filter({ hasText: 'Saving Workout' }).first()
  if (!(await saveGate.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true).catch(() => false))) return

  await saveGate.getByRole('button', { name: 'Watch Ad Now' }).click()

  const continueButton = saveGate.getByRole('button', { name: /Continue/ })
  if (await continueButton.waitFor({ state: 'visible', timeout: 25_000 }).then(() => true).catch(() => false)) {
    await continueButton.click()
  }

  await expect(saveGate).toBeHidden({ timeout: 50_000 })
}

async function closePaywallIfVisible(page, { timeout = 5_000 } = {}) {
  const paywall = page.getByRole('dialog', { name: /microload Pro/i })
  if (await paywall.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false)) {
    await paywall.getByRole('button', { name: 'Close' }).click()
    await expect(paywall).toBeHidden({ timeout: 10_000 })
  }
}

export async function createAndLogCustomFood(page, foodName, {
  servingSize = '100',
  calories = '250',
  protein = '20',
  carbs = '30',
  fat = '8',
} = {}) {
  await goToTab(page, 'Nutrition')
  await expect(page.getByText('Food Log')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Add Food|Add your first food/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Add Food' })).toBeVisible()
  await page.locator('.nut-create-food-btn').click()
  await expect(page.getByRole('heading', { name: 'Create Food' })).toBeVisible()

  await fillCreateFoodField(page, 'Name', foodName)
  await fillCreateFoodField(page, 'Serving Size', servingSize)
  await fillCreateFoodField(page, 'Calories', calories)
  await fillCreateFoodField(page, 'Protein', protein)
  await fillCreateFoodField(page, 'Carbs', carbs)
  await fillCreateFoodField(page, 'Fat', fat)

  await page.getByRole('button', { name: 'Save Food' }).click()
  await expect(page.locator('.picker-title').filter({ hasText: foodName })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Add to Log' }).click()
  await expect(page.locator('.nut-feed-food').filter({ hasText: foodName })).toBeVisible({ timeout: 20_000 })
}

export async function createAndLogRecipe(page, recipeName, ingredientName, {
  servingsMade = '1',
} = {}) {
  await goToTab(page, 'Nutrition')
  await expect(page.getByText('Food Log')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Add Food|Add your first food/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Add Food' })).toBeVisible()
  await page.locator('.nut-create-food-btn').click()
  await expect(page.getByRole('heading', { name: 'Create Food' })).toBeVisible()

  await page.getByRole('button', { name: 'Recipe' }).click()
  await fillCreateFoodField(page, 'Recipe Name', recipeName)
  await fillCreateFoodField(page, 'Servings Made', servingsMade)

  await page.getByPlaceholder('Search foods to add...').fill(ingredientName)
  const ingredient = page.locator('.nut-search-item').filter({ hasText: ingredientName }).first()
  await expect(ingredient).toBeVisible({ timeout: 20_000 })
  await ingredient.click()
  await page.getByRole('button', { name: 'Add Ingredient' }).click()
  await expect(page.locator('.cf-recipe-item').filter({ hasText: ingredientName })).toBeVisible()

  await page.getByRole('button', { name: 'Save Recipe' }).click()
  await expect(page.locator('.picker-title').filter({ hasText: recipeName })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Add to Log' }).click()
  await expect(page.locator('.nut-feed-food').filter({ hasText: recipeName })).toBeVisible({ timeout: 20_000 })
}

export async function deleteFoodLog(page, foodName) {
  const feedItem = page.locator('.nut-feed-item').filter({ hasText: foodName }).first()
  await expect(feedItem).toBeVisible({ timeout: 20_000 })
  await feedItem.getByRole('button', { name: 'Delete' }).click()
  await expect(feedItem.locator('.nut-feed-delete-confirm')).toBeVisible()
  await feedItem.locator('.nut-feed-remove-btn-confirm').click()
  await expect(page.locator('.nut-feed-food').filter({ hasText: foodName })).toHaveCount(0, { timeout: 20_000 })
}

export async function openTodayHistory(page) {
  await goToTab(page, 'Dashboard')
  await closePaywallIfVisible(page, { timeout: 10_000 })
  const todayCell = page.locator('.cal-cell.today.has-entry').first()
  await expect(todayCell).toBeVisible({ timeout: 30_000 })
  await closePaywallIfVisible(page, { timeout: 2_000 })
  await todayCell.click()
  const detail = page.locator('.day-detail')
  await expect(detail).toBeVisible({ timeout: 20_000 })
  return detail
}

export async function openProfile(page) {
  await page.getByRole('button', { name: /Open profile for/i }).click()
  await expect(page.locator('.profile-screen')).toBeVisible({ timeout: 20_000 })
}

export async function editProfile(page, {
  fullName,
  username,
} = {}) {
  await openProfile(page)
  await expect(page.getByText(/microload by Harisman/i)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Edit Profile' }).click()

  if (fullName !== undefined) await page.getByPlaceholder('Your name').fill(fullName)
  if (username !== undefined) await page.getByPlaceholder('@username').fill(username)

  await page.getByRole('button', { name: 'Save Changes' }).click()
  if (fullName) await expect(page.locator('.profile-name')).toHaveText(fullName, { timeout: 20_000 })
}

export async function signOut(page) {
  await openProfile(page)
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 })
}

export async function skipRestIfVisible(page) {
  const skipRestButton = page.getByRole('button', { name: 'Skip' })
  if (await skipRestButton.waitFor({ state: 'visible', timeout: 1200 }).then(() => true).catch(() => false)) {
    await skipRestButton.click()
  }
}

export function exerciseBlock(page, exerciseName) {
  return page.locator('.exercise-block').filter({ hasText: exerciseName }).first()
}

async function fillSetRow(row, { weight, reps }) {
  await row.locator('.col-kg-wrap input.set-input').fill(String(weight))
  await row.locator('input.col-reps.set-input').fill(String(reps))
}

function tabButton(page, label) {
  return page.getByRole('button', { name: new RegExp(`^${escapeRegex(label)}$`) })
}

async function visibleTabButton(page, label) {
  const button = tabButton(page, label)
  await expect(button).toBeVisible({ timeout: 30_000 })
  return button
}

async function fillCreateFoodField(page, label, value) {
  const field = page.locator('.cf-field').filter({
    has: page.locator('.cf-label').filter({ hasText: new RegExp(`^\\s*${escapeRegex(label)}\\b`) }),
  }).first()
  await expect(field).toBeVisible()
  await field.locator('input').fill(String(value))
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
