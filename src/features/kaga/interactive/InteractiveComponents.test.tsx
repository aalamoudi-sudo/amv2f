import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvitationExperience } from './InvitationExperience';
import { MobileExhibition } from './MobileExhibition';
import { VisualMuseum } from './VisualMuseum';
import { ExperiencesHub } from './ExperiencesHub';
import { IdentityApplications } from './IdentityApplications';

const source = { pdfPages: [56], sourceLabel: 'اختبار المصدر' };

describe('KAGA interactive proposal experiences', () => {
  it('never falls back to the first experience for an invalid explicit selection', () => {
    render(
      <ExperiencesHub
        items={[{
          id: 'reception',
          title: 'الاستقبال والضيافة',
          description: 'تجربة معتمدة',
          source,
        }]}
        selectedId="missing-experience"
        onSelect={() => undefined}
        onOpenMap={() => undefined}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر فتح التجربة المطلوبة');
    expect(screen.queryByText('تجربة معتمدة')).not.toBeInTheDocument();
  });

  it('runs all seven mobile exhibition seed responses and resets safely', async () => {
    const questions = Array.from({ length: 7 }, (_, index) => ({
      id: `question-${index + 1}`,
      question: `السؤال ${index + 1}`,
      response: `الاستجابة ${index + 1}`,
      source: { pdfPages: [56 + index] },
    }));
    render(<MobileExhibition questions={questions} />);

    expect(screen.getAllByRole('button', { name: /النقطة \d:/ })).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: /النقطة 7:/ }));
    expect(screen.getByRole('heading', { name: 'السؤال 7' })).toBeInTheDocument();
    expect(screen.queryByText('الاستجابة 7')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تفعيل كبسولة البذرة' }));
    expect(screen.getByText(/تنتقل الكبسولة/)).toBeInTheDocument();
    expect(await screen.findByText('الاستجابة 7', {}, { timeout: 2000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة التجربة' }));
    expect(await screen.findByRole('heading', { name: 'ابدأ من إحدى النقاط المضيئة' })).toBeInTheDocument();
  });

  it('offers official knowledge only after a response and only when explicitly supplied', async () => {
    const openKnowledge = vi.fn();
    render(
      <MobileExhibition
        questions={[{
          id: 'question-1',
          question: 'ما قصة الحدائق؟',
          response: 'استجابة العرض الأصلية',
          source,
        }]}
        knowledgeByQuestionId={{
          'question-1': {
            titleAr: 'المعرفة الرسمية للحدائق',
            summaryAr: 'ملخص مصدره الدليل المعرفي',
          },
        }}
        onOpenKnowledge={openKnowledge}
      />,
    );

    expect(screen.queryByRole('button', { name: /اعرف أكثر/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /النقطة 1:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'تفعيل كبسولة البذرة' }));
    const more = await screen.findByRole('button', { name: 'اعرف أكثر: المعرفة الرسمية للحدائق' }, { timeout: 2000 });
    fireEvent.click(more);

    expect(openKnowledge).toHaveBeenCalledWith('question-1');
    expect(screen.getByText('استجابة العرض الأصلية')).toBeInTheDocument();
  });

  it('completes and restarts the six-step invitation proposal', async () => {
    render(<InvitationExperience source={source} />);
    const follow = screen.getByRole('button', { name: /متابعة/ });
    for (let index = 0; index < 5; index += 1) fireEvent.click(follow);

    expect(await screen.findByRole('heading', { name: 'دليل الضيف' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /إعادة العرض/ }));
    expect(await screen.findByRole('heading', { name: 'إضافة الضيف' })).toBeInTheDocument();
    expect(screen.getByText(/لا يتصل ببيانات ضيوف حقيقية/)).toBeInTheDocument();
  });

  it('navigates visual museum angles and preserves source traceability', async () => {
    render(
      <VisualMuseum
        environments={[{
          id: 'vip',
          title: 'منطقة كبار الشخصيات',
          description: 'بيئة الاختبار',
          source,
          images: [
            { src: '/one.webp', alt: 'الزاوية الأولى', source: { pdfPages: [79] } },
            { src: '/two.webp', alt: 'الزاوية الثانية', source: { pdfPages: [80] } },
          ],
        }]}
      />,
    );

    expect(screen.getByRole('img', { name: 'الزاوية الأولى' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الصورة التالية' }));
    expect(await screen.findByRole('img', { name: 'الزاوية الثانية' })).toBeInTheDocument();
    expect(screen.getByText('المصدر: ص 80')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'عرض بملء الشاشة' }));
    expect(screen.getByRole('button', { name: 'إنهاء ملء الشاشة' })).toBeInTheDocument();
  });

  it('shows one identity proposal by default and compares only on request', async () => {
    render(
      <IdentityApplications
        items={[{
          id: 'vests',
          title: 'السترات',
          category: 'الزي',
          source,
          proposals: [
            { label: 'المقترح الأول', image: '/one.webp', source },
            { label: 'المقترح الثاني', image: '/two.webp', source },
          ],
        }]}
      />,
    );

    expect(screen.getAllByRole('figure')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'السترات - المقترح الأول' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'المقترح الثاني' }));
    await waitFor(() => expect(screen.getAllByRole('figure')).toHaveLength(1));
    expect(screen.getByRole('img', { name: 'السترات - المقترح الثاني' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /عرض المقترحين معًا/ }));
    expect(screen.getAllByRole('figure')).toHaveLength(2);
  });
});
