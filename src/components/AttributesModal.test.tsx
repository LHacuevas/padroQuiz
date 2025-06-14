import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AttributesModal from './AttributesModal';
import type { ExtractedEntity } from '../interfaces';

const mockOnClose = vi.fn();
const mockTitle = "Extracted Attributes";
const mockNoAttributesMessage = "No attributes found.";

const sampleEntities: ExtractedEntity[] = [
  { fieldName: "nombreCompleto", description: "Nombre Completo", value: "Carlos Gomez" },
  { fieldName: "numeroIdentificacion", description: "Número de Identificación", value: "XYZ12345" },
  { fieldName: "fechaNacimiento", description: "Fecha de Nacimiento", value: "1985-07-22" },
];

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  title: mockTitle,
  noAttributesMessage: mockNoAttributesMessage,
};

describe('AttributesModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should not render if isOpen is false', () => {
    render(<AttributesModal {...defaultProps} isOpen={false} data={sampleEntities} />);
    expect(screen.queryByText(mockTitle)).not.toBeInTheDocument();
  });

  it('renders correctly with a list of extracted entities', () => {
    render(<AttributesModal {...defaultProps} data={sampleEntities} />);

    expect(screen.getByText(mockTitle)).toBeInTheDocument();

    sampleEntities.forEach(entity => {
      expect(screen.getByText(`${entity.description}:`)).toBeInTheDocument();
      expect(screen.getByText(entity.value)).toBeInTheDocument();
    });

    expect(screen.queryByText(mockNoAttributesMessage)).not.toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('displays the "no attributes" message when data is an empty array', () => {
    render(<AttributesModal {...defaultProps} data={[]} />);

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockNoAttributesMessage)).toBeInTheDocument();

    // Check that no entity-like data is rendered (be careful with query selectors here)
    // For example, ensure no list items if your entities are rendered in a list
    const listItems = screen.queryAllByRole('listitem'); // Assuming entities are in <li>
    expect(listItems.length).toBe(0);

    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('displays the "no attributes" message when data is null', () => {
    render(<AttributesModal {...defaultProps} data={null} />);

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockNoAttributesMessage)).toBeInTheDocument();

    const listItems = screen.queryAllByRole('listitem');
    expect(listItems.length).toBe(0);

    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when the OK button is clicked', () => {
    render(<AttributesModal {...defaultProps} data={sampleEntities} />);
    fireEvent.click(screen.getByText('OK'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
