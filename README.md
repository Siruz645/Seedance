# 🎬 Seedance Studio Pro

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Video_API-7C3AED?style=for-the-badge)](https://openrouter.ai/)

**Next-Generation Multi-Shot Cinematic Director Studio for ByteDance Seedance & OpenRouter Video API.**

[🇷🇺 Читать на русском (README.ru.md)](README.ru.md)

</div>

---

## ✨ Overview

**Seedance Studio Pro** is a modern, web-based cinematic studio designed for film directors, storytellers, and AI creators. It provides an end-to-end interface for multi-scene video production powered by the state-of-the-art **ByteDance Seedance** video diffusion transformer models (`Seedance 2.5`, `Seedance 2.0`, `Seedance 2.0 Fast`, `Seedance 2.0 Mini`, `Seedance 1.5 Pro`) via the **OpenRouter Video API**.

---

## 🚀 Key Features

### 1. 🔗 Cascade Multi-Shot Keyframe Chaining
* **Seamless Continuity:** Automatically extracts the final frame of Scene #$N$ and chains it as the initial starting frame (`first_frame`) of Scene #$N+1$.
* **Full Director Control:** Choose between automatic inheritance, custom keyframe selection from any prior scene, or manual file upload.

### 2. 🛡️ Real-Time Anti-Detect Noise Filter (Privacy Guard Bypass)
* **Moderation Bypass:** Built-in client-side Canvas film grain injection (~50% calibrated grain) that breaks strict biometric face point detection (bypassing ByteDance `InputImageSensitiveContentDetected.PrivacyInformation` errors) while keeping geometry, lighting, and character identity fully intact for DiT diffusion.
* **Live Visual Feedback:** Real-time thumbnail preview and full-resolution lightbox viewer showing instant grain overlay.

### 3. 🎭 Multimodal References & Character Consistency
* **Visual Conditioning:** Attach multiple character, costume, lighting, and style references (`[Image 1]`, `[Image 2]`).
* **One-Click Tag Copy:** Quickly copy prompt tags into your somatic description.
* **Motion & Audio Ingestion:** Support for V2V motion guide videos (`input_videos`) and synchronized speech/SFX audio tracks (`input_audios`).

### 4. 🤖 Built-in AI Director Assistant
* **Cinematic Polish:** Automatically enhances prompt pacing, adds somatic micro-cues (eye saccades, chest rise, natural blinking), configures camera trajectory vectors, and applies 24fps Anti-Slowmo standards.

### 5. 💾 Zero-Loss Auto-Persistence
* **Continuous Auto-Save:** All scenes, prompts, camera angles, loaded references, and configurations are continuously saved to `localStorage`. Your workspace survives browser reloads (`F5`) and accidental tab closures.

### 6. 📥 Automated Local MP4 Archiving & High-Res Lightbox
* **Disk Archiving:** Generated videos are automatically downloaded via authorized backend streams and saved locally to `video/YYYY-MM-DD/scene_#_timestamp.mp4`.
* **Integrated Player:** In-browser MP4 playback with direct download buttons and high-res frame inspection modals.

### 7. 📟 Live API Console & Telemetry
* Real-time monitoring modal tracking payloads, polling intervals, upstream token usage, and status changes.

---

## 🛠️ Supported ByteDance Seedance Models

| Model Slug | Name | Duration | Resolutions | Aspect Ratios | Multimodal Inputs | Audio |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bytedance/seedance-2.5` | **Seedance 2.5** | **4 – 30s** | 480p, 720p | Auto / Freeform | Text, Image, Video, Audio | ✅ Native SFX |
| `bytedance/seedance-2.0` | **Seedance 2.0 Flagship** | 4 – 15s | 480p, 720p, 1080p, **4K** | Auto / Freeform | Text, Image, Video, Audio | ✅ Native SFX |
| `bytedance/seedance-2.0-fast` | **Seedance 2.0 Fast** | 4 – 15s | 480p, 720p | Auto / Freeform | Text, Image | ✅ Native SFX |
| `bytedance/seedance-2.0-mini` | **Seedance 2.0 Mini** | 4 – 15s | 480p, 720p | Auto / Freeform | Text, Image, Video, Audio | ✅ Native SFX |
| `bytedance/seedance-1-5-pro` | **Seedance 1.5 Pro** | 4 – 12s | 480p, 720p, 1080p | Auto / Freeform | Text, Image | ✅ Native SFX |

---

## 📦 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) v18+ (Node.js 20+ recommended)
* An [OpenRouter API Key](https://openrouter.ai/keys) with credits for video generation models.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Siruz645/Seedance.git
   cd Seedance
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional — you can also enter your API key directly in the Studio settings UI):
   ```bash
   # .env.local
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Project Structure

```
seedance/
├── src/
│   ├── app/                     # Next.js App Router & API Endpoints
│   │   ├── api/
│   │   │   ├── openrouter/      # Balance & AI Director endpoints
│   │   │   └── seedance/        # Video generation & status polling
│   │   ├── layout.tsx           # Root Layout
│   │   └── page.tsx             # Main Studio Page
│   ├── components/              # Modular UI Components
│   │   ├── SceneCard.tsx        # Shot card, camera picker, Start Frame & controls
│   │   ├── MediaDropzone.tsx    # Multimodal dropzone with auto-compression & tags
│   │   ├── ImagePreviewModal.tsx# High-resolution lightbox & noise tool
│   │   ├── ExecutionConsoleModal.tsx # Live API telemetry stream
│   │   ├── Header.tsx           # Navigation, balance, API settings
│   │   └── ...
│   ├── lib/                     # Core Business Logic & Clients
│   │   ├── noiseFilter.ts       # Client-side Anti-Detect Canvas Grain Engine
│   │   ├── imageCompressor.ts   # Smart image compressor for upload optimization
│   │   ├── projectStore.ts      # Zustand state store with LocalStorage persistence
│   │   └── seedance.ts          # OpenRouter Video API client
│   └── types/                   # TypeScript interfaces and schemas
├── docs/                        # Complete API & Model Databases
└── video/                       # Auto-saved MP4 video generation archive (ignored by git)
```

---

## 🔒 Privacy & Safety Standard

* **Zero-Leakage:** Your OpenRouter API Key is stored locally in your browser's `localStorage` and never transmitted to third-party tracking servers.
* **Binary Exclusion:** Generated heavy `.mp4` video files and test scratch scripts are excluded in `.gitignore` to keep the repository lightweight.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
