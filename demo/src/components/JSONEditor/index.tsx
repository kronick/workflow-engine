import React from "react";
import AceEditor from "react-ace";

import "brace/mode/json";
import "brace/theme/github";

import styles from "./JSONEditor.module.css";

interface JSONEditorProps {
  contents: string;
  onBuild: (neValue: string) => void;
  error?: string | null;
  maxLines: number;
  title: string;
}

interface JSONEditorState {
  dirty: boolean;
  contents: string;
}

export default class JSONEditor extends React.Component<
  JSONEditorProps,
  JSONEditorState
> {
  constructor(props: JSONEditorProps) {
    super(props);
    this.state = {
      dirty: false,
      contents: this.props.contents
    };
  }

  componentDidUpdate(prevProps: JSONEditorProps) {
    if (this.props.contents !== prevProps.contents) {
      this.setState({ contents: this.props.contents, dirty: false });
    }
  }

  handleChange = (newValue: string) => {
    this.setState({ contents: newValue, dirty: true });
  };

  rebuild = () => {
    this.props.onBuild(this.state.contents);
  };

  render() {
    //const messasge =
    return (
      <div className={styles.container}>
        <div className={styles.title}>{this.props.title}</div>
        <div className={styles.editorContainer}>
          <AceEditor
            className={styles.editor}
            mode="json"
            theme="github"
            name="System Editor"
            height={"100%"}
            maxLines={this.props.maxLines}
            fontSize={14}
            onChange={this.handleChange}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            value={this.state.contents}
            setOptions={{
              enableBasicAutocompletion: false,
              enableLiveAutocompletion: false,
              enableSnippets: false,
              showLineNumbers: true,
              tabSize: 2
            }}
            editorProps={{
              $blockScrolling: Infinity
            }}
            wrapEnabled
          />
        </div>
        <div className={styles.controls}>
          <div className={styles.message}>
            {this.props.error ? `${this.props.error} ❌` : "✅"}
          </div>
          <button disabled={!this.state.dirty} onClick={this.rebuild}>
            Re-build
          </button>
        </div>
      </div>
    );
  }
}
