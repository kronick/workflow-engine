import { User, PCO } from "../types/domain-types";
import { Rule } from "../types/library-types";

type UserAndPCO = { user: User; pco: PCO };

const isUserAdmin: Rule<User> = u => {
  return u.role === "admin";
};

const isUserManager: Rule<UserAndPCO> = ({ user, pco }) => {
  return pco.managers.some(manager => manager.uid === user.uid);
};

const isPcoVoid: Rule<PCO> = pco => {
  return pco.voided;
};

const isUserBallInCourt: Rule<UserAndPCO> = ({ user, pco }) => {
  return pco.ballInCourt === user.uid && !isPcoVoid(pco);
};

const canUserViewPcoDetail: Rule<UserAndPCO> = ({ user, pco }) => {
  return (
    isUserAdmin(user) ||
    isUserManager({ user, pco }) ||
    isUserBallInCourt({ user, pco })
  );
};

// const canUserViewPcoDetail: Rule<UserAndPCO> = ({ user, pco }) => {
//   const rule = [
//     "and",
//     [
//       ["isUserExcited", ["concat", ["get", "user.name"], "!!!"]],
//       ["isUserManager", ["get", "user.id"]],
//       ["isUserBallInCourt", ["get", "user.id"]],
//     ],
//   ];

//   doesRuleSatisfy(rule, {user: {id: "A"}});

//   return compoundRule([
//     "isUserAdmin",
//     "or",
//     ["isUserManager", "and", "isUserBallInCourt"],
//   ]).satisfiedBy({ user, pco });

//   return (
//     isUserAdmin(user) ||
//     isUserManager({ user, pco }) ||
//     isUserBallInCourt({ user, pco })
//   );
// };

export {
  isUserAdmin,
  isUserManager,
  isPcoVoid,
  isUserBallInCourt,
  canUserViewPcoDetail
};
