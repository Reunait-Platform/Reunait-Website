"use client"

import React, { useState, useCallback, useRef } from "react"
import { Dropzone } from "@/components/ui/dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import Image from "next/image"
import Cropper, { Area } from "react-easy-crop"
import { useToast } from "@/contexts/toast-context"

interface ImageUploadDropzoneProps {
  images: File[]
  onImagesChange: (images: File[]) => void
  error?: string
  maxSize?: number // in MB
  maxImages?: number
}

export function ImageUploadDropzone({ 
  images, 
  onImagesChange, 
  error,
  maxSize = 5,
  maxImages = 2
}: ImageUploadDropzoneProps) {
  const [previews, setPreviews] = useState<string[]>([])
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string>("")
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showError, showSuccess } = useToast()

  // Generate preview URLs
  const generatePreviews = useCallback((files: File[]) => {
    setPreviews(prevPreviews => {
      // Clean up old URLs
      prevPreviews.forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
      
      const newPreviews: string[] = []
      files.forEach((file) => {
        if (file && file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file)
          newPreviews.push(url)
        }
      })
      return newPreviews
    })
  }, [])

  // Handle file drop
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || cropModalOpen) return

    // Take only the first file for now (we can extend this later)
    const file = acceptedFiles[0]
    
    // Store the original file and create URL for cropping
    setTempFile(file)
    const imageUrl = URL.createObjectURL(file)
    setTempImageUrl(imageUrl)
    setCropModalOpen(true)
  }, [cropModalOpen])

  // Handle crop completion
  const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 1))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  // Apply crop and add image
  const applyCrop = useCallback(async () => {
    if (!tempImageUrl || !croppedAreaPixels) return

    try {
      // Create canvas to crop image
      const image = new window.Image()
      image.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = tempImageUrl
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Could not get canvas context')

      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      )

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/jpeg', 0.9)
      })

      // Create file from blob with original filename
      const originalName = tempFile?.name || 'cropped-image.jpg'
      const croppedFile = new File([blob], originalName, { type: 'image/jpeg' })

      // Check if we're at max capacity
      if (images.length >= maxImages) {
        // Replace the first image
        const newImages = [croppedFile, ...images.slice(1)]
        onImagesChange(newImages)
      } else {
        // Add new image
        const newImages = [...images, croppedFile]
        onImagesChange(newImages)
      }

      // Clean up
      URL.revokeObjectURL(tempImageUrl)
      setTempImageUrl("")
      setTempFile(null)
      setCropModalOpen(false)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      
      showSuccess("Image cropped and uploaded successfully!")
    } catch (error) {
      console.error('Error cropping image:', error)
      showError("Failed to crop image. Please try again.")
    }
  }, [tempImageUrl, tempFile, croppedAreaPixels, images, maxImages, onImagesChange, showSuccess, showError])

  // Cancel crop
  const cancelCrop = useCallback(() => {
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl)
    }
    setTempImageUrl("")
    setTempFile(null)
    setCropModalOpen(false)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
  }, [tempImageUrl])

  // Handle manual file input
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && !cropModalOpen) {
      handleDrop(Array.from(files))
    }
    // Reset the input
    if (e.target) {
      e.target.value = ''
    }
  }, [handleDrop, cropModalOpen])

  // Handle errors
  const handleError = useCallback((error: Error) => {
    // Replace file size in bytes with "10MB" for better user experience
    let errorMessage = error.message
    if (errorMessage.includes('File is larger than')) {
      errorMessage = errorMessage.replace(/File is larger than \d+ bytes/, `File is larger than ${maxSize}MB`)
    }
    showError(errorMessage)
  }, [showError, maxSize])

  // Remove image
  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    
    // Clean up URL before removing
    setPreviews(prevPreviews => {
      if (prevPreviews[index]) {
        URL.revokeObjectURL(prevPreviews[index])
      }
      return prevPreviews.filter((_, i) => i !== index)
    })
    
    onImagesChange(newImages)
  }, [images, onImagesChange])

  // Generate previews when images change
  React.useEffect(() => {
    generatePreviews(images)
  }, [images, generatePreviews])

  // Clean up URLs on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previews])

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Dropzone
        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
        maxFiles={1}
        maxSize={maxSize * 1024 * 1024}
        onDrop={handleDrop}
        onError={handleError}
        src={images}
        className={`relative h-auto w-full flex-col overflow-hidden p-6 min-h-[160px] cursor-pointer border-2 border-dashed ${
          error ? 'border-destructive' : 'border-muted-foreground/30 bg-background'
        } hover:bg-muted`}
      >
        <div className="text-center cursor-pointer">
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4 flex items-center justify-center cursor-pointer">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="space-y-2 cursor-pointer">
            <p className="text-sm font-medium cursor-pointer">
              {images.length === 0 ? `Upload ${maxImages} image${maxImages > 1 ? 's' : ''}` : `${images.length}/${maxImages} images uploaded`}
            </p>
            <p className="text-xs text-muted-foreground cursor-pointer">
              {maxImages === 1 ? (
                <>
                  <span className="hidden sm:inline">Drag and drop image or click to select an image</span>
                  <span className="sm:hidden">Click to select an image</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Drag and drop images here, or click to select</span>
                  <span className="sm:hidden">Click to select images</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground cursor-pointer">
              Max {maxSize}MB per image • PNG, JPG, JPEG, WEBP
            </p>
          </div>
        </div>
      </Dropzone>

      {/* Hidden file input as fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={cropModalOpen}
      />

      {/* Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={(open) => {
        if (!open) {
          cancelCrop()
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          
          {/* Crop Controls */}
          <div className="flex items-center justify-center gap-4 p-4 border-b">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative h-96 w-full">
            {tempImageUrl && (
              <Cropper
                image={tempImageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={handleCropComplete}
                aspect={1}
                style={{
                  containerStyle: {
                    width: "100%",
                    height: "100%",
                    position: "relative"
                  }
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelCrop} className="hover:cursor-pointer">
              Cancel
            </Button>
            <Button onClick={applyCrop} disabled={!croppedAreaPixels} className="hover:cursor-pointer">
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className={`grid gap-4 ${maxImages === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {images.map((file, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {previews[index] ? (
                    <Image
                      src={previews[index]}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <span className="text-muted-foreground text-sm">Loading preview...</span>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 hover:cursor-pointer"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                    <p className="text-xs truncate">{file.name}</p>
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
