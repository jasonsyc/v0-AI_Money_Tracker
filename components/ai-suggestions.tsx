"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Brain, Lightbulb, TrendingUp, RefreshCw, Sparkles, Target } from "lucide-react"
import { getAISuggestions, type AISuggestion, type SpendingAnalysis } from "@/lib/ai-suggestions-actions"
import Link from "next/link"

function SuggestionCard({ suggestion }: { suggestion: AISuggestion }) {
  const getTypeIcon = () => {
    switch (suggestion.type) {
      case "extreme":
        return "🚨"
      case "celebration":
        return "🎉"
      case "fun":
        return "😊"
      default:
        return "💡"
    }
  }

  const getTypeColor = () => {
    switch (suggestion.type) {
      case "extreme":
        return "border-red-300 bg-red-50"
      case "celebration":
        return "border-green-300 bg-green-50"
      case "fun":
        return "border-blue-300 bg-blue-50"
      default:
        return "border-purple-300 bg-purple-50"
    }
  }

  return (
    <Card
      className={`border-2 ${getTypeColor()} hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-r ${suggestion.color} flex items-center justify-center text-white text-xl font-bold shadow-lg`}
          >
            {suggestion.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-bold text-lg text-gray-800">{suggestion.title}</h3>
              <span className="text-lg">{getTypeIcon()}</span>
            </div>
            <p className="text-gray-600 leading-relaxed">{suggestion.description}</p>
            {suggestion.actionable && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Target className="w-3 h-3 mr-1" />
                  Actionable Tip
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AnalysisCard({ analysis }: { analysis: SpendingAnalysis }) {
  const getStatusEmoji = () => {
    switch (analysis.budgetStatus) {
      case "over":
        return "🚨"
      case "under":
        return "🌟"
      case "on-track":
        return "⚖️"
      default:
        return "🎯"
    }
  }

  const getStatusMessage = () => {
    switch (analysis.budgetStatus) {
      case "over":
        return `Over budget by $${analysis.overageAmount?.toFixed(2)}`
      case "under":
        return `Under budget by $${analysis.underAmount?.toFixed(2)}`
      case "on-track":
        return "Right on track!"
      default:
        return "No budget set"
    }
  }

  const getStatusColor = () => {
    switch (analysis.budgetStatus) {
      case "over":
        return "from-red-400 to-orange-500"
      case "under":
        return "from-green-400 to-blue-500"
      case "on-track":
        return "from-blue-400 to-purple-500"
      default:
        return "from-gray-400 to-gray-500"
    }
  }

  if (analysis.budgetStatus === "no-budget") {
    return null
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader className={`bg-gradient-to-r ${getStatusColor()} text-white pb-4`}>
        <CardTitle className="flex items-center text-xl">
          <TrendingUp className="mr-2 h-6 w-6" />
          Your Spending Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl mb-2">{getStatusEmoji()}</div>
            <p className="font-bold text-gray-800">{getStatusMessage()}</p>
            <p className="text-sm text-gray-600 capitalize">{analysis.timeframe} Budget</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">${analysis.totalSpent.toFixed(2)}</div>
            <p className="text-sm text-gray-600">Total Spent</p>
            <p className="text-xs text-gray-500">${analysis.averageDailySpend.toFixed(2)}/day average</p>
          </div>
          {analysis.topCategory && (
            <div className="text-center">
              <div className="text-2xl mb-1">{analysis.topCategory.icon}</div>
              <p className="font-bold text-gray-800">{analysis.topCategory.name}</p>
              <p className="text-sm text-gray-600">${analysis.topCategory.amount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{analysis.topCategory.percentage.toFixed(0)}% of spending</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    setLoading(true)
    const result = await getAISuggestions()
    if (result.suggestions) {
      setSuggestions(result.suggestions)
      setAnalysis(result.analysis)
      setError(null)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Brain className="h-16 w-16 text-white mx-auto mb-4" />
            <Sparkles className="h-6 w-6 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-xl font-bold">AI is analyzing your spending...</p>
          <p className="text-white/80">Generating personalized suggestions</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center p-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl p-8 text-center max-w-md">
          <Brain className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Brain Freeze! 🧠❄️</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadSuggestions} className="bg-red-500 hover:bg-red-600 text-white">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full relative">
                <Brain className="h-12 w-12 text-white" />
                <Sparkles className="h-6 w-6 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">AI Spending Suggestions</CardTitle>
            <p className="text-white/90 text-lg">Personalized tips to boost your budget game! 🚀</p>
          </CardHeader>
        </Card>

        {/* Analysis Card */}
        {analysis && <AnalysisCard analysis={analysis} />}

        {/* No Budget State */}
        {analysis?.budgetStatus === "no-budget" && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardContent className="text-center py-12">
              <Target className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Ready to Get Started? 🎯</h3>
              <p className="text-gray-600 mb-6">Set up your first budget to unlock personalized AI suggestions!</p>
              <Link href="/budget">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg font-bold rounded-xl">
                  Create Your Budget
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Suggestions Grid */}
        {suggestions.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Lightbulb className="mr-2 h-6 w-6" />
                Your Personalized Tips
              </h2>
              <Button
                onClick={loadSuggestions}
                variant="outline"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Tips
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </>
        )}

        {/* Quick Actions */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Target className="mr-2 h-5 w-5 text-purple-500" />
              Take Action Now
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all"
                >
                  <TrendingUp className="h-6 w-6 text-blue-500 mb-1" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Button>
              </Link>
              <Link href="/budget">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-all"
                >
                  <Target className="h-6 w-6 text-purple-500 mb-1" />
                  <span className="text-sm font-medium">Budget</span>
                </Button>
              </Link>
              <Link href="/categories">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-green-200 hover:bg-green-50 hover:border-green-400 transition-all"
                >
                  <Lightbulb className="h-6 w-6 text-green-500 mb-1" />
                  <span className="text-sm font-medium">Categories</span>
                </Button>
              </Link>
              <Button
                onClick={loadSuggestions}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-all"
              >
                <RefreshCw className="h-6 w-6 text-orange-500 mb-1" />
                <span className="text-sm font-medium">Refresh</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
