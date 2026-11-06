import type { Locale } from "@/lib/i18n/config";

import enAbout from "@/locales/en/about.json";
import enAuth from "@/locales/en/auth.json";
import enBlog from "@/locales/en/blog.json";
import enCart from "@/locales/en/cart.json";
import enCatalog from "@/locales/en/catalog.json";
import enCheckout from "@/locales/en/checkout.json";
import enCommon from "@/locales/en/common.json";
import enContact from "@/locales/en/contact.json";
import enHome from "@/locales/en/home.json";
import enProduct from "@/locales/en/product.json";
import enProfile from "@/locales/en/profile.json";
import enWishlist from "@/locales/en/wishlist.json";

import hyAbout from "@/locales/hy/about.json";
import hyAuth from "@/locales/hy/auth.json";
import hyBlog from "@/locales/hy/blog.json";
import hyCart from "@/locales/hy/cart.json";
import hyCatalog from "@/locales/hy/catalog.json";
import hyCheckout from "@/locales/hy/checkout.json";
import hyCommon from "@/locales/hy/common.json";
import hyContact from "@/locales/hy/contact.json";
import hyHome from "@/locales/hy/home.json";
import hyProduct from "@/locales/hy/product.json";
import hyProfile from "@/locales/hy/profile.json";
import hyWishlist from "@/locales/hy/wishlist.json";

import ruAbout from "@/locales/ru/about.json";
import ruAuth from "@/locales/ru/auth.json";
import ruBlog from "@/locales/ru/blog.json";
import ruCart from "@/locales/ru/cart.json";
import ruCatalog from "@/locales/ru/catalog.json";
import ruCheckout from "@/locales/ru/checkout.json";
import ruCommon from "@/locales/ru/common.json";
import ruContact from "@/locales/ru/contact.json";
import ruHome from "@/locales/ru/home.json";
import ruProduct from "@/locales/ru/product.json";
import ruProfile from "@/locales/ru/profile.json";
import ruWishlist from "@/locales/ru/wishlist.json";

type LocaleNamespaces = {
  common: typeof hyCommon;
  home: typeof hyHome;
  contact: typeof hyContact;
  about: typeof hyAbout;
  auth: typeof hyAuth;
  profile: typeof hyProfile;
  checkout: typeof hyCheckout;
  cart: typeof hyCart;
  product: typeof hyProduct;
  blog: typeof hyBlog;
  catalog: typeof hyCatalog;
  wishlist: typeof hyWishlist;
};

function buildDictionary(namespaces: LocaleNamespaces) {
  return {
    brand: namespaces.common.brand,
    nav: namespaces.common.nav,
    header: namespaces.common.header,
    footer: namespaces.common.footer,
    home: namespaces.home,
    contact: namespaces.contact,
    about: namespaces.about,
    auth: namespaces.auth,
    profile: namespaces.profile,
    checkout: namespaces.checkout,
    cartDrawer: namespaces.cart,
    product: namespaces.product,
    blog: namespaces.blog,
    catalog: namespaces.catalog,
    wishlist: namespaces.wishlist,
  } as const;
}

const dictionaries = {
  hy: buildDictionary({
    common: hyCommon,
    home: hyHome,
    contact: hyContact,
    about: hyAbout,
    auth: hyAuth,
    profile: hyProfile,
    checkout: hyCheckout,
    cart: hyCart,
    product: hyProduct,
    blog: hyBlog,
    catalog: hyCatalog,
    wishlist: hyWishlist,
  }),
  en: buildDictionary({
    common: enCommon,
    home: enHome,
    contact: enContact,
    about: enAbout,
    auth: enAuth,
    profile: enProfile,
    checkout: enCheckout,
    cart: enCart,
    product: enProduct,
    blog: enBlog,
    catalog: enCatalog,
    wishlist: enWishlist,
  }),
  ru: buildDictionary({
    common: ruCommon,
    home: ruHome,
    contact: ruContact,
    about: ruAbout,
    auth: ruAuth,
    profile: ruProfile,
    checkout: ruCheckout,
    cart: ruCart,
    product: ruProduct,
    blog: ruBlog,
    catalog: ruCatalog,
    wishlist: ruWishlist,
  }),
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
