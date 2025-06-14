import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Breadcrumbs from './Breadcrumbs';
import type { FlowPathEntry } from '../interfaces';

// Mock Lucide icons for testing
vi.mock('lucide-react', async (importOriginal) => {
  const original = await importOriginal() as Record<string, any>;
  return {
    ...original,
    ChevronDown: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
    ChevronRight: (props: any) => <svg data-testid="chevron-right-icon" {...props} />,
    Home: (props: any) => <svg data-testid="home-icon" {...props} />,
  };
});

const mockFlowPathShort: FlowPathEntry[] = [
  { id: 'start', text: 'Inicio' },
  { id: 'q1', text: 'Question 1' },
];

const mockFlowPathLong: FlowPathEntry[] = [
  { id: 'start', text: 'Inicio' },
  { id: 'q1', text: 'Question 1' },
  { id: 'q2', text: 'Question 2' },
  { id: 'q3', text: 'Question 3 - Current' },
];

describe('Breadcrumbs', () => {
  it('renders null if flowPath is empty or undefined', () => {
    const { container: containerEmpty } = render(<Breadcrumbs flowPath={[]} />);
    expect(containerEmpty.firstChild).toBeNull();

    const { container: containerUndefined } = render(<Breadcrumbs flowPath={undefined as any} />);
    expect(containerUndefined.firstChild).toBeNull();
  });

  it('renders full path if flowPath has 1 item, no expander', () => {
    const singleItemPath: FlowPathEntry[] = [{ id: 'start', text: 'Inicio' }];
    render(<Breadcrumbs flowPath={singleItemPath} />);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByTestId('chevron-right-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
  });

  it('renders full path if flowPath has 2 items, no expander initially', () => {
    render(<Breadcrumbs flowPath={mockFlowPathShort} />);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    // The expander logic shows for > 2 items, but button is rendered for > itemsToShowWhenCollapsed (which is 2)
    // So expander appears, but it will show full path as isExpanded defaults to false but path.length <= 2 rule applies.
    // Let's verify that clicking it still works and doesn't change visible items.
    const expandButton = screen.queryByRole('button', { name: /expand breadcrumbs/i });
    expect(expandButton).toBeInTheDocument(); // Expander should be there if path length > itemsToShowWhenCollapsed (2)
    fireEvent.click(expandButton!);
    expect(screen.getByText('Inicio')).toBeInTheDocument(); // Still visible
    expect(screen.getByText('Question 1')).toBeInTheDocument(); // Still visible
  });

  it('renders collapsed path if flowPath has more than 2 items initially', () => {
    render(<Breadcrumbs flowPath={mockFlowPathLong} />);
    expect(screen.getByText('Inicio')).toBeInTheDocument(); // First item
    expect(screen.getByText('...')).toBeInTheDocument();    // Ellipsis
    expect(screen.getByText('Question 3 - Current')).toBeInTheDocument(); // Last item
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Question 2')).not.toBeInTheDocument();
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument(); // Expand icon
  });

  it('expands to show full path when expand indicator is clicked', () => {
    render(<Breadcrumbs flowPath={mockFlowPathLong} />);
    // Initially collapsed
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: /expand breadcrumbs/i });
    fireEvent.click(expandButton);

    // Now expanded
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.getByText('Question 3 - Current')).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument(); // Collapse icon
  });

  it('collapses the path when collapse indicator is clicked after expansion', () => {
    render(<Breadcrumbs flowPath={mockFlowPathLong} />);
    const expandButton = screen.getByRole('button', { name: /expand breadcrumbs/i });

    // Expand first
    fireEvent.click(expandButton);
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();

    // Click again to collapse (button's aria-label might change, or we get it again)
    const collapseButton = screen.getByRole('button', { name: /collapse breadcrumbs/i });
    fireEvent.click(collapseButton);

    // Back to collapsed
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('Question 3 - Current')).toBeInTheDocument();
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
  });

  it('renders Home icon for the first step if id is "start"', () => {
    render(<Breadcrumbs flowPath={mockFlowPathLong} />);
    // Collapsed view
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    // Expand
    fireEvent.click(screen.getByRole('button', { name: /expand breadcrumbs/i }));
    expect(screen.getByTestId('home-icon')).toBeInTheDocument(); // Should still be there
  });
});
