"use client"

import React from "react"
import { Progress } from "@/components/ui/progress"

interface ProgressIndicatorProps {
  progress: number
  className?: string
}

export function ProgressIndicator({ progress, className = "" }: ProgressIndicatorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Form Completion</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {progress === 100 
          ? "Ready to submit!" 
          : progress >= 75 
            ? "Almost there!" 
            : progress >= 50 
              ? "Good progress!" 
              : "Keep going..."}
      </p>
    </div>
  )
}
