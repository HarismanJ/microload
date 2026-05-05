import { FOOD_FORM_FIELDS } from '../../lib/foodEditor'
import { VALIDATION_LIMITS } from '../../lib/inputValidation'

function getTextMaxLength(key) {
  if (key === 'name') return VALIDATION_LIMITS.foodNameMaxLength
  if (key === 'brand') return VALIDATION_LIMITS.foodBrandMaxLength
  if (key === 'serving_unit') return VALIDATION_LIMITS.servingUnitMaxLength
  return undefined
}

function fieldInputProps(field) {
  if (field.type !== 'number') return { maxLength: getTextMaxLength(field.key) }
  return {
    inputMode: 'decimal',
    min: field.rules?.min ?? 0,
    max: field.rules?.max,
    step: field.rules?.decimals === 0 ? 1 : 0.01,
  }
}

export default function FoodEditorFields({ form, onFieldChange }) {
  return (
    <>
      <div className="cf-section">
        <div className="cf-section-title">Food Info</div>
        {FOOD_FORM_FIELDS.slice(0, 4).map(field => (
          <div key={field.key} className="cf-field">
            <label className="cf-label">
              {field.label}
              {field.required && <span className="cf-required"> *</span>}
            </label>
            <div className="cf-input-wrap">
              <input
                className="cf-input"
                type={field.type}
                value={form?.[field.key] ?? ''}
                {...fieldInputProps(field)}
                onChange={event => onFieldChange(field.key, event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="cf-section">
        <div className="cf-section-title">Macros <span className="cf-section-note">per serving</span></div>
        {FOOD_FORM_FIELDS.slice(4, 8).map(field => (
          <div key={field.key} className="cf-field">
            <label className="cf-label">
              {field.required && <span className="cf-required">* </span>}
              {field.label}
            </label>
            <div className="cf-input-wrap">
              <input
                className="cf-input"
                type="number"
                value={form?.[field.key] ?? ''}
                {...fieldInputProps(field)}
                onChange={event => onFieldChange(field.key, event.target.value)}
              />
              {field.unit && <span className="cf-unit">{field.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="cf-section">
        <div className="cf-section-title">More Nutrition <span className="cf-section-note">(optional)</span></div>
        {FOOD_FORM_FIELDS.slice(8).map(field => (
          <div key={field.key} className="cf-field">
            <label className="cf-label">{field.label}</label>
            <div className="cf-input-wrap">
              <input
                className="cf-input"
                type="number"
                value={form?.[field.key] ?? ''}
                {...fieldInputProps(field)}
                onChange={event => onFieldChange(field.key, event.target.value)}
              />
              {field.unit && <span className="cf-unit">{field.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
