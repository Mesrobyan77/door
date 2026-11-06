type ProfileComingSoonProps = {
  title: string;
  message: string;
};

export function ProfileComingSoon({ title, message }: ProfileComingSoonProps) {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8">
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
        {message}
      </p>
    </section>
  );
}
