'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { Drawer } from 'vaul'

type Props = {
  children: ReactNode
  title: ReactNode
}

export function ExpenseModal(props: Props) {
  const size = useTailwindBreakpoint()
  if (size === 'xs') {
    return <ExpenseVaul {...props} />
  } else {
    return <ExpenseDialog {...props} />
  }
}

export function ExpenseDialog({ children, title }: Props) {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent className="w-full max-w-screen-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function ExpenseVaul({ children, title }: Props) {
  const router = useRouter()
  return (
    <Drawer.Root open onClose={() => router.back()}>
      <Drawer.Portal>
        <Drawer.Title>{title}</Drawer.Title>
        <Drawer.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Drawer.Content className="bg-background border flex flex-col rounded-t-[10px] max-h-[90dvh] mt-24 fixed bottom-0 left-0 right-0 z-50">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 mt-4"></div>
          <div className="text-xl font-bold p-4">{title}</div>
          <div className="flex-1 overflow-y-auto p-4 pt-0">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function useTailwindBreakpoint() {
  const [size, setSize] = useState<'xs' | 'sm' | 'md' | 'lg'>('xs')

  useEffect(() => {
    const handleBreakpointChange = () => {
      if (window.innerWidth >= 1200) {
        setSize('lg')
      } else if (window.innerWidth >= 768) {
        setSize('md')
      } else if (window.innerWidth >= 640) {
        setSize('sm')
      } else {
        setSize('xs')
      }
    }

    window.addEventListener('resize', handleBreakpointChange)
    handleBreakpointChange()

    return () => {
      window.removeEventListener('resize', handleBreakpointChange)
    }
  }, [])

  return size
}
