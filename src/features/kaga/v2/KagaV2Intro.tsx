import { motion, useReducedMotion } from 'framer-motion';
import { projectFactById } from '../knowledge';
import { MetricValue } from '../shared/MetricValue';
import { kagaV2Assets } from './v2Assets';

interface KagaV2IntroProps {
  onEnterEvent: () => void;
  onExploreGardens: () => void;
  onWatchDelight?: () => void;
}

const scaleFacts = [
  projectFactById['garden-area'],
  projectFactById['plant-count'],
  projectFactById['botanical-garden-count'],
].filter((fact) => fact !== undefined);

export function KagaV2Intro({ onEnterEvent, onExploreGardens, onWatchDelight }: KagaV2IntroProps) {
  const reduceMotion = useReducedMotion();
  const asset = kagaV2Assets.introClean;

  return (
    <section className="kaga-v2-intro kaga-pf-intro kaga-rebirth-opening" aria-labelledby="kaga-v2-intro-title" data-testid="presentation-fidelity-intro" data-visual-rebirth="opening">
      <motion.div
        className="kaga-rebirth-opening__world"
        data-testid="source-native-opening"
        aria-hidden="true"
        initial={reduceMotion ? false : { scale: 1.035 }}
        animate={{ scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 5.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <img className="kaga-rebirth-opening__image" src={asset.path} alt="" />
        <motion.img
          className="kaga-rebirth-opening__depth"
          src={asset.path}
          alt=""
          initial={reduceMotion ? false : { scale: 1.055, x: '-.4%' }}
          animate={{ scale: 1.025, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 7.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="kaga-rebirth-opening__atmosphere" />
        <div className="kaga-rebirth-opening__light" />
        <span className="sr-only">تدشين حدائق الملك عبدالله</span>
      </motion.div>

      <div className="kaga-rebirth-opening__composition">
        <motion.p
          className="kaga-rebirth-opening__kicker"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : .7, delay: reduceMotion ? 0 : .35 }}
        >حدائق الملك عبدالله · الرياض</motion.p>
        <motion.h1
          id="kaga-v2-intro-title"
          aria-label="تدشين حدائق الملك عبدالله"
          initial={reduceMotion ? false : { opacity: 0, y: 42 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.05, delay: reduceMotion ? 0 : .58, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>تدشين</span>
          <strong>حدائق<br />الملك عبدالله</strong>
        </motion.h1>
        <motion.i
          className="kaga-rebirth-opening__gold"
          aria-hidden="true"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.4, delay: reduceMotion ? 0 : 1.25, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.p
          className="kaga-rebirth-opening__lead"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : 1.35 }}
        >خطة التدشين، المكان، وقصته المعرفية في تجربة تنفيذية واحدة.</motion.p>
      </div>

      <motion.div
        className="kaga-rebirth-opening__facts"
        aria-label="حقائق رئيسية من الدليل المعرفي"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : .8, delay: reduceMotion ? 0 : 1.65 }}
      >
        {scaleFacts.map((fact) => (
          <div key={fact.id}>
            <strong><MetricValue value={fact.metricValue} unitAr={fact.metricUnitAr} exponent={fact.metricExponent} /></strong>
            <span>{fact.labelAr}</span>
          </div>
        ))}
        <p><bdi>٧ داخلية</bdi><i aria-hidden="true" /><bdi>٨ خارجية</bdi></p>
      </motion.div>

      <motion.div
        className="kaga-rebirth-opening__actions"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : 1.9 }}
      >
        <button type="button" className="is-primary" onClick={onEnterEvent}>ابدأ الرحلة</button>
        <button type="button" onClick={onExploreGardens}>استكشف الحدائق</button>
        {onWatchDelight ? <button type="button" onClick={onWatchDelight}>شاهد التجربة في 90 ثانية</button> : null}
      </motion.div>

      <div className="kaga-rebirth-opening__site-focus" aria-hidden="true"><i /><span /></div>
    </section>
  );
}
