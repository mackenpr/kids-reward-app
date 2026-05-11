import { useState } from 'react'
import {
  format, isToday, isFuture, addDays, subDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth,
  addMonths, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

interface DateNavigatorProps {
  selectedDate: Date
  onChange: (date: Date) => void
  completionDates?: string[] // 'yyyy-MM-dd' strings that have completions
  accentColor: string // tailwind color class e.g. 'game-camden'
}

export function DateNavigator({ selectedDate, onChange, completionDates = [], accentColor }: DateNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date())

  function prevDay() { onChange(subDays(selectedDate, 1)) }
  function nextDay() {
    const next = addDays(selectedDate, 1)
    if (!isFuture(next) || isToday(next)) onChange(next)
  }
  const canGoForward = !isToday(selectedDate)

  function selectDate(date: Date) {
    if (!isFuture(date)) {
      onChange(date)
      setShowCalendar(false)
    }
  }

  // Build calendar grid
  const monthStart = startOfMonth(viewMonth)
  const monthEnd   = endOfMonth(viewMonth)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const hasCompletion = (date: Date) =>
    completionDates.includes(format(date, 'yyyy-MM-dd'))

  return (
    <div className="relative">
      {/* Date bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevDay}
          className="p-2 rounded-xl bg-game-border hover:brightness-125 transition-all active:scale-95"
        >
          <ChevronLeft size={18} className="text-game-text" />
        </button>

        <button
          onClick={() => { setViewMonth(selectedDate); setShowCalendar(true) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl
                      bg-game-border hover:brightness-125 transition-all active:scale-95`}
        >
          <Calendar size={16} className={`text-${accentColor}`} />
          <span className={`font-bold text-sm text-${accentColor}`}>
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, d MMM yyyy')}
          </span>
        </button>

        {!isToday(selectedDate) && (
          <button
            onClick={() => onChange(new Date())}
            className="px-3 py-2 rounded-xl bg-game-gold/20 text-game-gold text-xs font-bold
                       hover:brightness-125 transition-all active:scale-95 whitespace-nowrap"
          >
            Today
          </button>
        )}

        <button
          onClick={nextDay}
          disabled={!canGoForward}
          className="p-2 rounded-xl bg-game-border hover:brightness-125 transition-all
                     active:scale-95 disabled:opacity-30"
        >
          <ChevronRight size={18} className="text-game-text" />
        </button>
      </div>

      {/* Calendar modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
             onClick={() => setShowCalendar(false)}>
          <div className="card p-4 w-full max-w-sm animate-pop" onClick={e => e.stopPropagation()}>
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setViewMonth(m => subMonths(m, 1))}
                className="p-2 rounded-xl hover:brightness-125 bg-game-border transition-all">
                <ChevronLeft size={16} className="text-game-text" />
              </button>
              <span className={`font-game text-xl text-${accentColor}`}>
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setViewMonth(m => addMonths(m, 1))}
                  disabled={isSameMonth(viewMonth, new Date())}
                  className="p-2 rounded-xl hover:brightness-125 bg-game-border transition-all disabled:opacity-30">
                  <ChevronRight size={16} className="text-game-text" />
                </button>
                <button onClick={() => setShowCalendar(false)}
                  className="p-2 rounded-xl hover:brightness-125 bg-game-border transition-all">
                  <X size={16} className="text-game-muted" />
                </button>
              </div>
            </div>

            {/* Day of week headers */}
            <div className="grid grid-cols-7 mb-1">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="text-center text-game-muted text-xs font-bold py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day, i) => {
                const isSelected   = isSameDay(day, selectedDate)
                const isCurrentDay = isToday(day)
                const isDisabled   = isFuture(day) && !isToday(day)
                const inMonth      = isSameMonth(day, viewMonth)
                const hasDot       = hasCompletion(day)

                return (
                  <button
                    key={i}
                    onClick={() => selectDate(day)}
                    disabled={isDisabled}
                    className={`
                      relative flex flex-col items-center justify-center h-9 rounded-xl text-sm font-bold
                      transition-all active:scale-95
                      ${isSelected
                        ? `bg-${accentColor} text-white shadow-md`
                        : isCurrentDay
                        ? `border border-${accentColor} text-${accentColor}`
                        : inMonth
                        ? 'text-game-text hover:bg-game-border'
                        : 'text-game-muted/40'
                      }
                      ${isDisabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {format(day, 'd')}
                    {hasDot && !isSelected && (
                      <span className={`absolute bottom-1 w-1 h-1 rounded-full bg-${accentColor}`} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Jump to today */}
            {!isSameMonth(viewMonth, new Date()) && (
              <button
                onClick={() => { setViewMonth(new Date()); onChange(new Date()); setShowCalendar(false) }}
                className="mt-3 w-full text-center text-game-gold text-sm font-bold hover:brightness-125"
              >
                Jump to Today
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
