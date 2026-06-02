alter table public.user_training_plans
  drop constraint if exists user_training_plans_equipment_check;

alter table public.user_training_plans
  add constraint user_training_plans_equipment_check
  check (
    cardinality(equipment) >= 1
    and equipment <@ array[
      'Bodyweight',
      'Dumbbell',
      'Barbell',
      'EZ Bar',
      'Cable',
      'Machine',
      'Cardio Machines'
    ]::text[]
  ) not valid;

alter table public.user_training_plans
  validate constraint user_training_plans_equipment_check;
