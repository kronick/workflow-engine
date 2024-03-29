import React from "react";
import { ResourceData } from "../WorkflowDemoApp";
import { PGBusinessEngine, DescribeActionsResult } from "pg-workflow-engine";
import { PropertyTypeDefinition, User } from "pg-workflow-engine/dist/types";

import HistoryLog from "../HistoryLog";

import styles from "./ResourceDetail.module.css";
import { HistoryEvent } from "pg-workflow-engine/dist/dataLoader/index";
import InputForm from "../InputForm";

interface ResourceDetailProps {
  resource?: ResourceData | null;
  historyEvents?: HistoryEvent[];
  engine: PGBusinessEngine;
  user: User | null;
  onUpdate: () => void;
  onError: (errors: string[]) => void;
}

interface ResourceDetailState {
  editedResource?: ResourceData | null;
  actions: DescribeActionsResult | null;
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
      actions: null
    };
  }

  componentDidMount() {
    this.fetchStateActions();
  }

  componentDidUpdate(prevProps: ResourceDetailProps) {
    if (
      this.props.resource !== prevProps.resource ||
      this.props.engine !== prevProps.engine ||
      this.props.user !== prevProps.user
    ) {
      this.fetchStateActions();
    }
  }

  fetchStateActions = async () => {
    if (!this.props.resource || !this.props.user) return;

    const result = await this.props.engine.describeActions({
      uid: this.props.resource.uid,
      type: this.props.resource.type,
      asUser: this.props.user
    });

    this.setState({ actions: result });
  };

  handleAction = async (action: string, input?: Record<string, unknown>) => {
    if (this.props.resource && this.props.user) {
      const result = await this.props.engine.performAction({
        uid: this.props.resource.uid,
        type: this.props.resource.type,
        asUser: this.props.user,
        action,
        input
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

            {this.state.actions
              ? this.state.actions.map(t => (
                  <ActionDetail onAction={this.handleAction} action={t} />
                ))
              : null}
          </tbody>
        </table>

        {this.props.historyEvents && (
          <HistoryLog events={this.props.historyEvents} />
        )}
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
  action: DescribeActionsResult[0];
  onAction: (actionName: string, input?: Record<string, unknown>) => void;
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
        {props.action.input ? (
          props.action.action
        ) : (
          <button
            onClick={() => props.onAction(props.action.action)}
            className={[
              styles.actionButton,
              disabled ? styles.disabled : undefined
            ].join(" ")}
          >
            {props.action.action}
          </button>
        )}
      </td>

      <td className={styles.propertyValue}>
        {disabled ? (
          <div>
            {disabledIcon}{" "}
            <span className={styles.actionReason}>{disabledReason}</span>
          </div>
        ) : (
          props.action.input && (
            <div>
              <InputForm
                inputDefinition={props.action.input}
                onSubmit={data => props.onAction(props.action.action, data)}
              />
            </div>
          )
        )}
      </td>
    </tr>
  );
};
