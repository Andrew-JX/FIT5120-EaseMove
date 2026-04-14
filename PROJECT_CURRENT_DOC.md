# EaseMove 当前项目排查文档

生成时间：2026-04-15  
用途：说明当前代码结构、文件职责、接口契约、关键变量、数据库设计、前后端数据流，以及优先排查的问题。

## 1. 项目总览

EaseMove 是一个前后端分离项目：

- `frontend/`：Vue 3 + Vite + Pinia + Leaflet 地图前端。
- `backend/`：Node.js + Express API，连接 PostgreSQL/Neon，定时从 City of Melbourne Open Data 拉取传感器数据。
- `backend/config/`：静态配置，包括 precinct 与传感器设备映射、街道设施 fallback 数据。
- `backend/src/db/migrations/`：数据库建表 SQL。
- `.history/`：编辑器/插件生成的历史快照目录，不参与运行。
- `figama/`：当前为空目录。

当前核心运行链路：

1. 后端启动 `backend/src/server.js`。
2. Express app 加载 `backend/src/app.js`。
3. API 路由来自 `backend/src/routes/precincts.js`。
4. 启动时 `backend/src/scheduler/dataPoller.js` 会立即拉 City of Melbourne 数据，并每小时再拉一次。
5. 数据写入 `sensor_readings`，再聚合写入 `precinct_scores`。
6. 前端 `frontend/src/views/MapView.vue` 调用 `/api/precincts/current`，用 Leaflet 渲染 precinct marker。
7. 点击 marker 后，`PrecinctCard.vue` 调用 `/api/precincts/:id/today` 获取建议。

## 2. 根目录文件说明

| 文件/目录 | 当前内容与作用 |
| --- | --- |
| `README.md` | 项目说明、技术栈、接口列表、运行方式、迭代计划。注意：当前文件里有乱码字符，例如 `鈥?`。 |
| `CLAUDE_CODE_REVIEW.md` | 代码评审检查清单，包含 AC 要求。注意：也有大量乱码字符。 |
| `.gitignore` | Git 忽略规则。 |
| `.history/` | 历史快照文件，里面包含旧版本 `.env`、README、前端/后端文件备份。排查时一般不要以它为准。 |
| `figama/` | 当前无文件。 |
| `PROJECT_CURRENT_DOC.md` | 本文档。 |

## 3. 后端目录与文件

### `backend/package.json`

后端脚本：

- `npm start`：运行 `node src/server.js`。
- `npm run dev`：运行 `nodemon src/server.js`。
- `npm test`：运行 Jest。

依赖：

- `express`：HTTP API。
- `cors`：跨域。
- `pg`：PostgreSQL 连接。
- `axios`：调用 City of Melbourne API。
- `node-cron`：定时任务。
- `dotenv`：读取 `.env`。
- `express-rate-limit`：API 限流。

注意：`package.json` 当前没有 `build` 和 `migrate` 脚本。README 里写了 `npm run migrate`，但实际不存在。

### `backend/.env`

实际值未在本文档展开，避免泄露。当前读取到的变量名：

- `DATABASE_URL`：PostgreSQL/Neon 连接串。
- `CORS_ORIGIN`：允许的前端源。
- `PORT`：后端监听端口，缺省为 `3000`。

### `backend/src/server.js`

职责：

- 加载 `.env`。
- 引入 Express app。
- 读取 `PORT`，默认 `3000`。
- 启动 HTTP 服务。
- 服务启动后调用 `startPoller()`。

关键变量：

```js
const PORT = process.env.PORT || 3000;
```

行为风险：

- 每次服务启动都会立即跑一次 poller。
- 如果数据库或外部 API 有问题，启动日志会不断出现 poller 错误。

### `backend/src/app.js`

职责：

- 创建 Express app。
- 配置 CORS。
- 配置 JSON body parser。
- 对 `/api` 配置限流。
- 挂载 `precinctRouter`。
- 提供 404 和 500 错误处理。

当前 CORS 配置：

```js
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
```

限流：

```js
windowMs: 15 * 60 * 1000
max: 100
```

含义：每 15 分钟最多 100 次 `/api` 请求。

### `backend/src/db/index.js`

职责：

- 创建 PostgreSQL connection pool。
- 导出 `query(text, params)`。

当前连接配置：

```js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

关键点：

- 运行时连接启用了 SSL。
- 这个文件是 API 和定时任务实际使用的 DB 入口。

### `backend/src/db/migrate.js`

职责：

- 读取 `backend/src/db/migrations/` 下所有 `.sql` 文件。
- 按文件名排序执行。

当前连接配置：

```js
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

重要风险：

- 这里没有 `ssl: { rejectUnauthorized: false }`。
- 如果 Neon 强制 SSL，迁移脚本可能失败，而运行时代码能连上数据库。
- README 说 `npm run migrate`，但 `backend/package.json` 没有这个脚本。实际要运行：`node src/db/migrate.js`。

### `backend/src/db/migrations/001_create_sensor_readings.sql`

建表：`sensor_readings`

用途：保存每个设备的原始传感器读数。

字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `SERIAL PRIMARY KEY` | 自增主键 |
| `device_id` | `VARCHAR(50) NOT NULL` | City of Melbourne 设备 ID |
| `precinct_id` | `VARCHAR(50) NOT NULL` | 本项目配置里的 precinct ID |
| `sensor_location` | `TEXT` | 传感器位置描述 |
| `lat` | `DECIMAL(9,6)` | 纬度 |
| `lng` | `DECIMAL(9,6)` | 经度 |
| `air_temperature` | `DECIMAL(5,2)` | 气温 |
| `relative_humidity` | `DECIMAL(5,2)` | 湿度 |
| `average_wind_speed` | `DECIMAL(5,2)` | 平均风速 |
| `gust_wind_speed` | `DECIMAL(5,2)` | 阵风 |
| `atmospheric_pressure` | `DECIMAL(7,2)` | 气压 |
| `pm25` | `DECIMAL(6,2)` | PM2.5 |
| `pm10` | `DECIMAL(6,2)` | PM10 |
| `noise` | `DECIMAL(6,2)` | 噪音 |
| `received_at` | `TIMESTAMPTZ NOT NULL` | 数据采集时间 |
| `retrieved_at` | `TIMESTAMPTZ DEFAULT NOW()` | 本系统拉取时间 |
| `stale_data` | `BOOLEAN DEFAULT FALSE` | 是否超过 30 分钟 |

索引：

- `idx_sensor_readings_device_received(device_id, received_at DESC)`
- `idx_sensor_readings_precinct_received(precinct_id, received_at DESC)`

重要风险：

- 当前没有唯一约束。
- 但 `dataPoller.js` 插入时用了 `ON CONFLICT DO NOTHING`。
- 在 PostgreSQL 中，如果没有唯一约束或排他约束可触发 conflict，`ON CONFLICT DO NOTHING` 不能防重复；更严重的是某些写法会报错：`there is no unique or exclusion constraint matching the ON CONFLICT specification`。这里没有指定 conflict target，通常语法允许，但不会避免重复数据。
- 建议后续加唯一约束，例如 `(device_id, received_at)`。

### `backend/src/db/migrations/002_create_precinct_scores.sql`

建表：`precinct_scores`

用途：保存 precinct 级别的聚合舒适度分数。

字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `SERIAL PRIMARY KEY` | 自增主键 |
| `precinct_id` | `VARCHAR(50) NOT NULL` | precinct ID |
| `precinct_name` | `VARCHAR(100) NOT NULL` | precinct 名称 |
| `comfort_score` | `INTEGER NOT NULL CHECK 0..100` | 舒适度分数 |
| `comfort_label` | `VARCHAR(20)` | `Comfortable` / `Caution` / `High Risk` |
| `temperature` | `DECIMAL(5,2)` | 平均气温 |
| `humidity` | `DECIMAL(5,2)` | 平均湿度 |
| `wind_speed` | `DECIMAL(5,2)` | 平均风速 |
| `pm25` | `DECIMAL(6,2)` | 平均 PM2.5 |
| `activity_count` | `INTEGER DEFAULT 0` | 活动量，当前固定为 0 |
| `activity_level` | `VARCHAR(10)` | `Low` / `Medium` / `High` |
| `sensor_count` | `INTEGER DEFAULT 0` | 参与聚合的传感器数量 |
| `stale_data` | `BOOLEAN DEFAULT FALSE` | 是否任一最新读数 stale |
| `calc_timestamp` | `TIMESTAMPTZ DEFAULT NOW()` | 计算时间 |

索引：

- `idx_precinct_scores_precinct_calc(precinct_id, calc_timestamp DESC)`

### `backend/src/routes/precincts.js`

职责：定义所有后端 API。

#### `GET /api/health`

返回：

```json
{
  "status": "ok",
  "timestamp": "ISO time"
}
```

用途：健康检查、保持 Render 服务唤醒。

#### `GET /api/precincts/current`

用途：返回每个 precinct 最新一条舒适度分数。

SQL 逻辑：

```sql
SELECT DISTINCT ON (precinct_id) ...
FROM precinct_scores
ORDER BY precinct_id, calc_timestamp DESC
```

返回结构：

```json
{
  "precincts": [
    {
      "id": "cbd",
      "name": "Melbourne CBD",
      "comfort_score": 44,
      "comfort_label": "Caution",
      "temperature": 24.5,
      "humidity": 58.2,
      "wind_speed": 10.2,
      "pm25": 12.4,
      "activity_count": 0,
      "activity_level": "Low",
      "stale_data": false,
      "last_updated": "ISO time",
      "lat": -37.8155,
      "lng": 144.969
    }
  ]
}
```

前端使用位置：

- `frontend/src/stores/precinct.js` 的 `fetchCurrentPrecincts()`。
- `frontend/src/views/MapView.vue` 的 `fetchAndRenderPrecincts()`。

#### `GET /api/precincts/compare?a=cbd&b=southbank`

用途：返回两个 precinct 的最新分数。

Query：

- `a`：第一个 precinct ID，必填。
- `b`：第二个 precinct ID，必填。

返回：

```json
{
  "precincts": [PrecinctScore, PrecinctScore]
}
```

注意：

- 如果数据库里某个 precinct 没有分数，返回数组可能少于 2 个。
- 当前没有检查 `a`、`b` 是否在 `precincts.json` 中。

#### `GET /api/precincts/:id/today`

用途：根据最新分数返回推荐和准备建议。

返回结构：

```json
{
  "precinct_id": "cbd",
  "date": "2026-04-15",
  "recommendation": "Good time to travel...",
  "recommendation_basis": {
    "current_temp": 24,
    "current_humidity": 58,
    "current_activity": "Low"
  },
  "preparation_advice": []
}
```

前端使用位置：

- `frontend/src/stores/precinct.js` 的 `fetchTodayRecommendation()`。
- `frontend/src/components/PrecinctCard.vue`。

#### `GET /api/furniture?precinct=all&type=all`

用途：返回街道设施 GeoJSON。

Query：

- `precinct`：必填，但当前代码只检查是否存在，没有真正按 precinct 过滤。
- `type`：可选，`drinking_fountain` / `bicycle_rail` / `all`。

外部数据源：

```txt
https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/street-furniture-including-bollards-bicycle-rails-bins-drinking-fountains-horse-/records
```

失败 fallback：

- `backend/config/furniture.json`
- 当前 fallback 内容是空 FeatureCollection。

重要风险：

- 参数 `precinct` 目前没有实际过滤作用。
- fallback 文件为空，所以外部 API 挂掉时地图不会显示任何设施。

### `backend/src/scheduler/dataPoller.js`

职责：

- 拉 City of Melbourne microclimate sensor 数据。
- 存入 `sensor_readings`。
- 按 precinct 聚合最新读数。
- 调用 `calculateComfortScore()` 写入 `precinct_scores`。
- 每小时执行一次。

关键常量：

```js
const COM_API_URL = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/microclimate-sensors-data/records';
```

核心函数：

| 函数 | 作用 |
| --- | --- |
| `fetchSensorReadings()` | 对 `precincts.json` 中每个设备分别请求最新 5 条数据 |
| `storeReading(reading, precinctId)` | 把外部 API 字段映射到 `sensor_readings` |
| `calculateAndStorePrecinct(precinct)` | 查询每个设备最新读数，求平均，写入 `precinct_scores` |
| `pollAndStore()` | 完整的一轮拉取、存储、计算 |
| `start()` | 启动时立即执行一次，然后每小时执行 |

外部 API 字段到数据库字段映射：

| 外部字段 | 数据库字段 |
| --- | --- |
| `device_id` | `device_id` |
| `sensorlocation` | `sensor_location` |
| `latlong.lat` | `lat` |
| `latlong.lon` | `lng` |
| `airtemperature` | `air_temperature` |
| `relativehumidity` | `relative_humidity` |
| `averagewindspeed` | `average_wind_speed` |
| `gustwindspeed` | `gust_wind_speed` |
| `atmosphericpressure` | `atmospheric_pressure` |
| `pm25` | `pm25` |
| `pm10` | `pm10` |
| `noise` | `noise` |
| `received_at` | `received_at` |

重要风险：

- 如果 City of Melbourne API 实际字段名变化，所有读数会变成 null。
- `activityCount` 当前固定为 `0`，活动量数据还没接入。
- `calculateComfortScore()` 只使用 temperature、humidity、activityCount，没有使用 wind 或 PM2.5。
- 如果某个 precinct 没有任何 sensor_readings，会跳过，不会生成分数。
- `stale_data` 逻辑是任一最新设备 stale，则整个 precinct stale。

### `backend/src/scoring/comfortScore.js`

职责：舒适度算法。

默认权重：

```js
const DEFAULT_WEIGHTS = {
  temperature: 0.60,
  humidity: 0.30,
  activity: 0.10
};
```

stale 阈值：

```js
const STALE_THRESHOLD_MS = 30 * 60 * 1000;
```

算法：

```js
temperatureScore = ((40 - temperature) / 40) * 100
humidityScore = ((100 - humidity) / 100) * 100
activityScore = ((500 - activityCount) / 500) * 100

score = round(
  temperatureScore * 0.60 +
  humidityScore * 0.30 +
  activityScore * 0.10
)
```

标签：

- `score >= 70`：`Comfortable`
- `score >= 40`：`Caution`
- `< 40`：`High Risk`

活动等级：

- `< 100`：`Low`
- `< 300`：`Medium`
- `>= 300`：`High`

重要风险：

- 当前气温越低分数越高，0 度会得 100 分，40 度得 0 分。这未必符合“舒适”概念，可能只是“高温风险”模型。
- activity 当前在 poller 里固定 0，所以 activityScore 恒为 100，给总分固定贡献 10 分。
- `validateWeights()` 要求权重和严格接近 1，但前端权重没有传到后端，所以用户调整权重不会影响后端分数。

### `backend/src/scoring/comfortScore.test.js`

职责：Jest 单元测试。

覆盖：

- 温度归一化。
- 湿度归一化。
- 活动归一化。
- 默认权重分数。
- High Risk 标签。
- stale 判断。
- recommendation。
- preparation advice。

注意：

- 测试字符串里存在乱码，例如 `鈥?`、`掳C`、`碌g/m鲁`。
- `npm test` 在当前沙箱默认 worker 模式报 `spawn EPERM`。
- `npx jest --runInBand` 已通过：20 tests passed。

### `backend/config/precincts.json`

当前只有 4 个 precinct：

| id | name | lat | lng | devices |
| --- | --- | --- | --- | --- |
| `cbd` | Melbourne CBD | -37.8155 | 144.9690 | `ICTMicroclimate-02`, `ICTMicroclimate-03`, `ICTMicroclimate-08` |
| `east-melbourne` | East Melbourne | -37.8161 | 144.9745 | `ICTMicroclimate-01`, `ICTMicroclimate-06`, `ICTMicroclimate-07`, `ICTMicroclimate-10`, `ICTMicroclimate-11` |
| `docklands` | Docklands | -37.8204 | 144.9591 | `ICTMicroclimate-05` |
| `southbank` | Southbank | -37.8223 | 144.9522 | `ICTMicroclimate-09` |

重要风险：

- `CLAUDE_CODE_REVIEW.md` 的 AC 1 要求 12 个 precinct，但当前配置只有 4 个。
- README 解释说 City of Melbourne microclimate sensors 当前只覆盖 4 个 precinct。这和 AC 清单冲突，需要团队确认以哪个为准。

### `backend/config/furniture.json`

当前内容：

```json
{ "type": "FeatureCollection", "features": [] }
```

含义：

- 街道设施 API 失败时，fallback 什么都不显示。

## 4. 前端目录与文件

### `frontend/package.json`

前端脚本：

- `npm run dev`：Vite dev server。
- `npm run build`：Vite production build。
- `npm run preview`：预览构建结果。
- `npm run lint`：运行 oxlint 和 eslint，并自动 fix。
- `npm run format`：格式化 `src/`。

依赖：

- `vue`
- `vue-router`
- `pinia`
- `axios`
- `leaflet`

### `frontend/.env.local`

实际值未展开。当前变量名：

- `VITE_API_BASE_URL`：前端 API base URL，例如 `http://localhost:3000` 或 Render API URL。

### `frontend/src/main.js`

职责：

- 引入全局 CSS。
- 创建 Vue app。
- 注册 Pinia。
- 注册 Vue Router。
- 挂载到 `#app`。

### `frontend/src/App.vue`

职责：

- 根组件。
- 渲染 `<RouterView />`。
- 设置全局基础样式。

### `frontend/src/router/index.js`

当前路由：

| path | name | component |
| --- | --- | --- |
| `/` | `map` | `MapView.vue` |

### `frontend/src/stores/precinct.js`

Pinia store：`usePrecinctStore`

状态：

| 变量 | 类型 | 说明 |
| --- | --- | --- |
| `precincts` | `ref([])` | 当前所有 precinct score |
| `selectedPrecinct` | `ref(null)` | 当前选中的 precinct ID |
| `comparePrecincts` | `ref([])` | 对比列表，最多两个 ID |
| `loading` | `ref(false)` | 加载状态 |
| `error` | `ref(null)` | 错误消息 |
| `lastFetched` | `ref(null)` | 最近拉取时间 |
| `todayData` | `ref({})` | 按 precinct ID 缓存 `/today` 返回 |

computed：

- `getPrecinctById(id)`：按 ID 查 precinct。
- `isComparing`：`comparePrecincts.length === 2`。
- `betterPrecinct`：两者中 `comfort_score` 更高的 precinct，平分返回 null。

actions：

| 函数 | 后端接口 | 说明 |
| --- | --- | --- |
| `fetchCurrentPrecincts()` | `GET /api/precincts/current` | 拉全部最新分数 |
| `selectPrecinct(precinctId)` | 无 | 选择/取消选择 marker |
| `addToCompare(precinctId)` | 无 | 加入对比，满 2 个时替换最旧 |
| `clearCompare()` | 无 | 清空对比 |
| `fetchComparison(idA, idB)` | `GET /api/precincts/compare` | 拉两个 precinct 最新分数 |
| `fetchTodayRecommendation(precinctId)` | `GET /api/precincts/:id/today` | 拉推荐建议 |

重要风险：

- `API_BASE_URL = import.meta.env.VITE_API_BASE_URL` 如果未配置，实际请求会变成 `undefined/api/...`。
- `loading` 是全局一个 boolean；如果多个请求并发，会互相覆盖状态。

### `frontend/src/stores/preferences.js`

Pinia store：`usePreferencesStore`

状态：

```js
const DEFAULT_WEIGHTS = { temperature: 60, humidity: 30, activity: 10 }
const STORAGE_KEY = 'easemove_weights'
```

职责：

- 保存用户偏好权重。
- 校验三个权重相加必须等于 100。
- 写入 `localStorage`。
- 提供 `weightsAsDecimals`。

重要风险：

- 权重只存在前端 localStorage。
- 后端计算分数时仍使用 `comfortScore.js` 的 `DEFAULT_WEIGHTS`。
- `WeightSlider.vue` 监听权重变化后只重新调用 `fetchCurrentPrecincts()`，并没有把权重传给后端或在前端重新计算分数。
- 所以“用户可调权重影响舒适度分数”当前并未真正实现。

### `frontend/src/views/MapView.vue`

职责：主地图页面。

关键变量：

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const MELBOURNE_CENTER = [-37.814, 144.963]
const REFRESH_INTERVAL_MS = 5 * 60 * 1000
```

地图对象：

```js
let map = null
let markerLayer = null
let facilitiesLayer = null
let refreshTimer = null
```

当前 Leaflet tile：

```js
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 19
}).addTo(map)
```

当前地图刷新：

- `onMounted()` 加载偏好、初始化地图、拉 precinct 数据。
- 每 5 分钟调用一次 `fetchAndRenderPrecincts()`。
- 后端 poller 每 1 小时更新一次数据库，所以前端 5 分钟刷新不一定会看到新数据。

过滤逻辑：

- `activeFilter` 保存当前 comfort label。
- `filteredPrecincts` 根据 label 过滤 marker。
- `watch(filteredPrecincts, renderMarkers)` 在过滤或数据变化时重绘 marker。

街道设施：

- 点击按钮调用 `/api/furniture?precinct=all&type=all`。
- 返回 GeoJSON 后用 `L.geoJSON()` 加层。

重要风险：

- `/api/furniture` 的 `precinct=all` 后端不真正过滤 precinct。
- `activeFilter` 是当前文件里的状态，不进入 URL 或 store。
- `watch(filteredPrecincts, renderMarkers)` 没有 `{ deep: true }`，但因为 `fetchCurrentPrecincts()` 会替换数组引用，一般仍会触发。

### `frontend/src/views/CompareView.vue`

职责：显示两个 precinct 的对比。

数据来源：

- `precinctStore.comparePrecincts`
- `precinctStore.getPrecinctById(id)`
- `precinctStore.betterPrecinct`

重要点：

- 本组件本身不主动调用 `/api/precincts/compare`。
- 目前点击 `PrecinctCard` 的 Compare 按钮只调用 `addToCompare()`，并没有调用 `fetchComparison()`。
- 因为 `MapView` 已经有 `/current` 数据，所以对比通常能显示；但 `fetchComparison()` 这个 action 当前可能没有被 UI 使用。

### `frontend/src/components/PrecinctCard.vue`

职责：marker 点击后的详情卡片。

输入：

```js
precinctId: String, required
```

数据：

- `precinct`：从 store 的 `getPrecinctById()` 拿。
- `today`：从 `todayData[precinctId]` 拿。
- `preparationAdvice`：`today.preparation_advice`。

生命周期：

- `onMounted(loadTodayRecommendation)`
- `watch(() => props.precinctId, loadTodayRecommendation)`

按钮：

- Close：取消选择。
- Compare：加入对比列表。
- I Want to Go：重新拉 `/today`。

重要风险：

- 文案里有乱码，例如 `掳C`，本应是 `°C`。
- 如果 `/today` 失败，卡片仍显示主体数据，但推荐区域可能为空。

### `frontend/src/components/PrecinctMarker.js`

职责：创建 Leaflet DivIcon。

颜色映射：

```js
Comfortable: '#22c55e'
Caution: '#eab308'
High Risk: '#ef4444'
stale: '#9ca3af'
```

重要点：

- stale 时 marker 变灰，label 后加 `!`。
- HTML 字符串直接拼接 `precinct.comfort_label`，当前数据来自后端固定 enum，风险较低。

### `frontend/src/components/WeightSlider.vue`

职责：用户调节 comfort score 权重 UI。

逻辑：

- 三个滑块：temperature、humidity、activity。
- 调一个滑块时，另外两个按原比例重新分配，确保总和 100。
- 每次权重变化后调用 `precinctStore.fetchCurrentPrecincts()`。

重要风险：

- 没有把权重传给后端。
- 没有在前端基于当前传感器值重新计算 `comfort_score`。
- 所以 UI 看起来能调，但地图分数不会因为权重改变。

### `frontend/src/assets/`

| 文件 | 作用 |
| --- | --- |
| `base.css` | Vite/Vue 模板基础样式。 |
| `main.css` | 引入 `base.css`，设置 `#app` 全局尺寸和链接样式。 |
| `logo.svg` | Vue 默认 logo 资源，当前运行界面不一定使用。 |

### `frontend/public/favicon.ico`

浏览器标签页图标。

### `frontend/dist/`

构建输出目录。由 `npm run build` 生成，不建议手动改。

## 5. 前后端接口字段契约

### `PrecinctScore`

后端 `/api/precincts/current` 和 `/api/precincts/compare` 返回，前端多处依赖：

```ts
type PrecinctScore = {
  id: string
  name: string
  comfort_score: number
  comfort_label: 'Comfortable' | 'Caution' | 'High Risk'
  temperature: number | null
  humidity: number | null
  wind_speed: number | null
  pm25: number | null
  activity_count: number
  activity_level: 'Low' | 'Medium' | 'High' | null
  stale_data: boolean
  last_updated: string
  lat: number | null
  lng: number | null
}
```

前端使用字段：

- marker：`id`, `lat`, `lng`, `comfort_label`, `stale_data`
- card：`name`, `last_updated`, `stale_data`, `comfort_score`, `comfort_label`, `temperature`, `humidity`, `activity_level`, `wind_speed`
- compare：`name`, `last_updated`, `stale_data`, `comfort_score`, `comfort_label`, `temperature`, `humidity`, `activity_level`, `wind_speed`

### `TodayRecommendation`

后端 `/api/precincts/:id/today` 返回，前端 `PrecinctCard.vue` 使用：

```ts
type TodayRecommendation = {
  precinct_id: string
  date: string
  recommendation: string
  recommendation_basis: {
    current_temp: number | null
    current_humidity: number | null
    current_activity: 'Low' | 'Medium' | 'High' | null
  }
  preparation_advice: string[]
}
```

### `Furniture GeoJSON`

后端 `/api/furniture` 返回，前端 `MapView.vue` 使用：

```ts
type FurnitureFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Point'
      coordinates: [number, number]
    }
    properties: {
      asset_type: string
      location_description: string
      status: string
    }
  }>
}
```

## 6. 数据库设计与数据流

### 原始数据表：`sensor_readings`

来源：City of Melbourne `microclimate-sensors-data` API。

写入方：

- `dataPoller.js` 的 `storeReading()`。

读取方：

- `dataPoller.js` 的 `calculateAndStorePrecinct()`。

主要用途：

- 保存设备级别读数。
- 每个 precinct 按设备取最新一条，再做平均。

### 聚合表：`precinct_scores`

来源：

- `sensor_readings` 最新读数聚合。
- `comfortScore.js` 算法计算。

写入方：

- `dataPoller.js` 的 `calculateAndStorePrecinct()`。

读取方：

- `/api/precincts/current`
- `/api/precincts/compare`
- `/api/precincts/:id/today`

### 当前聚合规则

对每个 precinct：

1. 查询该 precinct 下每个 device 最新一条读数。
2. 对 temperature、humidity、wind、pm25 做平均。
3. 如果 temperature 为 null，跳过该 precinct。
4. 调用：

```js
calculateComfortScore({
  temperature,
  humidity: humidity ?? 50,
  activityCount: 0
})
```

5. 插入一条新的 `precinct_scores`。

## 7. 当前最值得优先排查的问题

### P0：迁移脚本可能连不上 Neon

文件：`backend/src/db/migrate.js`

运行时 DB 连接有 SSL：

```js
ssl: { rejectUnauthorized: false }
```

迁移脚本没有 SSL：

```js
new Pool({ connectionString: process.env.DATABASE_URL })
```

如果 Neon 要求 SSL，迁移失败，导致表根本没建好。

建议：

- 让 `migrate.js` 使用和 `db/index.js` 一样的连接配置。
- 或直接复用 `pool`。

### P0：README 写了 `npm run migrate`，但脚本不存在

文件：`backend/package.json`

当前 scripts 没有 `migrate`。

建议加：

```json
"migrate": "node src/db/migrate.js"
```

### P0：`sensor_readings` 没有唯一约束，重复数据风险高

文件：`001_create_sensor_readings.sql`、`dataPoller.js`

当前插入：

```sql
ON CONFLICT DO NOTHING
```

但表里没有唯一约束来定义什么算冲突。

建议：

```sql
ALTER TABLE sensor_readings
ADD CONSTRAINT sensor_readings_device_received_unique
UNIQUE (device_id, received_at);
```

新迁移里做，不要直接改已执行过的旧迁移。

### P1：用户调权重不会影响舒适度分数

文件：

- `frontend/src/stores/preferences.js`
- `frontend/src/components/WeightSlider.vue`
- `backend/src/scoring/comfortScore.js`
- `backend/src/scheduler/dataPoller.js`

现状：

- 前端权重只在 localStorage。
- 后端分数由定时任务提前算好。
- API 不接收权重。
- 前端也没有按权重重新计算 score。

解决方向二选一：

1. 后端 API 支持 query weights，例如 `/api/precincts/current?temperature=0.6&humidity=0.3&activity=0.1`，实时计算返回。
2. 后端返回原始 normalized factors，前端根据用户权重计算展示分数。

### P1：Activity 数据未接入

文件：`dataPoller.js`

当前：

```js
activityCount: 0
```

影响：

- activity_level 永远是 `Low`。
- activityScore 永远是 100。
- 总分固定多 10 分。

### P1：AC 要求 12 个 precinct，但配置只有 4 个

文件：

- `CLAUDE_CODE_REVIEW.md`
- `backend/config/precincts.json`
- `README.md`

冲突：

- AC 1 要求 12 个 precinct。
- README 说明 microclimate sensor 只覆盖 4 个 precinct。
- 实际配置只有 4 个。

需要团队确认：

- 是必须显示 12 个 precinct，缺数据的 precinct 用 fallback/估算？
- 还是只显示有传感器的 4 个 precinct，并修改 AC？

### P1：编码乱码影响用户界面和测试

出现位置：

- `README.md`
- `CLAUDE_CODE_REVIEW.md`
- `backend/src/routes/precincts.js` 注释
- `backend/src/db/index.js` 注释
- `backend/src/db/migrate.js` 注释/日志
- `backend/src/scheduler/dataPoller.js` 日志
- `backend/src/scoring/comfortScore.js` 用户文案
- `backend/src/scoring/comfortScore.test.js`
- `frontend/src/components/PrecinctCard.vue`
- `frontend/src/views/CompareView.vue`

例子：

- `鈥?` 本应是破折号或 apostrophe。
- `掳C` 本应是 `°C`。
- `碌g/m鲁` 本应是 `µg/m³`。

建议：

- 统一文件编码为 UTF-8。
- 修复文案和测试 expected string。

### P2：街道设施 fallback 为空

文件：`backend/config/furniture.json`

外部 API 失败时，地图设施层为空。

建议：

- 放入少量静态 fallback 点。
- 或前端明确显示“设施数据暂不可用”。

### P2：`/api/furniture` 的 precinct 参数没有实际过滤

文件：`backend/src/routes/precincts.js`

当前只检查 `precinct` 是否存在，不按 precinct 做空间过滤或属性过滤。

### P2：前端刷新频率和后端更新频率不一致

前端：

```js
REFRESH_INTERVAL_MS = 5 * 60 * 1000
```

后端：

```js
cron.schedule('0 * * * *', pollAndStore)
```

含义：

- 前端每 5 分钟拉一次。
- 数据库每 1 小时更新一次。
- 大多数刷新会拿到同一批数据。

## 8. 本次本地验证结果

前端：

```txt
cd frontend
npm run build
```

结果：通过。

后端：

```txt
cd backend
npm test
```

结果：当前沙箱默认 worker 模式 `spawn EPERM`。

后端单进程测试：

```txt
cd backend
npx jest --runInBand
```

结果：通过，`20 passed`。

## 9. 建议下一步排查顺序

1. 先确认数据库表是否已经创建成功。
2. 检查 `sensor_readings` 是否有数据，尤其是 `device_id`、`received_at`、`air_temperature`、`relative_humidity`。
3. 检查 `precinct_scores` 是否有每个 precinct 的最新记录。
4. 修复 `migrate` 脚本 SSL 与 package script。
5. 给 `sensor_readings(device_id, received_at)` 加唯一约束。
6. 决定 4 precinct vs 12 precinct 的产品口径。
7. 决定用户权重是在后端实时算，还是前端实时算。
8. 修复乱码，避免 UI 和测试继续污染。

