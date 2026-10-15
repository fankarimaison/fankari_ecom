"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore, viewKey, type View } from "@/lib/store";
import { Header } from "./header";
import { Footer } from "./footer";
import { CartDrawer } from "./cart-drawer";
import { HomeView } from "./views/home";
import { ProductDetailView } from "./views/product-detail";
import { CartView } from "./views/cart-view";
import { CheckoutView } from "./views/checkout";
import { OrderSuccessView } from "./views/order-success";
import { AccountView } from "./views/account";
import { TrackView } from "./views/track";
import { AdminView } from "./views/admin";

/**
 * Root of the single-page storefront. Header, footer and bag drawer are
 * shared; the main region swaps views client-side with a soft fade.
 */
export function StoreApp() {
  const view = useStore((s) => s.view);

  // New view → start from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewKey(view)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ViewSwitch view={view} />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

function ViewSwitch({ view }: { view: View }) {
  switch (view.name) {
    case "home":
      return <HomeView />;
    case "product":
      return <ProductDetailView key={view.productId} productId={view.productId} />;
    case "cart":
      return <CartView />;
    case "checkout":
      return <CheckoutView />;
    case "order-success":
      return <OrderSuccessView orderId={view.orderId} />;
    case "account":
      return <AccountView />;
    case "track":
      return <TrackView key={view.orderNumber ?? ""} orderNumber={view.orderNumber} email={view.email} />;
    case "admin":
      return <AdminView tab={view.tab} />;
    default:
      return <HomeView />;
  }
}
