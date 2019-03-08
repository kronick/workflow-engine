import React from "react";

import { PGBusinessEngine } from "pg-workflow-engine";
import { switchSystem } from "pg-workflow-engine/dist/mocks/systems";
import { simpleDefinition } from "pg-workflow-engine/dist/example/simple";
import {
  InMemoryDataLoader,
  FakeInMemoryDataLoader
} from "pg-workflow-engine/dist/dataLoader";
import { User } from "pg-workflow-engine/dist/types";

import JSONEditor from "../JSONEditor";
import ListView from "../ListView/index";

import styles from "./WorkflowDemoApp.module.css";
import "./GlobalStyles.css";
import ResourceDetail from "../ResourceDetail";

interface WorkflowDemoAppProps {}

interface WorkflowDemoAppState {
  systemDefinition: string;
  dataLoader: InMemoryDataLoader;
  engine: PGBusinessEngine;

  systemError?: string | null;
  userError?: string | null;

  resourceList: ResourceList;
  user: User;

  selectedResourceID: ResourceID | null;
  selectedResourceData?: ResourceData | null;

  consoleOutput: ConsoleMessage[];
}

type ConsoleMessage = { type: "error" | "warning" | "debug"; text: string };

export type ResourceData = {
  [property: string]: { value: unknown; errors: string[] };
} & ResourceID & { state: string };
export type ResourceID = { uid: string; type: string };
type ResourceList = { [type: string]: ResourceID[] };

export default class WorkflowDemoApp extends React.Component<
  WorkflowDemoAppProps,
  WorkflowDemoAppState
> {
  constructor(props: WorkflowDemoAppProps) {
    super(props);
    const dataLoader = new FakeInMemoryDataLoader(simpleDefinition, 5);
    this.state = {
      systemDefinition: JSON.stringify(simpleDefinition, null, 2),
      dataLoader,
      engine: new PGBusinessEngine(simpleDefinition, dataLoader),
      resourceList: {},
      user: { uid: "0", roles: [], firstName: "", lastName: "", email: "" },
      selectedResourceID: null,
      selectedResourceData: null,
      consoleOutput: []
    };
  }

  componentDidMount() {
    this.refetchData();
  }

  componentDidUpdate(
    prevProps: WorkflowDemoAppProps,
    prevState: WorkflowDemoAppState
  ) {
    if (
      this.state.engine !== prevState.engine ||
      this.state.dataLoader !== prevState.dataLoader ||
      this.state.selectedResourceID !== prevState.selectedResourceID ||
      this.state.user !== prevState.user
    ) {
      this.refetchData();
    }
  }

  rebuildEngine = (newDefinition: string, reloadData: boolean = true) => {
    try {
      const parsed = JSON.parse(newDefinition);
      // TODO: Need a way to reset data load in case this borks
      const dataLoader = reloadData
        ? new FakeInMemoryDataLoader(parsed, 5)
        : this.state.dataLoader;
      dataLoader.loadDefinition(parsed);
      const engine = new PGBusinessEngine(parsed, dataLoader);
      this.setState({
        engine,
        dataLoader,
        systemError: null,
        systemDefinition: JSON.stringify(parsed, null, 2),
        selectedResourceID: null,
        consoleOutput: []
      });
    } catch (e) {
      this.setState({ systemError: e.toString() });
    }
  };

  updateUser = (newDefinition: string) => {
    try {
      const parsed = JSON.parse(newDefinition);
      this.setState({ user: parsed, userError: null });
    } catch (e) {
      this.setState({ userError: e.toString() });
    }
  };

  refetchData = async () => {
    const types = this.state.engine.listResourceTypes();
    const resourceList: ResourceList = {};
    for (const t in types) {
      resourceList[types[t]] = await this.state.engine.listResources({
        type: types[t],
        asUser: this.state.user
      });
    }

    if (this.state.selectedResourceID) {
      const selectedResourceData = await this.state.engine.getResource({
        ...this.state.selectedResourceID,
        asUser: this.state.user
      });

      this.setState({ selectedResourceData: selectedResourceData.resource });
      if (selectedResourceData.errors) {
        this.logErrors(selectedResourceData.errors);
      }
    } else {
      try {
        this.setState({
          selectedResourceID: {
            type: types[0],
            uid: resourceList[types[0]][0].uid
          }
        });
      } catch (e) {}
    }

    this.setState({ resourceList });
  };

  logErrors = (errors: string[]) => {
    const errorObjects = errors.map(
      e => ({ type: "error", text: e } as ConsoleMessage)
    );
    this.setState({
      consoleOutput: [...this.state.consoleOutput, ...errorObjects]
    });
  };

  selectResource = (id: ResourceID) => {
    this.setState({ selectedResourceID: id });
  };

  render() {
    return (
      <div className={styles.app}>
        <div className={styles.leftPanel}>
          <div className={styles.userEditorView}>
            <JSONEditor
              title="User definition"
              contents={JSON.stringify(this.state.user, null, 2)}
              onBuild={this.updateUser}
              error={this.state.userError}
              maxLines={10}
            />
          </div>
          <div className={styles.systemEditorView}>
            <JSONEditor
              title="System definition"
              contents={this.state.systemDefinition}
              onBuild={this.rebuildEngine}
              error={this.state.systemError}
              maxLines={Infinity}
            />
          </div>
        </div>
        <div className={styles.midPanel}>
          <div className={styles.listView}>
            <ListView
              resources={this.state.resourceList}
              onSelect={this.selectResource}
            />
          </div>
          <div className={styles.docView}>
            <ResourceDetail
              user={this.state.user}
              engine={this.state.engine}
              resource={this.state.selectedResourceData}
              onUpdate={this.refetchData}
              onError={this.logErrors}
            />
          </div>
          <div className={styles.consoleView}>
            {this.state.consoleOutput
              .slice()
              .reverse()
              .map(e => (
                <div
                  className={[
                    styles.consoleLine,
                    e.type === "error"
                      ? styles.consoleError
                      : styles.consoleDebug
                  ].join(" ")}
                >
                  <div className={styles.consoleLineIndicator}>></div>
                  <div className={styles.consoleLineText}>{e.text}</div>
                </div>
              ))}
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.expressionsView}>Expressions</div>
        </div>
      </div>
    );
  }
}
