// Mirrors structured_guest_data_model.xlsx (sheets: Households, Individuals, Friends). Column names are kept verbatim.

export type Family = "Mark" | "Angela";
export type AdultOrChild = "Adult" | "Child" | "Unknown";
export type Locality = "Local Chicago Area" | "Out of Town" | "Unknown";
export type InviteStatus = "TBD" | "Invited" | "Accepted" | "Declined" | "Not inviting";
export type YesNo = "Yes" | "No";

export interface Household {
  HouseholdID: string;
  Family: Family;
  FamilySide: string;
  PrimaryHouseholdName: string;
  HouseholdType: string;
  Notes?: string;
}

export interface Individual {
  PersonID: string;
  HouseholdID: string;
  FirstName: string;
  LastName: string;
  DisplayName: string;
  Family: Family;
  FamilySide: string;
  RelationshipToMark?: string;
  RelationshipToAngela?: string;
  GenerationGroup: string;
  AdultOrChild: AdultOrChild;
  HouseholdRole: string;
  /** graph edge: spouse/partner */
  PartnerPersonID?: string;
  /** graph edges: comma-separated PersonIDs */
  ParentPersonIDs?: string;
  InviteException: YesNo;
  ExceptionReason?: string;
  Locality: Locality;
  CityState?: string;
  InvitePriority: string;
  InviteStatus: InviteStatus;
  Notes?: string;
}

export interface FriendGroup {
  FriendGroupID: string;
  GroupName: string;
  PrimaryContact?: string;
  ConnectionTo?: string;
  FriendCategory?: string;
  Ranking?: string | number;
  InviteTier?: string;
  Locality: Locality;
  CityState?: string;
  PlusOneDefault: YesNo;
  AdultOrChild: AdultOrChild;
  InviteException: YesNo;
  ExceptionReason?: string;
  InviteStatus: InviteStatus;
  Notes?: string;
}

export interface GuestData {
  households: Household[];
  individuals: Individual[];
  friends: FriendGroup[];
  importedAt?: string;
  source?: string;
}

export const ENUMS = {
  Family: ["Mark", "Angela"],
  AdultOrChild: ["Adult", "Child", "Unknown"],
  Locality: ["Local Chicago Area", "Out of Town", "Unknown"],
  InviteStatus: ["TBD", "Invited", "Accepted", "Declined", "Not inviting"],
  YesNo: ["Yes", "No"],
} as const;
