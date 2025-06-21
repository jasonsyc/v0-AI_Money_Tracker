"use client"

import type React from "react"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Plus, Calendar } from "lucide-react"

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface EnhancedExpenseDialogProps {
  categories: Category[]
  onSubmit: (formData: FormData) => void
  trigger: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  error?: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </>
      )}
    </Button>
  )
}

export default function EnhancedExpenseDialog({
  categories,
  onSubmit,
  trigger,
  open,
  onOpenChange,
  error,
}: EnhancedExpenseDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseDescription, setExpenseDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])

  const handleSubmit = (formData: FormData) => {
    // Add our state values to the form data
    formData.set("categoryId", selectedCategory)
    formData.set("amount", expenseAmount)
    formData.set("description", expenseDescription)
    formData.set("expenseDate", expenseDate)
    onSubmit(formData)
  }

  const getCurrentWeekRange = () => {
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

  const weekRange = getCurrentWeekRange()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5 text-green-500" />
            Add New Expense
          </DialogTitle>
          <DialogDescription>
            Add an expense for this week ({weekRange.start} - {weekRange.end}).
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
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
                {categories.map((category) => (
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
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Date
            </label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              className="border-2 border-gray-200 focus:border-green-400"
            />
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

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  )
}
