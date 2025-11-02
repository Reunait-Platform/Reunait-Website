import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import { formatDate } from "@/lib/helpers"
import { format } from "date-fns"
import { useRef, useEffect, useState } from "react"

interface CaseProgressTimelineProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  notifications?: Array<{
    message: string
    time: string
    ipAddress?: string
    phoneNumber?: string
    isRead: boolean
  }>
}

const TIMELINE_DATA = [
  { 
    message: "New lead reported in Bandra West area", 
    time: "2024-01-15T14:30:25.123Z",
    ipAddress: "192.168.1.100"
  },
  { 
    message: "Case status updated to 'Under Investigation'", 
    time: "2024-01-14T10:15:30.456Z",
    ipAddress: "10.0.0.50"
  },
  { 
    message: "Police station contacted for additional details", 
    time: "2024-01-13T16:45:20.789Z",
    ipAddress: null // Simulating missing IP from backend
  },
  { 
    message: "Witness interview scheduled for tomorrow", 
    time: "2024-01-12T09:20:15.321Z",
    ipAddress: "203.0.113.10"
  },
  { 
    message: "Case assigned to Detective Sharma", 
    time: "2024-01-08T11:30:45.654Z",
    ipAddress: "198.51.100.75"
  }
]

// Dynamic Vertical Line Component
function DynamicVerticalLine({ contentRef, isLast }: { contentRef: React.RefObject<HTMLDivElement | null>, isLast: boolean }) {
  const [lineHeight, setLineHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      const measureHeight = () => {
        const contentHeight = contentRef.current?.offsetHeight || 0
        setLineHeight(contentHeight)
      }
      
      // Measure immediately
      measureHeight()
      
      // Re-measure on window resize
      window.addEventListener('resize', measureHeight)
      
      return () => window.removeEventListener('resize', measureHeight)
    }
  }, [contentRef])

  return (
    <div 
      className="w-px bg-border/50 mt-2 transition-all duration-200"
      style={{ height: `${lineHeight}px` }}
    />
  )
}

// Timeline Item Component
function TimelineItem({ 
  activity, 
  isLast, 
  getDotStyle, 
  getContentSpacing, 
  localTime, 
  relativeTime, 
  formattedDateTime 
}: {
  activity: any
  isLast: boolean
  getDotStyle: (isRead: boolean) => string
  getContentSpacing: (message: string) => string
  localTime: Date
  relativeTime: string
  formattedDateTime: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex items-start gap-3 sm:gap-4 transition-all duration-200 rounded-lg p-2 -m-2 mb-6 sm:mb-8 border-l-4 border-primary/30 pl-4">
      <div className="flex flex-col items-center">
        <div className={getDotStyle(!activity.isRead)}></div>
        <DynamicVerticalLine contentRef={contentRef} isLast={isLast} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div ref={contentRef} className={`${getContentSpacing(activity.message)}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-1">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-sm font-bold italic text-foreground leading-relaxed break-words">
                {activity.message}
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">
              {relativeTime}
            </span>
          </div>
        </div>
        
        <div className="opacity-100 mt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/70">
            {activity.time && (
              <>
                <span className="whitespace-nowrap">{formattedDateTime}</span>
                {activity.phoneNumber && (
                  <>
                    <span>•</span>
                    <span className="whitespace-nowrap">Phone: {activity.phoneNumber}</span>
                  </>
                )}
                {activity.ipAddress && (
                  <>
                    <span>•</span>
                    <span className="whitespace-nowrap">IP: {activity.ipAddress}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CaseProgressTimeline({ children, open, onOpenChange, notifications = [] }: CaseProgressTimelineProps) {

  // Content-aware spacing based on message length
  const getContentSpacing = (message: string) => {
    const wordCount = message.split(' ').length
    if (wordCount <= 10) return 'pb-1'        // Short: minimal padding
    if (wordCount <= 20) return 'pb-1'         // Medium: minimal padding
    return 'pb-2'                            // Long: minimal padding
  }

  // Enhanced read/unread states with animations
  const getDotStyle = (isRead: boolean) => {
    return `w-3 h-3 rounded-full mt-1.5 flex-shrink-0 transition-all duration-200 ${
      !isRead 
        ? 'bg-primary ring-2 ring-primary/20 animate-pulse' 
        : 'bg-primary/60'
    }`
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] sm:max-h-[80vh] backdrop-blur-md bg-background/95 border-border/50 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Case Progress Timeline
          </DialogTitle>
          <DialogDescription>
            Real-time updates and activities for this case. Track the investigation progress and recent developments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8 sm:space-y-10 flex-1 min-h-0 overflow-y-auto pr-4">
          {notifications.length > 0 ? (
            notifications.map((activity, index) => {
            // Convert UTC to user's local timezone
            const localTime = new Date(activity.time)
            const relativeTime = formatDate(localTime, 'relative')
            const formattedDateTime = format(localTime, "MMM dd, yyyy 'at' h:mm a")
            
            return (
              <TimelineItem 
                key={index} 
                activity={activity} 
                isLast={index === notifications.length - 1}
                getDotStyle={getDotStyle}
                getContentSpacing={getContentSpacing}
                localTime={localTime}
                relativeTime={relativeTime}
                formattedDateTime={formattedDateTime}
              />
            )
          })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-sm">
                No updates available yet
              </p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Check back later for case progress updates
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
