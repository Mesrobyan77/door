import { notFound } from "next/navigation";

import { getCartWithItems } from "@/features/cart/cart";
import { getCheckoutDeliveryOptions } from "@/features/checkout/application/get-checkout-delivery";
import { getCheckoutOrderProducts } from "@/features/checkout/application/get-checkout-order-products";
import { CheckoutForm } from "@/features/checkout/ui/CheckoutForm";
import { getDefaultShippingAddress } from "@/features/profile/application/address-queries";
import { resolveProductPrices } from "@/features/promotions/application/resolve-product-prices";
import { getCurrentUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type CheckoutPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);
  const copy = dictionary.checkout;
  const [user, { items }, deliveryOptions] = await Promise.all([
    getCurrentUser(),
    getCartWithItems(),
    getCheckoutDeliveryOptions(),
  ]);
  const [defaultAddress, prices, orderProducts] = await Promise.all([
    user ? getDefaultShippingAddress(user.id) : Promise.resolve(null),
    resolveProductPrices(
      items.map(({ product }) => ({
        id: product.id,
        priceAmount: product.priceAmount,
        compareAtAmount: product.compareAtAmount,
      })),
    ),
    getCheckoutOrderProducts(rawLocale, items),
  ]);
  const subtotal = items.reduce((sum, { item, product }) => {
    const unit = prices.get(product.id)?.unitAmount ?? product.priceAmount;
    return sum + item.quantity * unit;
  }, 0);

  return (
    <CheckoutForm
      locale={rawLocale}
      productsHref={`/${rawLocale}/products`}
      hasItems={items.length > 0}
      orderProducts={orderProducts}
      defaultFirstName={
        defaultAddress?.recipientFirstName ?? user?.firstName ?? ""
      }
      defaultLastName={
        defaultAddress?.recipientLastName ?? user?.lastName ?? ""
      }
      defaultEmail={user?.email ?? ""}
      defaultPhone={defaultAddress?.phone ?? user?.phone ?? ""}
      defaultLine1={defaultAddress?.line1 ?? ""}
      subtotalAmount={subtotal}
      deliveryOptions={deliveryOptions}
      labels={{
        title: copy.title,
        titleLead: copy.titleLead,
        titleAccent: copy.titleAccent,
        productsInOrder: copy.productsInOrder,
        itemsOne: copy.itemsOne,
        itemsMany: copy.itemsMany,
        removeItem: copy.removeItem,
        contactInformation: copy.contactInformation,
        shippingMethod: copy.shippingMethod,
        shippingAddress: copy.shippingAddress,
        paymentMethod: copy.paymentMethod,
        orderSummary: copy.orderSummary,
        firstName: copy.form.firstName,
        lastName: copy.form.lastName,
        email: copy.form.email,
        phone: copy.form.phone,
        city: copy.form.city,
        address: copy.form.address,
        deliveryLocation: copy.form.deliveryLocation,
        selectLocation: copy.form.selectLocation,
        phonePlaceholder: copy.placeholders.phone,
        cityPlaceholder: copy.placeholders.city,
        addressPlaceholder: copy.placeholders.address,
        storePickup: copy.shipping.storePickup,
        storePickupDescription: copy.shipping.storePickupDescription,
        delivery: copy.shipping.delivery,
        deliveryDescription: copy.shipping.deliveryDescription,
        freePickup: copy.shipping.freePickup,
        enterCity: copy.shipping.enterCity,
        selectDeliveryLocation: copy.shipping.selectDeliveryLocation,
        cashOnDelivery: copy.payment.cashOnDelivery,
        cashShort: copy.payment.cashShort,
        cashOnDeliveryDescription: copy.payment.cashOnDeliveryDescription,
        cashChangeTitle: copy.payment.cashChange.title,
        cashChangeHint: copy.payment.cashChange.hint,
        cashChangeNone: copy.payment.cashChange.none,
        cashChangeCourier: copy.payment.cashChange.courierChange,
        idram: copy.payment.idram,
        idramDescription: copy.payment.idramDescription,
        card: copy.payment.card,
        cardDescription: copy.payment.cardDescription,
        couponTitle: copy.coupon.title,
        couponPlaceholder: copy.coupon.placeholder,
        couponApply: copy.coupon.apply,
        couponApplying: copy.coupon.applying,
        discount: copy.summary.discount,
        subtotal: copy.summary.subtotal,
        shipping: copy.summary.shipping,
        tax: copy.summary.tax,
        total: copy.summary.total,
        placeOrder: copy.buttons.placeOrder,
        processing: copy.buttons.processing,
        continueShopping: copy.buttons.continueShopping,
        cartEmpty: copy.errors.cartEmpty,
        cartEmptyDescription: copy.errors.cartEmptyDescription,
        cartEmptyCta: copy.errors.cartEmptyCta,
      }}
    />
  );
}
