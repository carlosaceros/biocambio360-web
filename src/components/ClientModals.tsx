'use client';

import dynamic from 'next/dynamic';

const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false });
const DiscountWheelModal = dynamic(() => import('@/components/DiscountWheelModal'), { ssr: false });
const FirstPurchaseModal = dynamic(() => import('@/components/FirstPurchaseModal'), { ssr: false });
const RecentSalesNotification = dynamic(() => import('@/components/RecentSalesNotification'), { ssr: false });

export default function ClientModals() {
  return (
    <>
      <CartDrawer />
      <DiscountWheelModal />
      <FirstPurchaseModal />
      <RecentSalesNotification />
    </>
  );
}
