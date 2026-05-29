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

export async function finishWorkout(page, { exerciseName } = {}) {
  await skipRestIfVisible(page)
  await page.getByRole('button', { name: 'Finish Workout' }).click()
  const confirmSheet = page.locator('.confirm-sheet')
  await expect(confirmSheet).toBeVisible()
  await confirmSheet.getByRole('button', { name: /^(Finish|Check and Finish)$/ }).click()

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
  const progressionModal = page.locator('.progression-ad-modal').filter({ hasText: 'Progression Engine' }).first()
  if (!(await progressionModal.isVisible({ timeout: 5_000 }).catch(() => false))) return
  await progressionModal.getByRole('button', { name: 'Train without it' }).click()
  await expect(progressionModal).toBeHidden({ timeout: 10_000 })
}

export async function completePlanAdGateIfVisible(page) {
  const planGate = page.locator('.ad-gate-modal').filter({ hasText: 'No Premium' }).first()
  if (!(await planGate.isVisible({ timeout: 5_000 }).catch(() => false))) return

  await planGate.getByRole('button', { name: 'Watch Ad Now' }).click()
  await closePaywallIfVisible(page, { timeout: 20_000 })
}

async function closePaywallIfVisible(page, { timeout = 5_000 } = {}) {
  const paywall = page.getByRole('dialog', { name: /microload Pro/i })
  if (await paywall.isVisible({ timeout }).catch(() => false)) {
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

export async function deleteFoodLog(page, foodName) {
  const feedItem = page.locator('.nut-feed-item').filter({ hasText: foodName }).first()
  await expect(feedItem).toBeVisible({ timeout: 20_000 })
  await feedItem.getByRole('button', { name: 'Delete' }).click()
  await expect(feedItem.locator('.nut-feed-delete-confirm')).toBeVisible()
  await feedItem.locator('.nut-feed-remove-btn-confirm').click()
  await expect(page.locator('.nut-feed-food').filter({ hasText: foodName })).toHaveCount(0, { timeout: 20_000 })
}

export async function openTodayHistory(page) {
  await goToTab(page, 'Home')
  await closePaywallIfVisible(page, { timeout: 10_000 })
  const todayCell = page.locator('.cal-cell.today.has-entry').first()
  await expect(todayCell).toBeVisible({ timeout: 30_000 })
  await closePaywallIfVisible(page, { timeout: 2_000 })
  await todayCell.click()
  const detail = page.locator('.day-detail')
  await expect(detail).toBeVisible({ timeout: 20_000 })
  return detail
}

export async function skipRestIfVisible(page) {
  const skipRestButton = page.getByRole('button', { name: 'Skip' })
  if (await skipRestButton.isVisible({ timeout: 1200 }).catch(() => false)) {
    await skipRestButton.click()
  }
}

export function exerciseBlock(page, exerciseName) {
  return page.locator('.exercise-block').filter({ hasText: exerciseName }).first()
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
