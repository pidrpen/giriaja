# AGENTS.md — шаблоны документов

Репозиторий: **https://github.com/pidrpen/giriaja**  
Страница: **https://pidrpen.github.io/giriaja/document-templates.html**

Здесь только инструмент заполнения шаблонов. Игры и прочие утилиты — в **https://github.com/pidrpen/giriaja-hall** (сайт https://pidrpen.github.io/giriaja-hall/).

## Файлы

| Файл | Назначение |
|------|------------|
| `document-templates.html` | Самодостаточный HTML: формы, печать, Excel |
| `images/universalmash-logo.png` | Логотип на бланке распоряжения |
| `export_forms/` | Эталон Excel-матриц. Рантайм их не подключает — логика вшита в HTML |
| `index.html` | Редирект на `document-templates.html` |

## Не ломать

- Вставка из 1С: не `trim()` слева у номенклатуры
- «Итого» под шапкой, не внизу таблицы
- Порядок комплекта `DEFAULT_PACK`: `rasp → kit → mat → f3 → f2 → f1 → stat → cmp`
- Распоряжение: исполнитель и телефон слева снизу **только на титульном листе**, из общих данных
- Подпись главного инженера: инициалы перед фамилией (`fioInitialsFirst`)
- Дата распоряжения по умолчанию: `№342/02 от 16.01.2026`
- kit/rasp в Excel — текст по строкам (`wrapLines`), не одна огромная ячейка

Язык UI и общения: **русский**.
