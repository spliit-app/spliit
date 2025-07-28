# Introduction

This document outlines the complete fullstack architecture for **Conversational Spliit**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

## Starter Template or Existing Project

**Existing Project**: This architecture builds upon the existing mature Spliit application - a production-ready expense sharing application built with Next.js 14, tRPC, and Prisma. 

**Current State Analysis**:
- ✅ **Mature Codebase**: Fully functional expense splitting with sophisticated algorithms
- ✅ **Existing AI Integration**: OpenAI integration for receipt scanning and category extraction
- ✅ **Strong Foundation**: Next.js 14 App Router, tRPC APIs, Prisma ORM, PWA capabilities
- ✅ **International**: 15 language support with next-intl
- ✅ **Production Ready**: Deployed and serving users effectively

**Transformation Scope**: The architecture transformation involves:
1. **Migration from PostgreSQL → Supabase**: Leveraging real-time capabilities for conversational interfaces
2. **Conversational Layer Addition**: Natural language interface with confirmation-based workflows
3. **UX→AX Pattern Implementation**: Transform existing UI patterns into conversational confirmation workflows
4. **Component Reuse Strategy**: Existing forms become confirmation interfaces for AI-parsed intent
5. **Enhanced AI Integration**: Extend existing OpenAI patterns for conversational intelligence

**Constraints from Existing Architecture**:
- Must preserve all existing functionality as fallback
- Maintain current tRPC API contracts for backward compatibility  
- Respect existing business logic and calculation algorithms
- Honor existing i18n implementation across 15 languages
- Preserve existing PWA capabilities and offline functionality

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| Current | 1.0 | Initial conversational architecture for Supabase migration | Winston (Architect) | 
