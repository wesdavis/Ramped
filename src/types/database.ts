export type MuscleGroup = 'chest' | 'back' | 'legs' | 'arms' | 'core' | 'glutes'

export interface Workout {
  id: string
  user_id: string
  date: string
  muscle_group: MuscleGroup
  created_at: string
}

export interface ExerciseSet {
  id: string
  workout_id: string
  user_id: string
  exercise_name: string
  set_number: number
  weight: number
  reps: number
  created_at: string
}

export interface LogSetPayload {
  muscleGroup: MuscleGroup
  exerciseName: string
  weight: number
  reps: number
}

export interface CardioLog {
  id: string
  user_id: string
  duration_minutes: number
  distance_miles?: number
  avg_heart_rate?: number
  created_at: string
}