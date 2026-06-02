import { expect, test } from '@playwright/test'
import {
  addExercise,
  addExerciseAndLogSet,
  createAndLogRecipe,
  createAndLogCustomFood,
  deleteFoodLog,
  editProfile,
  exerciseBlock,
  finishWorkout,
  goToTab,
  logDropSetForExercise,
  logSetForExercise,
  loginAsE2EUser,
  openProfile,
  openTodayHistory,
  signOut,
  startEmptyWorkout,
  startSuggestedRoutine,
} from './helpers/appFlows.js'
import {
  ensureE2EUser,
  getMissingE2EEnv,
  loadLatestSavedWorkout,
  loadNutritionLogs,
  loadProfile,
  loadWorkoutSessionCounts,
  resetE2EData,
} from './helpers/supabaseFixture.js'

const missingEnv = getMissingE2EEnv()
const exerciseName = process.env.E2E_EXERCISE_NAME || 'Bench Press'
const routineName = 'Push'
const foodName = 'E2E Test Food'
const ingredientName = 'E2E Recipe Ingredient'
const recipeName = 'E2E Recipe Bowl'

test.describe('E2E critical user journeys', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(
    missingEnv.length > 0,
    `Set ${missingEnv.join(', ')} to run Supabase-backed E2E tests.`
  )

  let admin
  let user
  let credentials

  test.beforeAll(async () => {
    const fixture = await ensureE2EUser()
    admin = fixture.admin
    user = fixture.user
    credentials = fixture.credentials
  })

  test.beforeEach(async ({ context }) => {
    await resetE2EData(admin, user.id)
    await context.addInitScript(() => {
      const clearedKey = '__liftlog_e2e_storage_cleared'
      if (window.sessionStorage.getItem(clearedKey) === '1') return
      window.localStorage.clear()
      window.sessionStorage.clear()
      window.sessionStorage.setItem(clearedKey, '1')
    })
  })

  test.afterAll(async () => {
    if (admin && user) await resetE2EData(admin, user.id)
  })

  test('signs in, logs a set, finishes, and persists the workout', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExerciseAndLogSet(page, exerciseName, { weight: '60', reps: '5' })
    await finishWorkout(page, { exerciseName })

    const savedWorkout = await loadLatestSavedWorkout(admin, user.id)
    expect(savedWorkout.session?.finished_at).toBeTruthy()
    expect(savedWorkout.sets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reps: 5,
        weight: 60,
        unit: 'kg',
      }),
    ]))
  })

  test('resumes a locally drafted workout after app restart', async ({ page, browser }) => {
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExercise(page, exerciseName)
    await logSetForExercise(page, exerciseName, { weight: '62.5', reps: '4', markDone: false })
    await expectDraftToContainSet(page, exerciseName, '62.5', '4')

    const appUrl = new URL(page.url()).origin
    const storageState = await page.context().storageState()
    await page.close()

    const restartContext = await browser.newContext({ storageState })
    try {
      const restartPage = await restartContext.newPage()
      await restartPage.goto(appUrl)
      await goToTab(restartPage, 'Workout')
      await expect(restartPage.getByRole('heading', { name: 'Resume Workout' })).toBeVisible({ timeout: 20_000 })
      const draftCard = restartPage.locator('.workout-draft-card')
      await expect(draftCard).toContainText('Saved Workout')
      await draftCard.getByRole('button', { name: 'Resume' }).click()

      const block = exerciseBlock(restartPage, exerciseName)
      await expect(block).toBeVisible({ timeout: 20_000 })
      const row = block.locator('.set-row-wrapper').first()
      await expect(row.locator('.col-kg-wrap input.set-input')).toHaveValue('62.5')
      await expect(row.locator('input.col-reps.set-input')).toHaveValue('4')

      await finishWorkout(restartPage, { exerciseName })
    } finally {
      await restartContext.close()
    }

    const savedWorkout = await loadLatestSavedWorkout(admin, user.id)
    expect(savedWorkout.sets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reps: 4,
        weight: 62.5,
        unit: 'kg',
      }),
    ]))
  })

  test('cancels and discards an in-progress workout without saving it', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExercise(page, exerciseName)
    await logSetForExercise(page, exerciseName, { weight: '55', reps: '6', markDone: false })

    await page.getByRole('button', { name: 'Cancel' }).click()
    const confirmSheet = page.locator('.confirm-sheet')
    await expect(confirmSheet).toContainText('Cancel Workout?')
    await confirmSheet.getByRole('button', { name: 'Discard' }).click()

    await expect(page.getByRole('heading', { name: 'New Workout' })).toBeVisible({ timeout: 20_000 })
    const counts = await loadWorkoutSessionCounts(admin, user.id)
    expect(counts).toEqual({ total: 0, finished: 0, open: 0 })
  })

  test('starts a suggested routine and persists a logged set', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await startSuggestedRoutine(page, routineName)
    await expect(exerciseBlock(page, exerciseName)).toBeVisible({ timeout: 20_000 })

    await logSetForExercise(page, exerciseName, { weight: '70', reps: '3' })
    await finishWorkout(page, { exerciseName })

    const savedWorkout = await loadLatestSavedWorkout(admin, user.id)
    expect(savedWorkout.sets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reps: 3,
        weight: 70,
        unit: 'kg',
      }),
    ]))
  })

  test('creates, logs, and deletes a custom food', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await createAndLogCustomFood(page, foodName, {
      servingSize: '100',
      calories: '250',
      protein: '20',
      carbs: '30',
      fat: '8',
    })

    let logs = await loadNutritionLogs(admin, user.id)
    expect(logs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        food_name: foodName,
        calories: 250,
      }),
    ]))

    await deleteFoodLog(page, foodName)
    logs = await loadNutritionLogs(admin, user.id)
    expect(logs.filter(log => log.food_name === foodName)).toHaveLength(0)
  })

  test('shows the completed workout in today history', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExerciseAndLogSet(page, exerciseName, { weight: '60', reps: '5' })
    await finishWorkout(page, { exerciseName })

    const detail = await openTodayHistory(page)
    await expect(detail).toContainText('Workout')
    await expect(detail).toContainText(exerciseName)
    await expect(detail.locator('.day-summary-stat').filter({ hasText: 'Sets' }).locator('.day-summary-value')).toHaveText(/[1-9]/)

    const volumeText = await detail
      .locator('.day-summary-stat')
      .filter({ hasText: 'Effective Vol' })
      .locator('.day-summary-value')
      .innerText()
    expect(Number.parseFloat(volumeText)).toBeGreaterThan(0)
  })

  test('persists drop-set metadata when finishing a workout', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExercise(page, exerciseName)
    await logDropSetForExercise(page, exerciseName, {
      parentWeight: '80',
      parentReps: '6',
      dropWeight: '55',
      dropReps: '8',
    })
    await finishWorkout(page, { exerciseName })

    const savedWorkout = await loadLatestSavedWorkout(admin, user.id)
    expect(savedWorkout.session?.finished_at).toBeTruthy()
    expect(savedWorkout.sets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reps: 6,
        weight: 80,
        set_type: 'normal',
      }),
      expect.objectContaining({
        reps: 8,
        weight: 55,
        set_type: 'dropset',
      }),
    ]))

    const parent = savedWorkout.sets.find(set => set.set_type === 'normal')
    const drop = savedWorkout.sets.find(set => set.set_type === 'dropset')
    expect(parent?.set_group_index).not.toBeNull()
    expect(drop?.set_group_index).toBe(parent.set_group_index)
  })

  test('persists profile edits after reload', async ({ page }) => {
    const uniqueSuffix = `${user.id.slice(0, 8)}_${Date.now()}`
    const fullName = `E2E Profile ${uniqueSuffix}`
    const username = `e2e_${uniqueSuffix}`.slice(0, 24)

    await loginAsE2EUser(page, credentials)
    await editProfile(page, { fullName, username })

    await page.reload()
    await openProfile(page)
    await expect(page.locator('.profile-name')).toHaveText(fullName, { timeout: 20_000 })

    const profile = await loadProfile(admin, user.id)
    expect(profile).toEqual(expect.objectContaining({
      full_name: fullName,
      username,
    }))
  })

  test('creates, logs, and deletes a recipe', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await createAndLogCustomFood(page, ingredientName, {
      servingSize: '100',
      calories: '180',
      protein: '12',
      carbs: '25',
      fat: '4',
    })
    await deleteFoodLog(page, ingredientName)
    await createAndLogRecipe(page, recipeName, ingredientName)

    let logs = await loadNutritionLogs(admin, user.id)
    expect(logs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        food_name: recipeName,
        calories: 180,
      }),
    ]))

    await deleteFoodLog(page, recipeName)
    logs = await loadNutritionLogs(admin, user.id)
    expect(logs.filter(log => log.food_name === recipeName)).toHaveLength(0)
  })

  test('finishes a workout from a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExerciseAndLogSet(page, exerciseName, { weight: '65', reps: '5' })
    await finishWorkout(page, { exerciseName })

    const savedWorkout = await loadLatestSavedWorkout(admin, user.id)
    expect(savedWorkout.session?.finished_at).toBeTruthy()
    expect(savedWorkout.sets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reps: 5,
        weight: 65,
        unit: 'kg',
      }),
    ]))
  })

  test('keeps finished workout data after sign out and sign back in', async ({ page }) => {
    await loginAsE2EUser(page, credentials)
    await startEmptyWorkout(page)
    await addExerciseAndLogSet(page, exerciseName, { weight: '67.5', reps: '4' })
    await finishWorkout(page, { exerciseName })

    const beforeSignOut = await loadWorkoutSessionCounts(admin, user.id)
    const savedBefore = await loadLatestSavedWorkout(admin, user.id)
    expect(beforeSignOut.finished).toBe(1)
    expect(savedBefore.session?.id).toBeTruthy()

    await signOut(page)
    await loginAsE2EUser(page, credentials)

    const afterSignIn = await loadWorkoutSessionCounts(admin, user.id)
    const savedAfter = await loadLatestSavedWorkout(admin, user.id)
    expect(afterSignIn.finished).toBe(beforeSignOut.finished)
    expect(savedAfter.session?.id).toBe(savedBefore.session.id)
    expect(savedAfter.sets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reps: 4,
        weight: 67.5,
      }),
    ]))
  })
})

async function expectDraftToContainSet(page, exerciseName, weight, reps) {
  await page.waitForFunction(
    ({ exerciseName, weight, reps }) => Array.from({ length: window.localStorage.length }, (_, index) => {
      const key = window.localStorage.key(index)
      return [key, key ? window.localStorage.getItem(key) : null]
    }).some(([key, raw]) => {
      if (!key.startsWith('workoutDraft:')) return false
      return raw && raw.includes(exerciseName) && raw.includes(`"weight":"${weight}"`) && raw.includes(`"reps":"${reps}"`)
    }),
    { exerciseName, weight, reps },
    { timeout: 10_000 }
  )
}
