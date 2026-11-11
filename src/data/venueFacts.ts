// Venue facts for the Day tab (v11): hours, rules, inclusions, recommended vendors. Business info only.
// Source per venue in `source`. Prices live in scenarios.ts, never here.
import type { VendorCategory } from "../plan/types";

export interface VenueHours {
  /** "HH:MM" event start allowed */
  open: string;
  /** "HH:MM"; "24:00" = midnight */
  close: string;
  /** vendor breakdown allowed after close */
  cleanupMin: number;
}

export interface VenuePhoto {
  /** path under public/ (hosted build only) */
  src: string;
  caption: string;
  credit: string;
}

export interface VenueFacts {
  hours: VenueHours;
  /** hosted build only; downloaded with Mark's OK 9 Nov 2026 */
  photos: VenuePhoto[];
  /** short rule lines (money rules carry their figure) */
  rules: string[];
  included: string[];
  lodging: string[];
  recommended: Partial<Record<VendorCategory, string[]>>;
  /** business contacts (v14) */
  contacts?: string[];
  /** known open questions to ask the venue */
  questions: string[];
  source: string;
}

export const VENUE_FACTS: Record<number, VenueFacts> = {
  5: {
    hours: { open: "14:00", close: "24:00", cleanupMin: 90 },
    photos: [
      { src: "venues/joinery/main-space.webp", caption: "Main space under the skylight", credit: "Photo: The Joinery (thejoinerychicago.com)" },
      { src: "venues/joinery/patio.webp", caption: "Outdoor patio", credit: "Photo: The Joinery (thejoinerychicago.com)" },
      { src: "venues/joinery/speakeasy.webp", caption: "Upstairs speakeasy bar", credit: "Photo: The Joinery (thejoinerychicago.com)" },
      { src: "venues/joinery/lounge.webp", caption: "Lounge", credit: "Photo: The Joinery (thejoinerychicago.com)" },
      { src: "venues/joinery/floor-plan.webp", caption: "Floor plan (Apr 2026)", credit: "The Joinery floor plan, 2026.04.14" },
      { src: "venues/joinery/mill-house.webp", caption: "The Mill House next door (sleeps 10)", credit: "Photo: The Joinery (thejoinerychicago.com)" },
    ],
    rules: [
      "Rental 2 PM – midnight (Fri/Sat); vendors get 1.5 h after for breakdown",
      "Bar: in-house packages ($34 / $44 / $55 pp, 5 h max, closes 30 min before end) or BYOB (price on request)",
      "Bar minimum $4,000; guests under 21 $5 pp; sparkling toast $4 pp; dinner wine $5 pp",
      "Pay by check (The Joinery Studios LLC) or Zelle; card or other methods +3.1%; state and federal tax included in the rental",
      "Booked May 29, 2027 at the Friday rate ($7,000; Shay, 4 Nov 2026). Long weekends normally cost more: confirm the contract shows $7,000",
      "160 seated with dance floor; catering, florals and planner are ours to bring (recommended list below)",
      "Park in front of the driveway; loading dock straight to the kitchen",
    ],
    included: [
      "Main space with 800 sq ft skylight; covered/uncovered patio",
      "22 reclaimed-wood tables (3×8 ft), 180 steel chairs, 12 highboys, 8 barstools (2027 sheet)",
      "Upstairs speakeasy bar and lounge",
      "Sound system, projector + screen, dimmable lighting, Wi-Fi",
      "Private wedding suite; 5 bathrooms; numbered coat room",
      "Sweetheart table, copper arch, table numbers, card box, easels, donut wall",
      "Venue manager and security; loading dock to kitchen; ADA first floor",
    ],
    lodging: [
      "The Hideout: 2-bed / 1.5-bath apartment upstairs, included with the rental",
      "The Mill House next door: 4-bed / 2.5-bath, sleeps 10, add-on (2-night minimum)",
    ],
    recommended: {
      catering: ["Cocina Fusion", "Hearty Boys", "Lula Cafe", "Wooden Paddle", "Jordan's Food of Distinction", "Food for Thought", "CMB Catering", "Viola's Kitchen", "Tamale Spaceship", "Maison Cuisine", "Boka", "Kuma's", "One Off Hospitality", "Amazing Edibles", "The Caterist", "Entertaining Company", "Paramount", "Beyond Catering", "Green Spoon Kitchen", "Butter + Vine", "True Cuisine"],
      photo: ["Madi Ellis", "King + Opal", "Cassie Anna Photo", "Emma Peterson", "Ed + Aileen", "Zach Caddy", "Tawny Ballard", "Kate Scott Photo", "Emily Williams", "Wren and Rose", "Alisha Tova", "Battiest Photo", "Fuller Photo Co", "Victoria St Martin", "Audrey Simper", "Allie Idrac", "Sally O'Donnell", "Moguel Photo", "Ryan Moore", "Gene Yoon", "Replogle Studios", "Melodierose"],
      planner: ["Lo Fi Events", "Burst Events", "Saint + Social", "Cygnet Events", "Glowing Moments", "Blue Moon Events", "Nora Events", "Ohana", "Melodierose", "Wedding Day Chicago", "Jeannie Gentile", "Vrinspirations", "The Final Touch", "An Event Less Ordinary", "Grayter Events", "Lola Event Pros", "Bridget Mary Weddings", "BW Studio", "Sustainable Soirees", "Olive Fine Weddings", "Marryment", "Reverie + Co", "Shh Events", "Heirloom Event Co"],
      florals: ["XO Design Co", "Romee Willow", "The Jade Vine", "Flowerchild", "Studio Poppy", "Flowers by Stem", "Flower Girl Company", "The Flower Hutch", "Flowers for Dreams", "Lee Lee's Garden", "Hedonia", "Fleurish Atelier", "Eco Wilde", "Vrinspirations"],
      music: ["Toast and Jam", "Total Harmony Ent", "DJ Tess", "Gold Noise DJ", "Modern Love DJ", "Cage and Aquarium", "Okyne Media Lab", "Dart Collective", "Fiesta Pros", "Groove Is in the Heart", "Luniks", "The DJ Firm", "Green Line Talent"],
    },
    contacts: [
      "Shay Schultz, Venue Director: shay@thejoinerychicago.com · 219-308-1926",
      "General: info@thejoinerychicago.com · payments (Zelle): Management@TheJoineryChicago.com",
      "2533 W Homer St, Chicago",
    ],
    questions: [
      "Is the contract countersigned and the $3,500 deposit marked paid? Save the HoneyBook PDF to Drive",
      "Payment schedule: when is the balance due? Cancellation terms?",
      "Final headcount deadline?",
      "Is a certificate of insurance (COI) required, from whom?",
      "Earliest vendor load-in before 2 PM?",
      "Music: live jazz combo (Joel Paterson and Friends) allowed? Amplification limits, noise curfew?",
      "Decor rules: candles / open flame, confetti, hanging items?",
      "Ceremony on site? Rain plan for the patio?",
      "Can kids use the upstairs lounge for a supervised party?",
      "Is the bar package taxed / is gratuity extra?",
    ],
    source: "The Joinery brochure (2026.10.03), 2027 pricing sheet + bar sheet + preferred-vendor photos (30 Oct 2026), Shay's emails (4 + 10 Nov 2026); contract in HoneyBook (not yet saved)",
  },
};
