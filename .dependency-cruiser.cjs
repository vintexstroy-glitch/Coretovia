/**
 * СЛОЕВЕТЕ · посоката на зависимостите е ЕДНА и я брои машина (ADR-001 §3).
 *
 * Хексагон, който CI не проверява, се превръща в кълбо за едно тримесечие.
 * Всяко правило тук е „кой НЕ може да внася кого"; позволеното е остатъкът.
 * Стрелката винаги сочи надолу: app → porta → komandi → smetach/formuli →
 * ogledalo → sabitiya → model → yadro. Носителят (`nositel`) е отдолу и вижда
 * само ядрото; Книгата и агентите са адаптери отстрани.
 */

const SLOY = {
  yadro: '^src/yadro/',
  model: '^src/model/',
  sabitiya: '^src/sabitiya/',
  ogledalo: '^src/ogledalo/',
  smetach: '^src/(smetach|formuli)/',
  komandi: '^src/komandi/',
  porta: '^src/porta/',
  kniga: '^src/kniga/',
  agenti: '^src/agenti/',
  nositel: '^src/nositel/',
  app: '^app/',
};

/** Правило „X не внася от Y" · с човешко име, за да се чете в отчета. */
function zabrana(name, ot, kam, comment) {
  return {
    name,
    comment,
    severity: 'error',
    from: { path: ot },
    to: { path: kam },
  };
}

module.exports = {
  forbidden: [
    {
      name: 'bez-krag',
      comment: 'Цикъл между модули значи, че никой от тях не може да се тества сам.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    zabrana('yadro-e-samo', SLOY.yadro, '^(src/(?!yadro/)|app/)', 'Ядрото внася само ядро.'),
    zabrana(
      'model-e-chist',
      SLOY.model,
      '^(src/(?!model/|yadro/)|app/)',
      'Моделът вижда само ядрото.',
    ),
    zabrana(
      'sabitiya-nad-modela',
      SLOY.sabitiya,
      '^(src/(?!sabitiya/|model/|yadro/)|app/)',
      'Събитията виждат модела и ядрото, нищо отгоре.',
    ),
    zabrana(
      'ogledalo-samo-chete',
      SLOY.ogledalo,
      '^(src/(?!ogledalo/|sabitiya/|model/|yadro/)|app/)',
      'Огледалото само чете: събития, модел, ядро.',
    ),
    zabrana(
      'smetach-e-chist',
      SLOY.smetach,
      '^(src/(?!smetach/|formuli/|ogledalo/|model/|yadro/)|app/)',
      'Сметачът и формулите смятат върху Огледалото и нищо друго.',
    ),
    zabrana(
      'komandi-ne-pishat-sami',
      SLOY.komandi,
      '^(src/(porta|kniga|agenti|nositel)/|app/)',
      'Командата е данни; тя не държи Врата, носител, Книга или агент.',
    ),
    zabrana(
      'portata-e-edna',
      SLOY.porta,
      '^(src/(kniga|agenti|nositel)/|app/)',
      'Портата не знае за адаптерите си.',
    ),
    zabrana(
      'knigata-e-adapter',
      SLOY.kniga,
      '^(src/(komandi|agenti|nositel)/|app/)',
      'Книгата минава през Портата, не през командите и не през носителя.',
    ),
    zabrana(
      'agentat-ne-pishe',
      SLOY.agenti,
      '^(src/(porta/izpalnitel|kniga|nositel|yadro/vrata)|app/)',
      'Агентът получава само PortaZaChetene; изпълнителят и Вратата са му недостъпни.',
    ),
    zabrana(
      'nositelyat-e-dolu',
      SLOY.nositel,
      '^(src/(?!nositel/|yadro/)|app/)',
      'Носителят вижда само ядрото.',
    ),
    zabrana('src-ne-znae-app', '^src/', SLOY.app, 'Домейнът не знае за екрана.'),
    zabrana(
      'app-ne-drazhi-vratata',
      '^app/(?!main\\.ts$)',
      '^src/(nositel/|yadro/vrata|porta/izpalnitel|komandi/)',
      'Само композиционният корен (app/main.ts) сглобява носител, Врата и изпълнител.',
    ),
    {
      name: 'chuzhdo-samo-poimenno',
      comment: 'Чужд пакет влиза само от изброен файл: exceljs през src/kniga/ooxml.ts.',
      severity: 'error',
      from: { path: '^(src|app)/', pathNot: '^src/kniga/ooxml\\.ts$' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
