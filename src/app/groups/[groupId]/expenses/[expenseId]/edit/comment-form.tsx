'use client'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { getComment, getGroup } from '@/lib/api'
import { useActiveUser, useMediaQuery } from '@/lib/hooks'
import { CommentFormValues, commentFormSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

export type ModalProps = {
  isOpen: boolean
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  comment?: NonNullable<Awaited<ReturnType<typeof getComment>>>
  onCreate: (values: CommentFormValues, participantId: string) => Promise<void>
  onUpdate: (values: CommentFormValues, commentId: string) => Promise<void>
  onCancel: () => void
  updateOpen: (open: boolean) => void
}

export type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  comment?: NonNullable<Awaited<ReturnType<typeof getComment>>>
  onCreate: (values: CommentFormValues, participantId: string) => Promise<void>
  onUpdate: (values: CommentFormValues, commentId: string) => Promise<void>
  onCancel: () => void
  className?: string
}

export function CommentModal({
  isOpen,
  group,
  comment,
  onCreate,
  onUpdate,
  onCancel,
  updateOpen,
}: ModalProps) {
  const t = useTranslations('ExpenseComments')
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const dialogTitle = comment ? t('editComment') : t('addComment')

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={updateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <CommentForm
            group={group}
            comment={comment}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onCancel={onCancel}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={updateOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{dialogTitle}</DrawerTitle>
        </DrawerHeader>
        <CommentForm
          group={group}
          comment={comment}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onCancel={onCancel}
          className="px-4"
        />
      </DrawerContent>
    </Drawer>
  )
}

export function CommentForm({
  group,
  comment,
  onCreate,
  onUpdate,
  onCancel,
  className,
}: Props) {
  const t = useTranslations('ExpenseComments')
  const isCreate = comment === undefined
  const activeUserId = useActiveUser(group.id)

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: comment
      ? {
          comment: comment.comment,
        }
      : {
          comment: '',
        },
    values: comment ? { comment: comment.comment } : { comment: '' },
  })

  const submit = async (values: CommentFormValues) => {
    if (comment) {
      return onUpdate(values, comment!.id)
    } else {
      return onCreate(values, activeUserId!)
    }
  }

  return activeUserId == 'none' ? (
    <div>{t('noActiveParticipant')}</div>
  ) : (
    <Form {...form}>
      <form
        className={cn('grid items-start gap-4', className)}
        onSubmit={form.handleSubmit(submit)}
      >
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => {
            return (
              <FormItem className="sm:order-1">
                <FormControl>
                  <Textarea
                    className="text-base"
                    {...field}
                    placeholder={t('commentPlaceholder')}
                  />
                </FormControl>
              </FormItem>
            )
          }}
        />
        <div className="sm:order-2">
          <SubmitButton
            loadingContent={isCreate ? t('addingCaption') : t('savingCaption')}
          >
            <Save className="w-4 h-4 mr-2" />
            {isCreate ? t('addCaption') : t('saveCaption')}
          </SubmitButton>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
