import React from "react";
import { ResourceData } from "../WorkflowDemoApp";
import { PGBusinessEngine } from "pg-workflow-engine";
import { PropertyTypeDefinition } from "pg-workflow-engine/dist/types";

import styles from "./ResourceDetail.module.css";

interface ResourceDetailProps {
  resource: ResourceData | null;
  engine: PGBusinessEngine;
}

interface ResourceDetailState {
  editedResource: ResourceData;
}

export default class ResourceDetail extends React.Component<
  ResourceDetailProps,
  ResourceDetailState
> {
  render() {
    const resource = this.props.resource;
    if (!resource) {
      return "No resource selected.";
    }

    const system = this.props.engine.system;
    const type = resource.type;
    const properties = system.resources[type].properties;

    if (!properties) {
      return "No properties.";
    }

    return (
      <div>
        {Object.keys(properties).map(p => (
          <div key={p}>
            {p}: {renderProperty(resource[p], properties[p].type)}
          </div>
        ))}
        {resource.state !== undefined ? (
          <div key={"state"}>State: {resource["state"]}</div>
        ) : null}
      </div>
    );
  }
}

const renderProperty = (value: unknown, type: PropertyTypeDefinition) => {
  return value ? (
    <div className={styles.propertyValue}>{String(value)}</div>
  ) : (
    <div className={`${styles.propertyValue} ${styles.undefinedValue}`}>
      undefined
    </div>
  );
};
