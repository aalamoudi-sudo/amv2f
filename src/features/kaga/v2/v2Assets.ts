export interface KagaV2AssetSource {
  sourceDocument: 'Rev06 Inauguration of King Abdullah Gardens';
  sourcePages: number[];
  extraction: string;
  sourceConfidence: 'exact';
}

export interface KagaV2Asset {
  id: string;
  path: string;
  altAr: string;
  source: KagaV2AssetSource;
}

const eventPageOneSource: KagaV2AssetSource = {
  sourceDocument: 'Rev06 Inauguration of King Abdullah Gardens',
  sourcePages: [1],
  extraction: 'صورة مضمّنة مستخرجة من ملف PDF من دون طبقة عناوين الغلاف.',
  sourceConfidence: 'exact',
};

const eventEmbeddedSource = (sourcePages: number[], extraction: string): KagaV2AssetSource => ({
  sourceDocument: 'Rev06 Inauguration of King Abdullah Gardens',
  sourcePages,
  extraction,
  sourceConfidence: 'exact',
});

export const kagaV2Assets = {
  introClean: {
    id: 'v2-intro-clean',
    path: '/kaga/assets/v2/intro-clean-p001.jpg',
    altAr: 'مشهد جوي لمبنى الهلالين وحدائق الملك عبدالله عند الغروب',
    source: eventPageOneSource,
  },
  siteAerial: {
    id: 'v2-site-aerial',
    path: '/kaga/assets/v2/site-aerial-p001.jpg',
    altAr: 'مشهد جوي رأسي لموقع حدائق الملك عبدالله ومبنى الهلالين والمواقف',
    source: eventPageOneSource,
  },
  royalModelClean: {
    id: 'v2-royal-model-clean',
    path: '/kaga/assets/v2/royal-model-clean-p015.jpg',
    altAr: 'المجسم الفعلي المعتمد للحظة تدشين حدائق الملك عبدالله',
    source: eventEmbeddedSource([15], 'صورة JPEG مضمّنة مستخرجة مباشرة من الصفحة 15؛ لا تتضمن تبويبات أو نصوص واجهة ملف PDF.'),
  },
  launchStageClean: {
    id: 'v2-launch-stage-clean',
    path: '/kaga/assets/v2/launch-stage-clean-p020.jpg',
    altAr: 'المشهد الليلي الفعلي لحدائق الملك عبدالله ومبنى الهلالين',
    source: eventEmbeddedSource([20], 'صورة JPEG مضمّنة مستخرجة مباشرة من الصفحة 20؛ لا تتضمن نصوص العرض أو واجهته.'),
  },
} satisfies Record<string, KagaV2Asset>;
