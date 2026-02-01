'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function DeleteGroupDialog({
  groupId,
  open,
  onOpenChange,
  onSuccess,
}: {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations('Groups')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDocuments, setDeleteDocuments] = useState(false)
  const [documentCount, setDocumentCount] = useState<number | null>(null)

  const documentCountQuery = trpc.groups.getDocumentCount.useQuery(
    { groupId },
    { enabled: open },
  )

  useEffect(() => {
    if (documentCountQuery.data !== undefined) {
      setDocumentCount(documentCountQuery.data)
    }
  }, [documentCountQuery.data])

  const deleteGroupMutation = trpc.groups.delete.useMutation({
    onSuccess: () => {
      setIsDeleting(false)
      onOpenChange(false)

      toast.toast({
        title: 'Group deleted',
        description: 'The group has been permanently deleted.',
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/groups')
      }
    },
    onError: (error) => {
      setIsDeleting(false)
      toast.toast({
        title: 'Error',
        description: error.message || 'Failed to delete group',
        variant: 'destructive',
      })
    },
  })

  const handleDelete = async () => {
    setIsDeleting(true)
    await deleteGroupMutation.mutateAsync({
      groupId,
      deleteDocuments,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('DeleteGroupDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('DeleteGroupDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {documentCount !== null && documentCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
            <p className="font-medium text-amber-900 mb-2">
              {t('Groups.DeleteGroupDialog.documentWarning.title', {
                count: documentCount,
              })}
            </p>
            <p className="text-amber-800 text-xs mb-3">
              {t('Groups.DeleteGroupDialog.documentWarning.description')}
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteDocuments}
                onChange={(e) => setDeleteDocuments(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-amber-900">
                {t('Groups.DeleteGroupDialog.documentWarning.checkbox')}
              </span>
            </label>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Link href={`/groups/${groupId}/backup/export`} target="_blank">
            <Button variant="outline">{t('DeleteGroupDialog.backup')}</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t('DeleteGroupDialog.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('DeleteGroupDialog.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
