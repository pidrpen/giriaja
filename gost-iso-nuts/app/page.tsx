"use client";

import { useMemo, useState } from "react";

type MatchLevel = "direct" | "conditional" | "none";

type NutStandard = {
  gost: string;
  title: string;
  category: string;
  iso: string[];
  match: MatchLevel;
  scope: string;
  note: string;
  status?: string;
};

type ParsedDesignation = ReturnType<typeof parseDesignation>;

const standards: NutStandard[] = [
  {
    gost: "ГОСТ 5915-70",
    title: "Гайки шестигранные, класс точности B",
    category: "Шестигранные",
    iso: ["ISO 4032", "ISO 8673"],
    match: "conditional",
    scope: "M1,6–M48 · крупный и мелкий шаг",
    note: "ISO 4032 — крупный шаг, ISO 8673 — мелкий. Для M12 совпадают s=18 и m=10,8; у ISO для размеров до M16 класс точности A строже.",
  },
  {
    gost: "ГОСТ 5927-70",
    title: "Гайки шестигранные, класс точности A",
    category: "Шестигранные",
    iso: ["ISO 4032", "ISO 8673"],
    match: "direct",
    scope: "M1–M48 · крупный и мелкий шаг",
    note: "Для крупного шага выбирайте ISO 4032, для мелкого — ISO 8673. Сверьте диапазон размеров выбранной редакции ISO.",
  },
  {
    gost: "ГОСТ 15526-70",
    title: "Гайки шестигранные, класс точности C",
    category: "Шестигранные",
    iso: ["ISO 4034"],
    match: "conditional",
    scope: "M5–M48 · грубая точность",
    note: "Ближайший стандарт — ISO 4034, product grade C. Проверьте высоту и размер под ключ для конкретного диаметра.",
  },
  {
    gost: "ГОСТ 5916-70",
    title: "Гайки шестигранные низкие, класс точности B",
    category: "Низкие",
    iso: ["ISO 4035", "ISO 4036", "ISO 8675"],
    match: "conditional",
    scope: "M1–M48 · исполнения 1 и 2",
    note: "С фаской и крупным шагом — ISO 4035; без фаски — ISO 4036; с мелким шагом и фаской — ISO 8675.",
  },
  {
    gost: "ГОСТ 5929-70",
    title: "Гайки шестигранные низкие, класс точности A",
    category: "Низкие",
    iso: ["ISO 4035", "ISO 8675"],
    match: "conditional",
    scope: "M1–M48 · крупный и мелкий шаг",
    note: "ISO 4035 — крупный шаг, ISO 8675 — мелкий. У M10, M12, M14 и M22 возможны отличия размера под ключ.",
  },
  {
    gost: "ГОСТ 10605-94",
    title: "Гайки шестигранные свыше M48, класс точности B",
    category: "Шестигранные",
    iso: ["ISO 4032:1986"],
    match: "conditional",
    scope: "M52–M150",
    note: "Стандарт основан на ISO 4032:1986 для M52–M64 и дополнен размерами до M150. В актуальном ISO 4032 диапазон уже — нужна отдельная проверка.",
  },
  {
    gost: "ГОСТ 10607-94",
    title: "Гайки шестигранные низкие с фаской свыше M48",
    category: "Низкие",
    iso: ["ISO 4035:1986"],
    match: "conditional",
    scope: "M52–M100 · класс точности B",
    note: "Соответствие относится к исторической редакции ISO. Для нового проекта согласуйте размеры и механические свойства отдельно.",
  },
  {
    gost: "ГОСТ 5918-73",
    title: "Гайки прорезные и корончатые, класс точности B",
    category: "Корончатые",
    iso: ["ISO 7035", "ISO 7036", "ISO 7037"],
    match: "conditional",
    scope: "M4–M48 · несколько исполнений",
    note: "Номер ISO зависит от формы — прорезная или корончатая — и от шага резьбы. Сверьте исполнение и высоту прорезей.",
  },
  {
    gost: "ГОСТ 5932-73",
    title: "Гайки прорезные и корончатые, класс точности A",
    category: "Корончатые",
    iso: ["ISO 7035", "ISO 7036", "ISO 7037"],
    match: "conditional",
    scope: "M4–M48 · несколько исполнений",
    note: "Семейство ISO выбирается по конструкции и шагу. Единственного ISO для всех исполнений ГОСТ нет.",
  },
  {
    gost: "ГОСТ 5919-73",
    title: "Гайки прорезные и корончатые низкие, класс B",
    category: "Корончатые",
    iso: ["ISO 7038"],
    match: "conditional",
    scope: "M6–M48",
    note: "Ближайший функциональный аналог — ISO 7038. Проверьте размер под ключ и положение прорезей.",
  },
  {
    gost: "ГОСТ 5933-73",
    title: "Гайки прорезные и корончатые низкие, класс A",
    category: "Корончатые",
    iso: ["ISO 7038"],
    match: "conditional",
    scope: "M6–M48",
    note: "Функциональный аналог — ISO 7038; допуски и отдельные размеры могут различаться.",
  },
  {
    gost: "ГОСТ 2528-73",
    title: "Гайки шестигранные корончатые",
    category: "Корончатые",
    iso: ["ISO 7035"],
    match: "conditional",
    scope: "Метрическая резьба",
    note: "Ближайший аналог — ISO 7035. Перед заменой проверьте высоту коронки и совместимость со шплинтом.",
  },
  {
    gost: "ГОСТ Р 50592-93",
    title: "Гайки шестигранные с фланцем, класс точности A",
    category: "С фланцем",
    iso: ["ISO 4161"],
    match: "direct",
    scope: "M5–M20 · крупный шаг",
    note: "Стандарт содержит требования ISO 4161:1983 и заменён ГОСТ Р ИСО 4161-2013.",
    status: "заменён",
  },
  {
    gost: "ГОСТ Р 50272-92",
    title: "Гайки самостопорящиеся цельнометаллические",
    category: "Самостопорящиеся",
    iso: ["ISO 7042"],
    match: "direct",
    scope: "M5–M35 · классы 5, 8, 10, 12",
    note: "Подготовлен на основе ISO 7042:1983. Для нового проекта применяйте актуальную редакцию ISO 7042 и сверяйте класс прочности.",
  },
  {
    gost: "ГОСТ Р 50273-92",
    title: "Гайки самостопорящиеся с неметаллической вставкой",
    category: "Самостопорящиеся",
    iso: ["ISO 7040"],
    match: "direct",
    scope: "M3–M36 · классы 5, 8, 10",
    note: "Основан на ISO 7040:1983; отменён после введения ГОСТ ISO 7040-2014.",
    status: "отменён",
  },
  {
    gost: "ГОСТ 22354-77",
    title: "Гайки высокопрочные для металлических конструкций",
    category: "Высокопрочные",
    iso: ["ISO 7414"],
    match: "conditional",
    scope: "Увеличенный размер под ключ",
    note: "ISO 7414 отозван. Для строительных комплектов проверяйте EN 14399 и требования проекта, а не заменяйте гайку изолированно.",
    status: "исторический аналог",
  },
  {
    gost: "ГОСТ Р 52645-2006",
    title: "Гайки высокопрочные с увеличенным размером под ключ",
    category: "Высокопрочные",
    iso: ["ISO 4775:1984"],
    match: "conditional",
    scope: "Металлические конструкции",
    note: "Содержит требования ISO 4775:1984; стандарт отменён. Для новых комплектов ориентируйтесь на ГОСТ 32484.3 / EN 14399.",
    status: "отменён",
  },
  {
    gost: "ГОСТ 14730-69",
    title: "Гайки для Т-образных пазов",
    category: "Специальные",
    iso: ["ISO 299"],
    match: "conditional",
    scope: "Станочные пазы",
    note: "Функциональный аналог — ISO 299. Обязательно сверить профиль паза, высоту и класс материала.",
  },
  {
    gost: "ГОСТ 3032-76",
    title: "Гайки-барашки",
    category: "Специальные",
    iso: [],
    match: "none",
    scope: "Исполнения 1 и 2",
    note: "Прямого ISO нет. На рынке обычно сравнивают с DIN 315, но геометрия исполнений может отличаться.",
  },
  {
    gost: "ГОСТ 11860-85",
    title: "Гайки колпачковые",
    category: "Специальные",
    iso: [],
    match: "none",
    scope: "M3–M24",
    note: "Прямого ISO нет. Ближайший рыночный стандарт — DIN 1587; требуется сравнение высоты колпачка и резьбы.",
  },
  {
    gost: "ГОСТ 11871-88",
    title: "Гайки круглые шлицевые",
    category: "Круглые",
    iso: [],
    match: "none",
    scope: "Круглая гайка с пазами",
    note: "Прямого ISO нет. Часто сопоставляют с DIN 981, но это не автоматическая взаимозаменяемость.",
  },
  {
    gost: "ГОСТ 10657-80",
    title: "Гайки круглые с радиальными шлицами",
    category: "Круглые",
    iso: [],
    match: "none",
    scope: "Специальное исполнение",
    note: "Прямого ISO нет. Подбор выполняют по наружному диаметру, резьбе, ширине и глубине шлица.",
  },
  {
    gost: "ГОСТ 6393-73",
    title: "Гайки круглые с отверстиями на торце",
    category: "Круглые",
    iso: [],
    match: "none",
    scope: "Под торцевой ключ",
    note: "Прямого ISO нет. Возможен подбор по DIN 1816 после проверки расположения отверстий и габаритов.",
  },
  {
    gost: "ГОСТ 15521-70",
    title: "Гайки шестигранные с уменьшенным размером под ключ",
    category: "Специальные",
    iso: [],
    match: "none",
    scope: "M1,6–M48 · класс B",
    note: "Прямого ISO нет: уменьшенный шестигранник является определяющим отличием. Нельзя автоматически заменять на ISO 4032.",
  },
  {
    gost: "ГОСТ 15522-70",
    title: "Гайки низкие с уменьшенным размером под ключ",
    category: "Специальные",
    iso: [],
    match: "none",
    scope: "M8–M48 · класс B",
    note: "Прямого ISO нет. Сверьте s, m, опорную поверхность и требуемую пробную нагрузку.",
  },
  {
    gost: "ГОСТ 15523-70",
    title: "Гайки шестигранные высокие, класс точности B",
    category: "Высокие",
    iso: [],
    match: "none",
    scope: "M3–M48",
    note: "Прямого ISO нет. DIN 6330 — ближайшее рыночное сопоставление, но не полный эквивалент.",
  },
  {
    gost: "ГОСТ 15525-70",
    title: "Гайки шестигранные особо высокие, класс B",
    category: "Высокие",
    iso: [],
    match: "none",
    scope: "M3–M48",
    note: "Прямого ISO нет. ISO 4033 существенно отличается по назначению и высоте; замену рассчитывают как резьбовое соединение.",
  },
  {
    gost: "ГОСТ 8968-75",
    title: "Контргайки с трубной цилиндрической резьбой",
    category: "Трубные",
    iso: [],
    match: "none",
    scope: "G ⅛–G 4",
    note: "Прямого ISO на изделие нет. Резьбу проверяют по ISO 228-1, геометрию часто сравнивают с DIN 431.",
  },
  {
    gost: "ГОСТ ISO 4032-2014",
    title: "Гайки шестигранные нормальные, тип 1",
    category: "Гармонизированные",
    iso: ["ISO 4032:2012"],
    match: "direct",
    scope: "M1,6–M64 · классы A и B",
    note: "Идентичен ISO 4032:2012. Для новых международных поставок учитывайте изменения ISO 4032:2023.",
  },
  {
    gost: "ГОСТ ISO 4034-2014",
    title: "Гайки шестигранные нормальные, класс точности C",
    category: "Гармонизированные",
    iso: ["ISO 4034:2012"],
    match: "direct",
    scope: "Крупный шаг",
    note: "Идентичная основа ISO; обозначение размера и класса прочности переносится напрямую.",
  },
  {
    gost: "ГОСТ ISO 4035-2014",
    title: "Гайки шестигранные низкие с фаской, тип 0",
    category: "Гармонизированные",
    iso: ["ISO 4035:2012"],
    match: "direct",
    scope: "Крупный шаг",
    note: "Идентичная основа ISO. Класс прочности низких гаек имеет обозначение вида 04 или 05.",
  },
  {
    gost: "ГОСТ ISO 4036-2014",
    title: "Гайки шестигранные низкие без фаски, тип 0",
    category: "Гармонизированные",
    iso: ["ISO 4036:2012"],
    match: "direct",
    scope: "Крупный шаг · класс B",
    note: "Прямая гармонизация с ISO 4036:2012.",
  },
  {
    gost: "ГОСТ ISO 8673-2014",
    title: "Гайки шестигранные нормальные, мелкий шаг",
    category: "Гармонизированные",
    iso: ["ISO 8673:2012"],
    match: "direct",
    scope: "Тип 1 · классы A и B",
    note: "Прямая гармонизация. В обозначении обязательно укажите мелкий шаг, например M12×1,5.",
  },
  {
    gost: "ГОСТ ISO 8674-2014",
    title: "Гайки шестигранные высокие, мелкий шаг",
    category: "Гармонизированные",
    iso: ["ISO 8674:2012"],
    match: "direct",
    scope: "Тип 2 · классы A и B",
    note: "Прямая гармонизация с ISO 8674:2012.",
  },
  {
    gost: "ГОСТ ISO 8675-2014",
    title: "Гайки шестигранные низкие, мелкий шаг",
    category: "Гармонизированные",
    iso: ["ISO 8675:2012"],
    match: "direct",
    scope: "Тип 0 · с фаской",
    note: "Прямая гармонизация. Укажите диаметр, мелкий шаг и класс прочности.",
  },
  {
    gost: "ГОСТ Р ИСО 4161-2013",
    title: "Гайки шестигранные с фланцем, тип 2",
    category: "Гармонизированные",
    iso: ["ISO 4161"],
    match: "direct",
    scope: "M5–M20 · крупный шаг",
    note: "Национальная версия ISO 4161. Покрытие и требования к моменту затяжки задаются отдельно.",
  },
  {
    gost: "ГОСТ ISO 7040-2014",
    title: "Гайки нормальные самостопорящиеся со вставкой, тип 1",
    category: "Гармонизированные",
    iso: ["ISO 7040:2012"],
    match: "direct",
    scope: "Классы 5, 8 и 10",
    note: "Аутентичен ISO 7040:2012; при международном заказе проверьте актуальную редакцию серии ISO 7040.",
  },
  {
    gost: "ГОСТ ISO 7041-2014",
    title: "Гайки высокие самостопорящиеся со вставкой, тип 2",
    category: "Гармонизированные",
    iso: ["ISO 7041:2012"],
    match: "direct",
    scope: "Классы 9 и 12",
    note: "Аутентичен ISO 7041:2012. Температурные ограничения неметаллической вставки задаются материалом вставки.",
  },
];

const dinByGost: Record<string, string[]> = {
  "ГОСТ 5915-70": ["DIN 934"],
  "ГОСТ 5927-70": ["DIN 934"],
  "ГОСТ 15526-70": ["DIN 555"],
  "ГОСТ 5916-70": ["DIN 439-2", "DIN 439-1", "DIN 936"],
  "ГОСТ 5929-70": ["DIN 439-2", "DIN 936"],
  "ГОСТ 10605-94": ["DIN 934"],
  "ГОСТ 10607-94": ["DIN 936"],
  "ГОСТ 5918-73": ["DIN 935"],
  "ГОСТ 5932-73": ["DIN 935"],
  "ГОСТ 5919-73": ["DIN 937", "DIN 979"],
  "ГОСТ 5933-73": ["DIN 937", "DIN 979"],
  "ГОСТ 2528-73": ["DIN 935"],
  "ГОСТ Р 50592-93": ["DIN 6923"],
  "ГОСТ Р 50272-92": ["DIN 980"],
  "ГОСТ Р 50273-92": ["DIN 982", "DIN 6924"],
  "ГОСТ 22354-77": ["DIN 6915"],
  "ГОСТ Р 52645-2006": ["DIN 6915"],
  "ГОСТ 14730-69": ["DIN 508"],
  "ГОСТ 3032-76": ["DIN 315"],
  "ГОСТ 11860-85": ["DIN 1587"],
  "ГОСТ 11871-88": ["DIN 981"],
  "ГОСТ 10657-80": ["DIN 546"],
  "ГОСТ 6393-73": ["DIN 1816"],
  "ГОСТ 15521-70": [],
  "ГОСТ 15522-70": [],
  "ГОСТ 15523-70": ["DIN 6330"],
  "ГОСТ 15525-70": ["DIN 6334"],
  "ГОСТ 8968-75": ["DIN 431"],
  "ГОСТ ISO 4032-2014": ["DIN EN ISO 4032", "DIN 934 (ист.)"],
  "ГОСТ ISO 4034-2014": ["DIN EN ISO 4034", "DIN 555 (ист.)"],
  "ГОСТ ISO 4035-2014": ["DIN EN ISO 4035", "DIN 936 (ист.)"],
  "ГОСТ ISO 4036-2014": ["DIN EN ISO 4036", "DIN 439-1 (ист.)"],
  "ГОСТ ISO 8673-2014": ["DIN EN ISO 8673", "DIN 934 (ист.)"],
  "ГОСТ ISO 8674-2014": ["DIN EN ISO 8674"],
  "ГОСТ ISO 8675-2014": ["DIN EN ISO 8675", "DIN 936 (ист.)"],
  "ГОСТ Р ИСО 4161-2013": ["DIN EN ISO 4161", "DIN 6923 (ист.)"],
  "ГОСТ ISO 7040-2014": ["DIN EN ISO 7040", "DIN 982 (ист.)"],
  "ГОСТ ISO 7041-2014": ["DIN EN ISO 7041", "DIN 6924 (ист.)"],
};

const categories = ["Все", ...Array.from(new Set(standards.map((item) => item.category)))];

const matchLabels: Record<MatchLevel, string> = {
  direct: "Прямой",
  conditional: "С проверкой",
  none: "Нет прямого ISO",
};

function parseDesignation(value: string) {
  const normalized = value.toUpperCase().replaceAll("Х", "X").replaceAll("×", "X").replaceAll(",", ".");
  const thread = normalized.match(/[MМ]\s*(\d+(?:\.\d+)?)(?:\s*X\s*(\d+(?:\.\d+)?))?/);
  const pipeThread = normalized.match(/\bG\s*([0-9⅛¼⅜½¾]+(?:\s*\/\s*\d+)?)/);
  const propertyClass = normalized.match(/6[HН]\s*[.·]\s*(\d{1,2})(?:[.·\s]|$)/)?.[1]
    ?? normalized.match(/[MМ]\s*\d+(?:\.\d+)?(?:\s*X\s*\d+(?:\.\d+)?)?[^\d]+(\d{1,2})(?:[.·]\s*0\d{2})/)?.[1];
  const coating = normalized.match(/[.·](0\d{2})\s*(?:ГОСТ|$)/)?.[1];
  const execution = normalized.match(/ИСП(?:ОЛНЕНИЕ)?\.?\s*([12])/)?.[1]
    ?? normalized.match(/^\s*([12])\s*[-.]?\s*[MМ]/)?.[1];

  return {
    diameter: thread?.[1] ?? "",
    pitch: thread?.[2] ?? "",
    pipeThread: pipeThread?.[1]?.replaceAll(" ", "") ?? "",
    propertyClass: propertyClass ?? "",
    coating: coating ?? "",
    execution: execution ?? "",
  };
}

function coatingText(code: string, system: "ISO" | "DIN") {
  if (code === "019") {
    return system === "ISO"
      ? "ISO 4042: Zn, хроматированное, не менее 9 мкм"
      : "ближайшее старое обозначение A3C — 8 мкм; 9 мкм задать отдельно";
  }
  if (code === "016") return `${system === "ISO" ? "ISO 4042: " : ""}Zn, хроматированное, 6 мкм`;
  if (code === "029") return "Cd, хроматированное, 9 мкм · согласовать отдельно";
  return code
    ? `покрытие ГОСТ ${code} · требуется отдельный перевод`
    : "покрытие не задано";
}

function selectIso(item: NutStandard, parsed: ParsedDesignation) {
  if (!item.iso.length) return [];
  const isFine = Boolean(parsed.pitch);
  let targets = [item.iso[0]];

  if (item.gost === "ГОСТ 5915-70" || item.gost === "ГОСТ 5927-70") {
    targets = [isFine ? "ISO 8673" : "ISO 4032"];
  }
  if (item.gost === "ГОСТ 5916-70") {
    targets = [isFine ? "ISO 8675" : parsed.execution === "2" ? "ISO 4036" : "ISO 4035"];
  }
  if (item.gost === "ГОСТ 5929-70") {
    targets = [isFine ? "ISO 8675" : "ISO 4035"];
  }
  if ((item.gost === "ГОСТ 5918-73" || item.gost === "ГОСТ 5932-73") && !parsed.execution) {
    targets = item.iso;
  }

  return targets;
}

function selectDin(item: NutStandard, parsed: ParsedDesignation) {
  const targets = dinByGost[item.gost] ?? [];
  const isFine = Boolean(parsed.pitch);

  if (item.gost === "ГОСТ 5916-70") {
    return [isFine ? "DIN 936" : parsed.execution === "2" ? "DIN 439-1" : "DIN 439-2"];
  }
  if (item.gost === "ГОСТ 5929-70") return [isFine ? "DIN 936" : "DIN 439-2"];

  return targets;
}

function buildDesignations(targets: string[], parsed: ParsedDesignation, system: "ISO" | "DIN") {
  if (!targets.length) return [`Прямого обозначения ${system} нет`];

  const thread = parsed.diameter
    ? `M${parsed.diameter.replace(".", ",")}${parsed.pitch ? `×${parsed.pitch.replace(".", ",")}` : ""}`
    : parsed.pipeThread ? `G${parsed.pipeThread}` : "размер…";
  const strength = parsed.propertyClass ? `-${parsed.propertyClass}` : "";
  return targets.map((target) => `Гайка ${thread}${strength} ${target}`);
}

function StandardCard({ item }: { item: NutStandard }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`standard-card ${open ? "is-open" : ""}`}>
      <button className="card-main" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className={`match-dot ${item.match}`} aria-hidden="true" />
        <span className="standard-id">{item.gost}</span>
        <span className="standard-name">{item.title}</span>
        <span className="iso-list">
          {item.iso.length ? item.iso.join(" · ") : "—"}
        </span>
        <span className="din-list">
          {dinByGost[item.gost]?.length ? dinByGost[item.gost].join(" · ") : "—"}
        </span>
        <span className={`status-pill ${item.match}`}>{matchLabels[item.match]}</span>
        <span className="expand-mark" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="card-details">
          <div>
            <span className="detail-label">Диапазон</span>
            <p>{item.scope}</p>
          </div>
          <div className="detail-note">
            <span className="detail-label">Что проверить</span>
            <p>{item.note}</p>
          </div>
          {item.status && <span className="legacy-label">Статус: {item.status}</span>}
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [source, setSource] = useState("Гайка М12-6Н.5.019 ГОСТ 5915-70");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [matchFilter, setMatchFilter] = useState<"all" | MatchLevel>("all");
  const [copied, setCopied] = useState(false);

  const matchedStandard = useMemo(() => {
    const compactSource = source.toUpperCase().replace(/\s/g, "");
    return standards.find((item) => {
      const number = item.gost.match(/\d{3,5}(?:-\d{2,4})?/)?.[0];
      const shortNumber = number?.split("-")[0];
      return Boolean(number && (compactSource.includes(number) || (shortNumber && compactSource.includes(`ГОСТ${shortNumber}`))));
    });
  }, [source]);

  const parsed = useMemo(() => parseDesignation(source), [source]);
  const isoOutput = useMemo(
    () => matchedStandard ? buildDesignations(selectIso(matchedStandard, parsed), parsed, "ISO") : ["Укажите номер ГОСТ"],
    [matchedStandard, parsed],
  );
  const dinOutput = useMemo(
    () => matchedStandard ? buildDesignations(selectDin(matchedStandard, parsed), parsed, "DIN") : ["Укажите номер ГОСТ"],
    [matchedStandard, parsed],
  );

  const filtered = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return standards.filter((item) => {
      const inCategory = category === "Все" || item.category === category;
      const inMatch = matchFilter === "all" || item.match === matchFilter;
      const haystack = `${item.gost} ${item.title} ${item.iso.join(" ")} ${(dinByGost[item.gost] ?? []).join(" ")} ${item.scope} ${item.note}`.toLowerCase();
      return inCategory && inMatch && (!query || haystack.includes(query));
    });
  }, [catalogQuery, category, matchFilter]);

  async function copyResult() {
    await navigator.clipboard.writeText([
      `ISO: ${isoOutput.join(" / ")}; ${coatingText(parsed.coating, "ISO")}`,
      `DIN: ${dinOutput.join(" / ")}; ${coatingText(parsed.coating, "DIN")}`,
    ].join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="В начало">
          <span className="brand-nut" aria-hidden="true" />
          <span>NUT//MATCH</span>
        </a>
        <nav aria-label="Основная навигация">
          <a href="#converter">Конвертер</a>
          <a href="#catalog">База ГОСТ</a>
          <a href="#method">Методика</a>
        </nav>
        <span className="database-count">{standards.length} стандартов</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>Инженерный справочник</span><span>ред. 08/2026</span></div>
          <h1>Перевод гаек<br /><em>без гадания.</em></h1>
          <p className="hero-lead">
            Введите обозначение по ГОСТ — получите конкретные строки ISO и DIN для спецификации и список параметров, которые нельзя переносить автоматически.
          </p>
          <div className="hero-facts" aria-label="Преимущества">
            <span>Поиск по номеру и типу</span>
            <span>Крупный / мелкий шаг</span>
            <span>ГОСТ → ISO + DIN</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="dimension dimension-top"><span>s</span></div>
          <div className="technical-nut"><span className="technical-hole" /></div>
          <div className="dimension dimension-side"><span>m</span></div>
          <span className="drawing-label">HEX NUT · TYPE 1</span>
          <span className="drawing-code">12 / 1.75 / 18</span>
        </div>
      </section>

      <section className="converter-section" id="converter">
        <div className="section-index">01</div>
        <div className="converter-heading">
          <p className="kicker">Автоподбор</p>
          <h2>Вставьте обозначение целиком</h2>
          <p>Понимает диаметр, шаг, исполнение, класс прочности и цифровой код покрытия.</p>
        </div>

        <div className="converter-grid">
          <div className="input-panel">
            <label htmlFor="designation">Обозначение по ГОСТ</label>
            <div className="technical-input-wrap">
              <input
                id="designation"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Например: Гайка М12-6Н.5.019 ГОСТ 5915-70"
                spellCheck={false}
              />
              <button type="button" onClick={() => setSource("")} aria-label="Очистить поле">×</button>
            </div>
            <div className="parsed-row">
              <span><small>Резьба</small>{parsed.diameter ? `M${parsed.diameter.replace(".", ",")}` : parsed.pipeThread ? `G${parsed.pipeThread}` : "—"}</span>
              <span><small>Шаг</small>{parsed.pitch.replace(".", ",") || "крупный"}</span>
              <span><small>Класс</small>{parsed.propertyClass || "—"}</span>
              <span><small>Покрытие</small>{parsed.coating || "—"}</span>
              <span><small>Исполнение</small>{parsed.execution || "—"}</span>
            </div>
            <div className="examples">
              <span>Примеры:</span>
              <button onClick={() => setSource("Гайка М12-6Н.5.019 ГОСТ 5915-70")}>M12 · 5915</button>
              <button onClick={() => setSource("Гайка М16×1,5-6Н.8 ГОСТ 5927-70")}>M16×1,5 · 5927</button>
              <button onClick={() => setSource("Гайка М20 ГОСТ 11871-88")}>Круглая · 11871</button>
            </div>
          </div>

          <div className={`result-panel ${matchedStandard?.match ?? "empty"}`}>
            <div className="result-topline">
              <span className="result-label">Конкретные обозначения</span>
              {matchedStandard && <span className={`status-pill ${matchedStandard.match}`}>{matchLabels[matchedStandard.match]}</span>}
            </div>
            <div className="designation-results">
              <div className="designation-card iso-result">
                <span className="designation-system">ISO</span>
                {isoOutput.map((line) => <strong key={line}>{line}</strong>)}
                <small>{coatingText(parsed.coating, "ISO")}</small>
              </div>
              <div className="designation-card din-result">
                <span className="designation-system">DIN</span>
                {dinOutput.map((line) => <strong key={line}>{line}</strong>)}
                <small>{coatingText(parsed.coating, "DIN")}</small>
              </div>
            </div>
            {matchedStandard ? (
              <p className="result-warning"><span aria-hidden="true">!</span>{matchedStandard.note}</p>
            ) : (
              <p className="result-warning"><span aria-hidden="true">i</span>Укажите номер ГОСТ, чтобы система выбрала семейства ISO и DIN.</p>
            )}
            <button className="copy-button" type="button" onClick={copyResult} disabled={!matchedStandard}>
              {copied ? "Скопировано" : "Копировать ISO + DIN"}
            </button>
          </div>
        </div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-index">02</div>
        <div className="catalog-head">
          <div>
            <p className="kicker">База соответствий</p>
            <h2>Все основные типы гаек</h2>
          </div>
          <label className="catalog-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="ГОСТ, ISO, DIN или тип гайки"
              aria-label="Поиск по каталогу"
            />
          </label>
        </div>

        <div className="filter-zone">
          <div className="category-tabs" role="group" aria-label="Тип гайки">
            {categories.map((item) => (
              <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          <div className="match-filter" role="group" aria-label="Точность соответствия">
            <button className={matchFilter === "all" ? "active" : ""} onClick={() => setMatchFilter("all")}>Все</button>
            <button className={matchFilter === "direct" ? "active" : ""} onClick={() => setMatchFilter("direct")}>Прямые</button>
            <button className={matchFilter === "conditional" ? "active" : ""} onClick={() => setMatchFilter("conditional")}>С проверкой</button>
            <button className={matchFilter === "none" ? "active" : ""} onClick={() => setMatchFilter("none")}>Без ISO</button>
          </div>
        </div>

        <div className="catalog-meta">
          <span>Найдено: {filtered.length}</span>
          <span>Нажмите строку, чтобы увидеть ограничения</span>
        </div>
        <div className="table-head" aria-hidden="true">
          <span>ГОСТ</span><span>Тип гайки</span><span>ISO</span><span>DIN</span><span>Соответствие</span><span />
        </div>
        <div className="standards-list">
          {filtered.map((item) => <StandardCard item={item} key={item.gost} />)}
          {!filtered.length && (
            <div className="empty-state">
              <span className="empty-nut" aria-hidden="true" />
              <h3>Совпадений нет</h3>
              <p>Попробуйте номер без года или выберите другую категорию.</p>
            </div>
          )}
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="section-index">03</div>
        <div className="method-intro">
          <p className="kicker">Правило замены</p>
          <h2>Одинаковая резьба<br />ещё не означает<br />одинаковую гайку.</h2>
        </div>
        <div className="method-steps">
          <article><span>1</span><div><h3>Геометрия</h3><p>Сравните размер под ключ s, высоту m, фаску, опорную поверхность и исполнение.</p></div></article>
          <article><span>2</span><div><h3>Резьба</h3><p>Проверьте диаметр, крупный или мелкий шаг, поле допуска 6H и направление резьбы.</p></div></article>
          <article><span>3</span><div><h3>Прочность</h3><p>Класс гайки должен соответствовать болту и доступным классам конкретной редакции ISO.</p></div></article>
          <article><span>4</span><div><h3>Покрытие</h3><p>Код ГОСТ не переносится в ISO или DIN буквально. Материал, толщина и пассивация задаются отдельно.</p></div></article>
        </div>
      </section>

      <section className="legend-section">
        <div><span className="match-dot direct" /><strong>Прямой</strong><p>Стандарт гармонизирован или соответствует по ключевым требованиям.</p></div>
        <div><span className="match-dot conditional" /><strong>С проверкой</strong><p>Аналог зависит от размера, исполнения, шага или редакции стандарта.</p></div>
        <div><span className="match-dot none" /><strong>Нет прямого ISO</strong><p>Нужен подбор по чертежу или применение другого национального стандарта.</p></div>
      </section>

      <footer>
        <div>
          <a className="brand footer-brand" href="#top"><span className="brand-nut" aria-hidden="true" /><span>NUT//MATCH</span></a>
          <p>Инженерный навигатор по стандартам гаек.</p>
        </div>
        <div className="footer-note">
          <strong>Важно</strong>
          <p>Справочник помогает выбрать направление замены, но не заменяет проверку официальных текстов стандартов, чертежа и требований расчёта соединения.</p>
        </div>
        <div className="footer-links">
          <a href="https://www.iso.org/committee/42946/x/catalogue/" target="_blank" rel="noreferrer">Каталог ISO ↗</a>
          <a href="https://files.stroyinf.ru/" target="_blank" rel="noreferrer">База ГОСТ ↗</a>
          <span>Актуализация: август 2026</span>
        </div>
      </footer>
    </main>
  );
}
