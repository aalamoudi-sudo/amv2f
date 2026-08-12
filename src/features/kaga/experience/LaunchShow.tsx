import { useEffect, useMemo, useState } from "react";
import { OrganicPresentationFrame, presentationSurfaceAttributes } from "../theme";
import type { LaunchLayerDefinition, LaunchLayerId } from "./types";
import { useReducedMotion } from "./useReducedMotion";
import "./experience.css";

export interface LaunchShowProps {
  layers: LaunchLayerDefinition[];
  onSequenceComplete?: () => void;
}

const defaultEnabled: Record<LaunchLayerId, boolean> = { xr: true, drones: true, fireworks: true };

export function LaunchShow({ layers, onSequenceComplete }: LaunchShowProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [playing, setPlaying] = useState(false);
  const [sequence, setSequence] = useState(0);
  const reducedMotion = useReducedMotion();
  const visibleLayers = useMemo(() => layers.filter((layer) => enabled[layer.id]), [layers, enabled]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setPlaying(false);
      onSequenceComplete?.();
    }, reducedMotion ? 500 : 9000);
    return () => window.clearTimeout(timer);
  }, [playing, sequence, reducedMotion, onSequenceComplete]);

  const run = () => {
    setSequence((value) => value + 1);
    setPlaying(true);
  };

  return (
    <section className="kaga-launch" data-playing={playing} aria-labelledby="kaga-launch-title" {...presentationSurfaceAttributes('launch-show')}>
      <header className="kaga-section-heading kaga-section-heading--dark">
        <div><span className="kaga-kicker">اللوحة البصرية</span><h2 id="kaga-launch-title">عرض التدشين</h2></div>
        <p>ركّب طبقات العرض، ثم شغّل التسلسل الكامل في مشهد واحد.</p>
      </header>

      <OrganicPresentationFrame
        variant="folio"
        tone="transparent"
        className="kaga-launch__frame"
        ariaLabel="المشهد البصري لعرض التدشين"
        visual={(
          <div className="kaga-launch__stage" key={sequence} aria-label="معاينة بصرية لعرض التدشين">
            <div className="kaga-launch__project-stage" role="img" aria-label="حدائق الملك عبدالله ومبنى الهلالين في مشهد عرض التدشين" />
            <div className="kaga-launch__sky" />
            {enabled.xr && <div className="kaga-launch__xr" aria-hidden="true"><i /><i /><i /></div>}
            {enabled.drones && <div className="kaga-launch__drones" aria-hidden="true">{Array.from({ length: 31 }, (_, index) => <i key={index} style={{ "--dot": index } as React.CSSProperties} />)}</div>}
            {enabled.fireworks && <div className="kaga-launch__fireworks" aria-hidden="true"><i /><i /><i /></div>}
            <div className="kaga-launch__caption" aria-live="polite">
              {playing ? "التسلسل قيد العرض" : `${visibleLayers.length} من ${layers.length} طبقات مفعّلة`}
            </div>
          </div>
        )}
      />

      <div className="kaga-launch__controls">
        <div className="kaga-launch__layer-list" aria-label="طبقات العرض">
          {layers.map((layer) => (
            <label key={layer.id} className="kaga-launch-layer" data-enabled={enabled[layer.id]}>
              <input
                type="checkbox"
                checked={enabled[layer.id]}
                disabled={playing}
                onChange={() => setEnabled((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
              />
              <span className="kaga-launch-layer__mark" aria-hidden="true" />
              <span><b>{layer.label}</b><small>{layer.description}</small></span>
            </label>
          ))}
        </div>
        <button className="kaga-primary-action" type="button" onClick={run} disabled={playing || visibleLayers.length === 0}>
          {playing ? "يجري تشغيل العرض…" : "تشغيل عرض التدشين"}
        </button>
      </div>
    </section>
  );
}
