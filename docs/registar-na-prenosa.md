# Регистърът на преноса · всеки стар файл с ТОЧНО една присъда

**Дата:** 2026-09-05 · **Извор:** `C:\Users\ivayl\Projects\VintexStroy` @ `c001a44` (таг `alfa-kray-2026-09-05`) · **Резен:** 0 · ADR-001

Присъдата идва от ТРИ въпроса: Книгата го ли назовава · новата архитектура има ли му място ·
тестовете му минават ли без лев · НАП · ДДС · SAF-T. **ПРЕНОС** = дословно, с теста си.
**ПРЕНАПИСВАНЕ** = идеята и инвариантите остават, формата се сменя. **ЧАКА** = чака дума (чия —
в скобите); OAuth, планове, Драйв, личен акаунт са ЧАКА, не ОТПАДА. **ОТПАДА** = Книгата не го
назовава и няма дом. Прозорци: **У** Управление · **С** Сметки · **П** Продажби · **К** Кредити ·
**Г** Голямо дело · **Я** ядро (всички) · **—** никой.

Числата долу се БРОЯТ от таблицата (`tests/registar.test.ts`), не се преписват.

## Обобщение

| папка | файлове | ПРЕНОС | ПРЕНАПИСВАНЕ | ЧАКА | ОТПАДА |
| :---- | ---: | ---: | ---: | ---: | ---: |
| src/yadro | 15 | 12 | 1 | 2 | 0 |
| src/nositel | 5 | 4 | 0 | 1 | 0 |
| src/iztochnik | 12 | 8 | 2 | 2 | 0 |
| src/iznos | 5 | 2 | 1 | 2 | 0 |
| src/ogledalo | 3 | 1 | 2 | 0 | 0 |
| src/kalkulator | 10 | 1 | 8 | 0 | 1 |
| src/domein | 105 | 16 | 39 | 37 | 13 |
| src/migratsiya + izdanie | 2 | 0 | 1 | 0 | 1 |
| stroezh | 6 | 6 | 0 | 0 | 0 |
| proba | 32 | 5 | 25 | 1 | 1 |
| .claude/skills | 12 | 2 | 10 | 0 | 0 |
| tests (поименно) | 17 | 10 | 4 | 3 | 0 |
| **ОБЩО** | **224** | **67** | **93** | **48** | **16** |

Сверка вход↔изход: 67 + 93 + 48 + 16 = 224 = 224 реда · разлика 0 (записана, макар и нула · правило 7).

Осем присъди са ПОПРАВЕНИ спрямо първата сверка (тя гледаше пет прозореца, не осем):
`domein/kolonno.ts` → ПРЕНОС · `domein/agenti.ts` и `zadachi.ts` → ПРЕНАПИСВАНЕ · `domein/formuli.ts` →
ПРЕНАПИСВАНЕ · `domein/stopanin.ts` и `sluzhiteli.ts` → ПРЕНАПИСВАНЕ · `domein/butoni.ts` → ПРЕНОС;
`tests/vazmozhnostite.test.ts` остава ЧАКА. Разделите на стария проход са 22 реда, не един.

**Пет присъди се смениха на 05.09 след трите допълнения** (`zadanie/10-dopalneniya-05-09.md`): `dds.ts` ·
`sverka-dds.ts` · `spravki-schetovodstvo.ts` · `kontragenti.ts` → ПРЕНАПИСВАНЕ (ДДС и подтаб НАП, резен 3б);
`kalkulator/sazdavane.ts` → ПРЕНАПИСВАНЕ (Калкулаторът над Продажбите, резен 5). `glavna-kniga.ts` остава ОТПАДА —
„Не е да се свързва с НАП".

`app/` (74 файла) не е в регистъра по файл: екранният слой се рисува наново ОТ модела; пренасят се 13-те
чисти UI-механики в `app/reshetka/` (резен 1). Останалите тестове (146 файла) носят присъдата на файла,
който пазят.

## Регистърът

### src/yadro

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| yadro/data.ts | 44 | ПРЕНОС | src/yadro/data.ts | Я | 3 · вход |
| yadro/dnevnik.ts | 129 | ПРЕНОС | src/yadro/dnevnik.ts (+ `chetiOt`) | Я | 1 |
| yadro/dumi.ts | 23 | ПРЕНОС | src/yadro/dumi.ts | Я | 17 |
| yadro/hash.ts | 163 | ПРЕНОС | src/yadro/hash.ts | Я | 4 |
| yadro/index.ts | 16 | ПРЕНАПИСВАНЕ (пада износът на zheton/samolichnost) | src/yadro/index.ts | Я | 10 |
| yadro/kotva.ts | 112 | ПРЕНОС | src/yadro/kotva.ts | Я | 4 |
| yadro/pari.ts | 206 | ПРЕНОС (мостът `otLeva` е без викащ — `chistota` го маха) | src/yadro/pari.ts | Я | 3 |
| yadro/pravata.ts | 189 | ПРЕНОС | src/yadro/pravata.ts | Я | 2 |
| yadro/sabitie.ts | 87 | ПРЕНОС | src/yadro/sabitie.ts | Я | 1 · 4 |
| yadro/samolichnost.ts | 273 | ЧАКА (OAuth · по-късно · негова дума кога) | src/vhod/samolichnost.ts | — | 13 |
| yadro/sverka.ts | 100 | ПРЕНОС | src/yadro/sverka.ts | Я | 7 |
| yadro/takt.ts | 123 | ПРЕНОС | src/yadro/takt.ts | Я | 6 |
| yadro/valuta.ts | 162 | ПРЕНОС (две валути, без курс, `tsenaNagore`) | src/yadro/valuta.ts | Я · П | 3 |
| yadro/vrata.ts | 606 | ПРЕНОС | src/yadro/vrata.ts | Я | 2 |
| yadro/zheton.ts | 220 | ЧАКА (OAuth) | src/vhod/zheton.ts | — | 13 |

### src/nositel

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| nositel/dnevnik-indexeddb.ts | 217 | ПРЕНОС (снимките са НОВ файл `snimki-indexeddb.ts`) | src/nositel/dnevnik-indexeddb.ts | Я | 1 |
| nositel/drayv.ts | 232 | ЧАКА (Драйв иска OAuth) | src/nositel/drayv.ts | — | 14 |
| nositel/hash-node.ts | 11 | ПРЕНОС | src/nositel/hash-node.ts | Я | 4 |
| nositel/hash-web.ts | 14 | ПРЕНОС | src/nositel/hash-web.ts | Я | 4 |
| nositel/hranilishte.ts | 74 | ПРЕНОС | src/nositel/hranilishte.ts | Я | ADR-001 |

### src/iztochnik

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| iztochnik/chetetsat.ts | 80 | ПРЕНОС | src/iztochnik/chetetsat.ts | С · К · Г | 17 |
| iztochnik/csv.ts | 95 | ПРЕНОС | src/iztochnik/csv.ts | С | 10 |
| iztochnik/karta.ts | 363 | ПРЕНАПИСВАНЕ (внася `razchitane` → ДДС; четецът на извлечения остава) | src/iztochnik/izvlechenie.ts | С (сверяване) | 10 |
| iztochnik/model.ts | 463 | ЧАКА (свободни таблици от файл — книгата има 8 фиксирани прозореца; негова дума) | src/iztochnik/model.ts | — | ADR-009 |
| iztochnik/pdf.ts | 514 | ПРЕНОС | src/iztochnik/pdf.ts | К · Г | 10 |
| iztochnik/prevod-formula.ts | 209 | ЧАКА (формули в хедъра — негова дума) | — | — | ADR-081 |
| iztochnik/razchitane.ts | 359 | ПРЕНАПИСВАНЕ (без ДДС) | src/iztochnik/razchitane.ts | С | 3 |
| iztochnik/snimka.ts | 103 | ПРЕНОС | src/iztochnik/snimka.ts | Я | 7 |
| iztochnik/tablitsa.ts | 85 | ПРЕНОС | src/iztochnik/tablitsa.ts | Я | 10 |
| iztochnik/xlsb.ts | 246 | ПРЕНОС | src/iztochnik/xlsb.ts | С · П | 10 |
| iztochnik/xlsx.ts | 207 | ПРЕНОС | src/iztochnik/xlsx.ts | С · П | 10 |
| iztochnik/zip.ts | 85 | ПРЕНОС | src/iztochnik/zip.ts | Я | 10 |

### src/iznos

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| iznos/excel.ts | 219 | ПРЕНОС | src/iznos/excel.ts | всички | 10 |
| iznos/godishen-fayl.ts | 152 | ЧАКА (годишен архив — книгата мълчи; негова дума) | — | — | ADR-088 |
| iznos/ot-model.ts | 107 | ПРЕНАПИСВАНЕ (от колонна таблица към лист) | src/iznos/ot-tablitsa.ts | всички | 17 |
| iznos/sedmichen-fayl.ts | 82 | ЧАКА (седмичен файл — книгата мълчи) | — | — | ADR-082 |
| iznos/xml.ts | 36 | ПРЕНОС | src/iznos/xml.ts | Я | 17 |

### src/ogledalo

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| ogledalo/ogledalo.ts | 2086 | ПРЕНАПИСВАНЕ (колонно; регистър от четци вместо 462-редов switch) | src/ogledalo/ogledalo.ts + kolona.ts + rechnik.ts + darvo.ts + snimka.ts + chettsi/*.ts | Я | производно = fold |
| ogledalo/sgavane.ts | 128 | ПРЕНОС | src/ogledalo/sgavane.ts | Я | 6 · 7 |
| ogledalo/izgledi.ts | 147 | ПРЕНАПИСВАНЕ (изгледи върху колони) | src/ogledalo/izgledi.ts | У · С | 17 |

### src/kalkulator

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| kalkulator/aktivi-ot-zhurnala.ts | 198 | ПРЕНАПИСВАНЕ (Имот без Обект / Обект с Имот — дървото го носи) | src/smetach/kalkulator/aktivi.ts | П · С | 17 |
| kalkulator/chetene.ts | 216 | ПРЕНАПИСВАНЕ (`VidObekt` остава; чете колонно) | src/smetach/kalkulator/chetene.ts | П | 3 |
| kalkulator/matritsa.ts | 522 | ПРЕНАПИСВАНЕ (ядрата `tsenaTochno` · `saglasuvana` · `teglataZatvaryat` · `tsenaPoRazhod` дословно; кръговият внос с `nastroyki` пада) | src/smetach/kalkulator/matritsa.ts | П | 3 · matematika §2 |
| kalkulator/nastroyki.ts | 923 | ПРЕНАПИСВАНЕ (числата му 3 000/2 000 се пренасят; данни, не код) | src/smetach/kalkulator/nastroyki.ts | П | ADR-067 |
| kalkulator/razbivka.ts | 569 | ПРЕНОС (одитната следа ред по ред + `sverkaNaRazbivkata`) | src/smetach/kalkulator/razbivka.ts | П | 3 · 7 |
| kalkulator/sazdavane.ts | 127 | ПРЕНАПИСВАНЕ („Създай сграда" от площообразуване · Калкулаторът над Продажбите · резен 5) | src/smetach/kalkulator/sazdavane.ts | П | zadanie/10 |
| kalkulator/stoynost.ts | 365 | ПРЕНАПИСВАНЕ (чете старото Огледало) | src/smetach/kalkulator/stoynost.ts | П · С | ADR-012 |
| kalkulator/svarzvane.ts | 141 | ПРЕНАПИСВАНЕ (свързване по кортеж-номер) | src/ogledalo/darvo.ts | У · П | 17 |
| kalkulator/tseni-md.ts | 187 | ОТПАДА (четец на конкретен стар файл; двете таблици на Продажби го заместват) | — | — | Задание |
| kalkulator/tsenova-lista.ts | 235 | ПРЕНАПИСВАНЕ (листата Е таблицата Продажби с 20 колони) | src/domein/prodazhbi.ts | П | ADR-016 |

### src/domein

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| domein/chisla.ts | 218 | ПРЕНАПИСВАНЕ (знакът остава закон; входът вече не е `model.ts`) | src/smetach/znak.ts | С | 20 |
| domein/vid-stoynost.ts | 111 | ПРЕНОС | src/domein/vid-stoynost.ts | Я | ADR-014 |
| domein/vreme.ts | 343 | ПРЕНОС | src/smetach/vreme.ts | У · С | 17 |
| domein/potok.ts | 121 | ПРЕНАПИСВАНЕ (сбор със знак → Приход/Разход; без `model.ts`) | src/smetach/sbor.ts | С | 20 |
| domein/diagrami.ts | 52 | ПРЕНАПИСВАНЕ (чете старото Огледало) | src/smetach/diagrami.ts | С | 3 |
| domein/sparklayn.ts | 117 | ПРЕНОС | src/smetach/sparklayn.ts | С | — |
| domein/opis-na-zapisa.ts | 109 | ПРЕНАПИСВАНЕ (описът чете колонния ред) | src/ogledalo/opis.ts | Я | 19 |
| domein/otgovor.ts | 39 | ПРЕНОС | src/domein/otgovor.ts | Я | 17 |
| domein/red-ot-klyuchove.ts | 84 | ПРЕНОС | src/domein/red-ot-klyuchove.ts | У | 17 |
| domein/dumite.ts | 31 | ПРЕНОС (Имот · Обект · Дело) | src/domein/dumite.ts | У | ADR-155 |
| domein/knigata.ts | 71 | ПРЕНАПИСВАНЕ (внася `akaunt`, който чака) | src/ogledalo/knigata.ts | Я | ADR-055 |
| domein/smetki.ts | 400 | ПРЕНАПИСВАНЕ (12-те секции на книгата; без ДДС) | src/smetach/smetki.ts | С | 7 |
| domein/otcheti.ts | 697 | ПРЕНАПИСВАНЕ (`sumiZaObhvat` → префикси; активите — един дом) | src/smetach/balans.ts + prefiks.ts | С | 17 |
| domein/koefitsienti.ts | 948 | ПРЕНАПИСВАНЕ (обявени входове; без „ДДС към приход") | src/smetach/koefitsienti/*.ts | С | koefitsienti |
| domein/orientiri.ts | 167 | ПРЕНАПИСВАНЕ (върви с коефициентите) | src/smetach/koefitsienti/orientiri.ts | С | 15 |
| domein/svoy-koefitsient.ts | 297 | ЧАКА (свой коефициент — И118 го иска; книгата мълчи; негова дума) | — | С | 18 |
| domein/iztochnitsi-na-chisla.ts | 166 | ЧАКА (формули между таблици) | — | — | M11 |
| domein/formuli.ts | 378 | ПРЕНАПИСВАНЕ (нашият език за формули · резен 6) | src/formuli/ | всички | ADR-025 стар |
| domein/pole-s-formula.ts | 208 | ЧАКА | — | — | M11 |
| domein/razrez.ts | 134 | ПРЕНАПИСВАНЕ → ядро `sborPoGrupa` | src/smetach/sbor.ts | С · П | 7 |
| domein/rollup.ts | 174 | ПРЕНАПИСВАНЕ → ядро `sabiraNagore` | src/smetach/darvo.ts | У · С | 7 |
| domein/mnogo-kam-mnogo.ts | 355 | ЧАКА (закачки м:н — книгата мълчи) | — | — | M17 |
| domein/mesetsat.ts | 284 | ЧАКА (храна на агента — агентите са по-късно) | — | С | 18 |
| domein/mesechna-mrezha.ts | 209 | ПРЕНАПИСВАНЕ (ден по ден → префикси) | src/smetach/prefiks.ts | У · С | 7 |
| domein/razbivki.ts | 172 | ОТПАДА (седемте разбивки на тема „Пари"; книгата изброява секциите си сама) | — | — | Задание |
| domein/podtabove-smetki.ts | 144 | ОТПАДА (книгата дава подредбата) | — | — | Задание |
| domein/dyal-otchet.ts | 77 | ОТПАДА | — | — | Задание |
| domein/gnezda.ts | 187 | ОТПАДА (именуваните групи — секциите ги заместват) | — | — | Задание |
| domein/godishna-ravnosmetka.ts | 178 | ЧАКА (затваряне на година — негова дума) | — | С | ADR-088 |
| domein/proverki-ot-sverki.ts | 153 | ПРЕНАПИСВАНЕ (сверки по теми, колонно) | src/smetach/sverki/po-temi.ts | С | 7 |
| domein/nachislyavane.ts | 167 | ПРЕНАПИСВАНЕ (начисляване на наем; внася `deystviya`) | src/domein/nachislyavane.ts | С | 7 |
| domein/registar-naemi.ts | 242 | ПРЕНАПИСВАНЕ | src/smetach/naemi.ts | С | 7 |
| domein/spravki-schetovodstvo.ts | 267 | ПРЕНАПИСВАНЕ (колко е платено, колко остава · подтаб НАП · резен 3б) | src/smetach/nap/spravki.ts | С | zadanie/10 |
| domein/glavna-kniga.ts | 506 | ОТПАДА (двустранни статии — не в книгата; внася `dds`) | — | — | Задание |
| domein/dds.ts | 144 | ПРЕНАПИСВАНЕ (ДДС като ред по знак, месечно натрупване · върнато 05.09 т.2 · резен 3б) | src/smetach/dds.ts | С | zadanie/10 |
| domein/sverka-dds.ts | 139 | ПРЕНАПИСВАНЕ (декларирано ↔ платено ↔ остатък · резен 3б) | src/smetach/sverki/dds.ts | С | zadanie/10 · 7 |
| domein/zamrazyavane.ts | 60 | ПРЕНАПИСВАНЕ (ключът става „Прочетено/Сверено" вместо ДДС-справка) | src/domein/zamrazyavane.ts | С | 9 |
| domein/kontragenti.ts | 168 | ПРЕНАПИСВАНЕ (контрагентите с ЕИК · находки в подтаб НАП · резен 3б) | src/domein/kontragenti.ts | С | zadanie/10 |
| domein/zakonoviyat-lev.ts | 84 | ОТПАДА (лев) | — | — | 3 |
| domein/sverka-izvlechenie.ts | 658 | ПРЕНАПИСВАНЕ (ядрото — един ред веднъж · 3-дневен прозорец · сблъсък = находка — дословно; входът колонен) | src/smetach/sverki/izvlechenie.ts | С | 7 · 18 |
| domein/sveryavane.ts | 321 | ПРЕНАПИСВАНЕ („Сверяване от Ексел" → „Сверяване с банкови извлечения") | src/smetach/sverki/sveryavane.ts | С | 7 |
| domein/storno.ts | 122 | ПРЕНАПИСВАНЕ (безопасно сторно върху колонния индекс) | src/domein/storno.ts | Я | 1 |
| domein/sverka-verigi.ts | 272 | ПРЕНАПИСВАНЕ (внася `akaunt` · `zamrazyavane`; логиката на сблъсъците — дословно) | src/smetach/sverki/verigi.ts | Я | 6 |
| domein/dela.ts | 695 | ПРЕНАПИСВАНЕ (Оценката и Видът станаха номенклатури; дървото е `darvo.ts`, задачата — ред на таблица `zadachi`) | src/smetach/darvo.ts + src/model/osnova.ts | У · Г | 17 |
| domein/gant.ts | 329 | ПРЕНОС | src/smetach/gant.ts | У · Г | И104 |
| domein/darvo-na-stroezha.ts | 172 | ПРЕНОС | src/domein/darvo-na-stroezha.ts | Г | 18 |
| domein/lineen-grafik.ts | 310 | ПРЕНОС | src/iztochnik/lineen-grafik.ts | Г | 7 · 18 |
| domein/kss.ts | 209 | ПРЕНОС | src/iztochnik/kss.ts | Г · С | 3 · 7 |
| domein/sastoyaniya-na-imot.ts | 129 | ПРЕНАПИСВАНЕ (чете старото Огледало) | src/domein/sastoyaniya-na-imot.ts | У | ADR-157 |
| domein/mesta.ts | 282 | ПРЕНАПИСВАНЕ (Имот с новата номерация) | src/domein/imoti.ts | У | ADR-155 |
| domein/kontakti.ts | 594 | ПРЕНАПИСВАНЕ (Среща · Преписка са задачи в дървото) | src/domein/zadachi.ts | У | Задание |
| domein/avtodela.ts | 207 | ЧАКА (авто-дела — книгата мълчи) | — | У | 18 |
| domein/zadachi-kam-hora.ts | 260 | ЧАКА (повече акаунти) | — | — | ADR-062 |
| domein/karta-na-sluzhitelya.ts | 182 | ЧАКА (служители) | — | — | ADR-159 |
| domein/adresna-kniga.ts | 196 | ЧАКА (връзка по номер между таблици — негова дума) | — | — | И94 |
| domein/vrazki.ts | 244 | ОТПАДА (карта на сигнала между старите екрани) | — | — | ADR-053 |
| domein/porednost.ts | 132 | ЧАКА (ръчен ред) | — | У | ADR-094 |
| domein/papki.ts | 119 | ЧАКА (Драйв) | — | — | 14 |
| domein/dokumenti.ts | 240 | ЧАКА (Драйв) | — | — | ADR-073 |
| domein/drazhki-na-imota.ts | 65 | ОТПАДА (меню на стария екран) | — | — | ADR-164 |
| domein/kalendar.ts | 149 | ЧАКА (Google Calendar → OAuth) | — | — | ADR-064 |
| domein/pismo.ts | 98 | ЧАКА (писмо при закъснение) | — | — | 14 |
| domein/prenos.ts | 244 | ЧАКА (личен журнал) | — | — | И98 |
| domein/prodazhbi.ts | 676 | ПРЕНАПИСВАНЕ (20 колони; движенията остават събития; две проверки) | src/domein/prodazhbi.ts + src/smetach/prodazhbi/proverka.ts | П | ADR-078 · 3 |
| domein/krediti.ts | 352 | ПРЕНАПИСВАНЕ (Огледалото е колонно) | src/domein/krediti.ts | К | 17 |
| domein/kredit-matematika.ts | 296 | ПРЕНОС | src/smetach/kredit/matematika.ts | К | 3 · 7 |
| domein/pogasitelen-plan-ot-pdf.ts | 309 | ПРЕНОС (114 реда · шест сбора до цента) | src/iztochnik/pogasitelen-plan.ts | К | 7 |
| domein/zaplati.ts | 313 | ПРЕНАПИСВАНЕ (Заплати Кеш · Заплати Банка) | src/domein/zaplati.ts | С | ADR-080 |
| domein/plashtaniya-arhiv.ts | 478 | ЧАКА (внася `glavna-kniga`; седмичен регистър — книгата мълчи) | — | — | ADR-082 |
| domein/lichni-pari.ts | 299 | ЧАКА (личен акаунт) | — | — | ADR-038 |
| domein/lichen-vnos.ts | 261 | ЧАКА (личен акаунт) | — | — | И96 |
| domein/lichen-dostap.ts | 205 | ЧАКА (повече акаунти) | — | — | И99 |
| domein/tablitsa-ot-fayl.ts | 356 | ЧАКА (свободни таблици — негова дума) | — | — | ADR-081 |
| domein/redove-na-tablitsa.ts | 229 | ЧАКА | — | — | ADR-111 |
| domein/vnos-na-redove.ts | 146 | ЧАКА | — | — | резен 61 |
| domein/zhurnal-ot-tablitsa.ts | 522 | ЧАКА | — | — | И96 |
| domein/aktualizatsiya.ts | 256 | ЧАКА | — | — | — |
| domein/obshta-glava.ts | 484 | ЧАКА | — | — | резен 62 |
| domein/redaktor.ts | 640 | ЧАКА (редактор на хедъри) | — | — | И58 |
| domein/premestvane-na-kolona.ts | 187 | ЧАКА | — | — | M15 |
| domein/dobavki.ts | 222 | ЧАКА (добавена колона от Стопанина) | — | — | И121 |
| domein/modeli-po-bransh.ts | 146 | ОТПАДА (внася `dds`; браншове не са в книгата) | — | — | Задание |
| domein/kolonno.ts | 425 | ПРЕНОС (трите стойности на правото · резен 4) | src/model/pravo.ts | всички | 23 |
| domein/sesii.ts | 171 | ЧАКА | — | — | ADR-086 |
| domein/hedari-po-tabove.ts | 106 | ОТПАДА (старите табове) | — | — | Задание |
| domein/padashti-menyuta.ts | 261 | ПРЕНОС (законът за падащите менюта — чиста логика, без внос) | src/domein/padashti-menyuta.ts | всички | И97 |
| domein/butoni.ts | 264 | ПРЕНОС (бутонът е път · модел на бутона · резен 1) | src/model/buton.ts | Управление · Сметки | 20 |
| domein/vhodni-problemi.ts | 413 | ПРЕНОС (NFC · азбуки на входа — без внос) | src/domein/vhodni-problemi.ts | Я | 11 · 12 |
| domein/akaunt.ts | 212 | ЧАКА (повече акаунти) | — | — | ADR-007 |
| domein/planove.ts | 294 | ЧАКА (планове — по-късно) | — | — | ADR-007 |
| domein/spiratchka.ts | 220 | ЧАКА | — | — | ADR-007 |
| domein/probvane.ts | 152 | ЧАКА | — | — | резен 32 |
| domein/stopanin.ts | 236 | ПРЕНАПИСВАНЕ (Стопанинът от първото събитие · резен 4) | src/model/dlazhnost.ts | Служители | ADR-043 стар |
| domein/sluzhiteli.ts | 79 | ПРЕНАПИСВАНЕ (Служители с четирите оси · резен 4) | src/komandi/prozortsi/sluzhiteli.ts | Служители | 14 |
| domein/potvarzhdenie.ts | 166 | ЧАКА (имейл потвърждение) | — | — | И94 |
| domein/agenti.ts | 601 | ПРЕНАПИСВАНЕ (петте му агента като данни · резен 2 · `src/model/agenti.ts`; протоколът · резен 7) | src/agenti/protokol.ts | ИИ | 18 |
| domein/zadachi.ts | 189 | ПРЕНАПИСВАНЕ (задачите на агента · резен 7) | src/agenti/zadachi.ts | ИИ | 18 |
| domein/ezitsi.ts | 72 | ЧАКА | — | — | 19 |
| domein/azbuki.ts | 77 | ЧАКА | — | — | ADR-008 |
| domein/lenta.ts | 146 | ОТПАДА (ред на старото меню) | — | — | ADR-066 |
| domein/tabove.ts | 398 | ОТПАДА (старите табове) | — | — | Задание |
| domein/temi-nastroyki.ts | 484 | ОТПАДА (теми на старите Настройки) | — | — | Задание |
| domein/vnos.ts | 150 | ПРЕНАПИСВАНЕ (внасяне на журнал; сверката чете колонно) | src/domein/vnos.ts | Я | 7 |
| domein/deystviya.ts | 2380 | ПРЕНАПИСВАНЕ (тънък слой към Вратата за новите събития) | src/domein/deystviya.ts | Я | 2 |
| domein/sabitiya.ts | 1915 | ПРЕНАПИСВАНЕ (нов регистър на събитията; старите типове без четец се четат ПОИМЕННО и се пренебрегват, както „ВалутаИзбрана") | src/domein/sabitiya.ts | Я | 1 · ADR-106 |

### src/migratsiya + izdanie

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| migratsiya/naemi-kesh.ts | 190 | ОТПАДА (еднократна миграция на стар файл; внася `dds`) | — | — | Задание |
| src/izdanie.ts | 65 | ПРЕНАПИСВАНЕ (име · версия на Coretovia) | src/izdanie.ts | Я | 17 |

### stroezh

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| stroezh/chistota.mjs | 699 | ПРЕНОС | stroezh/chistota.mjs | Я | ADR-048 |
| stroezh/chestnost.mjs | 426 | ПРЕНОС | stroezh/chestnost.mjs | Я | docs/11 |
| stroezh/hrom.mjs | 60 | ПРЕНОС | stroezh/hrom.mjs | Я | 17 |
| stroezh/mostri-pdf.mjs | 212 | ПРЕНОС (мострите за график · КСС · план) | stroezh/mostri-pdf.mjs | К · Г | 29 |
| stroezh/pechat-sw.mjs | 138 | ПРЕНОС | stroezh/pechat-sw.mjs | Я | ADR-054 |
| stroezh/risuvai-ikoni.mjs | 26 | ПРЕНОС (нов `ikona.svg`, същият рисувач) | stroezh/risuvai-ikoni.mjs | Я | — |

### proba

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| proba/merki.test.ts | 275 | ПРЕНАПИСВАНЕ (механиката дословно; мерки и бюджети от A6) | tests/merki.test.ts | Я | ADR-084 |
| proba/prohod.ts | 263 | ПРЕНАПИСВАНЕ (нови екрани) | proba/prohod.ts | всички | ADR-077 |
| proba/razdeli/gant.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/upravlenie.ts | всички | — |
| proba/razdeli/ii.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/ii.ts | всички | — |
| proba/razdeli/imoti.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/imoti.ts | всички | — |
| proba/razdeli/infrastruktura.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/infrastruktura.ts | всички | — |
| proba/razdeli/krediti.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/krediti.ts | всички | — |
| proba/razdeli/lichno.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/lichno.ts | всички | — |
| proba/razdeli/menyuta.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/menyuta.ts | всички | — |
| proba/razdeli/mnogoto-verigi.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/mnogoto-verigi.ts | всички | — |
| proba/razdeli/nastroyki.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/nastroyki.ts | всички | — |
| proba/razdeli/pari.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/pari.ts | всички | — |
| proba/razdeli/plashtaniya-arhiv.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/plashtaniya-arhiv.ts | всички | — |
| proba/razdeli/prodazhbi.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/prodazhbi.ts | всички | — |
| proba/razdeli/prodazhbi-izhod.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/prodazhbi-izhod.ts | всички | — |
| proba/razdeli/sesii.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/sesii.ts | всички | — |
| proba/razdeli/smetki.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/smetki.ts | всички | — |
| proba/razdeli/stoynost.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/stoynost.ts | всички | — |
| proba/razdeli/tablitsa-ot-fayl.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/tablitsa-ot-fayl.ts | всички | — |
| proba/razdeli/tablo.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/tablo.ts | всички | — |
| proba/razdeli/tabove.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/tabove.ts | всички | — |
| proba/razdeli/udobstvoto.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/udobstvoto.ts | всички | — |
| proba/razdeli/vhod-i-samolichnost.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/vhod-i-samolichnost.ts | всички | — |
| proba/razdeli/zaplati.ts | — | ПРЕНАПИСВАНЕ (раздел на стария проход · думите на новите екрани) | proba/razdeli/zaplati.ts | всички | — |
| proba/spanal.png | — | ОТПАДА (артефакт) | — | — | — |
| proba/yadro/hrom.d.ts | 11 | ПРЕНОС | proba/yadro/hrom.d.ts | Я | 17 |
| proba/yadro/kontekst.ts | 16 | ПРЕНОС | proba/yadro/kontekst.ts | Я | — |
| proba/yadro/mok-google.ts | 188 | ЧАКА (OAuth) | — | — | 13 |
| proba/yadro/pomoshtni.ts | 728 | ПРЕНАПИСВАНЕ (думите на новите екрани) | proba/yadro/pomoshtni.ts | всички | — |
| proba/yadro/proverka.ts | 53 | ПРЕНОС | proba/yadro/proverka.ts | Я | — |
| proba/yadro/server.ts | 48 | ПРЕНОС | proba/yadro/server.ts | Я | — |
| proba/yadro/tishina.ts | 9 | ПРЕНОС | proba/yadro/tishina.ts | Я | — |

### .claude/skills

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| skills/matematika/SKILL.md | 157 | ПРЕНОС | .claude/skills/matematika/SKILL.md | Я | 3 · 7 |
| skills/koefitsienti/SKILL.md | 99 | ПРЕНАПИСВАНЕ (пада редът „ДДС към приход"; домът става `src/smetach/koefitsienti/`) | .claude/skills/koefitsienti/SKILL.md | С | 17 |
| skills/masterbook-data/SKILL.md | 151 | ПРЕНАПИСВАНЕ (Coretovia; без ДДС/НАП) | .claude/skills/coretovia-data/SKILL.md | всички | 17 |
| skills/masterbook-data/references/entities.md | 78 | ПРЕНАПИСВАНЕ (новата номерация) | …/references/entities.md | У | 17 |
| skills/masterbook-data/references/metrics.md | 48 | ПРЕНАПИСВАНЕ | …/references/metrics.md | С | 17 |
| skills/masterbook-data/references/tables/finansi.md | 31 | ПРЕНАПИСВАНЕ (12 секции) | …/tables/finansi.md | С | 17 |
| skills/masterbook-data/references/tables/imoti.md | 32 | ПРЕНАПИСВАНЕ | …/tables/imoti.md | У | 17 |
| skills/masterbook-data/references/tables/naemi-dogovori.md | 35 | ПРЕНАПИСВАНЕ | …/tables/naemi.md | С | 17 |
| skills/masterbook-data/references/tables/proekti-gant.md | 34 | ПРЕНАПИСВАНЕ | …/tables/dela-gant.md | У · Г | 17 |
| skills/doklad/SKILL.md | 149 | ПРЕНАПИСВАНЕ (етапите на Coretovia) | .claude/skills/doklad/SKILL.md | Я | 17 |
| skills/refresh/SKILL.md | 272 | ПРЕНАПИСВАНЕ (пътищата) | .claude/skills/refresh/SKILL.md | Я | 16 · 17 |
| skills/ogledala.sh | 103 | ПРЕНОС | .claude/skills/ogledala.sh | Я | ADR-051 |

### tests (поименно)

| стар път | ред. | присъда | нов път | прозорец | правило |
| :---- | ---: | :---- | :---- | :---- | :---- |
| tests/imena.test.ts | 56 | ПРЕНОС | tests/imena.test.ts | Я | 11 |
| tests/pravilo-16.test.ts | 122 | ПРЕНОС | tests/pravilo-16.test.ts | Я | 16 |
| tests/sabitiyata.test.ts | 245 | ПРЕНОС (срещу регистъра `CHETTSI`) | tests/sabitiyata.test.ts | Я | ADR-041 |
| tests/chestnost.test.ts | 123 | ПРЕНОС | tests/chestnost.test.ts | Я | docs/11 |
| tests/inv-1-veriga.test.ts | 104 | ПРЕНОС | tests/inv-1-veriga.test.ts | Я | 4 |
| tests/inv-2-idempotentnost.test.ts | 91 | ПРЕНОС | tests/inv-2-idempotentnost.test.ts | Я | 5 |
| tests/inv-3-sverka.test.ts | 81 | ПРЕНОС | tests/inv-3-sverka.test.ts | Я | 7 |
| tests/inv-8-monotonen-seq.test.ts | 83 | ПРЕНОС | tests/inv-8-monotonen-seq.test.ts | Я | 6 |
| tests/prenosimost.test.ts | 97 | ПРЕНОС | tests/prenosimost.test.ts | Я | ADR-152 |
| tests/vazmozhnostite.test.ts | 127 | ЧАКА (планове) | — | — | ADR-151 |
| tests/ekranite.test.ts | 116 | ПРЕНАПИСВАНЕ (осемте прозореца) | tests/prozortsite.test.ts | всички | 17 |
| tests/tablitsite.test.ts | 114 | ПРЕНАПИСВАНЕ (регистър на колонните таблици и затворените колони) | tests/tablitsite.test.ts | всички | 23 |
| tests/semeystva.test.ts | 85 | ЧАКА (следва `obshta-glava`) | — | — | — |
| tests/agregat.test.ts | 154 | ЧАКА (следва `redove-na-tablitsa`) | — | — | ADR-139 |
| tests/darvoto.test.ts | 357 | ПРЕНАПИСВАНЕ (дървото → индекс; свойствата остават) | tests/smetach/darvo.test.ts | У · Г | 7 |
| tests/razrezat.test.ts | 282 | ПРЕНАПИСВАНЕ (→ `sborPoGrupa`) | tests/smetach/sbor.test.ts | С | 7 |
| tests/pomoshtni.ts | 118 | ПРЕНОС (SHA · помощници) | tests/pomoshtni.ts | Я | — |
