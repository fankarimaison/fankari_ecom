'use client'

import { Providers } from '@/components/providers'
import { StoreApp } from '@/components/store/store-app'

export default function Home() {
  return (
    <Providers>
      <StoreApp />
    </Providers>
  )
}
