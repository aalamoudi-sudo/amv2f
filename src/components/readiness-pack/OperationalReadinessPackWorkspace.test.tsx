import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  kapOperationalReadinessPackCandidate,
  kapOperationalReadinessPackTrustSession
} from '../../test-fixtures/kapOperationalReadinessPack';
import { createFictionalConferenceReadinessPack } from '../../test-fixtures/fictionalOperationalReadinessPack';
import { openOperationalReadinessTrustSession } from '../../services/operationalReadinessTrustGateway';
import { OperationalReadinessPackWorkspace } from './OperationalReadinessPackWorkspace';

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/?readinessPackView=summary');
  HTMLElement.prototype.scrollTo = vi.fn();
});

describe('OperationalReadinessPackWorkspace package-driven content', () => {
  it('renders a fictional package without KAP or founder-specific Core copy', () => {
    const fictional = createFictionalConferenceReadinessPack();
    const trustSession = openOperationalReadinessTrustSession(fictional);
    if (!trustSession) throw new Error('FICTIONAL_TRUST_SESSION_MISSING');
    render(
      <OperationalReadinessPackWorkspace
        pack={fictional}
        trustSession={trustSession}
        projectNameAr="مؤتمر ألفا الخيالي"
        eventNameAr="فعالية اختبار ألفا"
        spatialConfigurationId={null}
        onOpenReadinessCommand={() => undefined}
      />
    );
    const workspace = screen.getByTestId('operational-readiness-pack-workspace');
    expect(workspace).toHaveTextContent('حزمة مؤتمر ألفا الخيالية');
    expect(workspace.textContent).not.toMatch(/KAP|حدائق الملك عبدالله|أحمد|محمد إبراهيم|جوزيف حداد/);
    fireEvent.click(screen.getByTestId('readiness-pack-view-authorities'));
    expect(screen.getByTestId('authority-contract-summary')).toHaveTextContent(
      'AUTHORITY-REQUIREMENT-POLICY-v1'
    );
    expect(workspace.textContent).not.toMatch(/KAP|حدائق الملك عبدالله|أحمد|محمد إبراهيم|جوزيف حداد/);
  }, 10_000);

  it('renders both unresolved execution candidates from package configuration', () => {
    if (!kapOperationalReadinessPackTrustSession) {
      throw new Error('KAP_TRUST_SESSION_MISSING');
    }
    render(
      <OperationalReadinessPackWorkspace
        pack={kapOperationalReadinessPackCandidate}
        trustSession={kapOperationalReadinessPackTrustSession}
        projectNameAr="حدائق الملك عبدالله"
        eventNameAr="فعالية الافتتاح"
        spatialConfigurationId={null}
        onOpenReadinessCommand={() => undefined}
      />
    );
    fireEvent.click(screen.getByTestId('readiness-pack-view-workstreams'));
    const comparison = screen.getByTestId('execution-candidate-comparison');
    expect(comparison).toHaveTextContent('محمد إبراهيم');
    expect(comparison).toHaveTextContent('جوزيف حداد');
    expect(comparison).toHaveTextContent('القرار: غير محسوم');
    expect(comparison).toHaveTextContent('المخوّل بالحسم: غير معروف');
    expect(comparison).toHaveTextContent('التغطية المحتسبة: لا أحد');
  });

  it('shows separate pre-freeze and pre-activation groups with exact blocked counts', () => {
    if (!kapOperationalReadinessPackTrustSession) {
      throw new Error('KAP_TRUST_SESSION_MISSING');
    }
    render(
      <OperationalReadinessPackWorkspace
        pack={kapOperationalReadinessPackCandidate}
        trustSession={kapOperationalReadinessPackTrustSession}
        projectNameAr="حدائق الملك عبدالله"
        eventNameAr="فعالية الافتتاح"
        spatialConfigurationId={null}
        onOpenReadinessCommand={() => undefined}
      />
    );
    fireEvent.click(screen.getByTestId('readiness-pack-view-eligibility'));
    expect(screen.getByTestId('pre-freeze-gate-group')).toHaveTextContent('محجوب ١٥ من');
    expect(screen.getByTestId('pre-activation-gate-group')).toHaveTextContent('محجوب ٥ من');
  });

  it('shows nine platform-derived authority obligations separately from assignments', () => {
    if (!kapOperationalReadinessPackTrustSession) {
      throw new Error('KAP_TRUST_SESSION_MISSING');
    }
    render(
      <OperationalReadinessPackWorkspace
        pack={kapOperationalReadinessPackCandidate}
        trustSession={kapOperationalReadinessPackTrustSession}
        projectNameAr="حدائق الملك عبدالله"
        eventNameAr="فعالية الافتتاح"
        spatialConfigurationId={null}
        onOpenReadinessCommand={() => undefined}
      />
    );
    fireEvent.click(screen.getByTestId('readiness-pack-view-authorities'));
    const summary = screen.getByTestId('authority-contract-summary');
    expect(summary).toHaveTextContent('٩واجبًا متوقعًا');
    expect(summary).toHaveTextContent('٩تصريحًا مخزنًا');
    expect(summary).toHaveTextContent('٠تعيينًا صالحًا');
    expect(summary).toHaveTextContent('٠عدم تطابق عقدي');
    expect(screen.getByTestId('authority-contract-policy')).toHaveTextContent(
      'AUTHORITY-REQUIREMENT-POLICY-v1'
    );
    expect(screen.getByTestId('authority-contract-policy')).toHaveTextContent(
      'AUTHORITY-TRIGGER-POLICY-v1'
    );
    expect(screen.getByTestId('authority-contract-policy')).toHaveTextContent(
      '١٠ محفزات نشطة'
    );
    expect(screen.getAllByTestId(/^authority-contract-obligation-/)).toHaveLength(9);
    expect(
      screen.getByTestId('authority-waiver-status-engineering-authority')
    ).toHaveTextContent('سلطة مطلوبة: لا يمكن إعفاؤها');
    expect(
      screen.getByTestId('authority-waiver-status-engineering-authority')
    ).toHaveTextContent('لا يوجد سجل إعفاء');
    expect(
      screen.getByTestId('authority-contract-obligation-readiness-pack-activation')
    ).toHaveTextContent('قبل التفعيل');
  });

  it('shows operator-safe custody boundaries without runtime internals', () => {
    if (!kapOperationalReadinessPackTrustSession) {
      throw new Error('KAP_TRUST_SESSION_MISSING');
    }
    render(
      <OperationalReadinessPackWorkspace
        pack={kapOperationalReadinessPackCandidate}
        trustSession={kapOperationalReadinessPackTrustSession}
        projectNameAr="حدائق الملك عبدالله"
        eventNameAr="فعالية الافتتاح"
        spatialConfigurationId={null}
        onOpenReadinessCommand={() => undefined}
      />
    );
    fireEvent.click(screen.getByTestId('readiness-pack-view-eligibility'));

    expect(screen.getByTestId('authority-topology-custody'))
      .toHaveTextContent('محمية بجذر الثقة');
    expect(screen.getByTestId('source-trace-custody'))
      .toHaveTextContent('ثابتة وغير قابلة لإعادة الربط');
    expect(screen.getByTestId('exact-revision-custody'))
      .toHaveTextContent('تطابق مراجعة موثوقة بعينها');
    expect(screen.getByTestId('activation-evidence-actor-custody'))
      .toHaveTextContent('دليل تفعيل موثوق غير متاح');
    expect(screen.getByTestId('waiver-ledger-exact-custody'))
      .toHaveTextContent('متصل بالرأس الموثوق');
    expect(document.body.textContent).not.toMatch(/OPERATIONAL_TRUST|WeakMap/);
  });
});
