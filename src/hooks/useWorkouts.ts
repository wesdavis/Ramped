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

  const fetchUniqueExercises = async () => {
    try {
      const { data, error } = await supabase.from('sets').select('exercise_name')
      if (error) throw error
      if (!data) return []
      
      // Standardize to lowercase and filter out duplicates
      const unique = Array.from(new Set(data.map(d => d.exercise_name.toLowerCase())))
      return unique.sort()
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
      return []
    }
  }

  // Update your return statement at the bottom to include it:
  return { logSetToDatabase, fetchLastSession, fetchCalendarHistory, fetchExerciseProgression, fetchUniqueExercises, isLogging }




}