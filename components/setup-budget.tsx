"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Wallet, Calendar, DollarSign, Sparkles } from "lucide-react"
import { saveBudget } from "@/lib/budget-actions"

// Add these utility functions after the imports
function getCurrentWeekRange() {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  return {
    start: startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    end: endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }
}

function getCurrentMonthRange() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    start: startOfMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    end: endOfMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 text-lg font-bold rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Saving your budget...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-5 w-5" />
          Save My Budget!
        </>
      )}
    </Button>
  )
}

export default function SetupBudget() {
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("monthly")
  const [amount, setAmount] = useState("")
  const [state, formAction] = useActionState(saveBudget, null)

  const weekRange = getCurrentWeekRange()
  const monthRange = getCurrentMonthRange()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full">
              <Wallet className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Setup Your Budget</CardTitle>
          <p className="text-white/90 text-lg mt-2">Let's make your money goals fun! 🎯</p>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {state?.error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-100 border-2 border-green-300 text-green-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.success}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <input type="hidden" name="timeframe" value={timeframe} />
            <input type="hidden" name="amount" value={amount} />

            {/* Timeframe Selection */}
            <div className="space-y-3">
              <label className="block text-lg font-bold text-gray-700 flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-purple-500" />
                Choose Your Timeframe
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTimeframe("weekly")}
                  className={`p-4 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    timeframe === "weekly"
                      ? "bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  📅 Weekly
                  <div className="text-sm font-normal mt-1">
                    {weekRange.start} - {weekRange.end}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("monthly")}
                  className={`p-4 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    timeframe === "monthly"
                      ? "bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🗓️ Monthly
                  <div className="text-sm font-normal mt-1">
                    {monthRange.start} - {monthRange.end}
                  </div>
                </button>
              </div>
            </div>

            {/* Budget Amount */}
            <div className="space-y-3">
              <label className="block text-lg font-bold text-gray-700 flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-500" />
                Your {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Budget
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xl font-bold">$</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="pl-8 pr-4 py-4 text-xl font-bold border-2 border-gray-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-gray-50"
                />
              </div>
              {amount && (
                <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                  <p className="text-lg font-bold text-gray-700">
                    That's <span className="text-purple-600">${amount}</span> for{" "}
                    {timeframe === "weekly"
                      ? `this week (${weekRange.start} - ${weekRange.end})`
                      : `this month (${monthRange.start} - ${monthRange.end})`}
                    ! 💪
                  </p>
                </div>
              )}
            </div>

            <SubmitButton />
          </form>

          <div className="text-center text-gray-500 text-sm">
            💡 Tip: Start with a realistic amount you can stick to!
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
