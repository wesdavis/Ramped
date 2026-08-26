'use client'

import { useState, useEffect } from 'react'
import { MuscleGroup } from '@/src/types/database'
import { Heart } from 'lucide-react'
import Image from 'next/image'
import { useWorkouts } from '@/src/hooks/useWorkouts'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
  { id: 'glutes', label: 'Glutes' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<'log' | 'calendar' | 'charts'>('log')
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null)
  const [showCardioModal, setShowCardioModal] = useState(false)
  const { logSetToDatabase, isLogging, fetchLastSession, fetchCalendarHistory, fetchExerciseProgression, fetchUniqueExercises } = useWorkouts()
  
  
  // Set Logger form state
  const [exercise, setExercise] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  
  // Temporary state to show logged sets before we wire up Supabase
  const [sessionSets, setSessionSets] = useState<{id: number, setNumber: number, exercise: string, weight: string, reps: string}[]>([])

  // Calendar State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [calendarHistory, setCalendarHistory] = useState<any[]>([])

  // Charts State
  const [chartExercise, setChartExercise] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any[]>([])
  const [allExercises, setAllExercises] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Watch the chart search input and fetch progression data
  useEffect(() => {
    if (chartExercise.trim().length < 3) {
      setChartData([])
      return
    }

  

    const timer = setTimeout(async () => {
      const data = await fetchExerciseProgression(chartExercise)
      setChartData(data)
    }, 600) 

    return () => clearTimeout(timer)
  }, [chartExercise])

  // Load the master list of exercises when the charts tab opens
  useEffect(() => {
    if (activeTab === 'charts') {
      const loadExercises = async () => {
        const uniqueList = await fetchUniqueExercises()
        setAllExercises(uniqueList)
      }
      loadExercises()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Unified cleanup function for ANY time you back out of a muscle group
  const handleCloseForm = () => {
    setSelectedGroup(null)
    setExercise('')
    setWeight('')
    setReps('')
    setShowHistoryAlert(false)
  }

  // Watch the exercise input and fetch actual history from Supabase
  useEffect(() => {
    if (exercise.trim().length < 3 || !selectedGroup) {
      setShowHistoryAlert(false)
      return
    }

    const timer = setTimeout(async () => {
      const history = await fetchLastSession(exercise, selectedGroup)
      
      if (history) {
        setLastSessionInfo(history)
        setShowHistoryAlert(true)
      } else {
        setShowHistoryAlert(false)
      }
    }, 600) 

    return () => clearTimeout(timer)
  }, [exercise, selectedGroup])

  // Load calendar data when the Calendar tab is clicked
  useEffect(() => {
    if (activeTab === 'calendar') {
      const loadHistory = async () => {
        const data = await fetchCalendarHistory()
        if (data) setCalendarHistory(data)
      }
      loadHistory()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleLogSet = async () => {
    if (!exercise || !weight || !reps || !selectedGroup) return
    
    // 1. Calculate Set Number
    const currentSetNumber = sessionSets.filter(
      (s) => s.exercise.toLowerCase() === exercise.trim().toLowerCase()
    ).length + 1
    
    // 2. Update UI instantly (Optimistic UI for zero friction)
    const newSet = { id: Date.now(), setNumber: currentSetNumber, exercise: exercise.trim(), weight, reps }
    setSessionSets(prev => [newSet, ...prev])
    setReps('') // Clear reps for next set
    
    // 3. Blast it to Supabase in the background
    const result = await logSetToDatabase({
      muscleGroup: selectedGroup,
      exercise: exercise,
      setNumber: currentSetNumber,
      weight: Number(weight),
      reps: Number(reps)
    })

    if (!result.success) {
      console.error("Failed to save to cloud")
    }
  }

  // Cardio form state
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [heartRate, setHeartRate] = useState('')

  // History Alert State
  const [lastSessionInfo, setLastSessionInfo] = useState<{ date: string, weight: number, reps: number, sets: number } | null>(null)
  const [showHistoryAlert, setShowHistoryAlert] = useState(false)
  
  return (
    <main className="min-h-screen bg-[#0D0D0F] text-[#F1F3F4] max-w-md mx-auto flex flex-col justify-between p-4 selection:bg-[#FF6A2E] selection:text-[#0D0D0F] relative">
      
      {/* Header */}
      <header className="flex items-center justify-center border-b border-[#64748B]/30 overflow-hidden h-20 mb-4">
        <Image 
          src="/ramped_logo.png" 
          alt="RAMPED Logo" 
          width={400} 
          height={120} 
          priority 
          className="w-auto h-full object-contain drop-shadow-md scale-[3.5] transition-transform"
        />
      </header>

      {/* Cardio Quick Log Modal */}
      {showCardioModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0F] border border-[#64748B]/50 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-lg uppercase text-[#2D6D6A] flex items-center gap-2">
                <Heart className="w-5 h-5 fill-[#2D6D6A]" /> Log Cardio
              </h3>
              <button
                onClick={() => setShowCardioModal(false)}
                className="text-[#64748B] hover:text-[#F1F3F4] text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#64748B] font-bold uppercase">Duration (Mins)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-lg p-3 text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] mt-1 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-[#64748B] font-bold uppercase">Distance (Miles)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2.5"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-lg p-3 text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] mt-1 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-[#64748B] font-bold uppercase">Avg Heart Rate (BPM)</label>
                <input
                  type="number"
                  placeholder="145"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-lg p-3 text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] mt-1 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={() => setShowCardioModal(false)}
              className="w-full bg-[#2D6D6A] hover:bg-[#2D6D6A]/80 text-[#F1F3F4] font-extrabold py-3 rounded-xl uppercase transition-colors"
            >
              Save Cardio
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 py-2">
        {activeTab === 'log' && (
          <section className="space-y-4">
            {!selectedGroup ? (
              <>
                <h2 className="text-xs font-semibold tracking-wider text-[#64748B] uppercase text-center mb-4">
                  Select Target Muscle Group
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {MUSCLE_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className="relative group overflow-hidden h-32 rounded-2xl bg-neutral-900/50 border border-[#64748B]/30 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-linear-to-t from-[#FF6A2E]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 font-black text-xl tracking-widest text-[#F1F3F4] group-hover:text-white uppercase drop-shadow-md">
                        {group.label}
                      </span>
                    </button>
                  ))}

                  {/* Muted Teal Cardio Square */}
                  <button
                    onClick={() => setShowCardioModal(true)}
                    className="relative group overflow-hidden h-32 rounded-2xl bg-neutral-900/50 border border-[#64748B]/30 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-[#2D6D6A]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 font-black text-xl tracking-widest text-[#F1F3F4] group-hover:text-white uppercase drop-shadow-md flex items-center gap-2">
                      CARDIO <Heart className="w-5 h-5 text-[#2D6D6A] group-hover:fill-[#2D6D6A]/20 transition-all" />
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleCloseForm}
                  className="text-xs font-semibold text-[#64748B] hover:text-[#F1F3F4] flex items-center gap-1 transition-colors"
                >
                  ← Back to Muscle Groups
                </button>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* Header & Back Button */}
                <div className="flex items-center justify-between border-b border-[#64748B]/30 pb-4">
                  <h3 className="font-black text-2xl uppercase text-[#F1F3F4] tracking-widest drop-shadow-md">
                    {selectedGroup} <span className="text-[#FF6A2E]">DAY</span>
                  </h3>
                  <button
                    onClick={handleCloseForm}
                    className="text-xs font-bold text-[#64748B] hover:text-[#F1F3F4] transition-colors uppercase px-3 py-1.5 bg-neutral-900/50 rounded-lg border border-[#64748B]/30"
                  >
                    Cancel
                  </button>
                </div>

                {/* The Frictionless Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Exercise Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Incline Dumbbell Press"
                      value={exercise}
                      onChange={(e) => setExercise(e.target.value)}
                      className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-lg font-bold text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] transition-all"
                    />
                  </div>

                  {/* The History Alert Pop-up */}
                  {showHistoryAlert && lastSessionInfo && (
                    <div className="bg-[#2D6D6A]/10 border border-[#2D6D6A]/50 rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2 shadow-lg">
                      <div className="space-y-1">
                        <p className="text-[10px] text-[#2D6D6A] font-black uppercase tracking-widest flex items-center gap-1">
                          Last Session <span className="text-[#64748B]">•</span> {lastSessionInfo.date}
                        </p>
                        <p className="text-[#F1F3F4] font-bold text-sm">
                          <span className="text-[#FF6A2E]">{lastSessionInfo.sets}</span> Sets 
                          <span className="text-[#64748B] mx-2">|</span> 
                          Top: <span className="text-[#F1F3F4]">{lastSessionInfo.weight}</span> lbs × <span className="text-[#F1F3F4]">{lastSessionInfo.reps}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowHistoryAlert(false)} 
                        className="px-4 py-2 bg-[#2D6D6A] hover:bg-[#2D6D6A]/80 active:scale-95 text-[#0D0D0F] font-black text-xs uppercase tracking-widest rounded-lg transition-all shadow-md"
                      >
                        Okay
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Weight (Lbs)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-2xl font-black text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] text-center transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Reps</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-2xl font-black text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] text-center transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleLogSet}
                    className="w-full h-16 bg-[#FF6A2E] hover:bg-[#FF6A2E]/90 active:scale-[0.98] text-[#0D0D0F] font-black text-xl tracking-widest rounded-xl uppercase transition-all shadow-[0_0_20px_rgba(255,106,46,0.3)] mt-2"
                  >
                    Log Set
                  </button>
                </div>

                {/* Session History Feed */}
                {sessionSets.length > 0 && (
                  <div className="space-y-2">
                      {sessionSets.map((set, index) => (
                        <div key={set.id} className="flex justify-between items-center bg-neutral-900/40 border border-[#64748B]/20 rounded-lg p-3 gap-3">
                          
                          {/* Left side: Set Number & Exercise Name (Allowed to wrap) */}
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-[#FF6A2E] font-black text-sm mt-0.5 min-w-3">
                              {set.setNumber || (sessionSets.length - index)}
                            </span>
                            <span className="text-[#F1F3F4] font-bold leading-tight break-words pr-2">
                              {set.exercise}
                            </span>
                          </div>

                          {/* Right side: Weight & Reps (Locked to one line) */}
                          <div className="text-[#64748B] font-bold text-sm whitespace-nowrap">
                            <span className="text-[#F1F3F4]">{set.weight}</span> lbs × <span className="text-[#F1F3F4]">{set.reps}</span>
                          </div>

                        </div>
                      ))}
                    </div>
                )}
              </div>
              </div>
            )}
          </section>
        )}

        {/* --- NEW CALENDAR SECTION --- */}
        {activeTab === 'calendar' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-8">
            <h2 className="text-xl font-black tracking-widest text-[#FF6A2E] uppercase border-b border-[#64748B]/30 pb-4">
              Training History
            </h2>
            
            {calendarHistory.length === 0 ? (
              <p className="text-[#64748B] text-center text-sm py-8">No workouts logged yet.</p>
            ) : (
              <div className="space-y-8">
                {/* Group the raw data by date */}
                {Array.from(new Set(calendarHistory.map(set => set.local_date))).map(date => {
                  const daySets = calendarHistory.filter(s => s.local_date === date)
                  
                  // Format the date header
                  const dateHeader = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'short', day: 'numeric'
                  })

                  return (
                    <div key={date as string} className="space-y-3">
                      <h3 className="text-xs font-black text-[#2D6D6A] uppercase tracking-widest sticky top-0 bg-[#0D0D0F] py-2 z-10">
                        {dateHeader}
                      </h3>
                      
                      <div className="bg-neutral-900/40 border border-[#64748B]/20 rounded-xl overflow-hidden">
                        {/* Group further by exercise within that day */}
                        {Array.from(new Set(daySets.map(s => s.exercise_name))).map(exercise => {
                          const exerciseSets = daySets.filter(s => s.exercise_name === exercise)
                          
                          return (
                            <div key={exercise as string} className="border-b border-[#64748B]/10 last:border-0 p-4">
                              <h4 className="text-[#F1F3F4] font-bold uppercase mb-2 text-sm flex items-center justify-between">
                                {exercise as string}
                                <span className="text-[#64748B] text-[10px]">{exerciseSets.length} sets</span>
                              </h4>
                              <div className="space-y-1">
                                {exerciseSets.map((set, idx) => (
                                  <div key={set.id} className="flex justify-between text-sm">
                                    <span className="text-[#64748B] font-medium">Set {idx + 1}</span>
                                    <span className="text-[#F1F3F4] font-bold">
                                      {set.weight} <span className="text-[#64748B] font-normal">lbs</span> × {set.reps}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'charts' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300 pb-8">
            <h2 className="text-xl font-black tracking-widest text-[#FF6A2E] uppercase border-b border-[#64748B]/30 pb-4">
              Progression
            </h2>

            {/* Smart Autocomplete Search */}
            <div className="relative z-20">
              <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Target Exercise</label>
              <input
                type="text"
                placeholder="e.g. seated row"
                value={chartExercise}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setChartExercise(e.target.value)
                  setShowDropdown(true)
                }}
                className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-lg font-bold text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] transition-all"
              />
              
              {/* Dropdown Menu */}
              {showDropdown && chartExercise.trim().length > 0 && (
                <div className="absolute w-full mt-2 bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {allExercises
                    .filter(ex => ex.includes(chartExercise.toLowerCase()))
                    .map(ex => (
                      <button
                        key={ex}
                        onClick={() => {
                          setChartExercise(ex)
                          setShowDropdown(false)
                        }}
                        className="w-full text-left p-4 text-[#F1F3F4] font-bold uppercase hover:bg-neutral-900/80 border-b border-[#64748B]/20 last:border-0 transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {chartExercise.trim().length >= 3 && chartData.length === 0 ? (
              <p className="text-[#64748B] text-center text-sm py-8">No data found for this exercise.</p>
            ) : chartData.length > 0 ? (
              <div className="bg-neutral-900/40 border border-[#64748B]/20 rounded-xl p-4 pt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748B" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                      minTickGap={30} /* Future-proof: Hides overlapping dates */
                    />
                    <YAxis 
                      stroke="#64748B" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={['dataMin - 10', 'dataMax + 10']} /* Future-proof: Keeps line centered */
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0D0D0F', borderColor: '#2D6D6A', borderRadius: '8px' }}
                      itemStyle={{ color: '#FF6A2E', fontWeight: 'bold' }}
                      labelStyle={{ color: '#64748B', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      name="Max Lbs"
                      stroke="#FF6A2E" 
                      strokeWidth={3} 
                      dot={{ fill: '#0D0D0F', stroke: '#FF6A2E', strokeWidth: 2, r: 4 }}
                      activeDot={{ fill: '#FF6A2E', stroke: '#0D0D0F', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </section>
        )}
      </div>

      {/* Navigation */}
      <nav className="sticky bottom-0 grid grid-cols-3 gap-1 bg-[#0D0D0F] border-t border-[#64748B]/30 p-2 text-xs font-bold uppercase shadow-lg z-50">
        {(['log', 'calendar', 'charts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 rounded-lg text-center transition-colors ${
              activeTab === tab
                ? 'bg-[#FF6A2E] text-[#0D0D0F] font-black'
                : 'text-[#64748B] hover:text-[#F1F3F4]'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </main>
  )
}