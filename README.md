# AI To Do List App

## 1. Overview

The AI To Do List App is a custom, single-user web application designed for personalized task and workflow management. It leverages AI to automate task categorization, enrichment, and provides intelligent assistance based on a detailed, predefined data structure specific to the user's needs (Jakub Cerulík).

This project aims to create a highly efficient, minimalist, and reliable alternative to generic task managers, focusing on a specific AI-assisted workflow without direct integration to external services like Asana.

**Core Features:**

*   Simple and fast task creation.
*   AI-powered auto-categorization and enrichment of task details based on user input and a predefined schema.
*   Clear hierarchical task view (Portfolio -> Project -> Section -> Task).
*   Detailed task view displaying all custom fields.
*   Contextual AI chat assistance (both globally and per-task).
*   Advanced filtering and sorting by any task field.
*   CSV data export.
*   Responsive design for desktop (Macbook) and mobile (iPhone).
*   **Task Viewing & Editing:** View detailed task information and edit fields directly on the task page (`/tasks/[id]`).
*   **Task Deletion:** Delete tasks individually from the task detail page or the main list view, with confirmation prompts. (Implemented 2025-04-22)
*   **CSV Import/Export:**
    *   Import tasks from a CSV file via an API endpoint (`/api/csv/import`).

## 2. Tech Stack

*   **Framework:** Next.js (v14+ with App Router)
*   **Language:** TypeScript
*   **UI Library:** Shadcn/ui (using Radix UI + Tailwind CSS)
*   **Styling:** Tailwind CSS
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **AI:** OpenAI API (GPT-4 / GPT-4o or similar)
*   **State Management:** React Context API / Zustand / Jotai (TBD based on complexity)
*   **(Potential):** Background job queue (e.g., Vercel Cron Jobs, BullMQ) for asynchronous AI tasks.

## 3. Project Structure

This project now follows the intended structure (see below and `PROJECTS_FILE_STRUCTURE_DOCUMENTATION.md`). All source, config, and documentation files have been moved to their correct locations as of 2025-04-22.

```
/
├── app/
│   ├── page.tsx
│   └── api/
│       └── tasks/
│           └── route.ts
├── components/
│   ├── TaskForm.tsx
│   └── TaskList.tsx
├── config/
│   └── TASK_FIELD_CONFIG.ts
├── lib/
│   └── prisma.ts
├── prisma/
│   └── schema.prisma
├── public/
├── README.md
├── PRD.txt
├── PLANNING.md
├── TASK.md
├── DONE.md
├── PROJECTS_FILE_STRUCTURE_DOCUMENTATION.md
├── csv_field_documentation.md
├── csv_input_form_documentation.md
├── csv_to_import.csv
```

## 4. Migration Note

All files were reviewed and placed according to the latest documentation and project conventions. This ensures maintainability, clarity, and readiness for further development.

## 5. Next Steps

- Review and update all documentation and configuration files as the project evolves.
- Continue with Phase 1 tasks (Core Task Management features).
- Test and refine the enhanced task detail page with the new Select and MultiSelect components.
- Implement the remaining UI components and functionality described in TASK.md.
- Ensure all dependencies are installed and the project is runnable.

## 6. Recent Updates

- **2025-04-22:** Created custom Select and MultiSelect components for the task detail page
- **2025-04-22:** Enhanced the task detail page with proper input components for all field types
- **2025-04-22:** Setup Jest testing configuration for unit tests
- **2025-04-22:** Implemented comprehensive task deletion functionality with individual and batch operations
- **2025-04-22:** Created emergency task deletion system with direct database access for handling edge cases

---

_Last updated: 2025-04-22 (Comprehensive task deletion system implementation)_
