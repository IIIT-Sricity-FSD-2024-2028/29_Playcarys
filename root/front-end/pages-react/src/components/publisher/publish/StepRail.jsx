import React from 'react';

const STEPS = ['Hosting Mode', 'Basic Info', 'Game Details', 'Review & Submit'];

export function StepRail({ currentStep = 0 }) {
  return (
    <div className="step-rail" id="step-rail">
      {STEPS.map((label, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const cls = isDone ? 'done' : isActive ? 'active' : '';
        const lineClass = isDone ? 'done' : '';
        const circle = isDone ? '✓' : i + 1;

        return (
          <React.Fragment key={label}>
            <div className={`step-node ${cls}`}>
              <div className="step-circle">{circle}</div>
              <div className="step-label">{label}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${lineClass}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default StepRail;
