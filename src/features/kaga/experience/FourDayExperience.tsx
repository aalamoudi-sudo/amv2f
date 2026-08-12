import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OrganicPresentationFrame, PresentationContourFrame } from "../theme";
import type { FourDayExperienceProps } from "./types";
import "./experience.css";

const dayVisuals: Record<string, string> = {
  "day-01": "/kaga/assets/core/workers-masterplan-p007.webp",
  "day-02": "/kaga/assets/core/royal-moment-p015.webp",
  "day-03": "/kaga/assets/core/prince-day-p023.webp",
  "day-04": "/kaga/assets/core/press-day-p032.webp",
};

export function FourDayExperience({
  days,
  activeDayId,
  onDayChange,
  onOpenJourney,
  onOpenLegendaryJourney,
  onOpenExperience,
  renderDayVisual,
  presentationFidelity = false,
}: FourDayExperienceProps) {
  const [internalId, setInternalId] = useState(days[0]?.id ?? "");
  const resolvedId = activeDayId ?? internalId;
  const activeDay = useMemo(
    () => days.find((day) => day.id === resolvedId) ?? days[0],
    [days, resolvedId],
  );

  if (!activeDay) {
    return (
      <section className="kaga-empty-state" role="status">
        <span aria-hidden="true">◌</span>
        <h2>لا تتوفر بيانات الأيام</h2>
        <p>سيظهر تسلسل أيام التدشين عند اكتمال ربط بيانات المصدر.</p>
      </section>
    );
  }

  const selectDay = (dayId: string) => {
    setInternalId(dayId);
    onDayChange?.(dayId);
  };

  const activeDayIndex = days.findIndex((day) => day.id === activeDay.id);
  const dayVisual = renderDayVisual ? (
    <div className="kaga-day-panel__visual kaga-day-panel__visual--spatial">
      {renderDayVisual(activeDay, activeDayIndex)}
      <span className="kaga-day-panel__ordinal" aria-hidden="true">
        {String(activeDayIndex + 1).padStart(2, "0")}
      </span>
    </div>
  ) : (
    <div
      className="kaga-day-panel__visual"
      style={{ "--kaga-day-image": `url('${dayVisuals[activeDay.id] ?? "/kaga/assets/v2/site-aerial-p001.jpg"}')` } as React.CSSProperties}
      role="img"
      aria-label={`مشهد من المصدر مرتبط بـ${activeDay.title}`}
    >
      <span className="kaga-day-panel__ordinal" aria-hidden="true">
        {String(activeDayIndex + 1).padStart(2, "0")}
      </span>
    </div>
  );

  const dayContent = (
    <div className="kaga-day-panel__content">
      <div className="kaga-day-panel__main">
        <span className="kaga-kicker">{activeDay.ordinalLabel}</span>
        <h3>{activeDay.title}</h3>
        <p>{activeDay.summary}</p>
        <dl className="kaga-day-facts">
          {activeDay.gregorianDate && <><dt>التاريخ الميلادي</dt><dd>{activeDay.gregorianDate}</dd></>}
          {activeDay.hijriDate && <><dt>التاريخ الهجري</dt><dd>{activeDay.hijriDate}</dd></>}
          {activeDay.location && <><dt>الموقع</dt><dd>{activeDay.location}</dd></>}
          {activeDay.attendance && <><dt>الحضور</dt><dd>{activeDay.attendance}</dd></>}
        </dl>
      </div>
      <aside className="kaga-day-panel__links" aria-label="روابط اليوم">
        {(activeDay.journeyIds?.length ?? 0) > 0 && (
          <div className="kaga-day-panel__journeys">
            <button className="kaga-primary-action" type="button" onClick={() => onOpenJourney?.(activeDay.journeyIds?.[0] ?? "")}>
              ابدأ رحلة اليوم
            </button>
            {onOpenLegendaryJourney && activeDay.journeyIds?.includes("prince") ? (
              <button className="kaga-secondary-action" type="button" onClick={() => onOpenLegendaryJourney?.("prince")}>
                شاهد رحلة سمو أمير المنطقة
              </button>
            ) : null}
            {activeDay.journeyIds?.slice(1).map((journeyId) => (
              <button className="kaga-secondary-action" type="button" key={journeyId} onClick={() => onOpenJourney?.(journeyId)}>
                عرض المسار المرتبط
              </button>
            ))}
          </div>
        )}
        {(activeDay.entryPoints?.length ?? 0) > 0 && (
          <div className="kaga-day-panel__entry-points">
            <span>محطات هذا الفصل</span>
            {activeDay.entryPoints?.map((entry) => (
              <button type="button" key={entry.id} onClick={() => onOpenExperience?.(entry.id)}>
                <span>{entry.label}</span><span aria-hidden="true">←</span>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );

  return (
    <section className={`kaga-days${presentationFidelity ? " kaga-days--presentation-fidelity" : ""}`} aria-labelledby="kaga-days-title" data-testid={presentationFidelity ? "presentation-fidelity-four-days" : undefined}>
      <header className="kaga-section-heading">
        <div>
          <span className="kaga-kicker">تسلسل المناسبة</span>
          <h2 id="kaga-days-title">أربعة أيام، تجربة واحدة مترابطة</h2>
        </div>
        <p>اختر يوماً لاستعراض ملامحه ومساراته ونقاط الدخول المرتبطة به.</p>
      </header>

      <div className="kaga-days__timeline" role="tablist" aria-label="أيام التدشين">
        {days.map((day, index) => {
          const selected = day.id === activeDay.id;
          return (
            <button
              key={day.id}
              id={`kaga-day-tab-${day.id}`}
              className="kaga-day-tab"
              data-active={selected}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`kaga-day-panel-${day.id}`}
              onClick={() => selectDay(day.id)}
            >
              <span className="kaga-day-tab__number">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <b>{day.ordinalLabel}</b>
                <small>{day.gregorianDate ?? "التاريخ وفق المصدر"}</small>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
      <motion.article
        key={activeDay.id}
        id={`kaga-day-panel-${activeDay.id}`}
        className="kaga-day-panel"
        role="tabpanel"
        aria-labelledby={`kaga-day-tab-${activeDay.id}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.34 }}
      >
        {presentationFidelity ? (
          <PresentationContourFrame
            variant="chapter"
            className="kaga-day-panel__frame kaga-day-panel__frame--presentation"
            ariaLabel={`الفصل الخاص بـ${activeDay.ordinalLabel}`}
            visual={dayVisual}
            content={dayContent}
          />
        ) : (
          <OrganicPresentationFrame
            variant="sweep"
            tone="ivory"
            visualPosition="end"
            className="kaga-day-panel__frame"
            ariaLabel={`الفصل الخاص بـ${activeDay.ordinalLabel}`}
            visual={dayVisual}
            content={dayContent}
          />
        )}
      </motion.article>
      </AnimatePresence>
    </section>
  );
}
