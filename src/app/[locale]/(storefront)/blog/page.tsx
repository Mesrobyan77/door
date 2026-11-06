import Image from "next/image";
import { notFound } from "next/navigation";

import { AppLink } from "@/components/ui/AppLink";
import { listPublishedBlogPosts } from "@/features/blog/application/queries";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type BlogPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);
  const posts = await listPublishedBlogPosts(rawLocale);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {dictionary.nav.blog}
      </h1>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex flex-col gap-4 border p-4 sm:flex-row"
          >
            {post.coverUrl ? (
              <AppLink
                href={`/${rawLocale}/blog/${post.copy.slug}`}
                prefetchPolicy="auto"
                className="relative block h-40 w-full shrink-0 overflow-hidden sm:h-28 sm:w-40"
              >
                <Image
                  src={post.coverUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 160px"
                  className="object-cover"
                />
              </AppLink>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-medium">
                <AppLink
                  href={`/${rawLocale}/blog/${post.copy.slug}`}
                  prefetchPolicy="auto"
                  className="underline-offset-2 hover:underline"
                >
                  {post.copy.title}
                </AppLink>
              </h2>
              {post.publishedAt ? (
                <p className="text-sm text-[var(--muted)]">
                  {post.publishedAt.slice(0, 10)}
                </p>
              ) : null}
              {post.copy.excerpt ? (
                <p className="mt-2 text-[var(--muted)]">{post.copy.excerpt}</p>
              ) : null}
            </div>
          </article>
        ))}
        {posts.length === 0 ? (
          <p className="text-[var(--muted)]">{dictionary.blog.empty}</p>
        ) : null}
      </div>
    </section>
  );
}
