'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

interface Props {
    url: string
    groupName: string
}

export function ShareQrCodeDialog({ url, groupName }: Props) {
    const t = useTranslations('Share')
    const [logoDataUrl, setLogoDataUrl] = useState<string>('')

    useEffect(() => {
        // Load the Spliit logo and convert it to a data URL
        const loadLogo = async () => {
            try {
                const response = await fetch('/logo/192x192.png')
                const blob = await response.blob()
                const reader = new FileReader()
                reader.onloadend = () => {
                    setLogoDataUrl(reader.result as string)
                }
                reader.readAsDataURL(blob)
            } catch (error) {
                console.error('Failed to load logo:', error)
            }
        }
        loadLogo()
    }, [])

    const handleDownload = () => {
        const svg = document.getElementById('qr-code-svg')
        if (!svg) return

        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            const pngFile = canvas.toDataURL('image/png')

            const downloadLink = document.createElement('a')
            downloadLink.download = `${groupName}-qr-code.png`
            downloadLink.href = pngFile
            downloadLink.click()
        }

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    title={t('qrCode.title')}
                    variant="secondary"
                    size="icon"
                    className="flex-shrink-0"
                >
                    <QrCode className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('qrCode.title')}</DialogTitle>
                    <DialogDescription>{t('qrCode.description')}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={url}
                            size={256}
                            level="H"
                            includeMargin={true}
                            imageSettings={
                                logoDataUrl
                                    ? {
                                        src: logoDataUrl,
                                        x: undefined,
                                        y: undefined,
                                        height: 48,
                                        width: 48,
                                        excavate: true,
                                    }
                                    : undefined
                            }
                        />
                    </div>
                    <Button onClick={handleDownload} className="w-full">
                        {t('qrCode.download')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
