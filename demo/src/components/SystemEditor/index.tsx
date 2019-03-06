import React from "react";
import AceEditor from "react-ace";

import "brace/mode/json";
import "brace/theme/kuroir";

import styles from "./SystemEditor.module.css";

interface SystemEditorProps {
  contents: string;
  onBuild: (neValue: string) => void;
  error?: string | null;
}

interface SystemEditorState {
  dirty: boolean;
  contents: string;
}

export default class SystemEditor extends React.Component<
  SystemEditorProps,
  SystemEditorState
> {
  constructor(props: SystemEditorProps) {
    super(props);
    this.state = {
      dirty: false,
      contents: this.props.contents
    };
  }

  componentDidUpdate(prevProps: SystemEditorProps) {
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
    return (
      <div className={styles.container}>
        <div className={styles.editorContainer}>
          <AceEditor
            className={styles.editor}
            mode="json"
            theme="kuroir"
            name="System Editor"
            maxLines={Infinity}
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
          <div className={styles.error}>
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
