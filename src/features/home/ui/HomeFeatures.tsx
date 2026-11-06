type FeatureItem = {
  title: string;
  description: string;
};

type HomeFeaturesProps = {
  items: readonly FeatureItem[];
};

export function HomeFeatures({ items }: HomeFeaturesProps) {
  return (
    <section className="border-y border-gray-200 bg-white py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.title} className="text-center">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              {item.title}
            </h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
