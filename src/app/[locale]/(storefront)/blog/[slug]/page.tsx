import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getEnv } from "@/config/env";
import { getPublishedBlogPostBySlug } from "@/features/blog/application/queries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { sanitizeBlogHtml } from "@/lib/sanitize/html";

type BlogPostPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

function buildBlogPostingJsonLd(input: {
  locale: Locale;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt: string | null;
}): Record<string, string> {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const url = `${appUrl}/${input.locale}/blog/${input.slug}`;

  const jsonLd: Record<string, string> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    url,
    mainEntityOfPage: url,
  };

  if (input.excerpt) {
    jsonLd.description = input.excerpt;
  }

  if (input.publishedAt) {
    jsonLd.datePublished = input.publishedAt;
  }

  return jsonLd;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;

  if (!isLocale(rawLocale)) {
    return {};
  }

  const post = await getPublishedBlogPostBySlug(rawLocale, slug);
  if (!post) {
    return {};
  }

  const title = post.copy.seoTitle ?? post.copy.title;
  const description = post.copy.seoDescription ?? post.copy.excerpt;
  const canonicalPath = `/${rawLocale}/blog/${post.copy.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalPath,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale: rawLocale, slug } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const post = await getPublishedBlogPostBySlug(rawLocale, slug);
  if (!post) {
    notFound();
  }

  if (post.copy.slug !== slug) {
    redirect(`/${rawLocale}/blog/${post.copy.slug}`);
  }

  const dictionary = getDictionary(rawLocale);
  const sanitizedContent = sanitizeBlogHtml(post.copy.content);
  const jsonLd = buildBlogPostingJsonLd({
    locale: rawLocale,
    slug: post.copy.slug,
    title: post.copy.title,
    excerpt: post.copy.excerpt,
    publishedAt: post.publishedAt,
  });

  return (
    <article className="flex flex-col gap-6">
      <p className="text-sm text-[var(--muted)]">
        <Link href={`/${rawLocale}/blog`} className="underline">
          {dictionary.nav.blog}
        </Link>
      </p>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {post.copy.title}
        </h1>
        {post.publishedAt ? (
          <time
            dateTime={post.publishedAt}
            className="text-sm text-[var(--muted)]"
          >
            {post.publishedAt.slice(0, 10)}
          </time>
        ) : null}
        {post.copy.excerpt ? (
          <p className="text-lg text-[var(--muted)]">{post.copy.excerpt}</p>
        ) : null}
      </header>

      {post.coverUrl ? (
        <div className="relative h-[28rem] w-full overflow-hidden">
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      <div
        className="prose max-w-none flex flex-col gap-3"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      {post.tags.length > 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {dictionary.blog.tags}: {post.tags.join(", ")}
        </p>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
    </article>
  );
}
