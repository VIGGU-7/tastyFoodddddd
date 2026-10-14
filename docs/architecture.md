# Architecture and interaction decisions

Foodwise uses the Next.js App Router with React server pages, focused client components, and Node route handlers. The feature folders group interfaces by user task. The nutrition domain remains independent of HTTP, authentication, and storage, so its trained model and deterministic restriction checks can be validated separately.

## Request flow

The nutrition-grade random forest remains independent of the TF-IDF recommendation
model. `recommendation-model.ts` applies account restrictions before combining food
similarity, explicit ratings, and nutrient goals. Candidate products come from the
public catalog plus only the current owner's saved scans. Scan/detail responses include
alternatives for members; guest responses contain general nutrient explanations only.
Explanation sources travel with the assessment and are linked on the details page.
Daily references are educational context; saved per-serving limits remain explicit user input.

1. A route handler validates the request and resolves the session.
2. Protected handlers reject guests before reading personal data or generating recommendations.
3. A service performs product lookup, assessment, or recommendation ranking.
4. The repository reads and writes records using the session owner's ID.
5. The interface presents a score, a short verdict, and an optional details page.

| Endpoint                   | Guest access | Purpose                                                              |
| -------------------------- | ------------ | -------------------------------------------------------------------- |
| `POST /api/scan`           | Yes          | General score for guests; profile checks and saved scans for members |
| `GET /api/model`           | Yes          | Evaluated model metrics and provenance                               |
| `GET /api/auth/session`    | Yes          | Current signed-in identity, if any                                   |
| `POST /api/auth/sign-up`   | Yes          | Register and establish a session                                     |
| `POST /api/auth/sign-in`   | Yes          | Verify credentials and establish a session                           |
| `POST /api/auth/sign-out`  | Yes          | Revoke the current session                                           |
| `GET /api/recommendations` | No           | Account-specific food suggestions                                    |
| `GET/PUT /api/profile`     | No           | Read or save preferences                                             |
| `GET/POST /api/journal`    | No           | Activity, tried-food ratings, and glucose readings                   |
| `DELETE /api/account`      | No           | Delete the account and associated personal data                      |

## HCI decisions

- **Progressive disclosure:** the scanner gives a grade and one-line result; a separate explanation adds ingredients, nutrition, and sources.
- **Recognition over recall:** persistent navigation, visible labels, a clear A–E scale, and a live profile summary keep the context visible.
- **Low entry cost:** guests can scan immediately. Recommendations have an explicit account boundary; optional health fields stay optional.
- **Manageable forms:** preferences are split into tastes, restrictions, and chosen limits. Users can return to earlier steps and edit saved settings.
- **Visible system status:** loading states, camera status, success messages, and actionable error feedback explain what is happening.
- **Error prevention and recovery:** barcode validation, unit validation, allergy precedence, empty-state reset controls, and a destructive-action confirmation reduce mistakes.
- **Keyboard access:** native form controls, a skip link, visible focus, accessible Radix dialogs, trapped dialog focus, and Escape dismissal support keyboard use.
- **Motion with restraint:** CSS perspective, parallax, floating layers, and short page/card transitions add depth. Reduced-motion preferences disable movement. Decorative effects never carry essential information.
- **Multiple cues:** grades include letters, verdicts include text and icons, and selected controls use native checked states; meaning is not communicated by color alone.
- **Responsive layout:** the desktop sidebar becomes mobile bottom navigation. Forms and cards adapt to narrow screens without horizontal scrolling.

## Hosting

Use a Node server with a persistent writable volume for SQLite and an HTTPS reverse proxy. The database connection is reused per process; prepared statements scope personal access by account. The filesystem repository should be replaced with a managed database adapter before using ephemeral serverless instances or multiple independent replicas.
