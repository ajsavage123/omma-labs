# Ooma Labs Innovation Workspace

Ooma Labs Innovation Workspace is a specialized conceptualization and project management platform built specifically for an innovation lab environment. It acts as an **Innovation Pipeline**, where ideas are pitched, researched, developed, marketed, and finally reviewed by an administration team. It divides the workforce into distinct departments, giving each team specialized tools and access to specific stages in a project's lifecycle.

## 🌟 Key Features

### 🛡️ Role-Based Workrooms
The application operates on strict access control rules and splits users into specific **Designations**:
- **Innovation & Research Team**: The idea generators. They are the only ones allowed to create new projects and oversee the `Ideology` and `Research` stages.
- **Developer & Engineering Team**: The builders. They oversee the `Development` and `Deployment` stages, utilizing developer-specific tools.
- **Business Strategy & Marketing Team**: The promoters. They oversee the `Business` execution plan, defining revenue models and market rollouts.

### 🚀 The Innovation Pipeline
Every project goes through a strict 6-stage pipeline:
1. Ideology 
2. Research
3. Development
4. Deployment
5. Business
6. Admin Review

When a user enters a project, they must **Select their Team**. The dashboard adapts UI dynamically based on the team, showing only relevant stages and quick links to department tools.

### 📊 Admin Control Center
Once a project completes the Business stage, it enters Admin Review. Admins use a dedicated dashboard that tracks lab metrics and evaluates projects across 5 key metrics:
- Problem Importance
- Technical Feasibility
- Market Demand
- Impact Potential
- Development Complexity

The admin generates an **Innovation Score** and can Approve, Reject, or Return the project for improvements.

### 🌍 Global Activity Feed
A real-time timeline tracks every update, stage transition, and note added by any team member across all active projects.

## 🛠️ Tech Stack

- **Frontend Core**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS + `clsx` & `tailwind-merge`
- **Icons & Utils**: `lucide-react`, `date-fns`
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security and Auth)

## 🗄️ Database Architecture

The backend relies on 5 core relational tables in Supabase:
- `users`: Synchronized with Auth, stores designation and role.
- `projects`: Top-level project metadata.
- `project_stages`: Tracks the pipeline stages per project and their status.
- `timeline_logs`: Audit trail tracking every single update a user makes.
- `admin_ratings`: Stores the final metric scores evaluated by admins.

## 🚀 Getting Started

To run this project locally, ensure you have Node.js installed and a configured Supabase project.

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd omma-labs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Initialize Supabase Schema:**
   Run the SQL provided in `supabase_schema.sql` in your Supabase project's SQL Editor to create the necessary tables and RLS policies.

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will start on `http://localhost:5173`.
