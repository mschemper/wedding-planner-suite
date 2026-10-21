// Personal-cost parameters, Reconciled Master v2.0 §2.5. Change here → every scenario reprices; golden must stay green or be re-sourced (HISTORY.md).
export interface Params {
  photography: number;
  /** +$800 at 200+ guests (Field Museum) */
  secondShooter: number;
  band: number;
  /** outside the city */
  bandTravel: number;
  /** flying four musicians (Puerto Rico) */
  bandFlyIn: number;
  dress: number;
  dressShipping: number;
  hairMakeup: number;
  beautyTravel: number;
  islandHairMakeup: number;
  diyFavorsPerGuest: number;
  purchasedFavorsPerGuest: number;
  welcomeBagPerGuest: number;
  cakeBase: number;
  cakePerGuest: number;
  /** base florals by guest count; venues adjust (−400 décor-rich, −300 lakefront/designed, +200 barn) */
  floralsBase: [number, number][];
}

export const DEFAULT_PARAMS: Params = {
  photography: 4500,
  secondShooter: 800,
  band: 2000,
  bandTravel: 300,
  bandFlyIn: 4000,
  dress: 2900,
  dressShipping: 300,
  hairMakeup: 850,
  beautyTravel: 100,
  islandHairMakeup: 1000,
  diyFavorsPerGuest: 3,
  purchasedFavorsPerGuest: 5,
  welcomeBagPerGuest: 18,
  cakeBase: 100,
  cakePerGuest: 4,
  floralsBase: [[50, 1350], [75, 1600], [100, 1850], [125, 2150]],
};
