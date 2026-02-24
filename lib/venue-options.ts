/**
 * 主な活動場所の選択肢（選択時にURLが自動入力される）
 */
/** 「その他」選択時に表示する入力欄用の識別子 */
export const VENUE_OTHER = 'その他' as const;

export const VENUE_OPTIONS = [
  {
    name: '浦安市中央公民館',
    url: 'https://www.city.urayasu.lg.jp/shisetsu/bunka/kouminkan/1047362.html',
  },
  {
    name: '市川市信篤体育館',
    url: 'https://www.city.ichikawa.lg.jp/pub06/1511000005.html',
  },
  {
    name: '市川市塩浜体育館',
    url: 'https://www.city.ichikawa.lg.jp/pub06/1511000006.html',
  },
  {
    name: '市川市国府台スポーツセンター',
    url: 'https://www.city.ichikawa.lg.jp/pub06/1511000009.html',
  },
  {
    name: '浦安市総合体育館（舞浜）',
    url: 'https://www.urayasu-zaidan.or.jp/taiikukan/index.html',
  },
] as const;
