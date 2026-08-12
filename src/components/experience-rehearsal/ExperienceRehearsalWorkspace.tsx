import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  ClipboardList,
  Download,
  Eye,
  Flag,
  GitBranch,
  Layers3,
  Map,
  MessageSquarePlus,
  MonitorPlay,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  Square,
  Theater,
  Upload,
  Users,
  XCircle
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createSceneValidationContext } from '../../data/experienceSceneRegistries';
import type { ExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import { DigitalRehearsalEngine } from '../../services/digitalRehearsalEngine';
import { projectToAllRehearsalOutputs } from '../../services/digitalRehearsalProjection';
import { BrowserDigitalRehearsalRepository } from '../../services/digitalRehearsalRepository';
import { resolveDigitalRehearsalSelection, writeDigitalRehearsalSelectionToUrl, type DigitalRehearsalSelection } from '../../services/digitalRehearsalRouting';
import { projectExperienceTruth } from '../../services/experienceProjection';
import { createExperienceSceneGateway } from '../../services/experienceSceneGateway';
import { deriveRouteDesignConvergence } from '../../services/experienceRouteDesignConvergence';
import { createExperienceSelection } from '../../services/experienceSelection';
import { useEventStore } from '../../store/useEventStore';
import type {
  DailyLearningRecord,
  DigitalRehearsalPlan,
  DigitalRehearsalRun,
  NextDayImprovementProposal,
  RehearsalCommand,
  RehearsalIssue,
  RehearsalLens,
  RehearsalObservation,
  RehearsalTimeMode,
  RehearsalView
} from '../../types/digitalRehearsal';
import {
  rehearsalLensLabelsAr,
  rehearsalPlanStateLabelsAr,
  rehearsalRunStateLabelsAr
} from '../../types/digitalRehearsal';
import type { ExperienceSelectionContext } from '../../types/experienceTwin';
import type { CommandWorkspace } from '../../ux/commandExperience';
import type { DigitalRehearsalAction } from '../../services/digitalRehearsal';
import type { DigitalRehearsalValidationContext } from '../../services/digitalRehearsalValidation';
import './experienceRehearsal.css';

const StoryMapExperience = lazy(() => import('../experience-twin/StoryMapExperience'));
const ExperienceSceneViewer = lazy(() => import('../experience-twin/ExperienceSceneViewer'));

const viewLabels: Record<RehearsalView, string> = {
  command: 'غرفة القيادة',
  'story-map': 'خريطة القصة',
  scene: 'المشهد',
  comparison: 'مقارنة الأيام',
  'after-action': 'بعد الإجراء',
  'client-presentation': 'عرض العميل'
};

const timeModeLabels: Record<RehearsalTimeMode, string> = {
  'manual-step': 'خطوة يدوية',
  'planned-clock': 'ساعة مخططة مرشحة',
  'accelerated-rehearsal': 'بروفة مسرعة'
};

function commandNow(): string {
  return new Date().toISOString();
}

function experienceSelectionFor(
  configuration: ExperienceTwinConfiguration,
  run: DigitalRehearsalRun | null
): ExperienceSelectionContext {
  const pack = configuration.pack;
  const base = createExperienceSelection(pack, undefined, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
  return { ...base, rehearsalState: { ...base.rehearsalState, status: run?.state === 'running' ? 'playing' : run?.state === 'completed' ? 'completed' : run ? 'paused' : 'idle' } };
}

function deriveMappedExperienceSelection(
  configuration: ExperienceTwinConfiguration,
  plan: DigitalRehearsalPlan,
  selection: DigitalRehearsalSelection,
  run: DigitalRehearsalRun | null,
  previous: ExperienceSelectionContext | null
): ExperienceSelectionContext {
  const base = previous ?? experienceSelectionFor(configuration, run);
  const moment = plan.moments.find((candidate) => candidate.momentId === (run?.currentMomentId ?? selection.momentId))!;
  const variant = plan.personaVariants.find((candidate) => candidate.personaVariantId === selection.personaVariantId)!;
  const journey = configuration.pack.journeys.find((candidate) => candidate.journeyId === variant.baseJourneyId)
    ?? configuration.pack.journeys.find((candidate) => candidate.eventDayId === selection.eventDayId)!;
  const fallbackStep = moment.journeyStepId && journey.journeyStepIds.includes(moment.journeyStepId)
    ? moment.journeyStepId
    : journey.journeyStepIds[Math.max(0, Math.min(journey.journeyStepIds.length - 1, moment.order - 2))] ?? journey.journeyStepIds[0] ?? null;
  const step = configuration.pack.journeySteps.find((candidate) => candidate.journeyStepId === fallbackStep) ?? null;
  const previousSceneAsset = previous?.selectedSceneAssetId
    ? configuration.sceneRegistry.assets.find((asset) => asset.assetId === previous.selectedSceneAssetId) ?? null
    : null;
  const previousSceneMatchesStep = Boolean(
    previousSceneAsset
    && previousSceneAsset.projectId === configuration.pack.projectId
    && previousSceneAsset.eventId === configuration.pack.eventId
    && previousSceneAsset.venueId === configuration.pack.venueId
    && fallbackStep
    && previousSceneAsset.journeyStepIds.includes(fallbackStep)
  );
  const previousSceneMatchesSpatialContext = Boolean(
    previousSceneAsset
    && previousSceneAsset.projectId === configuration.pack.projectId
    && previousSceneAsset.eventId === configuration.pack.eventId
    && previousSceneAsset.venueId === configuration.pack.venueId
    && previousSceneAsset.spatialBindings.some((binding) => (
      binding.entityIds.some((entityId) => moment.relatedEntityIds.includes(entityId))
      || binding.zoneIds.some((zoneId) => moment.relatedZoneIds.includes(zoneId))
    ))
  );
  const selectedSceneAssetId = previous?.journeyStepId === fallbackStep && previous.selectedSceneAssetId && (moment.sceneAssetIds.includes(previous.selectedSceneAssetId) || previousSceneMatchesStep || previousSceneMatchesSpatialContext)
    ? previous.selectedSceneAssetId
    : moment.sceneAssetIds[0] ?? null;
  return {
    ...base,
    scenarioId: plan.scenarioId,
    eventDayId: selection.eventDayId,
    personaId: journey.personaId,
    journeyId: journey.journeyId,
    journeyStepId: fallbackStep,
    selectedEntityId: moment.relatedEntityIds[0] ?? null,
    selectedZoneId: moment.relatedZoneIds[0] ?? null,
    selectedExperienceAreaId: step?.experienceAreaCandidateIds[0] ?? null,
    selectedTouchpointId: moment.touchpointId,
    selectedSceneAssetId,
    mapMode: 'story',
    rehearsalState: {
      ...base.rehearsalState,
      status: run?.state === 'running' ? 'playing' : run?.state === 'completed' ? 'completed' : run ? 'paused' : 'idle',
      eventDayId: selection.eventDayId,
      personaId: journey.personaId,
      journeyId: journey.journeyId,
      currentJourneyStepId: fallbackStep
    }
  };
}

export function ExperienceRehearsalWorkspace({
  configuration,
  candidatePlan,
  plan,
  validationContext,
  onDirtyChange,
  onNavigate
}: {
  configuration: ExperienceTwinConfiguration;
  candidatePlan: DigitalRehearsalPlan;
  plan: DigitalRehearsalPlan;
  validationContext: DigitalRehearsalValidationContext;
  onDirtyChange: (dirty: boolean) => void;
  onNavigate: (workspace: CommandWorkspace) => void;
}) {
  const initialRoute = resolveDigitalRehearsalSelection(new URL(window.location.href), plan);
  const safeInitial = initialRoute.selection ?? {
    eventDayId: plan.eventDays[0]!.eventDayId,
    personaVariantId: plan.eventDays[0]!.personaVariantIds[0]!,
    runId: null,
    momentId: plan.eventDays[0]!.momentIds[0]!,
    lens: 'visitor' as const,
    view: 'command' as const,
    siteCandidateId: null,
    scenarioId: plan.scenarioId
  };
  const [engine] = useState(() => new DigitalRehearsalEngine(validationContext));
  const [repository] = useState(() => {
    const next = new BrowserDigitalRehearsalRepository(validationContext);
    if (!next.getPlan(plan.planId)) {
      const candidateWrite = next.savePlan(candidatePlan, null);
      if (candidateWrite.accepted) next.savePlan(plan, candidatePlan.planHash);
    }
    return next;
  });
  const initialStoredRun = safeInitial.runId ? repository.getRun(safeInitial.runId) : repository.getActiveRun();
  const [selection, setSelection] = useState<DigitalRehearsalSelection>(safeInitial);
  const [run, setRun] = useState<DigitalRehearsalRun | null>(() => initialStoredRun && initialStoredRun.eventDayId === safeInitial.eventDayId && initialStoredRun.personaVariantId === safeInitial.personaVariantId ? initialStoredRun : null);
  const [routeMessage, setRouteMessage] = useState(initialRoute.messageAr ?? (safeInitial.runId && !initialStoredRun ? 'تشغيل البروفة المطلوب غير موجود في مستودع هذا المشروع؛ لم يُستخدم تشغيل بديل.' : null));
  const [operatorMessage, setOperatorMessage] = useState('اختر يومًا ومنظورًا ثم أنشئ تشغيل بروفة محليًا.');
  const [timeMode, setTimeMode] = useState<RehearsalTimeMode>('manual-step');
  const [reasonAr, setReasonAr] = useState('');
  const [noteAr, setNoteAr] = useState('');
  const [contingencyId, setContingencyId] = useState(plan.contingencies[0]?.contingencyId ?? '');
  const [dailyLearning, setDailyLearning] = useState<DailyLearningRecord | null>(null);
  const [nextDayProposal, setNextDayProposal] = useState<NextDayImprovementProposal | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const commandCounter = useRef(repository.listRuns(plan.planId).reduce((total, item) => total + item.revisions.length, 0));
  const [sceneValidationContext] = useState(() => createSceneValidationContext(configuration.pack, configuration.sceneRegistry));
  const [sceneGateway] = useState(() => createExperienceSceneGateway(configuration.sceneRegistry, sceneValidationContext));
  const [mapSelection, setMapSelection] = useState<ExperienceSelectionContext>(() => deriveMappedExperienceSelection(configuration, plan, safeInitial, initialStoredRun, null));
  const createRehearsalDecisionDraft = useEventStore((state) => state.createRehearsalDecisionDraft);
  const decisions = useEventStore((state) => state.decisions);
  const decisionIds = useMemo(() => decisions.map((decision) => decision.decisionId), [decisions]);

  const day = plan.eventDays.find((candidate) => candidate.eventDayId === selection.eventDayId)!;
  const persona = plan.personaVariants.find((candidate) => candidate.personaVariantId === selection.personaVariantId)!;
  const activeMomentId = run?.currentMomentId ?? selection.momentId;
  const moment = plan.moments.find((candidate) => candidate.momentId === activeMomentId)!;
  const momentIndex = day.momentIds.indexOf(moment.momentId);
  const nextMoment = plan.moments.find((candidate) => candidate.momentId === day.momentIds[momentIndex + 1]) ?? null;
  const projection = engine.exportRehearsalProjection({
    plan,
    run,
    eventDayId: day.eventDayId,
    personaVariantId: persona.personaVariantId,
    momentId: moment.momentId,
    truth: {
      readinessDisposition: configuration.readinessDisposition,
      readinessExplanationAr: configuration.readinessExplanationAr,
      knownDecisionIds: decisionIds,
      knownEvidenceIds: [],
      sceneAvailabilityByAssetId: Object.fromEntries(configuration.sceneRegistry.assets.map((asset) => [asset.assetId, ['loadable', 'locally-available', 'manifest-only'].includes(asset.availabilityStatus) ? 'available-candidate' : asset.availabilityStatus === 'missing' ? 'missing' : 'unknown'])),
      outputTimestamp: run?.transitions.at(-1)?.recordedAt ?? plan.createdAt,
      outputTimestampClassification: run?.transitions.at(-1)?.timeTrust ?? plan.timeTrust
    }
  });
  const sceneTruthProjection = projectExperienceTruth(configuration.pack, {
    readinessDisposition: configuration.readinessDisposition,
    readinessExplanationAr: configuration.readinessExplanationAr,
    knownDecisionIds: decisionIds,
    knownEvidenceIds: [],
    sourceStatusAr: configuration.sourceStatusAr
  }).find((candidate) => candidate.journeyStepId === moment.journeyStepId) ?? null;
  const outputAdapters = projectToAllRehearsalOutputs(projection);
  const activeContingency = plan.contingencies.find((candidate) => candidate.contingencyId === contingencyId) ?? null;

  const commitSelection = (next: DigitalRehearsalSelection, history: 'push' | 'replace' = 'push') => {
    setSelection(next);
    const url = writeDigitalRehearsalSelectionToUrl(new URL(window.location.href), next);
    if (history === 'push') window.history.pushState({}, '', url);
    else window.history.replaceState({}, '', url);
  };

  const synchronizedMapSelection = useMemo(
    () => deriveMappedExperienceSelection(configuration, plan, selection, run, mapSelection),
    [configuration, mapSelection, plan, run, selection]
  );
  const routeDesignProjection = deriveRouteDesignConvergence(synchronizedMapSelection, configuration.operationalJourneyPackage, configuration.designExperience);

  useEffect(() => {
    const current = new URL(window.location.href);
    const sanitized = writeDigitalRehearsalSelectionToUrl(current, selection);
    if (sanitized.href !== current.href) window.history.replaceState({}, '', sanitized);
  }, [selection]);

  useEffect(() => {
    const restore = () => {
      const resolved = resolveDigitalRehearsalSelection(new URL(window.location.href), plan);
      if (!resolved.valid || !resolved.selection) {
        setRouteMessage(resolved.messageAr);
        return;
      }
      const restoredRun = resolved.selection.runId ? repository.getRun(resolved.selection.runId) : null;
      if (resolved.selection.runId && !restoredRun) {
        setRouteMessage('تشغيل البروفة المطلوب غير موجود في مستودع هذا المشروع؛ لم يُستخدم تشغيل بديل.');
        return;
      }
      setRouteMessage(null);
      setSelection(resolved.selection);
      setRun(restoredRun);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [plan, repository]);

  const command = (type: RehearsalCommand['type'], payload: Record<string, unknown> = {}) => {
    if (!run) {
      setOperatorMessage('أنشئ تشغيل بروفة أولًا.');
      return false;
    }
    commandCounter.current += 1;
    const nextCommand: RehearsalCommand = {
      commandId: `${run.runId}-COMMAND-${String(commandCounter.current).padStart(4, '0')}`,
      runId: run.runId,
      type,
      issuedAt: commandNow(),
      timeTrust: 'local-device-time-untrusted',
      actorSessionRef: 'LOCAL-REHEARSAL-OPERATOR-SESSION',
      payload
    };
    const result = engine.applyCommand(plan, run, nextCommand);
    if (!result.accepted) {
      setOperatorMessage(result.issues[0]?.messageAr ?? 'حُجب الأمر دون تغيير السجل.');
      return false;
    }
    const write = repository.saveRun(result.run, run.contentHash);
    if (!write.accepted || !write.value) {
      setOperatorMessage(write.messageAr);
      return false;
    }
    setRun(write.value);
    const nextSelection = {
      ...selection,
      runId: write.value.runId,
      momentId: write.value.currentMomentId ?? selection.momentId,
      siteCandidateId: write.value.selectedSiteId
    };
    commitSelection(nextSelection, 'replace');
    onDirtyChange(true);
    setOperatorMessage(result.idempotent ? 'الأمر مكرر مطابق؛ لم يُنشأ حدث ثانٍ.' : 'قُبل الأمر داخل سجل البروفة المرشحة فقط.');
    return true;
  };

  const createRun = () => {
    const runNumber = repository.listRuns(plan.planId).length + 1;
    try {
      const created = engine.createRun(plan, {
        runId: `REHEARSAL-RUN-${String(runNumber).padStart(3, '0')}`,
        eventDayId: selection.eventDayId,
        personaVariantId: selection.personaVariantId,
        rehearsalLens: selection.lens,
        rehearsalScenarioId: selection.scenarioId,
        timeMode,
        commandId: `REHEARSAL-CREATE-${String(runNumber).padStart(3, '0')}`,
        actorSessionRef: 'LOCAL-REHEARSAL-OPERATOR-SESSION',
        createdAt: commandNow()
      });
      const write = repository.saveRun(created, null);
      if (!write.accepted || !write.value) return setOperatorMessage(write.messageAr);
      setRun(write.value);
      commitSelection({ ...selection, runId: write.value.runId, momentId: write.value.currentMomentId!, siteCandidateId: write.value.selectedSiteId }, 'push');
      onDirtyChange(true);
      setOperatorMessage('أُنشئ تشغيل محلي مرشح؛ لا يمثل تنفيذًا حيًا.');
    } catch (error) {
      setOperatorMessage(error instanceof Error ? error.message : 'تعذر إنشاء تشغيل البروفة.');
    }
  };

  const changeDay = (eventDayId: string) => {
    const nextDay = plan.eventDays.find((candidate) => candidate.eventDayId === eventDayId);
    if (!nextDay) return;
    repository.selectRun(null);
    setRun(null);
    setDailyLearning(null);
    setNextDayProposal(null);
    commitSelection({ ...selection, eventDayId, personaVariantId: nextDay.personaVariantIds[0]!, runId: null, momentId: nextDay.momentIds[0]!, siteCandidateId: null }, 'push');
  };

  const changePersona = (personaVariantId: string) => {
    if (!day.personaVariantIds.includes(personaVariantId)) return;
    repository.selectRun(null);
    setRun(null);
    commitSelection({ ...selection, personaVariantId, runId: null }, 'push');
  };

  const selectMoment = (momentId: string) => {
    if (!day.momentIds.includes(momentId)) return;
    if (run) command('select-moment', { momentId });
    else commitSelection({ ...selection, momentId, siteCandidateId: plan.moments.find((candidate) => candidate.momentId === momentId)?.siteCandidateId ?? null });
  };

  const selectAdjacentMoment = (offset: -1 | 1) => {
    const targetId = day.momentIds[momentIndex + offset];
    if (targetId) selectMoment(targetId);
  };

  const updateSceneSelection = (next: ExperienceSelectionContext) => {
    setMapSelection(next);
    const targetMoment = next.journeyStepId
      ? plan.moments.find((candidate) => candidate.eventDayId === day.eventDayId && candidate.journeyStepId === next.journeyStepId)
      : null;
    if (targetMoment && targetMoment.momentId !== moment.momentId) selectMoment(targetMoment.momentId);
    if (next.viewMode === 'map-focus') commitSelection({ ...selection, view: 'story-map' });
  };

  const changeSite = (siteCandidateId: string) => {
    if (siteCandidateId && !day.siteCandidateIds.includes(siteCandidateId)) return;
    const firstSiteMoment = siteCandidateId
      ? plan.moments.find((candidate) => candidate.eventDayId === day.eventDayId && candidate.siteCandidateId === siteCandidateId)
      : null;
    if (firstSiteMoment) selectMoment(firstSiteMoment.momentId);
    else commitSelection({ ...selection, siteCandidateId: null }, 'push');
  };

  const recordObservation = (asIssue: boolean) => {
    if (!run || !noteAr.trim()) return setOperatorMessage('أدخل وصفًا موجزًا قبل التسجيل.');
    const common = {
      runId: run.runId,
      momentId: moment.momentId,
      actorSessionRef: 'LOCAL-REHEARSAL-OPERATOR-SESSION',
      recordedAt: commandNow(),
      timeTrust: 'local-device-time-untrusted' as const,
      descriptionAr: noteAr.trim(),
      relatedEntityIds: [...moment.relatedEntityIds],
      journeyStepId: moment.journeyStepId,
      basisAr: 'ملاحظة من بروفة رقمية محلية مرشحة.',
      severity: 'medium' as const,
      proposedNextActionAr: 'مراجعة المعلومة والمصدر والمالك والسلطة قبل أي إجراء.',
      truthStatus: 'rehearsal-observation-only' as const
    };
    const accepted = asIssue
      ? command('record-issue', { issue: { ...common, issueId: `ISSUE-${run.runId}-${run.issues.length + 1}`, category: 'operational-dependency', issueStatus: 'open', supersedesIssueId: null, supersedesObservationId: null } satisfies RehearsalIssue })
      : command('record-observation', { observation: { ...common, observationId: `OBS-${run.runId}-${run.observations.length + 1}`, classification: 'observation', supersedesObservationId: null } satisfies RehearsalObservation });
    if (accepted) setNoteAr('');
  };

  const createDecision = () => {
    if (!run) return setOperatorMessage('أنشئ تشغيلًا قبل ربط مسودة قرار.');
    const createdAt = commandNow();
    const decisionId = createRehearsalDecisionDraft({
      projectId: plan.projectId,
      eventId: plan.eventId as `EVENT-${string}`,
      venueId: plan.venueId as `VENUE-${string}`,
      title: `مسألة بروفة · ${moment.labelAr}`,
      description: noteAr.trim() || `تحتاج لحظة ${moment.labelAr} إلى قرار ومصدر وسلطة قبل التنفيذ.`,
      createdAt,
      runId: run.runId,
      eventDayId: run.eventDayId,
      momentId: moment.momentId,
      personaVariantId: run.personaVariantId,
      journeyStepId: moment.journeyStepId,
      relatedSpatialObjectIds: [...moment.relatedZoneIds, ...moment.relatedEntityIds],
      sourceTraceIds: [...moment.sourceTraceIds]
    });
    if (!decisionId) return setOperatorMessage(useEventStore.getState().errorMessage ?? 'حُجبت مسودة القرار.');
    const accepted = command('link-decision-draft', { link: {
      linkId: `LINK-${run.runId}-${decisionId}`,
      decisionId,
      runId: run.runId,
      eventDayId: run.eventDayId,
      momentId: moment.momentId,
      personaId: persona.personaId,
      journeyStepId: moment.journeyStepId,
      relatedSpatialObjectIds: [...moment.relatedZoneIds, ...moment.relatedEntityIds],
      observationAr: noteAr.trim() || `مسألة مرشحة عند ${moment.labelAr}.`,
      candidateImpactAr: 'الأثر غير مقيم ولا يغيّر الجاهزية.',
      sourceTraceIds: [...moment.sourceTraceIds],
      classification: 'rehearsal-only',
      decisionStatus: 'draft',
      approvalStatus: 'draft'
    } });
    if (accepted) setNoteAr('');
  };

  const deriveLearning = () => {
    if (!run) return;
    try {
      const learning = engine.deriveDailyLearning(run, commandNow());
      setDailyLearning(learning);
      const index = plan.eventDays.findIndex((candidate) => candidate.eventDayId === run.eventDayId);
      setNextDayProposal(index < plan.eventDays.length - 1 ? engine.createNextDayImprovementProposal(plan, learning) : null);
    } catch (error) {
      setOperatorMessage(error instanceof Error ? error.message : 'تعذر إنشاء مراجعة اليوم.');
    }
  };

  const resetTemporaryRun = () => {
    repository.resetActiveTemporaryContext();
    setRun(null);
    setDailyLearning(null);
    setNextDayProposal(null);
    commitSelection({ ...selection, runId: null, momentId: day.momentIds[0]!, siteCandidateId: null }, 'push');
    setOperatorMessage('أُعيد ضبط سياق التشغيل المؤقت فقط؛ لم يتغير أي خط أساسي.');
  };

  const replayRun = () => {
    if (!run || !['completed', 'aborted'].includes(run.state)) return setOperatorMessage('إعادة البروفة متاحة بعد الإكمال أو الإلغاء فقط.');
    const runNumber = repository.listRuns(plan.planId).length + 1;
    try {
      const replay = engine.replayRun(plan, run, {
        runId: `REHEARSAL-RUN-${String(runNumber).padStart(3, '0')}`,
        commandId: `REHEARSAL-REPLAY-${String(runNumber).padStart(3, '0')}`,
        actorSessionRef: 'LOCAL-REHEARSAL-OPERATOR-SESSION',
        createdAt: commandNow()
      });
      const write = repository.saveRun(replay, null);
      if (!write.accepted || !write.value) return setOperatorMessage(write.messageAr);
      setRun(write.value);
      setDailyLearning(null);
      setNextDayProposal(null);
      commitSelection({ ...selection, runId: write.value.runId, momentId: write.value.currentMomentId!, siteCandidateId: write.value.selectedSiteId }, 'push');
      setOperatorMessage('أُنشئ تشغيل إعادة مستقل؛ بقي التشغيل التاريخي محفوظًا.');
    } catch (error) {
      setOperatorMessage(error instanceof Error ? error.message : 'تعذرت إعادة البروفة.');
    }
  };

  const storyAction = (action: DigitalRehearsalAction) => {
    if (action.type === 'play') {
      if (!run) createRun();
      else if (run.state === 'ready') command('start');
      else if (run.state === 'paused') command('resume');
    } else if (action.type === 'pause') command('pause');
    else if (action.type === 'next') command('advance');
    else if (action.type === 'previous') command('previous');
    else if (action.type === 'reset') resetTemporaryRun();
    else if (action.type === 'select-step') {
      const target = plan.moments.find((candidate) => candidate.eventDayId === day.eventDayId && candidate.journeyStepId === action.journeyStepId);
      if (target) selectMoment(target.momentId);
    }
  };

  const exportLocal = () => {
    const blob = new Blob([repository.exportSanitized()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `digital-rehearsal-${plan.projectId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importLocal = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const preview = repository.previewImport(typeof reader.result === 'string' ? reader.result : '', plan);
      setImportPreview(preview.valid ? `معاينة صالحة من نوع ${preview.kind}؛ لم يُطبّق أي تغيير.` : preview.issues[0]?.messageAr ?? 'الاستيراد غير صالح.');
    };
    reader.readAsText(file);
  };

  const runs = repository.listRuns(plan.planId);
  const completedRuns = runs.filter((candidate) => ['completed', 'aborted'].includes(candidate.state));
  const comparison = completedRuns.length >= 2 ? engine.compareRuns(completedRuns) : null;
  const clientMode = selection.view === 'client-presentation';
  const activeSiteLabel = configuration.pack.siteCandidates.find((site) => site.siteCandidateId === moment.siteCandidateId)?.labelAr
    ?? (day.operationalJourneyStatus === 'not-applicable' ? 'سياق احتفالي منفصل · بلا رحلة تشغيلية' : 'الموقع غير مثبت');

  if (routeMessage) {
    return (
      <section className="experience-rehearsal-missing" data-testid="experience-rehearsal-route-rejected" lang="ar" dir="rtl">
        <ShieldAlert />
        <p>REHEARSAL CONTEXT REJECTED</p>
        <h1>تعذر فتح سياق البروفة المطلوب</h1>
        <span>{routeMessage}</span>
        <button type="button" onClick={() => onNavigate('experience-twin')}>العودة إلى سياق المشروع الآمن</button>
      </section>
    );
  }

  return (
    <section className={`experience-rehearsal-workspace view-${selection.view} ${clientMode ? 'is-client' : ''}`} data-testid="experience-rehearsal-workspace" data-project-id={plan.projectId} data-run-state={run?.state ?? 'not-started'} lang="ar" dir="rtl" onKeyDown={(event) => { if (event.key === 'Escape') { if (technicalOpen) setTechnicalOpen(false); else if (clientMode) commitSelection({ ...selection, view: 'command' }); } }}>
      <div className="rehearsal-truth-banner" role="status"><ShieldAlert />هذه بروفة رقمية مرشحة وليست تنفيذًا حيًا أو اعتمادًا تشغيليًا.</div>
      <header className="rehearsal-header">
        <div className="rehearsal-brand"><span><Theater /></span><div><small>FOUR-DAY EXPERIENCE COMMAND</small><h1>قيادة البروفة الرقمية</h1><p>{configuration.projectLabelAr}</p></div></div>
        <div className="rehearsal-posture">
          <span className="is-candidate">{rehearsalPlanStateLabelsAr[plan.state]} · R{plan.revision}</span>
          <strong>{run ? rehearsalRunStateLabelsAr[run.state] : 'لا يوجد تشغيل نشط'}</strong>
          <small>الجاهزية: لا يمكن تحديدها</small>
        </div>
        <div className="rehearsal-header-actions">
          <button type="button" onClick={() => onNavigate('experience-twin')}><Eye />توأم التجربة</button>
          <button type="button" onClick={exportLocal}><Download />تصدير محلي</button>
          <label className="rehearsal-import"><Upload />معاينة استيراد<input type="file" accept="application/json,.json" onChange={(event) => importLocal(event.target.files?.[0])} /></label>
        </div>
      </header>

      {importPreview ? <div className="rehearsal-import-message"><span>{importPreview}</span><button type="button" aria-label="إغلاق رسالة الاستيراد" onClick={() => setImportPreview(null)}><XCircle /></button></div> : null}

      <div className="rehearsal-context-bar">
        <label><span>اليوم</span><select data-testid="rehearsal-day-select" value={day.eventDayId} onChange={(event) => changeDay(event.target.value)}>{plan.eventDays.map((candidate) => <option key={candidate.eventDayId} value={candidate.eventDayId}>{candidate.labelAr}</option>)}</select></label>
        <label><span>المنظور</span><select data-testid="rehearsal-persona-select" value={persona.personaVariantId} onChange={(event) => changePersona(event.target.value)}>{day.personaVariantIds.map((id) => { const item = plan.personaVariants.find((candidate) => candidate.personaVariantId === id)!; const blocked = plan.executionSteps.filter((step) => step.personaVariantId === id).every((step) => !step.allowed); return <option key={id} value={id} disabled={blocked}>{item.labelAr}{blocked ? ' · يحتاج مصدرًا مستقلًا' : ''}</option>; })}</select></label>
        {day.siteCandidateIds.length > 1 ? <label><span>الموقع ضمن اليوم</span><select data-testid="rehearsal-site-select" value={selection.siteCandidateId ?? ''} onChange={(event) => changeSite(event.target.value)}><option value="">اليوم كاملًا · بلا مسار بيني</option>{day.siteCandidateIds.map((siteId) => <option key={siteId} value={siteId}>{configuration.pack.siteCandidates.find((site) => site.siteCandidateId === siteId)?.labelAr ?? siteId}</option>)}</select></label> : null}
        <label><span>العدسة</span><select value={selection.lens} onChange={(event) => commitSelection({ ...selection, lens: event.target.value as RehearsalLens })}>{plan.supportedLenses.map((lens) => <option key={lens} value={lens}>{rehearsalLensLabelsAr[lens]}</option>)}</select></label>
        <label><span>وضع الزمن</span><select value={timeMode} disabled={Boolean(run)} onChange={(event) => setTimeMode(event.target.value as RehearsalTimeMode)}>{plan.supportedTimeModes.map((mode) => <option key={mode} value={mode}>{timeModeLabels[mode]}</option>)}</select></label>
        <div className="rehearsal-attendance"><span>الحضور في المصدر</span><strong>{day.attendance.qualifier === 'unknown' ? 'غير معروف' : `${day.attendance.qualifier === 'more-than' ? 'أكثر من ' : day.attendance.qualifier === 'approximately' ? 'نحو ' : ''}${day.attendance.value}`}</strong><small>ليس سعة أو توقعًا</small></div>
      </div>

      <nav className="rehearsal-view-tabs" aria-label="طرق عرض البروفة">{(Object.keys(viewLabels) as RehearsalView[]).map((view) => <button data-testid={`rehearsal-view-${view}`} key={view} type="button" aria-pressed={selection.view === view} onClick={() => commitSelection({ ...selection, view })}>{view === 'command' ? <MonitorPlay /> : view === 'story-map' ? <Map /> : view === 'scene' ? <Layers3 /> : view === 'comparison' ? <BarChart3 /> : view === 'after-action' ? <ClipboardList /> : <Users />}{viewLabels[view]}</button>)}</nav>

      {selection.view === 'command' || selection.view === 'story-map' ? (
        <div className={`rehearsal-command-layout ${selection.view === 'story-map' ? 'map-focus' : ''}`}>
          <main className="rehearsal-map-stage" data-testid="rehearsal-story-map">
            <Suspense fallback={<div className="rehearsal-loading">جارٍ تحميل خريطة القصة المرشحة...</div>}>
              <StoryMapExperience
                definition={configuration.storyMapDefinition}
                pack={configuration.pack}
                selection={synchronizedMapSelection}
                onSelectionChange={(next) => setMapSelection(next)}
                onSelectStep={(journeyStepId) => storyAction({ type: 'select-step', journeyStepId })}
                onRehearsal={storyAction}
                onDirtyChange={onDirtyChange}
                onOpenTruth={() => setTechnicalOpen(true)}
              />
            </Suspense>
            <div className="rehearsal-map-overlay"><span>{day.operationalJourneyStatus === 'not-applicable' ? '1 نوفمبر · تسلسل محتوى احتفالي بلا رحلة أو انتقال مشترك' : projection.mapFocus.status === 'unresolved' ? 'لحظة غير محسومة مكانيًا · لا مرساة بديلة' : 'اختيار دلالي مرشح · لا مسار معتمد'}</span><b>{projection.projectionVersion.slice(0, 10)}</b></div>
          </main>
          {selection.view === 'command' ? <aside className="rehearsal-command-rail">
            <section className="rehearsal-now" data-testid="rehearsal-current-moment"><small>الآن داخل البروفة</small><span>{moment.order} / {day.momentIds.length}</span><h2>{moment.labelAr}</h2><p>{projection.narrativeState.truthLabelAr}</p><div><b>{activeSiteLabel}{moment.siteCandidateId ? ' · موقع مرشح' : ''}</b><em>{run ? run.momentStates[moment.momentId] : 'pending'}</em></div></section>
            <section className="rehearsal-next"><small>التالي</small><strong>{nextMoment?.labelAr ?? 'نهاية تسلسل اليوم'}</strong><span>{nextMoment?.plannedTime ?? 'لا يوجد وقت دقيق في المصدر'}</span></section>
            <div className="rehearsal-primary-controls">
              {!run ? <button data-testid="rehearsal-create-run" type="button" className="primary" onClick={createRun}><CirclePlay />إنشاء تشغيل</button> : null}
              {run?.state === 'ready' ? <button data-testid="rehearsal-start" type="button" className="primary" onClick={() => command('start')}><CirclePlay />ابدأ البروفة</button> : null}
              {run?.state === 'running' ? <button data-testid="rehearsal-pause" type="button" onClick={() => command('pause')}><CirclePause />إيقاف مؤقت</button> : null}
              {run?.state === 'paused' ? <button data-testid="rehearsal-resume" type="button" className="primary" onClick={() => command('resume')}><CirclePlay />استئناف</button> : null}
              <button data-testid="rehearsal-previous" type="button" disabled={!run || momentIndex <= 0} onClick={() => command('previous')}><ChevronRight />السابق</button>
              <button data-testid="rehearsal-next" type="button" disabled={!run || !['running', 'paused'].includes(run.state)} onClick={() => command('advance')}><ChevronLeft />التالي</button>
            </div>
            <label className="rehearsal-reason"><span>سبب إلزامي للتجاوز أو الحجب أو الإلغاء</span><input data-testid="rehearsal-reason" value={reasonAr} onChange={(event) => setReasonAr(event.target.value)} placeholder="سبب مرشح وموجز" /></label>
            <div className="rehearsal-secondary-controls"><button data-testid="rehearsal-complete-moment" type="button" onClick={() => command('complete-moment')}><CheckCircle2 />إكمال</button><button data-testid="rehearsal-skip" type="button" onClick={() => command('skip-moment', { reasonAr })}><SkipForward />تجاوز</button><button data-testid="rehearsal-block" type="button" onClick={() => command('block-moment', { reasonAr })}><Square />حجب</button>{run?.state === 'blocked' ? <button data-testid="rehearsal-unblock" type="button" onClick={() => command('unblock-moment', { reasonAr })}><RotateCcw />رفع الحجب</button> : null}</div>
            <section className="rehearsal-governed-context" data-testid="rehearsal-governed-context"><div><span>الجاهزية</span><strong>لا يمكن تحديدها</strong><small>{projection.readinessSummary.requirementIds.length} متطلب مرتبط · قراءة فقط</small></div><div><span>المالك التشغيلي</span><strong>{moment.operationalOwnerRoleId ?? 'غير معيّن'}</strong><small>لا تعيين تلقائي من البروفة</small></div><div><span>الدليل والاعتماد</span><strong>{projection.evidenceSummary.evidenceIds.length ? `${projection.evidenceSummary.evidenceIds.length} مرجع غير متحقق` : 'لا دليل مرتبط'}</strong><small>جهات التحقق والاعتماد والقبول غير معيّنة</small></div><div><span>القرارات</span><strong>{projection.decisionSummary.decisionIds.length + projection.decisionSummary.draftLinkIds.length}</strong><small>المسودة لا تُعتمد تلقائيًا</small></div></section>
            <div className="rehearsal-run-controls"><button data-testid="rehearsal-complete-run" type="button" disabled={!run || !run.startedAt || ['completed', 'aborted', 'blocked'].includes(run.state)} onClick={() => command('complete-run')}><CheckCircle2 />إنهاء البروفة</button><button data-testid="rehearsal-abort-run" type="button" disabled={!run || !run.startedAt || ['completed', 'aborted'].includes(run.state)} onClick={() => command('abort-run', { reasonAr })}><XCircle />إلغاء بسبب</button><button data-testid="rehearsal-reset-run" type="button" onClick={resetTemporaryRun}><RotateCcw />إعادة المؤقت</button>{run && ['completed', 'aborted'].includes(run.state) ? <button data-testid="rehearsal-replay-run" type="button" onClick={replayRun}><CirclePlay />إعادة ببصمة جديدة</button> : null}</div>
            <section className="rehearsal-sequence" aria-label="تسلسل لحظات اليوم">{day.momentIds.map((id, index) => { const item = plan.moments.find((candidate) => candidate.momentId === id)!; const state = run?.momentStates[id] ?? (id === moment.momentId ? 'current' : 'pending'); return <button key={id} type="button" aria-current={id === moment.momentId ? 'step' : undefined} data-state={state} onClick={() => selectMoment(id)}><i>{index + 1}</i><span>{item.labelAr}</span><small>{state}</small></button>; })}</section>
          </aside> : null}
        </div>
      ) : null}

      {selection.view === 'scene' ? <div className="rehearsal-single-view"><Suspense fallback={<div className="rehearsal-loading">جارٍ تحميل عارض المشهد المحكوم...</div>}><ExperienceSceneViewer registry={configuration.sceneRegistry} gateway={sceneGateway} validationContext={sceneValidationContext} pack={configuration.pack} storyMapDefinition={configuration.storyMapDefinition} selection={synchronizedMapSelection} projection={sceneTruthProjection} designExperience={configuration.designExperience} routeDesignProjection={routeDesignProjection} onSelectionChange={updateSceneSelection} onPrevious={() => selectAdjacentMoment(-1)} onNext={() => selectAdjacentMoment(1)} onReturnToMap={() => commitSelection({ ...selection, view: 'story-map' })} onOpenTruth={() => setTechnicalOpen(true)} onDirtyChange={onDirtyChange} readOnly /></Suspense><aside className="rehearsal-scene-context"><small>اللحظة المتزامنة</small><h2>{moment.labelAr}</h2><p>{persona.labelAr}</p><strong>{projection.visualState.sceneStatus === 'available-candidate' ? 'معاينة مرشحة' : 'مصدر مفقود أو غير متحقق'}</strong><span>العارض للقراءة فقط · لا يثبت هندسة أو جاهزية أو تنفيذًا.</span><button type="button" onClick={() => commitSelection({ ...selection, view: 'command' })}><ArrowLeft />العودة للقيادة</button></aside></div> : null}

      {selection.view === 'comparison' ? <div className="rehearsal-comparison" data-testid="rehearsal-day-comparison"><header><div><small>FOUR-DAY COMPARISON</small><h2>مقارنة البرنامج والبروفات</h2></div><span>لا توجد نسبة جاهزية</span></header><div className="rehearsal-day-grid">{plan.eventDays.map((candidate) => { const candidateRuns = runs.filter((item) => item.eventDayId === candidate.eventDayId); return <article key={candidate.eventDayId}><b>{candidate.order}</b><h3>{candidate.labelAr}</h3><p>{candidate.momentIds.length} لحظة مرشحة</p><dl><div><dt>الحضور</dt><dd>{candidate.attendance.qualifier === 'unknown' ? 'غير معروف' : candidate.attendance.value}</dd></div><div><dt>التشغيلات المحلية</dt><dd>{candidateRuns.length}</dd></div><div><dt>الحالة</dt><dd>{candidateRuns.at(-1) ? rehearsalRunStateLabelsAr[candidateRuns.at(-1)!.state] : 'لم تُجرَ بروفة'}</dd></div></dl></article>; })}</div>{comparison ? <pre>{JSON.stringify(comparison.summaries, null, 2)}</pre> : <div className="rehearsal-empty"><BarChart3 /><strong>لا توجد تشغيلات مكتملة كافية للمقارنة</strong><p>المقارنة لا تنتج جاهزية أو زمن تنفيذ فعلي.</p></div>}</div> : null}

      {selection.view === 'after-action' ? <div className="rehearsal-after-action" data-testid="rehearsal-after-action"><section><header><div><small>AFTER ACTION</small><h2>مراجعة ما بعد البروفة</h2></div><button type="button" disabled={!run || !['completed', 'aborted'].includes(run.state)} onClick={deriveLearning}><BookOpen />اشتقاق تعلم اليوم</button></header>{run?.outcome ? <dl><div><dt>اللحظات المخططة</dt><dd>{run.outcome.plannedMomentCount}</dd></div><div><dt>تمت مراجعتها</dt><dd>{run.outcome.rehearsedMomentCount}</dd></div><div><dt>المسائل</dt><dd>{run.outcome.issueIds.length}</dd></div><div><dt>توقيت غير مؤكد</dt><dd>{run.outcome.uncertainTimingCount}</dd></div></dl> : <div className="rehearsal-empty"><ClipboardList /><strong>لا توجد نتيجة نهائية</strong><p>أكمل أو ألغِ تشغيل بروفة بدأ بالفعل مع سبب صريح.</p></div>}{dailyLearning ? <article><h3>تعلم اليوم · مراجعة {dailyLearning.revision}</h3>{dailyLearning.learningItemsAr.length ? <ul>{dailyLearning.learningItemsAr.map((item) => <li key={item}>{item}</li>)}</ul> : <p>لم تُسجل ملاحظات؛ لا تغيير تلقائي.</p>}</article> : null}</section><section><header><div><small>NEXT-DAY PROPOSAL</small><h2>مقترح اليوم التالي</h2></div><span>يحتاج مراجعة صريحة</span></header>{nextDayProposal ? <article><strong>معاينة فقط</strong><p>من {nextDayProposal.sourceEventDayId} إلى {nextDayProposal.targetEventDayId}</p><ul>{nextDayProposal.proposedChangesAr.map((item) => <li key={item}>{item}</li>)}</ul><small>لا يغيّر اليوم التالي أو الخط الأساسي.</small></article> : <div className="rehearsal-empty"><Flag /><strong>لا يوجد مقترح بعد</strong><p>التعلم اليومي لا يُرحّل تلقائيًا.</p></div>}</section></div> : null}

      {clientMode ? <div className="rehearsal-client-view" data-testid="rehearsal-client-presentation"><div className="rehearsal-client-hero"><small>رؤية مرشحة لأربعة أيام</small><h2>{day.themeAr}</h2><p>{moment.labelAr}</p><span>تسلسل قصصي مرشح · لا يمثل برنامجًا تشغيليًا أو مسارًا معتمدًا</span></div><div className="rehearsal-client-strip">{day.momentIds.map((id, index) => <button key={id} type="button" aria-current={id === moment.momentId ? 'step' : undefined} onClick={() => selectMoment(id)}><i>{index + 1}</i><span>{plan.moments.find((candidate) => candidate.momentId === id)!.labelAr}</span></button>)}</div><footer><span>المصدر: برنامج وتصميم مرشح موثق البصمة</span><span>الجاهزية التشغيلية: لا يمكن تحديدها</span><span>المسارات والهندسة: غير معتمدة</span></footer></div> : null}

      {!clientMode ? (
        <section className="rehearsal-observation-dock">
          <div><small>OBSERVATION & DECISION</small><strong>سجل ملاحظة أو مسألة مرتبطة باللحظة الحالية</strong></div>
          <textarea data-testid="rehearsal-note" value={noteAr} onChange={(event) => setNoteAr(event.target.value)} placeholder="وصف موجز دون بيانات شخصية أو ادعاء تحقق" />
          <div><button data-testid="rehearsal-record-observation" type="button" onClick={() => recordObservation(false)}><MessageSquarePlus />ملاحظة</button><button data-testid="rehearsal-record-issue" type="button" onClick={() => recordObservation(true)}><AlertTriangle />مسألة</button><button data-testid="rehearsal-create-decision" type="button" onClick={createDecision}><Flag />مسودة قرار</button></div>
          {day.operationalJourneyStatus === 'not-applicable' ? (
            <div className="rehearsal-day-not-applicable" data-testid="rehearsal-day-no-operational-contingencies">
              <strong>لا تنطبق سيناريوهات رحلة تشغيلية</strong>
              <small>أي نشاط إنتاجي مستقبلي يحتاج مصدرًا مستقلًا معتمدًا.</small>
            </div>
          ) : (
            <>
              <label><span>سيناريو افتراضي للاختبار</span><select data-testid="rehearsal-contingency-select" value={contingencyId} onChange={(event) => setContingencyId(event.target.value)}>{plan.contingencies.map((item) => <option key={item.contingencyId} value={item.contingencyId}>{item.labelAr}</option>)}</select><small>{activeContingency?.truthStatus === 'hypothetical-rehearsal-only' ? 'لا يفعّل إجراءً تشغيليًا' : ''}</small></label>
              <div className="rehearsal-contingency-controls"><button data-testid="rehearsal-activate-contingency" type="button" onClick={() => command('activate-contingency', { contingencyId })}><GitBranch />تفعيل للاختبار</button>{run?.activeBranchId ? <button data-testid="rehearsal-return-primary" type="button" onClick={() => command('return-primary', { reasonAr: reasonAr || 'العودة إلى التسلسل المرشح بعد مراجعة الاحتمال.' })}><RotateCcw />العودة للأساسي</button> : null}</div>
            </>
          )}
        </section>
      ) : null}

      {!clientMode ? <footer className="rehearsal-status-footer"><span>{operatorMessage}</span><div>{outputAdapters.map((adapter) => <b key={adapter.adapterId}>{adapter.adapterId} · preview</b>)}</div><button type="button" onClick={() => setTechnicalOpen((value) => !value)}>{technicalOpen ? 'إخفاء التفاصيل' : 'التفاصيل التقنية'}</button></footer> : null}
      {technicalOpen ? <aside className="rehearsal-technical-drawer" data-testid="rehearsal-technical-drawer"><header><div><small>TECHNICAL TRUTH</small><h2>تفاصيل الحقيقة والإسقاط</h2></div><button type="button" aria-label="إغلاق التفاصيل التقنية" onClick={() => setTechnicalOpen(false)}><XCircle /></button></header><dl><div><dt>Plan</dt><dd dir="ltr">{plan.planId}</dd></div><div><dt>Plan hash</dt><dd dir="ltr">{plan.planHash}</dd></div><div><dt>Projection</dt><dd dir="ltr">{projection.projectionVersion}</dd></div><div><dt>Moment</dt><dd dir="ltr">{moment.momentId}</dd></div><div><dt>Run</dt><dd dir="ltr">{run?.runId ?? 'none'}</dd></div><div><dt>Source hash</dt><dd dir="ltr">{plan.sourceReferences[0]?.sourceHash}</dd></div><div><dt>Physical standard</dt><dd dir="ltr">MEIOS-PDT-STD-001 v1.0.0</dd></div></dl><ul><li>لا تعديل للخط الأساسي أو الجاهزية أو الأدلة أو الحقيقة المكانية.</li><li>لا تحكم أجهزة ولا معايرة ولا شراء ولا مطالبة مطابقة مادية.</li><li>وقت الجهاز محلي وغير موثوق تشغيليًا.</li></ul></aside> : null}
    </section>
  );
}
