# Category tree audit

_Сгенерировано: 2026-08-26T15:56:17.603Z_

## Сводка
- Всего категорий: **27**
- Корневых (parent_id IS NULL): **6**
- Циклов обнаружено: **0**
- Узлов глубже 3 уровней: **0**
- Групп дубликатов имён (глобально): **0**
- Групп дубликатов имён у одного родителя: **0**
- Категорий без товаров: **7**
- Видимых товаров без категории: **18**
- Видимых товаров, привязанных к нелистовому узлу: **1**

## Дерево категорий

```
#7 [L1] Аксессуары — slug=aksessuary sort=0 products=1/4
  #11 [L2] Кисти — slug=kisti sort=1 products=18/32
  #12 [L2] Косметичка — slug=kosmetichka sort=2 products=6/30
  #13 [L2] Спонжи — slug=sponzhi sort=3 products=1/4
  #14 [L2] Точилка — slug=tochilka sort=4 products=1/1
#6 [L1] Макияж — slug=makiyazh sort=0 products=0/0
  #15 [L2] Брови — slug=brovi sort=1 products=17/28
  #16 [L2] Глаза — slug=glaza sort=2 products=110/361
  #17 [L2] Губы — slug=guby sort=3 products=106/415
  #18 [L2] Лицо — slug=litso sort=4 products=58/262
  #19 [L2] Подарочный набор — slug=podarochnyy-nabor-makiyazh sort=5 products=10/43
#5 [L1] Ногти — slug=nogti sort=0 products=0/0
  #20 [L2] Лак — slug=lak sort=1 products=27/197
  #21 [L2] Уход за ногтями — slug=uhod-za-nogtyami sort=2 products=0/0
#10 [L1] Парфюмерия — slug=parfyumeriya sort=0 products=0/0
  #22 [L2] для Женщин — slug=parfyum-zhenskiy sort=1 products=8/30
  #23 [L2] для Мужчин — slug=parfyum-muzhskoy sort=2 products=11/16
  #24 [L2] Подарочные наборы — slug=podarochnye-nabory-parfyum sort=3 products=3/5
#9 [L1] Уход за лицом — slug=uhod-za-litsom sort=0 products=0/0
  #25 [L2] Крем — slug=krem sort=1 products=22/62
  #26 [L2] Маска — slug=maska sort=2 products=5/8
  #27 [L2] Масла и сыворотки — slug=masla-i-syvorotki sort=3 products=9/17
  #28 [L2] Очищение — slug=ochischenie sort=4 products=11/23
#8 [L1] Уход за телом — slug=uhod-za-telom sort=0 products=0/0
  #29 [L2] Дезодорант — slug=dezodorant sort=1 products=0/0
  #30 [L2] Лосьон для тела — slug=losyon-dlya-tela sort=2 products=7/41
  #31 [L2] Спрей для тела — slug=sprey-dlya-tela sort=3 products=5/12
```

## Товары, привязанные к нелистовому узлу

| product_id | product | category |
| ---: | --- | --- |
| 1471 | Брелок | #7 Аксессуары |

## Категории без товаров

- #6 Макияж (slug=makiyazh, parent=root, visible=true)
- #5 Ногти (slug=nogti, parent=root, visible=true)
- #10 Парфюмерия (slug=parfyumeriya, parent=root, visible=true)
- #9 Уход за лицом (slug=uhod-za-litsom, parent=root, visible=true)
- #8 Уход за телом (slug=uhod-za-telom, parent=root, visible=true)
- #21 Уход за ногтями (slug=uhod-za-nogtyami, parent=5, visible=true)
- #29 Дезодорант (slug=dezodorant, parent=8, visible=true)

## Billz sample — сырое поле `categories` (20 товаров)

```json
[
  {
    "name": "Скидка все по 10000",
    "categories": []
  },
  {
    "name": "Точилка Karaja",
    "categories": []
  },
  {
    "name": "Помада Glowgleam",
    "categories": []
  },
  {
    "name": "Лак 531",
    "categories": [
      {
        "id": "f0c2f9ee-4f29-44ca-9b15-b2f2d1de750b",
        "name": "Ногти",
        "parent_id": ""
      }
    ]
  },
  {
    "name": "Пудра рассыпчатая Invisible matte 001",
    "categories": []
  },
  {
    "name": "Гель для бровей PUSY",
    "categories": []
  },
  {
    "name": "Тональный HD Liquid 036",
    "categories": []
  },
  {
    "name": "Тональный HD Liquid 032",
    "categories": []
  },
  {
    "name": "Гель для бровей PUSY Super Fix",
    "categories": []
  },
  {
    "name": "Тональный All Matt 020N",
    "categories": []
  },
  {
    "name": "Тени х8 Matte",
    "categories": []
  },
  {
    "name": "Праймер с эффектом мягкого свечения",
    "categories": []
  },
  {
    "name": "Праймер выравнивающий",
    "categories": []
  },
  {
    "name": "Помада Объем Plump It Up 090",
    "categories": []
  },
  {
    "name": "Праймер Светящийся",
    "categories": []
  },
  {
    "name": "Помада Объем Plump It Up 050",
    "categories": []
  },
  {
    "name": "Тональный HD Liquid 020",
    "categories": []
  },
  {
    "name": "Помада Объем Plump It Up 010",
    "categories": []
  },
  {
    "name": "Хайлайтер 030",
    "categories": []
  },
  {
    "name": "Помада Объем Plump It Up 060",
    "categories": []
  }
]
```

- Товаров с более чем 1 категорией: **0 из 20**
- Скорее всего это **упорядоченный путь** — проверить руками.

---

## Billz — полный проход по каталогу

_Сгенерировано: 2026-08-26T16:04:50.582Z_

- Всего товаров в Billz: **1694**
- С непустым `categories`: **1591** (93.9%)
- С пустым `categories`: **103** (6.1%)
- С двумя и более категориями: **0**
- Уникальных имён категорий: **6**

### Уникальные имена категорий из Billz

| Имя | Товаров | parent_id проставлен? |
| --- | ---: | --- |
| Макияж | 1114 | нет |
| Ногти | 197 | нет |
| Уход за лицом | 111 | нет |
| Аксессуары | 65 | нет |
| Уход за телом | 53 | нет |
| Парфюмерия | 51 | нет |

### Кросс-проверка с нашей БД

- Наших товаров с `category_id`, у которых Billz прислал пустое `categories`: **0**
  _(это те, кого текущий синк обнуляет — после фикса А остаются как есть)_
- Наших товаров без `category_id`, у которых Billz прислал непустое `categories`: **0**
  _(могут быть привязаны при следующем синке или разобраны вручную)_

### Вывод

Billz покрывает почти весь каталог — можно рассматривать его как основу с ручными правками поверх.
Категорий с непустым `parent_id` в Billz: **0** из 6 — иерархии нет.
