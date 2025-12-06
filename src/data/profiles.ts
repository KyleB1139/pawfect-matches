export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  image: string;
  dog: {
    name: string;
    breed: string;
    age: number;
    friendly: boolean;
    friendlyWith: string[];
  };
}

import profile1 from "@/assets/profile-1.jpg";
import profile2 from "@/assets/profile-2.jpg";
import profile3 from "@/assets/profile-3.jpg";

export const mockProfiles: Profile[] = [
  {
    id: "1",
    name: "Emma",
    age: 28,
    bio: "Coffee lover, trail runner, and proud dog mom. Looking for someone to share sunset walks and dog park adventures 🐕",
    location: "Brooklyn, NY",
    image: profile1,
    dog: {
      name: "Max",
      breed: "Golden Retriever",
      age: 3,
      friendly: true,
      friendlyWith: ["All dogs", "Cats", "Kids"],
    },
  },
  {
    id: "2",
    name: "Jake",
    age: 32,
    bio: "Software engineer by day, dog dad 24/7. Love hiking, photography, and teaching Luna new tricks.",
    location: "Austin, TX",
    image: profile2,
    dog: {
      name: "Luna",
      breed: "Border Collie",
      age: 2,
      friendly: true,
      friendlyWith: ["Active dogs", "Herding breeds"],
    },
  },
  {
    id: "3",
    name: "Sophie",
    age: 26,
    bio: "Foodie, bookworm, and couch potato extraordinaire. Bruno and I are looking for cuddle buddies!",
    location: "Seattle, WA",
    image: profile3,
    dog: {
      name: "Bruno",
      breed: "French Bulldog",
      age: 4,
      friendly: true,
      friendlyWith: ["Small dogs", "Calm dogs"],
    },
  },
];
