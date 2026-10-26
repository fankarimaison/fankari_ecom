import { Providers } from '@/components/providers'
import { StoreApp } from '@/components/store/store-app'

/** Home — the single-page shop. Other paths (/about…) go through [...slug]. */
export default function Home() {
  return (
    <Providers>
      <StoreApp initialPath="/" />
    </Providers>
  )
}
