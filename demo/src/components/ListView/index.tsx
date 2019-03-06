import React from "react";
import { SystemDefinition } from "pg-workflow-engine/dist/types";
import { PGBusinessEngine } from "pg-workflow-engine";
import { ResourceID } from "../WorkflowDemoApp";

interface ListViewProps {
  resources: {
    [type: string]: Array<{ uid: string }>;
  };

  onSelect: (id: ResourceID) => void;
}

export default class ListView extends React.Component<ListViewProps> {
  render() {
    return (
      <ul>
        {Object.keys(this.props.resources).map(t => (
          <li>
            {t}
            <ul>
              {this.props.resources[t].map(r => (
                <li>
                  <button
                    onClick={() => this.props.onSelect({ uid: r.uid, type: t })}
                  >
                    {r.uid}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }
}
