export interface User {
  uid: UID;
  fullName: string;
  email: string;
  role: "admin" | "collaborator" | "restricted";
}

export type UID = string;

export interface PCO {
  ballInCourt: UID;
  managers: User[];
  voided: boolean;
}
