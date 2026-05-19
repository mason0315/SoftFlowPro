# SoftFlow Pro: Part C Neural Assessor

## 项目简介 (Introduction)

SoftFlow Pro（Part C 考研翻译智能诊断系统）是一款专为考研英语长难句翻译（Part C）打造的智能辅助与批改工具。基于考研大纲标准的 10 分制评分体系，本系统内置了基于大语言模型的上下文感知引擎（Antigravity Engine）与神经网络纠错技术（NEC v2.4）。为广大考生及语言学习者提供自动化、可视化的翻译评分和深度诊断报告。

## 核心功能 (Core Features)

- **智能多维度评分 (Neural Assessment)**
  提供整体得分以及三大官方核心维度（准确性 Accuracy、完整性 Completeness、通顺度 Fluency）的评分雷达，拆解每个得分点的实际得分表现。
- **深度语言学诊断 (Deep Diagnosis)**
  深入对比英文原句、标准期待（Official Key）和用户译文。自动推演出**语义结构差异（Semantic Analysis）**与**逻辑拆解对比（Structure Mapping）**。
- **精进建议与词汇库归档 (Knowledge Repository)**
  诊断完成后给出明确的后续学习**优化建议面板 (Strategic Upgrades)**，并将句子中的生词与长难句考点自动提取为专属**核心知识点 (Knowledge Repository)**。
- **批量文本录入 (Bulk Data Entry)**
  支持输入整段英语背景材料帮助系统抓取语境，再对应录入多道题面及自身译本。
- **用户会话与记录同步 (Cloud Sync)**
  默认集成 Firebase Auth 与 Firestore，支持一键保存当次试卷的分析诊断数据。支持复盘、回看和整理历史错题记录。
- **中英双语自适应 (Bilingual UI)**
  UI 全局支持一键热切换英文与中文模式，供不同习惯偏好的人群无缝使用。
- **拟物化视觉呈现 (Neumorphism Design)**
  采用优雅的 Soft-UI 新拟态设计模式设计底层界面交互，给高压的学术练习带来温润视觉体验。

## 技术栈选型 (Technology Stack)

- **前端核心:** React 18 搭配 Vite 驱动，使用 TypeScript 提供严谨的类型推导。
- **样式与动画:** Tailwind CSS (含 @utility 自定义拟态阴影) + Motion (f.k.a Framer Motion)。
- **图标系统:** `lucide-react` 提供一致的可视化图标语言。
- **大模型引擎:** Google Gemini 系列 (由 Google AI Studio 后端提供集成支持，基于 System Instructions 进行深度定制)。
- **数据库与账户:** Firebase Authentication (鉴权) & Firestore (文档型云数据库，已配置安全规则)。

## 本地部署与运行 (Local Development)

该应用支持直接从云端导出代码至本地或个人服务器。

1. **安装依赖 (Install Dependencies)**
   ```sh
   npm install
   ```

2. **环境变量准备 (Environment Setup)**
   如果脱离云端环境运行，需确保具备 `.env` 并在其中注入必要的 Firebase 凭证与（若需本地转接的）Gemini API KEY。

3. **启动开发服务器 (Start Dev Server)**
   ```sh
   npm run dev
   ```

4. **生产构建 (Production Build)**
   ```sh
   npm run build
   npm run start
   ```

## 平台项目导出提示
> 在 Google AI Studio 中，应用项目代码可以随时在设置/菜单栏里选中 **Export** 选项直接打包成 ZIP 或者同步推送到你的 GitHub 仓库中。
