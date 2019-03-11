import React from "react";
import { HistoryEvent } from "pg-workflow-engine/dist/dataLoader/index";

interface HistoryLogProps {
  events: HistoryEvent[];
}

const HistoryLog: React.SFC<HistoryLogProps> = ({ events }) => {
  return (
    <>
      <div>History</div>
      {events.map((m, i) => (
        <div key={i}>{JSON.stringify(m)}</div>
      ))}
    </>
  );
};

export default HistoryLog;
