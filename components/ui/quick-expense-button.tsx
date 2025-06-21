"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

/**
 * Submit button used in the “Quick Add Expense” dialog.
 * Automatically shows a spinner while the form is pending.
 */
export default function QuickExpenseButton({
  label = "Add Expense",
}: {
  label?: string
}) {
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
          {label === "Add Expense" ? "Adding..." : "Saving..."}
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
