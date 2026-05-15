import {
  buildFoodPayload,
  EMPTY_FOOD_FORM,
  FOOD_FORM_FIELDS,
  foodFromFormValues,
  foodToFormValues,
  getFoodFormError,
  isFoodFormValid,
} from '../../lib/foodEditor.js'
import { validateNutritionForm } from '../../lib/inputValidation.js'

function makeValidForm(overrides = {}) {
  return {
    ...EMPTY_FOOD_FORM,
    name: 'Greek yogurt',
    serving_size: '170',
    serving_unit: 'g',
    calories: '120',
    protein: '17.2',
    carbs: '6.5',
    fat: '0.4',
    ...overrides,
  }
}

describe('food editor form metadata and defaults', () => {
  it('defines required core fields used by the editor UI', () => {
    const fieldsByKey = Object.fromEntries(FOOD_FORM_FIELDS.map(field => [field.key, field]))

    expect(fieldsByKey.name).toMatchObject({
      label: 'Name',
      type: 'text',
      required: true,
    })
    expect(fieldsByKey.serving_size).toMatchObject({
      label: 'Serving Size',
      type: 'number',
      required: true,
    })
    expect(fieldsByKey.calories).toMatchObject({
      label: 'Calories',
      unit: 'kcal',
      type: 'number',
      required: true,
    })
  })

  it('provides create-form defaults with blank optional nutrition fields', () => {
    expect(EMPTY_FOOD_FORM).toMatchObject({
      name: '',
      brand: '',
      serving_size: '100',
      serving_unit: 'g',
      calories: '',
    })

    expect(EMPTY_FOOD_FORM.protein).toBe('')
    expect(EMPTY_FOOD_FORM.carbs).toBe('')
    expect(EMPTY_FOOD_FORM.fat).toBe('')
    expect(EMPTY_FOOD_FORM.fiber).toBe('')
    expect(EMPTY_FOOD_FORM.iron).toBe('')
  })
})

describe('foodToFormValues', () => {
  it('converts missing food data into safe string defaults', () => {
    expect(foodToFormValues()).toMatchObject({
      name: '',
      brand: '',
      serving_size: '100',
      serving_unit: 'g',
      calories: '0',
      protein: '0',
      sodium: '0',
      iron: '0',
    })
  })

  it('normalizes numeric food values into rounded form strings', () => {
    const form = foodToFormValues({
      name: 'Greek yogurt',
      brand: 'Plain',
      serving_size: 170,
      serving_unit: 'g',
      calories: 89.6,
      protein: 17.24,
      carbs: 6.56,
      fat: 0.44,
      fiber: 2.34,
      sugar: 3.36,
      saturated_fat: 1.14,
      sodium: 120.6,
      potassium: 99.4,
      cholesterol: 10.5,
      vitamin_a: 255.56,
      vitamin_c: 14.44,
      calcium: 302.6,
      iron: 2.345,
    })

    expect(form).toEqual({
      name: 'Greek yogurt',
      brand: 'Plain',
      serving_size: '170',
      serving_unit: 'g',
      calories: '90',
      protein: '17.2',
      carbs: '6.6',
      fat: '0.4',
      fiber: '2.3',
      sugar: '3.4',
      saturated_fat: '1.1',
      sodium: '121',
      potassium: '99',
      cholesterol: '11',
      vitamin_a: '255.6',
      vitamin_c: '14.4',
      calcium: '303',
      iron: '2.35',
    })
  })
})

describe('food editor validation helpers', () => {
  it('returns the same user-facing error as nutrition form validation', () => {
    const invalidForm = makeValidForm({ name: '' })

    expect(getFoodFormError(invalidForm)).toBe(validateNutritionForm(invalidForm))
    expect(getFoodFormError(invalidForm)).toBe('Food name is required.')
  })

  it('reports form validity for invalid and complete forms', () => {
    expect(isFoodFormValid(makeValidForm({ calories: '' }))).toBe(false)
    expect(isFoodFormValid(makeValidForm())).toBe(true)
  })
})

describe('buildFoodPayload', () => {
  it('trims text fields and converts valid numeric strings to numbers', () => {
    const payload = buildFoodPayload(makeValidForm({
      name: '  Greek yogurt  ',
      brand: '  Plain  ',
      serving_unit: '  g  ',
      fiber: '2.5',
      sugar: '4',
      saturated_fat: '0.2',
      sodium: '65',
      potassium: '240',
      cholesterol: '10',
      vitamin_a: '25',
      vitamin_c: '1.5',
      calcium: '180',
      iron: '0.12',
    }), 'user-123')

    expect(payload).toEqual({
      user_id: 'user-123',
      name: 'Greek yogurt',
      brand: 'Plain',
      serving_size: 170,
      serving_unit: 'g',
      calories: 120,
      protein: 17.2,
      carbs: 6.5,
      fat: 0.4,
      fiber: 2.5,
      sugar: 4,
      saturated_fat: 0.2,
      sodium: 65,
      potassium: 240,
      cholesterol: 10,
      vitamin_a: 25,
      vitamin_c: 1.5,
      calcium: 180,
      iron: 0.12,
    })
  })

  it('defaults blank text and missing or invalid nutrition numbers safely', () => {
    const payload = buildFoodPayload({
      name: '  Rice  ',
      brand: '   ',
      serving_size: '0',
      serving_unit: '   ',
      calories: 'bad',
      protein: '',
      carbs: null,
      fat: undefined,
      fiber: 'nope',
    }, 'user-456')

    expect(payload).toMatchObject({
      user_id: 'user-456',
      name: 'Rice',
      brand: null,
      serving_size: 100,
      serving_unit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      iron: 0,
    })
  })
})

describe('foodFromFormValues', () => {
  it('preserves base food metadata while replacing editable nutrition fields', () => {
    const nextFood = foodFromFormValues(makeValidForm({
      name: '  Updated yogurt  ',
      brand: '  Strained  ',
      calories: '140',
      protein: '19.5',
    }), {
      id: 'food-1',
      source: 'usda',
      persistAsNew: true,
      name: 'Old yogurt',
      calories: 90,
    })

    expect(nextFood).toMatchObject({
      id: 'food-1',
      source: 'usda',
      name: 'Updated yogurt',
      brand: 'Strained',
      serving_size: 170,
      serving_unit: 'g',
      calories: 140,
      protein: 19.5,
      carbs: 6.5,
      fat: 0.4,
    })
    expect(nextFood).not.toHaveProperty('persistAsNew')
  })

  it('marks edited foods for persistence as a new saved food when requested', () => {
    const nextFood = foodFromFormValues(makeValidForm(), { id: 'external-food' }, { persistAsNew: true })

    expect(nextFood).toMatchObject({
      id: 'external-food',
      name: 'Greek yogurt',
      persistAsNew: true,
    })
  })
})
