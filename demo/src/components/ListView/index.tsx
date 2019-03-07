import React, { ChangeEvent } from "react";
import { SystemDefinition } from "pg-workflow-engine/dist/types";
import { PGBusinessEngine } from "pg-workflow-engine";
import { ResourceID } from "../WorkflowDemoApp";

interface ListViewProps {
  resources: {
    [type: string]: Array<{ uid: string }>;
  };

  selected?: ResourceID;

  onSelect: (id: ResourceID) => void;
}

export default class ListView extends React.Component<ListViewProps> {
  handleChange = (ev: ChangeEvent<HTMLSelectElement>) => {
    const [type, uid] = ev.target.value.split("#");
    this.props.onSelect({ type, uid });
  };

  render() {
    return (
      <select onChange={this.handleChange} className="BigSelect">
        {Object.keys(this.props.resources).map(t => (
          <optgroup key={t} label={t}>
            {this.props.resources[t].map(r => (
              <option
                key={r.uid}
                value={`${t}#${r.uid}`}
                selected={
                  this.props.selected &&
                  this.props.selected.uid === r.uid &&
                  this.props.selected.type === t
                }
              >
                {t}#{r.uid}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }
}
