import {
  isUserAdmin,
  isUserManager,
  isPcoVoid,
  isUserBallInCourt,
  canUserViewPcoDetail
} from "./";

describe("PCO business rules", () => {
  describe("Ball-in-court status", () => {
    it("returns false for voided PCO", () => {
      const user = { uid: "A" } as any;
      const pco = { ballInCourt: "A", voided: true } as any;

      expect(isUserBallInCourt({ user, pco })).toBeFalsy();
    });
    it("returns true for valid PCO with matching user", () => {
      const user = { uid: "A" } as any;
      const pco = { ballInCourt: "A", voided: false } as any;
      expect(isUserBallInCourt({ user, pco })).toBeTruthy();
    });
  });

  describe("PCO detail visibility", () => {
    it("returns true when user is admin", () => {
      const user = { uid: "A", role: "admin" } as any;
      const pco = { ballInCourt: "A", managers: [] } as any;
      expect(canUserViewPcoDetail({ user, pco })).toBeTruthy();
    });

    it("returns true when user is admin even if PCO is voided", () => {
      const user = { uid: "A", role: "admin" } as any;
      const pco = { ballInCourt: "A", managers: [], voided: true } as any;
      expect(canUserViewPcoDetail({ user, pco })).toBeTruthy();
    });

    it("returns true when user is manager even if they are not ball-in-court", () => {
      const user = { uid: "A", role: "admin" } as any;
      const pco1 = { ballInCourt: "B", managers: [{ uid: "A" }] } as any;
      expect(canUserViewPcoDetail({ user, pco: pco1 })).toBeTruthy();
    });

    it("returns true when user is manager", () => {
      const user = { uid: "A" } as any;
      const pco = { ballInCourt: "A", managers: [{ uid: "A" }] } as any;
      expect(canUserViewPcoDetail({ user, pco })).toBeTruthy();
    });

    it("returns true when user is ball in court", () => {
      const user = { uid: "A" } as any;
      const pco = { ballInCourt: "A", managers: [] } as any;
      expect(canUserViewPcoDetail({ user, pco })).toBeTruthy();
    });
  });
});
