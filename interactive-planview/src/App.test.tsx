import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Interactive Planview Application/i)).toBeInTheDocument();
  });

  it('shows the file upload component', () => {
    render(<App />);
    expect(screen.getByText(/Last opp SVG planview/i)).toBeInTheDocument();
  });

  it('shows the Kiro hooks features', () => {
    render(<App />);
    expect(screen.getByText(/Kiro Hooks Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Event-driven architecture/i)).toBeInTheDocument();
  });
});