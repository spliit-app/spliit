'use client'

import { Button } from '@/components/ui/button'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
    onScan: (url: string) => void
    onError?: (error: string) => void
    onClose?: () => void
}

export function QrCodeScanner({ onScan, onError, onClose }: Props) {
    const [isScanning, setIsScanning] = useState(false)
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const elementId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`)

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error)
            }
        }
    }, [])

    const startScanning = async () => {
        try {
            const html5QrCode = new Html5Qrcode(elementId.current)
            scannerRef.current = html5QrCode

            await html5QrCode.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    // Successfully scanned
                    onScan(decodedText)
                    stopScanning()
                },
                (errorMessage) => {
                    // Scanning error - these happen frequently, so we don't report them
                    // unless we want to show detailed debugging
                }
            )

            setIsScanning(true)
            setHasPermission(true)
        } catch (err: any) {
            console.error('Error starting QR scanner:', err)
            setHasPermission(false)
            setIsScanning(false)
            if (onError) {
                if (err.name === 'NotAllowedError') {
                    onError('Camera permission denied. Please allow camera access to scan QR codes.')
                } else if (err.name === 'NotFoundError') {
                    onError('No camera found on this device.')
                } else {
                    onError('Failed to start camera. Please try again.')
                }
            }
        }
    }

    const stopScanning = async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop()
            } catch (err) {
                console.error('Error stopping scanner:', err)
            }
        }
        setIsScanning(false)
        if (onClose) {
            onClose()
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div id={elementId.current} className="w-full" />

            {!isScanning && hasPermission === null && (
                <Button
                    type="button"
                    onClick={startScanning}
                    className="w-full"
                >
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                </Button>
            )}

            {isScanning && (
                <Button
                    type="button"
                    variant="destructive"
                    onClick={stopScanning}
                    className="w-full"
                >
                    <X className="w-4 h-4 mr-2" />
                    Stop Scanning
                </Button>
            )}

            {hasPermission === false && (
                <div className="text-sm text-destructive text-center">
                    Unable to access camera. Please check permissions.
                </div>
            )}
        </div>
    )
}
