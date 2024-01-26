import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash, X } from 'lucide-react'
import { useS3Upload } from 'next-s3-upload'
import Image from 'next/image'
import { useState } from 'react'

type Props = {
  documentUrls: string[]
  updateDocumentUrls: (documentUrls: string[]) => void
}

export function ExpenseDocumentsInput({
  documentUrls: documents,
  updateDocumentUrls: updateDocuments,
}: Props) {
  const [pending, setPending] = useState(false)
  const { FileInput, openFileDialog, uploadToS3 } = useS3Upload()

  const handleFileChange = async (file: File) => {
    setPending(true)
    let { url } = await uploadToS3(file)
    // setDocUrls(urls => [...urls, url])
    updateDocuments([...documents, url])
    setPending(false)
  }

  return (
    <div>
      <FileInput onChange={handleFileChange} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 [&_*]:aspect-square">
        {documents.map((url) => (
          <DocumentThumbnail
            key={url}
            document={url}
            deleteDocument={() => {
              updateDocuments(documents.filter((doc) => doc !== url))
            }}
          />
        ))}

        <div>
          <Button
            variant="secondary"
            type="button"
            onClick={openFileDialog}
            className="w-full h-full"
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Plus className="w-8 h-8" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DocumentThumbnail({
  document,
  deleteDocument,
}: {
  document: string
  deleteDocument: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Image
          width={300}
          height={300}
          className="object-contain border overflow-hidden rounded shadow-inner"
          src={document}
          alt=""
        />
      </DialogTrigger>
      <DialogContent className="p-4 w-fit max-w-full [&>:last-child]:hidden">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              deleteDocument()
              setOpen(false)
            }}
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete document
          </Button>
          <DialogClose asChild>
            <Button variant="ghost">
              <X className="w-4 h-4 mr-2" /> Close
            </Button>
          </DialogClose>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="object-contain w-[100vw] h-[100dvh] max-w-[calc(100vw-32px)] max-h-[calc(100dvh-32px-40px-16px)] sm:w-fit sm:h-fit sm:max-w-[calc(100vw-32px-32px)] sm:max-h-[calc(100dvh-32px-40px-32px)]"
          src={document}
          alt=""
        />
      </DialogContent>
    </Dialog>
  )
}
