# Conceptra

A lightweight React and Vite Biology learning site for Classes 11 and 12.

## Run locally

```bash
npm install
npm run dev
```

## Chapter content

Chapter details are kept together in [`src/data/biologyData.js`](src/data/biologyData.js). Each chapter has a `notesPdf`, `youtubeUrl`, and `questions` field so its resources can be maintained in one place.

### Add handwritten notes

Put PDFs in the matching public folder:

- `public/notes/class11/biology/`
- `public/notes/class12/biology/`

Set that chapter's `notesPdf` to its public URL, for example:

```js
notesPdf: '/notes/class12/biology/principles-of-inheritance-and-variation.pdf',
```

The chapter page checks that a configured PDF is available before showing its view and download links.

### Add a video

Set the chapter's `youtubeUrl` to its YouTube watch URL, for example:

```js
youtubeUrl: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
```

The chapter page embeds valid YouTube links and also provides a link to watch on YouTube.

### Add questions

Add question objects to the chapter's `questions` array. `correctAnswer` should match one of the option strings. `topic` is optional, and `questionType` can be `NEET PYQ` or `Practice`. Only enter a `neetYear` for a verified NEET PYQ; it can be left blank when unknown or for practice questions.

```js
questions: [
  {
    id: 1,
    question: 'What is the basic unit of classification?',
    options: ['Genus', 'Species', 'Family', 'Order'],
    correctAnswer: 'Species',
    explanation: 'A species is the basic unit of classification.',
    topic: 'Taxonomy',
    questionType: 'NEET PYQ',
    neetYear: '',
  },
],
```

### Add a chapter

Add an `[id, title]` pair to the appropriate `class11Chapters` or `class12Chapters` list in `src/data/biologyData.js`. Chapter numbers and the chapter objects are generated from those lists, so no other file needs editing.

## Admin content management

The private admin routes are `/admin/login` and `/admin`. The footer contains the only student-facing link to the login page. Login uses Supabase Auth; there is no frontend password or signup flow.

To enable the admin system:

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, then restart Vite. Never put a Supabase service-role key in a `VITE_` variable or frontend file.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the Biology content tables, admin allowlist, RLS policies, and public notes bucket. Keep those RLS policies enabled.
4. Create the owner account in Supabase Auth (do not enable public signups). Add only the owner's Auth user ID to `public.admin_users`, as shown in the SQL file's final commented example.

After setup, sign in at `/admin/login`. The dashboard can add, edit, publish, and hide chapters; changes to published Biology chapters are loaded by the student pages. Notes PDFs are validated and uploaded to the public `chapter-notes` Storage bucket under a class/subject/chapter path. Questions and YouTube links are saved with their chapter. Without valid project configuration and the SQL setup, login and content management remain unavailable rather than simulating success.
