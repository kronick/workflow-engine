import React from "react";

import { PGBusinessEngine } from "pg-workflow-engine";
import { switchSystem } from "pg-workflow-engine/dist/mocks/systems";
import {
  InMemoryDataLoader,
  FakeInMemoryDataLoader
} from "pg-workflow-engine/dist/dataLoader";
import { User } from "pg-workflow-engine/dist/types";

import SystemEditor from "../SystemEditor";
import ListView from "../ListView/index";

import styles from "./WorkflowDemoApp.module.css";
import { timingSafeEqual } from "crypto";

interface WorkflowDemoAppProps {}

interface WorkflowDemoAppState {
  systemDefinition: string;
  dataLoader: InMemoryDataLoader;
  engine: PGBusinessEngine;

  systemError?: string | null;

  resourceList: ResourceList;
  user: User;

  selectedResourceID: ResourceID | null;
  selectedResourceData: ResourceData | null;
}

export type ResourceData = ResourceID & { [property: string]: unknown };
export type ResourceID = { uid: string; type: string };
type ResourceList = { [type: string]: ResourceID[] };

export default class WorkflowDemoApp extends React.Component<
  WorkflowDemoAppProps,
  WorkflowDemoAppState
> {
  constructor(props: WorkflowDemoAppProps) {
    super(props);
    const dataLoader = new FakeInMemoryDataLoader(switchSystem, 5);
    this.state = {
      systemDefinition: JSON.stringify(switchSystem, null, 2),
      dataLoader,
      engine: new PGBusinessEngine(switchSystem, dataLoader),
      resourceList: {},
      user: { uid: "0", roles: [], firstName: "", lastName: "", email: "" },
      selectedResourceID: null,
      selectedResourceData: null
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
      this.state.selectedResourceID !== prevState.selectedResourceID
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
        systemDefinition: newDefinition
      });
    } catch (e) {
      this.setState({ systemError: e.toString() });
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
      if (selectedResourceData) {
        this.setState({ selectedResourceData });
      } else {
        console.error("Cannot find resource", this.state.selectedResourceID);
      }
    }

    this.setState({ resourceList });
  };

  selectResource = (id: ResourceID) => {
    this.setState({ selectedResourceID: id });
  };

  render() {
    return (
      <div className={styles.app}>
        <div className={styles.leftPanel}>
          <SystemEditor
            contents={this.state.systemDefinition}
            onBuild={this.rebuildEngine}
            error={this.state.systemError}
          />
        </div>
        <div className={styles.midPanel}>
          <div className={styles.listView}>
            <ListView
              resources={this.state.resourceList}
              onSelect={this.selectResource}
            />
          </div>
          <div className={styles.docView}>
            {JSON.stringify(this.state.selectedResourceData)}
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.userView}>
            {JSON.stringify(this.state.user)}
          </div>
          <div className={styles.expressionsView}>Expressions</div>
        </div>
      </div>
    );
  }
}
