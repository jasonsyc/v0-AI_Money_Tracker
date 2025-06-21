"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Edit2, Trash2, Tag, Palette, Sparkles } from "lucide-react"
import { createCategory, updateCategory, deleteCategory, getCategories } from "@/lib/category-actions"

interface Category {
  id: string
  name: string
  icon: string
  color: string
  is_default: boolean
}

const EMOJI_OPTIONS = ["📝", "🍽️", "🚗", "⚡", "🏠", "🛒", "💊", "🎮", "👕", "📱", "🎬", "✈️", "🏋️", "📚", "🎨"]
const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
]

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-3 font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isEditing ? "Updating..." : "Creating..."}
        </>
      ) : (
        <>
          {isEditing ? <Edit2 className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isEditing ? "Update Category" : "Add Category"}
        </>
      )}
    </Button>
  )
}

export default function AddExpenseCategory() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    icon: "📝",
    color: "#6366f1",
  })

  const [createState, createAction] = useActionState(createCategory, null)
  const [updateState, updateAction] = useActionState(updateCategory, null)

  // Load categories on component mount
  useEffect(() => {
    loadCategories()
  }, [])

  // Reset form and reload categories on successful create/update
  useEffect(() => {
    if (createState?.success || updateState?.success) {
      setFormData({ name: "", icon: "📝", color: "#6366f1" })
      setEditingCategory(null)
      loadCategories()
    }
  }, [createState, updateState])

  const loadCategories = async () => {
    setLoading(true)
    const result = await getCategories()
    if (result.categories) {
      setCategories(result.categories)
    }
    setLoading(false)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
    })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setFormData({ name: "", icon: "📝", color: "#6366f1" })
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      const result = await deleteCategory(categoryId)
      if (result.success) {
        loadCategories()
      }
    }
  }

  const currentState = editingCategory ? updateState : createState

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="bg-white/20 p-3 rounded-full">
                <Tag className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Expense Categories</CardTitle>
            <p className="text-white/90">Organize your spending with style! 🎨</p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add/Edit Category Form */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                {editingCategory ? <Edit2 className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                {editingCategory ? "Edit Category" : "Add New Category"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentState?.error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl text-center font-medium">
                  {currentState.error}
                </div>
              )}

              {currentState?.success && (
                <div className="bg-green-100 border-2 border-green-300 text-green-700 px-4 py-3 rounded-xl text-center font-medium">
                  {currentState.success}
                </div>
              )}

              <form action={editingCategory ? updateAction : createAction} className="space-y-4">
                {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}
                <input type="hidden" name="icon" value={formData.icon} />
                <input type="hidden" name="color" value={formData.color} />

                {/* Category Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Category Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Coffee & Snacks"
                    required
                    className="border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 flex items-center">
                    <Sparkles className="mr-1 h-4 w-4" />
                    Choose an Icon
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`p-2 text-xl rounded-lg transition-all duration-200 hover:scale-110 ${
                          formData.icon === emoji
                            ? "bg-purple-100 ring-2 ring-purple-400 shadow-lg"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 flex items-center">
                    <Palette className="mr-1 h-4 w-4" />
                    Pick a Color
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${
                          formData.color === color ? "ring-4 ring-gray-400 shadow-lg" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <p className="text-sm font-bold text-gray-600 mb-2">Preview:</p>
                  <div
                    className="inline-flex items-center px-4 py-2 rounded-full text-white font-bold shadow-lg"
                    style={{ backgroundColor: formData.color }}
                  >
                    <span className="mr-2 text-lg">{formData.icon}</span>
                    {formData.name || "Category Name"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <SubmitButton isEditing={!!editingCategory} />
                  {editingCategory && (
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="px-6 border-2 border-gray-300 hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-800">Your Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No categories yet. Add your first one! 🎯</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.icon}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{category.name}</p>
                          {category.is_default && <p className="text-xs text-gray-500">Default Category</p>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleEdit(category)}
                          size="sm"
                          variant="outline"
                          className="p-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!category.is_default && (
                          <Button
                            onClick={() => handleDelete(category.id, category.name)}
                            size="sm"
                            variant="outline"
                            className="p-2 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
