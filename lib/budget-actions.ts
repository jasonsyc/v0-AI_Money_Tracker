"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function saveBudget(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const amount = formData.get("amount")
  const timeframe = formData.get("timeframe")

  if (!amount || !timeframe) {
    return { error: "Amount and timeframe are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to save a budget" }
    }

    // Check if user already has a budget for this timeframe
    const { data: existingBudget } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("timeframe", timeframe.toString())
      .single()

    if (existingBudget) {
      // Update existing budget
      const { error } = await supabase
        .from("budgets")
        .update({
          amount: Number.parseFloat(amount.toString()),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBudget.id)

      if (error) {
        return { error: error.message }
      }
    } else {
      // Create new budget
      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        amount: Number.parseFloat(amount.toString()),
        timeframe: timeframe.toString(),
      })

      if (error) {
        return { error: error.message }
      }
    }

    revalidatePath("/budget")
    return {
      success: `${timeframe.toString().charAt(0).toUpperCase() + timeframe.toString().slice(1)} budget saved successfully! 🎉`,
    }
  } catch (error) {
    console.error("Budget save error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getBudgets() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { budgets: [], error: "You must be logged in to view budgets" }
    }

    const { data: budgets, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return { budgets: [], error: error.message }
    }

    return { budgets: budgets || [], error: null }
  } catch (error) {
    console.error("Get budgets error:", error)
    return { budgets: [], error: "Failed to fetch budgets" }
  }
}
