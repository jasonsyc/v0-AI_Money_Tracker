"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Camera, Upload, Loader2, Sparkles, X, RotateCcw, AlertCircle } from "lucide-react"
import { analyzeExpensePhoto, isGeminiConfigured } from "@/lib/ai-photo-actions"

interface PhotoCaptureProps {
  onAnalysisComplete: (data: {
    amount: number
    category: string
    description: string
    confidence: number
    reasoning: string
  }) => void
  trigger: React.ReactNode
}

export default function AIPhotoCapture({ onAnalysisComplete, trigger }: PhotoCaptureProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isGeminiConfigured) return trigger as React.ReactElement

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      setCameraStream(stream)
      setShowCamera(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Better video loading handling
        const video = videoRef.current
        video.onloadedmetadata = () => {
          console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight)
          video.play().catch(console.error)
        }
      }
    } catch (err) {
      console.error("Camera error:", err)
      setError("Unable to access camera. Please use the upload option instead.")
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera not ready. Please try again.")
      return
    }

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    // Check if video is ready
    if (video.readyState < 2) {
      setError("Video not ready yet. Please wait a moment and try again.")
      return
    }

    // Get actual video dimensions
    const videoWidth = video.videoWidth || 640
    const videoHeight = video.videoHeight || 480

    console.log("Capturing photo with dimensions:", videoWidth, "x", videoHeight)

    // Set canvas to match video dimensions
    canvas.width = videoWidth
    canvas.height = videoHeight

    if (context && canvas.width > 0 && canvas.height > 0) {
      try {
        // Clear canvas first
        context.clearRect(0, 0, canvas.width, canvas.height)

        // Draw the video frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert to data URL with good quality
        const imageData = canvas.toDataURL("image/jpeg", 0.8)

        if (imageData && imageData.length > 100) {
          console.log("Successfully captured image, size:", imageData.length)
          setCapturedImage(imageData)
          stopCamera()
          setError(null)
        } else {
          setError("Failed to capture image. Please try again.")
        }
      } catch (err) {
        console.error("Canvas error:", err)
        setError("Failed to process camera image. Please try again.")
      }
    } else {
      setError("Canvas not ready. Please try again.")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image too large. Please choose an image smaller than 10MB.")
        return
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file.")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          setCapturedImage(result)
          setError(null)
        }
      }
      reader.onerror = () => {
        setError("Failed to read the image file.")
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!capturedImage) {
      setError("No image to analyze.")
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      console.log("Starting analysis with image size:", capturedImage.length)
      const result = await analyzeExpensePhoto(capturedImage)

      if (result.success && result.data) {
        console.log("Analysis successful:", result.data)
        // Close the photo dialog immediately after successful analysis
        setIsOpen(false)
        resetState()
        // Pass the data to parent component
        onAnalysisComplete(result.data)
      } else {
        console.error("Analysis failed:", result.error)
        setError(result.error || "Failed to analyze image")
      }
    } catch (err) {
      console.error("Analysis error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetState = () => {
    setCapturedImage(null)
    setError(null)
    setIsAnalyzing(false)
    stopCamera()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    resetState()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Feature gating for Gemini */}
      {isGeminiConfigured ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            disabled
            variant="outline"
            className="w-full border-2 border-dashed border-gray-300 cursor-not-allowed"
            title="AI Photo Analysis unavailable – add GOOGLE_GENERATIVE_AI_API_KEY"
          >
            <Camera className="mr-2 h-5 w-5" />
            AI Photo Analysis (unavailable)
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
            Gemini Photo Analysis
          </DialogTitle>
          <DialogDescription>
            Take a photo of your receipt or item, and Gemini AI will automatically extract the amount, category, and
            description!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!showCamera && !capturedImage && (
            <div className="space-y-3">
              <Button
                onClick={startCamera}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>

              <div className="relative">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {showCamera && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                  onLoadedMetadata={() => {
                    console.log("Video metadata loaded")
                  }}
                  onCanPlay={() => {
                    console.log("Video can play")
                  }}
                  onError={(e) => {
                    console.error("Video error:", e)
                    setError("Camera error occurred. Please try again.")
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={capturePhoto}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {capturedImage && !isAnalyzing && (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={capturedImage || "/placeholder.svg"}
                  alt="Captured expense"
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                  onError={() => setError("Failed to display captured image.")}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={analyzeImage}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze with Gemini
                </Button>
                <Button onClick={() => setCapturedImage(null)} variant="outline">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="relative inline-block">
                <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4 animate-pulse" />
                <Loader2 className="h-6 w-6 animate-spin text-purple-600 absolute -top-1 -right-1" />
              </div>
              <p className="text-lg font-bold text-gray-800">Gemini is analyzing your photo...</p>
              <p className="text-gray-600">Extracting amount, category, and description</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
