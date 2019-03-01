function PGFlow(literals: TemplateStringsArray, ...placeholders: string[]) {
  let result = "";

  // interleave the literals with the placeholders
  for (let i = 0; i < placeholders.length; i++) {
    result += literals[i];
    result += placeholders[i];
  }

  // add the last literal
  result += literals[literals.length - 1];
  return result;
}

PGFlow`

resource User:
  uid: string
  email: string
  firstname: string
  lastname: string

resource PCO
  properties
    uid: string
    ballInCourt: User*
    managers: User*[]
    voided: boolean
    RFQs: RFQ*[]
  
    # '+' character indicates a calculated property
    # Calculated properties can be resolved as a function
    # of this resource's state alone
    +estimatedCost: number
      addAll RFQs value
      (sum (map (RFQs (get "value"))))

  # Conditionals are functions that 
  conditions
    isManager: boolean (user: User)
        (managers INCLUDES user uid) OR (managers INCLUDES user group)
      
  
  permissions
    viewDetails
      user roles [admin]
        ALLOW ALWAYS

      user roles [collaborator]
        ALLOW IF managers INCLUDES user uid
        ALLOW IF managers INCLUDES user group

      others
        DENY
    
    void
      user roles [admin]
        ALLOW IF not voided
      
      user roles [collaborator]
        ALLOW IF managers INCLUDES user
      


permission viewPcoDetails:
  roles [admin]:
    ALLOW ALWAYS
  
  roles [collaborator] depends on [PCO]:
    ALLOW if PCO void is false
  
  roles [ALL] depends on [PCO]:
    ALLOW if PCO ballInCourt is user


    ----

    admin CAN VIEW ALWAYS
    admin CAN EDIT ALWAYS

    manager CAN VIEW estimatedCost ALWAYS
    collaborator CAN VIEW estimatedCost IF
      status IS distributed

    others CAN NOT VIEW estimatedCost

`;

PGFlow`

`;
/*

- Permission to view some or all resource properties?
- Permission to edit resource properties?
- Permission to move resource into another state?
- What are the possible states a resource can be in?
- What are the possible state transitionos a resource can undergo?

*/

// canAction = (state, actor) => boolean;
// act(resource, user, )
