<div align="center">

# podcast-prompt-pipeline

<a href="README.md"><img src="https://img.shields.io/badge/English-141B1F?style=for-the-badge" alt="English"></a>
<a href="README.zh-CN.md"><img src="https://img.shields.io/badge/简体中文-C6A15A?style=for-the-badge" alt="简体中文"></a>

一套让 Claude Opus 5.5 按提示词流水线制作播客单集的 Claude Code 技能。
属于 [opus-video-skills](../../README.zh-CN.md) 合集。

</div>

## 概述

该技能让 Claude Opus 5.5 从一个选题出发，产出完整单集：标题、通过校验的分块脚本、逐块语音合成，以及带章节标记与节目简介的母带 MP3。

它移植自 [Vivian Lima 的 `prompts_for_podcast_by-IA`](https://github.com/Vivianflima/prompts_for_podcast_by-IA) —— 一个在 DIO Santander 2024 训练营（Fundamentos de IA para Devs）中完成的项目。原项目用 ChatGPT 里的提示词链、ElevenLabs 配音、CapCut 做后期，产出了葡语播客《PodQAst Inteligente》，内容关于软件质量与人工智能。真正有价值的是那串提示词，但它们被锁在一个 README 和一段成片 MP4 旁边；本技能把这条链条变成可以跑起来的东西。

## 工作流程

1. **简报。** 确定选题、受众、主播、语言、目标时长、两到三个"承诺点"，以及固定的结束语。简报未定不写脚本。
2. **标题。** 标题提示词产出 5 个候选；播客名字必须能在开场一口气说出来、不需要逐字解释。选定者同时作为单集 ID3 标题。
3. **脚本。** 脚本提示词填充四个职责固定的块 —— `ABERTURA`、`CURIOSIDADE 1`、`CURIOSIDADE 2`、`FINALIZAÇÃO` —— 每块占据确定的比例。口语规则：句子不超过 20 个词，术语当场解释，数字按读法书写。
4. **校验。** `check_script.mjs` 检查 front matter、分块结构、混入语音的 Markdown、"TTS 陷阱"（裸数字、`%`、`R$`、全大写缩写）、句长，以及按各语言每分钟词数估算的时长预算。
5. **配音。** `tts.mjs` 逐块合成，支持 ElevenLabs、OpenAI、macOS `say`、`espeak-ng`；也可以只导出一份清单，交给自带 TTS 的环境去念。
6. **母带。** `assemble.mjs` 放置块间停顿，混入可选的程序化三音签名音与背景音乐，归一化到 −16 LUFS，输出单声道 44.1 kHz 192 kbps MP3 及章节文件。

## 特点

- **提示词原样保留。** 原始葡语提示词逐字收录在 [references/prompts.pt-BR.md](references/prompts.pt-BR.md)，另附英文改写版。
- **分块而非散文。** 四块结构既让成片"像被剪过"，也让合成可以续做：改一块不必重做整集。
- **时长靠估算，不靠事后发现。** 按语言给出词数预算，七分钟的草稿在花掉任何 TTS 额度之前就会被拦下。
- **不依赖任何素材文件。** 签名音由 ffmpeg 振荡器生成，项目里只有文本和你指定的声音。
- **把失败模式写清楚。** 数字读音、跨块音色一致、响度与峰值的区别、ElevenLabs 约 2500 字符的截断 —— 这些才是真正会毁掉单集的地方。

## 示例：PodQAst Inteligente #01

[examples/podqa-01/](examples/podqa-01/) 是一集 3 分 46 秒的葡语节目《O bug que ninguém viu》：把 1999 年火星探测器丢失事件讲成契约测试的教训，再给出一个"可以让模型列举边界用例、但必须人工复核"的可用配方。脚本与简报在库中，音频按机器生成。

## 环境要求

- Claude Code 及 Claude Opus 5.5
- Node.js 18 以上（使用全局 `fetch`）
- ffmpeg（精简构建即可，不需要 `ffprobe`）
- 以下其一：`ELEVENLABS_API_KEY`、`OPENAI_API_KEY`、macOS `say` 或 `espeak-ng`

## 安装

见[合集说明](../../README.zh-CN.md#安装)。以插件方式：

```
/plugin marketplace add tuzhechen2005/opus-video-skills
/plugin install podcast-prompt-pipeline@opus-video-skills
```

## 使用

在 Claude Code 中描述你要的单集：

> 给我的 QA 播客做一集 4 分钟的节目，主题是"不稳定的测试"。

> 把这三条发布说明做成 6 分钟、双主播、中文的单集。

> 写《PodQAst Inteligente》第 12 集，结束语保持不变。

也可以直接用 `/podcast-prompt-pipeline` 调用。技能会创建项目、写简报与标题候选、起草并校验脚本、逐块合成，最后把母带写到 `out/<slug>.mp3`。

## 仓库结构

| 路径 | 说明 |
|---|---|
| `SKILL.md` | Claude 遵循的流程与规则 |
| `template/` | 可运行项目：脚本模板、简报、音色配置、校验器、TTS 适配器、合成器 |
| `template/lib/script.mjs` | 共用的解析器、时长估算与 ffmpeg 辅助函数 |
| `scripts/new_project.sh` | 项目脚手架与工具链检查 |
| `references/prompts.pt-BR.md` | 原始提示词（逐字） |
| `references/prompts.en.md` | 英文改写版，附节目简介提示词 |
| `references/script-format.md` | 分块格式、解析规则、硬错误、词数预算 |
| `examples/podqa-01/` | 完整示例：简报、脚本、音色配置 |

## 致谢

流水线、提示词与节目构想来自 [Vivian Lima](https://github.com/Vivianflima/prompts_for_podcast_by-IA)（MIT 许可），为 [DIO](https://dio.me) 的 Bootcamp Santander 2024 — Fundamentos de IA para Devs 而作。原技术栈为 ChatGPT、ElevenLabs 与 CapCut；本移植保留其提示词方法，用 ffmpeg 取代剪辑软件，使单集可以仅凭脚本复现。本技能由 Claude Opus 5.5 在 Claude Code 中完成。

## 许可

MIT，见仓库 [LICENSE](../../LICENSE)。
