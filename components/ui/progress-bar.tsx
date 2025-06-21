/**
 * Visual progress bar used in the dashboard.
 *
 * Props
 * - current: current numeric value
 * - total:   total numeric value (0 hides the bar)
 * - color:   tailwind gradient classes, e.g. "from-green-400 to-blue-500"
 */
export default function ProgressBar({
  current,
  total,
  color,
}: {
  current: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0
  const isOverBudget = current > total && total > 0

  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          isOverBudget ? "bg-gradient-to-r from-red-500 to-red-600" : `bg-gradient-to-r ${color}`
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
