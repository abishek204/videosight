# **App Name**: VidInsight AI

## Core Features:

- Video URL Submission & Processing: Allows users to paste a YouTube video URL, which the system processes to safely extract the transcript using YouTube APIs or compliant libraries, implementing caching and rate limiting.
- AI Video Content Summarization: Utilizes the Gemini AI Studio API to generate a concise short summary (TL;DR), a comprehensive detailed summary, and key bullet points with timestamps from the video's transcript.
- AI Conversational Q&A: Provides an interactive chat interface where users can ask questions about the video's content. This tool, powered by the Gemini AI Studio API with contextual memory via Vercel AI SDK, offers insightful answers and follow-up capabilities.
- User Account Management: Supports user registration, login (email and optional OAuth), and logout, including a guest mode with defined usage limits for anonymous users.
- Personalized History Dashboard: Displays a private dashboard where authenticated users can review and revisit their past video summaries and chat interactions, stored in a PostgreSQL/MongoDB database.
- Summary & Transcript Export: Enables users to download the generated summaries (short, detailed, key points) as PDF or text files, and the original video transcript (if available).
- Secure API Endpoints: Backend API routes for transcript extraction, AI summarization calls, and chat queries are handled server-side to protect API keys and ensure efficient processing.

## Style Guidelines:

- The primary color is a deep, professional blue (#1E40A8), selected for its association with intelligence, trust, and clarity, providing a strong visual anchor for key UI elements and calls to action.
- The background color is a subtle, almost off-white (#F2F4F8), derived from the primary blue's hue but heavily desaturated to promote readability and provide a clean, uncluttered canvas for content.
- An energetic, vibrant sky blue (#33CCFF) serves as the accent color. This brighter hue offers a lively contrast to the primary blue, drawing attention to interactive components and important highlights without clashing.
- The 'Inter' font (sans-serif) is recommended for all text elements, providing a modern, objective, and highly legible experience across headlines, body text, and chat interfaces.
- Utilize a suite of minimalist, line-based icons that convey information clearly and support the app's clean, modern aesthetic.
- Embrace a responsive, clean, and intuitive layout featuring well-defined sections, tabbed content for summaries, and a dedicated, clear area for video URL input and chat.
- Implement subtle, functional animations for loading states, chat message sending, and summary generation to enhance user feedback and overall interface smoothness.