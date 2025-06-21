"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2,
  Plus,
  Wallet,
  TrendingUp,
  Calendar,
  Receipt,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  Trash2,
  X,
  Sparkles,
  Camera,
} from "lucide-react"
import { getDashboardData, addQuickExpense, deleteExpense, type DashboardData } from "@/lib/dashboard-actions"
import AIPhotoCapture from "@/components/ai-photo-capture"
import Link from "next/link"
import ProgressBar from "@/components/ui/progress-bar"
import QuickExpenseButton from "@/components/ui/quick-expense-button"
import { isGeminiConfigured } from "@/lib/ai-photo-actions"

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

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseDescription, setExpenseDescription] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<{
    amount: number
    category: string
    description: string
    confidence: number
    reasoning: string
  } | null>(null)

  const [expenseState, expenseAction] = useActionState(addQuickExpense, null)

  const weekRange = getCurrentWeekRange()
  const monthRange = getCurrentMonthRange()

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (expenseState?.success) {
      setExpenseAmount("")
      setExpenseDescription("")
      setSelectedCategory("")
      setAiAnalysis(null)
      setDialogOpen(false)
      loadDashboardData()
    }
  }, [expenseState])

  // Clear delete message after 5 seconds
  useEffect(() => {
    if (deleteMessage) {
      const timer = setTimeout(() => {
        setDeleteMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [deleteMessage])

  const loadDashboardData = async () => {
    setLoading(true)
    const result = await getDashboardData()
    if (result.data) {
      setDashboardData(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    const result = await deleteExpense(expenseId)
    if (result.success) {
      setDeleteMessage({ type: "success", text: result.success })
      loadDashboardData() // Refresh the dashboard data
    } else if (result.error) {
      setDeleteMessage({ type: "error", text: result.error })
    }
  }

  const handleAIAnalysis = (analysisData: {
    amount: number
    category: string
    description: string
    confidence: number
    reasoning: string
  }) => {
    // Set the AI analysis data
    setAiAnalysis(analysisData)

    // Pre-fill the form fields
    setExpenseAmount(analysisData.amount.toString())
    setExpenseDescription(analysisData.description)

    // Try to match the AI suggested category with available categories
    const matchingCategory = dashboardData?.categories.find(
      (cat) =>
        cat.name.toLowerCase().includes(analysisData.category.toLowerCase()) ||
        analysisData.category.toLowerCase().includes(cat.name.toLowerCase()),
    )

    if (matchingCategory) {
      setSelectedCategory(matchingCategory.id)
    }

    // Automatically open the manual entry dialog to show the pre-filled form
    setDialogOpen(true)
  }

  const clearAIAnalysis = () => {
    setAiAnalysis(null)
    setExpenseAmount("")
    setExpenseDescription("")
    setSelectedCategory("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-xl font-bold">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center p-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error || "Failed to load dashboard"}</p>
          <Button onClick={loadDashboardData} className="bg-red-500 hover:bg-red-600 text-white">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  const hasWeeklyBudget = dashboardData.budgets.weekly
  const hasMonthlyBudget = dashboardData.budgets.monthly
  const hasBudgets = hasWeeklyBudget || hasMonthlyBudget

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Delete Message */}
        {deleteMessage && (
          <Card
            className={`border-2 ${
              deleteMessage.type === "success" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
            } shadow-lg`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className={`font-medium ${deleteMessage.type === "success" ? "text-green-700" : "text-red-700"}`}>
                  {deleteMessage.text}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setDeleteMessage(null)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Target className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">AI Money Budget Dashboard</CardTitle>
            <p className="text-white/90 text-lg">Track your spending and stay on budget! 📊</p>
          </CardHeader>
        </Card>

        {!hasBudgets ? (
          /* No Budget State */
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardContent className="text-center py-12">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Set Up Your Budget First!</h3>
              <p className="text-gray-600 mb-6">
                Create a budget to start tracking your spending and see your progress.
              </p>
              <Link href="/budget">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 text-lg font-bold rounded-xl">
                  Create Budget 💰
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Budget Overview Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {hasWeeklyBudget && (
                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-400 to-blue-500 text-white pb-4">
                    <CardTitle className="flex items-center text-xl">
                      <Calendar className="mr-2 h-6 w-6" />
                      Weekly Budget
                      <div className="ml-auto text-sm font-normal">
                        {weekRange.start} - {weekRange.end}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Budget:</span>
                      <span className="text-2xl font-bold text-gray-800">
                        ${dashboardData.budgets.weekly?.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Spent:</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ${dashboardData.totalSpend.weekly.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Remaining:</span>
                      <span
                        className={`text-2xl font-bold ${
                          dashboardData.remaining.weekly >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        ${Math.abs(dashboardData.remaining.weekly).toFixed(2)}
                        {dashboardData.remaining.weekly < 0 && " over"}
                      </span>
                    </div>
                    <ProgressBar
                      current={dashboardData.totalSpend.weekly}
                      total={dashboardData.budgets.weekly?.amount || 0}
                      color="from-green-400 to-blue-500"
                    />
                    <div className="flex items-center justify-center pt-2">
                      {dashboardData.remaining.weekly >= 0 ? (
                        <div className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="mr-1 h-4 w-4" />
                          On track! 🎯
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 font-medium">
                          <AlertTriangle className="mr-1 h-4 w-4" />
                          Over budget! 🚨
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasMonthlyBudget && (
                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-400 to-pink-500 text-white pb-4">
                    <CardTitle className="flex items-center text-xl">
                      <Calendar className="mr-2 h-6 w-6" />
                      Monthly Budget
                      <div className="ml-auto text-sm font-normal">
                        {monthRange.start} - {monthRange.end}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Budget:</span>
                      <span className="text-2xl font-bold text-gray-800">
                        ${dashboardData.budgets.monthly?.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Spent:</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ${dashboardData.totalSpend.monthly.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Remaining:</span>
                      <span
                        className={`text-2xl font-bold ${
                          dashboardData.remaining.monthly >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        ${Math.abs(dashboardData.remaining.monthly).toFixed(2)}
                        {dashboardData.remaining.monthly < 0 && " over"}
                      </span>
                    </div>
                    <ProgressBar
                      current={dashboardData.totalSpend.monthly}
                      total={dashboardData.budgets.monthly?.amount || 0}
                      color="from-purple-400 to-pink-500"
                    />
                    <div className="flex items-center justify-center pt-2">
                      {dashboardData.remaining.monthly >= 0 ? (
                        <div className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="mr-1 h-4 w-4" />
                          On track! 🎯
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 font-medium">
                          <AlertTriangle className="mr-1 h-4 w-4" />
                          Over budget! 🚨
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Add Expense */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                    <Plus className="mr-2 h-5 w-5 text-green-500" />
                    Quick Add Expense
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Photo Button */}
                  <AIPhotoCapture
                    onAnalysisComplete={handleAIAnalysis}
                    trigger={
                      isGeminiConfigured ? (
                        <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 text-lg font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105">
                          <Camera className="mr-2 h-5 w-5" />
                          <Sparkles className="mr-1 h-4 w-4" />
                          Gemini Photo Analysis
                        </Button>
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          className="w-full border-2 border-dashed border-gray-300 cursor-not-allowed"
                          title="AI Photo Analysis unavailable – add GOOGLE_GENERATIVE_AI_API_KEY"
                        >
                          <Camera className="mr-2 h-5 w-5" />
                          AI Photo Analysis (unavailable)
                        </Button>
                      )
                    }
                  />

                  {/* Manual Entry Button */}
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-2 border-green-300 text-green-700 hover:bg-green-50 py-4 text-lg font-bold rounded-xl"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Manual Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <Plus className="mr-2 h-5 w-5 text-green-500" />
                          Add Quick Expense
                        </DialogTitle>
                        <DialogDescription>
                          Add a new expense to track your spending for today (
                          {new Date().toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          ).
                        </DialogDescription>
                      </DialogHeader>

                      {/* AI Analysis Results */}
                      {aiAnalysis && (
                        <Card className="border-2 border-purple-200 bg-purple-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Sparkles className="h-4 w-4 text-purple-600 mr-1" />
                                <span className="text-sm font-bold text-purple-700">Gemini Analysis</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-purple-600">
                                  {Math.round(aiAnalysis.confidence * 100)}% confident
                                </span>
                                <Button
                                  onClick={clearAIAnalysis}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-purple-600 hover:text-purple-800"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-purple-600 mb-2">{aiAnalysis.reasoning}</p>
                            <div className="text-xs text-purple-700">
                              <strong>Suggested:</strong> ${aiAnalysis.amount} • {aiAnalysis.category} •{" "}
                              {aiAnalysis.description}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <form action={expenseAction} className="space-y-4">
                        <input type="hidden" name="categoryId" value={selectedCategory} />
                        <input type="hidden" name="amount" value={expenseAmount} />
                        <input type="hidden" name="description" value={expenseDescription} />

                        {expenseState?.error && (
                          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                            {expenseState.error}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Amount</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="border-2 border-gray-200 focus:border-green-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Category</label>
                          <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                            <SelectTrigger className="border-2 border-gray-200 focus:border-green-400">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {dashboardData.categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center">
                                    <span className="mr-2">{category.icon}</span>
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
                          <Input
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            placeholder="What did you spend on?"
                            className="border-2 border-gray-200 focus:border-green-400"
                          />
                        </div>

                        <QuickExpenseButton />
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Recent Expenses */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                    <Receipt className="mr-2 h-5 w-5 text-purple-500" />
                    Recent Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.recentExpenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No expenses yet. Add your first one! 💸</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {dashboardData.recentExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center space-x-3">
                            {expense.category && (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: expense.category.color }}
                              >
                                {expense.category.icon}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-800">
                                {expense.description || expense.category?.name || "Expense"}
                              </p>
                              <p className="text-xs text-gray-500">{expense.expense_date}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-red-600">${expense.amount.toFixed(2)}</span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this expense? This action cannot be undone.
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center space-x-2">
                                        {expense.category && (
                                          <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: expense.category.color }}
                                          >
                                            {expense.category.icon}
                                          </div>
                                        )}
                                        <span className="font-medium">
                                          {expense.description || expense.category?.name || "Expense"}
                                        </span>
                                        <span className="font-bold text-red-600">${expense.amount.toFixed(2)}</span>
                                      </div>
                                      <p className="text-sm text-gray-500 mt-1">{expense.expense_date}</p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Quick Links */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/budget">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-all"
                >
                  <Wallet className="h-6 w-6 text-purple-500 mb-1" />
                  <span className="text-sm font-medium">Budget</span>
                </Button>
              </Link>
              <Link href="/categories">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-all"
                >
                  <Receipt className="h-6 w-6 text-orange-500 mb-1" />
                  <span className="text-sm font-medium">Categories</span>
                </Button>
              </Link>
              <Link href="/ai-suggestions">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-400 transition-all"
                >
                  <Brain className="h-6 w-6 text-cyan-500 mb-1" />
                  <span className="text-sm font-medium">AI Tips</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all"
                onClick={loadDashboardData}
              >
                <TrendingUp className="h-6 w-6 text-blue-500 mb-1" />
                <span className="text-sm font-medium">Refresh</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
