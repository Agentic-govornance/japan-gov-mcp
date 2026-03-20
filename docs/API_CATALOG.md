# API_CATALOG.md — 全API仕様クイックリファレンス

## 全38 API（e-Gov APIカタログ登録分）のうち、データ取得系を統合

### 実装済（12 API）

| # | API名 | 省庁 | Base URL | 認証方式 | レスポンス |
|---|--------|------|----------|----------|-----------|
| 1 | e-Stat API v3.0 | 総務省 | `api.e-stat.go.jp/rest/3.0/app/json/` | appId (query) | JSON |
| 2 | RESAS API v1 | 内閣府 | `opendata.resas-portal.go.jp/api/v1/` | X-API-KEY (header) | JSON |
| 3 | 統計ダッシュボード | 総務省 | `dashboard.e-stat.go.jp/api/1.0/Json/` | 不要 | JSON/XML/CSV |
| 4 | 法人番号 v4 | 国税庁 | `api.houjin-bangou.nta.go.jp/4/` | id (query) | JSON/CSV/XML |
| 5 | gBizINFO REST | 経済産業省 | `info.gbiz.go.jp/hojin/v1/` | X-hojinInfo-api-token (header) | JSON |
| 6 | EDINET API v2 | 金融庁 | `api.edinet-fsa.go.jp/api/v2/` | Subscription-Key (query) | JSON/ZIP |
| 7 | 法令API v1 | 総務省 | `elaws.e-gov.go.jp/api/1/` | 不要 | XML |
| 8 | 不動産情報ライブラリ | 国土交通省 | `reinfolib.mlit.go.jp/ex-api/external/` | 不要 | JSON |
| 9 | データカタログ(CKAN) | デジタル庁 | `data.go.jp/data/api/3/` | 不要 | JSON |
| 10 | 海外安全情報 | 外務省 | `anzen.mofa.go.jp/od/` | 不要 | JSON |
| 11 | 求人webAPI | 厚生労働省 | `api.hellowork.mhlw.go.jp/` | X-API-KEY (header) | XML |
| 12 | 文化遺産オンライン | 文部科学省 | `bunka.nii.ac.jp/api/` | 不要 | JSON |

### 未実装（検討中）

| API名 | 省庁 | 用途 | 優先度 |
|--------|------|------|--------|
| DIPS API | 国土交通省 | ドローン飛行許可情報 | 低 |
| 官公需情報ポータル | 中小企業庁 | 入札情報 | 中 |
| 事例情報取得API | 中小企業庁 | ミラサポ事例 | 低 |
| 開示項目情報提供API | 中小企業庁 | IT認定機関情報 | 低 |
| MAFFアプリ政策情報 | 農林水産省 | 農政記事 | 低 |
| AgriKnowledge OpenSearch | 農林水産省 | 農林水産研究情報 | 中 |
| OPAC OpenSearch/OAI-PMH | 農林水産省 | 研究機関総合目録 | 低 |
| 提供用WEB-API | 厚生労働省 | 職場情報（gBizと重複） | 低 |
| PercellomeWeb API | 厚生労働省 | 化学物質遺伝子発現 | 低 |
| 無線局等情報検索 | 総務省 | 無線局情報 | 低 |
| 技適検索API | 総務省 | 技術基準適合証明 | 低 |
| 統計LOD | 総務省 | RDF/SPARQL形式統計 | 中 |
| ITダッシュボード | デジタル庁 | IT政策データ | 低 |
| 政府CIOポータル | デジタル庁 | CIOコンテンツ | 低 |

### フェーズ2以降で統合予定（省庁外）

| API名 | 提供元 | 用途 |
|--------|--------|------|
| CiNii Research API | NII | 論文・図書・研究データ |
| J-STAGE WebAPI | JST | 学術論文全文 |
| NDL Search | 国会図書館 | 書誌情報 |
| KAKEN | JSPS | 科研費データ |
| J-PlatPat | 特許庁 | 特許・商標 |
| JAGAT | 国土地理院 | 地理空間情報 |

---

## 主要エンドポイント詳細

### e-Stat API

```
GET /getStatsList      検索パラメータ → 統計表一覧
GET /getMetaInfo       statsDataId → メタ情報（分類・時間・地域コード一覧）
GET /getStatsData      statsDataId + フィルタ → 統計データ（最大100,000件/回）
GET /getDataCatalog    条件 → ファイル・DB一覧
GET /refineSearch      statsDataId → 絞り込み条件
```

#### getStatsList 主要パラメータ
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| appId | string | アプリケーションID（必須） |
| searchWord | string | 検索キーワード（AND/OR/NOT可） |
| surveyYears | string | 調査年 YYYY or YYYYMM-YYYYMM |
| statsField | string | 統計分野 2桁(大分類) or 4桁(小分類) |
| statsCode | string | 政府統計コード 5桁(機関) or 8桁(統計) |
| searchKind | 1,2,3 | 1:統計情報 2:小地域 3:社会人口統計 |
| startPosition | int | 取得開始位置 |
| limit | int | 取得件数 |
| updatedDate | string | 更新日 YYYY-MM-DD |

#### getStatsData 主要パラメータ
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| statsDataId | string | 統計表ID（必須） |
| lvTab / cdTab | string | 表章事項の絞り込み |
| lvTime / cdTime | string | 時間の絞り込み |
| lvArea / cdArea | string | 地域の絞り込み |
| lvCat01-15 / cdCat01-15 | string | 分類事項の絞り込み |
| startPosition | int | 開始位置 |
| limit | int | 件数（最大100000） |
| metaGetFlg | Y/N | メタ情報を含めるか |
| cntGetFlg | Y/N | 件数のみ取得 |

### RESAS API

```
人口:
  GET /population/composition/perYear    人口構成（年次推移）
  GET /population/composition/pyramid    人口ピラミッド
  GET /population/sum/perYear            総人口推移
  GET /population/sum/estimate           将来推計人口

産業:
  GET /industry/power/forArea            産業別特化係数
  GET /industry/power/forManufacture     製造業特化係数
  GET /industry/power/forIndustry        産業花火図

観光:
  GET /tourism/foreigners/forFrom        外国人（出発地別）
  GET /tourism/foreigners/forTo          外国人（行先別）

地方財政:
  GET /municipality/finance/index        財政指標
  GET /municipality/taxes/perYear        地方税推移
  GET /municipality/job/perYear          有効求人倍率

農業:
  GET /agriculture/crops/sales           農産物販売金額

企業:
  GET /patents/locations                 特許出願
```

### 法人番号API v4

```
GET /num?id={appId}&number={法人番号}&type=12
GET /name?id={appId}&name={法人名}&type=12&divide=1
GET /diff?id={appId}&from={YYYY-MM-DD}&to={YYYY-MM-DD}&type=12
```
