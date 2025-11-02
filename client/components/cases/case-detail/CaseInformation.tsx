import { Card, CardContent } from "@/components/ui/card"
import { formatCaseStatus } from "@/lib/helpers"
import type { CaseDetail } from "@/lib/api"

interface CaseInformationProps {
  data: CaseDetail
}

export function CaseInformation({ data }: CaseInformationProps) {
  return (
    <Card className="border border-border bg-card shadow-sm rounded-xl">
      <CardContent className="pt-0 pb-0 px-5 space-y-4">
        <div className="text-lg uppercase tracking-widest text-foreground font-extrabold pt-0 pb-2">Case information</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {data.status && (
            <div className="space-y-1.5">
              <div className="font-semibold">Status</div>
              <div className="text-muted-foreground capitalize break-words">{data.status}</div>
            </div>
          )}
          {/* Reported By removed per design */}
          <div className="space-y-1.5">
            <div className="font-semibold">Case Officer</div>
            <div className="text-muted-foreground">Detective Sharma</div>
          </div>
          {data.dateMissingFound && (
            <div className="space-y-1.5">
              <div className="font-semibold">Date Last Seen</div>
              <div className="text-muted-foreground break-words">
                {formatCaseStatus(data.dateMissingFound, 'missing')}
              </div>
            </div>
          )}
          {data.city && (
            <div className="space-y-1.5">
              <div className="font-semibold">City</div>
              <div className="text-muted-foreground break-words">{data.city}</div>
            </div>
          )}
          {data.state && (
            <div className="space-y-1.5">
              <div className="font-semibold">State</div>
              <div className="text-muted-foreground break-words">{data.state}</div>
            </div>
          )}
          {data.country && (
            <div className="space-y-1.5">
              <div className="font-semibold">Country</div>
              <div className="text-muted-foreground break-words">{data.country}</div>
            </div>
          )}
          {data.pincode && (
            <div className="space-y-1.5">
              <div className="font-semibold">Pincode</div>
              <div className="text-muted-foreground break-words">{data.pincode}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
