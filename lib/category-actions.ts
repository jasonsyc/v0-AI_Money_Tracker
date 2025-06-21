"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function createCategory(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const name = formData.get("name")
  const icon = formData.get("icon") || "📝"
  const color = formData.get("color") || "#6366f1"

  if (!name) {
    return { error: "Category name is required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to create a category" }
    }

    const { error } = await supabase.from("expense_categories").insert({
      user_id: user.id,
      name: name.toString().trim(),
      icon: icon.toString(),
      color: color.toString(),
      is_default: false,
    })

    if (error) {
      if (error.code === "23505") {
        return { error: "A category with this name already exists" }
      }
      return { error: error.message }
    }

    revalidatePath("/categories")
    return { success: `Category "${name}" created successfully! 🎉` }
  } catch (error) {
    console.error("Create category error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function updateCategory(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const id = formData.get("id")
  const name = formData.get("name")
  const icon = formData.get("icon")
  const color = formData.get("color")

  if (!id || !name) {
    return { error: "Category ID and name are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to update a category" }
    }

    const { error } = await supabase
      .from("expense_categories")
      .update({
        name: name.toString().trim(),
        icon: icon?.toString() || "📝",
        color: color?.toString() || "#6366f1",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id.toString())
      .eq("user_id", user.id)

    if (error) {
      if (error.code === "23505") {
        return { error: "A category with this name already exists" }
      }
      return { error: error.message }
    }

    revalidatePath("/categories")
    return { success: `Category "${name}" updated successfully! ✨` }
  } catch (error) {
    console.error("Update category error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function deleteCategory(categoryId: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to delete a category" }
    }

    const { error } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .eq("is_default", false) // Only allow deletion of non-default categories

    if (error) {
      return { error: error.message }
    }

    revalidatePath("/categories")
    return { success: "Category deleted successfully! 🗑️" }
  } catch (error) {
    console.error("Delete category error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getCategories() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { categories: [], error: "You must be logged in to view categories" }
    }

    // Create default categories if they don't exist
    await supabase.rpc("create_default_categories", { user_uuid: user.id })

    const { data: categories, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })

    if (error) {
      return { categories: [], error: error.message }
    }

    return { categories: categories || [], error: null }
  } catch (error) {
    console.error("Get categories error:", error)
    return { categories: [], error: "Failed to fetch categories" }
  }
}
