import { useState } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import { MuscleGroup } from '@/src/types/database'

export function useWorkouts() {
  const [isLogging, setIsLogging] = useState(false)

  const logSetToDatabase = async ({
    muscleGroup,
    exercise,
    setNumber,
    weight,
    reps
  }: {
    muscleGroup: MuscleGroup
    exercise: string
    setNumber: number
    weight: number
    reps: number
  }) => {
    setIsLogging(true)

    // Generates a strict YYYY-MM-DD string based on the device's local timezone.
    const localDate = new Date().toLocaleDateString('en-CA') 

    try {
      const { error } = await supabase
        .from('sets')
        .insert([
          {
            muscle_group: muscleGroup,
            exercise_name: exercise.trim(),
            set_number: setNumber,
            weight: Number(weight),
            reps: Number(reps),
            local_date: localDate,
          }
        ])

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Database Error:', error)
      return { success: false, error }
    } finally {
      setIsLogging(false)
    }
  }

  const fetchLastSession = async (exercise: string, muscleGroup: MuscleGroup) => {
    const today = new Date().toLocaleDateString('en-CA')

    try {
      // 1. Find the most recent date this exercise was performed (filtered by muscle group)
      const { data: dateData } = await supabase
        .from('sets')
        .select('local_date')
        .ilike('exercise_name', exercise.trim()) 
        .eq('muscle_group', muscleGroup)
        .neq('local_date', today)
        .order('local_date', { ascending: false })
        .limit(1)

      if (!dateData || dateData.length === 0) return null

      const lastDate = dateData[0].local_date

      // 2. Fetch all sets for that specific exercise on that specific date
      const { data: sessionData } = await supabase
        .from('sets')
        .select('weight, reps')
        .ilike('exercise_name', exercise.trim())
        .eq('muscle_group', muscleGroup)
        .eq('local_date', lastDate)

      if (!sessionData || sessionData.length === 0) return null

      // 3. Find the heaviest set and the total number of sets
      const totalSets = sessionData.length
      const topSet = sessionData.reduce((prev, current) => 
        (current.weight > prev.weight) ? current : prev
      )

      // Format the date to look nice 
      const formattedDate = new Date(lastDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric'
      })

      return {
        date: formattedDate,
        weight: topSet.weight,
        reps: topSet.reps,
        sets: totalSets
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
      return null
    }
  }

  const fetchCalendarHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .order('local_date', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to fetch calendar:', error)
      return []
    }
  }

  const fetchExerciseProgression = async (exercise: string) => {
    try {
      // Pull all sets for this specific exercise, ordered chronologically
      const { data, error } = await supabase
        .from('sets')
        .select('local_date, weight')
        .ilike('exercise_name', exercise.trim())
        .order('local_date', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) return []

      // Group by date and find the max weight lifted that day
      const progressionMap = new Map()
      data.forEach(set => {
        const currentMax = progressionMap.get(set.local_date) || 0
        if (set.weight > currentMax) {
          progressionMap.set(set.local_date, set.weight)
        }
      })

      // Format the data specifically for Recharts to consume
      return Array.from(progressionMap.entries()).map(([date, weight]) => ({
        // Shorten date to "Aug 19" for a cleaner X-axis
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight
      }))
    } catch (error) {
      console.error('Failed to fetch progression:', error)
      return []
    }
  }

  const COMMON_EXERCISES = [
  // Chest
  "bench press",
  "barbell bench press",
  "incline bench press",
  "decline bench press",
  "close grip bench press",
  "wide grip bench press",
  "reverse grip bench press",
  "floor press",
  "dumbbell bench press",
  "incline dumbbell press",
  "dumbbell incline chest press",
  "decline dumbbell press",
  "dumbbell fly",
  "incline dumbbell fly",
  "decline dumbbell fly",
  "dumbbell pullover",
  "dumbbell squeeze press",
  "dumbbell floor press",
  "cable crossover",
  "high cable crossover",
  "low cable crossover",
  "mid cable crossover",
  "cable fly",
  "cable chest press",
  "single arm cable chest press",
  "pec deck fly",
  "machine chest fly",
  "machine chest press",
  "incline machine chest press",
  "decline machine chest press",
  "seated chest press",
  "hammer strength chest press",
  "hammer strength incline press",
  "smith machine bench press",
  "smith machine incline press",
  "smith machine decline press",
  "landmine press",
  "single arm landmine press",
  "push up",

  // Back
  "deadlift",
  "conventional deadlift",
  "sumo deadlift",
  "trap bar deadlift",
  "hex bar deadlift",
  "romanian deadlift",
  "stiff leg deadlift",
  "deficit deadlift",
  "rack pull",
  "snatch grip deadlift",
  "barbell row",
  "bent over row",
  "pendlay row",
  "yates row",
  "t-bar row",
  "chest supported row",
  "seal row",
  "meadows row",
  "single arm dumbbell row",
  "dumbbell row",
  "chest supported dumbbell row",
  "seated row",
  "cable seated row",
  "wide grip seated row",
  "close grip seated row",
  "neutral grip seated row",
  "single arm cable row",
  "standing cable row",
  "machine row",
  "hammer strength row",
  "hammer strength iso row",
  "lat pulldown",
  "wide grip lat pulldown",
  "close grip lat pulldown",
  "neutral grip lat pulldown",
  "reverse grip lat pulldown",
  "v bar lat pulldown",
  "single arm lat pulldown",
  "straight arm pulldown",
  "rope pulldown",
  "pull up",
  "chin up",
  "assisted pull up",
  "assisted chin up",
  "neutral grip pull up",
  "good morning",
  "back extension",
  "hyperextension",
  "45 degree back extension",
  "machine back extension",
  "barbell shrug",
  "dumbbell shrug",
  "smith machine shrug",
  "behind the back shrug",
  "farmer carry",
  "smith machine row",

  // Legs
  "barbell squat",
  "back squat",
  "high bar squat",
  "low bar squat",
  "front squat",
  "goblet squat",
  "chalice squat",
  "hack squat",
  "machine hack squat",
  "pendulum squat",
  "belt squat",
  "safety bar squat",
  "zercher squat",
  "box squat",
  "sumo squat",
  "smith machine squat",
  "smith machine front squat",
  "leg press",
  "horizontal leg press",
  "45 degree leg press",
  "vertical leg press",
  "single leg press",
  "narrow stance leg press",
  "wide stance leg press",
  "leg extension",
  "single leg extension",
  "lying leg curl",
  "seated leg curl",
  "standing leg curl",
  "single leg curl",
  "glute ham raise",
  "nordic hamstring curl",
  "romanian deadlift",
  "dumbbell romanian deadlift",
  "single leg romanian deadlift",
  "good morning",
  "hip thrust",
  "barbell hip thrust",
  "glute bridge",
  "single leg hip thrust",
  "cable glute kickback",
  "machine glute kickback",
  "hip abduction machine",
  "hip adduction machine",
  "cable hip abduction",
  "cable hip adduction",
  "walking lunge",
  "reverse lunge",
  "barbell lunge",
  "dumbbell lunge",
  "walking dumbbell lunge",
  "lateral lunge",
  "curtsy lunge",
  "bulgarian split squat",
  "smith machine bulgarian split squat",
  "split squat",
  "step up",
  "dumbbell step up",
  "sissy squat",
  "calf raise",
  "standing calf raise",
  "seated calf raise",
  "donkey calf raise",
  "smith machine calf raise",
  "leg press calf raise",
  "single leg calf raise",
  "tibialis raise",

  // Shoulders
  "overhead press",
  "military press",
  "barbell overhead press",
  "seated barbell press",
  "dumbbell shoulder press",
  "seated dumbbell press",
  "arnold press",
  "machine shoulder press",
  "hammer strength shoulder press",
  "smith machine shoulder press",
  "push press",
  "behind the neck press",
  "landmine press",
  "z press",
  "lateral raise",
  "dumbbell lateral raise",
  "cable lateral raise",
  "leaning cable lateral raise",
  "machine lateral raise",
  "front raise",
  "dumbbell front raise",
  "cable front raise",
  "plate front raise",
  "barbell front raise",
  "rear delt fly",
  "dumbbell rear delt fly",
  "bent over rear delt raise",
  "reverse pec deck",
  "machine rear delt fly",
  "cable rear delt fly",
  "face pull",
  "rope face pull",
  "upright row",
  "barbell upright row",
  "dumbbell upright row",
  "cable upright row",
  "barbell shrug",
  "dumbbell shrug",
  "cable shrug",
  "cuban press",

  // Arms
  "barbell bicep curl",
  "ez bar curl",
  "dumbbell bicep curl",
  "alternating dumbbell curl",
  "hammer curl",
  "cross body hammer curl",
  "rope hammer curl",
  "preacher curl",
  "ez bar preacher curl",
  "dumbbell preacher curl",
  "machine preacher curl",
  "concentration curl",
  "incline dumbbell curl",
  "spider curl",
  "drag curl",
  "zottman curl",
  "reverse curl",
  "bayesian curl",
  "cable curl",
  "cable bicep curl",
  "overhead cable curl",
  "machine bicep curl",
  "tricep pushdown",
  "bar pushdown",
  "rope pushdown",
  "v bar pushdown",
  "single arm pushdown",
  "overhead tricep extension",
  "dumbbell overhead tricep extension",
  "cable overhead tricep extension",
  "skull crusher",
  "ez bar skull crusher",
  "dumbbell skull crusher",
  "close grip bench press",
  "jm press",
  "tate press",
  "tricep kickback",
  "cable kickback",
  "dip",
  "assisted dip",
  "machine dip",
  "bench dip",
  "machine tricep extension",
  "wrist curl",
  "reverse wrist curl",
  "behind the back wrist curl",
  "farmer carry",
  "plate pinch",
  "dead hang",

  // Core
  "crunch",
  "cable crunch",
  "machine crunch",
  "ab crunch machine",
  "decline crunch",
  "sit up",
  "decline sit up",
  "hanging leg raise",
  "hanging knee raise",
  "captains chair leg raise",
  "captains chair knee raise",
  "roman chair sit up",
  "russian twist",
  "weighted russian twist",
  "ab wheel rollout",
  "barbell rollout",
  "plank",
  "cable woodchop",
  "high to low woodchop",
  "low to high woodchop",
  "pallof press",
  "landmine rotation",
  "toes to bar",
  "dragon flag",
  "back extension",
  "side bend",
  "dumbbell side bend",
  "cable side bend",
]



  const fetchUniqueExercises = async () => {
    try {
      const { data, error } = await supabase.from('sets').select('exercise_name')
      if (error) throw error
      
      // Pull whatever is in the database
      const dbExercises = data ? data.map(d => d.exercise_name.toLowerCase()) : []
      
      // Smash the database list and our hardcoded dictionary together
      const combined = [...COMMON_EXERCISES, ...dbExercises]
      
      // Run it through a Set to destroy any duplicates, then sort alphabetically
      const unique = Array.from(new Set(combined))
      return unique.sort()
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
      // If the database fails, it still gracefully returns the offline dictionary!
      return COMMON_EXERCISES.sort()
    }
  }

  // Update your return statement at the bottom to include it:
  return { logSetToDatabase, fetchLastSession, fetchCalendarHistory, fetchExerciseProgression, fetchUniqueExercises, isLogging }




}