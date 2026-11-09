import type { Locale } from '@/lib/i18n/config';

import enAbout from '@/locales/en/about.json';
import enAdmin from '@/locales/en/admin.json';
import enAuth from '@/locales/en/auth.json';
import enBlog from '@/locales/en/blog.json';
import enCart from '@/locales/en/cart.json';
import enCatalog from '@/locales/en/catalog.json';
import enCheckout from '@/locales/en/checkout.json';
import enCommon from '@/locales/en/common.json';
import enContact from '@/locales/en/contact.json';
import enHome from '@/locales/en/home.json';
import enLegal from '@/locales/en/legal.json';
import enProduct from '@/locales/en/product.json';
import enProfile from '@/locales/en/profile.json';
import enWishlist from '@/locales/en/wishlist.json';

import hyAbout from '@/locales/hy/about.json';
import hyAdmin from '@/locales/hy/admin.json';
import hyAuth from '@/locales/hy/auth.json';
import hyBlog from '@/locales/hy/blog.json';
import hyCart from '@/locales/hy/cart.json';
import hyCatalog from '@/locales/hy/catalog.json';
import hyCheckout from '@/locales/hy/checkout.json';
import hyCommon from '@/locales/hy/common.json';
import hyContact from '@/locales/hy/contact.json';
import hyHome from '@/locales/hy/home.json';
import hyLegal from '@/locales/hy/legal.json';
import hyProduct from '@/locales/hy/product.json';
import hyProfile from '@/locales/hy/profile.json';
import hyWishlist from '@/locales/hy/wishlist.json';

import ruAbout from '@/locales/ru/about.json';
import ruAdmin from '@/locales/ru/admin.json';
import ruAuth from '@/locales/ru/auth.json';
import ruBlog from '@/locales/ru/blog.json';
import ruCart from '@/locales/ru/cart.json';
import ruCatalog from '@/locales/ru/catalog.json';
import ruCheckout from '@/locales/ru/checkout.json';
import ruCommon from '@/locales/ru/common.json';
import ruContact from '@/locales/ru/contact.json';
import ruHome from '@/locales/ru/home.json';
import ruLegal from '@/locales/ru/legal.json';
import ruProduct from '@/locales/ru/product.json';
import ruProfile from '@/locales/ru/profile.json';
import ruWishlist from '@/locales/ru/wishlist.json';

type LocaleNamespaces = {
  admin: typeof hyAdmin;
  common: typeof hyCommon;
  home: typeof hyHome;
  legal: typeof hyLegal;
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
    admin: namespaces.admin,
    brand: namespaces.common.brand,
    design: namespaces.common.design,
    nav: namespaces.common.nav,
    header: namespaces.common.header,
    footer: namespaces.common.footer,
    home: namespaces.home,
    legal: namespaces.legal,
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
    admin: hyAdmin,
    common: hyCommon,
    home: hyHome,
    legal: hyLegal,
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
    admin: enAdmin,
    common: enCommon,
    home: enHome,
    legal: enLegal,
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
    admin: ruAdmin,
    common: ruCommon,
    home: ruHome,
    legal: ruLegal,
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
