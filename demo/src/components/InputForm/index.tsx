import * as React from "react";
import {
  InputDefinition,
  PropertyTypeDefinition
} from "pg-workflow-engine/dist/types";

interface InputFormProps {
  inputDefinition: InputDefinition;
  onSubmit: (data: Record<string, unknown>) => void;
  initialValues?: Record<string, unknown>;
}

interface InputFormState {
  values: Record<string, unknown>;
}

export default class InputForm extends React.Component<
  InputFormProps,
  InputFormState
> {
  constructor(props: InputFormProps) {
    super(props);
    this.state = {
      values: props.initialValues || {}
    };
  }

  handleChange = (field: string, value: unknown) => {
    this.setState({ values: { ...this.state.values, [field]: value } });
  };

  render() {
    return (
      <div>
        {Object.entries(this.props.inputDefinition.fields).map(
          ([fieldName, fieldDefinition]) => (
            <div key={fieldName}>
              <label>{fieldName}:</label>{" "}
              <FormField
                name={fieldName}
                value={null}
                type={fieldDefinition.type}
                onChange={ev => this.handleChange(fieldName, ev.target.value)}
              />
            </div>
          )
        )}
        <button onClick={() => this.props.onSubmit(this.state.values)}>
          Submit
        </button>
      </div>
    );
  }
}

const FormField: React.SFC<{
  name: string;
  value: unknown;
  type: PropertyTypeDefinition;
  onChange: (
    ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}> = props => {
  switch (props.type) {
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={props.value as boolean}
          onChange={props.onChange}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={String(props.value)}
          onChange={props.onChange}
        />
      );
    case "string":
    default:
      if (props.name === "text") {
        return (
          <textarea value={props.value as string} onChange={props.onChange} />
        );
      } else {
        return (
          <input
            type="text"
            value={props.value as string}
            onChange={props.onChange}
          />
        );
      }
  }
};
