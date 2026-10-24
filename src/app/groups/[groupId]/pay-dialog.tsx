'use client'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/lib/hooks'
import type { PaymentOption } from '@/lib/payment-methods'
import { ExternalLink, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { ReactNode } from 'react'

type Props = {
  options: PaymentOption[]
  receiverName: string
  formattedAmount: string
  markAsPaidHref: string
}

/** "Pay" for one suggested reimbursement: QR, app link or details to copy. */
export function PayDialog({
  options,
  receiverName,
  formattedAmount,
  markAsPaidHref,
}: Props) {
  const t = useTranslations('PaymentMethods')
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const title = t('payTitle', { name: receiverName, amount: formattedAmount })
  const trigger = (
    <Button variant="secondary" size="sm" className="h-8">
      <Wallet className="w-4 h-4 mr-2" />
      {t('pay')}
    </Button>
  )
  const body = <PayOptions options={options} markAsPaidHref={markAsPaidHref} />

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t('payDescription')}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{t('payDescription')}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">{body}</div>
      </DrawerContent>
    </Drawer>
  )
}

function PayOptions({
  options,
  markAsPaidHref,
}: {
  options: PaymentOption[]
  markAsPaidHref: string
}) {
  const t = useTranslations('PaymentMethods')
  const tabs = options.map((option, index) => ({
    value: `${option.method.type}-${index}`,
    option,
  }))
  const content = (option: PaymentOption): ReactNode => (
    <PaymentOptionView option={option} />
  )

  return (
    <div className="flex flex-col gap-4">
      {tabs.length === 1 ? (
        content(tabs[0].option)
      ) : (
        <Tabs defaultValue={tabs[0].value}>
          <TabsList className="flex flex-wrap h-auto">
            {tabs.map(({ value, option }) => (
              <TabsTrigger key={value} value={value}>
                {t(`${option.method.type}.label`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map(({ value, option }) => (
            <TabsContent key={value} value={value} className="pt-2">
              {content(option)}
            </TabsContent>
          ))}
        </Tabs>
      )}
      <div className="border-t pt-4 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t('afterPaying')}</p>
        <Button asChild>
          <Link href={markAsPaidHref}>{t('markAsPaid')}</Link>
        </Button>
      </div>
    </div>
  )
}

function PaymentOptionView({ option }: { option: PaymentOption }) {
  const t = useTranslations('PaymentMethods')
  const { instructions, method } = option
  const label = t(`${method.type}.label`)

  return (
    <div className="flex flex-col gap-3">
      {instructions.qr && (
        <div className="flex flex-col items-center gap-2">
          <div
            className="rounded-md border bg-white p-2"
            data-payload={instructions.qr.payload}
          >
            <QRCodeSVG
              value={instructions.qr.payload}
              size={200}
              level={instructions.qr.errorCorrectionLevel}
              marginSize={1}
              bgColor="#ffffff"
              fgColor="#000000"
              title={t('qrAlt', { method: label })}
              role="img"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t(`${method.type}.qrHelp`)}
          </p>
        </div>
      )}
      {instructions.href && (
        <Button asChild variant="outline">
          <a href={instructions.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('openApp', { method: label })}
          </a>
        </Button>
      )}
      {!instructions.qr && !instructions.href && (
        <p className="text-sm text-muted-foreground">
          {t(`${method.type}.copyHelp`)}
        </p>
      )}
      <dl className="flex flex-col gap-2 text-sm">
        {instructions.copy
          .filter(({ value }) => value !== '')
          .map(({ label: copyLabel, value }) => (
            <div key={copyLabel} className="flex items-center gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">
                {t(`copy.${copyLabel}`)}
              </dt>
              <dd className="flex-1 min-w-0 break-all font-mono">{value}</dd>
              <CopyButton text={value} />
            </div>
          ))}
      </dl>
      {instructions.unverified && (
        <p className="text-xs text-muted-foreground">{t('checkDetails')}</p>
      )}
    </div>
  )
}
