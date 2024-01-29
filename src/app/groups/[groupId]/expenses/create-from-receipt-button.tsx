'use client'

import { extractExpenseInformationFromImage } from '@/app/groups/[groupId]/expenses/create-from-receipt-button-actions'
import { Button } from '@/components/ui/button'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Receipt } from 'lucide-react'
import { getImageData, useS3Upload } from 'next-s3-upload'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  groupId: string
}

export function CreateFromReceiptButton({ groupId }: Props) {
  const [pending, setPending] = useState(false)
  const { uploadToS3, FileInput, openFileDialog } = useS3Upload()
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = async (file: File) => {
    const upload = async () => {
      try {
        setPending(true)
        console.log('Uploading image…')
        let { url } = await uploadToS3(file)
        console.log('Extracting information from receipt…')
        const { amount, categoryId, date, title } =
          await extractExpenseInformationFromImage(url)
        const { width, height } = await getImageData(file)
        router.push(
          `/groups/${groupId}/expenses/create?amount=${amount}&categoryId=${categoryId}&date=${date}&title=${encodeURIComponent(
            title ?? '',
          )}&imageUrl=${encodeURIComponent(
            url,
          )}&imageWidth=${width}&imageHeight=${height}`,
        )
      } catch (err) {
        console.error(err)
        toast({
          title: 'Error while uploading document',
          description:
            'Something wrong happened when uploading the document. Please retry later or select a different file.',
          variant: 'destructive',
          action: (
            <ToastAction altText="Retry" onClick={() => upload()}>
              Retry
            </ToastAction>
          ),
        })
      } finally {
        setPending(false)
      }
    }
    upload()
  }

  return (
    <>
      <FileInput onChange={handleFileChange} accept="image/jpeg,image/png" />
      <Button
        size="icon"
        variant="secondary"
        title="Create expense from receipt"
        onClick={openFileDialog}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Receipt className="w-4 h-4" />
        )}
      </Button>
    </>
  )
}
