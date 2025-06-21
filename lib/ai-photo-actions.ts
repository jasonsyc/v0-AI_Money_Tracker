"use server"

import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

// Check if the key is present – works both locally and on Vercel
export const isGeminiConfigured =
  typeof process.env.GOOGLE_GENERATIVE_AI_API_KEY === "string" && process.env.GOOGLE_GENERATIVE_AI_API_KEY.length > 0

const ExpenseAnalysisSchema = z.object({
  amount: z.number().describe("The total amount or price found in the image"),
  category: z
    .string()
    .describe(
      "The most appropriate expense category (e.g., 'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Healthcare', 'Utilities', 'Groceries', 'Gas', 'Coffee', 'Restaurants')",
    ),
  description: z.string().describe("A brief description of what was purchased or the expense item"),
  confidence: z.number().min(0).max(1).describe("Confidence level of the analysis (0-1)"),
  reasoning: z.string().describe("Brief explanation of how the analysis was determined"),
})

export async function analyzeExpensePhoto(imageBase64: string): Promise<{
  success: boolean
  data?: {
    amount: number
    category: string
    description: string
    confidence: number
    reasoning: string
  }
  error?: string
}> {
  if (!isGeminiConfigured) {
    return {
      success: false,
      error:
        "Google Gemini is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY in the Vercel Dashboard or via `vc env add`.",
    }
  }

  try {
    console.log("Starting Gemini analysis...")

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "")

    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: ExpenseAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and extract expense information. Look for:
              1. The total amount/price (look for currency symbols, numbers that represent costs)
              2. What category this expense would fall under
              3. A brief description of what was purchased
              4. Your confidence in the analysis (0.0 to 1.0)
              
              If this is a receipt, focus on the total amount. If it's a product photo, estimate a reasonable price based on what you see. Be practical and realistic with your suggestions.
              
              Return your confidence as a decimal between 0 and 1 (e.g., 0.85 for 85% confident).`,
            },
            {
              type: "image",
              image: base64Data,
            },
          ],
        },
      ],
    })

    console.log("Gemini analysis successful:", object)

    return {
      success: true,
      data: object,
    }
  } catch (error: any) {
    console.error("Gemini analysis error:", error)

    // Handle Gemini-specific errors
    const rawMessage = error?.message || error?.toString() || "Unknown error"

    let friendly = "Failed to analyse the image. Please try again later."

    if (/quota/i.test(rawMessage) || /billing/i.test(rawMessage)) {
      friendly =
        "Your Google AI API quota is exhausted or billing is inactive. " +
        "Please check your usage at https://aistudio.google.com/app/apikey."
    } else if (/api.?key/i.test(rawMessage) || /authentication/i.test(rawMessage)) {
      friendly = "Invalid Google AI API key. Please check your GOOGLE_GENERATIVE_AI_API_KEY."
    } else if (/safety/i.test(rawMessage)) {
      friendly = "Image was blocked by safety filters. Please try a different image."
    } else if (/unsupported/i.test(rawMessage)) {
      friendly = "Image format not supported. Please try a JPEG or PNG image."
    }

    return {
      success: false,
      error: friendly,
    }
  }
}

// Keep the old export name for backward compatibility but point to Gemini
export const isOpenAIConfigured = isGeminiConfigured
