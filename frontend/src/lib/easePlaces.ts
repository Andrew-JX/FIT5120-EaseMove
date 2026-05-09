export interface EasePlacesFeature {
  id: string;
  name: string;
  category: "Arts, Culture & Enrichment" | "Recreation / Leisure & Open Spaces" | "Shopping";
  type: string;
  airConditioned: boolean;
  freeEntry: boolean;
  address: string;
  operatingHours: string;
  lat: number;
  lng: number;
}

export const EASE_PLACES_DATA: EasePlacesFeature[] = [
  {
    id: "cp-1",
    name: "ACMI",
    category: "Arts, Culture & Enrichment",
    type: "Cinema",
    airConditioned: true,
    freeEntry: false,
    address: "Federation Square, Melbourne VIC 3000",
    operatingHours: "Mon-Sun 10:00 am - 5:00 pm",
    lat: -37.818,
    lng: 144.969,
  },
  {
    id: "cp-2",
    name: "Melbourne Museum",
    category: "Arts, Culture & Enrichment",
    type: "Museum",
    airConditioned: true,
    freeEntry: false,
    address: "11 Nicholson St, Carlton VIC 3053",
    operatingHours: "Mon-Sun 10:00 am - 5:00 pm",
    lat: -37.803,
    lng: 144.9716,
  },
  {
    id: "cp-3",
    name: "State Library Victoria",
    category: "Arts, Culture & Enrichment",
    type: "Library",
    airConditioned: true,
    freeEntry: true,
    address: "328 Swanston St, Melbourne VIC 3000",
    operatingHours: "Mon-Thu 10:00 am - 9:00 pm | Fri-Sun 10:00 am - 6:00 pm",
    lat: -37.81,
    lng: 144.9647,
  },
  {
    id: "cp-4",
    name: "Birrarung Marr",
    category: "Recreation / Leisure & Open Spaces",
    type: "Park",
    airConditioned: false,
    freeEntry: true,
    address: "Batman Ave, Melbourne VIC 3000",
    operatingHours: "Open 24 hours",
    lat: -37.8195,
    lng: 144.9738,
  },
  {
    id: "cp-5",
    name: "Royal Botanic Gardens",
    category: "Recreation / Leisure & Open Spaces",
    type: "Botanical Garden",
    airConditioned: false,
    freeEntry: true,
    address: "Birdwood Ave, South Yarra VIC 3141",
    operatingHours: "Mon-Sun 7:30 am - Sunset",
    lat: -37.8304,
    lng: 144.9796,
  },
  {
    id: "cp-6",
    name: "Melbourne Central",
    category: "Shopping",
    type: "Shopping Centre",
    airConditioned: true,
    freeEntry: true,
    address: "211 La Trobe St, Melbourne VIC 3000",
    operatingHours: "Mon-Thu 10:00 am - 7:00 pm | Fri 10:00 am - 9:00 pm | Sat-Sun 10:00 am - 6:00 pm",
    lat: -37.8102,
    lng: 144.9629,
  },
];

export function easePlacesMarkerColor(category: string): { core: string; halo: string } {
  if (category.includes("Arts")) return { core: "#6a5ca5", halo: "rgba(106,92,165,0.22)" };
  if (category.includes("Recreation")) return { core: "#1f9d68", halo: "rgba(31,157,104,0.22)" };
  return { core: "#d975a4", halo: "rgba(217,117,164,0.22)" };
}
