
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardTile } from '@/components/DashboardTile';
// Mock lucide-react icons used by DashboardTile if they are complex or cause issues in tests
// For simple SVG icons, this might not be strictly necessary.
// jest.mock('lucide-react', () => ({
//   ...jest.requireActual('lucide-react'), // Import and retain default behavior
//   Home: () => <svg data-testid="home-icon" />, // Example mock
//   Users: () => <svg data-testid="users-icon" />,
//   BarChart3: () => <svg data-testid="barchart-icon" />,
//   Package: () => <svg data-testid="package-icon" />,
//   Receipt: () => <svg data-testid="receipt-icon" />,
//   ShoppingCart: () => <svg data-testid="shoppingcart-icon" />,
//   // Add other icons used by DashboardTile as needed
//   FallbackIcon: () => <svg data-testid="fallback-icon" />,
// }));

describe('DashboardTile', () => {
  const defaultProps = {
    title: 'Test Tile',
    description: 'This is a test description.',
    iconName: 'Home', // Ensure 'Home' is a valid key in your iconMap
    href: '/test-path',
  };

  it('renders the title and description', () => {
    render(<DashboardTile {...defaultProps} />);
    expect(screen.getByText('Test Tile')).toBeInTheDocument();
    expect(screen.getByText('This is a test description.')).toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    render(<DashboardTile {...defaultProps} />);
    const linkElement = screen.getByRole('link');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/test-path');
  });

  it('renders an icon', () => {
    const { container } = render(<DashboardTile {...defaultProps} iconName="Users" />); // Assuming Users is valid
    // This is a basic check. If you mocked icons with testids, you could query for that.
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders as a button and calls onClick when action is provided', () => {
    const handleClick = jest.fn();
    render(
      <DashboardTile
        title="Action Tile"
        iconName="Package" // Assuming Package is valid
        onClick={handleClick}
      />
    );
    const buttonElement = screen.getByRole('button', { name: /Action Tile/i });
    expect(buttonElement).toBeInTheDocument();
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(<DashboardTile {...defaultProps} className="custom-bg-color" />);
    // Check if the Card component, which is the root of DashboardTile's rendered content, has the class
    // Note: This queries the first child of the link/button wrapper if href/onClick is present.
    // If DashboardTile directly returned Card, it would be container.firstChild.
    // Depending on structure, may need adjustment.
    const cardElement = container.querySelector('.custom-bg-color');
    expect(cardElement).toBeInTheDocument();
  });
});
