"use client";

import { useMemo, useState } from "react";

type MatchLevel = "direct" | "conditional" | "none";
type ProductType = "nut" | "washer" | "screw";

type FastenerStandard = {
  gost: string;
  title: string;
  category: string;
  iso: string[];
  match: MatchLevel;
  scope: string;
  note: string;
  product?: ProductType;
  status?: string;
};

type ParsedDesignation = ReturnType<typeof parseDesignation>;

const standards: FastenerStandard[] = [
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
  {
    gost: "ГОСТ 11371-78",
    title: "Шайбы плоские нормальные",
    category: "Плоские",
    product: "washer",
    iso: ["ISO 7089", "ISO 7090"],
    match: "conditional",
    scope: "Диаметры 1–48 мм · исполнения 1 и 2",
    note: "Исполнение 1 без фаски сопоставляют с ISO 7089 / DIN 125-A, исполнение 2 с фаской — с ISO 7090 / DIN 125-B. Проверьте наружный диаметр и толщину.",
  },
  {
    gost: "ГОСТ 6958-78",
    title: "Шайбы увеличенные",
    category: "Плоские",
    product: "washer",
    iso: ["ISO 7093-1", "ISO 7093-2"],
    match: "conditional",
    scope: "Увеличенный наружный диаметр",
    note: "Ближайшее семейство — ISO 7093 и DIN 9021. Часть 1 ISO относится к классу точности A, часть 2 — к C; толщину нужно сверить.",
  },
  {
    gost: "ГОСТ 10450-78",
    title: "Шайбы уменьшенные",
    category: "Плоские",
    product: "washer",
    iso: ["ISO 7092"],
    match: "conditional",
    scope: "Малая серия",
    note: "Функционально соответствует малой серии ISO 7092 / DIN 433. Сверьте толщину и допустимую опорную нагрузку.",
  },
  {
    gost: "ГОСТ 6402-70",
    title: "Шайбы пружинные",
    category: "Пружинные",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Лёгкие, нормальные, тяжёлые и особо тяжёлые",
    note: "Прямого ISO нет. Рыночное сопоставление — DIN 127-A/B, но профиль сечения, высота и пружинные свойства проверяются отдельно.",
  },
  {
    gost: "ГОСТ 10906-78",
    title: "Шайбы косые",
    category: "Косые",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Для двутавров и швеллеров",
    note: "Выбор DIN зависит от профиля: DIN 434 — для двутавров, DIN 435 — для швеллеров. Угол уклона и размеры должны совпасть.",
  },
  {
    gost: "ГОСТ 13463-77",
    title: "Шайбы стопорные с лапкой",
    category: "Стопорные",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Стопорение граней гайки",
    note: "Прямого ISO нет. Ближайшее исполнение — DIN 93; проверьте форму лапки, внутренний диаметр и толщину.",
  },
  {
    gost: "ГОСТ 13464-77",
    title: "Шайбы стопорные с лапками",
    category: "Стопорные",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Несколько отгибных лапок",
    note: "Функциональное сопоставление — DIN 463. Количество, расположение и длина лапок могут отличаться.",
  },
  {
    gost: "ГОСТ 13465-77",
    title: "Шайбы стопорные с носком",
    category: "Стопорные",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Наружный фиксирующий носок",
    note: "Ближайший DIN — 432. Перед заменой сверяют ширину носка, положение паза и толщину шайбы.",
  },
  {
    gost: "ГОСТ 11872-89",
    title: "Шайбы многолапчатые стопорные",
    category: "Стопорные",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Для круглых шлицевых гаек",
    note: "Обычно сопоставляют с DIN 5406 (серия MB). Номероразмер выбирают вместе с гайкой и резьбой вала.",
  },
  {
    gost: "ГОСТ 22355-77",
    title: "Шайбы для высокопрочных болтов",
    category: "Высокопрочные",
    product: "washer",
    iso: ["ISO 7416 (отозван)"],
    match: "conditional",
    scope: "Металлические конструкции",
    note: "Исторические аналоги — ISO 7416 и DIN 6916. Для новых комплектов применяют EN 14399-6 и проверяют систему соединения целиком.",
    status: "исторический аналог",
  },
  {
    gost: "ГОСТ Р 52646-2006",
    title: "Шайбы к высокопрочным болтам и гайкам",
    category: "Высокопрочные",
    product: "washer",
    iso: ["ISO 7416:1984"],
    match: "conditional",
    scope: "Высокопрочные строительные комплекты",
    note: "Основан на историческом ISO 7416. Ближайшие DIN/EN — DIN 6916 и EN 14399-6; стандарт отменён.",
    status: "отменён",
  },
  {
    gost: "ГОСТ 9065-75",
    title: "Шайбы для фланцевых соединений",
    category: "Специальные",
    product: "washer",
    iso: [],
    match: "none",
    scope: "Для шпилек фланцевых соединений",
    note: "Прямого продуктового ISO/DIN нет. Замену выполняют по наружному диаметру, толщине, материалу и требованиям фланцевого узла.",
  },
  {
    gost: "ГОСТ ISO 7089-2014",
    title: "Шайбы плоские нормальной серии, класс A",
    category: "Гармонизированные",
    product: "washer",
    iso: ["ISO 7089:2000"],
    match: "direct",
    scope: "Нормальная серия · без фаски",
    note: "Идентичная основа ISO 7089. В Германии применяется DIN EN ISO 7089; DIN 125-A — историческое обозначение.",
  },
  {
    gost: "ГОСТ ISO 7090-2014",
    title: "Шайбы плоские с фаской, класс A",
    category: "Гармонизированные",
    product: "washer",
    iso: ["ISO 7090:2000"],
    match: "direct",
    scope: "Нормальная серия · с фаской",
    note: "Идентичная основа ISO 7090. В Германии применяется DIN EN ISO 7090; DIN 125-B — историческое обозначение.",
  },
  {
    gost: "ГОСТ ISO 7092-2016",
    title: "Шайбы плоские малой серии, класс A",
    category: "Гармонизированные",
    product: "washer",
    iso: ["ISO 7092:2000"],
    match: "direct",
    scope: "Малая серия",
    note: "Прямая гармонизация с ISO 7092. Историческое рыночное обозначение — DIN 433.",
  },
  {
    gost: "ГОСТ ISO 7093-1-2016",
    title: "Шайбы плоские увеличенной серии, класс A",
    category: "Гармонизированные",
    product: "washer",
    iso: ["ISO 7093-1:2000"],
    match: "direct",
    scope: "Увеличенная серия · класс A",
    note: "Прямая гармонизация с частью 1 ISO 7093. DIN 9021 используется как историческое сопоставление.",
  },
  {
    gost: "ГОСТ ISO 7093-2-2016",
    title: "Шайбы плоские увеличенной серии, класс C",
    category: "Гармонизированные",
    product: "washer",
    iso: ["ISO 7093-2:2000"],
    match: "direct",
    scope: "Увеличенная серия · класс C",
    note: "Прямая гармонизация с частью 2 ISO 7093. Не смешивайте с классом точности A без проверки толщины и допусков.",
  },
  {
    gost: "ГОСТ ISO 7094-2016",
    title: "Шайбы плоские особо большой серии, класс C",
    category: "Гармонизированные",
    product: "washer",
    iso: ["ISO 7094:2000"],
    match: "direct",
    scope: "Особо большая серия",
    note: "Прямая гармонизация с ISO 7094. Историческое сопоставление — DIN 440.",
  },
  {
    gost: "ГОСТ 11738-84",
    title: "Винты с цилиндрической головкой и внутренним шестигранником",
    category: "Внутренний шестигранник",
    product: "screw",
    iso: ["ISO 4762"],
    match: "conditional",
    scope: "M1,6–M36 · классы прочности до 12.9",
    note: "Основной аналог — ISO 4762 / DIN 912. Проверьте высоту и диаметр головки, длину резьбы и класс прочности.",
  },
  {
    gost: "ГОСТ 17473-80",
    title: "Винты с полукруглой головкой и крестообразным шлицем",
    category: "Крестообразный шлиц",
    product: "screw",
    iso: ["ISO 7045"],
    match: "conditional",
    scope: "M1,6–M10 · классы точности A и B",
    note: "Ближайший аналог — ISO 7045 / DIN 7985. Сверьте форму головки, тип крестообразного шлица H или Z и длину резьбы.",
  },
  {
    gost: "ГОСТ 17474-80",
    title: "Винты с потайной головкой и крестообразным шлицем",
    category: "Крестообразный шлиц",
    product: "screw",
    iso: ["ISO 7046-1", "ISO 7046-2"],
    match: "conditional",
    scope: "M1,6–M10 · угол головки 90°",
    note: "ISO 7046-1 и -2 различаются группой материалов и механическими требованиями; исторический DIN — 965. Проверьте диаметр головки и шлиц.",
  },
  {
    gost: "ГОСТ 17475-80",
    title: "Винты с полупотайной головкой и крестообразным шлицем",
    category: "Крестообразный шлиц",
    product: "screw",
    iso: ["ISO 7047"],
    match: "conditional",
    scope: "M1,6–M10",
    note: "Ближайший аналог — ISO 7047 / DIN 966. Сверьте высоту выпуклой части головки и тип шлица.",
  },
  {
    gost: "ГОСТ 1491-80",
    title: "Винты с цилиндрической головкой и прямым шлицем",
    category: "Прямой шлиц",
    product: "screw",
    iso: ["ISO 1207"],
    match: "conditional",
    scope: "M1–M20",
    note: "Функциональный аналог — ISO 1207 / DIN 84. Проверьте геометрию головки, ширину шлица и длину резьбы.",
  },
  {
    gost: "ГОСТ 11644-75",
    title: "Винты с полукруглой головкой и прямым шлицем",
    category: "Прямой шлиц",
    product: "screw",
    iso: ["ISO 1580"],
    match: "conditional",
    scope: "M1–M20",
    note: "Ближайший аналог — ISO 1580 / DIN 85. Сверьте высоту и диаметр головки, шлиц и исполнение конца.",
  },
  {
    gost: "ГОСТ 1476-93",
    title: "Винты установочные с коническим концом и прямым шлицем",
    category: "Установочные",
    product: "screw",
    iso: ["ISO 7434"],
    match: "conditional",
    scope: "Метрическая резьба · конический конец",
    note: "Ближайший аналог — ISO 7434 / DIN 553. Критичны угол конуса, глубина шлица и длина винта.",
  },
  {
    gost: "ГОСТ 1477-93",
    title: "Винты установочные с плоским концом и прямым шлицем",
    category: "Установочные",
    product: "screw",
    iso: ["ISO 4766"],
    match: "conditional",
    scope: "Метрическая резьба · плоский конец",
    note: "Ближайший аналог — ISO 4766 / DIN 551. Проверьте форму торца, длину и размер шлица.",
  },
  {
    gost: "ГОСТ 1478-93",
    title: "Винты установочные с цилиндрическим концом и прямым шлицем",
    category: "Установочные",
    product: "screw",
    iso: ["ISO 7435"],
    match: "conditional",
    scope: "Метрическая резьба · цилиндрический конец",
    note: "Ближайший аналог — ISO 7435 / DIN 417. Сверьте диаметр и длину цилиндрического конца.",
  },
  {
    gost: "ГОСТ 1479-93",
    title: "Винты установочные с чашечным концом и прямым шлицем",
    category: "Установочные",
    product: "screw",
    iso: ["ISO 7436"],
    match: "conditional",
    scope: "Метрическая резьба · чашечный конец",
    note: "Ближайший аналог — ISO 7436 / DIN 438. Проверьте профиль чашечки, глубину шлица и длину.",
  },
  {
    gost: "ГОСТ Р ИСО 4762-2012",
    title: "Винты с цилиндрической головкой и внутренним шестигранником",
    category: "Гармонизированные",
    product: "screw",
    iso: ["ISO 4762:2004"],
    match: "direct",
    scope: "Классы точности A · M1,6–M64",
    note: "Прямая гармонизация с ISO 4762. В Германии применяется DIN EN ISO 4762; DIN 912 — историческое обозначение.",
  },
  {
    gost: "ГОСТ Р ИСО 7045-2013",
    title: "Винты с полукруглой головкой и крестообразным шлицем",
    category: "Гармонизированные",
    product: "screw",
    iso: ["ISO 7045:2011"],
    match: "direct",
    scope: "Класс точности A",
    note: "Прямая гармонизация с ISO 7045. DIN EN ISO 7045 — актуальная немецкая запись, DIN 7985 — историческая.",
  },
  {
    gost: "ГОСТ Р ИСО 7046-1-2013",
    title: "Винты с потайной головкой и крестообразным шлицем",
    category: "Гармонизированные",
    product: "screw",
    iso: ["ISO 7046-1:2011"],
    match: "direct",
    scope: "Сталь классов 4.8, 8.8 и 10.9",
    note: "Прямая гармонизация с ISO 7046-1. DIN EN ISO 7046-1 заменяет историческое обозначение DIN 965 для соответствующей группы.",
  },
  {
    gost: "ГОСТ Р ИСО 7047-2013",
    title: "Винты с полупотайной головкой и крестообразным шлицем",
    category: "Гармонизированные",
    product: "screw",
    iso: ["ISO 7047:2011"],
    match: "direct",
    scope: "Класс точности A",
    note: "Прямая гармонизация с ISO 7047. DIN EN ISO 7047 — актуальная немецкая запись, DIN 966 — историческая.",
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
  "ГОСТ 11371-78": ["DIN 125-A", "DIN 125-B"],
  "ГОСТ 6958-78": ["DIN 9021"],
  "ГОСТ 10450-78": ["DIN 433"],
  "ГОСТ 6402-70": ["DIN 127-A", "DIN 127-B"],
  "ГОСТ 10906-78": ["DIN 434", "DIN 435"],
  "ГОСТ 13463-77": ["DIN 93"],
  "ГОСТ 13464-77": ["DIN 463"],
  "ГОСТ 13465-77": ["DIN 432"],
  "ГОСТ 11872-89": ["DIN 5406"],
  "ГОСТ 22355-77": ["DIN 6916", "EN 14399-6"],
  "ГОСТ Р 52646-2006": ["DIN 6916", "EN 14399-6"],
  "ГОСТ 9065-75": [],
  "ГОСТ ISO 7089-2014": ["DIN EN ISO 7089", "DIN 125-A (ист.)"],
  "ГОСТ ISO 7090-2014": ["DIN EN ISO 7090", "DIN 125-B (ист.)"],
  "ГОСТ ISO 7092-2016": ["DIN EN ISO 7092", "DIN 433 (ист.)"],
  "ГОСТ ISO 7093-1-2016": ["DIN EN ISO 7093-1", "DIN 9021 (ист.)"],
  "ГОСТ ISO 7093-2-2016": ["DIN EN ISO 7093-2"],
  "ГОСТ ISO 7094-2016": ["DIN EN ISO 7094", "DIN 440 (ист.)"],
  "ГОСТ 11738-84": ["DIN 912"],
  "ГОСТ 17473-80": ["DIN 7985"],
  "ГОСТ 17474-80": ["DIN 965"],
  "ГОСТ 17475-80": ["DIN 966"],
  "ГОСТ 1491-80": ["DIN 84"],
  "ГОСТ 11644-75": ["DIN 85"],
  "ГОСТ 1476-93": ["DIN 553"],
  "ГОСТ 1477-93": ["DIN 551"],
  "ГОСТ 1478-93": ["DIN 417"],
  "ГОСТ 1479-93": ["DIN 438"],
  "ГОСТ Р ИСО 4762-2012": ["DIN EN ISO 4762", "DIN 912 (ист.)"],
  "ГОСТ Р ИСО 7045-2013": ["DIN EN ISO 7045", "DIN 7985 (ист.)"],
  "ГОСТ Р ИСО 7046-1-2013": ["DIN EN ISO 7046-1", "DIN 965 (ист.)"],
  "ГОСТ Р ИСО 7047-2013": ["DIN EN ISO 7047", "DIN 966 (ист.)"],
};

const productLabels: Record<ProductType, string> = {
  nut: "Гайки",
  washer: "Шайбы",
  screw: "Винты",
};

const productNouns: Record<ProductType, string> = {
  nut: "Гайка",
  washer: "Шайба",
  screw: "Винт",
};

const matchLabels: Record<MatchLevel, string> = {
  direct: "Прямой",
  conditional: "С проверкой",
  none: "Нет прямого ISO",
};

const strengthCodes = ["36", "46", "48", "56", "58", "68", "88", "98", "109", "129"];

function canonicalNumber(value = "") {
  return value.replace(",", ".");
}

function latinAccuracyClass(value = "") {
  return value.replace("А", "A").replace("В", "B").replace("С", "C");
}

function parseDesignation(value: string, productHint?: ProductType, knownGost = "") {
  const normalized = value
    .toUpperCase()
    .replaceAll("Ё", "Е")
    .replace(/\bGOST\b/g, "ГОСТ")
    .replace(/\s+/g, " ")
    .trim();
  let body = normalized.replace(
    /(?:ГОСТ|GOST)\s*(?:Р\s*(?:ИСО|ISO)\s*|(?:ИСО|ISO)\s*)?\d{3,5}(?:-\d{1,4}){0,2}/g,
    " ",
  );
  const knownNumber = knownGost.match(/\d{3,5}(?:-\d{1,4}){0,2}/)?.[0];
  if (knownNumber) {
    const escapedNumber = knownNumber.replaceAll("-", "[-–—]?");
    const shortNumber = knownNumber.split("-")[0];
    body = body
      .replace(new RegExp(`(?:^|\\s)${escapedNumber}(?=\\s|$)`, "g"), " ")
      .replace(new RegExp(`(?:^|\\s)${shortNumber}(?=\\s|$)`, "g"), " ");
  }
  const detectedProduct: ProductType | undefined = /ШАЙБ[АЫЕ]/.test(body)
    ? "washer"
    : /ВИНТ[А-ЯA-Z]*/.test(body)
      ? "screw"
      : /ГАЙК[А-ЯA-Z]*/.test(body)
        ? "nut"
        : undefined;
  const product = productHint ?? detectedProduct;

  const explicitValue = (label: RegExp, pattern: string) => body.match(
    new RegExp(`${label.source}\\s*(?:[:=№-]\\s*)?(${pattern})`, "i"),
  )?.[1] ?? "";

  const explicitSize = explicitValue(/(?:РАЗМЕР|ДИАМЕТР|РЕЗЬБА)/, "[MМ]?\\s*\\d+(?:[.,]\\d+)?");
  const explicitSecond = explicitValue(product === "screw" ? /(?:ДЛИНА|L)/ : /(?:ШАГ|P)/, "\\d+(?:[.,]\\d+)?");
  const explicitClass = explicitValue(/КЛАСС(?:\s+ПРОЧНОСТИ)?/, "(?:\\d{1,2}[.,]\\d|\\d{1,2}|[AАBВCС])");
  const explicitAccuracy = explicitValue(/КЛАСС\s+ТОЧНОСТИ/, "[AАBВCС]");
  const explicitCoating = explicitValue(/ПОКРЫТИЕ/, "0\\d{2}");
  const explicitExecution = explicitValue(/ИСП(?:ОЛНЕНИЕ)?/, "[1-4]");
  const explicitGroup = explicitValue(/(?:ГРУППА(?:\s+МАТЕРИАЛА)?|ГР\.?)/, "0\\d");
  const explicitGrade = explicitValue(/(?:МАРКА(?:\s+СТАЛИ)?|СТАЛЬ|МАТЕРИАЛ)/, "[0-9A-ZА-Я]+(?:-[0-9A-ZА-Я]+)?");

  const metric = body.match(/[MМ]\s*(\d+(?:[.,]\d+)?)/);
  let diameter = canonicalNumber(explicitSize.replace(/[MМ]\s*/i, "") || metric?.[1]);
  if (diameter.includes(".")) {
    const [whole, fraction] = diameter.split(".");
    if (strengthCodes.includes(fraction) && product !== "washer") diameter = whole;
  }

  const dimension = body.match(/[MМ]\s*\d+(?:[.,]\d+)?\s*[XХ×]\s*(\d+(?:[.,]\d+)?)/);
  let secondDimension = canonicalNumber(explicitSecond || dimension?.[1]);
  if (product === "screw" && secondDimension.includes(".")) {
    const [whole, fraction] = secondDimension.split(".");
    if (strengthCodes.includes(fraction)) secondDimension = whole;
  }

  const pipeThread = body.match(/\bG\s*([0-9⅛¼⅜½¾]+(?:\s*\/\s*\d+)?)/)?.[1]?.replaceAll(" ", "") ?? "";
  const tolerance = body.match(/(?:^|[\s.·;-])([3-9]\s*[A-HА-Я])(?=$|[\s.·;-])/)?.[1]?.replaceAll(" ", "") ?? "";
  const coating = explicitCoating
    || body.match(/(?:^|[\s.·;/-])(0\d{2})(?=$|[\s.·;/-])/)?.[1]
    || "";
  const materialGroup = explicitGroup
    || body.match(/(?:^|[\s.·;/-])(0\d)(?=$|[\s.·;/-])/)?.[1]
    || "";
  const gradeCandidates = Array.from(body.matchAll(/(?:^|[\s.·;/-])(\d{1,3}[A-ZА-Я]{1,5}\d{0,2})(?=$|[\s.·;/-])/g), (match) => match[1]);
  const materialGrade = explicitGrade
    || gradeCandidates.find((candidate) => candidate !== tolerance && !strengthCodes.includes(candidate))
    || "";

  let accuracyClass = latinAccuracyClass(explicitAccuracy);
  if (!accuracyClass) {
    const compactAccuracy = body.match(/(?:^|[\s.·;/-])([AАBВCС])(?=$|[\s.·;/-])/i)?.[1] ?? "";
    accuracyClass = latinAccuracyClass(compactAccuracy);
  }

  let propertyClass = explicitClass;
  if (/^[AАBВCС]$/i.test(propertyClass)) {
    accuracyClass ||= latinAccuracyClass(propertyClass);
    propertyClass = "";
  }
  if (propertyClass.includes(".") || propertyClass.includes(",")) {
    propertyClass = canonicalNumber(propertyClass).replace(".", "");
  }
  if (!propertyClass && product === "screw") {
    propertyClass = body.match(new RegExp(`(?:^|[\\s.·;/-])(${strengthCodes.join("|")})(?=$|[\\s.·;/-])`))?.[1] ?? "";
  }
  if (!propertyClass && product === "nut") {
    propertyClass = body.match(/(?:^|[\s.·;/-])(4|5|6|8|9|10|12)(?=$|[\s.·;/-])/)?.[1] ?? "";
  }

  let execution = explicitExecution;
  if (!execution) {
    execution = body.match(/(?:^|\s)([1-4])\s*[-.]?\s*(?=(?:ГАЙК|ШАЙБ|ВИНТ|[MМ]))/)?.[1] ?? "";
  }

  let washerSize = "";
  if (product === "washer") {
    const washerBody = body.replace(/ШАЙБ[А-ЯA-Z]*/g, " ");
    const tokens = washerBody.split(/[\s.·;/-]+/).filter(Boolean);
    const numericTokens = tokens.filter((token) => /^\d+(?:,\d+)?$/.test(token));
    const reserved = new Set([coating, materialGroup, execution]);
    let sizeCandidates = numericTokens.filter((token) => !reserved.has(token));

    if (!execution) {
      const executionCandidate = sizeCandidates.find((token) => /^[12]$/.test(token));
      const hasOtherSize = sizeCandidates.some((token) => token !== executionCandidate && Number(token.replace(",", ".")) > 0);
      if (executionCandidate && hasOtherSize) {
        execution = executionCandidate;
        sizeCandidates = sizeCandidates.filter((token) => token !== executionCandidate);
      }
    }

    washerSize = canonicalNumber(explicitSize.replace(/[MМ]\s*/i, "") || sizeCandidates[0] || diameter);
    diameter = "";
  }

  const missingFields: string[] = [];
  if (!knownGost) missingFields.push("номер ГОСТ");
  if (product === "washer" && !washerSize) missingFields.push("размер");
  if ((product === "nut" || product === "screw") && !diameter && !pipeThread) missingFields.push("размер резьбы");
  if (product === "screw" && !secondDimension) missingFields.push("длина");

  return {
    product: product ?? null,
    diameter,
    pitch: secondDimension,
    pipeThread,
    washerSize,
    tolerance,
    accuracyClass,
    propertyClass,
    materialGroup,
    materialGrade,
    coating,
    execution,
    missingFields,
  };
}

function productOf(item: FastenerStandard): ProductType {
  return item.product ?? "nut";
}

function formatStrength(item: FastenerStandard, code: string) {
  if (!code) return "";
  if (productOf(item) !== "screw") return code;
  if (code.length === 2) return `${code[0]}.${code[1]}`;
  if (code.length === 3) return `${code.slice(0, 2)}.${code[2]}`;
  return code;
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

function selectIso(item: FastenerStandard, parsed: ParsedDesignation) {
  if (!item.iso.length) return [];
  const isFine = Boolean(parsed.pitch);
  let targets = [item.iso[0]];

  if (item.gost === "ГОСТ 5915-70" || item.gost === "ГОСТ 5927-70") {
    targets = [isFine ? "ISO 8673" : "ISO 4032"];
  }
  if (item.gost === "ГОСТ 5916-70") {
    targets = isFine
      ? ["ISO 8675"]
      : parsed.execution === "2"
        ? ["ISO 4036"]
        : parsed.execution === "1"
          ? ["ISO 4035"]
          : ["ISO 4035", "ISO 4036"];
  }
  if (item.gost === "ГОСТ 5929-70") {
    targets = [isFine ? "ISO 8675" : "ISO 4035"];
  }
  if ((item.gost === "ГОСТ 5918-73" || item.gost === "ГОСТ 5932-73") && !parsed.execution) {
    targets = item.iso;
  }
  if (item.gost === "ГОСТ 11371-78") {
    targets = [parsed.execution === "2" ? "ISO 7090" : "ISO 7089"];
  }
  if (item.gost === "ГОСТ 6958-78") {
    targets = parsed.accuracyClass === "C" || parsed.execution === "2"
      ? ["ISO 7093-2"]
      : parsed.accuracyClass === "A" || parsed.execution === "1"
        ? ["ISO 7093-1"]
        : ["ISO 7093-1", "ISO 7093-2"];
  }
  if (item.gost === "ГОСТ 17474-80") targets = item.iso;

  return targets;
}

function selectDin(item: FastenerStandard, parsed: ParsedDesignation) {
  const targets = dinByGost[item.gost] ?? [];
  const isFine = Boolean(parsed.pitch);

  if (item.gost === "ГОСТ 5916-70") {
    return isFine
      ? ["DIN 936"]
      : parsed.execution === "2"
        ? ["DIN 439-1"]
        : parsed.execution === "1"
          ? ["DIN 439-2"]
          : ["DIN 439-1", "DIN 439-2"];
  }
  if (item.gost === "ГОСТ 5929-70") return [isFine ? "DIN 936" : "DIN 439-2"];
  if (item.gost === "ГОСТ 11371-78") return [parsed.execution === "2" ? "DIN 125-B" : "DIN 125-A"];

  return targets;
}

function buildDesignations(item: FastenerStandard, targets: string[], parsed: ParsedDesignation, system: "ISO" | "DIN") {
  if (!targets.length) return [`Прямого обозначения ${system} нет`];

  const product = productOf(item);
  const diameter = parsed.diameter.replace(".", ",");
  const secondDimension = parsed.pitch.replace(".", ",");
  const size = product === "washer"
    ? (parsed.washerSize || diameter || "размер…").replace(".", ",")
    : parsed.diameter
      ? `M${diameter}${secondDimension ? `×${secondDimension}` : ""}`
      : parsed.pipeThread ? `G${parsed.pipeThread}` : "размер…";
  const strengthValue = formatStrength(item, parsed.propertyClass);
  const strength = strengthValue && product !== "washer" ? `-${strengthValue}` : "";
  return targets.map((target) => `${productNouns[product]} ${size}${strength} ${target}`);
}

function StandardCard({ item }: { item: FastenerStandard }) {
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
  const [selectedProduct, setSelectedProduct] = useState<"all" | ProductType>("all");
  const [category, setCategory] = useState("Все");
  const [matchFilter, setMatchFilter] = useState<"all" | MatchLevel>("all");
  const [copied, setCopied] = useState(false);

  const matchedStandard = useMemo(() => {
    const normalizedSource = source.toUpperCase().replace(/[–—]/g, "-");
    const compactSource = normalizedSource.replace(/\s/g, "");
    return standards.find((item) => {
      const number = item.gost.match(/\d{3,5}(?:-\d{2,4})?/)?.[0];
      const shortNumber = number?.split("-")[0];
      const shortToken = shortNumber ? new RegExp(`(?:^|\\D)${shortNumber}(?:\\D|$)`).test(normalizedSource) : false;
      return Boolean(number && (compactSource.includes(number) || shortToken));
    });
  }, [source]);

  const parsed = useMemo(
    () => parseDesignation(source, matchedStandard ? productOf(matchedStandard) : undefined, matchedStandard?.gost),
    [source, matchedStandard],
  );
  const isoOutput = useMemo(
    () => matchedStandard ? buildDesignations(matchedStandard, selectIso(matchedStandard, parsed), parsed, "ISO") : ["Укажите номер ГОСТ"],
    [matchedStandard, parsed],
  );
  const dinOutput = useMemo(
    () => matchedStandard ? buildDesignations(matchedStandard, selectDin(matchedStandard, parsed), parsed, "DIN") : ["Укажите номер ГОСТ"],
    [matchedStandard, parsed],
  );

  const categories = useMemo(() => {
    const pool = selectedProduct === "all"
      ? standards
      : standards.filter((item) => productOf(item) === selectedProduct);
    return ["Все", ...Array.from(new Set(pool.map((item) => item.category)))];
  }, [selectedProduct]);

  const filtered = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return standards.filter((item) => {
      const inProduct = selectedProduct === "all" || productOf(item) === selectedProduct;
      const inCategory = category === "Все" || item.category === category;
      const inMatch = matchFilter === "all" || item.match === matchFilter;
      const haystack = `${productLabels[productOf(item)]} ${item.gost} ${item.title} ${item.iso.join(" ")} ${(dinByGost[item.gost] ?? []).join(" ")} ${item.scope} ${item.note}`.toLowerCase();
      return inProduct && inCategory && inMatch && (!query || haystack.includes(query));
    });
  }, [catalogQuery, selectedProduct, category, matchFilter]);

  function chooseProduct(next: "all" | ProductType) {
    setSelectedProduct(next);
    setCategory("Все");
  }

  async function copyResult() {
    const resultText = [
      `ISO: ${isoOutput.join(" / ")}; ${coatingText(parsed.coating, "ISO")}`,
      `DIN: ${dinOutput.join(" / ")}; ${coatingText(parsed.coating, "DIN")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(resultText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = resultText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="В начало">
          <span className="brand-nut" aria-hidden="true" />
          <span>FASTENER//MATCH</span>
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
          <h1>Перевод крепежа<br /><em>без гадания.</em></h1>
          <p className="hero-lead">
            Гайки, шайбы и винты: введите обозначение по ГОСТ и получите конкретные строки ISO и DIN для спецификации.
          </p>
          <div className="hero-facts" aria-label="Преимущества">
            <span>Поиск по номеру и типу</span>
            <span>70 стандартов крепежа</span>
            <span>ГОСТ → ISO + DIN</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="dimension dimension-top"><span>s</span></div>
          <div className="technical-nut"><span className="technical-hole" /></div>
          <div className="dimension dimension-side"><span>m</span></div>
          <span className="drawing-label">NUT · WASHER · SCREW</span>
          <span className="drawing-code">M12 / 12 / M6×20</span>
        </div>
      </section>

      <section className="converter-section" id="converter">
        <div className="section-index">01</div>
        <div className="converter-heading">
          <p className="kicker">Автоподбор</p>
          <h2>Вставьте обозначение целиком</h2>
          <p>Понимает полные и неполные обозначения, даже если поля переставлены: размер, шаг или длину, допуск, исполнение, класс, материал и покрытие.</p>
        </div>

        <div className="converter-grid">
          <div className="input-panel">
            <label htmlFor="designation">Обозначение по ГОСТ</label>
            <div className="technical-input-wrap">
              <input
                id="designation"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Например: Винт М6×20.58.019 ГОСТ 11738-84"
                spellCheck={false}
              />
              <button type="button" onClick={() => setSource("")} aria-label="Очистить поле">×</button>
            </div>
            <div className="parsed-row">
              <span><small>Изделие</small>{matchedStandard ? productNouns[productOf(matchedStandard)] : parsed.product ? productNouns[parsed.product] : "—"}</span>
              <span><small>Размер</small>{parsed.washerSize ? parsed.washerSize.replace(".", ",") : parsed.diameter ? `M${parsed.diameter.replace(".", ",")}` : parsed.pipeThread ? `G${parsed.pipeThread}` : "—"}</span>
              <span><small>{matchedStandard && productOf(matchedStandard) === "screw" ? "Длина" : "Шаг"}</small>{parsed.pitch.replace(".", ",") || (matchedStandard && productOf(matchedStandard) === "nut" ? "крупный" : "—")}</span>
              <span><small>Допуск</small>{parsed.tolerance || "—"}</span>
              <span><small>Класс</small>{[
                parsed.accuracyClass,
                matchedStandard ? formatStrength(matchedStandard, parsed.propertyClass) : parsed.propertyClass,
              ].filter(Boolean).join(" · ") || "—"}</span>
              <span><small>Материал</small>{[parsed.materialGroup && `гр. ${parsed.materialGroup}`, parsed.materialGrade.toLowerCase()].filter(Boolean).join(" · ") || "—"}</span>
              <span><small>Покрытие</small>{parsed.coating || "—"}</span>
              <span><small>Исполнение</small>{parsed.execution || "—"}</span>
            </div>
            <div className={`parse-state ${parsed.missingFields.length ? "partial" : "complete"}`}>
              <strong>{parsed.missingFields.length ? "Частичный разбор" : "Обозначение распознано"}</strong>
              <span>{parsed.missingFields.length ? `Не хватает: ${parsed.missingFields.join(", ")}. Подбор выполнен по остальным полям.` : "Порядок составляющих не влияет на подбор."}</span>
            </div>
            <div className="examples">
              <span>Примеры:</span>
              <button onClick={() => setSource("Гайка М12-6Н.5.019 ГОСТ 5915-70")}>Гайка · 5915</button>
              <button onClick={() => setSource("Шайба А.12.01.08кп.016 ГОСТ 11371-78")}>Шайба · 11371</button>
              <button onClick={() => setSource("Винт М6×20.58.019 ГОСТ 11738-84")}>Винт · 11738</button>
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
            <h2>Гайки, шайбы и винты</h2>
          </div>
          <label className="catalog-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="ГОСТ, ISO, DIN или тип крепежа"
              aria-label="Поиск по каталогу"
            />
          </label>
        </div>

        <div className="filter-zone">
          <div className="filter-groups">
            <div className="product-tabs" role="group" aria-label="Вид изделия">
              <button className={selectedProduct === "all" ? "active" : ""} onClick={() => chooseProduct("all")}>Все изделия</button>
              {(Object.keys(productLabels) as ProductType[]).map((item) => (
                <button key={item} className={selectedProduct === item ? "active" : ""} onClick={() => chooseProduct(item)}>{productLabels[item]}</button>
              ))}
            </div>
            <div className="category-tabs" role="group" aria-label="Тип крепежа">
              {categories.map((item) => (
                <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
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
          <span>ГОСТ</span><span>Изделие / тип</span><span>ISO</span><span>DIN</span><span>Соответствие</span><span />
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
          <h2>Похожий размер<br />ещё не означает<br />полный аналог.</h2>
        </div>
        <div className="method-steps">
          <article><span>1</span><div><h3>Геометрия</h3><p>Для гайки сверяйте s и m, для шайбы — d, d₁ и h, для винта — головку, шлиц и длину резьбы.</p></div></article>
          <article><span>2</span><div><h3>Резьба и размер</h3><p>Проверьте диаметр, шаг, поле допуска, длину винта и исполнение шайбы.</p></div></article>
          <article><span>3</span><div><h3>Материал и прочность</h3><p>Класс прочности, твёрдость шайбы и материал должны соответствовать всему соединению.</p></div></article>
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
          <a className="brand footer-brand" href="#top"><span className="brand-nut" aria-hidden="true" /><span>FASTENER//MATCH</span></a>
          <p>Инженерный навигатор по стандартам гаек, шайб и винтов.</p>
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
