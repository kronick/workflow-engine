import { SystemDefinition } from "../types/";

/** This is a simple system modelling a workflow with only one resource type.
 */
export const simpleDefinition: SystemDefinition = {
  name: "Document System",
  roles: ["author", "reviewer", "reader"],
  resources: {
    Document: {
      states: [
        "archived",
        "authoring",
        "reviewing",
        "approved",
        "revising",
        "published"
      ],

      defaultState: "authoring",

      properties: {
        title: {
          type: "string",
          readPermissions: [
            {
              roles: ["author"],
              conditions: ["allow"]
            },
            {
              roles: ["reviewer"],
              conditions: [
                {
                  allowIf: { inState: { states: ["reviewing", "published"] } }
                },
                {
                  denyIf: { inState: { states: ["authoring"] } },
                  denyMessage:
                    "The author has not yet submitted this document to you for review."
                },
                {
                  denyIf: { inState: { states: ["revising"] } },
                  denyMessage:
                    "The author is currently revising this document. It will be visible to you when the author submits it for re-review."
                }
              ]
            },
            {
              roles: ["reader"],
              conditions: [
                {
                  allowIf: { inState: { states: ["published"] } },
                  denyMessage:
                    "You cannot read this document until it has been published."
                }
              ]
            }
          ],
          writePermissions: [
            {
              roles: ["author"],
              conditions: [
                {
                  denyIf: { inState: { states: ["reviewing"] } },
                  denyMessage:
                    "You cannot edit the document while it is being reviewed."
                },
                {
                  denyIf: { inState: { states: ["approved"] } },
                  denyMessage:
                    "You cannot edit the document after it has been approved for publication."
                },
                {
                  denyIf: { inState: { states: ["published"] } },
                  denyMessage:
                    "You cannot edit the document after it has been published"
                }
              ]
            }
          ]
        },
        text: {
          type: "string",
          constraints: ["CanBeEmpty"],
          readPermissions: [
            {
              roles: ["author"],
              conditions: ["allow"]
            },
            {
              roles: ["reviewer"],
              conditions: [
                {
                  allowIf: { inState: { states: ["reviewing", "published"] } }
                },
                {
                  denyIf: { inState: { states: ["authoring"] } },
                  denyMessage:
                    "The author has not yet submitted this document to you for review."
                },
                {
                  denyIf: { inState: { states: ["revising"] } },
                  denyMessage:
                    "The author is currently revising this document. It will be visible to you when the author submits it for re-review."
                }
              ]
            },
            {
              roles: ["reader"],
              conditions: [
                {
                  allowIf: { inState: { states: ["published"] } },
                  denyMessage:
                    "You cannot read this document until it has been published."
                }
              ]
            }
          ],
          writePermissions: [
            {
              roles: ["author"],
              conditions: [
                {
                  denyIf: { inState: { states: ["reviewing"] } },
                  denyMessage:
                    "You cannot edit the document while it is being reviewed."
                },
                {
                  denyIf: { inState: { states: ["approved"] } },
                  denyMessage:
                    "You cannot edit the document after it has been approved for publication."
                },
                {
                  denyIf: { inState: { states: ["published"] } },
                  denyMessage:
                    "You cannot edit the document after it has been published"
                }
              ]
            }
          ]
        },
        reviewerNotes: {
          type: "string",
          constraints: ["CanBeEmpty"],
          description:
            "Notes made by the reviewer on this document. Can only be viewed by the author after a review is complete.",
          readPermissions: [
            {
              roles: ["reviewer"],
              conditions: ["allow"]
            },
            {
              roles: ["author"],
              conditions: [
                {
                  allowIf: { inState: { states: ["approved", "revising"] } },
                  denyMessage:
                    "You cannot read the reviewer's notes until they have approved this document or returned it to you for revision."
                }
              ]
            },
            "deny"
          ],
          writePermissions: [
            {
              roles: ["reviewer"],
              conditions: [
                {
                  allowIf: { inState: { states: ["reviewing"] } },
                  denyMessage:
                    "You can only edit your notes while the document is undergoing review."
                }
              ]
            },
            "deny"
          ]
        }
      },

      calculatedProperties: {
        textLength: {
          type: "number",
          expression: { stringLength: { get: "text" } }
        }
      },

      transitions: {
        archive: {
          from: ["authoring", "reviewing", "revising", "approved"],
          to: "archived",
          conditions: ["allow"],
          permissions: [
            {
              roles: ["author"],
              conditions: ["allow"]
            },
            "deny"
          ]
        },

        // Explicitly deny archiving once the document has been published.
        // This lets us set a user-readable denial message to explain why
        // this is an invalid state transition.
        archiveFromPublish: {
          from: "published",
          to: "archived",
          conditions: [
            { denyWithMessage: "Cannot archive a document after publication." }
          ]
        },

        sendForReview: {
          from: ["authoring", "revising"],
          to: "reviewing",
          conditions: [
            {
              denyIf: { not: { exists: { property: "text" } } },
              denyMessage: "Document must have text before sending for review."
            },
            {
              denyIf: { not: { exists: { property: "title" } } },
              denyMessage:
                "Document must have a title before sending for review."
            }
          ],

          permissions: [
            {
              roles: ["author"],
              conditions: ["allow"]
            },
            {
              roles: ["reviewer"],
              conditions: [
                {
                  denyWithMessage:
                    "Only authors can send a document for review."
                }
              ]
            },
            "deny"
          ]
        },

        approve: {
          from: "reviewing",
          to: "approved",

          permissions: [
            {
              roles: ["reviewer"],
              conditions: ["allow"]
            },
            "deny"
          ]
        },

        returnForRevisions: {
          from: "reviewing",
          to: "revising",

          permissions: [
            {
              roles: ["reviewer"],
              conditions: ["allow"]
            },
            "deny"
          ]
        },

        publish: {
          from: "approved",
          to: "published",

          permissions: [
            {
              roles: ["author", "reviewer"],
              conditions: ["allow"]
            },
            "deny"
          ]
        },

        publishDirectly: {
          from: "reviewing",
          to: "published",
          description: "Fast track directly from review to publication",

          permissions: [
            {
              roles: ["reviewer"],
              conditions: ["allow"]
            },
            "deny"
          ]
        }
      }
    }
  }
};
