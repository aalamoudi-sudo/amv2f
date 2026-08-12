import type { HTMLAttributes } from 'react';
import './metricValue.css';

export interface MetricValueProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: string | number;
  unitAr?: string;
  exponent?: string | number;
}

/**
 * Keeps the LTR value and Arabic unit in an explicit visual sequence instead
 * of delegating mixed-direction metric layout to browser bidi heuristics.
 */
export function MetricValue({ value, unitAr, exponent, className, ...props }: MetricValueProps) {
  const valueText = String(value);
  const accessibleExponent = exponent === 2 ? '²' : exponent ?? '';
  const accessibleUnit = unitAr ? ` ${unitAr}${accessibleExponent}` : '';

  return (
    <span
      {...props}
      className={['kaga-metric-value', className].filter(Boolean).join(' ')}
      dir="ltr"
      aria-label={props['aria-label'] ?? `${valueText}${accessibleUnit}`}
    >
      <bdi className="kaga-metric-value__number" dir="ltr">{valueText}</bdi>
      {unitAr ? (
        <span className="kaga-metric-value__unit" dir="ltr">
          <bdi dir="rtl">{unitAr}</bdi>
          {exponent !== undefined ? <sup>{exponent}</sup> : null}
        </span>
      ) : null}
    </span>
  );
}
