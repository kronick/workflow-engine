import React from "react";
import { EmailServiceMessage } from "pg-workflow-engine/dist/emailService";

interface EmailLogProps {
  messages: EmailServiceMessage[];
}

const EmailLog: React.SFC<EmailLogProps> = ({ messages }) => {
  return (
    <>
      <div>Email debugger</div>
      {messages.map((m, i) => (
        <div key={i}>
          <div>
            To: <code>{m.to}</code>
          </div>
          <div>
            Template: <code>{m.template}</code>
          </div>
          <div>
            Params: <code>{JSON.stringify(m.params)}</code>
          </div>
        </div>
      ))}
    </>
  );
};

export default EmailLog;
