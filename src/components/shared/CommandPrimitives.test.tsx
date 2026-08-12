import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, KpiCard, SegmentedControl, StatusBadge, TruthBadge } from './CommandPrimitives';

describe('CommandPrimitives', () => {
  it('keeps truth and operational severity as separate labeled systems', () => {
    render(<div><TruthBadge truth="reported" /><StatusBadge severity="critical" label="حالة حرجة" /></div>);

    expect(screen.getByText('مُبلّغ')).toHaveClass('truth-reported');
    expect(screen.getByText('حالة حرجة')).toHaveClass('status-critical');
  });

  it('keeps long Arabic actions readable and exposes a keyboard-visible native control', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Button onClick={action}>إنشاء مسودة قرار تشغيلية يدوية مرتبطة بالملاحظة المحددة دون أي اعتماد تلقائي</Button>);

    const button = screen.getByRole('button');
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(action).toHaveBeenCalledOnce();
  });

  it('uses static semantic classes for KPI severity so production CSS includes every state', () => {
    render(<KpiCard label="اختبار" value="١" detail="بيان" tone="blocked" />);
    expect(screen.getByText('اختبار').parentElement).toHaveClass('border-s-command-severity-blocked');
  });

  it('renders selected segmented controls with an accessible pressed state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl label="حالة العرض" value="first" onChange={onChange} options={[{ value: 'first', label: 'الأول' }, { value: 'second', label: 'الثاني' }]} />);

    await user.click(screen.getByRole('button', { name: 'الثاني' }));
    expect(onChange).toHaveBeenCalledWith('second');
    expect(screen.getByRole('button', { name: 'الأول' })).toHaveAttribute('aria-pressed', 'true');
  });
});
