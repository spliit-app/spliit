'use client'
import { SubmitButton } from '@/components/submit-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { getComment, getGroup } from '@/lib/api'
import { useActiveUser } from '@/lib/hooks'
import { CommentFormValues, commentFormSchema } from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useForm } from 'react-hook-form'

export type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  comment?: NonNullable<Awaited<ReturnType<typeof getComment>>>
  onSubmit: (values: CommentFormValues, participantId: string) => Promise<void>
}

export function CommentForm({ group, comment, onSubmit }: Props) {
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
  })

  const submit = async (values: CommentFormValues) => {
    return onSubmit(values, activeUserId!)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card>
          <CardHeader>
            <CardTitle>Add Comment</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-1 gap-6">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem className="sm:order-6">
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Textarea
                      className="text-base"
                      {...field}
                      placeholder="Enter your comment"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div>
              <SubmitButton
                loadingContent={isCreate ? <>Adding</> : <>Saving…</>}
              >
                <Save className="w-4 h-4 mr-2" />
                {isCreate ? <>Add Comment</> : <>Save Comment</>}
              </SubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
