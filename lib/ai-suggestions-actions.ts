"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export interface SpendingAnalysis {
  budgetStatus: "over" | "under" | "on-track" | "no-budget"
  overageAmount?: number
  underAmount?: number
  topCategory?: {
    name: string
    icon: string
    amount: number
    percentage: number
  }
  totalSpent: number
  daysInPeriod: number
  averageDailySpend: number
  timeframe: "weekly" | "monthly" | "both"
}

export interface AISuggestion {
  id: string
  type: "extreme" | "moderate" | "fun" | "celebration"
  title: string
  description: string
  icon: string
  color: string
  actionable: boolean
}

export async function getAISuggestions(): Promise<{
  suggestions: AISuggestion[]
  analysis: SpendingAnalysis | null
  error: string | null
}> {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { suggestions: [], analysis: null, error: "You must be logged in to view suggestions" }
    }

    // Get budgets
    const { data: budgets } = await supabase.from("budgets").select("amount, timeframe").eq("user_id", user.id)

    if (!budgets || budgets.length === 0) {
      return {
        suggestions: generateNoBudgetSuggestions(),
        analysis: { budgetStatus: "no-budget" } as SpendingAnalysis,
        error: null,
      }
    }

    // Calculate date ranges
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get expenses with categories
    const { data: weeklyExpenses } = await supabase
      .from("expenses")
      .select(`
        amount,
        expense_categories (name, icon)
      `)
      .eq("user_id", user.id)
      .gte("expense_date", startOfWeek.toISOString().split("T")[0])

    const { data: monthlyExpenses } = await supabase
      .from("expenses")
      .select(`
        amount,
        expense_categories (name, icon)
      `)
      .eq("user_id", user.id)
      .gte("expense_date", startOfMonth.toISOString().split("T")[0])

    // Analyze spending
    const analysis = analyzeSpending(budgets, weeklyExpenses || [], monthlyExpenses || [])
    const suggestions = generateSuggestions(analysis)

    return { suggestions, analysis, error: null }
  } catch (error) {
    console.error("AI suggestions error:", error)
    return { suggestions: [], analysis: null, error: "Failed to generate suggestions" }
  }
}

function analyzeSpending(budgets: any[], weeklyExpenses: any[], monthlyExpenses: any[]): SpendingAnalysis {
  const weeklyBudget = budgets.find((b) => b.timeframe === "weekly")
  const monthlyBudget = budgets.find((b) => b.timeframe === "monthly")

  const weeklySpent = weeklyExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const monthlySpent = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  // Determine primary timeframe and analysis
  let analysis: SpendingAnalysis

  if (monthlyBudget) {
    const remaining = monthlyBudget.amount - monthlySpent
    const percentage = (monthlySpent / monthlyBudget.amount) * 100

    analysis = {
      budgetStatus: percentage > 100 ? "over" : percentage < 70 ? "under" : "on-track",
      overageAmount: remaining < 0 ? Math.abs(remaining) : undefined,
      underAmount: remaining > 0 && percentage < 70 ? remaining : undefined,
      totalSpent: monthlySpent,
      daysInPeriod: new Date().getDate(),
      averageDailySpend: monthlySpent / new Date().getDate(),
      timeframe: "monthly",
    }
  } else if (weeklyBudget) {
    const remaining = weeklyBudget.amount - weeklySpent
    const percentage = (weeklySpent / weeklyBudget.amount) * 100

    analysis = {
      budgetStatus: percentage > 100 ? "over" : percentage < 70 ? "under" : "on-track",
      overageAmount: remaining < 0 ? Math.abs(remaining) : undefined,
      underAmount: remaining > 0 && percentage < 70 ? remaining : undefined,
      totalSpent: weeklySpent,
      daysInPeriod: new Date().getDay() + 1,
      averageDailySpend: weeklySpent / (new Date().getDay() + 1),
      timeframe: "weekly",
    }
  } else {
    analysis = {
      budgetStatus: "no-budget",
      totalSpent: 0,
      daysInPeriod: 0,
      averageDailySpend: 0,
      timeframe: "monthly",
    }
  }

  // Find top spending category
  const expenses = analysis.timeframe === "monthly" ? monthlyExpenses : weeklyExpenses
  const categoryTotals = expenses.reduce((acc: any, exp: any) => {
    if (exp.expense_categories) {
      const categoryName = exp.expense_categories.name
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          icon: exp.expense_categories.icon,
          amount: 0,
        }
      }
      acc[categoryName].amount += Number(exp.amount)
    }
    return acc
  }, {})

  const topCategory = Object.values(categoryTotals).reduce(
    (max: any, cat: any) => (cat.amount > (max?.amount || 0) ? cat : max),
    null,
  )

  if (topCategory) {
    analysis.topCategory = {
      ...topCategory,
      percentage: (topCategory.amount / analysis.totalSpent) * 100,
    }
  }

  return analysis
}

function generateNoBudgetSuggestions(): AISuggestion[] {
  return [
    {
      id: "1",
      type: "moderate",
      title: "Start with a Budget! 🎯",
      description: "Create your first budget to start tracking your spending and get personalized suggestions.",
      icon: "🎯",
      color: "from-blue-400 to-purple-500",
      actionable: true,
    },
    {
      id: "2",
      type: "fun",
      title: "Track Everything for a Week 📝",
      description: "Write down every expense for 7 days to understand your spending patterns before setting a budget.",
      icon: "📝",
      color: "from-green-400 to-blue-500",
      actionable: true,
    },
    {
      id: "3",
      type: "fun",
      title: "Start Small, Dream Big! ✨",
      description: "Begin with a realistic weekly budget. You can always adjust it as you learn your spending habits.",
      icon: "✨",
      color: "from-purple-400 to-pink-500",
      actionable: false,
    },
  ]
}

function generateSuggestions(analysis: SpendingAnalysis): AISuggestion[] {
  const suggestions: AISuggestion[] = []

  if (analysis.budgetStatus === "over") {
    // Extreme suggestions for over-budget
    suggestions.push(
      {
        id: "over-1",
        type: "extreme",
        title: "Emergency Mode Activated! 🚨",
        description: `You're $${analysis.overageAmount?.toFixed(2)} over budget! Time for some serious spending cuts. Consider the 24-hour rule before any non-essential purchases.`,
        icon: "🚨",
        color: "from-red-500 to-orange-500",
        actionable: true,
      },
      {
        id: "over-2",
        type: "extreme",
        title: "Cook at Home Challenge! 👨‍🍳",
        description:
          analysis.topCategory?.name === "Meals"
            ? `${analysis.topCategory.icon} Meals are ${analysis.topCategory.percentage.toFixed(0)}% of your spending! Try cooking at home for the rest of the ${analysis.timeframe === "weekly" ? "week" : "month"}.`
            : "Try meal prepping and cooking at home to save money on food expenses.",
        icon: "👨‍🍳",
        color: "from-red-400 to-pink-500",
        actionable: true,
      },
      {
        id: "over-3",
        type: "extreme",
        title: "No-Spend Challenge! 💪",
        description: `Challenge yourself to a no-spend day (or three!). Only buy absolute necessities. Your wallet will thank you!`,
        icon: "💪",
        color: "from-orange-500 to-red-500",
        actionable: true,
      },
    )

    if (analysis.topCategory) {
      suggestions.push({
        id: "over-4",
        type: "extreme",
        title: `${analysis.topCategory.icon} ${analysis.topCategory.name} Alert!`,
        description: `You've spent $${analysis.topCategory.amount.toFixed(2)} on ${analysis.topCategory.name} (${analysis.topCategory.percentage.toFixed(0)}% of your budget). Time to find alternatives!`,
        icon: analysis.topCategory.icon,
        color: "from-red-500 to-purple-500",
        actionable: true,
      })
    }
  } else if (analysis.budgetStatus === "under") {
    // Fun suggestions for under-budget
    suggestions.push(
      {
        id: "under-1",
        type: "celebration",
        title: "Budget Superstar! 🌟",
        description: `Amazing! You're $${analysis.underAmount?.toFixed(2)} under budget. You're crushing your financial goals!`,
        icon: "🌟",
        color: "from-green-400 to-blue-500",
        actionable: false,
      },
      {
        id: "under-2",
        type: "fun",
        title: "Treat Yourself (A Little)! 🍦",
        description:
          "You've been so good with your budget! Maybe it's time for a small, guilt-free treat. You've earned it!",
        icon: "🍦",
        color: "from-pink-400 to-purple-500",
        actionable: true,
      },
      {
        id: "under-3",
        type: "fun",
        title: "Emergency Fund Boost! 💰",
        description: `Consider moving some of that extra $${analysis.underAmount?.toFixed(2)} to your emergency fund. Future you will be grateful!`,
        icon: "💰",
        color: "from-green-500 to-teal-500",
        actionable: true,
      },
      {
        id: "under-4",
        type: "fun",
        title: "Investment Opportunity! 📈",
        description:
          "With your excellent budgeting skills, maybe it's time to explore some low-risk investments for that extra money?",
        icon: "📈",
        color: "from-blue-400 to-green-500",
        actionable: true,
      },
    )
  } else {
    // Moderate suggestions for on-track
    suggestions.push(
      {
        id: "track-1",
        type: "moderate",
        title: "Steady as She Goes! ⚖️",
        description: "You're right on track with your budget! Keep up the great work and maintain this balance.",
        icon: "⚖️",
        color: "from-blue-400 to-purple-500",
        actionable: false,
      },
      {
        id: "track-2",
        type: "moderate",
        title: "Weekly Check-ins! 📅",
        description: `Your daily average is $${analysis.averageDailySpend.toFixed(2)}. Try checking your spending every few days to stay on track.`,
        icon: "📅",
        color: "from-purple-400 to-pink-500",
        actionable: true,
      },
      {
        id: "track-3",
        type: "fun",
        title: "Category Champion! 🏆",
        description: analysis.topCategory
          ? `${analysis.topCategory.icon} ${analysis.topCategory.name} is your biggest expense at ${analysis.topCategory.percentage.toFixed(0)}%. Keep an eye on it!`
          : "Great job spreading your expenses across different categories!",
        icon: "🏆",
        color: "from-yellow-400 to-orange-500",
        actionable: false,
      },
    )
  }

  // Add some general tips
  suggestions.push(
    {
      id: "general-1",
      type: "fun",
      title: "Receipt Detective! 🕵️",
      description:
        "Take photos of your receipts and review them weekly. You might spot some surprising spending patterns!",
      icon: "🕵️",
      color: "from-indigo-400 to-purple-500",
      actionable: true,
    },
    {
      id: "general-2",
      type: "fun",
      title: "The 50/30/20 Rule! 📊",
      description: "Try allocating 50% for needs, 30% for wants, and 20% for savings. It's a classic for a reason!",
      icon: "📊",
      color: "from-teal-400 to-blue-500",
      actionable: true,
    },
  )

  // Add category-specific suggestions based on top spending category
  if (analysis.topCategory && analysis.topCategory.percentage > 40) {
    const categoryName = analysis.topCategory.name.toLowerCase()
    const categoryAmount = analysis.topCategory.amount
    const categoryPercentage = analysis.topCategory.percentage

    // Food & Dining related categories
    if (
      categoryName.includes("food") ||
      categoryName.includes("dining") ||
      categoryName.includes("meal") ||
      categoryName.includes("restaurant") ||
      categoryName.includes("coffee") ||
      categoryName.includes("snack")
    ) {
      suggestions.push({
        id: "food-health",
        type: "moderate",
        title: "🥗 Healthy Eating Challenge!",
        description: `You're spending ${categoryPercentage.toFixed(0)}% on food ($${categoryAmount.toFixed(2)}). Try meal prepping with fresh vegetables, lean proteins, and whole grains. Your wallet AND your health will thank you!`,
        icon: "🥗",
        color: "from-green-500 to-emerald-500",
        actionable: true,
      })

      suggestions.push({
        id: "food-cook",
        type: "extreme",
        title: "👨‍🍳 Master Chef Mode!",
        description: `Time to unleash your inner chef! With $${categoryAmount.toFixed(2)} spent on food, cooking at home could save you 60-70%. Start with simple recipes and gradually build your skills.`,
        icon: "👨‍🍳",
        color: "from-orange-500 to-red-500",
        actionable: true,
      })
    }

    // Transportation related categories
    if (
      categoryName.includes("transport") ||
      categoryName.includes("taxi") ||
      categoryName.includes("grab") ||
      categoryName.includes("uber") ||
      categoryName.includes("ride") ||
      categoryName.includes("car")
    ) {
      suggestions.push({
        id: "transport-public",
        type: "moderate",
        title: "🚌 Public Transport Hero!",
        description: `${categoryPercentage.toFixed(0)}% of your budget ($${categoryAmount.toFixed(2)}) goes to transportation. Consider public transport, walking, or cycling. It's eco-friendly and budget-friendly!`,
        icon: "🚌",
        color: "from-blue-500 to-green-500",
        actionable: true,
      })

      suggestions.push({
        id: "transport-plan",
        type: "fun",
        title: "🗺️ Route Optimizer!",
        description: `Plan your trips better! Combine errands into one journey, use transport apps to find cheaper routes, or try carpooling with friends. Every saved trip adds up!`,
        icon: "🗺️",
        color: "from-purple-500 to-blue-500",
        actionable: true,
      })
    }

    // Shopping & Consumer Products
    if (
      categoryName.includes("shopping") ||
      categoryName.includes("retail") ||
      categoryName.includes("clothes") ||
      categoryName.includes("electronics") ||
      categoryName.includes("gadget") ||
      categoryName.includes("consumer")
    ) {
      suggestions.push({
        id: "shopping-mindful",
        type: "extreme",
        title: "🛍️ Mindful Shopping Challenge!",
        description: `Whoa! ${categoryPercentage.toFixed(0)}% ($${categoryAmount.toFixed(2)}) on shopping. Try the 24-hour rule: wait a day before buying non-essentials. Ask yourself: "Do I need this or just want it?"`,
        icon: "🛍️",
        color: "from-red-500 to-pink-500",
        actionable: true,
      })

      suggestions.push({
        id: "shopping-alternatives",
        type: "moderate",
        title: "♻️ Smart Shopper Mode!",
        description: `Before buying new, try: borrowing from friends, buying second-hand, using discount apps, or waiting for sales. Your future self will appreciate the savings!`,
        icon: "♻️",
        color: "from-green-500 to-teal-500",
        actionable: true,
      })
    }

    // Entertainment & Subscriptions
    if (
      categoryName.includes("entertainment") ||
      categoryName.includes("streaming") ||
      categoryName.includes("subscription") ||
      categoryName.includes("gaming") ||
      categoryName.includes("movie") ||
      categoryName.includes("music")
    ) {
      suggestions.push({
        id: "entertainment-audit",
        type: "moderate",
        title: "📺 Subscription Audit Time!",
        description: `${categoryPercentage.toFixed(0)}% on entertainment ($${categoryAmount.toFixed(2)})! Review all your subscriptions. Cancel unused ones and consider sharing family plans with friends or family.`,
        icon: "📺",
        color: "from-purple-500 to-indigo-500",
        actionable: true,
      })

      suggestions.push({
        id: "entertainment-free",
        type: "fun",
        title: "🎨 Free Fun Explorer!",
        description: `Discover free entertainment: local events, hiking, free museums, library activities, or game nights with friends. Fun doesn't have to be expensive!`,
        icon: "🎨",
        color: "from-pink-500 to-purple-500",
        actionable: true,
      })
    }

    // Healthcare & Wellness
    if (
      categoryName.includes("health") ||
      categoryName.includes("medical") ||
      categoryName.includes("pharmacy") ||
      categoryName.includes("fitness") ||
      categoryName.includes("gym") ||
      categoryName.includes("wellness")
    ) {
      suggestions.push({
        id: "health-prevention",
        type: "fun",
        title: "💪 Prevention is Key!",
        description: `${categoryPercentage.toFixed(0)}% on healthcare ($${categoryAmount.toFixed(2)}). Invest in prevention: regular exercise, good sleep, healthy eating. It saves money long-term!`,
        icon: "💪",
        color: "from-green-500 to-blue-500",
        actionable: true,
      })

      suggestions.push({
        id: "health-alternatives",
        type: "moderate",
        title: "🏃‍♀️ Budget Wellness!",
        description: `Try free alternatives: outdoor workouts, YouTube fitness videos, walking groups, or home workouts. Your health goals don't need expensive gym memberships!`,
        icon: "🏃‍♀️",
        color: "from-orange-500 to-red-500",
        actionable: true,
      })
    }

    // Utilities & Bills
    if (
      categoryName.includes("utilities") ||
      categoryName.includes("electric") ||
      categoryName.includes("water") ||
      categoryName.includes("internet") ||
      categoryName.includes("phone") ||
      categoryName.includes("bill")
    ) {
      suggestions.push({
        id: "utilities-efficiency",
        type: "moderate",
        title: "💡 Energy Efficiency Hero!",
        description: `${categoryPercentage.toFixed(0)}% on utilities ($${categoryAmount.toFixed(2)}). Small changes make big differences: LED bulbs, unplugging devices, adjusting thermostat, shorter showers!`,
        icon: "💡",
        color: "from-yellow-500 to-orange-500",
        actionable: true,
      })

      suggestions.push({
        id: "utilities-negotiate",
        type: "fun",
        title: "📞 Bill Negotiator!",
        description: `Call your service providers! Many offer discounts, loyalty rates, or bundle deals. A 10-minute call could save you hundreds per year. You've got this! 💪`,
        icon: "📞",
        color: "from-blue-500 to-purple-500",
        actionable: true,
      })
    }

    // Coffee & Beverages
    if (
      categoryName.includes("coffee") ||
      categoryName.includes("beverage") ||
      categoryName.includes("drink") ||
      categoryName.includes("starbucks") ||
      categoryName.includes("cafe")
    ) {
      suggestions.push({
        id: "coffee-homebrew",
        type: "extreme",
        title: "☕ Home Barista Challenge!",
        description: `$${categoryAmount.toFixed(2)} on coffee (${categoryPercentage.toFixed(0)}%)! Invest in a good coffee maker and quality beans. You'll save money and might discover you make better coffee than the shops!`,
        icon: "☕",
        color: "from-amber-500 to-orange-500",
        actionable: true,
      })

      suggestions.push({
        id: "coffee-limit",
        type: "moderate",
        title: "⏰ Coffee Budget Timer!",
        description: `Set a weekly coffee budget and stick to it. Maybe treat yourself to fancy coffee twice a week and make the rest at home. Balance is key! ⚖️`,
        icon: "⏰",
        color: "from-brown-500 to-amber-500",
        actionable: true,
      })
    }
  }

  return suggestions.slice(0, 6) // Return top 6 suggestions
}
