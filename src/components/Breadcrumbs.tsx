// src/components/Breadcrumbs.tsx
import React from 'react';
import { type BreadcrumbsProps } from '../interfaces';

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ flowPath }) => {
  return (
    <div className="mb-6 text-sm text-gray-600">
      {flowPath.map((step, index) => (
        <React.Fragment key={step.id}>
          {index > 0 && (
            <>
              <span className="mx-1 text-gray-400">&gt;</span>
              <br /> {/* Line break after '>' */}
              <span className="inline-block pl-4"> {/* Indentation */}
                {step.text}
              </span>
            </>
          )}
          {index === 0 && (
            <span className={`${index === flowPath.length - 1 ? 'font-semibold text-indigo-700' : 'text-gray-500'}`}>
              {step.text}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;
