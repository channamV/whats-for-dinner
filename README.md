# What's for dinner

A family web app for recipes, meal plans and grocery lists. It works on phones and can be added to the home screen.

- **Import recipes from PDFs or photos.** Upload a scanned HelloFresh card, a "Print to PDF" of a web recipe, or photos of both sides of a card. Claude reads it and splits the meal into its separate dishes. For example, the Pesto Mozzarella Piadina card becomes a meal with three dishes: the piadina, the spinach salad, and the balsamic dressing.
- **Cook whole meals or single dishes.** Each dish is its own recipe, so it can be reused or cooked on its own. Meals group dishes together.
- **Scale to the table.** Pick "Feeds 1–6" on any recipe. Ingredients and the amounts written in the steps all adjust. Fixed amounts, such as HelloFresh spice packets, stay the same.
- **Weekly meal plan.** Plan dinners by day, set each night's table size, and let the AI suggest a week from your own library.
- **Grocery lists.** Build a list from a meal, a dish, or the whole week. Duplicate ingredients are combined, units are converted, and items are grouped by aisle. Pantry staples are left off unless you ask for them. Check-offs sync live across everyone's phone.
- **Shared with family.** Everyone in a household sees the same recipes, plan and lists. Invite people with a code from Settings.

Stack: Next.js 16 (App Router) · Supabase (Postgres, auth, storage, realtime) · Claude API · Tailwind CSS 4. Deploys to Vercel.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (the free tier is fine).
2. In the **SQL Editor**, paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the tables, the row-level security rules, the private `recipe-files` storage bucket, and realtime for grocery items.
   With the Supabase CLI you can run `npx supabase link` and then `npx supabase db push` instead.
3. **Authentication → URL Configuration**: set **Site URL** to your app URL (e.g. `https://dinner.hannam.pro`). Add `http://localhost:3000/**` to the redirect URLs for local development.
4. Copy the project URL and publishable (anon) key from **Project Settings → API**.

### 2. Anthropic

Create an API key at [console.anthropic.com](https://console.anthropic.com). Importing a card costs a few cents, and weekly suggestions cost less.

### 3. Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Open http://localhost:3000, create an account, then create your household.

### 4. Deploy to Vercel with hannam.pro

1. Import this repo in [Vercel](https://vercel.com/new) and add the same environment variables.
2. **Settings → Domains**: add `dinner.hannam.pro` (or any subdomain). Vercel shows a CNAME record (`cname.vercel-dns.com`) to add at your DNS provider for hannam.pro.
3. Update the Supabase **Site URL** to the new domain.

Recipe import can take 30–90 seconds. The import route sets `maxDuration = 300`, which is within Vercel's limits with Fluid compute (the default).

## Using it

- **Recipes → Import**: upload one or more files for the same card (up to 10). Review what the AI found, fix anything it misread, untick dishes you don't want, then save as a meal or as individual dishes.
- **Step amounts**: amounts written as `{{1 tbsp}}` in a step scale with the table size. `{{=1 tsp}}` stays fixed. The importer writes these for you.
- **Meal pages**: add existing dishes (for example, a lime crema with a different main) or write a new one.
- **Plan**: add meals per day, change the table size per night, mark nights as cooked, and build the week's grocery list. "Suggest dinners" fills empty days from your library and avoids repeats.

## Development

```bash
npm test          # unit tests (scaling, grocery merging)
npm run lint
npm run typecheck
```

Project layout:

```
src/app/(app)/         signed-in pages: tonight, plan, recipes, meals, lists, settings
src/app/(app)/actions.ts   server actions (all writes except grocery check-offs)
src/app/api/import/    receives uploaded file paths and calls Claude
src/lib/ai/            recipe parser and meal-plan suggester (Claude API)
src/lib/quantity.ts    scaling and fraction formatting
src/lib/grocery.ts     combining ingredients into grocery lines
supabase/migrations/   database schema and security rules
```
