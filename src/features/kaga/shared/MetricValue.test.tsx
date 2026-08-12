import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricValue } from './MetricValue';

describe('MetricValue', () => {
  it('renders the LTR value before an independently isolated Arabic unit and real exponent', () => {
    render(<MetricValue data-testid="metric" value="3,600" unitAr="م" exponent={2} />);

    const metric = screen.getByTestId('metric');
    expect(metric).toHaveAttribute('dir', 'ltr');
    expect(metric.children).toHaveLength(2);
    expect(metric.children[0]).toHaveClass('kaga-metric-value__number');
    expect(metric.children[0]).toHaveAttribute('dir', 'ltr');
    expect(metric.children[0]).toHaveTextContent('3,600');
    expect(metric.children[1]).toHaveClass('kaga-metric-value__unit');
    expect(metric.children[1]).toHaveAttribute('dir', 'ltr');
    expect(metric.children[1]?.firstElementChild).toHaveAttribute('dir', 'rtl');
    expect(metric.querySelector('sup')).toHaveTextContent('2');
  });

  it('keeps a signed headline value deterministic without inventing a unit', () => {
    render(<MetricValue data-testid="metric" value="+1M" />);
    expect(screen.getByTestId('metric')).toHaveTextContent('+1M');
    expect(screen.getByTestId('metric').children).toHaveLength(1);
  });
});
