// src/components/Breadcrumbs.tsx
import React, { useState } from 'react';
import type { BreadcrumbsProps, FlowPathEntry } from '../interfaces';
import { ChevronDown, ChevronRight, Home } from 'lucide-react'; // Using Chevrons for expand/collapse

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ flowPath }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!flowPath || flowPath.length === 0) {
    return null;
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const firstStep = flowPath[0];
  const lastStep = flowPath[flowPath.length - 1];
  const itemsToShowWhenCollapsed = 2; // Show first and last

  // Always render full path if it's short, or if expanded
  if (isExpanded || flowPath.length <= itemsToShowWhenCollapsed) {
    return (
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
        <ol className="list-none p-0 inline-flex flex-col items-start">
          {flowPath.map((step, index) => (
            <li key={step.id} className={`flex items-center ${index > 0 ? 'mt-1' : ''}`}>
              {index === 0 && flowPath.length > itemsToShowWhenCollapsed && (
                <button
                  onClick={toggleExpand}
                  className="mr-1 p-0.5 rounded hover:bg-gray-200"
                  aria-label={isExpanded ? "Collapse breadcrumbs" : "Expand breadcrumbs"}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {index === 0 && step.id === 'start' && <Home size={14} className="mr-1.5 flex-shrink-0" />}
              <span className={`${index === flowPath.length - 1 ? 'font-semibold text-indigo-700' : 'text-gray-500'} ${index > 0 ? 'pl-4' : ''}`}>
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Collapsed view for longer paths
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
      <ol className="list-none p-0 inline-flex flex-col items-start">
        <li className="flex items-center">
          <button
            onClick={toggleExpand}
            className="mr-1 p-0.5 rounded hover:bg-gray-200"
            aria-label="Expand breadcrumbs"
          >
            <ChevronRight size={16} />
          </button>
          {firstStep.id === 'start' && <Home size={14} className="mr-1.5 flex-shrink-0" />}
          <span className="text-gray-500">{firstStep.text}</span>
        </li>

        <li className="flex items-center mt-1">
          <span className="ml-1 mr-1 p-0.5 text-gray-400">...</span>
          {/* Current step is usually the last one. If it's the same as first (path length 1 effectively), it's already shown. */}
          {/* This logic ensures we don't repeat if first and last are same after collapse logic, though current outer condition flowPath.length > 2 handles this. */}
          {lastStep.id !== firstStep.id && (
             <span className="font-semibold text-indigo-700 pl-4"> {/* Indentation for current step */}
                {lastStep.text}
             </span>
          )}
        </li>
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
