import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EllipsisVertical } from 'lucide-react'

export default async function VerificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  const role = (user.publicMetadata as any)?.role
  if (role !== 'volunteer') notFound()

  const sp = await searchParams
  const country = typeof sp.country === 'string' ? sp.country : 'all'

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Verifications</h1>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2">
        <form action="/volunteer/verifications" className="flex items-center gap-2">
          <label htmlFor="country" className="text-sm text-muted-foreground">Country</label>
          <select id="country" name="country" defaultValue={country} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="all">All</option>
          </select>
          <Button type="submit" variant="outline" className="cursor-pointer">Apply</Button>
        </form>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">Joined</th>
                <th className="text-left px-3 py-2 font-medium">Location</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 max-w-[220px] truncate">
                  <Link href="/caseOwnerProfile?caseOwner=placeholder" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline cursor-pointer">—</Link>
                </td>
                <td className="px-3 py-2 max-w-[260px] truncate">—</td>
                <td className="px-3 py-2 whitespace-nowrap">—</td>
                <td className="px-3 py-2 max-w-[220px] truncate">—</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">Approve</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 cursor-pointer">Deny</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}


