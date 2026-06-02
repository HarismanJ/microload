import { describe, expect, it } from 'vitest'

import {
  buildScaledNutrients,
  computePerServingNutrition,
  formatIngredientAmount,
  getIngredientDefaults,
  getIngredientMultiplier,
  perServingTotals,
  sumRecipeTotals,
} from '../../lib/recipeMath'

const rice = {
  serving_size: 100,
  serving_unit: 'g',
  calories: 200,
  protein: 4,
  carbs: 44,
  fat: 1,
  iron: 2,
  sodium: 100,
}

describe('recipeMath', () => {
  describe('getIngredientMultiplier', () => {
    it('scales direct amounts by serving size', () => {
      expect(getIngredientMultiplier(rice, 'direct', '50', 1)).toBe(0.5)
      expect(getIngredientMultiplier(rice, 'direct', '200', 1)).toBe(2)
    })

    it('uses the serving count directly in servings mode', () => {
      expect(getIngredientMultiplier(rice, 'servings', '', 3)).toBe(3)
    })

    it('returns 0 for invalid input', () => {
      expect(getIngredientMultiplier(null, 'servings', '', 1)).toBe(0)
      expect(getIngredientMultiplier(rice, 'direct', '0', 1)).toBe(0)
      expect(getIngredientMultiplier(rice, 'direct', 'abc', 1)).toBe(0)
    })
  })

  describe('buildScaledNutrients', () => {
    it('scales and rounds per field', () => {
      const scaled = buildScaledNutrients(rice, 2)
      expect(scaled.calories).toBe(400)
      expect(scaled.protein).toBe(8)
      expect(scaled.carbs).toBe(88)
      expect(scaled.iron).toBe(4)
      expect(scaled.sodium).toBe(200)
    })

    it('treats missing nutrients as zero', () => {
      const scaled = buildScaledNutrients({ calories: 100 }, 1)
      expect(scaled.protein).toBe(0)
      expect(scaled.vitamin_b12).toBe(0)
    })
  })

  describe('sumRecipeTotals + perServingTotals', () => {
    it('sums ingredient nutrients then divides by yield with field rounding', () => {
      const ingredients = [
        { nutrients: buildScaledNutrients(rice, 1) },
        { nutrients: buildScaledNutrients(rice, 1) },
      ]
      const totals = sumRecipeTotals(ingredients)
      expect(totals.calories).toBe(400)
      expect(totals.protein).toBe(8)

      const perServing = perServingTotals(totals, 2)
      expect(perServing.calories).toBe(200) // integer field
      expect(perServing.protein).toBe(4) // 1-decimal field
    })

    it('clamps yield to at least 1', () => {
      const perServing = perServingTotals({ calories: 300 }, 0)
      expect(perServing.calories).toBe(300)
    })
  })

  describe('computePerServingNutrition', () => {
    it('combines summing and per-serving division', () => {
      const ingredients = [{ nutrients: buildScaledNutrients(rice, 3) }]
      const perServing = computePerServingNutrition(ingredients, 3)
      expect(perServing.calories).toBe(200)
    })
  })

  describe('getIngredientDefaults', () => {
    it('defaults gram/ml foods to direct mode pre-filled with the serving size', () => {
      expect(getIngredientDefaults({ serving_unit: 'g', serving_size: 50 })).toEqual({
        amountMode: 'direct',
        amount: '50',
        servings: 1,
      })
    })

    it('defaults non-weight foods to servings mode', () => {
      expect(getIngredientDefaults({ serving_unit: 'piece', serving_size: 1 })).toEqual({
        amountMode: 'servings',
        amount: '',
        servings: 1,
      })
    })
  })

  describe('formatIngredientAmount', () => {
    it('formats direct amounts with the unit', () => {
      expect(formatIngredientAmount({ amountMode: 'direct', amount: 50, amountUnit: 'g' })).toBe('50g')
    })

    it('pluralizes servings correctly', () => {
      expect(formatIngredientAmount({ amountMode: 'servings', servings: 1 })).toBe('1 serving')
      expect(formatIngredientAmount({ amountMode: 'servings', servings: 2 })).toBe('2 servings')
    })
  })
})
