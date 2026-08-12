import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Check, QrCode, RotateCcw, Send } from 'lucide-react';
import { useState } from 'react';
import { SourceChip } from '../shared/SourceChip';
import { presentationSurfaceAttributes } from '../theme';
import type { SourceReference } from '../types';
import './interactiveV2.css';

const invitationSteps = [
  { title: 'إضافة الضيف', detail: 'إدخال بيانات ضيف افتراضي للمقترح' },
  { title: 'التصنيف', detail: 'اختيار فئة الدعوة ومستوى البروتوكول' },
  { title: 'إرسال الدعوة', detail: 'معاينة رسالة الدعوة قبل الإرسال التجريبي' },
  { title: 'تأكيد الحضور', detail: 'تسجيل حالة التأكيد داخل هذا العرض فقط' },
  { title: 'إصدار رمز الدخول', detail: 'إنشاء رمز عرض غير صالح للدخول الفعلي' },
  { title: 'دليل الضيف', detail: 'عرض معلومات الوصول والبرنامج المقترح' },
] as const;

export function InvitationExperience({ source }: { source: SourceReference }) {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const completed = step === invitationSteps.length - 1;
  const activeStep = invitationSteps[step] ?? invitationSteps[0];

  return (
    <section className="kaga-section kaga-invitations" aria-labelledby="invite-title" data-testid="invitation-experience" {...presentationSurfaceAttributes('invitation-experience')}>
      <header className="kaga-section-heading">
        <div>
          <span className="kaga-kicker">عرض تفاعلي للمقترح</span>
          <h1 id="invite-title">منصة إدارة الدعوات</h1>
          <p>مسار توضيحي لا يتصل ببيانات ضيوف حقيقية ولا يصدر تصاريح دخول فعلية.</p>
        </div>
        <SourceChip source={source} />
      </header>

      <div className="kaga-invite-shell kaga-interactive-organic-folio">
        <ol className="kaga-invite-steps" aria-label="مراحل رحلة الدعوة">
          {invitationSteps.map((item, index) => (
            <li className={index === step ? 'is-active' : index < step ? 'is-complete' : ''} key={item.title}>
              <button onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined}>
                <span>{index < step ? <Check size={15} /> : index + 1}</span>
                {item.title}
              </button>
            </li>
          ))}
        </ol>

        <div className="kaga-invite-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
            >
              <span className="kaga-step-number">{String(step + 1).padStart(2, '0')} / 06</span>
              <h2>{activeStep.title}</h2>
              <p>{activeStep.detail}</p>
              <InvitationStepVisual step={step} />
            </motion.div>
          </AnimatePresence>

          <div className="kaga-invite-actions">
            <button className="kaga-secondary-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              السابق
            </button>
            {completed ? (
              <button className="kaga-primary-button" onClick={() => setStep(0)}>
                <RotateCcw size={17} /> إعادة العرض
              </button>
            ) : (
              <button className="kaga-primary-button" onClick={() => setStep((value) => value + 1)}>
                {step === 2 ? <Send size={17} /> : <BadgeCheck size={17} />} متابعة
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function InvitationStepVisual({ step }: { step: number }) {
  if (step === 4) {
    return (
      <div className="kaga-qr-demo">
        <QrCode aria-hidden="true" size={92} />
        <strong>KAGA • عرض تجريبي</strong>
        <span>غير صالح للدخول</span>
      </div>
    );
  }
  if (step === 5) {
    return (
      <div className="kaga-guest-guide">
        <span>الوصول</span><span>البروتوكول</span><span>البرنامج</span><span>الخريطة</span>
      </div>
    );
  }
  return (
    <div className="kaga-form-demo" aria-hidden="true">
      <span /><span /><span className="is-short" />
    </div>
  );
}
