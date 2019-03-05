import React from "react";

import AceEditor from "react-ace";

import "brace/mode/json";
import "brace/theme/kuroir";

import styles from "./WorkflowDemoApp.module.css";

//import { switchSystem } from "../../../../src/mocks/systems";
const switchSystem = "";

interface WorkflowDemoAppProps {}

interface WorkflowDemoAppState {
  systemDefinition: string;
}

export default class WorkflowDemoApp extends React.Component<
  WorkflowDemoAppProps,
  WorkflowDemoAppState
> {
  constructor(props: WorkflowDemoAppProps) {
    super(props);
    this.state = {
      systemDefinition: JSON.stringify(switchSystem)
    };
  }

  render() {
    return (
      <div className={styles.app}>
        <div className={styles.leftPanel}>List</div>
        <div className={styles.midPanel}>
          <div className={styles.docView}>Doc</div>
          <div className={styles.systemView}>
            <AceEditor
              mode="json"
              theme="kuroir"
              name="System Editor"
              fontSize={14}
              showPrintMargin={false}
              showGutter={false}
              highlightActiveLine={true}
              value={this.state.systemDefinition}
              setOptions={{
                enableBasicAutocompletion: false,
                enableLiveAutocompletion: false,
                enableSnippets: false,
                showLineNumbers: true,
                tabSize: 2
              }}
            />
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.userView}>User</div>
          <div className={styles.expressionsView}>Expressions</div>
        </div>
      </div>
    );
  }
}
