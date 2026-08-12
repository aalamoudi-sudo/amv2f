import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FourDayExperience, IntroExperience, LaunchShow, PresenterNavigation, RoyalMoment } from "./index";
import type { InaugurationDay, LaunchLayerDefinition } from "./types";

const source = { pdfPages: [1], sourceLabel: "اختبار" };
const days: InaugurationDay[] = [
  { id: "day-1", ordinalLabel: "اليوم الأول", title: "عنوان اليوم الأول", summary: "ملخص اليوم الأول", source },
  { id: "day-2", ordinalLabel: "اليوم الثاني", title: "عنوان اليوم الثاني", summary: "ملخص اليوم الثاني", source },
];
const layers: LaunchLayerDefinition[] = [
  { id: "xr", label: "الواقع الممتد", description: "طبقة بصرية", source },
  { id: "drones", label: "الدرونز", description: "تكوين جوي", source },
  { id: "fireworks", label: "الألعاب النارية", description: "الختام", source },
];

describe("KAGA experience components", () => {
  it("enters the experience through a semantic action", () => {
    const onEnter = vi.fn();
    render(<IntroExperience title="حفل التدشين" subtitle="تجربة تنفيذية" onEnter={onEnter} />);
    fireEvent.click(screen.getByRole("button", { name: /دخول تجربة التدشين/ }));
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("switches the reusable day panel and reports selection", async () => {
    const onDayChange = vi.fn();
    render(<FourDayExperience days={days} onDayChange={onDayChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /اليوم الثاني/ }));
    expect(onDayChange).toHaveBeenCalledWith("day-2");
    expect(await screen.findByRole("heading", { name: "عنوان اليوم الثاني" })).toBeInTheDocument();
  });

  it("presents a source visual and a primary journey action for journey-bearing days", () => {
    const onOpenJourney = vi.fn();
    const journeyDays: InaugurationDay[] = [{ ...days[0]!, id: "day-01", journeyIds: ["workers"] }];
    render(<FourDayExperience days={journeyDays} onOpenJourney={onOpenJourney} />);

    expect(screen.getByRole("img", { name: /مشهد من المصدر/ })).toHaveStyle({
      "--kaga-day-image": "url('/kaga/assets/core/workers-masterplan-p007.webp')",
    });
    fireEvent.click(screen.getByRole("button", { name: "ابدأ رحلة اليوم" }));
    expect(onOpenJourney).toHaveBeenCalledWith("workers");
  });

  it("starts the royal conceptual visualization", () => {
    render(<RoyalMoment source={source} />);
    fireEvent.click(screen.getByRole("button", { name: "تشغيل لحظة التدشين" }));
    expect(screen.getByRole("status")).toHaveTextContent("تهيئة المشهد");
    expect(screen.getByText(/لا يمثل محاكاة فيزيائية/)).toBeInTheDocument();
  });

  it("allows launch layers to be toggled and starts the show", () => {
    render(<LaunchShow layers={layers} />);
    fireEvent.click(screen.getByLabelText(/الواقع الممتد/));
    expect(screen.getByText("2 من 3 طبقات مفعّلة")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تشغيل عرض التدشين" }));
    expect(screen.getByText("التسلسل قيد العرض")).toBeInTheDocument();
  });

  it("uses a dedicated quick-jump sequence in presenter mode", async () => {
    const onNavigate = vi.fn();
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    render(
      <PresenterNavigation
        items={[{ id: "days", label: "الأيام" }, { id: "invitations", label: "الدعوات" }, { id: "museum", label: "التصاميم" }]}
        presenterItems={[{ id: "days", label: "الأيام" }, { id: "museum", label: "التصاميم" }]}
        activeId="days"
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "وضع التقديم" }));
    fireEvent.click(await screen.findByRole("button", { name: "القسم التالي" }));
    expect(onNavigate).toHaveBeenCalledWith("museum");
  });
});
