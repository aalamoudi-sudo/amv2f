import { useEffect, useState } from 'react';
import { loadOperationalReadinessPackForScope } from '../../data/operationalReadinessPacks';
import type { OperationalReadinessPack } from '../../types/operationalReadinessPack';
import type { OperationalReadinessTrustSession } from '../../types/operationalReadinessTrust';
import { ErrorState, LoadingState } from '../shared/StateBlocks';
import { OperationalReadinessPackWorkspace } from './OperationalReadinessPackWorkspace';

interface PackLoadState {
  scopeKey: string;
  status: 'loading' | 'ready' | 'unavailable' | 'error';
  pack: OperationalReadinessPack | null;
  trustSession: OperationalReadinessTrustSession | null;
  errorMessageAr: string | null;
  errorKind:
    | 'source-quarantine'
    | 'authority-contract-rejection'
    | 'trust-rejection'
    | 'integrity-rejection'
    | null;
}

function authorityContractRejectionMessage(message: string): string | null {
  const explanations: string[] = [];
  if (
    message.includes('authority-contract-missing-kind')
    || message.includes('authority-contract-activation-missing')
  ) {
    explanations.push('تصريح سلطة متوقع من سياسة المنصة مفقود؛ حذف التصريح لا يساوي عدم الانطباق.');
  }
  if (message.includes('authority-contract-kind-mismatch')) {
    explanations.push('أحد التصريحات يشير إلى خانة من نوع سلطة مختلف.');
  }
  if (message.includes('authority-contract-slot-reused')) {
    explanations.push('استُخدمت خانة سلطة واحدة بصورة غير قانونية لتمثيل أنواع سلطات مختلفة.');
  }
  if (message.includes('authority-contract-scope-mismatch')) {
    explanations.push('نطاق تصريح أو خانة سلطة لا يطابق نطاق العقد المطلوب.');
  }
  if (message.includes('authority-contract-governance-mismatch')) {
    explanations.push('مرجع الحوكمة لا يحل إلى التصريح والخانة القانونيين المطابقين.');
  }
  if (message.includes('authority-contract-not-applicable-invalid')) {
    explanations.push('إقرار عدم الانطباق غير مخول أو غير مكتمل، لذلك لا يغطي واجب السلطة.');
  }
  if (
    message.includes('authority-waiver-required-obligation')
    || message.includes('authority-waiver-policy-prohibited')
  ) {
    explanations.push('لا يمكن إعفاء سلطة مطلوبة أو مرتبطة بمحفز نشط.');
  }
  if (
    message.includes('authority-waiver-resolver-invalid')
    || message.includes('authority-waiver-self-authorized')
    || message.includes('authority-waiver-separation-of-duties')
  ) {
    explanations.push('جهة حل الإعفاء غير قانونية أو غير معيّنة أو تخالف فصل الواجبات.');
  }
  if (message.includes('authority-waiver-evidence-registry-mismatch')) {
    explanations.push('بصمة سجل أدلة الإعفاء لا تطابق سجل الحيازة الموثوق.');
  }
  if (message.includes('authority-waiver-evidence-unresolved')) {
    explanations.push('دليل الإعفاء غير موجود في سجل الأدلة القانوني أو لم يصل إلى حالة تحقق صالحة.');
  }
  if (
    message.includes('authority-waiver-ledger-missing')
    || message.includes('authority-waiver-ledger-chain-mismatch')
  ) {
    explanations.push('تعذر إثبات دفتر حيازة الإعفاءات أو اتصاله بالرأس السابق؛ بقي الانتقال محجوبًا.');
  }
  if (message.includes('authority-waiver-chronology-invalid')) {
    explanations.push('وقت الإعفاء أو ثقة الزمن أو تسلسل المراجعة غير صالح.');
  }
  if (
    message.includes('authority-waiver-canonical-state-mismatch')
    || message.includes('authority-waiver-identity-invalid')
    || message.includes('authority-waiver-source-invalid')
  ) {
    explanations.push('سجل الإعفاء لا يطابق الخانة القانونية أو المصدر أو الهوية غير القابلة للتغيير.');
  }
  if (
    message.includes('authority-trigger-policy-mismatch')
    || message.includes('authority-trigger-projection-fingerprint-mismatch')
    || message.includes('authority-trigger-fact-fingerprint-mismatch')
    || message.includes('authority-trigger-fact-missing')
    || message.includes('authority-trigger-fact-duplicate')
  ) {
    explanations.push('إسقاط محفزات السلطة ناقص أو لا تطابق بصمته الحقائق المخزنة.');
  }
  if (
    message.includes('authority-trigger-input-mismatch')
    || message.includes('authority-trigger-revision-invalid')
    || message.includes('authority-trigger-fact-mismatch')
    || message.includes('authority-trigger-trust-anchor-missing')
    || message.includes('authority-trigger-trust-anchor-mismatch')
  ) {
    explanations.push('تغيرت حقائق تؤثر في السلطة أو لم تطابق مرساة مراجعة موثوقة، لذلك بقي الواجب محجوبًا.');
  }
  if (
    message.includes('authority-contract-policy-reference-mismatch')
    || message.includes('authority-contract-unknown-slot')
  ) {
    explanations.push('مرجع السياسة أو الخانة القانونية غير موجود أو لا يطابق عقد السلطات.');
  }
  if (!explanations.length) return null;
  return `رُفض عقد السلطات: ${explanations.join(' ')} لم تُجمّد الحزمة ولم تُفعّل ولم تتغير الجاهزية.`;
}

export function OperationalReadinessPackWorkspaceEntry({
  projectId,
  eventId,
  venueId,
  projectNameAr,
  eventNameAr,
  spatialConfigurationId,
  onOpenReadinessCommand
}: {
  projectId: string;
  eventId: string;
  venueId: string;
  projectNameAr: string;
  eventNameAr: string;
  spatialConfigurationId: string | null;
  onOpenReadinessCommand: () => void;
}) {
  const scopeKey = `${projectId}:${eventId}:${venueId}`;
  const [loadState, setLoadState] = useState<PackLoadState>({
    scopeKey,
    status: 'loading',
    pack: null,
    trustSession: null,
    errorMessageAr: null,
    errorKind: null
  });

  useEffect(() => {
    const controller = new AbortController();
    void loadOperationalReadinessPackForScope(
      { projectId, eventId, venueId },
      controller.signal
    ).then((loaded) => {
      setLoadState({
        scopeKey,
        status: loaded ? 'ready' : 'unavailable',
        pack: loaded?.pack ?? null,
        trustSession: loaded?.trustSession ?? null,
        errorMessageAr: null,
        errorKind: null
      });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : '';
      const sourceQuarantine = /source-(?:fingerprint|observation|revision|trace|reference)/.test(message);
      const authorityContractMessage = authorityContractRejectionMessage(message);
      const trustRejection = !authorityContractMessage
        && /authority-trigger-trust-session-(?:missing|mismatch)/.test(message);
      setLoadState({
        scopeKey,
        status: 'error',
        pack: null,
        trustSession: null,
        errorMessageAr: sourceQuarantine
          ? 'حُجرت الحزمة: بصمة المصدر أو مراجعته أو محدداته لا تطابق السجل الموثق. لم يُستخدم المصدر ولم تتغير الجاهزية.'
          : trustRejection
            ? 'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان. لم يُثبت سجل الأدلة أو دفتر حيازة الإعفاءات من بيانات المتصفح.'
          : authorityContractMessage
            ? authorityContractMessage
          : message.includes('OPERATIONAL_READINESS_PACK_INVALID')
            ? 'رُفضت الحزمة: حالة دورة الحياة أو بصمة المصدر أو الإسقاطات المشتقة غير متطابقة. أُغلقت العملية دون تفعيل أو تغيير للجاهزية.'
            : 'تعذر تحميل حزمة موثوقة. لم يُستخدم بديل ولم تتغير الجاهزية.',
        errorKind: sourceQuarantine
          ? 'source-quarantine'
          : trustRejection
            ? 'trust-rejection'
          : authorityContractMessage
            ? 'authority-contract-rejection'
          : message.includes('OPERATIONAL_READINESS_PACK_INVALID')
            ? 'integrity-rejection'
            : null
      });
    });
    return () => controller.abort();
  }, [eventId, projectId, scopeKey, venueId]);

  if (loadState.scopeKey !== scopeKey || loadState.status === 'loading') {
    return (
      <section
        data-testid="operational-readiness-pack-loading"
        className="flex min-h-0 flex-1 items-center justify-center p-6"
        lang="ar"
        dir="rtl"
      >
        <LoadingState
          title="جاري التحقق من حزمة الجاهزية"
          message="يتم تحميل الـ manifest المرشح والتحقق من بصمته ونطاقه."
        />
      </section>
    );
  }

  if (
    loadState.status !== 'ready'
    || !loadState.pack
    || !loadState.trustSession
  ) {
    const unavailable = loadState.status === 'unavailable';
    return (
      <section
        data-testid={unavailable
          ? 'operational-readiness-pack-unavailable'
          : loadState.errorKind === 'source-quarantine'
            ? 'readiness-pack-source-quarantine'
            : loadState.errorKind === 'authority-contract-rejection'
              ? 'readiness-pack-authority-contract-rejection'
            : loadState.errorKind === 'trust-rejection'
              ? 'readiness-pack-trust-rejection'
            : loadState.errorKind === 'integrity-rejection'
              ? 'readiness-pack-integrity-rejection'
              : 'operational-readiness-pack-error'}
        className="flex min-h-0 flex-1 items-center justify-center p-6"
        lang="ar"
        dir="rtl"
      >
        <ErrorState
          title={unavailable
            ? 'لا توجد حزمة جاهزية تشغيلية لهذا السياق'
            : loadState.errorKind === 'source-quarantine'
              ? 'حُجرت حزمة المصدر'
              : loadState.errorKind === 'authority-contract-rejection'
                ? 'رُفض عقد السلطات التشغيلية'
              : loadState.errorKind === 'trust-rejection'
                ? 'تعذر إثبات سلسلة الثقة المحلية'
              : loadState.errorKind === 'integrity-rejection'
                ? 'رُفضت حالة حزمة الجاهزية'
                : 'تعذر التحقق من حزمة الجاهزية'}
          message={unavailable
            ? 'لم يُستخدم مشروع تجريبي أو حزمة مرجعية بديلة. تحقق من المشروع والفعالية والموقع في الرابط.'
            : loadState.errorMessageAr ?? 'لم تُقبل الحزمة غير المتاحة أو غير المطابقة. لم يُستخدم بديل ولم تتغير الجاهزية.'}
          action={<button type="button" className="command-button command-button-primary" onClick={onOpenReadinessCommand}>العودة إلى قيادة الجاهزية</button>}
        />
      </section>
    );
  }

  const pack = loadState.pack;
  return (
    <OperationalReadinessPackWorkspace
      key={`${pack.id}:${pack.revision}`}
      pack={pack}
      trustSession={loadState.trustSession}
      projectNameAr={projectNameAr}
      eventNameAr={eventNameAr}
      spatialConfigurationId={spatialConfigurationId}
      onOpenReadinessCommand={onOpenReadinessCommand}
    />
  );
}
