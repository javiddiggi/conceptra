# Conceptra

A lightweight React and Vite learning site for Class 11 and 12 Biology, Physics and Chemistry.

## Run locally

```bash
npm install
npm run dev
```

## Chapter content

Biology keeps its existing chapter IDs and `/class-11/biology/...` and `/class-12/biology/...` student URLs. The student catalog includes ordered Biology, Physics, and Chemistry chapters for both classes; Physics and Chemistry entries are seeded as placeholders and can be published and managed from Admin. Each database chapter has a class, subject, chapter number, `notesPdf`, `youtubeUrl`, and `questions` field. Chapter paths include the subject, for example `/class-11/physics/<chapter-id>`. Empty chapters show notes, video, and question availability states rather than disappearing from the catalog.

The Physics and Chemistry catalogs use the specified NCERT 2026–27 chapter lists: Physics has 14 chapters for each class, Chemistry has 9 chapters for Class 11 and 10 for Class 12. Their order and titles are maintained in `src/data/biologyData.js`.

### Add handwritten notes

Put PDFs in the matching public folder:

- `public/notes/class11/biology/`
- `public/notes/class12/biology/`

Set that chapter's `notesPdf` to its public URL, for example:

```js
notesPdf: '/notes/class12/biology/principles-of-inheritance-and-variation.pdf',
```

Supabase-hosted and same-origin PDFs are checked before showing their view and download links. Admin also accepts Google Drive file share links. Set Drive access to **Anyone with the link — Viewer**; View opens Drive's PDF preview, while Download uses Drive's download endpoint and may behave differently on mobile or require an additional confirmation.

### Add a video

Set the chapter's `youtubeUrl` to its YouTube watch URL, for example:

```js
youtubeUrl: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
```

The chapter page embeds valid YouTube links and also provides a link to watch on YouTube.

### Add questions

The existing question shape is retained. In Admin, use **Bulk Paste Questions** to paste question blocks, inspect and edit the preview, correct validation errors, verify each PYQ year, and append the accepted batch. Use this labeled format, with a blank line between question blocks:

```text
Question: Which quantity is conserved in an isolated system?
A) Momentum
B) Temperature
C) Pressure
D) Density
Answer: A
Explanation: With no external force, total momentum remains constant.
Exam Category: NEET
Topic: Laws of Motion
Exam Year: 2020
Image URL: https://example.com/diagram.png
Solution Image URL: https://example.com/solution.png
```

`Exam Category` supports NEET, JEE Main, JEE Advanced, and Practice in Physics/Chemistry; Biology supports NEET and Practice. Older `Type: NEET PYQ` and `Type: Practice` labels remain accepted. `Exam Year`, `Image URL`, and `Solution Image URL` are separate fields; a year is required for a non-practice batch item and must be confirmed in preview. The parser cannot establish whether a year is historically correct. Existing question objects are not deduplicated or rewritten by sorting. Student-facing ordering is display-only: dated PYQs are newest-first within each topic, same-year order is retained, and practice questions appear separately.

The single-question Admin editor supports separate question and solution image uploads to the existing `question-images` bucket. Solution images display alongside the explanation after answer submission.

Saved questions, including bulk-imported questions, have an **Edit** action with per-question Save Changes and Cancel controls. Edits preserve the question ID and unrelated fields, and update the topic grouping after saving. Existing question arrays are loaded fresh and checked again during save so concurrent changes are rejected instead of silently overwriting other questions. For an existing chapter, batch import still uses a database append operation against the latest saved question array; metadata-only chapter saves do not send the `questions` field.

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
    examYear: '',
  },
],
```

### Chapter catalog

The static catalogs in `src/data/biologyData.js` seed Biology, Physics, and Chemistry chapters for Classes 11 and 12. New Physics and Chemistry chapter IDs are subject- and class-prefixed; published database rows with matching IDs override catalog placeholders. Admin can select each class/subject, add chapter resources and questions, and publish the chapter.

Removing an entry from the static catalog does not delete a saved database chapter. Stored rows are overlaid on the catalog and remain available in Admin and on student pages until an administrator changes their publication state.

## Admin content management

The private admin routes are `/admin/login` and `/admin`. The footer contains the only student-facing link to the login page. Login uses Supabase Auth; there is no frontend password or signup flow.

To enable the admin system:

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, then restart Vite. Never put a Supabase service-role key in a `VITE_` variable or frontend file.
3. For a new project, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the chapter tables, admin allowlist, RLS policies, append RPC, and public notes bucket. Keep those RLS policies enabled.
   For an existing project, first create and verify a recoverable backup of chapter rows, complete question arrays and referenced image URLs. Then review and apply [`supabase/migrations/20261017_subjects_and_append_questions.sql`](supabase/migrations/20261017_subjects_and_append_questions.sql) separately; do not rerun the entire setup schema on a live project. The migration relaxes the subject constraint and adds a restricted atomic append function; it does not update question records. Applying SQL to production is a deliberate operator action and is not performed by the app.
4. Create the owner account in Supabase Auth (do not enable public signups). Add only the owner's Auth user ID to `public.admin_users`, as shown in the SQL file's final commented example.

After setup, sign in at `/admin/login`. The dashboard can filter chapters by class and subject, add, edit, publish, and hide chapters. Notes PDFs are validated and uploaded to the public `chapter-notes` Storage bucket under a class/subject/chapter path. Questions and YouTube links are saved with their chapter. Without valid project configuration and the SQL setup, login and content management remain unavailable rather than simulating success.

### Local validation

Run `npm test`, `npm run lint`, and `npm run build`. The automated utility tests use temporary in-memory question data and do not connect to Supabase. Test the SQL migration and Admin import against a disposable Supabase project before applying the migration to a live project.
