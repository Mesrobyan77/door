export type TeamMember = {
  id: string;
  name: string;
  position: string;
  imageSrc: string;
};

/** Static marketing content — not loaded from the database. */
export const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    id: "1",
    name: "Mark Jance",
    position: "CEO/FOUNDER",
    imageSrc:
      "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
  },
  {
    id: "2",
    name: "Aviana Plummer",
    position: "CEO/FOUNDER",
    imageSrc:
      "https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
  },
  {
    id: "3",
    name: "Braydon Wilkerson",
    position: "CEO/FOUNDER",
    imageSrc:
      "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
  },
  {
    id: "4",
    name: "Kristin Watson",
    position: "CEO/FOUNDER",
    imageSrc:
      "https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
  },
  {
    id: "5",
    name: "Alex Morgan",
    position: "CTO/CO-FOUNDER",
    imageSrc:
      "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
  },
] as const;

export const ABOUT_HERO_IMAGE =
  "https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";
