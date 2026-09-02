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

  const EXERCISES_BY_GROUP = {
  chest: [
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
  ],

  shoulders: [
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
    "rope face pull",
    "upright row",
    "barbell upright row",
    "dumbbell upright row",
    "cable upright row",
    "cuban press",
    "landmine press",
    "single arm landmine press",
  ],

  back: [
    "deadlift",
    "conventional deadlift",
    "sumo deadlift",
    "trap bar deadlift",
    "hex bar deadlift",
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
    "smith machine row",
    "face pull",
  ],

  legs: [
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
  ],

  arms: [
    // shoulders (no dedicated tile)
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
    "rope face pull",
    "upright row",
    "barbell upright row",
    "dumbbell upright row",
    "cable upright row",
    "cuban press",
    // biceps
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
    // triceps
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
    "jm press",
    "tate press",
    "tricep kickback",
    "cable kickback",
    "dip",
    "assisted dip",
    "machine dip",
    "bench dip",
    "machine tricep extension",
    // forearms
    "wrist curl",
    "reverse wrist curl",
    "behind the back wrist curl",
    "plate pinch",
    "dead hang",
  ],

  core: [
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
    "side bend",
    "dumbbell side bend",
    "cable side bend",
  ],

  glutes: [
    "hip thrust",
    "barbell hip thrust",
    "single leg hip thrust",
    "glute bridge",
    "single leg glute bridge",
    "cable glute kickback",
    "machine glute kickback",
    "hip abduction machine",
    "hip adduction machine",
    "cable hip abduction",
    "cable hip adduction",
    "frog pump",
    "smith machine hip thrust",
    "kettlebell swing",
    "american kettlebell swing",
    "cable pull through",
    "reverse hyper",
    "machine hip thrust",
  ],

  cardio: [
    "treadmill",
    "treadmill run",
    "treadmill walk",
    "treadmill incline walk",
    "elliptical",
    "stairmaster",
    "stepmill",
    "stair climber",
    "recumbent bike",
    "upright bike",
    "spin bike",
    "assault bike",
    "air bike",
    "row machine",
    "concept2 rower",
    "ski erg",
    "versa climber",
    "jacob's ladder",
    "jump rope",
    "battle ropes",
    "fan bike",
    "arc trainer",
    "jacob ladder",
    "sled push",
    "sled pull",
    "farmer carry",
    "prowler push",
  ],
}

// flat list if you still need COMMON_EXERCISES
const COMMON_EXERCISES = Object.values(EXERCISES_BY_GROUP).flat()



  // Accepts an optional muscle group to filter the dictionary and the database
  const fetchUniqueExercises = async (muscleGroup?: MuscleGroup | null) => {
    try {
      let query = supabase.from('sets').select('exercise_name')
      
      // If we are on a specific muscle day, filter the database query
      if (muscleGroup) {
        query = query.eq('muscle_group', muscleGroup)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      const dbExercises = data ? data.map(d => d.exercise_name.toLowerCase()) : []
      
      // Grab the right dictionary list using your new EXERCISES_BY_GROUP object
      let dictionaryList: string[] = []
      if (muscleGroup && EXERCISES_BY_GROUP[muscleGroup]) {
        dictionaryList = EXERCISES_BY_GROUP[muscleGroup]
      } else if (!muscleGroup) {
        dictionaryList = COMMON_EXERCISES // Use your pre-flattened list
      }
      
      const combined = [...dictionaryList, ...dbExercises]
      const unique = Array.from(new Set(combined))
      return unique.sort()
      
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
      // Fallback: return offline dictionary if the network drops
      if (muscleGroup && EXERCISES_BY_GROUP[muscleGroup]) {
        return EXERCISES_BY_GROUP[muscleGroup].sort()
      }
      return COMMON_EXERCISES.sort()
    }
  }

  // Strictly pulls exercises that have been logged to the database (for charts)
  const fetchLoggedExercises = async () => {
    try {
      const { data, error } = await supabase.from('sets').select('exercise_name')
      if (error) throw error
      if (!data) return []

      const dbExercises = data.map(d => d.exercise_name.toLowerCase())
      const unique = Array.from(new Set(dbExercises))
      return unique.sort()
    } catch (error) {
      console.error('Failed to fetch logged exercises:', error)
      return []
    }
  }

  // Silently deletes a specific set from today's active session
  const deleteSetFromDatabase = async (exercise: string, setNumber: number) => {
    const localDate = new Date().toLocaleDateString('en-CA')
    try {
      const { error } = await supabase
        .from('sets')
        .delete()
        .match({ 
          exercise_name: exercise.trim(), 
          set_number: setNumber,
          local_date: localDate
        })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to delete set:', error)
      return { success: false }
    }
  }

  const fetchPersonalRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('sets')
        .select('muscle_group, exercise_name, weight')

      if (error) throw error
      if (!data) return {}

      // Group by muscle group, then find the max weight per exercise
      const prs: Record<string, Record<string, number>> = {}

      data.forEach((set) => {
        const mg = set.muscle_group
        const ex = set.exercise_name
        const wt = set.weight

        if (!prs[mg]) prs[mg] = {}
        if (!prs[mg][ex] || wt > prs[mg][ex]) {
          prs[mg][ex] = wt
        }
      })

      return prs
    } catch (error) {
      console.error('Failed to fetch PRs:', error)
      return {}
    }
  }

  // Update your return statement at the bottom to export the new function:
  return { logSetToDatabase, fetchLastSession, fetchCalendarHistory, fetchExerciseProgression, fetchUniqueExercises, fetchLoggedExercises, deleteSetFromDatabase, isLogging, fetchPersonalRecords }
}