import {
  normalizeUsername,
  hasMaxDecimals,
  parseFiniteNumber,
  trimToMax,
  validateBodyweight,
  validateEmail,
  validateLength,
  validateNumber,
  validateNutritionForm,
  validatePassword,
  validateUsername,
} from '../../lib/inputValidation.js'

describe('email and password validation', () => {
  it('validates required, length, format, and valid emails', () => {
    expect(validateEmail('')).toBe('Email is required.')
    expect(validateEmail(`${'a'.repeat(255)}@x.com`)).toBe('Email cannot exceed 254 characters.')
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address.')
    expect(validateEmail('user@example.com')).toBe('')
  })

  it('validates password length boundaries', () => {
    expect(validatePassword('short')).toBe('Password must be at least 8 characters.')
    expect(validatePassword('x'.repeat(129))).toBe('Password cannot exceed 128 characters.')
    expect(validatePassword('long-enough')).toBe('')
  })
})

describe('username validation', () => {
  it('normalizes usernames before validation', () => {
    expect(normalizeUsername('  @@LiftLog_User  ')).toBe('liftlog_user')
  })

  it('rejects short, long, and invalid usernames', () => {
    expect(validateUsername('ab')).toBe('Username must be at least 3 characters.')
    expect(validateUsername('a'.repeat(25))).toBe('Username cannot exceed 24 characters.')
    expect(validateUsername('bad name')).toBe('Username can only use lowercase letters, numbers, and underscores.')
    expect(validateUsername('@valid_name1')).toBe('')
  })
})

describe('numeric form validation', () => {
  it('trims strings and parses finite numbers', () => {
    expect(trimToMax('abcdef', 3)).toBe('abc')
    expect(parseFiniteNumber('12.5')).toBe(12.5)
    expect(parseFiniteNumber('')).toBeNull()
    expect(parseFiniteNumber('nope')).toBeNull()
  })

  it('checks decimal precision', () => {
    expect(hasMaxDecimals('1.2', 2)).toBe(true)
    expect(hasMaxDecimals('1.234', 2)).toBe(false)
    expect(hasMaxDecimals('', 2)).toBe(true)
  })

  it('rejects invalid numbers and excess decimals', () => {
    expect(validateNumber('abc', { label: 'Load' })).toBe('Load must be a valid number.')
    expect(validateNumber('1.234', { label: 'Load', decimals: 2 })).toBe('Load can have at most 2 decimal places.')
  })

  it('validates integer, min, max, and optional number paths', () => {
    expect(validateNumber('', { label: 'Age' })).toBe('')
    expect(validateNumber('', { label: 'Age', required: true })).toBe('Age is required.')
    expect(validateNumber('1.5', { label: 'Age', integer: true })).toBe('Age must be a whole number.')
    expect(validateNumber('0', { label: 'Age', min: 1 })).toBe('Age must be at least 1.')
    expect(validateNumber('1001', { label: 'Calories', max: 1000 })).toBe('Calories cannot exceed 1,000.')
  })

  it('validates required and bounded string lengths', () => {
    expect(validateLength('', { label: 'Name', required: true })).toBe('Name is required.')
    expect(validateLength('ab', { label: 'Name', min: 3 })).toBe('Name must be at least 3 characters.')
    expect(validateLength('abcd', { label: 'Name', max: 3 })).toBe('Name cannot exceed 3 characters.')
    expect(validateLength('abc', { label: 'Name', min: 3, max: 5 })).toBe('')
  })

  it('validates bodyweight after unit conversion', () => {
    expect(validateBodyweight(150, 'lbs')).toBe('')
    expect(validateBodyweight(40, 'lbs')).toBe('Bodyweight must be between 20 and 600 kg.')
  })

  it('requires serving size for nutrition forms', () => {
    expect(validateNutritionForm({
      name: 'Greek yogurt',
      serving_unit: 'g',
      calories: 90,
    })).toBe('Serving size is required.')
  })

  it('validates required calories after serving size', () => {
    expect(validateNutritionForm({
      name: 'Greek yogurt',
      serving_unit: 'g',
      serving_size: 100,
    })).toBe('Calories is required.')
  })

  it('accepts a complete nutrition form', () => {
    expect(validateNutritionForm({
      name: 'Greek yogurt',
      brand: 'Plain',
      serving_unit: 'g',
      serving_size: 100,
      calories: 90,
      protein: 17,
      carbs: 6,
      fat: 0,
    })).toBe('')
  })
})
