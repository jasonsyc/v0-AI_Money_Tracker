"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export interface DashboardData {
  budgets: {
    weekly?: { amount: number; timeframe: string }
    monthly?: { amount: number; timeframe: string }
  }
  totalSpend: {
    weekly: number
    monthly: number
  }
  remaining: {
    weekly: number
    monthly: number
  }
  recentExpenses: Array<{
    id: string
    amount: number
    description: string
    expense_date: string
    category: {
      name: string
      icon: string
      color: string
    } | null
  }>
  categories: Array<{
    id: string
    name: string
    icon: string
    color: string
  }>
}

export async function getDashboardData(): Promise<{
  data: DashboardData | null
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
      return { data: null, error: "You must be logged in to view dashboard" }
    }

    // Create default categories if they don't exist
    await supabase.rpc("create_default_categories", { user_uuid: user.id })

    // Get budgets
    const { data: budgets } = await supabase.from("budgets").select("amount, timeframe").eq("user_id", user.id)

    // Calculate date ranges
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get weekly expenses
    const { data: weeklyExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .gte("expense_date", startOfWeek.toISOString().split("T")[0])

    // Get monthly expenses
    const { data: monthlyExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .gte("expense_date", startOfMonth.toISOString().split("T")[0])

    // Get recent expenses with categories
    const { data: recentExpenses } = await supabase
      .from("expenses")
      .select(`
        id,
        amount,
        description,
        expense_date,
        expense_categories (
          name,
          icon,
          color
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    // Get categories
    const { data: categories } = await supabase
      .from("expense_categories")
      .select("id, name, icon, color")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })

    // Process data
    const budgetData = {
      weekly: budgets?.find((b) => b.timeframe === "weekly"),
      monthly: budgets?.find((b) => b.timeframe === "monthly"),
    }

    const weeklySpend = weeklyExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
    const monthlySpend = monthlyExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

    const dashboardData: DashboardData = {
      budgets: budgetData,
      totalSpend: {
        weekly: weeklySpend,
        monthly: monthlySpend,
      },
      remaining: {
        weekly: (budgetData.weekly?.amount || 0) - weeklySpend,
        monthly: (budgetData.monthly?.amount || 0) - monthlySpend,
      },
      recentExpenses:
        recentExpenses?.map((exp) => ({
          id: exp.id,
          amount: Number(exp.amount),
          description: exp.description || "",
          expense_date: exp.expense_date,
          category: exp.expense_categories
            ? {
                name: exp.expense_categories.name,
                icon: exp.expense_categories.icon,
                color: exp.expense_categories.color,
              }
            : null,
        })) || [],
      categories: categories || [],
    }

    return { data: dashboardData, error: null }
  } catch (error) {
    console.error("Dashboard data error:", error)
    return { data: null, error: "Failed to fetch dashboard data" }
  }
}

export async function addQuickExpense(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const amount = formData.get("amount")
  const categoryId = formData.get("categoryId")
  const description = formData.get("description") || ""

  if (!amount || !categoryId) {
    return { error: "Amount and category are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to add an expense" }
    }

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      category_id: categoryId.toString(),
      amount: Number.parseFloat(amount.toString()),
      description: description.toString(),
      expense_date: new Date().toISOString().split("T")[0], // Ensures current date in YYYY-MM-DD format
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Expense added successfully! 💸" }
  } catch (error) {
    console.error("Add expense error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function deleteExpense(expenseId: string): Promise<{
  success?: string
  error?: string
}> {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to delete an expense" }
    }

    // First, get the expense to verify ownership and get details for the success message
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("amount, description, expense_categories(name)")
      .eq("id", expenseId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !expense) {
      return { error: "Expense not found or you don't have permission to delete it" }
    }

    // Delete the expense
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", expenseId).eq("user_id", user.id)

    if (deleteError) {
      return { error: deleteError.message }
    }

    // Revalidate the dashboard to refresh the data
    revalidatePath("/dashboard")

    const expenseName = expense.description || expense.expense_categories?.name || "Expense"
    return { success: `${expenseName} ($${expense.amount}) deleted successfully! 🗑️` }
  } catch (error) {
    console.error("Delete expense error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}
