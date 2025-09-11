"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Eye, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/contexts/toast-context"

interface ImageUploadProps {
  images: File[]
  onImagesChange: (images: File[]) => void
  error?: string
  maxSize?: number // in MB
  acceptedFormats?: string[]
}

export function ImageUpload({ 
  images, 
  onImagesChange, 
  error,
  maxSize = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showError } = useToast()

  // Generate preview URLs
  const generatePreviews = useCallback((files: File[]) => {
    const newPreviews: string[] = []
    files.forEach((file) => {
      const url = URL.createObjectURL(file)
      newPreviews.push(url)
    })
    setPreviews(newPreviews)
  }, [])

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `File type not supported. Please use: ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`
    }
    
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }
    
    return null
  }

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    fileArray.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      showError(errors.join('\n'))
    }

    // Limit to 2 images
    const finalFiles = validFiles.slice(0, 2)
    onImagesChange(finalFiles)
    generatePreviews(finalFiles)
  }, [onImagesChange, generatePreviews, showError, maxSize, acceptedFormats])

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }, [handleFiles])

  // Remove image
  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    
    onImagesChange(newImages)
    setPreviews(newPreviews)
    
    // Clean up URL
    if (previews[index]) {
      URL.revokeObjectURL(previews[index])
    }
  }, [images, previews, onImagesChange])

  // Clean up URLs on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previews])

  // Generate ImageKit preview URL with face detection
  const getImageKitPreviewUrl = (imageUrl: string) => {
    // This would be your ImageKit.io URL with face detection
    // For now, we'll use the blob URL directly
    return imageUrl
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        } ${error ? "border-destructive" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {images.length === 0 ? "Upload 2 images" : `${images.length}/2 images uploaded`}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop images here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxSize}MB per image • {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 2}
          >
            Choose Images
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((file, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={getImageKitPreviewUrl(previews[index])}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  
                  {/* Remove button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                    <p className="text-xs truncate">{file.name}</p>
                    <p className="text-xs opacity-75">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Instructions */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Upload clear, high-quality images of the person</p>
        <p>• Include front-facing photos when possible</p>
        <p>• Images will be processed for AI matching</p>
        <p>• Your images are secure and confidential</p>
      </div>
    </div>
  )
}
