import Image from "next/image";

import { TEAM_MEMBERS } from "@/features/about/content/team-members";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type AboutTeamProps = {
  copy: Dictionary["about"];
};

export function AboutTeam({ copy }: AboutTeamProps) {
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-semibold tracking-wider text-[#7CB342] uppercase md:text-base">
            {copy.teamEyebrow}
          </p>
          <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl lg:text-6xl">
            {copy.teamTitle}
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
            {copy.teamDescription}
          </p>
        </div>

        <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TEAM_MEMBERS.map((member, index) => (
            <li key={member.id} className="text-center">
              <div className="relative mx-auto mb-4 aspect-square w-full max-w-[220px] overflow-hidden rounded-lg bg-gray-200">
                <Image
                  src={member.imageSrc}
                  alt={member.name}
                  fill
                  sizes="220px"
                  className="object-cover"
                  loading={index < 2 ? "eager" : "lazy"}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {member.name}
              </h3>
              <p className="text-sm tracking-wide text-gray-500 uppercase">
                {member.position}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
