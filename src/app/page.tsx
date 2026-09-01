'use client'

import { useState, useEffect } from 'react'
import { MuscleGroup } from '@/src/types/database'
import { Heart, Trash2, LogOut } from 'lucide-react'
import Image from 'next/image'
import { useWorkouts } from '@/src/hooks/useWorkouts'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/src/lib/supabaseClient' // <--- Added Supabase import

const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
  { id: 'glutes', label: 'Glutes' },
]

export default function Home() {
  // --- AUTH STATE ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Profile State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  const [displayName, setDisplayName] = useState('LIFTER')
  const [isEditingName, setIsEditingName] = useState(false)

  // Automatically load the avatar and name if they exist in metadata
  useEffect(() => {
    if (session?.user?.user_metadata) {
      if (session.user.user_metadata.avatar_url) {
        setAvatarUrl(session.user.user_metadata.avatar_url)
      }
      if (session.user.user_metadata.display_name) {
        setDisplayName(session.user.user_metadata.display_name)
      }
    }
  }, [session])

  // Watch for logins/logouts
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // The "One-Door" Auth Function
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    // Try to log in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (signInError) {
      // If the account doesn't exist (Invalid login credentials), silently create it
      if (signInError.message.includes("Invalid login")) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })
        if (signUpError) setAuthError(signUpError.message)
      } else {
        setAuthError(signInError.message)
      }
    }
    setAuthLoading(false)
  }

  // --- EXISTING APP STATE ---
  const [activeTab, setActiveTab] = useState<'log' | 'calendar' | 'charts' | 'profile'>('log')
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null)
  const [showCardioModal, setShowCardioModal] = useState(false)
  const [personalRecords, setPersonalRecords] = useState<Record<string, Record<string, number>>>({})
  const { logSetToDatabase, fetchLastSession, fetchCalendarHistory, fetchExerciseProgression, fetchUniqueExercises, fetchLoggedExercises, deleteSetFromDatabase, fetchPersonalRecords } = useWorkouts()
  
  const [exercise, setExercise] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [sessionSets, setSessionSets] = useState<{id: number, setNumber: number, exercise: string, weight: string, reps: string}[]>([])

  const [calendarHistory, setCalendarHistory] = useState<any[]>([])
  const [chartExercise, setChartExercise] = useState('')
  const [chartData, setChartData] = useState<any[]>([])
  
  const [allExercises, setAllExercises] = useState<string[]>([]) 
  const [logExercises, setLogExercises] = useState<string[]>([]) 
  
  const [showLogDropdown, setShowLogDropdown] = useState(false)
  const [showChartDropdown, setShowChartDropdown] = useState(false)

  const loadAllExercises = async () => {
    // Only load data if user is logged in
    if (!session) return 
    const uniqueList = await fetchLoggedExercises()
    setAllExercises(uniqueList)
  }

  useEffect(() => {
    loadAllExercises()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (selectedGroup && session) {
      const loadScopedExercises = async () => {
        const scopedList = await fetchUniqueExercises(selectedGroup)
        setLogExercises(scopedList)
      }
      loadScopedExercises()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, session])

  useEffect(() => {
    if (chartExercise.trim().length < 3 || !session) {
      setChartData([])
      return
    }
    const timer = setTimeout(async () => {
      const data = await fetchExerciseProgression(chartExercise)
      setChartData(data)
    }, 600) 
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartExercise, session])

  useEffect(() => {
    if (activeTab === 'profile' && session) {
      const loadPRs = async () => {
        const prs = await fetchPersonalRecords()
        setPersonalRecords(prs)
      }
      loadPRs()
    }
  }, [activeTab, session])

  const handleCloseForm = () => {
    setSelectedGroup(null)
    setExercise('')
    setWeight('')
    setReps('')
    setShowHistoryAlert(false)
    setShowLogDropdown(false)
  }

  useEffect(() => {
    if (exercise.trim().length < 3 || !selectedGroup || !session) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, selectedGroup, session])

  useEffect(() => {
    if (activeTab === 'calendar' && session) {
      const loadHistory = async () => {
        const data = await fetchCalendarHistory()
        if (data) setCalendarHistory(data)
      }
      loadHistory()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true)
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}.${fileExt}`

      // 1. Upload the image to the 'avatars' bucket (upsert replaces the old one)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // 2. Grab the public URL of the newly uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Append a timestamp to the URL to instantly break the browser cache
      const freshUrl = `${publicUrl}?t=${Date.now()}`

      // 3. Save this URL to the user's permanent auth profile
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: freshUrl }
      })

      if (updateError) throw updateError

      // Update the UI instantly
      setAvatarUrl(freshUrl)
    } catch (error) {
      console.error('Error uploading avatar:', error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleNameSave = async () => {
    setIsEditingName(false) // Immediately close the input field
    
    // Fallback if they leave it blank
    const newName = displayName.trim() === '' ? 'LIFTER' : displayName.trim()
    setDisplayName(newName)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: newName }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error updating name:', error)
    }
  }



  const handleLogSet = async () => {
    if (!exercise || !weight || !reps || !selectedGroup) return
    
    const currentSetNumber = sessionSets.filter(
      (s) => s.exercise.toLowerCase() === exercise.trim().toLowerCase()
    ).length + 1
    
    const newSet = { id: Date.now(), setNumber: currentSetNumber, exercise: exercise.trim(), weight, reps }
    setSessionSets(prev => [newSet, ...prev])
    setReps('') 
    setShowLogDropdown(false)
    
    const result = await logSetToDatabase({
      muscleGroup: selectedGroup,
      exercise: exercise,
      setNumber: currentSetNumber,
      weight: Number(weight),
      reps: Number(reps)
    })

    if (result.success) {
      loadAllExercises()
      const refreshedScopedList = await fetchUniqueExercises(selectedGroup)
      setLogExercises(refreshedScopedList)
    } else {
      console.error("Failed to save to cloud")
    }
  }

  const handleDeleteSet = async (idToRemove: number, exercise: string, setNumber: number) => {
    setSessionSets(prev => prev.filter(s => s.id !== idToRemove))
    await deleteSetFromDatabase(exercise, setNumber)
  }

  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [lastSessionInfo, setLastSessionInfo] = useState<{ date: string, weight: number, reps: number, sets: number } | null>(null)
  const [showHistoryAlert, setShowHistoryAlert] = useState(false)
  
  // --- AUTHENTICATION GATE ---
  if (!session) {
    return (
      <main className="min-h-screen bg-[#0D0D0F] text-[#F1F3F4] flex flex-col items-center justify-center p-6 selection:bg-[#FF6A2E] selection:text-[#0D0D0F]">
        <Image 
  src="/ramped_logo.png" 
  alt="RAMPED Logo" 
  width={300} 
  height={100} 
  priority 
  className="mb-10 w-[80%] max-w-[280px] h-auto object-contain drop-shadow-md mx-auto" 
/>
        
        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4 bg-neutral-900/30 p-8 rounded-2xl border border-[#64748B]/30 shadow-2xl">
          <h1 className="text-xl font-black tracking-widest text-[#FF6A2E] uppercase text-center mb-6">Enter Email To Access Your Account</h1>
          
          <div>
            <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-sm font-bold text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] transition-all mt-1"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-sm font-bold text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] transition-all mt-1"
              required
            />
          </div>

          {authError && <p className="text-red-500 text-xs font-bold text-center mt-2">{authError}</p>}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full h-14 bg-[#2D6D6A] hover:bg-[#2D6D6A]/90 active:scale-[0.98] text-[#0D0D0F] font-black text-lg tracking-widest rounded-xl uppercase transition-all shadow-[0_0_20px_rgba(45,109,106,0.3)] mt-6"
          >
            {authLoading ? 'Authenticating...' : 'Enter Ramped'}
          </button>
          
          <p className="text-[#64748B] text-[10px] uppercase font-bold text-center mt-4 tracking-wider">
            No account? Enter details and we will create one instantly.
          </p>
        </form>
      </main>
    )
  }

  

  // --- MAIN APP (ONLY VISIBLE IF LOGGED IN) ---
  return (
    <main className="min-h-screen bg-[#0D0D0F] text-[#F1F3F4] max-w-md mx-auto flex flex-col justify-between p-4 selection:bg-[#FF6A2E] selection:text-[#0D0D0F] relative">
      
      {/* Header with Logout */}
      <header className="flex items-center justify-between border-b border-[#64748B]/30 pb-4 mb-4 pt-2 px-2">
        <Image src="/ramped_logo.png" alt="RAMPED Logo" width={180} height={64} priority className="h-12 w-44 object-cover object-center" />
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="text-[#64748B] hover:text-[#FF6A2E] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          Logout <LogOut className="w-3 h-3" />
        </button>
      </header>

      {/* Cardio Quick Log Modal */}
      {showCardioModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0F] border border-[#64748B]/50 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-lg uppercase text-[#2D6D6A] flex items-center gap-2">
                <Heart className="w-5 h-5 fill-[#2D6D6A]" /> Log Cardio
              </h3>
              <button onClick={() => setShowCardioModal(false)} className="text-[#64748B] hover:text-[#F1F3F4] text-sm transition-colors">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#64748B] font-bold uppercase">Duration (Mins)</label>
                <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-lg p-3 text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] mt-1 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-[#64748B] font-bold uppercase">Distance (Miles)</label>
                <input type="number" step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-lg p-3 text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] mt-1 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-[#64748B] font-bold uppercase">Avg Heart Rate (BPM)</label>
                <input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-lg p-3 text-[#F1F3F4] focus:outline-none focus:border-[#2D6D6A] mt-1 transition-colors" />
              </div>
            </div>
            <button onClick={() => setShowCardioModal(false)} className="w-full bg-[#2D6D6A] hover:bg-[#2D6D6A]/80 text-[#F1F3F4] font-extrabold py-3 rounded-xl uppercase transition-colors">
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
                <h2 className="text-xs font-semibold tracking-wider text-[#64748B] uppercase text-center mb-4">Select Target Muscle Group</h2>
                <div className="grid grid-cols-2 gap-4">
                  {MUSCLE_GROUPS.map((group) => (
                    <button key={group.id} onClick={() => setSelectedGroup(group.id)} className="relative group overflow-hidden h-32 rounded-2xl bg-neutral-900/50 border border-[#64748B]/30 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center">
                      <div className="absolute inset-0 bg-linear-to-t from-[#FF6A2E]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 font-black text-xl tracking-widest text-[#F1F3F4] group-hover:text-white uppercase drop-shadow-md">{group.label}</span>
                    </button>
                  ))}
                  <button onClick={() => setShowCardioModal(true)} className="relative group overflow-hidden h-32 rounded-2xl bg-neutral-900/50 border border-[#64748B]/30 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center">
                    <div className="absolute inset-0 bg-linear-to-t from-[#2D6D6A]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 font-black text-xl tracking-widest text-[#F1F3F4] group-hover:text-white uppercase drop-shadow-md flex items-center gap-2">
                      CARDIO <Heart className="w-5 h-5 text-[#2D6D6A] group-hover:fill-[#2D6D6A]/20 transition-all" />
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <button onClick={handleCloseForm} className="text-xs font-semibold text-[#64748B] hover:text-[#F1F3F4] flex items-center gap-1 transition-colors">
                  ← Back to Muscle Groups
                </button>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between border-b border-[#64748B]/30 pb-4">
                  <h3 className="font-black text-2xl uppercase text-[#F1F3F4] tracking-widest drop-shadow-md">{selectedGroup} <span className="text-[#FF6A2E]">DAY</span></h3>
                  <button onClick={handleCloseForm} className="text-xs font-bold text-[#64748B] hover:text-[#F1F3F4] transition-colors uppercase px-3 py-1.5 bg-neutral-900/50 rounded-lg border border-[#64748B]/30">Cancel</button>
                </div>

                <div className="space-y-4">
                  <div className="relative z-30">
                    <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Exercise Name</label>
                    <input type="text" placeholder="e.g. Incline Dumbbell Press" value={exercise} onFocus={() => setShowLogDropdown(true)} onChange={(e) => { setExercise(e.target.value); setShowLogDropdown(true); }} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-lg font-bold text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] transition-all" />
                    {showLogDropdown && (
                      <div className="absolute w-full mt-2 bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {logExercises.filter(ex => exercise === '' || ex.includes(exercise.toLowerCase())).map(ex => (
                          <button key={ex} onClick={() => { setExercise(ex); setShowLogDropdown(false); }} className="w-full text-left p-4 text-[#F1F3F4] font-bold uppercase hover:bg-neutral-900/80 border-b border-[#64748B]/20 last:border-0 transition-colors">{ex}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {showHistoryAlert && lastSessionInfo && (
                    <div className="bg-[#2D6D6A]/10 border border-[#2D6D6A]/50 rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2 shadow-lg relative z-20">
                      <div className="space-y-1">
                        <p className="text-[10px] text-[#2D6D6A] font-black uppercase tracking-widest flex items-center gap-1">Last Session <span className="text-[#64748B]">•</span> {lastSessionInfo.date}</p>
                        <p className="text-[#F1F3F4] font-bold text-sm"><span className="text-[#FF6A2E]">{lastSessionInfo.sets}</span> Sets <span className="text-[#64748B] mx-2">|</span> Top: <span className="text-[#F1F3F4]">{lastSessionInfo.weight}</span> lbs × <span className="text-[#F1F3F4]">{lastSessionInfo.reps}</span></p>
                      </div>
                      <button onClick={() => setShowHistoryAlert(false)} className="px-4 py-2 bg-[#2D6D6A] hover:bg-[#2D6D6A]/80 active:scale-95 text-[#0D0D0F] font-black text-xs uppercase tracking-widest rounded-lg transition-all shadow-md">Okay</button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div>
                      <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Weight (Lbs)</label>
                      <input type="number" placeholder="0" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-2xl font-black text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] text-center transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Reps</label>
                      <input type="number" placeholder="0" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-2xl font-black text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] text-center transition-all" />
                    </div>
                  </div>
                  <button onClick={handleLogSet} className="w-full h-16 bg-[#FF6A2E] hover:bg-[#FF6A2E]/90 active:scale-[0.98] text-[#0D0D0F] font-black text-xl tracking-widest rounded-xl uppercase transition-all shadow-[0_0_20px_rgba(255,106,46,0.3)] mt-2 relative z-10">Log Set</button>
                </div>

                {sessionSets.length > 0 && (
                  <div className="space-y-2 relative z-0">
                      {sessionSets.map((set, index) => (
                        <div key={set.id} className="flex justify-between items-center bg-neutral-900/40 border border-[#64748B]/20 rounded-lg p-3 gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-[#FF6A2E] font-black text-sm mt-0.5 min-w-3">{set.setNumber || (sessionSets.length - index)}</span>
                            <span className="text-[#F1F3F4] font-bold leading-tight wrap-break-words pr-2">{set.exercise}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-[#64748B] font-bold text-sm whitespace-nowrap"><span className="text-[#F1F3F4]">{set.weight}</span> lbs × <span className="text-[#F1F3F4]">{set.reps}</span></div>
                            <button onClick={() => handleDeleteSet(set.id, set.exercise, set.setNumber)} className="text-[#64748B] hover:text-[#FF6A2E] transition-colors p-1 active:scale-95"><Trash2 className="w-4 h-4" /></button>
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

        {activeTab === 'calendar' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-8">
            <h2 className="text-xl font-black tracking-widest text-[#FF6A2E] uppercase border-b border-[#64748B]/30 pb-4">Training History</h2>
            {calendarHistory.length === 0 ? (
              <p className="text-[#64748B] text-center text-sm py-8">No workouts logged yet.</p>
            ) : (
              <div className="space-y-8">
                {Array.from(new Set(calendarHistory.map(set => set.local_date))).map(date => {
                  const daySets = calendarHistory.filter(s => s.local_date === date)
                  const dateHeader = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                  return (
                    <div key={date as string} className="space-y-3">
                      <h3 className="text-xs font-black text-[#2D6D6A] uppercase tracking-widest sticky top-0 bg-[#0D0D0F] py-2 z-10">{dateHeader}</h3>
                      <div className="bg-neutral-900/40 border border-[#64748B]/20 rounded-xl overflow-hidden">
                        {Array.from(new Set(daySets.map(s => s.exercise_name))).map(exercise => {
                          const exerciseSets = daySets.filter(s => s.exercise_name === exercise)
                          return (
                            <div key={exercise as string} className="border-b border-[#64748B]/10 last:border-0 p-4">
                              <h4 className="text-[#F1F3F4] font-bold uppercase mb-2 text-sm flex items-center justify-between">{exercise as string}<span className="text-[#64748B] text-[10px]">{exerciseSets.length} sets</span></h4>
                              <div className="space-y-1">
                                {exerciseSets.map((set, idx) => (
                                  <div key={set.id} className="flex justify-between text-sm">
                                    <span className="text-[#64748B] font-medium">Set {idx + 1}</span>
                                    <span className="text-[#F1F3F4] font-bold">{set.weight} <span className="text-[#64748B] font-normal">lbs</span> × {set.reps}</span>
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
            <h2 className="text-xl font-black tracking-widest text-[#FF6A2E] uppercase border-b border-[#64748B]/30 pb-4">Progression</h2>
            <div className="relative z-30">
              <label className="text-[10px] text-[#64748B] font-black uppercase tracking-widest pl-1">Target Exercise</label>
              <input type="text" placeholder="e.g. seated row" value={chartExercise} onFocus={() => setShowChartDropdown(true)} onChange={(e) => { setChartExercise(e.target.value); setShowChartDropdown(true); }} className="w-full bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl p-4 text-lg font-bold text-[#F1F3F4] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#FF6A2E] focus:ring-1 focus:ring-[#FF6A2E] transition-all" />
              {showChartDropdown && chartExercise.trim().length > 0 && (
                <div className="absolute w-full mt-2 bg-[#0D0D0F] border border-[#64748B]/50 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {allExercises.filter(ex => ex.includes(chartExercise.toLowerCase())).map(ex => (
                    <button key={ex} onClick={() => { setChartExercise(ex); setShowChartDropdown(false); }} className="w-full text-left p-4 text-[#F1F3F4] font-bold uppercase hover:bg-neutral-900/80 border-b border-[#64748B]/20 last:border-0 transition-colors">{ex}</button>
                  ))}
                </div>
              )}
            </div>

            {chartExercise.trim().length >= 3 && chartData.length === 0 ? (
              <p className="text-[#64748B] text-center text-sm py-8">No data found for this exercise.</p>
            ) : chartData.length > 0 ? (
              <div className="bg-neutral-900/40 border border-[#64748B]/20 rounded-xl p-4 pt-6 h-72 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(value) => `${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0D0D0F', borderColor: '#2D6D6A', borderRadius: '8px' }} itemStyle={{ color: '#FF6A2E', fontWeight: 'bold' }} labelStyle={{ color: '#64748B', fontWeight: 'bold', marginBottom: '4px' }} />
                    <Line type="monotone" dataKey="weight" name="Max Lbs" stroke="#FF6A2E" strokeWidth={3} dot={{ fill: '#0D0D0F', stroke: '#FF6A2E', strokeWidth: 2, r: 4 }} activeDot={{ fill: '#FF6A2E', stroke: '#0D0D0F', strokeWidth: 2, r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-8">
            {/* Header & Avatar */}
            <div className="flex items-center gap-4 mb-8 border-b border-[#64748B]/30 pb-6">
              
              <div className="relative w-20 h-20 rounded-full bg-neutral-900 border-2 border-[#FF6A2E] flex items-center justify-center shadow-lg overflow-hidden group cursor-pointer hover:border-[#2D6D6A] transition-colors">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-[#64748B] text-xs font-black uppercase group-hover:text-[#F1F3F4] transition-colors">
                    {uploadingAvatar ? '...' : 'Upload'}
                  </span>
                )}
                
                {/* Frictionless Hidden File Input */}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>

              <div className="flex-1">
                {isEditingName ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    className="bg-transparent border-b-2 border-[#FF6A2E] text-2xl font-black tracking-widest text-[#F1F3F4] uppercase focus:outline-none w-full max-w-[200px]"
                    autoFocus
                  />
                ) : (
                  <h2 
                    onClick={() => setIsEditingName(true)}
                    className="text-2xl font-black tracking-widest text-[#F1F3F4] uppercase cursor-pointer hover:text-[#FF6A2E] transition-colors"
                    title="Tap to edit name"
                  >
                    {displayName}
                  </h2>
                )}
                <p className="text-[#2D6D6A] text-xs font-bold uppercase tracking-widest overflow-hidden text-ellipsis w-full max-w-[200px]">
                  {session.user.email}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-black tracking-widest text-[#FF6A2E] uppercase">
              PR Trophy Case
            </h3>

            {Object.keys(personalRecords).length === 0 ? (
              <p className="text-[#64748B] text-center text-sm py-8">No records set yet. Time to lift.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(personalRecords).map(([muscleGroup, exercises]) => (
                  <div key={muscleGroup} className="bg-neutral-900/40 border border-[#64748B]/20 rounded-xl p-4 shadow-md">
                    <h4 className="text-xs font-black text-[#2D6D6A] uppercase tracking-widest mb-3">
                      {muscleGroup}
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(exercises).sort().map(([exercise, weight]) => (
                        <div key={exercise} className="flex justify-between items-center border-b border-[#64748B]/10 pb-2 last:border-0 last:pb-0">
                          <span className="text-[#F1F3F4] font-bold text-sm capitalize">{exercise}</span>
                          <span className="text-[#FF6A2E] font-black text-sm">{weight} <span className="text-[#64748B] text-xs font-bold">lbs</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Navigation */}
      <nav className="sticky bottom-0 grid grid-cols-4 gap-1 bg-[#0D0D0F] border-t border-[#64748B]/30 p-2 text-[10px] font-bold uppercase shadow-lg z-50">
        {(['log', 'calendar', 'charts', 'profile'] as const).map((tab) => (
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