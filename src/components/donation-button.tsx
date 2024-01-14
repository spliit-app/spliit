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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useMediaQuery } from '@/lib/hooks'
import { Heart } from 'lucide-react'
import { useState } from 'react'

type Props = {
  donationUrl: string
}

export function DonationButton({ donationUrl }: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  return isDesktop ? (
    <DonationDialog donationUrl={donationUrl} />
  ) : (
    <DonationDrawer donationUrl={donationUrl} />
  )
}

function DonationDrawer({ donationUrl }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="bg-pink-700 hover:bg-pink-600">
          <Heart className="w-4 h-4 mr-2" /> Support us
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Support us</DrawerTitle>
          <DrawerDescription>
            Help keep <strong>Spliit</strong> free and without ads!
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <DonationForm donationUrl={donationUrl} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function DonationDialog({ donationUrl }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-pink-700 hover:bg-pink-600">
          <Heart className="w-4 h-4 mr-2" /> Support us
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Support us</DialogTitle>
          <DialogDescription>
            Help keep <strong>Spliit</strong> free and without ads!
          </DialogDescription>
        </DialogHeader>
        <DonationForm donationUrl={donationUrl} />
      </DialogContent>
    </Dialog>
  )
}

function DonationForm({ donationUrl }: Props) {
  return (
    <>
      <div className="prose prose-sm">
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
      <div className="mt-4 text-center">
        <Button asChild className="bg-pink-700 hover:bg-pink-600">
          <a href={donationUrl} target="_blank">
            <Heart className="w-4 h-4 mr-2" /> Support us
          </a>
        </Button>
      </div>
    </>
  )
}
