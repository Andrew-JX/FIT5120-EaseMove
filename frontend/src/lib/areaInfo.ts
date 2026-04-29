export type AreaTag = {
  icon: string;
  label: string;
};

export type ComfortRoute = {
  title: string;
  description: string;
};

export type AreaInfo = {
  id: string;
  name: string;
  heroBlurb: string;
  description: string;
  recommendations: string[];
  tags: AreaTag[];
  comfortRoutes: ComfortRoute[];
};

export const AREA_INFO: AreaInfo[] = [
  {
    id: "docklands",
    name: "Docklands",
    heroBlurb:
      "A breezier inner-city edge with open space, waterfront views, and easier movement than the busiest central blocks.",
    description:
      "Docklands feels spacious, modern, and easy to move through. Compared with the tighter, busier laneways of central Melbourne, it offers broader footpaths, calmer circulation, more visible sky, and a cleaner waterfront rhythm. That makes it especially appealing for visitors who want a more relaxed walking or cycling experience without giving up city convenience, tram access, or places to stop along the way.",
    recommendations: [
      "Library at The Dock - A calm waterfront library and community hub that works well for a quiet reset, study break, or indoor stop on warmer days.",
      "Victoria Harbour Promenade - A scenic waterside route with wide walking space, marina views, and fresh air that feels much less compressed than the inner CBD.",
      "The District Docklands - A practical mix of food, shopping, and indoor comfort if you want a low-stress place to browse or cool down.",
      "Marvel Stadium - A major event landmark that gives the area energy and makes Docklands feel connected to contemporary city life.",
      "Ron Barassi Snr Park - An open green space that adds breathing room and gives visitors somewhere to pause away from crowds.",
    ],
    tags: [
      { icon: "🌊", label: "Waterfront breezes" },
      { icon: "🚋", label: "Easy tram access" },
      { icon: "🚶", label: "Wide footpaths" },
      { icon: "🌤️", label: "Open-sky feel" },
      { icon: "🧘", label: "Low-stress movement" },
      { icon: "🏙️", label: "Modern city edge" },
    ],
    comfortRoutes: [
      {
        title: "Library at The Dock → Victoria Harbour",
        description:
          "A short, breezy walk that combines a calm indoor stop with open waterfront space and easy orientation.",
      },
      {
        title: "Ron Barassi Snr Park Loop",
        description:
          "A relaxed walking or cycling option for anyone who wants green space and more breathing room close to the city.",
      },
      {
        title: "Marvel Stadium → The District Docklands",
        description:
          "A practical route linking major activity points with food, shade, and convenient tram connections.",
      },
      {
        title: "NewQuay Promenade Ride",
        description:
          "A comfortable cycling idea for visitors who prefer flatter paths, harbour views, and fewer pinch points.",
      },
    ],
  },
  {
    id: "southbank",
    name: "Southbank",
    heroBlurb:
      "A lively riverside strip where culture, skyline views, and broad promenades create a distinctly urban Melbourne experience.",
    description:
      "Southbank is energetic, social, and strongly connected to Melbourne's arts and river life. It works well for people who enjoy activity, public atmosphere, and scenic walking routes, but still want space to move along the promenade. The combination of river views, major cultural landmarks, and reliable transport makes it one of the easiest places to explore on foot when you want a classic city experience with plenty of places to pause indoors.",
    recommendations: [
      "Southbank Promenade - The signature riverside walk with skyline views, people-watching, and a strong sense of Melbourne's public life.",
      "National Gallery of Victoria (NGV International) - A major cultural stop and a reliable indoor option when weather or crowds become tiring.",
      "Arts Centre Melbourne - A creative anchor for theatre, performance, and arts-focused outings.",
      "Eureka Skydeck - A dramatic way to experience the city from above and understand the wider urban layout.",
      "Hamer Hall - A strong evening destination that adds music, events, and riverfront energy to the precinct.",
    ],
    tags: [
      { icon: "🌆", label: "Riverfront skyline" },
      { icon: "🎭", label: "Arts and culture" },
      { icon: "🚶", label: "Promenade walking" },
      { icon: "🍽️", label: "Dining options" },
      { icon: "🚋", label: "Strong transport links" },
      { icon: "✨", label: "Classic city energy" },
    ],
    comfortRoutes: [
      {
        title: "Flinders Street → Southbank Promenade",
        description:
          "A straightforward walk for visitors who want river views, active public space, and an easy start from central transport.",
      },
      {
        title: "NGV → Arts Centre → Hamer Hall",
        description:
          "A culture-focused route with short walking links and dependable indoor stops along the way.",
      },
      {
        title: "Eureka Skydeck → Riverside Return Loop",
        description:
          "A city-sightseeing option that balances a big visual highlight with a more relaxed walk back along the Yarra.",
      },
      {
        title: "Southbank Evening Stroll",
        description:
          "A slower route for sunset hours when the promenade lighting and skyline feel especially attractive.",
      },
    ],
  },
  {
    id: "north-melbourne",
    name: "North Melbourne",
    heroBlurb:
      "A quieter inner-city neighbourhood with heritage texture, local streets, and a more grounded village rhythm.",
    description:
      "North Melbourne feels more local and less performative than the city core. Its heritage streets, neighbourhood cafes, and easier pedestrian pace make it well suited to visitors who prefer a more settled atmosphere. It offers a useful balance: close enough to the centre for convenience, but calm enough to feel like a break from dense city movement.",
    recommendations: [
      "Queen Victoria Market (north edge) - A food and market landmark that brings local energy without feeling as compressed as the CBD.",
      "Royal Park access - A strong green-space connection for longer walks, fresh air, and easier cycling.",
      "Errol Street - The area's best-known village strip for cafes, small shops, and a neighbourhood feel.",
      "North Melbourne Recreation Reserve - A community-focused open space with room to move and reset.",
      "Meat Market Arts House - A historic creative venue that adds cultural texture to the precinct.",
    ],
    tags: [
      { icon: "🏡", label: "Village feel" },
      { icon: "☕", label: "Neighbourhood cafes" },
      { icon: "🌳", label: "Park access" },
      { icon: "🚶", label: "Quieter streets" },
      { icon: "🏛️", label: "Heritage character" },
      { icon: "🚲", label: "Easy active travel" },
    ],
    comfortRoutes: [
      {
        title: "Errol Street → Recreation Reserve",
        description:
          "A comfortable neighbourhood walk linking local cafes with a more open community green space.",
      },
      {
        title: "North Melbourne Station → Queen Victoria Market",
        description:
          "A practical route that suits visitors wanting a simple arrival, food stop, and easy movement corridor.",
      },
      {
        title: "Royal Park Connector Ride",
        description:
          "A cycling-friendly option for anyone wanting longer green-space movement without entering the busiest city blocks.",
      },
      {
        title: "Heritage Terrace Walk",
        description:
          "A slower-paced local route for taking in the older streetscape and residential character of the area.",
      },
    ],
  },
  {
    id: "west-melbourne",
    name: "West Melbourne",
    heroBlurb:
      "A practical fringe precinct where industrial heritage, markets, and calm back streets meet city-edge convenience.",
    description:
      "West Melbourne has a quieter, more transitional feel than central Melbourne, but that is exactly what makes it appealing for low-stress movement. It combines useful transport links, market access, and less crowded streets with pockets of strong industrial and residential character. For visitors who want to stay near the CBD without feeling fully inside its rush, West Melbourne can feel unexpectedly comfortable.",
    recommendations: [
      "Flagstaff Gardens - The area's key green anchor for sitting, walking, and taking a break from the harder urban edge.",
      "Queen Victoria Market - A major destination for fresh food, local atmosphere, and casual city exploration.",
      "North Melbourne Station precinct - A practical connector for train access and wider movement.",
      "Warehouse laneways - Distinctive streets with industrial texture that make the area feel different from polished central retail zones.",
      "Spencer Street fringe cafes - Useful stop points for coffee, rest, or a quieter catch-up.",
    ],
    tags: [
      { icon: "🏙️", label: "City-edge convenience" },
      { icon: "🛍️", label: "Market access" },
      { icon: "🌿", label: "Garden breaks" },
      { icon: "🏭", label: "Industrial character" },
      { icon: "🚉", label: "Transit friendly" },
      { icon: "😌", label: "Calmer circulation" },
    ],
    comfortRoutes: [
      {
        title: "Flagstaff Gardens → Queen Victoria Market",
        description:
          "A simple city-fringe walk that pairs green relief with food and activity in one manageable route.",
      },
      {
        title: "Spencer Street Cafe Strip → Market Grid",
        description:
          "A practical short walk for visitors who want coffee, shade, and easy navigation near transport.",
      },
      {
        title: "West Melbourne Warehouse Circuit",
        description:
          "A slower exploratory route through streets that reveal the precinct's industrial and residential mix.",
      },
      {
        title: "Station Connector Walk",
        description:
          "A low-effort path for moving between rail access and the area's quieter local edges.",
      },
    ],
  },
  {
    id: "east-melbourne",
    name: "East Melbourne",
    heroBlurb:
      "A polished, tree-lined precinct that feels gentler, greener, and more graceful than the busier city centre.",
    description:
      "East Melbourne stands out for its calm visual rhythm: heritage facades, mature trees, and direct access to major gardens and civic landmarks. It feels less hectic than the CBD and more refined than many surrounding inner-city areas, making it well suited to comfortable walking, quieter travel, and slower sightseeing. For users who want a premium-feeling streetscape without leaving the city, this precinct delivers that balance very well.",
    recommendations: [
      "Fitzroy Gardens - A classic Melbourne garden landscape with shade, open lawns, and slower walking conditions.",
      "Treasury Gardens - A central green retreat that softens the city edge and offers easy seating and pause points.",
      "Melbourne Cricket Ground (MCG) - A major sporting landmark and orientation point for the broader area.",
      "St Patrick's Cathedral - A striking architectural landmark that adds visual richness to the precinct.",
      "Parliament Gardens precinct - A historic civic zone with elegant streets and strong pedestrian appeal.",
    ],
    tags: [
      { icon: "🌳", label: "Tree-lined streets" },
      { icon: "🏛️", label: "Heritage elegance" },
      { icon: "🧺", label: "Garden atmosphere" },
      { icon: "🚶", label: "Comfortable walking" },
      { icon: "🕊️", label: "Low-noise feel" },
      { icon: "📍", label: "Landmark-rich" },
    ],
    comfortRoutes: [
      {
        title: "Treasury Gardens → Fitzroy Gardens",
        description:
          "A shaded, low-stress walk through two of the area's most comfortable green spaces.",
      },
      {
        title: "Parliament Precinct → Cathedral Approach",
        description:
          "A graceful city-fringe route for visitors who enjoy heritage buildings and calmer streets.",
      },
      {
        title: "MCG Edge Loop",
        description:
          "A practical walking or cycling option that keeps close to major landmarks while still feeling spacious.",
      },
      {
        title: "Garden-to-Garden Ride",
        description:
          "A gentle cycling idea with greenery, clear paths, and good opportunities to stop and reset.",
      },
    ],
  },
  {
    id: "south-melbourne",
    name: "South Melbourne",
    heroBlurb:
      "A friendly heritage neighbourhood where markets, cafes, and walkable local streets create a welcoming daily rhythm.",
    description:
      "South Melbourne feels human-scaled and easy to enjoy. Its market life, older streets, and strong local cafe culture give it a sense of personality that is less rushed than the CBD and less polished than premium lifestyle precincts. It works especially well for visitors who like food-led exploration, neighbourhood atmosphere, and relaxed walking with plenty of natural stopping points.",
    recommendations: [
      "South Melbourne Market - The area's biggest draw for fresh food, local character, and easy browsing.",
      "Clarendon Street - A reliable main strip for cafes, shopping, and practical urban convenience.",
      "South Melbourne Town Hall - A civic landmark that reinforces the precinct's historic identity.",
      "Albert Park nearby access - Useful open-space relief for longer walks and movement away from busier blocks.",
      "Eastern Road reserve streetscape - A gentler heritage route that shows the area's residential side.",
    ],
    tags: [
      { icon: "🛒", label: "Market culture" },
      { icon: "☕", label: "Cafe stops" },
      { icon: "🏘️", label: "Neighbourhood charm" },
      { icon: "🚶", label: "Walkable main streets" },
      { icon: "🌿", label: "Park access nearby" },
      { icon: "🍴", label: "Food-led exploring" },
    ],
    comfortRoutes: [
      {
        title: "South Melbourne Market → Clarendon Street",
        description:
          "A classic local route for browsing, eating, and moving at a comfortable neighbourhood pace.",
      },
      {
        title: "Town Hall → Eastern Road Heritage Walk",
        description:
          "A slower walk that shifts from civic activity into quieter residential character.",
      },
      {
        title: "Clarendon Street → Albert Park Edge",
        description:
          "A useful route for combining urban convenience with a greener, more open finish.",
      },
      {
        title: "Weekend Food Loop",
        description:
          "A low-stress idea for sampling cafes and market energy without committing to a long city-centre walk.",
      },
    ],
  },
  {
    id: "fitzroy",
    name: "Fitzroy",
    heroBlurb:
      "A bold, creative neighbourhood where street life, cafes, and independent culture make every short walk feel eventful.",
    description:
      "Fitzroy is one of Melbourne's most recognisable inner-city precincts for culture, personality, and street-level energy. It is busier and more expressive than quieter residential areas, but that intensity is exactly what many visitors enjoy. For users attracted to independent shops, street art, food, nightlife, and a strong local identity, Fitzroy offers one of the richest atmospheres in the city.",
    recommendations: [
      "Brunswick Street - The area's signature spine for cafes, bars, small shops, and high-energy street life.",
      "Smith Street - A strong retail and nightlife strip with plenty of food and browsing options.",
      "Rose Street Artists' Market - A clear expression of local creative culture and independent making.",
      "Fitzroy Town Hall - A historic civic building that anchors the precinct visually.",
      "Atherton Gardens and local parks - Useful open pockets that soften an otherwise dense urban experience.",
    ],
    tags: [
      { icon: "🎨", label: "Creative identity" },
      { icon: "☕", label: "Cafe culture" },
      { icon: "🛍️", label: "Independent retail" },
      { icon: "🌙", label: "Nightlife energy" },
      { icon: "📸", label: "Street-art moments" },
      { icon: "🚶", label: "High-interest walking" },
    ],
    comfortRoutes: [
      {
        title: "Brunswick Street → Rose Street Market",
        description:
          "A compact route for visitors who want the clearest sense of Fitzroy's creative and social atmosphere.",
      },
      {
        title: "Smith Street Food and Browse Walk",
        description:
          "A casual exploration route that mixes retail, dining, and lively street movement.",
      },
      {
        title: "Town Hall → Atherton Gardens Reset",
        description:
          "A balanced walk that starts with dense urban character and finishes with a calmer pause point.",
      },
      {
        title: "Fitzroy Evening Circuit",
        description:
          "A later-day route for enjoying the neighbourhood when lighting, bars, and people-watching become part of the experience.",
      },
    ],
  },
  {
    id: "kensington",
    name: "Kensington",
    heroBlurb:
      "A village-style pocket with softer streets, rail convenience, and a more relaxed everyday pace than the city core.",
    description:
      "Kensington feels intimate, local, and easy to settle into. It is one of the inner areas that best supports low-stress travel because it combines smaller-scale streets, useful green space, and strong train access with a genuine neighbourhood identity. For users who want the city to feel a little less intense, Kensington offers a softer alternative without feeling isolated.",
    recommendations: [
      "Bellair Street village - The clearest expression of Kensington's local cafe and small-shop character.",
      "J.J. Holland Park - A large, versatile green space for walking, cycling, and a more relaxed reset.",
      "Kensington Station precinct - A practical rail anchor that makes the area easy to reach and leave.",
      "Macaulay Road strip - A local dining corridor with a less hurried feel than busier inner-city strips.",
      "Historic terrace streets - A walking-friendly set of residential streets that show the suburb's older character.",
    ],
    tags: [
      { icon: "🏡", label: "Village feel" },
      { icon: "🌿", label: "Green spaces" },
      { icon: "🚉", label: "Easy rail access" },
      { icon: "🚶", label: "Quiet streets" },
      { icon: "☕", label: "Local cafes" },
      { icon: "😌", label: "Low-stress travel" },
    ],
    comfortRoutes: [
      {
        title: "Bellair Street → Kensington Station",
        description:
          "A short local walk with cafes, small shops, and an easy transition into train travel.",
      },
      {
        title: "J.J. Holland Park Loop",
        description:
          "A relaxed option for walking or cycling around open green space without heavy city pressure.",
      },
      {
        title: "Macaulay Road → Bellair Street",
        description:
          "A simple route for exploring local food, neighbourhood streets, and the area's village atmosphere.",
      },
      {
        title: "Historic Terrace Walk",
        description:
          "A slower route for visitors who want to enjoy Kensington's residential character and calm rhythm.",
      },
    ],
  },
  {
    id: "flemington",
    name: "Flemington",
    heroBlurb:
      "A broad, varied precinct known for racing history, multicultural streets, and more generous movement corridors.",
    description:
      "Flemington offers a different kind of inner-city experience: less polished than premium precincts, but more spacious and more varied in tone. It combines large destination landmarks with practical local streets and access to parks and trails. For visitors who want room to move, local food diversity, and a more open urban structure, Flemington can feel surprisingly comfortable.",
    recommendations: [
      "Flemington Racecourse - The area's defining landmark and a major reference point within Melbourne's event geography.",
      "Newmarket Plaza precinct - A practical shopping stop that supports everyday convenience.",
      "Racecourse Road - A multicultural dining strip with strong local character and casual food options.",
      "Debneys Park and nearby river trails - Outdoor routes that add green relief and movement variety.",
      "Travancore connections - Useful visual and movement links toward neighbouring inner areas.",
    ],
    tags: [
      { icon: "🏇", label: "Racing history" },
      { icon: "🍜", label: "Multicultural dining" },
      { icon: "🌳", label: "Trail access" },
      { icon: "🚶", label: "More open corridors" },
      { icon: "🛍️", label: "Everyday convenience" },
      { icon: "🧭", label: "Neighbourhood variety" },
    ],
    comfortRoutes: [
      {
        title: "Racecourse Road Food Walk",
        description:
          "A straightforward local route focused on multicultural dining, short stops, and casual neighbourhood energy.",
      },
      {
        title: "Newmarket Plaza → Debneys Park",
        description:
          "A practical transition from shops and services into a greener, more open setting.",
      },
      {
        title: "Racecourse Edge Circuit",
        description:
          "A more spacious walk around the precinct's landmark zone for visitors who enjoy larger urban gestures.",
      },
      {
        title: "River-Trail Connector Ride",
        description:
          "A comfortable cycling option for adding fresh air and a longer movement corridor to a local outing.",
      },
    ],
  },
  {
    id: "melbourne-cbd",
    name: "Melbourne CBD",
    heroBlurb:
      "The city's busiest core, full of landmarks, retail, and transport convenience, but most enjoyable when explored with smart timing.",
    description:
      "Melbourne CBD is unmatched for convenience, landmark density, and transport connectivity. It is the easiest place to access a wide variety of attractions, but it also brings the most crowd pressure, tighter movement, and stronger peak-hour intensity. For users who enjoy energy and variety, it can be deeply rewarding; for comfort-focused visitors, it works best when approached in shorter segments with intentional indoor stops.",
    recommendations: [
      "State Library Victoria - A cultural and study landmark that doubles as a comfortable indoor reset point.",
      "Federation Square - A major public gathering place and orientation point for the city centre.",
      "Bourke Street Mall - The key central retail corridor for shopping and people-watching.",
      "Hosier Lane - A high-profile street-art destination that captures Melbourne's visual identity.",
      "Flinders Street Station - The city's best-known transport icon and a natural start or end point.",
    ],
    tags: [
      { icon: "🚉", label: "Maximum connectivity" },
      { icon: "🏙️", label: "Landmark density" },
      { icon: "🛍️", label: "Retail core" },
      { icon: "☕", label: "Indoor stop options" },
      { icon: "🎨", label: "Culture and events" },
      { icon: "⚡", label: "High city energy" },
    ],
    comfortRoutes: [
      {
        title: "Flinders Street Station → Federation Square",
        description:
          "A classic first-stop route that gives visitors immediate orientation without committing to a long walk.",
      },
      {
        title: "State Library → Bourke Street Mall",
        description:
          "A practical city-centre route that balances indoor comfort, retail access, and transport convenience.",
      },
      {
        title: "Laneway Arts Loop",
        description:
          "A shorter, curiosity-driven walk for people who want visual culture and atmosphere in compact bursts.",
      },
      {
        title: "Off-Peak CBD Comfort Circuit",
        description:
          "A best-practice route for visiting early or between rush periods, using indoor stops to reduce crowd fatigue.",
      },
    ],
  },
  {
    id: "south-yarra",
    name: "South Yarra",
    heroBlurb:
      "A stylish, fast-moving lifestyle precinct with fashion, dining, and polished social energy close to the river.",
    description:
      "South Yarra feels premium, social, and image-conscious. It is ideal for visitors who enjoy high-quality dining, fashion-oriented browsing, and a stronger sense of urban lifestyle performance. While more active than quieter neighbourhoods, it also offers useful green and riverside relief nearby, making it possible to balance social energy with moments of comfort.",
    recommendations: [
      "Chapel Street - The precinct's main fashion, nightlife, and browsing corridor with strong youth appeal.",
      "Como House and Garden - A heritage destination that adds historical depth and a quieter contrast to the surrounding buzz.",
      "Royal Botanic Gardens access - A valuable green-space escape when you want to soften a busier outing.",
      "Yarra River trail - A movement-friendly route for cycling, jogging, or stepping away from dense retail space.",
      "Toorak Road dining area - A sociable food strip that captures the area's lifestyle focus.",
    ],
    tags: [
      { icon: "🛍️", label: "Fashion and retail" },
      { icon: "🍸", label: "Social nightlife" },
      { icon: "🌿", label: "River and garden access" },
      { icon: "✨", label: "Premium feel" },
      { icon: "🚶", label: "Lifestyle strolling" },
      { icon: "🍽️", label: "Dining hotspot" },
    ],
    comfortRoutes: [
      {
        title: "Chapel Street → Toorak Road",
        description:
          "A polished urban route for shopping, dining, and enjoying the area at its most recognisable.",
      },
      {
        title: "Como House → Botanic Gardens Connector",
        description:
          "A more balanced outing that shifts from heritage calm into greener, lower-stress movement.",
      },
      {
        title: "Yarra Trail Leisure Ride",
        description:
          "A comfortable cycling option for visitors who want to offset busy retail streets with riverside flow.",
      },
      {
        title: "South Yarra Social Circuit",
        description:
          "A flexible later-day route that works well for food, meeting friends, and people-watching.",
      },
    ],
  },
  {
    id: "carlton",
    name: "Carlton",
    heroBlurb:
      "A classic culture-and-cafes precinct where academic life, Italian food heritage, and elegant gardens come together.",
    description:
      "Carlton has a layered inner-city identity built from students, museums, dining history, and major gardens. It feels intellectually active but also visually graceful, with enough green relief and strong food culture to keep movement pleasant. For visitors who want substance as well as atmosphere, Carlton offers one of the most rounded neighbourhood experiences near the city.",
    recommendations: [
      "Lygon Street - The defining dining strip for Italian food, cafes, and a recognisable Melbourne street culture.",
      "Melbourne Museum - A major knowledge and culture destination with strong indoor value.",
      "Royal Exhibition Building - A UNESCO-listed landmark that gives the precinct global heritage significance.",
      "Carlton Gardens - A refined public landscape ideal for slowing down between busier stops.",
      "University of Melbourne precinct - A historic academic environment that shapes the broader character of the area.",
    ],
    tags: [
      { icon: "🍝", label: "Italian food culture" },
      { icon: "🎓", label: "Academic atmosphere" },
      { icon: "🏛️", label: "Museum and heritage" },
      { icon: "🌳", label: "Garden pauses" },
      { icon: "☕", label: "Cafe-friendly" },
      { icon: "🚶", label: "Thoughtful strolling" },
    ],
    comfortRoutes: [
      {
        title: "Lygon Street → Carlton Gardens",
        description:
          "A classic route that balances food culture with one of the area's best green pause points.",
      },
      {
        title: "Museum → Exhibition Building Walk",
        description:
          "A short heritage-rich path for visitors who want cultural depth without complex navigation.",
      },
      {
        title: "University Edge Circuit",
        description:
          "A comfortable walking idea that captures Carlton's academic atmosphere and historic street rhythm.",
      },
      {
        title: "Cafe and Garden Loop",
        description:
          "A lower-pressure option for mixing a food stop with a calmer public-space reset.",
      },
    ],
  },
];

export const AREA_INFO_BY_ID = Object.fromEntries(
  AREA_INFO.map((area) => [area.id, area])
) as Record<string, AreaInfo>;

export function getAreaInfo(areaId: string | null | undefined): AreaInfo | null {
  if (!areaId) return null;
  return AREA_INFO_BY_ID[areaId] ?? null;
}
