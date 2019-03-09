import React from "react";
import { ResourceData } from "../WorkflowDemoApp";
import {
  PGBusinessEngine,
  DescribeTransitionsResult
} from "pg-workflow-engine";
import { PropertyTypeDefinition, User } from "pg-workflow-engine/dist/types";

import styles from "./ResourceDetail.module.css";

interface ResourceDetailProps {
  resource?: ResourceData | null;
  engine: PGBusinessEngine;
  user: User | null;
  onUpdate: () => void;
  onError: (errors: string[]) => void;
}

interface ResourceDetailState {
  editedResource?: ResourceData | null;
  stateTransitions: DescribeTransitionsResult | null;
  hasError?: boolean;
}

export default class ResourceDetail extends React.Component<
  ResourceDetailProps,
  ResourceDetailState
> {
  constructor(props: ResourceDetailProps) {
    super(props);
    this.state = {
      editedResource: this.props.resource,
      stateTransitions: null
    };
  }

  componentDidMount() {
    this.fetchStateTransitions();
  }

  componentDidUpdate(prevProps: ResourceDetailProps) {
    if (
      this.props.resource !== prevProps.resource ||
      this.props.engine !== prevProps.engine ||
      this.props.user !== prevProps.user
    ) {
      this.fetchStateTransitions();
    }
  }

  fetchStateTransitions = async () => {
    if (!this.props.resource || !this.props.user) return;

    const result = await this.props.engine.describeTransitions({
      uid: this.props.resource.uid,
      type: this.props.resource.type,
      asUser: this.props.user
    });

    this.setState({ stateTransitions: result });
  };

  handleAction = async (action: string) => {
    if (this.props.resource && this.props.user) {
      const result = await this.props.engine.performAction({
        uid: this.props.resource.uid,
        type: this.props.resource.type,
        asUser: this.props.user,
        action
      });

      if (!result.success) {
        this.props.onError(result.errors);
      }
      this.props.onUpdate();
    } else {
      console.error(
        "Tried to perform action with no resource or user specified.",
        action,
        this.props.resource,
        this.props.user
      );
    }
  };

  render() {
    const resource = this.props.resource;
    if (resource === undefined) {
      return "Resource not found.";
    }
    if (resource === null) {
      return "No resource selected.";
    }

    const system = this.props.engine.system;
    const type = resource.type;
    const typeDef = system.resources[type];
    if (!typeDef) {
      return "Error";
    }
    const properties = system.resources[type].properties;
    const calculatedProperties =
      system.resources[type].calculatedProperties || {};

    if (!properties) {
      return "No properties.";
    }

    return (
      <div className={styles.container}>
        <table className={styles.propertyTable}>
          <tbody>
            {Object.keys(properties).map(p => (
              <PropertyDetail
                key={p}
                name={p}
                value={resource[p]}
                type={properties[p].type}
              />
            ))}
            {Object.keys(calculatedProperties).map(p => (
              <PropertyDetail
                key={p}
                name={p}
                value={resource[p]}
                type={calculatedProperties[p].type}
              />
            ))}
            {resource.state !== undefined ? (
              <PropertyDetail
                key={"state"}
                name={"state"}
                value={{ value: resource["state"], errors: [] }}
                type={"string"}
                readonly
              />
            ) : null}

            {this.state.stateTransitions
              ? this.state.stateTransitions.map(t => (
                  <ActionDetail onAction={this.handleAction} action={t} />
                ))
              : null}
          </tbody>
        </table>
      </div>
    );
  }
}

const PropertyDetail: React.SFC<{
  name: string;
  value: { value: unknown; errors: string[] };
  type: PropertyTypeDefinition;
  readonly?: boolean;
}> = props => {
  return (
    <tr key={props.name} className={styles.propertyRow}>
      <td className={styles.propertyName}>{props.name}</td>

      {props.value.value !== undefined ? (
        <td className={styles.propertyValue}>
          {props.value.value}
          {/* <PropertyEditor {...props} /> */}
        </td>
      ) : (
        <td className={`${styles.propertyValue} ${styles.undefinedValue}`}>
          {props.value.errors.length
            ? props.value.errors.map(e => <div>{e}</div>)
            : "undefined"}
        </td>
      )}
    </tr>
  );
};

const PropertyEditor: React.SFC<{
  name: string;
  value: { value: unknown; errors: string[] };
  type: PropertyTypeDefinition;
  readonly?: boolean;
}> = props => {
  switch (props.type) {
    case "boolean":
      return <input type="checkbox" checked={props.value.value as boolean} />;
    case "number":
      return <input type="number" value={String(props.value.value)} />;
    case "string":
    default:
      if (props.readonly) {
        return <div>{props.value.value as string}</div>;
      }
      if (props.name === "text") {
        return <textarea value={props.value.value as string} />;
      } else {
        return <input type="text" value={props.value.value as string} />;
      }
  }
};

const ActionDetail: React.SFC<{
  action: DescribeTransitionsResult[0];
  onAction: (actionName: string, data: unknown | null) => void;
}> = props => {
  let disabled = false;
  let disabledReason = "";
  let disabledIcon: React.ReactNode = "";
  if (!props.action.possible) {
    disabled = true;
    disabledIcon = "❌";
    disabledReason =
      props.action.possibleReason || "Not possible (no reason specified).";
  } else if (!props.action.allowed) {
    disabled = true;
    disabledIcon = "🔐";
    disabledReason =
      props.action.allowedReason || "Not allowed (no reason specified).";
  }

  return (
    <tr>
      <td className={styles.actionName}>
        <button
          onClick={() => props.onAction(props.action.action, null)}
          className={[
            styles.actionButton,
            disabled ? styles.disabled : undefined
          ].join(" ")}
        >
          {props.action.action}
        </button>{" "}
      </td>
      {disabled && (
        <td className={styles.propertyValue}>
          <div>
            {disabledIcon}{" "}
            <span className={styles.actionReason}>{disabledReason}</span>
          </div>
        </td>
      )}
    </tr>
  );
};
