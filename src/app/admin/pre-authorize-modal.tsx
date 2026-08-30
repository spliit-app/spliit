'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { UserTier } from '@/lib/enums'
import { trpc } from '@/trpc/client'
import { Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'

export function PreAuthorizeModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [tier, setTier] = useState<UserTier>(UserTier.GROUP_CREATORS)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()
  const utils = trpc.useUtils()
  const preAuthMutation = trpc.admin.preAuthorizeUser.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    try {
      await preAuthMutation.mutateAsync({
        email,
        name: name.trim() || undefined,
        tier,
      })

      toast({
        title: 'User pre-authorized!',
        description: `When ${email} signs in with OAuth, they will immediately have ${tier.replace('_', ' ')} permissions.`,
      })

      setEmail('')
      setName('')
      setTier(UserTier.GROUP_CREATORS)
      setOpen(false)
      await utils.admin.invalidate()
      onSuccess?.()
    } catch (err: any) {
      setError(err?.message || 'Failed to pre-authorize user.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 shadow-sm">
          <UserPlus className="w-4 h-4" />
          <span>Pre-authorize User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Pre-authorize User Permissions
            </DialogTitle>
            <DialogDescription>
              Grant permissions to a friend or colleague before they sign in for
              the first time.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive font-medium border border-destructive/20">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="preauth-email">Email Address *</Label>
              <Input
                id="preauth-email"
                type="email"
                placeholder="friend@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Must match the email address on their Google or GitHub account.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preauth-name">Name (Optional)</Label>
              <Input
                id="preauth-name"
                type="text"
                placeholder="e.g. Alice Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preauth-tier">Initial Permission Tier</Label>
              <Select
                value={tier}
                onValueChange={(val) => setTier(val as UserTier)}
              >
                <SelectTrigger id="preauth-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserTier.GROUP_CREATORS}>
                    Group Creator (Can create & sync groups)
                  </SelectItem>
                  <SelectItem value={UserTier.ADMIN}>
                    Administrator (Full platform access)
                  </SelectItem>
                  <SelectItem value={UserTier.SYNC_USERS}>
                    Sync User (Syncing only, no group creation)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={preAuthMutation.isPending}>
              {preAuthMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Pre-authorize User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
