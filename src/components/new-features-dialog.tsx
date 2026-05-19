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
import {
  Sparkles,
  RefreshCw,
  Link2,
  Trash2,
  Languages,
  Settings,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFeaturesDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('NewFeaturesDialog')
  const features = [
    {
      icon: RefreshCw,
      title: t('features.groupSync.title'),
      description: t('features.groupSync.description'),
      badge: t('badge'),
    },
    {
      icon: Link2,
      title: t('features.linkedUrlSafety.title'),
      description: t('features.linkedUrlSafety.description'),
      badge: t('badge'),
    },
    {
      icon: Trash2,
      title: t('features.remotePurge.title'),
      description: t('features.remotePurge.description'),
      badge: t('badge'),
    },
    {
      icon: Languages,
      title: t('features.arabicSupport.title'),
      description: t('features.arabicSupport.description'),
      badge: t('badge'),
    },
    {
      icon: Settings,
      title: t('features.advancedSettings.title'),
      description: t('features.advancedSettings.description'),
      badge: t('badge'),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
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
            {t('footer')}
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => {
                window.open('/help', '_blank')
                onOpenChange(false)
              }}
            >
              {t('button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
