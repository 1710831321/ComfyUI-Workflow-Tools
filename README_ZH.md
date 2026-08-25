[English](README.md) | [中文](README_ZH.md)

# ComfyUI-Workflow-Tools

ComfyUI 自定义节点集合，专注于提升工作流效率：在单节点管理多个 LoRA、用可复用段落组合提示词、一键切换分辨率、路由图生图 / 文生图 Latent，以及从生成图中提取提示词。

### 语言

前端界面默认使用**中文**（`js/` 目录下各 `.js` 文件顶部 `const LANG = "zh"`）。如需切换内置控件标签为英文，将对应 `.js` 文件中的 `"zh"` 改为 `"en"`。节点显示名在 [__init__.py](__init__.py) 的 `NODE_DISPLAY_NAME_MAPPINGS` 中注册为中文。

### 节点总览

| 节点 | 显示名 | 分类 | 用途 |
|------|--------|------|------|
| MultiLoraLoader | 多 LoRA 加载器 | loaders | 在单节点堆叠并开关多个 LoRA |
| PromptSegments | 提示词段落 | conditioning | 用标签自动补全组合多段提示词 |
| ResolutionSwitcher | 分辨率切换器 | latent | 在预设分辨率间一键切换 |
| Img2ImgTxt2ImgSwitch | 图生图 / 文生图 切换 | latent | 用带标签的开关路由图生图 / 文生图 Latent |
| PromptExtractor | 提示词提取器 | image | 从 PNG 元数据提取正向 / 反向提示词 |

---

## 多 LoRA 加载器

在单个节点中管理多个 LoRA。每行 LoRA 都有独立的开关、权重控件、触发词和备注。所有已启用 LoRA 的触发词会拼接为一个 STRING 输出，可直接接入提示词节点。

![preview](images/preview.png)

### 功能特性

- **单 LoRA 开关** — 胶囊开关可独立启用 / 禁用每个 LoRA，无需删除
- **权重控件** — 同一单元格支持三种交互方式：
  - 点击 `◀` / `▶` 箭头进行 ±0.01 微调
  - 点击数值直接输入精确值（范围：-100 到 100）
  - 在数值区域水平拖拽快速调整
- **可搜索 LoRA 下拉框** — 基于 DOM 的下拉框：
  - 搜索框可匹配完整路径、文件名、下划线转空格后的变体
  - 分组文件夹树（自动展开当前选中 LoRA 所在的文件夹）
  - 键盘导航（`↑`/`↓` 移动，`Enter` 确认，`Esc` 关闭）
  - 匹配字符高亮及匹配数提示
- **触发词本地记忆** — 每个 LoRA 的触发词存储在 `localStorage` 的 `lora_trigger_<名称>` 键下，再次选择同一 LoRA 时自动填充
- **触发词输出** — 将所有已启用 LoRA 的触发词以 `", 词1, 词2, "` 格式拼接，输出到 `triggers` STRING
- **备注** — 每个 LoRA 可添加自由文本备注
- **动态增删** — 用虚线 `＋ 添加 LoRA` 按钮新增行，红色 `✕` 按钮删除行
- 节点最小宽度：500px

### 输入 / 输出

- **输入**：`model`（MODEL）、`lora_stack`（STRING JSON，隐藏控件）
- **输出**：`model`（MODEL）、`triggers`（STRING）

### 使用方法

添加 **多 LoRA 加载器** 节点，将模型接入 `model` 输入。点击 LoRA 行的下拉框选择 LoRA，调整权重，按需设置触发词。将 `triggers` 输出接入文本输入节点（如提示词段落的 `prompts_in`）即可自动注入触发词。

---

## 提示词段落

将多段提示词合并到一个节点中，支持 Danbooru 标签自动补全、按顺序输出、外部文本插入位置可控，以及可选的直接 CLIP 调节输出。

![preview2](images/preview2.png)

### 功能特性

- **动态段落** — 用 `＋ 添加段落` 按钮随时增删提示词段落
- **段落独立开关** — 每段可单独启用 / 禁用，禁用的段落折叠为单行
- **标签** — 每段可添加自由文本标签便于管理（第一段默认标签为"质量词"）
- **按序号重排** — 编辑段落左侧的数字框即可将段落移动到该位置
- **标签自动补全** — 输入 2 个以上字符即从 10,000+ Danbooru 标签字典（`js/tags/tag_dictionary.json`）中匹配，最多显示 10 条建议：
  - 点击标签即插入（下划线自动转为空格）
  - 键盘导航：`↑`/`↓` 跨行移动，`←`/`→` 行内移动，`Tab` 插入高亮标签
- **插入位置控制** — `insert_pos` 数字指定外部 `prompts_in` 文本的插入位置（1 = 第 1 段前，2 = 第 2 段前，以此类推；超出段落数则追加到末尾）
- **直接 CLIP 输出** — 可选连接 CLIP 模型，直接产出 `conditioning` 输出接入 KSampler，无需独立的 CLIP 文本编码节点
- **自动调整高度** — 每段文本框根据内容自动增高
- 所有启用段落的文本以 `", "` 连接后输出

### 输入 / 输出

- **必填**：`segments`（STRING JSON，隐藏控件）、`insert_pos`（INT，默认 1，隐藏控件）
- **可选**：`prompts_in`（STRING，强制输入）、`clip`（CLIP）
- **输出**：`prompts_out`（STRING）、`conditioning`（CONDITIONING）

### 使用方法

添加 **提示词段落** 节点，在各段文本框中输入提示词。可选地将 `prompts_in` 接入外部文本（如 LoRA 触发词），插入位置由 `insert_pos` 决定。将 `prompts_out` 接入 CLIP 文本编码器，或连接 CLIP 模型后直接用 `conditioning` 输出接入 KSampler。

---

## 分辨率切换器

快速在预设的分辨率之间切换，直接输出对应尺寸的空 Latent，行为与 ComfyUI 原生 EmptyLatentImage 一致。

![preview3](images/preview3.png)

### 功能特性

- **单选预设** — 同一时刻只有一个预设处于激活状态；点击其他行即切换激活标志（点击当前激活行无效，确保始终有一个激活分辨率）
- **单预设字段** — 宽、高、批处理数量
- **8 倍数对齐** — 宽和高自动对齐到 8 的倍数（最小 16），符合 ComfyUI 潜空间要求
- **默认预设** — 自带 1024×1024、896×1152、1152×896（批处理均为 1），第一项默认激活
- **动态增删** — 用 `＋ 添加分辨率` 按钮新增预设，红色 `✕` 按钮删除
- **防御性回退** — 若无激活预设或 JSON 无效，回退到 1024×1024 批处理 1，节点不会报错
- 输出形状为 `[batch, 4, height//8, width//8]` 的 Latent 张量

### 输入 / 输出

- **必填**：`presets`（STRING JSON，隐藏控件）
- **输出**：`LATENT`

### 使用方法

添加 **分辨率切换器** 节点，将预设尺寸调整为你常用的值，然后点击所需行的开关。将 **LATENT** 输出接入 KSampler 或其他潜空间节点。

---

## 图生图 / 文生图 切换

为 img2img / txt2img 工作流提供带语义标签的 LATENT 切换节点。功能上等价于通用 Switch 节点，但输入槽和开关都标注了实际工作流名称，避免混淆两侧。

### 功能特性

- **可视化开关** — 在画布上绘制的双侧胶囊开关：
  - 右侧 = **文生图**（绿色 `#2e7d32` 背景，激活时亮绿色标签）
  - 左侧 = **图生图**（红色 `#6a1b1b` 背景，激活时亮红色标签）
- **两个可选 LATENT 输入** — `img2img_latent` 与 `txt2img_latent`
- **单个 `latent` 输出** — 根据开关状态转发对应一侧的 Latent
- **状态持久化** — 模式保存在隐藏的 `mode` BOOLEAN 控件中，工作流重新加载后恢复
- **回退行为** — 若只连接一侧输入，无论开关状态都使用已连接的一侧；若两侧均未连接，返回 `None`

### 输入 / 输出

- **必填**：`mode`（BOOLEAN，默认 `true`，隐藏控件，由可视化开关控制）
- **可选**：`img2img_latent`（LATENT）、`txt2img_latent`（LATENT）
- **输出**：`latent`（LATENT）

### 使用方法

添加 **图生图 / 文生图 切换** 节点，将图生图 Latent 接入 `img2img_latent`，文生图 Latent 接入 `txt2img_latent`。点击开关选择哪一路输出到 `latent`。将输出接入 KSampler 或其他潜空间节点。

---

## 提示词提取器

从 ComfyUI 或 WebUI（A1111）生成的 PNG 元数据中提取正向与反向提示词。原生支持使用了提示词段落的 ComfyUI 工作流。

### 功能特性

- **双元数据来源**：
  - ComfyUI API prompt JSON（来自 `prompt` PNG info 键）
  - A1111 `parameters` 文本（解析 `Negative prompt:` 及后续的 `Steps:`、`Sampler:`、`Seed:` 等生成参数）
- **widget-index 引用解析** — 递归解析 ComfyUI 的 `["node_id", widget_idx]` 引用（深度上限 10），追溯上游文本节点
- **原生提示词段落支持** — 遇到 PromptSegments 节点时，解析段落 JSON 并仅合并已启用段落的文本
- **上游文本链** — 对 PromptSegments 节点，同时解析并前置其 `prompts_in` 上游文本
- **反向提示词识别** — 当 CLIPTextEncode / PromptSegments 节点的标题包含以下任一关键词时判定为反向：`negative`、`neg`、`负`、`反面`、`反向`、`负面`、`消极`
- **约定回退** — 无关键词识别反向且正向提示词数 ≥ 2 时，将最后一个视为反向（第一个 = 正向，第二个 = 反向）
- **去重** — 正向和反向列表各自去重，并从正向列表中移除同时出现在反向列表中的条目
- **图像查找** — 通过对像素数据前 4KB 求哈希，在 ComfyUI 的 `input/` 目录中匹配输入图像张量（支持 `.png`、`.jpg`、`.jpeg`、`.webp`、`.bmp`）
- **输出**：`positive` 和 `negative` 均为 STRING（无元数据时 `positive` 返回 `"No prompt metadata found."`）

### 输入 / 输出

- **必填**：`image`（IMAGE）
- **输出**：`positive`（STRING）、`negative`（STRING）

### 使用方法

1. 将源 PNG 复制到 ComfyUI 的 `input/` 目录。
2. 添加标准的 **Load Image** 节点并选择该文件。
3. 将 **Load Image** 的输出 → **提示词提取器**。
4. 按需使用 `positive` / `negative` 的 STRING 输出（如接入提示词段落或 CLIP 文本编码器）。
