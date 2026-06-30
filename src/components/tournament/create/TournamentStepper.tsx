import React from 'react';
import { FiCheck } from 'react-icons/fi';

interface TournamentStepperProps {
  currentStep: number;
  totalSteps: number;
  labels: readonly string[];
}

export const TournamentStepper: React.FC<TournamentStepperProps> = ({
  currentStep,
  totalSteps,
  labels,
}) => (
  <div className="ct-stepper" role="list" aria-label="Pasos del proceso">
    {labels.map((label, idx) => {
      const stepNumber = idx + 1;
      const done = currentStep > stepNumber;
      const active = currentStep === stepNumber;

      return (
        <React.Fragment key={label}>
          <div
            className={`ct-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
            role="listitem"
            aria-current={active ? 'step' : undefined}
          >
            <span className="ct-step-num">
              {done ? <FiCheck aria-hidden="true" /> : stepNumber}
            </span>
            <span className="ct-step-label">{label}</span>
          </div>
          {stepNumber < totalSteps && (
            <span
              className={`ct-step-divider ${done ? 'done' : ''}`}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);
