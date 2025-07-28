'use client'

import { useEffect, useState } from 'react'
import { supabase } from '~/lib/supabase'

export default function SupabaseTestPage() {
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((messages) => [...messages, payload.new])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      <h1>Supabase Real-time Test</h1>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>{message.content}</li>
        ))}
      </ul>
    </div>
  )
}
