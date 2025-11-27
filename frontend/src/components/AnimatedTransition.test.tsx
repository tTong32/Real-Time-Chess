import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedTransition } from './AnimatedTransition';

describe('AnimatedTransition', () => {
  it('renders children when show is true', () => {
    render(
      <AnimatedTransition show={true}>
        <div>Test Content</div>
      </AnimatedTransition>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('does not render children when show is false', () => {
    render(
      <AnimatedTransition show={false}>
        <div>Test Content</div>
      </AnimatedTransition>
    );
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AnimatedTransition show={true} className="custom-class">
        <div>Test</div>
      </AnimatedTransition>
    );
    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('applies fade animation by default', () => {
    const { container } = render(
      <AnimatedTransition show={true}>
        <div>Test</div>
      </AnimatedTransition>
    );
    const element = container.querySelector('.animated-transition');
    expect(element?.className).toContain('fade');
  });

  it('applies slide animation when specified', () => {
    const { container } = render(
      <AnimatedTransition show={true} animation="slide">
        <div>Test</div>
      </AnimatedTransition>
    );
    const element = container.querySelector('.animated-transition');
    expect(element?.className).toContain('slide');
  });

  it('applies scale animation when specified', () => {
    const { container } = render(
      <AnimatedTransition show={true} animation="scale">
        <div>Test</div>
      </AnimatedTransition>
    );
    const element = container.querySelector('.animated-transition');
    expect(element?.className).toContain('scale');
  });
});

