'use client'
import { sendFeedback } from '@/components/feedback-button/feedback-button-actions'
import { formSchema } from '@/components/feedback-button/feedback-button-common'
import { Button, ButtonProps } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useMediaQuery } from '@/lib/hooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { Heart, HeartIcon, Loader2, MessageCircle } from 'lucide-react'
import { PropsWithChildren, ReactNode, SetStateAction, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

type FormValues = z.infer<typeof formSchema>

type Props = {
  donationUrl: string
  defaultTab?: 'feedback' | 'support'
}

export function FeedbackModal({
  donationUrl,
  defaultTab = 'feedback',
  children,
}: PropsWithChildren<Props>) {
  const { toast } = useToast()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)

  async function onSubmit(values: FormValues) {
    await sendFeedback(values)
    toast({
      title: 'Thank you for your feedback!',
      description:
        'We will have a look at it as soon as possible, and will get back to you if needed.',
    })
  }

  const Wrapper = isDesktop ? FeedbackDialog : FeedbackDrawer

  return (
    <Wrapper open={open} setOpen={setOpen} button={children}>
      <FeedbackContent
        onSubmit={async (values) => {
          await onSubmit(values)
          setOpen(false)
        }}
        donationUrl={donationUrl}
        defaultTab={defaultTab}
      />
    </Wrapper>
  )
}

function FeedbackDrawer({
  children,
  open,
  setOpen,
  button,
}: PropsWithChildren<{
  open: boolean
  setOpen: (open: SetStateAction<boolean>) => void
  button: ReactNode
}>) {
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{button}</DrawerTrigger>
      <DrawerContent>
        <div className="p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}

function FeedbackDialog({
  children,
  open,
  setOpen,
  button,
}: PropsWithChildren<{
  open: boolean
  setOpen: (open: SetStateAction<boolean>) => void
  button: ReactNode
}>) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent>
        <div className="pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

function FeedbackContent({
  onSubmit,
  donationUrl,
  defaultTab,
}: {
  onSubmit: (values: FormValues) => Promise<void>
  donationUrl: string
  defaultTab: 'feedback' | 'support'
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <div className="mt-2 mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feedback">Give feedback</TabsTrigger>
          <TabsTrigger value="support">Support us</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="feedback">
        <FeedbackForm onSubmit={onSubmit} />
      </TabsContent>
      <TabsContent value="support">
        <DonationForm donationUrl={donationUrl} />
      </TabsContent>
    </Tabs>
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
        <div>
          <h2 className="text-lg font-semibold leading-none tracking-tight pb-1.5">
            Give us your feedback
          </h2>
          <p className="text-sm text-muted-foreground">
            We are always working to improve the user experience, and your
            feedback helps us a lot.
          </p>
        </div>
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
        <div className="text-center mt-1">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" /> Send
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function DonationForm({ donationUrl }: { donationUrl: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold leading-none tracking-tight pb-1.5">
          Support us
        </h2>
        <p className="text-sm text-muted-foreground">
          Help keep <strong>Spliit</strong> free and without ads!
        </p>
      </div>
      <div className="prose prose-sm dark:prose-invert">
        <p>
          Spliit is offered for free, but costs money and energy. If you like
          the app, you can choose to support it by buying me (Sebastien) a
          coffee with a one-time small donation.
        </p>
        <p>By supporting Spliit:</p>
        <ul>
          <li>
            You contribute to the <strong>hosting costs</strong> for the app
            (currently ~$150/year).
          </li>
          <li>
            You help us keeping the application{' '}
            <strong>free and without ads</strong>.
          </li>
          <li>
            You give me energy to build <strong>new features</strong> and
            improve the application.
          </li>
        </ul>
        <p>
          You will be redirected to <strong>Stripe</strong>, our payment
          provider, where you can choose an amount to donate and complete the
          payment.
        </p>
      </div>
      <div className="text-center">
        <Button
          asChild
          className="bg-pink-700 hover:bg-pink-600 dark:bg-pink-500 dark:hover:bg-pink-600"
        >
          <a href={donationUrl} target="_blank">
            <Heart className="w-4 h-4 mr-2" /> Support us
          </a>
        </Button>
      </div>
    </div>
  )
}

export function FeedbackButton({ ...props }: ButtonProps) {
  return (
    <Button
      className="bg-pink-700 hover:bg-pink-600 dark:bg-pink-500 dark:hover:bg-pink-600 fixed right-0 bottom-4 rounded-r-none gap-2"
      {...props}
    >
      <MessageCircle className="w-4 h-4" />
      <HeartIcon className="w-4 h-4" />
    </Button>
  )
}
