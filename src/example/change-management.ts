import { ResourceDefinition } from "../types/";
import { SystemDefinition } from "../types/resources";
import { isUserBallInCourt } from "../rules";

// Example resource
const PCODefinition: ResourceDefinition = {
  properties: {
    uid: { type: "string" },
    ballInCourt: {
      referenceTo: "User",
      constraints: ["CanHoldMany"]
    },
    managers: {
      referenceTo: "User",
      constraints: ["CanHoldMany"]
    },
    voidedAt: {
      type: "datetime",
      constraints: ["CanBeEmpty"]
    },
    RFQs: {
      referenceTo: "RFQ",
      constraints: ["CanHoldMany"]
    },
    proposal: {
      referenceTo: "Proposal",
      constraints: ["CanHoldMany", "NotAlwaysPresent"]
    }
  },

  states: {
    Pricing: {
      transitions: {
        prepareProposal: {
          to: "Prepare Proposal",
          conditions: [
            {
              allowIf: true,
              denyMessage:
                "All quotes must be received and acknowledged before preparing a proposal."
            }
          ]
        },
        voidFromPricing: {
          to: "Void",
          conditions: [
            {
              allowIf: true,
              denyMessage:
                "This transition should always be valid, but may be limited by user role."
            }
          ]
        }
      }
    },
    "Prepare Proposal": {
      transitions: {
        sendProposalForReview: {
          to: "Review",
          conditions: [
            {
              denyIf: { doesNotExist: { property: "proposal" } },
              denyMessage:
                "You must create a proposal before you can send it for review."
            },
            {
              denyIf: {
                inState: {
                  resource: { mostRecent: "proposal" },
                  state: "reviseAndResubmit"
                }
              },
              denyMessage:
                "Your most recent proposal must be revised before re-submitting."
            },
            {
              denyIf: {
                inState: {
                  resource: { mostRecent: "proposal" },
                  state: "rejected"
                }
              },
              denyMessage:
                "Your proposal has been rejected and cannot be submitted again."
            },
            {
              denyIf: {
                canTransition: {
                  toState: "inReview",
                  resource: { mostRecent: "proposal" }
                }
              },
              denyMessage:
                "Your proposal cannot be submitted for some other reason."
            }
          ]
        }
      }
    },
    Review: {
      transitions: {}
    }
    // "Ready to Distribute": {},
    // Void: {},
  },

  /** Calculated properties are derived from other properties on this resource
   *  the resources it references.
   */
  calculatedProperties: {
    estimatedCost: {
      type: "number",
      expression: {
        sum: {
          getAll: {
            property: "cost",
            from: { ref: "RFQs" },
            asType: "number[]"
          }
        }
      }
    }
  },

  /** Define permissions for reading properties and calculated properties */
  readPermissions: {
    estimatedCost: [
      {
        roles: ["admin", "manager", "projectCollaborator"],
        conditions: ["allow"]
      },
      {
        denyWithMessage: "You do not have permission to view cost data."
      }
    ]
  },

  /** Define permissions for taking actions on this resource, including
   *  state transitions.
   */
  actionPermissions: {
    sendProposalForReview: [
      {
        roles: ["admin", "manager"],
        conditions: ["allow"]
      },
      {
        denyWithMessage:
          "You do not have permission to send a proposal for review."
      }
    ]
  }
};

export const definition: SystemDefinition = {
  name: "Change Management",
  resources: {
    PCO: PCODefinition
    // User: UserDefinition,
    // Proposal: ProposalDefinition,
    // RFQ: RFQDefinition,
    // Quote: QuoteDefinition,
  },
  roles: ["admin", "projectCollaborator", "manager", "restrictedAssignee"]
};
