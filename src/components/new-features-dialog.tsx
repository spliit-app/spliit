'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Sparkles, QrCode, Archive, Calculator, Lock, Trash2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFeaturesDialog({ open, onOpenChange }: Props) {

  const features = [
    {
      icon: QrCode,
      title: 'QR Code Support',
      description:
        'Share your groups instantly with a QR code or scan one to join. No more copying URLs!',
      badge: 'New',
    },
    {
      icon: Archive,
      title: 'Backup & Restore',
      description:
        'Create backups of your expense groups and restore them anytime, anywhere. Never lose your data!',
      badge: 'New',
    },
    {
      icon: Calculator,
      title: 'Amount Calculator',
      description:
        'Built-in calculator for expenses with keyboard shortcuts. Calculate on the fly while creating expenses.',
      badge: 'New',
    },
    {
      icon: Lock,
      title: 'Secure Authentication',
      description:
        'Protect your account with passphrase or passkey (biometric) authentication. Recover your groups on any device.',
      badge: 'New',
    },
    {
      icon: Trash2,
      title: 'Permanent Group Deletion',
      description:
        'Safely delete groups you no longer need with built-in backup reminders and image management.',
      badge: 'New',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            What's New in Spliit Forked
          </DialogTitle>
          <DialogDescription>
            Discover the latest features to make expense sharing easier and more secure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {feature.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Tap on specific features in the app to learn more
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => {
                window.open('/help', '_blank')
                onOpenChange(false)
              }}
            >
              Additional Detail
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
