import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../header';
import { useAuth } from '@/hooks/use-auth';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

// Mock the next/image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} alt={props.alt} />;
  },
}));

describe('Header', () => {
  it('renders the header with the logo and title when not logged in', () => {
    // Arrange
    (useAuth as jest.Mock).mockReturnValue({
      user: null, // Simulate that the user is not logged in
      loading: false,
    });

    // Act
    render(<Header />);

    // Assert
    const logo = screen.getByRole('img', { name: /logo/i });
    expect(logo).toBeInTheDocument();

    const title = screen.getByText(/Mermaid Cloud Viz/i);
    expect(title).toBeInTheDocument();

    const loginButton = screen.getByRole('button', { name: /Login/i });
    expect(loginButton).toBeInTheDocument();
  });

  it('renders the header with the user menu when logged in', () => {
    // Arrange
    (useAuth as jest.Mock).mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com' }, // Simulate a logged in user
      loading: false,
    });

    // Act
    render(<Header />);

    // Assert
    const userAvatar = screen.getByText(/T/i); // Assuming the avatar shows the first letter of the user's name
    expect(userAvatar).toBeInTheDocument();
  });
});
