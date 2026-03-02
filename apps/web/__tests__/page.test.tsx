import { render, screen } from '@testing-library/react';
import Page from '../app/page';

describe('Web Page', () => {
  it('renders key UI sections', () => {
    render(<Page />);

    expect(screen.getByText('Self-RAG Chat Console')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Ingest Text')).toBeInTheDocument();
    expect(screen.getByText('Ingest File')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
  });

  it('shows empty sources state initially', () => {
    render(<Page />);
    expect(screen.getByText('No citations yet.')).toBeInTheDocument();
  });
});
