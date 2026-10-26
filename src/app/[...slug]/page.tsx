import { Providers } from '@/components/providers'
import { StoreApp } from '@/components/store/store-app'

/**
 * Every other storefront URL (/about, /product/<id>, /admin/orders…) renders
 * the same single-page shop as app/page.tsx; StoreApp picks the view from the path.
 */
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return (
    <Providers>
      <StoreApp initialPath={`/${slug.join('/')}`} />
    </Providers>
  )
}
