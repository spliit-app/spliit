'use client'
import { formSchema } from '@/components/feedback-button/feedback-button-common'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useMediaQuery } from '@/lib/hooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

type FormValues = z.infer<typeof formSchema>

type Props = {
  sendFeedback: (values: FormValues) => Promise<void>
}

export function FeedbackButtonClient({ sendFeedback }: Props) {
  const { toast } = useToast()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  async function onSubmit(values: FormValues) {
    await sendFeedback(values)
    toast({
      title: 'Thank you for your feedback!',
      description:
        'We will have a look at it as soon as possible, and will get back to you if needed.',
    })
  }

  return (
    <div className="fixed right-4 bottom-4">
      {isDesktop ? (
        <FeedbackDialog onSubmit={onSubmit} />
      ) : (
        <FeedbackDrawer onSubmit={onSubmit} />
      )}
    </div>
  )
}

function FeedbackDrawer({
  onSubmit,
}: {
  onSubmit: (values: FormValues) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed right-4 bottom-4">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button>
            <MessageCircle className="w-4 h-4 mr-2" /> Feedback
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Give us your feedback!</DrawerTitle>
            <DrawerDescription>
              We are always working to improve the user experience, and your
              feedback helps us a lot.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <FeedbackForm
              onSubmit={async (values) => {
                await onSubmit(values)
                setOpen(false)
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function FeedbackDialog({
  onSubmit,
}: {
  onSubmit: (values: FormValues) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed right-4 bottom-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <MessageCircle className="w-4 h-4 mr-2" /> Feedback
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give us your feedback!</DialogTitle>
            <DialogDescription>
              We are always working to improve the user experience, and your
              feedback helps us a lot.
            </DialogDescription>
          </DialogHeader>
          <FeedbackForm
            onSubmit={async (values) => {
              await onSubmit(values)
              setOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FeedbackForm({
  onSubmit,
}: {
  onSubmit: (values: FormValues) => Promise<void>
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', message: '' },
  })

  const isSubmitting = form.formState.isSubmitting
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your email address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="your@email.com"
                    className="text-base"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Optional. Provide it if you want us to get back to you.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your feedback</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your feedback"
                    className="text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
            </>
          ) : (
            <>Submit</>
          )}
        </Button>
      </form>
    </Form>
  )
}
